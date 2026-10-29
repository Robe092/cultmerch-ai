import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CultMerch AI — Cultural Commerce Agent",
  description: "Agent autonome de merchandising alimenté par le Taste Graph de Qloo.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className="antialiased bg-[#F9FAFB] text-slate-900">
        {children}
      </body>
    </html>
  );
}
