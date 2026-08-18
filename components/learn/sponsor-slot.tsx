type SponsorPosition = "collection" | "after-intro" | "article-end"

/** Reserved commercial interface. Article body data can never inject ads. */
export function SponsorSlot({ position }: { position: SponsorPosition }) {
  if (process.env.NEXT_PUBLIC_SPONSOR_SLOTS_ENABLED !== "true") return null

  return (
    <aside className="learn-sponsor" aria-label="赞助内容">
      <span>赞助内容</span>
      <p>AgentAlpha 合作展示位 · {position}</p>
    </aside>
  )
}
