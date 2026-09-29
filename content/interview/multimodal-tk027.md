---
slug: multimodal-tk027
no: "927"
title: "在 RAG 场景中，多模态 Agent 如何实现「以图搜图「或「以文搜图「"
question: "在 RAG 场景中，多模态 Agent 如何实现「以图搜图「或「以文搜图「"
excerpt: "考察多模态检索的系统设计能力。刁钻点：需要区分"语义检索"（CLIP）和"精确检索"（感知哈希），以及何时用哪种。"
tags: ["真题解析", "多模态"]
category: "multimodal"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 4
words: 1530
updated: "2026-09-29"
---

## 在 RAG 场景中，多模态 Agent 如何实现「以图搜图「或「以文搜图「

#### 1️⃣ 考察意图

考察多模态检索的系统设计能力。刁钻点：需要区分"语义检索"（CLIP）和"精确检索"（感知哈希），以及何时用哪种。

#### 2️⃣ 标准答

**以文搜图（Text-to-Image Retrieval）：**

1. 文本编码：用 CLIP Text Encoder 将查询文本编码为 1024 维向量
2. 向量检索：在图像向量库（Milvus/Qdrant）中做 ANN 搜索，返回 top-K
3. 重排序：可选，用 Cross-Encoder 精排
4. 返回结果：top-K 图像 URL + 相似度分数

**以图搜图（Image-to-Image Retrieval）：**

1. 图像编码：用 CLIP Image Encoder 将查询图像编码为 1024 维向量
2. 向量检索：同上
3. 可选精确检索：感知哈希（pHash）做精确去重

**多模态 RAG 架构：**

`用户查询（文本/图像）→ CLIP编码 → 向量检索(Milvus) → top-K图像**→ VLM理解图像内容 → LLM生成回答（引用图像）`关键工程细节：**

- 向量库：Milvus/Qdrant，IVF_FLAT索引，1024维，余弦相似度
- 批量编码：用 batch inference 编码百万级图像，约 1000 img/s（A100）
- 混合检索：CLIP 语义检索 + BM25 文本检索（如果图像有文本标注），用 RRF 融合
- 增量更新：新图像编码后插入向量库，无需全量重建

#### 3️⃣ 答题模板

> "以文搜图：CLIP Text Encoder 编码查询→Milvus ANN 检索→top-K。以图搜图：CLIP Image Encoder 编码查询图→同上。多模态 RAG：查询→CLIP编码→向量检索→VLM理解→LLM回答。混合检索用 CLIP+BM25+RRF。增量更新直接插入新向量。"

#### 4️⃣ 高频追问

**追问 1**：CLIP 检索的精度够用吗？需要重排序吗？

> CLIP 检索 Recall@10 约 85%（在 1M 图库中），对于大多数场景够用。但如果需要高精度（如法律证据检索），加 Cross-Encoder 重排序可提升到 92%+。重排序只对 top-100 做，延迟增加约 200ms。

**追问 2**：百万级图像怎么快速编码？

> 用 batch inference：A100 上 batch_size=256，CLIP ViT-L 编码速度约 1000 img/s。100 万图像约 17 分钟。增量更新只编码新图像。用多 GPU 并行可加速到 2-3 分钟。

#### 5️⃣ 避坑

- ❌ "用 ResNet 特征做图像检索" → ✅ "ResNet 特征没有语言对齐能力，不支持'以文搜图'。必须用 CLIP。"

#### 6️⃣ 简历呼应

- **有检索项目**：从"多模态检索系统"切入，给出 Recall@K 和延迟数据
- **校招无项目**：用 CLIP+Milvus 搭建以图搜图 demo
- "Learning Transferable Visual Models From Natural Language Supervision" (CLIP, 2021) / "Milvus: A Purpose-Built Vector Data Management System" (2021)

---
