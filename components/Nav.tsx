"use client"

import { useEffect, useState } from "react"

export default function Nav() {
  const [timeStr, setTimeStr] = useState("")

  useEffect(() => {
    const update = () => {
      const d = new Date()
      const day = d.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase()
      const dateNum = String(d.getDate()).padStart(2, "0")
      const month = d.toLocaleDateString("en-US", { month: "short" }).toUpperCase()
      const yr = d.getFullYear()
      const hh = String(d.getHours()).padStart(2, "0")
      const mm = String(d.getMinutes()).padStart(2, "0")
      setTimeStr(`${day} ${dateNum} ${month} ${yr}  ${hh}:${mm}`)
    }
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <header
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        height: "72px",
        background: "#0a0a22",
        borderBottom: "2px solid #1e1e5a",
        display: "flex",
        alignItems: "center",
        padding: "0 20px",
        fontFamily: "var(--font-vt323), monospace",
        fontSize: "22px",
        color: "#6060a0",
        letterSpacing: "0.06em",
        userSelect: "none",
      }}
    >

      {/* Separator */}
      <div style={{ width: 1, height: 18, background: "#1e1e5a", marginRight: "14px" }} />

      {/* Logo + Title */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/website_logo.png" alt="Top 100" style={{ height: "52px", width: "auto", marginRight: "12px", padding: "3px" }} />
      <span style={{ color: "#c8c4e0" }}>Top 100 Games Tracker</span>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Clock */}
      <span style={{ color: "#3a3a70", fontSize: "15px" }}>{timeStr}</span>
    </header>
  )
}
