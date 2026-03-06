import type { Metadata } from "next"
import { VT323 } from "next/font/google"
import "./globals.css"
import { TooltipProvider } from "@/components/ui/tooltip"
import Nav from "@/components/Nav"

const vt323 = VT323({
  variable: "--font-vt323",
  subsets: ["latin"],
  weight: "400",
})

export const metadata: Metadata = {
  title: "Top 100 Games Tracker",
  description: "Track how many of the top 100 games of all time you've played.",
  icons: {
    icon: "/favicon.png",
    shortcut: "/favicon.png",
    apple: "/favicon.png",
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body
        className={`${vt323.variable} antialiased min-h-screen`}
        style={{
          background: "#07071a",
          color: "#c8c4e0",
          fontFamily: "var(--font-vt323), monospace",
        }}
      >
        <TooltipProvider>
          <Nav />
          <main style={{ paddingTop: "72px" }}>{children}</main>
          <footer style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "6px",
            padding: "12px 0 16px",
            opacity: 0.4,
            fontSize: "13px",
            color: "#c8c4e0",
            fontFamily: "var(--font-vt323), monospace",
          }}>
            <img src="/mantis.png" alt="Based Mantis Labs" style={{ width: 20, height: 20, objectFit: "contain" }} />
            Based Mantis Labs
          </footer>
        </TooltipProvider>
      </body>
    </html>
  )
}
