---
slug: "2026-open-source-resume-tools"
title: "20 个开源简历优化工具实测：值得装的都在这"
excerpt: "从 7 万 star 的求职套件到中文红旗审计 skill，20 个项目挨个核实。怎么选、避什么坑，一篇说完。"
date: "2026-09-28"
category: "技术分享"
tags: "简历,求职,开源工具,Agent"
minutes: 10
---

AI 岗求职，简历是第一道门。今年 GitHub 上的简历工具换了形态：从排版模板变成 Claude Code 里的求职工作流，最火的一个 7 万 star。我们挨个打开核实了一遍，star 数都是 2026-09-28 的 GitHub API 快照。

先给两个生态判断。

第一，重心从 builder 移到了工作流。老工具管排版导出 PDF，新工具管搜岗、改简历、填表、模拟面试整条线，载体多是 Claude Code skill。

第二，官方没有这个东西。anthropics/skills 的目录我们实查过，一个简历 skill 都没有；最大的 awesome 列表 503 行，只提了 1 条。这个生态散在独立仓库里，清单如下。

## 现象级

**career-ops，72,976 star。** 本地求职套件。每个岗位先打 A 到 H 的等级再给 1 到 5 分，分低直接劝你别投，省时间。WIRED 报过它。短板是要本地部署，配置有门槛。

**ai-job-search，44,339 star。** Claude Code 求职框架。作者用它 69 投 20 面 1 offer，履历就是背书。

## 中文向

**ASu-skills，5,209 star。** 社区传的「酥神 skill」就是它。注意归属：第三方开发者 Hisn00w 把博主阿酥在coding 公开分享的方法整理成 9 个入口的插件包，不是阿酥本人的仓库，README 致谢里写明了来源。触发词「我要酥化」，带同款简历模板。

**JadeAI，1,985 star。** 中文功能最全的开源简历站：模板、JD 匹配、语法检查、模拟面试。要一站式网页版，选它。

**wyh0626/resume-optimizer，487 star。** 小众，但思路最对：只做中文简历的红旗审计，抓外包味表述、玩具项目、量化缺失、表述失真。简历的问题往往不是不够漂亮，是经不起推敲。我们的[简历体检](/tools/resume)吸收了这套思路，做成浏览器本地跑的规则引擎。

**prisma-ai（409 star）**，免费中文 SaaS，先挖项目亮点再定制简历。**job-hunt-copilot（263 star）**，装在 Claude.ai 网页版，不用本地环境。**yupi-skill（439 star）**，鱼皮的人设蒸馏 skill，建议带真人风格。三个都是省事之选。

## Skill 生态

**ResumeSkills，2,479 star。** 20 个提示词：ATS 优化、经历量化、薪资谈判、LinkedIn 改写，按需取用。

**resume-tailoring-skill，759 star。** 最值得单独讲。它不直接改简历：先用对话挖你没写进去的经历，再按置信度选材，改不了的地方明示为 gap，不编。多数润色工具做不到这一点。

**offer-toolkit-skill，506 star。** 六合 1：搜岗、JD 分析、12 套模板、行为面题库、offer 对比、谈薪脚本。

**LLMInternSkill，324 star。** 大模型实习垂直。真实性分五档，带「面试拷打」模式，和我们的理念一致。

**claude-resume-kit，275 star。** 科研向：anti-fabrication 约束、多视角 critique、反 AI 指纹。申博适用。

## Web 工具

**hr-breaker，876 star。** 简历进，LLM 改写，ATS 过滤器和幻觉过滤器两道关卡，不过就重生成，最后出单页 PDF。注意核对产出，别让它替你编数字。

**ai-resume-analyzer，826 star。** 纯前端，免 key，浏览器里跑 AI 分析。

**Smart-AI-Resume-Analyzer，254 star。** Streamlit 零 key：ATS 分、关键词 gap、图表。

**atsresume，591 star**，2023 年起的纯前端 ATS 模板站。**resume-lm，329 star**，带主简历和岗位定制版的版本树管理。

## 酥神事件：包装的边界

8 月，阿酥在coding 网传入职美团 Beam 团队，北斗计划、L8（知乎与腾讯新闻 2026-08-13 报道，网易、掘金有交叉印证），随后简历包装和学历表述被质疑。事实留给当事人，对用工具的人只有一条教训：**包装过得了简历关，过不了面试关**。面试官对着简历逐句往深问，写上去的每个词都是债。

所以我们的做法反过来，先做追问预演。[简历体检](/tools/resume)给每条经历挂上面试官最可能问的真实原题，按「有据可查 / 要补事实 / 建议删掉」三档评级。配套：[面经库](/mianjing)（8 家公司真实复盘）、[速答题库](/interview/qa)（136 题）、[模拟面试抽题](/interview/quiz)。

## 三个坑

1. **全自动代投**。JobHuntr（468 star）这类省事，但批量自动投递违反招聘平台条款，封号自负。
2. **简历隐私**。要上传服务器的工具，先看清部署方式。本地跑的不出你的机器。
3. **AI 编造**。LLM 改写最大的坑是替你补没做过的数字。改完逐句核对。

## 怎么选

- 中文一站式网页：JadeAI
- Claude Code 全流程：career-ops、ai-job-search
- 提示词库自己组装：ResumeSkills 加 offer-toolkit-skill
- 要经得起追问：wyh0626 的红旗审计思路，加我们的[简历体检](/tools/resume)（JD 对比、证据评级、追问预演，全本地）
- 科研申博：claude-resume-kit

工具管表达，管不了经历。表达改完，剩下的时间花在补经历和补面试上——题库、面经、抽题自测都在站内，免费。
