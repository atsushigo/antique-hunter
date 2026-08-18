// 拍賣管道 metadata — 參加方式 / 身分限制 / 外國人可否 / 費用
// 事實資訊來自各站官網（截至 2026-08）
// distanceFromHome 由 gov-auctions 邏輯計算，此處只給大略區域

export const AUCTION_SOURCES = [
  {
    id: 'ksi',
    name: 'KSI 官公庁オークション',
    shortName: 'KSI',
    url: 'https://kankocho.jp',
    scheduleUrl: 'https://kankocho.jp/search/',
    method: 'online', // online | offline
    coverage: '全國 · 國税+都道府縣税+警視庁遺失物+警察遺失物（含兵庫県警）',
    region: '全國',
    fee: {
      participation: '無',
      deposit: '起標價 5-10%（¥50-5,000 常見，落札後歸還/抵扣）',
      payment: 'クレジット決済（信用卡） / 銀行轉帳',
    },
    identity: {
      idRequired: '本人確認（姓名+地址+電話）',
      accountRequired: 'Yahoo! JAPAN ID + 日本銀行帳戶',
      foreignerOk: true,
      foreignerNotes: '需日本居住 + 日本銀行帳戶。不動產部分（農地/林地）需買受適格證明',
    },
    frequency: '常年，多輪並行',
    coveredByApp: true,
    notes: 'App 已整合，Calendar 顯示 4 個 milestone。兵庫県警・警視庁・国税庁の物件多在此上架',
  },
  {
    id: 'osaka-police-bicycle',
    name: '大阪府警 自転車公売会',
    shortName: '大阪府警自転車',
    url: 'https://www.police.pref.osaka.lg.jp/',
    scheduleUrl: 'https://www.police.pref.osaka.lg.jp/kotsu/utsuke/index.html',
    method: 'offline', // 現地公売
    coverage: '大阪府內遺失物自転車（未認領品）',
    region: '大阪',
    fee: {
      participation: '無入場費',
      deposit: '現場現金決済',
      payment: '現金',
    },
    identity: {
      idRequired: '身分證件（在留卡/護照）',
      accountRequired: '無',
      foreignerOk: true,
      foreignerNotes: '在留卡即可，非常寬鬆',
    },
    frequency: '不定期，年 2-4 回',
    coveredByApp: false,
    notes: '常在大阪府警本部或轄下警察署辦。¥1,000-5,000 撿自転車常見。要打電話確認',
  },
  {
    id: 'hyogo-police-bicycle',
    name: '兵庫県警 自転車公売会',
    shortName: '兵庫県警自転車',
    url: 'https://www.police.pref.hyogo.lg.jp/traffic/koubai/index.htm',
    scheduleUrl: 'https://www.police.pref.hyogo.lg.jp/traffic/koubai/index.htm',
    method: 'offline',
    coverage: '兵庫県內遺失物自転車 + 少量雜物',
    region: '兵庫',
    contact: '078-341-7441（本部会計課）',
    fee: {
      participation: '無入場費',
      deposit: '現場現金決済',
      payment: '現金',
    },
    identity: {
      idRequired: '身分證件（在留卡/護照）',
      accountRequired: '無',
      foreignerOk: true,
      foreignerNotes: '在留卡即可，Sam 這站對你最方便（武庫川団地）',
    },
    frequency: '不定期，年 2-4 回；另有 KSI 線上公売',
    coveredByApp: false,
    notes: '現地下見+入札。網頁不定期更新次回日期，需常刷。KSI 線上部分 App 已抓',
  },
  {
    id: 'osaka-customs',
    name: '大阪税関 公売',
    shortName: '大阪税関',
    url: 'https://www.customs.go.jp/osaka/',
    scheduleUrl: 'https://www.customs.go.jp/kyotsu/chotatsu/rakusatsu/r_osaka.htm',
    method: 'offline+online', // 一般 & 官報公告
    coverage: '関税滯納品 / 密輸沒收品 / 未申報放棄品（時計・貴金屬・洋酒・車輛）',
    region: '大阪',
    fee: {
      participation: '無',
      deposit: '起標價 10%（現金 or 銀行）',
      payment: '銀行轉帳為主',
    },
    identity: {
      idRequired: '実印+印鑑証明書（法人 or 個人）',
      accountRequired: '日本銀行帳戶',
      foreignerOk: true,
      foreignerNotes: '需在留卡 + 実印登錄。手續比 KSI 麻煩',
    },
    frequency: '不定期，官報公告',
    coveredByApp: false,
    notes: '走私沒收 = 常有 Rolex/Chanel/洋酒等高價品，撿漏空間大但競爭者是專業業者',
  },
  {
    id: 'kobe-customs',
    name: '神戸税関 公売',
    shortName: '神戸税関',
    url: 'https://www.customs.go.jp/kobe/',
    scheduleUrl: 'https://www.customs.go.jp/kyotsu/chotatsu/rakusatsu/r_kobe.htm',
    method: 'offline+online',
    coverage: '同大阪税関（西日本管轄）',
    region: '兵庫',
    fee: {
      participation: '無',
      deposit: '起標價 10%',
      payment: '銀行轉帳為主',
    },
    identity: {
      idRequired: '実印+印鑑証明書',
      accountRequired: '日本銀行帳戶',
      foreignerOk: true,
      foreignerNotes: '同大阪税関',
    },
    frequency: '不定期，官報公告',
    coveredByApp: false,
    notes: 'Sam 從武庫川団地開車 20 分內可到，通天閣 30 分。神戸港靠海 = 密輸品最多',
  },
  {
    id: 'nta-koubai',
    name: '国税庁 公売情報',
    shortName: '国税庁',
    url: 'https://www.koubai.nta.go.jp/',
    scheduleUrl: 'https://www.koubai.nta.go.jp/search/',
    method: 'online', // 大部分導向 KSI，少量獨立
    coverage: '國税滯納品（不動產為主，含少量動產）',
    region: '全國',
    fee: {
      participation: '無',
      deposit: '起標價 10%',
      payment: '銀行轉帳',
    },
    identity: {
      idRequired: '本人確認',
      accountRequired: '日本銀行帳戶',
      foreignerOk: true,
      foreignerNotes: '不動產部分農地/林地限日籍或適格法人',
    },
    frequency: '常年',
    coveredByApp: true,
    notes: '80% 物件在 KSI 上架，本站是官方索引。App 已覆蓋主流',
  },
  {
    id: 'bit-courts',
    name: 'BIT 裁判所競売',
    shortName: 'BIT',
    url: 'https://www.bit.courts.go.jp/',
    scheduleUrl: 'https://www.bit.courts.go.jp/app/top/pt001/h01',
    method: 'offline+online', // 期間入札，郵送 or 現地
    coverage: '全國民事執行法拍不動產（1,600+ 件），少量動產',
    region: '全國',
    fee: {
      participation: '無',
      deposit: '売却基準価額 20%（保証金）',
      payment: '銀行 → 裁判所口座',
    },
    identity: {
      idRequired: '住民票 or 在留証明+印鑑証明',
      accountRequired: '日本銀行帳戶',
      foreignerOk: true,
      foreignerNotes: '外國人可買，但農地/林地需要許可',
    },
    frequency: '每月各地方裁判所開催',
    coveredByApp: false,
    notes: 'Sam 不做不動產可略過。動產（船舶・車輛）少，但偶爾出現',
  },
  {
    id: 'mandarake',
    name: 'まんだらけオークション',
    shortName: 'まんだらけ',
    url: 'https://ekizo.mandarake.co.jp/auction/item/indexJa.html',
    scheduleUrl: 'https://ekizo.mandarake.co.jp/auction/item/indexJa.html',
    method: 'online',
    coverage: '動漫・古書・骨董・玩具・同人（非政府拍賣）',
    region: '全國（線上）',
    fee: {
      participation: '會員費 無',
      deposit: '無（信用卡預授權）',
      payment: '信用卡 / 銀行',
    },
    identity: {
      idRequired: '簡易 email 註冊',
      accountRequired: 'まんだらけ會員',
      foreignerOk: true,
      foreignerNotes: '海外配送可（EMS）— 外國人友善度最高',
    },
    frequency: '月 2-4 場',
    coveredByApp: false,
    notes: '非官方拍賣，但骨董/漫畫古本業界撿漏名場。適合 Sam 古董定位',
  },
];

// 依 category 快速篩選
export function findSourceById(id) {
  return AUCTION_SOURCES.find((s) => s.id === id);
}
