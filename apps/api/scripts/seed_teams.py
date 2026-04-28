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

# (department, name, student_id) — student_id all-uppercase or None.
SINGLES_MEN: list[tuple[str, str, str | None]] = [
    ("社工一", "蔡卓凌", "B14310047"),
    ("外文三", "連彥儒", "B12102123"),
    ("國企碩一", "陳奕凱", "R14724034"),
    ("資工二", "鄭宇宏", "B13902103"),
    ("土木一", "林柏安", "B14501025"),
    ("醫學六", "賴昱翔", "B09401077"),
    ("食品科技", "林建宏", "R13641038"),
    ("生科二", "張學丰", "B13B01033"),
    ("社會四", "潘楷文", "B11305003"),
    ("化工五", "竇方遠", "B10504074"),
    ("資工二", "趙崧瑜", "B13902039"),
    ("資工三", "邵愷信", "B12902117"),
    ("醫學二", "柯奕廷", "B13401008"),
    ("台大醫院骨科部住院醫師", "蘇致騏", "B05401015"),
    ("兼任助理教授", "王有德", "28390"),
    ("網媒三", "古庭榮", "R12944048"),
    ("數學碩一", "郭庭榞", "R14221015"),
    ("化工二", "陳學彥", "B13504032"),
    ("台大醫院泌尿部主治醫師", "董牧喬", "員工編號128497"),
    ("化工二", "廖又謙", "B13504034"),
    ("法律一", "王惇楷", "B14A01135"),
    ("化工四", "李翊宇", "B11504061"),
    ("電機一", "梁勝宥", "B14901048"),
    ("機械碩一", "江宇峻", "R14522113"),
    ("數學四", "黃勤元", "B11201009"),
    ("資工一", "邱沐安", "B14902031"),
    ("電機三", "吳展宇", "B12502134"),
    ("網媒二", "李沅錡", "R13944007"),
    ("工管一", "藍立辰", "B14701109"),
    ("資工三", "彭詳睿", "B12902054"),
    ("財法二", "陳先昱", "B13A01356"),
    ("機械三", "朱宇謙", "B12502096"),
    ("數學系", "林朝明", "28173"),
    ("元件材料博三", "古沅翰", "F11K43015"),
    ("微生物博班", "林承學", "D09445001"),
    ("資工一", "劉宥澤", "B14902004"),
    ("職治二", "陸育安", "B13409040"),
    ("工管二", "陳宏亮", "B13701106"),
    ("材料碩一", "朱宸緯", "R14527001"),
    ("工海一", "劉軒綸", "B14505004"),
    ("土木一", "侯易宏", "B14501006"),
    ("機械碩一", "林雨霆", "R14522721"),
    ("財金一", "張辰安", "B14703022"),
    ("資管一", "張智林", "B14705050"),
    ("電機二", "劉宣徹", "B12505051"),
    ("醫學二", "陳彥臻", "B13401016"),
    ("機械二", "徐晨翰", "B13502027"),
    ("工海一", "郭虹宇", "B14505025"),
    ("化工四", "翟昱維", "B10504123"),
    ("資工二", "陳柏凱", "B13902106"),
    ("化學一", "李冠甫", "B14203022"),
    ("牙醫二", "林育臣", "B13402004"),
    ("地理四", "曾羿豪", "B11208038"),
    ("地質三", "黃慶智", "B12204007"),
    ("資工碩三", "周柏宇", "R12922222"),
    ("醫學五", "陳奕成", "B10401124"),
    ("會計四", "陳禹桓", "B11702045"),
    ("工管科組二", "楊翔宇", "B13701242"),
    ("數學五", "莊鎰華", "B10201029"),
    ("公衛三", "賴禾凱", "B12801022"),
    ("經濟二", "李柏俊", "B13303012"),
    ("藥理碩一", "高君宏", "R14443015"),
    ("國發碩專六", "黃燦堂", "P08341023"),
    ("機械四", "鍾尚恩", "B11502183"),
    ("資工一", "蕭子堯", "B14902063"),
    ("心理三", "吳勝億", "B12207038"),
    ("資工二", "王開育", "B13902152"),
    ("藥學六", "高睿辰", "B09403006"),
    ("會計二", "游承翰", "B13702104"),
    ("環職碩一", "王柏穎", None),
    ("電子碩三", "李為勳", "R12943036"),
    ("資工三", "陳柏宇", "B12902131"),
    ("EMBA112B", "陳俊昇", "P12745022"),
    ("流預碩二", "謝昇諺", "R13849017"),
    ("會計一", "黃崇勝", "B14702047"),
    ("化工四", "林進階", "B11504102"),
    ("機械一", "方證嘉", "B14502019"),
    ("電子碩一", "曾柏穎", "R14943079"),
    ("經濟二", "張宸菘", "B13605014"),
    ("電子碩一", "林岳勳", "R14943166"),
    ("經濟二", "王伯睿", "B13303072"),
    ("電子所", "潘正諺", "R12943154"),
    ("語文中心一", "汪安龙", "L14S21150"),
    ("測試用", "陳愷新", "R14944026"),
]

SINGLES_WOMEN: list[tuple[str | None, str, str | None]] = [
    ("心理一", "劉瀚云", "B14207075"),
    ("生工二", "林子庭", "B13602042"),
    ("工管一", "許依琳", "B14701101"),
    ("生科碩一", "陳育潔", "R14B21042"),
    ("電機二", "呂依倢", "B13901151"),
    ("重科碩二", "蘇絹淇", "R13K41018"),
    ("生科博三", "許舒媛", "D11B46015"),
    ("工管一", "巫奕臻", "B14701227"),
    ("生傳一", "馬玉安", "B14610043"),
    ("地質一", "張恩榕", "B14204012"),
    ("經濟碩一", "洪詩涵", "R13323037"),
    ("心理一", "黃亮熏", "B14207070"),
    ("社工四", "曾子庭", "B11310003"),
    ("法律三", "蔡函紜", "B12A01309"),
    ("化工四", "粘蕎", "B11603052"),
    ("藥學六", "劉京涵", "B09403021"),
    ("財金三", "王如馨", "B12703001"),
]

# (name_a, student_id_a, name_b, student_id_b) — each pair becomes 2 Participant rows sharing the same pair_no.
# student_id may also hold staff role text ("教授" 之類) when the player isn't a student.
DOUBLES: list[tuple[str, str | None, str, str | None]] = [
    ("潘姿穎", "B13702001", "蘇品樺", "B11302260"),
    ("王常馨", "R13625030", "梁佳羚", "R14245008"),
    ("翁林立", "B13408043", "黃宇安", "B11208039"),
    ("謝沛岑", "B11507005", "蔡家瑜", "B12502084"),
    ("羅友昀", "B11A01360", "賴印霆", "B11501159"),
    ("江茂雄", "教授", "葉德銘", "教授"),
    ("林能裕", "副教授", "羅大偉", "醫檢師"),
    ("張淑文", "助教", "陳姿婷", "老師"),
    ("張沄芳", "R13H42007", "陳柏霖", "B11902154"),
    ("楊恆昱", "R13223103", "黃家樑", "B11203004"),
    ("楊宏儀", "R11A21051", "曾亭瑄", "R11A21070"),
    ("彭育祥", "B14703038", "陳勁宇", "B14704036"),
    ("林家禾", "B14901084", "胡峻瑋", "B14401113"),
    ("洪敏翔", "R14943154", "陳翊馨", "B10702109"),
    ("王秉豐", "R14524031", "王俊文", "R14229015"),
    ("羅慶宸", "R13549014", "羅慶祐", "B13901192"),
    ("沈姿雨", "X3433", "張詠青", "R12622003"),
    ("陳宥禎", "B11502150", "張久致", "B11607009"),
    ("房倢妤", "B10606002", "鄭喬至", "R14921040"),
    ("廖翊丞", "B10302261", "張博榮", "B10305023"),
    ("李昀真", "教職員", "張品芷", "教職員"),
    ("許祐瑄", "B10102052", "柯奕安", "B12502039"),
    ("方軒岷", "B14902105", "呂昊宸", "B14902107"),
    ("黃國豪", "B12502033", "林以凡", "教授"),
    ("陳慕義", "B11901094", "黃楷豫", "R14K41008"),
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
    # Index by (category, name, pair_no) for upsert lookups.
    existing_by_key: dict[tuple[str, str, int | None], dict] = {
        (p["category"], p["name"], p.get("pair_no")): p for p in existing
    }

    counts = {"created": 0, "updated": 0, "skipped": 0, "failed": 0}

    def upsert(payload: dict) -> None:
        key = (payload["category"], payload["name"], payload.get("pair_no"))
        if key in existing_by_key:
            current = existing_by_key[key]
            # Only PATCH fields where new value is non-None and differs (don't clear with None).
            diff: dict = {}
            for f in ("team", "student_id", "seed", "pair_no"):
                new_v = payload.get(f)
                if new_v is not None and current.get(f) != new_v:
                    diff[f] = new_v
            if not diff:
                counts["skipped"] += 1
                return
            status, body = _request(
                opener, "PATCH", f"{api_base}/api/v1/participants/{current['id']}", diff
            )
            if status in (200, 201):
                counts["updated"] += 1
                existing_by_key[key] = body  # refresh
            else:
                counts["failed"] += 1
                print(f"  ! {payload['name']} (PATCH): HTTP {status} {body}")
            return
        # Create new
        status, body = _request(opener, "POST", f"{api_base}/api/v1/participants", payload)
        if status in (200, 201):
            counts["created"] += 1
            existing_by_key[key] = body
        else:
            counts["failed"] += 1
            print(f"  ! {payload['name']} (POST): HTTP {status} {body}")

    for seed_no, (team, name, sid) in enumerate(SINGLES_MEN, start=1):
        upsert({
            "category": "men_singles",
            "name": name,
            "team": team,
            "student_id": sid.upper() if sid else None,
            "seed": seed_no,
        })

    for seed_no, (team, name, sid) in enumerate(SINGLES_WOMEN, start=1):
        upsert({
            "category": "women_singles",
            "name": name,
            "team": team,
            "student_id": sid.upper() if sid else None,
            "seed": seed_no,
        })

    for pair_no, (name_a, sid_a, name_b, sid_b) in enumerate(DOUBLES, start=1):
        for nm, sid in ((name_a, sid_a), (name_b, sid_b)):
            payload: dict = {"category": "doubles", "name": nm, "pair_no": pair_no}
            if sid:
                payload["student_id"] = sid.upper()
            upsert(payload)

    print(
        f"[participants] created={counts['created']} updated={counts['updated']} "
        f"skipped={counts['skipped']} failed={counts['failed']}"
    )


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
