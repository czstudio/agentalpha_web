import type { ComponentPropsWithoutRef } from "react"

/**
 * 正文 markdown 里的图（论文图/图解）统一走这里：
 * 懒加载 + 异步解码，首屏之外不抢带宽。封面图等首屏大图不走 markdown，不受影响。
 */
export function MarkdownImg(props: ComponentPropsWithoutRef<"img">) {
  const { loading, decoding, ...rest } = props
  return <img {...rest} loading={loading ?? "lazy"} decoding={decoding ?? "async"} />
}

export default MarkdownImg
