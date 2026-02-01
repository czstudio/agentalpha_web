'use client'

import { useState, useEffect } from 'react'
import { BookOpen, Plus, Pencil, Trash2, Eye, EyeOff, GripVertical } from 'lucide-react'
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface Resource {
  id: string
  title: string
  description: string
  icon: string
  link?: string
  order: number
  isVisible: boolean
}

const iconOptions = [
  { value: 'Compass', label: '指南针' },
  { value: 'ShieldCheck', label: '盾牌' },
  { value: 'FileText', label: '文件' },
  { value: 'BookOpen', label: '书本' },
  { value: 'Map', label: '地图' },
  { value: 'Lightbulb', label: '灯泡' },
  { value: 'Rocket', label: '火箭' },
  { value: 'Target', label: '目标' },
]

export default function ResourcesPage() {
  const [resources, setResources] = useState<Resource[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<Resource | null>(null)
  const { toast } = useToast()

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    icon: 'Compass',
    link: '',
    order: 0,
    isVisible: true,
  })

  useEffect(() => {
    fetchResources()
  }, [])

  const fetchResources = async () => {
    try {
      const res = await fetch('/api/admin/resources')
      const result = await res.json()
      if (result.success) {
        setResources(result.data)
      }
    } catch (error) {
      toast({ title: '获取数据失败', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const handleOpenDialog = (item?: Resource) => {
    if (item) {
      setEditingItem(item)
      setFormData({
        title: item.title,
        description: item.description,
        icon: item.icon,
        link: item.link || '',
        order: item.order,
        isVisible: item.isVisible,
      })
    } else {
      setEditingItem(null)
      setFormData({
        title: '',
        description: '',
        icon: 'Compass',
        link: '',
        order: resources.length,
        isVisible: true,
      })
    }
    setDialogOpen(true)
  }

  const handleSave = async () => {
    try {
      const url = '/api/admin/resources'
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
        fetchResources()
      } else {
        toast({ title: '保存失败', variant: 'destructive' })
      }
    } catch (error) {
      toast({ title: '操作失败', variant: 'destructive' })
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这个资源吗？')) return

    try {
      const res = await fetch(`/api/admin/resources?id=${id}`, {
        method: 'DELETE',
      })

      const result = await res.json()

      if (result.success) {
        toast({ title: '删除成功' })
        fetchResources()
      } else {
        toast({ title: '删除失败', variant: 'destructive' })
      }
    } catch (error) {
      toast({ title: '删除失败', variant: 'destructive' })
    }
  }

  const toggleVisibility = async (item: Resource) => {
    try {
      const res = await fetch('/api/admin/resources', {
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
        fetchResources()
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
              <BookOpen className="w-6 h-6 text-primary" />
              <h1 className="text-2xl font-bold">资源合集管理</h1>
            </div>
            <p className="text-foreground/60">管理"资源合集"区域显示的资源卡片</p>
          </div>
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="w-4 h-4 mr-2" />
            新建资源
          </Button>
        </div>
      </div>

      {/* 资源列表 */}
      <div className="glass-card-premium linear-border rounded-2xl p-6">
        <div className="space-y-3">
          {resources.length === 0 ? (
            <div className="text-center py-12 text-foreground/60">
              <BookOpen className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <p>暂无资源</p>
              <p className="text-sm mt-2">点击"新建资源"按钮添加第一个资源</p>
            </div>
          ) : (
            resources.map((item) => (
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
                  <div className="flex items-center gap-2 text-xs text-foreground/50">
                    <span>图标: {item.icon}</span>
                    {item.link && (
                      <a href={item.link} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                        {item.link}
                      </a>
                    )}
                  </div>
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
            <DialogTitle>{editingItem ? '编辑资源' : '新建资源'}</DialogTitle>
            <DialogDescription>
              填写资源标题、描述和图标
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">标题</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="例如：学习地图"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">描述</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="例如：从 Python、LLM 原理，到多模态与 Agent 评测的分层学习路径"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="icon">图标</Label>
              <Select value={formData.icon} onValueChange={(value) => setFormData({ ...formData, icon: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="选择图标" />
                </SelectTrigger>
                <SelectContent>
                  {iconOptions.map((icon) => (
                    <SelectItem key={icon.value} value={icon.value}>
                      {icon.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="link">链接地址（可选）</Label>
              <Input
                id="link"
                value={formData.link}
                onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                placeholder="https://example.com 或 #section"
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
              {editingItem ? '保存更改' : '创建资源'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
