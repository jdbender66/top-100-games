"use client"

import { useEffect, useRef, useCallback } from "react"

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  rotation: number
  rotSpeed: number
  w: number
  h: number
  color: string
  alpha: number
  decay: number
  shape: "rect" | "circle" | "star"
  burst: boolean  // burst particles start from center, others fall from top
}

interface ConfettiProps {
  /** 1–10 milestone (1 = 10 games, 10 = 100 games) */
  intensity: number
  /** Set to a new truthy key each time you want to fire */
  trigger: number
}

// Palette that fits the dark space aesthetic while still feeling celebratory
const COLORS = [
  "#00e096", // teal accent
  "#ffd700", // gold
  "#c8c4e0", // soft lavender
  "#ff6b6b", // coral red
  "#4ecdc4", // cyan
  "#ffe66d", // yellow
  "#ff9ff3", // pink
  "#a29bfe", // indigo
  "#55efc4", // mint
  "#fd79a8", // rose
]

function randomColor() {
  return COLORS[Math.floor(Math.random() * COLORS.length)]
}

function makeParticles(intensity: number, cw: number, ch: number): Particle[] {
  // Base count scales quadratically: 10→25, 20→45, ..., 100→400+
  const base   = Math.round(15 + intensity * intensity * 3.8)
  // Burst count (radial explosion from center) scales more aggressively at higher tiers
  const bursts = intensity >= 5 ? Math.round(intensity * intensity * 2.5) : 0
  const total  = base + bursts

  const particles: Particle[] = []

  for (let i = 0; i < total; i++) {
    const isBurst = i >= base
    const shape: Particle["shape"] =
      Math.random() < 0.15 ? "circle" :
      Math.random() < 0.1  ? "star"   : "rect"

    // Burst particles originate near the center of the screen
    const bx = cw / 2 + (Math.random() - 0.5) * cw * 0.15
    const by = ch * 0.35 + (Math.random() - 0.5) * ch * 0.1

    // Spread angle: burst = full 360°, top-fall = 60°–120° downward fan
    const angle    = isBurst
      ? Math.random() * Math.PI * 2
      : (Math.PI / 2) + (Math.random() - 0.5) * 0.9
    const speed    = isBurst
      ? 4 + Math.random() * 8 * (intensity / 10)
      : 3 + Math.random() * 5

    particles.push({
      x: isBurst ? bx : Math.random() * cw,
      y: isBurst ? by : -10 - Math.random() * ch * 0.3,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.18,
      w: 6 + Math.random() * 6,
      h: 3 + Math.random() * 4,
      color: randomColor(),
      alpha: 1,
      // Higher intensity = particles last longer before fading
      decay: 0.008 + Math.random() * 0.01 * (1 - intensity * 0.06),
      shape,
      burst: isBurst,
    })
  }

  return particles
}

function drawStar(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  const pts = 5
  ctx.beginPath()
  for (let i = 0; i < pts * 2; i++) {
    const radius = i % 2 === 0 ? r : r * 0.45
    const angle  = (i * Math.PI) / pts - Math.PI / 2
    if (i === 0) ctx.moveTo(cx + radius * Math.cos(angle), cy + radius * Math.sin(angle))
    else         ctx.lineTo(cx + radius * Math.cos(angle), cy + radius * Math.sin(angle))
  }
  ctx.closePath()
  ctx.fill()
}

export default function Confetti({ intensity, trigger }: ConfettiProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef    = useRef<number>(0)
  const particles = useRef<Particle[]>([])

  const fire = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const cw = canvas.width  = window.innerWidth
    const ch = canvas.height = window.innerHeight

    // For the grand finale (intensity 10) fire two waves with a small delay
    particles.current = makeParticles(intensity, cw, ch)
    if (intensity >= 9) {
      setTimeout(() => {
        const canvas2 = canvasRef.current
        if (!canvas2) return
        particles.current = [
          ...particles.current,
          ...makeParticles(intensity, canvas2.width, canvas2.height),
        ]
      }, 350)
    }
    if (intensity === 10) {
      setTimeout(() => {
        const canvas3 = canvasRef.current
        if (!canvas3) return
        particles.current = [
          ...particles.current,
          ...makeParticles(intensity, canvas3.width, canvas3.height),
        ]
      }, 700)
    }
  }, [intensity])

  // Kick off a new burst whenever `trigger` changes (and is non-zero)
  useEffect(() => {
    if (!trigger) return
    fire()
  }, [trigger, fire])

  // Animation loop
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const GRAVITY   = 0.18
    const DRAG      = 0.992

    function animate() {
      if (!canvas || !ctx) return
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      let alive = false
      for (const p of particles.current) {
        if (p.alpha <= 0) continue
        alive = true

        // Physics
        p.vy  += GRAVITY
        p.vx  *= DRAG
        p.vy  *= DRAG
        p.x   += p.vx
        p.y   += p.vy
        p.rotation += p.rotSpeed
        p.alpha -= p.decay

        ctx.save()
        ctx.globalAlpha = Math.max(0, p.alpha)
        ctx.fillStyle   = p.color
        ctx.translate(p.x, p.y)
        ctx.rotate(p.rotation)

        if (p.shape === "circle") {
          ctx.beginPath()
          ctx.arc(0, 0, p.w / 2, 0, Math.PI * 2)
          ctx.fill()
        } else if (p.shape === "star") {
          drawStar(ctx, 0, 0, p.w / 2)
        } else {
          ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h)
        }
        ctx.restore()
      }

      if (alive) {
        rafRef.current = requestAnimationFrame(animate)
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
      }
    }

    cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(animate)

    return () => cancelAnimationFrame(rafRef.current)
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        zIndex: 99999,
      }}
    />
  )
}
