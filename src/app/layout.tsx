import type { ReactNode } from "react";

export const metadata = {
  title: "zippp",
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
