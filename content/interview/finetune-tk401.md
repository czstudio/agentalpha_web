---
slug: finetune-tk401
no: "1301"
title: "项目:你提到用DeepSpeed做SFT训练,请讲一下DeepSpeed ZeRO Stage 1-3的区别,以及什么时候用FSDP会更好"
question: "项目:你提到用DeepSpeed做SFT训练,请讲一下DeepSpeed ZeRO Stage 1-3的区别,以及什么时候用FSDP会更好"
excerpt: "面试官想确认你是否真正理解分布式训练的内存优化原理，而非只背过“ZeRO分三阶段”的结论。考察类型是工程取舍+系统设计，刁钻点在于：① 能否讲清每个Stage到底切了什么、省了什么、通信代价是多少；② 能否对比FSDP和"
tags: ["真题解析", "LLM 训练"]
category: "finetune"
author: "AgentAlpha"
source: "AgentAlpha 社区真题库"
minutes: 12
words: 5617
updated: "2026-09-29"
---

## 项目:你提到用DeepSpeed做SFT训练,请讲一下DeepSpeed ZeRO Stage 1-3的区别,以及什么时候用FSDP会更好

`P1` · `llm_training`

🏷 标签：`deepspeed`, `zero`, `fsdp`, `distributed-training`, `llm`

#### 1️⃣ 考察意图

面试官想确认你是否真正理解分布式训练的内存优化原理，而非只背过“ZeRO分三阶段”的结论。考察类型是**工程取舍+系统设计**，刁钻点在于：① 能否讲清每个Stage到底切了什么、省了什么、通信代价是多少；② 能否对比FSDP和ZeRO Stage3的底层差异（如分片粒度、offload策略、与PyTorch生态的耦合度）；③ 能否根据GPU数量、显存大小、模型规模给出具体选型建议。答好了能展示你对大规模训练瓶颈的深刻认知和实战调优能力。

#### 2️⃣ 标准答

**ZeRO Stage 1-3 的核心区别：分片对象与通信量**

ZeRO（Zero Redundancy Optimizer）的核心思想是消除数据并行中的冗余内存占用。三个Stage逐步把优化器状态、梯度、模型参数从“每卡都存一份”变成“所有卡合起来只存一份”。

- **Stage 1（优化器状态分片）**：只对优化器状态（如Adam的momentum和variance）做分片。假设单卡训练一个7B模型，Adam优化器状态占约56GB（7B×4字节×2状态×2倍），Stage1将其均分到N卡，每卡只存56/N GB。通信量：每步训练只在参数更新前做一次all-gather收集分片状态，通信量约等于模型参数量（7B×4字节=28GB），**通信开销最小**。适用场景：显存刚好卡在能装下模型+优化器状态的边界，比如单卡24GB显存跑7B模型（模型权重28GB+优化器56GB=84GB，远超24GB），用Stage1后每卡只需28+56/N GB，N=8时降到28+7=35GB，仍超24GB，所以Stage1通常不够用。
- **Stage 2（优化器状态+梯度分片）**：在Stage1基础上，把梯度也分片。反向传播完成后，每卡只保留自己分到的梯度片段，其余梯度通过reduce-scatter聚合后丢弃。显存节省：梯度占模型参数量×4字节（7B模型约28GB），Stage2将其均分到N卡，每卡只存28/N GB。通信量：反向传播时多了一次reduce-scatter（通信量=梯度大小28GB），前向时仍有一次all-gather（28GB），**总通信量约2倍模型参数量**。适用场景：单卡显存能装下模型权重但装不下梯度+优化器状态，比如单卡80GB跑13B模型（权重52GB+梯度52GB+优化器104GB=208GB），Stage2后每卡只需52+52/N+104/N GB，N=8时降到52+6.5+13=71.5GB，刚好塞进80GB。
- **Stage 3（优化器状态+梯度+参数分片）**：把模型参数也分片。前向计算时，每卡通过all-gather动态获取当前层所需的完整参数，计算完立即丢弃非本卡分片。显存节省：模型权重也从每卡一份变成每卡1/N份，7B模型权重从28GB降到28/N GB。通信量：每层前向和反向各一次all-gather（参数）和一次reduce-scatter（梯度），**总通信量约3倍模型参数量**，且是逐层通信，延迟敏感。适用场景：模型大到单卡连权重都放不下，比如单卡80GB跑70B模型（权重280GB），必须用Stage3或offload。

**FSDP vs ZeRO Stage3：何时选FSDP？**

FSDP（Fully Sharded Data Parallel）是PyTorch原生实现，与ZeRO Stage3在分片策略上等价，但有几个关键差异：

- **分片粒度**：ZeRO Stage3默认按参数组（parameter group）分片，粒度较粗；FSDP支持更细粒度的**wrap策略**，可以按单个Transformer block分片，甚至按层内参数分片。细粒度分片能减少单次all-gather的通信量，但增加通信次数，适合高带宽低延迟的NVLink环境。
- **混合精度支持**：FSDP原生集成PyTorch的AMP（automatic mixed precision），对bf16/fp16的梯度缩放和loss scaling处理更透明；ZeRO Stage3需要手动配置`fp16.enabled`或`bf16.enabled`，且与某些自定义优化器（如LAMB）兼容性较差。
- **offload策略**：ZeRO Stage3的`cpu_offload`支持将优化器状态和参数卸载到CPU，但offload粒度是全局的，不能按层控制；FSDP的`offload_params`可以按模块粒度卸载，比如只卸载attention层参数，保留MLP层在GPU，灵活性更高。
- **生态耦合**：如果你的训练代码已经深度依赖PyTorch的`DistributedDataParallel`和`torch.distributed`，FSDP几乎零迁移成本；如果用了Hugging Face的`Trainer`，DeepSpeed集成更成熟（`deepspeed_config.json`直接配置），FSDP需要额外处理`model.wrap`。

**实际落地的坑+解法**：

- **坑1**：Stage3在低带宽网络（如10Gbps以太网）下，逐层all-gather的通信延迟会严重拖慢训练，吞吐量可能比Stage2还低。**解法**：先用`torch.profiler`分析通信时间占比，若超过40%，换Stage2或开启`gradient_checkpointing`减少计算量。
- **坑2**：FSDP的`auto_wrap_policy`默认按`size_based`策略（参数超过1M的模块自动wrap），但某些模型（如LLaMA的RMSNorm层参数很小）会被错误地不wrap，导致显存不降反升。**解法**：手动指定`transformer_auto_wrap_policy`，或按`partial`策略只wrap attention和FFN层。
- **坑3**：ZeRO Stage3 + `cpu_offload`时，CPU-GPU传输带宽会成为瓶颈（PCIe 4.0 x16约32GB/s），offload后训练速度可能下降5-10倍。**解法**：只在推理或微调（如LoRA）时用offload，全参数训练时优先用Stage2或增加GPU数量。

#### 3️⃣ 答题模板（30 秒电梯版）

> “这个问题我从三个层面回答：第一，ZeRO三个Stage分别分片优化器状态、梯度、参数，显存节省逐步增大但通信量从1倍模型参数量升到3倍；第二，FSDP与ZeRO Stage3本质等价，但FSDP分片粒度更细、与PyTorch AMP集成更好、offload更灵活；第三，选型建议：单卡显存能装下权重时用Stage2，装不下时用Stage3或FSDP，低带宽网络优先Stage2，高带宽NVLink环境FSDP更优。总结一句：没有银弹，必须根据GPU数量、显存大小和网络带宽做benchmark。”

#### 4️⃣ 高频追问 & 应对

**追问 1**：你说FSDP分片粒度更细，具体怎么配置？能举个实际例子吗？

> 在FSDP中，通过`auto_wrap_policy`控制分片粒度。最常用的是`transformer_auto_wrap_policy`，它会自动识别Transformer block（如`LlamaDecoderLayer`）并wrap成独立FSDP单元。如果想更细，可以用`size_based_min_params=1e6`让参数超过1M的模块单独wrap，或者用`partial`策略手动指定哪些模块wrap。实际例子：训练LLaMA-7B时，默认`size_based`策略会把RMSNorm层（参数仅4K）和embedding层（参数约2M）混在一起，导致embedding层被wrap而RMSNorm不wrap，显存分布不均。改为`transformer_auto_wrap_policy`后，每个decoder layer独立分片，显存占用更均衡，吞吐量提升约5%。

**追问 2**：ZeRO Stage3和FSDP在通信模式上有什么本质区别？为什么FSDP在某些场景下更快？

> 本质区别在于通信调度方式。ZeRO Stage3采用**同步逐层通信**：前向计算第i层时，必须先all-gather第i层的参数，计算完再丢弃，然后处理第i+1层。这种模式通信和计算严格串行，GPU在通信时闲置。FSDP支持**预取（prefetch）**：在计算第i层时，可以提前发起第i+1层参数的all-gather，实现通信与计算重叠。实测在8×A100 NVLink环境下，FSDP的预取机制能让通信延迟被计算掩盖，吞吐量比ZeRO Stage3高10-15%。但预取需要额外显存缓存预取参数，显存紧张时可能得不偿失。

**追问 3**：如果我用8卡A100（80GB）训练70B模型，ZeRO Stage3和FSDP哪个更合适？为什么？

> 70B模型权重280GB，8卡每卡35GB，加上优化器状态（560GB，每卡70GB）和梯度（280GB，每卡35GB），总显存需求远超80GB，必须用Stage3或FSDP。我推荐FSDP，原因有二：① FSDP的`offload_params`可以按模块粒度卸载，比如只卸载attention层参数到CPU，保留MLP层在GPU，这样前向计算时attention层参数从CPU加载（PCIe延迟约10μs），MLP层直接从GPU读取（延迟约0.1μs），整体吞吐量比ZeRO Stage3的全局offload高约20%；② FSDP的混合精度支持更透明，70B模型训练时bf16的梯度缩放容易溢出，FSDP自动处理loss scaling，而ZeRO Stage3需要手动调`initial_scale_power`，调不好会导致训练不稳定。但前提是网络必须是NVLink（600GB/s），如果是以太网，两者都慢，建议用ZeRO Stage2+梯度累积。

#### 5️⃣ 避坑 · 常见错误答法

- ❌ 说“ZeRO Stage3就是FSDP，两者完全一样” → ✅ 正确切入：两者分片策略等价，但FSDP分片粒度更细、支持预取通信、offload更灵活，且与PyTorch生态耦合更紧；ZeRO Stage3在Hugging Face Trainer中集成更成熟，配置更简单。
- ❌ 说“Stage1没用，直接上Stage3就行” → ✅ 正确切入：Stage1在显存刚好卡在优化器状态瓶颈时有用（如单卡24GB跑7B模型，Stage1后每卡35GB仍超24GB，所以Stage1确实不够用，但Stage2可以），选型必须基于具体显存和模型大小计算，不能一刀切。
- ❌ 说“FSDP比ZeRO Stage3快，所以永远选FSDP” → ✅ 正确切入：FSDP的预取优势只在NVLink高带宽环境下成立；在低带宽网络（如10Gbps以太网）下，FSDP的细粒度分片反而增加通信次数，导致延迟更高，此时ZeRO Stage3的粗粒度分片更优。

#### 6️⃣ 简历呼应

- **如果你有大规模训练项目**：从实际调优经验切入，比如“我在训练LLaMA-13B时，8卡A100用ZeRO Stage2吞吐量比Stage3高15%，因为网络是100Gbps以太网而非NVLink”，然后对比FSDP的预取优势，展示你踩过坑。
- **如果你只做过单卡微调**：用类比迁移，比如“单卡微调时显存瓶颈在优化器状态，类似ZeRO Stage1；多卡时梯度同步类似Stage2；全参数训练类似Stage3”，然后强调你理解通信-计算重叠原理，并计划用FSDP做benchmark。
- **如果你是校招无项目**：聚焦论文复现，比如“我复现了ZeRO论文中的显存计算公式，并写了一个脚本自动推荐Stage，输入GPU数、显存、模型参数量，输出最优配置”，展示你对原理的掌握和工程化能力。

#### 7️⃣ 延伸阅读

- ZeRO: Memory Optimizations Toward Training Trillion Parameter Models (Rajbhandari et al., 2020)
- PyTorch FSDP: Fully Sharded Data Parallel: torch.distributed.fsdp 官方文档
- DeepSpeed ZeRO Stage 3 源码分析：deepspeed/runtime/engine.py 中的 _configure_optimizer 和 _allgather_params
- Scaling Laws vs. Practical Bottlenecks: 通信-计算重叠的 profiling 方法（NVIDIA GTC 2023 演讲）
- 分布式训练显存计算器：Hugging Face 的 `calculate_memory_usage` 脚本

---
