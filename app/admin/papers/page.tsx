'use client'

import { useState, useEffect } from 'react'
import { FileText } from 'lucide-react'
import { DataTable } from '@/components/admin/data-table'
import { FormDialog, FormField } from '@/components/admin/form-dialog'
import { useToast } from '@/hooks/use-toast'

interface Paper {
  id: string
  title: string
  authors: string
  category: string
  venue: string
  conference?: string
  year: number
  tags?: string
  link?: string
  isVisible: boolean
  order: number
}

export default function PapersPage() {
  const [papers, setPapers] = useState<Paper[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<Paper | null>(null)
  const { toast } = useToast()

  const formFields: FormField[] = [
    { name: 'title', label: '论文标题', type: 'text', required: true },
    { name: 'authors', label: '作者', type: 'text', required: true, placeholder: '多个作者用逗号分隔' },
    {
      name: 'category',
      label: '分类',
      type: 'select',
      required: true,
      options: [
        { label: 'Agent', value: 'Agent' },
        { label: 'RL', value: 'RL' },
        { label: 'Multimodal', value: 'Multimodal' },
        { label: 'Diffusion', value: 'Diffusion' },
        { label: 'LLM', value: 'LLM' },
      ]
    },
    { name: 'venue', label: '期刊/会议', type: 'text', required: true, placeholder: 'NeurIPS / ICML / CVPR' },
    { name: 'conference', label: '会议简称（显示用）', type: 'text', placeholder: 'NeurIPS 2024' },
    { name: 'year', label: '年份', type: 'number', required: true, placeholder: '2024' },
    { name: 'tags', label: '标签', type: 'text', placeholder: '多个标签用逗号分隔，如：多模态,代理,强化学习' },
    { name: 'link', label: '论文链接', type: 'url', placeholder: 'https://arxiv.org/... 或 PDF 链接' },
  ]

  const fetchData = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/papers')
      const result = await response.json()
      if (result.success) setPapers(result.data)
    } catch (error) {
      toast({ title: '获取失败', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  const handleSubmit = async (data: Record<string, any>) => {
    const payload = { ...data, year: parseInt(data.year) }
    const url = editingItem ? `/api/admin/papers/${editingItem.id}` : '/api/admin/papers'
    const response = await fetch(url, {
      method: editingItem ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const result = await response.json()
    if (!result.success) throw new Error(result.error)
    toast({ title: editingItem ? '更新成功' : '创建成功' })
    fetchData()
  }

  const handleDelete = async (item: Paper) => {
    if (!confirm(`确定要删除论文"${item.title}"吗？`)) return
    const response = await fetch(`/api/admin/papers/${item.id}`, { method: 'DELETE' })
    const result = await response.json()
    if (result.success) {
      toast({ title: '删除成功' })
      fetchData()
    }
  }

  const handleToggleVisible = async (item: Paper) => {
    const response = await fetch(`/api/admin/papers/${item.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...item, isVisible: !item.isVisible }),
    })
    const result = await response.json()
    if (result.success) {
      toast({ title: item.isVisible ? '已隐藏' : '已显示' })
      fetchData()
    }
  }

  const columns = [
    { key: 'title', label: '标题', sortable: true },
    { key: 'category', label: '分类', sortable: true },
    { key: 'conference', label: '会议', sortable: true, render: (item: Paper) => item.conference || item.venue },
    { key: 'year', label: '年份', sortable: true },
    { key: 'tags', label: '标签', render: (item: Paper) => item.tags ? item.tags.split(',').slice(0, 2).join(', ') : '-' },
    {
      key: 'isVisible',
      label: '状态',
      render: (item: Paper) => (
        <span className={`px-2 py-1 rounded text-xs ${item.isVisible ? 'bg-green-500/10 text-green-500' : 'bg-gray-500/10 text-gray-500'}`}>
          {item.isVisible ? '显示' : '隐藏'}
        </span>
      ),
    },
  ]

  return (
    <div className="p-6 space-y-6">
      <div className="glass-card-premium linear-border rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-2">
          <FileText className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold">论文管理</h1>
        </div>
        <p className="text-foreground/60">管理社区论文信息</p>
      </div>

      <DataTable
        data={papers}
        columns={columns}
        onAdd={() => { setEditingItem(null); setDialogOpen(true) }}
        onEdit={(item) => { setEditingItem(item); setDialogOpen(true) }}
        onDelete={handleDelete}
        onToggleVisible={handleToggleVisible}
        loading={loading}
        searchPlaceholder="搜索论文..."
        addButtonText="添加论文"
      />

      <FormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={editingItem ? '编辑论文' : '添加论文'}
        fields={formFields}
        initialData={editingItem || undefined}
        onSubmit={handleSubmit}
      />
    </div>
  )
}
