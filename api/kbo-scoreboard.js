// api/kbo-scoreboard.js
// -----------------------------------------------------------------------
// KBO 공식 사이트(koreabaseball.com)의 스코어보드 페이지를 서버에서 대신
// 가져와 파싱한 뒤, 팀 이름으로 오늘 경기 하나를 찾아 JSON으로 돌려줍니다.
//
// 실제 페이지 구조 확인 결과 (2026-07 기준): 경기마다 <div class="smsScore">
// 안에 원정팀(.leftTeam .teamT)/홈팀(.rightTeam .teamT)/점수(.score)/
// 상태(.flag)가 들어있어요. "리뷰" 링크(gameId 포함)는 경기가 끝나야만
// 생기는 것으로 보여서, 진행 중인 경기를 확실히 찾기 위해 gameId 대신
// 팀 이름으로 매칭합니다.
//
// 사용법: GET /api/kbo-scoreboard?team=삼성  (팀 이름 일부만 넣어도 됨)
// 응답: { awayTeam, homeTeam, awayScore, homeScore, status, place }
// -----------------------------------------------------------------------

import * as cheerio from 'cheerio';

const SCOREBOARD_URL = 'https://www.koreabaseball.com/Schedule/ScoreBoard.aspx';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  const team = (req.query.team || '').trim();
  if (!team) {
    res.status(400).json({ error: 'team 쿼리 파라미터가 필요합니다. 예: ?team=삼성' });
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

    const found = games.find(g => g.awayTeam.includes(team) || g.homeTeam.includes(team));
    if (!found) {
      res.status(404).json({
        error: `"${team}" 팀이 포함된 오늘 경기를 찾지 못했어요.`,
        availableGames: games.map(g => `${g.awayTeam} vs ${g.homeTeam}`)
      });
      return;
    }

    res.status(200).json(found);
  } catch (err) {
    console.error('kbo-scoreboard proxy error:', err);
    res.status(500).json({ error: String(err && err.message || err) });
  }
}
