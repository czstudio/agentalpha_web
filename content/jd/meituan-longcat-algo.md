---
slug: longcat-algo
company: meituan
title: 美团 · LongCat 大模型算法
role: 大模型算法
family: llm-algo
level: 校招 / 社招 1-3 年
summary: LongCat 大模型的后训练与评测岗：SFT/DPO 数据构造、reward 设计层层追问，线下评测与线上效果怎么对齐是重心。
cats: [finetune, eval]
qaSlugs: [meituan-sft-dpo-data, meituan-reward-design, meituan-grpo-why-not-ppo, meituan-ood-collapse, meituan-doc-distribution-shift, online-evaluation, llm-as-judge, golden-set]
keywords: [美团 LongCat, 美团大模型算法, LongCat 后训练, 美团算法岗面试]
updated: 2026-09-29
sourceUrl: https://www.nowcoder.com/feed/main/detail/19a96a361e5f4d8f86dd4e5a0f95477e
sourceName: 牛客（美团 26 秋招内推·含 LongCat）
---

## 这条 JD 在招什么人

做 LongCat 大模型后训练与效果评测的算法工程师。美团口径是业务落地色彩重：LongCat 最终要接到店、外卖、客服这些真实场景里，模型好坏直接由业务指标说话。这个岗位两头都要管：一头是 SFT、DPO 的数据构造与 RL 训练，一头是评测体系——线上效果怎么看、离线评测怎么对得上线上。美团面经在这个方向密度很高：数据怎么配、reward 怎么设、OOD 场景崩了怎么救、线上线下不一致怎么排查，每一环都有对应的面经方向。

## 业务场景推测

大概率是 LongCat 的对话与理解能力迭代：客服对话、到店评价理解、外卖场景的商家与用户文案任务；评测侧大概率要建线上线下一致性体系（置信度：中，基于公开业务布局推断）。美团场景数据的特点：短文本、口语化、地点与商品实体密集，配送与售后话术对安全性的要求高。

## 硬技能：必须会什么

- 后训练数据：SFT 与 DPO 数据怎么造、怎么配（[SFT/DPO 数据](/interview/qa/meituan-sft-dpo-data)）
- 偏好与奖励：reward 设计的常见坑（[reward 设计](/interview/qa/meituan-reward-design)）
- RL 训练：这个场景为什么选 GRPO 不选 PPO（[GRPO vs PPO](/interview/qa/meituan-grpo-why-not-ppo)）
- 稳定性：OOD 场景效果崩塌的判读与应对（[OOD 崩塌](/interview/qa/meituan-ood-collapse)）
- 评测：LLM 裁判的用法与失效场景（[LLM 裁判](/interview/qa/llm-as-judge)）、金标集怎么建（[金标集](/interview/qa/golden-set)）
- 线上评测：线上线下指标怎么对齐（[线上评测](/interview/qa/online-evaluation)）

## 加分项：什么能拉开差距

- 数据分布变化有实战：训练分布与线上分布漂移的监控和处理（[分布漂移](/interview/qa/meituan-doc-distribution-shift)）
- 业务指标与模型指标的映射经验：答准率提升怎么折算成客服转人工率下降
- 独立跑通过 DPO 或 GRPO，能展示数据规格与训练曲线
- 本地生活领域的实体理解经验（店名、菜品、地址）

## JD 没写但面试会问

- SFT 数据和 DPO 数据的构造差异、各要多少条（美团面经高频）
- reward 被钻空子怎么发现、怎么改
- 线下评测涨点、线上没效果，怎么排查（高频）
- OOD 请求效果崩了，数据层面怎么补
- LLM 裁判打分不可信怎么办

## 能力模型

| 层 | 内容 | 达标线 |
| --- | --- | --- |
| 基础层 | SFT/DPO/RL 流程 | 公式级理解 |
| 数据层 | 数据构造与配比 | 有完整方法论 |
| 评测层 | 离线评测、线上对齐 | 搭过评测集 |
| 业务层 | 场景指标折算 | 能对到业务指标 |

## 简历怎么改

- 训练经历写「数据-配置-指标」；评测经历写「集怎么建、信度怎么验」
- 线上线下对齐的经历直接写进第一行，这是最稀缺的经验
- 业务场景词显式写：客服、到店、外卖，帮面试官对号入座
- 别只写「负责模型效果」，写清楚哪次迭代带来了什么变化

## 项目建议

- 评测集复现：给一个开源对话模型建金标集，测 LLM 裁判与人工标注的一致率
- DPO 数据消融：不同偏好对构造方式的效果对比
- 美团全部方向的题库见[美团公司聚合页](/interview/company/meituan)
- 直接用[项目匹配器](/tools/project-matcher)按你的基础和可用时间生成方案

## 准备计划

- 7 天：后训练与评测[题库速答](/interview/qa)过两遍；数据构造类问题练到能画流程
- 21 天：建一个小型评测集并做裁判一致性实验；[简历体检](/tools/resume)
- 45 天：RL 训练与线上对齐专题补齐，用[差距测试](/tools/gap-test)定位短板，模拟面试三轮以上
