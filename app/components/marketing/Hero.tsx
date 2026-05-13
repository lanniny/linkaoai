import { ArrowRight, Sparkles } from "lucide-react";

export default function Hero() {
  return (
    <section className="relative overflow-hidden border-b bg-gradient-to-b from-amber-50/60 via-white to-white">
      <div
        className="absolute inset-x-0 -top-32 -z-10 transform-gpu overflow-hidden blur-3xl"
        aria-hidden="true"
      >
        <div
          className="relative left-1/2 aspect-square w-[40rem] -translate-x-1/2 bg-gradient-to-tr from-amber-200 to-rose-100 opacity-20"
          style={{
            clipPath:
              "polygon(74% 44%, 100% 62%, 97% 26%, 85% 0%, 80% 2%, 73% 32%, 60% 62%, 52% 68%, 47% 58%, 45% 34%, 27% 76%, 0% 64%, 18% 100%, 27% 76%, 76% 97%, 74% 44%)",
          }}
        />
      </div>
      <div className="mx-auto max-w-3xl px-6 py-12 sm:py-20">
        <div className="flex justify-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800">
            <Sparkles className="h-3.5 w-3.5" />
            考前 7-14 天 · AI 全流程冲刺
          </span>
        </div>
        <h1 className="mt-6 text-center text-4xl font-bold tracking-tight text-zinc-900 sm:text-5xl">
          挂科前的<span className="text-amber-700">最后一公里</span>
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-center text-base text-zinc-600">
          上传课件 PDF，AI 帮你把<strong>必考点</strong>挑出来 · 自动出题刷 ·
          批改给反馈 · 按考试日期排<strong>逐日冲刺计划</strong>。
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <a
            href="/register"
            className="inline-flex items-center gap-1.5 rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-zinc-800"
          >
            立即注册（30 秒上手）
            <ArrowRight className="h-4 w-4" />
          </a>
          <a
            href="/login"
            className="inline-flex items-center gap-1.5 rounded-full border border-zinc-300 bg-white px-5 py-2.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
          >
            已有账号 · 登录
          </a>
        </div>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-xs text-zinc-500">
          <span>✓ 邮箱注册 · 免邀请码</span>
          <span>✓ 19.9 元 / 科 · 挂科退款</span>
          <span>✓ 永久访问 · 不限次</span>
          <span>✓ AI 仅供参考，以教材为准</span>
        </div>
      </div>
    </section>
  );
}
