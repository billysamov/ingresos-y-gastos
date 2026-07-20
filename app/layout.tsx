import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geist = Geist({ variable: "--font-geist", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Finanza — Tus finanzas en orden",
  description: "Controla ingresos, gastos, ahorros y cuentas en un solo lugar.",
  icons: { icon: "/favicon.svg" },
  openGraph: { title: "Finanza — Tus finanzas en orden", description: "Ingresos, gastos y ahorros en un dashboard simple.", images: [{ url: "/og.png", width: 1200, height: 630 }] },
  twitter: { card: "summary_large_image", title: "Finanza", description: "Tus finanzas en orden", images: ["/og.png"] },
};

export default function RootLayout({ children }: Readonly<{children: React.ReactNode}>) {
  return <html lang="es"><body className={geist.variable}>{children}</body></html>;
}
