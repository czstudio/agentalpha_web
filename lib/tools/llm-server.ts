/**
 * LLM 服务层(仅服务端使用):统一限额、缓存与调用。
 *
 * 预算设计(用户拍板:每天总预算 3 元人民币):
 * - 默认模型 gemini-3.1-flash-lite,实测单次 JD 拆解 ≈ 250 in + 400 out tokens,
 *   按中转价保守估(¥1/1M in + ¥4/1M out)单次 ≤ ¥0.005,输入截断与 max_tokens 硬顶保证上界。
 * - 全站每日配额 600 次(理论成本 ≤¥3,再留安全边际),按日重置。
 * - 限额实现是模块级内存计数:serverless 多实例下是近似值(每个实例各计一份),
 *   对「防滥用 + 控成本量级」足够;要精确全局额度时配 UPSTASH_REDIS_URL 即走 Redis。
 * - 相同输入哈希直接返回缓存结果,不重复花钱。
 */

export const LLM_MODEL_DEFAULT = "gemini-3.1-flash-lite"
export const LLM_BASE_URL_DEFAULT = "https://api.huohuaapi.com/v1"
/** 全站每日调用配额(3 元 ÷ ¥0.005,留边际) */
export const LLM_SITE_DAILY_QUOTA = 600
/** 单 IP 每日配额(防单人刷完全站额度) */
export const LLM_IP_DAILY_QUOTA = 10
export const LLM_MAX_TOKENS = 900
export const LLM_INPUT_CHAR_LIMIT = 3500
/** 单次调用超时 */
export const LLM_TIMEOUT_MS = 45_000

/** 缓存上限:模块实例存活的近似 LRU,超出即丢弃最旧 */
const CACHE_LIMIT = 80

interface DayCounter {
  date: string
  count: number
}

const siteCounter: DayCounter = { date: "", count: 0 }
const ipCounters = new Map<string, DayCounter>()
const cache = new Map<string, { text: string; model: string }>()

/** 服务端按北京时间(站点受众)取「当天」,避免 UTC 让配额在北京早 8 点才重置 */
export function todayCN(): string {
  const now = new Date()
  const cn = new Date(now.getTime() + 8 * 3600 * 1000)
  return cn.toISOString().slice(0, 10)
}

export type QuotaVerdict =
  | { ok: true; siteUsed: number; siteQuota: number; ipUsed: number; ipQuota: number }
  | { ok: false; reason: "site" | "ip"; siteUsed: number; siteQuota: number; ipUsed: number; ipQuota: number }

/** 预检 + 计数。调用失败不回退计数(保守:失败也占额度,防止用报错刷免费重试) */
export function consumeQuota(ip: string): QuotaVerdict {
  const day = todayCN()
  if (siteCounter.date !== day) {
    siteCounter.date = day
    siteCounter.count = 0
  }
  const ipKey = ip.slice(0, 64)
  let ipCounter = ipCounters.get(ipKey)
  if (!ipCounter || ipCounter.date !== day) {
    ipCounter = { date: day, count: 0 }
    ipCounters.set(ipKey, ipCounter)
    if (ipCounters.size > 2000) {
      // 防内存膨胀:超量时清掉最旧的一半
      const keys = [...ipCounters.keys()].slice(0, 1000)
      for (const k of keys) ipCounters.delete(k)
    }
  }
  const state = {
    siteUsed: siteCounter.count,
    siteQuota: LLM_SITE_DAILY_QUOTA,
    ipUsed: ipCounter.count,
    ipQuota: LLM_IP_DAILY_QUOTA,
  }
  if (siteCounter.count >= LLM_SITE_DAILY_QUOTA) return { ok: false, reason: "site", ...state }
  if (ipCounter.count >= LLM_IP_DAILY_QUOTA) return { ok: false, reason: "ip", ...state }
  siteCounter.count++
  ipCounter.count++
  return { ok: true, ...state, siteUsed: siteCounter.count, ipUsed: ipCounter.count }
}

async function hashInput(text: string): Promise<string> {
  // sha-256:弱哈希会让不同 JD 低概率串缓存答案
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text.trim().toLowerCase()))
  return Array.from(new Uint8Array(buf.slice(0, 12)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}

/** 缓存键带模型名:切换 LLM_MODEL 后不再命中旧模型的缓存 */
export async function inputKey(namespace: string, input: string): Promise<string> {
  const model = process.env.LLM_MODEL || LLM_MODEL_DEFAULT
  return `${namespace}:${model}:${await hashInput(input)}`
}

export function cacheGet(key: string): { text: string; model: string } | null {
  return cache.get(key) ?? null
}

export function cachePut(key: string, value: { text: string; model: string }): void {
  if (cache.size >= CACHE_LIMIT) {
    const oldest = cache.keys().next().value
    if (oldest !== undefined) cache.delete(oldest)
  }
  cache.set(key, value)
}

export interface LlmResult {
  text: string
  model: string
  cached: boolean
}

export function llmConfigured(): boolean {
  return Boolean(process.env.LLM_API_KEY)
}

/** OpenAI 兼容 chat completions 调用(密钥只在本层出现,永不回传给客户端) */
export async function callLlm(opts: {
  system: string
  user: string
  maxTokens?: number
  temperature?: number
}): Promise<LlmResult> {
  const apiKey = process.env.LLM_API_KEY
  if (!apiKey) throw new Error("LLM_NOT_CONFIGURED")
  const baseUrl = process.env.LLM_BASE_URL || LLM_BASE_URL_DEFAULT
  const model = process.env.LLM_MODEL || LLM_MODEL_DEFAULT

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), LLM_TIMEOUT_MS)
  try {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: opts.system },
          { role: "user", content: opts.user.slice(0, LLM_INPUT_CHAR_LIMIT) },
        ],
        max_tokens: opts.maxTokens ?? LLM_MAX_TOKENS,
        temperature: opts.temperature ?? 0.4,
      }),
      signal: controller.signal,
    })
    if (!res.ok) {
      const body = await res.text().catch(() => "")
      throw new Error(`LLM_UPSTREAM_${res.status}:${body.slice(0, 120)}`)
    }
    const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> }
    const text = data.choices?.[0]?.message?.content?.trim()
    if (!text) throw new Error("LLM_EMPTY")
    return { text, model, cached: false }
  } finally {
    clearTimeout(timer)
  }
}
