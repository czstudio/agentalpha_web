#!/usr/bin/env python3
"""Build reviewable Feishu XML candidates from the archived PA52 source.

This deliberately does not write Feishu or approve revisions. The archive is
used only for general, non-versioned explanations. Product facts come from the
primary-source fact pack; unverifiable implementation and benchmark claims are
discarded rather than softened into publication copy.
"""
from __future__ import annotations

import copy
import html
import json
import re
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CONTENT = ROOT / "content" / "learn" / "claude-code"
MANIFEST = json.loads((CONTENT / "manifest.json").read_text(encoding="utf-8"))
CATALOG = json.loads((CONTENT / "editorial" / "brief-catalog.json").read_text(encoding="utf-8"))["chapters"]
FACTS = json.loads((CONTENT / "research" / "fact-pack.json").read_text(encoding="utf-8"))
RECEIPT = json.loads((ROOT / ".local" / "learn-source" / "claude-code" / "receipt.json").read_text(encoding="utf-8"))
SOURCE = ROOT / RECEIPT["documents"]["directory"]["path"]
DRAFT_DIR = CONTENT / "drafts"
REPORT_DIR = CONTENT / "reports"

RISK_RE = re.compile(
    r"泄[露漏]源码|51\s*万|512[,.]?000|1[,.]?903\s*个文件|1903\s*个文件|98\.4%|"
    r"Demo\s*级|VILA\s*Lab|Dive\s+into\s+Claude\s+Code|46K\s*行|7\s*静\s*13\s*动|"
    r"14\s*步\s*Fail|42\s*把手术刀|1[,.]?730\s*行|1730\s*行|"
    r"竞品只是\s*Demo|1903|1,903|源码行数",
    re.I,
)

UNVERIFIED_RE = re.compile(
    r"源码|源代码|src/|\.tsx?\b|\.jsx?\b|第\s*\d+[—\-至到,，]\s*\d*\s*行|"
    r"未公开|隐藏参数|反编译|逆向|实测|真实数据|量化数据|性能数据|内部实现|"
    r"工业级|生产级实现|grep\s+-|Anthropic\s+API|Prompt\s+Caching|cache_edits|"
    r"Sonnet\s*\d|Opus\s*\d|Haiku\s*\d|SWE-bench|TTFT|tiktoken|V8\b|"
    r"\$\s*\d|\d+(?:[.,]\d+)?\s*(?:%|ms|s\b|MB|GB|K\b|tokens?\b|行\b|个文件|倍\b)",
    re.I,
)

SECTION_MATCH = {
    "01-foundations": "第一章：",
    "02-agentic-loop": "第二章：",
    "03-tools": "第三章",
    "04-context": "第四章",
    "05-experiments": "第五章",
    "06-harness": "第六章",
    "07-prompt-system": "第七章",
    "08-tool-governance": "第八章",
    "09-permissions": "第九章",
    "10-compaction": "第十章：",
    "11-advanced-context": "第十一章",
    "12-source-reading": "第十二章",
    "13-custom-agents": "第十三章",
    "14-debugging-optimization": "第十四章",
    "15-system-design-interview": "第十五章",
    "16-security-interview": "第十六章",
    "17-performance-interview": "第十七章",
    "appendix-a-stack": "附录 A",
    "appendix-b-prompts": "附录 B",
    "appendix-c-tools": "附录 C",
    "appendix-d-resources": "附录 D",
    "cross-system-comparison": "跨系统深度对比",
    "mcp-subagent-security": "MCP、子 Agent",
}

IMAGE_INFO = {
    "system": ("JNqAb8x55op4iMxSUfpc18LKnRc", "diagram_system_arch.png", "Claude Code 系统结构：目标、模型、工具与环境之间的控制关系"),
    "react": ("ADTPb8S6nogOxIxY4sOcPIv7nlw", "diagram_react_loop.png", "Agentic Loop：观察、判断、行动与工具结果构成闭环"),
    "permission": ("TwVZbya6RoPQWMxnbPlcEcmMnwb", "diagram_permission_layers.png", "权限分层：应用规则、人工确认与系统沙箱各守一道边界"),
    "compare": ("NdkcbWwTEoiwK1xrTpbcasQFnLg", "diagram_comparison_radar.png", "系统比较维度：执行、控制、扩展、观察与成本必须同口径衡量"),
    "position": ("WXKObFAgYozZWGxpQjMco3nQnOc", "diagram_product_positioning.png", "产品定位：编码 Agent 不只生成文本，还管理执行过程与反馈"),
    "react-tree": ("MXDfbO6pGo8yMaxCbJYcev08nqu", "diagram_react_evolution_tree.png", "从基础 ReAct 到工程 Agent：循环外逐步增加控制与恢复机制"),
    "tools": ("QJ6ib687eoJWEmxZOJWcfobVnCb", "diagram_tool_taxonomy.png", "工具分类：读取、修改、执行和外部副作用对应不同风险"),
    "context-load": ("EscjbsDfQo2MK8xbhYqcXEu3nG4", "diagram_context_loading.png", "上下文加载：只在当前决策需要时引入相关信息"),
    "sequence": ("IqhVbiqAJoQtFOxCYCVcNHLsneg", "diagram_minimal_agent_sequence.png", "最小 Agent 时序：请求、模型判断、工具执行、结果回填与停止"),
    "layers": ("NCV3bRSujoHNMbxR27HcpUVbnKm", "diagram_seven_layer_dataflow.png", "执行数据流：输入经过上下文、决策、工具和验证到达结果"),
    "prompt": ("JUHbbOcCBooFdxxejMHcuMr9nub", "diagram_prompt_layers.png", "Prompt 分层：长期规则、项目约束与当前任务各自承担不同职责"),
    "tool-pipe": ("LO82bXDjHoNFd6x6hhfcWwCJnOd", "diagram_tool_governance_pipeline.png", "工具治理流水线：参数、权限、执行、结果与审计逐步收紧风险"),
    "permission-decision": ("XoFkbM4dLo6eEjxIg88cjE7Bnnh", "diagram_permission_decision.png", "权限决策：拒绝、询问和允许需要明确优先级"),
    "compress": ("WMoCbfUqOovxo4xnlMkcyZnwnKp", "diagram_context_compression_funnel.png", "上下文压缩：保留目标、决策、证据和未完成状态"),
    "pyramid": ("R8sxbFJOGoYpXtxTCcecaVuanhO", "diagram_context_pyramid.png", "上下文金字塔：稳定规则、任务资料与即时观察分层管理"),
    "source": ("HnDvbPmk5oVSdEx0UIgcgQQLnFd", "diagram_source_route_map.png", "源码阅读路线：从入口追踪状态、工具、副作用和验证点"),
    "custom": ("LyIQbel3xo7fCzxrz1ect5IknWd", "diagram_custom_tool_stages.png", "自定义 Agent 开发：职责、工具、权限、交接与验收逐层落地"),
    "performance": ("FMtSbXZC5oZ1tixiT64cqeNFnUc", "diagram_performance_layers.png", "性能分层：关键路径同时受到模型、工具、上下文和并发影响"),
    "interview-system": ("ZjZVb2HKDoOQCGxzrHyc8Aelnmf", "diagram_interview_system_mindmap.png", "系统设计面试地图：需求、状态、工具、可靠性、安全与评测"),
    "interview-security": ("Q6iPbYvnZoqXfOxwdDiczaT1nXd", "diagram_interview_security_mindmap.png", "安全面试地图：威胁、权限、隔离、凭证、审计与恢复"),
    "interview-performance": ("T8Fzbi5AsouNE6xJElbctp07nwT", "diagram_interview_performance_mindmap.png", "性能面试地图：时延、吞吐、令牌、缓存、并发与成本"),
    "benchmark": ("B2XbbY2Z1o6ckNxm7QEcHYAmnrh", "diagram_swe_bench_logistic.png", "评测闭环：任务样本必须连接执行轨迹、判据与回归结果"),
    "cost": ("MfWzbDKM3o1UqPxfatCcgTuxnmh", "diagram_cost_spikes.png", "成本异常：重复上下文、无效工具调用和失控重试会放大消耗"),
    "mcp": ("CSuXbimGKoRgiMxU2HTcsj2ynLx", "diagram_mcp_layers.png", "MCP 分层：主机、客户端、服务端与外部系统形成新的信任边界"),
    "path": ("LkISbW06boUSxPx74b7cdpq5nEh", "diagram_learning_path.png", "学习路线：从核心循环逐步进入治理、扩展、安全和性能"),
    "trace": ("EwrBbmu1YoqtVlx4v9DcwqgVnLf", "07-trace-flight-recorder.png", "Trace 像飞行记录器：把每次决策、工具调用和失败信号串起来"),
    "cache": ("S6Aubv7KRoJcMhxFKIvcIpc5nQd", "05-context-compression-cache.png", "压缩与缓存：减少重复输入，同时保留继续任务所需工作记忆"),
    "subagent": ("VRLwbfIpaoBBU4xXWCIcuaEAnBd", "13-subagent-worktree-isolation.png", "Subagent 隔离：并行分析需要清晰职责、上下文和写入边界"),
}

IMAGE_SETS = {
    "01-foundations": ["position", "system", "sequence", "permission", "path"],
    "02-agentic-loop": ["react", "sequence", "react-tree", "trace", "benchmark"],
    "03-tools": ["tools", "tool-pipe", "sequence", "permission-decision", "trace"],
    "04-context": ["context-load", "pyramid", "compress", "cache", "prompt"],
    "05-experiments": ["sequence", "trace", "benchmark", "cost", "performance"],
    "06-harness": ["system", "layers", "sequence", "tool-pipe", "trace"],
    "07-prompt-system": ["prompt", "pyramid", "context-load", "cache", "permission"],
    "08-tool-governance": ["tools", "tool-pipe", "permission-decision", "trace", "layers"],
    "09-permissions": ["permission", "permission-decision", "tool-pipe", "mcp", "trace"],
    "10-compaction": ["compress", "cache", "pyramid", "context-load", "cost"],
    "11-advanced-context": ["pyramid", "context-load", "compress", "subagent", "trace"],
    "12-source-reading": ["source", "system", "sequence", "tools", "trace"],
    "13-custom-agents": ["custom", "subagent", "tools", "permission", "trace"],
    "14-debugging-optimization": ["trace", "benchmark", "performance", "cost", "sequence"],
    "cross-system-comparison": ["compare", "position", "system", "permission", "performance"],
    "mcp-subagent-security": ["mcp", "subagent", "permission", "tool-pipe", "trace"],
    "15-system-design-interview": ["interview-system", "system", "sequence", "trace", "benchmark"],
    "16-security-interview": ["interview-security", "permission", "permission-decision", "mcp", "trace"],
    "17-performance-interview": ["interview-performance", "performance", "cost", "cache", "benchmark"],
    "appendix-a-stack": ["system", "layers", "tools", "prompt", "mcp"],
    "appendix-b-prompts": ["prompt", "context-load", "sequence", "trace", "path"],
    "appendix-c-tools": ["tools", "tool-pipe", "permission-decision", "mcp", "trace"],
    "appendix-d-resources": ["path", "source", "system", "mcp", "compare"],
}


def text_of(node: ET.Element) -> str:
    return re.sub(r"\s+", " ", "".join(node.itertext())).strip()


def sections(root: ET.Element) -> list[tuple[str, list[ET.Element]]]:
    found: list[tuple[str, list[ET.Element]]] = []
    title = ""
    blocks: list[ET.Element] = []
    for child in list(root):
        if child.tag == "h1":
            if blocks:
                found.append((title, blocks))
            title, blocks = text_of(child), [child]
        elif blocks:
            blocks.append(child)
    if blocks:
        found.append((title, blocks))
    return found


def clean_block(block: ET.Element) -> ET.Element | None:
    raw = text_of(block)
    if RISK_RE.search(raw) or UNVERIFIED_RE.search(raw):
        return None
    item = copy.deepcopy(block)
    for node in item.iter():
        for key in list(node.attrib):
            if key in {"id", "block-id", "revision-id"}:
                del node.attrib[key]
        if node.tag == "h2":
            node.tag = "h3"
        elif node.tag == "h3":
            original = text_of(node)
            node.clear()
            node.tag = "p"
            bold = ET.SubElement(node, "b")
            bold.text = original
    return item


def add(parent: ET.Element, tag: str, text: str = "", **attrs: str) -> ET.Element:
    node = ET.SubElement(parent, tag, attrs)
    node.text = text
    return node


def add_image(parent: ET.Element, image_key: str) -> None:
    token, name, caption = IMAGE_INFO[image_key]
    add(parent, "p", f"阅读这张图时，先沿着箭头找到输入与输出，再观察中间的控制点：{caption}。")
    ET.SubElement(parent, "img", {
        "src": token,
        "name": name,
        "alt": caption,
        "caption": caption,
        "source-label": "AgentAlpha 自制解释图",
    })


def build(entry: dict, source_blocks: list[ET.Element]) -> tuple[str, dict]:
    slug = entry["slug"]
    brief = CATALOG[slug]
    concepts = brief["concepts"]
    misconceptions = brief["misconceptions"]
    images = IMAGE_SETS[slug]
    out = ET.Element("root")
    add(out, "title", entry["title"])
    add(out, "h1", entry["title"])
    callout = ET.SubElement(out, "callout", {"emoji": "💡", "background-color": "light-blue", "border-color": "blue"})
    add(callout, "p", f"本章解决的问题：{brief['question']}")
    add(callout, "p", f"核心结论：可靠的做法不是记住一个功能名称，而是把{concepts[0]}、{concepts[1]}与{concepts[-1]}放进同一条可观察、可验证的工作链路。")

    add(out, "h2", "先看问题：为什么直觉经常失效")
    add(out, "p", f"最典型的失败场景是：{brief['case']}。表面上看，问题往往出在模型“没有理解”；继续追踪会发现，真正缺失的通常是输入边界、执行反馈或完成判据。")
    add(out, "p", f"读者最容易掉进两个陷阱：{misconceptions[0]}；以及{misconceptions[1]}。这两个判断都跳过了运行过程，所以无法解释同一个请求为什么在不同仓库、权限和上下文下得到不同结果。")
    add_image(out, images[0])

    add(out, "h2", "建立直觉：把系统看成受控反馈回路")
    add(out, "p", f"可以先把本章压缩为四个观察点：输入里是否给出了{concepts[0]}，系统怎样处理{concepts[1]}，执行中如何暴露{concepts[2] if len(concepts) > 2 else concepts[-1]}，最后由什么证据决定继续或停止。")
    grid = ET.SubElement(out, "grid")
    left = ET.SubElement(grid, "column", {"width-ratio": "0.5"})
    add(left, "p", "只看模型输出")
    add(left, "p", "容易把流畅回答误当成真实进展，也看不到环境、权限和工具错误。")
    right = ET.SubElement(grid, "column", {"width-ratio": "0.5"})
    add(right, "p", "观察完整执行链")
    add(right, "p", "同时检查输入、工具请求、环境反馈、状态变化和完成证据。")
    add_image(out, images[1])

    add(out, "h2", "运行机制：把概念落到状态变化")
    # The archived long draft contained reverse-engineering narratives and
    # benchmark numbers that cannot be independently verified. Keep it as an
    # audit source, but do not carry any of those blocks into publication.
    kept = 0
    kept_chars = 0
    removed = max(0, len(source_blocks) - 1)
    mechanism_note = ET.SubElement(out, "callout", {"emoji": "🔎", "background-color": "light-green", "border-color": "green"})
    add(mechanism_note, "p", f"事实边界：{entry['title']}只解释能够由文末一手来源复核的公开机制。未公开实现、推测性的文件路径和缺少实验记录的性能数字不作为产品事实。")
    add_image(out, images[2])

    add(out, "h2", "关键概念拆解：从名词走到可验证对象")
    for index, concept in enumerate(concepts, start=1):
        previous = concepts[index - 2] if index > 1 else "任务输入"
        following = concepts[index] if index < len(concepts) else "完成证据"
        add(out, "h3", f"{index}. {concept}：先定义观察口径")
        add(out, "p", f"在《{entry['title']}》里，{concept}不是一个抽象标签，而是回答“{brief['question']}”时必须单独观察的对象。先写清它接收什么输入、改变什么状态、产生什么输出，以及失败时留下什么信号。只给名词下定义，读者仍然不知道系统运行到哪一步；把它放进状态变化，才知道应该在哪里记录、限制和验证。")
        add(out, "p", f"本章的{concept}与{previous}、{following}之间存在明确交接。上游信息不足时，本环节不应靠猜测补齐；下游没有返回证据时，也不能把动作已经发出当成任务完成。以“{brief['case']}”为例，最小记录应包含进入本环节前的事实、做出的选择、外部环境实际接受的动作，以及可供下一步复核的结果。")
        add(out, "p", f"调试《{entry['title']}》中的{concept}时，可以依次问四个问题：输入是否来自可信来源，规则是否在当前作用域生效，执行结果是否被完整回填，停止判断是否引用了真实产物。任何一个问题无法回答，都意味着观测链断开。此时继续扩写 Prompt 通常只会增加表面解释，不能恢复缺失的环境反馈。")
        add(out, "p", f"评测本章的{concept}不要只看一次成功示例。准备正常输入、边界输入和故意失败输入，比较系统是否给出一致、可解释的状态变化；再改变仓库规模、权限或工具可用性，观察关于“{brief['question']}”的结论是否仍成立。这里测的是控制机制，不是模型回答是否流畅，因此判据应尽量落在文件差异、测试结果、权限记录或外部回读上。")
        concept_list = ET.SubElement(out, "ul")
        for value in (
            f"输入：哪些事实会影响{concept}，由谁提供",
            f"状态：{concept}开始、进行中和完成分别怎样表示",
            f"异常：{concept}失败后能否重试、回退或交给人工",
            f"证据：什么结果能够证明{concept}确实生效",
        ):
            add(concept_list, "li", value)

    add(out, "h2", "最小实验：用一次可回放任务验证理解")
    add(out, "p", f"为“{brief['case']}”准备一个可以反复恢复的练习环境：固定输入文件、初始版本、允许使用的工具和预期产物。第一次只记录系统围绕{concepts[0]}与{concepts[1]}做了什么，不急着优化结果；第二次主动制造一个边界错误，观察它能否通过{concepts[-1]}识别失败并停止。两次实验都保留输入、轨迹、差异和最终验证，才能区分偶然成功与机制有效。")
    add(out, "p", f"复盘时把每一步写成“已知事实—当前选择—外部反馈—下一判据”。如果某一步只有模型的解释，却找不到工具结果、文件变化或远端回读，就把它标成未验证，而不是补一句肯定结论。这个记录方式会迫使{concepts[0]}、{concepts[1]}和{concepts[-1]}落到同一条因果链，也方便之后把失败样本加入回归集。")
    add(out, "p", f"《{entry['title']}》的最后一轮只改变一个变量再运行：例如缩小权限、减少上下文、替换工具接口或提高完成门槛。一次改变多个变量会让结果无法归因。实验的目标不是证明某个产品永远更强，而是找出在当前任务和约束下，哪项控制真正减少错误、缩短恢复路径，或者让人工更早看到风险。")

    add(out, "h2", "失败树：先定位哪一层断了")
    failure_rows = (
        ("输入层", concepts[0], "缺少事实、范围或优先级", "补齐最小输入，并标明来源与作用域"),
        ("决策层", concepts[1], "规则冲突或选择无法解释", "保存当时可见信息，复核约束是否生效"),
        ("执行层", concepts[2] if len(concepts) > 2 else concepts[-1], "工具拒绝、环境变化或副作用不完整", "读取真实错误与状态，不用模型猜测代替反馈"),
        ("验收层", concepts[-1], "动作完成但目标没有被证明", "重新读取产物或远端状态，并运行任务级验证"),
    )
    failure_table = ET.SubElement(out, "table")
    failure_head = ET.SubElement(failure_table, "thead")
    failure_tr = ET.SubElement(failure_head, "tr")
    for value in ("层级", "本章观察点", "典型断点", "第一步处理"):
        add(failure_tr, "th", value)
    failure_body = ET.SubElement(failure_table, "tbody")
    for values in failure_rows:
        row = ET.SubElement(failure_body, "tr")
        for value in values:
            add(row, "td", value)
    add(out, "p", f"对“{brief['case']}”做根因分析时，从最靠近事实的一层开始，而不是直接归因给模型。输入层错误会污染后面所有判断；执行层错误若没有回填，也会被误写成决策错误；验收层缺失则最隐蔽，因为过程可能看起来很顺。按这棵失败树逐层排除，能够把“它没做好”改写成可复现、可分派的工程问题。")
    add(out, "p", f"恢复策略也应与层级对应。《{entry['title']}》里的输入问题通常可以补充资料后继续，决策问题需要回到最近一个可信检查点，执行问题先确认副作用是否已经发生，验收问题则重新建立证据。尤其是外部写入、发布和删除动作，不要在状态不明时盲目重试；先读取远端结果，判断是未执行、部分执行还是已经成功。")
    add(out, "p", f"把失败样本保存为本章的回归任务：保留初始状态、触发条件、期望行为、实际轨迹和修复后的验证结果。以后修改{concepts[0]}、{concepts[1]}或{concepts[-1]}时都重新运行。这样优化不再依赖“这次感觉更聪明”，而是能说明哪类失败消失了、哪类边界仍需要人工处理。")
    add(out, "h3", "自测标准：能解释，也能复现")
    add(out, "p", f"学完《{entry['title']}》后，不以记住术语为通过标准。你应能不看正文画出{concepts[0]}到{concepts[-1]}的状态流，指出每次外部动作发生在哪一段，并给每段配一个可读取的验证信号；还应能解释“{misconceptions[0]}”为什么会造成误判，以及怎样用最小实验把它暴露出来。")
    add(out, "p", f"再把同一方法交给另一位同事，让对方只依据你的任务说明复现“{brief['case']}”。如果对方必须依赖口头补充，说明输入边界仍不清楚；如果两人得到不同的完成判断，说明{concepts[-1]}缺少统一判据。可复现的说明、轨迹和验收结果，才是本章知识真正进入工程实践的标志。")
    add(out, "p", f"最后写一段面向未来维护者的说明：本章哪些结论属于稳定机制，哪些会随版本、权限配置或运行环境变化。前者用概念和因果解释，后者附上核验日期与官方入口。这样读者以后更新《{entry['title']}》时，能准确替换易变信息，而不用推翻整篇文章。")

    add(out, "h2", "替代方案与边界")
    add(out, "p", f"讨论“{brief['question']}”时，不应寻找一个在所有场景都最优的配置。围绕{concepts[0]}、{concepts[1]}与{concepts[-1]}固定任务、时间点和验证方式，再比较控制面，才能避免把宣传语当成工程结论。")
    table = ET.SubElement(out, "table")
    thead = ET.SubElement(table, "thead")
    row = ET.SubElement(thead, "tr")
    for value in ("选择", "优势", "代价", "适用条件"):
        add(row, "th", value)
    tbody = ET.SubElement(table, "tbody")
    for values in (
        (f"围绕{concepts[0]}连续执行", f"{concepts[1]}保持连贯", "长任务会累积噪声", f"{brief['case']}且反馈清楚"),
        (f"按{concepts[-1]}拆分阶段", "隔离上下文与工具", "增加编排和交接成本", "阶段边界可独立验证"),
        (f"为{concepts[1]}设置人工审批", "降低不可逆风险", "增加等待时间", "涉及外部发布、删除或高权限操作"),
    ):
        row = ET.SubElement(tbody, "tr")
        for value in values:
            add(row, "td", value)
    add_image(out, images[3])

    add(out, "h2", "工程、调试与评测")
    add(out, "p", f"把“{brief['case']}”落到工程环境时，先保存最小可复现输入，再记录{concepts[0]}、{concepts[1]}和{concepts[-1]}的可观察状态。失败后不要立刻改 Prompt；先判断是资料缺失、工具契约、权限、环境、模型决策，还是完成判据出了问题。")
    pre = ET.SubElement(out, "pre", {"lang": "text", "caption": "最小调试记录"})
    add(pre, "code", "目标 -> 当前状态 -> 下一动作 -> 工具结果 -> 验证证据 -> 停止/继续")
    warning = ET.SubElement(out, "callout", {"emoji": "⚠️", "background-color": "light-yellow", "border-color": "yellow"})
    add(warning, "p", f"本章常见误区是“{misconceptions[0]}”。即使命令退出码为 0，也只说明进程没有按该接口报告错误，不能单独证明{concepts[-1]}或最终业务目标已经正确。")
    add_image(out, images[4])

    add(out, "h2", "面试追问与常见误区")
    ul = ET.SubElement(out, "ul")
    for value in (
        f"为什么{concepts[0]}不能只靠 Prompt 保证？",
        f"当{concepts[1]}失败时，你会收集哪些证据定位根因？",
        f"怎样证明{concepts[-1]}真的生效，而不是界面上看起来生效？",
        "如果要降低风险或成本，你会牺牲哪项能力，边界是什么？",
    ):
        add(ul, "li", value)

    add(out, "h2", "检查清单")
    checklist = ET.SubElement(out, "ul")
    for value in (
        f"{entry['title']}的目标、工作范围和不可触碰边界是否明确",
        f"{concepts[0]}与{concepts[1]}是否能映射到真实输入、状态或工具结果",
        f"{brief['case']}失败时是否有可复现输入和可观察轨迹",
        f"涉及{concepts[-1]}的高风险动作是否有最小权限、审批和恢复路径",
        f"关于“{brief['question']}”的完成状态是否由真实产物或远端回读证明",
    ):
        add(checklist, "li", value)

    add(out, "h2", "权威来源")
    sources = {item["id"]: item for item in FACTS["sources"]}
    source_list = ET.SubElement(out, "ul")
    for source_id in brief["sources"]:
        source = sources[source_id]
        li = ET.SubElement(source_list, "li")
        link = ET.SubElement(li, "a", {"href": source["url"]})
        link.text = source["title"]

    if slug == "appendix-d-resources":
        add(out, "h2", "怎样维护一份不会快速过期的资料表")
        add(out, "p", "权威资源不是链接数量竞赛。每个链接至少要回答三个问题：它由谁维护，说明的是稳定概念还是版本行为，最后一次核验是什么时间。概念性论文适合解释机制来源；产品命令、默认权限和模型参数则必须回到当前官方文档。")
        add(out, "p", "遇到同一主题的多份官方页面时，先找规范或总览，再找具体功能页，最后用官方仓库验证示例是否仍能运行。二手文章可以帮助发现关键词，但不能替代最终引用。若官方材料彼此不一致，应保留差异和核验日期，不要自行拼成一个确定结论。")
        add(out, "p", "对竞品做比较时，资料表必须记录统一的观察窗口。今天核验 Claude Code、半年以前核验 Codex，再把两者写进同一张能力表，会把版本差异伪装成产品差异。更可靠的做法是固定任务、版本、权限、环境和指标，再保存原始输出。")
        add(out, "p", "链接失效不意味着事实一定错误，但意味着读者无法复核。维护时应优先寻找官方迁移页或新路径，同时保留旧标题和替换日期。网站快照可以保存文章正文与本站图片，却不应复制整份第三方材料；引用保持到能支持结论的粒度即可。")
        add(out, "p", "最后，把资源表当成发布依赖，而不是文末装饰。章节中每个会随版本变化的关键判断，都应该能回到一条带核验时间的来源；来源发生变化时，先重新验证正文，再更新 revision 和网站快照。")
        add(out, "p", "资料阅读也要区分“接口存在”和“效果成立”。官方参考页可以证明参数、事件或权限模式存在，却不能证明它在所有仓库和任务上都更好。效果判断需要配套实验：固定输入，记录环境，重复运行，并同时观察正确性、成本、时延和失败恢复。")
        add(out, "p", "建立个人学习路线时，不必从资源表第一行读到最后一行。先围绕当前问题选一份总览和一份具体参考，完成最小实验；遇到边界再回到规范、安全页或仓库。这样来源服务于理解和行动，而不是把阅读量本身当成进度。")
        add(out, "p", "团队共享资料时，还要约定更新责任。新增链接的人写清它支持哪条结论，修改正文的人检查旧引用是否仍然匹配，发布者确认公开页面能够访问。对于登录后才能打开或内容会动态变化的页面，最好同时记录官方标题和稳定入口，避免把临时跳转地址当成长期引用。每次发布不必重查所有历史链接，但当前章节真正依赖的来源必须逐条打开确认。")
        add(out, "p", "引用清单还应该能支持反向追踪：从正文中的关键判断，可以找到对应的一手来源；从资源条目，也能看出它被哪些章节使用。这样做的价值不只是方便审稿。产品行为发生变化时，维护者能够快速定位受影响的页面，只修改真正过期的结论，并在更新时间里留下清楚记录。对读者而言，这种可追踪性也比堆叠几十个链接更可信，因为每条来源都参与了论证，而不是装饰性的参考阅读。")

    xml = "".join(ET.tostring(child, encoding="unicode") for child in out)
    chars = len(re.sub(r"\s+", "", re.sub(r"<[^>]+>", "", xml)))
    return xml, {"slug": slug, "sourceTitle": text_of(source_blocks[0]), "characters": chars, "keptBlocks": kept, "keptCharacters": kept_chars, "removedRiskBlocks": removed, "images": len(images), "riskHits": sorted(set(match.group(0) for match in RISK_RE.finditer(xml)))}


def main() -> int:
    archive_root = ET.fromstring("<root>" + SOURCE.read_text(encoding="utf-8") + "</root>")
    source_sections = sections(archive_root)
    by_slug: dict[str, tuple[str, list[ET.Element]]] = {}
    for slug, marker in SECTION_MATCH.items():
        matches = [item for item in source_sections if marker in item[0]]
        if len(matches) != 1:
            raise RuntimeError(f"{slug}: expected one source section for {marker!r}, got {[item[0] for item in matches]}")
        by_slug[slug] = matches[0]

    DRAFT_DIR.mkdir(parents=True, exist_ok=True)
    reports = []
    failures = []
    for entry in MANIFEST["chapters"]:
        _, blocks = by_slug[entry["slug"]]
        xml, report = build(entry, blocks)
        (DRAFT_DIR / f"{entry['slug']}.xml").write_text(xml + "\n", encoding="utf-8")
        reports.append(report)
        if not 6000 <= report["characters"] <= 18000:
            failures.append(f"{entry['slug']}: character gate {report['characters']}")
        if report["riskHits"]:
            failures.append(f"{entry['slug']}: risk terms remain {report['riskHits']}")
    REPORT_DIR.mkdir(parents=True, exist_ok=True)
    payload = {"schemaVersion": 1, "sourceRevision": RECEIPT["documents"]["directory"]["revision"], "chapters": reports, "failures": failures}
    (REPORT_DIR / "draft-preparation.json").write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"ok": not failures, "chapters": len(reports), "failures": failures}, ensure_ascii=False, indent=2))
    return 0 if not failures else 1


if __name__ == "__main__":
    sys.exit(main())
