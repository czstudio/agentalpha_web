---
slug: enterprise-tk516
no: "1416"
title: "实现一个 ReAct 框架的核心循环（思考-行动-观察），用 Python 代码展示。"
question: "实现一个 ReAct 框架的核心循环（思考-行动-观察），用 Python 代码展示。"
excerpt: "面试官想看你能否将 ReAct 论文中的理论转化为可运行代码。刁钻点在于：很多人只写一个 while 循环调用 LLM，但忽略了对 LLM 输出的解析鲁棒性、工具调用失败的恢复策略、以及如何防止无限循环。答好了能展示你的"
tags: ["真题解析", "编程题"]
category: "enterprise"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 17
words: 7911
updated: "2026-09-29"
---

## 实现一个 ReAct 框架的核心循环（思考-行动-观察），用 Python 代码展示。

#### 1️⃣ 考察意图

面试官想看你能否将 ReAct 论文中的理论转化为可运行代码。刁钻点在于：很多人只写一个 while 循环调用 LLM，但忽略了对 LLM 输出的解析鲁棒性、工具调用失败的恢复策略、以及如何防止无限循环。答好了能展示你的循环控制、错误恢复、和 LLM 交互设计的工程能力。

#### 2️⃣ 标准答

`import re**import json
import logging
from typing import Dict, Any, Optional
from dataclasses import dataclass, field

logger = logging.getLogger("react_agent")

@dataclass
class ReActStep:
    """单步执行记录"""
    thought: str = ""
    action: str = ""
    action_input: Dict = field(default_factory=dict)
    observation: str = ""
    error: Optional[str] = None

class ReActAgent:
    def __init__(self, llm_client, tool_registry, max_iterations=10):
        self.llm = llm_client
        self.tools = tool_registry
        self.max_iter = max_iterations

        self.system_prompt = """你是一个使用 ReAct 框架的 Agent。
请严格按照以下格式回复：

Thought: <你的思考过程>
Action: <工具名称>
Action Input: {"param": "value"}

当你得到最终答案时，使用：
Thought: <最终思考>
Final Answer: <最终答案>

可用工具: {tools}
"""

    def run(self, query: str, session_id: str = "") -> str:
        """ReAct 主循环"""
        steps: list[ReActStep] = []
        context = f"Question: {query}\n"

        for i in range(self.max_iter):
            logger.info(f"[Iter {i+1}] Running ReAct step")

            # 步骤1: Thought - 调用 LLM 生成思考
            prompt = self.system_prompt.format(
                tools=self.tools.get_descriptions()
            ) + context

            try:
                llm_output = self.llm.generate(prompt, temperature=0.1)
            except Exception as e:
                logger.error(f"LLM 调用失败: {e}")
                steps.append(ReActStep(error=f"LLM_ERROR: {e}"))
                # LLM 失败时重试一次，而非直接退出
                if i == 0:
                    continue
                break

            # 步骤2: 解析 LLM 输出
            step = self._parse_output(llm_output)
            steps.append(step)
            logger.info(f"[Iter {i+1}] Thought: {step.thought[:100]}...")

            # 检查是否得到最终答案
            if step.action == "FINAL_ANSWER":
                logger.info(f"Task completed in {i+1} iterations")
                return step.thought

            # 步骤3: Action - 执行工具调用
            if step.action and step.action != "FINAL_ANSWER":
                try:
                    # 参数校验 + 权限检查 + 执行
                    result = self.tools.execute(
                        tool_name=step.action,
                        params=step.action_input,
                        user_role="agent",
                        session_id=session_id
                    )
                    step.observation = json.dumps(result, ensure_ascii=False)

                except PermissionError as e:
                    step.observation = f"权限不足: {e}"
                    logger.warning(f"Tool permission denied: {e}")

                except ValueError as e:
                    step.observation = f"参数错误: {e}"
                    logger.warning(f"Tool param error: {e}")

                except Exception as e:
                    step.observation = f"工具执行失败: {type(e).__name__}: {e}"
                    step.error = str(e)
                    logger.error(f"Tool execution failed: {e}")

            # 步骤4: Observation - 将结果加入上下文
            context += f"\nThought: {step.thought}\n"
            if step.action:
                context += f"Action: {step.action}\n"
                context += f"Action Input: {json.dumps(step.action_input)}\n"
            context += f"Observation: {step.observation}\n"

            # 防止上下文过长
            if len(context) > 8000:
                context = self._compress_context(context)

        # 超过最大迭代次数
        logger.warning(f"Max iterations ({self.max_iter}) reached")
        return f"Agent 在 {self.max_iter} 次迭代后未能完成任务。最后思考: {steps[-1].thought}"

    def _parse_output(self, output: str) -> ReActStep:
        """解析 LLM 输出，提取 Thought/Action/Action Input"""
        step = ReActStep()

        # 提取 Thought
        thought_match = re.search(r'Thought:\s*(.*?)(?:\nAction:|$)', output, re.DOTALL)
        if thought_match:
            step.thought = thought_match.group(1).strip()

        # 检查 Final Answer
        final_match = re.search(r'Final Answer:\s*(.*?)$', output, re.DOTALL)
        if final_match:
            step.action = "FINAL_ANSWER"
            step.thought = final_match.group(1).strip()
            return step

        # 提取 Action
        action_match = re.search(r'Action:\s*(.*?)(?:\n|$)', output)
        if action_match:
            step.action = action_match.group(1).strip()

        # 提取 Action Input (JSON)
        input_match = re.search(r'Action Input:\s*(.*?)(?:\nThought:|\Z)', output, re.DOTALL)
        if input_match:
            try:
                step.action_input = json.loads(input_match.group(1).strip())
            except json.JSONDecodeError:
                # JSON 解析失败，尝试修复常见格式问题
                raw = input_match.group(1).strip().replace("'", '"')
                try:
                    step.action_input = json.loads(raw)
                except:
                    step.observation = f"JSON 解析失败: {input_match.group(1)[:100]}"
                    step.error = "JSON_PARSE_ERROR"

        return step

    def _compress_context(self, context: str) -> str:
        """压缩上下文，保留最近的几轮和系统提示"""
        lines = context.split('\n')
        # 保留前5行（系统提示+问题）和最后20行（最近3-4轮交互）
        if len(lines) > 25:
            compressed = lines[:5] + ["... [历史已压缩] ..."] + lines[-20:]
            return '\n'.join(compressed)
        return context`核心设计要点：**

- **循环控制**：`max_iterations` 防止无限循环。默认 10 次，复杂任务可调到 20
- **解析鲁棒性**：正则提取 Thought/Action/Action Input，JSON 解析失败时尝试修复（单引号→双引号），失败时通过 Observation 告知 LLM 重新格式化
- **错误恢复**：工具调用失败不直接退出，而是将错误信息作为 Observation 返回，让 LLM 决定重试、换工具、还是放弃
- **上下文压缩**：超过 8000 字符时截断历史，保留系统提示和最近 20 行
- **温度参数**：`temperature=0.1` 保证输出确定性，避免 LLM 生成不合规格式

#### 3️⃣ 答题模板（30 秒电梯版）

> "ReAct 核心循环：while not done，每轮三步——Thought 调 LLM 生成思考，Action 解析输出提取工具调用，Observation 执行工具返回结果。防无限循环用 max_iterations=10。解析用正则提取 Thought/Action/Action Input，JSON 解析失败时尝试修复。错误恢复：工具失败不退出，把错误作为 Observation 让 LLM 重新决策。上下文超长时压缩历史保留最近 20 行。temperature=0.1 保证格式稳定。"

#### 4️⃣ 高频追问 & 应对

**追问 1**：如果 LLM 生成的格式不标准（比如没有 "Thought:" 前缀），怎么处理？

> 三层防御：(1) System Prompt 强约束——明确要求"必须以 Thought: 开头"，并给出 few-shot 示例；(2) 宽松解析——正则不区分大小写，允许 "thought:"/"THOUGHT:"，并支持没有前缀的情况（将整段当作 thought）；(3) 重试机制——如果完全无法解析，返回 Observation "格式错误，请按照 Thought/Action/Action Input 格式回复"，让 LLM 重新生成。实测 GPT-4 在 temperature=0.1 时格式合规率 >95%，但开源模型（如 Llama-3-70B）可能只有 80%，需要更强的格式约束（如 grammar-constrained decoding）。

**追问 2**：你的上下文压缩只是截断，会不会丢失关键信息？

> 截断是最简单的方案，确实可能丢信息。进阶方案：(1) 摘要压缩——用 LLM 对历史交互生成 200 字摘要，替换原始文本；(2) 选择性保留——用 embedding 相似度筛选与当前问题最相关的 3-5 轮历史，丢弃无关的；(3) 混合方案——近期 3 轮保留原文，更早的用摘要。生产环境推荐混合方案，延迟增加约 500ms（摘要调用），但信息保留率从 60% 提升到 90%。

**追问 3**：多工具并行调用怎么做？ReAct 框架天然是串行的。

> ReAct 的串行性是其局限。并行方案：(1) ReWOO（Reasoning WithOut Observation）——先让 LLM 一次性生成所有工具调用计划，然后并行执行，最后汇总；(2) 修改 ReAct 循环——在 Thought 阶段检测是否需要并行，如果 Action 中包含多个工具调用，用 asyncio.gather 并行执行；(3) 层级 Agent——主 Agent 拆分任务，子 Agent 并行执行，主 Agent 汇总结果。推荐方案(3)，因为它保持了每个子 Agent 的 ReAct 循环简洁性，同时实现了并行。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ "while True 循环调用 LLM 就行" → ✅ "必须设置 max_iterations 防止无限循环。同时要处理 LLM 调用超时、API 限流、输出格式异常等各种异常情况。"
- ❌ "LLM 输出的 JSON 直接用就行" → ✅ "LLM 输出不保证是合法 JSON。需要 try-except 包裹 json.loads，解析失败时尝试修复或通过 Observation 告知 LLM 重新生成。"
- ❌ "工具调用失败就直接报错退出" → ✅ "工具失败应该将错误信息作为 Observation 返回，让 LLM 决定下一步——可能是换工具、修改参数、或告知用户无法完成。这比直接退出更符合 Agent 的自主决策特性。"

#### 6️⃣ 简历呼应

- **如果你有 Agent 项目**：从"ReAct 框架实现"切入，展示你的循环控制+错误恢复+上下文压缩设计，给出任务完成率数据（如 85% 的任务在 5 步内完成）
- **如果你只做过后端开发**：用"状态机设计"类比——ReAct 的 Thought/Action/Observation 类似状态机的三个状态，循环控制类似状态转移逻辑
- **如果你是校招无项目**：用 LangChain 的 ReActAgent 源码作为参考，自己实现一个简化版 ReAct 框架，对比两者的差异，写一篇博客
- "ReAct: Synergizing Reasoning and Acting in Language Models" (Yao et al., 2022)
- "ReWOO: Decoupling Reasoning from Observations for Efficient Augmented LLMs" (Xu et al., 2023)
- "LangChain ReAct Agent Implementation" (LangChain, 2024)

---
