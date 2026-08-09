#!/usr/bin/env python3
"""Sync the AgentAlpha community introduction from its canonical Feishu doc.

The website reads only the generated static JSON. Vercel never needs Feishu
credentials, and an unchanged revision is a no-op.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import mimetypes
import os
import re
import shutil
import subprocess
import tempfile
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
TOKEN = "QtYQddrAFoLIb9xFe7PckJnmn1b"
SOURCE_URL = f"https://agentalpha.feishu.cn/docx/{TOKEN}"
CONTENT_DIR = ROOT / "content" / "community"
SNAPSHOT_PATH = CONTENT_DIR / "community.json"
MEDIA_MANIFEST_PATH = CONTENT_DIR / "media-manifest.json"
ASSET_DIR = ROOT / "public" / "images" / "community"
PUBLIC_ASSET_ROOT = "/images/community"
ALLOWED_TAGS = {
    "title", "p", "img", "b", "em", "hr", "h1", "h2", "h3", "h4",
    "callout", "span", "grid", "column", "ul", "ol", "li", "blockquote",
    "button", "table", "colgroup", "col", "thead", "tbody", "tr", "th",
    "td", "cite", "a",
}


class SyncError(RuntimeError):
    pass


def write_json_atomic(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile("w", encoding="utf-8", dir=path.parent, delete=False) as handle:
        json.dump(payload, handle, ensure_ascii=False, indent=2)
        handle.write("\n")
        temporary = Path(handle.name)
    temporary.replace(path)


def fetch_document() -> dict[str, Any]:
    env = {
        **os.environ,
        "LARKSUITE_CLI_NO_UPDATE_NOTIFIER": "1",
        "LARKSUITE_CLI_NO_SKILLS_NOTIFIER": "1",
    }
    completed = subprocess.run(
        ["lark-cli", "docs", "+fetch", "--as", "user", "--doc", TOKEN,
         "--detail", "full", "--format", "json"],
        cwd=ROOT, env=env, text=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
        check=False,
    )
    if completed.returncode != 0:
        raise SyncError(f"Feishu fetch failed: {completed.stderr.strip()}")
    envelope = json.loads(completed.stdout)
    if envelope.get("ok") is not True:
        raise SyncError("Feishu fetch did not return ok=true")
    document = envelope.get("data", {}).get("document")
    if not isinstance(document, dict) or not isinstance(document.get("content"), str):
        raise SyncError("Feishu response is missing document content")
    return document


def canonical_hash(xml: str) -> str:
    root = ET.fromstring(f"<root>{xml}</root>")
    for element in root.iter():
        element.attrib.pop("id", None)
        if element.tag.rsplit("}", 1)[-1] == "img":
            element.attrib.pop("href", None)
    canonical = re.sub(r">\s+<", "><", ET.tostring(root, encoding="unicode")).strip()
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def clean_text(value: str | None) -> str:
    return re.sub(r"[ \t]+", " ", value or "")


def safe_http_url(value: str | None) -> str | None:
    if value and value.startswith(("https://", "http://")):
        return value
    return None


def optimize_image(body: bytes, element: ET.Element, content_type: str | None) -> bytes:
    """Create a compact web snapshot while keeping Feishu as the source asset."""
    encoder = shutil.which("cwebp")
    if encoder is None:
        raise SyncError("cwebp is required to sync optimized community images")
    mime = (content_type or element.attrib.get("mime") or "").split(";", 1)[0]
    suffix = mimetypes.guess_extension(mime) or Path(element.attrib.get("name", "")).suffix or ".img"
    if suffix == ".jpe":
        suffix = ".jpg"
    with tempfile.TemporaryDirectory(prefix="community-image-") as directory:
        source = Path(directory) / f"source{suffix}"
        destination = Path(directory) / "snapshot.webp"
        source.write_bytes(body)
        completed = subprocess.run(
            [encoder, "-quiet", "-mt", "-q", "82", str(source), "-o", str(destination)],
            stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, check=False,
        )
        if completed.returncode != 0 or not destination.is_file():
            raise SyncError(f"image optimization failed: {completed.stderr.strip()}")
        return destination.read_bytes()


def download_image(element: ET.Element, media: dict[str, Any]) -> str:
    token = element.attrib.get("src")
    url = safe_http_url(element.attrib.get("href"))
    if not token or not url:
        raise SyncError("image is missing stable token or temporary download URL")
    cached = media.get(token)
    if isinstance(cached, dict):
        cached_path = cached.get("path")
        if isinstance(cached_path, str) and (ROOT / "public" / cached_path.lstrip("/")).is_file():
            return cached_path

    request = urllib.request.Request(url, headers={"User-Agent": "AgentAlpha-Community-Sync/1.0"})
    with urllib.request.urlopen(request, timeout=60) as response:
        body = response.read()
        content_type = response.headers.get("Content-Type")
    if not body:
        raise SyncError(f"empty image download for token {token}")
    source_digest = hashlib.sha256(body).hexdigest()
    optimized = optimize_image(body, element, content_type)
    digest = hashlib.sha256(optimized).hexdigest()
    ASSET_DIR.mkdir(parents=True, exist_ok=True)
    destination = ASSET_DIR / f"{digest}.webp"
    if not destination.exists():
        with tempfile.NamedTemporaryFile("wb", dir=ASSET_DIR, delete=False) as handle:
            handle.write(optimized)
            temporary = Path(handle.name)
        temporary.replace(destination)
    public_path = f"{PUBLIC_ASSET_ROOT}/{destination.name}"
    media[token] = {
        "path": public_path,
        "sha256": digest,
        "bytes": len(optimized),
        "mime": "image/webp",
        "sourceSha256": source_digest,
    }
    return public_path


def append_text(nodes: list[dict[str, Any]], value: str | None) -> None:
    text = clean_text(value)
    if text:
        nodes.append({"type": "text", "text": text})


def convert_element(element: ET.Element, media: dict[str, Any], heading_ids: set[str]) -> dict[str, Any] | None:
    tag = element.tag.rsplit("}", 1)[-1]
    if tag not in ALLOWED_TAGS:
        raise SyncError(f"unsupported Feishu tag: {tag}")
    if tag == "title":
        return None
    if tag == "img":
        return {
            "type": "image",
            "src": download_image(element, media),
            "alt": element.attrib.get("alt") or "AgentAlpha 社区原文图片",
            "width": int(float(element.attrib.get("width", "1200"))),
            "height": int(float(element.attrib.get("height", "720"))),
        }
    if tag == "hr":
        return {"type": "element", "tag": "hr", "children": []}
    if tag == "cite":
        token = element.attrib.get("doc-id")
        file_type = element.attrib.get("file-type")
        title = element.attrib.get("title") or "飞书文档"
        href = f"https://agentalpha.feishu.cn/{'wiki' if file_type == 'wiki' else 'docx'}/{token}" if token else SOURCE_URL
        return {"type": "element", "tag": "a", "href": href, "children": [{"type": "text", "text": title}]}

    output_tag = {
        "b": "strong", "button": "a", "callout": "aside", "grid": "div",
        "column": "section",
    }.get(tag, tag)
    node: dict[str, Any] = {"type": "element", "tag": output_tag, "children": []}
    if tag in {"h1", "h2", "h3", "h4"}:
        label = re.sub(r"\s+", " ", "".join(element.itertext())).strip()
        base = re.sub(r"[^0-9a-z\u4e00-\u9fff]+", "-", label.casefold()).strip("-") or "section"
        candidate = base
        counter = 2
        while candidate in heading_ids:
            candidate = f"{base}-{counter}"
            counter += 1
        heading_ids.add(candidate)
        node["id"] = candidate
    if tag == "callout":
        node["kind"] = "callout"
        node["emoji"] = element.attrib.get("emoji", "✦")
    elif tag == "grid":
        node["kind"] = "grid"
    elif tag == "column":
        node["kind"] = "column"
        try:
            node["ratio"] = float(element.attrib.get("width-ratio", "1"))
        except ValueError:
            node["ratio"] = 1
    elif tag == "button":
        node["kind"] = "button"
        node["href"] = safe_http_url(element.attrib.get("src")) or SOURCE_URL
    elif tag == "a":
        node["href"] = safe_http_url(element.attrib.get("href")) or SOURCE_URL
    elif tag in {"th", "td"}:
        for source, target in (("colspan", "colSpan"), ("rowspan", "rowSpan")):
            if element.attrib.get(source, "").isdigit():
                node[target] = int(element.attrib[source])

    append_text(node["children"], element.text)
    for child in element:
        converted = convert_element(child, media, heading_ids)
        if converted is not None:
            node["children"].append(converted)
        append_text(node["children"], child.tail)
    return node


def plain_text_from_nodes(nodes: list[dict[str, Any]]) -> str:
    parts: list[str] = []
    for node in nodes:
        if node.get("type") == "text":
            parts.append(str(node.get("text", "")))
        elif node.get("type") == "image":
            parts.append(str(node.get("alt", "")))
        else:
            parts.append(plain_text_from_nodes(node.get("children", [])))
    return re.sub(r"\s+", " ", " ".join(parts)).strip()


def build_snapshot(document: dict[str, Any], media: dict[str, Any]) -> dict[str, Any]:
    xml = document["content"]
    root = ET.fromstring(f"<root>{xml}</root>")
    unknown = sorted({e.tag.rsplit("}", 1)[-1] for e in root.iter()} - ALLOWED_TAGS - {"root"})
    if unknown:
        raise SyncError(f"unsupported Feishu tags: {', '.join(unknown)}")
    title_element = next((element for element in root if element.tag.rsplit("}", 1)[-1] == "title"), None)
    title = re.sub(r"\s+", " ", "".join(title_element.itertext())).strip() if title_element is not None else "AgentAlpha 社区"
    heading_ids: set[str] = set()
    nodes = [converted for element in root if (converted := convert_element(element, media, heading_ids)) is not None]
    headings = []
    for node in nodes:
        if node.get("type") == "element" and node.get("tag") in {"h1", "h2"}:
            headings.append({"level": int(node["tag"][1]), "id": node["id"], "text": plain_text_from_nodes(node["children"])})
    plain = plain_text_from_nodes(nodes)
    image_count = sum(1 for element in root.iter() if element.tag.rsplit("}", 1)[-1] == "img")
    active_tokens = {
        element.attrib["src"] for element in root.iter()
        if element.tag.rsplit("}", 1)[-1] == "img" and element.attrib.get("src")
    }
    for token in list(media):
        if token not in active_tokens:
            del media[token]
    return {
        "schemaVersion": 1,
        "source": {"provider": "Feishu", "token": TOKEN, "url": SOURCE_URL},
        "sourceRevision": int(document["revision_id"]),
        "contentHash": canonical_hash(xml),
        "syncedAt": datetime.now(timezone.utc).isoformat(),
        "title": title,
        "description": "AgentAlpha 是以技术落地、人才培养与商业共创为核心的大模型 Agent 实战社区。",
        "stats": {"characters": len(plain), "images": image_count, "uniqueImages": len(active_tokens), "headings": len(headings)},
        "headings": headings,
        "nodes": nodes,
        "plainText": plain,
    }


def verify(snapshot: dict[str, Any], media: dict[str, Any]) -> dict[str, Any]:
    failures: list[str] = []
    if snapshot.get("source", {}).get("token") != TOKEN:
        failures.append("source token mismatch")
    if not isinstance(snapshot.get("sourceRevision"), int) or snapshot["sourceRevision"] <= 0:
        failures.append("invalid source revision")
    if not isinstance(snapshot.get("stats", {}).get("images"), int) or snapshot["stats"]["images"] < 1:
        failures.append("community snapshot has no source images")
    if len(media) != snapshot.get("stats", {}).get("uniqueImages"):
        failures.append("media manifest count does not match source image count")
    missing = [item.get("path") for item in media.values() if not (ROOT / "public" / str(item.get("path", "")).lstrip("/")).is_file()]
    if missing:
        failures.append(f"missing {len(missing)} local media assets")
    if len(snapshot.get("headings", [])) < 15:
        failures.append("community outline is unexpectedly short")
    if len(snapshot.get("plainText", "")) < 10000:
        failures.append("community content is unexpectedly short")
    if failures:
        raise SyncError("; ".join(failures))
    return {
        "ok": True,
        "revision": snapshot["sourceRevision"],
        "contentHash": snapshot["contentHash"],
        "characters": snapshot["stats"]["characters"],
        "images": snapshot["stats"]["images"],
        "headings": snapshot["stats"]["headings"],
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--verify", action="store_true", help="verify the committed snapshot without Feishu access")
    args = parser.parse_args()
    try:
        media = json.loads(MEDIA_MANIFEST_PATH.read_text(encoding="utf-8")) if MEDIA_MANIFEST_PATH.exists() else {}
        if args.verify:
            snapshot = json.loads(SNAPSHOT_PATH.read_text(encoding="utf-8"))
            print(json.dumps(verify(snapshot, media), ensure_ascii=False, indent=2))
            return 0

        document = fetch_document()
        if SNAPSHOT_PATH.exists():
            existing = json.loads(SNAPSHOT_PATH.read_text(encoding="utf-8"))
            if (
                existing.get("sourceRevision") == document.get("revision_id")
                and existing.get("contentHash") == canonical_hash(document["content"])
                and isinstance(existing.get("stats", {}).get("uniqueImages"), int)
            ):
                result = verify(existing, media)
                result["unchanged"] = True
                print(json.dumps(result, ensure_ascii=False, indent=2))
                return 0
        snapshot = build_snapshot(document, media)
        write_json_atomic(MEDIA_MANIFEST_PATH, media)
        write_json_atomic(SNAPSHOT_PATH, snapshot)
        result = verify(snapshot, media)
        result["unchanged"] = False
        print(json.dumps(result, ensure_ascii=False, indent=2))
        return 0
    except (SyncError, OSError, ValueError, json.JSONDecodeError, ET.ParseError) as exc:
        print(json.dumps({"ok": False, "error": str(exc)}, ensure_ascii=False, indent=2))
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
