import type { Metadata } from "next";
import "./styles.css";

export const metadata: Metadata = {
  title: "60s Shelby MVP",
  description: "Vertical video feed with Aptos wallet-gated interactions"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
