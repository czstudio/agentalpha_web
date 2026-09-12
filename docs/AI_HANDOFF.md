# AgentAlpha 网站交接文档

## 2026-09-11 当前交接记录

这次交接把“正文重写、插图、课程入口和部署”放在同一个可核对的版本里。

- GitHub 仓库：`https://github.com/czstudio/agentalpha_web`
- 当前提交：`31e00cd`（基于 ZCode 正文提交 `c0620f4`）
- 工作树：`/Users/cz/.codex/worktrees/agentalpha-web-snapshot-20260908`
- 分支：`snapshot/satisfied-20260908`；推送生产前先确认 GitHub `master` 的远端 SHA，没有在有未提交改动的 `/Users/cz/code/agentalpha_web` 上直接操作。
- 生产目标：`https://agentalpha.top`，Vercel 项目 `agent-alpha-community-website`。

### 本次已经交接的内容

1. 全站笔记正文完成一轮中文重写，共 74 篇；首页、笔记目录、笔记文章和课程入口又做了一轮“说人话”润色。可见文案主要在 `locales/zh.json`、`app/notes/page.tsx` 和 `app/notes/[slug]/page.tsx`。
2. 增加 Claude Code 课程的安全目录和章节待发布页。课程清单仍是草稿状态，未通过审核的章节不会展示草稿正文。
3. 用 UniKeyX 路由生成 6 张 1280×720、16:9 手绘图，结果和每张 SHA-256 在 `docs/illustrations/unikeyx/2026-09-10/receipt.json`；论文图、原文链接、图号和 SHA-256 在 `docs/illustrations/paper-evidence/index.json`。
4. 新增 18 张论文图，按文章主题插入 12 篇笔记。论文图只作教育性引用，原作者权利不变；商业发布前要重新核对各论文许可。
5. 社区 Feishu 源文件没有被改写；公众号没有发布动作。

### 部署交接

GitHub `master` 是生产发布入口。推送前后都要保留远端 SHA 和 Vercel 部署回执：

```bash
git fetch https://github.com/czstudio/agentalpha_web.git master
git push https://github.com/czstudio/agentalpha_web.git HEAD:master
vercel --prod --yes
```

如果 GitHub 集成已触发自动部署，不要重复提交第二次；只用 `vercel ls agent-alpha-community-website` 或 Vercel 控制台核对同一个部署的状态。部署成功后再访问 `https://agentalpha.top/notes`、`/notes/llm-attention-context` 和 `/community` 做线上回读。线上成功必须以 HTTP 回读和 Vercel 终态为准，不能把本地预览当成上线。

### 每日笔记更新约定

已建立 Codex 日更任务：`AgentAlpha 笔记日更`（automation id：`agentalpha-2`，每天一次）。它只在有实际变更、部署结果或阻塞时汇报。

每天只推进一个明确主题，避免为了凑数量批量生成空文章：

1. 先从 `content/notes/index.json` 找一个缺口，新增或修改 `content/notes/*.md`，标题和开头先写读者正在遇到的具体问题。
2. 正文按“问题现场 → 原理 → 最小实现 → 失败边界 → 面试复述”推进；少用“赋能、闭环、全链路、体系化”等空话。
3. 需要配图时，优先找原论文图并记录原文链接、图号、用途和许可说明；需要解释机制再走 UniKeyX 手绘图，沿用暖纸白、墨线、短中文标签的现有风格。
4. 每次更新至少执行 `pnpm exec tsc --noEmit`、`pnpm run build` 和图片引用检查；通过后提交一笔可回滚的 Git commit，再推送 GitHub。
5. 发现正文不自然时，先改读者看得到的句子，不改设计令牌和既有图片风格；不要把未审核课程草稿或未核验外部素材推到公开页面。

### 当前验收证据

- `pnpm exec tsc --noEmit`：通过
- `pnpm run build`：通过，生成 116 条路由
- `pnpm run community:verify`：通过
- `COMMUNITY_URL=http://127.0.0.1:3101/community pnpm run community:page:verify`：桌面、平板、手机通过
- 图片引用：593 个，缺失 0 个
- 定向 ESLint：通过；全仓 ESLint 仍有既有问题（80 errors、45 warnings），不作为本次新增文件的通过依据

## 项目地址

- 本地项目：`/Users/cz/code/agentalpha_web`
- 线上网站：https://agentalpha.top
- 社区页：https://agentalpha.top/community
- 笔记页：https://agentalpha.top/notes
- Vercel 项目：`czstudios-projects/agent-alpha-community-website`

## 技术栈

- Next.js `16.0.10`
- React `19.2.0`
- TypeScript
- Tailwind CSS v4
- Prisma
- pnpm
- Vercel

## 本地启动

```bash
cd /Users/cz/.codex/worktrees/agentalpha-web-snapshot-20260908
pnpm install
pnpm dev
```

本地地址：`http://127.0.0.1:3101`（如果端口不同，以终端实际输出为准）。`/Users/cz/code/agentalpha_web` 可能有未提交的个人改动，未确认前不要用它做发布。

## 部署

完成检查后，从干净工作树提交 GitHub，再发布 Vercel：

```bash
cd /Users/cz/.codex/worktrees/agentalpha-web-snapshot-20260908
pnpm install
pnpm run build
git fetch https://github.com/czstudio/agentalpha_web.git master
git push https://github.com/czstudio/agentalpha_web.git HEAD:master
vercel --prod --yes
```

项目已经关联 Vercel。GitHub 推送可能会自动触发部署；若已出现同一提交的部署，不要重复发布，核对该部署终态即可。部署完成后再回读 `https://agentalpha.top`。

## 常用验证

```bash
cd /Users/cz/code/agentalpha_web
pnpm run community:verify
pnpm run community:page:verify
pnpm run build
```

## 页面代码位置

### 首页

- 页面入口：`app/page.tsx`
- 首页内容：`components/home-content.tsx`
- 全局导航：`components/navigation.tsx`
- 全局布局：`app/layout.tsx`
- 全局样式：`app/globals.css`

### 社区页

- 页面入口：`app/community/page.tsx`
- 页面视觉样式：`app/community/community.css`
- 页面交互与章节结构：`components/community/community-experience.tsx`
- 文档内容渲染：`components/community/community-document.tsx`
- 社区内容数据：`content/community/community.json`
- 社区媒体清单：`content/community/media-manifest.json`

### 笔记页

- 列表页：`app/notes/page.tsx`
- 文章路由：`app/notes/[slug]/page.tsx`
- 笔记内容：`content/notes/*.md`
- 笔记索引：`content/notes/index.json`
- Feishu 导入内容：`content/imports/agent-interview-v3.feishu.md`
- 学习内容组件：`components/learn/`

### 管理后台与数据接口

- 后台页面：`app/admin/`
- API 路由：`app/api/`
- Prisma 配置：`prisma/schema.prisma`
- 数据库推送：`pnpm db:push`
- 数据种子：`pnpm db:seed`

## 内容更新流程

更新笔记：

1. 在 `content/notes/` 新增或修改 Markdown 文件。
2. 在 `content/notes/index.json` 登记文章 slug、标题和分类。
3. 本地运行 `pnpm run build`。
4. 执行 `vercel --prod --yes` 发布。

更新社区页：

1. 修改 `content/community/community.json`。
2. 同步媒体信息到 `content/community/media-manifest.json`。
3. 运行 `pnpm run community:verify`。
4. 运行 `pnpm run community:page:verify`。
5. 执行 `pnpm run build` 和 `vercel --prod --yes`。

## 当前线上版本

- 最新生产域名：https://agentalpha.top
- 最新社区页：https://agentalpha.top/community
- 最新部署 ID：`7RZQckNZHa24rH2QG4ogV3ZAJpJm`

## 视觉系统（2026-08 重构）

全站已重构为单一设计系统（明亮学院风），旧的三层皮肤已废弃：

- 唯一令牌来源：`app/globals.css` 的 `:root` / `.dark`（暖纸白 + 墨色 + 靛蓝主色，`--shadow-soft/lift`，圆角 10/14/20px）。
- `--aa-*` 变量名保留但已重映射到新令牌；改色只动 `:root`/`.dark`，不要新增局部色板。
- 字体：`--font-display` / `--font-body` 均为本地 MiSans（PingFang SC / Hiragino Sans GB 回退）。
- Logo：`public/logo-light.png` / `logo-dark.png`（1201×256 同比例），用 `dark:hidden` / `hidden dark:block` 切换；**不要在 CSS 里对 logo img 写未分层的 `display`**，会压过 Tailwind 的 `hidden` 导致双影。
- Logo 动画：`components/brand-logo-reel.tsx` 为纯 CSS 入场 + 一次性 sheen，无视频。
- 图片规范：统一 16:10 `object-fit:cover` + 12px 圆角卡片（`.aa-cover` / `.community-figure`）；社区页连续图用 `.community-media-grid` 网格。
- 社区页样式全部在 `app/community/community.css`，只引用全局令牌。
- 社区页目前**不渲染任何内容图片**（`community-document.tsx` 跳过全部 image 节点，纯文本编辑风）；完整社区介绍链接到飞书文档（hero 主按钮、文档区顶部 `.community-doc-banner`、文末 CTA 三处，URL 硬编码在渲染组件中）。恢复图片需改渲染器并补回 figure 样式。

## 交接入口

接手后先进入干净工作树：

```bash
cd /Users/cz/.codex/worktrees/agentalpha-web-snapshot-20260908
```

然后根据任务进入对应目录修改代码，完成后执行构建和 Vercel 部署命令即可。
