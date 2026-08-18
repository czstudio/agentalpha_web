"use client"

import Image from "next/image"
import { useEffect, useState } from "react"

/**
 * 品牌标识动画：亮色系播放 logo 生长视频（静音循环），
 * 深色系或偏好减少动态 / 视频加载失败时回退到静态标识图。
 */
export function BrandLogoReel({
  className = "",
}: {
  caption?: string
  className?: string
}) {
  const [useStill, setUseStill] = useState(false)

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)")
    const update = () => setUseStill(media.matches)
    update()
    media.addEventListener("change", update)
    return () => media.removeEventListener("change", update)
  }, [])

  return (
    <figure className={`aa-logo-reel ${className}`.trim()}>
      <div className="aa-logo-reel-stage">
        {useStill ? (
          <Image
            className="aa-logo-reel-logo dark:hidden"
            src="/logo-light.png"
            alt="AgentAlpha 标识"
            width={1201}
            height={256}
            priority
          />
        ) : (
          <video
            className="aa-logo-reel-video dark:hidden"
            src="/brand/logo-animation.mp4"
            poster="/brand/logo-animation-poster.webp"
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            aria-label="AgentAlpha 标识动画"
            onError={() => setUseStill(true)}
          />
        )}
        <Image
          className="aa-logo-reel-logo hidden dark:block"
          src="/logo-dark.png"
          alt="AgentAlpha 标识"
          width={1201}
          height={256}
        />
      </div>
    </figure>
  )
}

export default BrandLogoReel
