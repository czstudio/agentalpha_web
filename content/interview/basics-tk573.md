---
slug: basics-tk573
no: "1473"
title: "Bert的MLM可以手写一下吗"
question: "Bert的MLM可以手写一下吗"
excerpt: "面试官想看的不是“背出MLM定义”，而是手写核心逻辑的工程能力。考察类型是系统设计+代码实现，刁钻点在于：① 是否清楚mask策略的80%/10%/10%比例背后的训练-推理分布对齐；② 是否知道损失函数只算mask位置"
tags: ["真题解析", "LLM 基础"]
category: "basics"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 11
words: 4964
updated: "2026-09-29"
---

## Bert的MLM可以手写一下吗

#### 1️⃣ 考察意图

面试官想看的不是“背出MLM定义”，而是**手写核心逻辑的工程能力**。考察类型是**系统设计+代码实现**，刁钻点在于：① 是否清楚mask策略的80%/10%/10%比例背后的**训练-推理分布对齐**；② 是否知道损失函数只算mask位置，且需要**忽略padding**；③ 能否写出**可运行的PyTorch伪代码**，而非概念堆砌。答好了能展示：对预训练细节的扎实掌握、工程实现中的边界处理能力、以及从论文到代码的转化硬实力。

#### 2️⃣ 标准答

**核心流程：** MLM（Masked Language Model）在BERT中随机mask输入token的15%，让模型用双向上下文预测被遮住的词。下面分三步手写，用PyTorch风格。

**第一步：生成mask索引（15%采样 + 策略分配）**

`import torch**
def mask_tokens(input_ids, tokenizer, mask_prob=0.15):
 # input_ids: [batch, seq_len]
 labels = input_ids.clone() # 用于计算损失，未mask位置设为-100
 probability_matrix = torch.full(input_ids.shape, mask_prob)

 # 特殊token（[CLS], [SEP], [PAD]）不参与mask
 special_tokens_mask = tokenizer.get_special_tokens_mask(
 input_ids, already_has_special_tokens=True
 )
 probability_matrix.masked_fill_(special_tokens_mask, value=0.0)

 # 从概率矩阵采样mask位置
 masked_indices = torch.bernoulli(probability_matrix).bool()

 # 80%替换为[MASK]，10%随机词，10%不变
 # 注意：这步是为了让模型在微调时适应[MASK]缺失的情况
 indices_replaced = torch.bernoulli(torch.full(input_ids.shape, 0.8)).bool() & masked_indices
 input_ids[indices_replaced] = tokenizer.mask_token_id

 indices_random = torch.bernoulli(torch.full(input_ids.shape, 0.5)).bool() & masked_indices & ~indices_replaced
 random_words = torch.randint(len(tokenizer), input_ids.shape, dtype=torch.long)
 input_ids[indices_random] = random_words[indices_random]

 # 剩余10%不变（indices_random中0.5概率+80%已覆盖，剩下10%自然保留）
 # labels中只保留mask位置的真实token，其余设为-100（忽略损失）
 labels[~masked_indices] = -100

 return input_ids, labels
`工程取舍解释：** 80%用[MASK]让模型学习预测；10%用随机词迫使模型依赖上下文而非记忆；10%保留原词缓解预训练-微调分布偏移。**为什么不用100%[MASK]？** 因为下游任务中几乎看不到[MASK]，模型会过拟合这个特殊符号。

**第二步：前向传播与损失计算**

`class BertForMLM(nn.Module):** def __init__(self, bert_model, vocab_size):
 super().__init__()
 self.bert = bert_model
 self.mlm_head = nn.Linear(bert_model.config.hidden_size, vocab_size)

 def forward(self, input_ids, attention_mask, labels):
 outputs = self.bert(input_ids, attention_mask=attention_mask)
 sequence_output = outputs.last_hidden_state # [batch, seq_len, hidden]
 logits = self.mlm_head(sequence_output) # [batch, seq_len, vocab]

 # 损失只计算mask位置，忽略padding和未mask位置
 loss_fn = nn.CrossEntropyLoss(ignore_index=-100)
 loss = loss_fn(logits.view(-1, logits.size(-1)), labels.view(-1))
 return loss, logits
`实际落地的坑 + 解法：**

- **坑1：** 直接对全序列算交叉熵，计算量爆炸（vocab_size通常3万+）。**解法：** 只取mask位置的logits计算损失，但PyTorch的`CrossEntropyLoss`配合`ignore_index=-100`已经自动忽略非mask位置，无需手动切片。
- **坑2：** 随机词替换时，如果随机到的词恰好是原始词，相当于“不变”策略重复。**解法：** 这是论文允许的，不影响整体分布；但实现中可以用`torch.where`确保不重复，不过收益极小，通常不处理。
- **坑3：** 训练时batch内序列长度不同，padding导致计算浪费。**解法：** 使用`attention_mask`在BERT内部屏蔽padding，损失中padding位置被`ignore_index`忽略。

**第三步：训练循环（简化版）**

`optimizer = torch.optim.AdamW(model.parameters(), lr=5e-5)**for batch in dataloader:
 input_ids, attention_mask = batch
 masked_input_ids, labels = mask_tokens(input_ids, tokenizer)
 loss, _ = model(masked_input_ids, attention_mask, labels)
 loss.backward()
 optimizer.step()
 optimizer.zero_grad()
`

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从三个层面回答：第一，mask策略的80%/10%/10%比例设计，核心是为了对齐预训练和微调分布；第二，损失计算只针对mask位置，通过`ignore_index=-100`忽略padding和未mask token；第三，手写实现时注意特殊token不参与mask、随机词替换的边界条件。总结一句：MLM的关键不是背比例，而是理解每个设计背后的工程取舍。”

#### 4️⃣ 高频追问 & 应对
追问 1**：为什么MLM要随机替换10%为随机词，而不是全部用[MASK]？

> 如果全部用[MASK]，模型会学到“看到[MASK]就预测”，但下游任务（如分类、NER）中根本没有[MASK] token。随机词迫使模型必须依赖上下文语义，而不是依赖特殊符号。这本质是**数据增强**：让模型在输入有噪声时仍能正确预测。实验显示，去掉随机词替换会导致下游任务F1下降1-2个点（参考BERT原论文消融实验）。

**追问 2**：你的实现中，mask比例15%是固定的，但实际训练中序列长度不同，长序列的mask数量更多，会不会导致模型偏向长序列？

> 这是个好问题。15%是比例而非绝对数量，所以长序列确实有更多mask位置，但损失是平均的（每个mask位置贡献相同梯度）。实际上，长序列提供更多监督信号，这是好事。如果担心偏差，可以在采样时按序列长度动态调整mask比例，但BERT原论文没这么做，因为效果已经足够。更常见的做法是**动态mask**：每个epoch重新采样mask位置，避免模型记忆固定模式。

**追问 3**：手写时，`labels`中未mask位置设为-100，但padding位置也是-100，会不会混淆？

> 不会混淆，因为padding位置在`attention_mask`中已经被BERT忽略，不会产生有意义的logits。损失计算时，`CrossEntropyLoss`的`ignore_index`对所有-100位置一视同仁，不计算梯度。但注意：如果padding位置恰好被mask（概率极低，因为`special_tokens_mask`已排除），需要额外处理。实际实现中，`tokenizer.get_special_tokens_mask`会标记所有特殊token，包括[PAD]，所以padding永远不会被mask。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ 说“MLM就是随机遮住一些词让模型猜”，然后只背比例，不写代码。 → ✅ 必须手写伪代码，并解释为什么80%/10%/10%不是随意定的，而是为了缓解分布偏移。
- ❌ 损失计算时对全序列所有位置算交叉熵，然后说“只取mask位置”。 → ✅ 正确做法是用`ignore_index=-100`在损失函数层面忽略非mask位置，避免手动切片导致计算图断裂。
- ❌ 认为mask比例15%是硬性规定，不能改。 → ✅ 可以调整，但15%是经验最优值（原论文实验显示10%效果略差，20%提升有限但计算量增加）。

#### 6️⃣ 简历呼应

- **如果你有预训练项目**：从“动态mask vs 静态mask”切入，展示你如何优化训练效率（比如用`torch.bernoulli`替代循环采样）。
- **如果你只做过微调**：用“微调时[MASK] token的分布差异”类比，说明为什么MLM设计要考虑下游任务。
- **如果你是校招无项目**：聚焦“从零实现小型BERT”的demo，强调你复现了MLM损失下降曲线，并对比了不同mask策略的收敛速度。

#### 7️⃣ 延伸阅读

- BERT原论文：BERT: Pre-training of Deep Bidirectional Transformers for Language Understanding（Section 3.1 Masked LM）
- 消融实验分析：What Does BERT Look At? An Analysis of BERT's Attention（讨论mask策略影响）
- PyTorch官方MLM实现：Hugging Face Transformers库的`BertForMaskedLM`源码
- 动态mask vs 静态mask对比：RoBERTa: A Robustly Optimized BERT Pretraining Approach（Section 4.1）
- 工程优化：Training BERT with Gradient Checkpointing and Mixed Precision（处理长序列时的内存优化）

---
