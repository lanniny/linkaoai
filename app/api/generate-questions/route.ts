import { NextRequest, NextResponse } from "next/server";

import {
  assertOfficialEndpoint,
  markChannelError,
  markChannelOk,
  resolveChannel,
  type ResolvedChannel,
} from "@/lib/anthropic";
import { bannedTermsQuoted } from "@/lib/compliance";
import { emitAiUsage } from "@/lib/ai-usage";
import { chargeUsage } from "@/lib/charge";
import { questions } from "@/lib/db";
import { assertNotMaintenance } from "@/lib/maintenance";
import { getPersistContext } from "@/lib/persistence";
import { checkQuota } from "@/lib/quota";
import {
  generateQuestionsRequestSchema,
  questionsBatchSchema,
} from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

// haiku-4-5 默认输出上限 8192，留 1024 安全余量。
// 实测 5 题混合题型 (含 calculation explanation) ≈ 2.5K-4K tokens，6K 够用。
const MAX_OUTPUT_TOKENS = 6144;

const SYSTEM_PROMPT = `你是临考（Linkao）的出题助手，专门帮中国大学生从已提取的考点大纲生成原创练习题，并附标准答案与详细解析。

任务：根据用户提供的大纲（含知识点 id、标题、难度等级、解释），为指定知识点出题。

题型说明：
- multiple_choice：单选题。options 必填，是 \`{"key":"<单大写字母>","text":"<选项内容>"}\` 对象数组（至少 4 个），**严禁写成 "A. xxx" 字符串数组**。reference_answer 给字母（如 "B"）
- fill_blank：填空题，options 留 null，reference_answer 给最终结果
- calculation：计算/解答题，options 留 null，reference_answer 给最终结果，reference_explanation 给完整推导步骤
- proof：证明题，options 留 null，reference_answer 给核心结论（或"证毕"），reference_explanation 给完整推导链

难度等级（1-5）：
1 = 基础概念辨析（直接套定义）
2 = 标准公式套用，单步运算
3 = 多步计算 / 综合应用
4 = 跨知识点 / 需要变形或建模
5 = 拓展 / 竞赛风格

LaTeX 约定：所有数学公式用 \`$...$\`（行内）或 \`$$...$$\`（块级）包裹。不要裸写公式或用 Unicode 上下标拼凑。

质量准则：
- 必须原创题目，不要照抄考研真题/教辅原题
- knowledge_point_id 关联到 outline.topics 中具体某条的 id（如 "kp-3"），跨 KP 综合题可留 null
- prompt 自包含：读题不需要再翻教材也能答
- reference_explanation 至少给推导思路 + 关键步骤 + 易错点，让学生能自学
- difficulty 字段务必和题目实际难度匹配（不要全部 3）

输出格式（严格 JSON，无 markdown 包裹，options 严格按下示对象数组形式）：
{
  "questions": [
    {
      "id": "q-1",
      "knowledge_point_id": "kp-2",
      "qtype": "multiple_choice",
      "difficulty": 2,
      "prompt": "题干含 $LaTeX$...",
      "options": [
        {"key": "A", "text": "$2$"},
        {"key": "B", "text": "$3$"},
        {"key": "C", "text": "$5$"},
        {"key": "D", "text": "$7$"}
      ],
      "reference_answer": "C",
      "reference_explanation": "推导..."
    },
    {
      "id": "q-2",
      "knowledge_point_id": "kp-3",
      "qtype": "calculation",
      "difficulty": 3,
      "prompt": "题干...",
      "options": null,
      "reference_answer": "x = ...",
      "reference_explanation": "推导步骤..."
    }
  ]
}

红线：
- 严禁输出${bannedTermsQuoted()}等任何字眼或同义表述
- 题目必须是原创练习，禁止照搬考试真题原题
- 强调辅助复习，所有内容仍以教材老师讲义为准
- 输出必须是合法 JSON，不要包含任何 \`\`\` 或解释性前后缀`;

export async function POST(req: NextRequest) {
  let userIdForLog: string | null = null;
  let aiStartedAt = 0;
  let channel: ResolvedChannel | null = null;
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

    const parsed = generateQuestionsRequestSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "请求体不符合 schema", details: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const {
      outline,
      count,
      qtypes,
      difficulty_focus,
      knowledge_point_ids,
    } = parsed.data;

    // Optional filter: limit out-of-band to subset of topics the user picked
    let pickedTopics = outline.topics;
    if (knowledge_point_ids && knowledge_point_ids.length > 0) {
      const ids = new Set(knowledge_point_ids);
      pickedTopics = outline.topics.filter((t) => ids.has(t.id));
      if (pickedTopics.length === 0) {
        return NextResponse.json(
          {
            error:
              "knowledge_point_ids 在 outline.topics 中未匹配到任何条目",
          },
          { status: 400 },
        );
      }
    }

    const topicsForPrompt = pickedTopics.map((t) => ({
      id: t.id,
      title: t.title,
      level: t.level,
      explanation: t.explanation,
    }));

    const qtypeRequest =
      qtypes && qtypes.length > 0
        ? `请均匀使用以下题型: ${qtypes.join(", ")}`
        : "请混合使用题型，至少包含 multiple_choice 和 calculation 各一道";

    const difficultyHint = {
      easy: "整体难度偏简单，集中在 1-2 级",
      balanced: "难度均匀分布，1-4 级都覆盖",
      hard: "整体偏难，集中在 3-5 级",
    }[difficulty_focus ?? "balanced"];

    const userText = `课程主题: ${outline.source_title}
学科: ${outline.subject}
共 ${pickedTopics.length} 条知识点（如下 JSON）:
${JSON.stringify(topicsForPrompt, null, 2)}

请生成 ${count} 道原创练习题。
- ${qtypeRequest}
- ${difficultyHint}
- 严格输出 JSON（无 markdown 包裹），格式见 system prompt`;

    aiStartedAt = Date.now();
    try {
      userIdForLog = (await getPersistContext())?.user_id ?? null;
    } catch {}

    const quota = await checkQuota(userIdForLog, "generate_questions");
    if (!quota.allowed) {
      return NextResponse.json(
        {
          error: "quota_exceeded",
          message: `本月免费出题配额已用尽（${quota.used}/${quota.limit}）· 解锁单科可不限次`,
          quota,
        },
        { status: 429 },
      );
    }

    channel = await resolveChannel("bulk");
    const response = await channel.client.messages.create({
      model: channel.model,
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
    void markChannelOk(channel.channelId);

    void emitAiUsage({
      userId: userIdForLog,
      channelId: channel.channelId,
      route: "generate_questions",
      model: response.model,
      status: "success",
      latencyMs: Date.now() - aiStartedAt,
      promptTokens: response.usage?.input_tokens ?? null,
      completionTokens: response.usage?.output_tokens ?? null,
    });
    void chargeUsage({
      userId: userIdForLog,
      quotaSource: quota.source,
      kind: "generate_questions",
      model: response.model,
      promptTokens: response.usage?.input_tokens ?? null,
      completionTokens: response.usage?.output_tokens ?? null,
    });

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

    const validated = questionsBatchSchema.safeParse(parsedJson);
    if (!validated.success) {
      return NextResponse.json(
        {
          error: "JSON 不符合题目 schema",
          details: validated.error.flatten(),
          rawJson: parsedJson,
        },
        { status: 502 },
      );
    }

    // Optional persistence — only persists if Supabase configured + user
    // signed in + course_id provided (i.e. came from a persisted /api/extract).
    let persisted: { question_id_map: Record<string, string> } | null = null;
    const ctx = await getPersistContext();
    if (ctx && parsed.data.course_id) {
      try {
        const rows = validated.data.questions.map((q) => ({
          courseId: parsed.data.course_id!,
          userId: ctx.user_id,
          knowledgePointId:
            (q.knowledge_point_id &&
              parsed.data.knowledge_point_id_map?.[q.knowledge_point_id]) ||
            null,
          qtype: q.qtype,
          difficulty: q.difficulty,
          prompt: q.prompt,
          options: q.options ?? null,
          referenceAnswer: q.reference_answer,
          referenceExplanation: q.reference_explanation,
          meta: { generated_by: response.model },
        }));
        const inserted = await ctx.db
          .insert(questions)
          .values(rows)
          .returning({ id: questions.id });
        const question_id_map: Record<string, string> = {};
        inserted.forEach((row, i: number) => {
          const qid = validated.data.questions[i]?.id;
          if (qid) question_id_map[qid] = row.id;
        });
        persisted = { question_id_map };
      } catch (err) {
        console.warn("[/api/generate-questions] persistence threw:", err);
      }
    }

    return NextResponse.json({
      questions: validated.data.questions,
      meta: {
        model: response.model,
        usage: response.usage,
        stopReason: response.stop_reason,
      },
      persisted,
    });
  } catch (err) {
    console.error("[/api/generate-questions] error:", err);
    const message = err instanceof Error ? err.message : "unknown error";
    if (aiStartedAt > 0) {
      void emitAiUsage({
        userId: userIdForLog,
        channelId: channel?.channelId ?? null,
        route: "generate_questions",
        model: channel?.model ?? "unknown",
        status: "error",
        latencyMs: Date.now() - aiStartedAt,
        errorMessage: message,
      });
      void markChannelError(channel?.channelId ?? null, message);
    }
    return NextResponse.json(
      { error: "生成失败", message },
      { status: 500 },
    );
  }
}
