---
slug: multimodal-tk025
no: "925"
title: "比较 BLIP-2、LLaVA、MiniGPT-4、Qwen-VL 的架构异同，并分析各自适用场景。"
question: "比较 BLIP-2、LLaVA、MiniGPT-4、Qwen-VL 的架构异同，并分析各自适用场景。"
excerpt: "面试官想看你能否从"桥梁设计、训练策略、能力边界"三个维度系统对比四款主流 VLM，而非简单列举参数量。刁钻点在于：很多人只答"BLIP-2 用 Q-Former，LLaVA 用线性投影"，但说不清 MiniGPT-4"
tags: ["真题解析", "多模态"]
category: "multimodal"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 7
words: 3496
updated: "2026-09-29"
---

## 比较 BLIP-2、LLaVA、MiniGPT-4、Qwen-VL 的架构异同，并分析各自适用场景。

#### 1️⃣ 考察意图

面试官想看你能否从"桥梁设计、训练策略、能力边界"三个维度系统对比四款主流 VLM，而非简单列举参数量。刁钻点在于：很多人只答"BLIP-2 用 Q-Former，LLaVA 用线性投影"，但说不清 MiniGPT-4 和 BLIP-2 的区别（MiniGPT-4 也是 Q-Former 但训练策略不同），以及 Qwen-VL 的"统一架构"相比"双塔+桥梁"的本质优势。答好了能展示你对 VLM 架构演进的深度理解。

#### 2️⃣ 标准答

**架构对比矩阵：**

| 维度 | BLIP-2 | LLaVA | MiniGPT-4 | Qwen-VL |
|---|---|---|---|---|
| 视觉编码器 | ViT-G/14 (冻结) | CLIP ViT-L/14 (冻结) | ViT-G/14 (冻结) | ViT (可训练) |
| 桥梁模块 | Q-Former (188M) | 2层MLP (~20M) | Q-Former + 线性 (~190M) | Cross-Attention |
| LLM | OPT/Qwen (冻结) | Vicuna (可训练) | Vicuna (冻结→LoRA) | Qwen (可训练) |
| 视觉token数 | 32 (固定) | 256-576 | 32 (固定) | 动态 (变长) |
| 训练阶段 | 2阶段 | 2阶段 | 4阶段 | 3阶段 |
| 训练硬件 | 1×A100 | 8×A100 | 1×A100 | 64×A100 |
| 高分辨率 | 不支持 | 有限(448) | 不支持 | 原生(1280) |
| 多图交错 | 不支持 | 有限 | 不支持 | 原生支持 |

**核心差异分析：**

**1. BLIP-2 vs MiniGPT-4：同样用 Q-Former 但训练策略不同**

- BLIP-2 的 Q-Former 用三任务预训练（对比+匹配+生成），再训练到 LLM 的投影层
- MiniGPT-4 直接复用 BLIP-2 的 Q-Former 权重，只训练一个额外的线性层将 Q-Former 输出映射到 Vicuna。相当于"BLIP-2 预训练 + 一步对齐"
- 效果差异：MiniGPT-4 在对话能力上强于 BLIP-2（因为 Vicuna 比 OPT 更擅长对话），但在 OCR 上两者都很弱（32 token 瓶颈）

**2. LLaVA vs Qwen-VL：简单投影 vs 统一架构**

- LLaVA 的设计哲学是"LLM 足够强，简单投影就行"——用 2 层 MLP 把 ViT 输出映射到 LLM 空间，端到端微调 LLM。优势是架构简单、社区生态好
- Qwen-VL 的设计哲学是"视觉和语言需要深度融合"——ViT 可训练（端到端学习视觉表征），Cross-Attention 让 LLM 每层都能 attend 到视觉特征。优势是精度高（尤其在 OCR/文档理解），但训练成本高 8 倍
- 效果差异：在 TextVQA 上 Qwen-VL（62.3%）显著优于 LLaVA-1.5（58.2%），但在通用 VQA v2 上差异小（Qwen-VL 78.2% vs LLaVA 78.5%）

**3. 适用场景推荐：**

| 场景 | 推荐模型 | 原因 |
|---|---|---|
| 资源受限（单卡） | BLIP-2/MiniGPT-4 | 只训练 Q-Former，1×A100 可训练 |
| 通用多模态对话 | LLaVA-1.5 | 架构简单、社区活跃、效果均衡 |
| OCR/文档理解 | Qwen-VL | 高分辨率+动态token，TextVQA 最优 |
| 多图推理 | Qwen-VL | 原生支持图文交错输入 |
| 快速原型验证 | LLaVA + LoRA | LoRA 微调快，2×A100 即可 |
| 生产环境部署 | Qwen-VL | 精度最高，但需要 64×A100 训练成本 |

#### 3️⃣ 答题模板（30 秒电梯版）

> "四款 VLM 核心差异在桥梁设计和训练策略。BLIP-2 用 Q-Former 桥接冻结的 ViT 和 LLM，参数效率高但 32 token 是瓶颈。MiniGPT-4 复用 BLIP-2 的 Q-Former 加一步对齐，工程更简单。LLaVA 用 2 层 MLP 简单投影，端到端微调 LLM，效果均衡且社区好。Qwen-VL 用统一架构，ViT 可训练+Cross-Attention，OCR 最强但训练成本高 8 倍。选型：资源受限选 BLIP-2，通用选 LLaVA，OCR 选 Qwen-VL。趋势：从复杂桥梁到简单投影再到统一架构。"

#### 4️⃣ 高频追问 & 应对

**追问 1**：LLaVA 的简单投影为什么能超过 BLIP-2 的复杂 Q-Former？

> 两个原因：(1) 视觉 token 数量——LLaVA 256 token vs BLIP-2 32 token，信息保留更完整。在 TextVQA 上差距最大（58% vs 35%），因为 OCR 需要更多视觉细节；(2) LLM 微调——LLaVA 端到端微调 Vicuna，让 LLM 适应视觉输入；BLIP-2 冻结 LLM，LLM 无法调整以理解视觉信息。实验：LLaVA 冻结 LLM 只训投影层时，VQA v2 从 48% 降到 35%，说明 LLM 微调是关键。

**追问 2**：Qwen-VL 的 Cross-Attention 具体加在 LLM 的哪里？

> 加在 LLM 每个 Transformer 层的 self-attention 之后、FFN 之前。结构：`Input → Self-Attention → Cross-Attention(attend to ViT output) → FFN → Output`。Cross-Attention 的 K/V 来自 ViT 的输出（256+ token），Q 来自 LLM 的当前 token。这样每层 LLM 都能"看到"视觉信息，而非只在输入层做一次拼接。代价：参数量增加约 10%（每层多一个 cross-attention），但精度提升显著（TextVQA +4%）。

**追问 3**：如果要做多模态 Agent，选哪个 VLM 做基座？

> 取决于 Agent 的任务类型：(1) 对话型 Agent（如多模态客服）→ LLaVA-1.5，对话能力强、社区支持好、LoRA 微调方便；(2) 文档处理 Agent（如财报分析）→ Qwen-VL，OCR 和文档理解最强；(3) 工具调用 Agent（如截图分析+操作 UI）→ Qwen-VL，高分辨率能识别 UI 元素细节；(4) 实时 Agent（如视频流处理）→ LLaVA + 量化，推理速度快。综合考虑：Qwen-VL 在 Agent 场景更全能，但训练成本高；LLaVA 更灵活，适合快速迭代。

#### 5️⃣ 避坑

- ❌ "参数量越大效果越好" → ✅ "LLaVA（7B+20M投影层）在多数任务上超过 BLIP-2（7B+188M Q-Former）。关键是视觉 token 数和 LLM 微调，不是桥梁参数量。"
- ❌ "Qwen-VL 全面碾压 LLaVA" → ✅ "Qwen-VL 在 OCR/文档上强，但通用 VQA 上两者接近。LLaVA 的社区生态、微调便利性是 Qwen-VL 不具备的。选型要看场景。"

#### 6️⃣ 简历呼应

- **有 VLM 项目**：从"架构选型对比"切入，给出在特定任务上各模型的具体数据
- **校招无项目**：在 VQA v2+TextVQA 上对比 LLaVA 和 Qwen-VL，写一篇博客
- "BLIP-2" (Li et al., 2023) / "LLaVA" (Liu et al., 2023) / "MiniGPT-4" (Zhu et al., 2023) / "Qwen-VL" (Bai et al., 2023)

---
