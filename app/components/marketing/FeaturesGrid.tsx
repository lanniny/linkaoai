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
    title: "上传课件",
    description:
      "PDF / PPT / Word / 图片都能进来，先把课堂材料吃透。",
    color: "bg-sky-50 text-sky-700",
  },
  {
    icon: GraduationCap,
    title: "生成考点大纲",
    description:
      "按必考 / 重点 / 了解三档整理，先知道今天该背什么。",
    color: "bg-amber-50 text-amber-700",
  },
  {
    icon: BookCheck,
    title: "出题 + 批改",
    description:
      "围着考点刷小题，答完立刻批改并标出错因。",
    color: "bg-emerald-50 text-emerald-700",
  },
  {
    icon: CalendarRange,
    title: "冲刺计划",
    description:
      "按考试日期排每天任务，把薄弱点往前挪。",
    color: "bg-rose-50 text-rose-700",
  },
  {
    icon: LineChart,
    title: "模拟卷报告",
    description:
      "最后三天生成模拟卷，汇总分数和高频错误类型。",
    color: "bg-violet-50 text-violet-700",
  },
  {
    icon: ShieldCheck,
    title: "退款规则",
    description:
      "完成 ≥80% 冲刺任务后仍挂科，可按条款申请退款。",
    color: "bg-zinc-100 text-zinc-700",
  },
];;

export default function FeaturesGrid() {
  return (
    <section className="border-b bg-white">
      <div className="mx-auto max-w-6xl px-6 py-12 sm:py-16">
        <div className="max-w-2xl">
          <h2 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
            把复习拆成 5 个动作
          </h2>
          <p className="mt-2 text-sm leading-7 text-zinc-600">
            你只管上传资料和考试日期，剩下的提炼、出题、批改、排程、模考交给它。
          </p>
        </div>

        <div className="mt-5 flex flex-wrap gap-2 text-xs text-zinc-500">
          {[
            "1 上传课件",
            "2 提炼考点",
            "3 做题批改",
            "4 排冲刺计划",
            "5 最后三天模考",
          ].map((step) => (
            <span
              key={step}
              className="inline-flex items-center rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1.5"
            >
              {step}
            </span>
          ))}
        </div>

        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, description, color }, index) => (
            <article
              key={title}
              className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-3">
                <div
                  className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${color}`}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-[11px] font-medium text-zinc-500">
                  0{index + 1}
                </span>
              </div>
              <h3 className="mt-4 font-semibold text-zinc-900">{title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-zinc-600">
                {description}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
