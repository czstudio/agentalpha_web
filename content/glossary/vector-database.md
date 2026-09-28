---
slug: vector-database
term: 向量数据库
en: Vector Database
oneLine: 向量数据库是专门存储高维向量并支持近似最近邻检索的系统，利用 HNSW 与 IVF 等索引将大规模向量的检索降至毫秒级。FAISS、PGVector 和 Milvus 是常见选型。
aliases: [向量数据库, Vector Database, Milvus, FAISS, PGVector]
group: rag
tags: [向量数据库, 检索]
relatedQa: [vector-db-selection, what-is-embedding]
relatedTerms: [embedding, rag, hybrid-search]
updated: 2026-09-28
---

## 是什么

向量数据库的核心能力在于提供近似最近邻（ANN）索引。它通过 HNSW 图索引、IVF 倒排文件以及乘积量化压缩等技术，牺牲少量召回率换取检索速度。在工程实现上，系统需处理标量过滤的顺序问题，即先过滤再检索还是后过滤，并兼顾增量更新与内存磁盘的存储权衡。

在选型谱系上，FAISS 是算法库而非数据库服务，适合单机实验。PGVector 将向量能力加入 Postgres，在数据量中小且需事务与过滤时合适。Milvus 等专用库则支持分布式架构、标量过滤及多租户。

## 解决什么问题

向量数据库主要解决暴力检索的计算开销问题。如果不使用索引，向量检索的复杂度会随着数据库规模呈线性增长。

生产环境的 RAG 系统需要毫秒级召回加元数据过滤，向量数据库满足了这一要求，同时提供了数据持久化与水平扩展的机制。

## 面试怎么考

面试常考向量数据库怎么选。答题需明确 FAISS 适合单机实验，PGVector 适合中小规模及需要事务的场景，Milvus 适用于分布式生产环境。

考官常问 ANN 为什么是近似检索，需指出其牺牲部分召回率换取速度的机制。带权限或时间过滤的检索怎么做也是重点，答题时需说明先过滤再检索与后过滤的机制差异及其影响。
