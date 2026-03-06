"use client"

interface Props { platform: string; size?: number }

const LOGO_MAP: Record<string, string> = {
  "PlayStation":       "/console logos/playstation.png",
  "PlayStation 2":     "/console logos/playstation2.png",
  "PlayStation 3":     "/console logos/ps3.png",
  "PlayStation 4":     "/console logos/ps4.png",
  "PlayStation 5":     "/console logos/ps5.png",
  "Nintendo 64":       "/console logos/n64.png",
  "GameCube":          "/console logos/gamecube.png",
  "Nintendo Switch":   "/console logos/switch.png",
  "Wii":               "/console logos/wii.png",
  "Dreamcast":         "/console logos/dreamcast.png",
  "Xbox":              "/console logos/xbox.png",
  "Xbox 360":          "/console logos/360.png",
  "PC":                "/console logos/PC.png",
  "Game Boy Advance":  "/console logos/gba.png",
  "Nintendo DS":       "/console logos/ds.png",
  "NES":               "/console logos/nes.png",
  "SNES":              "/console logos/snes.png",
  "Game Boy":          "/console logos/gameboy.png",
}

export default function ConsoleIcon({ platform, size = 18 }: Props) {
  const src = LOGO_MAP[platform]

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={platform}
        style={{
          height: size,
          width: "auto",
          display: "inline-block",
          verticalAlign: "middle",
          objectFit: "contain",
        }}
      />
    )
  }

  // Fallback for GBA, Nintendo DS, and any future platforms
  return (
    <span style={{
      fontSize: size * 0.7,
      color: "#6060a0",
      display: "inline-block",
      verticalAlign: "middle",
      letterSpacing: "0.02em",
    }}>
      {platform}
    </span>
  )
}
