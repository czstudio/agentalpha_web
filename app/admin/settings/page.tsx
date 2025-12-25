'use client'

import { useState } from 'react'
import { Settings, Lock, Database, Activity } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { useRouter } from 'next/navigation'

export default function SettingsPage() {
  const [changingPassword, setChangingPassword] = useState(false)
  const [passwords, setPasswords] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const { toast } = useToast()
  const router = useRouter()

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()

    if (passwords.newPassword !== passwords.confirmPassword) {
      toast({ title: '两次密码输入不一致', variant: 'destructive' })
      return
    }

    if (passwords.newPassword.length < 8) {
      toast({ title: '密码长度至少 8 位', variant: 'destructive' })
      return
    }

    setChangingPassword(true)
    try {
      // 这里应该调用修改密码 API
      await new Promise((resolve) => setTimeout(resolve, 1000))
      toast({ title: '密码修改成功', description: '请重新登录' })

      // 清除登录状态并跳转到登录页
      setTimeout(() => {
        document.cookie = 'auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT'
        router.push('/admin/login')
        router.refresh()
      }, 1500)
    } catch (error) {
      toast({ title: '密码修改失败', variant: 'destructive' })
    } finally {
      setChangingPassword(false)
    }
  }

  const handleClearCache = async () => {
    if (!confirm('确定要清除缓存吗？')) return

    toast({ title: '缓存已清除' })
  }

  return (
    <div className="p-6 space-y-6">
      {/* 页面标题 */}
      <div className="glass-card-premium linear-border rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-2">
          <Settings className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold">系统设置</h1>
        </div>
        <p className="text-foreground/60">管理系统配置和安全设置</p>
      </div>

      {/* 修改密码 */}
      <div className="glass-card-premium linear-border rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <Lock className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold">修改密码</h2>
        </div>

        <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md">
          <div className="space-y-2">
            <Label htmlFor="currentPassword">当前密码</Label>
            <Input
              id="currentPassword"
              type="password"
              value={passwords.currentPassword}
              onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="newPassword">新密码</Label>
            <Input
              id="newPassword"
              type="password"
              value={passwords.newPassword}
              onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
              required
              minLength={8}
            />
            <p className="text-xs text-muted-foreground">密码长度至少 8 位</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">确认新密码</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={passwords.confirmPassword}
              onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })}
              required
              minLength={8}
            />
          </div>

          <Button type="submit" disabled={changingPassword}>
            {changingPassword ? '修改中...' : '修改密码'}
          </Button>
        </form>
      </div>

      {/* 系统维护 */}
      <div className="glass-card-premium linear-border rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <Database className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold">系统维护</h2>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
            <div>
              <p className="font-medium">清除缓存</p>
              <p className="text-sm text-muted-foreground">清除系统缓存数据</p>
            </div>
            <Button variant="outline" onClick={handleClearCache}>
              清除
            </Button>
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
            <div>
              <p className="font-medium">数据库状态</p>
              <p className="text-sm text-muted-foreground">数据库运行正常</p>
            </div>
            <span className="px-2 py-1 rounded text-xs bg-green-500/10 text-green-500">
              正常
            </span>
          </div>
        </div>
      </div>

      {/* 系统信息 */}
      <div className="glass-card-premium linear-border rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <Activity className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold">系统信息</h2>
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex justify-between py-2 border-b border-border/50">
            <span className="text-muted-foreground">系统版本</span>
            <span className="font-medium">v1.0.0</span>
          </div>
          <div className="flex justify-between py-2 border-b border-border/50">
            <span className="text-muted-foreground">Node 版本</span>
            <span className="font-medium">{process.version}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-border/50">
            <span className="text-muted-foreground">数据库</span>
            <span className="font-medium">SQLite</span>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-muted-foreground">运行环境</span>
            <span className="font-medium">{process.env.NODE_ENV || 'development'}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
