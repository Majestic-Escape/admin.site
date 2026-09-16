import "./globals.css";
import { bricolage, poppins } from "./fonts";
import { AuthProvider } from "@/contexts/AuthContext";

import { ReactNode } from "react";
import Providers from "./providers";
import { Toaster } from "sonner";
export const metadata = {
  title: "Admin Panel | Majestic Escape",
  description:
    "Welcome, Admin. Check what's happening with Majestic Escape today",
};
interface RootLayoutProps {
  children: ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en" className={`${bricolage.variable} ${poppins.variable}`}>
      <body className="bg-white text-gray-800 antialiased">
        {/* Providers (QueryClient) wraps AuthProvider so login/logout can clear the query cache. */}
        <Providers>
          <AuthProvider>{children}</AuthProvider>
        </Providers>
        <Toaster position="top-center" closeButton richColors />
      </body>
    </html>
  );
}
