# -*- coding: utf-8 -*-
"""多画像 e2e 剧本测试:6 类用户 + 边界,打线上真实页面。
硬断言(PASS/FAIL)+ 全量输出抓取(_shots/e2e_report.json 供人工审读)。
每个画像独立 browser context(localStorage 隔离,不污染真实用户数据)。
"""
import json
import os
import re
from playwright.sync_api import sync_playwright, expect

BASE = os.environ.get("E2E_BASE", "https://agentalpha.top")
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "e2e_report.json")

RESUME_WANG = """王小明 男 21岁 武汉某双非本科 计算机 2027届
课程作业:
- 用 Python 写过爬虫和数据分析脚本
- 学过机器学习课程,会用 sklearn
- 跟着教程做过一个聊天机器人 demo
技能:Python, 了解机器学习
求职目标:AI Agent 方向实习"""

RESUME_LI = """李工 男 27岁 本科 5年经验
XX科技 Java后端开发工程师 2021-2026:
- 负责订单系统微服务开发,日均请求量 2000万 QPS 峰值 8000,使用 SpringCloud
- 用 Redis 做缓存优化,接口 P99 延迟从 300ms 降到 80ms
- 参与数据库分库分表改造,支撑订单量从 500万涨到 3000万
- 编写单元测试覆盖率从 40% 提升到 75%
技能:Java, Spring, MySQL, Redis, Kafka, Docker, K8s"""

RESUME_CHEN = """陈同学 2026届 硕士
项目:
- 用 LangChain 搭建了知识库问答系统,用了向量检索
- 做过一个能调用搜索工具的 Agent demo
- 复刻过一个开源 RAG 项目
实习:某创业公司 AI 应用实习 3 个月,负责 prompt 调优
技能:Python, LangChain, RAG, Prompt"""

JD_AGENT = """岗位职责:
1. 负责智能体平台核心功能研发,包括工具调用、记忆系统、多Agent编排
2. 优化大模型应用线上效果与稳定性,控制推理成本
任职要求:
1. 熟悉 LLM API 与流式输出,有 Function Calling / MCP 实践经验
2. 熟悉 RAG 全链路,有向量检索、混合检索、重排落地经验
3. 扎实的后端功底,熟悉高并发服务开发,有 Python 或 Go 经验
4. 有评测集建设或线上监控经验加分"""

JD_ALGO = """岗位职责:
1. 负责大模型后训练算法研发,包括 SFT、RLHF、DPO 策略优化
2. 构建高质量指令数据与偏好数据,设计数据配比与清洗流程
3. 跟踪 GRPO 等 RL 算法进展并落地
任职要求:
1. 熟悉 Transformer 结构与训练细节,有 LoRA 微调实战经验
2. 熟悉强化学习,理解 PPO/DPO 原理与 reward model 训练
3. 有论文复现能力,熟悉 PyTorch 与分布式训练
4. 有 benchmark 评测经验加分"""

report = {"steps": [], "captures": {}}


def step(name, ok, note=""):
    report["steps"].append({"step": name, "ok": bool(ok), "note": str(note)[:200]})
    print(("PASS " if ok else "FAIL ") + name + ((" | " + str(note)[:100]) if note else ""))


def grab(page, key, selector):
    try:
        txt = page.locator(selector).first.inner_text(timeout=3000)
        report["captures"][key] = txt[:1200]
        return txt
    except Exception as e:
        report["captures"][key] = f"<grab-fail {selector}: {str(e)[:60]}>"
        return ""


def goto(page, url):
    for _ in range(3):
        try:
            page.goto(url, wait_until="domcontentloaded", timeout=40000)
            page.wait_for_timeout(1200)
            return True
        except Exception:
            page.wait_for_timeout(3000)
    return False


def fill_react(page, selector, text, nth=0, until=None):
    """SSR 页面 hydration 完成前 fill 会被 React 覆盖:填完校验,空了重填;
    连续失败则整页 reload 一轮再试(hydration 竞态自愈)。"""
    for round_i in range(3):
        if round_i > 0:
            try:
                page.goto(page.url, wait_until="domcontentloaded", timeout=30000)
                page.wait_for_timeout(1500)
            except Exception:
                page.wait_for_timeout(2000)
        loc = page.locator(selector).nth(nth)
        for _ in range(4):
            try:
                loc.fill(text)
                page.wait_for_timeout(350)
                if (loc.input_value() or "").strip() == text.strip():
                    if until is None:
                        return True
                    page.wait_for_timeout(500)
                    if until():
                        return True
                    # DOM 值已对但 React state 未更新(hydration 前填的),再等一轮
            except Exception:
                pass
            page.wait_for_timeout(600)
    return False


def set_range_react(page, label_regex, value, nth=0):
    """React 受控 range input:原生 setter + input 事件。"""
    loc = page.get_by_label(label_regex).nth(nth)
    loc.evaluate(
        """(el, val) => {
            const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
            setter.call(el, String(val))
            el.dispatchEvent(new Event('input', { bubbles: true }))
        }""",
        value,
    )


def run():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        browser.new_context().close()  # warmup
        page_timeout_backup = 30000

        # ── 画像A:零基础学生小王 ──────────────────────
        ctx = browser.new_context()
        page = ctx.new_page()
        try:
            if not goto(page, f"{BASE}/tools/resume"):
                step("A1 goto resume", False, "network")
            else:
                fill_react(page, "textarea.rt-textarea", RESUME_WANG)
                btn = page.locator("button.rt-run")
                step("A1 简历体检可提交", btn.is_enabled())
                btn.click()
                page.wait_for_timeout(800)
                total = page.locator(".rt-total-num").first.inner_text(timeout=5000)
                struct = page.locator(".rt-structure").inner_text(timeout=5000) if page.locator(".rt-structure").count() else ""
                report["captures"]["A1_resume_wang_structure"] = struct
                step("A1 出综合分", bool(re.fullmatch(r"\d+", total)), f"score={total}")
                soft = any(k in struct for k in ["条目太少", "缺", "复刻"])
                step("A1 结构问题有内容", soft, struct[:80])

            if goto(page, f"{BASE}/tools/gap-test"):
                rows = page.locator(".gap-self-row")
                step("A2 八个自评域", rows.count() == 8, f"rows={rows.count()}")
                for i in range(rows.count()):
                    rows.nth(i).locator("button.gap-lv").first.click()
                page.wait_for_timeout(300)
                btn = page.get_by_role("button", name="直接出报告")
                step("A2 零基础出现直接出报告", btn.count() == 1)
                btn.click()
                page.wait_for_timeout(600)
                confirm = page.get_by_role("button", name="出报告")
                step("A2 跳题页出现出报告", confirm.count() == 1)
                confirm.click()
                page.wait_for_timeout(700)
                full = page.locator("main").inner_text()
                report["captures"]["A2_gap_wang"] = full[:900]
                step("A2 结论指向补地基", "补地基" in full or "地基" in full)
        except Exception as e:
            step('BLOCK-EX', False, str(e)[:120])
        ctx.close()

        # ── 画像B:转行后端老李 ──────────────────────
        ctx = browser.new_context()
        page = ctx.new_page()
        try:
            if goto(page, f"{BASE}/tools/resume"):
                fill_react(page, "textarea.rt-textarea", RESUME_LI)
                page.locator("button.rt-run").click()
                page.wait_for_timeout(800)
                radar = grab(page, "B1_resume_li_radar", ".rt-radar")
                deploy_ok = "推理与部署" in radar and "缺失" not in radar.split("推理与部署")[1][:60]
                step("B1 后端简历部署域有证据", deploy_ok)
            if goto(page, f"{BASE}/tools/jd-analyzer"):
                fill_react(page, "textarea.tk-textarea", JD_AGENT)
                btn = page.locator("button.tk-run")
                step("B2 JD拆解可提交", btn.is_enabled())
                btn.click()
                page.wait_for_timeout(900)
                first_family = page.locator(".tk-score-item .tk-score-label").first.inner_text(timeout=5000)
                step("B2 画像识别=Agent应用开发", "Agent 应用开发" in first_family, first_family)
                jda_status = grab(page, "B2_ai_card", ".jda-block")
                step("B2 AI卡未配置降级文案", "暂未开放" in jda_status or "AI 深度拆解" in jda_status)
        except Exception as e:
            step('BLOCK-EX', False, str(e)[:120])
        ctx.close()

        # ── 画像C:demo应届生小陈 ──────────────────────
        ctx = browser.new_context()
        page = ctx.new_page()
        try:
            if goto(page, f"{BASE}/tools/gap-test"):
                rows = page.locator(".gap-self-row")
                # 前3域选第3档(做过demo),其余第1档
                for i in range(rows.count()):
                    lv = 3 if i < 3 else 1
                    rows.nth(i).locator("button.gap-lv").nth(lv - 1).click()
                page.wait_for_timeout(300)
                page.get_by_role("button", name="生成验证题").click()
                page.wait_for_timeout(600)
                quiz_items = page.locator(".gap-quiz-item")
                step("C1 验证题出现", quiz_items.count() > 0, f"items={quiz_items.count()}")
                # 对前3个域都点「答不上」(每域两题共享)
                fails = page.get_by_role("button", name="答不上")
                step("C1 答不上按钮可用", fails.count() > 0)
                for i in range(3):
                    fails.nth(i).click()
                page.get_by_role("button", name="出报告").click()
                page.wait_for_timeout(700)
                body = page.locator("main").inner_text()
                step("C1 抽验回落生效", "抽验回落" in body)
                grab(page, "C1_gap_chen", ".tk-main")
            if goto(page, f"{BASE}/tools/mock-interview"):
                page.get_by_role("button", name=re.compile("简历深挖面")).click()
                fill_react(page, "textarea.tk-textarea", RESUME_CHEN)
                page.get_by_role("button", name="温和引导型").click()
                page.locator("button.tk-run").click()
                page.wait_for_timeout(900)
                q = page.locator(".mock-question .q")
                step("C2 深挖面试出题", q.count() == 1, q.first.inner_text()[:60] if q.count() else "no question")
                src = page.locator(".mock-question .src").first.inner_text()
                step("C2 题目来源=简历", "简历" in src, src)
                # 跑3题
                for i in range(3):
                    fill_react(page, "textarea.tk-textarea", f"我认为这个问题要分几步看:先说结论,再讲我在项目里怎么做的,最后给数字。第{i+1}题作答示例,包含检索不准时的排查过程。")
                    page.get_by_role("button", name="说完了").click()
                    page.wait_for_timeout(300)
                    page.get_by_role("button", name="答上了").first.click()
                    page.wait_for_timeout(200)
                    if i < 2:
                        page.get_by_role("button", name="下一题").click()
                        page.wait_for_timeout(400)
                page.locator(".mock-end-btn").click()
                page.wait_for_timeout(700)
                advice = grab(page, "C2_mock_report", ".mock-advice")
                step("C2 复盘报告出现", len(advice) > 30, advice[:40])
                step("C2 transcript按钮存在", page.get_by_role("button", name=re.compile("复制 transcript|已复制")).count() == 1)
        except Exception as e:
            step('BLOCK-EX', False, str(e)[:120])
        ctx.close()

        # ── 画像D:算法背景阿强 ──────────────────────
        ctx = browser.new_context()
        page = ctx.new_page()
        try:
            if goto(page, f"{BASE}/tools/jd-analyzer"):
                fill_react(page, "textarea.tk-textarea", JD_ALGO)
                page.locator("button.tk-run").click()
                page.wait_for_timeout(900)
                fam = page.locator(".tk-score-item .tk-score-label").first.inner_text(timeout=5000)
                step("D1 算法JD识别=大模型算法", "大模型算法" in fam, fam)
                qa = page.locator(".tk-list a")
                step("D1 匹配题出现", qa.count() >= 5, f"picks={qa.count()}")
                grab(page, "D1_jd_algo_qa", ".tk-list")
        except Exception as e:
            step('BLOCK-EX', False, str(e)[:120])
        ctx.close()

        # ── 画像E:投递期小张 ──────────────────────
        ctx = browser.new_context()
        page = ctx.new_page()
        try:
            if goto(page, f"{BASE}/tools/application-tracker"):
                fill_react(page, "[placeholder='公司（如 字节跳动）'], [placeholder='公司(如 字节跳动)']", "字节跳动")
                page.get_by_role("button", name="记一笔").click()
                page.wait_for_timeout(400)
                fill_react(page, ".trk-form .trk-input", "阿里巴巴", nth=0)
                fill_react(page, ".trk-form .trk-input", "大模型应用", nth=1)
                page.get_by_role("button", name="记一笔").click()
                page.wait_for_timeout(500)
                step("E1 看板出现2条投递", page.locator(".trk-card").count() == 2, f"cards={page.locator('.trk-card').count()}")
                page.locator(".trk-card .trk-status-select").first.select_option("i1")
                page.wait_for_timeout(500)
                stats = grab(page, "E1_tracker_stats", ".trk-stats")
                step("E1 漏斗统计更新", "进入面试" in stats)
            if goto(page, f"{BASE}/tools/interview-log"):
                page.get_by_role("button", name="记一笔").first.click()
                fill_react(page, ".log-form .trk-input", "字节跳动", nth=0)
                fill_react(page, ".log-form .trk-input", "Agent 开发", nth=1)
                page.locator(".log-form textarea").nth(0).fill("RAG 检索不准怎么排查;多 Agent 怎么划分任务")
                page.locator(".log-form textarea").nth(1).fill("检索不准那题只答了改 prompt,没说召回率定位")
                page.get_by_role("button", name="保存").click()
                page.wait_for_timeout(500)
                step("E2 复盘时间线出现", page.locator(".log-entry").count() == 1)
                grab(page, "E2_log", ".log-entry")
        except Exception as e:
            step('BLOCK-EX', False, str(e)[:120])
        ctx.close()

        # ── 画像F:offer 选择小赵 ──────────────────────
        ctx = browser.new_context()
        page = ctx.new_page()
        try:
            if goto(page, f"{BASE}/tools/offer-compare"):
                # Offer A 薪资 9 其他 5;Offer B 全 5 → A 应排第一
                set_range_react(page, re.compile("薪资总包"), 9, nth=0)
                page.wait_for_timeout(400)
                rows = page.locator(".offer-result-row")
                step("F1 对比结果出现", rows.count() >= 2)
                top = rows.first.inner_text()
                step("F1 高薪 offer 排第一", "A" in top.split()[1] if len(top.split()) > 1 else False, top[:40])
                grab(page, "F1_offer", ".tk-block >> nth=-1")
        except Exception as e:
            step('BLOCK-EX', False, str(e)[:120])
        ctx.close()

        # ── G:边界 ──────────────────────
        ctx = browser.new_context()
        page = ctx.new_page()
        try:
            if goto(page, f"{BASE}/tools/resume"):
                fill_react(page, "textarea.rt-textarea", "太短的简历只有三十个字")
                step("G1 短简历按钮禁用", not page.locator("button.rt-run").is_enabled())
            if goto(page, f"{BASE}/tools/jd-analyzer"):
                fill_react(page, "textarea.tk-textarea", "太短的 JD")
                step("G2 短 JD 按钮禁用", not page.locator("button.tk-run").is_enabled())
            if goto(page, f"{BASE}/tools/mock-interview"):
                page.get_by_role("button", name=re.compile("简历深挖面")).click()
                fill_react(page, "textarea.tk-textarea", "只有三十个字的简历")
                step("G3 短简历面试禁用", not page.locator("button.tk-run").is_enabled())
            if goto(page, f"{BASE}/tools/gap-test"):
                rows = page.locator(".gap-self-row")
                rows.nth(0).locator("button.gap-lv").first.click()
                rows.nth(1).locator("button.gap-lv").first.click()
                page.wait_for_timeout(300)
                has_next = page.get_by_role("button", name=re.compile("生成验证题|直接出报告")).count()
                step("G4 自评未完成不出现下一步", has_next == 0)
        except Exception as e:
            step('BLOCK-EX', False, str(e)[:120])
        ctx.close()

        browser.close()

    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(report, f, ensure_ascii=False, indent=1)
    total = len(report["steps"])
    passed = sum(1 for s in report["steps"] if s["ok"])
    print(f"\n{passed}/{total} steps passed; captures saved to {OUT}")


if __name__ == "__main__":
    run()
