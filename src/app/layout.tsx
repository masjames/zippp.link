import type { Metadata } from "next";
import type { ReactNode } from "react";

const SITE_URL = "https://www.zippp.link";
const TITLE = "zippp.link — one link for your WhatsApp shop";
const DESCRIPTION =
  "Drop a receipt or invoice, get a clean table. Connect a Google Sheet and send the rows straight to your spreadsheet.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: SITE_URL,
    type: "website",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "zippp.link — one link for your WhatsApp shop",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: ["/og.png"],
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body
        style={{
          fontFamily: "sans-serif",
          margin: 24,
          maxWidth: 720,
        }}
      >
        {children}
      </body>
    </html>
  );
}
