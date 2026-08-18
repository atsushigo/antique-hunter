// 日本 47 都道府縣 座標（縣廳所在地）+ 常見市町 keyword 用於 fuzzy match
// 政府名（KSI 出品者）→ 都道府縣 → 距離武庫川団地 km

// Sam 兩個常住點 — 有車，取兩者最小距離作為「可達性」
export const HOMES = [
  { name: '武庫川団地', lat: 34.7167, lng: 135.4033 },
  { name: '通天閣', lat: 34.6524, lng: 135.5063 },
];
export const HOME = HOMES[0]; // backward compat

// [name, lat, lng, region, cities...]
export const PREFECTURES = [
  // 北海道・東北
  { key: 'hokkaido', name: '北海道', lat: 43.064, lng: 141.347, region: '北海道', cities: ['札幌', '函館', '旭川', '釧路', '帯広', '苫小牧', '室蘭', '北見', '小樽', '江別'] },
  { key: 'aomori', name: '青森', lat: 40.824, lng: 140.740, region: '東北', cities: ['青森', '八戸', '弘前'] },
  { key: 'iwate', name: '岩手', lat: 39.703, lng: 141.152, region: '東北', cities: ['盛岡', '一関', '奥州'] },
  { key: 'miyagi', name: '宮城', lat: 38.269, lng: 140.872, region: '東北', cities: ['仙台', '石巻', '栗原', '大崎'] },
  { key: 'akita', name: '秋田', lat: 39.719, lng: 140.102, region: '東北', cities: ['秋田', '横手'] },
  { key: 'yamagata', name: '山形', lat: 38.240, lng: 140.363, region: '東北', cities: ['山形', '米沢', '鶴岡', '寒河江', '天童'] },
  { key: 'fukushima', name: '福島', lat: 37.750, lng: 140.468, region: '東北', cities: ['福島', 'いわき', '郡山', '会津若松'] },
  // 関東
  { key: 'ibaraki', name: '茨城', lat: 36.342, lng: 140.447, region: '関東', cities: ['水戸', 'つくば', '日立'] },
  { key: 'tochigi', name: '栃木', lat: 36.566, lng: 139.884, region: '関東', cities: ['宇都宮', '栃木', '足利', '日光', '鹿沼', '小山'] },
  { key: 'gunma', name: '群馬', lat: 36.391, lng: 139.061, region: '関東', cities: ['前橋', '高崎'] },
  { key: 'saitama', name: '埼玉', lat: 35.857, lng: 139.649, region: '関東', cities: ['さいたま', '川口', '所沢', '川越', '春日部', '越谷'] },
  { key: 'chiba', name: '千葉', lat: 35.605, lng: 140.123, region: '関東', cities: ['千葉', '船橋', '柏', '市川', '松戸', '成田', '習志野'] },
  { key: 'tokyo', name: '東京', lat: 35.690, lng: 139.692, region: '関東', cities: ['東京', '八王子', '町田', '立川', '武蔵野', '調布', '三鷹', '府中', '練馬', '世田谷'] },
  { key: 'kanagawa', name: '神奈川', lat: 35.448, lng: 139.643, region: '関東', cities: ['横浜', '川崎', '相模原', '藤沢', '横須賀', '鎌倉'] },
  // 中部
  { key: 'niigata', name: '新潟', lat: 37.902, lng: 139.023, region: '中部', cities: ['新潟', '長岡', '上越'] },
  { key: 'toyama', name: '富山', lat: 36.695, lng: 137.211, region: '中部', cities: ['富山', '高岡'] },
  { key: 'ishikawa', name: '石川', lat: 36.594, lng: 136.626, region: '中部', cities: ['金沢', '小松'] },
  { key: 'fukui', name: '福井', lat: 36.065, lng: 136.222, region: '中部', cities: ['福井'] },
  { key: 'yamanashi', name: '山梨', lat: 35.664, lng: 138.568, region: '中部', cities: ['甲府', '鳴沢'] },
  { key: 'nagano', name: '長野', lat: 36.651, lng: 138.181, region: '中部', cities: ['長野', '松本', '飯田', '伊那', '千曲', '諏訪'] },
  { key: 'gifu', name: '岐阜', lat: 35.391, lng: 136.722, region: '中部', cities: ['岐阜', '大垣'] },
  { key: 'shizuoka', name: '静岡', lat: 34.977, lng: 138.383, region: '中部', cities: ['静岡', '浜松', '沼津'] },
  { key: 'aichi', name: '愛知', lat: 35.180, lng: 136.907, region: '中部', cities: ['名古屋', '豊田', '岡崎', '一宮'] },
  // 関西（Sam 家所在）
  { key: 'mie', name: '三重', lat: 34.730, lng: 136.509, region: '関西', cities: ['津', '四日市', '伊勢', '松阪', '志摩', '鈴鹿', '桑名'] },
  { key: 'shiga', name: '滋賀', lat: 35.005, lng: 135.869, region: '関西', cities: ['大津', '草津', '彦根'] },
  { key: 'kyoto', name: '京都', lat: 35.021, lng: 135.755, region: '関西', cities: ['京都'] },
  { key: 'osaka', name: '大阪', lat: 34.694, lng: 135.502, region: '関西', cities: ['大阪', '堺', '東大阪', '豊中', '吹田', '守口', '枚方', '寝屋川', '高槻', '茨木', '岸和田'] },
  { key: 'hyogo', name: '兵庫', lat: 34.691, lng: 135.183, region: '関西', cities: ['神戸', '姫路', '尼崎', '西宮', '芦屋', '明石', '加古川', '相生', '宝塚', '伊丹', '加東', '三田', '川西', '篠山', '高砂'] },
  { key: 'nara', name: '奈良', lat: 34.685, lng: 135.833, region: '関西', cities: ['奈良', '生駒', '橿原'] },
  { key: 'wakayama', name: '和歌山', lat: 34.226, lng: 135.168, region: '関西', cities: ['和歌山'] },
  // 中国
  { key: 'tottori', name: '鳥取', lat: 35.504, lng: 134.238, region: '中国', cities: ['鳥取', '米子', '大山'] },
  { key: 'shimane', name: '島根', lat: 35.472, lng: 133.051, region: '中国', cities: ['松江', '出雲'] },
  { key: 'okayama', name: '岡山', lat: 34.662, lng: 133.935, region: '中国', cities: ['岡山', '倉敷'] },
  { key: 'hiroshima', name: '広島', lat: 34.397, lng: 132.460, region: '中国', cities: ['広島', '福山'] },
  { key: 'yamaguchi', name: '山口', lat: 34.186, lng: 131.470, region: '中国', cities: ['山口', '下関', '宇部'] },
  // 四国
  { key: 'tokushima', name: '徳島', lat: 34.066, lng: 134.559, region: '四国', cities: ['徳島', '阿波', '鳴門'] },
  { key: 'kagawa', name: '香川', lat: 34.340, lng: 134.043, region: '四国', cities: ['高松'] },
  { key: 'ehime', name: '愛媛', lat: 33.842, lng: 132.766, region: '四国', cities: ['松山', '今治'] },
  { key: 'kochi', name: '高知', lat: 33.560, lng: 133.531, region: '四国', cities: ['高知', '幡多', '四万十', '高岡'] },
  // 九州・沖縄
  { key: 'fukuoka', name: '福岡', lat: 33.607, lng: 130.418, region: '九州', cities: ['福岡', '北九州', '久留米'] },
  { key: 'saga', name: '佐賀', lat: 33.249, lng: 130.300, region: '九州', cities: ['佐賀', '唐津'] },
  { key: 'nagasaki', name: '長崎', lat: 32.745, lng: 129.874, region: '九州', cities: ['長崎', '佐世保'] },
  { key: 'kumamoto', name: '熊本', lat: 32.790, lng: 130.742, region: '九州', cities: ['熊本'] },
  { key: 'oita', name: '大分', lat: 33.238, lng: 131.613, region: '九州', cities: ['大分', '別府'] },
  { key: 'miyazaki', name: '宮崎', lat: 31.911, lng: 131.424, region: '九州', cities: ['宮崎', '延岡', '都城', '高鍋'] },
  { key: 'kagoshima', name: '鹿児島', lat: 31.560, lng: 130.558, region: '九州', cities: ['鹿児島', '湧水', '霧島'] },
  { key: 'okinawa', name: '沖縄', lat: 26.212, lng: 127.681, region: '沖縄', cities: ['那覇', '沖縄'] },
];

// 從政府名 fuzzy match 都道府縣
export function guessPrefecture(govName) {
  if (!govName) return null;
  // 直接含縣名
  for (const p of PREFECTURES) {
    if (govName.includes(p.name) || govName.includes(p.name + '県') || govName.includes(p.name + '府') || govName.includes(p.name + '都')) return p;
  }
  // 含市町名
  for (const p of PREFECTURES) {
    for (const c of p.cities) {
      if (govName.includes(c)) return p;
    }
  }
  return null;
}

// Haversine 距離 km
export function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(a)));
}

// 從政府名算距離 — 取兩個家最小值（Sam 有車，能到任一家即可）
export function distanceFromHome(govName) {
  const p = guessPrefecture(govName);
  if (!p) return { prefecture: null, region: null, distanceKm: null, nearestHome: null };
  let minKm = Infinity;
  let nearest = null;
  for (const h of HOMES) {
    const km = haversineKm(h.lat, h.lng, p.lat, p.lng);
    if (km < minKm) { minKm = km; nearest = h.name; }
  }
  return {
    prefecture: p.name,
    prefectureKey: p.key,
    region: p.region,
    distanceKm: minKm,
    nearestHome: nearest,
  };
}
