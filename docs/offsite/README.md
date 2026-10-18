# 站外分发素材包

2026-10-18 GEO 第 3 轮复测结论：站内技术面（收录/结构化/llms.txt）已就绪，引用 0/5 的瓶颈在站外权威信号——豆包/DeepSeek/Kimi 的中文引用源偏好知乎、CSDN、GitHub 等高权重站，独立站很难被直接引用，必须把内容精华送到 AI 常引用的平台上，带源链接形成「跨域佐证」。

## 目录

| 文件 | 用途 | 状态 |
|---|---|---|
| `zhihu-answers-batch1.md` | 3 个真实知乎问题的回答底稿，带站内链接 | 待人工过目后发布 |
| `github-repo/README.md` | GitHub 外链仓内容包 | **已建成上线：github.com/czstudio/agentalpha-interview**（2026-10-18，含 README 20 题精选+全站导航+课程区，docs/ 下 agent 40 题/rag 30 题/llm-basics 40 题/glossary 51 术语，10 个 topics） |

GitHub 仓的最终内容以线上仓库为准，`github-repo/` 目录是当时的内容包存档。

## 知乎发布方式

1. 逐条过目底稿，确认数字与链接无误（数字口径见文内，来自站内真实规模）。
2. 以「回答」形式发到对应问题页（回答权重高于文章，会进入问题流被搜索收录），底稿里每个问题都附了真实问题 URL。
3. 末尾「利益相关」声明保留——坦白身份比被扒出来好。
4. 发布后 48 小时回看折叠情况：被折叠说明导流过硬，删链接只留品牌词重发。
5. 可用 wechatsync 工具推草稿（`sync_article`，平台 zhihu），先 `list_platforms` 确认登录态。

## GitHub 外链仓（已完成 2026-10-18）

仓库已上线：https://github.com/czstudio/agentalpha-interview （user 仓，非 org；建仓走 GitHub API + 本机 GCM 存储的 czstudio token，浏览器 2FA 不需要）。后续维护直接改线上仓；本目录存档不再更新。

## 纪律（红线）

- 所有技术事实出自站内已核实题库；发布前发现没把握的句子直接删，不现场编。
- 不刷赞、不买号、不用小号互评；一个账号正常节奏发。
- 每篇带 1-2 条站内链接即可，链接堆多了会被当垃圾营销折叠。
