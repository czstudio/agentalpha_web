// Data structure for easy updates as specified in requirements

export interface Mentor {
  id: string
  name: string
  title: string
  company: string
  expertise: string[]
  skills: {
    engineering: number
    theory: number
    nlp: number
    rl: number
    multimodal: number
  }
  avatar: string
}

export interface RoadmapNode {
  id: string
  title: string
  description: string
  link?: string
  level: number
}

export interface Project {
  id: string
  title: string
  description: string
  difficulty: number
  tags: string[]
  link?: string
}

export interface Paper {
  id: string
  title: string
  category: "Agent" | "RL" | "Multimodal" | "Diffusion" | "LLM"
  authors: string
  venue: string
  year: number
  link?: string
}

export interface NewsItem {
  id: string
  title: string
  date: string
  category: "技术分享" | "社区活动" | "成员动态" | "合作公告"
  link?: string
}

export interface Partner {
  id: string
  name: string
  logo: string
  type: "university" | "community"
  url?: string
}

export interface CommunityMember {
  id: string
  name: string
  role: string
  background: string
  avatar?: string
}

// 社交媒体平台数据结构
export interface SocialPlatform {
  id: string
  name: string
  icon: string
  qrCode: string
  description: string
}

// 合作单位 - 高校
export const universityPartners: Partner[] = [
  {
    id: "1",
    name: "清华大学",
    logo: "/logos/tsinghua.svg",
    type: "university",
    url: "https://www.tsinghua.edu.cn",
  },
  {
    id: "2",
    name: "北京大学",
    logo: "/logos/pku.svg",
    type: "university",
    url: "https://www.pku.edu.cn",
  },
  {
    id: "3",
    name: "上海交通大学",
    logo: "/logos/sjtu.svg",
    type: "university",
    url: "https://www.sjtu.edu.cn",
  },
  {
    id: "4",
    name: "复旦大学",
    logo: "/logos/fudan.svg",
    type: "university",
    url: "https://www.fudan.edu.cn",
  },
  {
    id: "5",
    name: "上海财经大学",
    logo: "/logos/sufe.svg",
    type: "university",
    url: "https://www.sufe.edu.cn",
  },
  {
    id: "6",
    name: "南方科技大学",
    logo: "/logos/sustech.svg",
    type: "university",
    url: "https://www.sustech.edu.cn",
  },
]

// 兄弟社区
export const communitiesPartners: Partner[] = [
  {
    id: "1",
    name: "QuantaAlpha",
    logo: "/logos/quantaalpha.svg",
    type: "community",
    url: "https://quantaalpha.com/",
  },
  {
    id: "2",
    name: "青稞社区",
    logo: "/logos/qingke.svg",
    type: "community",
    url: "https://qingkeai.online/",
  },
  {
    id: "3",
    name: "OfferShow",
    logo: "/logos/offershow.svg",
    type: "community",
    url: "https://www.offershow.cn/",
  },
]

// 社区成员示例 - 可在后台更新
export const communityMembers: CommunityMember[] = [
  {
    id: "1",
    name: "张三",
    role: "社区创始人",
    background: "前字节跳动 AI Lab 研究员，专注于 Agent 和强化学习研究",
    avatar: "/avatars/member1.jpg",
  },
  {
    id: "2",
    name: "李四",
    role: "技术负责人",
    background: "清华大学博士，多篇顶会论文作者，擅长多模态和大模型",
    avatar: "/avatars/member2.jpg",
  },
  {
    id: "3",
    name: "王五",
    role: "运营负责人",
    background: "前腾讯产品经理，负责社区活动策划和成员服务",
    avatar: "/avatars/member3.jpg",
  },
  {
    id: "4",
    name: "赵六",
    role: "导师",
    background: "北京大学教授，CVPR/ICCV 审稿人，研究方向：计算机视觉",
    avatar: "/avatars/member4.jpg",
  },
]

// 社区动态 - 方便后台更新
export const communityNews: NewsItem[] = [
  {
    id: "1",
    title: "AgentAlpha 第 50 期技术分享：VisualQuality-R1 论文解读",
    date: "2025-01-15",
    category: "技术分享",
    link: "/news/visualquality-r1-talk",
  },
  {
    id: "2",
    title: "恭喜社区成员张三斩获字节跳动 AI Lab offer",
    date: "2025-01-12",
    category: "成员动态",
    link: "/news/bytedance-offer",
  },
  {
    id: "3",
    title: "本周六：多模态大模型实战 Workshop",
    date: "2025-01-18",
    category: "社区活动",
    link: "/events/multimodal-workshop",
  },
  {
    id: "4",
    title: "AgentAlpha 与清华大学达成战略合作",
    date: "2025-01-10",
    category: "合作公告",
    link: "/news/tsinghua-partnership",
  },
  {
    id: "5",
    title: "技术分享回顾：大模型 Agent 开发最佳实践",
    date: "2025-01-08",
    category: "技术分享",
    link: "/news/llm-agent-best-practices",
  },
  {
    id: "6",
    title: "2025 新春线下 Meetup 报名开启",
    date: "2025-01-05",
    category: "社区活动",
    link: "/events/new-year-meetup",
  },
]

// 社区统计数据 - 可在后台更新
export const communityStats = {
  members: 5000,
  techTalks: 300,
  projects: 150,
  placements: 200,
}

export const mentors: Mentor[] = [
  {
    id: "1",
    name: "张导师",
    title: "Ex-ByteDance · Agent专家",
    company: "前字节跳动",
    expertise: ["10+ Agent论文", "RL专家", "工程实践"],
    skills: {
      engineering: 95,
      theory: 85,
      nlp: 80,
      rl: 95,
      multimodal: 75,
    },
    avatar: "/professional-tech-mentor-avatar.jpg",
  },
  {
    id: "2",
    name: "李教授",
    title: "MIT PhD · 985教授",
    company: "MIT / 985高校",
    expertise: ["CVPR获奖者", "ECCV最佳论文", "多模态研究"],
    skills: {
      engineering: 75,
      theory: 98,
      nlp: 85,
      rl: 70,
      multimodal: 95,
    },
    avatar: "/academic-professor-avatar.jpg",
  },
]

export const roadmapNodes: RoadmapNode[] = [
  {
    id: "1",
    title: "Python基础",
    description: "掌握Python编程基础，为AI开发打下坚实基础",
    level: 1,
  },
  {
    id: "2",
    title: "大模型 (LLM)",
    description: "深入理解大语言模型原理与应用",
    level: 2,
  },
  {
    id: "3",
    title: "多模态 (Multimodal)",
    description: "探索视觉、语言等多模态AI技术",
    level: 3,
  },
  {
    id: "4",
    title: "Agent",
    description: "构建智能代理系统，实现自主决策",
    level: 4,
  },
  {
    id: "5",
    title: "具身智能 (VLA)",
    description: "机器人与物理世界交互的前沿技术",
    level: 5,
  },
]

export const projects: Project[] = [
  {
    id: "1",
    title: "LangChain Agent实战",
    description: "使用LangChain构建智能对话代理",
    difficulty: 3,
    tags: ["LangChain", "Agent", "Python"],
  },
  {
    id: "2",
    title: "多模态内容生成",
    description: "文本到图像的生成式AI项目",
    difficulty: 4,
    tags: ["Diffusion", "Multimodal", "PyTorch"],
  },
  {
    id: "3",
    title: "RL游戏AI",
    description: "强化学习在游戏中的应用",
    difficulty: 5,
    tags: ["RL", "PyTorch", "Gym"],
  },
]

export const papers: Paper[] = [
  {
    id: "1",
    title: "VisualQuality-R1: Advancing Visual Understanding",
    category: "Multimodal",
    authors: "Zhang et al.",
    venue: "NeurIPS 2025 Spotlight",
    year: 2025,
  },
  {
    id: "2",
    title: "AgentFormer: Unified Agent Architecture",
    category: "Agent",
    authors: "Li et al.",
    venue: "ICLR 2025",
    year: 2025,
  },
  {
    id: "3",
    title: "Efficient Reinforcement Learning for Robotics",
    category: "RL",
    authors: "Wang et al.",
    venue: "ICML 2024",
    year: 2024,
  },
]

export const news: NewsItem[] = [
  {
    id: "1",
    title: "近期Talk: VisualQuality-R1 (NeurIPS 2025 Spotlight)",
    date: "2025-01-15",
    category: "技术分享",
  },
  {
    id: "2",
    title: "社区月度项目展示会",
    date: "2025-01-20",
    category: "社区活动",
  },
  {
    id: "3",
    title: "大厂内推专场：字节、腾讯AI岗位",
    date: "2025-01-25",
    category: "成员动态",
  },
]

// 社交媒体平台 - 方便后台更新
export const socialPlatforms: SocialPlatform[] = [
  {
    id: "wechat",
    name: "微信",
    icon: "MessageCircle",
    qrCode: "/images/e5-be-ae-e4-bf-a1.jpg",
    description: "扫码添加微信，加入社群",
  },
  {
    id: "xiaohongshu",
    name: "小红书",
    icon: "BookOpen",
    qrCode: "/images/e5-b0-8f-e7-ba-a2-e4-b9-a6.jpg",
    description: "关注我们的小红书账号",
  },
  {
    id: "douyin",
    name: "抖音",
    icon: "Video",
    qrCode: "/images/e6-8a-96-e9-9f-b3.jpg",
    description: "关注我们的抖音账号",
  },
]
