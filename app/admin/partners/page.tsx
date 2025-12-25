'use client'

import { useState } from 'react'
import { Handshake } from 'lucide-react'
import useSWR from 'swr'
import { DataTable } from '@/components/admin/data-table'
import { FormDialog, FormField } from '@/components/admin/form-dialog'
import { useToast } from '@/hooks/use-toast'
import { fetcher } from '@/lib/fetcher'

interface Partner {
  id: string
  name: string
  type: 'university' | 'community'
  logo: string
  url?: string | null
  description?: string
  isVisible: boolean
  order: number
}

export default function PartnersPage() {
  const { data: partners, error, isLoading, mutate } = useSWR<Partner[]>('/api/admin/partners', fetcher)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<Partner | null>(null)
  const { toast } = useToast()

  const formFields: FormField[] = [
    { name: 'name', label: '名称', type: 'text', required: true },
    {
      name: 'type',
      label: '类型',
      type: 'select',
      required: true,
      options: [
        { value: 'university', label: '合作院校' },
        { value: 'community', label: '兄弟社区' },
      ]
    },
    { name: 'logo', label: 'Logo (URL/路径)', type: 'urlOrPath', required: true, placeholder: '/logos/pku.svg 或 https://...' },
    { name: 'url', label: '网站', type: 'url', required: false, placeholder: 'https://...' },
    { name: 'description', label: '描述', type: 'textarea', rows: 2 },
  ]

  const handleSubmit = async (data: Record<string, any>) => {
    try {
      const url = editingItem ? `/api/admin/partners/${editingItem.id}` : '/api/admin/partners'
      const response = await fetch(url, {
        method: editingItem ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const result = await response.json()
      if (!result.success) throw new Error(result.error)
      
      toast({ title: editingItem ? '更新成功' : '创建成功' })
      mutate() // Revalidate data
    } catch (error: any) {
      toast({ title: '操作失败', description: error.message, variant: 'destructive' })
    }
  }

  const handleDelete = async (item: Partner) => {
    if (!confirm(`确定要删除合作伙伴"${item.name}"吗？`)) return
    try {
      const response = await fetch(`/api/admin/partners/${item.id}`, { method: 'DELETE' })
      const result = await response.json()
      if (result.success) {
        toast({ title: '删除成功' })
        mutate() // Revalidate data
      } else {
        throw new Error(result.error)
      }
    } catch (error: any) {
      toast({ title: '删除失败', description: error.message, variant: 'destructive' })
    }
  }

  const handleToggleVisible = async (item: Partner) => {
    try {
      const response = await fetch(`/api/admin/partners/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...item, url: item.url ?? '', isVisible: !item.isVisible }),
      })
      const result = await response.json()
      if (result.success) {
        toast({ title: item.isVisible ? '已隐藏' : '已显示' })
        mutate() // Revalidate data
      } else {
        throw new Error(result.error)
      }
    } catch (error: any) {
      toast({ title: '操作失败', description: error.message, variant: 'destructive' })
    }
  }

  const columns = [
    {
      key: 'logo',
      label: 'Logo',
      render: (item: Partner) => (
        <div className="w-10 h-10 rounded-md bg-white/90 p-1 flex items-center justify-center border border-black/5 shadow-sm">
          <img src={item.logo} alt={item.name} className="w-full h-full object-contain" />
        </div>
      ),
    },
    { key: 'name', label: '名称', sortable: true },
    {
      key: 'type',
      label: '类型',
      render: (item: Partner) => (
        <span className={`px-2 py-1 rounded text-xs ${item.type === 'university' ? 'bg-blue-500/10 text-blue-500' : 'bg-purple-500/10 text-purple-500'}`}>
          {item.type === 'university' ? '院校' : '社区'}
        </span>
      ),
      sortable: true,
    },
    {
      key: 'isVisible',
      label: '状态',
      render: (item: Partner) => (
        <span className={`px-2 py-1 rounded text-xs ${item.isVisible ? 'bg-green-500/10 text-green-500' : 'bg-gray-500/10 text-gray-500'}`}>
          {item.isVisible ? '显示' : '隐藏'}
        </span>
      ),
    },
  ]

  if (error) {
     return <div className="p-6 text-red-500">加载失败: {error.message}</div>
  }

  return (
    <div className="p-6 space-y-6">
      <div className="glass-card-premium linear-border rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-2">
          <Handshake className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold">合作伙伴管理</h1>
        </div>
        <p className="text-foreground/60">管理合作院校和兄弟社区</p>
      </div>

      <DataTable
        data={partners || []}
        columns={columns}
        onAdd={() => { setEditingItem(null); setDialogOpen(true) }}
        onEdit={(item) => { setEditingItem(item); setDialogOpen(true) }}
        onDelete={handleDelete}
        onToggleVisible={handleToggleVisible}
        loading={isLoading}
        searchPlaceholder="搜索合作伙伴..."
        addButtonText="添加合作伙伴"
      />

      <FormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={editingItem ? '编辑合作伙伴' : '添加合作伙伴'}
        fields={formFields}
        initialData={editingItem ? { ...editingItem, url: editingItem.url ?? '' } : undefined}
        onSubmit={handleSubmit}
      />
    </div>
  )
}
