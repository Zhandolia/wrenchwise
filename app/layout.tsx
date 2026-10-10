import type { Metadata } from "next";
import "./globals.css";
import "./garage-theme.css";

export const metadata: Metadata = {
  title: "Wrenchwise — Learn the mechanics",
  description: "Understand under-the-hood repairs with interactive 3D components and factory-referenced mechanical walkthroughs.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
