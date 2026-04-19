import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Solana Token Intel",
  description: "Real-time Solana token safety scoring and market intelligence powered by Birdeye Data.",
  icons: { icon: "/favicon.ico?v=2", apple: "/favicon.jpg" },
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const cookieStore = await cookies();
  const darkMode = cookieStore.get("darkMode")?.value === "true";

  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased${darkMode ? " dark" : ""}`}>
      <head>
        <link rel="icon" href="/favicon.ico?v=2" type="image/x-icon" />
        <link rel="apple-touch-icon" href="/favicon.jpg" />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
