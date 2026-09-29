---
slug: enterprise-tk716
no: "1616"
title: "redis 用过那些？mget 底层什么实现的？、zset怎么实现的"
question: "redis 用过那些？mget 底层什么实现的？、zset怎么实现的"
excerpt: "这道题看似基础，实则考察三个层次：第一层，是否真用过 Redis 核心数据结构（String、Hash、List、Set、ZSet、Bitmap、HyperLogLog），而非只背八股；第二层，对 mget 这种高频命令"
tags: ["真题解析", "通用与软实力"]
category: "enterprise"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 9
words: 4251
updated: "2026-09-29"
---

## redis 用过那些？mget 底层什么实现的？、zset怎么实现的

#### 1️⃣ 考察意图

这道题看似基础，实则考察三个层次：**第一层**，是否真用过 Redis 核心数据结构（String、Hash、List、Set、ZSet、Bitmap、HyperLogLog），而非只背八股；**第二层**，对 mget 这种高频命令的底层实现是否理解到“网络模型 + 哈希表批量查找”的粒度，而非只答“批量获取”；**第三层**，对 zset 的跳跃表实现是否清楚其插入/删除/范围查询的时间复杂度、内存布局，以及为什么不用红黑树。**刁钻点**在于：面试官会追问“mget 和 pipeline 区别”“zset 分数相同怎么排序”“跳跃表层数怎么定”，答好了能展示**系统设计思维**和**工程取舍**能力。

#### 2️⃣ 标准答

**Redis 常用数据结构**

- **String**：最基础，底层 SDS（Simple Dynamic String），支持整数编码（int）和 embstr/raw 编码，用于缓存、计数器、分布式锁。
- **Hash**：底层 ziplist（小数据）或 dict（大数据），适合存储对象字段。
- **List**：底层 quicklist（压缩链表 + 双向链表），用于消息队列、最新列表。
- **Set**：底层 intset（整数集合）或 dict，用于去重、交集/并集运算。
- **ZSet（Sorted Set）**：底层 **skiplist + dict**，skiplist 维护有序性，dict 维护成员到分数的映射。
- **Bitmap**：基于 String 的位操作，用于签到、活跃用户统计。
- **HyperLogLog**：概率数据结构，用 12KB 内存统计约 2^64 个元素的基数，误差 0.81%。
- **GEO**：基于 ZSet 实现，将经纬度编码为 Geohash 作为分数，支持附近的人查询。

**mget 底层实现**mget 命令接收多个 key，返回对应 value 列表。底层流程：

1. **网络层**：客户端一次性发送多个 key，Redis 在单线程事件循环中解析命令，避免多次 RTT（往返时延）。
2. **哈希表查找**：对每个 key，调用 `dictFind()` 在全局哈希表中查找，时间复杂度 O(1) 每个 key，整体 O(N)。
3. **批量返回**：将所有 value 打包成 RESP 协议数组返回。**工程取舍**：mget 比多次 get 节省 N-1 次网络开销，但若 key 数量过大（>1000），会阻塞 Redis 主线程，导致其他请求延迟飙升。**实际落地的坑**：生产环境曾遇到 mget 一次取 5000 个 key，导致 Redis 响应时间从 1ms 飙到 50ms。**解法**：限制单次 mget 的 key 数（如 100 个），或用 pipeline 分批次，或用 Redis Cluster 分散热点。

**zset 实现**zset 底层是 **skiplist + dict** 的组合结构：

- **dict**：存储 member -> score 的映射，用于 O(1) 的 ZSCORE 和 ZREM 操作。
- **skiplist**：按 score 排序存储所有元素，支持 O(log N) 的插入/删除/范围查询（ZRANGEBYSCORE）。**为什么用 skiplist 而不用红黑树**：
- **实现简单**：skiplist 代码量约 200 行，红黑树约 1000 行，且易调试。
- **范围查询友好**：skiplist 的链表结构天然支持顺序遍历，红黑树需要中序遍历。
- **内存开销**：skiplist 平均每个节点 1.33 个指针（概率层），红黑树每个节点 2 个指针 + 颜色位，实际差距不大。**skiplist 细节**：
- **层数**：每个节点层数由随机函数生成，概率 p=0.25，最大层数 32（Redis 5.0 后为 64）。
- **分数相同**：按字典序排序（member 的二进制比较），确保唯一性。
- **插入流程**：先通过 dict 检查 member 是否存在，若存在则更新分数并调整 skiplist 位置；若不存在，则生成新节点，随机层数，插入 skiplist 并更新 dict。**实际落地的坑**：zset 的 skiplist 在分数相同时依赖 member 字典序，若 member 是长字符串（如 UUID），比较开销大。**解法**：将 member 设计为短字符串或整数，或使用 Redis 7.0 的 `ZADD NX` 避免重复插入。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从三个层面回答：第一，Redis 常用数据结构包括 String、Hash、List、Set、ZSet、Bitmap、HyperLogLog，各自有适用场景；第二，mget 底层通过哈希表批量查找，时间复杂度 O(N)，但要注意单次 key 数过多会阻塞主线程，生产环境建议限制在 100 个以内；第三，zset 用 skiplist + dict 实现，skiplist 负责范围查询，dict 负责单点查询，选择 skiplist 而非红黑树是因为实现简单、范围查询友好。总结一句：Redis 的数据结构设计本质是**空间与时间的工程取舍**，理解底层才能用好。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：mget 和 pipeline 有什么区别？什么时候用哪个？

> **应对策略**：mget 是 Redis 服务端原子操作，一次性解析多个 key 并返回，但所有 key 必须在同一个 Redis 节点；pipeline 是客户端行为，将多个命令打包发送，服务端顺序执行，可以跨节点（如 Cluster 模式），但返回结果顺序需客户端保证。**取舍**：mget 适合单节点批量读，pipeline 适合混合操作（读+写）或跨节点场景。**实际案例**：在 Redis Cluster 中，mget 只能处理同一 slot 的 key，否则报错；pipeline 可以发送到不同节点，但需要客户端处理重定向。

**追问 2**：zset 的 skiplist 层数怎么确定？为什么最大层数是 32？

> **应对策略**：层数由随机函数生成，概率 p=0.25，最大层数 32（Redis 5.0 前）或 64（5.0 后）。公式：`randomLevel() { level = 1; while (random() < 0.25) level++; return min(level, ZSKIPLIST_MAXLEVEL); }`。**为什么是 32**：根据概率论，当元素数量为 2^32 时，期望最高层数为 32，而 Redis 单机最多存 2^32 个元素（约 40 亿），32 层足够覆盖。**工程取舍**：层数越高，查询越快，但内存开销越大；32 层是平衡点，实际生产环境平均层数约 1.33。

**追问 3**：zset 的 skiplist 和 dict 如何保证一致性？

> **应对策略**：通过事务性操作保证。插入时，先更新 dict（O(1)），再插入 skiplist（O(log N)），若 skiplist 插入失败（如内存不足），则回滚 dict。删除时同理，先删除 dict，再删除 skiplist。**实际坑**：Redis 是单线程，不存在并发问题，但若使用 Lua 脚本批量操作 zset，需注意脚本内原子性。**解法**：使用 `ZADD` 的 `NX`/`XX` 选项避免重复插入，或使用 `ZREMRANGEBYSCORE` 批量删除。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ 答“zset 底层只有跳跃表” → ✅ 正确答“zset 是 skiplist + dict 组合结构，skiplist 负责范围查询，dict 负责单点查询，缺一不可”。
- ❌ 答“mget 和 pipeline 一样” → ✅ 正确答“mget 是服务端原子操作，pipeline 是客户端打包，mget 只能单节点，pipeline 可跨节点”。
- ❌ 答“skiplist 比红黑树快” → ✅ 正确答“skiplist 和红黑树时间复杂度都是 O(log N)，但 skiplist 实现简单、范围查询友好，Redis 选择它是因为工程易维护”。

#### 6️⃣ 简历呼应

- **如果你有 Redis 项目**：从“生产环境 mget 限流”或“zset 排行榜性能优化”切入，展示你踩过的坑和解决方案（如限制 key 数、使用 pipeline 分片）。
- **如果你只做过传统数据库**：用“MySQL B+树 vs Redis skiplist”类比，强调 skiplist 在内存中的优势（无磁盘 IO、随机层数节省空间）。
- **如果你是校招无项目**：聚焦“手写 skiplist demo”或“Redis 源码分析”，展示你对 skiplist 层数随机化、dict 一致性等细节的理解，并附上 GitHub 链接。
- Redis 源码：`src/t_zset.c` 和 `src/server.h` 中的 zskiplistNode 结构体
- 《Redis 设计与实现》（黄健宏）第 7 章：跳跃表
- 论文：William Pugh, "Skip Lists: A Probabilistic Alternative to Balanced Trees" (1990)
- 博客：Redis 官方文档 `redis.io/commands/mget` 和 `redis.io/topics/data-types-intro`
- 工具：`redis-cli --bigkeys` 扫描大 key，结合 zset 的 skiplist 内存分析

---
