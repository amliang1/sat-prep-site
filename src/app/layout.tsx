import type { Metadata } from "next";
import { Header } from "@/components/header";
import "./globals.css";

export const metadata: Metadata = {
  title: "SAT Forge",
  description: "SAT prep platform with practice questions, analytics, login, and categorization."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <div className="shell">
          <Header />
          <main className="content">{children}</main>
        </div>
      </body>
    </html>
  );
}
