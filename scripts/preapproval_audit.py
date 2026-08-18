#!/usr/bin/env python3
"""Fail-closed pre-approval checks for the Claude Code gold sample.

This is deliberately a read-only gate.  It does not create an approval lock,
change publication state, or call Feishu.  A successful result means only
that the sample is ready for a human student read-through.
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
CONTENT_DIR = ROOT / "content" / "learn" / "claude-code"
GOLD_SAMPLE_PATH = CONTENT_DIR / "editorial" / "gold-sample-01.md"
CANDIDATE_PATH = CONTENT_DIR / "reports" / "gold-sample-candidate.json"

# These are editorial/backstage terms, not explanations a student should see.
BANNED_STUDENT_COPY = re.compile(
    r"事实边界|失败树|观察口径|自测标准|可回读验证|关键不是依赖模型的口头解释|"
    r"工程、调试与评测|学生金样|自动检查不能替代人工|编辑验收|发布验收"
)
IMAGE_RE = re.compile(r"!\[[^\]]*\]\(([^)]+)\)")
CAPTION_RE = re.compile(r"^\*图\s*\d+：.+\*$", re.MULTILINE)


class AuditError(RuntimeError):
    """A failed pre-approval gate."""


def _read_json(path: Path) -> dict[str, Any]:
    if not path.is_file():
        raise AuditError(f"missing required artifact: {path}")
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise AuditError(f"invalid JSON artifact: {path}: {exc}") from exc
    if not isinstance(value, dict):
        raise AuditError(f"JSON artifact must be an object: {path}")
    return value


def audit_gold_sample(gold_sample: Path = GOLD_SAMPLE_PATH) -> dict[str, Any]:
    """Return an auditable report, raising :class:`AuditError` on any failure."""
    if not gold_sample.is_file():
        raise AuditError(f"missing gold sample: {gold_sample}")
    text = gold_sample.read_text(encoding="utf-8")
    if not text.strip():
        raise AuditError("gold sample is empty")

    content_dir = gold_sample.parent.parent
    candidate = _read_json(content_dir / "reports" / "gold-sample-candidate.json")
    rejection = _read_json(content_dir / "reports" / "editorial-rejection.json")
    manifest = _read_json(content_dir / "manifest.json")
    lock = _read_json(content_dir / "approval-lock.json")
    failures: list[str] = []
    if rejection.get("state") != "active":
        failures.append("editorial-rejection.state must remain active")
    if manifest.get("publicationState") != "draft" or manifest.get("navigationEnabled") is not False:
        failures.append("manifest must remain draft with navigation disabled")
    if lock.get("chapters") != []:
        failures.append("approval-lock chapters must remain empty before approval")
    if candidate.get("state") != "awaiting-student-approval":
        failures.append("candidate state must be awaiting-student-approval")
    chapter = candidate.get("chapter")
    if not isinstance(chapter, dict) or chapter.get("slug") != "01-foundations":
        failures.append("candidate must identify chapter 01-foundations")
    first = next((item for item in manifest.get("chapters", []) if item.get("slug") == "01-foundations"), None)
    if not isinstance(first, dict):
        failures.append("manifest is missing chapter 01-foundations")
    else:
        for key in ("sourceRevision", "contentHash", "status"):
            if not isinstance(chapter, dict) or key not in chapter:
                failures.append(f"candidate chapter is missing {key}")
            elif first.get(key) != chapter.get(key):
                failures.append(f"manifest chapter {key} does not match candidate")
    approval = candidate.get("approval")
    if not isinstance(approval, dict) or approval.get("approved") is not False:
        failures.append("candidate approval must remain false before human approval")
    release = candidate.get("releaseGate")
    if not isinstance(release, dict) or any(release.get(k) is not False for k in (
        "websiteExportAllowed", "publicNavigationAllowed", "vercelDeployAllowed"
    )):
        failures.append("all publication gates must remain false")

    if BANNED_STUDENT_COPY.search(text):
        failures.append("backstage/editorial language remains in student copy")
    h1 = re.findall(r"^#\s+(.+?)\s*$", text, re.MULTILINE)
    h2 = re.findall(r"^##\s+(.+?)\s*$", text, re.MULTILINE)
    h3 = re.findall(r"^###\s+(.+?)\s*$", text, re.MULTILINE)
    if len(h1) != 1:
        failures.append(f"gold sample must contain exactly one H1 (got {len(h1)})")
    elif isinstance(chapter, dict) and h1[0] != chapter.get("title"):
        failures.append("H1 does not match candidate chapter title")
    live = candidate.get("liveReadback")
    if not isinstance(live, dict):
        failures.append("candidate liveReadback is missing")
        live = {}
    for key, actual in (("h1", len(h1)), ("h2", len(h2)), ("h3", len(h3)), ("images", len(images := IMAGE_RE.findall(text)))):
        if live.get(key) != actual:
            failures.append(f"liveReadback {key} mismatch: expected {live.get(key)!r}, got {actual}")
    captions = CAPTION_RE.findall(text)
    if live.get("allImageCaptionsPresent") is not True or len(captions) != len(images):
        failures.append("liveReadback allImageCaptionsPresent mismatch")
    if text.count("```") % 2:
        failures.append("unbalanced fenced code block")
    if len(text) < 1000 or len(text) > 30000:
        failures.append(f"sample character count is abnormal: {len(text)}")
    for image in images:
        if image.startswith(("http://", "https://")):
            failures.append("remote image URL is forbidden")
        elif image.startswith("/"):
            path = gold_sample.parents[3].parent / "public" / image.lstrip("/")
            if not path.is_file():
                failures.append(f"missing local image asset: {image}")
    if failures:
        raise AuditError("; ".join(failures))
    return {"ok": True, "preflight": True, "sample": str(gold_sample), "characters": len(text), "h1": len(h1),
            "h2": len(h2), "h3": len(h3), "images": len(images), "captions": len(captions),
            "state": candidate["state"], "publicationBlocked": True,
            "note": "preflight only; this does not establish student quality or approval"}


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--sample", type=Path, default=GOLD_SAMPLE_PATH)
    args = parser.parse_args(argv)
    try:
        print(json.dumps(audit_gold_sample(args.sample), ensure_ascii=False, indent=2))
        return 0
    except (AuditError, OSError) as exc:
        print(json.dumps({"ok": False, "error": str(exc)}, ensure_ascii=False, indent=2), file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
