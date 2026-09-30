/**
 * 工具报告导出(深模块)。接口只有三个函数:
 * escHtml(用户文本转义) / buildWordDoc(拼 .doc) / downloadWord(触发下载)。
 * 打印走各页面自己的 .print-root + tools.css 的 @media print 规则,不经服务器。
 * 红线:报告内容全部来自用户本机数据,指标位〔〕留空,不编造数字。
 */

export function escHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

/** Word 兼容 HTML(.doc):宋体、A4 打印视图,Word/WPS 直接打开 */
export function buildWordDoc(title: string, bodyHtml: string): string {
  return [
    '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word">',
    "<head><meta charset=\"utf-8\"><title>" + escHtml(title) + "</title>",
    "<!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View><w:Zoom>100</w:Zoom></w:WordDocument></xml><![endif]-->",
    "<style>body{font-family:'宋体',SimSun,serif;font-size:11pt;color:#1a1a1a;line-height:1.55;} h1{font-size:18pt;text-align:center;margin:0 0 4pt;} h2{font-size:13pt;border-bottom:1px solid #333;padding-bottom:2pt;margin:14pt 0 6pt;} table{border-collapse:collapse;width:100%;font-size:10.5pt;} td,th{border:1px solid #999;padding:4pt 6pt;text-align:left;} .meta{color:#666;font-size:10pt;}</style>",
    "</head><body>",
    `<h1>${escHtml(title)}</h1>`,
    bodyHtml,
    "</body></html>",
  ].join("\r\n")
}

export function downloadWord(title: string, bodyHtml: string, filename: string) {
  const blob = new Blob(["\ufeff", buildWordDoc(title, bodyHtml)], { type: "application/msword" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

/** 纯文本(已有的导出文案)转简单段落 HTML,给 Word 导出复用 */
export function textToParas(text: string): string {
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => `<p style="margin:3pt 0;">${escHtml(l)}</p>`)
    .join("")
}
