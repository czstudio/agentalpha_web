import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * 后台录入的中英混排文案里，半角标点（, : ; ? !）贴着中文时统一成全角，
 * 显示层兜底，不动数据库原值。纯 ASCII/数字之间的半角标点（如 1,500、https://）保留。
 */
export function normalizeCjkPunct(input: string): string {
  return input.replace(/([,:;?!])/g, (mark, _m, offset: number) => {
    const prev = input[offset - 1] ?? ""
    const next = input[offset + 1] ?? ""
    const cjk = (c: string) => /[\u4e00-\u9fff\u3000-\u303f\uff00-\uffef]/.test(c)
    const ascii = (c: string) => /[A-Za-z0-9]/.test(c)
    if (!cjk(prev) && !cjk(next)) return mark
    if (ascii(prev) && ascii(next)) return mark
    return mark.replace(/,/g, "，").replace(/:/g, "：").replace(/;/g, "；").replace(/\?/g, "?").replace(/!/g, "！")
  })
}

/** 深度遍历 JSON/对象，把所有字符串值做标点规范化 */
export function deepNormalizeCjkPunct<T>(value: T): T {
  if (typeof value === "string") return normalizeCjkPunct(value) as unknown as T
  if (Array.isArray(value)) return value.map((v) => deepNormalizeCjkPunct(v)) as unknown as T
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) out[k] = deepNormalizeCjkPunct(v)
    return out as T
  }
  return value
}
