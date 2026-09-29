---
slug: pdd-dpo-beta
question: "讲讲 DPO 算法及 beta 的作用。"
oneLine: "DPO把奖励最大化重参数化为直接偏好优化，beta作为隐式 KL 惩罚系数，控制策略偏离参考模型的强度：大则保守，小则激进易跑偏。"
category: jingchang
company: pdd, openai
track: agent-algo
tags: [DPO, 偏好优化, 大模型面试]
minutes: 5
order: 304
updated: 2026-09-29
deep: 
---

## 先这样答

DPO 的核心是把奖励最大化重参数化为直接偏好优化。它比较偏好答案 y_w 和非偏好答案 y_l 相对于参考模型的概率变化。损失函数是 loss = -log sigmoid(beta x[(log pi(y_w)/pi_ref(y_w)) - (log pi(y_l)/pi_ref(y_l))])。其中，pi 是当前策略模型，pi_ref 是参考模型。

beta 控制当前策略偏离参考模型的强度。beta 大时，模型更保守，更贴近 SFT 模型。beta 小时，模型更激进，但更容易跑偏。答题时可以把 beta 直觉地理解成隐式 KL 惩罚系数。它决定模型在学习偏好时，要多强地约束自己不要偏离参考模型。

## 面试官会怎么追问

- **「DPO 的 loss 里，为什么要同时出现当前模型和参考模型？」** 当前模型表示正在优化的策略。参考模型提供比较基准。loss 比较两者对偏好答案和非偏好答案的概率变化。

- **「beta 变大以后，模型会发生什么？」** beta 变大，偏离参考模型的约束更强。模型会更保守，更贴近 SFT 模型。

- **「beta 变小以后，是不是一定更好？」** 不是。beta 变小会让模型更激进。模型虽然更容易偏向偏好答案，但也更容易跑偏。

## 回答的坑

- 不要只说 beta 是一个超参数，要说清它控制偏离参考模型的强度，并对应隐式 KL 惩罚。
- 不要把 beta 变大说成模型一定更好，它代表更保守地贴近 SFT 模型。