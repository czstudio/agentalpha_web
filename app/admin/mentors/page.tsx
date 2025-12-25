'use client'

import { useMemo, useState } from 'react'
import { Briefcase } from 'lucide-react'
import useSWR from 'swr'
import { DataTable } from '@/components/admin/data-table'
import { FormDialog, FormField } from '@/components/admin/form-dialog'
import { useToast } from '@/hooks/use-toast'
import { fetcher } from '@/lib/fetcher'

interface Mentor {
  id: string
  name: string
  title: string
  company: string
  expertise: string // JSON array string
  skills: string // JSON object string
  avatar: string
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

export default function MentorsPage() {
  const { data: mentors, error, isLoading, mutate } = useSWR<Mentor[]>('/api/admin/mentors', fetcher)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<Mentor | null>(null)
  const [dialogInitialData, setDialogInitialData] = useState<Record<string, any> | undefined>(undefined)
  const { toast } = useToast()

  const formFields: FormField[] = useMemo(
    () => [
      { name: 'name', label: '姓名', type: 'text', required: true },
      { name: 'title', label: '头衔', type: 'text', required: true, placeholder: 'Ex-ByteDance · Agent 专家' },
      { name: 'company', label: '单位/公司', type: 'text', required: true, placeholder: 'ByteDance / MIT / 985…' },
      { name: 'avatar', label: '头像 (URL/路径)', type: 'url', required: true, placeholder: '/professional-tech-mentor-avatar.jpg 或 https://...' },
      { name: 'expertise', label: '专长标签', type: 'text', required: false, placeholder: '用逗号分隔：10+ Agent论文, RL专家, 工程实践' },
      { name: 'engineering', label: '工程能力 (0-100)', type: 'number', required: true },
      { name: 'theory', label: '理论能力 (0-100)', type: 'number', required: true },
      { name: 'nlp', label: 'NLP (0-100)', type: 'number', required: true },
      { name: 'rl', label: 'RL (0-100)', type: 'number', required: true },
      { name: 'multimodal', label: '多模态 (0-100)', type: 'number', required: true },
    ],
    [],
  )

  const openCreate = () => {
    setEditingItem(null)
    setDialogInitialData({
      name: '',
      title: '',
      company: '',
      avatar: '',
      expertise: '',
      engineering: 80,
      theory: 80,
      nlp: 80,
      rl: 80,
      multimodal: 80,
    })
    setDialogOpen(true)
  }

  const openEdit = (item: Mentor) => {
    const expertise = safeJsonParse<string[]>(item.expertise, []).join(', ')
    const skills = safeJsonParse<Record<string, number>>(item.skills, {
      engineering: 80,
      theory: 80,
      nlp: 80,
      rl: 80,
      multimodal: 80,
    })

    setEditingItem(item)
    setDialogInitialData({
      name: item.name,
      title: item.title,
      company: item.company,
      avatar: item.avatar,
      expertise,
      engineering: skills.engineering ?? 80,
      theory: skills.theory ?? 80,
      nlp: skills.nlp ?? 80,
      rl: skills.rl ?? 80,
      multimodal: skills.multimodal ?? 80,
    })
    setDialogOpen(true)
  }

  const handleSubmit = async (data: Record<string, any>) => {
    try {
      const url = editingItem ? `/api/admin/mentors/${editingItem.id}` : '/api/admin/mentors'
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

  const handleDelete = async (item: Mentor) => {
    if (!confirm(`确定要删除导师「${item.name}」吗？`)) return
    try {
      const response = await fetch(`/api/admin/mentors/${item.id}`, { method: 'DELETE' })
      const result = await response.json()
      if (!result.success) throw new Error(result.error)
      toast({ title: '删除成功' })
      mutate()
    } catch (error: any) {
      toast({ title: '删除失败', description: error.message, variant: 'destructive' })
    }
  }

  const handleToggleVisible = async (item: Mentor) => {
    try {
      const expertise = safeJsonParse<string[]>(item.expertise, []).join(', ')
      const skills = safeJsonParse<Record<string, number>>(item.skills, {
        engineering: 80,
        theory: 80,
        nlp: 80,
        rl: 80,
        multimodal: 80,
      })

      const response = await fetch(`/api/admin/mentors/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: item.name,
          title: item.title,
          company: item.company,
          avatar: item.avatar,
          expertise,
          engineering: skills.engineering ?? 80,
          theory: skills.theory ?? 80,
          nlp: skills.nlp ?? 80,
          rl: skills.rl ?? 80,
          multimodal: skills.multimodal ?? 80,
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
      key: 'avatar',
      label: '头像',
      render: (item: Mentor) => (
        <div className="w-10 h-10 rounded-full overflow-hidden bg-muted border border-border/50">
          <img src={item.avatar} alt={item.name} className="w-full h-full object-cover" />
        </div>
      ),
    },
    { key: 'name', label: '姓名', sortable: true },
    { key: 'title', label: '头衔' },
    { key: 'company', label: '单位/公司', sortable: true },
    {
      key: 'isVisible',
      label: '状态',
      render: (item: Mentor) => (
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
          <Briefcase className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold">导师管理</h1>
        </div>
        <p className="text-foreground/60">编辑前台「导师/专家」模块展示内容</p>
      </div>

      <DataTable
        data={mentors || []}
        columns={columns}
        onAdd={openCreate}
        onEdit={openEdit}
        onDelete={handleDelete}
        onToggleVisible={handleToggleVisible}
        loading={isLoading}
        searchPlaceholder="搜索导师..."
        addButtonText="添加导师"
      />

      <FormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={editingItem ? '编辑导师' : '添加导师'}
        fields={formFields}
        initialData={dialogInitialData}
        onSubmit={handleSubmit}
        isEdit={!!editingItem}
      />
    </div>
  )
}

