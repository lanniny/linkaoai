import Link from "next/link";
import {
  ArrowRight,
  BookCheck,
  CalendarRange,
  FileText,
  GraduationCap,
  Sparkles,
} from "lucide-react";

export default function Hero() {
  return (
    <section className="overflow-hidden border-b border-amber-100 bg-[linear-gradient(180deg,#fff7ed_0%,#ffffff_58%,#ffffff_100%)]">
      <div className="mx-auto max-w-6xl px-6 py-10 sm:py-14 lg:py-16">
        <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-white px-3 py-1 text-xs font-medium text-amber-800 shadow-sm">
              <Sparkles className="h-3.5 w-3.5" />
              考前 7-14 天 · 先抓重点再刷题
            </span>
            <h1 className="mt-5 text-4xl font-bold tracking-tight text-zinc-900 sm:text-5xl">
              临考
            </h1>
            <p className="mt-3 max-w-xl text-base leading-7 text-zinc-600">
              把一份课件丢进去，AI 先提考点，再出题、批改、排日程。
              主攻高数、线代、概率论，让你少翻课件，多把时间花在真题上。
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link
                href="/register"
                className="inline-flex items-center gap-1.5 rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-zinc-800"
              >
                立即注册
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 rounded-full border border-zinc-300 bg-white px-5 py-2.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
              >
                已有账号 · 登录
              </Link>
              <Link
                href="/console/billing"
                className="inline-flex items-center gap-1 text-xs font-medium text-zinc-600 underline-offset-2 transition hover:text-zinc-900 hover:underline"
              >
                查看退款条款
              </Link>
            </div>
            <dl className="mt-8 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-zinc-200 bg-white/80 p-4 shadow-sm">
                <dt className="text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-400">
                  上手速度
                </dt>
                <dd className="mt-1 text-sm font-semibold text-zinc-900">30 秒注册</dd>
                <dd className="mt-1 text-xs text-zinc-500">先上传一份课件就能看效果</dd>
              </div>
              <div className="rounded-xl border border-zinc-200 bg-white/80 p-4 shadow-sm">
                <dt className="text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-400">
                  核心科目
                </dt>
                <dd className="mt-1 text-sm font-semibold text-zinc-900">高数 / 线代 / 概率论</dd>
                <dd className="mt-1 text-xs text-zinc-500">只做最容易挂科的那三门</dd>
              </div>
              <div className="rounded-xl border border-zinc-200 bg-white/80 p-4 shadow-sm">
                <dt className="text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-400">
                  付费方式
                </dt>
                <dd className="mt-1 text-sm font-semibold text-zinc-900">19.9 / 单科</dd>
                <dd className="mt-1 text-xs text-zinc-500">先试用，再决定要不要解锁</dd>
              </div>
            </dl>
          </div>

          <div className="relative">
            <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-400">
                    产品预览
                  </p>
                  <p className="mt-1 text-sm font-semibold text-zinc-900">
                    上传课件后，主流程会长这样
                  </p>
                </div>
                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700">
                  7 分钟见结果
                </span>
              </div>

              <div className="mt-4 space-y-3">
                <div className="rounded-xl border border-sky-100 bg-sky-50/70 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-sky-700 shadow-sm">
                        <FileText className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-zinc-900">上传课件</p>
                        <p className="text-xs text-zinc-500">PDF / PPT / Word / 图片都能进来</p>
                      </div>
                    </div>
                    <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-zinc-500 shadow-sm">
                      已识别 18 页
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-zinc-500">
                    <span className="rounded-full bg-white px-2 py-1 shadow-sm">PDF</span>
                    <span className="rounded-full bg-white px-2 py-1 shadow-sm">PPT</span>
                    <span className="rounded-full bg-white px-2 py-1 shadow-sm">Word</span>
                    <span className="rounded-full bg-white px-2 py-1 shadow-sm">图片 OCR</span>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-amber-100 bg-amber-50/70 p-3">
                    <div className="flex items-center gap-2">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-amber-700 shadow-sm">
                        <GraduationCap className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-zinc-900">考点大纲</p>
                        <p className="text-xs text-zinc-500">必考 / 重点 / 了解</p>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
                      <span className="rounded-full bg-white px-2 py-1 text-amber-800 shadow-sm">
                        必考 8
                      </span>
                      <span className="rounded-full bg-white px-2 py-1 text-amber-800 shadow-sm">
                        重点 6
                      </span>
                      <span className="rounded-full bg-white px-2 py-1 text-amber-800 shadow-sm">
                        了解 4
                      </span>
                    </div>
                  </div>
                  <div className="rounded-xl border border-emerald-100 bg-emerald-50/70 p-3">
                    <div className="flex items-center gap-2">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-emerald-700 shadow-sm">
                        <BookCheck className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-zinc-900">批改反馈</p>
                        <p className="text-xs text-zinc-500">错因 + 改进建议</p>
                      </div>
                    </div>
                    <div className="mt-3 rounded-lg bg-white px-3 py-2 text-xs text-zinc-600 shadow-sm">
                      题目 4 / 5，得分 86。下一步：补齐积分中值定义。
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-rose-100 bg-rose-50/70 p-3">
                  <div className="flex items-center gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-rose-700 shadow-sm">
                      <CalendarRange className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-zinc-900">冲刺计划</p>
                      <p className="text-xs text-zinc-500">按考试日期往前排到每一天</p>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-[11px] text-zinc-600">
                    <div className="rounded-lg bg-white px-2 py-2 shadow-sm">
                      T-7
                      <div className="mt-1 text-zinc-500">线代重点</div>
                    </div>
                    <div className="rounded-lg bg-white px-2 py-2 shadow-sm">
                      T-3
                      <div className="mt-1 text-zinc-500">模拟卷</div>
                    </div>
                    <div className="rounded-lg bg-white px-2 py-2 shadow-sm">
                      T-1
                      <div className="mt-1 text-zinc-500">错题回看</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <p className="mt-3 text-center text-[11px] text-zinc-500">
              先把一份课件跑通，再决定要不要把整门课交给它。
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
