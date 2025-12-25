'use client'

import { useState, useEffect } from 'react'
import { Image as ImageIcon, Upload, Copy, Trash2 } from 'lucide-react'
import { ImageUpload } from '@/components/admin/image-upload'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'

interface MediaFile {
  url: string
  name: string
  size: number
  uploadedAt: Date
}

export default function MediaPage() {
  const [uploading, setUploading] = useState(false)
  const [images, setImages] = useState<string[]>([])
  const { toast } = useToast()

  const handleUploadComplete = (url: string) => {
    setImages((prev) => [url, ...prev])
    toast({ title: '上传成功' })
  }

  const handleCopy = (url: string) => {
    const fullUrl = window.location.origin + url
    navigator.clipboard.writeText(fullUrl)
    toast({ title: '已复制到剪贴板', description: fullUrl })
  }

  const handleDelete = (url: string) => {
    if (!confirm('确定要删除这张图片吗？')) return
    // 这里应该调用删除 API
    setImages((prev) => prev.filter((img) => img !== url))
    toast({ title: '删除成功' })
  }

  // 模拟已上传的图片（实际应该从 API 获取）
  useEffect(() => {
    // 这里可以添加获取已上传图片列表的逻辑
  }, [])

  return (
    <div className="p-6 space-y-6">
      {/* 页面标题 */}
      <div className="glass-card-premium linear-border rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-2">
          <ImageIcon className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold">媒体库管理</h1>
        </div>
        <p className="text-foreground/60">上传和管理网站图片资源</p>
      </div>

      {/* 上传区域 */}
      <div className="glass-card-premium linear-border rounded-2xl p-6">
        <h2 className="text-lg font-semibold mb-4">上传新图片</h2>
        <ImageUpload
          value=""
          onChange={handleUploadComplete}
          label="点击或拖拽上传图片"
          maxSizeMB={5}
        />
      </div>

      {/* 图片网格 */}
      <div className="glass-card-premium linear-border rounded-2xl p-6">
        <h2 className="text-lg font-semibold mb-4">已上传图片</h2>

        {images.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <ImageIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>还没有上传图片</p>
            <p className="text-sm mt-1">上传的图片将显示在这里</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {images.map((url, index) => (
              <div
                key={index}
                className="group relative glass-card linear-border rounded-lg overflow-hidden hover:scale-105 transition-transform"
              >
                <img
                  src={url}
                  alt={`Upload ${index + 1}`}
                  className="w-full h-48 object-cover"
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handleCopy(url)}
                    title="复制 URL"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDelete(url)}
                    title="删除"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/70 to-transparent">
                  <p className="text-white text-xs truncate">{url}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 使用提示 */}
      <div className="glass-card linear-border rounded-xl p-4 bg-primary/5">
        <div className="flex items-start gap-3">
          <span className="text-2xl">💡</span>
          <div className="flex-1">
            <h3 className="font-semibold mb-1">使用提示</h3>
            <ul className="text-sm text-foreground/70 space-y-1">
              <li>• 上传的图片会保存在 <code className="bg-muted px-1 rounded">/uploads/</code> 目录</li>
              <li>• 点击复制按钮可以复制图片的完整 URL</li>
              <li>• 支持 JPG、PNG、GIF、WEBP、SVG 格式</li>
              <li>• 单个文件最大 5MB</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
