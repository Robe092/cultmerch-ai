import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CultMerch AI — Cultural Commerce Agent",
  description: "An explainable cultural merchandising agent powered by Qloo taste signals.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased bg-[#F9FAFB] text-slate-900">
        {children}
      </body>
    </html>
  );
}
