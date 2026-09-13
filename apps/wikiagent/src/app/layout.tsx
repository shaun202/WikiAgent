import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "WikiAgent — grounded answers from your wiki",
  description:
    "Index wiki pages and ask grounded questions. Retrieval-augmented generation with pgvector + OpenAI.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}