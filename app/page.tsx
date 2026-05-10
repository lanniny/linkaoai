"use client";

import { useMemo, useState } from "react";
import type {
  DifficultyFocus,
  GeneratedQuestion,
  GradeResult,
  KnowledgePoint,
  Outline,
  Qtype,
  Subject,
} from "@/lib/types";

const SUBJECTS: Subject[] = ["高数", "线代", "概率论"];

const LEVEL_STYLES: Record<string, string> = {
  必考: "bg-red-100 text-red-700 border-red-200",
  重点: "bg-amber-100 text-amber-700 border-amber-200",
  了解: "bg-zinc-100 text-zinc-600 border-zinc-200",
};

const QTYPE_LABEL: Record<Qtype, string> = {
  multiple_choice: "选择题",
  fill_blank: "填空题",
  calculation: "计算题",
  proof: "证明题",
};

const DIFFICULTY_LABEL: Record<DifficultyFocus, string> = {
  easy: "简单",
  balanced: "均衡",
  hard: "偏难",
};

const DIFFICULTY_DOTS = (n: number) =>
  "●".repeat(n) + "○".repeat(Math.max(0, 5 - n));

// LaTeX 暂未接 KaTeX 渲染：把 $...$ / $$...$$ 段落用等宽字体的 inline span 显出来。
// 后续接 KaTeX 后此函数替换为 <KaTeX inline={...}>。
function LatexAware({ text }: { text: string }) {
  const parts = useMemo(() => splitLatex(text), [text]);
  return (
    <span className="whitespace-pre-wrap">
      {parts.map((p, i) =>
        p.kind === "math" ? (
          <code
            key={i}
            className="mx-0.5 rounded bg-zinc-100 px-1 py-0.5 font-mono text-[0.92em] text-zinc-800"
          >
            {p.text}
          </code>
        ) : (
          <span key={i}>{p.text}</span>
        ),
      )}
    </span>
  );
}

function splitLatex(s: string): { kind: "text" | "math"; text: string }[] {
  const out: { kind: "text" | "math"; text: string }[] = [];
  const re = /(\$\$[\s\S]+?\$\$|\$[^\n$]+?\$)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s)) !== null) {
    if (m.index > last) out.push({ kind: "text", text: s.slice(last, m.index) });
    out.push({ kind: "math", text: m[0] });
    last = m.index + m[0].length;
  }
  if (last < s.length) out.push({ kind: "text", text: s.slice(last) });
  return out;
}

export default function HomePage() {
  // ----- Step 1: upload PDF -----
  const [file, setFile] = useState<File | null>(null);
  const [subject, setSubject] = useState<Subject>("高数");
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // ----- Step 2: outline -----
  const [outline, setOutline] = useState<Outline | null>(null);
  const [extractMeta, setExtractMeta] = useState<{ model: string } | null>(
    null,
  );
  const [selectedKpIds, setSelectedKpIds] = useState<Set<string>>(new Set());

  // ----- Step 3: generate questions config -----
  const [questionCount, setQuestionCount] = useState<number>(5);
  const [chosenQtypes, setChosenQtypes] = useState<Set<Qtype>>(
    new Set(["multiple_choice", "calculation"]),
  );
  const [difficultyFocus, setDifficultyFocus] =
    useState<DifficultyFocus>("balanced");
  const [generateLoading, setGenerateLoading] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  // ----- Step 4: answering -----
  const [questions, setQuestions] = useState<GeneratedQuestion[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [grades, setGrades] = useState<Record<string, GradeResult>>({});
  const [gradeLoading, setGradeLoading] = useState(false);
  const [gradeError, setGradeError] = useState<string | null>(null);

  const currentQ = questions[currentIdx];
  const currentGrade = currentQ ? grades[currentQ.id] : undefined;

  // ----- handlers -----
  async function handleExtract(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setUploadError("请先选择 PDF 课件");
      return;
    }
    setUploadLoading(true);
    setUploadError(null);
    setOutline(null);
    setExtractMeta(null);
    setSelectedKpIds(new Set());
    setQuestions([]);
    setUserAnswers({});
    setGrades({});
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("subject", subject);
      const res = await fetch("/api/extract", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok)
        throw new Error(data.message || data.error || `HTTP ${res.status}`);
      const ol = data.outline as Outline;
      setOutline(ol);
      setExtractMeta({ model: data.meta?.model ?? "" });
      // 默认全选必考 + 重点
      setSelectedKpIds(
        new Set(
          ol.topics
            .filter((t) => t.level === "必考" || t.level === "重点")
            .map((t) => t.id),
        ),
      );
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "未知错误");
    } finally {
      setUploadLoading(false);
    }
  }

  async function handleGenerate() {
    if (!outline) return;
    if (selectedKpIds.size === 0) {
      setGenerateError("请至少选择一个考点");
      return;
    }
    if (chosenQtypes.size === 0) {
      setGenerateError("请至少选择一种题型");
      return;
    }
    setGenerateLoading(true);
    setGenerateError(null);
    setQuestions([]);
    setCurrentIdx(0);
    setUserAnswers({});
    setGrades({});
    try {
      const res = await fetch("/api/generate-questions", {
        method: "POST",
        headers: { "content-type": "application/json; charset=utf-8" },
        body: JSON.stringify({
          outline,
          count: questionCount,
          qtypes: Array.from(chosenQtypes),
          difficulty_focus: difficultyFocus,
          knowledge_point_ids: Array.from(selectedKpIds),
        }),
      });
      const data = await res.json();
      if (!res.ok)
        throw new Error(data.message || data.error || `HTTP ${res.status}`);
      setQuestions(data.questions as GeneratedQuestion[]);
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : "未知错误");
    } finally {
      setGenerateLoading(false);
    }
  }

  async function handleGrade(q: GeneratedQuestion) {
    const ua = userAnswers[q.id] ?? "";
    setGradeLoading(true);
    setGradeError(null);
    try {
      const res = await fetch("/api/grade", {
        method: "POST",
        headers: { "content-type": "application/json; charset=utf-8" },
        body: JSON.stringify({ question: q, user_answer: ua }),
      });
      const data = await res.json();
      if (!res.ok)
        throw new Error(data.message || data.error || `HTTP ${res.status}`);
      setGrades((prev) => ({ ...prev, [q.id]: data.grade as GradeResult }));
    } catch (err) {
      setGradeError(err instanceof Error ? err.message : "未知错误");
    } finally {
      setGradeLoading(false);
    }
  }

  function toggleKp(id: string) {
    setSelectedKpIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAllKp() {
    if (outline) setSelectedKpIds(new Set(outline.topics.map((t) => t.id)));
  }
  function clearKp() {
    setSelectedKpIds(new Set());
  }
  function toggleQtype(t: Qtype) {
    setChosenQtypes((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      return next;
    });
  }

  const allGraded =
    questions.length > 0 && questions.every((q) => grades[q.id]);

  return (
    <main className="mx-auto max-w-3xl space-y-8 p-6">
      <header>
        <h1 className="text-3xl font-bold">临考</h1>
        <p className="mt-1 text-zinc-600">
          AI 期末冲刺 · 高数 / 线代 / 概率论
        </p>
        <p className="mt-2 text-xs text-zinc-400">
          AI 生成内容仅供参考，请以教材 / 老师讲义为准
        </p>
      </header>

      {/* =========================== Step 1: upload =========================== */}
      <section
        aria-labelledby="step-1"
        className="space-y-4 rounded-lg border bg-white p-6 shadow-sm"
      >
        <div className="flex items-center gap-2">
          <StepBadge n={1} active={!outline} done={!!outline} />
          <h2 id="step-1" className="text-lg font-semibold">
            上传课件 PDF
          </h2>
        </div>

        <form onSubmit={handleExtract} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-2 sm:col-span-1">
              <label className="block text-sm font-medium" htmlFor="subject">
                学科
              </label>
              <select
                id="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value as Subject)}
                className="w-full rounded border border-zinc-300 bg-white px-3 py-2"
              >
                {SUBJECTS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <label className="block text-sm font-medium" htmlFor="file">
                课件 PDF (≤ 30 MB)
              </label>
              <input
                id="file"
                type="file"
                accept="application/pdf"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="w-full rounded border border-zinc-300 bg-white px-3 py-2 file:mr-3 file:rounded file:border-0 file:bg-zinc-100 file:px-3 file:py-1"
              />
              {file && (
                <p className="text-xs text-zinc-500">
                  已选：{file.name} ({(file.size / 1024 / 1024).toFixed(2)}{" "}
                  MB)
                </p>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={uploadLoading || !file}
            className="w-full rounded bg-zinc-900 px-4 py-2 font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {uploadLoading ? "提取中…（约 30-60 秒）" : "提取考点大纲"}
          </button>
          {uploadError && (
            <p className="text-sm text-red-600">⚠️ {uploadError}</p>
          )}
        </form>
      </section>

      {/* =========================== Step 2: outline =========================== */}
      {outline && (
        <section
          aria-labelledby="step-2"
          className="space-y-4 rounded-lg border bg-white p-6 shadow-sm"
        >
          <div className="flex items-center gap-2">
            <StepBadge
              n={2}
              active={questions.length === 0}
              done={questions.length > 0}
            />
            <h2 id="step-2" className="text-lg font-semibold">
              选择考点 + 出题设置
            </h2>
          </div>

          <div>
            <h3 className="text-base font-medium">{outline.source_title}</h3>
            <p className="mt-1 text-xs text-zinc-500">
              学科：{outline.subject} · {outline.topics.length} 条考点
              {extractMeta?.model && (
                <span className="ml-2 rounded bg-zinc-100 px-2 py-0.5">
                  by {extractMeta.model}
                </span>
              )}
            </p>
          </div>

          {outline.notes && (
            <div className="rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              📌 <LatexAware text={outline.notes} />
            </div>
          )}

          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-500">
              已选 {selectedKpIds.size} / {outline.topics.length}
            </span>
            <div className="space-x-2">
              <button
                onClick={selectAllKp}
                type="button"
                className="rounded border px-2 py-1 hover:bg-zinc-50"
              >
                全选
              </button>
              <button
                onClick={clearKp}
                type="button"
                className="rounded border px-2 py-1 hover:bg-zinc-50"
              >
                清空
              </button>
            </div>
          </div>

          <ul className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
            {outline.topics.map((t) => (
              <KpRow
                key={t.id}
                t={t}
                checked={selectedKpIds.has(t.id)}
                onToggle={() => toggleKp(t.id)}
              />
            ))}
          </ul>

          <div className="space-y-3 border-t pt-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className="block text-xs font-medium text-zinc-600">
                  出题数量
                </label>
                <input
                  type="number"
                  min={1}
                  max={15}
                  value={questionCount}
                  onChange={(e) =>
                    setQuestionCount(
                      Math.max(1, Math.min(15, Number(e.target.value) || 5)),
                    )
                  }
                  className="mt-1 w-full rounded border border-zinc-300 px-2 py-1 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-600">
                  难度倾向
                </label>
                <select
                  value={difficultyFocus}
                  onChange={(e) =>
                    setDifficultyFocus(e.target.value as DifficultyFocus)
                  }
                  className="mt-1 w-full rounded border border-zinc-300 bg-white px-2 py-1 text-sm"
                >
                  {(Object.keys(DIFFICULTY_LABEL) as DifficultyFocus[]).map(
                    (d) => (
                      <option key={d} value={d}>
                        {DIFFICULTY_LABEL[d]}
                      </option>
                    ),
                  )}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-600">
                  题型（多选）
                </label>
                <div className="mt-1 flex flex-wrap gap-1">
                  {(Object.keys(QTYPE_LABEL) as Qtype[]).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => toggleQtype(t)}
                      className={`rounded border px-2 py-1 text-xs transition ${
                        chosenQtypes.has(t)
                          ? "border-zinc-900 bg-zinc-900 text-white"
                          : "border-zinc-300 bg-white text-zinc-600 hover:bg-zinc-50"
                      }`}
                    >
                      {QTYPE_LABEL[t]}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleGenerate}
              disabled={
                generateLoading ||
                selectedKpIds.size === 0 ||
                chosenQtypes.size === 0
              }
              className="w-full rounded bg-zinc-900 px-4 py-2 font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {generateLoading
                ? "生成中…（约 10-20 秒）"
                : `基于选中考点出 ${questionCount} 题`}
            </button>
            {generateError && (
              <p className="text-sm text-red-600">⚠️ {generateError}</p>
            )}
          </div>
        </section>
      )}

      {/* =========================== Step 3: answering =========================== */}
      {questions.length > 0 && currentQ && (
        <section
          aria-labelledby="step-3"
          className="space-y-4 rounded-lg border bg-white p-6 shadow-sm"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <StepBadge n={3} active={!allGraded} done={allGraded} />
              <h2 id="step-3" className="text-lg font-semibold">
                练习 · 第 {currentIdx + 1} / {questions.length} 题
              </h2>
            </div>
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <span className="rounded bg-zinc-100 px-2 py-0.5">
                {QTYPE_LABEL[currentQ.qtype]}
              </span>
              <span className="rounded bg-zinc-100 px-2 py-0.5">
                难度 {DIFFICULTY_DOTS(currentQ.difficulty)}
              </span>
              {currentQ.knowledge_point_id && (
                <span className="rounded bg-zinc-100 px-2 py-0.5 font-mono">
                  {currentQ.knowledge_point_id}
                </span>
              )}
            </div>
          </div>

          <div className="rounded border border-zinc-200 bg-zinc-50 p-4 text-sm leading-relaxed">
            <LatexAware text={currentQ.prompt} />
          </div>

          {currentQ.qtype === "multiple_choice" && currentQ.options && (
            <ul className="space-y-2">
              {currentQ.options.map((o) => {
                const selected = userAnswers[currentQ.id] === o.key;
                const locked = !!currentGrade;
                return (
                  <li key={o.key}>
                    <button
                      type="button"
                      disabled={locked}
                      onClick={() =>
                        setUserAnswers((prev) => ({
                          ...prev,
                          [currentQ.id]: o.key,
                        }))
                      }
                      className={`w-full rounded border px-3 py-2 text-left text-sm transition ${
                        selected
                          ? "border-zinc-900 bg-zinc-900 text-white"
                          : "border-zinc-300 bg-white hover:bg-zinc-50"
                      } ${locked ? "cursor-not-allowed opacity-80" : ""}`}
                    >
                      <span className="mr-2 font-mono">{o.key}.</span>
                      <LatexAware text={o.text} />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {currentQ.qtype !== "multiple_choice" && (
            <textarea
              value={userAnswers[currentQ.id] ?? ""}
              disabled={!!currentGrade}
              onChange={(e) =>
                setUserAnswers((prev) => ({
                  ...prev,
                  [currentQ.id]: e.target.value,
                }))
              }
              placeholder="在此输入你的解答（公式用 $...$ 包裹）"
              rows={6}
              className="w-full rounded border border-zinc-300 bg-white p-3 text-sm font-mono leading-relaxed focus:border-zinc-900 focus:outline-none disabled:cursor-not-allowed disabled:opacity-80"
            />
          )}

          {!currentGrade && (
            <button
              type="button"
              onClick={() => handleGrade(currentQ)}
              disabled={gradeLoading || !(userAnswers[currentQ.id] ?? "").trim()}
              className="w-full rounded bg-zinc-900 px-4 py-2 font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {gradeLoading ? "批改中…（约 5-10 秒）" : "提交答案"}
            </button>
          )}
          {gradeError && (
            <p className="text-sm text-red-600">⚠️ {gradeError}</p>
          )}

          {currentGrade && (
            <GradePanel grade={currentGrade} reference={currentQ} />
          )}

          <div className="flex items-center justify-between border-t pt-3">
            <button
              type="button"
              disabled={currentIdx === 0}
              onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))}
              className="rounded border px-3 py-1 text-sm disabled:opacity-40"
            >
              ← 上一题
            </button>
            <span className="text-xs text-zinc-400">
              已批改 {Object.keys(grades).length} / {questions.length}
            </span>
            <button
              type="button"
              disabled={currentIdx >= questions.length - 1}
              onClick={() =>
                setCurrentIdx((i) => Math.min(questions.length - 1, i + 1))
              }
              className="rounded border px-3 py-1 text-sm disabled:opacity-40"
            >
              下一题 →
            </button>
          </div>

          {allGraded && (
            <div className="rounded border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
              🎉 全部 {questions.length} 题已批改。建议先复盘错题，再回到 Step
              2 重新选考点出新题。
            </div>
          )}
        </section>
      )}

      <footer className="border-t pt-6 text-center text-xs text-zinc-400">
        临考 · linkaoai.com · MVP Day 5
      </footer>
    </main>
  );
}

function StepBadge({
  n,
  active,
  done,
}: {
  n: number;
  active: boolean;
  done: boolean;
}) {
  return (
    <span
      className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold ${
        done
          ? "bg-emerald-100 text-emerald-700"
          : active
            ? "bg-zinc-900 text-white"
            : "bg-zinc-200 text-zinc-500"
      }`}
    >
      {done ? "✓" : n}
    </span>
  );
}

function KpRow({
  t,
  checked,
  onToggle,
}: {
  t: KnowledgePoint;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <li>
      <label
        className={`flex cursor-pointer items-start gap-3 rounded border p-3 transition ${
          checked
            ? "border-zinc-900 bg-zinc-50"
            : "border-zinc-200 bg-white hover:border-zinc-300"
        }`}
      >
        <input
          type="checkbox"
          checked={checked}
          onChange={onToggle}
          className="mt-1 h-4 w-4 accent-zinc-900"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <span className="font-medium">
              <LatexAware text={t.title} />
            </span>
            <span
              className={`shrink-0 rounded border px-2 py-0.5 text-xs ${
                LEVEL_STYLES[t.level] ?? ""
              }`}
            >
              {t.level}
            </span>
          </div>
          <p className="mt-1 text-xs text-zinc-600">
            <LatexAware text={t.explanation} />
          </p>
          {t.estimated_minutes && (
            <p className="mt-1 font-mono text-[10px] text-zinc-400">
              预计 {t.estimated_minutes} 分钟
            </p>
          )}
        </div>
      </label>
    </li>
  );
}

function GradePanel({
  grade,
  reference,
}: {
  grade: GradeResult;
  reference: GeneratedQuestion;
}) {
  const scoreColor =
    grade.ai_score >= 90
      ? "text-emerald-700"
      : grade.ai_score >= 60
        ? "text-amber-700"
        : "text-red-700";
  return (
    <div className="space-y-3 rounded border border-zinc-200 bg-white p-4 text-sm">
      <div className="flex items-center justify-between">
        <span className="text-zinc-500">批改结果</span>
        <span className={`text-2xl font-bold ${scoreColor}`}>
          {grade.is_correct ? "✓" : "✗"} {grade.ai_score}
          <span className="ml-0.5 text-sm text-zinc-400">/100</span>
        </span>
      </div>

      {grade.error_tags && grade.error_tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {grade.error_tags.map((t) => (
            <span
              key={t}
              className="rounded bg-red-50 px-2 py-0.5 text-xs text-red-700"
            >
              {t}
            </span>
          ))}
        </div>
      )}

      <div className="leading-relaxed text-zinc-700">
        <LatexAware text={grade.ai_feedback} />
      </div>

      {grade.next_step_hint && (
        <div className="rounded bg-blue-50 px-3 py-2 text-xs text-blue-900">
          💡 <LatexAware text={grade.next_step_hint} />
        </div>
      )}

      <details className="text-xs text-zinc-500">
        <summary className="cursor-pointer">查看标准答案 / 解析</summary>
        <div className="mt-2 space-y-1 rounded bg-zinc-50 p-2">
          <div>
            <span className="font-medium">答案：</span>
            <LatexAware text={reference.reference_answer} />
          </div>
          <div>
            <span className="font-medium">解析：</span>
            <LatexAware text={reference.reference_explanation} />
          </div>
        </div>
      </details>
    </div>
  );
}
