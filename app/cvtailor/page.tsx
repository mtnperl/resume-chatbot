"use client";

import { useState, useRef, useCallback, useEffect } from "react";
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

// ─── Retro loader ─────────────────────────────────────────────────────────────

const BOOT_MESSAGES = [
  "LOADING CV.EXE...",
  "INITIALIZING WORD PROCESSOR v2.4...",
  "SCANNING WORK HISTORY...",
  "PARSING ACHIEVEMENTS...",
  "CROSS-REFERENCING JOB REQUIREMENTS...",
  "ANALYZING SKILL GAPS...",
  "DETECTING POWER WORDS...",
  "REMOVING CORPORATE BUZZWORDS...",
  "CALIBRATING KEYWORD DENSITY...",
  "OPTIMIZING BULLET POINTS...",
  "POLISHING CAREER NARRATIVE...",
  "RUNNING RECRUITER SIMULATION...",
  "FINALIZING EDITS...",
  "ALMOST THERE...",
];

const COVER_LETTER_MESSAGES = [
  "LOADING COVER_LETTER.EXE...",
  "READING JOB DESCRIPTION...",
  "ANALYZING HIRING MANAGER PSYCHOLOGY...",
  "EXTRACTING KEY REQUIREMENTS...",
  "MATCHING CANDIDATE ACHIEVEMENTS...",
  "SELECTING POWER ANECDOTES...",
  "CRAFTING OPENING HOOK...",
  "ELIMINATING CORPORATE BUZZWORDS...",
  "CALIBRATING CONFIDENCE LEVEL...",
  "POLISHING PROSE...",
  "REMOVING EM-DASHES...",
  "RUNNING CRINGE DETECTOR...",
  "FINALIZING LETTER...",
  "ALMOST THERE...",
];

function RetroLoader({ messages = BOOT_MESSAGES }: { messages?: string[] }) {
  const [progress, setProgress] = useState(0);
  const [msgIdx, setMsgIdx] = useState(0);
  const [blink, setBlink] = useState(true);
  const [log, setLog] = useState<string[]>([messages[0]]);

  useEffect(() => {
    // Progress bar — slow ramp, stalls near 90% waiting for API
    const progressTimer = setInterval(() => {
      setProgress((p) => {
        if (p >= 92) return p;
        const step = p < 30 ? 3 : p < 60 ? 2 : p < 80 ? 1.5 : 0.4;
        return Math.min(92, p + step);
      });
    }, 280);

    // Cycle messages
    const msgTimer = setInterval(() => {
      setMsgIdx((i) => {
        const next = Math.min(i + 1, messages.length - 1);
        setLog((prev) => [...prev.slice(-6), messages[next]]);
        return next;
      });
    }, 1100);

    // Blinking cursor
    const blinkTimer = setInterval(() => setBlink((b) => !b), 530);

    return () => { clearInterval(progressTimer); clearInterval(msgTimer); clearInterval(blinkTimer); };
  }, []);

  const filled = Math.round(progress / 100 * 28);
  const bar = "█".repeat(filled) + "░".repeat(28 - filled);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0f172a]">
      {/* Scanline overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{ backgroundImage: "repeating-linear-gradient(0deg, #000 0px, #000 1px, transparent 1px, transparent 3px)" }}
      />

      <div className="w-full max-w-xl px-8">
        {/* Title */}
        <p className="font-mono text-[10px] tracking-[0.4em] uppercase text-slate-500 mb-1">CV ADAPTOR v1.0</p>
        <p className="font-mono text-[10px] tracking-[0.3em] uppercase text-slate-600 mb-8">© 2025 MATHAN PERL SYSTEMS</p>

        {/* Scrolling log */}
        <div className="mb-6 h-36 overflow-hidden">
          {log.map((msg, i) => (
            <p
              key={i}
              className="font-mono text-xs leading-6 transition-opacity"
              style={{ color: i === log.length - 1 ? "#e2e8f0" : "#475569", opacity: i === log.length - 1 ? 1 : 0.4 + i * 0.08 }}
            >
              <span className="text-slate-600 mr-2">&gt;</span>{msg}
            </p>
          ))}
          <p className="font-mono text-xs leading-6 text-slate-200">
            <span className="text-slate-600 mr-2">&gt;</span>
            <span style={{ opacity: blink ? 1 : 0 }}>█</span>
          </p>
        </div>

        {/* Progress bar */}
        <div className="mb-2">
          <p className="font-mono text-[10px] text-slate-500 mb-1 tracking-widest uppercase">Processing</p>
          <p className="font-mono text-sm tracking-wider text-slate-200">
            [<span className="text-emerald-400">{bar}</span>] {Math.round(progress)}%
          </p>
        </div>

        {/* Flavor text */}
        <p className="mt-6 font-mono text-[10px] text-slate-600 tracking-wider">
          DO NOT TURN OFF YOUR COMPUTER
        </p>
      </div>
    </div>
  );
}

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

  const singleRe = new RegExp(`(<w:t(?:\\s[^>]*)?>(?:[^<]*)?)${xmlEscape(orig).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}((?:[^<]*)<\\/w:t>)`);
  if (singleRe.test(para)) {
    return para.replace(singleRe, `$1${xmlEscape(edit)}$2`);
  }

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
    if (!overlaps) { newRuns += run.xml; continue; }
    const keepBefore = run.text.slice(0, Math.max(0, origStart - run.from));
    const keepAfter = run.text.slice(Math.max(0, origEnd - run.from));
    if (keepBefore) newRuns += makeRun(run.rPr, keepBefore);
    if (!editInserted) { newRuns += makeRun(run.rPr, edit); editInserted = true; }
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
  "the","a","an","in","on","at","to","for","of","with","by","from","is","are",
  "was","were","be","been","have","has","had","do","does","did","will","would",
  "could","should","may","might","must","shall","can","you","we","they","it",
  "this","that","these","those","our","their","your","its","or","not","but","as",
  "if","so","up","out","all","when","who","which","what","how","why","where",
  "there","here","and","also","more","some","any","each","than","then","into",
  "over","after","about","such","both","well","just","only","very","own",
]);

function extractKeywords(text: string): string[] {
  return [...new Set(
    text.toLowerCase().replace(/[^\w\s]/g, " ").split(/\s+/)
      .filter((w) => w.length > 4 && !STOP_WORDS.has(w))
  )];
}

function getAtsScore(jd: string, cvText: string) {
  const jdKeywords = extractKeywords(jd).slice(0, 30);
  if (jdKeywords.length === 0) return { matched: [], missed: [], score: 0 };
  const cvLower = cvText.toLowerCase();
  const matched = jdKeywords.filter((k) => cvLower.includes(k));
  const missed = jdKeywords.filter((k) => !cvLower.includes(k));
  return { matched, missed, score: Math.round((matched.length / jdKeywords.length) * 100) };
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
  try { pdfjsLib = await import("pdfjs-dist"); }
  catch { throw new Error("PDF parser failed to load. Try a .docx file instead."); }
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

// ─── Analytics ───────────────────────────────────────────────────────────────

function track(event: string) {
  fetch("/api/analytics", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ event }),
  }).catch(() => {});
}

// ─── Filename helper ──────────────────────────────────────────────────────────

function getTailoredFilename(originalName: string): string {
  const dot = originalName.lastIndexOf(".");
  const base = dot === -1 ? originalName : originalName.slice(0, dot);
  return `${base} v1.0.docx`;
}

// ─── Upload Screen ────────────────────────────────────────────────────────────

function UploadScreen({ onComplete }: {
  onComplete: (segments: Segment[], file: File, jd: string, cvText: string) => void;
}) {
  const [cvText, setCvText] = useState<string | null>(null);
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [jd, setJd] = useState("");
  const [jdMode, setJdMode] = useState<"paste" | "url">("paste");
  const [jdUrl, setJdUrl] = useState("");
  const [fetchingUrl, setFetchingUrl] = useState(false);
  const [urlError, setUrlError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function fetchJdFromUrl() {
    if (!jdUrl.trim()) return;
    setFetchingUrl(true); setUrlError(null);
    try {
      const res = await fetch("/api/fetch-jd", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: jdUrl }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setJd(data.text);
      setJdMode("paste"); // switch to text view so user can review/edit
    } catch (err) {
      setUrlError(err instanceof Error ? err.message : "Failed to fetch URL");
    } finally { setFetchingUrl(false); }
  }

  const handleFile = useCallback(async (file: File) => {
    if (file.size > 10 * 1024 * 1024) { setParseError("File too large — maximum 10 MB."); return; }
    setParseError(null); setCvText(null); setFileName(null); setCvFile(null); setParsing(true);
    try {
      let text = "";
      if (file.name.endsWith(".docx")) text = await parseDocx(file);
      else if (file.name.endsWith(".pdf")) text = await parsePdf(file);
      else { setParseError("Only .docx and .pdf files are supported."); setParsing(false); return; }
      if (text.trim().length < 50) { setParseError("Could not extract text. Try a different format."); setParsing(false); return; }
      setCvText(text); setCvFile(file); setFileName(file.name);
    } catch (err) {
      setParseError(err instanceof Error ? err.message : "Failed to parse file.");
    } finally { setParsing(false); }
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const file = e.dataTransfer.files[0]; if (file) handleFile(file);
  }, [handleFile]);

  async function handleSubmit() {
    if (!cvText || !jd.trim() || !cvFile) return;
    setLoading(true); setApiError(null);
    try {
      const res = await fetch("/api/tailor", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cvText, jobDescription: jd }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      const segments: Segment[] = data.segments.map((s: Omit<Segment, "status">) => ({ ...s, status: "pending" }));
      track("cv_adaptor_tailored");
      onComplete(segments, cvFile, jd, cvText);
    } catch (err) {
      setApiError(err instanceof Error ? err.message : "Something went wrong");
    } finally { setLoading(false); }
  }

  const canSubmit = !!cvText && jd.trim().length > 0 && !loading && !parsing;

  if (loading) return <RetroLoader />;

  return (
    <div className="mx-auto max-w-5xl px-6 py-14">
      {/* Page title */}
      <div className="mb-10">
        <p className="font-mono text-xs tracking-[0.2em] uppercase text-slate-400 mb-1">Step 1 of 3</p>
        <h2 className="text-2xl font-semibold text-slate-900 tracking-tight">Upload your CV and paste the job description</h2>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* CV Upload */}
        <div className="flex flex-col gap-2">
          <label className="font-mono text-xs tracking-[0.15em] uppercase text-slate-400">Your CV</label>
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`flex min-h-[300px] cursor-pointer flex-col items-center justify-center border-2 border-dashed transition-all ${
              dragging
                ? "border-slate-900 bg-slate-50"
                : cvText
                ? "border-emerald-400 bg-emerald-50/40"
                : "border-slate-200 bg-white hover:border-slate-300"
            }`}
          >
            <input ref={fileInputRef} type="file" accept=".docx,.pdf" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
            {parsing ? (
              <div className="text-center">
                <div className="mx-auto mb-3 h-6 w-6 animate-spin rounded-full border-2 border-slate-900 border-t-transparent" />
                <p className="font-mono text-xs text-slate-400 tracking-wider uppercase">Parsing...</p>
              </div>
            ) : cvText ? (
              <div className="text-center px-6">
                <p className="font-mono text-xs tracking-wider uppercase text-emerald-600 mb-2">File loaded</p>
                <p className="font-semibold text-slate-900 text-sm">{fileName}</p>
                <p className="mt-1 font-mono text-xs text-slate-400">{cvText.length.toLocaleString()} chars</p>
                <p className="mt-3 font-mono text-xs text-slate-400 underline underline-offset-2">Click to replace</p>
              </div>
            ) : (
              <div className="text-center px-6">
                <div className="mb-4 text-2xl text-slate-300">↑</div>
                <p className="font-semibold text-slate-700 text-sm">Drop your CV here</p>
                <p className="mt-1 font-mono text-xs text-slate-400">or click to browse</p>
                <p className="mt-4 font-mono text-xs text-slate-300">.docx or .pdf</p>
              </div>
            )}
          </div>
          {parseError && <p className="font-mono text-xs text-red-500">{parseError}</p>}
        </div>

        {/* Job Description */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label className="font-mono text-xs tracking-[0.15em] uppercase text-slate-400">Job Description</label>
            <div className="flex items-center border border-slate-200 bg-white">
              <button
                onClick={() => setJdMode("paste")}
                className={`px-3 py-1 font-mono text-[10px] tracking-wider uppercase transition-colors ${jdMode === "paste" ? "bg-slate-900 text-white" : "text-slate-400 hover:text-slate-600"}`}
              >Paste</button>
              <button
                onClick={() => setJdMode("url")}
                className={`px-3 py-1 font-mono text-[10px] tracking-wider uppercase transition-colors ${jdMode === "url" ? "bg-slate-900 text-white" : "text-slate-400 hover:text-slate-600"}`}
              >Link</button>
            </div>
          </div>

          {jdMode === "url" ? (
            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <input
                  type="url"
                  value={jdUrl}
                  onChange={(e) => { setJdUrl(e.target.value); setUrlError(null); }}
                  onKeyDown={(e) => e.key === "Enter" && fetchJdFromUrl()}
                  placeholder="https://jobs.company.com/role/..."
                  className="flex-1 border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-300 focus:border-slate-900"
                />
                <button
                  onClick={fetchJdFromUrl}
                  disabled={!jdUrl.trim() || fetchingUrl}
                  className="flex items-center gap-2 bg-slate-900 px-5 py-3 font-mono text-xs tracking-wider uppercase text-white hover:bg-slate-700 transition-colors disabled:opacity-40"
                >
                  {fetchingUrl ? <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" /> : "Fetch"}
                </button>
              </div>
              {urlError && <p className="font-mono text-xs text-red-500">{urlError}</p>}
              <p className="font-mono text-xs text-slate-400">Works with Greenhouse, Lever, Workday, and most company career pages. LinkedIn may not work.</p>
              {jd && (
                <div className="border border-emerald-200 bg-emerald-50 px-3 py-2 font-mono text-xs text-emerald-700">
                  ✓ Job description fetched ({jd.length.toLocaleString()} chars) — switching to text view to review
                </div>
              )}
            </div>
          ) : (
            <textarea
              value={jd}
              onChange={(e) => setJd(e.target.value)}
              placeholder="Paste the full job description here..."
              className="min-h-[300px] flex-1 resize-none border border-slate-200 bg-white px-5 py-4 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-300 focus:border-slate-900 focus:ring-0"
            />
          )}
        </div>
      </div>

      {apiError && (
        <div className="mt-4 border border-red-200 bg-red-50 px-4 py-3 font-mono text-xs text-red-600">{apiError}</div>
      )}

      <div className="mt-8 flex justify-end">
        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="flex items-center gap-3 bg-slate-900 px-8 py-3.5 font-mono text-xs tracking-[0.15em] uppercase text-white transition-all hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-30"
        >
          Adapt CV →
        </button>
      </div>
    </div>
  );
}

// ─── Review Screen ────────────────────────────────────────────────────────────

function ReviewScreen({ segments: initialSegments, originalFile, jd, cvText, onReset, onCoverLetter }: {
  segments: Segment[];
  originalFile: File | null;
  jd: string;
  cvText: string;
  onReset: () => void;
  onCoverLetter: (segments: Segment[]) => void;
}) {
  const [segments, setSegments] = useState<Segment[]>(initialSegments);
  const [downloading, setDownloading] = useState(false);
  const [showAtsDetail, setShowAtsDetail] = useState(false);
  const [showInterviewPrep, setShowInterviewPrep] = useState(false);

  const changed = segments.filter((s) => s.changed);
  const approved = segments.filter((s) => s.changed && s.status === "approved");
  const reverted = segments.filter((s) => s.changed && s.status === "reverted");
  const pending = segments.filter((s) => s.changed && s.status === "pending");

  const currentCvText = segments.map((s) => {
    if (!s.changed || s.status === "reverted") return s.original;
    if (s.status === "approved") return s.edited;
    return s.original;
  }).join(" ");

  const ats = getAtsScore(jd, currentCvText);
  const atsColor = ats.score >= 70 ? "text-emerald-600" : ats.score >= 45 ? "text-amber-500" : "text-red-500";
  const atsBg = ats.score >= 70 ? "bg-emerald-50 border-emerald-200" : ats.score >= 45 ? "bg-amber-50 border-amber-200" : "bg-red-50 border-red-200";

  const prepThemes = [...new Set(
    segments.filter((s) => s.changed && s.reason).map((s) => s.reason).slice(0, 8)
  )];

  function approve(idx: number) {
    setSegments((p) => p.map((s, i) => i === idx ? { ...s, status: "approved" } : s));
  }
  function revert(idx: number) {
    setSegments((p) => p.map((s, i) => i === idx ? { ...s, status: "reverted" } : s));
  }
  function approveAll() {
    setSegments((p) => p.map((s) => s.changed && s.status === "pending" ? { ...s, status: "approved" } : s));
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
        zip.file("word/document.xml", applyEditsToXml(xml, segments));
        const blob = await zip.generateAsync({ type: "blob", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
        track("cv_adaptor_download_cv");
        triggerDownload(blob, getTailoredFilename(originalFile.name));
      } else {
        const finalText = segments.map((s) => (!s.changed || s.status === "reverted") ? s.original : s.status === "approved" ? s.edited : s.original).join(" ");
        const paras = finalText.split(/\n+/).filter((l) => l.trim()).map((l) => new Paragraph({ children: [new TextRun({ text: l.trim(), size: 24, font: "Calibri" })], spacing: { after: 160 } }));
        const doc = new Document({ sections: [{ children: paras }] });
        track("cv_adaptor_download_cv");
        triggerDownload(await Packer.toBlob(doc), getTailoredFilename(originalFile?.name ?? "CV.docx"));
      }
    } catch (err) {
      console.error("Download failed:", err);
      alert("Download failed. Please try again.");
    } finally { setDownloading(false); }
  }

  function triggerDownload(blob: Blob, name: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = name; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">

      {/* Page title + meta */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-xs tracking-[0.2em] uppercase text-slate-400 mb-1">Step 2 of 3</p>
          <h2 className="text-xl font-semibold text-slate-900 tracking-tight">Review suggested edits</h2>
        </div>
        <button onClick={onReset} className="font-mono text-xs text-slate-400 hover:text-slate-600 underline underline-offset-2 transition-colors mt-1">
          Start over
        </button>
      </div>

      {/* Stats row */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <span className="border border-slate-200 bg-white px-3 py-1.5 font-mono text-xs text-slate-500">
          <span className="font-semibold text-slate-900">{changed.length}</span> edits
        </span>
        <span className="border border-emerald-200 bg-emerald-50 px-3 py-1.5 font-mono text-xs text-emerald-700">
          <span className="font-semibold">{approved.length}</span> approved
        </span>
        {reverted.length > 0 && (
          <span className="border border-slate-200 bg-white px-3 py-1.5 font-mono text-xs text-slate-400">
            <span className="font-semibold">{reverted.length}</span> reverted
          </span>
        )}
        {pending.length > 0 && (
          <span className="border border-amber-200 bg-amber-50 px-3 py-1.5 font-mono text-xs text-amber-600">
            <span className="font-semibold">{pending.length}</span> pending
          </span>
        )}

        {/* ATS score — always visible in the stats row */}
        <button
          onClick={() => setShowAtsDetail((v) => !v)}
          className={`border px-3 py-1.5 font-mono text-xs transition-colors ${atsBg} ${atsColor}`}
        >
          ATS match <span className="font-semibold">{ats.score}%</span> {showAtsDetail ? "▲" : "▼"}
        </button>

        {/* Interview prep pill */}
        {prepThemes.length > 0 && (
          <button
            onClick={() => setShowInterviewPrep((v) => !v)}
            className="border border-purple-200 bg-purple-50 px-3 py-1.5 font-mono text-xs text-purple-600 transition-colors hover:bg-purple-100"
          >
            Interview prep {showInterviewPrep ? "▲" : "▼"}
          </button>
        )}
      </div>

      {/* ATS detail panel */}
      {showAtsDetail && (
        <div className="mb-4 border border-slate-200 bg-white px-6 py-5">
          <p className="font-mono text-xs tracking-[0.15em] uppercase text-slate-400 mb-4">ATS Keyword Match</p>
          {ats.missed.length > 0 && (
            <div className="mb-4">
              <p className="font-mono text-xs text-slate-400 mb-2">Missing from your CV</p>
              <div className="flex flex-wrap gap-1.5">
                {ats.missed.slice(0, 15).map((k) => (
                  <span key={k} className="border border-red-200 bg-red-50 px-2.5 py-1 font-mono text-xs text-red-600">{k}</span>
                ))}
              </div>
            </div>
          )}
          {ats.matched.length > 0 && (
            <div>
              <p className="font-mono text-xs text-slate-400 mb-2">Matched keywords</p>
              <div className="flex flex-wrap gap-1.5">
                {ats.matched.slice(0, 15).map((k) => (
                  <span key={k} className="border border-emerald-200 bg-emerald-50 px-2.5 py-1 font-mono text-xs text-emerald-700">{k}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Interview prep panel */}
      {showInterviewPrep && prepThemes.length > 0 && (
        <div className="mb-4 border border-slate-200 bg-white px-6 py-5">
          <p className="font-mono text-xs tracking-[0.15em] uppercase text-slate-400 mb-4">Interview Prep — Key Themes</p>
          <p className="text-sm text-slate-500 mb-4">Based on the tailoring, these are the competencies this role emphasizes. Prepare a specific STAR example for each.</p>
          <div className="space-y-3">
            {prepThemes.map((theme, i) => (
              <div key={i} className="flex gap-3 items-start border-l-2 border-slate-200 pl-4">
                <span className="font-mono text-xs text-slate-400 mt-0.5 w-4 flex-shrink-0">{i + 1}.</span>
                <p className="text-sm text-slate-700">{theme}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action bar */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border border-slate-200 bg-white px-5 py-3">
        <div className="flex items-center gap-3">
          {pending.length > 0 && (
            <button onClick={approveAll}
              className="font-mono text-xs tracking-wider uppercase text-emerald-700 border border-emerald-300 bg-emerald-50 px-4 py-2 hover:bg-emerald-100 transition-colors">
              Approve all ({pending.length})
            </button>
          )}
        </div>
        <div className="flex items-center gap-3">
          {/* Cover letter CTA — prominent */}
          <button onClick={() => onCoverLetter(segments)}
            className="flex items-center gap-2 border border-slate-900 bg-slate-900 px-5 py-2 font-mono text-xs tracking-wider uppercase text-white hover:bg-slate-700 transition-colors">
            Generate cover letter →
          </button>
          {approved.length > 0 && (
            <button onClick={downloadDocx} disabled={downloading}
              className="flex items-center gap-2 border border-emerald-600 bg-emerald-600 px-5 py-2 font-mono text-xs tracking-wider uppercase text-white hover:bg-emerald-700 transition-colors disabled:opacity-50">
              {downloading && <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />}
              Download .docx
            </button>
          )}
        </div>
      </div>

      {/* CV content */}
      <div className="border border-slate-200 bg-white px-10 py-10">
        <div className="leading-[1.9] text-sm text-slate-800">
          {segments.map((seg, i) => {
            if (!seg.changed) return <span key={i}>{seg.original}</span>;

            const isApproved = seg.status === "approved";
            const isReverted = seg.status === "reverted";
            const isPending = seg.status === "pending";

            if (isReverted) {
              return (
                <span key={i}>
                  <span className="text-slate-800">{seg.original}</span>
                  <button onClick={() => approve(i)} title="Re-apply suggestion"
                    className="ml-1 inline-flex items-center gap-0.5 border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono text-[10px] text-slate-400 hover:border-slate-400 hover:text-slate-600 transition-colors">
                    ↻ re-apply
                  </button>
                  {" "}
                </span>
              );
            }

            return (
              <span key={i} className="inline">
                {/* Change block — new text + removed original + controls */}
                <span className={`inline rounded-sm px-0.5 py-0.5 ${isApproved ? "bg-emerald-50" : "bg-blue-50"}`}>
                  {/* Proposed text */}
                  <span className={`font-medium ${isApproved ? "text-emerald-800" : "text-blue-800"}`}>
                    {seg.edited}
                  </span>

                  {/* Removed original — clear label + strong strikethrough */}
                  <span className="ml-2 inline-flex items-baseline gap-1">
                    <span className="font-mono text-[10px] text-slate-400 not-italic">was:</span>
                    <span
                      className="rounded-sm bg-red-100 px-1 text-red-700"
                      style={{ textDecoration: "line-through", textDecorationColor: "#dc2626", textDecorationThickness: "2px" }}
                    >
                      {seg.original}
                    </span>
                  </span>

                  {/* Reason tooltip */}
                  {seg.reason && <ReasonTip reason={seg.reason} />}

                  {/* Action buttons */}
                  {isPending && (
                    <span className="ml-2 inline-flex items-center gap-1">
                      <button onClick={() => approve(i)}
                        className="inline-flex items-center gap-0.5 border border-emerald-400 bg-emerald-50 px-1.5 py-0.5 font-mono text-[10px] text-emerald-700 hover:bg-emerald-100 transition-colors">
                        ✓ keep
                      </button>
                      <button onClick={() => revert(i)}
                        className="inline-flex items-center gap-0.5 border border-red-300 bg-red-50 px-1.5 py-0.5 font-mono text-[10px] text-red-600 hover:bg-red-100 transition-colors">
                        ✕ undo
                      </button>
                    </span>
                  )}
                  {isApproved && (
                    <button onClick={() => revert(i)}
                      className="ml-2 border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono text-[10px] text-slate-400 hover:border-slate-400 transition-colors">
                      ↩ undo
                    </button>
                  )}
                </span>
                {" "}
              </span>
            );
          })}
        </div>
      </div>

      {/* Bottom CTA — cover letter */}
      <div className="mt-6 border border-slate-200 bg-white px-6 py-5 flex items-center justify-between gap-4">
        <div>
          <p className="font-mono text-xs tracking-[0.15em] uppercase text-slate-400 mb-0.5">Next step</p>
          <p className="text-sm text-slate-700">Generate a cover letter tailored to this JD using your approved edits.</p>
        </div>
        <button onClick={() => onCoverLetter(segments)}
          className="flex-shrink-0 flex items-center gap-2 bg-slate-900 px-6 py-3 font-mono text-xs tracking-[0.15em] uppercase text-white hover:bg-slate-700 transition-colors">
          Cover letter →
        </button>
      </div>
    </div>
  );
}

// ─── Reason tooltip ───────────────────────────────────────────────────────────

function ReasonTip({ reason }: { reason: string }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="relative inline-flex items-center">
      <button
        onClick={() => setOpen((v) => !v)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        className="ml-1 inline-flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full border border-slate-300 font-mono text-[10px] text-slate-400 hover:border-slate-500 hover:text-slate-600 transition-colors"
        title="Why this change?"
      >
        ?
      </button>
      {open && (
        <span className="absolute left-6 top-0 z-50 w-64 border border-slate-200 bg-white px-3 py-2.5 text-xs text-slate-600 shadow-lg leading-relaxed">
          {reason}
        </span>
      )}
    </span>
  );
}

// ─── Cover Letter Screen ──────────────────────────────────────────────────────

function CoverLetterScreen({ segments, cvText, jd, onBack, onReset }: {
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
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/cover-letter", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cvText, jobDescription: jd, segments }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      track("cv_adaptor_cover_letter");
      setCoverLetter(data.coverLetter);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally { setLoading(false); }
  }

  async function downloadDocx() {
    if (!coverLetter) return;
    const paras = coverLetter
      .split(/\n\n+/)
      .filter((p) => p.trim())
      .map((p) => new Paragraph({
        children: [new TextRun({ text: p.trim(), size: 24, font: "Calibri" })],
        spacing: { after: 240 },
      }));
    const doc = new Document({ sections: [{ children: paras }] });
    const blob = await Packer.toBlob(doc);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "Cover_Letter.docx"; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-xs tracking-[0.2em] uppercase text-slate-400 mb-1">Step 3 of 3</p>
          <h2 className="text-xl font-semibold text-slate-900 tracking-tight">Cover letter</h2>
        </div>
        <div className="flex items-center gap-3 mt-1">
          <button onClick={onBack} className="font-mono text-xs text-slate-400 hover:text-slate-600 underline underline-offset-2 transition-colors">← Back</button>
          <button onClick={onReset} className="font-mono text-xs text-slate-400 hover:text-slate-600 underline underline-offset-2 transition-colors">Start over</button>
        </div>
      </div>

      {error && (
        <div className="mb-4 border border-red-200 bg-red-50 px-4 py-3 font-mono text-xs text-red-600">{error}</div>
      )}

      {/* Empty state — prompt to generate */}
      {!coverLetter && !loading && (
        <div className="border border-dashed border-slate-300 bg-white px-8 py-16 text-center">
          <p className="text-sm text-slate-500 max-w-sm mx-auto mb-6 leading-relaxed">
            Claude will write a cover letter tailored to this JD, using your approved CV edits as anchors.
          </p>
          <button onClick={generate}
            className="bg-slate-900 px-8 py-3.5 font-mono text-xs tracking-[0.15em] uppercase text-white hover:bg-slate-700 transition-colors">
            Generate cover letter
          </button>
        </div>
      )}

      {/* Loading */}
      {loading && <RetroLoader messages={COVER_LETTER_MESSAGES} />}

      {/* Generated letter */}
      {coverLetter && (
        <div className="border border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-3">
            <span className="font-mono text-xs text-slate-400">Edit directly below</span>
            <div className="flex items-center gap-3">
              <button onClick={generate}
                className="font-mono text-xs text-slate-400 hover:text-slate-600 underline underline-offset-2 transition-colors">
                Regenerate
              </button>
              <button onClick={downloadDocx}
                className="border border-slate-900 bg-slate-900 px-4 py-1.5 font-mono text-xs tracking-wider uppercase text-white hover:bg-slate-700 transition-colors">
                Download .docx
              </button>
            </div>
          </div>
          <textarea
            value={coverLetter}
            onChange={(e) => setCoverLetter(e.target.value)}
            className="w-full resize-none px-8 py-8 text-sm text-slate-800 leading-[1.9] outline-none min-h-[480px]"
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
    setSegments(segs); setOriginalFile(file); setJd(jobDesc); setCvText(cv); setStage("review");
  }

  function handleCoverLetter(segs: Segment[]) {
    setSegments(segs); setStage("cover-letter");
  }

  function handleReset() {
    setSegments([]); setOriginalFile(null); setJd(""); setCvText(""); setStage("upload");
  }

  const stageLabel = stage === "upload" ? "Upload" : stage === "review" ? "Review Edits" : "Cover Letter";

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <header className="border-b border-slate-800 bg-[#0f172a]">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <span className="font-mono text-xs tracking-[0.3em] uppercase text-white">CV Adaptor</span>
          </div>
          <div className="flex items-center gap-2">
            {(["upload", "review", "cover-letter"] as Stage[]).map((s, i) => (
              <span key={s} className="flex items-center gap-2">
                {i > 0 && <span className="font-mono text-[10px] text-slate-600">→</span>}
                <span className={`font-mono text-[10px] tracking-wider uppercase ${s === stage ? "text-white" : "text-slate-500"}`}>
                  {s === "upload" ? "Upload" : s === "review" ? "Review" : "Cover letter"}
                </span>
              </span>
            ))}
          </div>
        </div>
      </header>

      {stage === "upload" && <UploadScreen onComplete={handleUploadComplete} />}
      {stage === "review" && (
        <ReviewScreen
          segments={segments} originalFile={originalFile}
          jd={jd} cvText={cvText}
          onReset={handleReset} onCoverLetter={handleCoverLetter}
        />
      )}
      {stage === "cover-letter" && (
        <CoverLetterScreen
          segments={segments} cvText={cvText} jd={jd}
          onBack={() => setStage("review")} onReset={handleReset}
        />
      )}
    </div>
  );
}
