import { z } from "zod";

export const subjectSchema = z.enum(["高数", "线代", "概率论", "其他"]);
export type Subject = z.infer<typeof subjectSchema>;

export const knowledgePointLevelSchema = z.enum(["必考", "重点", "了解"]);
export type KnowledgePointLevel = z.infer<typeof knowledgePointLevelSchema>;

export const knowledgePointSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1).max(120),
  level: knowledgePointLevelSchema,
  explanation: z.string().min(1).max(500),
  prerequisites: z.array(z.string()).optional(),
  estimated_minutes: z.number().int().min(1).max(60).optional(),
});
export type KnowledgePoint = z.infer<typeof knowledgePointSchema>;

export const outlineSchema = z.object({
  subject: subjectSchema,
  source_title: z.string().min(1).max(200),
  topics: z.array(knowledgePointSchema).min(1).max(80),
  notes: z.string().max(800).optional(),
});
export type Outline = z.infer<typeof outlineSchema>;

// ============================================================
// Questions (Day 3)
// ============================================================

export const qtypeSchema = z.enum([
  "multiple_choice",
  "fill_blank",
  "calculation",
  "proof",
]);
export type Qtype = z.infer<typeof qtypeSchema>;

export const questionOptionSchema = z.object({
  key: z.string().regex(/^[A-Z]$/, "options.key 必须是单个大写字母"),
  text: z.string().min(1).max(200),
});
export type QuestionOption = z.infer<typeof questionOptionSchema>;

export const generatedQuestionSchema = z.object({
  id: z.string().min(1).max(20),
  // 关联到 outline.topics[*].id；跨知识点综合题可留空
  knowledge_point_id: z.string().min(1).max(40).nullable().optional(),
  qtype: qtypeSchema,
  difficulty: z.number().int().min(1).max(5),
  prompt: z.string().min(5).max(1200),
  // 仅 multiple_choice 题需要 options；其他题型该字段为 null
  options: z.array(questionOptionSchema).min(2).max(6).nullable().optional(),
  reference_answer: z.string().min(1).max(1000),
  reference_explanation: z.string().min(1).max(2000),
});
export type GeneratedQuestion = z.infer<typeof generatedQuestionSchema>;

export const questionsBatchSchema = z.object({
  questions: z.array(generatedQuestionSchema).min(1).max(20),
});
export type QuestionsBatch = z.infer<typeof questionsBatchSchema>;

export const difficultyFocusSchema = z.enum(["easy", "balanced", "hard"]);
export type DifficultyFocus = z.infer<typeof difficultyFocusSchema>;

export const generateQuestionsRequestSchema = z.object({
  outline: outlineSchema,
  count: z.number().int().min(1).max(15).default(5),
  qtypes: z.array(qtypeSchema).min(1).max(4).optional(),
  difficulty_focus: difficultyFocusSchema.optional(),
  // 限定到 outline.topics 的子集；不传则全大纲为出题源
  knowledge_point_ids: z.array(z.string().min(1)).max(80).optional(),
  // Optional persistence linkage (returned by /api/extract.persisted.course_id)
  course_id: z.string().uuid().optional(),
  // Map from outline KP user-facing id ("kp-3") → DB UUID. From extract persisted.
  knowledge_point_id_map: z.record(z.string(), z.string().uuid()).optional(),
});
export type GenerateQuestionsRequest = z.infer<
  typeof generateQuestionsRequestSchema
>;

// ============================================================
// Grading (Day 4)
// ============================================================

// 错误分类标签（与批改 prompt 中的固定词表对齐；UI 后续可按 tag 聚合薄弱点）
export const errorTagSchema = z.string().min(1).max(40);

export const gradeRequestSchema = z.object({
  question: generatedQuestionSchema,
  user_answer: z.string().max(5000), // 允许空字符串（学生没作答）
  // 可选元信息：用时等；目前不影响判定，仅作为未来 attempt 行的辅助字段
  attempt_meta: z
    .object({
      duration_seconds: z.number().int().min(0).max(86400).optional(),
    })
    .optional(),
  // Optional persistence: DB UUID of the question (from generate-questions
  // response persisted.question_id_map). Without it the grade is stateless.
  question_db_id: z.string().uuid().optional(),
});
export type GradeRequest = z.infer<typeof gradeRequestSchema>;

export const gradeResultSchema = z.object({
  is_correct: z.boolean(),
  ai_score: z.number().min(0).max(100),
  ai_feedback: z.string().min(1).max(3000),
  error_tags: z.array(errorTagSchema).max(8).optional(),
  next_step_hint: z.string().min(1).max(500).optional(),
});
export type GradeResult = z.infer<typeof gradeResultSchema>;

// ============================================================
// Sprint plan (Day 7)
// ============================================================

// 单日内单条任务（指向某 KP + 分配时长 + 学习类型）
export const sprintTaskSchema = z.object({
  kp_id: z.string().min(1).max(40),
  kp_title: z.string().min(1).max(200),
  minutes: z.number().int().min(1).max(180),
  task_type: z.enum(["学习", "复习", "练习", "模考"]),
  note: z.string().max(120).optional(),
});
export type SprintTask = z.infer<typeof sprintTaskSchema>;

// ISO date string YYYY-MM-DD
const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "日期必须是 YYYY-MM-DD 格式");

export const sprintDaySchema = z.object({
  day: z.number().int().min(1).max(90),
  date: isoDateSchema,
  // 总分钟不应超过 daily_minutes，由 prompt 约束 + 校验
  total_minutes: z.number().int().min(0).max(600),
  day_focus: z.string().min(1).max(60),
  tasks: z.array(sprintTaskSchema).min(0).max(12),
});
export type SprintDay = z.infer<typeof sprintDaySchema>;

export const sprintPlanSchema = z.object({
  exam_date: isoDateSchema,
  total_days: z.number().int().min(1).max(90),
  daily_minutes: z.number().int().min(15).max(600),
  daily_tasks: z.array(sprintDaySchema).min(1).max(90),
  general_advice: z.string().max(600).optional(),
});
export type SprintPlan = z.infer<typeof sprintPlanSchema>;

// ============================================================
// Payments (Day 8)
// ============================================================

export const paymentChannelSchema = z.enum([
  "wechat_manual",
  "alipay_manual",
  "epay_alipay",
  "epay_wxpay",
  "redemption_code",
]);
export type PaymentChannel = z.infer<typeof paymentChannelSchema>;

// Sub-request for /api/payment/epay/create — turns a pending payment into a
// signed EPay redirect URL. order_id from /api/payment/intent response.
export const epayCreateRequestSchema = z.object({
  order_id: z.string().uuid(),
  type: z.enum(["alipay", "wxpay", "qqpay"]),
});
export type EpayCreateRequest = z.infer<typeof epayCreateRequestSchema>;

// Redemption code redeem — user submits code, server atomically marks
// code used + inserts paid payment row.
export const redemptionRedeemRequestSchema = z.object({
  code: z
    .string()
    .min(4)
    .max(64)
    .regex(/^[A-Z0-9\-_]+$/i, "兑换码只能含字母、数字、- _"),
});
export type RedemptionRedeemRequest = z.infer<
  typeof redemptionRedeemRequestSchema
>;

/**
 * Payment intent 接受三种购买类型：
 *   - 'single_subject' (默认 · 向后兼容)：旧版 19.9 单科一次性永久买断
 *   - 'plus_monthly'：Plus 月订阅 ¥9.9 / 30 天
 *   - 'pro_monthly'：Pro 月订阅 ¥19.9 / 30 天
 *
 * 旧 client 不传 purchase_type 时默认 single_subject + 需要 subject 字段；
 * 订阅 client 传 plus_monthly / pro_monthly 时 subject 可省。
 */
export const purchaseTypeSchema = z.enum([
  "single_subject",
  "plus_monthly",
  "pro_monthly",
]);
export type PurchaseType = z.infer<typeof purchaseTypeSchema>;

export const paymentIntentRequestSchema = z
  .object({
    purchase_type: purchaseTypeSchema.default("single_subject"),
    subject: subjectSchema.optional(),
    channel: paymentChannelSchema,
    notes: z.string().max(200).optional(),
  })
  .refine(
    (d) => d.purchase_type !== "single_subject" || d.subject !== undefined,
    { message: "single_subject 必须传 subject", path: ["subject"] },
  );
export type PaymentIntentRequest = z.infer<typeof paymentIntentRequestSchema>;

export const sprintPlanRequestSchema = z.object({
  outline: outlineSchema,
  exam_date: isoDateSchema, // 考试当天日期
  daily_minutes: z.number().int().min(15).max(300).default(60),
  // 已掌握、可降权或跳过的知识点 id 列表
  mastered_kp_ids: z.array(z.string().min(1)).max(80).optional(),
  // 起始日期；省略时由服务端用 "今天" (UTC) 注入
  start_date: isoDateSchema.optional(),
  // Optional persistence linkage
  course_id: z.string().uuid().optional(),
});
export type SprintPlanRequest = z.infer<typeof sprintPlanRequestSchema>;
