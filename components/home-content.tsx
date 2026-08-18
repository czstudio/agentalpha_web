"use client"

import { useLanguage } from "@/contexts/language-context"
import { EnrollmentQrDialog } from "@/components/enrollment-qr-dialog"
import { BrandLogoReel } from "@/components/brand-logo-reel"
import {
  BookOpen,
  CalendarCheck,
  ChevronRight,
  FileText,
  MessageSquare,
  Rocket,
  ShieldCheck,
  Building2,
  GraduationCap,
} from "lucide-react"
import { memo, useEffect, useState, type ComponentType, type ReactNode } from "react"
import { ENROLLMENT_DIALOG_EVENT } from "@/lib/enrollment-event"

interface HomeContentProps {
  data: any
}

function SectionHead({
  icon: Icon,
  kicker,
  title,
  desc,
  aside,
}: {
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" | "false" }>
  kicker: string
  title?: string
  desc?: string
  aside?: ReactNode
}) {
  return (
    <header className="aa-section-head">
      <div className="aa-section-head-main">
        <p className="aa-kicker">
          <Icon aria-hidden />
          {kicker}
        </p>
        {title ? <h2>{title}</h2> : null}
        {desc ? <p className="aa-section-desc">{desc}</p> : null}
      </div>
      {aside}
    </header>
  )
}

const StatCard = memo(({ label, value }: { label: string; value: string; note: string }) => (
  <div className="aa-stat">
    <dd>{value}</dd>
    <dt>{label}</dt>
  </div>
))
StatCard.displayName = "StatCard"

const ADVANCED_HREFS = ["/#resources", "/#join", "/#contact"]

export function HomeContent({ data }: HomeContentProps) {
  const { t } = useLanguage()
  const [enrollmentOpen, setEnrollmentOpen] = useState(false)
  const enrollmentQr = data.socialPlatforms?.find((platform: any) =>
    String(platform.name).includes("微信"),
  )?.qrCode || data.socialPlatforms?.[0]?.qrCode || "/images/e5-be-ae-e4-bf-a1.jpg"

  useEffect(() => {
    const openEnrollment = () => setEnrollmentOpen(true)
    window.addEventListener(ENROLLMENT_DIALOG_EVENT, openEnrollment)
    return () => window.removeEventListener(ENROLLMENT_DIALOG_EVENT, openEnrollment)
  }, [])

  const c = data.siteContent || {}

  const stats = c.stats ? [
    { label: t.stats.stat1_label, value: c.stats.stat1_value || "5,000+", note: t.stats.stat1_note },
    { label: t.stats.stat2_label, value: c.stats.stat2_value || "300+", note: t.stats.stat2_note },
    { label: t.stats.stat3_label, value: c.stats.stat3_value || "150+", note: t.stats.stat3_note },
  ] : [
    { label: t.stats.stat1_label, value: "5,000+", note: t.stats.stat1_note },
    { label: t.stats.stat2_label, value: "300+", note: t.stats.stat2_note },
    { label: t.stats.stat3_label, value: "150+", note: t.stats.stat3_note },
  ]

  return (
    <main className="aa-home min-h-screen">
      <section id="home" className="aa-hero">
        <div className="section-shell aa-hero-grid">
          <div className="aa-hero-copy">
            <p className="aa-kicker">{t.hero.badge}</p>
            <h1>
              <span className="aa-hero-brand">{t.hero.title_highlight}</span>
              <span className="aa-hero-line">{t.hero.title_normal}</span>
            </h1>
            <p className="aa-lede">{t.hero.subtitle}</p>
            <div className="aa-hero-actions">
              <button
                type="button"
                className="aa-btn-primary"
                onClick={() => setEnrollmentOpen(true)}
                aria-haspopup="dialog"
              >
                <span>{t.hero.cta_primary}</span>
              </button>
              <a href="#contact" className="aa-btn-ghost">{t.hero.cta_secondary}</a>
            </div>
          </div>
          <BrandLogoReel className="aa-hero-reel" />
          <dl className="aa-stat-row">
            {stats.map((item) => (
              <StatCard key={item.label} label={item.label} value={item.value} note={item.note} />
            ))}
          </dl>
        </div>
      </section>

      <section id="vision" className="aa-section">
        <div className="section-shell">
          <SectionHead icon={ShieldCheck} kicker={t.vision.tag} title={t.vision.title} />
          <div className="aa-vision-grid">
            <div className="aa-vision-points">
              {t.vision.vision_points.map((point: string) => (
                <div key={point} className="aa-vision-point">
                  <p>{point}</p>
                </div>
              ))}
            </div>
            <aside className="aa-vision-offer">
              <h3>{t.vision.offerings_title}</h3>
              <ul>
                {t.vision.offerings.map((item: string) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <p className="aa-vision-note">{t.vision.bottom_note}</p>
            </aside>
          </div>
        </div>
      </section>

      <section id="advanced" className="aa-section">
        <div className="section-shell">
          <SectionHead icon={Rocket} kicker={t.advanced.tag} title={t.advanced.title} />
          <div className="aa-adv-list">
            {t.advanced.offerings.map((block: any, index: number) => (
              <a key={block.title} href={ADVANCED_HREFS[index] || "/#join"} className="aa-adv-row">
                <span className="aa-index">{String(index + 1).padStart(2, "0")}</span>
                <span className="aa-adv-copy">
                  <h3>{block.title}</h3>
                  <p>{block.bullets?.[0]}</p>
                </span>
                <span className="aa-row-arrow" aria-hidden>→</span>
              </a>
            ))}
          </div>
        </div>
      </section>

      <section id="resources" className="aa-section">
          <div className="section-shell">
            <SectionHead
              icon={BookOpen}
              kicker={t.resources.tag}
              title={t.resources.title}
              desc={t.resources.subtitle}
            />
            {data.resources && data.resources.length > 0 ? (
            <div className="aa-resource-list">
              <h3 className="aa-subhead">{t.resources.advanced_path}</h3>
              {data.resources.map((item: any) => (
                <a
                  key={item.id}
                  href={item.link || "#"}
                  target={item.link ? "_blank" : undefined}
                  rel={item.link ? "noopener noreferrer" : undefined}
                  className="aa-resource-row"
                >
                  <span className="aa-resource-body">
                    <span className="aa-resource-title">{item.title}</span>
                    <span className="aa-resource-desc">{item.description}</span>
                  </span>
                  <span className="aa-row-arrow" aria-hidden>↗</span>
                </a>
              ))}
            </div>
            ) : null}

            <article className="aa-feature-band">
              <div className="aa-feature-copy">
                <h3 className="aa-feature-title">Idea2Story</h3>
                <p className="aa-feature-desc">{t.resources.idea2story_desc}</p>
                <p className="aa-feature-meta">{t.resources.idea2story_contributors}</p>
              </div>
              <div className="aa-feature-actions">
                <a
                  href="https://huggingface.co/papers/2601.20833"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="aa-btn-link"
                >
                  {t.resources.view_paper} ↗
                </a>
                <a
                  href="https://github.com/AgentAlphaAGI/Idea2Paper"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="aa-btn-link"
                >
                  {t.resources.star_github} ↗
                </a>
              </div>
            </article>
          </div>
        </section>

      <section id="talks" className="aa-section">
        <div className="section-shell">
          <SectionHead
            icon={FileText}
            kicker={t.talks.tag}
            aside={
              <a
                href="https://qingkeai.online/talk"
                target="_blank"
                rel="noopener noreferrer"
                className="aa-btn-link"
              >
                {t.talks.more_talks} ↗
              </a>
            }
          />

          {data.qingkeTalks && data.qingkeTalks.length > 0 && (
            <div className="aa-talks-block">
              <div className="aa-talks-blockhead">
                <span className="aa-talks-note">{t.talks.from_qingke}</span>
              </div>
              <div className="aa-talks-grid">
                {data.qingkeTalks.slice(0, 3).map((talk: any) => (
                  <a
                    key={talk.id}
                    href={talk.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="aa-talk-card"
                  >
                    <div className="aa-media-fallback aa-cover">
                      <img
                        src={talk.cover}
                        alt={talk.title}
                        className="aa-cover-img"
                        loading="lazy"
                        decoding="async"
                        referrerPolicy="no-referrer"
                        onError={(event) => { event.currentTarget.hidden = true }}
                      />
                    </div>
                    <div className="aa-talk-body">
                      <h4>{talk.title}</h4>
                      <p>{talk.excerpt}</p>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}

          {data.qingkeVideos && data.qingkeVideos.length > 0 && (
            <div className="aa-talks-block">
              <div className="aa-talks-blockhead">
                <span className="aa-talks-note">{t.talks.videos_live}</span>
              </div>
              <div className="aa-marquee">
                <div className="aa-marquee-track animate-scroll">
                  {[...data.qingkeVideos, ...data.qingkeVideos].map((video: any, index: number) => (
                    <a
                      key={`${video.id}-carousel-${index}`}
                      href={video.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="aa-video-card"
                    >
                      <div className="aa-media-fallback aa-cover">
                        <img
                          src={video.cover}
                          alt={video.title}
                          className="aa-cover-img"
                          loading="lazy"
                          decoding="async"
                          referrerPolicy="no-referrer"
                          onError={(event) => { event.currentTarget.hidden = true }}
                        />
                      </div>
                      <div className="aa-talk-body">
                        {video.type === "live" ? <span className="aa-live-label">{t.talks.live}</span> : null}
                        <h4>{video.title}</h4>
                        <p>{video.excerpt}</p>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      <section id="join" className="aa-section">
        <div className="section-shell">
          <SectionHead icon={MessageSquare} kicker={t.training.badge} title={t.training.title} />
          <div className="aa-module-grid">
            {t.training.modules.map((module: any, index: number) => (
              <article key={module.title} className="aa-module">
                <span className="aa-index">{String(index + 1).padStart(2, "0")}</span>
                <h4>{module.title}</h4>
                <p>{module.desc}</p>
              </article>
            ))}
          </div>
          <div className="aa-join-cta">
            <div className="aa-join-copy">
              <h3>{t.training.headline}</h3>
              <p>{t.training.description}</p>
            </div>
            <div className="aa-join-actions">
              <button
                type="button"
                className="aa-btn-primary"
                onClick={() => setEnrollmentOpen(true)}
                aria-haspopup="dialog"
              >
                {t.training.cta_primary}
              </button>
              <a href="#contact" className="aa-btn-ghost">{t.training.cta_secondary}</a>
            </div>
          </div>
        </div>
      </section>

      <section id="contact" className="aa-section">
        <div className="section-shell">
          <div className="aa-contact-copy">
            <p className="aa-kicker">
              <CalendarCheck aria-hidden />
              {t.contact.tag}
            </p>
            <h2>{t.contact.title}</h2>
            <p className="aa-section-desc">{t.contact.description}</p>
          </div>
          {data.socialPlatforms && data.socialPlatforms.length > 0 ? (
            <div className="aa-contact-list">
              {data.socialPlatforms.map((platform: any) => (
                <div key={platform.id} className="aa-contact-item">
                  <img
                    src={platform.qrCode}
                    alt={platform.name}
                    className="aa-qr aa-qr--sm"
                    loading="lazy"
                    decoding="async"
                  />
                  <strong>{platform.name}</strong>
                  <span>{platform.description}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="aa-empty">
              <MessageSquare aria-hidden />
              <p>{t.contact.no_contact}</p>
              <p>{t.contact.add_contact_hint}</p>
            </div>
          )}
        </div>
      </section>

      <section id="universities" className="aa-section">
        <div className="section-shell">
          <SectionHead
            icon={GraduationCap}
            kicker={t.universities.tag}
            title={t.universities.title}
            desc={t.universities.description}
          />

          {data.universities.length > 0 ? (
            <div className="aa-marquee">
              <div className="aa-marquee-track aa-uni-track animate-scroll">
                {[...data.universities, ...data.universities].map((university: any, index: number) => (
                  <a
                    key={`${university.id}-${index}`}
                    href={university.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="aa-uni-mark"
                  >
                    <img
                      src={university.logo}
                      alt={university.name}
                      loading="lazy"
                      decoding="async"
                      onError={(event) => { event.currentTarget.hidden = true }}
                    />
                  </a>
                ))}
              </div>
            </div>
          ) : (
            <div className="aa-empty">
              <Building2 aria-hidden />
              <p>{t.universities.no_universities}</p>
              <p>{t.universities.add_universities_hint}</p>
            </div>
          )}
        </div>
      </section>
      <EnrollmentQrDialog
        open={enrollmentOpen}
        onClose={() => setEnrollmentOpen(false)}
        qrSrc={enrollmentQr}
      />
    </main>
  )
}
