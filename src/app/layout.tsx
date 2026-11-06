import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "شغلني | SHOGHLY",
  description:
    "مساحة يومية للفرص والإنجاز. شغلني — منصة عراقية بتجربة عربية واضحة.",
  applicationName: "SHOGHLY",
  appleWebApp: { capable: true, title: "شغلني", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#f6f8f7",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ar" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
