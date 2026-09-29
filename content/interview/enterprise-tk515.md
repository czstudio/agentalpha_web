---
slug: enterprise-tk515
no: "1415"
title: "写一段 Python 代码模拟「库存查询「工具的 Schema 定义，重点说明如何防止 Agent 乱调用工具。"
question: "写一段 Python 代码模拟「库存查询「工具的 Schema 定义，重点说明如何防止 Agent 乱调用工具。"
excerpt: "面试官想看你能否将安全设计理念落地到代码层面，而非停留在概念。这道题的刁钻点在于：很多人只写一个 JSON Schema 就完事，但说不清如何防止 LLM 生成超出 Schema 约束的参数、如何防止 Agent 在非授"
tags: ["真题解析", "编程题"]
category: "enterprise"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 12
words: 5563
updated: "2026-09-29"
---

## 写一段 Python 代码模拟「库存查询「工具的 Schema 定义，重点说明如何防止 Agent 乱调用工具。

#### 1️⃣ 考察意图

面试官想看你能否将安全设计理念落地到代码层面，而非停留在概念。这道题的刁钻点在于：很多人只写一个 JSON Schema 就完事，但说不清如何防止 LLM 生成超出 Schema 约束的参数、如何防止 Agent 在非授权场景调用工具、以及如何对高风险操作做二次确认。答好了能展示你的工程安全意识——从 Schema 定义到参数校验到权限控制到审计日志的整条链路设计能力。

#### 2️⃣ 标准答

`from pydantic import BaseModel, Field, validator**from enum import Enum
from typing import Optional, List
from datetime import datetime
import logging

# 1. 工具风险等级定义
class RiskLevel(str, Enum):
    READ_ONLY = "read_only"      # 查询类，自动执行
    WRITE_SAFE = "write_safe"    # 安全写入，审计执行
    WRITE_RISKY = "write_risky"  # 风险写入，需人工确认

# 2. 工具 Schema 定义（Pydantic 模型）
class InventoryQuerySchema(BaseModel):
    """库存查询工具的参数 Schema"""
    product_id: str = Field(
        ...,
        description="产品唯一标识，格式：PRD-XXXX-XX",
        pattern=r"^PRD-\d{4}-\d{2}$",
        max_length=20
    )
    warehouse: str = Field(
        default="all",
        description="仓库编号，可选：WH01/WH02/all",
        enum=["WH01", "WH02", "all"]
    )
    include_reserved: bool = Field(
        default=False,
        description="是否包含已预留库存"
    )

    @validator("product_id")
    def validate_product_id(cls, v):
        if not v.startswith("PRD-"):
            raise ValueError("product_id 必须以 PRD- 开头")
        return v

class InventoryDeductSchema(BaseModel):
    """库存扣减工具的参数 Schema（高风险）"""
    product_id: str = Field(..., pattern=r"^PRD-\d{4}-\d{2}$")
    quantity: int = Field(..., gt=0, le=10000, description="扣减数量，1-10000")
    order_id: str = Field(..., min_length=8, description="关联订单号")
    reason: str = Field(..., max_length=200, description="扣减原因")
    operator: str = Field(..., description="操作人ID")

# 3. 工具注册表（含权限和风险等级）
class ToolRegistry:
    def __init__(self):
        self._tools = {}
        self._logger = logging.getLogger("tool_registry")

    def register(self, name, func, schema, risk_level, allowed_roles):
        self._tools[name] = {
            "func": func,
            "schema": schema,
            "risk_level": risk_level,
            "allowed_roles": allowed_roles,
            "call_count": 0
        }

    def execute(self, tool_name, params, user_role, session_id):
        # 步骤1：工具存在性检查
        if tool_name not in self._tools:
            raise ValueError(f"未注册的工具: {tool_name}")
        tool = self._tools[tool_name]

        # 步骤2：权限检查
        if user_role not in tool["allowed_roles"]:
            self._logger.warning(f"权限拒绝: {user_role} 尝试调用 {tool_name}")
            raise PermissionError(f"角色 {user_role} 无权调用 {tool_name}")

        # 步骤3：参数校验（Pydantic 自动校验类型、范围、格式）
        try:
            validated = tool["schema"](**params)
        except Exception as e:
            self._logger.error(f"参数校验失败: {tool_name}, error={e}")
            raise ValueError(f"参数校验失败: {e}")

        # 步骤4：高风险操作需人工确认
        if tool["risk_level"] == RiskLevel.WRITE_RISKY:
            return {
                "status": "pending_approval",
                "message": f"高风险操作 {tool_name} 需要人工确认",
                "params": validated.dict(),
                "approval_token": self._generate_token(session_id, tool_name)
            }

        # 步骤5：执行并记录审计日志
        tool["call_count"] += 1
        self._logger.info(
            f"TOOL_CALL | session={session_id} | tool={tool_name} | "
            f"params={validated.dict()} | risk={tool['risk_level']}"
        )
        result = tool["func"](**validated.dict())
        self._logger.info(f"TOOL_RESULT | tool={tool_name} | result={result}")
        return result`核心安全设计要点：**

- **Schema 约束**：Pydantic 模型定义参数类型、格式（正则）、范围（gt/le）、枚举值。LLM 输出的参数必须通过 Schema 校验才能执行
- **权限白名单**：每个工具定义 `allowed_roles`，只有授权角色才能调用。例如库存扣减只允许 `inventory_manager` 角色
- **风险分级**：`RiskLevel` 枚举区分只读/安全写入/风险写入。风险写入返回 `pending_approval` 状态，需人工确认
- **审计日志**：所有工具调用记录 session_id、tool_name、params、risk_level，支持事后追溯
- **防注入**：Pydantic 的 `pattern` 正则校验防止参数注入（如 product_id 中嵌入 shell 命令）

#### 3️⃣ 答题模板（30 秒电梯版）

> "我从五层设计工具安全。Schema 层用 Pydantic 定义参数类型、格式、范围、枚举。权限层用角色白名单控制谁能调用。风险层分三级：只读自动执行、安全写入审计执行、风险写入需人工确认。执行层记录完整审计日志。防注入层用正则校验防止参数中嵌入恶意内容。核心思路是'最小权限+纵深防御'——即使 LLM 被注入生成恶意调用，Schema 校验和权限控制也能拦截。"

#### 4️⃣ 高频追问 & 应对

**追问 1**：如果 LLM 生成的参数通过了 Schema 校验但语义上是错误的怎么办？比如 quantity=99999 通过了校验但实际库存只有 100。

> 语义校验需要业务规则层。方案：(1) 在工具函数内部做业务校验——执行前检查库存是否足够，不够则返回错误；(2) 用 LLM 做二次审查——安全 Agent 检查"这个调用在当前上下文中是否合理"；(3) 异常检测——如果 quantity 偏离历史调用的 3σ 范围，触发告警。关键认知：Schema 校验是格式层面的，语义层面的校验需要业务逻辑配合。

**追问 2**：你的审计日志怎么存储？如果 Agent 每秒调用 100 次工具，日志会不会成为瓶颈？

> 高频场景的日志方案：(1) 异步写入——用 Python logging 的 QueueHandler + QueueListener，日志写入不阻塞主流程；(2) 批量写入——攒够 100 条或 1 秒后批量写入数据库（如 ClickHouse），而非每条单独写；(3) 采样——低风险操作（read_only）只记录 10% 的调用，高风险操作全量记录。实测：异步+批量方案在 1000 QPS 下延迟 <1ms。

**追问 3**：人工确认环节如果用户 30 秒不确认怎么办？

> 超时策略：(1) 30 秒未确认自动拒绝，返回"操作已取消"；(2) 保存请求到待办列表，用户可以稍后在管理后台处理；(3) 如果是紧急操作（如库存预警），自动降级为"只查询不扣减"模式，让用户先看到库存情况再决定。关键是在"安全"和"体验"之间平衡——不能让用户一直等着，也不能因为超时就执行危险操作。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ "用 JSON Schema 就够了，LLM 输出自然符合" → ✅ "LLM 输出不保证符合 Schema。需要 Pydantic 做二次校验，并处理校验失败的情况（返回错误让 LLM 重新生成）。"
- ❌ "所有工具统一权限就行" → ✅ "不同工具有不同风险等级。查询类工具所有人可用，扣减类工具只有 manager 可用。需要细粒度的角色权限控制。"
- ❌ "加个 try-except 捕获所有异常就够了" → ✅ "笼统的异常捕获会掩盖安全问题。应该区分校验异常、权限异常、业务异常，分别处理并记录不同级别的日志。"

#### 6️⃣ 简历呼应

- **如果你有 Agent 项目**：从"工具安全设计"切入，展示你的 ToolRegistry 实现，给出拦截率数据（如格式校验拦截 15% 的非法调用，权限控制拦截 5%）
- **如果你只做过后端开发**：用"API 网关设计"类比——Schema 校验类似请求参数校验，权限控制类似 RBAC，审计日志类似访问日志。强调安全设计理念是通用的
- **如果你是校招无项目**：用 Pydantic + FastAPI 搭建一个工具注册中心 demo，实现 Schema 校验+权限控制+审计日志，写一篇博客展示完整代码
- "OpenAI Function Calling Guide" (OpenAI, 2024)
- "Pydantic Documentation" (Pydantic, 2024)
- "Agent Security: Tool Use Sandboxing" (Ji et al., 2024)

---
