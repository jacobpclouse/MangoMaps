import type { Metadata } from "next";
import "./globals.css";
import { geist } from "./fonts";

export const metadata: Metadata = {
  title: "Mango Maps",
  description: "Ultra-Relistic, Data-Driven Disaster Simulation Playground to Limit Test Your Urban Cities",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geist.className} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
