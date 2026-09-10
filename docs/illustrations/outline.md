# AgentAlpha Notes 配图清单

更新时间：2026-09-10

这批图分两种：手绘图负责先把概念讲明白，论文图负责把关键判断落到原始证据。论文图均来自原论文的 arXiv / ar5iv 公开图资产，正文保留原图文字并在图下给出原文链接。

## UniKeyX 手绘图

本批使用 UniKeyX 主机通道生成，固定 `gpt-image-2`、`low`、`1280×720`、16:9；提示词、批次结果和 SHA-256 回执在 `docs/illustrations/unikeyx/2026-09-10/`。生成结果已按文章复制进 `public/images/notes/`，逐张做过可读性检查。

| 图片 | 文章 | 画面任务 | QA |
| --- | --- | --- | --- |
| `attention-steps.png` | `llm-attention-context` | 输入、QK 匹配、权重、V 汇总 | 通过 |
| `rag-evidence-loop.png` | `agent-rag-why` | 问题到引用答案的证据链 | 通过 |
| `inference-three-stage.png` | `llm-inference-optimization` | 排队、Prefill、Decode 与指标 | 通过 |
| `vision-token-route.png` | `multimodal-to-transformer` | 图片到视觉 token 的路径 | 通过 |
| `data-mixture-loop.png` | `llm-data-mixture` | 清洗、去重、配比、评测闭环 | 通过 |
| `dpo-ppo-contrast.png` | `llm-dpo-vs-ppo` | 离线 DPO 与在线 PPO 对照 | 通过 |

## 论文原图

完整来源、定位、裁切说明和 SHA-256 见 [`paper-evidence/index.json`](./paper-evidence/index.json)。

| 文章 | 论文图 | 数量 |
| --- | --- | ---: |
| `llm-attention-context` | Attention Is All You Need Figure 1、4 | 2 |
| `agent-rag-why` / `rag-retrieval-pipeline` | RAG Figure 1、3 | 2 |
| `rag-rerank-and-hybrid` | ColBERT Figure 3 | 1 |
| `code-agent-green-tests` | SWE-bench Figure 1、2；SWE-agent Figure 1 | 3 |
| `agentic-rl-reward-hacking` / `agentic-rl-grpo-rollout` | DeepSeek-R1 Figure 1、3 | 2 |
| `llm-moe-routing` | Switch Transformer Figure 2 | 1 |
| `llm-training-stability` | LoRA Figure 1 | 1 |
| `multimodal-to-transformer` | LLaVA Figure 1 | 1 |
| `llm-data-mixture` | DataComp-LM Figure 2、4 | 2 |
| `llm-inference-optimization` | Efficiently Scaling Transformer Inference Figure 1 两个 panel | 2 |
| `llm-dpo-vs-ppo` | DPO Figure 1 | 1 |

合计 18 张论文图，覆盖 12 篇笔记；没有修改 Feishu 社区源文件，也没有把未审核课程草稿放进正文。
