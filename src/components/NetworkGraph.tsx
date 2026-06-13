'use client'

import { useEffect, useRef } from 'react'

interface Node {
  x: number; y: number; vx: number; vy: number
  r: number; opacity: number; label: string
}

interface Edge { a: number; b: number; opacity: number }

const NAMES = [
  'Crosby','Ovechkin','Gretzky','Lemieux','Orr','Hull','Yzerman',
  'Roy','Brodeur','Sakic','Forsberg','Lidstrom','Messier','Howe',
  'Jagr','Datsyuk','Toews','Kane','McDavid','MacKinnon',
]

export default function NetworkGraph() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    let raf: number

    const resize = () => {
      canvas.width  = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
    }
    resize()
    window.addEventListener('resize', resize)

    // Spawn nodes
    const nodes: Node[] = NAMES.map((label) => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      r: Math.random() * 3 + 2,
      opacity: Math.random() * 0.5 + 0.3,
      label,
    }))

    // Build edges for nodes within connection distance
    const MAX_DIST = 220
    const edges: Edge[] = []
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        edges.push({ a: i, b: j, opacity: 0 })
      }
    }

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Update positions
      for (const n of nodes) {
        n.x += n.vx; n.y += n.vy
        if (n.x < 0 || n.x > canvas.width)  n.vx *= -1
        if (n.y < 0 || n.y > canvas.height) n.vy *= -1
      }

      // Draw edges
      for (const e of edges) {
        const a = nodes[e.a], b = nodes[e.b]
        const dx = b.x - a.x, dy = b.y - a.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        const target = dist < MAX_DIST ? (1 - dist / MAX_DIST) * 0.35 : 0
        e.opacity += (target - e.opacity) * 0.05

        if (e.opacity > 0.01) {
          const grad = ctx.createLinearGradient(a.x, a.y, b.x, b.y)
          grad.addColorStop(0, `rgba(59,130,246,${e.opacity})`)
          grad.addColorStop(1, `rgba(99,102,241,${e.opacity})`)
          ctx.beginPath()
          ctx.moveTo(a.x, a.y)
          ctx.lineTo(b.x, b.y)
          ctx.strokeStyle = grad
          ctx.lineWidth = 1
          ctx.stroke()
        }
      }

      // Draw nodes + labels
      for (const n of nodes) {
        // Glow
        const glow = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r * 4)
        glow.addColorStop(0, `rgba(59,130,246,${n.opacity * 0.4})`)
        glow.addColorStop(1, 'transparent')
        ctx.beginPath()
        ctx.arc(n.x, n.y, n.r * 4, 0, Math.PI * 2)
        ctx.fillStyle = glow
        ctx.fill()

        // Dot
        ctx.beginPath()
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(147,197,253,${n.opacity})`
        ctx.fill()

        // Label
        ctx.font = '11px Inter, sans-serif'
        ctx.fillStyle = `rgba(148,163,184,${n.opacity * 0.8})`
        ctx.fillText(n.label, n.x + n.r + 4, n.y + 4)
      }

      raf = requestAnimationFrame(draw)
    }

    draw()
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full opacity-60 pointer-events-none"
    />
  )
}
