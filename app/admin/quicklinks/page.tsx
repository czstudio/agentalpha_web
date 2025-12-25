'use client'

import { useState, useEffect } from 'react'
import { Link as LinkIcon, Plus, Pencil, Trash2, Eye, EyeOff, GripVertical } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/hooks/use-toast'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface QuickLink {
  id: string
  title: string
  description: string
  href: string
  order: number
  isVisible: boolean
  createdAt: string
  updatedAt: string
}

export default function QuickLinksPage() {
  const [quickLinks, setQuickLinks] = useState<QuickLink[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<QuickLink | null>(null)
  const { toast } = useToast()

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    href: '',
    order: 0,
    isVisible: true,
  })

  useEffect(() => {
    fetchQuickLinks()
  }, [])

  const fetchQuickLinks = async () => {
    try {
      const res = await fetch('/api/admin/quicklinks')
      const result = await res.json()
      if (result.success) {
        setQuickLinks(result.data)
      }
    } catch (error) {
      toast({ title: '获取数据失败', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const handleOpenDialog = (item?: QuickLink) => {
    if (item) {
      setEditingItem(item)
      setFormData({
        title: item.title,
        description: item.description,
        href: item.href,
        order: item.order,
        isVisible: item.isVisible,
      })
    } else {
      setEditingItem(null)
      setFormData({
        title: '',
        description: '',
        href: '',
        order: quickLinks.length,
        isVisible: true,
      })
    }
    setDialogOpen(true)
  }

  const handleSave = async () => {
    try {
      const url = editingItem
        ? '/api/admin/quicklinks'
        : '/api/admin/quicklinks'

      const body = editingItem
        ? { id: editingItem.id, ...formData }
        : formData

      const res = await fetch(url, {
        method: editingItem ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const result = await res.json()

      if (result.success) {
        toast({ title: editingItem ? '更新成功' : '创建成功' })
        setDialogOpen(false)
        fetchQuickLinks()
      } else {
        toast({ title: '保存失败', variant: 'destructive' })
      }
    } catch (error) {
      toast({ title: '操作失败', variant: 'destructive' })
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这个快速链接吗？')) return

    try {
      const res = await fetch(`/api/admin/quicklinks?id=${id}`, {
        method: 'DELETE',
      })

      const result = await res.json()

      if (result.success) {
        toast({ title: '删除成功' })
        fetchQuickLinks()
      } else {
        toast({ title: '删除失败', variant: 'destructive' })
      }
    } catch (error) {
      toast({ title: '删除失败', variant: 'destructive' })
    }
  }

  const toggleVisibility = async (item: QuickLink) => {
    try {
      const res = await fetch('/api/admin/quicklinks', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...item,
          isVisible: !item.isVisible,
        }),
      })

      const result = await res.json()

      if (result.success) {
        toast({ title: '更新成功' })
        fetchQuickLinks()
      }
    } catch (error) {
      toast({ title: '操作失败', variant: 'destructive' })
    }
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="text-lg text-foreground/60">加载中...</div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* 页面标题 */}
      <div className="glass-card-premium linear-border rounded-2xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <LinkIcon className="w-6 h-6 text-primary" />
              <h1 className="text-2xl font-bold">快速链接管理</h1>
            </div>
            <p className="text-foreground/60">管理"新人必逛 / 目录速览"区域的快速链接</p>
          </div>
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="w-4 h-4 mr-2" />
            新建链接
          </Button>
        </div>
      </div>

      {/* 链接列表 */}
      <div className="glass-card-premium linear-border rounded-2xl p-6">
        <div className="space-y-3">
          {quickLinks.length === 0 ? (
            <div className="text-center py-12 text-foreground/60">
              <LinkIcon className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <p>暂无快速链接</p>
              <p className="text-sm mt-2">点击"新建链接"按钮添加第一个链接</p>
            </div>
          ) : (
            quickLinks.map((item) => (
              <div
                key={item.id}
                className="glass-card rounded-xl p-4 flex items-start gap-4 hover:shadow-lg transition-all"
              >
                <div className="flex items-center gap-2 text-foreground/40">
                  <GripVertical className="w-4 h-4 cursor-move" />
                  <span className="text-sm font-mono">{item.order}</span>
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold">{item.title}</h3>
                    {!item.isVisible && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                        已隐藏
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-foreground/70">{item.description}</p>
                  <a
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                  >
                    <LinkIcon className="w-3 h-3" />
                    {item.href}
                  </a>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => toggleVisibility(item)}
                    title={item.isVisible ? '隐藏' : '显示'}
                  >
                    {item.isVisible ? (
                      <Eye className="w-4 h-4" />
                    ) : (
                      <EyeOff className="w-4 h-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleOpenDialog(item)}
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(item.id)}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 编辑对话框 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{editingItem ? '编辑快速链接' : '新建快速链接'}</DialogTitle>
            <DialogDescription>
              填写快速链接的标题、描述和链接地址
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">标题</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="例如：新人必逛"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">描述</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="例如：入门路径 · 开源仓库 · 入门课 · 项目实操"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="href">链接地址</Label>
              <Input
                id="href"
                value={formData.href}
                onChange={(e) => setFormData({ ...formData, href: e.target.value })}
                placeholder="例如：#onboard 或 https://example.com"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="order">排序</Label>
                <Input
                  id="order"
                  type="number"
                  value={formData.order}
                  onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="isVisible">显示状态</Label>
                <div className="flex items-center gap-2 h-10">
                  <Switch
                    id="isVisible"
                    checked={formData.isVisible}
                    onCheckedChange={(checked) => setFormData({ ...formData, isVisible: checked })}
                  />
                  <span className="text-sm text-muted-foreground">
                    {formData.isVisible ? '显示' : '隐藏'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSave}>
              {editingItem ? '保存更改' : '创建链接'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
