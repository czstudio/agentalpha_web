#!/usr/bin/env python3
"""Bind human-reviewed student copy to verified Feishu revisions.

This command never writes summaries, direct answers, or quality scores. Those
fields must come from an actual editorial pass after the gold sample is approved.
"""
from __future__ import annotations

import json
import re
import xml.etree.ElementTree as ET
from datetime import datetime, timezone

from learn_content import CONTENT_DIR, EDITORIAL_DIR, MANIFEST_PATH, REPORT_DIR, ROOT, write_json_atomic, xml_stats


BANNED_STUDENT_COPY = re.compile(
    r"事实边界|失败树|观察口径|自测标准|可回读验证|关键不是依赖模型的口头解释|工程、调试与评测"
)


def parse(value: str) -> ET.Element:
    return ET.fromstring("<root>" + value + "</root>")


def main() -> int:
    rejection_path = REPORT_DIR / "editorial-rejection.json"
    if rejection_path.exists():
        rejection = json.loads(rejection_path.read_text(encoding="utf-8"))
        if rejection.get("state") == "active":
            raise RuntimeError(
                "editorial batch is rejected; approve the student gold sample before finalizing metadata"
            )

    gold_lock_path = REPORT_DIR / "gold-sample-approval.json"
    if not gold_lock_path.exists():
        raise RuntimeError("missing explicit gold-sample-approval.json")
    gold_lock = json.loads(gold_lock_path.read_text(encoding="utf-8"))
    if gold_lock.get("state") != "approved" or not gold_lock.get("approvedByUser"):
        raise RuntimeError("gold sample has not been explicitly approved by the user")

    manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    fetched_dir = ROOT / ".local" / "learn-fetched" / "claude-code"
    report: list[dict] = []
    for entry in manifest["chapters"]:
        if entry.get("status") != "verified" or not entry.get("contentHash"):
            raise RuntimeError(f"live chapter is not verified: {entry['slug']}")
        fetched = fetched_dir / f"{entry['slug']}-r{entry['sourceRevision']}-{entry['contentHash'][:12]}.xml"
        if not fetched.exists():
            raise RuntimeError(f"missing verified refetch: {fetched}")
        draft = CONTENT_DIR / "drafts" / f"{entry['slug']}.xml"
        live_xml = fetched.read_text(encoding="utf-8")
        draft_xml = draft.read_text(encoding="utf-8")
        if BANNED_STUDENT_COPY.search(live_xml):
            raise RuntimeError(f"backstage language remains in student copy: {entry['slug']}")

        live_images = list(parse(live_xml).iter("img"))
        draft_images = list(parse(draft_xml).iter("img"))
        if len(live_images) != len(draft_images):
            raise RuntimeError(f"image pairing failed: {entry['slug']}")

        editorial_path = EDITORIAL_DIR / f"{entry['slug']}.json"
        editorial = json.loads(editorial_path.read_text(encoding="utf-8"))
        review = editorial.get("humanReview") or {}
        if editorial.get("status") != "student-reviewed" or not review.get("approved"):
            raise RuntimeError(f"student review missing: {entry['slug']}")
        if not editorial.get("summary") or not editorial.get("directAnswer"):
            raise RuntimeError(f"human-written summary/directAnswer missing: {entry['slug']}")
        if editorial.get("qualityNote", "").startswith("已通过一手来源"):
            raise RuntimeError(f"legacy automatic quality note remains: {entry['slug']}")

        stats = xml_stats(live_xml)
        report.append({
            "slug": entry["slug"],
            "revision": entry["sourceRevision"],
            "contentHash": entry["contentHash"],
            "characters": stats["characters"],
            "images": stats["images"],
            "reviewedBy": review.get("reviewedBy"),
            "reviewedAt": review.get("reviewedAt"),
        })

    readiness = {
        "schemaVersion": 2,
        "state": "human-reviewed",
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "chapters": report,
    }
    write_json_atomic(REPORT_DIR / "editorial-readiness.json", readiness)
    write_json_atomic(REPORT_DIR / "human-approval-packet.json", {
        "schemaVersion": 2,
        "state": "awaiting-revision-approval",
        "generatedAt": readiness["generatedAt"],
        "instruction": "逐章确认指定 revision 后，才可生成网站快照。",
        "chapters": report,
        "approvalLockCreated": False,
        "websiteSnapshotExported": False,
        "vercelPreviewCreated": False,
    })
    print(json.dumps({"ok": True, "chapters": len(report)}, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
