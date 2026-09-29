"use client"

import { useMemo } from "react"
import { useLocalState } from "@/hooks/use-local-state"

interface Dimension {
  key: string
  label: string
  hint: string
}

const DIMENSIONS: Dimension[] = [
  { key: "pay", label: "薪资总包", hint: "算总包：base + 绩效 + 期权按折价" },
  { key: "city", label: "城市与生活", hint: "通勤、房租、离家远近、伴侣/朋友" },
  { key: "biz", label: "业务与前景", hint: "业务赚钱吗、大模型是真投入还是讲故事" },
  { key: "growth", label: "成长速度", hint: "导师、代码量、能碰核心还是拧螺丝" },
  { key: "stability", label: "稳定性", hint: "裁员风险、转正难度、业务换血频率" },
  { key: "wlb", label: "工作强度", hint: "按「越舒服分越高」打：965 给 9，9127 给 2" },
]

interface OfferDraft {
  name: string
  scores: Record<string, number>
}

const DEFAULT_WEIGHTS: Record<string, number> = {
  pay: 4, city: 3, biz: 4, growth: 4, stability: 3, wlb: 3,
}

function blankOffer(label: string): OfferDraft {
  return { name: label, scores: Object.fromEntries(DIMENSIONS.map((d) => [d.key, 5])) }
}

export function OfferClient() {
  const [offers, setOffers] = useLocalState<OfferDraft[]>("offer-compare-v1", [
    blankOffer("Offer A"),
    blankOffer("Offer B"),
  ])
  const [weights, setWeights] = useLocalState<Record<string, number>>("offer-weights-v1", DEFAULT_WEIGHTS)

  const results = useMemo(() => {
    const weightSum = Object.values(weights).reduce((a, b) => a + b, 0) || 1
    return offers
      .map((o) => ({
        ...o,
        total: Math.round(
          (DIMENSIONS.reduce((sum, d) => sum + (o.scores[d.key] ?? 5) * (weights[d.key] ?? 3), 0) / weightSum) * 10,
        ) / 10,
      }))
      .sort((a, b) => b.total - a.total)
  }, [offers, weights])

  const setOffer = (i: number, patch: Partial<OfferDraft>) =>
    setOffers((prev) => prev.map((o, idx) => (idx === i ? { ...o, ...patch } : o)))
  const setScore = (i: number, key: string, v: number) =>
    setOffers((prev) => prev.map((o, idx) => (idx === i ? { ...o, scores: { ...o.scores, [key]: v } } : o)))

  const gap = results.length >= 2 ? results[0].total - results[1].total : 0
  let verdict = "把两边的分数填真实一点，差距会自己出来。"
  if (results.length >= 2) {
    if (gap >= 1.5) verdict = `${results[0].name} 综合明显领先（高 ${gap} 分）。如果内心还在纠结，说明有些维度你没敢打真实分——把那维的权重调高再看一次。`
    else if (gap >= 0.5) verdict = `${results[0].name} 小幅领先（高 ${gap} 分）。这个量级属于「几天后你会忘记差距」的范围，优先按稳定性与业务真实性做决定。`
    else verdict = "两边几乎打平。这种情况别再算分了：选那个 mentor 更强、业务更核心的，薪资差在职业前几年会被成长速度抹平。"
  }

  return (
    <div className="tk-shell">
      <section className="tk-input-card">
        <p className="tk-label">第一步：给每个 offer 的六个维度打分（1-10，凭真实感受）</p>
        <div className="offer-grid">
          {offers.map((o, i) => (
            <div key={i} className="offer-card">
              <input
                className="trk-input offer-name"
                value={o.name}
                onChange={(e) => setOffer(i, { name: e.target.value })}
                aria-label={`第 ${i + 1} 个 offer 名称`}
              />
              {DIMENSIONS.map((d) => (
                <div key={d.key} className="offer-dim">
                  <label className="offer-dim-label" title={d.hint}>{d.label}</label>
                  <input
                    type="range"
                    min={1}
                    max={10}
                    value={o.scores[d.key] ?? 5}
                    onChange={(e) => setScore(i, d.key, Number(e.target.value))}
                    aria-label={`${o.name} ${d.label}`}
                  />
                  <span className="offer-dim-num">{o.scores[d.key] ?? 5}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
        {offers.length < 3 && (
          <button
            type="button"
            className="mock-end-btn"
            onClick={() => setOffers((prev) => [...prev, blankOffer(`Offer ${String.fromCharCode(65 + prev.length)}`)])}
            style={{ marginTop: 10 }}
          >
            + 加一个 offer（最多 3 个）
          </button>
        )}
      </section>

      <section className="tk-input-card">
        <p className="tk-label">第二步：调权重（哪些维度对你真的重要，1-5）</p>
        <div className="offer-weights">
          {DIMENSIONS.map((d) => (
            <div key={d.key} className="offer-dim">
              <label className="offer-dim-label" title={d.hint}>{d.label}</label>
              <input
                type="range"
                min={1}
                max={5}
                value={weights[d.key] ?? 3}
                onChange={(e) => setWeights((prev) => ({ ...prev, [d.key]: Number(e.target.value) }))}
                aria-label={`${d.label}权重`}
              />
              <span className="offer-dim-num">{weights[d.key] ?? 3}</span>
            </div>
          ))}
        </div>
        <p className="tk-privacy" style={{ marginTop: 8 }}>草稿自动存在本机浏览器，关页面再回来还在。</p>
      </section>

      <section className="tk-block">
        <h3>对比结果</h3>
        {results.map((r, i) => (
          <div key={r.name} className="offer-result-row">
            <span className={`rank r${i}`}>#{i + 1}</span>
            <span className="name">{r.name}</span>
            <div className="tk-score-track" aria-hidden>
              <span style={{ width: `${r.total * 10}%` }} />
            </div>
            <span className="tk-score-num">{r.total}</span>
          </div>
        ))}
        <p className="mock-advice">{verdict}</p>
        <p className="tk-hint">
          提醒：分数只是把你的直觉摊开看。两个实用的谈判常识——手握多个 offer 时薪资谈判空间最大；
          没写进 offer 的口头承诺（调薪、转岗、期权）默认不存在。数字口径自己留档，别只记 HR 的话。
        </p>
      </section>
    </div>
  )
}
