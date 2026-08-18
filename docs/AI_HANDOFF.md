# AgentAlpha 网站交接文档

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
cd /Users/cz/code/agentalpha_web
pnpm install
pnpm dev
```

本地地址：`http://localhost:3000`

## 部署

在项目目录执行：

```bash
cd /Users/cz/code/agentalpha_web
pnpm install
pnpm run build
vercel --prod --yes
```

项目已经关联 Vercel，部署完成后会自动更新 `https://agentalpha.top`。

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

接手后先进入项目目录：

```bash
cd /Users/cz/code/agentalpha_web
```

然后根据任务进入对应目录修改代码，完成后执行构建和 Vercel 部署命令即可。
