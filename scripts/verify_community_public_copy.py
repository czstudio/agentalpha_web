#!/usr/bin/env python3
"""Fail the build when internal publishing metadata leaks into public community UI."""

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PUBLIC_SURFACES = (
    ROOT / "app/community",
    ROOT / "app/llms.txt",
    ROOT / "components/community",
    ROOT / "lib/community/content.ts",
)
FORBIDDEN = (
    "内容来源",
    "飞书原文",
    "当前版本",
    "原文图片",
    "同步自飞书",
    "内容更新说明",
    "59 张",
    "r853",
    "Source revision",
)


def iter_files(path: Path):
    if path.is_file():
        yield path
        return
    yield from (item for item in path.rglob("*") if item.is_file())


def main() -> int:
    failures: list[str] = []
    for surface in PUBLIC_SURFACES:
        for path in iter_files(surface):
            text = path.read_text(encoding="utf-8")
            for phrase in FORBIDDEN:
                if phrase in text:
                    failures.append(f"{path.relative_to(ROOT)}: contains blocked public copy")

    if failures:
        print("COMMUNITY_PUBLIC_COPY_REJECTED")
        print("\n".join(failures))
        return 1

    print("COMMUNITY_PUBLIC_COPY_OK")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
