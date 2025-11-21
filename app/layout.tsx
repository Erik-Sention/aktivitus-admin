import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { CustomerProvider } from "@/lib/CustomerContext";
import AuthGuard from "@/components/AuthGuard";
import LayoutWrapper from "@/components/LayoutWrapper";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Aktivitus Ekonomiverktyg",
  description: "Webbaserad adminapp för kundhantering och fakturering",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="sv">
      <body
        className={`${inter.variable} font-sans antialiased bg-blue-50`}
      >
        <AuthGuard>
          <CustomerProvider>
            <LayoutWrapper>
              {children}
            </LayoutWrapper>
          </CustomerProvider>
        </AuthGuard>
      </body>
    </html>
  );
}
