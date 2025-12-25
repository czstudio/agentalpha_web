interface SiteLogoProps {
  className?: string
  showText?: boolean
}

export function SiteLogo({ className = "", showText = false }: SiteLogoProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <img
        src="/logo-light.png"
        alt="AgentAlpha"
        className="h-12 w-auto object-contain transition-all duration-300 dark:hidden"
      />
      <img
        src="/logo-dark.png"
        alt="AgentAlpha"
        className="hidden h-12 w-auto object-contain transition-all duration-300 dark:block"
      />
      {showText ? <span className="text-sm font-semibold text-foreground">AgentAlpha</span> : null}
    </div>
  )
}

// 导出默认 Logo 组件
export default SiteLogo
