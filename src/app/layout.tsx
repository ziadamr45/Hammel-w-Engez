import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "حمل و انجز - حمّل أي ملف من أي رابط",
  description: "موقع احترافي لتحميل الملفات من الروابط المباشرة - فيديو، صور، صوت، مستندات، وأرشيفات بدون علامة مائية",
  keywords: ["تحميل", "تنزيل", "فيديو", "صور", "TikTok", "YouTube", "Facebook", "بدون علامة مائية"],
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "32x32" },
      { url: "/logo.png", type: "image/png" },
    ],
    apple: "/apple-icon.png",,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
