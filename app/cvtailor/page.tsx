"use client";

import { useState, useRef, useCallback } from "react";
import { Document, Packer, Paragraph, TextRun } from "docx";

// ─── Types ───────────────────────────────────────────────────────────────────

type Segment = {
  original: string;
  edited: string;
  changed: boolean;
  reason: string;
  status: "pending" | "approved" | "reverted";
};

type Stage = "upload" | "review" | "cover-letter";

// ─── XML helpers for docx patching ───────────────────────────────────────────

function xmlEscape(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function xmlUnescape(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function getParaText(paraXml: string): string {
  return [...paraXml.matchAll(/<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>/g)]
    .map((m) => xmlUnescape(m[1]))
    .join("");
}

interface DocxRun {
  xml: string;
  text: string;
  rPr: string;
  from: number;
  to: number;
}

function parseRuns(xml: string): DocxRun[] {
  const runs: DocxRun[] = [];
  let pos = 0;
  const re = /<w:r(?:\s[^>]*)?>[\s\S]*?<\/w:r>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) {
    const runXml = m[0];
    const tText = [...runXml.matchAll(/<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>/g)]
      .map((x) => xmlUnescape(x[1]))
      .join("");
    const rPrM = runXml.match(/<w:rPr>[\s\S]*?<\/w:rPr>/);
    runs.push({ xml: runXml, text: tText, rPr: rPrM ? rPrM[0] : "", from: pos, to: pos + tText.length });
    pos += tText.length;
  }
  return runs;
}

function makeRun(rPr: string, text: string): string {
  return `<w:r>${rPr}<w:t xml:space="preserve">${xmlEscape(text)}</w:t></w:r>`;
}

function patchParagraph(para: string, orig: string, edit: string): string {
  const paraText = getParaText(para);
  if (!paraText.includes(orig)) return para;

  // Try: orig is fully inside one <w:t>
  const singleRe = new RegExp(`(<w:t(?:\\s[^>]*)?>(?:[^<]*)?)${xmlEscape(orig).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}((?:[^<]*)<\\/w:t>)`);
  if (singleRe.test(para)) {
    return para.replace(singleRe, `$1${xmlEscape(edit)}$2`);
  }

  // Text spans multiple runs — patch at run level
  const runsStart = para.search(/<w:r[ >]/);
  if (runsStart < 0) return para;
  const lastRunEnd = para.lastIndexOf("</w:r>") + "</w:r>".length;
  const beforeRuns = para.slice(0, runsStart);
  const runsSection = para.slice(runsStart, lastRunEnd);
  const afterRuns = para.slice(lastRunEnd);

  const origStart = paraText.indexOf(orig);
  const origEnd = origStart + orig.length;
  const runs = parseRuns(runsSection);

  let newRuns = "";
  let editInserted = false;

  for (const run of runs) {
    const overlaps = run.from < origEnd && run.to > origStart;
    if (!overlaps) {
      newRuns += run.xml;
      continue;
    }
    const keepBefore = run.text.slice(0, Math.max(0, origStart - run.from));
    const keepAfter = run.text.slice(Math.max(0, origEnd - run.from));
    if (keepBefore) newRuns += makeRun(run.rPr, keepBefore);
    if (!editInserted) {
      newRuns += makeRun(run.rPr, edit);
      editInserted = true;
    }
    if (keepAfter) newRuns += makeRun(run.rPr, keepAfter);
  }

  return beforeRuns + newRuns + afterRuns;
}

function applyEditsToXml(xml: string, segments: Segment[]): string {
  const approved = segments.filter((s) => s.changed && s.status === "approved" && s.original !== s.edited);
  if (approved.length === 0) return xml;

  let result = "";
  let lastIdx = 0;
  const paraRe = /(<w:p[ >][\s\S]*?<\/w:p>)/g;
  let m: RegExpExecArray | null;

  while ((m = paraRe.exec(xml)) !== null) {
    result += xml.slice(lastIdx, m.index);
    let para = m[0];
    for (const seg of approved) {
      para = patchParagraph(para, seg.original.trim(), seg.edited.trim());
    }
    result += para;
    lastIdx = m.index + m[0].length;
  }
  result += xml.slice(lastIdx);
  return result;
}

// ─── ATS Keyword Score ────────────────────────────────────────────────────────

const STOP_WORDS = new Set([
  "the", "a", "an", "in", "on", "at", "to", "for", "of", "with", "by", "from",
  "is", "are", "was", "were", "be", "been", "have", "has", "had", "do", "does",
  "did", "will", "would", "could", "should", "may", "might", "must", "shall",
  "can", "you", "we", "they", "it", "this", "that", "these", "those", "our",
  "their", "your", "its", "or", "not", "but", "as", "if", "so", "up", "out",
  "all", "when", "who", "which", "what", "how", "why", "where", "there", "here",
  "and", "also", "more", "some", "any", "each", "than", "then", "into", "over",
  "after", "about", "such", "both", "well", "just", "only", "very", "own",
]);

function extractKeywords(text: string): string[] {
  return [
    ...new Set(
      text
        .toLowerCase()
        .replace(/[^\w\s]/g, " ")
        .split(/\s+/)
        .filter((w) => w.length > 4 && !STOP_WORDS.has(w))
    ),
  ];
}

function getAtsScore(jd: string, cvText: string): { matched: string[]; missed: string[]; score: number } {
  const jdKeywords = extractKeywords(jd).slice(0, 30);
  if (jdKeywords.length === 0) return { matched: [], missed: [], score: 0 };
  const cvLower = cvText.toLowerCase();
  const matched = jdKeywords.filter((k) => cvLower.includes(k));
  const missed = jdKeywords.filter((k) => !cvLower.includes(k));
  const score = Math.round((matched.length / jdKeywords.length) * 100);
  return { matched, missed, score };
}

// ─── File Parsers ─────────────────────────────────────────────────────────────

async function parseDocx(file: File): Promise<string> {
  const mammoth = await import("mammoth");
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value;
}

async function parsePdf(file: File): Promise<string> {
  let pdfjsLib: typeof import("pdfjs-dist");
  try {
    pdfjsLib = await import("pdfjs-dist");
  } catch {
    throw new Error("PDF parser failed to load. Please try a .docx file instead.");
  }
  pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const pages: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    pages.push(content.items.map((item) => ("str" in item ? item.str : "")).join(" "));
  }
  return pages.join("\n\n");
}

// ─── Info tooltip ─────────────────────────────────────────────────────────────

function InfoTip({ reason }: { reason: string }) {
  const [open, setOpen] = useState(false);
  if (!reason) return null;
  return (
    <span className="relative inline-flex items-center">
      <button
        onClick={() => setOpen((v) => !v)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        className="ml-1 inline-flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-500 hover:bg-blue-200 transition-colors text-[10px] font-semibold"
        title="Why this change?"
      >
        i
      </button>
      {open && (
        <span className="absolute left-6 top-0 z-50 w-56 rounded-lg border border-blue-100 bg-white px-3 py-2 text-xs text-gray-700 shadow-lg">
          {reason}
        </span>
      )}
    </span>
  );
}

// ─── Upload Screen ────────────────────────────────────────────────────────────

function UploadScreen({
  onComplete,
}: {
  onComplete: (segments: Segment[], file: File, jd: string, cvText: string) => void;
}) {
  const [cvText, setCvText] = useState<string | null>(null);
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [jd, setJd] = useState("");
  const [dragging, setDragging] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      setParseError("File is too large. Please use a file under 10 MB.");
      return;
    }
    setParseError(null);
    setCvText(null);
    setFileName(null);
    setCvFile(null);
    setParsing(true);
    try {
      let text = "";
      if (file.name.endsWith(".docx")) {
        text = await parseDocx(file);
      } else if (file.name.endsWith(".pdf")) {
        text = await parsePdf(file);
      } else {
        setParseError("Only .docx and .pdf files are supported.");
        setParsing(false);
        return;
      }
      if (text.trim().length < 50) {
        setParseError("Could not extract text from this file. Try a different format.");
        setParsing(false);
        return;
      }
      setCvText(text);
      setCvFile(file);
      setFileName(file.name);
    } catch (err) {
      setParseError(err instanceof Error ? err.message : "Failed to parse file. Please try a different file.");
    } finally {
      setParsing(false);
    }
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  async function handleSubmit() {
    if (!cvText || !jd.trim() || !cvFile) return;
    setLoading(true);
    setApiError(null);
    try {
      const res = await fetch("/api/tailor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cvText, jobDescription: jd }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      const segments: Segment[] = data.segments.map((s: Omit<Segment, "status">) => ({
        ...s,
        status: "pending",
      }));
      onComplete(segments, cvFile, jd, cvText);
    } catch (err) {
      setApiError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  const canSubmit = !!cvText && jd.trim().length > 0 && !loading && !parsing;

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* CV Upload */}
        <div className="flex flex-col gap-3">
          <label className="text-sm font-medium text-gray-700">Your CV</label>
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`flex min-h-[280px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed transition-colors ${
              dragging ? "border-blue-500 bg-blue-50" : cvText ? "border-green-400 bg-green-50" : "border-gray-200 bg-gray-50 hover:border-gray-300"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".docx,.pdf"
              className="hidden"
              onChange={(e) => { const file = e.target.files?.[0]; if (file) handleFile(file); }}
            />
            {parsing ? (
              <div className="text-center">
                <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
                <p className="text-sm text-gray-500">Parsing file...</p>
              </div>
            ) : cvText ? (
              <div className="text-center px-6">
                <div className="mb-2 text-2xl">✓</div>
                <p className="font-medium text-green-700 text-sm">{fileName}</p>
                <p className="mt-1 text-xs text-gray-500">{cvText.length.toLocaleString()} characters extracted</p>
                <p className="mt-2 text-xs text-blue-500">Click to replace</p>
              </div>
            ) : (
              <div className="text-center px-6">
                <div className="mb-3 text-3xl text-gray-300">↑</div>
                <p className="font-medium text-gray-700 text-sm">Drop your CV here</p>
                <p className="mt-1 text-xs text-gray-400">or click to browse</p>
                <p className="mt-3 text-xs text-gray-400">.docx or .pdf</p>
              </div>
            )}
          </div>
          {parseError && <p className="text-xs text-red-500">{parseError}</p>}
        </div>

        {/* Job Description */}
        <div className="flex flex-col gap-3">
          <label className="text-sm font-medium text-gray-700">Job Description</label>
          <textarea
            value={jd}
            onChange={(e) => setJd(e.target.value)}
            placeholder="Paste the full job description here..."
            className="min-h-[280px] flex-1 resize-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-4 text-sm text-gray-900 outline-none transition-colors focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
          />
        </div>
      </div>

      {apiError && (
        <div className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{apiError}</div>
      )}

      <div className="mt-6 flex justify-end">
        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="flex items-center gap-2 rounded-lg bg-[#2563EB] px-8 py-3 text-sm font-medium text-white transition-all hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {loading ? (
            <>
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Analyzing CV...
            </>
          ) : (
            "Tailor CV →"
          )}
        </button>
      </div>
    </div>
  );
}

// ─── Review Screen ────────────────────────────────────────────────────────────

function ReviewScreen({
  segments: initialSegments,
  originalFile,
  jd,
  cvText,
  onReset,
  onCoverLetter,
}: {
  segments: Segment[];
  originalFile: File | null;
  jd: string;
  cvText: string;
  onReset: () => void;
  onCoverLetter: (segments: Segment[]) => void;
}) {
  const [segments, setSegments] = useState<Segment[]>(initialSegments);
  const [downloading, setDownloading] = useState(false);
  const [showAts, setShowAts] = useState(false);
  const [showInterviewPrep, setShowInterviewPrep] = useState(false);

  const changed = segments.filter((s) => s.changed);
  const approved = segments.filter((s) => s.changed && s.status === "approved");
  const reverted = segments.filter((s) => s.changed && s.status === "reverted");
  const pending = segments.filter((s) => s.changed && s.status === "pending");

  // Build current CV text from segments for ATS scoring
  const currentCvText = segments
    .map((s) => {
      if (!s.changed || s.status === "reverted") return s.original;
      if (s.status === "approved") return s.edited;
      return s.original; // pending — score against original
    })
    .join(" ");

  const ats = getAtsScore(jd, currentCvText);

  // Interview prep: extract themes from changed segment reasons
  const prepThemes = [
    ...new Set(
      segments
        .filter((s) => s.changed && s.reason)
        .map((s) => s.reason)
        .slice(0, 8)
    ),
  ];

  function approve(idx: number) {
    setSegments((prev) => prev.map((s, i) => (i === idx ? { ...s, status: "approved" } : s)));
  }

  function revert(idx: number) {
    setSegments((prev) => prev.map((s, i) => (i === idx ? { ...s, status: "reverted" } : s)));
  }

  function approveAll() {
    setSegments((prev) => prev.map((s) => (s.changed && s.status === "pending" ? { ...s, status: "approved" } : s)));
  }

  async function downloadDocx() {
    setDownloading(true);
    try {
      if (originalFile?.name.endsWith(".docx")) {
        const JSZip = (await import("jszip")).default;
        const zip = await JSZip.loadAsync(await originalFile.arrayBuffer());
        const xmlFile = zip.file("word/document.xml");
        if (!xmlFile) throw new Error("Invalid docx");
        const xml = await xmlFile.async("string");
        const patched = applyEditsToXml(xml, segments);
        zip.file("word/document.xml", patched);
        const blob = await zip.generateAsync({
          type: "blob",
          mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        });
        triggerDownload(blob, "CV_Tailored.docx");
      } else {
        const finalText = segments
          .map((s) => {
            if (!s.changed || s.status === "reverted") return s.original;
            if (s.status === "approved") return s.edited;
            return s.original;
          })
          .join(" ");
        const paras = finalText
          .split(/\n+/)
          .filter((l) => l.trim())
          .map((l) => new Paragraph({ children: [new TextRun({ text: l.trim(), size: 24, font: "Calibri" })], spacing: { after: 160 } }));
        const doc = new Document({ sections: [{ children: paras }] });
        const blob = await Packer.toBlob(doc);
        triggerDownload(blob, "CV_Tailored.docx");
      }
    } catch (err) {
      console.error("Download failed:", err);
      alert("Download failed. Please try again.");
    } finally {
      setDownloading(false);
    }
  }

  function triggerDownload(blob: Blob, name: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  }

  const atsColor =
    ats.score >= 70 ? "text-green-600" : ats.score >= 45 ? "text-amber-600" : "text-red-500";

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      {/* Summary bar */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-gray-100 bg-white px-6 py-4 shadow-sm">
        <div className="flex items-center gap-6 text-sm">
          <span className="text-gray-500">
            <span className="font-semibold text-gray-900">{changed.length}</span> edits suggested
          </span>
          <span className="text-green-600">
            <span className="font-semibold">{approved.length}</span> approved
          </span>
          <span className="text-gray-400">
            <span className="font-semibold">{reverted.length}</span> reverted
          </span>
          {pending.length > 0 && (
            <span className="text-blue-500">
              <span className="font-semibold">{pending.length}</span> pending
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {pending.length > 0 && (
            <button
              onClick={approveAll}
              className="rounded-lg border border-green-300 bg-green-50 px-4 py-2 text-xs font-medium text-green-700 hover:bg-green-100 transition-colors"
            >
              Approve all
            </button>
          )}
          <button
            onClick={() => onCoverLetter(segments)}
            className="rounded-lg border border-purple-200 bg-purple-50 px-4 py-2 text-xs font-medium text-purple-700 hover:bg-purple-100 transition-colors"
          >
            Generate cover letter
          </button>
          {approved.length > 0 && (
            <button
              onClick={downloadDocx}
              disabled={downloading}
              className="flex items-center gap-1.5 rounded-lg bg-[#2563EB] px-5 py-2 text-xs font-medium text-white hover:bg-blue-700 transition-colors disabled:opacity-60"
            >
              {downloading && <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />}
              Download .docx
            </button>
          )}
          <button
            onClick={onReset}
            className="rounded-lg border border-gray-200 px-4 py-2 text-xs font-medium text-gray-500 hover:bg-gray-50 transition-colors"
          >
            Start over
          </button>
        </div>
      </div>

      {/* ATS score panel */}
      <div className="mb-4 rounded-xl border border-gray-100 bg-white shadow-sm overflow-hidden">
        <button
          onClick={() => setShowAts((v) => !v)}
          className="flex w-full items-center justify-between px-6 py-3 text-sm hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <span className="font-medium text-gray-700">ATS Keyword Match</span>
            <span className={`text-sm font-semibold ${atsColor}`}>{ats.score}%</span>
            <span className="text-xs text-gray-400">
              {ats.matched.length}/{ats.matched.length + ats.missed.length} keywords found
            </span>
          </div>
          <span className="text-gray-400 text-xs">{showAts ? "▲" : "▼"}</span>
        </button>
        {showAts && (
          <div className="border-t border-gray-100 px-6 py-4">
            {ats.missed.length > 0 && (
              <div className="mb-3">
                <p className="mb-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Missing keywords</p>
                <div className="flex flex-wrap gap-1.5">
                  {ats.missed.slice(0, 15).map((k) => (
                    <span key={k} className="rounded-md bg-red-50 px-2 py-0.5 text-xs text-red-600 border border-red-100">
                      {k}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {ats.matched.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Matched keywords</p>
                <div className="flex flex-wrap gap-1.5">
                  {ats.matched.slice(0, 15).map((k) => (
                    <span key={k} className="rounded-md bg-green-50 px-2 py-0.5 text-xs text-green-700 border border-green-100">
                      {k}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Interview prep panel */}
      {prepThemes.length > 0 && (
        <div className="mb-4 rounded-xl border border-gray-100 bg-white shadow-sm overflow-hidden">
          <button
            onClick={() => setShowInterviewPrep((v) => !v)}
            className="flex w-full items-center justify-between px-6 py-3 text-sm hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="font-medium text-gray-700">Interview Prep</span>
              <span className="text-xs text-gray-400">{prepThemes.length} key themes from this JD</span>
            </div>
            <span className="text-gray-400 text-xs">{showInterviewPrep ? "▲" : "▼"}</span>
          </button>
          {showInterviewPrep && (
            <div className="border-t border-gray-100 px-6 py-4">
              <p className="mb-3 text-xs text-gray-500">
                Based on the edits Claude made, these are the themes this role emphasizes. Prepare to discuss each one.
              </p>
              <div className="space-y-2">
                {prepThemes.map((theme, i) => (
                  <div key={i} className="flex gap-3 items-start">
                    <span className="mt-0.5 flex-shrink-0 text-xs font-semibold text-purple-500">{i + 1}.</span>
                    <p className="text-sm text-gray-700">{theme}</p>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-xs text-gray-400">
                Tip: For each theme, prepare a specific example from your experience using the STAR format (Situation, Task, Action, Result).
              </p>
            </div>
          )}
        </div>
      )}

      {/* CV content */}
      <div className="rounded-xl border border-gray-100 bg-white px-8 py-8 shadow-sm">
        <div className="leading-relaxed text-sm text-gray-900">
          {segments.map((seg, i) => {
            if (!seg.changed) {
              return <span key={i}>{seg.original}</span>;
            }

            const isApproved = seg.status === "approved";
            const isReverted = seg.status === "reverted";
            const isPending = seg.status === "pending";

            return (
              <span key={i} className="inline">
                <span
                  className={`inline rounded px-0.5 ${
                    isApproved ? "bg-green-50" : isReverted ? "" : "bg-blue-50"
                  }`}
                >
                  {/* Edited text (pending or approved) */}
                  {!isReverted && (
                    <span className={`font-medium ${isApproved ? "text-green-800" : "text-[#2563EB]"}`}>
                      {seg.edited}
                    </span>
                  )}

                  {/* Original text — always show, style depends on state */}
                  {isReverted ? (
                    <span className="text-gray-900">{seg.original}</span>
                  ) : (
                    <span
                      className="ml-1 inline-block rounded bg-red-100 px-1 text-xs text-red-600 line-through decoration-red-500 decoration-2"
                      style={{ textDecorationLine: "line-through" }}
                    >
                      {seg.original}
                    </span>
                  )}

                  {/* Info tip (why this change) */}
                  {!isReverted && <InfoTip reason={seg.reason} />}

                  {/* Action buttons */}
                  {isPending && (
                    <span className="ml-1 inline-flex items-center gap-0.5">
                      <button
                        onClick={() => approve(i)}
                        title="Approve"
                        className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-green-100 text-green-600 hover:bg-green-200 transition-colors text-xs"
                      >
                        ✓
                      </button>
                      <button
                        onClick={() => revert(i)}
                        title="Revert"
                        className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-red-100 text-red-500 hover:bg-red-200 transition-colors text-xs"
                      >
                        ✕
                      </button>
                    </span>
                  )}
                  {isApproved && (
                    <button
                      onClick={() => revert(i)}
                      title="Undo"
                      className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-gray-100 text-gray-400 hover:bg-gray-200 transition-colors text-xs"
                    >
                      ↩
                    </button>
                  )}
                  {isReverted && (
                    <button
                      onClick={() => approve(i)}
                      title="Re-apply"
                      className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-blue-100 text-blue-400 hover:bg-blue-200 transition-colors text-xs"
                    >
                      ↻
                    </button>
                  )}
                </span>
                {" "}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Cover Letter Screen ──────────────────────────────────────────────────────

function CoverLetterScreen({
  segments,
  cvText,
  jd,
  onBack,
  onReset,
}: {
  segments: Segment[];
  cvText: string;
  jd: string;
  onBack: () => void;
  onReset: () => void;
}) {
  const [coverLetter, setCoverLetter] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/cover-letter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cvText, jobDescription: jd, segments }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setCoverLetter(data.coverLetter);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  function downloadTxt() {
    if (!coverLetter) return;
    const blob = new Blob([coverLetter], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "Cover_Letter.txt";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      {/* Header bar */}
      <div className="mb-6 flex items-center justify-between gap-4 rounded-xl border border-gray-100 bg-white px-6 py-4 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-500 hover:bg-gray-50 transition-colors"
          >
            ← Back to CV
          </button>
          <span className="text-sm font-medium text-gray-700">Cover Letter</span>
        </div>
        <div className="flex items-center gap-3">
          {coverLetter && (
            <button
              onClick={downloadTxt}
              className="rounded-lg bg-[#2563EB] px-5 py-2 text-xs font-medium text-white hover:bg-blue-700 transition-colors"
            >
              Download .txt
            </button>
          )}
          <button
            onClick={onReset}
            className="rounded-lg border border-gray-200 px-4 py-2 text-xs font-medium text-gray-500 hover:bg-gray-50 transition-colors"
          >
            Start over
          </button>
        </div>
      </div>

      {/* Main area */}
      {!coverLetter && !loading && !error && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 bg-white px-8 py-16 shadow-sm text-center">
          <p className="text-sm text-gray-500 max-w-sm mb-6">
            Claude will write a tailored cover letter based on your CV and the job description, using the changes you approved.
          </p>
          <button
            onClick={generate}
            className="rounded-lg bg-[#2563EB] px-8 py-3 text-sm font-medium text-white hover:bg-blue-700 transition-all"
          >
            Generate cover letter
          </button>
        </div>
      )}

      {loading && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-gray-100 bg-white px-8 py-16 shadow-sm">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
          <p className="text-sm text-gray-500">Writing your cover letter...</p>
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
      )}

      {coverLetter && (
        <div className="rounded-xl border border-gray-100 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 px-6 py-3">
            <span className="text-xs text-gray-400">Edit directly in the box below</span>
            <button
              onClick={generate}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-50 transition-colors"
            >
              Regenerate
            </button>
          </div>
          <textarea
            value={coverLetter}
            onChange={(e) => setCoverLetter(e.target.value)}
            className="w-full resize-none px-8 py-6 text-sm text-gray-900 leading-relaxed outline-none rounded-b-xl min-h-[420px]"
            spellCheck
          />
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CVTailorPage() {
  const [stage, setStage] = useState<Stage>("upload");
  const [segments, setSegments] = useState<Segment[]>([]);
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [jd, setJd] = useState("");
  const [cvText, setCvText] = useState("");

  function handleUploadComplete(segs: Segment[], file: File, jobDesc: string, cv: string) {
    setSegments(segs);
    setOriginalFile(file);
    setJd(jobDesc);
    setCvText(cv);
    setStage("review");
  }

  function handleCoverLetter(segs: Segment[]) {
    setSegments(segs);
    setStage("cover-letter");
  }

  function handleReset() {
    setSegments([]);
    setOriginalFile(null);
    setJd("");
    setCvText("");
    setStage("upload");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b bg-[#0f172a] px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div>
            <span className="text-base font-semibold text-white">CV Tailor</span>
            <span className="ml-3 text-xs text-slate-400">Powered by Claude</span>
          </div>
          {stage === "review" && (
            <span className="text-xs text-slate-500">Review your tailored edits below</span>
          )}
          {stage === "cover-letter" && (
            <span className="text-xs text-slate-500">Cover letter</span>
          )}
        </div>
      </header>

      {stage === "upload" && <UploadScreen onComplete={handleUploadComplete} />}
      {stage === "review" && (
        <ReviewScreen
          segments={segments}
          originalFile={originalFile}
          jd={jd}
          cvText={cvText}
          onReset={handleReset}
          onCoverLetter={handleCoverLetter}
        />
      )}
      {stage === "cover-letter" && (
        <CoverLetterScreen
          segments={segments}
          cvText={cvText}
          jd={jd}
          onBack={() => setStage("review")}
          onReset={handleReset}
        />
      )}
    </div>
  );
}
