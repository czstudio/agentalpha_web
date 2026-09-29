---
slug: enterprise-tk090
no: "990"
title: "说说 WebSocket 和 SSE 通信的区别及局限性"
question: "说说 WebSocket 和 SSE 通信的区别及局限性"
excerpt: "面试官想考察你对实时通信协议在工程落地上“选型”的深度，而非单纯背概念。这是典型的工程取舍题，刁钻点在于：AI 流式场景下，SSE 和 WebSocket 看似都能用，但底层对连接管理、浏览器兼容性、代理穿透、资源开销的"
tags: ["真题解析", "通用与软实力"]
category: "enterprise"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 10
words: 4900
updated: "2026-09-29"
---

## 说说 WebSocket 和 SSE 通信的区别及局限性

#### 1️⃣ 考察意图

面试官想考察你对实时通信协议在工程落地上“选型”的深度，而非单纯背概念。这是典型的**工程取舍**题，刁钻点在于：AI 流式场景下，SSE 和 WebSocket 看似都能用，但底层对连接管理、浏览器兼容性、代理穿透、资源开销的差异巨大。答好了能展示你对网络协议栈（HTTP/1.1 vs HTTP/2 vs WebSocket）、浏览器限制（同源策略、连接数）、以及后端架构（长连接 vs 短轮询）的实战理解，而不是只会“全双工 vs 半双工”的教科书答案。

#### 2️⃣ 标准答

**核心区别：通信模式与协议栈**

- **WebSocket**：全双工，基于 TCP 的独立协议（ws://），通过 HTTP Upgrade 握手（101 Switching Protocols）建立长连接。客户端和服务端可随时互发数据，无 HTTP 头部开销，延迟低。
- **SSE (Server-Sent Events)**：半双工，基于 HTTP 的纯服务端推送。客户端通过 `EventSource` API 订阅，服务端以 `text/event-stream` 格式持续发送数据。本质是 HTTP 长连接，受 HTTP/1.1 的 keep-alive 和 HTTP/2 的 server push 影响。

**局限性对比（工程视角）**

- **连接建立**：
- WebSocket：需要一次 HTTP Upgrade 握手，之后完全脱离 HTTP 协议。防火墙、反向代理（Nginx 默认不转发 WebSocket）经常拦截，需要显式配置 `proxy_set_header Upgrade $http_upgrade`。
- SSE：直接复用 HTTP 连接，无需额外握手，天然穿透 HTTP 代理和防火墙。但 HTTP/1.1 下每个域名最多 6 个并发连接（浏览器限制），SSE 会占用一个，影响其他请求。
- **双向通信**：
- WebSocket：原生支持双向。AI 对话中，客户端可以随时发送“停止生成”、“修改参数”等指令，无需额外请求。
- SSE：仅服务端推送。客户端要发数据必须另起 HTTP 请求（POST/GET），导致“推送”和“请求”分离，增加延迟和复杂度。例如，AI 对话中用户想中断生成，SSE 方案需要客户端先发一个 HTTP 请求到服务端，服务端再关闭 SSE 连接，比 WebSocket 直接发关闭帧慢 1-2 个 RTT。
- **数据格式与解析**：
- WebSocket：二进制或文本帧，无固定格式。需要自定义协议（如 JSON-RPC、Protobuf），解析成本高，但灵活。
- SSE：纯文本，强制 UTF-8，格式固定（`data: ...\n\n`）。浏览器原生支持 `EventSource.onmessage`，无需手动解析。但无法传输二进制数据（除非 base64 编码，增加 33% 开销）。
- **连接生命周期与重连**：
- WebSocket：断开后需手动重连，且状态丢失（如会话 ID）。常见方案是用心跳（ping/pong）保活，但心跳频率过高（<30s）会浪费带宽。
- SSE：浏览器内置自动重连（`EventSource` 在断开后 3 秒自动重试），且支持 `Last-Event-ID` 断点续传。AI 流式输出中，如果网络闪断，SSE 可以自动恢复并继续接收未完成的数据，WebSocket 需要业务层实现断点续传逻辑。
- **资源开销**：
- WebSocket：长连接占用服务端文件描述符（fd），每个连接约 10-20KB 内存（含 TCP 缓冲区）。大规模场景（10 万+连接）需要 epoll 或异步框架（如 Netty、Go netpoll），否则 fd 耗尽。
- SSE：同样占用长连接 fd，但 HTTP/2 下可以多路复用（一个 TCP 连接承载多个 SSE 流），减少 fd 消耗。HTTP/1.1 下每个 SSE 独占一个连接，fd 开销与 WebSocket 相同。

**AI 流式输出场景的选型建议**

- **纯流式输出（如 GPT 逐 token 返回）**：SSE 更优。因为浏览器原生支持，无需额外库，且自动重连和断点续传天然适合长文本生成。OpenAI 的 Chat Completions API 就是 SSE（`data: ...` 格式）。
- **交互式对话（如 AI 助手需要用户中途打断、修改参数、多模态输入）**：WebSocket 更优。因为双向通信能即时响应客户端指令，且二进制帧可以高效传输音频、图片等非文本数据。
- **混合方案**：前端用 SSE 接收流式文本，同时用 WebSocket 传输控制指令（如停止、参数调整）。但会增加架构复杂度，需要维护两个连接。

**实际落地的坑 + 解法**

- **坑 1：SSE 在 HTTP/1.1 下连接数限制**。浏览器默认每个域名最多 6 个并发 HTTP 请求，SSE 会占用一个。如果页面同时有多个 SSE 流（如多个 AI 对话窗口），会阻塞其他请求（如图片加载）。
- **解法**：升级到 HTTP/2（多路复用），或使用 WebSocket 替代。如果必须用 HTTP/1.1，将 SSE 连接数控制在 1-2 个，其他请求走不同域名或 CDN。
- **坑 2：WebSocket 在反向代理（Nginx）下默认不转发**。Nginx 默认只处理 HTTP 请求，WebSocket 的 Upgrade 头会被丢弃，导致连接失败。
- **解法**：Nginx 配置 `proxy_set_header Upgrade $http_upgrade;` 和 `proxy_set_header Connection "upgrade";`，并设置 `proxy_read_timeout 60s` 防止长连接超时断开。
- **坑 3：SSE 的 EventSource 不支持自定义请求头**。无法携带 Authorization token（只能通过 URL 参数传递，存在安全风险）。
- **解法**：使用 `fetch` + `ReadableStream` 手动实现 SSE 解析，或者用 WebSocket 替代。例如，前端用 `fetch('/stream', { headers: { 'Authorization': 'Bearer xxx' } })` 获取流，然后通过 `response.body.getReader()` 读取 chunk。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从通信模式、协议栈、工程局限性三个层面回答。通信模式上，WebSocket 是全双工，SSE 是半双工；协议栈上，WebSocket 是独立协议，SSE 基于 HTTP。局限性上，WebSocket 需要处理防火墙穿透和手动重连，SSE 受浏览器连接数限制且无法双向通信。在 AI 流式输出场景，纯文本推送用 SSE，交互式对话用 WebSocket。总结一句：选型取决于是否需要双向通信和浏览器兼容性，没有银弹。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：如果我要在 SSE 中实现客户端主动发送“停止生成”指令，怎么设计？

> 方案一：客户端另起一个 HTTP POST 请求到服务端，服务端收到后关闭对应的 SSE 连接。缺点是增加一个 RTT 延迟。方案二：将 SSE 和 WebSocket 混合使用，SSE 接收流式数据，WebSocket 发送控制指令。方案三：如果服务端支持，可以在 SSE 的 URL 中嵌入一个唯一 session ID，客户端通过 GET 请求（带 session ID）触发停止，服务端在 SSE 的 event loop 中检查该标志位。推荐方案二，因为 WebSocket 延迟更低，且可以复用连接。

**追问 2**：WebSocket 和 SSE 在移动端（弱网环境）的表现差异？

> 移动端弱网下，WebSocket 的 TCP 长连接容易因网络切换（WiFi 转 4G）而断开，且重连成本高（需要重新握手）。SSE 的 `EventSource` 内置自动重连，且支持 `Last-Event-ID` 断点续传，更适合弱网。但 SSE 在 HTTP/1.1 下会阻塞其他请求，移动端浏览器连接数更少（通常 4-6 个），需要谨慎使用。实际项目中，弱网场景推荐 SSE + HTTP/2，或者使用 WebSocket 但实现指数退避重连（如 1s、2s、4s...）。

**追问 3**：如果我要传输二进制数据（如音频流），SSE 和 WebSocket 哪个更合适？

> WebSocket 原生支持二进制帧（`ArrayBuffer` 或 `Blob`），无需编码，传输效率高。SSE 只能传文本，二进制数据需要 base64 编码，增加 33% 体积和编解码开销。如果音频流对延迟敏感（如实时语音），必须用 WebSocket。如果对延迟不敏感（如语音转文字后推送），可以用 SSE 传 base64 编码的音频，但建议用 WebSocket 替代。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ 说“SSE 只能传文本，WebSocket 只能传二进制” → ✅ 正确：SSE 只能传文本（UTF-8），但 WebSocket 可以传文本和二进制帧，且二进制帧效率更高。
- ❌ 说“SSE 比 WebSocket 简单，所以永远选 SSE” → ✅ 正确：SSE 简单但功能受限（无双向通信、二进制支持差），选型要看场景。交互式 AI 对话用 WebSocket，纯推送用 SSE。
- ❌ 说“WebSocket 和 SSE 都是 HTTP 协议” → ✅ 正确：WebSocket 是独立协议（通过 HTTP Upgrade 建立），SSE 是 HTTP 协议的一部分（`text/event-stream` MIME 类型）。

#### 6️⃣ 简历呼应

- **如果你有 RAG 项目**：从“AI 流式输出”切入，说明你在项目中用 SSE 实现逐 token 推送（类似 OpenAI API），并对比了 WebSocket 方案在双向通信上的优势（如用户中断生成）。强调你处理了 Nginx 代理 WebSocket 的坑。
- **如果你只做过传统 NLP**：用“实时翻译”类比，说明 SSE 适合服务端推送翻译结果，WebSocket 适合客户端发送源文本和接收结果的双向交互。强调你理解 HTTP 长连接和浏览器连接数限制。
- **如果你是校招无项目**：聚焦“浏览器 EventSource API 和 WebSocket API 的差异”，说明你通过 demo 实现了 SSE 流式输出，并手动用 `fetch` + `ReadableStream` 模拟了 SSE 解析（绕过 EventSource 的请求头限制）。
- 《WebSocket vs SSE: A Practical Comparison for Real-Time Web Apps》
- 《HTTP/2 Server Push vs SSE: When to Use Which》
- 《Nginx WebSocket Proxy Configuration Best Practices》
- 《EventSource API 规范 (MDN)》
- 《WebSocket 协议 RFC 6455》

---
