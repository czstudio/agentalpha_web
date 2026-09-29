---
slug: enterprise-tk349
no: "1249"
title: "为什么要用Webrtc？它和ws的区别是什么"
question: "为什么要用Webrtc？它和ws的区别是什么"
excerpt: "面试官想考察你对实时通信协议的技术选型能力，而非单纯背诵概念。这道题看似简单，但刁钻点在于：WebSocket 和 WebRTC 并非直接竞争关系，而是不同层级的 API——WebSocket 是应用层协议，WebRTC"
tags: ["真题解析", "通用与软实力"]
category: "enterprise"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 9
words: 4077
updated: "2026-09-29"
---

## 为什么要用Webrtc？它和ws的区别是什么

#### 1️⃣ 考察意图

面试官想考察你对实时通信协议的技术选型能力，而非单纯背诵概念。这道题看似简单，但刁钻点在于：**WebSocket 和 WebRTC 并非直接竞争关系，而是不同层级的 API**——WebSocket 是应用层协议，WebRTC 是包含媒体引擎、传输层（UDP）、NAT 穿透的框架。答好了能展示你对延迟、可靠性、带宽的工程取舍理解，以及能否在 Voice Agent 场景下做出正确决策。考察类型：**工程取舍 + 系统设计**。

#### 2️⃣ 标准答

**核心区别：WebSocket 是 TCP 上的消息协议，WebRTC 是 UDP 上的实时通信框架。**

- **协议层级**：WebSocket 是应用层协议，基于 TCP，提供全双工消息通道。WebRTC 是浏览器/客户端框架，包含 ICE（NAT 穿透）、DTLS（加密）、SRTP/SCTP（媒体/数据通道），底层强制使用 UDP（通过 ICE 协商）。
- **传输特性**：WebSocket 依赖 TCP 的可靠有序，但 TCP 的拥塞控制和重传机制在丢包时会导致队头阻塞（Head-of-Line Blocking），延迟抖动大。WebRTC 基于 UDP，通过 FEC（前向纠错）、NACK（选择性重传）、Jitter Buffer 实现低延迟（RTT < 200ms 时丢包率可容忍 30%）。
- **媒体支持**：WebSocket 只能传二进制/文本消息，无法直接处理音视频编解码。WebRTC 内置 Opus（语音，20ms 帧长）、VP8/VP9/H.264（视频）编解码器，并支持 Simulcast（多流自适应码率）。
- **连接建立**：WebSocket 只需 HTTP 升级握手（一次 RTT）。WebRTC 需要 STUN/TURN 服务器进行 NAT 穿透，信令交换（SDP Offer/Answer）至少 2-3 次 RTT，且 TURN 中继会增加延迟（约 30-50ms 额外）。

**为什么在 Voice Agent 中用 WebRTC？**

- **延迟要求**：语音对话 Agent 的端到端延迟需 < 300ms（ITU-T G.114 标准）。WebSocket 基于 TCP，在 1% 丢包率下，TCP 重传可能导致延迟飙升到 500ms+；WebRTC 的 FEC + NACK 组合可将延迟控制在 150ms 内。
- **带宽效率**：Opus 编码器在 32kbps 下即可达到电话质量，而 PCM（WebSocket 常用）需 64kbps。WebRTC 的带宽估计（GCC 算法）能动态调整码率，避免网络拥塞。
- **浏览器原生**：WebRTC 是 W3C 标准，无需插件；WebSocket 需自行实现音频采集、编码、播放逻辑。

**实际落地的坑 + 解法**：

- **坑**：WebRTC 的 ICE 连接在复杂 NAT 环境下可能失败（如对称 NAT），导致回退到 TURN 中继，增加延迟和成本。
- **解法**：预置 STUN 服务器（如 Google 的 `stun:stun.l.google.com:19302`）和 TURN 服务器（如 Coturn），并实现 ICE 重启（ICE Restart）机制。在 Voice Agent 中，可设置 TURN 中继超时阈值（如 5 秒），超时后降级为 WebSocket + PCM 传输（牺牲质量保可用性）。
- **坑**：WebRTC 的 DataChannel（基于 SCTP）在丢包时可能阻塞，影响控制信令。
- **解法**：将媒体流走 MediaStream，控制信令（如 VAD 事件）走独立 DataChannel，并设置 SCTP 的 `ordered=false` 和 `maxRetransmits=0` 实现无序不可靠传输。

**工程取舍**：

- **选 WebSocket**：适合文本聊天、信令交换、非实时数据同步（如日志）。简单可靠，但无法处理音视频。
- **选 WebRTC**：适合实时音视频、低延迟数据通道（如游戏状态同步）。复杂但性能上限高。在 Voice Agent 中，若仅需文本，WebSocket 足够；若需语音交互，WebRTC 是唯一选择。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从协议层级、传输特性、媒体支持三个层面回答。协议上，WebSocket 是 TCP 上的应用层消息协议，WebRTC 是 UDP 上的实时通信框架，包含 ICE、DTLS、SRTP。传输上，WebSocket 的 TCP 队头阻塞在丢包时导致延迟飙升，WebRTC 用 FEC + NACK 控制延迟在 150ms 内。媒体上，WebRTC 内置 Opus 编解码和带宽估计，WebSocket 需自行实现。总结一句：Voice Agent 需要低延迟语音流时必选 WebRTC，仅文本交互则 WebSocket 足够。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：WebRTC 的延迟比 WebSocket 低，但为什么有些场景（如直播）还用 WebSocket？

> 直播场景（如 HLS/DASH）对延迟要求不高（3-10 秒），更看重稳定性。WebSocket 基于 TCP，在弱网下通过重传保证数据完整，适合传输分片后的视频流（如 MP4 片段）。WebRTC 的 UDP 虽然延迟低，但丢包时 FEC 会浪费带宽（增加 20-30% 冗余），且 Simulcast 多流编码消耗 CPU。工程取舍：如果延迟容忍度 > 1 秒，WebSocket + HTTP chunked 传输更简单可靠；如果 < 500ms，WebRTC 是唯一选择。

**追问 2**：在 Voice Agent 中，WebRTC 的 DataChannel 和 MediaStream 哪个更适合传输音频？

> 取决于音频格式。MediaStream 直接传输 Opus 编码的音频帧，延迟低（20ms 帧长），且支持自动增益控制（AGC）和回声消除（AEC）。DataChannel 传输 PCM 或压缩后的音频包，但 SCTP 的可靠传输可能引入延迟。实际落地：如果 Agent 需要实时双向语音（如对话），用 MediaStream；如果 Agent 只需单向音频（如 TTS 流式播放），可用 DataChannel 传输 Opus 包，并设置 `ordered=false` 减少延迟。

**追问 3**：WebRTC 的 ICE 连接失败时，如何优雅降级？

> 降级策略分三步：1）检测 ICE 状态（`iceConnectionState` 为 `failed`），触发 ICE Restart 重新协商。2）若 3 次重启仍失败，回退到 TURN 中继（需预置 TURN 服务器）。3）若 TURN 也失败（如防火墙限制），降级为 WebSocket + PCM 音频，牺牲质量保可用性。注意：降级时需通知客户端切换编解码器（Opus → PCM），并调整 Jitter Buffer 参数（从 60ms 增大到 200ms 容忍网络抖动）。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ 说“WebSocket 是 TCP，WebRTC 是 UDP，所以 WebRTC 更快” → ✅ 正确切入：UDP 本身不保证低延迟，WebRTC 通过 FEC、NACK、Jitter Buffer 等机制在 UDP 上实现可控延迟。TCP 的队头阻塞才是关键瓶颈。
- ❌ 说“WebRTC 只能用于浏览器” → ✅ 正确切入：WebRTC 是标准协议，Node.js（如 `wrtc` 库）、iOS/Android 原生 SDK 都支持，Voice Agent 服务端也可用。
- ❌ 说“WebSocket 不能传音频” → ✅ 正确切入：WebSocket 可以传 PCM 或压缩后的音频包，但需要自行实现编解码、缓冲、丢包处理，且 TCP 的可靠传输在弱网下会导致延迟抖动。

#### 6️⃣ 简历呼应

- **如果你有 Voice Agent 项目**：从“为什么放弃 WebSocket 改用 WebRTC”切入，展示你实测的延迟对比数据（如 WebSocket 在 2% 丢包率下延迟 800ms，WebRTC 仅 200ms），并说明如何用 ICE Restart 处理 NAT 穿透失败。
- **如果你只做过传统 Web 开发**：用“WebSocket 像 HTTP 的升级版，WebRTC 像浏览器内置的 Skype”类比，强调 WebRTC 的媒体引擎（Opus、AGC）是 WebSocket 无法替代的。
- **如果你是校招无项目**：聚焦 WebRTC 的论文（如 Google 的 GCC 算法）和开源实现（如 Janus、Mediasoup），说明你理解其延迟控制原理，并做过 demo（如浏览器间语音通话）。
- WebRTC 官方规范：W3C WebRTC 1.0（MediaStream + RTCPeerConnection）
- Google Congestion Control (GCC) 算法：RFC 8298
- WebRTC 与 WebSocket 延迟对比实验：WebRTC Hacks 博客
- 开源 TURN 服务器：Coturn（支持 STUN/TURN/ICE）
- Voice Agent 实战：Daily.co 的 WebRTC Voice Agent 教程

---
