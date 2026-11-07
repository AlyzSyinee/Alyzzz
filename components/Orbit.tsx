'use client'

import { useEffect, useRef } from 'react'
import { animate, motion, useMotionValue } from 'framer-motion'

type P = { x: number; y: number; z: number }
const rotX = (p: P, a: number): P => { const c = Math.cos(a), s = Math.sin(a); return { x: p.x, y: p.y * c - p.z * s, z: p.y * s + p.z * c } }
const rotY = (p: P, a: number): P => { const c = Math.cos(a), s = Math.sin(a); return { x: p.x * c + p.z * s, y: p.y, z: -p.x * s + p.z * c } }
const rotZ = (p: P, a: number): P => { const c = Math.cos(a), s = Math.sin(a); return { x: p.x * c - p.y * s, y: p.x * s + p.y * c, z: p.z } }
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v))

const RINGS = [
  { r: 1.0, tx: 0.0, tz: 0.0, n: 3, sp: 0.55 },
  { r: 1.45, tx: 1.15, tz: 0.35, n: 4, sp: -0.38 },
  { r: 1.9, tx: 0.55, tz: -0.9, n: 5, sp: 0.26 },
  { r: 2.35, tx: -0.9, tz: 0.6, n: 4, sp: -0.18 },
  { r: 2.8, tx: 1.35, tz: -0.2, n: 6, sp: 0.12 },
]

const FOCAL = 9
const TAU = Math.PI * 2

export default function Orbit() {
  const ref = useRef<HTMLCanvasElement>(null)
  const yaw = useMotionValue(0.6)
  const pitch = useMotionValue(-0.35)

  useEffect(() => {
    const canvas = ref.current!
    const ctx = canvas.getContext('2d')!
    const style = getComputedStyle(document.documentElement)
    const rgb = (n: string) => style.getPropertyValue(`--${n}`).trim().split(/\s+/).join(',')
    const C = { ember: rgb('ember'), heat: rgb('heat'), ash: rgb('ash') }
    const col = (c: string, a: number) => `rgba(${c},${clamp(a, 0, 1)})`
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const globe: P[] = Array.from({ length: 380 }, (_, i, arr) => {
      const y = 1 - (i / (arr.length - 1)) * 2
      const r = Math.sqrt(1 - y * y)
      const th = i * 2.399963
      return { x: Math.cos(th) * r * 0.62, y: y * 0.62, z: Math.sin(th) * r * 0.62 }
    })
    const dust: P[] = Array.from({ length: 170 }, () => ({
      x: (Math.random() - 0.5) * 9.5,
      y: (Math.random() - 0.5) * 5.4,
      z: (Math.random() - 0.5) * 6,
    }))
    const nodes = RINGS.flatMap((ring, ri) =>
      Array.from({ length: ring.n }, (_, i) => ({
        ri,
        phase: (i / ring.n) * TAU + ri * 0.7,
        size: i === 0 ? 5.2 : 2.6 + ((i * 7 + ri * 3) % 5) * 0.35,
        hero: i === 0,
      })),
    )
    const ringAngle = RINGS.map(() => 0)

    let w = 0, h = 0, dpr = 1
    const resize = () => {
      const r = canvas.getBoundingClientRect()
      dpr = Math.min(2, window.devicePixelRatio || 1)
      w = r.width; h = r.height
      canvas.width = Math.round(w * dpr)
      canvas.height = Math.round(h * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)

    let dragging = false
    let lastX = 0, lastT = 0, lastY = 0, vel = 0
    let inertia: ReturnType<typeof animate> | null = null

    const down = (e: PointerEvent) => {
      dragging = true
      inertia?.stop()
      lastX = e.clientX; lastY = e.clientY; lastT = performance.now(); vel = 0
      canvas.setPointerCapture(e.pointerId)
      canvas.style.cursor = 'grabbing'
    }
    const move = (e: PointerEvent) => {
      if (!dragging) return
      const now = performance.now()
      const dx = e.clientX - lastX
      const dy = e.clientY - lastY
      yaw.set(yaw.get() + dx * 0.008)
      if (e.pointerType === 'mouse') pitch.set(clamp(pitch.get() + dy * 0.006, -1.25, 1.25))
      const dt = Math.max(1, now - lastT)
      vel = vel * 0.6 + ((dx * 0.008) / dt) * 1000 * 0.4
      lastX = e.clientX; lastY = e.clientY; lastT = now
    }
    const up = (e: PointerEvent) => {
      if (!dragging) return
      dragging = false
      canvas.style.cursor = 'grab'
      if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId)
      if (Math.abs(vel) > 0.2 && !reduce) {
        inertia = animate(yaw, yaw.get(), { type: 'inertia', velocity: vel, power: 0.85, timeConstant: 520 })
      }
    }
    canvas.addEventListener('pointerdown', down)
    canvas.addEventListener('pointermove', move)
    canvas.addEventListener('pointerup', up)
    canvas.addEventListener('pointercancel', up)
    canvas.style.cursor = 'grab'

    let raf = 0
    let last = performance.now()
    let t = 0
    let mul = 1

    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      mul += ((dragging ? 2.6 : 1) - mul) * Math.min(1, dt * 4)
      const step = reduce ? 0 : dt * mul
      t += step
      if (!dragging && !reduce) yaw.set(yaw.get() + dt * 0.12)
      RINGS.forEach((r, i) => { ringAngle[i] += r.sp * step })

      const cx = w / 2, cy = h / 2
      const u = Math.min(w, h) * 0.118
      const ya = yaw.get(), pa = pitch.get()
      const scene = (p: P) => rotX(rotY(p, ya), pa)
      const proj = (p: P) => {
        const k = FOCAL / (FOCAL + p.z)
        return { x: cx + p.x * u * k, y: cy + p.y * u * k, k }
      }
      const depthA = (k: number) => clamp((k - 0.72) / 0.78, 0, 1)

      ctx.clearRect(0, 0, w, h)
      ctx.globalCompositeOperation = 'lighter'

      const pulse = 1 + Math.sin(t * 1.6) * 0.06
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, u * 1.6 * pulse)
      g.addColorStop(0, col(C.heat, 0.55))
      g.addColorStop(0.25, col(C.ember, 0.28))
      g.addColorStop(1, col(C.ember, 0))
      ctx.fillStyle = g
      ctx.fillRect(0, 0, w, h)

      const ringPoint = (ri: number, th: number): P => {
        const R = RINGS[ri]
        return scene(rotZ(rotX({ x: Math.cos(th) * R.r, y: 0, z: Math.sin(th) * R.r }, R.tx), R.tz))
      }
      ctx.lineCap = 'round'
      RINGS.forEach((_, ri) => {
        const SEG = 110
        let prev = proj(ringPoint(ri, 0))
        for (let i = 1; i <= SEG; i++) {
          const cur = proj(ringPoint(ri, (i / SEG) * TAU))
          ctx.strokeStyle = col(C.ember, 0.05 + depthA((cur.k + prev.k) / 2) * 0.3)
          ctx.lineWidth = 0.6 + cur.k * 0.5
          ctx.beginPath(); ctx.moveTo(prev.x, prev.y); ctx.lineTo(cur.x, cur.y); ctx.stroke()
          prev = cur
        }
      })

      nodes.forEach((n) => {
        const sign = Math.sign(RINGS[n.ri].sp)
        const th = n.phase + ringAngle[n.ri]
        const TR = n.hero ? 26 : 16
        let prev = proj(ringPoint(n.ri, th))
        for (let j = 1; j <= TR; j++) {
          const cur = proj(ringPoint(n.ri, th - sign * j * 0.04))
          const f = 1 - j / TR
          ctx.strokeStyle = col(n.hero ? C.heat : C.ember, f * 0.55 * (0.4 + depthA(cur.k) * 0.6))
          ctx.lineWidth = (n.hero ? 2.6 : 1.5) * cur.k * f + 0.2
          ctx.beginPath(); ctx.moveTo(prev.x, prev.y); ctx.lineTo(cur.x, cur.y); ctx.stroke()
          prev = cur
        }
      })

      type D = { z: number; draw: () => void }
      const list: D[] = []
      globe.forEach((p) => {
        const s = scene(p)
        list.push({ z: s.z, draw: () => {
          const q = proj(s)
          ctx.fillStyle = col(C.ember, 0.12 + depthA(q.k) * 0.7)
          ctx.beginPath(); ctx.arc(q.x, q.y, 0.7 + q.k * 0.7, 0, TAU); ctx.fill()
        } })
      })
      dust.forEach((p, i) => {
        const s = scene(p)
        list.push({ z: s.z, draw: () => {
          const q = proj(s)
          const tw = 0.6 + Math.sin(t * 0.9 + i) * 0.4
          ctx.fillStyle = col(i % 5 === 0 ? C.heat : C.ash, (0.05 + depthA(q.k) * 0.25) * tw)
          ctx.beginPath(); ctx.arc(q.x, q.y, 0.5 + q.k * 0.6, 0, TAU); ctx.fill()
        } })
      })
      nodes.forEach((n) => {
        const s = ringPoint(n.ri, n.phase + ringAngle[n.ri])
        list.push({ z: s.z, draw: () => {
          const q = proj(s)
          const r = n.size * q.k
          const glow = ctx.createRadialGradient(q.x, q.y, 0, q.x, q.y, r * 4.2)
          glow.addColorStop(0, col(n.hero ? C.heat : C.ember, 0.75))
          glow.addColorStop(1, col(C.ember, 0))
          ctx.fillStyle = glow
          ctx.beginPath(); ctx.arc(q.x, q.y, r * 4.2, 0, TAU); ctx.fill()
          ctx.fillStyle = col(C.ash, 0.55 + depthA(q.k) * 0.45)
          ctx.beginPath(); ctx.arc(q.x, q.y, r * 0.55, 0, TAU); ctx.fill()
        } })
      })
      list.sort((a, b) => b.z - a.z).forEach((d) => d.draw())

      const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, u * 0.2 * pulse)
      core.addColorStop(0, col(C.ash, 0.95))
      core.addColorStop(0.45, col(C.heat, 0.9))
      core.addColorStop(1, col(C.ember, 0))
      ctx.fillStyle = core
      ctx.beginPath(); ctx.arc(cx, cy, u * 0.2 * pulse, 0, TAU); ctx.fill()

      ctx.globalCompositeOperation = 'source-over'
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)

    return () => {
      cancelAnimationFrame(raf)
      inertia?.stop()
      ro.disconnect()
      canvas.removeEventListener('pointerdown', down)
      canvas.removeEventListener('pointermove', move)
      canvas.removeEventListener('pointerup', up)
      canvas.removeEventListener('pointercancel', up)
    }
  }, [yaw, pitch])

  return (
    <motion.div
      className="stage aspect-[5/4] w-full overflow-hidden sm:aspect-[16/9]"
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
    >
      <canvas ref={ref} role="img" aria-label="Orbit" className="h-full w-full select-none" style={{ touchAction: 'pan-y' }} />
    </motion.div>
  )
}
