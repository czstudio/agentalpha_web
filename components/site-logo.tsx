interface SiteLogoProps {
  className?: string
  showText?: boolean
}

export function SiteLogo({ className = "", showText = false }: SiteLogoProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* 亮色模式 Logo - 移动端更小 */}
      <img
        src="/logo-light.png"
        alt="AgentAlpha"
        className="h-8 md:h-10 w-auto object-contain transition-all duration-300 dark:hidden"
      />
      {/* 暗色模式 Logo - 移动端更小 */}
      <img
        src="/logo-dark.png"
        alt="AgentAlpha"
        className="hidden h-7 md:h-9 w-auto object-contain transition-all duration-300 dark:block"
      />
      {showText ? <span className="text-sm font-semibold text-foreground">AgentAlpha</span> : null}
    </div>
  )
}

// 导出默认 Logo 组件
export default SiteLogo
