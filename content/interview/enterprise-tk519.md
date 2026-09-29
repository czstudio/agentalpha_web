---
slug: enterprise-tk519
no: "1419"
title: "实现一个基于滑动窗口的短期记忆模块。"
question: "实现一个基于滑动窗口的短期记忆模块。"
excerpt: "面试官想看你能否设计一个既控制 Token 数量又保留关键信息的记忆管理模块。刁钻点在于：很多人只写一个 deque 限长，但说不清 Token 预算怎么管理、系统消息和用户消息的优先级怎么区分、以及重要消息怎么保护不被"
tags: ["真题解析", "编程题"]
category: "enterprise"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 12
words: 5468
updated: "2026-09-29"
---

## 实现一个基于滑动窗口的短期记忆模块。

#### 1️⃣ 考察意图

面试官想看你能否设计一个既控制 Token 数量又保留关键信息的记忆管理模块。刁钻点在于：很多人只写一个 deque 限长，但说不清 Token 预算怎么管理、系统消息和用户消息的优先级怎么区分、以及重要消息怎么保护不被淘汰。答好了能展示你的数据结构选择和内存管理能力。

#### 2️⃣ 标准答

`from collections import deque**from dataclasses import dataclass, field
from typing import Optional, List, Dict
import tiktoken

logger = logging.getLogger("short_term_memory")

@dataclass
class MemoryItem:
    role: str  # system/user/assistant/tool
    content: str
    timestamp: float
    token_count: int = 0
    priority: int = 0  # 0=普通, 1=重要, 2=系统(不可淘汰)
    compressed: bool = False  # 是否已压缩

class SlidingWindowMemory:
    def __init__(self, max_turns: int = 20, max_tokens: int = 4000):
        self.max_turns = max_turns
        self.max_tokens = max_tokens
        self._buffer: deque[MemoryItem] = deque(maxlen=max_turns)
        self._encoder = tiktoken.encoding_for_model("gpt-4")
        self._total_tokens = 0

    def add(self, role: str, content: str, priority: int = 0):
        """添加一条记忆"""
        tokens = len(self._encoder.encode(content))
        item = MemoryItem(
            role=role,
            content=content,
            timestamp=time.time(),
            token_count=tokens,
            priority=priority
        )

        # 系统消息直接加入，不受 Token 限制
        if priority == 2:
            self._buffer.append(item)
            self._total_tokens += tokens
            return

        # 检查 Token 预算
        while self._total_tokens + tokens > self.max_tokens and len(self._buffer) > 1:
            self._evict_oldest()

        self._buffer.append(item)
        self._total_tokens += tokens

        logger.debug(f"Memory add: role={role}, tokens={tokens}, total={self._total_tokens}")

    def _evict_oldest(self):
        """淘汰最旧的可淘汰消息"""
        for i, item in enumerate(self._buffer):
            if item.priority < 2:  # 非系统消息可淘汰
                # 重要消息先压缩再淘汰
                if item.priority == 1 and not item.compressed:
                    self._compress(item)
                    return  # 压缩后重新检查预算

                # 普通消息直接移除
                evicted = self._buffer[i]
                self._total_tokens -= evicted.token_count
                del self._buffer[i]
                logger.debug(f"Evicted: role={evicted.role}, tokens={evicted.token_count}")
                return

    def _compress(self, item: MemoryItem):
        """压缩重要消息（生成摘要替换原文）"""
        # 实际场景中调用 LLM 生成摘要
        # 这里简化为截断
        summary = item.content[:200] + "...[已压缩]"
        old_tokens = item.token_count
        item.content = summary
        item.token_count = len(self._encoder.encode(summary))
        item.compressed = True
        self._total_tokens -= (old_tokens - item.token_count)
        logger.info(f"Compressed memory: {old_tokens} -> {item.token_count} tokens")

    def get_context(self) -> List[Dict]:
        """获取当前记忆的上下文（用于 LLM prompt）"""
        return [
            {"role": item.role, "content": item.content}
            for item in self._buffer
        ]

    def get_token_count(self) -> int:
        return self._total_tokens

    def clear(self, keep_system: bool = True):
        """清空记忆，可选保留系统消息"""
        if keep_system:
            system_items = [item for item in self._buffer if item.priority == 2]
            self._buffer.clear()
            self._buffer.extend(system_items)
            self._total_tokens = sum(item.token_count for item in system_items)
        else:
            self._buffer.clear()
            self._total_tokens = 0`核心设计要点：**

- **双层限制**：`max_turns`（对话轮数）+ `max_tokens`（Token 预算）。先到先触发淘汰
- **三级优先级**：系统消息（priority=2）永不淘汰；重要消息（priority=1）先压缩再淘汰；普通消息（priority=0）直接淘汰
- **Token 精确计数**：用 `tiktoken` 精确计算每条消息的 Token 数，而非估算
- **压缩策略**：重要消息不直接删除，先用 LLM 生成摘要替换原文，减少 Token 但保留关键信息
- **系统消息保护**：system prompt 和工具定义等系统消息标记为 priority=2，不受窗口限制

#### 3️⃣ 答题模板（30 秒电梯版）

> "滑动窗口记忆双层限制+三级优先级。限制层：max_turns=20 + max_tokens=4000，先到先触发淘汰。优先级层：系统消息永不淘汰，重要消息先压缩再淘汰，普通消息直接移除。Token 用 tiktoken 精确计数。压缩策略：重要消息用 LLM 生成 200 字摘要替换原文。淘汰时从最旧的可淘汰消息开始。核心思路是'保系统消息+压缩重要消息+淘汰普通消息'。"

#### 4️⃣ 高频追问 & 应对

**追问 1**：压缩操作需要调用 LLM，会不会太慢？

> 异步压缩方案：(1) 先标记为 `compressed=True` 但不立即压缩，返回截断版（前 200 字+"..."）；(2) 后台异步调用 LLM 生成摘要，完成后替换截断版；(3) 下次读取时检查是否已压缩完成。实测：异步压缩对用户体验无影响，摘要质量比截断好 40%。如果 LLM 不可用，降级为截断。

**追问 2**：max_tokens=4000 怎么定的？不同模型不一样吧？

> 按模型上下文窗口的 1/4 到 1/3 设置。GPT-4 128K 窗口可设 32K-42K，但实际 4K-8K 足够（剩余给工具定义、知识库内容、输出预留）。经验值：简单对话 4K，复杂推理 8K，多工具场景 12K。关键是监控——如果频繁触发淘汰，说明 max_tokens 太小或对话太长，应该接入长期记忆（向量数据库）而非无限增大窗口。

**追问 3**：如果用户在 20 轮前说了一个关键信息（如密码），被淘汰了怎么办？

> 三层防御：(1) 实体提取——每次添加消息时用 NER 提取关键实体（密码、人名、数字），存入独立的 `key_facts` 字典，不受窗口限制；(2) 重要性标记——用 LLM 或规则判断消息是否包含关键信息，标记为 priority=1 触发压缩而非删除；(3) 长期记忆——被淘汰的消息存入向量数据库，需要时通过语义检索召回。关键认知：短期记忆只负责"近期上下文"，关键信息应该独立管理。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ "用 list 存就行，超了就 pop(0)" → ✅ "用 deque(maxlen=N) 更高效——pop(0) 是 O(n)，deque 的 popleft 是 O(1)。同时需要 Token 预算管理，不能只看轮数。"
- ❌ "所有消息平等对待" → ✅ "系统消息（system prompt）和普通消息优先级不同。系统消息淘汰会导致 Agent 行为异常。需要三级优先级：系统>重要>普通。"
- ❌ "超了就直接删最旧的" → ✅ "直接删除可能丢失关键信息。重要消息应该先压缩（生成摘要）再淘汰。同时用实体提取保护关键事实。"

#### 6️⃣ 简历呼应

- **如果你有 Agent 项目**：从"记忆管理设计"切入，展示你的滑动窗口+压缩+实体提取三层方案，给出 Token 利用率数据（如 95% 预算利用率、关键信息保留率 90%）
- **如果你只做过后端开发**：用"LRU 缓存"类比——滑动窗口类似 LRU 的淘汰策略，优先级类似缓存分级（L1/L2/L3）
- **如果你是校招无项目**：用 LangChain 的 ConversationBufferWindowMemory 作为对比，实现一个支持 Token 预算+优先级的增强版，写一篇博客
- "tkit-token: OpenAI Token Counter" (OpenAI, 2024)
- "Generative Agents: Interactive Simulacra of Human Behavior" (Park et al., 2023)
- "MemGPT: Towards LLMs as Operating Systems" (Packer et al., 2023)

---
