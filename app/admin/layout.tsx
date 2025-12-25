'use client'

import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  LayoutDashboard,
  Users,
  FileText,
  BookOpen,
  Briefcase,
  Handshake,
  Newspaper,
  Image as ImageIcon,
  Settings,
  LogOut,
  Menu,
  X,
  Link as LinkIcon,
  MessageSquare,
} from 'lucide-react'
import { useState } from 'react'

const menuItems = [
  { label: '概览', href: '/admin/dashboard', icon: LayoutDashboard },
  { label: '网站内容', href: '/admin/site-content', icon: FileText },
  { label: '基础内容', href: '/admin/content', icon: FileText },
  { label: '快速链接', href: '/admin/quicklinks', icon: LinkIcon },
  { label: '资源合集', href: '/admin/resources', icon: BookOpen },
  { label: '社区成员', href: '/admin/members', icon: Users },
  { label: '导师管理', href: '/admin/mentors', icon: Briefcase },
  { label: '项目管理', href: '/admin/projects', icon: BookOpen },
  { label: '论文管理', href: '/admin/papers', icon: FileText },
  { label: '合作伙伴', href: '/admin/partners', icon: Handshake },
  { label: '新闻动态', href: '/admin/news', icon: Newspaper },
  { label: '联系二维码', href: '/admin/social-platforms', icon: MessageSquare },
  { label: '媒体库', href: '/admin/media', icon: ImageIcon },
  { label: '系统设置', href: '/admin/settings', icon: Settings },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  if (pathname === '/admin/login') {
    return <>{children}</>
  }

  const handleLogout = () => {
    document.cookie = 'auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT'
    router.push('/admin/login')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-background flex">
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-64 glass-card border-r border-border/50 transform transition-transform duration-300 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between h-16 px-6 border-b border-border/50">
            <div className="flex items-center gap-3">
              <LayoutDashboard className="w-6 h-6 text-primary" />
              <h1 className="text-lg font-black premium-text-gradient">后台管理</h1>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          <nav className="flex-1 overflow-y-auto p-4 space-y-1">
            {menuItems.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                    isActive
                      ? 'bg-primary text-primary-foreground linear-glow'
                      : 'hover:bg-muted text-foreground/70 hover:text-foreground'
                  }`}
                >
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  <span className="text-sm font-medium">{item.label}</span>
                </Link>
              )
            })}
          </nav>

          <div className="p-4 border-t border-border/50">
            <Button
              variant="ghost"
              className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={handleLogout}
            >
              <LogOut className="w-5 h-5 mr-3" />
              退出登录
            </Button>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-40 h-16 glass-card border-b border-border/50">
          <div className="h-full px-4 sm:px-6 flex items-center justify-between">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="w-6 h-6" />
            </Button>
            <div className="flex items-center gap-4">
              <Link href="/" target="_blank" className="text-sm text-foreground/60 hover:text-foreground">
                查看前台网站
              </Link>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto">{children}</main>
      </div>

      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  )
}

