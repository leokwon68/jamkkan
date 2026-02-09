import type { Metadata } from "next";
import { Noto_Sans_KR } from "next/font/google"; 
import "./globals.css";

const notoSansKr = Noto_Sans_KR({
  subsets: ["latin"],
  weight: ["100", "300", "400", "500", "700", "900"],
  variable: "--font-noto-sans",
});

export const metadata: Metadata = {
  title: "jamkkan",
  description: "우리 만남의 중간 지점, 잠깐",
  openGraph: {
    title: "jamkkan - 우리 어디서 봐?",
    description: "중간 지점 찾기, 맛집 투표, 시간 조율을 한 번에!",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body
        className={`${notoSansKr.className} antialiased`}
        suppressHydrationWarning={true}
      >
        {children}
      </body>
    </html>
  );
}