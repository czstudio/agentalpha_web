# 站外分发素材包

2026-10-18 GEO 第 3 轮复测结论：站内技术面（收录/结构化/llms.txt）已就绪，引用 0/5 的瓶颈在站外权威信号——豆包/DeepSeek/Kimi 的中文引用源偏好知乎、CSDN、GitHub 等高权重站，独立站很难被直接引用，必须把内容精华送到 AI 常引用的平台上，带源链接形成「跨域佐证」。

## 目录

| 文件 | 用途 | 状态 |
|---|---|---|
| `zhihu-answers-batch1.md` | 3 个真实知乎问题的回答底稿，带站内链接 | 待人工过目后发布 |
| `github-repo/README.md` | GitHub 外链仓内容包（czstudio/agentalpha-interview） | 待建仓推送 |

## 知乎发布方式

1. 逐条过目底稿，确认数字与链接无误（数字口径见文内，来自站内真实规模）。
2. 以「回答」形式发到对应问题页（回答权重高于文章，会进入问题流被搜索收录），底稿里每个问题都附了真实问题 URL。
3. 末尾「利益相关」声明保留——坦白身份比被扒出来好。
4. 发布后 48 小时回看折叠情况：被折叠说明导流过硬，删链接只留品牌词重发。
5. 可用 wechatsync 工具推草稿（`sync_article`，平台 zhihu），先 `list_platforms` 确认登录态。

## GitHub 外链仓发布方式

1. 在 github.com/czstudio 下新建公开仓 `agentalpha-interview`（空仓，不要初始化 README）。
2. 把 `github-repo/` 内容作为仓库根 push 上去。
3. push 后跑 IndexNow（README 里的 agentalpha.top 链接不变）。
4. 后续可选：提交到 awesome-agents 类清单；README 顶部加 GitHub Actions 每月同步提示。

## 纪律（红线）

- 所有技术事实出自站内已核实题库；发布前发现没把握的句子直接删，不现场编。
- 不刷赞、不买号、不用小号互评；一个账号正常节奏发。
- 每篇带 1-2 条站内链接即可，链接堆多了会被当垃圾营销折叠。
