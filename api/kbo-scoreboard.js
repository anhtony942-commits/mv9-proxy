import * as cheerio from 'cheerio';

const SCOREBOARD_URL = 'https://www.koreabaseball.com/Schedule/ScoreBoard.aspx';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  try {
    const pageRes = await fetch(SCOREBOARD_URL, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    });
    const html = await pageRes.text();
    const $ = cheerio.load(html);

    const games = [];
    $('.smsScore').each((i, el) => {
      const $el = $(el);
      const awayTeam = $el.find('.leftTeam .teamT').first().text().trim();
      const homeTeam = $el.find('.rightTeam .teamT').first().text().trim();
      const awayScore = $el.find('.leftTeam .score').first().text().trim();
      const homeScore = $el.find('.rightTeam .score').first().text().trim();
      const status = $el.find('.flag').first().text().trim();
      const place = $el.find('.place').first().text().trim();
      if (awayTeam || homeTeam) {
        games.push({ awayTeam, homeTeam, awayScore, homeScore, status, place });
      }
    });

    if (!games.length) {
      res.status(502).json({ error: '오늘 경기 목록을 찾지 못했어요. (사이트 구조가 또 바뀌었을 수 있어요)' });
      return;
    }

    res.status(200).json({ games });
  } catch (err) {
    console.error('kbo-scoreboard proxy error:', err);
    res.status(500).json({ error: String(err && err.message || err) });
  }
}
