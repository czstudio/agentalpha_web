"use client"

import { motion } from "framer-motion"
import Link from "next/link"
import useSWR from "swr"
import { SiteLogo } from "@/components/site-logo"
import { fetcher } from "@/lib/fetcher"

type Partner = {
  id: string
  name: string
  logo: string
  type: "university" | "community"
  website?: string | null
  url?: string | null
}

type SocialPlatform = {
  id: string
  name: string
  icon: string
  qrCode: string
  description: string
}

type PublicData = {
  universities: Partner[]
  socialPlatforms: SocialPlatform[]
  content?: Record<string, any>
}

export function Footer() {
  const { data } = useSWR<PublicData>("/api/public/data", fetcher)

  const universities = data?.universities || []
  const socialPlatforms = data?.socialPlatforms || []

  return (
    <footer
      id="about"
      className="relative py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-background to-purple-950/20 border-t border-white/10 overflow-hidden"
    >
      <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-5" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />

      <div className="max-w-7xl mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <Link href="#home" className="inline-flex items-center justify-center gap-2 mb-6 group">
            <SiteLogo />
          </Link>
          <p className="text-lg text-gray-400 max-w-3xl mx-auto mb-8 leading-relaxed">
            {data?.content?.footer?.description ||
              "AgentAlpha 社区致力于连接顶尖研究者、工程师与创作者，通过实践、分享与共创，帮助每个人在 AI 时代获得持续成长。"}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-16"
        >
          <h3 className="text-2xl font-bold text-center mb-8 bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
            合作伙伴
          </h3>

          <div className="mb-8">
            <h4 className="text-lg font-semibold text-gray-300 text-center mb-6">合作院校</h4>
            <div className="flex flex-wrap justify-center items-center gap-6">
              {universities.length > 0 ? (
                universities.map((partner) => (
                  <a
                    key={partner.id}
                    href={partner.website || partner.url || "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group relative"
                  >
                    <div className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 hover:border-cyan-500/50 transition-all duration-300">
                      <span className="text-sm text-gray-300 group-hover:text-cyan-400 transition-colors">
                        {partner.name}
                      </span>
                    </div>
                  </a>
                ))
              ) : (
                <div className="text-sm text-gray-500">暂无合作院校（可在后台“合作伙伴”中添加）</div>
              )}
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-16"
        >
          <h3 className="text-2xl font-bold text-center mb-8 bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
            关注我们
          </h3>
          {socialPlatforms.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
              {socialPlatforms.map((platform) => (
                <div key={platform.id} className="text-center group">
                  <div className="relative p-4 rounded-xl bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl border border-white/10 hover:border-cyan-500/50 transition-all duration-500 hover:shadow-[0_0_20px_rgba(6,182,212,0.3)] mb-3">
                    <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-cyan-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <img src={platform.qrCode} alt={`${platform.name} QR`} className="relative w-full h-auto rounded-lg" />
                  </div>
                  <p className="font-medium text-white">{platform.name}</p>
                  <p className="text-xs text-gray-500">{platform.description}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-sm text-gray-500">暂无社交平台（可在后台“联系二维码”中添加）</div>
          )}
        </motion.div>

        <div className="text-center text-sm text-gray-500 pt-8 border-t border-white/10">
          <p>© {new Date().getFullYear()} AgentAlpha. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}
