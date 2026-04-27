"""Seed team rosters AND singles/doubles participant lists via the API.

Usage (from apps/api directory):

    API_BASE=https://match-monitor-api.fly.dev \
    ADMIN_PASSWORD='your-admin-password' \
    python scripts/seed_teams.py

Idempotent: skips teams already present (matched by division + name) and
skips participants already present (matched by category + name + pair_no).
"""
from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.request
from http.cookiejar import CookieJar


# ---- DATA ----------------------------------------------------------------

# (team_name, department, members)
MEN_TEAMS: list[tuple[str, str, list[str]]] = [
    ("教職聯隊", "教職", ["張淑文", "林能裕", "陳姿婷", "江茂雄", "葉德銘", "林郁政", "郭金森", "羅大偉", "黃建澎"]),
    ("寶山走走", "臺大醫院", ["蘇致騏", "董牧喬", "謝向傑", "陳逸涵", "周書緯", "湯升墉", "吳定衡"]),
    ("欣梅爾不會這樣打", "社會+社工", ["潘楷文", "郭秉叡", "鍾昀庭", "曾子庭", "郭柏元", "蔡卓凌", "陳佑瑋", "李佑晴"]),
    ("我愛化學系系桌", "化學", ["劉品佑", "楊恆昱", "張予臣", "廖家翔", "黃家樑", "廖家立", "陳柏安", "李冠甫"]),
    ("B化特多", "化工", ["陳學彥", "葉哲維", "邱益山", "薛亦翰", "黃士庭", "盧柏融", "翟昱維"]),
    ("羅慶宸科技新貴", "化工+大氣", ["廖又謙", "王俊文", "竇方遠", "李翊宇", "李柏諺", "王秉豐", "羅慶宸", "許晉瑋"]),
    ("新。稻中桌球社", "教職+微生物", ["林承學", "鐘桂彬", "廖敏村", "王怡凡", "張品芷", "陳咨方", "曾冠錡", "廖先啟", "鄭憲鵬", "施錦棠", "李昀真"]),
    ("飛蚊戰隊3.0", "材料+元件材料", ["古沅翰", "謝沛岑", "顏毅翔", "黃威綸", "陳毅嘉", "張芷芸", "葉子鉉", "許祐齊", "呂昶佑"]),
    ("歡樂團體二代", "物理+環工", ["林語浩", "吳楷銘", "李羿圻", "詹易澄", "陳鈞睿", "梁濬哲", "簡琮晉"]),
    ("和氣生財", "財金+物理", ["彭育祥", "王如馨", "陳嘉均", "葉至宸", "張學丰", "陳威儒", "李若水"]),
    ("這次一定進決賽", "材料+生工", ["林士堯", "金詩翔", "王翊瑄", "蘇呈丰", "宋以恆", "陳柏澄", "洪楷恩", "劉晏維", "張詠青"]),
    ("柯奕廷只可以贏", "醫學+生機", ["陳奕成", "賴昱翔", "柯奕廷", "莊予睿", "陳彥臻", "林奕丞", "陳翊華", "劉冠熙", "蕭梓宏", "黃律勳", "沈佑謙", "陳伯恩"]),
    ("法式可頌", "法律+奈米", ["周芊妤", "鄭塏平", "陳柏豪", "陳先昱", "羅友昀", "陳睿恩", "呂學昂"]),
    ("悠悠哉哉法律人", "法律", ["周宓", "王敦愷", "王柏諺", "劉俊緯", "黃則鈞", "林韶均", "姜蕎", "侯聖新"]),
    ("主唱太乒命了", "資工", ["陳柏凱", "鄭宇宏", "方軒岷", "何浩莛", "邵愷信", "陳柏宇", "邱沐安", "呂昊宸"]),
    ("陳柏霖學長歡送派對", "資工+獸醫", ["陳柏霖", "劉宥澤", "陳愷新", "鄭乙芳", "楊文政", "周柏宇", "古庭榮", "李沅錡", "林守德"]),
    ("外心人入侵地球", "心理+外文", ["吳勝億", "羅垣鈞", "施博元", "辛永浩", "連彥儒", "曾梓恩", "陳東閱"]),
    ("從此生活有了盼頭", "經濟", ["王伯睿", "邱繼磊", "李柏俊", "張宸崧", "董祐寧", "汪宏叡", "林延里", "陳佑宸"]),
    ("羅慶祐科技新貴", "電機+機械", ["陳世庭", "李為勳", "曾柏穎", "陳陞", "謝博仲", "吳展宇", "方證嘉", "羅慶祐"]),
    ("羅慶柚香綠茶", "電機+機械", ["徐晨翰", "王梓安", "林冠安", "李家陞", "溫柏銓", "劉宣徹", "胡哲瀚", "蔡家瑜"]),
    ("我要把天賦帶去紅土球場", "電機+機械", ["陳宥禎", "陳慕義", "黃楷豫", "林家禾", "梁勝宥", "邵睿庠", "江宇峻"]),
    ("隊名集思廣益一下", "工管+資管", ["楊翔宇", "張智林", "黃泓諭", "巫奕臻", "陳宏亮", "藍立辰", "許依琳"]),
    ("所有選手", "數學", ["吳冠霆", "林朝明", "郭庭榞", "莊鎰華", "黃勤元", "許弘毅", "鐘棋閎"]),
    ("賴祥德AAOA", "動科+電機", ["房倢妤", "鄭喬至", "呂宛庭", "曾千軒", "王致堯", "葉貽謀", "陳彥傑", "魏宣丞"]),
    ("無敵67機械暴龍", "會計+工海", ["黃崇勝", "郭虹宇", "游承翰", "何啟鋼", "王柏森", "蔡佳諴", "陳禹桓"]),
    ("你有啥想法", "土木+牙醫", ["賴印霆", "邱紀凱", "侯易宏", "林柏安", "林育臣", "蔡孟勳", "吳睿瑜", "陳思辰", "蔡鎮宇"]),
    ("宇宙艦隊加達達", "機械+財金", ["鍾尚恩", "黃國豪", "曾仕達", "李彥霆", "郭家彣", "柯奕安", "朱宇謙", "鄭家昀"]),
    ("公衛系桌", "公衛+職治", ["賴禾凱", "王柏穎", "王宏恩", "柯元敦", "謝昇諺", "劉承羲", "陸育安", "黃泓嘉", "張鈞奕"]),
]

WOMEN_TEAMS: list[tuple[str, str, list[str]]] = [
    ("沒空 先叫下一桌", "農化+人類", ["余珍伊", "李宣穎", "吳沛耘"]),
    ("會(ㄎㄨㄞˋ)點交點單", "會計", ["潘姿穎", "徐沛琪", "陳翊馨", "李芳妤"]),
    ("粘ㄓㄢ姆士蕎丹", "化工+地理", ["粘蕎", "葉藴盈", "蘇筠雅", "沈姿雨"]),
    ("第一鐵點謝郡軒", "電機", ["呂依倢", "蘇絹淇", "李沛穎", "李蕎羽", "謝郡軒"]),
    ("姸出必行", "醫學+護理", ["黃榆崴", "許嘉恩", "陳姸希"]),
    ("取之於民邱紫瑜贏", "醫學+護理", ["呂文琦", "方宣穎", "邱紫瑜"]),
    ("許舒媛不許輸", "醫學+生科", ["陳育潔", "許舒媛", "魏黛甄"]),
    ("Law一手", "法律", ["蔡函紜", "林芝安", "陳鈺屏"]),
    ("法力全開", "法律", ["楊宏儀", "孫鐿榛", "曾亭瑄"]),
    ("劉志翎又贏", "資管", ["謝欣佑", "劉志翎", "汪芷瑩", "劉軒羽"]),
    ("外心人佔領地球", "外文+心理", ["陳禹欣", "黃于珊", "劉瀚云", "黃亮薰", "黃自然"]),
    ("說啥我都啊對對隊", "地質+生傳", ["張恩榕", "許皖芊", "馬玉安"]),
]


# ---- HTTP helpers --------------------------------------------------------


def _build_opener() -> urllib.request.OpenerDirector:
    return urllib.request.build_opener(
        urllib.request.HTTPCookieProcessor(CookieJar()),
    )


def _request(opener, method: str, url: str, body: dict | None = None) -> tuple[int, dict | None]:
    data = json.dumps(body).encode("utf-8") if body is not None else None
    headers = {"Content-Type": "application/json"} if body is not None else {}
    req = urllib.request.Request(url, data=data, method=method, headers=headers)
    try:
        with opener.open(req) as resp:
            payload = resp.read()
            return resp.status, (json.loads(payload) if payload else None)
    except urllib.error.HTTPError as e:
        body_text = e.read().decode("utf-8", errors="replace")
        try:
            parsed = json.loads(body_text)
        except json.JSONDecodeError:
            parsed = {"detail": body_text}
        return e.code, parsed


# ---- Seeding -------------------------------------------------------------


# ---- Participants ---------------------------------------------------------

# (department, name)
SINGLES_MEN: list[tuple[str, str]] = [
    ("社工一", "蔡卓凌"), ("外文三", "連彥儒"), ("國企碩一", "陳奕凱"), ("資工二", "鄭宇宏"),
    ("土木一", "林柏安"), ("醫學六", "賴昱翔"), ("食品科技", "林建宏"), ("生科二", "張學丰"),
    ("社會四", "潘楷文"), ("化工五", "竇方遠"), ("資工二", "趙崧瑜"), ("資工三", "邵愷信"),
    ("醫學二", "柯奕廷"), ("台大醫院骨科部住院醫師", "蘇致騏"), ("兼任助理教授", "王有德"),
    ("網媒三", "古庭榮"), ("數學碩一", "郭庭榞"), ("化工二", "陳學彥"),
    ("台大醫院泌尿部主治醫師", "董牧喬"), ("化工二", "廖又謙"), ("法律一", "王惇楷"),
    ("化工四", "李翊宇"), ("電機一", "梁勝宥"), ("機械碩一", "江宇峻"), ("數學四", "黃勤元"),
    ("資工一", "邱沐安"), ("電機三", "吳展宇"), ("網媒二", "李沅錡"), ("工管一", "藍立辰"),
    ("資工三", "彭詳睿"), ("財法二", "陳先昱"), ("機械三", "朱宇謙"), ("數學系", "林朝明"),
    ("元件材料博三", "古沅翰"), ("微生物博班", "林承學"), ("資工一", "劉宥澤"),
    ("職治二", "陸育安"), ("工管二", "陳宏亮"), ("材料碩一", "朱宸緯"), ("工海一", "劉軒綸"),
    ("土木一", "侯易宏"), ("機械碩一", "林雨霆"), ("財金一", "張辰安"), ("資管一", "張智林"),
    ("電機二", "劉宣徹"), ("醫學二", "陳彥臻"), ("機械二", "徐晨翰"), ("工海一", "郭虹宇"),
    ("化工四", "翟昱維"), ("資工二", "陳柏凱"), ("化學一", "李冠甫"), ("牙醫二", "林育臣"),
    ("地理四", "曾羿豪"), ("地質三", "黃慶智"), ("資工碩三", "周柏宇"), ("醫學五", "陳奕成"),
    ("會計四", "陳禹桓"), ("工管科組二", "楊翔宇"), ("數學五", "莊鎰華"), ("公衛三", "賴禾凱"),
    ("經濟二", "李柏俊"), ("藥理碩一", "高君宏"), ("國發碩專六", "黃燦堂"), ("機械四", "鍾尚恩"),
    ("資工一", "蕭子堯"), ("心理三", "吳勝億"), ("資工二", "王開育"), ("藥學六", "高睿辰"),
    ("會計二", "游承翰"), ("環職碩一", "王柏穎"), ("電子碩三", "李為勳"), ("資工三", "陳柏宇"),
    ("EMBA112B", "陳俊昇"), ("流預碩二", "謝昇諺"), ("會計一", "黃崇勝"), ("化工四", "林進階"),
    ("機械一", "方證嘉"), ("電子碩一", "曾柏穎"), ("經濟二", "張宸菘"), ("電子碩一", "林岳勳"),
    ("經濟二", "王伯睿"), ("電子所", "潘正諺"), ("語文中心一", "汪安龙"),
]

SINGLES_WOMEN: list[tuple[str, str]] = [
    ("心理一", "劉瀚云"), ("生工二", "林子庭"), ("工管一", "許依琳"), ("生科碩一", "陳育潔"),
    ("電機二", "呂依倢"), ("重科碩二", "蘇絹淇"), ("生科博三", "許舒媛"), ("工管一", "巫奕臻"),
    ("生傳一", "馬玉安"), ("地質一", "張恩榕"), ("經濟碩一", "洪詩涵"), ("心理一", "黃亮熏"),
    ("社工四", "曾子庭"), ("法律三", "蔡函紜"), ("化工四", "粘蕎"), ("藥學六", "劉京涵"),
    ("財金三", "王如馨"),
]

# (name_a, name_b) — each pair becomes 2 Participant rows sharing the same pair_no.
DOUBLES: list[tuple[str, str]] = [
    ("潘姿穎", "蘇品樺"), ("王常馨", "梁佳羚"), ("翁林立", "黃宇安"), ("謝沛岑", "蔡家瑜"),
    ("羅友昀", "賴印霆"), ("江茂雄", "葉德銘"), ("林能裕", "羅大偉"), ("張淑文", "陳姿婷"),
    ("張沄芳", "陳柏霖"), ("楊恆昱", "黃家樑"), ("楊宏儀", "曾亭瑄"), ("彭育祥", "陳勁宇"),
    ("林家禾", "胡峻瑋"), ("洪敏翔", "陳翊馨"), ("王秉豐", "王俊文"), ("羅慶宸", "羅慶祐"),
    ("沈姿雨", "張詠青"), ("陳宥禎", "張久致"), ("房倢妤", "鄭喬至"), ("廖翊丞", "張博榮"),
    ("李昀真", "張品芷"), ("許祐瑄", "柯奕安"), ("方軒岷", "呂昊宸"), ("黃國豪", "林以凡"),
    ("陳慕義", "黃楷豫"),
]


# ---- Seeding -------------------------------------------------------------


def _login(api_base: str, password: str) -> urllib.request.OpenerDirector:
    opener = _build_opener()
    status, _ = _request(opener, "POST", f"{api_base}/api/v1/auth/login", {"password": password})
    if status != 200:
        sys.exit(f"Login failed: HTTP {status}")
    return opener


def seed_teams(opener, api_base: str, division: str, teams: list[tuple[str, str, list[str]]]) -> None:
    status, existing = _request(opener, "GET", f"{api_base}/api/v1/teams")
    if status != 200 or not isinstance(existing, list):
        sys.exit(f"List teams failed: HTTP {status}")
    existing_keys: set[tuple[str, str]] = {(t["division"], t["name"]) for t in existing}

    created = skipped = failed = 0
    for order, (name, dept, members) in enumerate(teams):
        if (division, name) in existing_keys:
            skipped += 1
            continue
        members_text = "\n".join(m.strip() for m in members if m and m.strip())
        payload = {
            "division": division,
            "name": name,
            "department": dept,
            "members_text": members_text,
            "display_order": order,
        }
        status, body = _request(opener, "POST", f"{api_base}/api/v1/teams", payload)
        if status in (200, 201):
            created += 1
        else:
            failed += 1
            print(f"  ! {name}: HTTP {status} {body}")

    print(f"[teams/{division}] created={created} skipped={skipped} failed={failed}")


def seed_participants(opener, api_base: str) -> None:
    status, existing = _request(opener, "GET", f"{api_base}/api/v1/participants")
    if status != 200 or not isinstance(existing, list):
        sys.exit(f"List participants failed: HTTP {status}")
    # Skip-key: (category, name, pair_no) — pair_no may legitimately differ between same-named entries.
    existing_keys: set[tuple[str, str, int | None]] = {
        (p["category"], p["name"], p.get("pair_no")) for p in existing
    }

    counts = {"created": 0, "skipped": 0, "failed": 0}

    def post_one(payload: dict) -> None:
        key = (payload["category"], payload["name"], payload.get("pair_no"))
        if key in existing_keys:
            counts["skipped"] += 1
            return
        status, body = _request(opener, "POST", f"{api_base}/api/v1/participants", payload)
        if status in (200, 201):
            counts["created"] += 1
            existing_keys.add(key)
        else:
            counts["failed"] += 1
            print(f"  ! {payload['name']}: HTTP {status} {body}")

    for seed_no, (team, name) in enumerate(SINGLES_MEN, start=1):
        post_one({"category": "men_singles", "name": name, "team": team, "seed": seed_no})

    for seed_no, (team, name) in enumerate(SINGLES_WOMEN, start=1):
        post_one({"category": "women_singles", "name": name, "team": team, "seed": seed_no})

    for pair_no, (name_a, name_b) in enumerate(DOUBLES, start=1):
        for nm in (name_a, name_b):
            post_one({"category": "doubles", "name": nm, "pair_no": pair_no})

    print(f"[participants] created={counts['created']} skipped={counts['skipped']} failed={counts['failed']}")


def main() -> None:
    api_base = os.environ.get("API_BASE", "http://localhost:8000").rstrip("/")
    password = os.environ.get("ADMIN_PASSWORD")
    if not password:
        sys.exit("Missing ADMIN_PASSWORD env var")

    opener = _login(api_base, password)

    if MEN_TEAMS:
        seed_teams(opener, api_base, "men", MEN_TEAMS)
    if WOMEN_TEAMS:
        seed_teams(opener, api_base, "women", WOMEN_TEAMS)
    if SINGLES_MEN or SINGLES_WOMEN or DOUBLES:
        seed_participants(opener, api_base)


if __name__ == "__main__":
    main()
