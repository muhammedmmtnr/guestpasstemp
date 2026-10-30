import type { Metadata } from "next";
import "../src/index.css";

export const metadata: Metadata = {
  title: "GuestPass — Restaurant Partner",
  description: "One thoughtful workspace for every restaurant in your group.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
