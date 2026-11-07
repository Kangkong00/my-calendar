"""나만의 캘린더 자동 검수 — 모든 화면을 열어 겹침·넘침·잘림·오류를 검사한다.
사용: python3 qa/qa.py http://localhost:8765/index.html  (예시 데이터 모드로 실행)
"""
import asyncio, sys, json, os
from playwright.async_api import async_playwright

URL = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:8765/index.html'
OUT = os.environ.get('QA_OUT', '/tmp/qa')
SIZES = [(320, 693), (375, 667), (390, 844), (430, 932)]
LONG = '\n'.join(f'{i}월 - 아주 긴 메모 줄 {i} 번째 내용입니다 pH Sensor 점검 및 필터 교체' for i in range(1, 31))

CHECK = r"""
() => {
  const vis = e => { const r = e.getBoundingClientRect(), s = getComputedStyle(e); return r.width > 1 && r.height > 1 && s.visibility !== 'hidden' && s.display !== 'none' && Number(s.opacity) > 0.05; };
  const sheets = [...document.querySelectorAll('.sheet:not(.closing)')];
  const scope = sheets.length ? sheets[sheets.length - 1] : document.querySelector('#app');
  const issues = [];
  const name = e => (e.id ? '#' + e.id : '') + (e.className && typeof e.className === 'string' ? '.' + e.className.trim().split(/\s+/).slice(0, 2).join('.') : '') + ' "' + (e.innerText || e.value || e.getAttribute('aria-label') || '').trim().slice(0, 18) + '"';
  const clipRect = e => { let r = e.getBoundingClientRect(), x0 = 0, y0 = 0, x1 = innerWidth, y1 = innerHeight; for (let p = e.parentElement; p; p = p.parentElement) { const s = getComputedStyle(p); if (/(auto|scroll|hidden)/.test(s.overflow + s.overflowX + s.overflowY)) { const q = p.getBoundingClientRect(); x0 = Math.max(x0, q.left); y0 = Math.max(y0, q.top); x1 = Math.min(x1, q.right); y1 = Math.min(y1, q.bottom); } } return { l: Math.max(r.left, x0), t: Math.max(r.top, y0), r: Math.min(r.right, x1), b: Math.min(r.bottom, y1) }; };
  // 1) 누를 수 있는 것끼리 겹침
  const inter = [...scope.querySelectorAll('button,input,textarea,select,a,[contenteditable=true],label.ck')].filter(vis).filter(e => !e.closest('label.ck') || e.matches('label.ck'));
  const boxes = inter.map(e => ({ e, c: clipRect(e) })).filter(o => o.c.r - o.c.l > 2 && o.c.b - o.c.t > 2);
  for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
    const a = boxes[i], b = boxes[j]; if (a.e.contains(b.e) || b.e.contains(a.e)) continue;
    const navOne = (a.e.closest('nav') ? b : (b.e.closest('nav') ? a : null));
    if (navOne) { let sc = navOne.e.parentElement; while (sc && !/(auto|scroll)/.test(getComputedStyle(sc).overflowY)) sc = sc.parentElement; if (sc && parseFloat(getComputedStyle(sc).paddingBottom) >= document.querySelector('nav').offsetHeight) continue; }
    const w = Math.min(a.c.r, b.c.r) - Math.max(a.c.l, b.c.l), h = Math.min(a.c.b, b.c.b) - Math.max(a.c.t, b.c.t);
    if (w > 3 && h > 3) issues.push('겹침: ' + name(a.e) + ' ↔ ' + name(b.e));
  }
  // 1-b) 시트 안 내용이 고정 버튼 영역(nav 등)과 겹침 — 내용이 다른 형제 상자 밖으로 삐져나옴
  const cont = [...scope.querySelectorAll('.npaper,.box,.tlist,.qadd,.gcard,.gdet,.summary,.picker,.ntoolbar,.shead')].filter(vis);
  cont.forEach(c => { const q = c.getBoundingClientRect(); [...c.querySelectorAll('*')].filter(vis).forEach(k => { if (k.closest('.scrollx') && k.closest('.scrollx') !== k) return; const s = getComputedStyle(c); if (/(auto|scroll|hidden)/.test(s.overflow)) return; const r = k.getBoundingClientRect(); if (r.bottom > q.bottom + 2 || r.right > q.right + 2 || r.left < q.left - 2) issues.push('상자 밖으로 넘침: ' + name(k) + ' in ' + name(c)); }); });
  // 2) 가로로 화면 밖
  if (document.documentElement.scrollWidth > innerWidth + 1) issues.push('가로 스크롤 생김');
  inter.forEach(e => { if (e.closest('.scrollx')) return; const r = e.getBoundingClientRect(); if (r.right > innerWidth + 1 || r.left < -1) issues.push('화면 밖: ' + name(e)); });
  // 3) 잘린 글자 (의도된 칩/막대 제외)
  [...scope.querySelectorAll('button,span,h1,h2,h3,p,label')].filter(vis).forEach(e => { if (e.closest('.bar,.blk,.pill,.gseg,.tb,.tmemo,.scrollx,.evrow .n,.gout')) return; const s = getComputedStyle(e); if (s.overflow === 'hidden' && s.textOverflow !== 'ellipsis' && e.scrollWidth > e.clientWidth + 2 && e.innerText.trim()) issues.push('글자 잘림: ' + name(e)); });
  return [...new Set(issues)];
}
"""

async def run():
    os.makedirs(OUT, exist_ok=True)
    report = {}
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
        for (W, H) in SIZES:
            ctx = await b.new_context(viewport={'width': W, 'height': H}, device_scale_factor=2, has_touch=True)
            pg = await ctx.new_page(); errs = []
            pg.on('pageerror', lambda e: errs.append(str(e)))
            await pg.route('**/version.json*', lambda r: r.fulfill(status=404, body=''))
            await pg.goto(URL); await pg.evaluate('localStorage.clear()'); await pg.reload(); await pg.wait_for_selector('#cover', state='detached', timeout=5000); await pg.wait_for_timeout(300)
            async def shot(tag):
                await pg.wait_for_timeout(450)
                res = await pg.evaluate(CHECK)
                await pg.screenshot(path=f'{OUT}/{W}x{H}_{tag}.png')
                report[f'{W}x{H} {tag}'] = res
            async def close_all(): await pg.evaluate('closeAll()'); await pg.wait_for_timeout(350)
            await shot('월간')
            await pg.click('.mday.today'); await shot('하루시간표'); await close_all()
            await pg.click('#vWeek'); await pg.wait_for_timeout(700); await shot('주간')
            await pg.click('#nAdd'); await shot('새일정')
            await pg.click('[data-a=openS]'); await shot('새일정_시작시간')
            await pg.click('[data-a=openE]'); await shot('새일정_종료시간')
            await pg.click('[data-a=newcat]'); await shot('새카테고리')
            await pg.click('[data-a=addal]'); await shot('알림')
            await close_all()
            await pg.click('#vMonth'); await pg.wait_for_timeout(600)
            await pg.click('.mday.today'); await pg.wait_for_timeout(400)
            await pg.click('.tb >> nth=0'); await shot('일정상세')
            await pg.click('[data-a=edit]'); await shot('일정수정'); await close_all()
            await pg.click('.mday.today'); await pg.wait_for_timeout(400)
            await pg.click('[data-a=import]'); await shot('일정가져오기')
            await pg.click('[data-a=tcal]'); await shot('복제_여러날'); await close_all()
            await pg.click('#nTask'); await pg.wait_for_timeout(900); await shot('할일')
            await pg.click('.trow[data-tid] .tmain >> nth=0'); await pg.wait_for_timeout(400)
            await pg.evaluate("t=>{const e=document.querySelector('#kNotes');e.innerText=t;}", LONG)
            await pg.fill('#kTitle', '아주 아주 긴 할 일 제목이 들어가는 경우를 확인합니다 정말 길게')
            await shot('할일메모_긴내용')
            await pg.evaluate("document.querySelector('#kBody').scrollTop=99999"); await shot('할일메모_맨아래')
            for _ in range(5): await pg.click('[data-a=fsz][data-v="1"]')
            await shot('할일메모_큰글씨'); await close_all()
            await pg.click('#nGantt'); await pg.wait_for_timeout(900)
            await pg.click('[data-gsel] >> nth=0'); await shot('간트')
            await pg.click('[data-gedit]'); await shot('계획수정'); await close_all()
            await pg.click('[data-gnew]'); await shot('새계획'); await close_all()
            await pg.click('#nSet'); await shot('설정'); await close_all()
            report[f'{W}x{H} 스크립트 오류'] = errs
            await ctx.close()
        await b.close()
    bad = {k: v for k, v in report.items() if v}
    print(json.dumps(bad, ensure_ascii=False, indent=1) if bad else '검수 통과: 문제 없음')
    return 1 if bad else 0

sys.exit(asyncio.run(run()))
