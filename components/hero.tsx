"use client"

import { Button } from "@/components/ui/button"
import { ArrowRight, Sparkles, Users } from "lucide-react"
import { motion } from "framer-motion"
import { communityStats } from "@/lib/data"

export function Hero() {
  return (
    <section
      id="home"
      className="relative min-h-screen flex items-center justify-center overflow-hidden premium-gradient"
    >
      <div className="absolute inset-0 grid-pattern opacity-30" />

      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl floating" />
      <div
        className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/20 rounded-full blur-3xl floating"
        style={{ animationDelay: "3s" }}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32 text-center">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1 }}>
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-flex items-center gap-2 px-4 py-2 mb-8 glass-card rounded-full neon-border"
          >
            <Users className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-foreground">中国领先的AI技术社区</span>
            <Sparkles className="h-4 w-4 text-accent" />
          </motion.div>

          <h1 className="text-6xl md:text-8xl font-black mb-8 text-balance leading-tight">
            <span className="premium-text-gradient">AgentAlpha</span>
            <br />
            <span className="text-foreground">AI 领域的精英社区</span>
          </h1>

          <p className="text-xl md:text-2xl text-foreground/70 mb-12 max-w-3xl mx-auto text-pretty leading-relaxed font-light">
            连接 AI 领域的研究者、工程师与创业者
            <br />
            <span className="text-primary font-medium">技术交流 · 项目合作 · 职业发展 · 知识共享</span>
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              asChild
              className="group relative overflow-hidden bg-gradient-to-r from-primary via-primary to-accent hover:shadow-2xl hover:shadow-primary/50 transition-all duration-300 text-lg px-10 py-7 border-0 shimmer"
            >
              <a href="#join">
                <span className="relative z-10 font-bold">加入社区</span>
                <ArrowRight className="relative z-10 ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </a>
            </Button>
            <Button
              size="lg"
              variant="outline"
              asChild
              className="text-lg px-10 py-7 glass-card hover:bg-primary/10 border-primary/30 neon-border font-semibold bg-transparent"
            >
              <a href="#about">社区介绍</a>
            </Button>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 50 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 1.2, delay: 0.3 }}
          className="mt-24"
        >
          <div className="relative w-full max-w-5xl mx-auto perspective-1000">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/30 via-accent/30 to-primary/30 blur-3xl rounded-full scale-110" />

            <div className="relative glass-card p-2 rounded-3xl neon-border">
              <img
                src="/images/da12d563d03d9074d83ed0cc2ab1ca90.jpg"
                alt="AgentAlpha Community"
                className="relative rounded-2xl w-full shadow-2xl"
              />

              <motion.div
                initial={{ x: -50, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 1, duration: 0.8 }}
                className="absolute -left-6 top-1/4 glass-card p-4 rounded-xl neon-border"
              >
                <div className="text-3xl font-bold text-primary glow-text">{communityStats.members}+</div>
                <div className="text-sm text-foreground/80">社区成员</div>
              </motion.div>

              <motion.div
                initial={{ x: 50, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 1.2, duration: 0.8 }}
                className="absolute -right-6 top-2/3 glass-card p-4 rounded-xl neon-border"
              >
                <div className="text-3xl font-bold text-accent glow-text">{communityStats.techTalks}+</div>
                <div className="text-sm text-foreground/80">技术分享</div>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
