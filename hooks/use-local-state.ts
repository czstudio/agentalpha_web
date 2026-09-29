"use client"

import { useEffect, useState } from "react"

/**
 * localStorage 持久化的 useState（SSR 安全）。
 * 首次挂载读取本地值，之后每次变更写回；JSON 解析失败静默回退初始值。
 * 用于面试复盘本、投递 CRM、模拟面试错题这类「无账号也要能留存」的工具。
 */
export function useLocalState<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(initial)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(key)
      if (raw !== null) setValue(JSON.parse(raw) as T)
    } catch {
      // 解析失败按无数据处理
    }
    setReady(true)
  }, [key])

  useEffect(() => {
    if (!ready) return
    try {
      window.localStorage.setItem(key, JSON.stringify(value))
    } catch {
      // 隐私模式/容量满：静默，不影响界面使用
    }
  }, [key, value, ready])

  return [value, setValue, ready] as const
}
