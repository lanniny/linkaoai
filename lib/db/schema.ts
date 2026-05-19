import { sql } from "drizzle-orm";
import {
  index,
  integer,
  primaryKey,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

// ============================================================================
// better-auth core tables (user / session / account / verification)
// ============================================================================
// We extend `user` with a numeric `role` column for our new-api-style role
// model (0=user / 1=admin / 10=root). The same lib/admin.ts helpers will read
// this column instead of Supabase app_metadata.

export const user = sqliteTable("user", {
  id: text("id").primaryKey(),
  name: text("name"),
  email: text("email").notNull().unique(),
  emailVerified: integer("emailVerified", { mode: "boolean" })
    .notNull()
    .default(false),
  image: text("image"),
  // Linkao extension: role (0 / 1 / 10). Defaults to common user.
  role: integer("role").notNull().default(0),
  createdAt: integer("createdAt", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
  updatedAt: integer("updatedAt", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
});

export const session = sqliteTable(
  "session",
  {
    id: text("id").primaryKey(),
    userId: text("userId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    token: text("token").notNull().unique(),
    expiresAt: integer("expiresAt", { mode: "timestamp_ms" }).notNull(),
    ipAddress: text("ipAddress"),
    userAgent: text("userAgent"),
    createdAt: integer("createdAt", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
    updatedAt: integer("updatedAt", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (t) => ({
    userIdx: index("session_user_idx").on(t.userId),
  }),
);

export const account = sqliteTable(
  "account",
  {
    id: text("id").primaryKey(),
    userId: text("userId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accountId: text("accountId").notNull(),
    providerId: text("providerId").notNull(),
    accessToken: text("accessToken"),
    refreshToken: text("refreshToken"),
    idToken: text("idToken"),
    accessTokenExpiresAt: integer("accessTokenExpiresAt", {
      mode: "timestamp_ms",
    }),
    refreshTokenExpiresAt: integer("refreshTokenExpiresAt", {
      mode: "timestamp_ms",
    }),
    scope: text("scope"),
    // For email/password provider better-auth stores the bcrypt hash here.
    password: text("password"),
    createdAt: integer("createdAt", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
    updatedAt: integer("updatedAt", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (t) => ({
    userIdx: index("account_user_idx").on(t.userId),
    providerIdx: index("account_provider_idx").on(t.providerId, t.accountId),
  }),
);

export const verification = sqliteTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: integer("expiresAt", { mode: "timestamp_ms" }).notNull(),
    createdAt: integer("createdAt", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
    updatedAt: integer("updatedAt", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (t) => ({
    identifierIdx: index("verification_identifier_idx").on(t.identifier),
  }),
);

// ============================================================================
// Domain · courses → knowledge_points → questions → attempts
// ============================================================================

export const courses = sqliteTable(
  "courses",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    subject: text("subject").notNull(), // 高数 | 线代 | 概率论 | 其他
    sourceTitle: text("source_title").notNull(),
    sourceMeta: text("source_meta", { mode: "json" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
    deletedAt: integer("deleted_at", { mode: "timestamp_ms" }),
  },
  (t) => ({
    userIdx: index("courses_user_idx").on(t.userId, t.createdAt),
  }),
);

export const knowledgePoints = sqliteTable(
  "knowledge_points",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    courseId: text("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    // Outline-facing id (e.g. "kp-3")
    kpKey: text("kp_key").notNull(),
    title: text("title").notNull(),
    level: text("level").notNull(), // 必考 | 重点 | 了解
    explanation: text("explanation").notNull(),
    prerequisites: text("prerequisites", { mode: "json" }),
    estimatedMinutes: integer("estimated_minutes"),
    ordinal: integer("ordinal").notNull().default(0),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (t) => ({
    courseIdx: index("kp_course_idx").on(t.courseId, t.ordinal),
    userLevelIdx: index("kp_user_level_idx").on(t.userId, t.level),
  }),
);

export const questions = sqliteTable(
  "questions",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    courseId: text("course_id").references(() => courses.id, {
      onDelete: "cascade",
    }),
    knowledgePointId: text("knowledge_point_id").references(
      () => knowledgePoints.id,
      { onDelete: "set null" },
    ),
    qtype: text("qtype").notNull(), // multiple_choice | fill_blank | calculation | proof
    difficulty: integer("difficulty").notNull(),
    prompt: text("prompt").notNull(),
    options: text("options", { mode: "json" }),
    referenceAnswer: text("reference_answer").notNull(),
    referenceExplanation: text("reference_explanation").notNull(),
    meta: text("meta", { mode: "json" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (t) => ({
    courseIdx: index("q_course_idx").on(t.courseId),
    userIdx: index("q_user_idx").on(t.userId, t.createdAt),
  }),
);

export const attempts = sqliteTable(
  "attempts",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    questionId: text("question_id")
      .notNull()
      .references(() => questions.id, { onDelete: "cascade" }),
    userAnswer: text("user_answer").notNull(),
    isCorrect: integer("is_correct", { mode: "boolean" }).notNull(),
    aiScore: real("ai_score").notNull(),
    aiFeedback: text("ai_feedback").notNull(),
    errorTags: text("error_tags", { mode: "json" }),
    nextStepHint: text("next_step_hint"),
    durationSeconds: integer("duration_seconds"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (t) => ({
    userIdx: index("att_user_idx").on(t.userId, t.createdAt),
    qIdx: index("att_question_idx").on(t.questionId),
  }),
);

export const weaknessPoints = sqliteTable(
  "weakness_points",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    knowledgePointId: text("knowledge_point_id")
      .notNull()
      .references(() => knowledgePoints.id, { onDelete: "cascade" }),
    missCount: integer("miss_count").notNull().default(1),
    lastMissedAt: integer("last_missed_at", { mode: "timestamp_ms" }),
    resolvedAt: integer("resolved_at", { mode: "timestamp_ms" }),
  },
  (t) => ({
    uniq: uniqueIndex("weakness_uniq").on(t.userId, t.knowledgePointId),
    userIdx: index("weakness_user_idx").on(t.userId, t.lastMissedAt),
  }),
);

export const sprintPlans = sqliteTable(
  "sprint_plans",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    courseId: text("course_id").references(() => courses.id, {
      onDelete: "set null",
    }),
    examDate: text("exam_date").notNull(), // ISO YYYY-MM-DD
    totalDays: integer("total_days").notNull(),
    dailyMinutes: integer("daily_minutes").notNull(),
    plan: text("plan", { mode: "json" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (t) => ({
    userIdx: index("plans_user_idx").on(t.userId, t.createdAt),
  }),
);

// ============================================================================
// Payments + Redemption codes
// ============================================================================

export const payments = sqliteTable(
  "payments",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    // 'subject' 现在是双语义：单科购买时填学科名（高数/线代/概率论/其他），
    // 订阅时填 plan 名（plus/pro），UI 通过 plan 字段区分而不依赖 subject。
    subject: text("subject").notNull(),
    amountCny: real("amount_cny").notNull(),
    status: text("status").notNull().default("pending"), // pending | paid | refunded | failed
    // 'plan' 区分本次付款的商品类型：
    //   null → 旧版单科一次性购买（保留兼容；status='paid' 视作永久权益）
    //   'plus' → Plus 月订阅
    //   'pro' → Pro 月订阅 或 Pro 年订阅（用 period_days 区分）
    plan: text("plan"),
    // 订阅订单的有效期长度（天）。30 = 月付，365 = 年付，null = 单科一次性
    // （legacy）或老的订阅行（迁移前默认 30 天）。notify/mark-paid 时这个
    // 值传给 issueSubscriptionFromPayment 决定 period_end。
    periodDays: integer("period_days"),
    channel: text("channel").notNull(),
    // wechat_manual | alipay_manual | epay_alipay | epay_wxpay | redemption_code
    notes: text("notes"),
    notesAdmin: text("notes_admin"),
    paidAt: integer("paid_at", { mode: "timestamp_ms" }),
    refundAt: integer("refund_at", { mode: "timestamp_ms" }),
    refundReason: text("refund_reason"),
    refundBy: text("refund_by").references(() => user.id, {
      onDelete: "set null",
    }),
    epayTradeNo: text("epay_trade_no"),
    epayOutTradeNo: text("epay_out_trade_no"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (t) => ({
    userIdx: index("payments_user_idx").on(t.userId, t.createdAt),
    statusIdx: index("payments_status_idx").on(t.status),
  }),
);

export const redemptionCodes = sqliteTable(
  "redemption_codes",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    code: text("code").notNull().unique(),
    subject: text("subject").notNull(),
    amountCny: real("amount_cny").notNull().default(19.9),
    status: text("status").notNull().default("active"), // active | used | expired | revoked
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }),
    usedBy: text("used_by").references(() => user.id, { onDelete: "set null" }),
    usedAt: integer("used_at", { mode: "timestamp_ms" }),
    notes: text("notes"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (t) => ({
    statusIdx: index("rc_status_idx").on(t.status),
  }),
);

// ============================================================================
// new-api mirror modules (M1 / M2 / M3 / M4 / M8)
// ============================================================================

export const personalAccessTokens = sqliteTable(
  "personal_access_tokens",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    prefix: text("prefix").notNull(),
    tokenHash: text("token_hash").notNull().unique(),
    scopes: text("scopes", { mode: "json" }).notNull(),
    lastUsedAt: integer("last_used_at", { mode: "timestamp_ms" }),
    revokedAt: integer("revoked_at", { mode: "timestamp_ms" }),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (t) => ({
    userIdx: index("pat_user_idx").on(t.userId, t.createdAt),
  }),
);

export const usageCounters = sqliteTable(
  "usage_counters",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    monthYmd: text("month_ymd").notNull(), // YYYY-MM-01
    kind: text("kind").notNull(), // extract | generate_questions | grade | sprint_plan
    usedN: integer("used_n").notNull().default(0),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.userId, t.monthYmd, t.kind] }),
    userMonthIdx: index("usage_user_month_idx").on(t.userId, t.monthYmd),
  }),
);

export const aiChannels = sqliteTable(
  "ai_channels",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    label: text("label").notNull(),
    baseUrl: text("base_url").notNull(),
    model: text("model").notNull(),
    priority: integer("priority").notNull().default(100),
    enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
    lastOkAt: integer("last_ok_at", { mode: "timestamp_ms" }),
    lastError: text("last_error"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (t) => ({
    priorityIdx: index("ai_channels_priority_idx").on(t.priority),
  }),
);

export const aiUsageLogs = sqliteTable(
  "ai_usage_logs",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    channelId: text("channel_id"),
    route: text("route").notNull(), // extract | generate_questions | grade | sprint_plan
    model: text("model").notNull(),
    status: text("status").notNull(), // success | error | timeout | blocked
    latencyMs: integer("latency_ms"),
    promptTokens: integer("prompt_tokens"),
    completionTokens: integer("completion_tokens"),
    costCny: real("cost_cny"),
    errorMessage: text("error_message"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (t) => ({
    userTimeIdx: index("usage_logs_user_time_idx").on(t.userId, t.createdAt),
    routeTimeIdx: index("usage_logs_route_time_idx").on(t.route, t.createdAt),
    statusTimeIdx: index("usage_logs_status_time_idx").on(t.status, t.createdAt),
  }),
);

export const systemSettings = sqliteTable("system_settings", {
  key: text("key").primaryKey(),
  valueJson: text("value_json", { mode: "json" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
  updatedBy: text("updated_by").references(() => user.id, {
    onDelete: "set null",
  }),
});

/**
 * Free / Plus / Pro 月订阅。Free 不入库（默认状态就是 free，没行就是没订阅）。
 *
 * 一次付款 → 创建一行 active 订阅，period_end = now + 30 天。
 * 用户在 active 期内再次付同 plan → period_end += 30 天（延期续费）。
 * 用户从 plus 升 pro：本期 plus 保留至 period_end，但 getUserPlan() 总返回最高 active 行
 * （pro > plus），所以行为正确，pro 立即生效。
 *
 * 单科 19.9 永久权益（payments.status='paid'）跟订阅独立 — 老用户保留旧权益 +
 * 可叠加订阅（lib/subscription.ts 把单科永久视作 unlimited bypass）。
 */
export const subscriptions = sqliteTable(
  "subscriptions",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    plan: text("plan").notNull(), // 'plus' | 'pro'
    status: text("status").notNull().default("active"), // 'active' | 'expired' | 'cancelled'
    currentPeriodStart: integer("current_period_start", {
      mode: "timestamp_ms",
    }).notNull(),
    currentPeriodEnd: integer("current_period_end", {
      mode: "timestamp_ms",
    }).notNull(),
    cancelledAt: integer("cancelled_at", { mode: "timestamp_ms" }),
    paymentId: text("payment_id").references(() => payments.id, {
      onDelete: "set null",
    }),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (t) => ({
    // 主热路径：getUserPlan() 按 user_id 查 status=active + period_end > now 的行
    userActiveIdx: index("subscriptions_user_active_idx").on(
      t.userId,
      t.status,
      t.currentPeriodEnd,
    ),
    paymentIdx: index("subscriptions_payment_idx").on(t.paymentId),
  }),
);
