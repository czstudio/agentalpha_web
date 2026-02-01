"use client"

import { useLanguage } from "@/contexts/language-context"
import { Button } from "@/components/ui/button"
import {
  ArrowRight,
  BookOpen,
  Brain,
  CalendarCheck,
  ChevronRight,
  Compass,
  Cpu,
  FileText,
  MessageSquare,
  Rocket,
  ShieldCheck,
  Sparkles,
  Users,
  Building2,
  GraduationCap,
  Map,
  Lightbulb,
  Target,
  ExternalLink,
  Flame,
  Github,
  FileBadge,
} from "lucide-react"
import { memo } from "react"

const iconMap: Record<string, any> = {
  Compass,
  ShieldCheck,
  FileText,
  BookOpen,
  Map,
  Lightbulb,
  Rocket,
  Target,
}

const trainingIconMap: Record<string, any> = {
  BookOpen,
  Brain,
  Cpu,
  Rocket,
}

interface HomeContentProps {
  data: any
}

// Memoized stat card component for better re-render performance
const StatCard = memo(({ label, value, note, index }: { label: string; value: string; note: string; index: number }) => (
  <div className={`glass-card rounded-2xl p-5 md:p-6 text-left hover:scale-105 transition-transform duration-300 elegant-fade-in stagger-${index + 1}`}>
    <div className="text-xs md:text-sm text-foreground/60 mb-2 uppercase tracking-wider">{label}</div>
    <div className="text-2xl md:text-3xl font-bold mt-2 mb-2 premium-text-gradient">{value}</div>
    <div className="text-xs md:text-sm text-foreground/60 mt-2">{note}</div>
  </div>
))
StatCard.displayName = "StatCard"

// Memoized resource card component
const ResourceCard = memo(({ item, IconComponent }: { item: any; IconComponent: any }) => (
  <a
    href={item.link || '#'}
    target={item.link ? '_blank' : '_self'}
    rel={item.link ? 'noopener noreferrer' : ''}
    className="group relative glass-card rounded-2xl p-6 hover:-translate-y-1 transition-all duration-300 block premium-card-hover"
  >
    <div className="flex items-start gap-4">
      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 luxury-glow">
        <IconComponent className="w-6 h-6 text-primary group-hover:scale-110 transition-transform duration-300" />
      </div>
      <div className="flex-1">
        <h4 className="text-base md:text-lg font-semibold mb-2 group-hover:text-primary transition-colors">{item.title}</h4>
        <p className="text-foreground/60 text-sm leading-relaxed">{item.description}</p>
      </div>
    </div>
  </a>
))
ResourceCard.displayName = "ResourceCard"

export function HomeContent({ data }: HomeContentProps) {
  const { t, locale } = useLanguage()

  // Helper function to ensure array
  const ensureArray = (value: any, defaultValue: any[] = []) => {
    if (Array.isArray(value)) return value
    return defaultValue
  }

  // Get site content with fallback
  const c = data.siteContent || {}

  // Build stats from config
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
    <main className="min-h-screen">
      {/* Hero Section */}
      <section id="home" className="relative min-h-screen flex items-center justify-center overflow-hidden premium-gradient pt-16 md:pt-20">
        <div className="absolute inset-0 grid-pattern opacity-30" />
        <div className="hidden md:block absolute -left-40 top-40 h-64 w-64 rounded-full blur-3xl bg-primary/15" />
        <div className="hidden md:block absolute -right-32 bottom-10 h-72 w-72 rounded-full blur-3xl bg-accent/15" />

        <div className="relative z-10 section-shell py-16 md:py-28 lg:py-32">
          <div className="max-w-5xl mx-auto text-center space-y-8 md:space-y-10 lg:space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="inline-flex items-center gap-3 px-4 py-2 md:px-5 md:py-2.5 rounded-full glass-card neon-border luxury-glow">
              <Sparkles className="w-4 h-4 md:w-4 md:h-4 text-primary" />
              <span className="text-sm md:text-base font-medium text-foreground/80">{t.hero.badge}</span>
            </div>

            <h1 className="text-3xl sm:text-3xl md:text-4xl lg:text-5xl font-black leading-tight text-balance px-4 md:px-0">
              <span className="premium-text-gradient">{t.hero.title_highlight}</span>
              <br />
              <span className="text-foreground">{t.hero.title_normal}</span>
            </h1>

            <p className="text-base md:text-lg text-foreground/70 leading-relaxed max-w-3xl mx-auto px-4 md:px-0">
              {t.hero.subtitle}
            </p>

            <div className="flex flex-col sm:flex-row gap-3 md:gap-4 justify-center items-center px-4 md:px-0">
              <Button
                asChild
                size="lg"
                className="w-full sm:w-auto group relative overflow-hidden bg-gradient-to-r from-primary via-primary to-accent hover:shadow-2xl hover:shadow-primary/40 transition-all duration-300 text-base md:text-lg px-8 md:px-10 py-6 md:py-7 border-0 shimmer"
              >
                <a href="#join">
                  <span className="relative z-10 font-bold">{t.hero.cta_primary}</span>
                  <ArrowRight className="relative z-10 ml-2 h-4 md:h-5 w-4 md:w-5 group-hover:translate-x-1 transition-transform" />
                </a>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="w-full sm:w-auto text-base md:text-lg px-8 md:px-10 py-6 md:py-7 glass-card hover:bg-primary/10 border-primary/30 neon-border font-semibold bg-transparent"
              >
                <a href="#contact">{t.hero.cta_secondary}</a>
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 pt-8 md:pt-12 px-4 md:px-0">
              {stats.map((item, idx) => (
                <StatCard key={item.label} label={item.label} value={item.value} note={item.note} index={idx} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Vision Section */}
      <section id="vision" className="relative py-24 md:py-40 lg:py-48 premium-gradient overflow-hidden">
        <div className="section-shell relative z-10">
          <div className="panel p-10 sm:p-12 md:p-16 lg:p-20">
            <div className="flex items-center gap-3 mb-6">
              <ShieldCheck className="w-6 h-6 text-primary" />
              <p className="tag-pill">{t.vision.tag}</p>
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-10 leading-tight">{t.vision.title}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-10 lg:gap-12">
              <div className="space-y-5 md:space-y-6">
                {t.vision.vision_points.map((point: string) => (
                  <div key={point} className="glass-card rounded-2xl p-6 md:p-7 flex gap-4 items-start hover:scale-[1.02] transition-transform duration-300">
                    <div className="w-2.5 h-2.5 mt-2 rounded-full bg-primary flex-shrink-0" />
                    <p className="text-foreground/80 leading-relaxed text-base md:text-lg">{point}</p>
                  </div>
                ))}
              </div>
              <div className="glass-card rounded-3xl p-8 md:p-10 space-y-5">
                <h3 className="text-2xl md:text-3xl font-semibold">{t.vision.offerings_title}</h3>
                <ul className="space-y-3 text-foreground/70 text-base md:text-lg leading-relaxed">
                  {t.vision.offerings.map((item: string) => (
                    <li key={item}>· {item}</li>
                  ))}
                </ul>
                <div className="rounded-2xl bg-primary/10 border border-primary/30 p-6 text-base md:text-lg text-foreground/80 leading-relaxed">
                  {t.vision.bottom_note}
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="grid-overlay" />
      </section>

      {/* Advanced Section */}
      <section id="advanced" className="relative py-24 md:py-40 lg:py-48">
        <div className="section-shell space-y-16">
          <div className="flex items-center gap-3 mb-4">
            <Rocket className="w-6 h-6 text-accent" />
            <p className="tag-pill">{t.advanced.tag}</p>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold leading-tight">{t.advanced.title}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 md:gap-8">
            {t.advanced.offerings.map((block: any) => (
              <div key={block.title} className="glass-card rounded-3xl p-8 md:p-10 space-y-6 hover:scale-[1.02] transition-all duration-300">
                <h3 className="text-lg md:text-xl font-semibold leading-tight">{block.title}</h3>
                <ul className="space-y-3 text-foreground/70 text-base md:text-lg leading-relaxed">
                  {block.bullets.map((item: string) => (
                    <li key={item} className="flex gap-2">
                      <span className="text-primary">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Resources Section - only show if data exists */}
      {data.resources && data.resources.length > 0 && (
        <section id="resources" className="relative py-20 md:py-28 lg:py-32 premium-gradient overflow-hidden">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-20 left-10 w-72 h-72 rounded-full bg-primary/5 blur-3xl" />
            <div className="absolute bottom-20 right-10 w-96 h-96 rounded-full bg-accent/5 blur-3xl" />
          </div>

          <div className="section-shell relative z-10">
            <div className="text-center mb-16 md:mb-20">
              <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full glass-card mb-6">
                <BookOpen className="w-5 h-5 text-primary" />
                <span className="text-base font-medium text-foreground/80">{t.resources.tag}</span>
              </div>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold premium-text-gradient mb-4">
                {t.resources.title}
              </h2>
              <p className="text-foreground/60 max-w-2xl mx-auto text-base md:text-lg leading-relaxed">
                {t.resources.subtitle}
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-10">
              {/* Left: Advanced Path Resources */}
              <div className="space-y-6">
                <h3 className="text-xl md:text-2xl font-bold text-foreground mb-6">{t.resources.advanced_path}</h3>
                <div className="grid grid-cols-1 gap-6">
                  {data.resources.map((item: any) => {
                    const IconComponent = iconMap[item.icon] || BookOpen
                    return <ResourceCard key={item.id} item={item} IconComponent={IconComponent} />
                  })}
                </div>
              </div>

              {/* Right: Community Projects/Papers */}
              <div className="space-y-6">
                <div className="flex items-center gap-2 mb-6">
                  <Flame className="w-5 h-5 text-orange-500" />
                  <h3 className="text-xl md:text-2xl font-bold text-foreground">{t.resources.community_projects}</h3>
                </div>

                {/* Idea2Story Project */}
                <div className="group relative glass-card rounded-2xl p-6 md:p-8 overflow-hidden hover:-translate-y-1 transition-all duration-300">
                  <div className="absolute -top-32 -right-32 w-64 h-64 rounded-full bg-gradient-to-br from-orange-500/20 via-red-500/15 to-transparent blur-3xl group-hover:scale-150 transition-transform duration-700" />
                  <div className="absolute -bottom-32 -left-32 w-64 h-64 rounded-full bg-gradient-to-br from-primary/10 via-accent/10 to-transparent blur-3xl group-hover:scale-150 transition-transform duration-700" />

                  <div className="relative">
                    <div className="flex flex-wrap items-center gap-3 mb-6">
                      <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-gradient-to-r from-orange-500/20 to-red-500/20 text-orange-400 text-sm font-semibold border border-orange-500/20">
                        <Flame className="w-3.5 h-3.5" />
                        {t.resources.featured_release}
                      </span>
                      <span className="text-sm text-foreground/40">Hugging Face Papers · GitHub</span>
                    </div>

                    <h4 className="text-2xl md:text-3xl font-bold mb-4 group-hover:text-primary transition-colors">
                      Idea2Story
                    </h4>

                    <p className="text-foreground/70 leading-relaxed mb-6 text-sm md:text-base">
                      {t.resources.idea2story_desc}
                    </p>

                    <div className="space-y-3 mb-6">
                      <div className="flex items-start gap-3 p-4 rounded-xl bg-primary/5 border border-primary/10">
                        <FileBadge className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                        <div>
                          <div className="font-semibold text-sm mb-1">{t.resources.idea2story_feature1_title}</div>
                          <div className="text-xs text-foreground/50">{t.resources.idea2story_feature1_desc}</div>
                        </div>
                      </div>
                      <div className="flex items-start gap-3 p-4 rounded-xl bg-accent/5 border border-accent/10">
                        <Sparkles className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
                        <div>
                          <div className="font-semibold text-sm mb-1">{t.resources.idea2story_feature2_title}</div>
                          <div className="text-xs text-foreground/50">{t.resources.idea2story_feature2_desc}</div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-foreground/60 mb-6 p-3 rounded-xl bg-foreground/5 border border-foreground/10">
                      <Users className="w-4 h-4 text-primary flex-shrink-0" />
                      <span>{t.resources.idea2story_contributors}</span>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <a
                        href="https://huggingface.co/papers/2601.20833"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-orange-500 to-red-500 text-white font-medium text-sm hover:shadow-lg hover:shadow-orange-500/25 hover:-translate-y-0.5 transition-all duration-300"
                      >
                        <ExternalLink className="w-4 h-4" />
                        {t.resources.view_paper}
                      </a>
                      <a
                        href="https://github.com/AgentAlphaAGI/Idea2Paper"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg glass-card border border-foreground/20 text-foreground font-medium text-sm hover:border-primary/40 hover:bg-primary/5 hover:-translate-y-0.5 transition-all duration-300"
                      >
                        <Github className="w-4 h-4" />
                        {t.resources.star_github}
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="grid-overlay opacity-50" />
        </section>
      )}

      {/* Talks Section */}
      <section id="talks" className="relative py-20 md:py-28 lg:py-32 premium-gradient overflow-hidden">
        <div className="section-shell relative z-10 space-y-10">
          <div className="panel p-6 sm:p-8 md:p-10 lg:p-12 rounded-2xl space-y-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-accent" />
                <p className="tag-pill">{t.talks.tag}</p>
              </div>
              <a
                href="https://qingkeai.online/talk"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:text-primary/80 flex items-center gap-1 transition-colors"
              >
                {t.talks.more_talks} <ChevronRight className="w-4 h-4" />
              </a>
            </div>

            {/* Qingke Talks */}
            {data.qingkeTalks && data.qingkeTalks.length > 0 && (
              <div className="space-y-6">
                <div className="flex items-center gap-2">
                  <span className="text-xs px-3 py-1.5 rounded-full bg-green-500/20 text-green-400 font-medium">{t.talks.from_qingke}</span>
                  <span className="text-xs text-foreground/50">{t.talks.realtime_sync}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5 md:gap-6">
                  {data.qingkeTalks.slice(0, 3).map((talk: any) => (
                    <a
                      key={talk.id}
                      href={talk.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group relative glass-card rounded-2xl overflow-hidden hover:-translate-y-1 hover:shadow-xl transition-all duration-300"
                    >
                      <div className="relative h-40 md:h-44 overflow-hidden">
                        <img
                          src={talk.cover}
                          alt={talk.title}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                          loading="lazy"
                          decoding="async"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                        <div className="absolute bottom-3 left-3 flex flex-wrap gap-1.5">
                          {talk.tags?.slice(0, 2).map((tag: string, idx: number) => (
                            <span key={idx} className="text-sm px-3 py-1 rounded-full bg-primary/80 text-white">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="p-5 space-y-2">
                        <h4 className="text-base md:text-lg font-semibold line-clamp-2 group-hover:text-primary transition-colors">
                          {talk.title}
                        </h4>
                        <p className="text-foreground/60 text-sm line-clamp-2">{talk.excerpt}</p>
                        <div className="flex items-center gap-2 text-xs text-foreground/50">
                          <span>📍 {talk.author}</span>
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Videos & Live Streams */}
            {data.qingkeVideos && data.qingkeVideos.length > 0 && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm px-3 py-1.5 rounded-full bg-red-500/20 text-red-400 font-medium flex items-center gap-1.5">
                      <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                      {t.talks.videos_live}
                    </span>
                    <span className="text-sm text-foreground/50">{t.talks.from_qingke}</span>
                  </div>
                </div>
                <div className="relative overflow-hidden py-6">
                  <div className="absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-card to-transparent z-10" />
                  <div className="absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-card to-transparent z-10" />
                  <div className="flex gap-8 animate-scroll">
                    {[...data.qingkeVideos, ...data.qingkeVideos].map((video: any, index: number) => (
                      <a
                        key={`${video.id}-carousel-${index}`}
                        href={video.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group relative flex-shrink-0 w-80 sm:w-96 md:w-[28rem] glass-card rounded-3xl overflow-hidden hover:-translate-y-1 hover:shadow-xl transition-all duration-300"
                      >
                        <div className="relative h-52 md:h-56 overflow-hidden">
                          <img
                            src={video.cover}
                            alt={video.title}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                            loading="lazy"
                            decoding="async"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                          <div className="absolute top-3 left-3">
                            <span className={`text-sm px-3 py-1.5 rounded-full font-medium ${
                              video.type === 'live'
                                ? 'bg-red-500/90 text-white'
                                : 'bg-blue-500/90 text-white'
                            }`}>
                              {video.type === 'live' ? '🔴 ' + t.talks.live : '▶️ ' + t.talks.video}
                            </span>
                          </div>
                          <div className="absolute bottom-3 left-3 flex flex-wrap gap-1.5">
                            {video.tags?.slice(0, 2).map((tag: string, idx: number) => (
                              <span key={idx} className="text-sm px-3 py-1 rounded-full bg-primary/80 text-white">
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="p-6 space-y-3">
                          <h4 className="text-base md:text-lg font-semibold line-clamp-2 group-hover:text-primary transition-colors">
                            {video.title}
                          </h4>
                          <p className="text-foreground/60 text-base line-clamp-2">{video.excerpt}</p>
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="grid-overlay" />
      </section>

      {/* Training/Join Section */}
      <section id="join" className="relative py-24 md:py-40 lg:py-48 premium-gradient overflow-hidden">
        <div className="section-shell relative z-10 space-y-16">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full glass-card mb-8">
              <MessageSquare className="w-5 h-5 text-primary" />
              <span className="text-base font-medium text-foreground/80">{t.training.badge}</span>
            </div>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold premium-text-gradient mb-6">{t.training.title}</h2>
          </div>
          <div className="panel p-10 sm:p-12 md:p-16 lg:p-20 rounded-3xl space-y-12">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
              {t.training.modules.map((module: any) => {
                const IconComponent = trainingIconMap[module.icon] || BookOpen
                return (
                  <div key={module.title} className="glass-card rounded-3xl p-8 space-y-4 hover:scale-[1.02] transition-transform duration-300">
                    <IconComponent className="w-7 h-7 text-primary" />
                    <h4 className="text-lg md:text-xl font-semibold">{module.title}</h4>
                    <p className="text-foreground/70 text-base md:text-lg leading-relaxed">{module.desc}</p>
                  </div>
                )
              })}
            </div>
            <div className="flex flex-col md:flex-row items-center gap-6 justify-between pt-6">
              <div className="space-y-3">
                <h3 className="text-3xl md:text-4xl font-bold">{t.training.headline}</h3>
                <p className="text-foreground/70 text-base md:text-lg leading-relaxed">
                  {t.training.description}
                </p>
              </div>
              <div className="flex gap-4">
                <Button size="lg" className="shimmer bg-gradient-to-r from-primary to-accent border-0 text-base md:text-lg px-8 py-6" asChild>
                  <a href="#join">{t.training.cta_primary}</a>
                </Button>
                <Button size="lg" variant="outline" className="glass-card border-primary/30 text-base md:text-lg px-8 py-6" asChild>
                  <a href="#contact">{t.training.cta_secondary}</a>
                </Button>
              </div>
            </div>
          </div>
        </div>
        <div className="grid-overlay" />
      </section>

      {/* Contact Section */}
      <section id="contact" className="relative py-24 md:py-40 lg:py-48">
        <div className="section-shell">
          <div className="panel p-10 sm:p-12 md:p-16 lg:p-20 rounded-3xl flex flex-col md:flex-row gap-16 items-start justify-between">
            <div className="space-y-6 max-w-2xl">
              <div className="flex items-center gap-3">
                <CalendarCheck className="w-6 h-6 text-primary" />
                <p className="tag-pill">{t.contact.tag}</p>
              </div>
              <h3 className="text-4xl md:text-5xl font-bold">{t.contact.title}</h3>
              <p className="text-foreground/70 leading-relaxed text-base md:text-lg">
                {t.contact.description}
              </p>
              <div className="flex flex-wrap gap-3 text-base text-foreground/80">
                {t.contact.tags.map((tag: string) => (
                  <span key={tag} className="tag-pill">{tag}</span>
                ))}
              </div>
            </div>
            {data.socialPlatforms && data.socialPlatforms.length > 0 && (
              <div className="w-full md:w-96 h-96 glass-card rounded-3xl flex items-center justify-center border-dashed border-2 border-primary/40 text-foreground/50 text-base text-center px-6">
                <div className="space-y-4 text-center">
                  <img
                    src={data.socialPlatforms[0].qrCode}
                    alt={data.socialPlatforms[0].name}
                    className="w-56 h-56 sm:w-64 sm:h-64 object-cover rounded-2xl mx-auto luxury-glow hover:scale-110 transition-all duration-500 cursor-pointer"
                    loading="lazy"
                    decoding="async"
                  />
                  <div className="text-foreground/70 text-base font-medium">{data.socialPlatforms[0].name}</div>
                </div>
              </div>
            )}
          </div>
          {data.socialPlatforms && data.socialPlatforms.length > 0 ? (
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-6">
              {data.socialPlatforms.map((platform: any) => (
                <div key={platform.id} className="glass-card rounded-2xl p-8 flex items-center gap-5 hover:shadow-lg transition-all">
                  <img
                    src={platform.qrCode}
                    alt={platform.name}
                    className="w-28 h-28 object-cover rounded-xl border border-primary/30 hover:scale-110 transition-transform duration-500 cursor-pointer"
                    loading="lazy"
                    decoding="async"
                  />
                  <div className="text-base">
                    <div className="font-semibold text-lg">{platform.name}</div>
                    <div className="text-foreground/60">{platform.description}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-6 text-center py-12 text-foreground/60">
              <MessageSquare className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <p>{t.contact.no_contact}</p>
              <p className="text-sm mt-2">{t.contact.add_contact_hint}</p>
            </div>
          )}
        </div>
      </section>

      {/* Universities Section */}
      <section id="universities" className="relative py-24 md:py-40 lg:py-48 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-accent/5 to-background" />
        <div className="absolute inset-0">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-pulse delay-1000" />
        </div>

        <div className="section-shell relative z-10 space-y-16">
          <div className="text-center space-y-6">
            <div className="inline-flex items-center gap-3 px-5 py-2.5 rounded-full glass-card neon-border">
              <GraduationCap className="w-6 h-6 text-primary" />
              <span className="text-base font-medium">{t.universities.tag}</span>
            </div>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-black premium-text-gradient">
              {t.universities.title}
            </h2>
            <p className="text-foreground/70 max-w-2xl mx-auto text-base md:text-lg leading-relaxed">
              {t.universities.description}
            </p>
          </div>

          {data.universities.length > 0 ? (
            <div className="relative overflow-hidden py-10">
              <div className="absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-background to-transparent z-10" />
              <div className="absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-background to-transparent z-10" />
              <div className="flex gap-10 animate-scroll">
                {[...data.universities, ...data.universities].map((university: any, index: number) => (
                  <a
                    key={`${university.id}-${index}`}
                    href={university.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-shrink-0 w-40 h-40 sm:w-48 sm:h-48 glass-card rounded-2xl p-6 sm:p-8 flex flex-col items-center justify-center gap-3 hover:scale-110 transition-all group"
                  >
                    <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-white/90 dark:bg-white/80 p-3 sm:p-4 flex items-center justify-center border border-black/5 dark:border-white/10 shadow-sm">
                      <img
                        src={university.logo}
                        alt={university.name}
                        className="w-full h-full object-contain group-hover:scale-110 transition-transform"
                        loading="lazy"
                        decoding="async"
                      />
                    </div>
                    <span className="text-sm text-foreground/60 text-center font-medium">{university.name}</span>
                  </a>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-foreground/60">
              <Building2 className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <p>{t.universities.no_universities}</p>
              <p className="text-sm mt-2">{t.universities.add_universities_hint}</p>
            </div>
          )}
        </div>
      </section>
    </main>
  )
}
