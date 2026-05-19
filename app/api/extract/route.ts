import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { emitAiUsage } from "@/lib/ai-usage";
import {
  assertOfficialEndpoint,
  markChannelError,
  markChannelOk,
  resolveChannel,
  type ResolvedChannel,
} from "@/lib/anthropic";
import { chargeUsage } from "@/lib/charge";
import { bannedTermsQuoted } from "@/lib/compliance";
import { courses, knowledgePoints } from "@/lib/db";
import { assertNotMaintenance } from "@/lib/maintenance";
import { getPersistContext } from "@/lib/persistence";
import { checkQuota } from "@/lib/quota";
import { outlineSchema, subjectSchema } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 90;

const MAX_BYTES = 30 * 1024 * 1024; // Anthropic PDF native ~32 MB cap; keep margin

const requestParamsSchema = z.object({
  subject: subjectSchema,
});

const SYSTEM_PROMPT = `你是临考（Linkao）的考点提取助手，专门帮中国大学生从课件 PDF 提取期末复习考点。

核心任务：
1. 从用户上传的课件中识别核心知识点
2. 为每个知识点判定难度等级：
   - 必考：高频考点、教材重点章节、本课程必掌握
   - 重点：常见考点、需要熟练
   - 了解：偶有出现、知道概念即可
3. 给出 1-3 句简短解释（学生友好、不绕弯）
4. 估算每个知识点掌握需要的分钟数（1-60，正整数）
5. 严格输出 JSON，不要 markdown 代码块包裹

数量约束（极其重要，避免输出被截断）：
- topics 数组长度必须在 12-22 条之间。如果原 PDF 章节内容过多，按"必考 > 重点 > 了解"优先级筛选 22 条最值得复习的。
- 每条 explanation 控制在 60 字以内，notes 控制在 150 字以内。
- 优先输出"必考"和"重点"，"了解"级别如果空间紧张可以舍去。

输出格式（严格遵守 schema）：
{
  "subject": "高数" | "线代" | "概率论" | "其他",
  "source_title": "<10-40 字课件主题>",
  "topics": [
    {
      "id": "kp-<序号>",
      "title": "<知识点名>",
      "level": "必考" | "重点" | "了解",
      "explanation": "<2-3 句>",
      "estimated_minutes": <1-60>
    }
  ],
  "notes": "<可选：整体复习建议，≤200字>"
}

红线：
- 严禁输出${bannedTermsQuoted()}等任何字眼或同义表述
- 强调辅助复习，所有内容仍以教材老师讲义为准
- 严禁直接将考试原题答案当作复习材料输出
- 输出必须是合法 JSON，不要包含任何 \`\`\` 或解释性前后缀`;

export async function POST(req: NextRequest) {
  let userIdForLog: string | null = null;
  let aiStartedAt = 0;
  // Resolved at request-time; declared outside try so catch can attribute.
  let channel: ResolvedChannel | null = null;
  try {
    // M8 maintenance gate (admin routes do not check this).
    const maintGuard = await assertNotMaintenance();
    if (maintGuard) return maintGuard;

    assertOfficialEndpoint();
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: "ANTHROPIC_API_KEY 未配置（开发期请填 .env.local）" },
        { status: 500 },
      );
    }

    const formData = await req.formData();
    const file = formData.get("file");
    const subjectRaw = formData.get("subject");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "请求缺少 file 字段" },
        { status: 400 },
      );
    }

    const params = requestParamsSchema.safeParse({ subject: subjectRaw });
    if (!params.success) {
      return NextResponse.json(
        { error: "subject 字段非法", details: params.error.flatten() },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    if (buffer.length > MAX_BYTES) {
      return NextResponse.json(
        { error: `文件超过 ${MAX_BYTES / 1024 / 1024} MB 上限` },
        { status: 413 },
      );
    }
    if (buffer.length === 0) {
      return NextResponse.json({ error: "空文件" }, { status: 400 });
    }

    const base64 = buffer.toString("base64");

    // M4 mirror — capture user id (best effort) and start time so we can
    // emit one ai_usage_logs row whether the call succeeds or throws.
    aiStartedAt = Date.now();
    try {
      userIdForLog = (await getPersistContext())?.user_id ?? null;
    } catch {}

    // M2 mirror — free-tier monthly quota check (paid users bypass).
    const quota = await checkQuota(userIdForLog, "extract");
    if (!quota.allowed) {
      return NextResponse.json(
        {
          error: "quota_exceeded",
          message: `本月免费提取配额已用尽（${quota.used}/${quota.limit}）· 解锁单科可不限次`,
          quota,
        },
        { status: 429 },
      );
    }

    channel = await resolveChannel("primary");
    const response = await channel.client.messages.create({
      model: channel.model,
      // 8192 留足空间：22 条 topics × ~150 tokens 中文 ≈ 3.3K，加 notes/标题约 4K，留 2× 余量
      max_tokens: 8192,
      // Prompt caching: SYSTEM_PROMPT is constant across requests, so we cache it.
      // 5-minute TTL → repeat extracts within the window only pay 0.1× input cost.
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
          content: [
            {
              type: "document",
              source: {
                type: "base64",
                media_type: "application/pdf",
                data: base64,
              },
              // Also cache the document if it's the same PDF on retry — saves
              // a re-upload of the binary tokens. Costs nothing if PDF differs.
              cache_control: { type: "ephemeral" },
            },
            {
              type: "text",
              text: `请从这份课件提取${params.data.subject}的考点大纲，严格输出 JSON（无 markdown 包裹）。`,
            },
          ],
        },
      ],
    });

    void markChannelOk(channel.channelId);

    // M4 mirror — fire-and-forget telemetry; never blocks the response.
    void emitAiUsage({
      userId: userIdForLog,
      channelId: channel.channelId,
      route: "extract",
      model: response.model,
      status: "success",
      latencyMs: Date.now() - aiStartedAt,
      promptTokens: response.usage?.input_tokens ?? null,
      completionTokens: response.usage?.output_tokens ?? null,
    });
    const charge = await chargeUsage({
      userId: userIdForLog,
      quotaSource: quota.source,
      kind: "extract",
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
    // Defensive: strip markdown fences if Claude slips one in despite the prompt.
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

    const validated = outlineSchema.safeParse(parsedJson);
    if (!validated.success) {
      return NextResponse.json(
        {
          error: "JSON 不符合大纲 schema",
          details: validated.error.flatten(),
          rawJson: parsedJson,
        },
        { status: 502 },
      );
    }

    // Optional persistence — only if Supabase is configured AND user is signed in.
    // Stateless callers get the same response, just without `persisted`.
    let persisted: {
      course_id: string;
      knowledge_point_id_map: Record<string, string>;
    } | null = null;
    const ctx = await getPersistContext();
    if (ctx) {
      try {
        const [course] = await ctx.db
          .insert(courses)
          .values({
            userId: ctx.user_id,
            subject: validated.data.subject,
            sourceTitle: validated.data.source_title,
            sourceMeta: {
              model: response.model,
              usage: response.usage,
              stop_reason: response.stop_reason,
              file_size_bytes: buffer.length,
            },
          })
          .returning({ id: courses.id });

        if (course) {
          // Insert KPs in original order; capture returned ids to map
          // user-facing string ids (kp-1, kp-2, ...) -> DB ids so
          // downstream routes (generate-questions, grade) can link back.
          const kpRows = validated.data.topics.map((t, i) => ({
            courseId: course.id,
            userId: ctx.user_id,
            kpKey: t.id,
            ordinal: i,
            title: t.title,
            level: t.level,
            explanation: t.explanation,
            prerequisites: t.prerequisites ?? null,
            estimatedMinutes: t.estimated_minutes ?? null,
          }));
          const insertedKps = await ctx.db
            .insert(knowledgePoints)
            .values(kpRows)
            .returning({
              id: knowledgePoints.id,
              ordinal: knowledgePoints.ordinal,
            });

          const kpIdMap: Record<string, string> = {};
          insertedKps.forEach((row) => {
            const userFacingId = validated.data.topics[row.ordinal]?.id;
            if (userFacingId) kpIdMap[userFacingId] = row.id;
          });
          persisted = {
            course_id: course.id,
            knowledge_point_id_map: kpIdMap,
          };
        }
      } catch (err) {
        console.warn("[/api/extract] persistence threw:", err);
      }
    }

    return NextResponse.json({
      outline: validated.data,
      meta: {
        model: response.model,
        usage: response.usage,
        stopReason: response.stop_reason,
        charge,
      },
      persisted,
    });
  } catch (err) {
    console.error("[/api/extract] error:", err);
    const message = err instanceof Error ? err.message : "unknown error";
    if (aiStartedAt > 0) {
      void emitAiUsage({
        userId: userIdForLog,
        channelId: channel?.channelId ?? null,
        route: "extract",
        model: channel?.model ?? "unknown",
        status: "error",
        latencyMs: Date.now() - aiStartedAt,
        errorMessage: message,
      });
      void markChannelError(channel?.channelId ?? null, message);
    }
    return NextResponse.json(
      { error: "提取失败", message },
      { status: 500 },
    );
  }
}
