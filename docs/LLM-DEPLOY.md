# LLM 深度拆解:部署配置与预算说明

> 2026-09-29 上线。用户拍板:**模型用最便宜的,每天总预算 3 元人民币**。

## 怎么选的模型

- 中转站:huohua(`https://api.huohuaapi.com/v1`,OpenAI 兼容;密钥在站方账号,不在仓库)。
- 实测候选:`gemini-3.1-flash-lite`(3.9s,单次 ≈250 in + 400 out)与 `deepseek-v4-flash`(10.7s,带 reasoning token)。
- **定稿 `gemini-3.1-flash-lite`**:速度适合交互、单次成本最低、JD 拆解这类结构化任务质量达标。
  切换模型只改环境变量 `LLM_MODEL`,代码零改动。

## 预算控制(3 元/天)

| 层 | 规则 | 作用 |
| --- | --- | --- |
| 单次硬顶 | 输入截断 3500 字符、`max_tokens=900`、45s 超时 | 单次成本上界 ≈ ¥0.005,防长文爆钱 |
| 全站日配额 | 600 次/天(3 元 ÷ ¥0.005,留边际),按日重置 | 总预算硬顶,超了返回 429 |
| 单 IP 日配额 | 10 次/天 | 防单人刷完全站额度 |
| 浏览器日配额 | 5 次/天(localStorage,UI 显示剩余) | 提示层,挡正常用户的误刷 |
| 结果缓存 | 相同 JD 哈希直接回缓存 | 相同输入不重复花钱 |

诚实边界:serverless 多实例下内存计数是**近似**限额(每个实例各计一份),对「控成本量级 + 防滥用」足够;要精确全局额度时给 Vercel 配 `UPSTASH_REDIS_URL` 后把 `lib/tools/llm-server.ts` 的计数换成 Redis(接口已收在 consumeQuota 一处)。

## 部署(Vercel)

站点推送 master 自动部署。**激活 LLM 功能只需在 Vercel 项目配 3 个环境变量**(Settings → Environment Variables,Production 与 Preview 都配):

```
LLM_API_KEY=<密钥,来源见下方>
LLM_BASE_URL=https://api.huohuaapi.com/v1
LLM_MODEL=gemini-3.1-flash-lite
```

- 密钥来源:huohua 账号(本地参考 `H:/obisidian_hub/raw/小林面试笔记/model_bakeoff/huohua_key.txt`,密钥永不进仓库/前端)。
- 不配 `LLM_API_KEY` 时接口返回 `enabled:false`,前端按钮显示「暂未开放」,站点其余功能不受影响。
- 配好后验证:`curl -X POST https://agentalpha.top/api/llm-jd -H 'Content-Type: application/json' -d '{"jd":"<50字以上的JD>"}'`。

## 已接入的工具

- `/tools/jd-analyzer`:规则拆解结果之后「AI 深度拆解」卡(四节固定结构:人话翻译/隐藏考点/简历怎么改/准备顺序)。
- 防滥用:system prompt 声明 JD 仅为待分析材料;输出仅作展示不做指令;页面标注「大模型生成 · 需人工核验」。

## 故障切换(2026-09-29 实测)

中转站模型通道会整族故障(当天 gemini 系全部 503 model_temporarily_unavailable)。处置:改 Vercel 的 `LLM_MODEL` 为备用模型重新部署即可,零代码改动。实测可用的备选:

| 模型 | 实测 | 特点 |
| --- | --- | --- |
| `gemini-3.1-flash-lite`(主选) | 3.9s,≈¥0.004/次 | 最便宜最快 |
| `glm-5.3-flash` | 探活 200 | 备选一 |
| `deepseek-v4-flash` | 10.7s,带 reasoning | 备选二,四类 JD(算法/Infra/英文)实测输出质量高 |

健康检查:`curl -H "Authorization: Bearer <key>" .../v1/models` 看模型在列;真探活要发一次 1-token 请求(模型在列也可能 503)。

## 扩展下个工具时

- 新增 `app/api/llm-<tool>/route.ts`,复用 `lib/tools/llm-server.ts` 的 `consumeQuota/callLlm/cache*`;
- 额度三件套(全站/单 IP/浏览器)沿用同一套常量,不要在 route 里另起炉灶;
- 输出必须过「防编造」口径:推断标「大概率/可能」,指标位让用户填真实值。
