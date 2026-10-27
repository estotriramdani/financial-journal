import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { PwaRegister } from "@/components/PwaRegister";
import { ThemeInitializer } from "@/components/ThemeInitializer";
import { DateFilterProvider } from "@/context/DateFilterContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FINJRNL — Jurnal Keuangan",
  description: "Aplikasi Jurnal Keuangan Kolaboratif & Offline-First",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "FINJRNL",
  },
  icons: {
    icon: "/icons/icon-192.svg",
    apple: "/icons/icon-192.svg",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#e4e24e",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="id"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){
              try {
                var theme = localStorage.getItem('finjrnl_theme') || 'system';
                var isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
                if (isDark) {
                  document.documentElement.classList.add('dark');
                } else {
                  document.documentElement.classList.remove('dark');
                }
              } catch(e) {}
            })()`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-[#fffdf6] dark:bg-[#100f0f] text-[#100f0f] dark:text-[#fffdf6] antialiased selection:bg-[#e4e24e] selection:text-[#100f0f]">
        <PwaRegister />
        <ThemeInitializer />
        <DateFilterProvider>{children}</DateFilterProvider>
      </body>
    </html>
  );
}
