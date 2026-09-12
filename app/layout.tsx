import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cocktail Bar",
  description: "Cocktail Bar Menu",
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
