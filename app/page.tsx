"use client";

import katex from "katex";
import { useEffect, useMemo, useRef, useState } from "react";
import type {
  DifficultyFocus,
  GeneratedQuestion,
  GradeResult,
  KnowledgePoint,
  Outline,
  Qtype,
  SprintDay,
  SprintPlan,
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

// 把 $...$ / $$...$$ 切片后分别用 KaTeX 行内 / 块级渲染；invalid LaTeX 时 fallback
// 显示原文（throwOnError: false），不打断整个题目阅读流。
function LatexAware({ text }: { text: string }) {
  const parts = useMemo(() => splitLatex(text), [text]);
  return (
    <span className="whitespace-pre-wrap">
      {parts.map((p, i) => {
        if (p.kind !== "math") return <span key={i}>{p.text}</span>;
        const isBlock = p.text.startsWith("$$");
        const inner = isBlock ? p.text.slice(2, -2) : p.text.slice(1, -1);
        return isBlock ? (
          <KatexBlock key={i} tex={inner} />
        ) : (
          <KatexInline key={i} tex={inner} />
        );
      })}
    </span>
  );
}

function KatexInline({ tex }: { tex: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    try {
      katex.render(tex, ref.current, {
        displayMode: false,
        throwOnError: false,
        strict: false,
      });
    } catch {
      ref.current.textContent = `$${tex}$`;
    }
  }, [tex]);
  return <span ref={ref} className="mx-0.5 inline-block align-middle" />;
}

function KatexBlock({ tex }: { tex: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    try {
      katex.render(tex, ref.current, {
        displayMode: true,
        throwOnError: false,
        strict: false,
      });
    } catch {
      ref.current.textContent = `$$${tex}$$`;
    }
  }, [tex]);
  return <div ref={ref} className="my-2 overflow-x-auto" />;
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

  // ----- Mock exam mode: presets generate-questions controls + integrated report at end -----
  const [mockExamMode, setMockExamMode] = useState(false);

  function toggleMockMode() {
    const next = !mockExamMode;
    setMockExamMode(next);
    if (next) {
      // sync the visible controls so user sees what mock mode just configured
      setQuestionCount(12);
      setChosenQtypes(
        new Set(["multiple_choice", "fill_blank", "calculation", "proof"]),
      );
      setDifficultyFocus("balanced");
    }
  }

  const currentQ = questions[currentIdx];
  const currentGrade = currentQ ? grades[currentQ.id] : undefined;

  // ----- Step 5: sprint plan (optional, parallel to questions branch) -----
  // React 19 lint flags Date.now() inside useMemo as impure; useState lazy
  // init is the idiomatic way to compute "once at mount" values.
  const [today] = useState(() => {
    const d = new Date();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${d.getFullYear()}-${m}-${day}`;
  });
  const [examDate, setExamDate] = useState<string>(() => {
    const d = new Date(Date.now() + 14 * 86400000);
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${d.getFullYear()}-${m}-${day}`;
  });
  const [dailyMinutes, setDailyMinutes] = useState<number>(60);
  const [sprintPlan, setSprintPlan] = useState<SprintPlan | null>(null);
  const [sprintLoading, setSprintLoading] = useState(false);
  const [sprintError, setSprintError] = useState<string | null>(null);

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

  async function handleSprintPlan() {
    if (!outline) return;
    if (examDate < today) {
      setSprintError("考试日期不能早于今天");
      return;
    }
    setSprintLoading(true);
    setSprintError(null);
    setSprintPlan(null);
    try {
      const res = await fetch("/api/sprint-plan", {
        method: "POST",
        headers: { "content-type": "application/json; charset=utf-8" },
        body: JSON.stringify({
          outline,
          exam_date: examDate,
          daily_minutes: dailyMinutes,
          start_date: today,
        }),
      });
      const data = await res.json();
      if (!res.ok)
        throw new Error(data.message || data.error || `HTTP ${res.status}`);
      setSprintPlan(data.plan as SprintPlan);
    } catch (err) {
      setSprintError(err instanceof Error ? err.message : "未知错误");
    } finally {
      setSprintLoading(false);
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
      <header className="space-y-2">
        <div className="flex items-baseline justify-between gap-3">
          <h1 className="text-3xl font-bold">临考</h1>
          <a
            href="/pay"
            className="rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800 transition hover:bg-amber-100"
          >
            💰 19.9 / 科 · 挂科退款 →
          </a>
        </div>
        <p className="text-zinc-600">
          AI 期末冲刺 · 高数 / 线代 / 概率论
        </p>
        <p className="text-xs text-zinc-400">
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
            {/* Mock exam preset toggle */}
            <div className="flex items-center justify-between gap-3 rounded border border-purple-200 bg-purple-50 px-3 py-2 text-xs">
              <span className="font-medium text-purple-900">
                🎯 完整模拟卷模式 · 12 题 / 全题型 / 均衡难度 / 答完看整卷报告
              </span>
              <button
                type="button"
                onClick={toggleMockMode}
                className={`shrink-0 rounded border px-3 py-1 font-medium transition ${
                  mockExamMode
                    ? "border-purple-700 bg-purple-700 text-white"
                    : "border-purple-300 bg-white text-purple-700 hover:bg-purple-100"
                }`}
              >
                {mockExamMode ? "✓ 已开启" : "开启"}
              </button>
            </div>

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
                : mockExamMode
                  ? `生成模拟卷（${questionCount} 题）`
                  : `基于选中考点出 ${questionCount} 题`}
            </button>
            {generateError && (
              <p className="text-sm text-red-600">⚠️ {generateError}</p>
            )}
          </div>

          {/* ---------- Sprint plan sub-panel ---------- */}
          <div className="space-y-3 border-t pt-4">
            <div className="flex items-baseline gap-2">
              <span className="text-base">🎯</span>
              <h3 className="text-sm font-semibold">
                冲刺计划（按考试日期排日程）
              </h3>
            </div>
            <p className="text-xs text-zinc-500">
              AI 会按「必考 ≥ 重点 ≫ 了解」优先级 + 间隔重复 + 末段模考的逻辑，
              给你一份逐日学习清单。
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label
                  className="block text-xs font-medium text-zinc-600"
                  htmlFor="exam-date"
                >
                  考试日期
                </label>
                <input
                  id="exam-date"
                  type="date"
                  value={examDate}
                  min={today}
                  onChange={(e) => setExamDate(e.target.value)}
                  className="mt-1 w-full rounded border border-zinc-300 bg-white px-2 py-1 text-sm"
                />
              </div>
              <div>
                <label
                  className="block text-xs font-medium text-zinc-600"
                  htmlFor="daily-minutes"
                >
                  每日学习（分钟）
                </label>
                <input
                  id="daily-minutes"
                  type="number"
                  min={15}
                  max={300}
                  step={15}
                  value={dailyMinutes}
                  onChange={(e) =>
                    setDailyMinutes(
                      Math.max(
                        15,
                        Math.min(300, Number(e.target.value) || 60),
                      ),
                    )
                  }
                  className="mt-1 w-full rounded border border-zinc-300 bg-white px-2 py-1 text-sm"
                />
              </div>
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={handleSprintPlan}
                  disabled={sprintLoading || examDate < today}
                  className="w-full rounded bg-emerald-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {sprintLoading
                    ? "生成中…（约 10-30 秒）"
                    : "生成冲刺计划"}
                </button>
              </div>
            </div>
            {sprintError && (
              <p className="text-sm text-red-600">⚠️ {sprintError}</p>
            )}
            {sprintPlan && <SprintPlanPanel plan={sprintPlan} />}
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

          {allGraded && outline && (
            <MockExamReport
              questions={questions}
              grades={grades}
              outline={outline}
              isMockMode={mockExamMode}
            />
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

function MockExamReport({
  questions,
  grades,
  outline,
  isMockMode,
}: {
  questions: GeneratedQuestion[];
  grades: Record<string, GradeResult>;
  outline: Outline;
  isMockMode: boolean;
}) {
  // ----- aggregate stats -----
  const total = questions.length;
  const allGrades = questions.map((q) => grades[q.id]).filter(Boolean);
  const correctCount = allGrades.filter((g) => g.is_correct).length;
  const avgScore =
    allGrades.length > 0
      ? allGrades.reduce((s, g) => s + g.ai_score, 0) / allGrades.length
      : 0;

  // group by knowledge-point level (必考 / 重点 / 了解) via outline lookup
  const kpLevel: Record<string, string> = {};
  for (const t of outline.topics) kpLevel[t.id] = t.level;
  type Bucket = { sum: number; count: number; correct: number };
  const byLevel: Record<string, Bucket> = {
    必考: { sum: 0, count: 0, correct: 0 },
    重点: { sum: 0, count: 0, correct: 0 },
    了解: { sum: 0, count: 0, correct: 0 },
    "(其他)": { sum: 0, count: 0, correct: 0 },
  };
  for (const q of questions) {
    const g = grades[q.id];
    if (!g) continue;
    const lvl =
      (q.knowledge_point_id && kpLevel[q.knowledge_point_id]) || "(其他)";
    const b = byLevel[lvl] ?? byLevel["(其他)"];
    b.sum += g.ai_score;
    b.count += 1;
    if (g.is_correct) b.correct += 1;
  }

  // error tag frequency (top 5)
  const tagFreq: Record<string, number> = {};
  for (const g of allGrades) {
    for (const tag of g.error_tags ?? []) {
      tagFreq[tag] = (tagFreq[tag] ?? 0) + 1;
    }
  }
  const topTags = Object.entries(tagFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // wrong question shortlist
  const wrongs = questions
    .map((q, i) => ({ q, i, g: grades[q.id] }))
    .filter((x) => x.g && !x.g.is_correct);

  const scoreColor =
    avgScore >= 80
      ? "text-emerald-700"
      : avgScore >= 60
        ? "text-amber-700"
        : "text-red-700";

  return (
    <div className="space-y-4 rounded border border-emerald-200 bg-emerald-50/60 p-4 text-sm">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-base font-semibold">
          {isMockMode ? "📋 模拟卷报告" : "🎉 练习总结"}
        </h3>
        <div>
          <span className={`text-3xl font-bold ${scoreColor}`}>
            {avgScore.toFixed(1)}
          </span>
          <span className="ml-1 text-xs text-zinc-500">/100</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center text-xs">
        <div className="rounded bg-white p-2">
          <div className="text-zinc-500">题数</div>
          <div className="text-lg font-semibold">{total}</div>
        </div>
        <div className="rounded bg-white p-2">
          <div className="text-zinc-500">答对</div>
          <div className="text-lg font-semibold text-emerald-700">
            {correctCount}
          </div>
        </div>
        <div className="rounded bg-white p-2">
          <div className="text-zinc-500">正确率</div>
          <div className="text-lg font-semibold">
            {total > 0 ? Math.round((correctCount / total) * 100) : 0}%
          </div>
        </div>
      </div>

      <div className="rounded bg-white p-3">
        <div className="text-xs font-medium text-zinc-700">
          📊 按考点等级分布
        </div>
        <ul className="mt-2 space-y-1 text-xs">
          {(Object.keys(byLevel) as (keyof typeof byLevel)[])
            .filter((lvl) => byLevel[lvl].count > 0)
            .map((lvl) => {
              const b = byLevel[lvl];
              const avg = b.count > 0 ? b.sum / b.count : 0;
              return (
                <li key={lvl} className="flex items-baseline gap-2">
                  <span
                    className={`shrink-0 rounded border px-1.5 py-0.5 ${
                      LEVEL_STYLES[lvl] ?? ""
                    }`}
                  >
                    {lvl}
                  </span>
                  <span className="text-zinc-600">
                    {b.correct}/{b.count} 题 · 平均{" "}
                    <span className="font-medium">{avg.toFixed(1)}</span>
                  </span>
                </li>
              );
            })}
        </ul>
      </div>

      {topTags.length > 0 && (
        <div className="rounded bg-white p-3">
          <div className="text-xs font-medium text-zinc-700">
            🔥 高频错误类型
          </div>
          <div className="mt-2 flex flex-wrap gap-1">
            {topTags.map(([tag, count]) => (
              <span
                key={tag}
                className="rounded bg-red-50 px-2 py-0.5 text-xs text-red-700"
              >
                {tag} × {count}
              </span>
            ))}
          </div>
        </div>
      )}

      {wrongs.length > 0 && (
        <div className="rounded bg-white p-3">
          <div className="text-xs font-medium text-zinc-700">
            ❌ 错题清单（{wrongs.length} 道）
          </div>
          <ul className="mt-2 space-y-1 text-xs">
            {wrongs.slice(0, 8).map(({ q, i, g }) => (
              <li key={q.id} className="flex items-baseline gap-2">
                <span className="font-mono text-[10px] text-zinc-400">
                  Q{i + 1}
                </span>
                <span className="text-zinc-700">
                  {q.prompt.slice(0, 60)}
                  {q.prompt.length > 60 ? "…" : ""}
                </span>
                <span className="ml-auto shrink-0 text-zinc-500">
                  {g!.ai_score}
                </span>
              </li>
            ))}
            {wrongs.length > 8 && (
              <li className="text-zinc-400">
                …还有 {wrongs.length - 8} 道，请上下翻题复盘
              </li>
            )}
          </ul>
        </div>
      )}

      <p className="rounded bg-amber-50 px-3 py-2 text-xs text-amber-800">
        💡 建议先复盘错题（点上方「上一题/下一题」），再回到 Step 2
        重新选考点出新题或调整模拟卷。
      </p>
    </div>
  );
}

const TASK_TYPE_STYLES: Record<SprintDay["tasks"][number]["task_type"], string> =
  {
    学习: "bg-blue-50 text-blue-800 border-blue-200",
    复习: "bg-amber-50 text-amber-800 border-amber-200",
    练习: "bg-emerald-50 text-emerald-800 border-emerald-200",
    模考: "bg-red-50 text-red-800 border-red-200",
  };

function SprintPlanPanel({ plan }: { plan: SprintPlan }) {
  return (
    <div className="space-y-3 rounded border border-emerald-200 bg-emerald-50/30 p-3 text-sm">
      <div className="flex items-center justify-between text-xs text-zinc-600">
        <span>
          共 {plan.total_days} 天 · {plan.daily_minutes} 分钟/天
        </span>
        <span>考试日 {plan.exam_date}</span>
      </div>
      <ul className="max-h-[460px] space-y-2 overflow-y-auto pr-1">
        {plan.daily_tasks.map((d) => (
          <li
            key={d.day}
            className="rounded border border-zinc-200 bg-white p-3"
          >
            <div className="flex items-baseline justify-between gap-2">
              <span className="font-medium">
                Day {d.day}{" "}
                <span className="font-mono text-xs text-zinc-500">
                  · {d.date}
                </span>
              </span>
              <span className="text-xs text-zinc-500">{d.total_minutes} min</span>
            </div>
            <p className="mt-1 text-xs text-zinc-600">📌 {d.day_focus}</p>
            {d.tasks.length === 0 ? (
              <p className="mt-2 text-xs text-zinc-400">（无任务 · 休息日）</p>
            ) : (
              <ul className="mt-2 space-y-1">
                {d.tasks.map((t, i) => (
                  <li
                    key={i}
                    className="flex items-baseline gap-2 text-xs leading-relaxed"
                  >
                    <span
                      className={`shrink-0 rounded border px-1.5 py-0.5 ${TASK_TYPE_STYLES[t.task_type] ?? ""}`}
                    >
                      {t.task_type}
                    </span>
                    <span className="flex-1">
                      <span className="text-zinc-700">{t.kp_title}</span>
                      <span className="ml-1 text-zinc-400">
                        ({t.minutes}min)
                      </span>
                      {t.note && (
                        <span className="ml-1 text-zinc-500">— {t.note}</span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
      {plan.general_advice && (
        <div className="rounded bg-white p-2 text-xs text-zinc-600">
          💡 {plan.general_advice}
        </div>
      )}
    </div>
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
