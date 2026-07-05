// api/chzzk-chat.js
import { ChzzkClient } from 'chzzk';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  const channelId = req.query.channelId;
  if (!channelId) {
    res.status(400).json({ error: 'channelId 쿼리 파라미터가 필요합니다.' });
    return;
  }

  try {
    const client = new ChzzkClient();
    const liveDetail = await client.live.detail(channelId);
    if (!liveDetail || !liveDetail.chatChannelId) {
      res.status(404).json({ error: '방송 중이 아니거나 chatChannelId를 찾을 수 없습니다.' });
      return;
    }

    const chatInstance = client.chat({ channelId, pollInterval: 0 });
    const accessToken = await chatInstance.getAccessToken?.() ?? chatInstance.accessToken ?? null;

    res.status(200).json({
      chatChannelId: liveDetail.chatChannelId,
      accessToken: accessToken
    });
  } catch (err) {
    console.error('chzzk-chat proxy error:', err);
    res.status(500).json({ error: String(err && err.message || err) });
  }
}
