---
slug: hunyuan-agent
company: tencent
title: 腾讯 · 混元大模型应用开发（Agent 方向）
role: 大模型应用开发
family: agent-app
level: 校招 / 1-3 年
summary: 混元大模型在元宝与微信场景的 Agent 落地：多 Agent 协作、记忆系统与模型基础要求扎实。
cats: [agent, multiagent, basics, memory]
qaSlugs: [what-is-multi-agent, single-vs-multi, multi-agent-orchestration, agent-paradigm, agent-memory-hierarchy, what-is-moe, tencent-bm25-tfidf, what-is-transformer]
keywords: [腾讯混元应用, 腾讯大模型开发, 元宝 Agent 岗, 腾讯 AI 面试]
updated: 2026-09-28
---

## 这条 JD 在招什么人

在腾讯场景（元宝、微信生态、游戏 AI、社交内容）里把混元大模型做成 AI 助手和多 Agent 系统的工程师。腾讯这个方向的岗位有个特点：模型基础考得比其他厂重——Transformer 细节、MoE、位置编码这些「地基题」在面试里占比高，同时多智能体与记忆系统是高频的进阶区。

## 业务场景推测

大概率是元宝 App 的助手能力、微信场景的 AI 功能、或社交内容场景的 AIGC（置信度：中）。社交场景的特点是内容形态多（文本、语音、图像）和内容安全压力大，这两点会渗透进面试题。

## 硬技能：必须会什么

- 模型基础：Transformer 注意力机制、MoE 架构、自回归生成原理（腾讯面试的地基题，答不干净直接减分）
- 多 Agent 系统：角色切分、通信与编排、失败模式与兜底
- Agent 范式：ReAct、Plan-and-Execute、Reflection 的区别与适用
- 记忆系统：分层记忆、压缩、多轮对话状态管理
- 检索基础：字面检索原理（BM25/TF-IDF 是腾讯真题）、向量检索

## 加分项：什么能拉开差距

- 多 Agent 项目的真实踩坑：子 Agent 崩溃怎么兜底、状态怎么同步、什么情况下砍掉多 Agent 改回单 Agent
- 实时语音链路经验（元宝场景强相关）
- 对「为什么用多 Agent」有超出「人多力量大」的答案：上下文稀缺、角色混乱、并行收益

## JD 没写但面试会问

- Decoder-only 为什么成为主流架构（腾讯真题）
- BM25 对 TF-IDF 做了哪些优化（腾讯真题）
- 多个 Agent 同时改一个资源怎么避免冲突
- 多 Agent 系统常见的失败模式
- 长对话的上下文怎么管理、记忆什么时候写入

## 能力模型

| 层 | 内容 | 达标线 |
| --- | --- | --- |
| 基础层 | Transformer/MoE/采样 | 必须答得干净利落 |
| 工程层 | 后端服务、流式协议 | 有项目支撑 |
| Agent 层 | 多 Agent 编排、记忆 | 能讲设计取舍 |
| 业务层 | 内容安全、多模态场景 | 有意识即可 |

## 简历怎么改

- 模型基础不要在简历上「证明」，在面试里证明：简历上写「熟悉 Transformer」不如项目里写「实现了带掩码的 Attention 并验证正确性」
- 多 Agent 项目写清拓扑（几个角色、怎么通信）、失败处理、以及「为什么不用单 Agent」
- 每条经历自查：能不能扛住三层追问

## 项目建议

- 多 Agent 协作系统：设计文档 + 原型 + 失败模式分析（站内项目卡有现成框架）
- 从零实现带掩码的 Attention：腾讯地基题的最好证明
- 用[项目匹配器](/tools/project-matcher)拿个性化方案

## 准备计划

- 7 天：LLM 基础 14 题 + 多智能体题全过；项目按「拓扑-失败处理-取舍」重写
- 21 天：记忆系统 + Agent 范式补齐；[简历体检](/tools/resume)；错题重做
- 45 天：[Agent 应用开发路线](/roadmap/agent-developer)完整走一遍，模型基础章节过两遍
