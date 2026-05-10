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
