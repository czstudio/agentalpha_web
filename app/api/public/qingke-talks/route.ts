import { NextResponse } from 'next/server'

// 青稞Talk API - 从青稞社区获取最新文章
export async function GET() {
  try {
    const response = await fetch(
      'https://qingkeai.online/apis/api.content.halo.run/v1alpha1/posts?page=1&size=3&categoryName=talk',
      {
        headers: {
          'Accept': 'application/json',
        },
        next: { revalidate: 3600 } // 缓存1小时
      }
    )

    if (!response.ok) {
      throw new Error('Failed to fetch from qingkeai.online')
    }

    const data = await response.json()

    // 转换数据格式
    const talks = data.items?.map((item: any) => ({
      id: item.metadata?.name || '',
      title: item.spec?.title || '',
      cover: item.spec?.cover?.startsWith('http')
        ? item.spec.cover
        : `https://qingkeai.online${item.spec?.cover || ''}`,
      excerpt: item.status?.excerpt || '',
      link: `https://qingkeai.online${item.status?.permalink || ''}`,
      tags: item.tags?.map((t: any) => t.spec?.displayName).filter(Boolean) || [],
      author: item.owner?.displayName || '青稞社区',
      publishTime: item.spec?.publishTime || '',
    })) || []

    return NextResponse.json({
      success: true,
      data: talks
    })
  } catch (error) {
    console.error('Error fetching qingke talks:', error)

    // 返回静态备用数据
    return NextResponse.json({
      success: true,
      data: [
        {
          id: '1',
          title: '大模型强化学习算法PPO、GRPO、DAPO、GSPO、SAPO的演进与对比',
          cover: 'https://pic2.zhimg.com/v2-5c8f403cb75921278da158d4f970db9d_1440w.jpg',
          excerpt: '本文面向已了解强化学习中策略梯度、优势函数、重要性采样等概念的读者，重点对大模型强化学习算法进行对比分析。',
          link: 'https://qingkeai.online/archives/PPO-GRPO-DAPO-GSPO-SAPO',
          tags: ['RL', '强化学习'],
          author: '青稞社区',
          publishTime: '2025-12-22'
        },
        {
          id: '2',
          title: '小米大模型 Plus 团队提出BTL-UI：基于直觉-思考-关联的GUI Agent推理',
          cover: 'https://qingkeai.online/upload/640%20(2).png',
          excerpt: '本文作者来自小米大模型 Plus 团队，提出了一种新的GUI Agent推理框架BTL-UI。',
          link: 'https://qingkeai.online/archives/BTL-UI',
          tags: ['AI Agent', 'GUI'],
          author: '青稞社区',
          publishTime: '2025-12-22'
        },
        {
          id: '3',
          title: '在看完近50篇VLA+RL工作之后......',
          cover: 'https://qingkeai.online/upload/unnamed%20(1)-KKeY.png',
          excerpt: '视觉-语言-动作 + 强化学习：VLA+RL 最新研究全景，含论文、链接与代码。',
          link: 'https://qingkeai.online/archives/VLA-RL',
          tags: ['VLA', 'RL'],
          author: '青稞社区',
          publishTime: '2025-12-22'
        }
      ]
    })
  }
}
