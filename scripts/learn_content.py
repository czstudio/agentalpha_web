#!/usr/bin/env python3
"""Fail-closed Feishu inventory and release gates for the AgentAlpha portal."""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import shutil
import subprocess
import sys
import tempfile
import xml.etree.ElementTree as ET
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
CONTENT_DIR = ROOT / "content" / "learn" / "claude-code"
MANIFEST_PATH = CONTENT_DIR / "manifest.json"
LOCK_PATH = CONTENT_DIR / "approval-lock.json"
REPORT_DIR = CONTENT_DIR / "reports"
EDITORIAL_REJECTION_PATH = REPORT_DIR / "editorial-rejection.json"
EDITORIAL_DIR = CONTENT_DIR / "editorial"
BRIEF_CATALOG_PATH = EDITORIAL_DIR / "brief-catalog.json"
FACT_PACK_PATH = CONTENT_DIR / "research" / "fact-pack.json"
DRAFT_DIR = CONTENT_DIR / "drafts"
CHAPTER_DIR = CONTENT_DIR / "chapters"
ASSET_DIR = ROOT / "public" / "learn-assets" / "claude-code"
ALLOWED_SLUG = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
KNOWN_TAGS = {
    "root", "fragment", "title", "h1", "h2", "h3", "p", "text", "a", "code", "code-block", "pre",
    "img", "image", "callout", "grid", "column", "grid-column", "table", "thead", "tbody", "tr",
    "th", "td", "colgroup", "col", "ul", "ol", "li", "quote", "blockquote", "cite", "sub-page-list", "doc-card",
    "mention-doc", "sub-page", "divider", "hr", "br", "strong", "b", "em", "i", "u", "s", "span",
}


class GateError(RuntimeError):
    pass


def require_editorial_batch_unfrozen(action: str) -> None:
    """Prevent stale scripts or locks from bypassing a rejected student batch."""
    if not EDITORIAL_REJECTION_PATH.exists():
        return
    rejection = json.loads(EDITORIAL_REJECTION_PATH.read_text(encoding="utf-8"))
    if rejection.get("state") == "active":
        raise GateError(
            f"cannot {action}: editorial batch is frozen until the user explicitly approves the gold sample"
        )


def run_lark(*args: str) -> dict[str, Any]:
    completed = subprocess.run(
        ["lark-cli", *args, "--format", "json"],
        cwd=ROOT,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=False,
    )
    if completed.returncode != 0:
        raise GateError(f"lark-cli failed ({completed.returncode}): {completed.stderr.strip()}")
    try:
        payload = json.loads(completed.stdout)
    except json.JSONDecodeError as exc:
        raise GateError(f"lark-cli returned invalid JSON: {exc}") from exc
    if not payload.get("ok"):
        raise GateError(f"lark-cli returned ok=false: {payload}")
    return payload["data"]


def fetch_document(token: str, scope: str = "full") -> dict[str, Any]:
    data = run_lark(
        "docs", "+fetch", "--as", "user", "--doc", token,
        "--doc-format", "xml", "--detail", "full", "--scope", scope,
    )
    document = data.get("document")
    if not isinstance(document, dict) or not isinstance(document.get("content"), str):
        raise GateError(f"missing document content for {token}")
    return document


def get_node(token: str) -> dict[str, Any]:
    data = run_lark("wiki", "+node-get", "--as", "user", "--node-token", token)
    node = data.get("node") or data
    if not isinstance(node, dict):
        raise GateError(f"missing wiki node for {token}")
    return node


def parse_xml(xml: str) -> ET.Element:
    try:
        return ET.fromstring(f"<root>{xml}</root>")
    except ET.ParseError as exc:
        raise GateError(f"invalid Feishu XML: {exc}") from exc


def normalized_text(element: ET.Element) -> str:
    return re.sub(r"\s+", " ", "".join(element.itertext())).strip()


def content_hash(xml: str) -> str:
    root = parse_xml(xml)
    for element in root.iter():
        for key in list(element.attrib):
            if key in {"id", "block-id", "revision-id"}:
                del element.attrib[key]
    normalized = re.sub(r">\s+<", "><", ET.tostring(root, encoding="unicode")).strip()
    return hashlib.sha256(normalized.encode("utf-8")).hexdigest()


def xml_stats(xml: str) -> dict[str, Any]:
    root = parse_xml(xml)
    tags = [element.tag.rsplit("}", 1)[-1] for element in root.iter()]
    text = normalized_text(root)
    unknown = sorted(set(tags) - KNOWN_TAGS)
    return {
        "characters": len(text),
        "h1": tags.count("h1"),
        "h2": tags.count("h2"),
        "h3": tags.count("h3"),
        "images": tags.count("img") + tags.count("image"),
        "callouts": tags.count("callout"),
        "grids": tags.count("grid"),
        "tables": tags.count("table"),
        "subPageLists": tags.count("sub-page-list"),
        "unknownTags": unknown,
        "hash": content_hash(xml),
    }


def top_level_sections(xml: str) -> list[dict[str, Any]]:
    root = parse_xml(xml)
    children = list(root)
    sections: list[dict[str, Any]] = []
    current: list[ET.Element] = []
    title = ""
    for child in children:
        tag = child.tag.rsplit("}", 1)[-1]
        if tag == "h1":
            if current:
                section_xml = "<fragment>" + "".join(ET.tostring(item, encoding="unicode") for item in current) + "</fragment>"
                sections.append({"title": title, **xml_stats(section_xml)})
            current = [child]
            title = normalized_text(child)
        elif current:
            current.append(child)
    if current:
        section_xml = "<fragment>" + "".join(ET.tostring(item, encoding="unicode") for item in current) + "</fragment>"
        sections.append({"title": title, **xml_stats(section_xml)})
    return sections


def list_space_nodes(space_id: str) -> list[dict[str, Any]]:
    data = run_lark("wiki", "+node-list", "--as", "user", "--space-id", space_id, "--page-all", "--page-limit", "0")
    items = data.get("items") or data.get("nodes") or []
    if not isinstance(items, list):
        raise GateError("unexpected wiki node-list response")
    return items


def normalize_title(value: str) -> str:
    return re.sub(r"[^0-9a-z\u4e00-\u9fff]+", "", value.casefold())


def write_json_atomic(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile("w", encoding="utf-8", dir=path.parent, delete=False) as handle:
        json.dump(payload, handle, ensure_ascii=False, indent=2)
        handle.write("\n")
        temporary = Path(handle.name)
    temporary.replace(path)


def write_text_atomic(path: Path, value: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile("w", encoding="utf-8", dir=path.parent, delete=False) as handle:
        handle.write(value)
        temporary = Path(handle.name)
    temporary.replace(path)


def cmd_snapshot_source(_: argparse.Namespace) -> int:
    """Preserve the exact source documents locally before any directory rewrite."""
    manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    archive = ROOT / ".local" / "learn-source" / "claude-code"
    receipts: dict[str, Any] = {"schemaVersion": 1, "capturedAt": datetime.now(timezone.utc).isoformat(), "documents": {}}
    for name, token in {
        "root": manifest["source"]["rootWikiToken"],
        "directory": manifest["source"]["directoryWikiToken"],
    }.items():
        document = fetch_document(token)
        digest = content_hash(document["content"])
        filename = f"{name}-r{document['revision_id']}-{digest[:12]}.xml"
        path = archive / filename
        if not path.exists():
            write_text_atomic(path, document["content"])
        receipts["documents"][name] = {
            "wikiToken": token,
            "revision": document["revision_id"],
            "contentHash": digest,
            "path": str(path.relative_to(ROOT)),
        }
    write_json_atomic(archive / "receipt.json", receipts)
    print(json.dumps({"ok": True, "receipt": str(archive / "receipt.json")}, ensure_ascii=False, indent=2))
    return 0


def slugify_heading(value: str, used: set[str]) -> str:
    base = re.sub(r"[^0-9a-z\u4e00-\u9fff]+", "-", value.casefold()).strip("-") or "section"
    candidate = base
    number = 2
    while candidate in used:
        candidate = f"{base}-{number}"
        number += 1
    used.add(candidate)
    return candidate


def plain_text(element: ET.Element) -> str:
    return re.sub(r"[ \t]+", " ", "".join(element.itertext())).strip()


def download_asset(token: str, cache: dict[str, str]) -> str:
    if token in cache:
        return cache[token]
    ASSET_DIR.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="agentalpha-media-") as temporary:
        base = Path(temporary) / "asset"
        completed = subprocess.run(
            ["lark-cli", "docs", "+media-download", "--as", "user", "--token", token, "--output", str(base), "--format", "json"],
            cwd=ROOT, text=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=False,
        )
        if completed.returncode != 0:
            raise GateError(f"media download failed for {token}: {completed.stderr.strip()}")
        candidates = [path for path in Path(temporary).iterdir() if path.is_file()]
        if len(candidates) != 1:
            raise GateError(f"media download produced {len(candidates)} files for {token}")
        source = candidates[0]
        digest = hashlib.sha256(source.read_bytes()).hexdigest()
        suffix = source.suffix.lower() or ".bin"
        destination = ASSET_DIR / f"{digest}{suffix}"
        if not destination.exists():
            shutil.copy2(source, destination)
    public_path = f"/learn-assets/claude-code/{destination.name}"
    cache[token] = public_path
    return public_path


def element_blocks(element: ET.Element, heading_ids: set[str], assets: dict[str, str], image_metadata: dict[str, Any]) -> list[dict[str, Any]]:
    tag = element.tag.rsplit("}", 1)[-1]
    text = plain_text(element)
    if tag in {"h2", "h3"}:
        return [{"type": "heading", "level": int(tag[1]), "id": slugify_heading(text, heading_ids), "text": text}]
    if tag == "p":
        return [{"type": "paragraph", "text": text}] if text else []
    if tag in {"code", "code-block", "pre"}:
        return [{"type": "code", "language": element.attrib.get("language") or element.attrib.get("lang", "text"), "code": text, **({"caption": element.attrib["caption"]} if element.attrib.get("caption") else {})}]
    if tag in {"img", "image"}:
        token = element.attrib.get("token") or element.attrib.get("file-token") or element.attrib.get("src")
        metadata = image_metadata.get(str(token), {})
        alt = (metadata.get("alt") or element.attrib.get("alt") or element.attrib.get("name") or "").strip()
        caption = (metadata.get("caption") or element.attrib.get("caption") or "").strip()
        source_label = (metadata.get("sourceLabel") or element.attrib.get("source-label") or element.attrib.get("source") or "").strip()
        if not token or not alt or not caption or not source_label:
            raise GateError("image requires token, alt, caption and source-label/source")
        block: dict[str, Any] = {"type": "image", "src": download_asset(token, assets), "alt": alt, "caption": caption, "sourceLabel": source_label}
        source_url = metadata.get("sourceUrl") or element.attrib.get("source-url")
        if source_url:
            block["sourceUrl"] = source_url
        return [block]
    if tag == "callout":
        children: list[dict[str, Any]] = []
        for child in element:
            children.extend(element_blocks(child, heading_ids, assets, image_metadata))
        if not children and text:
            children = [{"type": "paragraph", "text": text}]
        return [{"type": "callout", "tone": element.attrib.get("tone", "key") if element.attrib.get("tone") in {"key", "warning", "practice"} else "key", "title": element.attrib.get("title", "关键提示"), "blocks": children}]
    if tag == "grid":
        columns: list[dict[str, Any]] = []
        for column in element:
            if column.tag.rsplit("}", 1)[-1] not in {"column", "grid-column"}:
                raise GateError(f"unknown grid child: {column.tag}")
            blocks: list[dict[str, Any]] = []
            for child in column:
                blocks.extend(element_blocks(child, heading_ids, assets, image_metadata))
            item: dict[str, Any] = {"blocks": blocks}
            if column.attrib.get("title"):
                item["title"] = column.attrib["title"]
            columns.append(item)
        return [{"type": "grid", "columns": columns}]
    if tag == "table":
        rows: list[list[str]] = []
        header: list[str] = []
        for row in element.iter():
            row_tag = row.tag.rsplit("}", 1)[-1]
            if row_tag != "tr":
                continue
            cells = [plain_text(cell) for cell in row if cell.tag.rsplit("}", 1)[-1] in {"th", "td"}]
            if not cells:
                continue
            if not header and any(cell.tag.rsplit("}", 1)[-1] == "th" for cell in row):
                header = cells
            else:
                rows.append(cells)
        if not header or any(len(row) != len(header) for row in rows):
            raise GateError("table requires one header row and rectangular body rows")
        block = {"type": "table", "headers": header, "rows": rows}
        if element.attrib.get("caption"):
            block["caption"] = element.attrib["caption"]
        return [block]
    if tag in {"ul", "ol"}:
        items = [plain_text(child) for child in element if child.tag.rsplit("}", 1)[-1] == "li"]
        return [{"type": "list", "ordered": tag == "ol", "items": items}]
    if tag in {"quote", "blockquote"}:
        block = {"type": "quote", "text": text}
        if element.attrib.get("citation"):
            block["citation"] = element.attrib["citation"]
        return [block]
    if tag in {"divider", "hr", "br"}:
        return []
    raise GateError(f"unknown or unsupported content block: {tag}")


def convert_document(entry: dict[str, Any], document: dict[str, Any], editorial: dict[str, Any]) -> dict[str, Any]:
    required = {"summary", "directAnswer", "difficulty", "readingMinutes", "tags", "quality", "sources"}
    missing = sorted(required - editorial.keys())
    if missing:
        raise GateError(f"editorial metadata missing for {entry['slug']}: {', '.join(missing)}")
    root = parse_xml(document["content"])
    children = list(root)
    h1s = [item for item in root.iter() if item.tag.rsplit("}", 1)[-1] == "h1"]
    if len(h1s) != 1:
        raise GateError(f"{entry['slug']} must contain exactly one H1, got {len(h1s)}")
    heading_ids: set[str] = set()
    assets: dict[str, str] = {}
    blocks: list[dict[str, Any]] = []
    for child in children:
        tag = child.tag.rsplit("}", 1)[-1]
        if tag in {"title", "h1"}:
            continue
        blocks.extend(element_blocks(child, heading_ids, assets, editorial.get("images", {})))
    now = datetime.now(timezone.utc).isoformat()
    return {
        "schemaVersion": 1,
        "slug": entry["slug"],
        "title": plain_text(h1s[0]),
        "summary": editorial["summary"],
        "directAnswer": editorial["directAnswer"],
        "difficulty": editorial["difficulty"],
        "readingMinutes": editorial["readingMinutes"],
        "tags": editorial["tags"],
        "sourceWikiToken": entry["sourceWikiToken"],
        "sourceRevision": document["revision_id"],
        "approvedRevision": document["revision_id"],
        "contentHash": content_hash(document["content"]),
        "publishedAt": editorial.get("publishedAt", now),
        "updatedAt": now,
        "quality": editorial["quality"],
        "blocks": blocks,
        "sources": editorial["sources"],
    }


def cmd_export(_: argparse.Namespace) -> int:
    require_editorial_batch_unfrozen("export website snapshots")
    manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    lock = json.loads(LOCK_PATH.read_text(encoding="utf-8"))
    locked = {item["slug"]: item for item in lock.get("chapters", [])}
    if not locked:
        raise GateError("approval lock is empty; human approval is required before export")
    expected_slugs = {entry["slug"] for entry in manifest["chapters"]}
    if set(locked) != expected_slugs:
        raise GateError("complete-volume approval is required before any website snapshot export")
    exported: list[str] = []
    skipped: list[str] = []
    pending_snapshots: list[tuple[Path, dict[str, Any]]] = []
    pending_manifest_updates: list[tuple[dict[str, Any], dict[str, Any], str]] = []
    for entry in manifest["chapters"]:
        approved = locked.get(entry["slug"])
        if not approved:
            continue
        document = fetch_document(entry["sourceWikiToken"])
        digest = content_hash(document["content"])
        if document["revision_id"] != approved.get("revision") or digest != approved.get("contentHash"):
            raise GateError(f"approval lock drift for {entry['slug']}")
        destination = CHAPTER_DIR / f"{entry['slug']}.json"
        if destination.exists():
            current = json.loads(destination.read_text(encoding="utf-8"))
            if current.get("approvedRevision") == document["revision_id"] and current.get("contentHash") == digest:
                skipped.append(entry["slug"])
                chapter = current
            else:
                chapter = None
        else:
            chapter = None
        if chapter is None:
            editorial_path = EDITORIAL_DIR / f"{entry['slug']}.json"
            if not editorial_path.exists():
                raise GateError(f"missing design brief/editorial metadata: {entry['slug']}")
            chapter = convert_document(entry, document, json.loads(editorial_path.read_text(encoding="utf-8")))
            failures = validate_snapshot({**entry, "approvedRevision": document["revision_id"], "contentHash": digest}, chapter)
            if failures:
                raise GateError(f"snapshot gate failed for {entry['slug']}: {'; '.join(failures)}")
            pending_snapshots.append((destination, chapter))
            exported.append(entry["slug"])
        pending_manifest_updates.append((entry, document, digest))

    # Commit snapshots and manifest only after every locked chapter passed. A failed
    # batch may download hash-deduplicated assets, but it cannot publish a partial set.
    for destination, chapter in pending_snapshots:
        write_json_atomic(destination, chapter)
    for entry, document, digest in pending_manifest_updates:
        entry["sourceRevision"] = document["revision_id"]
        entry["approvedRevision"] = document["revision_id"]
        entry["contentHash"] = digest
        entry["status"] = "approved"
    write_json_atomic(MANIFEST_PATH, manifest)
    print(json.dumps({"ok": True, "exported": exported, "skipped": skipped}, ensure_ascii=False, indent=2))
    return 0


def cmd_init_briefs(_: argparse.Namespace) -> int:
    """Materialize 23 idempotent design briefs from the reviewed catalog."""
    manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    catalog = json.loads(BRIEF_CATALOG_PATH.read_text(encoding="utf-8"))
    fact_pack = json.loads(FACT_PACK_PATH.read_text(encoding="utf-8"))
    source_by_id = {item["id"]: item for item in fact_pack["sources"]}
    chapter_catalog = catalog.get("chapters", {})
    expected = {entry["slug"] for entry in manifest["chapters"]}
    if set(chapter_catalog) != expected:
        missing = sorted(expected - set(chapter_catalog))
        extra = sorted(set(chapter_catalog) - expected)
        raise GateError(f"brief catalog mismatch; missing={missing}, extra={extra}")

    created: list[str] = []
    unchanged: list[str] = []
    for entry in manifest["chapters"]:
        seed = chapter_catalog[entry["slug"]]
        source_ids = seed["sources"]
        missing_sources = [source_id for source_id in source_ids if source_id not in source_by_id]
        if missing_sources:
            raise GateError(f"unknown source ids for {entry['slug']}: {missing_sources}")
        brief = {
            "schemaVersion": 1,
            "status": "design",
            "slug": entry["slug"],
            "title": entry["title"],
            "reader": seed["reader"],
            "centerQuestion": seed["question"],
            "keyConcepts": seed["concepts"],
            "misconceptions": seed["misconceptions"],
            "caseStudy": seed["case"],
            "summary": f"围绕“{seed['question']}”建立从失败场景、运行机制到工程验证的完整解释。",
            "directAnswer": "待章节完成事实核验和重写后填写；设计阶段不得用占位结论进入发布快照。",
            "difficulty": "入门" if entry["order"] <= 5 else ("进阶" if entry["order"] <= 14 else "高级"),
            "readingMinutes": 35,
            "tags": seed["concepts"][:4],
            "imagePlan": [
                {"slot": 1, "purpose": "失败场景", "visual": f"{seed['case']}的错误路径与可观察信号", "preferredSource": "自制解释图"},
                {"slot": 2, "purpose": "核心直觉", "visual": f"{seed['concepts'][0]}与{seed['concepts'][1]}的关系图", "preferredSource": "自制解释图"},
                {"slot": 3, "purpose": "运行机制", "visual": "关键状态、输入输出与控制边界", "preferredSource": "官方文档原图优先；否则自制并标注"},
                {"slot": 4, "purpose": "方案比较", "visual": "替代方案在可靠性、成本与适用边界上的对比", "preferredSource": "自制对比图"},
                {"slot": 5, "purpose": "工程落地", "visual": "调试、评测与验收闭环", "preferredSource": "真实界面或自制流程图"}
            ],
            "quality": {"overall": 0, "accuracy": 0, "depth": 0},
            "qualityNote": "尚未完成编辑与人工评分；0 分是发布阻断值，不代表内容质量结论。",
            "sources": [{"label": source_by_id[source_id]["title"], "url": source_by_id[source_id]["url"], "sourceId": source_id} for source_id in source_ids],
            "images": {}
        }
        destination = EDITORIAL_DIR / f"{entry['slug']}.json"
        serialized = json.dumps(brief, ensure_ascii=False, indent=2) + "\n"
        if destination.exists() and destination.read_text(encoding="utf-8") == serialized:
            unchanged.append(entry["slug"])
        else:
            write_text_atomic(destination, serialized)
            created.append(entry["slug"])
    print(json.dumps({"ok": True, "written": created, "unchanged": unchanged, "total": len(expected)}, ensure_ascii=False, indent=2))
    return 0


def child_nodes(space_id: str, parent_token: str) -> list[dict[str, Any]]:
    data = run_lark(
        "wiki", "+node-list", "--as", "user", "--space-id", space_id,
        "--parent-node-token", parent_token, "--page-all", "--page-limit", "0",
    )
    items = data.get("items") or data.get("nodes") or []
    if not isinstance(items, list):
        raise GateError("unexpected child node-list response")
    return items


def cmd_organize(_: argparse.Namespace) -> int:
    manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    root_token = manifest["source"]["rootWikiToken"]
    directory_token = manifest["source"]["directoryWikiToken"]
    space_id = manifest["source"]["spaceId"]
    directory = get_node(directory_token)
    if directory.get("parent_node_token") != root_token:
        raise GateError("directory is not under the configured root; refusing to create children")

    existing = child_nodes(space_id, directory_token)
    by_title: dict[str, list[dict[str, Any]]] = {}
    for node in existing:
        by_title.setdefault(normalize_title(str(node.get("title") or "")), []).append(node)
    journal: list[dict[str, Any]] = []

    for entry in manifest["chapters"]:
        token = entry.get("sourceWikiToken")
        if token:
            node = get_node(token)
            if node.get("parent_node_token") != directory_token:
                raise GateError(f"configured chapter is outside directory: {entry['slug']}")
            entry["sourceRevision"] = fetch_document(token, scope="outline")["revision_id"]
            entry["status"] = "inventory"
            journal.append({"slug": entry["slug"], "action": "verified", "nodeToken": token})
            continue

        matches = by_title.get(normalize_title(entry["title"]), [])
        if len(matches) > 1:
            raise GateError(f"multiple same-title child nodes found: {entry['title']}")
        if matches:
            node = matches[0]
            action = "reused"
        else:
            data = run_lark(
                "wiki", "+node-create", "--as", "user", "--parent-node-token", directory_token,
                "--space-id", space_id, "--obj-type", "docx", "--title", entry["title"],
            )
            node = data.get("node") or data
            if not isinstance(node, dict) or not node.get("node_token"):
                raise GateError(f"node-create returned no node token: {entry['slug']}")
            action = "created"

        token = node["node_token"]
        verified = get_node(token)
        if verified.get("parent_node_token") != directory_token or verified.get("title") != entry["title"]:
            raise GateError(f"created node verification failed: {entry['slug']}")
        document = fetch_document(token, scope="outline")
        entry["sourceWikiToken"] = token
        entry["sourceRevision"] = document["revision_id"]
        entry["status"] = "inventory"
        journal.append({"slug": entry["slug"], "action": action, "nodeToken": token, "revision": document["revision_id"]})
        write_json_atomic(MANIFEST_PATH, manifest)
        by_title.setdefault(normalize_title(entry["title"]), []).append(verified)

    write_json_atomic(MANIFEST_PATH, manifest)
    REPORT_DIR.mkdir(parents=True, exist_ok=True)
    write_json_atomic(REPORT_DIR / "organization-journal.json", {"schemaVersion": 1, "root": root_token, "directory": directory_token, "operations": journal})
    print(json.dumps({"ok": True, "created": sum(item["action"] == "created" for item in journal), "reused": sum(item["action"] == "reused" for item in journal), "verified": sum(item["action"] == "verified" for item in journal), "journal": str(REPORT_DIR / "organization-journal.json")}, ensure_ascii=False, indent=2))
    return 0


def cmd_inventory(args: argparse.Namespace) -> int:
    manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    tokens = {
        "root": manifest["source"]["rootWikiToken"],
        "directory": manifest["source"]["directoryWikiToken"],
    }
    report: dict[str, Any] = {"schemaVersion": 1, "documents": {}, "sourceSections": [], "duplicates": []}
    for name, token in tokens.items():
        node = get_node(token)
        document = fetch_document(token)
        report["documents"][name] = {
            "wikiToken": token,
            "objToken": node.get("obj_token"),
            "title": node.get("title"),
            "parentNodeToken": node.get("parent_node_token"),
            "revision": document["revision_id"],
            **xml_stats(document["content"]),
        }
        if name == "directory":
            report["sourceSections"] = top_level_sections(document["content"])

    existing_tokens = [entry["sourceWikiToken"] for entry in manifest["chapters"] if entry["sourceWikiToken"]]
    for token in existing_tokens:
        node = get_node(token)
        document = fetch_document(token)
        report["documents"][token] = {
            "wikiToken": token,
            "objToken": node.get("obj_token"),
            "title": node.get("title"),
            "parentNodeToken": node.get("parent_node_token"),
            "revision": document["revision_id"],
            **xml_stats(document["content"]),
        }

    planned_titles = {normalize_title(entry["title"]): entry for entry in manifest["chapters"]}
    for node in list_space_nodes(manifest["source"]["spaceId"]):
        title = str(node.get("title") or "")
        matched = planned_titles.get(normalize_title(title))
        if matched and node.get("node_token") != matched.get("sourceWikiToken"):
            report["duplicates"].append({
                "plannedSlug": matched["slug"], "plannedTitle": matched["title"],
                "existingTitle": title, "nodeToken": node.get("node_token"), "objToken": node.get("obj_token"),
            })

    REPORT_DIR.mkdir(parents=True, exist_ok=True)
    output = REPORT_DIR / "inventory.json"
    output.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"ok": True, "report": str(output), "sectionCount": len(report["sourceSections"]), "duplicateCount": len(report["duplicates"])}, ensure_ascii=False, indent=2))
    return 2 if report["duplicates"] and not args.allow_duplicates else 0


def cmd_verify_indexes(_: argparse.Namespace) -> int:
    """Refetch the two live indexes and prove hierarchy plus explicit reading order."""
    manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    root_token = manifest["source"]["rootWikiToken"]
    directory_token = manifest["source"]["directoryWikiToken"]
    space_id = manifest["source"]["spaceId"]
    root_node = get_node(root_token)
    directory_node = get_node(directory_token)
    root_document = fetch_document(root_token)
    directory_document = fetch_document(directory_token)
    children = child_nodes(space_id, directory_token)
    expected_tokens = [entry["sourceWikiToken"] for entry in manifest["chapters"]]
    actual_tokens = [item.get("node_token") for item in children]
    failures: list[str] = []
    if directory_node.get("parent_node_token") != root_token:
        failures.append("directory is not a child of the configured root")
    if set(actual_tokens) != set(expected_tokens) or len(actual_tokens) != len(expected_tokens):
        failures.append("directory children do not exactly match the 23 manifest chapters")
    root_stats = xml_stats(root_document["content"])
    directory_stats = xml_stats(directory_document["content"])
    if root_stats["h1"] != 1: failures.append(f"root H1 count is {root_stats['h1']}")
    if directory_stats["h1"] != 1: failures.append(f"directory H1 count is {directory_stats['h1']}")
    if directory_token not in root_document["content"]: failures.append("root does not link to directory")
    missing_links = [token for token in expected_tokens if token not in directory_document["content"]]
    if missing_links: failures.append(f"directory explicit reading order is missing {len(missing_links)} chapter links")
    positions = [directory_document["content"].find(token) for token in expected_tokens]
    if positions != sorted(positions): failures.append("directory explicit reading-order links are not in manifest order")
    report = {
        "schemaVersion": 1,
        "verifiedAt": datetime.now(timezone.utc).isoformat(),
        "ok": not failures,
        "root": {"wikiToken": root_token, "objToken": root_node.get("obj_token"), "revision": root_document["revision_id"], **root_stats},
        "directory": {"wikiToken": directory_token, "objToken": directory_node.get("obj_token"), "parentNodeToken": directory_node.get("parent_node_token"), "revision": directory_document["revision_id"], **directory_stats},
        "chapterCount": len(actual_tokens),
        "readingOrder": expected_tokens,
        "failures": failures,
    }
    write_json_atomic(REPORT_DIR / "index-write-receipt.json", report)
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 0 if not failures else 1


def verify_live_draft(entry: dict[str, Any], document: dict[str, Any], candidate_xml: str) -> list[str]:
    """Verify Feishu preserved the publication-critical semantics after write."""
    stats = xml_stats(document["content"])
    candidate = parse_xml(candidate_xml)
    live = parse_xml(document["content"])
    failures: list[str] = []
    if stats["h1"] != 1: failures.append(f"H1 count is {stats['h1']}")
    if stats["h2"] < 8: failures.append(f"H2 count is {stats['h2']}")
    if stats["images"] < 5: failures.append(f"image count is {stats['images']}")
    if stats["callouts"] < 2: failures.append(f"callout count is {stats['callouts']}")
    if stats["grids"] < 1: failures.append(f"grid count is {stats['grids']}")
    if stats["tables"] < 2: failures.append(f"table count is {stats['tables']}")
    if not 6000 <= stats["characters"] <= 18000: failures.append(f"character gate is {stats['characters']}")
    if stats["unknownTags"]: failures.append(f"unknown tags: {stats['unknownTags']}")
    h1s = [item for item in live.iter() if item.tag.rsplit("}", 1)[-1] == "h1"]
    if len(h1s) == 1 and normalized_text(h1s[0]) != entry["title"]:
        failures.append("H1 title changed during write")
    candidate_captions = [item.attrib.get("caption", "").strip() for item in candidate.iter("img")]
    live_text = normalized_text(live)
    missing_captions = [caption for caption in candidate_captions if caption and caption not in live_text and caption not in document["content"]]
    if missing_captions: failures.append(f"missing {len(missing_captions)} image captions")
    forbidden = re.compile(
        r"泄[露漏].{0,8}(源码|system prompt)|51\s*万|1903|98\.4|Demo\s*级|VILA|"
        r"源码显微镜|src/|\.tsx?\b|隐藏参数|未公开文档|真实数据|量化数据|性能数据|内部实现|竞品只是",
        re.I,
    )
    hits = sorted({match.group(0) for match in forbidden.finditer(live_text)})
    if hits: failures.append(f"forbidden unverifiable claims: {hits}")
    return failures


def cmd_publish_drafts(args: argparse.Namespace) -> int:
    """Write reviewed candidates with revision locking and refetch every chapter."""
    require_editorial_batch_unfrozen("write chapter drafts to Feishu")
    manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    entries = manifest["chapters"]
    if args.slug:
        entries = [entry for entry in entries if entry["slug"] == args.slug]
        if not entries:
            raise GateError(f"unknown slug: {args.slug}")
    journal_path = REPORT_DIR / "chapter-write-journal.json"
    if journal_path.exists():
        journal = json.loads(journal_path.read_text(encoding="utf-8"))
    else:
        journal = {"schemaVersion": 1, "operations": []}
    completed: list[str] = []
    skipped: list[str] = []
    fetch_dir = ROOT / ".local" / "learn-fetched" / "claude-code"

    for entry in entries:
        draft_path = DRAFT_DIR / f"{entry['slug']}.xml"
        if not draft_path.exists():
            raise GateError(f"missing draft: {draft_path}")
        candidate_xml = draft_path.read_text(encoding="utf-8").strip()
        candidate_stats = xml_stats(candidate_xml)
        if candidate_stats["h1"] != 1 or candidate_stats["images"] < 5 or not 6000 <= candidate_stats["characters"] <= 18000:
            raise GateError(f"candidate gate failed for {entry['slug']}: {candidate_stats}")
        before = fetch_document(entry["sourceWikiToken"])
        before_hash = content_hash(before["content"])
        if entry.get("status") == "verified" and entry.get("sourceRevision") == before["revision_id"] and entry.get("contentHash") == before_hash:
            failures = verify_live_draft(entry, before, candidate_xml)
            if failures:
                raise GateError(f"previously verified live draft drifted for {entry['slug']}: {'; '.join(failures)}")
            skipped.append(entry["slug"])
            continue
        expected_revision = entry.get("sourceRevision")
        if expected_revision != before["revision_id"]:
            raise GateError(f"revision drift for {entry['slug']}: manifest={expected_revision}, live={before['revision_id']}")
        operation = {
            "slug": entry["slug"],
            "startedAt": datetime.now(timezone.utc).isoformat(),
            "beforeRevision": before["revision_id"],
            "beforeHash": before_hash,
            "candidateHash": content_hash(candidate_xml),
            "status": "writing",
        }
        journal["operations"].append(operation)
        write_json_atomic(journal_path, journal)
        relative_draft = draft_path.relative_to(ROOT)
        try:
            run_lark(
                "docs", "+update", "--as", "user", "--doc", entry["sourceWikiToken"],
                "--command", "overwrite", "--content", f"@{relative_draft}",
                "--revision-id", str(before["revision_id"]),
            )
            after = fetch_document(entry["sourceWikiToken"])
            failures = verify_live_draft(entry, after, candidate_xml)
            if after["revision_id"] <= before["revision_id"]:
                failures.append("revision did not advance")
            if failures:
                raise GateError("; ".join(failures))
            digest = content_hash(after["content"])
            filename = f"{entry['slug']}-r{after['revision_id']}-{digest[:12]}.xml"
            write_text_atomic(fetch_dir / filename, after["content"])
            entry["sourceRevision"] = after["revision_id"]
            entry["contentHash"] = digest
            entry["status"] = "verified"
            operation.update({
                "finishedAt": datetime.now(timezone.utc).isoformat(),
                "afterRevision": after["revision_id"],
                "afterHash": digest,
                "fetchedPath": str((fetch_dir / filename).relative_to(ROOT)),
                "stats": xml_stats(after["content"]),
                "status": "verified",
            })
            write_json_atomic(MANIFEST_PATH, manifest)
            write_json_atomic(journal_path, journal)
            completed.append(entry["slug"])
        except Exception as exc:
            operation.update({"finishedAt": datetime.now(timezone.utc).isoformat(), "status": "failed", "error": str(exc)})
            write_json_atomic(journal_path, journal)
            raise GateError(f"write/refetch failed for {entry['slug']}: {exc}") from exc

    print(json.dumps({"ok": True, "completed": completed, "skipped": skipped, "journal": str(journal_path)}, ensure_ascii=False, indent=2))
    return 0


def validate_snapshot(entry: dict[str, Any], chapter: dict[str, Any]) -> list[str]:
    failures: list[str] = []
    if chapter.get("slug") != entry["slug"]: failures.append("slug mismatch")
    if chapter.get("approvedRevision") != entry["approvedRevision"]: failures.append("revision lock mismatch")
    if chapter.get("contentHash") != entry["contentHash"]: failures.append("content hash mismatch")
    blocks = chapter.get("blocks") or []
    def flatten(values: list[dict[str, Any]]) -> list[dict[str, Any]]:
        result: list[dict[str, Any]] = []
        for value in values:
            result.append(value)
            if isinstance(value.get("blocks"), list): result.extend(flatten(value["blocks"]))
            for column in value.get("columns") or []:
                if isinstance(column.get("blocks"), list): result.extend(flatten(column["blocks"]))
        return result
    all_blocks = flatten(blocks)
    headings = [block for block in all_blocks if block.get("type") == "heading"]
    images = [block for block in all_blocks if block.get("type") == "image"]
    callouts = [block for block in all_blocks if block.get("type") == "callout"]
    def semantic_chars(value: Any) -> int:
        if isinstance(value, str): return len(value)
        if isinstance(value, list): return sum(semantic_chars(item) for item in value)
        if isinstance(value, dict): return sum(semantic_chars(item) for key, item in value.items() if key not in {"type", "src", "sourceUrl", "id"})
        return 0
    body_chars = len(chapter.get("directAnswer", "")) + semantic_chars(blocks)
    if not 6000 <= body_chars <= 18000: failures.append(f"character gate failed: {body_chars}")
    if len(images) < 5: failures.append(f"image gate failed: {len(images)}")
    if len(callouts) < 2: failures.append(f"callout gate failed: {len(callouts)}")
    quality = chapter.get("quality") or {}
    if quality.get("overall", 0) < 85: failures.append("overall quality score must be >= 85")
    if quality.get("accuracy", 0) < 22: failures.append("accuracy score must be >= 22")
    if quality.get("depth", 0) < 16: failures.append("depth score must be >= 16")
    if len(chapter.get("sources") or []) < 2: failures.append("at least two authoritative sources are required")
    ids = [heading.get("id") for heading in headings]
    if len(ids) != len(set(ids)): failures.append("duplicate heading id")
    for image in images:
        if not all(image.get(key) for key in ("src", "alt", "caption", "sourceLabel")):
            failures.append("image metadata incomplete")
        if str(image.get("src", "")).startswith(("http://", "https://")):
            failures.append("remote image URL is forbidden")
    return failures


def cmd_verify_release(_: argparse.Namespace) -> int:
    manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    lock = json.loads(LOCK_PATH.read_text(encoding="utf-8"))
    failures: list[str] = []
    if EDITORIAL_REJECTION_PATH.exists():
        rejection = json.loads(EDITORIAL_REJECTION_PATH.read_text(encoding="utf-8"))
        if rejection.get("state") == "active":
            failures.append("editorial batch was rejected by student-readability review; gold sample approval is required")
    slugs = [entry["slug"] for entry in manifest["chapters"]]
    if len(slugs) != len(set(slugs)): failures.append("duplicate slug in manifest")
    if any(not ALLOWED_SLUG.fullmatch(slug) for slug in slugs): failures.append("invalid slug in manifest")
    if len(manifest["chapters"]) != 23: failures.append(f"expected 23 chapters, got {len(manifest['chapters'])}")
    approved = [entry for entry in manifest["chapters"] if entry["status"] in {"approved", "published"}]
    locked = {entry["slug"]: entry for entry in lock["chapters"]}
    for entry in approved:
        locked_entry = locked.get(entry["slug"])
        if not locked_entry:
            failures.append(f"missing approval lock: {entry['slug']}")
        elif locked_entry.get("revision") != entry.get("approvedRevision") or locked_entry.get("contentHash") != entry.get("contentHash"):
            failures.append(f"approval lock mismatch: {entry['slug']}")
        file = CONTENT_DIR / "chapters" / f"{entry['slug']}.json"
        if not file.exists():
            failures.append(f"missing snapshot: {entry['slug']}")
            continue
        failures.extend(f"{entry['slug']}: {message}" for message in validate_snapshot(entry, json.loads(file.read_text(encoding="utf-8"))))
    if manifest["publicationState"] == "published":
        if len(approved) != len(manifest["chapters"]): failures.append("published collection must approve all chapters")
        if not manifest["navigationEnabled"]: failures.append("published collection must enable navigation")
    if getattr(_, "require_published", False) and manifest["publicationState"] != "published":
        failures.append("release check requires publicationState=published")
    print(json.dumps({"ok": not failures, "publicationState": manifest["publicationState"], "approved": len(approved), "total": len(manifest["chapters"]), "failures": failures}, ensure_ascii=False, indent=2))
    return 0 if not failures else 1


def main() -> int:
    parser = argparse.ArgumentParser()
    sub = parser.add_subparsers(dest="command", required=True)
    inventory = sub.add_parser("inventory", help="fetch live Feishu revisions and detect same-title nodes")
    inventory.add_argument("--allow-duplicates", action="store_true", help="report duplicates without returning status 2")
    inventory.set_defaults(func=cmd_inventory)
    indexes = sub.add_parser("verify-indexes", help="refetch and verify HJN, PA52 and the 23-child hierarchy")
    indexes.set_defaults(func=cmd_verify_indexes)
    verify = sub.add_parser("verify-release", help="validate approval locks and static snapshots")
    verify.set_defaults(func=cmd_verify_release)
    organize = sub.add_parser("organize", help="idempotently create and verify the formal chapter tree")
    organize.set_defaults(func=cmd_organize)
    snapshot = sub.add_parser("snapshot-source", help="archive exact HJN and PA52 source revisions before rewriting")
    snapshot.set_defaults(func=cmd_snapshot_source)
    export = sub.add_parser("export", help="export only human-approved live revisions to static snapshots")
    export.set_defaults(func=cmd_export)
    briefs = sub.add_parser("init-briefs", help="materialize the 23 fact-linked design briefs")
    briefs.set_defaults(func=cmd_init_briefs)
    publish_drafts = sub.add_parser("publish-drafts", help="revision-lock, write and refetch reviewed Feishu drafts")
    publish_drafts.add_argument("--slug", help="write one chapter first; omit to process the full manifest")
    publish_drafts.set_defaults(func=cmd_publish_drafts)
    verify.add_argument("--require-published", action="store_true", help="fail unless the complete collection is public")
    args = parser.parse_args()
    try:
        return args.func(args)
    except GateError as exc:
        print(json.dumps({"ok": False, "error": str(exc)}, ensure_ascii=False, indent=2), file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
