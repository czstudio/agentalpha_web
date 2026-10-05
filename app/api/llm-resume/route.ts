import { NextResponse } from "next/server"
import { LLM_INPUT_CHAR_LIMIT, cacheGet, cachePut, callLlm, consumeQuota, inputKey } from "@/lib/tools/llm-server"
import { docToMarkdown, isEmptyDoc, parseResumeText } from "@/lib/tools/resume-builder"

export const runtime = "nodejs"

const SITE = "https://agentalpha.top"

export async function GET() {
  return NextResponse.json({
    enabled: Boolean(process.env.LLM_API_KEY),
    runtime: "nodejs",
  })
}

const SYSTEM = `你是 AI/Agent 方向的资深技术面试官兼简历顾问。用户给你一段简历(可能是结构化 Markdown,也可能是零散的经历描述)。规则:
1. 不编造:公司、学校、职位、技术栈、数字一律沿用原文;原文没有的信息留空或写「〔待补:...〕」,绝不虚构。数字缺了就留〔〕占位。
2. 输出严格是 JSON 数组,每个元素:{"original":"原条目全文","rewritten":"改写后的一条","notes":["问题一句话","再一句"],"prep":"面试承接一句话"},不要 markdown 代码围栏,不要多余字段。
3. 只处理经历类条目(bullet/句子);跳过姓名、联系方式、章节标题。
4. notes 用中文,最多两条,直说问题:弱动词、无量化、无难点、无结果、指标缺口径、时态越界(规划写成已交付)、把团队成果写成个人。
5. rewritten 保持一条一行的简历口吻,动词开头,长度不超过原文两倍;原文没有数字时在关键位置用〔指标〕〔规模〕占位。
6. prep 是「面试承接」:面试官最可能追问什么、用户要准备什么证据或知识,一句话;没有强表述可写空字符串。
7. 强度档位(strength):safe=只重排表达,不升级角色与范围(参与就是参与);bold=可以做 owner 式职责框定与能力归纳(如「负责核心模块」),但公司/学校/岗位/数字/事实边界不得升级,且这类条目的 prep 必须写清要准备什么、答不住怎么降级。`

export async function POST(request: Request) {
  let userKey = ""
  let userBaseUrl = ""
  let userModel = ""
  let resumeInput = ""
  let jd = ""
  let strength = "safe"
  try {
    const body = (await request.json()) as {
      resume?: string
      jd?: string
      apiKey?: string
      baseUrl?: string
      model?: string
      strength?: string
    }
    userKey = (body.apiKey ?? "").trim()
    userBaseUrl = (body.baseUrl ?? "").trim()
    userModel = (body.model ?? "").trim()
    resumeInput = (body.resume ?? "").trim()
    jd = (body.jd ?? "").trim()
    strength = body.strength === "bold" ? "bold" : "safe"
  } catch {
    return NextResponse.json({ enabled: true, error: "bad_request" }, { status: 400 })
  }

  if (resumeInput.length < 30) {
    return NextResponse.json({ enabled: true, error: "too_short" }, { status: 400 })
  }

  const providedKey = userKey.length > 0
  const effectiveKey = userKey.length >= 20 ? userKey : ""
  // 用户给了 key 但不合法:显式拒绝,绝不静默回退到站点额度(否则用户以为在用自己的 key)
  if (providedKey && !effectiveKey) {
    return NextResponse.json({ enabled: true, error: "bad_key" }, { status: 400 })
  }
  if (!effectiveKey && !process.env.LLM_API_KEY) {
    return NextResponse.json({ enabled: true, error: "not_configured" }, { status: 503 })
  }

  const ip =
    request.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  const cacheSource = `resume-v2|${userModel || "site"}|${strength}|${jd.slice(0, 500)}|${resumeInput.slice(0, 2000)}`
  const key = await inputKey("resume", cacheSource)

  if (!effectiveKey) {
    const cached = cacheGet(key)
    if (cached) {
      // 缓存命中也计一次(挡刷),但上游零成本
      const quota = consumeQuota(ip)
      if (!quota.ok) return NextResponse.json({ enabled: true, error: "quota", scope: quota.reason }, { status: 429 })
      try {
        return NextResponse.json({ enabled: true, items: JSON.parse(cached.text), model: cached.model, cached: true })
      } catch {
        // 缓存损坏则继续走真实调用
      }
    }
  }

  const quota = consumeQuota(ip)
  if (!quota.ok) {
    return NextResponse.json({ enabled: true, error: "quota", scope: quota.reason }, { status: 429 })
  }

  const parsed = parseResumeText(resumeInput)
  const resumeText = isEmptyDoc(parsed.data) ? resumeInput : docToMarkdown(parsed.data)

  const user = [
    `包装强度:${strength === "bold" ? "bold(可 owner 式职责框定,事实边界与数字不得升级,每条给面试承接)" : "safe(只重排表达,不升级角色范围)"}`,
    jd ? `目标 JD(只用于对齐用词,不许照抄 JD 编造经历):\n${jd.slice(0, 1200)}` : "",
    `简历内容:\n${resumeText}`,
  ]
    .filter(Boolean)
    .join("\n\n")
    .slice(0, LLM_INPUT_CHAR_LIMIT)

  try {
    const result = await callLlm({
      system: SYSTEM,
      user,
      maxTokens: 1800,
      apiKey: effectiveKey,
      baseUrl: effectiveKey && userBaseUrl ? userBaseUrl : undefined,
      model: effectiveKey && userModel ? userModel : undefined,
    })
    if (!effectiveKey) cachePut(key, { text: result.text, model: result.model })
    let items: unknown
    try {
      const raw = result.text.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "")
      items = JSON.parse(raw)
    } catch {
      return NextResponse.json({ enabled: true, error: "bad_output", raw: result.text.slice(0, 400) }, { status: 502 })
    }
    if (!Array.isArray(items)) {
      return NextResponse.json({ enabled: true, error: "bad_output", raw: result.text.slice(0, 200) }, { status: 502 })
    }
    return NextResponse.json({ enabled: true, items, model: result.model, cached: false, site: SITE })
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown"
    const status = message === "LLM_NOT_CONFIGURED" ? 503 : 502
    return NextResponse.json({ enabled: true, error: "upstream", detail: message.slice(0, 120) }, { status })
  }
}
