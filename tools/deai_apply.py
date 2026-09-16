# -*- coding: utf-8 -*-
"""按 lieflat-less-ai-tone skill 规则 1/4 对笔记页文案做白名单改写。
每处先断言旧文本存在，防止 md 漂移导致错改。"""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

# (slug, field, [(old_sub, new_sub), ...])
EDITS = [
    # ---- 标题(15) ----
    ("agent-deployment-reliability", "title", [("上线不是把接口接通：超时、熔断和未知结果要先设计", "上线，先把超时、熔断和未知结果设计好")]),
    ("agent-handoff-contract", "title", [("交接不是把聊天记录转发过去：先把合同写清楚", "交接：先把合同写清楚")]),
    ("agent-memory-system", "title", [("记忆系统不是聊天记录：短期、长期和压缩到底怎么分工", "记忆系统里，短期、长期和压缩到底怎么分工")]),
    ("agent-project-evidence", "title", [("通常不是项目小而是证据链断了", "通常是证据链断了")]),
    ("agent-security-boundaries", "title", [("Agent 安全不是加一句提示词：权限、工具和数据边界怎么设计", "Agent 安全怎么设计：权限、工具和数据边界")]),
    ("llm-data-mixture", "title", [("预训练数据不是越多越好：这批数据值得加吗？", "这批预训练数据值得加吗？")]),
    ("llm-inference-optimization", "title", [("推理优化不只是换量化：吞吐、延迟和显存要一起看", "推理优化：吞吐、延迟和显存要一起看")]),
    ("llm-model-selection", "title", [("选型不是比一个总榜：把任务、成本和失败代价放进同一张表", "选型：把任务、成本和失败代价放进同一张表")]),
    ("llm-sft-data-quality", "title", [("SFT 不是把答案背下来：一条样本怎样改变模型行为", "一条 SFT 样本怎样改变模型行为")]),
    ("multi-agent-protocol-state", "title", [("多 Agent 不是群聊：消息和状态到底怎么管？", "多 Agent 的消息和状态到底怎么管？")]),
    ("multimodal-to-transformer", "title", [("多模态模型不是给图片加个输入框：图像怎样进入 Transformer？", "图像怎样进入 Transformer？")]),
    ("rag-graph-retrieval", "title", [("Graph RAG 不只是画关系图：证据要能沿路径找回去", "Graph RAG：证据要能沿关系路径找回去")]),
    ("rag-query-rewrite", "title", [("查询改写不是把问题说长：别替用户补条件", "查询改写：别替用户补条件")]),
    ("rag-retrieval-pipeline", "title", [("RAG 不只是\u201c向量库 + 提示词\u201d：证据怎样一路到答案？", "RAG 的证据怎样一路到答案？")]),
    ("tool-function-contract", "title", [("Function Calling 不是模型会调函数就完事：先把契约验清楚", "Function Calling：先把契约验清楚")]),
    # ---- 摘要(26) ----
    ("agent-context-engineering", "excerpt", [("多数不是模型小了，而是上下文里混进旧状态", "多数是上下文里混进旧状态")]),
    ("agent-core-architecture", "excerpt", [("核心组件，不是等你背清单。他要看的是你能不能", "核心组件，看的是你能不能")]),
    ("agent-deployment-reliability", "excerpt", [("线上故障往往不是模型单点崩，而是工具超时", "线上故障往往是工具超时")]),
    ("agent-failure-story", "excerpt", [("失败案例不是自我否定题，考的是", "失败案例考的是")]),
    ("agent-human-escalation", "excerpt", [("最怕的不是它停下来，而是证据、权限、确认都没拿到，还照样", "最怕的是证据、权限、确认都没拿到，还照样")]),
    ("agent-planning-reflection", "excerpt", [("Planner 不是拆得越细越聪明，Reflection 也不是补一句\u201c你确定吗\u201d。计划得能落地执行，反馈得真能改方向，什么时候收手也要提前定好。", "Planner 要拆到能落地执行，拆得细不等于聪明；Reflection 要能改方向，补一句\u201c你确定吗\u201d不算反思。什么时候收手也要提前定好。")]),
    ("agent-project-evidence", "excerpt", [("项目，不是想听组件清单。他要听的是你碰上过", "项目，要听的是你碰上过")]),
    ("agent-rag-why", "excerpt", [("RAG 不是 Agent 标配。知识会更新", "知识会更新")]),
    ("agent-system-design-interview", "excerpt", [("系统设计面试不是比谁画的服务框多。先问清楚", "系统设计面试，先问清楚")]),
    ("agent-workflow-vs-agent", "excerpt", [("Workflow 和 Agent 不是谁更先进的二选一。先看任务不确定性", "Workflow 和 Agent 怎么选？先看任务不确定性")]),
    ("agentic-rl-reward-hacking", "excerpt", [("Reward hacking 不是模型学坏了，是验收器给了个更好钻的空子", "Reward hacking，是验收器给了个更好钻的空子")]),
    ("llm-kv-cache", "excerpt", [("不是把对话存起来就不算了。它缓存每层", "缓存每层")]),
    ("llm-long-context", "excerpt", [("瓶颈，往往不在能塞多少 token，而在关键事实", "瓶颈，往往在关键事实")]),
    ("llm-rlhf-reward-model", "excerpt", [("RLHF 不是喂\u201c人类喜欢\u201d，而是把偏好学成奖励", "RLHF 先把偏好学成奖励")]),
    ("llm-transformer-vs-rnn", "excerpt", [("RNN 不是突然就过时了，是顺序依赖在大规模训练和长上下文里越来越贵", "RNN 的过时是一步步来的：顺序依赖在大规模训练和长上下文里越来越贵")]),
    ("multi-agent-concurrency-budget", "excerpt", [("并发不是 Agent 数量直接相乘。共享资源", "共享资源")]),
    ("multi-agent-task-decomposition", "excerpt", [("价值不是复制几个聊天窗口，而是把互相牵制的目标", "价值在于把互相牵制的目标")]),
    ("multimodal-rag", "excerpt", [("多模态 RAG 不是给文本 RAG 添一列 image_url 就完了。文字、表格、图片、坐标得组织成", "多模态 RAG 得把文字、表格、图片、坐标组织成")]),
    ("multimodal-vision-slicing", "excerpt", [("多半不是模型不行，而是目标没带着合适的分辨率", "多半是目标没带着合适的分辨率")]),
    ("rag-chunking-strategy", "excerpt", [("分块不是切得整齐就行。每一块", "每一块")]),
    ("rag-query-rewrite", "excerpt", [("都是把用户的话翻成知识库听得懂的说法，不是让模型另起一个问题。每次改写", "都是把用户的话翻成知识库听得懂的说法。每次改写")]),
    ("rag-rerank-and-hybrid", "excerpt", [("一个管找得全，一个管排得准，不是二选一。", "一个管找得全，一个管排得准。")]),
    ("rag-vector-database-selection", "excerpt", [("向量库不是 RAG 的魔法核心。先定语料规模", "先定语料规模")]),
    ("tool-permission-audit", "excerpt", [("权限不是发一个 API key 就完事。主体、租户", "主体、租户")]),
    ("tool-retry-policy", "excerpt", [("失败不是一个简单的真或假。先看请求到没到", "失败，先看请求到没到")]),
    ("tool-streaming-gateway", "excerpt", [("工具流式传输不是把文字切成小段就完事，是把一次调用拆成", "工具流式传输，是把一次调用拆成")]),
]

def main():
    ok = fail = 0
    log = []
    for slug, field, pairs in EDITS:
        f = ROOT / "content" / "notes" / f"{slug}.md"
        raw = f.read_text(encoding="utf-8")
        m = re.search(field + r':\s*"([^"]+)"', raw)
        if not m:
            print(f"MISS {slug}#{field}: 字段不存在"); fail += 1; continue
        old_val = m.group(1)
        new_val = old_val
        for old, new in pairs:
            if old not in new_val:
                print(f"FAIL {slug}#{field}: 找不到 → {old[:30]}"); fail += 1; break
            new_val = new_val.replace(old, new)
        else:
            if new_val != old_val:
                raw = raw.replace(f'{field}: "{old_val}"', f'{field}: "{new_val}"')
                f.write_text(raw, encoding="utf-8")
                ok += 1
                log.append((slug, field, old_val, new_val))
                print(f"OK   {slug}#{field}")
    print(f"\n完成 {ok} 处，失败 {fail} 处")
    # 输出前后对照供验收
    with open(ROOT / "tools" / "deai_changes.txt", "w", encoding="utf-8") as w:
        for slug, field, o, n in log:
            w.write(f"### {slug} #{field}\n- 旧: {o}\n- 新: {n}\n\n")

if __name__ == "__main__":
    main()
