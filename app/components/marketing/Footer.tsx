import Link from "next/link";
import { ExternalLink, Mail } from "lucide-react";

export default function Footer() {
  return (
    <footer className="border-t bg-white">
      <div className="mx-auto max-w-4xl px-6 py-8 text-sm">
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
          <div className="col-span-2">
            <h3 className="font-semibold text-zinc-900">临考 Linkao</h3>
            <p className="mt-1 max-w-xs text-xs text-zinc-500">
              大学生期末冲刺工具 · 高数 / 线代 / 概率论
              <br />
              AI 先提考点，再出题、批改和排计划
            </p>
          </div>
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              产品
            </h3>
            <ul className="mt-2 space-y-1.5 text-xs">
              <li>
                <Link
                  href="/"
                  className="text-zinc-600 transition hover:text-zinc-900"
                >
                  提取大纲
                </Link>
              </li>
              <li>
                <Link
                  href="/pay"
                  className="text-zinc-600 transition hover:text-zinc-900"
                >
                  付费 · 退款
                </Link>
              </li>
              <li>
                <Link
                  href="/login"
                  className="text-zinc-600 transition hover:text-zinc-900"
                >
                  登录 / 注册
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              联系
            </h3>
            <ul className="mt-2 space-y-1.5 text-xs">
              <li>
                <a
                  href="https://github.com/lanniny/linkaoai"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-zinc-600 transition hover:text-zinc-900"
                >
                  GitHub
                  <ExternalLink className="h-3 w-3" />
                </a>
              </li>
              <li>
                <a
                  href="mailto:snhuyen03@gmail.com"
                  className="inline-flex items-center gap-1 text-zinc-600 transition hover:text-zinc-900"
                >
                  <Mail className="h-3 w-3" />
                  邮件
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-8 border-t pt-4 text-center text-xs text-zinc-400">
          © 2026 临考 · linkaoai.com · AI 生成内容仅供参考，请以教材 / 老师讲义为准
        </div>
      </div>
    </footer>
  );
}
