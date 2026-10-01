/**
 * W-ARIA radiogroup 的方向键导航(roving tabindex 惯例)。
 * 用法:在 role="radio" 按钮的 onKeyDown 里调用,容器须为 role="radiogroup"
 * 且按钮按 values 顺序渲染。方向键/Home/End 移动焦点并选中。
 */
export function radioChipKeyDown(
  e: React.KeyboardEvent,
  values: readonly string[],
  current: string | undefined,
  onSelect: (v: string) => void,
) {
  const keys = ["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp", "Home", "End"]
  if (!keys.includes(e.key)) return
  e.preventDefault()
  const idx = values.indexOf(current ?? "")
  let next: number
  if (e.key === "Home") next = 0
  else if (e.key === "End") next = values.length - 1
  else {
    const delta = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : -1
    next = idx === -1 ? 0 : (idx + delta + values.length) % values.length
  }
  const value = values[next]
  if (value === undefined) return
  onSelect(value)
  const container = (e.currentTarget as HTMLElement).closest("[role=radiogroup]")
  const buttons = container?.querySelectorAll<HTMLButtonElement>('[role="radio"]')
  buttons?.[next]?.focus()
}
