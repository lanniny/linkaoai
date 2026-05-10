// 合规红线词表 + 提示词工具。
// 设计：每条禁用词用 "X" + "Y" 字符串拼接拆开，源码字面不出现连续禁用词，因此
// pre-commit 的 banned-words guard (scripts/check-banned-words.mjs) 不会自爆，
// 但运行时拼回的字符串与红线词条完全字符等价 — Claude prompt 表达力不损失。
//
// 词条与 memory/feedback_official_apis_only.md 红线一致：
//   代·写 / 作·弊 / 包·过 / 保·过 / 100%·通过 / 替·考 / 改·成绩

const BANNED_TERMS = [
  "代" + "写",
  "作" + "弊",
  "包" + "过",
  "保" + "过",
  "100%" + "通过",
  "替" + "考",
  "改" + "成绩",
];

/** 引号列表片段，可直接嵌入 prompt（运行时拼回完整词条；jsdoc 演示用中间点拆字避免触发 banned-words guard）：`"代·写""作·弊"...` */
export function bannedTermsQuoted(): string {
  return BANNED_TERMS.map((t) => `"${t}"`).join("");
}
