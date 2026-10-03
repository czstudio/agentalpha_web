/** 开源社区公司真题（scripts/extract_external_questions.py 从 5 个开源题库仓库抽取，勿手改）
 *  口径：题目保持原文（英文原题不译）；仅作外部参考补充，内容以原仓库为准。
 */

export const EXTERNAL_SOURCES: Record<string, { name: string; url: string }> = {
  "agentguide": {
    "name": "AgentGuide · 12-company-interview-cases",
    "url": "https://github.com/adongwanai/AgentGuide/blob/main/docs/04-interview/12-company-interview-cases.md"
  },
  "pallavi": {
    "name": "ai-engineering-interview-questions-company-wise（Apache-2.0）",
    "url": "https://github.com/pallavi-shekhar/ai-engineering-interview-questions-company-wise"
  }
}

export const EXTERNAL_PROCESS: Record<string, string> = {
  "google": "Recruiter screen -> hiring manager screen -> **technical quiz round** (~2 hours: four ~30-min sections on CS fundamentals, mathematics, statistics, and ML, rapid-fire and definition-heavy; veterans fail on forgotten formal definitions like eigenvalues, rank, SVD) -> 2 coding rounds on CoderPad (code is expected to *run*, unlike core Google) -> ML/system design -> paper discussion round (present and defend a paper, sometimes given 2-3 days prior) -> behavioral -> hiring committee. 6-10 weeks tota"
}

export const EXTERNAL_QUESTIONS: Record<string, Array<{ q: string; src: string }>> = {
  "meituan": [
    {
      "q": "[美团北斗校招] 八股:LoRA 微调原理?训练时调过哪些超参数?有什么经验?",
      "src": "agentguide"
    },
    {
      "q": "[美团北斗校招] 八股:SFT 的 loss 如何只计算回答部分?(如何 ignore padding token?)",
      "src": "agentguide"
    },
    {
      "q": "[美团北斗校招] 八股:Attention 计算中有哪些显存优化策略?(如 KV Cache 复用、batch 拼接)",
      "src": "agentguide"
    },
    {
      "q": "[美团北斗校招] 八股:分布式训练中 Zero-2 和 Zero-3 的核心区别是什么?",
      "src": "agentguide"
    },
    {
      "q": "[美团北斗校招] 八股:Transformer 为什么用 LayerNorm 而不是 BatchNorm?",
      "src": "agentguide"
    },
    {
      "q": "[美团北斗校招] 项目:项目中的数据规模多大?SFT 数据是如何清洗和构建的?",
      "src": "agentguide"
    },
    {
      "q": "[美团北斗校招] 项目:为什么在项目中选择 GRPO 而不是 PPO 或 DPO?它解决了什么问题?",
      "src": "agentguide"
    },
    {
      "q": "[美团北斗校招] 项目:奖励函数是如何设计的?是否考虑了事实正确性、安全性等维度?",
      "src": "agentguide"
    },
    {
      "q": "[美团北斗校招] 项目:为什么引入 RAG?在什么场景下 RAG 比纯 SFT 更有效?",
      "src": "agentguide"
    },
    {
      "q": "[美团北斗校招] 项目:用 LangGraph 实现多轮对话 Agent,相比手写 prompt 流程有哪些工程和效果优势?",
      "src": "agentguide"
    },
    {
      "q": "[美团北斗校招] 代码题:lc102 二叉树的层序遍历",
      "src": "agentguide"
    },
    {
      "q": "[美团北斗校招] 八股:bf16 和 float16 的区别?各占多少位?训练中如何选择?",
      "src": "agentguide"
    },
    {
      "q": "[美团北斗校招] 八股:DeepSpeed Zero 各阶段分别做了哪些优化?",
      "src": "agentguide"
    },
    {
      "q": "[美团北斗校招] 八股:如何估算 LLaMA-7B 模型推理时的显存占用?",
      "src": "agentguide"
    }
  ],
  "bytedance": [
    {
      "q": "[字节多模态] 多模态学习中常见的融合方式有哪些?早期融合 vs 晚期融合 vs 中间融合的区别和适用场景?",
      "src": "agentguide"
    },
    {
      "q": "[字节多模态] CLIP 模型的原理是什么?它是如何实现图文对齐的?损失函数怎么设计的?",
      "src": "agentguide"
    },
    {
      "q": "[字节多模态] Vision Transformer (ViT) 和 CNN 在图像特征提取上的优劣对比?",
      "src": "agentguide"
    },
    {
      "q": "[字节多模态] 什么是对比学习(Contrastive Learning)?InfoNCE loss 的公式和作用?",
      "src": "agentguide"
    },
    {
      "q": "[字节多模态] 大模型训练中常用的优化器有哪些?AdamW 和 Adam 的区别是什么?",
      "src": "agentguide"
    },
    {
      "q": "[字节多模态] 请详细介绍你简历中提到的多模态项目:输入是什么?模型结构?如何对齐不同模态?",
      "src": "agentguide"
    },
    {
      "q": "[字节多模态] 项目中遇到的最大挑战是什么?你是如何解决模态异构性问题的?",
      "src": "agentguide"
    },
    {
      "q": "[字节多模态] 有没有做过消融实验?哪些模块对最终性能提升最关键?",
      "src": "agentguide"
    },
    {
      "q": "[字节多模态] 如果让你将该项目部署上线,你会考虑哪些工程优化点?(如推理加速、缓存策略等)",
      "src": "agentguide"
    },
    {
      "q": "[字节多模态] 你的模型在训练集上表现很好,但在新场景(如不同光照/语言风格)下性能下降明显,你会如何提升泛化能力?",
      "src": "agentguide"
    },
    {
      "q": "[字节多模态] LeetCode 300:最长递增子序列——要求写出 O(n log n) 解法",
      "src": "agentguide"
    },
    {
      "q": "[字节多模态] 大模型训练中的数据并行、模型并行、流水线并行分别适用于什么场景?ZeRO 是什么?",
      "src": "agentguide"
    },
    {
      "q": "[字节多模态] 如何评估多模态模型的性能?除了准确率,还有哪些指标?(如 Recall@K, mAP 等)",
      "src": "agentguide"
    },
    {
      "q": "[字节多模态] 什么是 instruction tuning?在多模态场景下如何做?",
      "src": "agentguide"
    }
  ],
  "deepseek": [
    {
      "q": "[DeepSeek 专项] 八股:Transformer的计算复杂度分析,写伪代码",
      "src": "agentguide"
    },
    {
      "q": "[DeepSeek 专项] 八股:多头和单头的情况下有什么区别",
      "src": "agentguide"
    },
    {
      "q": "[DeepSeek 专项] 八股:DeepSeek R1的创新点和优化点?",
      "src": "agentguide"
    },
    {
      "q": "[DeepSeek 专项] 项目:介绍实习经历,并选一篇论文进行讲解",
      "src": "agentguide"
    },
    {
      "q": "[DeepSeek 专项] 项目:提示工程的主要方法有哪些?有哪些优化技巧?",
      "src": "agentguide"
    },
    {
      "q": "[DeepSeek 专项] 项目:LLM怎么微调的,数据量多大,各数据配比多少",
      "src": "agentguide"
    },
    {
      "q": "[DeepSeek 专项] 项目:SFT和强化学习各自有什么优缺点,分别适用于什么场景?",
      "src": "agentguide"
    },
    {
      "q": "[DeepSeek 专项] 项目:大模型生成内容的评测方式有哪些,具体怎么操作?",
      "src": "agentguide"
    },
    {
      "q": "[DeepSeek 专项] 项目:大模型输出前后不一致怎么办,如何确保大模型输出内容的一致性?",
      "src": "agentguide"
    },
    {
      "q": "[DeepSeek 专项] 代码题:手撕sqrt(x),保留6位小数",
      "src": "agentguide"
    },
    {
      "q": "[DeepSeek 专项] 八股:大模型框架了解哪些,介绍下vllm原理",
      "src": "agentguide"
    },
    {
      "q": "[DeepSeek 专项] 八股:常用的LLM,讲解DeepSeek R1的训练流程和基本原理",
      "src": "agentguide"
    },
    {
      "q": "[DeepSeek 专项] 八股:讲讲MOE架构和Dense架构差异,在训练和推理方面",
      "src": "agentguide"
    },
    {
      "q": "[DeepSeek 专项] 项目:介绍实习项目,项目中有没有做微调?",
      "src": "agentguide"
    }
  ],
  "openai": [
    {
      "q": "What is the KV cache, and what are its memory implications at scale? Derive the formula.",
      "src": "pallavi"
    },
    {
      "q": "Your p99 latency doubled after a deploy with no model change. Walk through the diagnosis.",
      "src": "pallavi"
    },
    {
      "q": "How do you handle tool-call errors, timeouts and retries in an agentic loop?",
      "src": "pallavi"
    },
    {
      "q": "Design human-in-the-loop approval for an agent that takes consequential actions.",
      "src": "pallavi"
    },
    {
      "q": "Prompting, RAG or fine-tuning: give me your decision framework with cost and latency attached.",
      "src": "pallavi"
    },
    {
      "q": "How do you detect and measure hallucinations in a production RAG system?",
      "src": "pallavi"
    },
    {
      "q": "What is prompt injection (direct and indirect), and what is your layered defence?",
      "src": "pallavi"
    },
    {
      "q": "How do you prevent an agent with tool access from exfiltrating data via a malicious web page?",
      "src": "pallavi"
    },
    {
      "q": "Design an enterprise RAG assistant over 10M documents with per-user permissions.",
      "src": "pallavi"
    },
    {
      "q": "Design the serving stack for a consumer chat assistant at hundreds of millions of users.",
      "src": "pallavi"
    }
  ],
  "moonshot": [
    {
      "q": "What is Multi-head Latent Attention (MLA) and why did DeepSeek introduce it?",
      "src": "pallavi"
    },
    {
      "q": "Explain RoPE and how position interpolation / YaRN extend context beyond the trained length.",
      "src": "pallavi"
    },
    {
      "q": "What is a mixture-of-experts architecture and how does it scale capacity without scaling FLOPs?",
      "src": "pallavi"
    },
    {
      "q": "What is the lost-in-the-middle problem in long contexts and how do you address it?",
      "src": "pallavi"
    },
    {
      "q": "Explain the prefill and decode phases. Why is prefill compute-bound and decode memory-bandwidth-bound?",
      "src": "pallavi"
    },
    {
      "q": "Explain prefix caching / prompt caching. When should you use it, and what invalidates a cached prefix?",
      "src": "pallavi"
    },
    {
      "q": "Explain disaggregated prefill/decode serving and when it pays for itself.",
      "src": "pallavi"
    },
    {
      "q": "How would you evaluate an agent, as opposed to a single model response?",
      "src": "pallavi"
    }
  ],
  "alibaba": [
    {
      "q": "How does Byte Pair Encoding work, and what are its failure modes (numbers, code, non-Latin scripts)?",
      "src": "pallavi"
    },
    {
      "q": "Explain RoPE and how position interpolation / YaRN extend context beyond the trained length.",
      "src": "pallavi"
    },
    {
      "q": "What is a mixture-of-experts architecture and how does it scale capacity without scaling FLOPs?",
      "src": "pallavi"
    },
    {
      "q": "What is RLVR (RL with verifiable rewards) and where does it beat a learned reward model?",
      "src": "pallavi"
    },
    {
      "q": "What is distillation, and how do you build a strong small model from a large one?",
      "src": "pallavi"
    },
    {
      "q": "What is benchmark contamination and how do you guard against it?",
      "src": "pallavi"
    },
    {
      "q": "How do vision-language models get images into an LLM: projector, cross-attention, or native tokens?",
      "src": "pallavi"
    },
    {
      "q": "Implement multi-head attention, then convert it to grouped-query attention.",
      "src": "pallavi"
    }
  ],
  "zhipu": [
    {
      "q": "What is a mixture-of-experts architecture and how does it scale capacity without scaling FLOPs?",
      "src": "pallavi"
    },
    {
      "q": "What is RLVR (RL with verifiable rewards) and where does it beat a learned reward model?",
      "src": "pallavi"
    },
    {
      "q": "What is benchmark contamination and how do you guard against it?",
      "src": "pallavi"
    },
    {
      "q": "How would you evaluate an agent, as opposed to a single model response?",
      "src": "pallavi"
    }
  ]
}

export const EXTERNAL_COVER_NOTE: Record<string, string> = {
  "meituan": "美团（meituan）",
  "bytedance": "字节跳动（bytedance）",
  "deepseek": "DeepSeek（deepseek）",
  "openai": "OpenAI（openai）",
  "moonshot": "月之暗面（moonshot）",
  "alibaba": "阿里巴巴（alibaba）",
  "zhipu": "智谱（zhipu）"
}
