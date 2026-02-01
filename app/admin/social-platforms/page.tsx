'use client'

import { useState } from 'react'
import { MessageSquare } from 'lucide-react'
import useSWR from 'swr'
import { DataTable } from '@/components/admin/data-table'
import { FormDialog, FormField } from '@/components/admin/form-dialog'
import { useToast } from '@/hooks/use-toast'
import { fetcher } from '@/lib/fetcher'

interface SocialPlatform {
  id: string
  name: string
  icon: string
  qrCode: string
  description: string
  order: number
  isVisible: boolean
}

export default function SocialPlatformsPage() {
  const { data: platforms, error, isLoading, mutate } = useSWR<SocialPlatform[]>(
    '/api/admin/social-platforms',
    fetcher,
  )
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<SocialPlatform | null>(null)
  const { toast } = useToast()

  const formFields: FormField[] = [
    { name: 'name', label: '平台名称', type: 'text', required: true, placeholder: '微信 / 小红书 / B站 ...' },
    { name: 'icon', label: '图标(名称)', type: 'text', required: true, placeholder: 'MessageCircle / Video / ...' },
    { name: 'qrCode', label: '二维码(URL/路径)', type: 'url', required: true, placeholder: '/uploads/xxx.jpg 或 https://...' },
    { name: 'description', label: '描述', type: 'text', required: true, placeholder: '例如：扫码加入微信群' },
  ]

  const handleSubmit = async (data: Record<string, any>) => {
    try {
      const url = editingItem
        ? `/api/admin/social-platforms/${editingItem.id}`
        : '/api/admin/social-platforms'

      const response = await fetch(url, {
        method: editingItem ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const result = await response.json()
      if (!result.success) throw new Error(result.error)

      toast({ title: editingItem ? '更新成功' : '创建成功' })
      mutate()
    } catch (error: any) {
      toast({ title: '操作失败', description: error.message, variant: 'destructive' })
    }
  }

  const handleDelete = async (item: SocialPlatform) => {
    if (!confirm(`确定要删除「${item.name}」吗？`)) return
    try {
      const response = await fetch(`/api/admin/social-platforms/${item.id}`, { method: 'DELETE' })
      const result = await response.json()
      if (!result.success) throw new Error(result.error)
      toast({ title: '删除成功' })
      mutate()
    } catch (error: any) {
      toast({ title: '删除失败', description: error.message, variant: 'destructive' })
    }
  }

  const handleToggleVisible = async (item: SocialPlatform) => {
    try {
      const response = await fetch(`/api/admin/social-platforms/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: item.name,
          icon: item.icon,
          qrCode: item.qrCode,
          description: item.description,
          isVisible: !item.isVisible,
          order: item.order,
        }),
      })
      const result = await response.json()
      if (!result.success) throw new Error(result.error)
      toast({ title: item.isVisible ? '已隐藏' : '已显示' })
      mutate()
    } catch (error: any) {
      toast({ title: '操作失败', description: error.message, variant: 'destructive' })
    }
  }

  const columns = [
    {
      key: 'qrCode',
      label: '二维码',
      render: (item: SocialPlatform) => (
        <div className="w-10 h-10 rounded-md bg-white/90 p-1 flex items-center justify-center border border-black/5 shadow-sm">
          <img src={item.qrCode} alt={item.name} className="w-full h-full object-cover rounded" />
        </div>
      ),
    },
    { key: 'name', label: '平台', sortable: true },
    { key: 'description', label: '描述' },
    {
      key: 'isVisible',
      label: '状态',
      render: (item: SocialPlatform) => (
        <span className={`px-2 py-1 rounded text-xs ${item.isVisible ? 'bg-green-500/10 text-green-500' : 'bg-gray-500/10 text-gray-500'}`}>
          {item.isVisible ? '显示' : '隐藏'}
        </span>
      ),
    },
  ]

  if (error) return <div className="p-6 text-red-500">加载失败: {error.message}</div>

  return (
    <div className="p-6 space-y-6">
      <div className="glass-card-premium linear-border rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-2">
          <MessageSquare className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold">社交平台 / 联系二维码</h1>
        </div>
        <p className="text-foreground/60">前台联系模块的二维码、文案、显示隐藏都在这里控制</p>
      </div>

      <DataTable
        data={platforms || []}
        columns={columns}
        onAdd={() => { setEditingItem(null); setDialogOpen(true) }}
        onEdit={(item) => { setEditingItem(item); setDialogOpen(true) }}
        onDelete={handleDelete}
        onToggleVisible={handleToggleVisible}
        loading={isLoading}
        searchPlaceholder="搜索平台..."
        addButtonText="添加平台"
      />

      <FormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={editingItem ? '编辑平台' : '添加平台'}
        fields={formFields}
        initialData={editingItem || undefined}
        onSubmit={handleSubmit}
        isEdit={!!editingItem}
      />
    </div>
  )
}

