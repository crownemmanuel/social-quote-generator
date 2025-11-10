import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Social Qoute Generator",
  description: "Generate beautiful social media quote images",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

