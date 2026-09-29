我会按给定事实收敛内容，控制首段和全文字数，并逐项检查标题、追问格式、禁用词和 frontmatter。---
slug: huawei-tcp-udp-http
question: "TCP 和 UDP 的区别？HTTP/1.1 和 HTTP/2 的区别？"
oneLine: "TCP 面向连接、可靠有序并支持重传，UDP 无连接且开销低；HTTP/2 支持多路复用、头部压缩和服务器推送，LLM 流式输出可用 SSE 或 WebSocket，实时语音常走 UDP 承载 RTP。"
category: jingchang
company: huawei
track: algo-general
tags: [华为真题, TCP, HTTP]
minutes: 5
order: 313
updated: 2026-09-29
deep: 
---

## 先这样答

TCP 面向连接，提供可靠、有序的数据传输，并支持重传。UDP 无连接，传输开销较低。两者的核心差别，是 TCP 更强调可靠有序，UDP 更强调无连接和低开销。

在模型服务中，流式输出可以使用 SSE，也可以使用 WebSocket。SSE 建立在 HTTP 之上。实时语音通常使用 UDP，并通过 RTP 传输。选型时要先看场景的传输要求，再选择对应方式。

HTTP/2 相比 HTTP/1.1，提供多路复用、头部压缩和服务器推送。多路复用允许同一连接并行处理多个请求，可以解决队头阻塞。对 LLM 应用来说，长连接复用可以降低握手开销。

## 面试官会怎么追问

- **「流式输出和实时语音，应该怎么选传输方式？」** 模型服务的流式输出可以使用 SSE，SSE 建立在 HTTP 之上，也可以使用 WebSocket。实时语音通常使用 UDP，并通过 RTP 传输。要根据具体场景选择传输方式。

- **「HTTP/2 对 LLM 应用的实际价值是什么？」** HTTP/2 的多路复用让同一条连接并行处理多个请求，解决队头阻塞。头部压缩和服务器推送也是它的能力。对 LLM 应用，长连接复用可以降低握手开销。

- **「TCP 和 UDP 的选型依据是什么？」** 需要可靠、有序传输并支持重传时，选择 TCP。更关注无连接和低开销时，选择 UDP。模型服务中，流式输出可用 SSE 或 WebSocket，实时语音通常走 UDP，并使用 RTP。

## 回答的坑

- 只说 TCP 可靠、UDP 开销低，却漏掉 TCP 的有序重传和 UDP 的无连接特征。
- 只列协议特征，却不结合 SSE、WebSocket、RTP 和 HTTP/2 的长连接复用。