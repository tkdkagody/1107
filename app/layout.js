import "./globals.css";

export const metadata = {
  title: "결혼 준비 프로젝트 보드",
  description: "Next.js + Supabase 기반 결혼 준비 관리 웹앱",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
