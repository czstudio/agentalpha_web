# -*- coding: utf-8 -*-
"""社区页插画生成（unikeyx images/edits，gpt-image-2.5-flare，quality=low，DeepSeek 女生人设）"""
import base64, json, mimetypes, os, socket, ssl, time, urllib.request

# 本机 DNS 把 www.unikeyx.com 解析到证书不匹配的 IPv6 CDN 节点，强制 urllib 走 IPv4
_orig_getaddrinfo = socket.getaddrinfo
def _ipv4_getaddrinfo(host, port, family=0, type=0, proto=0, flags=0):
    return _orig_getaddrinfo(host, port, socket.AF_INET, type, proto, flags)
socket.getaddrinfo = _ipv4_getaddrinfo

KEY = open("C:/Users/40825/.unikeyx/key.txt").read().strip()
API = "https://www.unikeyx.com/v1/images/edits"
REFS = r"C:/Users/40825/.zcode/skills/gzh-article/refs"
OUT = r"H:/myCODE/xhs-pic/_repos/agentalpha_web/public/images/community/illus"
os.makedirs(OUT, exist_ok=True)

PERSONA = ("画面中的Q版可爱女生与参考图为同一人设：深蓝渐变长发（发尾浅蓝）、头顶一根呆毛、蓝色大眼睛带星星高光、"
           "粉嫩腮红、深藏青女仆连衣裙配白色围裙（围裙下摆有小鲸鱼图案）、白色荷叶边女仆头饰、两侧蓝色蝴蝶结、白袜黑鞋。")
STYLE = ("整体扁平手绘知识科普插画风，线条柔和干净上色，像高质量动漫周边贴纸；"
         "配色只用深蓝色、砖红色、灰色、奶油米白色；奶油米白色背景；"
         "不要写实风，不要粗糙笔触，不要变形的脸、眼睛和手。文字必须清晰正确、无乱码。")
WM = "右下角蓝色手写体小水印「agentAlpha」。"

R1 = os.path.join(REFS, "meme_ref1_notebook_count.jpg")
R2 = os.path.join(REFS, "meme_ref2_split_bluff.jpg")
R3 = os.path.join(REFS, "ref2_girl_flow.png")

JOBS = [
    ("hero", [R1, R3], "1024x1024",
     PERSONA +
     "女生站在画面左侧，右手与一个漂浮的圆角蓝色小机器人击掌（high five），机器人有笑脸屏幕；"
     "两人周围漂浮着贴纸元素：一卷论文、一个代码括号符号「</>」、一颗小火箭、一颗星星。"
     "女生表情开心自信。" + STYLE + WM),
    ("what", [R1, R2], "1024x1024",
     PERSONA +
     "女生站在画面右侧，身旁堆着三块大号圆角积木，积木上分别写着「Idea2Paper」「InkOS」「潜艇AI」，"
     "积木堆顶上放一面小旗子；女生左手叉腰，右手竖起大拇指，表情得意。" + STYLE + WM),
    ("proj-idea2paper", [R1, R3], "1024x1024",
     PERSONA +
     "女生坐在书桌前写论文，桌上摊着稿纸和一支大钢笔，头顶漂浮一枚小纸火箭和一个论文卷轴；"
     "女生认真低头书写，脸颊旁有一个小的对勾气泡。" + STYLE + WM),
    ("proj-inkos", [R2, R3], "1024x1024",
     PERSONA +
     "女生坐在笔记本电脑前写小说，屏幕上飘出一条由汉字字符组成的彩色文字流，环绕在屏幕周围；"
     "女生手边放一杯热可可，表情专注微笑。" + STYLE + WM),
    ("path-career", [R1], "1024x1024",
     PERSONA +
     "女生站在一块白板前，白板上贴着三张便利贴和一个上升箭头；女生一手拿马克笔一手指向箭头，"
     "表情认真有干劲。构图简洁，元素少。" + STYLE + WM),
    ("path-academy", [R2], "1024x1024",
     PERSONA +
     "女生抱着一摞书站在一小堆书旁，头顶戴着一顶小小的学士帽（歪戴），书堆上放着一个毕业卷轴；"
     "女生眨一只眼微笑。构图简洁，元素少。" + STYLE + WM),
    ("path-industry", [R3], "1024x1024",
     PERSONA +
     "女生站在一个小店铺柜台后，柜台上有一台平板收银机和一个向上箭头价签；"
     "女生一手托盘一手比 OK 手势，笑容满面。构图简洁，元素少。" + STYLE + WM),
    ("cta", [R1, R2], "1024x1024",
     PERSONA +
     "女生站在一块大白板旁边向观者招手，白板上写着大号粗体字「一起把事做成」，白板下沿有一个小鲸鱼涂鸦；"
     "女生笑容灿烂，身边漂浮两颗星星。" + STYLE + WM),
]

def build_multipart(fields, files):
    boundary = "----wxcommunity2026"
    lines = []
    for k, v in fields.items():
        lines.append("--%s\r\nContent-Disposition: form-data; name=\"%s\"\r\n\r\n%s\r\n" % (boundary, k, v))
    for k, path in files:
        with open(path, "rb") as f:
            data = f.read()
        mime = mimetypes.guess_type(path)[0] or "image/png"
        lines.append("--%s\r\nContent-Disposition: form-data; name=\"%s\"; filename=\"%s\"\r\n"
                     "Content-Type: %s\r\n\r\n" % (boundary, k, os.path.basename(path), mime))
        lines.append(data)
        lines.append("\r\n")
    lines.append("--%s--\r\n" % boundary)
    body = b""
    for ln in lines:
        body += ln if isinstance(ln, bytes) else ln.encode("utf-8")
    return body, "multipart/form-data; boundary=" + boundary

def gen(prompt, refs, size):
    body, ctype = build_multipart(
        {"model": "gpt-image-2.5-flare", "prompt": prompt, "size": size, "n": "1", "quality": "low"},
        [("image[]", p) for p in refs])
    req = urllib.request.Request(API, data=body, headers={
        "Authorization": "Bearer " + KEY, "Content-Type": ctype}, method="POST")
    # 本机对 unikeyx 的 CDN 解析偶发拿到证书主机名不匹配的节点，先正常校验、失败换不校验上下文重试
    try:
        with urllib.request.urlopen(req, timeout=420, context=ssl.create_default_context()) as r:
            resp = json.load(r)
    except (ssl.SSLCertVerificationError, urllib.error.URLError) as e:
        if "certificate" not in str(e).lower() and "ssl" not in str(e).lower():
            raise
        print("  ..cert fallback", flush=True)
        req2 = urllib.request.Request(API, data=body, headers={
            "Authorization": "Bearer " + KEY, "Content-Type": ctype}, method="POST")
        ctx = ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE
        with urllib.request.urlopen(req2, timeout=420, context=ctx) as r:
            resp = json.load(r)
    d = resp["data"][0]
    if d.get("b64_json"):
        return base64.b64decode(d["b64_json"])
    if d.get("url"):
        with urllib.request.urlopen(d["url"], timeout=120, context=ssl.create_default_context()) as r2:
            return r2.read()
    raise RuntimeError("no image: %s" % str(resp)[:200])

def main():
    only = os.sys.argv[1].split(",") if len(os.sys.argv) > 1 else None
    ok, fail = [], []
    for name, refs, size, prompt in JOBS:
        if only and not any(o in name for o in only):
            continue
        out = os.path.join(OUT, name + ".png")
        if os.path.exists(out) and os.path.getsize(out) > 50_000:
            print("SKIP", name, flush=True)
            ok.append(name)
            continue
        done = False
        for attempt in range(3):
            try:
                data = gen(prompt, refs, size)
                with open(out, "wb") as f:
                    f.write(data)
                print("OK", name, len(data) // 1024, "KB", flush=True)
                done = True
                break
            except Exception as e:
                print("RETRY", name, attempt, str(e)[:120], flush=True)
                time.sleep(8)
        if done:
            ok.append(name)
        else:
            fail.append(name)
        time.sleep(2)
    print("\ndone: %d ok, %d fail %s" % (len(ok), len(fail), fail), flush=True)

if __name__ == "__main__":
    main()
