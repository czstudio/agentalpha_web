"use client"

import { useEffect, useRef, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  color: string
  alpha: number
  size: number
  decay: number
  gravity: number
}

interface Firework {
  x: number
  y: number
  targetY: number
  color: string
  speed: number
  exploded: boolean
  particles: Particle[]
}

const colors = [
  "#ff0000", "#ff4400", "#ff8800", "#ffcc00", "#ffff00",
  "#88ff00", "#00ff88", "#00ffff", "#0088ff", "#0044ff",
  "#4400ff", "#8800ff", "#ff00ff", "#ff0088", "#ffffff",
  "#ffd700", "#ff69b4", "#00ff00", "#7fffd4", "#ff6347"
]

export function Fireworks({ show, onComplete }: { show: boolean; onComplete: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [visible, setVisible] = useState(show)
  const [showText, setShowText] = useState(false)
  const fireworksRef = useRef<Firework[]>([])
  const animationRef = useRef<number>(0)

  useEffect(() => {
    if (show) {
      setVisible(true)
      setShowText(true)

      // 10秒后开始淡出
      const fadeTimer = setTimeout(() => {
        setShowText(false)
      }, 8000)

      const hideTimer = setTimeout(() => {
        setVisible(false)
        onComplete()
      }, 10000)

      return () => {
        clearTimeout(fadeTimer)
        clearTimeout(hideTimer)
      }
    }
  }, [show, onComplete])

  useEffect(() => {
    if (!visible || !canvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")!

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener("resize", resize)

    const createParticles = (x: number, y: number, color: string): Particle[] => {
      const particles: Particle[] = []
      const particleCount = 80 + Math.random() * 40

      for (let i = 0; i < particleCount; i++) {
        const angle = (Math.PI * 2 * i) / particleCount + Math.random() * 0.5
        const speed = 2 + Math.random() * 4
        particles.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          color: Math.random() > 0.3 ? color : colors[Math.floor(Math.random() * colors.length)],
          alpha: 1,
          size: 2 + Math.random() * 2,
          decay: 0.015 + Math.random() * 0.01,
          gravity: 0.05
        })
      }
      return particles
    }

    const createFirework = () => {
      const x = Math.random() * canvas.width
      const targetY = 100 + Math.random() * (canvas.height * 0.4)

      fireworksRef.current.push({
        x,
        y: canvas.height,
        targetY,
        color: colors[Math.floor(Math.random() * colors.length)],
        speed: 8 + Math.random() * 4,
        exploded: false,
        particles: []
      })
    }

    // 初始爆发
    for (let i = 0; i < 5; i++) {
      setTimeout(() => createFirework(), i * 200)
    }

    // 持续发射烟花
    const launchInterval = setInterval(() => {
      if (Math.random() > 0.3) {
        createFirework()
      }
    }, 300)

    const animate = () => {
      ctx.fillStyle = "rgba(0, 0, 0, 0.1)"
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      fireworksRef.current = fireworksRef.current.filter(firework => {
        if (!firework.exploded) {
          // 绘制上升的烟花
          ctx.beginPath()
          ctx.arc(firework.x, firework.y, 3, 0, Math.PI * 2)
          ctx.fillStyle = firework.color
          ctx.fill()

          // 尾迹
          ctx.beginPath()
          ctx.moveTo(firework.x, firework.y)
          ctx.lineTo(firework.x, firework.y + 20)
          ctx.strokeStyle = firework.color
          ctx.lineWidth = 2
          ctx.stroke()

          firework.y -= firework.speed

          if (firework.y <= firework.targetY) {
            firework.exploded = true
            firework.particles = createParticles(firework.x, firework.y, firework.color)
          }
          return true
        } else {
          // 更新和绘制粒子
          firework.particles = firework.particles.filter(p => {
            p.x += p.vx
            p.y += p.vy
            p.vy += p.gravity
            p.vx *= 0.99
            p.alpha -= p.decay

            if (p.alpha > 0) {
              ctx.beginPath()
              ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
              ctx.fillStyle = p.color
              ctx.globalAlpha = p.alpha
              ctx.fill()
              ctx.globalAlpha = 1

              // 光晕效果
              ctx.beginPath()
              ctx.arc(p.x, p.y, p.size * 2, 0, Math.PI * 2)
              ctx.fillStyle = p.color
              ctx.globalAlpha = p.alpha * 0.3
              ctx.fill()
              ctx.globalAlpha = 1

              return true
            }
            return false
          })

          return firework.particles.length > 0
        }
      })

      animationRef.current = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      window.removeEventListener("resize", resize)
      cancelAnimationFrame(animationRef.current)
      clearInterval(launchInterval)
      fireworksRef.current = []
    }
  }, [visible])

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1 }}
          className="fixed inset-0 z-[200] pointer-events-none"
        >
          <canvas
            ref={canvasRef}
            className="absolute inset-0 bg-black/90"
          />

          <AnimatePresence>
            {showText && (
              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.2 }}
                transition={{
                  duration: 1,
                  type: "spring",
                  stiffness: 100
                }}
                className="absolute inset-0 flex flex-col items-center justify-center"
              >
                <motion.div
                  animate={{
                    textShadow: [
                      "0 0 20px #ff0080, 0 0 40px #ff0080, 0 0 60px #ff0080",
                      "0 0 20px #00ffff, 0 0 40px #00ffff, 0 0 60px #00ffff",
                      "0 0 20px #ffff00, 0 0 40px #ffff00, 0 0 60px #ffff00",
                      "0 0 20px #ff0080, 0 0 40px #ff0080, 0 0 60px #ff0080",
                    ]
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="text-center"
                >
                  <h1 className="text-4xl sm:text-6xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-red-500 to-pink-500 mb-4 tracking-wider">
                    HAPPY
                  </h1>
                  <h1 className="text-4xl sm:text-6xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-400 mb-4 tracking-wider">
                    NEW YEAR
                  </h1>
                  <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="text-xl sm:text-2xl md:text-3xl text-white/80 font-medium"
                  >
                    2025
                  </motion.p>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1 }}
                  className="absolute bottom-20 text-white/60 text-sm"
                >
                  ✨ AgentAlpha 祝您新年快乐 ✨
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
