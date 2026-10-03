interface SiteLogoProps {
  className?: string
  showText?: boolean
}

export function SiteLogo({ className = "", showText = false }: SiteLogoProps) {
  return (
    <div className={`aa-site-logo ${className}`.trim()}>
      <span className="aa-site-logo-crop">
        <img
          src="/logo-light.webp"
          alt=""
          width={720}
          height={153}
          className="dark:hidden"
          fetchPriority="high"
        />
        <img
          src="/logo-dark.webp"
          alt=""
          width={720}
          height={153}
          className="hidden dark:block"
        />
      </span>
      <span className="sr-only">AgentAlpha</span>
      {showText ? <span className="aa-site-logo-text">AgentAlpha</span> : null}
    </div>
  )
}

export default SiteLogo
