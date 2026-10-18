# AGENTS.md · agentalpha.top（AgentAlpha 社区网站）

> 本文件是所有 AI 编码代理（ZCode / Claude Code / Codex / Cursor 等）与多台电脑协同开发本仓库的**唯一权威入口**。
> 动手前完整读一遍，重点是第 4 节（分支与发布）、第 5 节（提交门禁）、第 8 节（历史事故坑）。
> 历史交接记录在 `docs/AI_HANDOFF.md`（2026-09 写成，部分内容已过时；与本文件冲突时以本文件为准）。

## 1. 项目是什么

- 线上地址：https://agentalpha.top （Vercel 项目 `czstudios-projects/agent-alpha-community-website`，构建区域 hnd1）
- 定位：AI 求职社区站 = 学习路线 `/learn` + 面试题库（一题一页，3000+ 静态页）+ 求职工具箱 `/tools` + 实战项目展示 `/projects` + 社区页 `/community` + 文章专栏 `/articles`
- 本仓库是独立 git 仓库（不属于 xhs-pic 仓库），remote：`git@github.com:czstudio/agentalpha_web.git`

## 2. 技术栈与环境准备

- Next.js `16.0.10`（App Router）+ React `19.2` + TypeScript 5 + Tailwind CSS v4（`@tailwindcss/postcss`）+ Prisma 5
- Node ≥ 20（Next.js 16 要求）；包管理器**必须用 pnpm**（`postinstall` 会跑 `prisma generate`）
- `prebuild` 钩子需要 `python3` 在 PATH（跑社区文档同步校验，只用标准库；Windows 机器注意 `python3` 命令是否可用）
- 本地没有数据库也能开发和 build：页面里的 Prisma 查询都有 try/catch 空数据兜底（build 机连不上库是常态，别把兜底逻辑删了）

```bash
git clone git@github.com:czstudio/agentalpha_web.git
cd agentalpha_web
pnpm install
pnpm dev        # 端口以终端输出为准
```

## 3. 常用命令

| 命令 | 作用 |
|---|---|
| `pnpm dev` | 本地开发 |
| `pnpm exec tsc --noEmit` | 类型检查（提交门禁 1） |
| `pnpm run build` | 生产构建，内含 prebuild 社区校验（提交门禁 2） |
| `pnpm run lint` | ESLint（全仓有历史遗留 error，只要求改动文件不新增问题） |
| `pnpm run community:verify` | 校验 community.json 与同步脚本一致 |
| `pnpm run community:page:verify` | Playwright 验证社区页渲染 |
| `pnpm run db:push` / `db:seed` / `db:studio` | Prisma（需要数据库时） |
| `python scripts/submit_indexnow.py` | 部署后推 IndexNow 加速收录 |

## 4. 分支拓扑与发布流程（最重要）

- **`master` = 生产分支**。push 到 master → Vercel GitHub 集成自动部署上线。**不推 master = 不上线**。
- **`feat/articles` = 开发分支**（内容主力线），本地长期领先远端。新文章先落这里，验收后 cherry-pick 到 master。
- 发布 = push master → 线上 HTTP 回读验证（`/`、`/notes` 加本次改的页面）。**本地预览不算上线，以线上终态为准**。
- push 输出报错（Connection reset 等）**不等于失败**，对象可能已经传完、远端 ref 已更新。唯一可信判据：`git ls-remote origin master` 返回的 hash 等于本地 HEAD，最好连续确认两次。
- **多台电脑 / 多会话并行是常态**：动手前先 `git fetch origin` 看远端 master 有没有别人推的新提交；推前验谱系 `git merge-base --is-ancestor <上次推的sha> origin/master`。
- 主工作树被占（别的 worktree 挂着 master，checkout 不了）时的标准做法：

  ```bash
  git worktree add --detach _wt_docs origin/master
  cd _wt_docs && git cherry-pick <feat分支上的sha>
  git push origin HEAD:master
  cd .. && git worktree remove _wt_docs
  ```

  提交对象已在本地对象库时可以零工作树直推：`git push origin <sha>:master`。
- **cherry-pick 跨分支的冲突处理**：未发布文章 `.md` 在 master 上不存在会冲突 → 从 cherry-pick 里 `git rm` 掉文章本体，但其 webp 配图可以保留（将来文章合并时引用已就位）。
- master 与 feat/articles 的已知分叉文件（截至 2026-10，合并时人工对齐）：`next.config.mjs`（master 有独立 redirects）、`app/interview/interview.css`、`public/projects/index.html`（两分支不同构）。
- 提交信息格式照历史：`feat(scope): 中文描述` / `fix(scope): ...` / `perf(site): ...`。

## 5. 提交前三道门禁（必过）

1. `pnpm exec tsc --noEmit`
2. `pnpm run build` —— 注意：**本地绿可能是假绿**（`.next` 缓存复用旧渲染结果 + 被 ignore 的文件本地照样在）。排 Vercel 构建失败时先删 `.next` 重跑。
3. 引用自查：grep 改动里新增的 `/images/...` 等资源路径，逐一确认 `public/` 下真实存在；页面冒烟要带 HTTP status 断言（404 是假绿）。

另外两条硬规则：

- `next build` 与 `next dev` 抢 `.next` 锁，不要并行跑。
- scratch 产物不入库：`_*.log`、`*_shots/`、`_probe`、`_wt_*`、`*.bak` 等（`_wt_master` / `_ext_repos` 已在 tsconfig exclude，别删这条）。

## 6. 内容管线

### 6.1 目录与接线

- 内容源：`content/{notes,qa,interview,mianjing,articles,glossary,jd,learn,roadmap,community,gzh,imports}`
- 绝大多数内容**一文件一页**，自动进 `sitemap*.xml` / `llms.txt` / FAQPage JSON-LD（glossary 是 DefinedTerm）；新增内容通常不用手改接线。
- 例外：`content/notes/*.md` 必须同时在 `content/notes/index.json` 登记 slug / 标题 / 摘要 / 系列 / 序号 / 预计阅读分钟。
- 社区页：改 `content/community/community.json` 后必须 `pnpm run community:verify`；媒体清单在 `media-manifest.json`。

### 6.2 内容质量红线（违反即返工）

- 论文引用必须真实（标题 / 作者 / arXiv 编号先核实再写）；实验数字必须有出处；记不清就不写。
- 禁「赋能 / 闭环 / 全链路 / 系统化 / 显著提升」类空话，标准见 `docs/article-quality-standard.md`。
- **新文件必须原生全角标点**。`lib/utils.ts` 的 `normalizeCjkPunct` 只是显示层兜底，不是不写的理由。
- 文案口径（2026-09-30 起永久生效）：不展示社群规模类人数；禁运营腔与自我辩解式表述（「可核验、带教、全部验收、每一条都可以点开」这类词清零）；FAQ 不放「成果是真的吗」类条目；对读者写「你会得到什么」，不写「我们怎么组织教学」。

### 6.3 解析器 CRLF 事故（2026-10-03，复发 = 有人改回去了）

articles / mianjing / notes 三个 frontmatter 解析器曾只认 LF，而内容文件 97% 是 CRLF，导致线上约 2500 篇标题回退成 slug、正文裸奔 frontmatter。**新增或修改任何 markdown/frontmatter 解析器必须用 CRLF 文件实测**，正则一律 `\r?\n`。

### 6.4 批量文本替换的危险

CJK 邻接标点的正则会误伤代码（曾把 `(x ?? 3),0)` 转成全角括号导致 tsc 报错）。批量替换脚本跑完必须 `pnpm exec tsc --noEmit` + `grep -rn '[0-9]）' app components lib` 复查。

## 7. 设计体系（双层令牌，改色只改令牌）

- **首页**：冷灰 + 靛蓝学院风，令牌唯一来源 `app/globals.css` 的 `:root` / `.dark`。`--aa-*` 是旧变量名（已重映射到新令牌），不要新增局部色板。
- **子页（notes / interview / mianjing / community 等）**：暖纸白 `#faf6ef` + 陶土单强调 `#b4532a`（kami 风格，2026-10-06 定稿）。作用域层在 `app/kami.css`，靠 `body:has(...)` 按页面 wrapper 切换。**新增子页必须把它的 wrapper 类加进 kami.css 的 body:has 列表**。
- **工具体系（/tools、/jd）**：`app/tools/tools.css` 的 `--tk-*` 令牌。紫 `#6e22f0` 全区禁用（用户明令「蓝紫这类 AI 配色禁止」）；rgba 一律走 `--tk-brand-rgb: 180, 83, 42`。
- **三个令牌坑（都真实发生过）**：
  1. `:root` 声明的别名在 `:root` 处就完成 `var()` 解析再继承——body 级覆盖基础令牌**改不动别名**，必须在同一作用域把别名整套重声明。
  2. 遇到「颜色发灰 / 不生效」先 grep 令牌有没有非 var 的字面定义（曾整组 `--tk-brand: var(--tk-brand)` 自引用潜伏很久）。改完令牌肉眼核对 `:root` 字面值还在。
  3. 每个工具页必须 `import "../tools.css"`（漏了会出现 SPA 导航正常、直开 / 刷新样式全失效的漂移）。
- 布局硬数字：Navigation 是 `fixed top-0` → 主容器 `padding-top ≥ 116px`（移动端 ≥ 96px）；锚点 `scroll-margin-top: 84px`。正文图统一 16:10 `object-fit: cover` + 12px 圆角。断行：`p/li` 用 `text-wrap: pretty`、`h1-h6` 用 `balance`。
- 首页成员区数据源是 `locales/zh.json`（DB members 表是占位种子，别对着 DB 改）。
- 图标用 lucide-react 单色（内容库图标一律单一陶土 tint，多色图标阵列是 AI 味）；em-dash 全禁、半角全角不混排；按钮禁用态用 `aria-disabled` + onClick 守卫，不用原生 `disabled`。
- Logo：`public/logo-light.png` / `logo-dark.png`，用 `dark:hidden` / `hidden dark:block` 切换；**不要在 CSS 里对 logo img 写未分层的 `display`**（会压过 Tailwind 的 `hidden` 导致双影）。

## 8. 构建与部署的已知坑（历史事故，复发 = 有人改回去了）

1. **构建期读 `public/` 是反模式**。`.vercelignore` 会真的把文件从部署产物里删掉，且 Vercel prerender 的 `process.cwd()` 不保证看到 public → 2026-09-29 `/learn` 用 `readFileSync(public/...)` 读 logo 造成连续 13 个 commit 构建失败。修法：改 `<img src>`，构建期零 fs IO。**Vercel 构建失败先查 `.vercelignore` 和 `.gitignore`，再查代码**。
2. `.vercelignore` 排除了本地素材（`content/learn/claude-code/` 草稿区、`reports/`、`.env`、`*.pem`）——别把线上需要的东西放进这些路径。
3. `next.config.mjs` 里的 `staticPageGenerationTimeout: 300`（3000+ 静态页单页生成可能超默认 60s）、首页 ISR、静态资源 7 天强缓存 + 30 天 SWR，这些别顺手删。
4. Vercel 排障（无 CLI 凭据时）：用 GitHub commit status API 轮询 `GET /repos/czstudio/agentalpha_web/commits/<sha>/status`（token 用 `git credential fill` 取，不要打印 / 落盘）；可用 `git read-tree` 组合好 / 坏提交做二分，逐文件定位元凶。
5. 往 `public/` 加了新文件必须重启 `next start`（启动时做文件映射缓存，不重启 404）；复跑截图 / 验证前必杀掉占端口的旧 `next start`（旧进程内存里是旧构建清单，CSS 全 404）。

## 9. 截图验收规范（本仓库大量改动靠截图验收）

- playwright 走 **msedge 通道**。
- `full_page` 截图对 `loading="lazy"` 图片画空框 → 用高视口分段 `window.scrollTo` + 逐段截图再拼接。
- 截图前先注入 `html { scroll-behavior: auto !important }`（站点全局 smooth scroll 会让 scrollTo 变动画，截到半途）。
- `bounding_box()` 是视口相对坐标，滚动后量出来是错的；用 `el.evaluate("el => el.getBoundingClientRect().top + window.scrollY")` 实时换算文档坐标。
- Edge `--headless` 直拍三坑：`--virtual-time-budget` 只推进虚拟时钟、与截图捕获时机解耦（动画页拍空）；系统代理不在线时 HTTPS 全白（加 `--no-proxy-server`）；像素行采样统计有盲区（视觉验收交给视觉模型看切图，别信像素统计）。
- 页面动画必须 `html.js` 类门控 + **无 JS 时内容完全可见**（SEO 与截图安全）；数字开头的 id 选择器不合法，用 `[id='...']` 属性选择器。

## 10. 网络环境（大陆网络，多机必读）

- git remote 走 **SSH over 443**：新机器在 `~/.ssh/config` 配 `Host github.com` → `ssh.github.com:443`（22 端口常被掐），密钥注册到 czstudio 账号。
- 网站打不开 ≠ 部署挂了：先排查 Vercel 边缘 IP 被墙。诊断：`curl --resolve agentalpha.top:443:76.76.21.21 https://agentalpha.top -I` 逐 IP 测，能区分「部署挂了」和「IP 被墙」。实测可达的边缘 IP：`76.76.21.21`、`76.76.21.22`、`66.33.60.129`。改 DNS 记录需要账号管理员在阿里云控制台操作。
- 极端情况（github.com:443 不通、api.github.com 可达）：`python scripts/api_push_fallback.py --commit <sha>` 走 REST API 直推，推完 `git fetch origin && git reset --hard origin/master` 对齐。

## 11. SEO 与收录

- 策略：一题一页吃长尾词，`best/` 聚合大页吃宽泛词。
- 站点自动产出 `sitemap.xml`（含 articles / questions / glossary 分片）、`llms.txt`、`llms-full.txt`、`robots.ts`、`feed.xml`。
- 部署后跑 `python scripts/submit_indexnow.py` 推 IndexNow（密钥文件 `public/0e18711cf3d442e2ac467bb38ad2528c.txt`）加速 Bing 收录。

## 12. 文档索引

| 文档 | 内容 |
|---|---|
| `AGENTS.md`（本文件） | 权威入口：构建、发布、门禁、历史坑 |
| `docs/site-architecture.md` | 信息架构与产品定位 |
| `docs/AI_HANDOFF.md` | 历史交接记录（2026-09，Mac 工作树视角，部分已过时） |
| `docs/TOOLS-ROADMAP.md` | 求职工具箱路线 |
| `docs/CONTENT_ROADMAP.md` | 内容路线 |
| `docs/article-quality-standard.md` | 文章质量标准 |
| `docs/LLM-DEPLOY.md` | 部署相关记录 |
