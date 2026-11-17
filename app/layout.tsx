import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Crescita",
  description: "Crescita Menu",
};

type RootLayoutProps = {
  children: React.ReactNode;
};

export default function RootLayout({
  children,
}: RootLayoutProps) {
  return (
    <html lang="mn">
      <body>{children}</body>
    </html>
  );
}
