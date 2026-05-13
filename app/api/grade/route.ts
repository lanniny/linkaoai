import { NextRequest, NextResponse } from "next/server";

import { anthropic, MODELS, assertOfficialEndpoint } from "@/lib/anthropic";
import { bannedTermsQuoted } from "@/lib/compliance";
import { emitAiUsage, incUsageCounter } from "@/lib/ai-usage";
import { attempts } from "@/lib/db";
import { assertNotMaintenance } from "@/lib/maintenance";
import { getPersistContext } from "@/lib/persistence";
import { checkQuota } from "@/lib/quota";
import { gradeRequestSchema, gradeResultSchema } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 45;

// haiku-4-5：批改单题反馈一般 800-2000 tokens 足够；3K 余量充裕。
const MAX_OUTPUT_TOKENS = 3072;

const SYSTEM_PROMPT = `你是临考（Linkao）的批改助手，对中国大学生的练习作答给出公正、鼓励式的批改与改进建议。

任务：根据题目（含题型 / 标准答案 / 标准解析）与学生答案，输出严格 JSON 格式的评分结果。

判定准则（按题型）：
- multiple_choice：比较学生答案中的字母（A/B/C/D 等）与 reference_answer 字母。完全一致 ai_score=100；答错 ai_score=0（不给部分分）；学生若给出推理过程但最终选错，可保留 0 分但在 feedback 中鼓励思路。
- fill_blank：主体内容数学等价即视为正确（例如 "2π/3" 与 "\\frac{2\\pi}{3}" 等价，"2+3i" 与 "3i+2" 等价）。完全正确 ai_score=100；只差单位 / 符号 = 70-89；概念错 = 0-39。
- calculation：综合"最终答案 + 关键步骤 + 推导严密性"。最终答案正确且步骤完整 = 90-100；答案对但步骤跳跃缺关键解释 = 70-89；步骤对但答案算错 = 40-69；概念错误 = 0-39；空白或与题无关 = 0。
- proof：评估推导链完整性。证毕且推导严密 = 90-100；漏关键引理或步骤 = 60-89；方法错 = 0-59。
- is_correct = (ai_score >= 60)。

ai_feedback 必填，使用 markdown，结构：
1. **答得好的地方**：先点出至少一个正面之处（即便答得差，也找思路 / 尝试中的亮点；空答时省略此节）
2. **需要注意**：清晰指出错误点 + 误解原因
3. **改进建议**：给具体下一步（重看哪个知识点 / 类似题型怎么练）

error_tags（可选）：每条 2-6 字，**只从下面词表里选**，最多 4 个：
"概念混淆" / "公式记错" / "符号错误" / "计算粗心" / "步骤遗漏" / "推导跳跃" / "条件遗漏" / "范围错误" / "化简错误" / "代数错误" / "几何理解错" / "题意误读"

next_step_hint（可选）：≤ 100 字，针对学生本题表现的下一步建议，例如"建议先复习两个重要极限的形式条件"。

LaTeX 约定：所有 ai_feedback / next_step_hint 中的数学公式用 \`$...$\`（行内）或 \`$$...$$\`（块级）包裹。

**JSON 转义关键约束**（违反会导致整次批改失效）：
- ai_feedback 和 next_step_hint 是 JSON 字符串。内部引用文本或选项内容时，**必须**使用中文方角括号「…」或中文双引号""…""，**禁止**用裸的英文双引号 "…"（会导致 JSON 解析失败）。
- 例：写「选项 A 表述了「对任意误差界…」这一本质」，不要写「选项 A 表述了"对任意误差界…"这一本质」。
- 公式 LaTeX 中的反斜杠保持单层（如 $\\varepsilon$），它会被 JSON 自动转义为 \\\\varepsilon — 你照常写 \\varepsilon 即可。

输出格式（严格 JSON，无 markdown 代码块包裹）：
{
  "is_correct": true,
  "ai_score": 95,
  "ai_feedback": "**答得好的地方**：...\\n\\n**需要注意**：...\\n\\n**改进建议**：...",
  "error_tags": ["计算粗心"],
  "next_step_hint": "建议..."
}

红线：
- 严禁输出${bannedTermsQuoted()}等任何字眼或同义表述
- 严禁嘲讽 / 贬低 / 否定学生，始终以教学者的关怀语气
- 强调辅助复习，所有内容仍以教材老师讲义为准
- 输出必须是合法 JSON，不要包含任何 \`\`\` 或解释性前后缀`;

export async function POST(req: NextRequest) {
  let userIdForLog: string | null = null;
  let aiStartedAt = 0;
  try {
    const maintGuard = await assertNotMaintenance();
    if (maintGuard) return maintGuard;

    assertOfficialEndpoint();
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: "ANTHROPIC_API_KEY 未配置（开发期请填 .env.local）" },
        { status: 500 },
      );
    }

    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      return NextResponse.json(
        { error: "请求体不是合法 JSON" },
        { status: 400 },
      );
    }

    const parsed = gradeRequestSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "请求体不符合 schema", details: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const { question, user_answer } = parsed.data;

    // 客户端直接拿到的提示信息 — 选择 / 填空类前置字符比对快速失败可省 token，但
    // 为了 feedback 一致性（无论对错都希望 AI 给"答得好的地方/需注意/改进建议"），
    // 还是交给 AI 统一判，仅 grade-route 不做客户端预判。
    const userText = `# 题目
题型: ${question.qtype}
难度: ${question.difficulty}
题干:
${question.prompt}
${
  question.options && question.options.length > 0
    ? `选项:\n${question.options.map((o) => `${o.key}. ${o.text}`).join("\n")}\n`
    : ""
}
标准答案: ${question.reference_answer}
标准解析:
${question.reference_explanation}

# 学生答案
${user_answer.trim() === "" ? "（学生未作答，留空）" : user_answer}

请按 system prompt 中的判定准则，对学生答案给出严格 JSON 格式的批改结果。`;

    aiStartedAt = Date.now();
    try {
      userIdForLog = (await getPersistContext())?.user_id ?? null;
    } catch {}

    const quota = await checkQuota(userIdForLog, "grade");
    if (!quota.allowed) {
      return NextResponse.json(
        {
          error: "quota_exceeded",
          message: `本月免费批改配额已用尽（${quota.used}/${quota.limit}）· 解锁单科可不限次`,
          quota,
        },
        { status: 429 },
      );
    }

    const response = await anthropic.messages.create({
      model: MODELS.bulk,
      max_tokens: MAX_OUTPUT_TOKENS,
      system: [
        {
          type: "text",
          text: SYSTEM_PROMPT,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [
        {
          role: "user",
          content: userText,
        },
      ],
    });

    void emitAiUsage({
      userId: userIdForLog,
      route: "grade",
      model: response.model,
      status: "success",
      latencyMs: Date.now() - aiStartedAt,
      promptTokens: response.usage?.input_tokens ?? null,
      completionTokens: response.usage?.output_tokens ?? null,
    });
    if (userIdForLog) void incUsageCounter(userIdForLog, "grade");

    const textBlock = response.content.find(
      (b): b is Extract<typeof b, { type: "text" }> => b.type === "text",
    );
    if (!textBlock) {
      return NextResponse.json(
        { error: "Claude 未返回文本块" },
        { status: 502 },
      );
    }

    let raw = textBlock.text.trim();
    if (raw.startsWith("```")) {
      raw = raw
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```$/, "")
        .trim();
    }

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(raw);
    } catch {
      return NextResponse.json(
        {
          error: "Claude 返回的不是合法 JSON",
          rawPreview: raw.slice(0, 500),
        },
        { status: 502 },
      );
    }

    const validated = gradeResultSchema.safeParse(parsedJson);
    if (!validated.success) {
      return NextResponse.json(
        {
          error: "JSON 不符合批改结果 schema",
          details: validated.error.flatten(),
          rawJson: parsedJson,
        },
        { status: 502 },
      );
    }

    // Optional persistence: write an attempt row if user signed in + question_db_id provided.
    let persisted: { attempt_id: string } | null = null;
    const ctx = await getPersistContext();
    if (ctx && parsed.data.question_db_id) {
      try {
        const [row] = await ctx.db
          .insert(attempts)
          .values({
            questionId: parsed.data.question_db_id,
            userId: ctx.user_id,
            userAnswer: user_answer,
            isCorrect: validated.data.is_correct,
            aiScore: validated.data.ai_score,
            aiFeedback: validated.data.ai_feedback,
            errorTags: validated.data.error_tags ?? null,
            nextStepHint: validated.data.next_step_hint ?? null,
          })
          .returning({ id: attempts.id });
        if (row) {
          persisted = { attempt_id: row.id };
        }
      } catch (err) {
        console.warn("[/api/grade] persistence threw:", err);
      }
    }

    return NextResponse.json({
      grade: validated.data,
      meta: {
        model: response.model,
        usage: response.usage,
        stopReason: response.stop_reason,
        graded_by: response.model,
      },
      persisted,
    });
  } catch (err) {
    console.error("[/api/grade] error:", err);
    const message = err instanceof Error ? err.message : "unknown error";
    if (aiStartedAt > 0) {
      void emitAiUsage({
        userId: userIdForLog,
        route: "grade",
        model: MODELS.bulk,
        status: "error",
        latencyMs: Date.now() - aiStartedAt,
        errorMessage: message,
      });
    }
    return NextResponse.json(
      { error: "批改失败", message },
      { status: 500 },
    );
  }
}
