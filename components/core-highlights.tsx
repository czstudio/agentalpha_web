"use client"

import { Card } from "@/components/ui/card"
import { Users, Rocket, MessageSquare, TrendingUp } from "lucide-react"
import { motion } from "framer-motion"
import { news } from "@/lib/data"

const highlights = [
  {
    icon: Users,
    title: "精英网络",
    description: "汇聚顶尖AI研究者与工程师，打造高质量人脉圈",
    gradient: "from-cyan-500 to-blue-500",
  },
  {
    icon: Rocket,
    title: "项目实战",
    description: "真实项目合作机会，在实践中提升技术能力",
    gradient: "from-purple-500 to-pink-500",
  },
  {
    icon: MessageSquare,
    title: "深度交流",
    description: "技术讨论、论文研读、经验分享的活跃氛围",
    gradient: "from-blue-500 to-purple-500",
  },
  {
    icon: TrendingUp,
    title: "职业发展",
    description: "大厂内推、职业辅导，助力职业突破",
    gradient: "from-pink-500 to-cyan-500",
  },
]

export function CoreHighlights() {
  return (
    <section id="features" className="py-32 px-4 sm:px-6 lg:px-8 bg-background relative overflow-hidden">
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />

      <div className="max-w-7xl mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-12 text-center"
        >
          <h2 className="text-3xl font-bold premium-text-gradient mb-4">社区动态</h2>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-20"
        >
          <div className="glass-card rounded-2xl p-6 neon-border overflow-hidden">
            <div className="flex items-center gap-8 animate-marquee whitespace-nowrap">
              {[...news, ...news].map((item, idx) => (
                <div key={`${item.id}-${idx}`} className="flex items-center gap-3">
                  <span className="text-2xl">🔥</span>
                  <span className="text-base font-semibold text-foreground">{item.title}</span>
                  <span className="text-sm text-primary font-medium">· {item.date}</span>
                  <span className="mx-6 text-border">|</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-12 text-center"
        >
          <h2 className="text-4xl md:text-5xl font-bold premium-text-gradient mb-4">社区核心优势</h2>
          <p className="text-lg text-foreground/70">在这里，你将获得</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {highlights.map((highlight, index) => (
            <motion.div
              key={highlight.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1, duration: 0.6 }}
            >
              <Card className="group relative p-8 glass-card hover:shadow-2xl hover:shadow-primary/20 transition-all duration-500 hover:-translate-y-2 neon-border h-full">
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${highlight.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-500 rounded-xl`}
                />

                <div className="relative mb-6">
                  <div className={`absolute inset-0 bg-gradient-to-br ${highlight.gradient} blur-xl opacity-50`} />
                  <div className={`relative w-16 h-16 rounded-2xl bg-gradient-to-br ${highlight.gradient} p-0.5`}>
                    <div className="w-full h-full bg-card rounded-2xl flex items-center justify-center">
                      <highlight.icon className="h-7 w-7 text-primary" />
                    </div>
                  </div>
                </div>

                <h3 className="text-2xl font-bold text-foreground mb-3 group-hover:text-primary transition-colors">
                  {highlight.title}
                </h3>
                <p className="text-foreground/70 leading-relaxed">{highlight.description}</p>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
