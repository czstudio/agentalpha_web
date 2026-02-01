'use client'

import { useState } from 'react'
import { Newspaper } from 'lucide-react'
import useSWR from 'swr'
import { DataTable } from '@/components/admin/data-table'
import { FormDialog, FormField } from '@/components/admin/form-dialog'
import { useToast } from '@/hooks/use-toast'
import { fetcher } from '@/lib/fetcher'

interface NewsItem {
  id: string
  title: string
  date: string
  category: string
  link: string | null
  order: number
  isVisible: boolean
  createdAt: string
  updatedAt: string
}

const categoryOptions = [
  { label: '技术分享', value: '技术分享' },
  { label: '社区活动', value: '社区活动' },
  { label: '成员动态', value: '成员动态' },
  { label: '合作公告', value: '合作公告' },
]

export default function NewsPage() {
  const { data: news, error, isLoading, mutate } = useSWR<NewsItem[]>('/api/admin/news', fetcher)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<NewsItem | null>(null)
  const { toast } = useToast()

  const formFields: FormField[] = [
    { name: 'title', label: '标题', type: 'text', required: true },
    { name: 'date', label: '日期', type: 'text', required: true, placeholder: '2025-01-15' },
    { name: 'category', label: '分类', type: 'select', required: true, options: categoryOptions },
    { name: 'link', label: '链接 (URL/路径)', type: 'url', required: false, placeholder: 'https://... 或 /...' },
  ]

  const openCreate = () => {
    setEditingItem(null)
    setDialogOpen(true)
  }

  const openEdit = (item: NewsItem) => {
    setEditingItem(item)
    setDialogOpen(true)
  }

  const handleSubmit = async (data: Record<string, any>) => {
    try {
      const url = editingItem ? `/api/admin/news/${editingItem.id}` : '/api/admin/news'
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

  const handleDelete = async (item: NewsItem) => {
    if (!confirm(`确定要删除「${item.title}」吗？`)) return
    try {
      const response = await fetch(`/api/admin/news/${item.id}`, { method: 'DELETE' })
      const result = await response.json()
      if (!result.success) throw new Error(result.error)
      toast({ title: '删除成功' })
      mutate()
    } catch (error: any) {
      toast({ title: '删除失败', description: error.message, variant: 'destructive' })
    }
  }

  const handleToggleVisible = async (item: NewsItem) => {
    try {
      const response = await fetch(`/api/admin/news/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: item.title,
          date: item.date,
          category: item.category,
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
    { key: 'category', label: '分类', sortable: true },
    { key: 'date', label: '日期', sortable: true },
    {
      key: 'isVisible',
      label: '状态',
      render: (item: NewsItem) => (
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
          <Newspaper className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold">新闻动态管理</h1>
        </div>
        <p className="text-foreground/60">管理社区动态（前台展示用）</p>
      </div>

      <DataTable
        data={news || []}
        columns={columns}
        onAdd={openCreate}
        onEdit={openEdit}
        onDelete={handleDelete}
        onToggleVisible={handleToggleVisible}
        loading={isLoading}
        searchPlaceholder="搜索动态..."
        addButtonText="发布动态"
      />

      <FormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={editingItem ? '编辑动态' : '发布动态'}
        fields={formFields}
        initialData={
          editingItem
            ? {
                title: editingItem.title,
                date: editingItem.date,
                category: editingItem.category,
                link: editingItem.link || '',
              }
            : {
                title: '',
                date: new Date().toISOString().slice(0, 10),
                category: categoryOptions[0].value,
                link: '',
              }
        }
        onSubmit={handleSubmit}
        isEdit={!!editingItem}
      />
    </div>
  )
}

