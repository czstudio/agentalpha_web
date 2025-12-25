"use client"

import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { ArrowRight, Sparkles } from "lucide-react"
import { communityStats, socialPlatforms } from "@/lib/data"
import Image from "next/image"

export function JoinCommunity() {
  return (
    <section id="join" className="relative py-32 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-cyan-950/20 to-background" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(6,182,212,0.15),transparent_50%)]" />

      {/* Animated grid */}
      <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-20 animate-pulse" />

      <div className="container relative z-10 mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-4xl mx-auto text-center"
        >
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-cyan-500/20 to-purple-500/20 border border-cyan-500/50 backdrop-blur-xl mb-8"
          >
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span className="text-sm font-medium text-cyan-400">限时开放</span>
          </motion.div>

          {/* Heading */}
          <h2 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-white via-cyan-200 to-purple-400 bg-clip-text text-transparent leading-tight">
            准备好开启你的
            <br />
            AI 进阶之旅了吗？
          </h2>

          <p className="text-xl md:text-2xl text-gray-400 mb-12 leading-relaxed max-w-3xl mx-auto">
            加入 AgentAlpha 社区，与志同道合的伙伴一起
            <br />
            探索 AI 的无限可能，打造属于你的技术影响力
          </p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="flex flex-col sm:flex-row gap-6 justify-center items-center mb-16"
          >
            <Button
              size="lg"
              asChild
              className="group relative px-8 py-6 text-lg font-semibold bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400 text-white border-0 rounded-xl shadow-[0_0_30px_rgba(6,182,212,0.5)] hover:shadow-[0_0_50px_rgba(6,182,212,0.8)] transition-all duration-500"
            >
              <a href="https://discord.gg/agentalpha" target="_blank" rel="noopener noreferrer">
                <span className="relative z-10 flex items-center gap-2">
                  立即加入社区
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </span>
                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-cyan-600 to-purple-600 blur opacity-50 group-hover:opacity-75 transition-opacity" />
              </a>
            </Button>

            <Button
              size="lg"
              variant="outline"
              asChild
              className="px-8 py-6 text-lg font-semibold bg-white/5 hover:bg-white/10 border-white/20 hover:border-white/40 text-white rounded-xl backdrop-blur-xl transition-all duration-300"
            >
              <a href="#about">了解更多</a>
            </Button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="mb-12"
          >
            <h3 className="text-2xl font-bold text-white mb-8">关注我们</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-3xl mx-auto">
              {socialPlatforms.map((platform, index) => (
                <motion.div
                  key={platform.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.7 + index * 0.1 }}
                  className="group relative"
                >
                  <div className="relative p-6 rounded-2xl bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 backdrop-blur-xl hover:border-cyan-500/50 transition-all duration-300">
                    {/* Glow effect */}
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-cyan-500/0 to-purple-500/0 group-hover:from-cyan-500/10 group-hover:to-purple-500/10 transition-all duration-300" />

                    <div className="relative z-10">
                      <h4 className="text-lg font-semibold text-white mb-2">{platform.name}</h4>
                      <p className="text-sm text-gray-400 mb-4">{platform.description}</p>

                      {/* QR Code */}
                      <div className="relative w-full aspect-square rounded-xl overflow-hidden bg-white p-2">
                        <Image
                          src={platform.qrCode || "/placeholder.svg"}
                          alt={`${platform.name} 二维码`}
                          fill
                          className="object-contain"
                        />
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Social proof */}
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.8 }}
            className="text-gray-500 text-sm"
          >
            已有 {communityStats.members.toLocaleString()}+ AI 从业者加入我们的社区
          </motion.p>
        </motion.div>
      </div>
    </section>
  )
}
