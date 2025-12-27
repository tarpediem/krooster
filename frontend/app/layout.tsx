import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { Sidebar, MobileNav } from "@/components/layout/Sidebar";

const inter = Inter({
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Krooster - Restaurant Scheduling",
  description: "Staff scheduling for Hua Hin & Sathorn restaurants",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased bg-background`}>
        <Providers>
          <Sidebar />
          <div className="lg:pl-64">
            <MobileNav />
            <main className="py-6 px-4 sm:px-6 lg:px-8">
              {children}
            </main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
