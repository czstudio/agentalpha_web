/**
 * 全站统计口径（唯一来源）。
 *
 * 数字已与 /community hero、/learn（训练营页，训练营内容的事实源）核对一致：
 * - InkOS：GitHub 7.8k Star、1,500+ forks、150+ 部作品签约番茄/七猫
 * - Idea2Paper：GitHub 1.4k Star、Hugging Face Daily Paper 日榜第一
 * - 潜艇 AI：3 人团队 20 天上线，30 天用户破万
 *
 * 其它页面引用这里的常量，不要再写第二份字面量，避免口径漂移
 * （历史上同一指标出现过 7,800+ / 7.8k、1.4k / 1400+ 两种写法）。
 * 新增数字前先找到可核验的出处，否则不要加。
 */

/** InkOS GitHub Star 数 */
export const INKOS_STAR = "7.8k"
/** InkOS GitHub fork 数 */
export const INKOS_FORK = "1,500+"
/** InkOS 签约作品数（番茄、七猫） */
export const INKOS_SIGNED = "150+"
/** Idea2Paper GitHub Star 数 */
export const IDEA_STAR = "1.4k"
/** Idea2Paper Hugging Face 成绩 */
export const IDEA_HF = "HF 论文日榜第一"
/** 潜艇 AI 增长口径 */
export const SUBMARINE_USERS = "30 天用户破万"
