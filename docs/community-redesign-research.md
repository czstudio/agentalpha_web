# /community 重设计研究摘要（2026-09-30）

> 目的：解决 `/community` 不统一、重点不突出、单调的问题；给出可套用模板 + 同行做法 + 三 skill 工程管线，供拍板后实施。
> 截图拼图：`_ref_shots/sheet-A-templates.jpg`（落地页模板）、`_ref_shots/sheet-B-competitors.jpg`（同行课程页），单图在同目录。

---

## 一、现状诊断（为什么显得单调）

页面 = 飞书文档同步（`scripts/sync_community_doc.py` → `content/community/community.json`）+ `CommunityDocumentRenderer` 渲染。积木只有 6 种：段落 / callout / 灰卡（tiers）/ 芯片云（stages）/ 表格 / 按钮。具体缺陷：

1. **无图标系统**：全页没有一个 icon，章节全靠文字。
2. **无动效**：0 transition / 0 reveal，滚动像翻 Word。
3. **层级靠字号**：章节头 `01 + 标题` 之外，卡与卡之间无视觉权重差异，重点（训练营、项目指标）淹没在同级灰卡里。
4. **课程体系没有"图"**：L1/L2/L3 是三个灰框，Agent 系列课是芯片云——10 个阶段没有顺序感、没有路线图；「Agent 系列课（10 阶段）」和「大模型 Agent 训练营」在页面上是两个不相干的东西，实际是同一内容。
5. **具身智能课缺席**：青科《具身 VLA 实训营》（8 阶段：深度学习基础→机器人学基础→模仿学习→强化学习→VLA 仿真环境→VLA 数据处理→VLA 算法解析→VLA 真机部署）在页面上没有入口。
6. **成果数据没有大数字呈现**：1.4k Star / 7.8k Star / HF 日榜第一这类硬指标全在正文段落里。

---

## 二、A 组 · 落地页/社区介绍模板参考（11 个，10 个有截图）

| # | 站点 | 截图 | 可吸收点 |
|---|---|---|---|
| 1 | [Anthropic](https://www.anthropic.com) | ✔ `A-anthropic-1.png` | **暖纸底编辑风，与站内米色体系最贴**：serif 大标题 + 下划线强调 + 大留白；章节呼吸感 |
| 2 | [Linear](https://linear.app) | ✔ | 字号阶梯 + 克制用色；卡片 hover 微抬升 |
| 3 | [Stripe](https://stripe.com) | ✔ | 渐变点缀 hero + 段落节奏（大标题→说明→CTA 三拍）；链接箭头语言 |
| 4 | [Vercel](https://vercel.com) | ✔ | 大声明式排版（statement typography）；三角几何符号当视觉锚 |
| 5 | [Raycast](https://www.raycast.com) | ✔ | **图标驱动的 feature 网格**——每功能一个线性 icon + 短标题 + 一句话；bento 布局 |
| 6 | [Hugging Face](https://huggingface.co)（被墙没截到） | ✖ | 社区门户感：emoji/图标混排卡、开源项目卡直连 repo |
| 7 | [Maven](https://maven.com) | ✔ | **cohort 课程卡解剖学**：封面图 + 讲师行 + 开营日期 + 人数标签——L1/L2/L3 卡可直接套 |
| 8 | [Reforge](https://www.reforge.com) | ✔ | 会员制课程社区：program 卡 + 企业 logo 带 + 成果大数字 |
| 9 | [Circle](https://circle.so) | ✔ | 社区 SaaS hero：一句定位 + 评分徽章 + 邮箱捕获；「社区能给你什么」三列 |
| 10 | [Taste Skill](https://tasteskill.dev) | ✔ | 纸底 + 硬阴影卡片（pop card）+ 安装命令芯片；「反 slop」叙事排版 |
| 11 | [Impeccable](https://impeccable.style) | ✔ | 命令芯片行（`/polish` `/typeset`…）当功能展示；贴纸/标签式点缀 |

## 三、B 组 · 同行课程页做法（10 个，8 个有效截图）

| # | 站点 | 截图 | 亮点知识点呈现方式（吸收对象） |
|---|---|---|---|
| 1 | [DeepLearning.AI Courses](https://www.deeplearning.ai/courses/) | ✔ | 课程卡 + **Most Popular / Top Rated 徽章** + 讲师头像行；课程分类侧栏 |
| 2 | [Kaggle Learn](https://www.kaggle.com/learn) | ✔ | **彩色微图标卡网格**（每门课一个手绘感 icon）+ Guides 精选集 |
| 3 | [Made With ML](https://madewithml.com/) | ✔ | **技术栈星座图**（logo 云组成管线）——技术栈可视化不写清单 |
| 4 | [Full Stack Deep Learning](https://fullstackdeeplearning.com/course/) | ✔ | **编号课程侧栏**（Part 1-11 纵向大纲）+ 学员评价卡 |
| 5 | [fast.ai](https://course.fast.ai/) | ✔ | 吉祥物插画（兔子）+ Welcome 清单；朴素但有人味 |
| 6 | [Learn Prompting](https://learnprompting.org/) | ✔ | 认证带 + 难度分级路径（Basics→Advanced） |
| 7 | [Claude Academy](https://www.anthropic.com/learn) | ✔ | 分类卡网格（每卡一张产品截图 + 一句话） |
| 8 | [Datawhale](https://www.datawhale.cn/) | ✔ | **「AI 学习路线」横向 mind map**——国内开源学习社区的路线图做法，和 10 阶段路线图诉求完全对口 |
| 9 | [百度 AI Studio](https://aistudio.baidu.com/) | □（JS 没渲染出） | 训练营 banner + 认证体系（参考价值低，备选） |
| 10 | [Hugging Face Learn](https://huggingface.co/learn)（被墙没截到） | ✖ | learn 门户：课程卡 + 进度感 |

---

## 四、三个前端 skill 的工程化用法（实施时的约束与流水线）

1. **Taste Skill**（生成前约束，MIT 开源）：安装 `npx skills add Leonxlnx/taste-skill`。关键参数：
   - 三旋钮基线 `DESIGN_VARIANCE: 8 / MOTION_INTENSITY: 6 / VISUAL_DENSITY: 4`——社区页建议改为 **5 / 4 / 3**（品牌是"Refined 编辑风"，不需要 8 的方差）。
   - 硬禁令直接适用：em-dash 禁、AI 紫默认渐变禁（我们品牌紫是主色不冲突，但禁 `indigo/purple gradient hero`）、三等宽卡禁（正好治 L1/L2/L3 三灰卡）、eyebrow 芯片每屏 ≤1、禁章节序号铺满（现状 `01-07` 序号头要收敛成小标签）。
   - §14 出货前预检清单 + 图标库规范（线性、单色、统一 stroke）。
2. **Impeccable**（生成后打磨，MIT 开源）：`npx impeccable install`。流水线：`/critique`（P0-P3 问题单）→ `/typeset` → `/colorize` → `/animate`（动效只加这层）→ `/polish` → `/slop` 检测归零（61 条规则，含 AI 米色、status-chip soup、卡片套卡片——正是现状病的检测器）。
3. **Skillry**（付费素材补齐，可选）：Web/Slides/Video/Image 四类产出。我们用它补 **OG 图 / 章节配图**；icons 不用它（Taste 的图标库规范 + lucide 自绘足够，不引第三方 icon 包，保持零依赖红线）。

---

## 五、改造方案（拍板后实施）

### 0. 全局（治"不统一"）
- 图标：统一 **lucide / Phosphor 线性图标，1.5px stroke，单色墨 + 品牌紫点缀**；每章节头一个章节 icon。
- 动效（轻量档）：滚动 reveal（IntersectionObserver + CSS，`prefers-reduced-motion` 降级）、卡片 hover 抬升 2px + 边框加深、芯片 hover；**不做**视差/大位移。
- 章节头收敛：`01` 序号改小徽标 + 章节 icon，让位给内容。

### 1. 课程体系（核心，治"重点不突出"）
- **Agent 系列课 = 大模型 Agent 训练营**：合并成一张主卡「大模型 Agent 训练营 · Agent 系列课 10 阶段」，副标注「同体系双入口：面试速答库 ↔ 训练营」，卡内放 **10 阶段横向路线图 SVG**（吸收 Datawhale 路线图 + Made With ML 图解风格：阶段节点 + icon + 短名，语义色阶段分组，主题无关色防撞车）。这是整页最大的视觉锚点。
- L1/L2/L3 改成 Maven 式课程卡（标签 + 标题 + 一句话 + 箭头），三卡**不等宽**（Taste 禁三等宽）。
- 新增**具身 VLA 实训营**卡：青科联办、8 阶段 chips、飞书文档 CTA，与训练营卡同构但用第二强调色区分。

### 2. 其余章节
- 代表项目 → bento 网格（Raycast/Taste pop-card）：Idea2Paper、InkOS 双大位 + 指标大数字（1.4k/7.8k Star、HF 日榜第一），其余项目小卡。
- 成果案例 → 大数字行 + 引用卡（Reforge/FSDL 做法）。
- 我们的方法 → 命令芯片行（Impeccable 做法）。
- 参与方式 → 三步条（Stripe 段落节奏）。
- hero → Circle 式一句定位 + 3 个真实指标徽章 + 双 CTA。

### 3. 内容红线
- 数据只用已核实的（Star 数、榜单一律来自社区文档原文）；不编造导师头衔；具身课 8 阶段名称照飞书文档原文。

## 六、待拍板
1. 主基调：A 编辑暖纸风（推荐，同站内）/ B 渐变现代风 / C 硬阴影 bento 风。
2. 10 阶段路线图形态：横向 mind map SVG（推荐）/ 纵向 timeline / 阶段网格。
3. 动效档位：轻（推荐）/ 中 / 无。
4. 具身课位置：课程体系内同级卡（推荐）/ 独立章节。
5. Skillry 是否付费订阅（不订也不影响主体改造）。
