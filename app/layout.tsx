import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ephemera",
  description: "Discover what's happening in New York City",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased font-sans">
        {children}
      </body>
    </html>
  );
}
