import type { Metadata, Viewport } from "next";
import "./globals.css";
import ServiceWorkerRegister from "./service-worker-register";

export const metadata: Metadata = {
  title: "마음곁 · 취준생 멘탈케어 동반자",
  description:
    "취업을 준비하는 당신의 곁을 24시간 지키는 AI 동반자. 전문 상담을 대체하지 않습니다.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "마음곁",
  },
};

export const viewport: Viewport = {
  themeColor: "#4f46e5",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="antialiased min-h-dvh">
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
