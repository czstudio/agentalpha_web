---
slug: multimodal-tk002
no: "902"
title: "VLM 的视觉编码器为什么通常使用 ViT？与 CNN 相比有什么优势"
question: "VLM 的视觉编码器为什么通常使用 ViT？与 CNN 相比有什么优势"
excerpt: "面试官想看你能否从"架构兼容性"和"预训练生态"两个维度解释 ViT 在 VLM 中的主导地位。刁钻点在于：很多人只答"ViT 和 Transformer 兼容"，但说不清 CNN 的局部感受野与 ViT 的全局注意力在"
tags: ["真题解析", "多模态"]
category: "multimodal"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 10
words: 4623
updated: "2026-09-29"
---

## VLM 的视觉编码器为什么通常使用 ViT？与 CNN 相比有什么优势

#### 1️⃣ 考察意图

面试官想看你能否从"架构兼容性"和"预训练生态"两个维度解释 ViT 在 VLM 中的主导地位。刁钻点在于：很多人只答"ViT 和 Transformer 兼容"，但说不清 CNN 的局部感受野与 ViT 的全局注意力在多模态对齐中的具体差异，以及为什么 CLIP/DINOv2 等预训练 ViT 比预训练 CNN（如 ResNet）更适合做视觉编码器。答好了能展示你对视觉表征的深度理解。

#### 2️⃣ 标准答

VLM 选择 ViT 而非 CNN 作为视觉编码器，原因有三层：

**1. 架构兼容性：ViT 天然与 LLM 共享 Transformer 框架**

- **统一架构**：ViT 将图像切分为 16×16 patch，每个 patch 经线性投影变成一个 token，送入 Transformer encoder。这与 LLM 处理文本 token 的方式完全一致——输入都是 token 序列，处理都是 self-attention。因此 ViT 的输出可以直接送入 LLM，无需架构转换
- **CNN 的问题**：CNN 的卷积操作产生的是空间特征图（feature map，形状 [H, W, C]），要送入 LLM 需要额外的 flatten + 线性投影，且空间信息在 flatten 后丢失。更重要的是，CNN 的层次结构（Conv → Pool → Conv）与 Transformer 的扁平结构不兼容，混合架构（CNN encoder + Transformer LLM）会导致梯度传播不一致
- **实际案例**：早期的 VisualBERT 和 ViLBERT 用 ResNet 做视觉编码器，需要 Region Proposal Network（RPN）提取 ROI 特征，流程复杂且信息损失大。ViT 直接输出 patch token，简化了整个 pipeline

**2. 全局感受野：ViT 的 self-attention 捕获长距离依赖**

- **ViT 的优势**：self-attention 让每个 patch token 直接与所有其他 token 交互，第一层就有全局感受野。这对于多模态任务至关重要——例如"图中左边的人穿什么颜色的衣服"，需要模型同时关注"左边的人"和"衣服颜色"两个区域，CNN 需要多层卷积才能建立这种长距离关联
- **CNN 的局限**：CNN 的感受野随层数线性增长（如 ResNet-50 最后一层感受野约 483×483），要覆盖整张 224×224 的图像需要很深的网络。虽然空洞卷积（Dilated Conv）可以增大感受野，但会丢失细节信息
- **实验数据**：在 ImageNet 上，ViT-L/14 的 attention map 显示，浅层 attention 就能关注到全局结构（如"这是一只猫"），而 ResNet 需要到 block 4 才能建立类似的语义理解。在 VLM 场景中，ViT 的全局理解能力使图文对齐更精准

**3. 预训练生态：CLIP/DINOv2 等高质量 ViT 权重**

- **CLIP ViT**：OpenAI 的 CLIP 用 4 亿图文对训练 ViT，其视觉编码器已经学会了"视觉-语言对齐"的表征。LLaVA 直接用 CLIP ViT-L/14 作为视觉编码器，冻结其参数，只训练投影层和 LLM。这相当于"站在巨人肩膀上"——CLIP 已经做了图文对齐的预训练，VLM 只需要在此基础上做指令微调
- **DINOv2 ViT**：Meta 的 DINOv2 用自监督方式训练（不需要文本标注），在细粒度视觉任务（如深度估计、分割）上优于 CLIP。InternVL 等模型用 DINOv2 做视觉编码器，在密集视觉理解上表现更好
- **CNN 预训练权重的局限**：ResNet/ImageNet 预训练权重只学了"分类"能力，没有"视觉-语言对齐"。如果用 ResNet 做视觉编码器，需要从头训练对齐层，数据需求大、效果差

**ViT vs CNN 对比：**

| 维度 | ViT | CNN (ResNet) |
|---|---|---|
| 架构 | Transformer (与LLM兼容) | 卷积 (需转换) |
| 感受野 | 第一层全局 | 随层数线性增长 |
| 输出格式 | Token 序列 (直接送LLM) | Feature map (需flatten) |
| 预训练对齐 | CLIP/DINOv2 (已对齐) | ImageNet (未对齐) |
| 空间信息 | Position embedding保留 | Pooling层丢失 |
| 计算效率 | O(N²) attention | O(N) 卷积 |
| 分辨率灵活性 | 需固定patch大小 | 可变输入尺寸 |

#### 3️⃣ 答题模板（30 秒电梯版）

> "VLM 用 ViT 有三个原因。第一，架构兼容——ViT 把图像变 patch token，和 LLM 处理文本 token 一样，可以直接送入 LLM，CNN 的 feature map 需要额外转换。第二，全局感受野——ViT 第一层 self-attention 就是全局的，CNN 要很深才有全局视野。第三，预训练生态——CLIP ViT 已经用 4 亿图文对训练了视觉-语言对齐，直接冻结用就行，ResNet 只有 ImageNet 分类权重没有对齐能力。总结一句：ViT 赢在架构兼容、全局理解、和 CLIP 预训练生态。"

#### 4️⃣ 高频追问 & 应对

**追问 1**：ViT 的 self-attention 是 O(N²) 复杂度，高分辨率图像怎么办？

> 高分辨率下 ViT 的计算量确实爆炸——1280×720 图像用 16×16 patch 产生 3600 个 token，attention 计算量是 224×224（196 token）的 337 倍。解决方案：(1) 局部注意力——如 Swin Transformer 用 window attention 将复杂度从 O(N²) 降到 O(N×W²)，W 是窗口大小；(2) 混合架构——低层用 CNN 下采样到合理分辨率再送入 ViT，如 ViT-Hybrid 用 ResNet-50 的 stage 3 输出（14×14 feature map）作为 ViT 输入；(3) 动态 token 压缩——如 Qwen-VL 用 pooling 将高分辨率 token 压缩到合理数量。实际中，大多数 VLM 限制输入到 224-448 分辨率，更高分辨率用分块处理（如将 1024×1024 切成 4 个 512×512 分别编码）。

**追问 2**：为什么不用 CLIP 的文本编码器直接做对齐，而要用 LLM？

> CLIP 的文本编码器是 BERT-scale（~110M），能力远不如 LLM（7B+）。CLIP 的对齐是"浅层"的——它学会了"猫的图片"和"cat"这个文本 embedding 相似，但无法理解"这张图中的猫在做什么"这种复杂推理。LLM 带来三个能力：(1) 复杂推理——LLM 可以基于视觉 token 做多步推理（如"图中有几个人？他们在做什么？可能发生了什么？"）；(2) 指令遵循——LLM 可以按用户指令格式化输出（如"用 JSON 描述图中物体"）；(3) 工具调用——LLM 可以决定是否需要调用外部工具（如 OCR、目标检测）来补充信息。CLIP 文本编码器这些能力都没有。

**追问 3**：DINOv2 和 CLIP ViT 在 VLM 中有什么区别？什么时候选哪个？

> CLIP 的视觉编码器是用"对比学习"训练的——学会让图文 embedding 在同一空间中对齐。优势：天然有视觉-语言对齐能力，LLaVA 直接用就行。劣势：CLIP 的对比学习目标是"区分不同图像"，不擅长细粒度理解（如"图中第3个人的表情是什么"）。DINOv2 用自监督方式训练（学生-教师蒸馏），不学语言对齐但学到了更强的视觉表征——在深度估计、分割、细粒度识别上优于 CLIP。选择标准：通用场景（描述、VQA）选 CLIP（预置对齐），密集视觉任务（OCR、文档理解、细粒度识别）选 DINOv2（更强的视觉特征）。InternVL 就用 DINOv2 替代 CLIP，在 DocVQA 上提升 8%。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ "ViT 比 CNN 效果好，所以应该用 ViT" → ✅ "ViT 的优势不是单指效果，而是架构兼容性、全局感受野、和 CLIP 预训练生态的综合优势。在某些任务上（如实时目标检测），CNN 仍然是更好的选择——YOLO 系列用 CNN 在推理速度上远超 ViT。"
- ❌ "CLIP 是最好的视觉编码器" → ✅ "CLIP 是通用场景的最佳选择，但在细粒度视觉任务上 DINOv2 更强，在多语言场景 SigLIP 更好。选择取决于任务需求，没有万能编码器。"
- ❌ "ViT 的 patch 越小越好，因为分辨率更高" → ✅ "Patch 越小 token 越多，计算量 O(N²) 爆炸。需要在分辨率和计算成本之间平衡——16×16 是经验最优值，更小的 patch 只在密集视觉任务（如 OCR）中有收益。"

#### 6️⃣ 简历呼应

- **如果你有 VLM 项目**：从"视觉编码器选型"切入，描述你对比了 CLIP ViT 和 DINOv2 在特定任务上的表现，给出具体数据（如 DINOv2 在 DocVQA 上高 8%，但在通用 VQA 上低 3%）
- **如果你只做过 CV**：用"CNN 到 ViT 的迁移"切入，说明你理解 ResNet 的局部特征提取和 ViT 的全局注意力各有优势，在 VLM 中 ViT 因架构兼容性胜出
- **如果你是校招无项目**：复现 LLaVA 训练，对比不同视觉编码器（CLIP ViT-L vs. DINOv2 ViT-L）在 VQA v2 上的效果，写一篇博客分析两者在视觉表征上的差异
- "An Image is Worth 16x16 Words: Transformers for Image Recognition at Scale" (Dosovitskiy et al., 2021, ViT)
- "Learning Transferable Visual Models From Natural Language Supervision" (Radford et al., 2021, CLIP)
- "DINOv2: Learning Robust Visual Features without Supervision" (Oquab et al., 2023)

---
