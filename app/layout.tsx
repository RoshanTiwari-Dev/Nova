import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";
import { Analytics } from "@vercel/analytics/react";

export const metadata: Metadata = {
  title: "NOVA — Your AI Coding Companion",
  description:
    "AI chatbot, programming assistant and high-performance online compiler for C++, Java, and Python.",
  keywords: [
    "NOVA",
    "AI coding assistant",
    "online compiler",
    "code runner",
    "C++ sandbox",
    "Java sandbox",
    "Python sandbox",
    "Vercel AI SDK",
  ],
  authors: [{ name: "NOVA Team" }],
};

export const viewport = {
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
    <html lang="en" suppressHydrationWarning>
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/katex@0.16.21/dist/katex.min.css"
          integrity="sha384-zh0WIMBn0ubu5QUZGwRQzn9U+FUBO2zZ8zPzqP507PJUQkPck+BegfauYTLKPIhR"
          crossOrigin="anonymous"
        />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11.11.1/build/styles/atom-one-dark.min.css"
        />
      </head>
      <body className="font-sans antialiased">
        <Providers>
          {children}
          <Analytics />
        </Providers>
      </body>
    </html>
  );
}
