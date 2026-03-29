import type { Metadata } from "next";
import { Inter, DM_Serif_Display } from "next/font/google";
import { Header } from "@/components/header";
import "katex/dist/katex.min.css";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap"
});

const dmSerif = DM_Serif_Display({
  weight: ["400"],
  style: ["normal", "italic"],
  subsets: ["latin"],
  variable: "--font-dm-serif",
  display: "swap"
});

export const metadata: Metadata = {
  title: "Alan's SAT Prep — Practice & Analytics",
  description:
    "SAT prep platform with Bluebook-style mock exams, adaptive practice sets, spaced repetition, and deep analytics. Built for students who want to move the needle."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} ${dmSerif.variable}`} suppressHydrationWarning>
      <head>
        {/* No-flash theme script: runs synchronously before first paint */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
(function(){
  try {
    var t = localStorage.getItem('theme');
    var pref = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', t || pref);
  } catch(e) {}
})();
`
          }}
        />
      </head>
      <body>
        <div className="shell">
          <Header />
          <main className="content">{children}</main>
        </div>
      </body>
    </html>
  );
}
