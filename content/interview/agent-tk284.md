---
slug: agent-tk284
no: "1184"
title: "path: /tmp/sort.py # ← 你咋知道 Agent 会存这"
question: "path: /tmp/sort.py # ← 你咋知道 Agent 会存这"
excerpt: "面试官想考察你对 Agent 文件系统交互的安全性与架构设计的深度理解。这不是背概念题，而是系统设计 + 工程取舍题。刁钻点在于：看似问路径，实则问 Agent 如何管理状态、隔离风险、防止注入。答好了能展示你对 Age"
tags: ["真题解析", "Agent 架构"]
category: "agent"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 8
words: 3649
updated: "2026-09-29"
---

## path: /tmp/sort.py # ← 你咋知道 Agent 会存这

`P1` · `agent_architecture`

🏷 标签：`agent`, `file-system`, `security`, `architecture`

#### 1️⃣ 考察意图

面试官想考察你对 Agent 文件系统交互的**安全性与架构设计**的深度理解。这不是背概念题，而是**系统设计 + 工程取舍**题。刁钻点在于：看似问路径，实则问 Agent 如何管理状态、隔离风险、防止注入。答好了能展示你对 Agent 生产化部署的实战经验，包括沙箱隔离、路径遍历防护、以及跨平台兼容性。面试官期待听到具体框架的默认行为（如 LangChain 用 `/tmp`、AutoGPT 用 `./workspace`）和背后的 trade-off。

#### 2️⃣ 标准答

**核心问题**：Agent 为什么默认写 `/tmp/sort.py`？这暴露了三个设计缺陷：路径硬编码、无沙箱隔离、无权限校验。

**1. 默认路径的陷阱**

- **/tmp 的隐患**：Linux 下 `/tmp` 是共享临时目录，多用户可读写。Agent 写入 `sort.py` 后，其他进程可篡改或读取，导致**代码注入**或**数据泄露**。例如，恶意进程替换 `sort.py` 为恶意脚本，Agent 下次执行时触发。
- **跨平台问题**：Windows 无 `/tmp`，路径会失败；macOS 的 `/tmp` 是符号链接到 `/private/tmp`，行为不一致。
- **工程取舍**：用 `/tmp` 的优点是无需配置、权限宽松，但牺牲了安全性。生产环境必须替换为**隔离的工作目录**（如 `./workspace` 或 `~/.agent_data`）。

**2. 安全架构设计**

- **沙箱隔离**：使用 `chroot` 或 Docker 容器限制 Agent 文件系统范围。例如，OpenAI 的 Code Interpreter 在沙箱中运行，每个会话分配独立 `/tmp`，会话结束后销毁。
- **路径白名单**：只允许写入 `allowed_dirs` 列表（如 `./output/`），拒绝 `../` 或 `/etc/` 等路径遍历攻击。用 `os.path.realpath()` 解析符号链接后再校验。
- **权限最小化**：Agent 进程以非 root 用户运行，文件权限设为 `600`（仅所有者读写）。写入前检查目录是否存在且可写，避免覆盖系统文件。

**3. 框架对比与最佳实践**

- **LangChain**：默认 `FileChatMessageHistory` 写 `/tmp`，但提供 `base_dir` 参数可配置。坑：未自动创建目录，需手动 `os.makedirs`。
- **AutoGPT**：默认 `./workspace`，相对路径更安全，但多实例运行时可能冲突。解法：用 `uuid` 生成子目录（如 `./workspace/{session_id}/`）。
- **实际落地坑**：某项目 Agent 写日志到 `/tmp`，被运维清理脚本误删，导致状态丢失。解法：改用 `~/.agent_data/` 持久化，并添加 `.gitkeep` 文件防止空目录被清理。

**4. 可配置方案**

- **环境变量**：`AGENT_WORK_DIR=/var/agent_data`，代码中 `os.getenv('AGENT_WORK_DIR', '/tmp/agent_default')`。
- **启动参数**：`--work-dir ./sandbox`，结合 `argparse` 解析。
- **运行时动态**：根据用户 ID 或会话 ID 生成路径，如 `/data/agents/{user_id}/{session_id}/`，实现多租户隔离。

**总结**：路径选择是安全与便利的平衡。生产环境必须：沙箱隔离 + 路径白名单 + 权限最小化 + 可配置。

#### 3️⃣ 答题模板（30 秒电梯版）

> "这个问题我从安全、架构、配置三个层面回答。安全层面，`/tmp` 是共享目录，存在代码注入和跨平台风险，必须用沙箱隔离。架构层面，应设计路径白名单和权限最小化，避免路径遍历攻击。配置层面，通过环境变量或启动参数支持自定义工作目录，并自动生成唯一子目录。总结一句：Agent 文件系统设计要默认安全、显式配置、运行时隔离。"

#### 4️⃣ 高频追问 & 应对

**追问 1**：如果 Agent 需要读取用户上传的文件，如何防止路径遍历攻击？

> 使用 `os.path.realpath()` 将用户提供的路径解析为绝对路径，然后检查是否在 `allowed_base_dir` 下。例如：`user_path = '/data/uploads/../../etc/passwd'`，`real_path = os.path.realpath(os.path.join(base_dir, user_path))`，若 `real_path.startswith(base_dir)` 则允许，否则拒绝。同时，限制文件扩展名白名单（如 `.txt`, `.pdf`），拒绝 `.py`, `.sh` 等可执行文件。生产环境可结合 `seccomp` 限制系统调用，禁止 `open` 系统调用访问非白名单路径。

**追问 2**：多用户场景下，如何隔离 Agent 的工作目录？

> 采用多租户目录结构：`/data/agents/{tenant_id}/{user_id}/{session_id}/`。每个目录权限设为 `700`（仅所有者可读写），通过 `os.chmod` 设置。使用 `uuid.uuid4()` 生成会话 ID，避免路径冲突。清理策略：会话结束后异步删除目录，或设置 TTL（如 24 小时）由定时任务清理。若使用 Docker，每个用户分配独立容器，挂载不同卷，彻底隔离。

**追问 3**：Agent 写入文件时，如何保证原子性，防止部分写入导致数据损坏？

> 使用写时重命名策略：先写入临时文件（如 `sort.py.tmp`），写入完成后用 `os.rename()` 原子替换目标文件。`os.rename()` 在 POSIX 系统上是原子操作，可避免并发读写问题。同时，写入前检查磁盘空间（`shutil.disk_usage`），预留 10% 缓冲。若写入失败，删除临时文件并回滚状态。对于大文件，考虑分块写入并记录校验和（如 SHA256），读取时验证完整性。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ 说“`/tmp` 是标准路径，没问题，大家都这么用” → ✅ 正确切入：指出 `/tmp` 的安全隐患，并给出沙箱隔离方案。
- ❌ 说“用绝对路径 `/home/user/agent_data` 就安全了” → ✅ 正确切入：绝对路径仍可能被其他进程访问，必须结合权限最小化和路径白名单。
- ❌ 说“路径问题不重要，Agent 核心是 LLM 调用” → ✅ 正确切入：文件系统是 Agent 状态持久化的关键，设计不好会导致数据泄露或系统崩溃。

#### 6️⃣ 简历呼应

- **如果你有 RAG 项目**：从文档存储路径设计切入，对比向量数据库的持久化与临时文件的区别，强调 Agent 文件系统与 RAG 管道的隔离。
- **如果你只做过传统 NLP**：用日志文件管理类比，说明路径选择类似日志轮转策略，需要兼顾安全性与可维护性，并迁移到 Agent 场景。
- **如果你是校招无项目**：聚焦论文《Code Interpreter: Sandboxing LLM Agents》，复现一个最小沙箱 demo，用 Python `tempfile` 模块实现临时目录隔离，并测试路径遍历攻击。

#### 7️⃣ 延伸阅读

- 《Code Interpreter: Sandboxing LLM Agents》—— OpenAI 沙箱设计
- 《LangChain File System Guide》—— LangChain 文件操作最佳实践
- 《OWASP Path Traversal Prevention Cheat Sheet》—— 路径遍历防护
- 《AutoGPT Workspace Architecture》—— AutoGPT 工作目录设计
- 《Python tempfile 模块官方文档》—— 临时文件安全创建

---
