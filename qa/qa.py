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
            await pg.click('#nCal'); await pg.wait_for_timeout(600); await pg.click('#anBtn'); await pg.wait_for_timeout(900); await shot('분석_월간')
            await pg.click('[data-a=kind][data-v=week]'); await pg.wait_for_timeout(700); await shot('분석_주간')
            await pg.click('[data-a=prev]'); await pg.wait_for_timeout(700); await shot('분석_지난주'); await close_all()
            await pg.click('#vWeek'); await pg.wait_for_timeout(600); await shot('주간_헤더'); await pg.click('#vMonth'); await pg.wait_for_timeout(500)
            report[f'{W}x{H} 스크립트 오류'] = errs
            await ctx.close()
        # 2-1) 아이폰 홈 화면 앱 재현: iOS처럼 창 높이를 상태바만큼 짧게(797) 알려 주고 화면은 844, 안전영역 47/34
        for (W, H, short, top, bot) in [(390, 844, 47, 47, 34), (320, 693, 20, 20, 0), (430, 932, 59, 59, 34)]:
            ctx = await b.new_context(viewport={'width': W, 'height': H - short}, screen={'width': W, 'height': H}, device_scale_factor=2, has_touch=True)
            await ctx.add_init_script("Object.defineProperty(navigator,'standalone',{get:()=>true});(function(){const set=()=>{const d=document.documentElement;d.style.setProperty('--qa-sat-top','%dpx');d.style.setProperty('--qa-sat-bot','%dpx')};if(document.documentElement)set();else new MutationObserver((m,o)=>{if(document.documentElement){o.disconnect();set()}}).observe(document,{childList:true})})()" % (top, bot))
            pg = await ctx.new_page(); errs = []
            pg.on('pageerror', lambda e: errs.append(str(e)))
            await pg.route('**/version.json*', lambda r: r.fulfill(status=404, body=''))
            await pg.goto(URL); await pg.evaluate('localStorage.clear()'); await pg.reload(); await pg.wait_for_selector('#cover', state='detached', timeout=5000)
            await pg.set_viewport_size({'width': W, 'height': H}); await pg.wait_for_timeout(400)  # 실제로 그려지는 화면 크기로 측정
            m = await pg.evaluate("""() => { const n = document.querySelector('nav').getBoundingClientRect(), f = document.querySelector('#nAdd').getBoundingClientRect(), a = document.querySelector('#app').getBoundingClientRect(); return { app: a.height, navB: n.bottom, navH: n.height, below: n.bottom - f.bottom, fit: document.documentElement.getAttribute('data-fit') }; }""")
            iss = []
            if abs(m['app'] - H) > 1: iss.append(f"앱 높이 {m['app']} ≠ 화면 {H} (맞춤: {m['fit']})")
            if abs(m['navB'] - H) > 1: iss.append(f"하단 바 끝 {m['navB']} ≠ 화면 끝 {H}")
            if bot and not (14 <= m['below'] <= 30): iss.append(f"+ 버튼 아래 여백 {m['below']:.0f}px (14~30 기대)")
            await pg.screenshot(path=f'{OUT}/홈화면앱_{W}x{H}_월간.png')
            await pg.click('#nAdd'); await pg.wait_for_timeout(600)
            sb = await pg.evaluate("() => document.querySelector('.sheet').getBoundingClientRect().bottom")
            if abs(sb - H) > 1: iss.append(f'시트 아래 끝 {sb} ≠ {H}')
            await pg.screenshot(path=f'{OUT}/홈화면앱_{W}x{H}_새일정.png')
            report[f'홈 화면 앱 {W}x{H}'] = iss + errs
            await ctx.close()
        # PC 창 크기별: 작은 창(휴대폰 배치) · 보통 창 · 노트북 · 전체 화면 모니터
        for (W, H) in [(600, 800), (900, 650), (1280, 800), (1920, 1080)]:
            ctx = await b.new_context(viewport={'width': W, 'height': H})
            pg = await ctx.new_page(); errs = []; res = []
            pg.on('pageerror', lambda e: errs.append(str(e)))
            await pg.route('**/version.json*', lambda r: r.fulfill(status=404, body=''))
            await pg.goto(URL); await pg.evaluate('localStorage.clear()'); await pg.reload(); await pg.wait_for_selector('#cover', state='detached', timeout=5000); await pg.wait_for_timeout(400)
            m = await pg.evaluate("() => ({ app: document.querySelector('#app').getBoundingClientRect().width, main: document.querySelector('#main').getBoundingClientRect().width, navB: document.querySelector('nav').getBoundingClientRect().bottom })")
            if abs(m['app'] - W) > 1: res.append(f"앱 폭 {m['app']} ≠ 창 폭 {W}")
            if m['main'] > (1400.5 if W >= 1600 else 1200.5): res.append(f"본문 폭 {m['main']} 너무 넓음")
            if abs(m['navB'] - H) > 1: res.append(f"하단 바가 창 아래 끝에 안 붙음 {m['navB']}")
            res += await pg.evaluate(CHECK); await pg.screenshot(path=f'{OUT}/PC_{W}x{H}_월간.png')
            await pg.click('#vWeek'); await pg.wait_for_timeout(800); res += await pg.evaluate(CHECK); await pg.screenshot(path=f'{OUT}/PC_{W}x{H}_주간.png')
            await pg.keyboard.press('ArrowRight'); await pg.wait_for_timeout(700)
            await pg.click('#vMonth'); await pg.wait_for_timeout(700)
            await pg.click('.mday.today'); await pg.wait_for_timeout(600)
            sr = await pg.evaluate("() => { const r = document.querySelector('.sheet').getBoundingClientRect(); return { l: r.left, r: r.right, t: r.top, b: r.bottom, w: r.width }; }")
            if W >= 700 and (sr['w'] > 600.5 or abs((sr['l'] + sr['r']) / 2 - W / 2) > 2 or sr['t'] < 0 or sr['b'] > H + 1): res.append(f'PC 대화상자 위치 이상 {sr}')
            if W < 700 and abs(sr['b'] - H) > 1: res.append(f'작은 창 시트가 아래에 안 붙음 {sr}')
            res += await pg.evaluate(CHECK); await pg.screenshot(path=f'{OUT}/PC_{W}x{H}_하루.png')
            await pg.keyboard.press('Escape'); await pg.wait_for_timeout(400)
            if await pg.evaluate("() => sheetStack.length"): res.append('Esc로 대화상자가 안 닫힘')
            await pg.set_viewport_size({'width': max(700, W - 200), 'height': H - 100}); await pg.wait_for_timeout(500)
            rw = await pg.evaluate("() => { const w = document.querySelector('#mwrap'), r = w.getBoundingClientRect(), l = w.lastElementChild.getBoundingClientRect(); return { gap: r.bottom - parseFloat(getComputedStyle(w).paddingBottom) - l.bottom }; }")
            if abs(rw['gap']) > 4: res.append(f'창 크기 바꾼 뒤 달력이 다시 맞춰지지 않음(아래 빈 곳 {rw})')
            await pg.set_viewport_size({'width': W, 'height': H}); await pg.wait_for_timeout(400)
            await pg.click('#nTask'); await pg.wait_for_timeout(900); res += await pg.evaluate(CHECK); await pg.screenshot(path=f'{OUT}/PC_{W}x{H}_할일.png')
            await pg.click('#nSet'); await pg.wait_for_timeout(600); res += await pg.evaluate(CHECK); await pg.screenshot(path=f'{OUT}/PC_{W}x{H}_설정.png'); await pg.evaluate('closeAll()')
            report[f'PC {W}x{H}'] = res + errs
            await ctx.close()
        # 연결 코드 왕복 (다른 기기로 옮기기)
        ctx = await b.new_context(viewport={'width': 390, 'height': 844}); pg = await ctx.new_page(); errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.route('**/version.json*', lambda r: r.fulfill(status=404, body=''))
        await pg.goto(URL); await pg.wait_for_timeout(1500)
        rt = await pg.evaluate("() => { const o = { url: S.url, key: S.key, aiKey: S.aiKey }; S.url = 'https://script.google.com/macros/s/한글ABC/exec'; S.key = 'k3y-가나'; S.aiKey = 'AIza-x'; const c = codeMake(); const r = codeRead(c); Object.assign(S, o); return [r, codeRead('아무 글자'), codeRead('MYCAL1:깨진')]; }")
        if rt != [{'url': 'https://script.google.com/macros/s/한글ABC/exec', 'key': 'k3y-가나', 'ai': 'AIza-x'}, None, None]: errs.append(f'연결 코드 왕복 이상: {rt}')
        wp = await pg.evaluate("""() => { localStorage.setItem('cal.c.tasks', '{"x":1}'); localStorage.setItem('cal.c.months', '{}'); localStorage.setItem('cal.ai', '{}'); localStorage.setItem('cal.c.demo.tasks', '{"d":1}'); localStorage.setItem('cal.settings', localStorage.getItem('cal.settings') || '{}');
          wipeAccountCache(); return [localStorage.getItem('cal.c.tasks'), localStorage.getItem('cal.c.months'), localStorage.getItem('cal.ai'), !!localStorage.getItem('cal.c.demo.tasks'), !!localStorage.getItem('cal.settings')]; }""")
        if wp != [None, None, None, True, True]: errs.append(f'연결 해제 시 데이터 지우기 이상: {wp}')
        report['연결 코드'] = errs
        await ctx.close()
        # 캘린더↔할 일 연결 + 시작 화면 기능 검사 (390x844)
        ctx = await b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, has_touch=True)
        pg = await ctx.new_page(); errs = []; iss = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.route('**/version.json*', lambda r: r.fulfill(status=404, body=''))
        await pg.goto(URL); await pg.evaluate("localStorage.clear();localStorage.setItem('cal.settings', JSON.stringify({tab:'task', view:'week'}))"); await pg.reload()
        await pg.wait_for_selector('#cover', state='detached', timeout=5000); await pg.wait_for_timeout(1200)
        if not await pg.evaluate("() => !!document.querySelector('#mwrap') && document.querySelector('#nCal').classList.contains('on')"): iss.append('시작 화면이 캘린더 월간이 아님')
        exp = await pg.evaluate("() => { const m = {}; T.tasks.filter(x => x.due && !x.done).forEach(x => m[x.due] = (m[x.due] || 0) + 1); return m; }")
        got = await pg.evaluate("() => Object.fromEntries([...document.querySelectorAll('.mday')].filter(d => d.querySelector('.tdue:not(.ok):not(.latesum)')).map(d => [d.dataset.day, +d.querySelector('.tdue:not(.ok):not(.latesum)').innerText]))")
        vis = {k: v for k, v in exp.items() if k in await pg.evaluate("() => [...document.querySelectorAll('.mday')].map(d => d.dataset.day)")}
        if not vis: iss.append('예시 데이터에 이번 달 마감 할 일이 없음(검사 불가)')
        if got != vis: iss.append(f'월간 할 일 표시 불일치: 기대 {vis} / 화면 {got}')
        await pg.screenshot(path=f'{OUT}/연결_월간.png')
        lt = await pg.evaluate("() => { const t = ymd(sod(new Date())); return T.tasks.filter(x => x.due && !x.done && x.due < t).length; }")
        red = await pg.evaluate("() => { const e = document.querySelector('.mday.today .latesum'); return e ? +e.innerText : 0; }")
        if lt and red != lt: iss.append(f'오늘 칸 밀린 일 붉은 숫자 {red} ≠ {lt}')
        if lt:
            await pg.click('.mday.today'); await pg.wait_for_timeout(600)
            n = await pg.evaluate("() => document.querySelectorAll('.sheet .dthead.late ~ .trow.late').length")
            if n != lt: iss.append(f'오늘 시트 밀린 일 {n}개 ≠ {lt}개')
            iss += await pg.evaluate(CHECK)
            await pg.screenshot(path=f'{OUT}/연결_오늘시트.png')
            await pg.evaluate('closeAll()'); await pg.wait_for_timeout(400)
        else: iss.append('예시 데이터에 밀린 일이 없음(검사 불가)')
        day = sorted(vis.keys())[-1] if vis else None
        if day:
            await pg.click(f'.mday[data-day="{day}"]'); await pg.wait_for_timeout(600)
            n0 = await pg.evaluate("() => document.querySelectorAll('.sheet .daytasks .trow:not(.done)').length")
            if n0 != vis[day]: iss.append(f'하루 시트 할 일 {n0}개 ≠ {vis[day]}개')
            iss += [x for x in await pg.evaluate(CHECK)]
            await pg.screenshot(path=f'{OUT}/연결_하루시트.png')
            await pg.click('.sheet .daytasks label.ck >> nth=0'); await pg.wait_for_timeout(1800)
            n1 = await pg.evaluate("() => document.querySelectorAll('.sheet .daytasks .trow:not(.done)').length")
            badge = await pg.evaluate(f"() => {{ const e = document.querySelector('.mday[data-day=\"{day}\"] .tdue:not(.ok):not(.latesum)'); return e ? +e.innerText : 0; }}")
            if n1 != n0 - 1 or badge != vis[day] - 1: iss.append(f'완료 체크 후 반영 안 됨: 시트 {n0}→{n1}, 월간 {vis[day]}→{badge}')
            await pg.click('.sheet .daytasks [data-a=task] >> nth=0'); await pg.wait_for_timeout(600)
            if not await pg.evaluate("() => !!document.querySelector('#kNotes')"): iss.append('하루 시트에서 할 일 눌러도 메모가 안 열림')
            await pg.evaluate('closeAll()'); await pg.wait_for_timeout(400)
        await pg.click('#vWeek'); await pg.wait_for_timeout(800); iss += await pg.evaluate(CHECK)
        await pg.screenshot(path=f'{OUT}/연결_주간.png')
        report['캘린더↔할 일 연결·시작 화면'] = iss + errs
        await ctx.close()
        # 반복 할 일 기능 검사 (예시 데이터, 390x844)
        ctx = await b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, has_touch=True)
        pg = await ctx.new_page(); errs = []; iss = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.route('**/version.json*', lambda r: r.fulfill(status=404, body=''))
        await pg.goto(URL); await pg.evaluate('localStorage.clear()'); await pg.reload(); await pg.wait_for_selector('#cover', state='detached', timeout=5000)
        await pg.click('#nTask'); await pg.wait_for_timeout(1000)
        # 달력 완료(청록)·못 한 반복(빨강)·지난 달 기록 (v3.29)
        mk = await pg.evaluate("""async () => { const t = sod(new Date()), lid = S.listId, D = n => ymd(addD(t, n)), mk = (title, due, done, rep) => batch([{ method: 'post', url: taskUrl(lid), body: { title, notes: rep ? '↻반복=daily' : '', due: due + 'T00:00:00.000Z' } }]).then(async o => { if (done) await api('taskUpdate', { listId: lid, id: o[0].body.id, patch: { done: true } }, true); return o[0].body.id; });
          await mk('QA습관', D(-4), true, 1); await mk('QA습관', D(-2), true, 1); await mk('QA습관', D(0), false, 1); await mk('QA옛완료', D(-75), true, 0);
          await loadTasks(true); await new Promise(r => setTimeout(r, 400)); while (repBusy) await new Promise(r => setTimeout(r, 100));
          const m = calMarks(); const r = { missN: [D(-3), D(-1)].map(k => (m.missNames[k] || []).some(o => o.title === 'QA습관')), notMiss: [D(-4), D(-2), D(-5)].map(k => (m.missNames[k] || []).some(o => o.title === 'QA습관')), done4: m.done[D(-4)] || 0 };
          st.cur = sod(new Date()); st.view = 'month'; st.tab = 'cal'; render(); await new Promise(r => setTimeout(r, 300));
          const cell = k => document.querySelector('.mday[data-day="' + k + '"]'); const okIn = k => { const c = cell(k); const e = c && c.querySelector('.tdue.ok'); return e ? +e.innerText : 0; }; const redIn = k => { const c = cell(k); const e = c && c.querySelector('.tdue.late:not(.latesum)'); return e ? +e.innerText : 0; };
          r.cellOk = cell(D(-4)) ? okIn(D(-4)) >= 1 : 'skip'; r.cellRed = cell(D(-3)) ? redIn(D(-3)) >= 1 : 'skip';
          const old = addD(t, -75); st.cur = new Date(old.getFullYear(), old.getMonth(), 1); render(); for (let i = 0; i < 30 && !HIST[mkey(old)]; i++) await new Promise(r => setTimeout(r, 100)); await new Promise(r => setTimeout(r, 200));
          r.hist = !!HIST[mkey(old)]; r.histOk = okIn(D(-75)) >= 1; st.cur = sod(new Date()); render(); return r; }""")
        if mk != {'missN': [True, True], 'notMiss': [False, False, False], 'done4': 1, 'cellOk': True, 'cellRed': True, 'hist': True, 'histOk': True} and not (mk.get('cellOk') == 'skip' or mk.get('cellRed') == 'skip'): iss.append(f'달력 완료·못 한 반복 표시 이상: {mk}')
        await pg.screenshot(path=f'{OUT}/완료표시_월간.png')
        await pg.click('#vWeek'); await pg.wait_for_timeout(700); await pg.screenshot(path=f'{OUT}/완료표시_주간.png'); iss += await pg.evaluate(CHECK)
        await pg.click('#vMonth'); await pg.wait_for_timeout(600)
        await pg.evaluate("() => openDay(addD(sod(new Date()), -3))"); await pg.wait_for_timeout(700)
        if '못 한 반복' not in await pg.inner_text('.sheet'): iss.append('하루 시트에 못 한 반복이 안 보임')
        await pg.screenshot(path=f'{OUT}/완료표시_하루.png')
        # 바로잡기: 못 한 반복 체크 → 그 날 완료 기록 생김(청록), 다시 해제 → 기록 지워짐(빨강으로 복귀), 진행 중 회차는 그대로
        await pg.click('.sheet .trow.miss label.ck'); await pg.wait_for_timeout(1500)
        fx = await pg.evaluate("""() => { const k = ymd(addD(sod(new Date()), -3)), m = calMarks(); const inst = T.tasks.filter(x => x.title === 'QA습관' && x.due === k);
          return { made: inst.length, done: inst.every(x => x.done), noMarker: inst.every(x => !repOf(x.notes)), missGone: !(m.missNames[k] || []).some(o => o.title === 'QA습관'), ok: m.done[k] || 0, sheetOk: document.querySelector('.sheet').innerText.includes('완료 1'), openNow: T.tasks.filter(x => x.title === 'QA습관' && !x.done).length }; }""")
        if fx != {'made': 1, 'done': True, 'noMarker': True, 'missGone': True, 'ok': 1, 'sheetOk': True, 'openNow': 1}: iss.append(f'못 한 반복 바로잡기 이상: {fx}')
        await pg.click('.sheet .trow.done label.ck'); await pg.wait_for_timeout(1500)
        ux = await pg.evaluate("""() => { const k = ymd(addD(sod(new Date()), -3)), m = calMarks(); return { left: T.tasks.filter(x => x.title === 'QA습관' && x.due === k).length, missBack: (m.missNames[k] || []).some(o => o.title === 'QA습관'), openNow: T.tasks.filter(x => x.title === 'QA습관' && !x.done).length }; }""")
        if ux != {'left': 0, 'missBack': True, 'openNow': 1}: iss.append(f'바로잡기 취소 이상: {ux}')
        # 지난 날짜 일반 할 일: 체크하면 그 날 칸이 청록으로
        gx = await pg.evaluate("""async () => { const k = ymd(addD(sod(new Date()), -3)), lid = S.listId; const o = await batch([{ method: 'post', url: taskUrl(lid), body: { title: 'QA지난일', notes: '', due: k + 'T00:00:00.000Z' } }]); T.tasks.push(mapGTask(o[0].body, lid)); closeAll(); await new Promise(r => setTimeout(r, 300)); await openDay(pymd(k)); await new Promise(r => setTimeout(r, 500));
          const row = [...document.querySelectorAll('.sheet .trow.dt')].find(r => r.innerText.includes('QA지난일')); row.querySelector('label.ck').click(); await new Promise(r => setTimeout(r, 1700));
          const r = { done: T.tasks.find(x => x.title === 'QA지난일').done, ok: calMarks().done[k] || 0 }; await batch([{ method: 'delete', url: taskUrl(lid, o[0].body.id) }]); T.tasks = T.tasks.filter(x => x.title !== 'QA지난일'); return r; }""")
        if gx != {'done': True, 'ok': 1}: iss.append(f'지난 날짜 할 일 체크 이상: {gx}')
        await pg.evaluate('closeAll()'); await pg.wait_for_timeout(400)
        await pg.evaluate("""async () => { for (const x of T.tasks.filter(y => /^QA(습관|옛완료)/.test(y.title))) await batch([{ method: 'delete', url: taskUrl(x.listId, x.id) }]); Object.keys(HIST).forEach(k => delete HIST[k]); await loadTasks(true); }""")
        await pg.click('#nTask'); await pg.wait_for_timeout(800)
        # 경합: 새로고침이 떠 있는 동안 체크/일정 추가 → 덮이지 않아야 함
        rc = await pg.evaluate("""async () => { const row = document.querySelector('#main .trow[data-tid]:not(.done)'), id = row.dataset.tid, el = row.querySelector('input'); const p = loadTasks(true); el.checked = true; taskToggle(id, el); await p; const mid = T.tasks.find(y => y.id === id).done; await new Promise(r => setTimeout(r, 2600)); const end = T.tasks.find(y => y.id === id).done;
          const x = T.tasks.find(y => y.id === id); await api('taskUpdate', { listId: x.listId, id, patch: { done: false } }, true); await loadTasks(true); drawTasks(); return { mid, end }; }""")
        if rc != {'mid': True, 'end': True}: iss.append(f'새로고침 중 체크가 되돌아감: {rc}')
        rc2 = await pg.evaluate("""async () => { const k = mkey(new Date()), cal = st.cals.find(c => c.owned && !isHol(c.id)).id, t = sod(new Date()); await ensure(t, addD(t, 1)); const p = fetchMonths([k]);
          const r = await api('create', { event: { calId: cal, title: 'QA경합일정', allDay: true, start: ymd(t), end: ymd(addD(t, 1)), alarms: [] } }, true); cacheAdd([r.event]); await p;
          const n = () => fromCache(t, addD(t, 1)).filter(x => x.title === 'QA경합일정').length; const mid = n(); await new Promise(r => setTimeout(r, 2200)); const end = n(); await api('delete', { calId: cal, id: r.event.id }, true); cacheRemove(r.event); return { mid, end }; }""")
        if rc2 != {'mid': 1, 'end': 1}: iss.append(f'새로고침 중 추가한 일정이 사라지거나 겹침: {rc2}')
        # 글자 치는 중 뒤에서 다시 그려져도 입력칸(같은 요소·글자·커서)이 그대로인지
        ime = await pg.evaluate("""async () => { const d = document.querySelector('#tDraft'); d.focus(); d.value = '하'; d.dispatchEvent(new Event('input', { bubbles: true })); d.setSelectionRange(1, 1); drawTasks(); await loadTasks(true); drawTasks();
          const d2 = document.querySelector('#tDraft'); const r = { same: d === d2, focus: document.activeElement === d2, val: d2.value, caret: d2.selectionStart }; d2.value = ''; d2.dispatchEvent(new Event('input', { bubbles: true })); d2.blur(); return r; }""")
        if ime != {'same': True, 'focus': True, 'val': '하', 'caret': 1}: iss.append(f'입력 중 다시 그리기로 입력칸이 바뀜: {ime}')
        # 완료 시각(UTC) → 기기 날짜 비교: 한국 시간 아침에 끝낸 오늘 할 일이 '오늘' 목록에 남아 있어야 함
        tzr = await pg.evaluate("""() => { const t = sod(new Date()), k = ymd(t), lid = S.listId; const early = new Date(t.getTime() + 60000).toISOString(), old = new Date(t.getTime() - 2 * 864e5).toISOString();
          T.tasks.unshift({ id: 'qa1', listId: lid, title: 'QA아침완료', notes: '', due: k, done: true, completed: early, parent: '' }, { id: 'qa2', listId: lid, title: 'QA미리완료', notes: '', due: k, done: true, completed: old, parent: '' });
          T.showDone = true; drawTasks(); const txt = g => [...document.querySelectorAll(g)].map(e => e.innerText).join('|');
          const groups = [...document.querySelectorAll('.tgroup')].find(g => g.querySelector('h3').innerText.startsWith('오늘')); const r = { today: groups.innerText.includes('QA아침완료'), earlyInToday: groups.innerText.includes('QA미리완료'), all: document.querySelector('#tscroll').innerText.includes('QA미리완료') };
          T.tasks = T.tasks.filter(x => !String(x.id).startsWith('qa')); T.showDone = false; drawTasks(); return r; }""")
        if tzr != {'today': True, 'earlyInToday': False, 'all': True}: iss.append(f'완료 시각 날짜 비교 이상: {tzr}')
        T0 = '기출 1회 풀기'
        # 처음 등록부터 날짜·반복: 날짜 고르기 + 매주 → 추가
        await pg.fill('#tDraft', '영어 단어 30개')
        pk = await pg.evaluate("() => ymd(addD(sod(new Date()), 3))")
        await pg.evaluate("v => { const e = document.querySelector('#tPick'); e.value = v; e.dispatchEvent(new Event('change', { bubbles: true })); }", pk)
        await pg.wait_for_timeout(200)
        await pg.click('[data-trep=weekly]'); await pg.wait_for_timeout(200)
        if await pg.input_value('#tDraft') != '영어 단어 30개': iss.append('날짜·반복 고르는 중 입력한 글자가 사라짐')
        iss += await pg.evaluate(CHECK); await pg.screenshot(path=f'{OUT}/반복_처음등록.png')
        await pg.click('[data-tadd]'); await pg.wait_for_timeout(1000)
        nt = await pg.evaluate("() => T.tasks.filter(x => x.title === '영어 단어 30개').map(x => ({ due: x.due, rep: repOf(x.notes), tmp: String(x.id).startsWith('tmp') }))")
        wd = await pg.evaluate("v => pymd(v).getDay()", pk)
        if nt != [{'due': pk, 'rep': {'k': 'weekly', 'n': wd}, 'tmp': False}]: iss.append(f'처음 등록 반복·날짜 저장 이상: {nt}')
        if await pg.evaluate("() => T.rep") != '': iss.append('추가 후 반복 선택이 안 함으로 돌아가지 않음')
        await pg.fill('#tDraft', '그냥 할 일'); await pg.click('[data-when=none]'); await pg.click('[data-tadd]'); await pg.wait_for_timeout(800)
        nt2 = await pg.evaluate("() => T.tasks.filter(x => x.title === '그냥 할 일').map(x => ({ due: x.due, rep: !!repOf(x.notes) }))")
        if nt2 != [{'due': '', 'rep': False}]: iss.append(f'반복 없는 일반 추가 이상: {nt2}')
        await pg.click('[data-when=today]'); await pg.wait_for_timeout(300)
        await pg.click(f'.trow[data-tid] .tmain:has-text("{T0}")'); await pg.wait_for_timeout(500)
        await pg.click('[data-a=krep][data-v=daily]'); await pg.wait_for_timeout(200)
        iss += await pg.evaluate(CHECK); await pg.screenshot(path=f'{OUT}/반복_편집.png')
        await pg.click('[data-a=ksave]'); await pg.wait_for_timeout(1200)
        st_ = await pg.evaluate(f"() => {{ const xs = T.tasks.filter(x => x.title === '{T0}'); return {{ n: xs.length, notes: xs.map(x => x.notes), rep: xs.map(x => repOf(x.notes) && repOf(x.notes).k) }}; }}")
        if st_['rep'] != ['daily']: iss.append(f'반복 저장 실패: {st_}')
        if '↻ 매일' not in await pg.inner_text('#main'): iss.append('할 일 목록에 ↻ 매일 표시 없음')
        if '↻반복' in await pg.inner_text('#main'): iss.append('반복 표식 글자가 화면에 보임')
        await pg.screenshot(path=f'{OUT}/반복_목록.png')
        # 다음 날 흉내: 오늘 회차를 어제 마감·완료로 바꾸고 다시 불러오기 → 오늘 회차 1개 새로 생겨야 함
        cnt = """async (t) => { await loadTasks(true); await new Promise(r => setTimeout(r, 900)); while (repBusy) await new Promise(r => setTimeout(r, 100)); const k = ymd(sod(new Date())); const xs = T.tasks.filter(x => x.title === t); return { all: xs.length, todayOpen: xs.filter(x => x.due === k && !x.done).length, open: xs.filter(x => !x.done).map(x => x.due) }; }"""
        await pg.evaluate(f"async () => {{ const x = T.tasks.find(y => y.title === '{T0}'); await api('taskUpdate', {{ listId: x.listId, id: x.id, patch: {{ due: ymd(addD(sod(new Date()), -1)), done: true }} }}, true); }}")
        r1 = await pg.evaluate(cnt, T0)
        if r1['todayOpen'] != 1 or r1['all'] != 2: iss.append(f'다음 날 새 회차 생성 이상: {r1}')
        r2 = await pg.evaluate(cnt, T0)
        if r2['all'] != 2: iss.append(f'다시 불러오면 중복 생성됨: {r2}')
        # 밀린 회차: 열린 회차를 3일 전으로 → 오늘로 옮겨져야(새로 만들지 않음)
        await pg.evaluate(f"async () => {{ const x = T.tasks.find(y => y.title === '{T0}' && !y.done); await api('taskUpdate', {{ listId: x.listId, id: x.id, patch: {{ due: ymd(addD(sod(new Date()), -3)) }} }}, true); }}")
        r3 = await pg.evaluate(cnt, T0)
        if r3['all'] != 2 or r3['todayOpen'] != 1: iss.append(f'밀린 회차 오늘로 옮기기 이상: {r3}')
        # 이름 변경 → 옛 이름이 다시 생기면 안 됨 / 반복 끔 → 다시 안 생김
        await pg.click('#nCal'); await pg.wait_for_timeout(600); await pg.click('#nTask'); await pg.wait_for_timeout(800)
        await pg.click(f'.trow[data-tid] .tmain:has-text("{T0}")'); await pg.wait_for_timeout(500)
        await pg.fill('#kTitle', 'QA새이름'); await pg.click('[data-a=ksave]'); await pg.wait_for_timeout(1200)
        await pg.evaluate("async () => { const x = T.tasks.find(y => y.title === 'QA새이름' && !y.done); await api('taskUpdate', { listId: x.listId, id: x.id, patch: { due: ymd(addD(sod(new Date()), -1)), done: true } }, true); }")
        rn_old = await pg.evaluate(cnt, T0); rn_new = await pg.evaluate(cnt, 'QA새이름')
        if rn_old['open'] or rn_old['all'] != 1: iss.append(f'이름 바꾼 뒤 옛 이름 회차가 다시 생김: {rn_old}')
        if rn_new['todayOpen'] != 1: iss.append(f'이름 바꾼 뒤 새 이름으로 반복이 안 이어짐: {rn_new}')
        left = await pg.evaluate(f"() => T.tasks.filter(x => x.title === '{T0}' && repOf(x.notes)).length")
        if left: iss.append(f'옛 이름 회차에 반복 표식이 {left}개 남음')
        await pg.click('#nCal'); await pg.wait_for_timeout(600); await pg.click('#nTask'); await pg.wait_for_timeout(800)
        await pg.click('.trow[data-tid]:not(.done) .tmain:has-text("QA새이름")'); await pg.wait_for_timeout(500)
        await pg.fill('#kTitle', '기출 1회 풀기'); await pg.click('[data-a=ksave]'); await pg.wait_for_timeout(1200)
        u2 = await pg.evaluate("""() => [repOf('메모\\n↻반복=daily\\n덧붙인 글'), repStrip('메모\\n↻반복=daily\\n덧붙인 글'), repOf('↻반복=monthly:31'), repStrip('↻반복=weekly:2\\n뒤'), repSet('a', 'monthly', '2026-11-30', 31), repOf('글 중간 ↻반복=daily 은 표식 아님')]""")
        if u2 != [{'k': 'daily', 'n': None}, '메모\n덧붙인 글', {'k': 'monthly', 'n': 31}, '뒤', 'a\n↻반복=monthly:31', None]: iss.append(f'반복 표식 인식 이상: {u2}')
        # 100개 넘는 목록: 데이터 창구가 100개에서 자른 것처럼 흉내 → 나머지를 끝까지 읽어 채우는지
        pgq = await pg.evaluate("""async () => { const lid = S.listId; await Promise.all(Array.from({ length: 104 }, (_, i) => api('taskAdd', { listId: lid, title: 'QA대량' + i, due: '' }, true)));
          const real = api; let cut = 0; api = async (a, p, post) => { const r = await real(a, p, post); if (a === 'tasks') { const mine = r.tasks.filter(t => t.listId === lid); cut = mine.length - 100; const keep = new Set(mine.slice(0, 100).map(t => t.id)); r.tasks = r.tasks.filter(t => t.listId !== lid || keep.has(t.id)); } return r; };
          await new Promise(r => setTimeout(r, 300)); await loadTasks(true); api = real; const ids = T.tasks.filter(t => t.listId === lid).map(t => t.id);
          return { cut: cut > 0, all: T.tasks.filter(t => /^QA대량/.test(t.title)).length, dup: ids.length - new Set(ids).size }; }""")
        if pgq != {'cut': True, 'all': 104, 'dup': 0}: iss.append(f'100개 넘는 목록 채우기 이상: {pgq}')
        # 삭제하면 반복 멈춤
        await pg.click('#nCal'); await pg.wait_for_timeout(600); await pg.click('#nTask'); await pg.wait_for_timeout(800)
        await pg.click(f'.trow[data-tid] .tmain:has-text("{T0}")'); await pg.wait_for_timeout(500)
        await pg.click('#kDel'); await pg.click('#kDel'); await pg.wait_for_timeout(1000)
        r4 = await pg.evaluate(cnt, T0)
        if r4['open']: iss.append(f'삭제 후에도 반복이 다시 생김: {r4}')
        # 규칙 계산 단위 검사
        u = await pg.evaluate("""() => { const d = s => pymd(s); return [repHits({k:'weekday'}, d('2026-11-08')), repHits({k:'weekday'}, d('2026-11-09')), repHits({k:'weekly', n:1}, d('2026-11-09')), repHits({k:'monthly', n:31}, d('2026-11-30')), repHits({k:'monthly', n:31}, d('2026-11-29')), ymd(repNext({k:'weekly', n:1}, d('2026-11-08'))), ymd(repNext({k:'weekday'}, d('2026-11-08'))), repSet('메모', 'weekly', '2026-11-09'), repStrip('메모\\n↻반복=weekly:1')]; }""")
        if u != [False, True, True, True, False, '2026-11-09', '2026-11-09', '메모\n↻반복=weekly:1', '메모']: iss.append(f'반복 규칙 계산 이상: {u}')
        report['반복 할 일'] = iss + errs
        await ctx.close()
        # 회사 PC 흉내: 앱스 스크립트가 보여 주는 화면(iframe 안) + github.io 완전 차단 (Code.gs appPage_와 같은 변환)
        import re as _re
        src = await (await b.new_context()).new_page()
        page_html = await (await src.goto(URL)).text(); await src.context.close()
        page_html = _re.sub(r'<head>', '<head><base href="https://kangkong00.github.io/my-calendar/"><script>window.__APP_HOST="gas";window.__BACKEND_URL="https://script.google.com/macros/s/TEST/exec";</script>', page_html, count=1, flags=_re.I)
        outer = '<!doctype html><html><body style="margin:0"><iframe id="f" src="https://n-x-script.googleusercontent.test/p" style="border:0;width:100vw;height:100vh" sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"></iframe></body></html>'
        ctx = await b.new_context(viewport={'width': 1280, 'height': 800}); errs = []; iss = []
        async def gr(r):
            u = r.request.url
            if 'github.io' in u: return await r.abort()
            if u.startswith('https://script.google.test/'): return await r.fulfill(status=200, body=outer, content_type='text/html')
            if 'googleusercontent.test' in u: return await r.fulfill(status=200, body=page_html, content_type='text/html')
            return await r.continue_()
        await ctx.route('**/*', gr)
        pg = await ctx.new_page(); pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto('https://script.google.test/macros/s/TEST/exec'); await pg.wait_for_timeout(5000)
        fr = [x for x in pg.frames if 'googleusercontent' in x.url]
        if not fr: iss.append('iframe 안 열림')
        else:
            fr = fr[0]
            g = await fr.evaluate("() => ({ month: !!document.querySelector('#mwrap .mday'), cover: !!document.getElementById('cover'), gas: viaGas(), url: location.href })")
            if not (g['month'] and not g['cover'] and g['gas'] and 'googleusercontent' in g['url']): iss.append(f'구글 주소 화면 이상: {g}')
            await fr.click('#nSet'); await pg.wait_for_timeout(600)
            if await fr.evaluate("() => document.querySelector('#sUrl').value") != 'https://script.google.com/macros/s/TEST/exec': iss.append('주소 칸 미리 채움 안 됨')
            iss += await fr.evaluate(CHECK)
            await pg.screenshot(path=f'{OUT}/회사PC_구글주소.png')
        report['회사 PC(github 차단, 구글 주소로 열기)'] = iss + errs
        await ctx.close()
        await b.close()
    bad = {k: v for k, v in report.items() if v}
    print(json.dumps(bad, ensure_ascii=False, indent=1) if bad else '검수 통과: 문제 없음')
    return 1 if bad else 0

sys.exit(asyncio.run(run()))
