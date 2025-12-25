"use client"

import { motion } from "framer-motion"
import { Users, Rocket, BookOpen, Trophy, MessageSquare, Zap } from "lucide-react"

const features = [
  {
    icon: Users,
    title: "精英网络",
    description: "汇聚顶尖AI研究者、工程师和创业者，打造高质量人脉圈",
    gradient: "from-cyan-500 to-blue-500",
  },
  {
    icon: Rocket,
    title: "项目实战",
    description: "从零到一构建真实AI项目，在实战中提升技术能力",
    gradient: "from-purple-500 to-pink-500",
  },
  {
    icon: BookOpen,
    title: "知识沉淀",
    description: "系统化学习路径，从基础到前沿的完整技术体系",
    gradient: "from-green-500 to-emerald-500",
  },
  {
    icon: Trophy,
    title: "职业发展",
    description: "大厂内推、职业辅导、面试准备，助力职业突破",
    gradient: "from-orange-500 to-red-500",
  },
  {
    icon: MessageSquare,
    title: "深度交流",
    description: "技术讨论、论文研读、经验分享，思想碰撞产生火花",
    gradient: "from-indigo-500 to-violet-500",
  },
  {
    icon: Zap,
    title: "快速成长",
    description: "导师指导、同伴学习、项目驱动，加速你的AI之路",
    gradient: "from-yellow-500 to-amber-500",
  },
]

export function CommunityFeatures() {
  return (
    <section className="relative py-32 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background/50 to-background" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(6,182,212,0.1),transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_50%,rgba(168,85,247,0.1),transparent_50%)]" />

      <div className="container relative z-10 mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-20"
        >
          <h2 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            为什么选择 AgentAlpha
          </h2>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto leading-relaxed">
            不只是一个学习平台，更是一个AI领域的精英社区
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className="group"
            >
              <div className="relative h-full p-8 rounded-2xl bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl border border-white/10 hover:border-white/20 transition-all duration-500 hover:shadow-[0_0_30px_rgba(6,182,212,0.3)] hover:-translate-y-2">
                {/* Gradient border effect */}
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-cyan-500/20 via-purple-500/20 to-pink-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl" />

                <div className="relative">
                  {/* Icon */}
                  <div
                    className={`inline-flex p-4 rounded-xl bg-gradient-to-br ${feature.gradient} mb-6 group-hover:scale-110 transition-transform duration-500`}
                  >
                    <feature.icon className="w-8 h-8 text-white" />
                  </div>

                  {/* Content */}
                  <h3 className="text-2xl font-bold mb-4 text-white group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:from-cyan-400 group-hover:to-purple-400 group-hover:bg-clip-text transition-all duration-500">
                    {feature.title}
                  </h3>
                  <p className="text-gray-400 leading-relaxed">{feature.description}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
