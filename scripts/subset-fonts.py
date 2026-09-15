# -*- coding: utf-8 -*-
"""MiSans 字体子集化：把 public/fonts/*.woff2 按全站实际用字裁剪（约 3MB→780KB/字重）。

字符集 = scripts/font-charset.txt（全站内容 + 公众号历史语料，约 5950 字）。
新增大字内容后重跑本脚本即可（日更自动化加文章后建议跑一次）：
    pip install fonttools brotli
    python scripts/subset-fonts.py
"""
import io
import os
import glob
from fontTools.subset import Subsetter, Options, save_font
from fontTools.ttLib import TTFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CHARSET = os.path.join(ROOT, "scripts", "font-charset.txt")

chars = set(io.open(CHARSET, encoding="utf-8").read().strip())
# 站内字符保底合并（防止 charset 文件落后于内容）
for pat in ["locales/*.json", "content/**/*.md", "content/**/*.json",
            "components/**/*.tsx", "app/**/*.tsx"]:
    for f in glob.glob(os.path.join(ROOT, pat), recursive=True):
        chars.update(io.open(f, encoding="utf-8", errors="ignore").read())
chars.update(chr(c) for c in range(0x20, 0x7F))
text = "".join(chars)
cjk = sum(1 for c in chars if "\u4e00" <= c <= "\u9fff")
print(f"字符集 {len(chars)} 字（CJK {cjk}）")

for w in ["Regular", "Medium", "Bold"]:
    src = os.path.join(ROOT, "public", "fonts", f"MiSans-{w}.woff2")
    tmp = src + ".tmp"
    size_before = os.path.getsize(src)
    font = TTFont(src)
    opt = Options()
    opt.flavor = "woff2"
    opt.desubroutinize = True
    opt.layout_features = ["*"]
    opt.name_IDs = [1, 2, 3, 4, 6]
    ss = Subsetter(options=opt)
    ss.populate(text=text)
    ss.subset(font)
    save_font(font, tmp, opt)
    font.close()
    os.replace(tmp, src)
    print(f"{w}: {size_before//1024}KB -> {os.path.getsize(src)//1024}KB")
print("DONE")
