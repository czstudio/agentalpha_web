'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function ContentPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/admin/site-content')
  }, [router])

  return (
    <div className="p-6 text-foreground/70">
      正在跳转到「网站内容」…
    </div>
  )
}

