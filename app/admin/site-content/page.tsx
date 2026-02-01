'use client'

import { useState } from 'react'
import { FileText, Save, RefreshCw, ChevronDown, ChevronRight, Plus, Trash2 } from 'lucide-react'
import useSWR from 'swr'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { fetcher } from '@/lib/fetcher'
import { FormDialog, FormField } from '@/components/admin/form-dialog'

interface ContentItem {
  id: string
  section: string
  key: string
  value: string
  type: string
  description?: string
  order: number
}

// Section 中文映射
const sectionNames: Record<string, string> = {
  hero: '首页 Hero 区域',
  stats: '统计数据',
  vision: '愿景与目标',
  advanced: '高阶玩法',
  resources: '资源合集',
  training: '训练营',
  contact: '联系方式',
  universities: '合作院校',
}

interface SiteContentData {
  contents: ContentItem[]
  grouped: Record<string, ContentItem[]>
}

export default function SiteContentPage() {
  const { data, error, isLoading, mutate } = useSWR<SiteContentData>('/api/admin/site-content', fetcher)
  const [saving, setSaving] = useState(false)
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({})
  const [editedValues, setEditedValues] = useState<Record<string, string>>({})
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [createInitialData, setCreateInitialData] = useState<Record<string, any> | undefined>(undefined)
  const { toast } = useToast()

  const contents = data?.contents || []
  const grouped = data?.grouped || {}

  const createFields: FormField[] = [
    { name: 'section', label: 'Section', type: 'text', required: true, placeholder: 'hero / vision / training ...' },
    { name: 'key', label: 'Key', type: 'text', required: true, placeholder: 'title / subtitle / modules ...' },
    {
      name: 'type',
      label: 'Type',
      type: 'select',
      required: true,
      options: [
        { value: 'text', label: 'text' },
        { value: 'json', label: 'json' },
        { value: 'array', label: 'array' },
        { value: 'number', label: 'number' },
        { value: 'boolean', label: 'boolean' },
      ],
    },
    { name: 'order', label: 'Order', type: 'number', required: true, placeholder: '0' },
    { name: 'description', label: 'Description', type: 'text', required: false },
    { name: 'value', label: 'Value', type: 'textarea', rows: 6, required: false },
  ]

  const handleSave = async () => {
    try {
      setSaving(true)

      // 找出所有修改过的内容
      const updates = contents
        .filter((item) => editedValues[item.id] !== undefined && editedValues[item.id] !== item.value)
        .map((item) => ({
          id: item.id,
          value: editedValues[item.id],
        }))

      if (updates.length === 0) {
        toast({ title: '没有修改需要保存' })
        return
      }

      const res = await fetch('/api/admin/site-content', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates }),
      })

      const result = await res.json()

      if (result.success) {
        toast({ title: `✅ 已保存 ${updates.length} 条修改` })
        setEditedValues({}) // Clear edited values
        mutate() // Revalidate data
      } else {
        toast({ title: '保存失败', variant: 'destructive' })
      }
    } catch (error) {
      toast({ title: '保存失败', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }))
  }

  const handleValueChange = (id: string, value: string) => {
    setEditedValues((prev) => ({
      ...prev,
      [id]: value,
    }))
  }

  const openCreateForSection = (section: string) => {
    setCreateInitialData({
      section,
      key: '',
      type: 'text',
      order: (grouped[section]?.length ?? 0) + 1,
      description: '',
      value: '',
    })
    setCreateDialogOpen(true)
  }

  const handleCreate = async (data: Record<string, any>) => {
    try {
      const res = await fetch('/api/admin/site-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const result = await res.json()
      if (!result.success) throw new Error(result.error)
      toast({ title: '创建成功' })
      mutate()
    } catch (error: any) {
      toast({ title: '创建失败', description: error.message, variant: 'destructive' })
    }
  }

  const handleDelete = async (item: ContentItem) => {
    if (!confirm(`确定要删除 ${item.section}.${item.key} 吗？`)) return

    try {
      const res = await fetch(`/api/admin/site-content?id=${encodeURIComponent(item.id)}`, {
        method: 'DELETE',
      })
      const result = await res.json()
      if (!result.success) throw new Error(result.error)

      setEditedValues((prev) => {
        const next = { ...prev }
        delete next[item.id]
        return next
      })

      toast({ title: '删除成功' })
      mutate()
    } catch (error: any) {
      toast({ title: '删除失败', description: error.message, variant: 'destructive' })
    }
  }

  // Calculate hasChanges based on whether any edited value differs from original
  const hasChanges = contents.some((item) => 
    editedValues[item.id] !== undefined && editedValues[item.id] !== item.value
  )

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="text-lg text-foreground/60">加载中...</div>
      </div>
    )
  }

  if (error) {
    return <div className="p-6 text-red-500">加载失败: {error.message}</div>
  }

  return (
    <div className="p-6 space-y-6">
      {/* 页面标题 */}
      <div className="glass-card-premium linear-border rounded-2xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <FileText className="w-6 h-6 text-primary" />
              <h1 className="text-2xl font-bold">网站内容管理</h1>
            </div>
            <p className="text-foreground/60">编辑网站所有前端显示的文字内容</p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => mutate()}
              disabled={saving}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              刷新
            </Button>
            <Button
              onClick={handleSave}
              disabled={!hasChanges || saving}
              className="shimmer bg-gradient-to-r from-primary to-accent border-0"
            >
              <Save className="w-4 h-4 mr-2" />
              {saving ? '保存中...' : hasChanges ? '保存修改' : '没有修改'}
            </Button>
          </div>
        </div>
      </div>

      {/* 内容编辑区 */}
      <div className="space-y-4">
        {Object.entries(grouped).map(([section, items]) => (
          <div key={section} className="glass-card-premium linear-border rounded-2xl overflow-hidden">
            {/* Section 标题 */}
            <button
              onClick={() => toggleSection(section)}
              className="w-full flex items-center justify-between p-6 hover:bg-primary/5 transition-colors"
            >
              <div className="flex items-center gap-3">
                {expandedSections[section] ? (
                  <ChevronDown className="w-5 h-5 text-primary" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-foreground/60" />
                )}
                <h2 className="text-xl font-bold">{sectionNames[section] || section}</h2>
                <span className="text-sm text-foreground/60">({items.length} 项)</span>
              </div>
            </button>

            {/* Section 内容 */}
            {expandedSections[section] && (
              <div className="p-6 pt-0 space-y-4 border-t border-border/30">
                <div className="pt-6 flex items-center justify-end">
                  <Button variant="outline" onClick={() => openCreateForSection(section)}>
                    <Plus className="w-4 h-4 mr-2" />
                    新增字段
                  </Button>
                </div>
                {items.map((item) => {
                  const currentValue = editedValues[item.id] !== undefined ? editedValues[item.id] : item.value;
                  const isModified = editedValues[item.id] !== undefined && editedValues[item.id] !== item.value;
                  
                  return (
                  <div key={item.id} className="glass-card rounded-xl p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor={item.id} className="text-sm font-semibold">
                        {item.key}
                      </Label>
                      <div className="flex items-center gap-2">
                        {item.description && (
                          <span className="text-xs text-foreground/50">{item.description}</span>
                        )}
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDelete(item)}
                          title="删除字段"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {item.type === 'json' ? (
                      <Textarea
                        id={item.id}
                        value={currentValue}
                        onChange={(e) => handleValueChange(item.id, e.target.value)}
                        rows={6}
                        className="font-mono text-sm"
                        placeholder="JSON 格式"
                      />
                    ) : item.value.length > 100 ? (
                      <Textarea
                        id={item.id}
                        value={currentValue}
                        onChange={(e) => handleValueChange(item.id, e.target.value)}
                        rows={4}
                      />
                    ) : (
                      <Input
                        id={item.id}
                        value={currentValue}
                        onChange={(e) => handleValueChange(item.id, e.target.value)}
                      />
                    )}

                    {/* 显示是否已修改 */}
                    {isModified && (
                      <div className="text-xs text-amber-500 flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-amber-500" />
                        已修改
                      </div>
                    )}
                  </div>
                )})}
              </div>
            )}
          </div>
        ))}
      </div>

      <FormDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        title="新增内容字段"
        description="新增后即可被前台读取（按 section.key 访问）。"
        fields={createFields}
        initialData={createInitialData}
        onSubmit={handleCreate}
      />

      {/* 底部保存提示 */}
      {hasChanges && (
        <div className="fixed bottom-6 right-6 glass-card rounded-xl p-4 shadow-2xl border-amber-500/50 border">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-amber-500 animate-pulse" />
            <span className="text-sm font-medium">有未保存的修改</span>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={saving}
              className="shimmer bg-gradient-to-r from-primary to-accent border-0"
            >
              <Save className="w-4 h-4 mr-2" />
              保存
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
