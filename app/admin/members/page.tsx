'use client'

import { useState } from 'react'
import { Users } from 'lucide-react'
import useSWR from 'swr'
import { DataTable } from '@/components/admin/data-table'
import { FormDialog, FormField } from '@/components/admin/form-dialog'
import { useToast } from '@/hooks/use-toast'
import { fetcher } from '@/lib/fetcher'

interface Member {
  id: string
  name: string
  role: string
  background: string
  avatar: string | null
  isVisible: boolean
  order: number
}

export default function MembersPage() {
  const { data: members, error, isLoading, mutate } = useSWR<Member[]>('/api/admin/members', fetcher)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<Member | null>(null)
  const { toast } = useToast()

  const formFields: FormField[] = [
    { name: 'name', label: '姓名', type: 'text', required: true, placeholder: '张三' },
    { name: 'role', label: '角色/职位', type: 'text', required: true, placeholder: '社区创始人 / 技术负责人' },
    { name: 'background', label: '背景简介', type: 'textarea', rows: 4, placeholder: '一句话/一段话介绍成员背景…' },
    { name: 'avatar', label: '头像 (URL/路径)', type: 'url', required: false, placeholder: '/avatars/member1.jpg 或 https://...' },
  ]

  const handleSubmit = async (data: Record<string, any>) => {
    try {
      const url = editingItem ? `/api/admin/members/${editingItem.id}` : '/api/admin/members'
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

  const handleDelete = async (item: Member) => {
    if (!confirm(`确定要删除成员「${item.name}」吗？`)) return
    try {
      const response = await fetch(`/api/admin/members/${item.id}`, { method: 'DELETE' })
      const result = await response.json()
      if (!result.success) throw new Error(result.error)
      toast({ title: '删除成功' })
      mutate()
    } catch (error: any) {
      toast({ title: '删除失败', description: error.message, variant: 'destructive' })
    }
  }

  const handleToggleVisible = async (item: Member) => {
    try {
      const response = await fetch(`/api/admin/members/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...item, avatar: item.avatar ?? '', isVisible: !item.isVisible }),
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
      key: 'avatar',
      label: '头像',
      render: (item: Member) => (
        <div className="w-10 h-10 rounded-full overflow-hidden bg-muted flex items-center justify-center border border-border/50">
          {item.avatar ? (
            <img src={item.avatar} alt={item.name} className="w-full h-full object-cover" />
          ) : (
            <span className="text-xs text-foreground/60">{item.name.slice(0, 1)}</span>
          )}
        </div>
      ),
    },
    { key: 'name', label: '姓名', sortable: true },
    { key: 'role', label: '角色/职位', sortable: true },
    {
      key: 'isVisible',
      label: '状态',
      render: (item: Member) => (
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
          <Users className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold">社区成员管理</h1>
        </div>
        <p className="text-foreground/60">编辑前台「社区成员」模块展示内容</p>
      </div>

      <DataTable
        data={members || []}
        columns={columns}
        onAdd={() => { setEditingItem(null); setDialogOpen(true) }}
        onEdit={(item) => { setEditingItem(item); setDialogOpen(true) }}
        onDelete={handleDelete}
        onToggleVisible={handleToggleVisible}
        loading={isLoading}
        searchPlaceholder="搜索成员..."
        addButtonText="添加成员"
      />

      <FormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={editingItem ? '编辑成员' : '添加成员'}
        fields={formFields}
        initialData={editingItem ? { ...editingItem, avatar: editingItem.avatar ?? '' } : undefined}
        onSubmit={handleSubmit}
        isEdit={!!editingItem}
      />
    </div>
  )
}
