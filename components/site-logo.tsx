interface SiteLogoProps {
  className?: string
  showText?: boolean
}

export function SiteLogo({ className = "", showText = false }: SiteLogoProps) {
  return (
    <div className={`aa-site-logo ${className}`.trim()}>
      <span className="aa-site-logo-crop">
        <img
          src="/logo-light.png"
          alt=""
          width={1201}
          height={256}
          className="dark:hidden"
        />
        <img
          src="/logo-dark.png"
          alt=""
          width={1201}
          height={256}
          className="hidden dark:block"
        />
      </span>
      <span className="sr-only">AgentAlpha</span>
      {showText ? <span className="aa-site-logo-text">AgentAlpha</span> : null}
    </div>
  )
}

export default SiteLogo
