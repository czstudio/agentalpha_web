"use client"

import Image from "next/image"
import { useEffect, useRef, useState } from "react"

/**
 * 品牌标识动画：亮色系进场时播放一次 logo 生长视频（静音，不循环），
 * 播完/深色系/偏好减少动态/加载失败都回退到静态字标——品牌名大部分时间保持完整。
 * 视频 2.4MB：滚动进入视口才开始加载和播放，不占首屏带宽。
 */
export function BrandLogoReel({
  className = "",
}: {
  caption?: string
  className?: string
}) {
  const [useStill, setUseStill] = useState(false)
  const [inView, setInView] = useState(false)
  const stageRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)")
    const update = () => setUseStill(media.matches)
    update()
    media.addEventListener("change", update)
    return () => media.removeEventListener("change", update)
  }, [])

  useEffect(() => {
    const el = stageRef.current
    if (!el || inView) return
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setInView(true)
          io.disconnect()
        }
      },
      { rootMargin: "200px" },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [inView])

  return (
    <figure className={`aa-logo-reel ${className}`.trim()}>
      <div className="aa-logo-reel-stage" ref={stageRef}>
        {useStill || !inView ? (
          <Image
            className="aa-logo-reel-logo dark:hidden"
            src="/logo-light.webp"
            alt="AgentAlpha 标识"
            width={720}
            height={153}
            priority
          />
        ) : (
          <video
            className="aa-logo-reel-video dark:hidden"
            src="/brand/logo-animation.mp4"
            poster="/brand/logo-animation-poster.webp"
            autoPlay
            muted
            playsInline
            preload="none"
            aria-label="AgentAlpha 标识动画"
            onError={() => setUseStill(true)}
            onEnded={() => setUseStill(true)}
          />
        )}
        <Image
          className="aa-logo-reel-logo hidden dark:block"
          src="/logo-dark.webp"
          alt="AgentAlpha 标识"
          width={720}
          height={153}
        />
      </div>
    </figure>
  )
}

export default BrandLogoReel
