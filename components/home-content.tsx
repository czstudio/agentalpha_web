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
  Users,
  Award,
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

const ADVANCED_HREFS = ["/interview", "/#proof", "/#contact"]

/** 院校播放栏兜底：public/logos 下的静态素材，数据库 partner 表为空时也能显示 */
const FALLBACK_UNIVERSITIES = [
  { name: "清华大学", logo: "/logos/tsinghua.svg", website: "https://www.tsinghua.edu.cn" },
  { name: "北京大学", logo: "/logos/pku.svg", website: "https://www.pku.edu.cn" },
  { name: "复旦大学", logo: "/logos/fudan.svg", website: "https://www.fudan.edu.cn" },
  { name: "上海交通大学", logo: "/logos/sjtu.svg", website: "https://www.sjtu.edu.cn" },
  { name: "上海财经大学", logo: "/logos/sufe.svg", website: "https://www.sufe.edu.cn" },
  { name: "南方科技大学", logo: "/logos/sustech.svg", website: "https://www.sustech.edu.cn" },
  { name: "BGD", logo: "/logos/bgd.svg", website: "#" },
]

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

  // 3D 倾斜跟随鼠标 + 光标位置高光（触屏设备自动跳过）
  useEffect(() => {
    if (!window.matchMedia("(pointer: fine)").matches) return
    const cards = Array.from(document.querySelectorAll<HTMLElement>("[data-tilt]"))
    const cleanups: Array<() => void> = []
    for (const card of cards) {
      const onMove = (event: MouseEvent) => {
        const rect = card.getBoundingClientRect()
        const x = (event.clientX - rect.left) / rect.width - 0.5
        const y = (event.clientY - rect.top) / rect.height - 0.5
        card.style.transform = `perspective(900px) rotateY(${x * 10}deg) rotateX(${-y * 9}deg) translateY(-3px)`
        card.style.setProperty("--mx", `${((x + 0.5) * 100).toFixed(1)}%`)
        card.style.setProperty("--my", `${((y + 0.5) * 100).toFixed(1)}%`)
      }
      const onLeave = () => {
        card.style.transform = ""
      }
      card.addEventListener("mousemove", onMove)
      card.addEventListener("mouseleave", onLeave)
      cleanups.push(() => {
        card.removeEventListener("mousemove", onMove)
        card.removeEventListener("mouseleave", onLeave)
      })
    }
    return () => cleanups.forEach((fn) => fn())
  }, [])

  const c = data.siteContent || {}

  // 院校播放栏：数据库为空时回落到静态 logo 列表
  const universities = data.universities?.length > 0 ? data.universities : FALLBACK_UNIVERSITIES

  // 数据条只放可点开核验的战绩（数字与出处由 zh/en 文案维护），不再读后台可改的 siteContent
  const stats = [
    { label: t.stats.stat1_label, value: t.stats.stat1_value, note: t.stats.stat1_note },
    { label: t.stats.stat2_label, value: t.stats.stat2_value, note: t.stats.stat2_note },
    { label: t.stats.stat3_label, value: t.stats.stat3_value, note: t.stats.stat3_note },
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
              <a href="#proof" className="aa-btn-ghost">{t.hero.cta_secondary}</a>
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

      <section id="proof" className="aa-section">
        <div className="section-shell">
          <SectionHead icon={ShieldCheck} kicker={t.proof.tag} title={t.proof.title} desc={t.proof.desc} />
          <div className="aa-proof-grid">
            {t.proof.projects.map((project: any) => (
              <article key={project.name} className={`aa-proof-card aa-pg ${project.tone}`} data-tilt>
                <span className="aa-pg-glow" aria-hidden />
                <span className="aa-pg-noise" aria-hidden />
                <span className="aa-pg-ghost" aria-hidden>{project.ghost}</span>
                <div className="aa-pg-body">
                  <span className="aa-pg-kicker">{project.kicker}</span>
                  <h3>{project.name}</h3>
                  <p className="aa-pg-desc">{project.desc}</p>
                  <ul>
                    {project.points.map((point: string) => (
                      <li key={point}>{point}</li>
                    ))}
                  </ul>
                  <a className="aa-pg-go" href={project.href} target="_blank" rel="noopener noreferrer">
                    {project.href_label} ↗
                  </a>
                </div>
              </article>
            ))}
          </div>

          <div className="aa-paper-strip">
            <p className="aa-paper-strip-t">{t.proof.papers_title}</p>
            <div className="aa-paper-strip-list">
              {t.proof.papers.map((paper: any) => (
                <article key={paper.name} className="aa-proof-card aa-pg aa-pg--paper" data-tilt>
                  <span className="aa-pg-glow" aria-hidden />
                  <span className="aa-pg-noise" aria-hidden />
                  <span className="aa-pg-ghost" aria-hidden>{paper.ghost}</span>
                  <div className="aa-pg-body">
                    <span className="aa-pg-kicker">{paper.kicker}</span>
                    <h3>{paper.name}</h3>
                    <p className="aa-pg-desc">{paper.desc}</p>
                    <p className="aa-pg-title">{paper.title}</p>
                    <a className="aa-pg-go" href={paper.href} target="_blank" rel="noopener noreferrer">
                      {paper.meta} · {paper.href_label} ↗
                    </a>
                  </div>
                </article>
              ))}
            </div>
          </div>
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

      <section id="mentors" className="aa-section">
        <div className="section-shell">
          <SectionHead icon={Users} kicker={t.mentors.tag} title={t.mentors.title} />
          <div className="aa-mentor-grid">
            <div className="aa-mentor-col">
              <h3>{t.mentors.industry_title}</h3>
              <ul>
                {t.mentors.industry.map((item: string) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <div className="aa-mentor-col">
              <h3>{t.mentors.academia_title}</h3>
              <ul>
                {t.mentors.academia.map((item: string) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
          <p className="aa-mentor-note">{t.mentors.note}</p>
        </div>
      </section>

      <section id="results" className="aa-section">
        <div className="section-shell">
          <SectionHead icon={Award} kicker={t.results.tag} title={t.results.title} />
          <div className="aa-result-rows">
            <div className="aa-result-row">
              <dt>{t.results.offer_title}</dt>
              <dd>{t.results.offer_value}</dd>
            </div>
            <div className="aa-result-row">
              <dt>{t.results.paper_title}</dt>
              <dd>{t.results.paper_value}</dd>
            </div>
            <div className="aa-result-row">
              <dt>{t.results.phd_title}</dt>
              <dd>{t.results.phd_value}</dd>
            </div>
          </div>
          <h3 className="aa-subhead">{t.results.cases_title}</h3>
          <ul className="aa-case-grid">
            {t.results.cases.map((caseItem: string) => (
              <li key={caseItem}>{caseItem}</li>
            ))}
          </ul>
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
              <a href="/learn" className="aa-btn-primary">{t.training.cta_primary}</a>
              <button
                type="button"
                className="aa-btn-ghost"
                onClick={() => setEnrollmentOpen(true)}
                aria-haspopup="dialog"
              >
                {t.training.cta_secondary}
              </button>
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

          {universities.length > 0 ? (
            <div className="aa-marquee">
              <div className="aa-marquee-track aa-uni-track animate-scroll">
                {[...universities, ...universities].map((university: any, index: number) => (
                  <a
                    key={`${university.name}-${index}`}
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
