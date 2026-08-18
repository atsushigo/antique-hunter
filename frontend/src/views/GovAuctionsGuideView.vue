<template>
  <v-container class="px-3 pb-16 guide">
    <div class="d-flex align-center mb-3">
      <v-btn size="small" variant="text" prepend-icon="mdi-arrow-left" @click="$router.push('/gov-auctions')">回拍賣</v-btn>
      <v-spacer />
    </div>
    <div class="text-h5 mb-3">KSI 官公庁オークション 入門手冊</div>

    <v-alert type="info" variant="tonal" density="compact" class="mb-4">
      [redacted]；距離取最小值 +（武）/（通）標記。
      有車 → 20-50km 內都可自取，省 ¥3-10k 運費。
    </v-alert>

    <h2>這是什麼？</h2>
    <p>
      KSI 官公庁オークション（<a href="https://kankocho.jp" target="_blank">kankocho.jp</a>）是日本官方拍賣平台，
      統一承辦 <b>國稅局</b>、<b>各都道府縣稅務局</b>、<b>警視庁遺失物</b> 拍賣。
      物件來源：
    </p>
    <ul>
      <li><b>稅金滯納品</b> — 欠稅被查扣的車輛、不動產、貴金屬、家電</li>
      <li><b>警視庁遺失物</b> — 3 個月無人認領的自転車、傘、精品</li>
      <li><b>政府公有財產處分</b> — 消防車、公務車、廢棄設備</li>
    </ul>

    <h2>外國人可以參加嗎？</h2>
    <v-alert type="success" variant="tonal" density="compact" class="mb-3">
      <b>✅ 可以</b> — 但需符合條件
    </v-alert>
    <ul>
      <li><b>日本國內居住</b> + 有 <b>Yahoo! JAPAN ID</b>（KSI 用 Yahoo ID 登入）</li>
      <li>需要 <b>日本銀行帳戶</b>（付保証金 + 落札後付款）</li>
      <li>不動產需 <b>買受適格證明書</b>（部分農地、林地限日本國籍/法人）</li>
      <li>[redacted]</li>
    </ul>

    <h2>拍賣流程（4 步驟）</h2>

    <div class="step">
      <h3>Step 1：注冊 + 綁 Yahoo ID</h3>
      <p>
        KSI 用 Yahoo! JAPAN ID 認證。若無：
        <a href="https://account.edit.yahoo.co.jp/registration" target="_blank">申請 Yahoo ID</a>。
        接著在 <a href="https://kankocho.jp" target="_blank">kankocho.jp</a> 完成本人確認（免費，含姓名/地址/電話）。
      </p>
    </div>

    <div class="step">
      <h3>Step 2：參加申請 + 交保証金</h3>
      <p>
        每個拍賣物件在 <b>参加申し込み受付期間</b> 內提交申請並付保証金：
      </p>
      <ul>
        <li><b>保証金</b>：起標價 5-10%（¥50-5,000 常見）</li>
        <li><b>付款方式</b>：クレジット決済（信用卡）為主</li>
        <li>沒申請沒付保証金 → 不能出價</li>
        <li>申請截止日就是 App 顯示的「参加 ~ X/Y」日期</li>
      </ul>
    </div>

    <div class="step">
      <h3>Step 3：入札（出價）</h3>
      <p>
        <b>入札期間</b> 內出價：
      </p>
      <ul>
        <li><b>せり売形式</b>（拍賣式）— 隨時可加價，最高者得</li>
        <li><b>入札形式</b>（投標式）— 一次密封出價，公開時最高者得</li>
        <li>可設「自動入札」上限，系統代加價</li>
        <li>入札期間結束 = 拍賣結束</li>
      </ul>
    </div>

    <div class="step">
      <h3>Step 4：落札 + 付款 + 取貨</h3>
      <ul>
        <li>系統郵件通知結果</li>
        <li><b>落札後 7 日內</b> 全額付款 + 契約書</li>
        <li><b>取貨</b>：多數為<b>買受人負擔運送</b>（無運費服務） — 對車輛 = 開拖車去自取，對雜物 = 自取或叫宅配</li>
        <li>不去取 = 違約，保証金沒收 + 一年內禁止參加</li>
      </ul>
    </div>

    <h2>撿漏重點（Sam 用）</h2>
    <ul>
      <li><b>雜物起標常 ¥50-100</b> — 政府清庫存，沒人願意運=沒人搶</li>
      <li><b>軽トラ / 軽ワゴン ¥10,000 起標</b> — 消防車、警察公務車退役品，實際成交常 ¥15-30k</li>
      <li><b>近距離 = 大優勢</b> — 你 20km 內能自取的物件 = 沒運費 = 直接省 ¥3-10k</li>
      <li><b>先看已終了案例</b> — 每 item 右邊 <b>Y!</b> 按鈕開 Yahoo 落札濟看同款過去成交價</li>
    </ul>

    <h2>注意事項 / 風險</h2>
    <v-alert type="warning" variant="tonal" density="compact" class="mb-2">
      <ul style="margin: 0;">
        <li>拍賣品 <b>現状渡し</b>（as-is）— 車輛可能不能發動、家電可能壞、瑕疵不能退</li>
        <li>不動產可能有 <b>占有者</b> — 落札後需自行處理搬遷</li>
        <li>付款延遲 = 違約金 + 禁止參加 1 年</li>
        <li>物件說明 = 政府職員寫的，不 sugar-coat 但也不精準 → 可能低估瑕疵</li>
      </ul>
    </v-alert>

    <h2>Sam 的行動路徑</h2>
    <ol>
      <li>先在 <a @click="$router.push('/gov-auctions')" style="cursor:pointer;color:#795548"><b>官公庁拍賣</b></a> 頁瀏覽本回車輛（📍 20km 內優先）</li>
      <li>看到便宜的 → 點「Y!」查 Yahoo 落札濟看行情</li>
      <li>覺得值得 → <b>参加申請截止前</b>（App 顯示「参加 ~ X/Y」）到 KSI 網站付保証金</li>
      <li>入札期間內出價</li>
      <li>拍完在 <b>知識庫</b> 記錄（自己那筆 or 觀察別人成交）— 累積個人經驗</li>
    </ol>

    <h2>過往真實成交案例</h2>
    <p class="text-caption text-medium-emphasis">
      整理自 KSI 官方 note.com 2025 年度 ranking + 民間體驗 blog（連結見出處）
    </p>

    <h3>💴 極端低額落札（撿到寶）</h3>
    <ul class="cases">
      <li><b>¥30</b> — 液晶テレビ（2025 年度最低價）</li>
      <li><b>¥50</b> — カルビープロ野球カード</li>
      <li><b>¥100</b> — シャープ 32 吋テレビ（2023 案例）</li>
      <li><b>¥2,000</b> — 日産クリッパー 平成 23 年式（2023 案例，車！）</li>
      <li><b>¥11,000</b> — ダイハツ ムーヴ（2025，車輛最低）</li>
      <li><b>¥16,500</b> — メルセデス・ベンツ（2025 車輛驚人案例）</li>
      <li><b>¥30,000</b> — 平成 13 年式 トヨタ カローラフィールダー</li>
      <li><b>¥40,000</b> — 電動アシスト自転車</li>
      <li><b>¥90,000</b> — 別荘地（木曽町，不動產！）</li>
      <li><b>¥1,990,000</b> — 徳島縣阿南市土地付き建物</li>
    </ul>

    <h3>💎 高額落札（人氣物件）</h3>
    <ul class="cases">
      <li><b>¥121,486,000</b> — 立川市土地（不動產榜首）</li>
      <li><b>¥14,463,000</b> — レクサス LM500H（車輛榜首）</li>
      <li><b>¥14,000,000</b> — スタインウェイ&サンズ グランドピアノ</li>
      <li><b>¥3,501,000</b> — エルメス バーキン（動產榜第 3）</li>
    </ul>

    <h3>📝 民間體驗心得</h3>
    <v-alert type="warning" variant="tonal" density="compact" class="mb-3">
      <b>anne3150.com 作者實測體驗</b>：
      「入札遊戲機時，1 小時內價格漲了 4 萬日圓，秒放棄」；
      「熱門物件價格競爭激烈，加上運費最後常比 Yahoo 拍賣還貴」→
      **結論：撿漏要挑冷門項目 + 能自取的近距離**
    </v-alert>

    <h2>其他補充拍賣管道（本 App 未整合，官方連結自行看）</h2>
    <p class="text-caption text-medium-emphasis">
      實測後這幾個站要嘛 offline 主辦 / 要嘛只做不動產 / 要嘛跟 KSI 重複，硬接 backend 沒 value。需要時點連結開新分頁自己看。
    </p>
    <ul>
      <li>
        <b>BIT 裁判所競売</b>（<a href="https://www.bit.courts.go.jp/" target="_blank">bit.courts.go.jp</a>）—
        全國 <b>民事執行の不動產法拍</b>，1,600+ 物件。Sam 不做房產可跳過。
      </li>
      <li>
        <b>兵庫縣警察 遺失物公売</b>（<a href="https://www.police.pref.hyogo.lg.jp/traffic/koubai/index.htm" target="_blank">police.pref.hyogo.lg.jp/traffic/koubai/</a>）—
        家門口的自転車拍賣，但<b>不定期</b>+ 需電話報名（078-321-0293）+ 現地下見預約。
      </li>
      <li>
        <b>大阪府警 遺失物公開情報</b>（<a href="http://www.otoshimono.police.pref.osaka.jp/" target="_blank">otoshimono.police.pref.osaka.jp</a>）—
        主要是「找丟的東西」查詢頁，未認領後公售獨立辦（不在網）。
      </li>
      <li>
        <b>大阪税関 落札公告</b>（<a href="https://www.customs.go.jp/kyotsu/chotatsu/rakusatsu/r_osaka.htm" target="_blank">customs.go.jp/.../r_osaka</a>）—
        看**過去成交結果**參考行情用；進行中拍賣主要官報公告+現地入札。
      </li>
      <li>
        <b>神戸税関 事件公告</b>（<a href="https://www.customs.go.jp/kobe/00kohoshitsu_top.htm/event_oshirase_new.htm" target="_blank">customs.go.jp/kobe/…event</a>）—
        神戸税関事件通知（走私沒收品）。
      </li>
      <li>
        <b>国税庁公売情報</b>（<a href="https://www.koubai.nta.go.jp/" target="_blank">koubai.nta.go.jp</a>）—
        跟 KSI 大量重複（各國稅局在 KSI 出品），但**額外的滯納品清單**在這裡。
      </li>
      <li>
        <b>まんだらけオークション</b>（<a href="https://ekizo.mandarake.co.jp/auction/item/indexJa.html" target="_blank">ekizo.mandarake.co.jp</a>）—
        動漫/古書/骨董專場，非政府但業界撿漏名場。
      </li>
    </ul>

    <h2>📚 出處與延伸閱讀</h2>
    <ul>
      <li><a href="https://note.com/ksijapan/n/nfcd004a555f4" target="_blank">KSI 2025 年度落札 ranking（KSI 官方 note）</a></li>
      <li><a href="https://note.com/ksijapan/n/n45712b656e5f" target="_blank">消防車や救急車が落札できる!?（第 1 回）</a></li>
      <li><a href="https://note.com/shirousagi_note/n/n800c3b8370ca" target="_blank">日記：官公庁オークション、趣深い（民間體驗）</a></li>
      <li><a href="https://anne3150.com/?p=2787" target="_blank">実践編！KSI 官公庁オークションに参加してみた（民間 blog）</a></li>
      <li><a href="https://www.all-senmonka.jp/moneyizm/money/77874/" target="_blank">MONEYIZM 官公庁オークション 掘り出し物一覧</a></li>
      <li><a href="https://www.pages.kankocho.jp/guide" target="_blank">KSI 初めての方へ（官方入門）</a></li>
      <li><a href="https://help.kankocho.jp/" target="_blank">KSI ヘルプ FAQ</a></li>
      <li><a href="https://www.koubai.nta.go.jp/" target="_blank">国税庁公売情報</a></li>
      <li><a href="https://www.keishicho.metro.tokyo.lg.jp/tetsuzuki/kotsu/kobai.html" target="_blank">警視庁 遺失物公売</a></li>
    </ul>
  </v-container>
</template>

<style scoped>
.guide { max-width: 720px; }
.guide h2 { margin-top: 24px; margin-bottom: 12px; font-size: 18px; font-weight: 600; color: #3E2723; border-bottom: 2px solid #795548; padding-bottom: 4px; }
.guide h3 { margin-top: 12px; margin-bottom: 6px; font-size: 15px; font-weight: 600; color: #5D4037; }
.guide p { line-height: 1.7; color: #3E2723; margin: 8px 0; }
.guide ul, .guide ol { padding-left: 24px; line-height: 1.9; color: #3E2723; }
.guide li { margin: 3px 0; }
.guide a { color: #795548; }
.step {
  background: rgba(121, 85, 72, 0.04);
  padding: 12px 16px;
  border-radius: 8px;
  margin: 8px 0;
  border-left: 3px solid #795548;
}
.cases li {
  margin: 4px 0;
  padding: 4px 8px;
  background: rgba(121, 85, 72, 0.03);
  border-radius: 4px;
  list-style: none;
}
.cases li b { color: #795548; font-size: 15px; }
.cases { padding-left: 0; }
</style>
