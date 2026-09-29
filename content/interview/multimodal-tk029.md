---
slug: multimodal-tk029
no: "929"
title: "如何构建一个多模态对话 Agent？请设计完整架构。"
question: "如何构建一个多模态对话 Agent？请设计完整架构。"
excerpt: "考察系统设计能力——能否从用户交互、多模态理解、对话管理、输出生成整条链路设计 Agent。"
tags: ["真题解析", "多模态"]
category: "multimodal"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 4
words: 1742
updated: "2026-09-29"
---

## 如何构建一个多模态对话 Agent？请设计完整架构。

#### 1️⃣ 考察意图

考察系统设计能力——能否从用户交互、多模态理解、对话管理、输出生成整条链路设计 Agent。

#### 2️⃣ 标准答

**架构设计：**

`用户输入（文本+图像/视频）**→ 输入解析器：格式统一+安全检查
→ 多模态编码器：CLIP ViT 编码图像 → 视觉 token
→ 对话管理器：维护对话历史+视觉 token cache
→ VLM 推理：视觉token+文本token → LLM 生成回复
→ 输出处理器：格式化输出+安全过滤
→ 返回用户`关键模块：**

1. **输入解析器**：支持文本、图像 URL/Base64、视频 URL。安全检查（图像大小<10MB、内容安全过滤）
2. **多模态编码器**：CLIP ViT-L/14 编码图像为 256 token。视频抽 32 帧编码。缓存编码结果避免重复计算
3. **对话管理器**：维护多轮对话历史。视觉 token 的 KV cache 管理——超过 5 轮释放旧图像的 cache
4. **VLM 推理**：LLaVA-1.5 或 Qwen-VL。支持 CoT prompt（先描述再推理）。流式输出降低首 token 延迟
5. **输出处理器**：安全过滤（PII 脱敏）+ 格式化（Markdown/JSON）+ 图像引用解析

**工程细节：**

- 延迟优化：图像编码 100ms + VLM 推理 500ms + 输出 200ms = 总延迟 ~800ms
- 内存管理：单用户会话视觉 cache 约 200MB，用 LRU 淘汰
- 并发处理：图像编码 batch（多用户共享 ViT），VLM 推理逐用户 streaming

#### 3️⃣ 答题模板

> "五模块架构：输入解析（格式统一+安全检查）→多模态编码（CLIP ViT→256 token+缓存）→对话管理（多轮历史+KV cache LRU）→VLM推理（CoT+流式输出）→输出处理（安全过滤+格式化）。延迟：编码100ms+推理500ms+输出200ms=~800ms。并发：ViT batch+VLM streaming。"

#### 4️⃣ 高频追问

**追问 1**：多轮对话中用户引用了之前上传的图，怎么处理？

> 三种方案：(1) 保留 cache——如果内存充足，保留所有图像的 KV cache，用户引用时直接 attend。代价：10 轮对话约 2GB 内存；(2) 重新编码——用户引用时重新加载图像并编码。代价：100ms 延迟；(3) 文本摘要——为每张图生成文本描述（"这是一张产品截图，显示..."），用户引用时用文本摘要替代视觉 token。代价：损失视觉细节。选择：1-5 轮用 cache，6-10 轮用摘要，10+ 轮用重新编码。

**追问 2**：如何支持流式输出（用户边等边看）？

> 用 streaming decoding：(1) VLM 生成第一个 token 后立即返回（首 token 延迟约 300ms）；(2) 后续 token 逐个返回（约 30ms/token）；(3) 前端用打字机效果显示。注意：视觉编码必须在生成前完成（不能流式编码），所以首 token 延迟 = 编码 100ms + 首token 300ms = 400ms。

#### 5️⃣ 避坑

- ❌ "每轮对话都重新编码图像" → ✅ "用 cache 缓存视觉 token 和 KV cache，避免重复编码。LRU 淘汰旧图像。"

#### 6️⃣ 简历呼应

- **有 Agent 项目**：从"多模态对话系统"切入，给出架构图和性能数据
- **校招无项目**：用 LLaVA + FastAPI 实现流式多模态对话 demo
- "LLaVA: Visual Instruction Tuning" (2023) / "Streaming LLM: Fast Generation with Attention Cache" (2023)

---
