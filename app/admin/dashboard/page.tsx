'use client'

import { useRouter } from 'next/navigation'
import useSWR from 'swr'
import {
  Users,
  FileText,
  BookOpen,
  Handshake,
  TrendingUp,
  Activity,
} from 'lucide-react'
import { fetcher } from '@/lib/fetcher'

export default function AdminDashboardPage() {
  const router = useRouter()
  const { data: statsData, error } = useSWR('/api/admin/stats', fetcher)

  const stats = [
    { label: '社区成员', value: statsData?.memberCount ?? '-', icon: Users, color: 'text-blue-500' },
    { label: '项目数量', value: statsData?.projectCount ?? '-', icon: BookOpen, color: 'text-green-500' },
    { label: '论文数量', value: statsData?.paperCount ?? '-', icon: FileText, color: 'text-purple-500' },
    { label: '合作伙伴', value: statsData?.partnerCount ?? '-', icon: Handshake, color: 'text-orange-500' },
  ]

  const quickActions = [
    { label: '添加成员', href: '/admin/members', description: '新增社区成员' },
    { label: '发布动态', href: '/admin/news', description: '发布社区新闻' },
    { label: '上传媒体', href: '/admin/media', description: '管理图片资源' },
    { label: '编辑内容', href: '/admin/site-content', description: '编辑网站内容' },
  ]

  return (
    <div className="p-6 space-y-6">
      {/* 欢迎区域 */}
      <div className="glass-card-premium linear-border rounded-2xl p-6">
        <h1 className="text-2xl font-bold mb-2">欢迎回来！👋</h1>
        <p className="text-foreground/60">
          这是 AgentAlpha 社区网站的后台管理系统。您可以在这里管理网站的所有内容。
        </p>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="glass-card-premium linear-border rounded-xl p-6 hover:scale-105 transition-transform"
          >
            <div className="flex items-center justify-between mb-4">
              <stat.icon className={`w-8 h-8 ${stat.color}`} />
              <div className="text-xs text-foreground/50 flex items-center gap-1">
                <Activity className="w-3 h-3" />
                <span>实时</span>
              </div>
            </div>
            <div className="text-3xl font-black premium-text-gradient mb-1">
              {stat.value}
            </div>
            <div className="text-sm text-foreground/60">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* 快速操作 */}
      <div className="glass-card-premium linear-border rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-bold">快速操作</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {quickActions.map((action) => (
            <button
              key={action.href}
              onClick={() => router.push(action.href)}
              className="glass-card linear-border rounded-xl p-4 text-left hover:bg-primary/5 transition-all group"
            >
              <div className="font-semibold mb-1 group-hover:text-primary transition-colors">
                {action.label}
              </div>
              <div className="text-xs text-foreground/60">{action.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* 提示信息 */}
      <div className="glass-card linear-border rounded-xl p-4 bg-primary/5">
        <div className="flex items-start gap-3">
          <span className="text-2xl">💡</span>
          <div className="flex-1">
            <h3 className="font-semibold mb-1">开发进度</h3>
            <p className="text-sm text-foreground/70 mb-2">
              后台管理系统核心功能正在开发中。当前已完成：
            </p>
            <ul className="text-sm text-foreground/70 space-y-1">
              <li>✅ 用户认证系统</li>
              <li>✅ 数据库架构</li>
              <li>✅ 后台界面布局</li>
              <li>✅ 内容管理模块</li>
              <li>✅ API 接口</li>
              <li>🔄 媒体管理模块（开发中）</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
