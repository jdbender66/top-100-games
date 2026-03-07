"use client"

import { useEffect, useState } from "react"

export default function Nav() {
  const [timeStr, setTimeStr] = useState("")
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640)
    checkMobile()
    window.addEventListener("resize", checkMobile)
    return () => window.removeEventListener("resize", checkMobile)
  }, [])

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
        color: "#6060a0",
        letterSpacing: "0.06em",
        userSelect: "none",
        overflow: "hidden",
      }}
    >
      {/* Separator */}
      <div style={{ width: 1, height: 18, background: "#1e1e5a", marginRight: "14px", flexShrink: 0 }} />

      {/* Logo */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/website_logo.png"
        alt="Top 100"
        style={{ height: "52px", width: "auto", marginRight: "12px", padding: "3px", flexShrink: 0 }}
      />

      {/* Title — shorter on mobile */}
      <span style={{
        color: "#c8c4e0",
        fontSize: isMobile ? "17px" : "22px",
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
        minWidth: 0,
      }}>
        {isMobile ? "Top 100 Tracker" : "Top 100 Games Tracker"}
      </span>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Clock — hidden on mobile */}
      {!isMobile && (
        <span style={{ color: "#3a3a70", fontSize: "15px", flexShrink: 0 }}>{timeStr}</span>
      )}
    </header>
  )
}
