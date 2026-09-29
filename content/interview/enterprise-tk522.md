---
slug: enterprise-tk522
no: "1422"
title: "用 Python 实现 Function Calling 的解析器，将 LLM 输出的 JSON 转换为实际函数调用。"
question: "用 Python 实现 Function Calling 的解析器，将 LLM 输出的 JSON 转换为实际函数调用。"
excerpt: "面试官想看你能否安全可靠地将 LLM 的文本输出转换为代码执行。刁钻点在于：这不只是 JSON 解析——还需要参数校验、函数映射、安全执行、错误回退。很多人只写 `json.loads + func(params)`，但"
tags: ["真题解析", "编程题"]
category: "enterprise"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 15
words: 7172
updated: "2026-09-29"
---

## 用 Python 实现 Function Calling 的解析器，将 LLM 输出的 JSON 转换为实际函数调用。

#### 1️⃣ 考察意图

面试官想看你能否安全可靠地将 LLM 的文本输出转换为代码执行。刁钻点在于：这不只是 JSON 解析——还需要参数校验、函数映射、安全执行、错误回退。很多人只写 `json.loads + func(**params)`，但完全不考虑 LLM 输出非法 JSON 的处理、参数注入防护、以及执行沙箱。答好了能展示你的代码安全意识和反射编程能力。

#### 2️⃣ 标准答

`import json**import re
import inspect
import logging
from typing import Callable, Dict, Any, Optional, get_type_hints
from pydantic import BaseModel, ValidationError
from functools import wraps

logger = logging.getLogger("function_calling")

class FunctionCallError(Exception):
    """Function Calling 相关错误"""
    pass

class ToolSchema(BaseModel):
    """工具调用的标准格式"""
    name: str
    arguments: Dict[str, Any] = {}

class FunctionCallParser:
    def __init__(self):
        self._registry: Dict[str, Dict] = {}  # name -> {func, schema, allowed_params}

    def register(self, name: str, func: Callable, param_schema: type[BaseModel]):
        """注册函数及其参数 Schema"""
        # 检查 func 的参数签名与 Schema 一致
        sig = inspect.signature(func)
        schema_fields = param_schema.model_fields

        for param_name in sig.parameters:
            if param_name not in schema_fields and param_name != 'self':
                logger.warning(f"Parameter '{param_name}' in function but not in schema")

        self._registry[name] = {
            "func": func,
            "schema": param_schema,
            "sig": sig
        }
        logger.info(f"Registered function: {name}")

    def parse_and_execute(self, llm_output: str, context: Optional[Dict] = None) -> Any:
        """解析 LLM 输出并执行函数调用"""

        # 步骤1: 提取 JSON（LLM 可能在 JSON 前后添加文本）
        json_str = self._extract_json(llm_output)
        if not json_str:
            raise FunctionCallError(f"无法从 LLM 输出中提取 JSON: {llm_output[:100]}")

        # 步骤2: 解析 JSON
        try:
            data = json.loads(json_str)
        except json.JSONDecodeError:
            # 尝试修复常见 JSON 格式问题
            fixed = self._fix_json(json_str)
            try:
                data = json.loads(fixed)
            except json.JSONDecodeError as e:
                raise FunctionCallError(f"JSON 解析失败: {e}")

        # 步骤3: 验证格式
        try:
            call = ToolSchema(**data)
        except ValidationError as e:
            raise FunctionCallError(f"格式验证失败: {e}")

        # 步骤4: 检查函数是否已注册
        if call.name not in self._registry:
            raise FunctionCallError(f"未注册的函数: {call.name}")

        reg = self._registry[call.name]

        # 步骤5: 参数校验（Pydantic Schema）
        try:
            validated_params = reg["schema"](**call.arguments)
        except ValidationError as e:
            raise FunctionCallError(f"参数校验失败: {e}")

        # 步骤6: 安全检查（防注入）
        self._security_check(call.name, validated_params.dict())

        # 步骤7: 执行函数
        try:
            result = reg["func"](**validated_params.dict())
            logger.info(f"Function called: {call.name}, result_type={type(result).__name__}")
            return result
        except Exception as e:
            logger.error(f"Function execution failed: {call.name}, error={e}")
            raise FunctionCallError(f"执行失败: {e}")

    def _extract_json(self, text: str) -> Optional[str]:
        """从 LLM 输出中提取 JSON 字符串"""
        # 方案1: 尝试直接解析（LLM 输出纯 JSON）
        text = text.strip()
        if text.startswith("{"):
            return text

        # 方案2: 提取 ```json ... ``` 代码块
        code_block = re.search(r'```(?:json)?\s*(\{.*?\})\s*```', text, re.DOTALL)
        if code_block:
            return code_block.group(1)

        # 方案3: 提取第一个 { 到最后一个 } 之间的内容
        first_brace = text.find("{")
        last_brace = text.rfind("}")
        if first_brace != -1 and last_brace != -1 and last_brace > first_brace:
            return text[first_brace:last_brace + 1]

        return None

    def _fix_json(self, json_str: str) -> str:
        """修复常见的 JSON 格式问题"""
        fixed = json_str
        # 修复1: 单引号转双引号
        fixed = fixed.replace("'", '"')
        # 修复2: 尾部逗号
        fixed = re.sub(r',\s*}', '}', fixed)
        fixed = re.sub(r',\s*]', ']', fixed)
        # 修复3: 未引号的 key
        fixed = re.sub(r'(\w+):', r'"\1":', fixed)
        # 修复4: 转义的换行符
        fixed = fixed.replace('\\n', '\n')
        return fixed

    def _security_check(self, func_name: str, params: Dict):
        """安全检查：防止参数注入"""
        for key, value in params.items():
            if isinstance(value, str):
                # 检查 shell 注入
                dangerous_patterns = [';', '|', '`', '$(', '${', '../', '..\\']
                for pattern in dangerous_patterns:
                    if pattern in value:
                        logger.warning(f"Potential injection in {func_name}.{key}: {pattern}")
                        # 不直接拒绝，根据函数风险等级决定
                        if func_name in ["execute_command", "run_shell"]:
                            raise FunctionCallError(
                                f"参数包含危险字符 '{pattern}'，已拒绝执行"
                            )`核心设计要点：**

- **多层 JSON 提取**：直接解析 → 代码块提取 → 花括号匹配。处理 LLM 在 JSON 前后添加文本的情况
- **JSON 修复**：单引号→双引号、尾逗号移除、未引号 key 修复。处理 LLM 输出不完全合规的 JSON
- **Pydantic 校验**：参数类型、范围、必填项校验。LLM 生成的参数必须通过 Schema 校验
- **安全检查**：参数值中的危险字符检测（`;`、`|`、`$(`等）。高风险函数（如 shell 执行）严格拒绝
- **函数注册表**：只执行预注册的函数，防止 LLM 调用任意 Python 函数
- **完整审计日志**：记录函数名、参数、结果类型、错误信息

#### 3️⃣ 答题模板（30 秒电梯版）

> "Function Calling 解析器七步流程。提取JSON——三种策略应对LLM输出格式不标准。修复JSON——单引号转双引号、尾逗号移除。格式验证——Pydantic校验name+arguments。函数查找——注册表白名单。参数校验——Pydantic Schema校验类型范围必填。安全检查——参数值危险字符检测，高风险函数严格拒绝。执行+日志——记录函数名参数结果。核心是'多层解析+严格校验+安全执行'。"

#### 4️⃣ 高频追问 & 应对

**追问 1**：如果 LLM 输出的 JSON 中包含嵌套对象或数组，你的解析器能处理吗？

> 可以。`json.loads` 原生支持嵌套 JSON。关键是 Pydantic Schema 也要定义嵌套模型。例如工具参数包含 `filters: List[FilterCondition]`，FilterCondition 是另一个 BaseModel。Pydantic 会递归校验嵌套结构。需要注意的是 LLM 可能生成深度嵌套的 JSON（如 10 层），应该限制最大深度（如 3 层），防止 JSON bomb 攻击。

**追问 2**：你的安全检查只检查字符串参数，如果参数是数字或列表呢？

> 扩展安全检查：(1) 数字参数——检查范围（如 quantity > 0 且 < 10000），在 Pydantic Schema 中用 `Field(gt=0, le=10000)` 约束；(2) 列表参数——检查长度上限（如 `max_length=100`），防止超长列表导致 DoS；(3) 嵌套对象——递归检查每个层级的字符串值。安全检查应该覆盖所有类型的参数，而非只检查字符串。

**追问 3**：如果 LLM 生成了正确的函数名但参数多余或缺失怎么办？

> Pydantic 默认行为：(1) 多余参数——Pydantic v2 默认忽略多余字段（`model_config = ConfigDict(extra='ignore')`），也可以设为 `'forbid'` 拒绝多余参数；(2) 缺失必填参数——Pydantic 抛出 ValidationError，解析器捕获后返回错误信息让 LLM 重新生成。推荐策略：必填参数缺失→拒绝并告知 LLM；多余参数→忽略（LLM 可能添加了有用的上下文，但不影响执行）。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ "json.loads 直接解析就行" → ✅ "LLM 输出不保证是合法 JSON。需要多层提取（直接/代码块/花括号匹配）+ JSON 修复（单引号/尾逗号/未引号key）才能提高解析成功率。"
- ❌ "func(**params) 直接调用就行" → ✅ "直接调用有两个风险：(1) LLM 可能生成未注册的函数名，导致 AttributeError；(2) 参数可能包含危险内容（如 shell 注入）。需要函数白名单+参数校验+安全检查。"
- ❌ "解析失败就报错退出" → ✅ "解析失败应该返回结构化错误信息（如 'JSON格式错误，请确保输出 {"name": "...", "arguments": {...}} 格式'），让 LLM 重新生成。这是 Agent 的错误恢复能力。"

#### 6️⃣ 简历呼应

- **如果你有 Agent 项目**：从"Function Calling 实现"切入，展示你的解析器设计，给出解析成功率（如 97%）、安全拦截率（如 3%）
- **如果你只过后端开发**：用"API 请求处理"类比——JSON 解析类似请求体解析，Pydantic 校验类似请求参数验证，安全检查类似 WAF
- **如果你是校招无项目**：实现一个 Function Calling 解析器，测试不同 LLM（GPT-4/Claude/Llama）的输出格式合规率，写一篇对比博客
- "OpenAI Function Calling Guide" (OpenAI, 2024)
- "Pydantic V2 Documentation" (Pydantic, 2024)
- "LangChain Tool Use Implementation" (LangChain, 2024)

---

**本章学习完毕**
← 返回 Agent 岗面试宝典 v3 · 精华版　|　📝 建议整理错题笔记　|　🎯 标记掌握程度
