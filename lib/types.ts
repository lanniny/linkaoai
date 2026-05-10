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
