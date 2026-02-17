import type { Metadata } from "next";
import { Outfit, Shippori_Mincho } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import GlobalCursorEffect from "@/components/GlobalCursorEffect";

const sans = Outfit({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const shipporiMincho = Shippori_Mincho({
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-shippori",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TeachTrack | Docs",
  description:
    "User-friendly documentation site for TeachTrack. Learn the app features and follow a step-by-step guide to use it.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="overflow-x-hidden">
      <body
        className={`${sans.variable} ${shipporiMincho.variable} antialiased overflow-x-hidden`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <div className="noise" />
          <GlobalCursorEffect />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
