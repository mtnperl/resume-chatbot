"use client";

import { useState, useRef, useCallback } from "react";
import { Document, Packer, Paragraph, TextRun } from "docx";

// ─── Types ───────────────────────────────────────────────────────────────────

type Segment = {
  original: string;
  edited: string;
  changed: boolean;
  status: "pending" | "approved" | "reverted";
};

type Stage = "password" | "upload" | "review";

// ─── Constants ───────────────────────────────────────────────────────────────

const PASSWORD = "mathan2025";

// ─── Password Gate ────────────────────────────────────────────────────────────

function PasswordGate({ onUnlock }: { onUnlock: () => void }) {
  const [value, setValue] = useState("");
  const [error, setError] = useState(false);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (value === PASSWORD) {
      onUnlock();
    } else {
      setError(true);
      setValue("");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm rounded-2xl bg-white p-10 shadow-sm border border-gray-100">
        <h1 className="mb-1 text-xl font-semibold text-gray-900">CV Tailor</h1>
        <p className="mb-8 text-sm text-gray-500">Enter the access password to continue.</p>
        <form onSubmit={submit} className="flex flex-col gap-3">
          <input
            type="password"
            value={value}
            onChange={(e) => { setValue(e.target.value); setError(false); }}
            placeholder="Password"
            autoFocus
            className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
          />
          {error && (
            <p className="text-xs text-red-500">Incorrect password. Try again.</p>
          )}
          <button
            type="submit"
            className="w-full rounded-lg bg-[#2563EB] py-3 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            Unlock
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── File Parser ──────────────────────────────────────────────────────────────

async function parseDocx(file: File): Promise<string> {
  const mammoth = await import("mammoth");
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value;
}

async function parsePdf(file: File): Promise<string> {
  // Dynamically import pdfjs to avoid SSR issues
  const pdfjsLib = await import("pdfjs-dist");
  pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  const pages: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const text = content.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ");
    pages.push(text);
  }
  return pages.join("\n\n");
}

// ─── Upload Screen ────────────────────────────────────────────────────────────

function UploadScreen({
  onAnalyze,
}: {
  onAnalyze: (cvText: string, jd: string) => void;
}) {
  const [cvText, setCvText] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [jd, setJd] = useState("");
  const [dragging, setDragging] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    setParseError(null);
    setCvText(null);
    setFileName(null);
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
      setCvText(text);
      setFileName(file.name);
    } catch {
      setParseError("Failed to parse file. Please try a different file.");
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
    if (!cvText || !jd.trim()) return;
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
      // Add status field to each segment
      const segments: Segment[] = data.segments.map((s: Omit<Segment, "status">) => ({
        ...s,
        status: "pending",
      }));
      onAnalyze(cvText, jd);
      // Pass segments up through a small hack — store in sessionStorage
      sessionStorage.setItem("tailor_segments", JSON.stringify(segments));
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
              dragging
                ? "border-blue-500 bg-blue-50"
                : cvText
                ? "border-green-400 bg-green-50"
                : "border-gray-200 bg-gray-50 hover:border-gray-300 hover:bg-gray-100"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".docx,.pdf"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
              }}
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
                <p className="mt-1 text-xs text-gray-500">
                  {cvText.length.toLocaleString()} characters extracted
                </p>
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
          {parseError && (
            <p className="text-xs text-red-500">{parseError}</p>
          )}
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
        <div className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
          {apiError}
        </div>
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
  onReset,
}: {
  segments: Segment[];
  onReset: () => void;
}) {
  const [segments, setSegments] = useState<Segment[]>(initialSegments);

  const changed = segments.filter((s) => s.changed);
  const approved = segments.filter((s) => s.changed && s.status === "approved");
  const reverted = segments.filter((s) => s.changed && s.status === "reverted");
  const pending = segments.filter((s) => s.changed && s.status === "pending");

  function approve(idx: number) {
    setSegments((prev) =>
      prev.map((s, i) => (i === idx ? { ...s, status: "approved" } : s))
    );
  }

  function revert(idx: number) {
    setSegments((prev) =>
      prev.map((s, i) => (i === idx ? { ...s, status: "reverted" } : s))
    );
  }

  function approveAll() {
    setSegments((prev) =>
      prev.map((s) => (s.changed && s.status === "pending" ? { ...s, status: "approved" } : s))
    );
  }

  async function downloadDocx() {
    const finalSegments = segments.map((s) => {
      if (!s.changed || s.status === "reverted") return s.original;
      if (s.status === "approved") return s.edited;
      return s.original; // pending → keep original
    });

    // Split text into paragraphs by newlines
    const fullText = finalSegments.join(" ");
    const paragraphs = fullText
      .split(/\n+/)
      .filter((line) => line.trim().length > 0)
      .map(
        (line) =>
          new Paragraph({
            children: [new TextRun({ text: line.trim(), size: 24, font: "Calibri" })],
            spacing: { after: 160 },
          })
      );

    const doc = new Document({
      sections: [{ children: paragraphs }],
    });

    const blob = await Packer.toBlob(doc);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "CV_Tailored.docx";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      {/* Summary bar */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-gray-100 bg-white px-6 py-4 shadow-sm">
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
          {approved.length > 0 && (
            <button
              onClick={downloadDocx}
              className="rounded-lg bg-[#2563EB] px-5 py-2 text-xs font-medium text-white hover:bg-blue-700 transition-colors"
            >
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

      {/* CV content */}
      <div className="rounded-xl border border-gray-100 bg-white px-8 py-8 shadow-sm">
        <div className="prose prose-sm max-w-none">
          {segments.map((seg, i) => {
            if (!seg.changed) {
              return (
                <span key={i} className="text-gray-900">
                  {seg.original}
                </span>
              );
            }

            const isApproved = seg.status === "approved";
            const isReverted = seg.status === "reverted";

            return (
              <span key={i} className="relative inline">
                {/* Edit block */}
                <span
                  className={`inline-flex flex-wrap items-start gap-1 rounded px-0.5 ${
                    isApproved
                      ? "bg-green-50"
                      : isReverted
                      ? "bg-gray-50"
                      : "bg-blue-50"
                  }`}
                >
                  {/* Edited text (shown when pending or approved) */}
                  {!isReverted && (
                    <span
                      className={`font-medium ${
                        isApproved ? "text-green-800" : "text-[#2563EB]"
                      }`}
                    >
                      {seg.edited}
                    </span>
                  )}
                  {/* Original text (shown reverted, or as strikethrough when pending) */}
                  {isReverted ? (
                    <span className="text-gray-900">{seg.original}</span>
                  ) : (
                    <span className="text-xs text-gray-400 line-through">{seg.original}</span>
                  )}
                  {/* Action buttons */}
                  {seg.status === "pending" && (
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
                      title="Undo approval"
                      className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-gray-100 text-gray-400 hover:bg-gray-200 transition-colors text-xs"
                    >
                      ↩
                    </button>
                  )}
                  {isReverted && (
                    <button
                      onClick={() => approve(i)}
                      title="Re-approve"
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

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CVTailorPage() {
  const [stage, setStage] = useState<Stage>("password");
  const [segments, setSegments] = useState<Segment[] | null>(null);

  function handleUnlock() {
    setStage("upload");
  }

  function handleAnalyze() {
    const raw = sessionStorage.getItem("tailor_segments");
    if (!raw) return;
    const segs: Segment[] = JSON.parse(raw);
    setSegments(segs);
    setStage("review");
  }

  function handleReset() {
    setSegments(null);
    setStage("upload");
    sessionStorage.removeItem("tailor_segments");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      {stage !== "password" && (
        <header className="border-b border-navy-900 bg-[#0f172a] px-6 py-4">
          <div className="mx-auto flex max-w-5xl items-center justify-between">
            <div>
              <span className="text-base font-semibold text-white">CV Tailor</span>
              <span className="ml-3 text-xs text-slate-400">Powered by Claude</span>
            </div>
            {stage === "review" && segments && (
              <span className="text-xs text-slate-500">
                Review your tailored edits below
              </span>
            )}
          </div>
        </header>
      )}

      {/* Stage content */}
      {stage === "password" && <PasswordGate onUnlock={handleUnlock} />}
      {stage === "upload" && (
        <UploadScreen onAnalyze={handleAnalyze} />
      )}
      {stage === "review" && segments && (
        <ReviewScreen segments={segments} onReset={handleReset} />
      )}
    </div>
  );
}
