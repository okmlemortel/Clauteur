import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Clauteur — Tutorat IA",
  description: "Ton espace d'apprentissage personnalisé avec un tuteur IA",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className="antialiased bg-slate-50 text-slate-900" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
