#!/bin/bash
# Smoke test — 每輪 UI/backend 改動後跑一遍
# 用法：bash backend/scripts/smoke-test.sh
# 檢查：所有 frontend routes 回 200、所有 API endpoint 有預期資料、分頁邏輯正確

set -u
API=http://localhost:3000/api
WEB=http://localhost:5173

PASS=0; FAIL=0
pass() { echo "  ✓ $1"; PASS=$((PASS+1)); }
fail() { echo "  ✗ $1"; FAIL=$((FAIL+1)); }

echo "== Frontend routes =="
for path in / /camera /markets /calendar /url /collection /keywords /inbox /search /history /accounts /jimoty /gov-auctions /gov-auctions/guide /knowledge /pipeline; do
  code=$(curl -sS -o /dev/null -w "%{http_code}" "$WEB$path")
  [ "$code" = "200" ] && pass "GET $path → 200" || fail "GET $path → $code"
done

echo ""
echo "== Backend APIs =="
check_json() {
  local name=$1; local url=$2; local jq_check=$3
  local body=$(curl -sS "$url")
  local result=$(echo "$body" | /usr/bin/python3 -c "import json,sys
d=json.load(sys.stdin)
try:
  print('OK' if $jq_check else 'FAIL')
except Exception as e:
  print('ERR', e)
" 2>&1)
  if [[ "$result" == OK* ]]; then
    pass "$name"
  else
    fail "$name → $result"
  fi
}

check_json "GET /health"                    "$API/health"                      "d['status']=='ok'"
check_json "GET /markets (18 筆)"           "$API/markets"                     "len(d['data'])>=15"
check_json "GET /events (預設 60 天)"        "$API/events"                      "isinstance(d['data'],list) and 'range' in d"
check_json "GET /keywords (3+ active)"       "$API/keywords"                    "len(d['data'])>=3 and 'supportedSites' in d"
check_json "GET /keywords/inbox"             "$API/keywords/inbox?days=7"       "'pagination' in d and 'perKeyword' in d and isinstance(d['data'],list)"
check_json "GET /appraisal/stats"            "$API/appraisal/stats?days=30"     "d['data']['total']>=0"
check_json "GET /appraisal/history"          "$API/appraisal/history?days=30"   "isinstance(d['data'],list)"
check_json "GET /appraisal/collection"       "$API/appraisal/collection"        "isinstance(d['data'],list)"
check_json "GET /search?q=昭和"              "$API/search?q=%E6%98%AD%E5%92%8C" "isinstance(d['data']['groups'],list)"
check_json "GET /auth/status (4 站)"         "$API/auth/status"                 "len(d['data'])==4"
check_json "GET /jimoty/favorites (需 auth)" "$API/jimoty/favorites"            "isinstance(d.get('data'),list)"
check_json "GET /gov-auctions?category=car"  "$API/gov-auctions?category=car"   "isinstance(d['data'],list) and d['total']>=0"
check_json "GET /gov-auctions?category=general" "$API/gov-auctions?category=general" "isinstance(d['data'],list) and d['total']>=0"
check_json "GET /knowledge"                  "$API/knowledge"                   "isinstance(d['data'],list) and 'stats' in d"
check_json "GET /auction-sources (8 站)"     "$API/auction-sources"             "d['count']>=8 and any(s['id']=='ksi' for s in d['data'])"
check_json "GET /auction-rounds"             "$API/auction-rounds"              "isinstance(d['data'],list)"

echo ""
echo "== Pagination logic =="
# 用 python 一次算好，避免 bash 逃逸問題
/usr/bin/python3 << 'PYEOF'
import json, urllib.request
API = "http://localhost:3000/api"
LIMIT = 10

def get(url):
    return json.loads(urllib.request.urlopen(url).read())

first = get(f"{API}/keywords/inbox?days=7&limit={LIMIT}&offset=0")
total = first['pagination']['total']
pages = (total + LIMIT - 1) // LIMIT
acc = 0
for p in range(pages):
    d = get(f"{API}/keywords/inbox?days=7&limit={LIMIT}&offset={p*LIMIT}")
    acc += len(d['data'])
print(f"  ✓ 分頁：total={total}、{pages} 頁累積 {acc}" if acc == total else f"  ✗ 分頁 mismatch: total={total} acc={acc}")

# 最後一頁 hasMore=False
last = get(f"{API}/keywords/inbox?days=7&limit={LIMIT}&offset={(pages-1)*LIMIT}")
hm = last['pagination']['hasMore']
print(f"  ✓ hasMore 最後一頁 = false" if hm == False else f"  ✗ hasMore 最後一頁 = {hm}")

# 第 1 頁 hasMore 若 total > LIMIT 應為 true
if total > LIMIT:
    first_hm = first['pagination']['hasMore']
    print(f"  ✓ hasMore 第 1 頁 = true" if first_hm == True else f"  ✗ hasMore 第 1 頁 = {first_hm}")
PYEOF

echo ""
echo "== Keyword filter =="
for kw in パジェロ ハイラックスサーフ エクスプローラ; do
  ENC=$(/usr/bin/python3 -c "import urllib.parse; print(urllib.parse.quote('$kw'))")
  N=$(curl -sS "$API/keywords/inbox?days=7&keyword=$ENC" | /usr/bin/python3 -c "import json,sys; d=json.load(sys.stdin); print(len(d['data']))")
  [ "$N" -ge 0 ] && pass "keyword=$kw filter → $N 筆" || fail "keyword=$kw filter 失敗"
done

echo ""
echo "== 收件夾內容合理性（依 keyword categoryHint）=="
PROBLEMS=$(/usr/bin/python3 << 'PYEOF'
import json, urllib.request, re
API = "http://localhost:3000/api"
def get(u): return json.loads(urllib.request.urlopen(u).read())
kws = {k['keyword']: k for k in get(f'{API}/keywords')['data']}
inbox = get(f'{API}/keywords/inbox?days=7&limit=200')['data']
CAR_MARKERS = re.compile(r'(万\s*km|車検|年式|H\d{1,2}年|平成\d+|令和\d+|20\d\d年|支払.*総額|総額\s*\d+\s*万|走行|4WD|CVT|MT車|AT車|5MT|6MT|本体|実動|名義変更|修復歴)')
bad = []
for i in inbox:
    kw = kws.get(i['keyword'])
    if not kw: continue
    hint = kw.get('categoryHint')
    t = i['title'] or ''
    is_jmty_car = '/car-' in i['sourceUrl']
    if hint == 'car':
        if i['site'] == 'jimoty' and not is_jmty_car:
            bad.append(f"[{i['keyword']}] jimoty non-car: {t[:40]}")
        elif i['site'] == 'yahoo_auction' and not CAR_MARKERS.search(t):
            bad.append(f"[{i['keyword']}] YA no marker: {t[:40]}")
    elif hint == 'antique':
        if i['site'] == 'jimoty' and is_jmty_car:
            bad.append(f"[{i['keyword']}] antique but /car-: {t[:40]}")
print('OK' if not bad else f'bad={len(bad)}: ' + '; '.join(bad[:3]))
PYEOF
)
[[ "$PROBLEMS" == OK* ]] && pass "listing 都符合 categoryHint" || fail "$PROBLEMS"

echo ""
echo "==================================="
echo "PASS $PASS / FAIL $FAIL"
[ "$FAIL" = "0" ] && exit 0 || exit 1
