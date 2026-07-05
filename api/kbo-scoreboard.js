// api/kbo-scoreboard.js
import * as cheerio from 'cheerio';

const SCOREBOARD_URL = 'https://www.koreabaseball.com/Schedule/ScoreBoard.aspx';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  const gameId = req.query.gameId;
  if (!gameId) {
    res.status(400).json({ error: 'gameId 쿼리 파라미터가 필요합니다. 예: ?gameId=20260705OBWO0' });
    return;
  }

  try {
    const pageRes = await fetch(SCOREBOARD_URL, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    });
    const html = await pageRes.text();
    const $ = cheerio.load(html);

    const gameLinks = $('a[href*="gameId="]')
      .map((i, el) => $(el).attr('href') || '')
      .get()
      .filter(href => /gameId=/.test(href));

    const strongs = $('strong').map((i, el) => $(el).text().trim()).get();
    const ems = $('em').map((i, el) => $(el).text().trim()).get();

    const games = [];
    if (strongs.length === gameLinks.length * 3 && ems.length === gameLinks.length * 2) {
      gameLinks.forEach((href, i) => {
        const idMatch = href.match(/gameId=([0-9A-Za-z]+)/);
        const dateMatch = href.match(/gameDate=(\d+)/);
        games.push({
          gameId: idMatch ? idMatch[1] : null,
          gameDate: dateMatch ? dateMatch[1] : null,
          awayTeam: strongs[i * 3] || null,
          status: strongs[i * 3 + 1] || null,
          homeTeam: strongs[i * 3 + 2] || null,
          awayScore: ems[i * 2] || null,
          homeScore: ems[i * 2 + 1] || null
        });
      });
    }

    if (!games.length) {
      res.status(502).json({
        error: 'KBO 페이지 구조가 예상과 달라 파싱하지 못했어요.',
        debug: { gameLinkCount: gameLinks.length, strongCount: strongs.length, emCount: ems.length }
      });
      return;
    }

    const found = games.find(g => g.gameId === gameId);
    if (!found) {
      res.status(404).json({
        error: '오늘 경기 목록에서 해당 gameId를 찾지 못했어요.',
        availableGameIds: games.map(g => g.gameId)
      });
      return;
    }

    res.status(200).json(found);
  } catch (err) {
    console.error('kbo-scoreboard proxy error:', err);
    res.status(500).json({ error: String(err && err.message || err) });
  }
}
