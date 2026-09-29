---
slug: enterprise-tk518
no: "1418"
title: "用 Python 实现一个工具路由器，根据用户意图选择对应工具。"
question: "用 Python 实现一个工具路由器，根据用户意图选择对应工具。"
excerpt: "面试官想看你能否设计一个既准确又高效的工具路由系统。刁钻点在于：很多人只写 if-else 或关键词匹配，但说不清 Embedding 路由的阈值怎么定、如何处理"用户意图不明确"的情况、以及如何缓存热门路由结果减少延迟"
tags: ["真题解析", "编程题"]
category: "enterprise"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 15
words: 6933
updated: "2026-09-29"
---

## 用 Python 实现一个工具路由器，根据用户意图选择对应工具。

#### 1️⃣ 考察意图

面试官想看你能否设计一个既准确又高效的工具路由系统。刁钻点在于：很多人只写 if-else 或关键词匹配，但说不清 Embedding 路由的阈值怎么定、如何处理"用户意图不明确"的情况、以及如何缓存热门路由结果减少延迟。答好了能展示你的检索系统设计和性能优化能力。

#### 2️⃣ 标准答

`import numpy as np**from dataclasses import dataclass
from typing import List, Optional, Dict, Tuple
import hashlib
import time
import logging

logger = logging.getLogger("tool_router")

@dataclass
class ToolMeta:
    name: str
    description: str
    keywords: List[str]
    embedding: Optional[np.ndarray] = None
    call_count: int = 0
    avg_latency: float = 0.0

@dataclass 
class RouteResult:
    tool_name: str
    confidence: float
    fallback: Optional[str] = None  # 备选工具

class ToolRouter:
    def __init__(self, embedding_client, redis_client=None):
        self.tools: Dict[str, ToolMeta] = {}
        self.embedding_client = embedding_client
        self.redis = redis_client  # 可选缓存
        self.confidence_threshold = 0.65  # 置信度阈值
        self.top_k = 3  # 返回 Top-K 候选
        self.cache_ttl = 3600  # 缓存 1 小时

    def register(self, name: str, description: str, keywords: List[str] = None):
        """注册工具"""
        embedding = self.embedding_client.embed(description)
        self.tools[name] = ToolMeta(
            name=name,
            description=description,
            keywords=keywords or [],
            embedding=embedding
        )
        logger.info(f"Registered tool: {name}")

    def route(self, query: str) -> Optional[RouteResult]:
        """根据用户查询路由到最合适的工具"""

        # 步骤1: 检查缓存
        cache_key = self._cache_key(query)
        if self.redis:
            cached = self.redis.get(cache_key)
            if cached:
                result = RouteResult(
                    tool_name=cached.decode(),
                    confidence=1.0,
                    fallback=None
                )
                logger.info(f"Cache hit: {query[:50]} -> {result.tool_name}")
                return result

        # 步骤2: 关键词快速匹配（O(n)，延迟 <1ms）
        keyword_match = self._keyword_match(query)
        if keyword_match and keyword_match[1] >= 0.9:
            result = RouteResult(
                tool_name=keyword_match[0],
                confidence=keyword_match[1],
                fallback=keyword_match[2] if len(keyword_match) > 2 else None
            )
            self._cache(cache_key, result.tool_name)
            return result

        # 步骤3: Embedding 语义匹配（延迟 50-100ms）
        query_embedding = self.embedding_client.embed(query)
        scores = []

        for name, tool in self.tools.items():
            # 余弦相似度
            sim = np.dot(query_embedding, tool.embedding) / (
                np.linalg.norm(query_embedding) * np.linalg.norm(tool.embedding)
            )
            # 关键词加权：如果 query 包含工具关键词，加分
            keyword_boost = sum(0.05 for kw in tool.keywords if kw in query.lower())
            final_score = sim + keyword_boost

            scores.append((name, final_score, sim))

        scores.sort(key=lambda x: x[1], reverse=True)

        # 步骤4: 阈值判断
        top = scores[0] if scores else None
        if top and top[1] >= self.confidence_threshold:
            result = RouteResult(
                tool_name=top[0],
                confidence=top[1],
                fallback=scores[1][0] if len(scores) > 1 else None
            )
            self._cache(cache_key, result.tool_name)
            logger.info(f"Routed: {query[:50]} -> {result.tool_name} (conf={top[1]:.3f})")
            return result

        # 步骤5: 低置信度 → 拒绝路由，要求用户澄清
        logger.info(f"Low confidence routing: {query[:50]}, top_score={top[1] if top else 0:.3f}")
        return None

    def _keyword_match(self, query: str) -> Optional[Tuple]:
        """关键词精确匹配（快速路径）"""
        query_lower = query.lower()
        best_match = None
        best_score = 0
        fallback = None

        for name, tool in self.tools.items():
            for kw in tool.keywords:
                if kw in query_lower:
                    score = len(kw) / len(query_lower)  # 关键词占比越高分越高
                    if score > best_score:
                        best_score = score
                        best_match = name

        if best_score >= 0.9:
            return (best_match, best_score, fallback)
        return None

    def _cache_key(self, query: str) -> str:
        """生成缓存 key"""
        return f"tool_route:{hashlib.md5(query.encode()).hexdigest()}"

    def _cache(self, key: str, value: str):
        """写入缓存"""
        if self.redis:
            self.redis.setex(key, self.cache_ttl, value)

    def get_stats(self) -> Dict:
        """获取路由统计"""
        return {
            name: {
                "call_count": tool.call_count,
                "avg_latency": tool.avg_latency,
                "description": tool.description[:50]
            }
            for name, tool in self.tools.items()
        }`核心设计要点：**

- **两级路由**：先关键词匹配（<1ms），匹配不到再用 Embedding（50-100ms）。80% 的查询能命中关键词快速路径
- **置信度阈值**：`0.65` 以下拒绝路由，返回 None 让 Agent 要求用户澄清。避免低质量路由
- **关键词加权**：Embedding 相似度 + 关键词匹配加分。如果 query 包含工具关键词，在 Embedding 分数上加 0.05/词
- **缓存**：Redis 缓存热门路由结果，命中率 30-50%，减少 Embedding 调用成本
- **Top-K 候选**：返回主选+备选工具，Agent 可以在主选失败时自动切换

#### 3️⃣ 答题模板（30 秒电梯版）

> "工具路由器两级设计。第一级关键词匹配——<1ms，覆盖 80% 查询。第二级 Embedding 语义匹配——50-100ms，用余弦相似度+关键词加权。置信度阈值 0.65，低于则拒绝路由要求用户澄清。Redis 缓存热门路由结果，命中率 30-50%。返回 Top-K 候选支持工具切换。核心思路是'快速路径优先，语义兜底，低质量拒绝'。"

#### 4️⃣ 高频追问 & 应对

**追问 1**：Embedding 路由的阈值 0.65 怎么定的？太高或太低有什么影响？

> 阈值调优方法：(1) 用标注数据集测试不同阈值下的准确率和召回率，画 PR 曲线选 F1 最高的点；(2) 实测：0.5 以下误路由率 >20%（用户问"天气"被路由到邮件工具），0.8 以上漏路由率 >30%（语义相近但表述不同）。0.65 是大多数场景的平衡点。业务调整：高风险场景（如金融工具）调高到 0.8，低风险场景（如查询类）调低到 0.5。

**追问 2**：如果工具有几百个，Embedding 计算会不会很慢？

> 优化方案：(1) 预计算——工具描述的 Embedding 在注册时一次性计算并存储，路由时只需计算 query 的 Embedding（1次），然后做矩阵乘法（numpy 100 个工具 <1ms）；(2) 向量索引——工具数 >1000 时用 FAISS 建索引，查询延迟 <5ms；(3) 分组路由——先按大类（如"文件操作"/"网络请求"/"数据分析"）路由，再在类内精确匹配，减少计算量。

**追问 3**：用户意图不明确时（比如"帮我看看"），怎么处理？

> 三层处理：(1) 返回 None——Agent 回复"您可以让我：1.查询文件 2.发送邮件 3.分析数据，请问需要哪个？"(2) 返回 Top-3 候选——Agent 回复"您是想：1.查询库存 2.查看订单 3.查看报表 吗？"(3) 用 LLM 做意图澄清——将低置信度路由结果和对话历史传给 LLM，让 LLM 生成自然的澄清问题。推荐方案(2)，既给了选项又不增加 LLM 调用成本。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ "用 if-else 匹配关键词就行" → ✅ "关键词匹配是快速路径，但无法处理同义表述（如'帮我查下库存' vs '库存还有多少'）。需要 Embedding 语义匹配作为兜底。"
- ❌ "阈值设 0.5 就行，越高越好" → ✅ "阈值太高会漏路由（用户表述稍有不同就匹配不到），太低会误路由。需要用标注数据调优，通常 0.6-0.7 是平衡区间。"
- ❌ "每次都计算所有工具的 Embedding" → ✅ "工具描述的 Embedding 在注册时预计算并存储。路由时只需计算 query 的 Embedding（1次），然后做向量内积（<1ms）。"

#### 6️⃣ 简历呼应

- **如果你有 Agent 项目**：从"工具路由系统"切入，展示你的两级路由设计，给出路由准确率（如 92%）、平均延迟（如 12ms）、缓存命中率（如 35%）
- **如果你只做过搜索/推荐**：用"召回-排序"类比——关键词匹配类似召回，Embedding 相似度类似排序。强调检索系统设计能力是通用的
- **如果你是校招无项目**：用 sentence-transformers + FAISS 实现一个工具路由 demo，测试不同阈值和 Embedding 模型的效果，写一篇博客
- "Sentence-BERT: Sentence Embeddings using Siamese BERT-Networks" (Reimers et al., 2019)
- "FAISS: A Library for Efficient Similarity Search" (Johnson et al., 2019)
- "Toolformer: Language Models Can Teach Themselves to Use Tools" (Schick et al., 2023)

---
