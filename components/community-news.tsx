"use client"

import { motion } from "framer-motion"
import { communityNews } from "@/lib/data"
import { Calendar, ArrowRight, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"

const categoryColors = {
  技术分享: "from-cyan-500 to-blue-500",
  社区活动: "from-purple-500 to-pink-500",
  成员动态: "from-green-500 to-emerald-500",
  合作公告: "from-orange-500 to-red-500",
}

export function CommunityNews() {
  return (
    <section className="relative py-24 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-background via-purple-950/10 to-background" />
      <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-cyan-500/20 rounded-full blur-[120px] animate-pulse" />

      <div className="container relative z-10 mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-cyan-500/20 to-purple-500/20 border border-cyan-500/50 backdrop-blur-xl mb-6">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span className="text-sm font-medium text-cyan-400">实时更新</span>
          </div>

          <h2 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            社区动态
          </h2>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto leading-relaxed">
            最新的技术分享、活动预告和成员动态，第一时间掌握社区信息
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {communityNews.map((news, index) => (
            <motion.a
              key={news.id}
              href={news.link || "#"}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className="group block"
            >
              <div className="relative p-6 rounded-2xl bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl border border-white/10 hover:border-white/20 transition-all duration-500 hover:shadow-[0_0_30px_rgba(168,85,247,0.3)] h-full">
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-cyan-500/5 via-purple-500/5 to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                <div className="relative">
                  {/* Category Badge */}
                  <div
                    className={`inline-block px-3 py-1 rounded-full bg-gradient-to-r ${categoryColors[news.category]} text-white text-xs font-medium mb-4`}
                  >
                    {news.category}
                  </div>

                  {/* Title */}
                  <h3 className="text-lg font-semibold text-white mb-3 leading-snug group-hover:text-cyan-400 transition-colors line-clamp-2">
                    {news.title}
                  </h3>

                  {/* Date */}
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Calendar className="w-4 h-4" />
                    <span>{news.date}</span>
                  </div>

                  {/* Arrow */}
                  <div className="mt-4 flex items-center gap-2 text-cyan-400 opacity-0 group-hover:opacity-100 transition-all duration-300 group-hover:translate-x-2">
                    <span className="text-sm font-medium">查看详情</span>
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </div>
            </motion.a>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="text-center"
        >
          <Button
            size="lg"
            variant="outline"
            className="px-8 py-6 text-lg font-semibold bg-white/5 hover:bg-white/10 border-white/20 hover:border-cyan-500/50 text-white rounded-xl backdrop-blur-xl transition-all duration-300"
          >
            查看更多动态
            <ArrowRight className="ml-2 w-5 h-5" />
          </Button>
        </motion.div>
      </div>
    </section>
  )
}
