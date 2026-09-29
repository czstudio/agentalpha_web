---
slug: realtime-voice-pipeline
question: 实时语音 Agent 的链路是什么？流式 ASR 和 TTS 怎么拼？
oneLine: 实时语音链路分级联和端到端两类，流式拼接的核心是服务端 VAD 断句与客户端回声消除配合实现全双工打断，底层首选 WebRTC 避免 TCP 队头阻塞。
category: jingchang
company: bytedance
track: agent-dev
tags: [语音 Agent, WebRTC, 全双工]
minutes: 6
order: 2
updated: 2026-09-28
deep: 
---

## 先这样答

实时语音 Agent 的链路分两条路线。一是级联式，由流式 ASR、LLM 和流式 TTS 拼接，端到端延迟通常在 800 到 1500 毫秒。二是端到端式，基于离散音频 token 实现语音进语音出。流式 ASR 和 TTS 的拼接核心在于解决双向交互中的断句与打断问题。

流式拼接的关键是服务端 VAD 与全双工打断机制。系统在播放 TTS 声音的同时持续采集麦克风音频，当服务端 VAD 检测到用户开口，会立刻停止 TTS 播放并截断 LLM 生成。此过程的前提是客户端开启回声消除，否则 AI 会把扬声器里自己的声音当成用户指令。

传输协议首选 WebRTC。语音通信容忍丢包，绝不容忍延迟。WebSocket 基于 TCP，丢包会强制重传导致队头阻塞，延迟常堆积到 150 到 500 毫秒。WebRTC 走 UDP，丢包通过前后帧插值填补，不阻塞播放，网络延迟可控在 50 到 150 毫秒。WebRTC 还内置了回声消除、噪声抑制等音频处理能力。

工程面上，常采用客户端到边缘节点走 WebRTC、服务端内部走 WebSocket 的混合架构。

## 面试官会怎么追问

- **「WebRTC 既然这么好，为什么还要用 WebSocket？」** WebRTC 的 SDP 信令交换仍需依赖 WebSocket 或 HTTP 承载。在内网环境中，WebRTC 的协议开销可能比裸 WebSocket 更慢，业界常见分工是外网走 WebRTC，内网走 WebSocket。
- **「走 WebRTC 的建连过程是怎样的？」** 双方先交换 SDP 信息，再通过 ICE 框架进行 NAT 穿透。穿透按本地直连、STUN 打洞、TURN 中转三级策略降级。遇到对称 NAT 网络时，STUN 打洞会失败，只能走 TURN 中转。
- **「端到端模型延迟更低，为什么还在用级联方案？」** 这是对延迟和可控性的取舍。端到端模型保留了副语言信息，但响应多样性弱，可控性差。级联方案虽然误差逐级传播，但组件可替换，容易排查问题并做逻辑干预。

## 回答的坑

认为 WebRTC 和 WebSocket 是替代关系，实际 WebRTC 的信令交换须依赖 WebSocket，两者是配合关系。

谈流式拼接时只提文本的流式传输，忽略了必须由客户端回声消除和服务端 VAD 配合才能完成物理打断。
