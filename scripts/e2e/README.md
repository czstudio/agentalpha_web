# 求职工具 e2e

- e2e_personas.py:6 类用户画像剧本(零基础学生/转行后端/demo应届/算法背景/投递期/offer选择)+4 项边界,打真实页面。用法:
  - 线上:`python scripts/e2e/e2e_personas.py`
  - 本地:`E2E_BASE=http://127.0.0.1:3199 python scripts/e2e/e2e_personas.py`(需 playwright)
  - 注意:SSR 页面 hydration 前后 fill 有竞态,脚本内置 fill_react 自愈;个别断言受 inner_text 零宽字符影响,失败先看 e2e_report.json 的 captures 再定位
- lint_layout.py:全部页面横向溢出/console 错误/裸 markdown 审计(桌面+移动),新页面上线前跑一遍
