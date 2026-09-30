# -*- coding: utf-8 -*-
"""/projects 插画重生成（unikeyx，gpt-image-2.5-flare，quality=low，DeepSeek 女生人设，与社区页同人设）
本机 DNS 把 www.unikeyx.com 解析到证书不匹配的 IPv6 CDN 节点，强制 urllib 走 IPv4。"""
import base64, json, mimetypes, os, socket, ssl, time, urllib.request

_orig_getaddrinfo = socket.getaddrinfo
def _ipv4_getaddrinfo(host, port, family=0, type=0, proto=0, flags=0):
    return _orig_getaddrinfo(host, port, socket.AF_INET, type, proto, flags)
socket.getaddrinfo = _ipv4_getaddrinfo

KEY = open("C:/Users/40825/.unikeyx/key.txt").read().strip()
API = "https://www.unikeyx.com/v1/images/edits"
REFS = r"C:/Users/40825/.zcode/skills/gzh-article/refs"
OUT = r"H:/myCODE/xhs-pic/_repos/agentalpha_web/public/projects/assets/img"
os.makedirs(OUT, exist_ok=True)

PERSONA = ("画面中的Q版可爱女生与参考图为同一人设：深蓝渐变长发（发尾浅蓝）、头顶一根呆毛、蓝色大眼睛带星星高光、"
           "粉嫩腮红、深藏青女仆连衣裙配白色围裙（围裙下摆有小鲸鱼图案）、白色荷叶边女仆头饰、两侧蓝色蝴蝶结、白袜黑鞋。")
STYLE = ("整体扁平手绘知识科普插画风，线条柔和干净上色，像高质量动漫周边贴纸；"
         "配色只用深蓝色、砖红色、灰色、奶油米白色，背景奶油米白色；"
         "主体构图集中在画面中部安全区，上下留空白边距；"
         "不要写实风，不要粗糙笔触，不要变形的脸、眼睛和手。文字必须清晰正确、无乱码。")
WM = "右下角蓝色手写体小水印「agentAlpha」。"

R1 = os.path.join(REFS, "meme_ref1_notebook_count.jpg")
R2 = os.path.join(REFS, "meme_ref2_split_bluff.jpg")
R3 = os.path.join(REFS, "ref2_girl_flow.png")

JOBS = [
    ("hero", [R1, R3], "1024x1024",
     PERSONA +
     "女生站在一段由十块大号圆角积木搭成的阶梯旁，每块积木上有一个小图标（放大镜、书本、机器人、放大镜火箭、齿轮、代码括号等，不写文字），"
     "阶梯顶端悬浮一颗小火箭；女生爬到中段回头挥手，表情元气满满。" + STYLE + WM),
    ("cover-m1", [R1, R3], "1536x1024",
     PERSONA +
     "女生站在一大摞金融研报文档旁，手持一把大号放大镜检视最上面一份，放大镜圆框里透出一个砖红色对勾引用标注；"
     "旁边漂浮两份带句级高亮线的文档和小放大镜贴纸。" + STYLE + WM),
    ("cover-m2", [R2, R3], "1536x1024",
     PERSONA +
     "女生站在一个三层的圆角记忆抽屉柜前，拉开其中一层，抽屉里飘出几张记忆便签和小星星；"
     "女生头顶漂浮一个由圆点连线组成的小知识图谱。" + STYLE + WM),
    ("cover-m3", [R1], "1536x1024",
     PERSONA +
     "女生站在一个大号圆角循环箭头环中央，环上均匀分布三个小图标（对话气泡、扳手、对勾），箭头呈顺时针循环；"
     "女生一手叉腰一手扶着扳手，表情自信。" + STYLE + WM),
    ("cover-m4", [R2, R3], "1536x1024",
     PERSONA +
     "女生站在圆桌旁指挥四个不同颜色围巾的圆角小机器人开会，桌上摊着一份图表文档；"
     "四个小机器人头顶各有不同小图标（放大镜、图表、笔、盾牌），女生抬手指向白板方向。" + STYLE + WM),
    ("cover-m5", [R1, R2], "1536x1024",
     PERSONA +
     "女生戴着潜水镜和浮潜装备，潜入一片由文档页组成的浅蓝色「纸海」，伸手去够一枚发光的珍珠（引用答案）；"
     "纸海里飘着几个问号气泡和一盏小探照灯。" + STYLE + WM),
    ("cover-m6", [R3, R1], "1536x1024",
     PERSONA +
     "女生推着一个大号圆角服务器机箱，机箱背后喷出火箭尾焰般的速度线，机箱屏幕上显示上升的仪表盘箭头；"
     "女生身体前倾用力推，表情用力又开心。" + STYLE + WM),
    ("cover-m7", [R2, R1], "1536x1024",
     PERSONA +
     "女生坐在大号笔记本电脑前修代码，屏幕上是一个缺口拼图和一个补丁方块正被她用扳手嵌进去；"
     "屏幕上方盖一个砖红色「fixed」小旗帜，旁边漂浮两个小对勾。" + STYLE + WM),
    ("cover-m8", [R3], "1536x1024",
     PERSONA +
     "女生站在一个大号圆角进化环旁，环上依次排列毛毛虫、茧、蝴蝶三个阶段的贴纸；"
     "环顶端的蝴蝶最大最亮眼，女生伸手轻推蝴蝶，表情充满期待。" + STYLE + WM),
    ("cover-m9", [R1, R2], "1536x1024",
     PERSONA +
     "女生蹲在一个圆角小狗机器人旁边训练它，小狗机器人做坐下动作，头顶落下一颗砖红色星星奖励；"
     "女生手里拿着一罐星星贴纸，地上有分数上升的小折线图。" + STYLE + WM),
    ("cover-m10", [R1, R3], "1536x1024",
     PERSONA +
     "女生头戴歪歪的学士帽，双手高举一张毕业证书，证书上只画一个大对勾和缎带（不写字）；"
     "女生身旁漂浮十枚圆角小徽章，每个徽章上有一个不同的小图标，围成拱门形。" + STYLE + WM),
]

def build_multipart(fields, files):
    boundary = "----wxproj2026"
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
    with urllib.request.urlopen(req, timeout=420, context=ssl.create_default_context()) as r:
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
        (ok if done else fail).append(name)
        time.sleep(2)
    print("\ndone: %d ok, %d fail %s" % (len(ok), len(fail), fail), flush=True)

if __name__ == "__main__":
    main()
