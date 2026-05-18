import type { Metadata } from "next";
import { Toaster } from "sonner";
import "katex/dist/katex.min.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "临考 · AI 期末冲刺",
  description: "AI 帮大学生在考前 7-14 天搞定高数 / 线代 / 概率论",
  applicationName: "临考",
  authors: [{ name: "linkaoai.com" }],
  keywords: ["临考", "Linkao", "考试复习", "高数", "线代", "概率论", "AI"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-zinc-50 text-zinc-900">
        {children}
        <Toaster
          position="top-right"
          theme="light"
          richColors
          closeButton
          toastOptions={{
            style: {
              fontSize: "13px",
            },
          }}
        />
      </body>
    </html>
  );
}
