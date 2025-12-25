'use client'

import { useState } from 'react'
import { BookOpen } from 'lucide-react'
import useSWR from 'swr'
import { DataTable } from '@/components/admin/data-table'
import { FormDialog, FormField } from '@/components/admin/form-dialog'
import { useToast } from '@/hooks/use-toast'
import { fetcher } from '@/lib/fetcher'

interface Project {
  id: string
  title: string
  description: string
  difficulty: number
  tags: string // JSON array string
  link: string | null
  isVisible: boolean
  order: number
}

function safeJsonParse<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

function tagsForInput(tags: string) {
  const parsed = safeJsonParse<string[]>(tags, [])
  if (Array.isArray(parsed) && parsed.length > 0) return parsed.join(', ')
  return tags
}

function tagsPreview(tags: string) {
  const parsed = safeJsonParse<string[]>(tags, [])
  if (Array.isArray(parsed) && parsed.length > 0) return parsed.slice(0, 3).join(', ')
  return tags ? String(tags).slice(0, 32) : '-'
}

export default function ProjectsPage() {
  const { data: projects, error, isLoading, mutate } = useSWR<Project[]>('/api/admin/projects', fetcher)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<Project | null>(null)
  const { toast } = useToast()

  const formFields: FormField[] = [
    { name: 'title', label: '项目标题', type: 'text', required: true, placeholder: '项目名称' },
    { name: 'description', label: '项目描述', type: 'textarea', required: true, rows: 4 },
    { name: 'difficulty', label: '难度 (1-5)', type: 'number', required: true, placeholder: '3' },
    { name: 'tags', label: '标签', type: 'text', required: false, placeholder: '多个标签用逗号分隔' },
    { name: 'link', label: '链接 (URL/路径)', type: 'url', required: false, placeholder: 'https://... 或 /...' },
  ]

  const openCreate = () => {
    setEditingItem(null)
    setDialogOpen(true)
  }

  const openEdit = (item: Project) => {
    setEditingItem(item)
    setDialogOpen(true)
  }

  const handleSubmit = async (data: Record<string, any>) => {
    try {
      const url = editingItem ? `/api/admin/projects/${editingItem.id}` : '/api/admin/projects'
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

  const handleDelete = async (item: Project) => {
    if (!confirm(`确定要删除项目「${item.title}」吗？`)) return
    try {
      const response = await fetch(`/api/admin/projects/${item.id}`, { method: 'DELETE' })
      const result = await response.json()
      if (!result.success) throw new Error(result.error)
      toast({ title: '删除成功' })
      mutate()
    } catch (error: any) {
      toast({ title: '删除失败', description: error.message, variant: 'destructive' })
    }
  }

  const handleToggleVisible = async (item: Project) => {
    try {
      const response = await fetch(`/api/admin/projects/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: item.title,
          description: item.description,
          difficulty: item.difficulty,
          tags: tagsForInput(item.tags),
          link: item.link || '',
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
    { key: 'title', label: '标题', sortable: true },
    { key: 'difficulty', label: '难度', sortable: true },
    {
      key: 'tags',
      label: '标签',
      render: (item: Project) => tagsPreview(item.tags),
    },
    {
      key: 'isVisible',
      label: '状态',
      render: (item: Project) => (
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
          <BookOpen className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold">项目管理</h1>
        </div>
        <p className="text-foreground/60">编辑前台「项目」模块展示内容</p>
      </div>

      <DataTable
        data={projects || []}
        columns={columns}
        onAdd={openCreate}
        onEdit={openEdit}
        onDelete={handleDelete}
        onToggleVisible={handleToggleVisible}
        loading={isLoading}
        searchPlaceholder="搜索项目..."
        addButtonText="添加项目"
      />

      <FormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={editingItem ? '编辑项目' : '添加项目'}
        fields={formFields}
        initialData={
          editingItem
            ? {
                title: editingItem.title,
                description: editingItem.description,
                difficulty: editingItem.difficulty,
                tags: tagsForInput(editingItem.tags),
                link: editingItem.link || '',
              }
            : {
                title: '',
                description: '',
                difficulty: 3,
                tags: '',
                link: '',
              }
        }
        onSubmit={handleSubmit}
        isEdit={!!editingItem}
      />
    </div>
  )
}

