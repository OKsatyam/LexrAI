import type { Metadata } from "next";
import { Syne, Geist } from "next/font/google";
import { IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

const syne = Syne({
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
  variable: "--font-display",
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "LexrAI — Read code like a senior dev",
  description: "Understand any codebase in under 60 seconds. Explore, question, improve.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={cn(syne.variable, ibmPlexMono.variable, "font-sans", geist.variable)}>
      <body>{children}</body>
    </html>
  );
}
