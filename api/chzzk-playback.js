// api/chzzk-playback.js
// 치지직 라이브 재생 주소(HLS)를 알려주는 프록시 (MV9 직접 재생용)
// 사용법: GET /api/chzzk-playback?channelId=치지직채널ID

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  const channelId = String(req.query.channelId || '');
  if (!/^[a-f0-9]{20,40}$/i.test(channelId)) {
    res.status(400).json({ error: 'channelId 쿼리 파라미터가 올바르지 않습니다.' });
    return;
  }

  try {
    const r = await fetch(`https://api.chzzk.naver.com/service/v3/channels/${channelId}/live-detail`, {
      headers: { 'User-Agent': UA, 'Accept': 'application/json' },
    });
    if (!r.ok) {
      res.status(200).json({ live: false, reason: `치지직 응답 ${r.status}` });
      return;
    }
    const j = await r.json();
    const c = j && j.content;
    if (!c) {
      res.status(200).json({ live: false, reason: '채널 정보를 찾지 못했어요' });
      return;
    }
    if (!c.livePlaybackJson) {
      res.status(200).json({ live: false, reason: c.adult ? '연령 제한 방송(로그인 필요)' : '방송 중이 아니에요', title: c.liveTitle || '' });
      return;
    }
    const pb = JSON.parse(c.livePlaybackJson);
    const media = Array.isArray(pb.media) ? pb.media : [];
    const pick = (id) => { const m = media.find(x => x && x.mediaId === id && x.path); return m ? m.path : ''; };
    const hls = pick('HLS');
    const llhls = pick('LLHLS');
    if (!hls && !llhls) {
      res.status(200).json({ live: false, reason: '재생 주소를 찾지 못했어요', title: c.liveTitle || '' });
      return;
    }
    res.status(200).json({ live: true, title: c.liveTitle || '', hls, llhls });
  } catch (err) {
    res.status(200).json({ live: false, reason: '조회 실패: ' + (err && err.message ? err.message : 'unknown') });
  }
}
