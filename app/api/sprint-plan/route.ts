import { NextRequest, NextResponse } from "next/server";

import { anthropic, MODELS, assertOfficialEndpoint } from "@/lib/anthropic";
import { bannedTermsQuoted } from "@/lib/compliance";
import { getPersistContext } from "@/lib/persistence";
import {
  sprintPlanRequestSchema,
  sprintPlanSchema,
} from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

// haiku-4-5 cap = 8192 out. 30 天 × ~3-5 任务 / 天 ≈ 90-150 任务，按 ~25 tokens/task
// + 每日 day_focus ~ 30 tokens，总 4-5K tokens 输出。6K 留余量。
const MAX_OUTPUT_TOKENS = 6144;

const SYSTEM_PROMPT = `你是临考（Linkao）的冲刺计划助手，根据学生提供的考点大纲、考试日期和每日可用学习时间，生成一份可执行的逐日复习日程。

输入信息：
- outline：考点大纲（含每条 kp_id / title / level [必考/重点/了解] / explanation / estimated_minutes）
- exam_date：考试当天 (YYYY-MM-DD)
- start_date：计划起始日 (YYYY-MM-DD)，必须 ≤ exam_date
- daily_minutes：每日可用学习时间（分钟，整数）
- mastered_kp_ids：学生已掌握的考点 id 列表（可空），优先级降低或跳过

规划准则（强制遵守）：
1. 按 start_date → exam_date 逐日规划，每一天都是独立的 day 对象（即使该天没安排任务也要出现，tasks 留空）
2. **每日 total_minutes 严格 ≤ daily_minutes**（不超时；可以少于但每日尽量利用 80% 时间）
3. 优先级：必考 ≥ 重点 ≫ 了解。必考考点至少安排"学习 + 复习 + 练习"三轮，重点至少"学习 + 练习"两轮，了解可以单轮或跳过
4. **间隔重复**：同一 kp_id 的两轮学习/复习之间至少间隔 1-3 天，避免连续重复
5. **进度推进**：第 1-30% 的天数主要是"学习"+少量"练习"（建立知识网络），中间 30-80% 是"练习"+"复习"（强化），最后 20% 是"复习"+"模考"（冲刺）
6. **模考安排**：在最后 3 天内至少安排 1 次 task_type="模考"（task 关联到关键必考 kp_id，note 注明"做综合模拟卷"），minutes 占该日 50-80%
7. **每日聚焦**：day_focus 简短点出该天主题，例如"矢量基础打底 + 点乘练习"
8. mastered_kp_ids 中的考点优先级整体降低；必考降为重点处理，重点/了解可以省略

输出格式（严格 JSON，无 markdown 包裹）：
{
  "exam_date": "2026-06-09",
  "total_days": 30,
  "daily_minutes": 90,
  "daily_tasks": [
    {
      "day": 1,
      "date": "2026-05-12",
      "total_minutes": 85,
      "day_focus": "矢量基础打底",
      "tasks": [
        { "kp_id": "kp-1", "kp_title": "标量与矢量的概念", "minutes": 20, "task_type": "学习", "note": "通读教材 1.1 节" },
        { "kp_id": "kp-4", "kp_title": "矢量分量与单位矢量", "minutes": 40, "task_type": "学习", "note": "重点必考点" },
        { "kp_id": "kp-1", "kp_title": "标量与矢量的概念", "minutes": 25, "task_type": "练习", "note": "做 3 道课后题" }
      ]
    }
  ],
  "general_advice": "整体节奏前重后轻……（≤ 200 字）"
}

红线：
- 严禁输出${bannedTermsQuoted()}等任何字眼或同义表述
- 强调辅助复习，所有内容仍以教材老师讲义为准
- 输出必须是合法 JSON，不要包含任何 \`\`\` 或解释性前后缀`;

function daysBetweenInclusive(startISO: string, endISO: string): number {
  // Treat both as UTC midnight; difference in days (inclusive both ends).
  const a = Date.UTC(
    Number(startISO.slice(0, 4)),
    Number(startISO.slice(5, 7)) - 1,
    Number(startISO.slice(8, 10)),
  );
  const b = Date.UTC(
    Number(endISO.slice(0, 4)),
    Number(endISO.slice(5, 7)) - 1,
    Number(endISO.slice(8, 10)),
  );
  return Math.round((b - a) / 86400000) + 1;
}

function todayISO(): string {
  const d = new Date();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${d.getUTCFullYear()}-${m}-${day}`;
}

export async function POST(req: NextRequest) {
  try {
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

    const parsed = sprintPlanRequestSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "请求体不符合 schema", details: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const { outline, exam_date, daily_minutes, mastered_kp_ids } = parsed.data;
    const start_date = parsed.data.start_date ?? todayISO();

    const totalDays = daysBetweenInclusive(start_date, exam_date);
    if (totalDays < 1) {
      return NextResponse.json(
        { error: "exam_date 必须晚于或等于 start_date" },
        { status: 400 },
      );
    }
    if (totalDays > 90) {
      return NextResponse.json(
        { error: `计划长度 ${totalDays} 天超过 90 天上限，请缩短 start_date → exam_date` },
        { status: 400 },
      );
    }

    const topicsForPrompt = outline.topics.map((t) => ({
      id: t.id,
      title: t.title,
      level: t.level,
      estimated_minutes: t.estimated_minutes ?? 20,
    }));

    const userText = `课程主题: ${outline.source_title}
学科: ${outline.subject}
考试日期: ${exam_date}
计划起始日: ${start_date}
总天数: ${totalDays}
每日可用学习时间: ${daily_minutes} 分钟
已掌握考点 (优先级降低或跳过): ${mastered_kp_ids && mastered_kp_ids.length > 0 ? mastered_kp_ids.join(", ") : "无"}

考点列表 (${topicsForPrompt.length} 条):
${JSON.stringify(topicsForPrompt, null, 2)}

请基于以上信息生成 ${totalDays} 天逐日冲刺计划，严格按 system prompt 的规划准则。输出 JSON（无 markdown 包裹）。`;

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
      messages: [{ role: "user", content: userText }],
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

    const validated = sprintPlanSchema.safeParse(parsedJson);
    if (!validated.success) {
      return NextResponse.json(
        {
          error: "JSON 不符合冲刺计划 schema",
          details: validated.error.flatten(),
          rawJson: parsedJson,
        },
        { status: 502 },
      );
    }

    // Sanity check: total_minutes per day not exceeding daily_minutes by > 10%
    const overrunDays = validated.data.daily_tasks.filter(
      (d) => d.total_minutes > daily_minutes * 1.1,
    );

    // Optional persistence — write sprint_plan row if user signed in + course_id provided.
    let persisted: { sprint_plan_id: string } | null = null;
    const ctx = await getPersistContext();
    if (ctx && parsed.data.course_id) {
      try {
        const { data: row, error: spErr } = await ctx.supabase
          .from("sprint_plans")
          .insert({
            course_id: parsed.data.course_id,
            user_id: ctx.user_id,
            exam_date: exam_date,
            total_days: validated.data.total_days,
            daily_tasks: validated.data.daily_tasks,
          })
          .select("id")
          .single();
        if (!spErr && row) {
          persisted = { sprint_plan_id: row.id };
        } else if (spErr) {
          console.warn(
            "[/api/sprint-plan] sprint_plan insert failed:",
            spErr,
          );
        }
      } catch (err) {
        console.warn("[/api/sprint-plan] persistence threw:", err);
      }
    }

    return NextResponse.json({
      plan: validated.data,
      warnings: overrunDays.length > 0
        ? overrunDays.map((d) => ({
            day: d.day,
            date: d.date,
            total_minutes: d.total_minutes,
            note: `超出 daily_minutes (${daily_minutes}) 10% 以上`,
          }))
        : undefined,
      meta: {
        model: response.model,
        usage: response.usage,
        stopReason: response.stop_reason,
      },
      persisted,
    });
  } catch (err) {
    console.error("[/api/sprint-plan] error:", err);
    const message = err instanceof Error ? err.message : "unknown error";
    return NextResponse.json(
      { error: "生成失败", message },
      { status: 500 },
    );
  }
}
