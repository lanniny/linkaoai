import {
  BookCheck,
  CalendarRange,
  FileText,
  GraduationCap,
  LineChart,
  ShieldCheck,
} from "lucide-react";

const FEATURES = [
  {
    icon: FileText,
    title: "PDF → 考点大纲",
    description:
      "上传课件，约 1 分钟 AI 提取 12-22 个考点，按必考 / 重点 / 了解三档分类，每条附 60 字解释。",
    color: "bg-blue-50 text-blue-700",
  },
  {
    icon: GraduationCap,
    title: "AI 出题刷题",
    description:
      "基于选中考点出 5-15 题，单选 / 填空 / 计算 / 证明四种题型，LaTeX 公式 KaTeX 渲染。",
    color: "bg-purple-50 text-purple-700",
  },
  {
    icon: BookCheck,
    title: "AI 批改反馈",
    description:
      "答完单题立刻批改，给 0-100 分 + 错误标签（步骤遗漏 / 概念混淆等）+ 改进建议。",
    color: "bg-emerald-50 text-emerald-700",
  },
  {
    icon: CalendarRange,
    title: "逐日冲刺计划",
    description:
      "输入考试日期 + 每日学时，AI 排 7-90 天日程，间隔重复 + T-1 模考自动安排。",
    color: "bg-amber-50 text-amber-700",
  },
  {
    icon: LineChart,
    title: "整卷模拟报告",
    description:
      "开启模拟卷模式答完 12 题，看到平均分 / 必考-重点-了解三档准确率 / 高频错误归类。",
    color: "bg-rose-50 text-rose-700",
  },
  {
    icon: ShieldCheck,
    title: "挂科退款承诺",
    description:
      "登录后历史自动落库；完成 ≥80% 任务挂科可凭成绩单截图申请全额原路退款。",
    color: "bg-indigo-50 text-indigo-700",
  },
];

export default function FeaturesGrid() {
  return (
    <section className="border-b bg-white">
      <div className="mx-auto max-w-4xl px-6 py-12 sm:py-16">
        <div className="text-center">
          <h2 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
            完整学习闭环
          </h2>
          <p className="mt-2 text-sm text-zinc-600">
            从课件到考前一夜，AI 全程陪你
          </p>
        </div>
        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, description, color }) => (
            <div
              key={title}
              className="rounded-lg border bg-white p-5 transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div
                className={`inline-flex h-10 w-10 items-center justify-center rounded-lg ${color}`}
              >
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="mt-3 font-semibold text-zinc-900">{title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-zinc-600">
                {description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
