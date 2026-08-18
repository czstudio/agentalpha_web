# AgentAlpha /community 视觉总监审查与优化报告

日期：2026-08-10
范围：`app/community/community.css`、`components/community/community-experience.tsx`、`components/community/community-document.tsx`
基线：当前工作树（含他人未提交改动），全部为增量修改，未回退、覆盖或丢弃任何已有改动。

## 一、审查结论

当前实现（“Redesign community page and motion system”）整体已具备成熟的编辑部/项目档案风格，结构、节奏与深浅主题基础扎实。审查发现的主要问题：

1. **中文标题字距过紧**：hero / 章节 / 页脚大标题使用 `-0.055em ~ -0.075em` 负字距。该值对拉丁字母成立，对宋体中文会导致字面粘连、可读性下降；行高 0.92–1.02 对中文也偏低。
2. **正文字体栈不完整**：仅 `"Avenir Next", "PingFang SC", "Hiragino Sans GB"`，Windows/Linux 会落到无衬线默认字体，中文观感不一致；衬线标题缺思源宋体回退。
3. **图片比例缺少方向差异化**：`is-wide / is-square / is-portrait` 已分类，但仅 portrait 有宽度约束，方图可能铺满整栏显得笨重；`sizes` 未按方向区分，竖图会按 94vw 拉取过大的 srcset。
4. **交互反馈偏少且触屏不友好**：hover 样式未包 `@media (hover: hover)`，触屏点按后 hover 态会滞留；导航、按钮、表格行、图片缺少微动效。
5. **键盘焦点可见性不足**：焦点环用 `--acid`（#c9ff3d），在米色纸面上对比度不足。
6. **移动端菜单键盘可达性**：打开后无法按 Escape 关闭。
7. 配色、章节节奏、移动端布局整体良好，仅需微调：muted 对比度略低、暗色主题蓝色偏暗、列表项间距与 marker 缺层次。

内容侧确认：来源、revision、同步时间、图片数量等后台信息本就只存在于 `community.json` 元数据，渲染层未展示；本次未引入任何此类信息。Logo 动画素材（brand-stage / brand-lockup / brand-node）未改动。未新增依赖，未发布未部署。

## 二、设计原则

1. 内容优先：不增删任何正文，只用排版、配色、节奏与动效提升可读性与可信度。
2. 中文排版优先：中文标题用宽松字距与更大行高，正文 1.8–1.9 行高 + `text-wrap: pretty`。
3. 微动效克制、可关闭：全部 hover 动效包在 `@media (hover: hover)`，既有 `prefers-reduced-motion` 兜底规则保持有效。
4. 增量、可审查：每处修改都落在现有选择器上，不改 DOM 结构、不改类名契约。

## 三、实际改动

### `app/community/community.css`

- 基础：补全中文字体栈（Source Han Sans / Noto Sans CJK / 微软雅黑）；衬线标题补 Noto Serif CJK / Source Han Serif 回退；加 `text-rendering`、`font-smoothing`、`-webkit-tap-highlight-color: transparent`；`color-scheme` 明/暗声明；`::selection` 品牌蓝；`prefers-reduced-motion: no-preference` 下对页面开启平滑滚动。
- 配色：亮色 `--muted` 由 `#697181` 加深至 `#5d6572`（提升对比度）；暗色 `--blue` 由 `#7190ff` 提亮至 `#8fa4ff`。
- 中文标题层级：hero h1 行高 0.92→1.04、字距 -0.075em→-0.02em；章节 h2 行高 1.02→1.1、字距 -0.055em→-0.02em；子章节 h3 字距 -0.035em→-0.015em、行高 1.2；CTA h2 与页脚 strong 字距同步收敛；移动端对应覆盖同步修正。
- 正文节奏：段落/列表加 `text-wrap: pretty`；列表项间距 7px、marker 用品牌蓝；strong 明确 700；正文链接下划线粗细过渡。
- 图片比例：方图限宽 `min(88%, 700px)`，宽图限高 780px；网格内图片仍满宽；图片 hover 轻微放大 1.018（仅 hover 设备，0.5s 缓动）。
- 微动效（全部 `@media (hover: hover)` 包裹）：导航链接下划线展开、hero 按钮上浮 + 变品牌蓝 + 箭头位移、正文按钮上浮、表格行 hover 底色；表格横向滚动条细化。
- 键盘焦点：焦点环改为 `--blue` 3px + 1px 圆角，深色区块（CTA/页脚/brand-stage）内用 `--acid` 保证可见。
- 移动端：方图在 ≤720px 恢复满宽；其余既有断点逻辑未动。

### `components/community/community-experience.tsx`

- 移动端导航菜单增加 Escape 关闭（仅菜单打开时监听，自动清理）。其余逻辑（GSAP 时间轴、ScrollTrigger、Logo 动画、滚动监听）未动。

### `components/community/community-document.tsx`

- 图片 `sizes` 按方向精细化：竖图 `(max-width: 760px) 100vw, 580px`，方图 `700px` 上限，宽图保持原值 —— 让 next/image 选取更贴合实际渲染宽度的 srcset，减少移动端流量。渲染结构与全部正文输出未变。

## 四、验证结果

- `npx tsc --noEmit`：通过（0 错误）。
- `python3 scripts/sync_community_doc.py --verify`：通过（revision 853，contentHash 一致，59 图 / 19 标题）。
- `python3 scripts/verify_community_public_copy.py`：`COMMUNITY_PUBLIC_COPY_OK`。
- `node scripts/verify-community-page.mjs`（本地 dev server :3100 + Playwright Chrome，1440/820/390 三视口）：全部 `COMMUNITY_PAGE_OK` —— 单一 h1、8 章节、无横向溢出、成果图无塌缩、无后台信息字样。
- 人工截图目检：桌面 hero、成果章节、移动端首页，中文标题间距、图片比例、深浅主题均正常。
- `npm run lint`（eslint）：**基线即不可用** —— 仓库未安装本地 `eslint` 包（`eslint.config.mjs` 为未跟踪新文件，package.json 无 eslint 依赖），npx 拉取的 eslint 10 无法解析配置；按“不新增依赖”要求未安装，与本次改动无关。

## 五、遗留建议（未执行，超出本次范围）

- 若需启用 lint，需团队确认后将 `eslint` / `eslint-config-next` 加入 devDependencies。
- 可考虑为暗色主题截图做一轮专项目检（当前截图环境为暗色，亮色主题亦建议抽查）。

## 六、独立 QA 后的第二轮修正

依据 `reports/community-independent-visual-qa.md` 完成第二轮增量实现，正文、原图链接与全部证据均保留：

- 移动菜单改为明确的遮罩 + 抽屉结构，亮暗主题均使用显式前景/背景组合；增加背景滚动锁定、首次焦点、Tab/Shift+Tab 焦点闭环、Escape 关闭、关闭后焦点归还与跨桌面断点自动关闭。
- 修正蓝色 CTA 区的文字对比度；正文按钮与深色交互态采用稳定的高对比色，不依赖主题反转后的同色 token。
- 移动端 H2 收敛至 34–40px；顶部导航 48px、章节索引 45px，常驻高度合计 93px；向下滚动自动隐藏章节索引，向上滚动恢复。
- 菜单、章节索引、按钮与渐进披露控件的点击目标均不小于 44px。
- 社区页动画属性改为明确列举，社区相关文件不再使用 `transition: all`。
- 连续证据卡默认展示前三项，其余内容置于原生 `details/summary` 渐进披露区域；不删除正文、不删除图片、不改原图链接，展开标签不显示后台计数信息。
- 沿用既有 Logo 与品牌节点动画，未修改任何 Logo 动画素材。

### 第二轮验证

- `npx tsc --noEmit`：通过。
- `python3 scripts/sync_community_doc.py --verify`：通过（正文哈希一致）。
- `python3 scripts/verify_community_public_copy.py`：`COMMUNITY_PUBLIC_COPY_OK`。
- Playwright 多视口检查（320 / 390 / 768 / 1440）：无横向溢出；8 个章节完整；渐进披露区域内内容与原图链接保留；移动端常驻栏合计 93px。
- 移动菜单交互检查：遮罩可关闭、焦点首次进入菜单、Tab/Shift+Tab 保持在菜单与触发器内、Escape 关闭并归还焦点、背景固定且关闭后恢复原滚动位置。
- 移动章节索引检查：下滚隐藏、上滚恢复；渐进披露控件高度 44px。
- `rg 'transition:\\s*all' app/community/community.css components/community`：无匹配。

### 第二轮补充记录（抽屉渲染缺陷排查）

- **缺陷 A：抽屉只露出第一个菜单项。** 根因：GSAP 入场动画在 `.community-nav` 上残留内联 `transform: translate(0px, 0px)`，使抽屉的 `position: fixed` 相对导航条（48px 高）定位，面板被压缩到约 92px 并被自身 `overflow-y: auto` 裁切。修复：给该入场 tween 加 `clearProps: "transform"`，动画结束后移除内联 transform，抽屉恢复全视口高度；Logo 与品牌节点动画未动。
- **缺陷 B：关闭按钮被抽屉盖住。** 菜单按钮无定位，层叠顺序低于面板（z-index 94）。修复：移动端 `.community-menu-button` 增加 `position: relative; z-index: 95`。
- 修复后 Playwright 复查：面板高度 844px（全视口），四个菜单项命中测试全部通过，右上角关闭按钮可点击；390px 与 320px 截图目检抽屉、遮罩、文字对比均正常。
- 另外确认：QA 提到的 `transition: all` 仅存在于 `app/globals.css` 的首页 glass-card 等类（非 community 元素、不在本次允许修改范围内）；community 三个文件内所有 transition 均为明确属性列举。
