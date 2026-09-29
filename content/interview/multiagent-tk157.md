---
slug: multiagent-tk157
no: "1057"
title: "Multi-Agent 的「DAG 任务调度「如何实现"
question: "Multi-Agent 的「DAG 任务调度「如何实现"
excerpt: "面试官想看你能否处理有依赖关系的复杂任务调度。刁钻点在于：DAG 调度不只是"拓扑排序"，还涉及并行执行、失败传播、动态 DAG（运行时发现新依赖）等复杂场景。"
tags: ["真题解析", "多智能体"]
category: "multiagent"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 6
words: 2824
updated: "2026-09-29"
---

## Multi-Agent 的「DAG 任务调度「如何实现

#### 1️⃣ 考察意图

面试官想看你能否处理有依赖关系的复杂任务调度。刁钻点在于：DAG 调度不只是"拓扑排序"，还涉及并行执行、失败传播、动态 DAG（运行时发现新依赖）等复杂场景。

#### 2️⃣ 标准答

**DAG 调度从"构建、执行、失败处理、动态扩展"四个方面设计。**

**1. DAG 构建**

`class TaskDAG:**    def __init__(self):
        self.nodes = {}  # task_id → Task
        self.edges = {}  # task_id → [dependent_task_ids]

    def add_task(self, task, depends_on=[]):
        self.nodes[task.id] = task
        self.edges[task.id] = depends_on

    def get_ready_tasks(self):
        """获取无依赖或依赖已完成的任务"""
        ready = []
        for tid, deps in self.edges.items():
            if self.nodes[tid].status == 'pending':
                if all(self.nodes[d].status == 'success' for d in deps):
                    ready.append(self.nodes[tid])
        return ready

    def get_critical_path(self):
        """获取关键路径（最长依赖链）"""
        # 用拓扑排序 + 动态规划计算最长路径
        ...`2. 并行执行**

- 无依赖的任务并行分配给不同 Agent
- 依赖任务等待前驱完成后才进入就绪队列
- 并行度受可用 Agent 数量限制

**3. 失败处理**

- **节点失败**：标记为 'failed'，下游依赖该节点的任务标记为 'blocked'（不执行）
- **部分失败**：DAG 中部分分支失败不影响其他独立分支的执行
- **重试**：失败节点重试 3 次。重试成功则继续执行下游；重试失败则标记下游为 'blocked'
- **降级执行**：关键路径上的节点失败时，可以降级执行（如用更简单的算法），保证 DAG 不完全阻塞

**4. 动态 DAG**

运行时发现新任务（如 Agent 执行过程中发现需要额外的分析步骤）：

- Agent 在执行中可以调用 `dag.add_task(new_task, depends_on=[current_task])` 添加新节点
- 新节点的依赖必须是已完成或正在执行的任务
- 动态添加后重新计算就绪队列和关键路径

#### 3️⃣ 答题模板（30 秒电梯版）

> "DAG 调度四部分：构建——TaskDAG 类管理节点和边，get_ready_tasks 返回无依赖或依赖已完成的任务。执行——无依赖任务并行分配，依赖任务等前驱完成。失败处理——节点失败标记下游blocked，独立分支不受影响，重试3次，关键路径可降级。动态DAG——Agent执行中可添加新任务节点，重新计算就绪队列。核心：并行执行无依赖任务+串行执行有依赖任务。"

#### 4️⃣ 高频追问 & 应对

**追问 1**：关键路径怎么计算？有什么用？

> 计算：拓扑排序 + 动态规划。对每个节点计算 `earliest_finish_time = max(前驱的 EFT) + estimated_duration`。关键路径是 EFT 最大的路径。用途：(1) 优先调度——关键路径上的任务优先分配（因为它们决定总完成时间）；(2) 资源分配——关键路径任务分配更强的 Agent（如 GPT-4），非关键路径用小模型；(3) 延迟预估——关键路径长度 = 预估总完成时间。

**追问 2**：DAG 中有循环依赖怎么办？

> 循环依赖不是合法的 DAG（DAG 要求无环）。检测：拓扑排序时如果剩余节点无法继续排序（所有剩余节点都有未完成的前驱），说明存在环。处理：(1) 拒绝构建——在 add_task 时检查是否会形成环（DFS 检测），如果会则拒绝并报错；(2) 人工介入——运行时发现环时暂停 DAG 执行，通知开发者修正依赖关系。

**追问 3**：动态 DAG 和静态 DAG 的区别是什么？什么时候该用动态？

> 区别：(1) 静态 DAG——任务和依赖在执行前全部确定。适合流程明确的任务（如 CI/CD）；(2) 动态 DAG——执行过程中可以添加新任务。适合探索性任务（如"研究这个话题"→研究发现需要做实验→实验发现需要做更多分析）。什么时候用动态：当任务的结构在执行前无法完全确定时。但动态 DAG 的调试和优化更难（无法预先计算关键路径）。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ "DAG 调度就是拓扑排序" → ✅ "拓扑排序只是确定执行顺序。完整的 DAG 调度还包括并行执行、失败传播、关键路径优化、动态扩展。"
- ❌ "一个节点失败了整个 DAG 就失败了" → ✅ "DAG 中独立分支的失败不影响其他分支。只有关键路径上的失败才影响整体完成。应该部分失败部分成功。"
- ❌ "DAG 必须在执行前完全定义" → ✅ "动态 DAG 允许执行中添加新任务。适合探索性任务，但需要运行时重新计算调度策略。"

#### 6️⃣ 简历呼应

- **如果你有工作流引擎经验**：从"DAG 调度实现"切入，描述你用 Airflow/Temporal/自研引擎的经验
- **如果你只做过单 Agent**：用"函数调用栈 vs DAG 调度"切入
- **如果你是校招无项目**：用 Python 实现一个支持并行执行和失败处理的 DAG 调度器，写一篇博客
- "DAG Scheduling in Distributed Systems" (Topcuouglu et al., 2002)
- "Airflow: Workflow Management" (Apache, 2024)
- "Dynamic DAG Scheduling for Multi-Agent Systems" (Ji et al., 2024)

---
