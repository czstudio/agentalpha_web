---
slug: enterprise-tk438
no: "1338"
title: "我存 ./my_sorting_script.py 不行吗"
question: "我存 ./my_sorting_script.py 不行吗"
excerpt: "面试官想考察你工程化思维的深度，而非单纯背概念。这道题看似简单，实则直指 Agent 系统设计中的文件系统隔离与并发安全。刁钻点在于：候选人往往只想到“相对路径 vs 绝对路径”的语法差异，而忽略了多会话、多用户、持久化"
tags: ["真题解析", "通用与软实力"]
category: "enterprise"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 8
words: 3780
updated: "2026-09-29"
---

## 我存 ./my_sorting_script.py 不行吗

#### 1️⃣ 考察意图

面试官想考察你**工程化思维**的深度，而非单纯背概念。这道题看似简单，实则直指 **Agent 系统设计中的文件系统隔离与并发安全**。刁钻点在于：候选人往往只想到“相对路径 vs 绝对路径”的语法差异，而忽略了**多会话、多用户、持久化**场景下的路径冲突、竞态条件和安全漏洞。答好了，能展示你对分布式 Agent 架构（如会话隔离、临时目录管理、文件锁）的实战理解，证明你不是只会调 API 的“玩具 Agent”开发者。

#### 2️⃣ 标准答

这个问题核心是 **Agent 工作目录的隔离设计**。用 `./my_sorting_script.py` 在单次实验里没问题，但在生产级 Agent 系统中是灾难。我从三个层面拆解：

**1. 相对路径的隐式依赖：当前工作目录（CWD）**

- `./` 是相对于 Agent 进程启动时的 CWD。在多会话场景下（如一个 Agent 服务同时服务 100 个用户），所有会话共享同一个 CWD。
- **坑**：会话 A 写入 `./script.py`，会话 B 也写入同名文件，后写的会覆盖前者，导致 A 后续读取到 B 的数据，产生**数据污染**。更糟的是，如果 A 正在执行脚本，B 覆盖了文件，A 可能读到不完整的代码，引发 `SyntaxError` 或执行恶意逻辑。

**2. 并发场景下的竞态条件**

- 即使文件名不同（如 `./user1_script.py` 和 `./user2_script.py`），在**高并发写入**时，文件系统操作（创建、写入、删除）不是原子的。两个会话可能同时执行 `os.makedirs('./tmp')`，其中一个会失败（如果目录已存在且未加 `exist_ok=True`）。
- **解法**：使用 `tempfile.mkdtemp()` 为每个会话生成一个**唯一临时目录**，路径如 `/tmp/agent_<uuid>/`。Python 的 `tempfile` 模块底层会处理并发安全（通过 PID + 随机数 + 时间戳保证唯一性）。关键 trade-off：临时目录在会话结束后必须清理，否则磁盘会爆；但清理时要注意**文件锁**——如果会话的异步任务还在读取文件，直接删除会报 `OSError`。

**3. 持久化与安全**

- 如果 Agent 需要持久化文件（如保存用户上传的代码），绝对路径 + UUID 命名是标准做法：`/data/agents/<session_id>/my_sorting_script.py`。但绝对路径暴露了服务器目录结构，有**路径遍历攻击**风险（如用户输入 `../../etc/passwd`）。
- **工程取舍**：用 `os.path.abspath()` 结合 `os.path.realpath()` 做路径规范化，并检查结果是否在允许的根目录下（chroot jail 思想）。例如：

`base_dir = "/data/agents/"**user_path = os.path.realpath(os.path.join(base_dir, session_id, filename))
if not user_path.startswith(base_dir):
raise SecurityError("Path traversal detected")
`
- **实际落地的坑**：在 Docker 容器中，`/tmp` 默认是共享的，多个 Agent 容器可能冲突。解法：挂载独立卷，或在容器启动时设置 `TMPDIR` 环境变量指向容器私有目录（如 `/app/tmp/<container_id>`）。
总结**：`./` 是单机单会话的“偷懒写法”，生产环境必须用**会话级隔离目录 + UUID 命名 + 路径安全检查**。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从三个层面回答：第一，相对路径依赖当前工作目录，多会话共享 CWD 会导致文件覆盖和数据污染；第二，并发场景下存在竞态条件，应使用 `tempfile.mkdtemp()` 生成唯一临时目录，并注意清理时的文件锁；第三，持久化场景必须用绝对路径 + UUID 命名，并做路径遍历防护。总结一句：`./` 是玩具代码，生产环境必须用会话级隔离。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：如果 Agent 需要多个文件协同工作（如一个 Python 脚本依赖另一个模块），你怎么设计目录结构？

> 用会话级根目录，内部按功能划分子目录。例如：`/tmp/<session_id>/scripts/` 放主脚本，`/tmp/<session_id>/modules/` 放依赖模块。关键点：在 `sys.path` 中动态添加模块目录，但要注意**路径注入**——只允许添加会话自己的目录，不能暴露系统路径。另外，模块间的相对导入（`from . import helper`）在临时目录中可能失效，因为 Python 的包机制要求 `__init__.py` 文件。解法：使用 `importlib` 动态加载，或直接修改 `sys.path` 后执行 `exec(open(script_path).read())`。

**追问 2**：如果 Agent 运行在无状态容器（如 AWS Lambda）中，`/tmp` 空间有限且不持久，你怎么处理？

> Lambda 的 `/tmp` 最大 512MB，且每次冷启动会清空。策略：1）优先用内存（如 `io.BytesIO`）而非磁盘；2）必须写文件时，用 `tempfile.NamedTemporaryFile(delete=False)` 并确保在函数返回前清理；3）对于大文件（>100MB），直接上传到 S3 并用预签名 URL 传递，避免本地存储。trade-off：内存操作快但有限，磁盘操作慢但容量大，需根据文件大小动态选择。

**追问 3**：你怎么测试这种文件隔离系统的正确性？

> 写并发测试：用 `concurrent.futures.ThreadPoolExecutor` 启动 50 个会话，每个会话写入同名文件（如 `./data.txt`），然后验证每个会话读取到的内容是否为自己写入的。指标：文件冲突率（应为 0%）、会话隔离成功率（应为 100%）。还要测试清理逻辑：模拟会话异常退出，验证临时目录是否被正确删除（用 `atexit` 注册清理函数，或用 `contextlib.suppress` 捕获删除时的 `PermissionError`）。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ “用绝对路径代替相对路径就解决了。” → ✅ 绝对路径只是解决了 CWD 依赖问题，但没解决并发冲突和路径遍历。必须结合 UUID 隔离和路径安全检查。
- ❌ “用 `tempfile` 模块自动清理，不用管。” → ✅ `tempfile` 的 `mkdtemp()` 不会自动清理，需要手动 `shutil.rmtree()`。而且如果会话有子进程在写文件，直接删除会报错，需要先 kill 子进程或等待文件锁释放。

#### 6️⃣ 简历呼应

- **如果你有 Agent 项目**：从“我在 XX 项目中用 `tempfile.mkdtemp()` 实现了会话隔离，解决了多用户并发写入冲突”切入，并提到你如何用 `os.path.realpath()` 防止路径遍历攻击。
- **如果你只做过传统后端**：类比“这和 Web 应用中的 session 隔离类似，每个用户有独立 session 目录，但文件系统比内存更脆弱，需要处理竞态和清理”。
- **如果你是校招无项目**：聚焦“我复现过 OpenAI Code Interpreter 的沙箱设计，用 Docker 容器 + 临时目录实现了文件隔离”，并说明你测试了 100 个并发会话的冲突率。
- Python `tempfile` 官方文档：`mkdtemp`, `NamedTemporaryFile`, `TemporaryDirectory` 用法与源码
- 《File System Design for Multi-Tenant AI Agents》—— 一篇关于 Agent 文件隔离的博客
- OWASP Path Traversal 防护指南：`os.path.realpath` 与 `startswith` 检查
- 《Concurrent File Operations in Python: Locking, Atomicity, and Race Conditions》—— 深入文件锁与竞态
- Docker 容器中 `/tmp` 共享问题的解决方案：`TMPDIR` 环境变量与卷挂载

---
