/**
 * 简历文件本地解析(PDF/DOCX → 文本)。方法吸收自酥神 transform.js:
 * pdf.js 抽原生文字流(按 y 坐标聚行),mammoth 抽 DOCX 纯文本,OCR 不做(扫描件引导用户粘贴文字)。
 * 全部在你的浏览器完成,文件不上传;解析库走公有 CDN 动态加载(与酥神同源)。
 * 红线:只提取文字,不改写;质量检测不过就明说,不静默降级。
 */

export interface ImportQuality {
  passed: boolean
  characters: number
  lineCount: number
  reasons: string[]
}

export interface ImportResult {
  text: string
  method: string
  quality: ImportQuality
}

const PDFJS_URL = "https://cdn.jsdelivr.net/npm/pdfjs-dist@6.1.200/build/pdf.min.mjs"
const PDFJS_WORKER_URL = "https://cdn.jsdelivr.net/npm/pdfjs-dist@6.1.200/build/pdf.worker.min.mjs"
const PDFJS_ASSET_ROOT = "https://cdn.jsdelivr.net/npm/pdfjs-dist@6.1.200/"
const MAMMOTH_URL = "https://cdn.jsdelivr.net/npm/mammoth@1.10.0/mammoth.browser.min.js"
const MAX_FILE_BYTES = 20 * 1024 * 1024
const MAX_PDF_PAGES = 20

/* 动态 import 绝对 URL,绕开打包器静态分析 */
const dynamicImport = new Function("u", "return import(u)") as (u: string) => Promise<unknown>

function loadScript(url: string, globalName: string): Promise<unknown> {
  const w = window as unknown as Record<string, unknown>
  if (w[globalName]) return Promise.resolve(w[globalName])
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[data-parser="${globalName}"]`)
    if (existing) {
      existing.addEventListener("load", () => resolve(w[globalName]), { once: true })
      existing.addEventListener("error", () => reject(new Error(globalName + " 加载失败")), { once: true })
      return
    }
    const script = document.createElement("script")
    script.src = url
    script.async = true
    script.dataset.parser = globalName
    script.onload = () => resolve(w[globalName])
    script.onerror = () => reject(new Error(globalName + " 加载失败"))
    document.head.appendChild(script)
  })
}

function cleanLine(line: string): string {
  return String(line || "").replace(/\u00a0/g, " ").replace(/[ \t]+/g, " ").trim()
}

/** 文本质量检测(移植酥神 analyzeTextQuality):乱码率/异常字符/可读比例 */
export function analyzeTextQuality(text: string): ImportQuality {
  const value = String(text || "").normalize("NFKC")
  const compact = value.replace(/\s/g, "")
  const total = compact.length
  const abnormal = (compact.match(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\ufffd\ue000-\uf8ff]/g) || []).length
  const mojibake = (compact.match(/(?:\u951f\u65a4\u62f7|\u00ef\u00bf\u00bd|\u00c3.|\u00c2.|\u00e2\u20ac|\u00e6[\u0080-\u00ff]|\u00e5[\u0080-\u00ff]|\u00e7[\u0080-\u00ff])/g) || []).join("").length
  const readable = (compact.match(/[A-Za-z0-9\u3400-\u4dbf\u4e00-\u9fff，。；：！？、（）()《》【】“”‘’·%+@._\-\/]/g) || []).length
  const lineCount = value.split(/\r?\n/).filter((l) => l.trim()).length
  const reasons: string[] = []
  if (total < 30) reasons.push("有效文字少于 30 个字符")
  if (lineCount < 3) reasons.push("有效行数少于 3 行")
  if (total && abnormal / total > 0.01) reasons.push("异常字符比例过高")
  if (total && mojibake / total > 0.005) reasons.push("检测到疑似乱码")
  if (total && readable / total < 0.78) reasons.push("可读字符比例过低")
  return { passed: reasons.length === 0, characters: total, lineCount, reasons }
}

/** PDF 文本项按 y 坐标聚行、按 x 排序拼行(酥神 pdfItemsToLines 同法) */
function pdfItemsToLines(items: Array<{ str?: string; transform?: number[]; width?: number }>): string[] {
  const positioned = items
    .filter((it) => it && cleanLine(it.str || ""))
    .map((it) => ({
      text: cleanLine(it.str || ""),
      x: Number(it.transform?.[4]) || 0,
      y: Number(it.transform?.[5]) || 0,
      width: Number(it.width) || 0,
    }))
    .sort((a, b) => (Math.abs(b.y - a.y) > 2.2 ? b.y - a.y : a.x - b.x))
  const rows: Array<{ y: number; items: typeof positioned }> = []
  for (const item of positioned) {
    let row = rows.find((c) => Math.abs(c.y - item.y) <= 2.2)
    if (!row) {
      row = { y: item.y, items: [] }
      rows.push(row)
    }
    row.items.push(item)
  }
  return rows
    .sort((a, b) => b.y - a.y)
    .map((row) =>
      row.items
        .sort((a, b) => a.x - b.x)
        .map((item, i) => {
          const gap = i ? item.x - (row.items[i - 1].x + row.items[i - 1].width) : 0
          return (i && gap > 2.5 ? " " : "") + item.text
        })
        .join("")
        .trim(),
    )
    .filter(Boolean)
}

async function extractPdfText(file: File): Promise<ImportResult> {
  const pdfjs = (await dynamicImport(PDFJS_URL)) as {
    GlobalWorkerOptions: { workerSrc: string }
    getDocument: (opts: Record<string, unknown>) => { promise: Promise<PdfDoc> }
  }
  pdfjs.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_URL
  const bytes = new Uint8Array(await file.arrayBuffer())
  const pdf = await pdfjs.getDocument({
    data: bytes,
    cMapUrl: PDFJS_ASSET_ROOT + "cmaps/",
    cMapPacked: true,
    standardFontDataUrl: PDFJS_ASSET_ROOT + "standard_fonts/",
  }).promise
  if (pdf.numPages > MAX_PDF_PAGES) throw new Error(`PDF 共 ${pdf.numPages} 页，超过 ${MAX_PDF_PAGES} 页在线解析上限`)
  const pages: string[] = []
  for (let pageNo = 1; pageNo <= pdf.numPages; pageNo += 1) {
    const page = await pdf.getPage(pageNo)
    const content = await page.getTextContent()
    pages.push(pdfItemsToLines(content.items as never).join("\n"))
    page.cleanup()
  }
  const text = pages.filter(Boolean).join("\n\n")
  const quality = analyzeTextQuality(text)
  if (!quality.passed && /[\u3400-\u9fff]/.test(text) === false && text.length > 0) {
    throw new Error("这份 PDF 几乎抽不出文字（多半是扫描件/图片版）。请把简历文字复制粘贴进来，效果一样。")
  }
  return { text, method: `PDF 原生文字（${pdf.numPages} 页，本地解析）`, quality }
}

async function extractDocxText(file: File): Promise<ImportResult> {
  const mammoth = (await loadScript(MAMMOTH_URL, "mammoth")) as {
    extractRawText: (opts: { arrayBuffer: ArrayBuffer }) => Promise<{ value: string }>
  }
  const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() })
  const text = String(result?.value || "")
  return { text, method: "Word 文档纯文本（本地解析）", quality: analyzeTextQuality(text) }
}

interface PdfDoc {
  numPages: number
  getPage: (n: number) => Promise<{
    getTextContent: () => Promise<{ items: never }>
    cleanup: () => void
  }>
}

/** 入口:PDF / DOCX → 本地文本。解析失败抛错(信息给用户),绝不静默换示例数据 */
export async function extractFileText(file: File): Promise<ImportResult> {
  if (file.size > MAX_FILE_BYTES) throw new Error("文件超过 20 MB 在线解析上限")
  if (/\.pdf$/i.test(file.name)) return extractPdfText(file)
  if (/\.docx$/i.test(file.name)) return extractDocxText(file)
  if (/\.doc$/i.test(file.name)) throw new Error("旧版 .doc 不支持在线解析：用 Word 另存为 .docx，或直接复制文字粘贴。")
  throw new Error("仅支持 PDF / DOCX")
}
