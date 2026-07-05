// api/soop-chat-info.js
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  const { bid, bno } = req.query;
  if (!bid) {
    res.status(400).json({ error: 'bid 쿼리 파라미터가 필요합니다.' });
    return;
  }

  try {
    const params = new URLSearchParams({
      bid,
      bno: bno || '',
      type: 'live',
      confirm_adult: 'false',
      player_type: 'html5',
      mode: 'landing',
      from_api: '0',
      pwd: '',
      stream_type: 'common',
      quality: 'HD'
    });

    const apiRes = await fetch(`https://live.afreecatv.com/afreeca/player_live_api.php?bjid=${encodeURIComponent(bid)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      body: params.toString()
    });
    const json = await apiRes.json();
    const ch = json && json.CHANNEL;

    if (!ch || !ch.CHDOMAIN) {
      res.status(404).json({ error: '방송 중이 아니거나 채널 정보를 찾을 수 없어요.', raw: json });
      return;
    }

    res.status(200).json({
      CHDOMAIN: String(ch.CHDOMAIN).toLowerCase(),
      CHATNO: ch.CHATNO,
      CHPT: String(parseInt(ch.CHPT, 10) + 1),
      TITLE: ch.TITLE,
      BJID: ch.BJID
    });
  } catch (err) {
    console.error('soop-chat-info proxy error:', err);
    res.status(500).json({ error: String(err && err.message || err) });
  }
}
