<script>
'use strict';
const APP_V = '3.23';
/* ========== 기본 도구 ========== */
const $ = s => document.querySelector(s);
const pad = n => String(n).padStart(2, '0');
const WD = ['일', '월', '화', '수', '목', '금', '토'];
const ymd = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
const pymd = s => { const [a, b, c] = s.slice(0, 10).split('-').map(Number); return new Date(a, b - 1, c); };
const addD = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const sod = d => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const same = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
const mins = d => d.getHours() * 60 + d.getMinutes();
const ko = m => { m = ((m % 1440) + 1440) % 1440; const h = Math.floor(m / 60), mi = m % 60; return (h < 12 ? '오전 ' : '오후 ') + ((h % 12) || 12) + ':' + pad(mi); };
const koD = d => (d.getMonth() + 1) + '월 ' + d.getDate() + '일 (' + WD[d.getDay()] + ')';
const md = d => (d.getMonth() + 1) + '/' + d.getDate();
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const isoLocal = d => { const o = -d.getTimezoneOffset(), sg = o >= 0 ? '+' : '-', a = Math.abs(o); return ymd(d) + 'T' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':00' + sg + pad(Math.floor(a / 60)) + ':' + pad(a % 60); };
const mkey = d => d.getFullYear() + '-' + pad(d.getMonth() + 1);
const lum = hex => { const h = (hex || '#888888').replace('#', ''); const v = [0, 2, 4].map(i => { const c = parseInt(h.substr(i, 2), 16) / 255; return c <= .03928 ? c / 12.92 : Math.pow((c + .055) / 1.055, 2.4); }); return .2126 * v[0] + .7152 * v[1] + .0722 * v[2]; };
const fg = hex => { try { const L = lum(hex); return (L + .05) / .055 >= 1.05 / (L + .05) ? '#1A120D' : '#FFFFFF'; } catch (e) { return '#FFFFFF'; } };
const ICON = {
  x: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  plus: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  chk: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#140D09" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  chev: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 6l6 6-6 6"/></svg>',
  chevL: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M15 6l-6 6 6 6"/></svg>',
  spark: '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.2 6.3L20.5 10l-6.3 2.2L12 18.5l-2.2-6.3L3.5 10l6.3-1.7z"/><path d="M19 15l.9 2.4 2.4.9-2.4.9L19 21.6l-.9-2.4-2.4-.9 2.4-.9z" opacity=".7"/></svg>'
};
const ckHTML = (label, attrs) => '<label class="ck"><input type="checkbox" aria-label="' + esc(label) + '" ' + attrs + '><span class="ckbox">' + ICON.chk + '</span><i class="ring"></i><i class="sp s1"></i><i class="sp s2"></i><i class="sp s3"></i><i class="sp s4"></i></label>';

/* ========== 설정 & 저장소 ========== */
const DEF = { url: '', key: '', hiddenMonth: [], hideTags: true, view: 'month', tab: 'cal', listId: '', showPlans: false };
let S = Object.assign({}, DEF);
try { S = Object.assign({}, DEF, JSON.parse(localStorage.getItem('cal.settings') || '{}')); } catch (e) {}
const save = () => { try { localStorage.setItem('cal.settings', JSON.stringify(S)); } catch (e) {} };
const demo = () => !S.url || !S.key;
const tagless = t => S.hideTags ? (String(t).replace(/^\s*\[[^\]]+\]\s*/, '') || t) : t;
const store = {
  get(k) { try { return JSON.parse(localStorage.getItem('cal.c.' + (demo() ? 'demo.' : '') + k) || 'null'); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem('cal.c.' + (demo() ? 'demo.' : '') + k, JSON.stringify(v)); } catch (e) {} }
};

/* ========== 예시 데이터 ========== */
const Demo = (() => {
  const cals = [
    ['ko.south_korea#holiday@group.v.calendar.google.com', '대한민국의 휴일', '#9E5B4A', false],
    ['me', '[[강프로]]', '#8E6B3A', true], ['edu', '<교육>', '#5DB07A', true], ['att', '<근태>', '#8D8D8D', true],
    ['meet', '<미팅>', '#039BE5', true], ['trip', '<출장>', '#616161', true], ['biz', '<업무>', '#4E9A6A', true],
    ['conf', '<회의>', '#3F51B5', true], ['fam', '[Family]행복하자', '#7B7397', true], ['sleep', '[Sleep]수면하자', '#D9BFC0', true],
    ['work', '[Work]업무하자', '#E3A35E', true], ['study', '[Study]공부하자', '#9A5BB5', true], ['golf', '[Golf]골프하자', '#A3908B', true],
    ['sport', '[Sports]운동하자', '#33B679', true], ['ai', '[AI]자동하자', '#616161', true], ['read', '[Reading]독서하자', '#E67C73', true]
  ].map(c => ({ id: c[0], name: c[1], color: c[2], owned: c[3], primary: c[0] === 'me' }));
  let evs = [], seq = 1, tasks = [], phases = [];
  const col = id => (cals.find(x => x.id === id) || {}).color;
  const t = new Date(), today = sod(t), base = new Date(t.getFullYear(), t.getMonth(), 1);
  const at = (d, m) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, m);
  const add = (cal, title, d, s, e, allDay, endD, extra) => {
    if (allDay) evs.push(Object.assign({ id: 'd' + seq++, calId: cal, title, allDay: true, start: ymd(d), end: ymd(endD || addD(d, 1)), color: col(cal), location: '', desc: '', recurring: false }, extra || {}));
    else evs.push({ id: 'd' + seq++, calId: cal, title, allDay: false, start: isoLocal(at(d, s)), end: isoLocal(at(d, e)), color: col(cal), location: '', desc: '', recurring: true });
  };
  for (let i = -40; i < 70; i++) {
    const d = addD(base, i), w = d.getDay();
    add('sleep', '[Sleep]수면하자', d, 23 * 60 + 30, 24 * 60 + 390);
    if (w > 0 && w < 6) { add('work', '[Work]업무하자', d, 480, 1050); if (i % 3 === 0) add('golf', '[Golf]골프하자', d, 360, 420); add('fam', '[Family]행복하자', d, 1110, 1260); }
    if (w === 2) add('study', '[Study]공부하자', d, 1290, 1350);
  }
  [['biz', 'SP E/T 폐수 점검', 2, 540, 600], ['biz', '2공장 저농도 배관', 3, 600, 660], ['conf', '팀 회의', 4, 810, 900], ['meet', '업체 통화', 5, 630, 660], ['biz', '사무용품 신청', 10, 600, 630], ['biz', '그룹안전위원회', 10, 840, 960], ['golf', '라운딩', 12, 420, 720], ['edu', 'Copilot 활용 교육', 17, 840, 960], ['golf', '라운딩', 25, 420, 720], ['fam', '리라 송년의 밤', 26, 1110, 1320]].forEach(x => { add(x[0], x[1], addD(base, x[2]), x[3], x[4]); evs[evs.length - 1].recurring = false; });
  add('edu', 'M365 Copilot 실무 교육', addD(base, 22), 0, 0, true, addD(base, 24));
  add('trip', '본사 출장', addD(base, 11), 0, 0, true, addD(base, 13));
  add('att', '연차', addD(base, 19), 0, 0, true);
  add('ko.south_korea#holiday@group.v.calendar.google.com', '공휴일(예시)', addD(base, 14), 0, 0, true);
  const P = [['p1', '업무', 'biz', '방지시설 개선 보고', [['현황 조사', 3, 7], ['개선안 작성', 10, 21], ['보고', 24, 28]]], ['p2', '업무', 'biz', '연말 실적 정리', [['자료 수집', 17, 28], ['보고서', 31, 42]]],
    ['p4', '공부', 'study', '자격증 준비', [['이론', -66, -6], ['기출', -5, 55], ['모의고사', 56, 100]]], ['p6', '개인', 'golf', '골프 스코어 목표', [['1단계 목표', -66, -6], ['2단계 목표', -5, 55]]], ['p7', '개인', 'read', '올해 책 12권', [['상반기 6권', -304, -124], ['하반기 6권', -123, 60]]]];
  P.forEach(p => p[4].forEach((ph, i) => { const s = addD(today, ph[1] - 3), e = addD(today, ph[2] - 3); phases.push({ id: 'g' + seq++, calId: p[2], title: p[3] + ' · ' + ph[0], allDay: true, start: ymd(s), end: ymd(addD(e, 1)), color: col(p[2]), gantt: { gantt: '1', proj: p[0], pname: p[3], group: p[1], idx: String(i), phase: ph[0], done: e < today ? '1' : '0' } }); }));
  const lists = [{ id: 'L1', title: '내 할 일' }, { id: 'L2', title: '업무' }];
  [['주간 점검표 정리', -2], ['폐기물 위탁 계약서 확인', -1], ['약품 재고 확인', 0], ['교대조 근무표 검토', 0, true], ['기출 1회 풀기', 0], ['운영일지 서명', 3], ['월간 실적 자료 준비', 7], ['골프장 예약', null], ['세차 예약', null]].forEach(x => tasks.push({ id: 't' + seq++, listId: 'L1', title: x[0], notes: '', due: x[1] == null ? '' : ymd(addD(today, x[1])), done: !!x[2], completed: '', parent: '' }));
  const inRange = (x, s, e) => { const xs = x.allDay ? pymd(x.start) : new Date(x.start), xe = x.allDay ? pymd(x.end) : new Date(x.end); return xs < e && xe > s; };
  return {
    ping: () => ({ ok: true }),
    calendars: () => ({ ok: true, calendars: cals }),
    events: p => ({ ok: true, events: evs.concat(phases).filter(x => inRange(x, new Date(p.start), new Date(p.end))) }),
    create: p => { const ev = Object.assign({ id: 'd' + seq++, color: col(p.event.calId), recurring: !!(p.event.repeat && p.event.repeat.freq) }, p.event); delete ev.repeat; evs.push(ev); return { ok: true, event: ev }; },
    duplicate: p => { const out = []; p.items.forEach(it => p.dates.forEach(d => { const b = pymd(d); let x; if (it.allDay) { const len = Math.max(1, Math.round((pymd(it.end) - pymd(it.start)) / 864e5)); x = Object.assign({}, it, { start: ymd(b), end: ymd(addD(b, len)) }); } else { const os = new Date(it.start), oe = new Date(it.end), st = at(b, mins(os) + Number(p.shift || 0)); x = Object.assign({}, it, { start: isoLocal(st), end: isoLocal(new Date(st.getTime() + (oe - os))) }); } x.id = 'd' + seq++; x.color = col(it.calId); x.recurring = false; evs.push(x); out.push(x); })); return { ok: true, events: out }; },
    delete: p => { evs = evs.filter(x => x.id !== p.id); return { ok: true }; },
    batch: p => ({ ok: true, results: p.requests.map(r => {
      const u = decodeURIComponent(r.url), m = r.method;
      const ml = u.match(/\/lists\/([^/]+)\/tasks(?:\?(.*))?$/);
      if (ml) { // 목록 조회(dueMin)·새 할 일 — 반복 할 일 엔진용
        const lid = ml[1], gt = x => ({ id: x.id, title: x.title, notes: x.notes, due: x.due ? x.due + 'T00:00:00.000Z' : undefined, status: x.done ? 'completed' : 'needsAction' });
        if (m === 'post') { const b = r.body || {}, x = { id: 't' + seq++, listId: lid, title: b.title || '', notes: b.notes || '', due: b.due ? b.due.slice(0, 10) : '', done: false, completed: '', parent: '' }; tasks.unshift(x); return { code: 200, body: gt(x) }; }
        const dm = (new URLSearchParams(ml[2] || '').get('dueMin') || '').slice(0, 10);
        return { code: 200, body: { items: tasks.filter(x => x.listId === lid && (!dm || (x.due && x.due >= dm))).map(gt) } };
      }
      let mt = u.match(/\/lists\/([^/]+)\/tasks\/([^/?]+)/);
      if (mt) { const x = tasks.find(y => y.id === mt[2]); if (!x) return { code: 404, body: null }; if (m === 'delete') { tasks = tasks.filter(y => y.id !== x.id && y.parent !== x.id); return { code: 204, body: null }; } const b = r.body || {}; if (b.title != null) x.title = b.title; if (b.notes !== undefined) x.notes = b.notes || ''; if (b.due !== undefined) x.due = b.due ? b.due.slice(0, 10) : ''; return { code: 200, body: { id: x.id, title: x.title, notes: x.notes, due: x.due ? x.due + 'T00:00:00.000Z' : undefined, status: x.done ? 'completed' : 'needsAction' } }; }
      mt = u.match(/\/calendars\/([^/]+)\/events(?:\/([^/?]+))?(\/move\?destination=(.+))?/); if (!mt) return { code: 404, body: null };
      const res = x => ({ id: x.id, summary: x.title, location: x.location, description: x.desc, start: x.allDay ? { date: x.start } : { dateTime: x.start }, end: x.allDay ? { date: x.end } : { dateTime: x.end }, extendedProperties: x.gantt ? { private: x.gantt } : undefined });
      if (!mt[2] && m === 'post') { const b = r.body, pv = b.extendedProperties && b.extendedProperties.private; const x = { id: 'd' + seq++, calId: mt[1], title: b.summary, allDay: !!b.start.date, start: b.start.date || b.start.dateTime, end: b.end.date || b.end.dateTime, color: col(mt[1]), location: b.location || '', desc: b.description || '', recurring: false, gantt: pv && pv.gantt === '1' ? Object.assign({}, pv) : null }; (x.gantt ? phases : evs).push(x); return { code: 200, body: res(x) }; }
      const x = evs.concat(phases).find(y => y.id === mt[2]); if (!x) return { code: 404, body: null };
      if (m === 'delete') { evs = evs.filter(y => y !== x); phases = phases.filter(y => y !== x); return { code: 204, body: null }; }
      if (mt[3]) { x.calId = mt[4]; x.color = col(x.calId); }
      if (m === 'patch') { const b = r.body; if (b.summary != null) x.title = b.summary; if (b.location !== undefined) x.location = b.location; if (b.description !== undefined) x.desc = b.description; if (b.start) { x.allDay = !!b.start.date; x.start = b.start.date || b.start.dateTime; x.end = b.end.date || b.end.dateTime; } if (b.extendedProperties) x.gantt = Object.assign({}, b.extendedProperties.private); }
      return { code: 200, body: res(x) };
    }) }),
    createCalendar: p => { const c = { id: 'c' + seq++, name: p.name, color: p.color, owned: true, primary: false }; cals.push(c); return { ok: true, calendar: c }; },
    tasks: () => ({ ok: true, lists, tasks: tasks.map(x => Object.assign({}, x)) }),
    taskAdd: p => { const x = { id: 't' + seq++, listId: p.listId, title: p.title, notes: '', due: p.due || '', done: false, completed: '', parent: '' }; tasks.unshift(x); return { ok: true, task: x }; },
    taskUpdate: p => { const x = tasks.find(y => y.id === p.id); Object.assign(x, p.patch); return { ok: true, task: x }; },
    gantt: () => ({ ok: true, phases }),
    ganttCreate: p => { const pid = 'p' + seq++; const out = p.plan.phases.map((ph, i) => ({ id: 'g' + seq++, calId: p.plan.calId, title: p.plan.name + ' · ' + ph.name, allDay: true, start: ph.start, end: ymd(addD(pymd(ph.end), 1)), color: col(p.plan.calId), gantt: { gantt: '1', proj: pid, pname: p.plan.name, group: p.plan.group, idx: String(i), phase: ph.name, done: '0' } })); phases = phases.concat(out); return { ok: true, phases: out }; },
    ganttDone: p => { const x = phases.find(y => y.id === p.id); if (x) x.gantt.done = p.done ? '1' : '0'; return { ok: true }; }
  };
})();

/* ========== 서버 통신 ========== */
let busy = 0;
const syncDot = () => { const m = $('#main'); let d = m.querySelector('.sync'); if (busy > 0 && !d) { d = document.createElement('i'); d.className = 'sync'; m.appendChild(d); } if (busy <= 0 && d) d.remove(); };
async function api(action, params = {}, post = false) {
  busy++; syncDot();
  try {
    if (demo()) { await new Promise(r => setTimeout(r, 150)); const r = Demo[action](JSON.parse(JSON.stringify(params))); if (!r.ok) throw new Error(r.error); return JSON.parse(JSON.stringify(r)); }
    let res; const ac = new AbortController(), to = setTimeout(() => ac.abort(), 30000);
    try {
      if (post) res = await fetch(S.url, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(Object.assign({ action, key: S.key }, params)), signal: ac.signal });
      else res = await fetch(S.url + (S.url.includes('?') ? '&' : '?') + new URLSearchParams(Object.assign({ action, key: S.key }, params)).toString(), { signal: ac.signal });
    } catch (e) { throw new Error(e.name === 'AbortError' ? '서버 응답이 너무 늦어요. 잠시 뒤 다시 해 주세요' : '인터넷 연결을 확인해 주세요'); }
    finally { clearTimeout(to); }
    let j; try { j = await res.json(); } catch (e) { throw new Error('서버 응답을 읽지 못했어요 (' + res.status + ')'); }
    if (!j.ok) throw new Error(j.error || '오류');
    return j;
  } finally { busy--; syncDot(); }
}
function toast(msg) { const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg; document.body.appendChild(t); setTimeout(() => t.remove(), 2500); }

/* ========== 일정 데이터: 월 단위 캐시 ========== */
// 앱을 열면 항상 캘린더 월간·이번 달에서 시작 (사용자 확정, v3.17). 마지막 화면은 기억하지 않음.
const st = { view: 'month', tab: 'cal', cur: sod(new Date()), cals: [], calMap: {} };
const M = { months: {}, ts: {}, pending: {} };
const isHol = id => /#holiday@/.test(id || '');
// 종일 일정이거나 24시간 이상인 일정만 막대. 밤 11시 30분~아침 6시 30분 같은 일정은 시간 일정.
const normal = e => { const s = e.allDay ? pymd(e.start) : new Date(e.start), en = e.allDay ? pymd(e.end) : new Date(e.end); return Object.assign({}, e, { s, e: en, bar: !!e.allDay || (en - s) >= 864e5 }); };
function setCals(list) { st.cals = list; st.calMap = {}; list.forEach(c => st.calMap[c.id] = c); store.set('cals', list); }
function loadLocal() {
  const c = store.get('cals'); if (c) setCals(c);
  const m = store.get('months'); if (m) { M.months = m.months || {}; M.ts = m.ts || {}; }
}
function persistMonths() {
  const keys = Object.keys(M.months).sort(), keep = keys.slice(-8), months = {}, ts = {};
  keep.forEach(k => { months[k] = M.months[k]; ts[k] = M.ts[k]; }); store.set('months', { months, ts });
}
const monthStart = k => { const [y, m] = k.split('-').map(Number); return new Date(y, m - 1, 1); };
const monthsOf = (s, e) => { const out = []; let d = new Date(s.getFullYear(), s.getMonth(), 1); while (d < e) { out.push(mkey(d)); d = new Date(d.getFullYear(), d.getMonth() + 1, 1); } return out; };
async function fetchMonths(keys) {
  keys = keys.slice().sort(); const pk = keys.join(',');
  if (M.pending[pk]) return M.pending[pk];
  const s = monthStart(keys[0]), e = new Date(monthStart(keys[keys.length - 1]).getFullYear(), monthStart(keys[keys.length - 1]).getMonth() + 1, 1);
  M.pending[pk] = api('events', { start: isoLocal(s), end: isoLocal(e) }).then(r => {
    const before = keys.map(k => JSON.stringify(M.months[k] || null)).join('');
    keys.forEach(k => { M.months[k] = []; M.ts[k] = Date.now(); });
    r.events.forEach(ev => { const n = normal(ev); keys.forEach(k => { const a = monthStart(k), b = new Date(a.getFullYear(), a.getMonth() + 1, 1); if (n.s < b && n.e > a) M.months[k].push(ev); }); });
    persistMonths();
    return keys.map(k => JSON.stringify(M.months[k])).join('') !== before;
  }).finally(() => { delete M.pending[pk]; });
  return M.pending[pk];
}
function fromCache(s, e) {
  const seen = {}, out = [];
  monthsOf(s, e).forEach(k => (M.months[k] || []).forEach(ev => { const id = ev.calId + '|' + ev.id + '|' + ev.start; if (seen[id]) return; seen[id] = 1; const n = normal(ev); if (n.s < e && n.e > s) out.push(n); }));
  return out;
}
const hasAll = (s, e) => monthsOf(s, e).every(k => M.months[k]);
async function ensure(s, e) { const miss = monthsOf(s, e).filter(k => !M.months[k]); if (miss.length) await fetchMonths(miss); }
function refreshStale(s, e, maxAge, cb) {
  const ks = monthsOf(s, e).filter(k => !M.ts[k] || Date.now() - M.ts[k] > maxAge);
  if (!ks.length) return;
  fetchMonths(ks).then(changed => { if (changed && cb) cb(); }).catch(() => {});
}
function cacheAdd(evs) { evs.forEach(ev => { const n = normal(ev); monthsOf(n.s, new Date(Math.max(n.e.getTime(), n.s.getTime() + 1))).forEach(k => { if (M.months[k]) M.months[k].push(ev); }); }); persistMonths(); }
function cacheRemove(ev) { Object.keys(M.months).forEach(k => { M.months[k] = M.months[k].filter(x => !(x.id === ev.id && x.calId === ev.calId && x.start === ev.start)); }); persistMonths(); }
const onDay = (list, d) => { const a = sod(d), b = addD(a, 1); return list.filter(x => x.s < b && x.e > a); };
const visibleCal = c => !st.calMap[c] || st.calMap[c].selected !== false;
const shown = x => visibleCal(x.calId) && (S.showPlans || !x.gantt);

/* ========== 머리글 / 탭 ========== */
function setHeader() {
  const c = st.cur, cal = st.tab === 'cal';
  $('#hCal').style.display = cal ? '' : 'none'; $('#hAlt').style.display = cal ? 'none' : '';
  if (cal) {
    if (st.view === 'month') { $('#ttlSmall').textContent = c.getFullYear(); $('#ttl').textContent = (c.getMonth() + 1) + '월'; }
    else { const a = addD(c, -c.getDay()), b = addD(a, 6), cm = b.getMonth() !== a.getMonth(); $('#ttlSmall').textContent = (b.getFullYear() !== a.getFullYear() ? a.getFullYear() + '–' + String(b.getFullYear()).slice(2) : a.getFullYear()) + ' · ' + (a.getMonth() + 1) + (cm ? '–' + (b.getMonth() + 1) : '') + '월'; $('#ttl').textContent = a.getDate() + '일 – ' + b.getDate() + '일'; }
    $('#vMonth').classList.toggle('on', st.view === 'month'); $('#vWeek').classList.toggle('on', st.view === 'week');
  } else if (st.tab === 'task') { $('#ttlSmall').textContent = 'TASKS'; $('#ttl').textContent = '할 일'; }
  else { $('#ttlSmall').textContent = 'LONG-TERM'; $('#ttl').textContent = '계획'; }
  ['nCal', 'nTask', 'nGantt'].forEach((id, i) => $('#' + id).classList.toggle('on', ['cal', 'task', 'gantt'][i] === st.tab));
  $('#bannerSlot').innerHTML = demo() ? '<div class="banner"><span>예시 데이터로 보는 중입니다</span><button data-go="settings">구글 캘린더 연결</button></div>' : (S.sv && S.sv < 3 ? '<div class="banner"><span>데이터 창구 업데이트가 한 번 필요해요</span><button data-go="upd">방법 보기</button></div>' : '');
}
function fitTitle() {
  const h = $('#ttl'), box = $('#titleBtn'); if (!h || !box) return;
  h.style.fontSize = ''; h.style.letterSpacing = '';
  let f = parseFloat(getComputedStyle(h).fontSize), n = 0;
  while (h.scrollWidth > box.clientWidth + 0.5 && f > 15 && n++ < 20) { f -= 1; h.style.fontSize = f + 'px'; h.style.letterSpacing = '1px'; }
  const sm = $('#ttlSmall'); sm.style.letterSpacing = ''; if (sm.scrollWidth > box.clientWidth + 0.5) sm.style.letterSpacing = '0.5px';
}
addEventListener('resize', () => fitTitle());
function render(dir) {
  setHeader(); fitTitle();
  if (st.tab === 'cal') return st.view === 'month' ? renderMonth(dir) : renderWeek(dir);
  if (st.tab === 'task') return renderTasks();
  return renderGantt();
}

/* ========== 월간 ========== */
function monthBounds() { const c = st.cur, first = new Date(c.getFullYear(), c.getMonth(), 1), start = addD(first, -first.getDay()), last = new Date(c.getFullYear(), c.getMonth() + 1, 0), nW = Math.ceil((first.getDay() + last.getDate()) / 7); return { first, start, nW, end: addD(start, nW * 7) }; }
async function renderMonth(dir) {
  const { start, end } = monthBounds();
  drawMonth(dir);
  if (!hasAll(start, end)) { try { await ensure(start, end); } catch (err) { toast('불러오기 실패: ' + err.message); } if (st.tab === 'cal' && st.view === 'month') drawMonth(); }
  else refreshStale(start, end, 60000, () => { if (st.tab === 'cal' && st.view === 'month') drawMonth(); });
  const c = st.cur; prefetch(new Date(c.getFullYear(), c.getMonth() - 1, 1), new Date(c.getFullYear(), c.getMonth() + 2, 1));
  syncCalTasks();
}
function prefetch(s, e) { const miss = monthsOf(s, e).filter(k => !M.months[k]); if (miss.length) fetchMonths(miss).catch(() => {}); }
function drawMonth(dir) {
  const c = st.cur, { start, nW, end } = monthBounds();
  const main = $('#main');
  main.innerHTML = '<div class="wdrow">' + WD.map(w => '<span>' + w + '</span>').join('') + '</div><div class="month ' + (dir ? 'anim-' + dir : '') + '" id="mwrap"></div>';
  const wrap = $('#mwrap');
  const list = fromCache(start, end).filter(shown);
  const today = sod(new Date());
  const rowH = (wrap.clientHeight || 600) / nW, CH = 17, GAP = 2, TOP = 26;
  const maxL = Math.max(1, Math.floor((rowH - TOP - 16) / (CH + GAP)));
  const vis = list.filter(x => !S.hiddenMonth.includes(x.calId));
  const due = dueCount(), tk = ymd(today), lateN = lateCount();
  let html = '';
  for (let w = 0; w < nW; w++) {
    const a = addD(start, w * 7), b = addD(a, 7);
    const bars = vis.filter(x => x.bar && x.s < b && x.e > a).sort((p, q) => (q.e - q.s) - (p.e - p.s) || p.s - q.s);
    const lanes = [], more = [0, 0, 0, 0, 0, 0, 0]; let chips = '';
    bars.forEach(x => {
      const c0 = Math.max(0, Math.round((sod(x.s) - a) / 864e5)), c1 = Math.min(6, Math.round((sod(new Date(x.e.getTime() - 1)) - a) / 864e5));
      let L = 0; while (lanes[L] && lanes[L].slice(c0, c1 + 1).some(Boolean)) L++;
      if (L >= maxL) { for (let i = c0; i <= c1; i++) more[i]++; return; }
      lanes[L] = lanes[L] || []; for (let i = c0; i <= c1; i++) lanes[L][i] = 1;
      chips += '<span class="bar' + (isHol(x.calId) ? ' hol' : '') + '" style="top:' + (TOP + L * (CH + GAP)) + 'px;left:calc(' + (c0 / 7 * 100) + '% + 2px);width:calc(' + ((c1 - c0 + 1) / 7 * 100) + '% - 4px);background:linear-gradient(180deg,' + x.color + ',' + x.color + 'E0);color:' + fg(x.color) + '">' + esc(tagless(x.title)) + '</span>';
    });
    let days = '';
    for (let i = 0; i < 7; i++) {
      const d = addD(a, i), out = d.getMonth() !== c.getMonth();
      const used = lanes.reduce((m, l, k) => l && l[i] ? k + 1 : m, 0);
      const timed = vis.filter(x => !x.bar && same(x.s, d)).sort((p, q) => p.s - q.s);
      const extra = Math.max(0, timed.length - 8) + more[i];
      const hol = list.some(x => isHol(x.calId) && x.s <= d && x.e > d), td = due[ymd(d)] || 0;
      days += '<button class="mday' + (same(d, today) ? ' today' : '') + (out ? ' out' : '') + (i === 0 ? ' sun' : '') + (i === 6 ? ' sat' : '') + (hol ? ' hol' : '') + '" data-day="' + ymd(d) + '" aria-label="' + koD(d) + '"><span class="mnum">' + d.getDate() + '</span>'
        + '<span class="pills" style="top:' + (TOP + used * (CH + GAP) + 3) + 'px">' + timed.slice(0, 8).map(x => '<i class="pill" style="background:linear-gradient(180deg,' + x.color + ',' + x.color + 'C8)"></i>').join('') + '</span>'
        + (extra ? '<span class="more">+' + extra + '</span>' : '') + ((td || (lateN && same(d, today))) ? '<span class="tdues">' + (td ? tdueHTML(td, ymd(d) < tk) : '') + (lateN && same(d, today) ? lateHTML(lateN) : '') + '</span>' : '') + '</button>';
    }
    html += '<div class="mweek"><div class="mdays">' + days + '</div>' + chips + '</div>';
  }
  wrap.innerHTML = html;
}

/* ========== 주간 ========== */
function layoutDay(items) {
  items = items.slice().sort((p, q) => p.a - q.a || q.b - p.b);
  const out = []; let group = [], gEnd = -1;
  const flush = () => { const cols = []; group.forEach(it => { let c = 0; while (cols[c] > it.a) c++; cols[c] = it.b; it.col = c; }); group.forEach(it => { it.n = cols.length; out.push(it); }); group = []; };
  items.forEach(it => { if (it.a >= gEnd && group.length) flush(); group.push(it); gEnd = Math.max(gEnd, it.b); });
  if (group.length) flush();
  return out;
}
const clipDay = (list, d) => { const d0 = sod(d).getTime(); return onDay(list, d).filter(x => !x.bar).map(x => ({ x, a: Math.max(0, (x.s - d0) / 6e4), b: Math.min(1440, (x.e - d0) / 6e4) })).filter(it => it.b > it.a).map(it => (it.b - it.a < 15 ? Object.assign(it, { b: Math.min(1440, it.a + 15) }) : it)); };
async function renderWeek(dir) {
  const a = addD(st.cur, -st.cur.getDay()), b = addD(a, 7);
  drawWeek(dir);
  if (!hasAll(a, b)) { try { await ensure(a, b); } catch (err) { toast('불러오기 실패: ' + err.message); } if (st.tab === 'cal' && st.view === 'week') drawWeek(); }
  else refreshStale(a, b, 60000, () => { if (st.tab === 'cal' && st.view === 'week') drawWeek(); });
  prefetch(addD(a, -7), addD(b, 14));
  syncCalTasks();
}
function drawWeek(dir) {
  const a = addD(st.cur, -st.cur.getDay()), b = addD(a, 7), today = sod(new Date());
  const main = $('#main'), list = fromCache(a, b).filter(shown);
  const due = dueCount(), lateN = lateCount();
  let head = '<div class="wkhead"><span></span>';
  for (let i = 0; i < 7; i++) { const d = addD(a, i); const k = ymd(d), n = due[k] || 0; head += '<button class="wkh' + (same(d, today) ? ' today' : '') + (i === 0 ? ' sun' : '') + (i === 6 ? ' sat' : '') + '" data-day="' + k + '"' + (n ? ' aria-label="' + koD(d) + ' · 할 일 ' + n + '개"' : '') + '><span>' + WD[i] + '</span><b>' + d.getDate() + '</b>' + (n ? tdueHTML(n, k < ymd(today)) : '') + (same(d, today) && lateN ? lateHTML(lateN) : '') + '</button>'; }
  head += '</div>';
  const lanes = []; let adHtml = '';
  list.filter(x => x.bar).sort((p, q) => (q.e - q.s) - (p.e - p.s)).forEach(x => {
    const c0 = Math.max(0, Math.round((sod(x.s) - a) / 864e5)), c1 = Math.min(6, Math.round((sod(new Date(x.e.getTime() - 1)) - a) / 864e5));
    let L = 0; while (lanes[L] && lanes[L].slice(c0, c1 + 1).some(Boolean)) L++;
    if (L > 2) return; lanes[L] = lanes[L] || []; for (let i = c0; i <= c1; i++) lanes[L][i] = 1;
    adHtml += '<button class="bar" data-ev="' + esc(x.calId + '|' + x.id + '|' + x.start) + '" style="pointer-events:auto;border:none;top:' + (L * 19) + 'px;left:calc(' + (c0 / 7 * 100) + '% + 1px);width:calc(' + ((c1 - c0 + 1) / 7 * 100) + '% - 2px);background:' + x.color + ';color:' + fg(x.color) + '">' + esc(x.title) + '</button>';
  });
  const adH = lanes.length * 19;
  main.innerHTML = head + (adH ? '<div class="wkallday" style="height:' + adH + 'px">' + adHtml + '</div>' : '') + '<div class="wkgrid ' + (dir ? 'anim-' + dir : '') + '" id="wkgrid"></div>';
  const g = $('#wkgrid'), PX = (g.clientHeight - 18) / 24;
  let html = '';
  for (let h = 0; h <= 24; h++) { const y = 8 + h * PX; html += '<span class="hlab' + (h % 6 === 0 ? ' six' : '') + '" style="top:' + y + 'px">' + h + '</span>' + (h > 0 && h < 24 ? '<span class="hl' + (h % 6 === 0 ? ' six' : '') + '" style="top:' + y + 'px"></span>' : ''); }
  let cols = '';
  for (let i = 0; i < 7; i++) {
    const d = addD(a, i); let blocks = '';
    layoutDay(clipDay(list, d)).forEach(it => {
      const top = 8 + it.a / 60 * PX, ht = Math.max((it.b - it.a) / 60 * PX - 1, 6), w = 100 / it.n;
      blocks += '<button class="blk" data-ev="' + esc(it.x.calId + '|' + it.x.id + '|' + it.x.start) + '" style="top:' + top + 'px;height:' + ht + 'px;left:calc(' + (it.col * w) + '% + 1px);width:calc(' + w + '% - 2px);background:linear-gradient(180deg,' + it.x.color + ',' + it.x.color + 'D9);color:' + fg(it.x.color) + (ht < 16 ? ';font-size:' + Math.max(7, Math.min(8.5, ht - 2)) + 'px;line-height:' + Math.max(7, ht - 1) + 'px;padding:0 3px;white-space:nowrap;justify-content:center;align-items:flex-start' : '') + (it.n > 1 && ht >= 16 ? ';font-size:calc(8px*var(--fz,1));padding:2px 1px' : '') + '"><span>' + (ht >= 16 ? esc(it.x.title).replace(/^(\[[^\]]+\])\s*/, '$1<br>') : esc(it.x.title)) + '</span></button>';
    });
    cols += '<div class="wkcol' + (same(d, today) ? ' today' : '') + '" data-slot="' + ymd(d) + '">' + blocks + '</div>';
  }
  const now = new Date(); let nowl = '';
  if (now >= a && now < b) nowl = '<span class="nowline" style="top:' + (8 + mins(now) / 60 * PX) + 'px;left:calc(34px + (100% - 34px) * ' + now.getDay() / 7 + ');width:calc((100% - 34px) / 7)"></span>';
  g.innerHTML = html + '<div class="wkcols">' + cols + '</div>' + nowl;
  g.dataset.px = PX;
}
const findEv = key => { const [calId, id, start] = key.split('|'); for (const k in M.months) { const x = M.months[k].find(e => e.calId === calId && e.id === id && e.start === start); if (x) return normal(x); } return null; };

/* ========== 시트 공통 ========== */
let sheetStack = [];
function openSheet(html, onClick, opts = {}) {
  const dim = document.createElement('div'); dim.className = 'dim';
  const sh = document.createElement('div'); sh.className = 'sheet'; sh.setAttribute('role', 'dialog');
  if (opts.height) sh.style.height = opts.height;
  sh.innerHTML = '<span class="grab"></span>' + html;
  document.body.append(dim, sh);
  sheetStack.push({ dim, sh });
  dim.addEventListener('click', () => { if (opts.keep) { sh.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(8px)' }, { transform: 'translateY(0)' }], { duration: 220 }); return; } closeSheet(); });
  sh.addEventListener('click', e => { const t = e.target.closest('[data-a]'); if (t && onClick) onClick(t.dataset.a, t, e); });
  if (opts.onInput) sh.addEventListener('input', opts.onInput);
  if (opts.onChange) sh.addEventListener('change', opts.onChange);
  return sh;
}
function closeSheet() { const e = sheetStack.pop(); if (!e) return; e.sh.classList.add('closing'); e.dim.classList.add('closing'); setTimeout(() => { e.sh.remove(); e.dim.remove(); }, 240); }
function closeAll() { while (sheetStack.length) closeSheet(); }
const sec = (t, inner) => '<section style="display:flex;flex-direction:column;gap:10px"><h3 class="serif" style="margin:0;font-size:calc(14px*var(--fz,1));color:var(--goldL)">' + t + '</h3>' + inner + '</section>';

/* ========== 일정 수정 (중계 이용) ========== */
const GAPI = 'https://www.googleapis.com/calendar/v3';
const EVC = { '1': '#7986CB', '2': '#33B679', '3': '#8E24AA', '4': '#E67C73', '5': '#F6BF26', '6': '#F4511E', '7': '#039BE5', '8': '#616161', '9': '#3F51B5', '10': '#0B8043', '11': '#D50000' };
function fromRes(it, calId) {
  const allDay = !!(it.start && it.start.date), pv = (it.extendedProperties && it.extendedProperties.private) || {};
  return { id: it.id, calId, title: it.summary || '(제목 없음)', allDay, start: allDay ? it.start.date : it.start.dateTime, end: allDay ? it.end.date : it.end.dateTime,
    color: it.colorId && EVC[it.colorId] ? EVC[it.colorId] : ((st.calMap[calId] || {}).color || '#8E6B3A'), location: it.location || '', desc: it.description || '', recurring: !!it.recurringEventId, gantt: pv.gantt === '1' ? pv : null };
}
async function batch(requests) {
  const r = await api('batch', { requests }, true);
  r.results.forEach(x => { if (x.code >= 300) throw new Error((x.body && x.body.error && x.body.error.message) || ('오류 ' + x.code)); });
  return r.results;
}
async function updateEvent(old, ev, alarmsTouched) {
  const body = { summary: ev.title, location: ev.location || '', description: ev.desc || '' };
  if (ev.allDay) { body.start = { date: ev.start, dateTime: null }; body.end = { date: ev.end, dateTime: null }; }
  else { body.start = { dateTime: ev.start, timeZone: 'Asia/Seoul', date: null }; body.end = { dateTime: ev.end, timeZone: 'Asia/Seoul', date: null }; }
  if (alarmsTouched) body.reminders = { useDefault: false, overrides: (ev.alarms || []).map(m => ({ method: 'popup', minutes: m })) };
  let calId = old.calId;
  if (ev.calId !== old.calId) { await batch([{ method: 'post', url: GAPI + '/calendars/' + encodeURIComponent(old.calId) + '/events/' + encodeURIComponent(old.id) + '/move?destination=' + encodeURIComponent(ev.calId) }]); calId = ev.calId; }
  const res = await batch([{ method: 'patch', url: GAPI + '/calendars/' + encodeURIComponent(calId) + '/events/' + encodeURIComponent(old.id), body }]);
  return fromRes(res[0].body, calId);
}

/* ========== 하루 시간표 ========== */
async function openDay(d) {
  const a = addD(d, -1), b = addD(d, 2);
  if (!hasAll(a, b)) { try { await ensure(a, b); } catch (err) { toast(err.message); } }
  const list = fromCache(a, b).filter(shown), items = onDay(list, d);
  const allDay = items.filter(x => x.bar), timed = clipDay(list, d);
  const PX = 40, now = new Date();
  let tl = '<div class="tl" style="height:' + (24 * PX + 10) + 'px;margin:0 6px 0 0">';
  for (let h = 0; h < 24; h++) tl += '<div class="h" style="top:' + (h * PX + 8) + 'px"><span>' + (h ? (h < 12 ? '오전 ' : '오후 ') + ((h % 12) || 12) : '') + '</span><i></i></div>';
  layoutDay(timed).forEach(it => {
    const top = it.a / 60 * PX + 9, ht = Math.max((it.b - it.a) / 60 * PX - 3, 24);
    const real = ko(mins(it.x.s)) + ' – ' + ko(mins(it.x.e));
    tl += '<button class="tb" data-a="ev" data-k="' + esc(it.x.calId + '|' + it.x.id + '|' + it.x.start) + '" style="top:' + top + 'px;height:' + ht + 'px;left:calc(56px + (100% - 56px) * ' + (it.col / it.n) + ');width:calc((100% - 56px) / ' + it.n + ' - 3px);background:linear-gradient(180deg,' + it.x.color + ',' + it.x.color + 'D9);color:' + fg(it.x.color) + '"><b>' + esc(tagless(it.x.title)) + '</b>' + (ht >= 38 ? '<small>' + real + '</small>' : '') + '</button>';
  });
  if (same(now, d)) tl += '<div style="position:absolute;left:0;right:0;top:' + (mins(now) / 60 * PX + 4) + 'px;display:flex;align-items:center;pointer-events:none"><span style="width:8px;height:8px;border-radius:4px;background:#E3C48E;margin-left:50px;box-shadow:0 0 8px rgba(227,196,142,.8)"></span><span style="flex:1;height:1.5px;background:linear-gradient(90deg,#E3C48E,rgba(227,196,142,.1))"></span></div>';
  tl += '</div>';
  const html = '<div class="shead"><h2 class="serif">' + koD(d) + (same(d, now) ? ' · 오늘' : '') + '</h2><div class="row"><button class="obtn" data-a="import">일정 가져오기</button><button class="ibtn" data-a="add" aria-label="이 날 새 일정">' + ICON.plus + '</button></div></div>'
    + (allDay.length ? '<div style="display:flex;gap:8px;padding:8px 16px;border-bottom:1px solid #2A1D15;flex-shrink:0"><span class="lab" style="line-height:28px;width:34px;white-space:nowrap;flex-shrink:0">종일</span><div class="adlist">' + allDay.map(x => '<button class="adchip" data-a="ev" data-k="' + esc(x.calId + '|' + x.id + '|' + x.start) + '" style="background:' + (isHol(x.calId) ? 'transparent;border:1px solid #6E5236' : x.color) + ';color:' + (isHol(x.calId) ? 'var(--sun)' : fg(x.color)) + '">' + esc(tagless(x.title)) + '</button>').join('') + '</div></div>' : '')
    + '<div class="daytasks" data-daytasks="' + ymd(d) + '">' + dayTasksHTML(ymd(d)) + '</div>'
    + '<div class="sbody" style="padding:6px 0 calc(20px + var(--sat-bot));gap:0" id="tlbody">' + (items.length ? '' : '<p class="note" style="padding:10px 16px">일정이 없는 날입니다. 위의 "일정 가져오기"로 어제 일정을 복제할 수 있어요.</p>') + tl + '</div>';
  const sh = openSheet(html, (act, t) => {
    if (act === 'ev') { const ev = items.find(x => (x.calId + '|' + x.id + '|' + x.start) === t.dataset.k); if (ev) openDetail(ev); }
    if (act === 'add') openCreate({ date: d });
    if (act === 'import') openDuplicate({ mode: 'import', target: d });
    if (act === 'task') { const x = T.tasks.find(y => y.id === t.dataset.id); if (x && !String(x.id).startsWith('tmp')) openTask(x); }
  }, { height: '78%', onChange: e => { const t = e.target; if (t.dataset.tk) taskToggle(t.dataset.tk, t); } });
  const body = sh.querySelector('#tlbody'), starts = timed.map(it => it.a).filter(m => m >= 360 && m < 1380);
  body.scrollTop = Math.max(0, ((same(now, d) ? mins(now) - 90 : (starts.length ? Math.min(...starts) - 30 : 420)) / 60) * PX);
}

/* ========== 반복 할 일 (v3.19) ==========
   구글 Tasks API에는 반복 설정이 없어서 앱이 직접 만든다. 백엔드 수정 없음(batch 중계만 사용).
   - 저장: 할 일 메모 맨 끝 줄에 표식 "↻반복=daily | weekday | weekly:요일(0~6) | monthly:날짜(1~31)". 화면에는 안 보임(plainNote·편집기에서 제거).
   - 한 반복 묶음 = 같은 목록 + 같은 제목. 묶음의 '머리'(안 끝낸 회차, 없으면 마감이 가장 늦은 회차)의 표식이 규칙.
   - 늘 열린 회차는 하나: 안 끝낸 회차가 지난 날짜면 '오늘 이후 첫 반복 날짜'로 옮김(밀린 일로 쌓이지 않게),
     다 끝냈으면 그 날짜 몫을 새로 만듦(매일은 다음 날 열 때, 매주는 끝낸 뒤 바로 다음 주 몫이 '다가오는 일'에). 만들기 전에 구글에 직접 다시 물어 중복 생성을 막음.
   - 앱을 열어야 그날 몫이 생김. 반복을 멈추려면 '반복: 안 함' 또는 삭제(남은 최신 회차의 표식도 지움). */
const REP = [['', '안 함'], ['daily', '매일'], ['weekday', '평일'], ['weekly', '매주'], ['monthly', '매월']];
const REP_RE = /\n?↻반복=(daily|weekday|weekly|monthly)(?::(\d+))?[ \t]*$/;
const repStrip = t => String(t || '').replace(REP_RE, '');
const repOf = t => { const m = String(t || '').match(REP_RE); return m ? { k: m[1], n: m[2] != null ? Number(m[2]) : null } : null; };
function repSet(notes, k, due) {
  const b = repStrip(notes); if (!k) return b;
  const d = due ? pymd(due) : sod(new Date()), n = k === 'weekly' ? d.getDay() : k === 'monthly' ? d.getDate() : null;
  return (b ? b + '\n' : '') + '↻반복=' + k + (n != null ? ':' + n : '');
}
const repLabel = r => !r ? '' : r.k === 'daily' ? '매일' : r.k === 'weekday' ? '평일' : r.k === 'weekly' ? '매주 ' + WD[r.n || 0] + '요일' : '매월 ' + (r.n || 1) + '일';
function repHits(r, d) {
  const w = d.getDay();
  if (r.k === 'daily') return true;
  if (r.k === 'weekday') return w > 0 && w < 6;
  if (r.k === 'weekly') return w === (r.n || 0);
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  return d.getDate() === Math.min(r.n || 1, last);
}
// 오늘 포함, 오늘 이후 첫 반복 날짜 (평일 반복을 일요일에 열면 월요일)
function repNext(r, today) { for (let i = 0; i < 62; i++) { const d = addD(today, i); if (repHits(r, d)) return d; } return null; }
const repKey = x => x.listId + '\u0001' + String(x.title || '').trim();
function repHead(xs) {
  const open = xs.filter(x => !x.done), pool = open.length ? open : xs;
  return pool.slice().sort((a, b) => (b.due || '') < (a.due || '') ? -1 : (b.due || '') > (a.due || '') ? 1 : 0)[0];
}
// 반복 표시: ↻ 매일 · 7일 중 5번 (매주·매월은 최근 4회/3회 중)
function repBadge(x, r) {
  const k = repKey(x), today = sod(new Date());
  const done = new Set((T.tasks || []).filter(y => y.done && y.due && repKey(y) === k).map(y => y.due));
  let tot = 0, hit = 0, d = today, guard = 0;
  const want = r.k === 'weekly' ? 4 : r.k === 'monthly' ? 3 : 7;
  if (r.k === 'daily' || r.k === 'weekday') { for (let i = 0; i < 7; i++) { const z = addD(today, -i); if (repHits(r, z)) { tot++; if (done.has(ymd(z))) hit++; } } }
  else while (tot < want && guard++ < 400) { if (repHits(r, d)) { tot++; if (done.has(ymd(d))) hit++; } d = addD(d, -1); }
  return '<span class="rep">↻ ' + repLabel(r) + (hit ? ' · ' + (r.k === 'daily' || r.k === 'weekday' ? '최근 7일 중 ' : '최근 ' + tot + '번 중 ') + hit + '번' : '') + '</span>';
}
const mapGTask = (t, listId) => ({ id: t.id, listId, title: t.title || '', notes: t.notes || '', due: t.due ? t.due.slice(0, 10) : '', done: t.status === 'completed', completed: t.completed || '', parent: t.parent || '' });
const taskUrl = (l, id) => TAPI + '/lists/' + encodeURIComponent(l) + '/tasks' + (id ? '/' + encodeURIComponent(id) : '');
let repBusy = false;
async function repSync() {
  if (repBusy || !T.lists || !T.tasks) return; repBusy = true;
  try {
    const today = sod(new Date()), groups = {};
    T.tasks.filter(x => !x.parent && !String(x.id).startsWith('tmp')).forEach(x => { const k = repKey(x); (groups[k] = groups[k] || []).push(x); });
    const rolls = [], makes = [];
    Object.values(groups).forEach(xs => {
      const h = repHead(xs), r = h && repOf(h.notes); if (!r) return;
      const nx = repNext(r, today); if (!nx) return; const ck = ymd(nx), tk = ymd(today);
      if (!h.done) { if (!h.due || h.due < tk) rolls.push({ x: h, due: ck }); } // 지난 회차는 다음 반복 날짜로 옮김(밀린 일로 쌓이지 않게)
      else if ((h.due || '') < ck) makes.push({ h, r, due: ck }); // 다 끝냈으면 다음 반복 날짜 몫을 만듦
    });
    if (!rolls.length && !makes.length) return;
    // 만들기 전 확인: 그 목록에 오늘 몫(같은 제목, 마감 ≥ 오늘 몫)이 이미 있는지 구글에 직접 물음 (불러온 목록은 끝낸 할 일이 30일·100개까지만이라)
    let ok = makes;
    if (makes.length) {
      const lists = [...new Set(makes.map(m => m.h.listId))], minDue = makes.reduce((a, m) => m.due < a ? m.due : a, makes[0].due);
      const res = await batch(lists.map(l => ({ method: 'get', url: taskUrl(l) + '?showCompleted=true&showHidden=true&maxResults=100&dueMin=' + encodeURIComponent(minDue + 'T00:00:00.000Z') })));
      const have = new Set(); res.forEach((x, i) => ((x.body && x.body.items) || []).forEach(t => { if (t.due && t.due.slice(0, 10) >= minDue) have.add(lists[i] + '\u0001' + String(t.title || '').trim() + '\u0001' + t.due.slice(0, 10)); }));
      ok = makes.filter(m => !have.has(repKey(m.h) + '\u0001' + m.due));
    }
    const reqs = rolls.map(o => ({ method: 'patch', url: taskUrl(o.x.listId, o.x.id), body: { due: o.due + 'T00:00:00.000Z' } }))
      .concat(ok.map(m => ({ method: 'post', url: taskUrl(m.h.listId), body: { title: m.h.title, notes: m.h.notes, due: m.due + 'T00:00:00.000Z' } })));
    if (!reqs.length) return;
    const out = await batch(reqs);
    rolls.forEach(o => { o.x.due = o.due; });
    ok.forEach((m, i) => { const b = out[rolls.length + i].body; if (b && b.id) T.tasks.unshift(mapGTask(b, m.h.listId)); });
    saveTasks(); drawTasks();
  } catch (e) { console.warn('반복 할 일 맞추기 실패', e); }
  finally { repBusy = false; }
}
// 반복 할 일 삭제 = 반복 멈춤: 같은 묶음에서 남는 최신 회차에 표식이 있으면 지우는 요청
function repStopReq(x) {
  if (!repOf(x.notes)) return null;
  const rest = (T.tasks || []).filter(y => y.id !== x.id && !y.parent && repKey(y) === repKey(x)), h = rest.length && repHead(rest);
  if (!h || !repOf(h.notes)) return null;
  const notes = repStrip(h.notes);
  return { req: { method: 'patch', url: taskUrl(h.listId, h.id), body: { notes } }, apply() { h.notes = notes; } };
}

/* ========== 캘린더 ↔ 할 일 연결 (v3.17) ==========
   마감일이 있는 할 일(구글 Tasks)을 월간 칸·주간 머리·하루 시트에 보여 줌. 모든 목록 대상, 끝낸 것은 숨김.
   지난 날짜에 남은 할 일은 붉은색(밀린 일). 할 일이 바뀌면 drawTasks()가 캘린더 탭에서는 tasksChangedOnCal()로 넘김. */
const dueOpen = () => (T.tasks || []).filter(x => x.due && !x.done);
function dueCount() { const m = {}; dueOpen().forEach(x => { m[x.due] = (m[x.due] || 0) + 1; }); return m; }
const tdueHTML = (n, late) => '<span class="tdue' + (late ? ' late' : '') + '" aria-hidden="true"><svg width="9" height="9" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><rect x="1" y="1" width="10" height="10" rx="2.5"/><path d="M3.6 6.2l1.7 1.7 3.2-3.6"/></svg>' + n + '</span>';
// 밀린 일 = 마감이 오늘 이전인데 아직 안 끝낸 할 일. 오늘 칸(월간)·오늘 날짜(주간)에 붉은 숫자로 모아 보여 줌
const lateCount = () => { const t = ymd(sod(new Date())); return dueOpen().filter(x => x.due < t).length; };
const lateHTML = n => '<span class="tdue latesum" aria-label="밀린 할 일 ' + n + '개">' + n + '</span>';
function dayTasksHTML(k) {
  const today = ymd(sod(new Date())), late = k < today;
  const xs = (T.tasks || []).filter(x => x.due === k).sort((a, b) => (a.done - b.done) || String(a.title).localeCompare(String(b.title)));
  const lt = k === today ? dueOpen().filter(x => x.due < today).sort((a, b) => a.due < b.due ? -1 : 1) : [];
  const row = (x, isLate, sub) => '<div class="trow dt' + (x.done ? ' done' : '') + (isLate && !x.done ? ' late' : '') + '" data-tid="' + esc(x.id) + '">' + ckHTML(x.title + ' 완료', 'data-tk="' + esc(x.id) + '"' + (x.done ? ' checked' : '')) + '<button class="tmain" data-a="task" data-id="' + esc(x.id) + '"><span class="ttl">' + esc(x.title) + '<i class="strike"></i></span>' + (sub || repOf(x.notes) ? '<span class="tmeta">' + (repOf(x.notes) ? repBadge(x, repOf(x.notes)) + (sub ? ' · ' : '') : '') + (sub || '') + '</span>' : '') + '</button></div>';
  let h = '';
  if (xs.length) h += '<div class="dthead"><span>할 일</span><em>' + xs.filter(x => !x.done).length + '개 남음' + (late && xs.some(x => !x.done) ? ' · 밀린 일' : '') + '</em></div>' + xs.map(x => row(x, late)).join('');
  if (lt.length) h += '<div class="dthead late"><span>밀린 일</span><em>' + lt.length + '개 · 체크하면 완료, 눌러서 날짜 바꾸기</em></div>' + lt.map(x => row(x, true, koD(pymd(x.due)) + ' 까지였음')).join('');
  return h;
}
function tasksChangedOnCal() {
  document.querySelectorAll('[data-daytasks]').forEach(el => { el.innerHTML = dayTasksHTML(el.dataset.daytasks); });
  if (st.tab === 'cal') { if (st.view === 'month') drawMonth(); else drawWeek(); }
}
let calTaskSync = false;
function syncCalTasks() {
  if (calTaskSync) return; calTaskSync = true;
  loadTasks().then(ch => { if (ch) tasksChangedOnCal(); }).catch(() => {}).finally(() => { calTaskSync = false; });
}

/* ========== 일정 상세 ========== */
function openDetail(ev) {
  const cal = st.calMap[ev.calId] || { name: '', owned: false };
  const endShown = new Date(ev.e.getTime() - (ev.allDay ? 864e5 : 0));
  const when = ev.allDay ? (koD(ev.s) + (ev.e - ev.s > 864e5 ? ' – ' + koD(endShown) : '') + ' · 종일')
    : (koD(ev.s) + ' ' + ko(mins(ev.s)) + ' – ' + (same(ev.s, ev.e) ? '' : koD(ev.e) + ' ') + ko(mins(ev.e)));
  const html = '<div class="shead"><button class="tbtn" data-a="close">닫기</button><span></span><span style="width:52px"></span></div><div class="sbody">'
    + '<div style="display:flex;gap:12px;align-items:flex-start"><span style="width:10px;align-self:stretch;min-height:44px;border-radius:5px;background:linear-gradient(180deg,' + ev.color + ',' + ev.color + 'A0);box-shadow:0 0 10px ' + ev.color + '66"></span><div style="display:flex;flex-direction:column;gap:4px"><h2 class="serif" style="margin:0;font-size:calc(19px*var(--fz,1));color:var(--ink)">' + esc(ev.title) + '</h2><span class="note">' + when + '</span><span class="note">' + esc(cal.name) + (ev.recurring ? ' · 반복 일정' : '') + '</span></div></div>'
    + (ev.location ? '<div><div class="lab">장소</div><p class="note" style="color:var(--ink)">' + esc(ev.location) + '</p></div>' : '')
    + (ev.desc ? '<div><div class="lab">메모</div><p class="note" style="color:var(--ink);white-space:pre-wrap">' + esc(ev.desc) + '</p></div>' : '')
    + '<div class="row" style="gap:8px">' + (cal.owned ? '<button class="obtn" data-a="edit" style="flex:1;height:48px;border-color:#8E6B3A;color:var(--goldL)">수정</button>' : '') + '<button class="gbtn" data-a="dup" style="flex:1.4;height:48px">복제하기</button>' + (cal.owned ? '<button class="obtn" data-a="del" style="flex:1;height:48px">' + (ev.recurring ? '이 날만 삭제' : '삭제') + '</button>' : '') + '</div>'
    + (ev.recurring ? '<p class="note">수정·삭제는 이 날 일정에만 적용됩니다. 반복 전체를 바꾸려면 구글 캘린더에서 해 주세요.</p>' : '') + '</div>';
  let armed = false;
  openSheet(html, async (a, t) => {
    if (a === 'close') closeSheet();
    if (a === 'dup') openDuplicate({ mode: 'event', items: [ev] });
    if (a === 'edit') { if (S.sv && S.sv < 3) { toast('데이터 창구 업데이트 후 쓸 수 있어요'); return; } openCreate({ edit: ev }); }
    if (a === 'del') {
      if (!armed) { armed = true; t.textContent = '한 번 더 누르면 삭제'; t.style.borderColor = '#E8957A'; t.style.color = '#E8957A'; return; }
      t.disabled = true;
      try { await api('delete', { calId: ev.calId, id: ev.id }, true); cacheRemove(ev); toast('삭제했습니다'); closeAll(); render(); } catch (err) { toast(err.message); t.disabled = false; }
    }
  });
}

/* ========== 새 일정 ========== */
function openCreate(pre = {}) {
  const now = new Date(), d = pre.date ? sod(pre.date) : (st.view === 'week' || st.cur.getMonth() === now.getMonth() ? sod(now) : sod(st.cur));
  const owned = st.cals.filter(c => c.owned && !isHol(c.id));
  const defCal = (owned.find(c => c.name === '<업무>') || owned.find(c => c.primary) || owned[0] || {}).id;
  const f = { title: '', cal: defCal, allDay: false, date: ymd(d), endDate: ymd(d), st: pre.min != null ? pre.min : (same(d, now) ? Math.min(1410, Math.ceil((mins(now) + 1) / 30) * 30) : 540), dur: 60, open: '', rep: '', days: { [d.getDay()]: true }, alarms: [], adding: false, loc: '', memo: '', newOpen: false, newName: '', newColor: '#8E6B3A' };
  const E = pre.edit;
  if (E) Object.assign(f, { title: E.title, cal: E.calId, allDay: !!E.allDay, date: ymd(E.s), endDate: ymd(E.allDay ? addD(E.e, -1) : E.s), st: mins(E.s), dur: Math.max(5, Math.round((E.e - E.s) / 6e4)), loc: E.location || '', memo: E.desc || '', alarmsTouched: false });
  if (E && E.allDay) f.dur = 60;
  const AL = [[0, '정시'], [5, '5분 전'], [10, '10분 전'], [30, '30분 전'], [60, '1시간 전'], [1440, '하루 전']];
  const DU = [[30, '30분'], [60, '1시간'], [90, '1시간 반'], [120, '2시간'], [180, '3시간'], [480, '8시간']];
  const RP = [['', '안 함'], ['daily', '매일'], ['weekly', '매주'], ['monthly', '매월'], ['yearly', '매년']];
  const SW = [['황동', '#8E6B3A'], ['코냑', '#6B3F22'], ['버건디', '#7A2E2E'], ['포레스트', '#2F4A3A'], ['네이비', '#2E3A5C'], ['샴페인', '#D9BC86'], ['차콜', '#3A3A3A'], ['플럼', '#5A3550'], ['토마토', '#D50000'], ['귤', '#F4511E'], ['바나나', '#F6BF26'], ['바질', '#0B8043'], ['세이지', '#33B679'], ['공작', '#039BE5'], ['블루베리', '#3F51B5'], ['포도', '#8E24AA']];
  let sh;
  const durTxt = () => { const x = DU.find(y => y[0] === f.dur); return x ? x[1] : (Math.floor(f.dur / 60) ? Math.floor(f.dur / 60) + '시간 ' : '') + (f.dur % 60 ? f.dur % 60 + '분' : ''); };
  const durLabel = () => durTxt() + (f.st + f.dur >= 1440 ? ' · 다음 날' : '');
  const endSlots = () => { let s = ''; const a = Math.floor(f.st / 30) * 30 + 30; for (let m = a; m <= f.st + 720; m += 30) s += '<button class="pillb' + (f.st + f.dur === m ? ' on' : '') + '" data-a="eslot" data-m="' + m + '">' + ko(m) + (m >= 1440 ? ' (다음 날)' : '') + '</button>'; return s; };
  const slots = () => { let s = ''; for (let m = 0; m < 1440; m += 30) s += '<button class="pillb' + (Math.floor(f.st / 30) * 30 === m ? ' on' : '') + '" data-a="slot" data-m="' + m + '">' + ko(m) + '</button>'; return s; };
  const body = () => '<label style="display:flex;flex-direction:column;gap:4px"><span class="lab">제목</span><input class="title-inp" id="fTitle" placeholder="일정 제목" value="' + esc(f.title) + '" autocomplete="off"></label>'
    + '<div style="display:flex;flex-direction:column;gap:8px"><span class="lab">캘린더 · 색은 구글 캘린더 색 그대로</span><div class="row">' + st.cals.filter(c => c.owned && !isHol(c.id)).map(c => '<button class="pillb' + (f.cal === c.id ? ' on' : '') + '" data-a="cal" data-id="' + esc(c.id) + '">' + esc(c.name) + '</button>').join('') + '<button class="pillb dash" data-a="newcat">+ 새 카테고리</button></div>'
    + (f.newOpen ? '<div class="box" style="padding:14px;gap:12px;border-color:#6E5236"><span class="serif" style="font-size:calc(14px*var(--fz,1));color:var(--goldL)">새 카테고리</span><label style="display:flex;flex-direction:column;gap:6px"><span class="lab">이름</span><input class="inp" id="fNewName" placeholder="예: [Japanese]일본어하자" value="' + esc(f.newName) + '"></label><div class="swatches">' + SW.map(w => '<button aria-label="' + w[0] + '" class="' + (f.newColor.toLowerCase() === w[1].toLowerCase() ? 'on' : '') + '" data-a="sw" data-c="' + w[1] + '" style="background:' + w[1] + '"></button>').join('') + '</div><label class="row lab" style="min-height:44px"><input type="color" id="fNewColor" value="' + f.newColor + '" style="width:36px;height:36px;border:none;padding:0;background:transparent">직접 고르기</label><div class="row"><button class="obtn" data-a="newcat" style="flex:1">취소</button><button class="gbtn" data-a="mkcat" style="flex:2;height:44px">만들기</button></div><span class="lab">구글 캘린더에도 같은 이름·색으로 만들어집니다. 삭제·공유는 구글 캘린더에서 해 주세요.</span></div>' : '') + '</div>'
    + '<div class="box"><div class="boxrow" style="justify-content:space-between">종일<button class="switch' + (f.allDay ? ' on' : '') + '" role="switch" aria-checked="' + f.allDay + '" aria-label="종일" data-a="allday"><i></i></button></div>'
    + '<div class="boxrow"><span class="lab" style="width:30px">' + (f.allDay ? '시작' : '날짜') + '</span><input type="date" class="inp" id="fDate" value="' + f.date + '" style="flex:1;height:40px;border:none;background:transparent;padding:0"></div>'
    + (f.allDay ? '<div class="boxrow"><span class="lab" style="width:30px">종료</span><input type="date" class="inp" id="fEnd" value="' + f.endDate + '" style="flex:1;height:40px;border:none;background:transparent;padding:0"></div>'
      : '<div class="boxrow"><span class="lab" style="width:30px">시작</span><span style="flex:1"></span><button class="timebtn' + (f.open === 's' ? ' on' : '') + '" data-a="openS" id="tS">' + ko(f.st) + '</button></div>'
      + (f.open === 's' ? '<div class="picker"><div class="scrollx" id="slotRow" style="padding:0 14px">' + slots() + '</div><div class="fine"><button data-a="fine" data-v="-10">− 10분</button><button data-a="fine" data-v="-5">− 5분</button><span style="width:1px;height:22px;background:var(--line)"></span><button data-a="fine" data-v="5">+ 5분</button><button data-a="fine" data-v="10">+ 10분</button></div></div>' : '')
      + '<div class="boxrow"><span class="lab" style="width:30px">종료</span><span class="lab" style="flex:1" id="tD">' + durLabel() + '</span><button class="timebtn' + (f.open === 'e' ? ' on' : '') + '" data-a="openE" id="tE">' + ko(f.st + f.dur) + '</button></div>'
      + (f.open === 'e' ? '<div class="picker" style="border-bottom:none"><span class="lab" style="padding:0 14px">끝나는 시각</span><div class="scrollx" id="endRow" style="padding:0 14px">' + endSlots() + '</div><span class="lab" style="padding:0 14px">또는 걸리는 시간</span><div class="scrollx" id="durRow" style="padding:0 14px">' + DU.map(x => '<button class="pillb' + (f.dur === x[0] ? ' on' : '') + '" data-a="dur" data-v="' + x[0] + '">' + x[1] + '</button>').join('') + '</div><div class="fine"><button data-a="dfine" data-v="-10">− 10분</button><button data-a="dfine" data-v="-5">− 5분</button><span style="width:1px;height:22px;background:var(--line)"></span><button data-a="dfine" data-v="5">+ 5분</button><button data-a="dfine" data-v="10">+ 10분</button></div></div>' : '')) + '</div>'
    + (E ? (E.recurring ? '<p class="note">반복 일정 중 <b>이 날 것만</b> 바뀝니다.</p>' : '') : '<div style="display:flex;flex-direction:column;gap:8px"><span class="lab">반복</span><div class="row">' + RP.map(r => '<button class="pillb' + (f.rep === r[0] ? ' on' : '') + '" data-a="rep" data-v="' + r[0] + '">' + r[1] + '</button>').join('') + '</div>'
    + (f.rep === 'weekly' ? '<div class="wdays">' + WD.map((w, i) => '<button class="' + (f.days[i] ? 'on' : '') + '" data-a="wd" data-v="' + i + '">' + w + '</button>').join('') + '</div>' : '') + '</div>')
    + '<div style="display:flex;flex-direction:column;gap:8px"><span class="lab">' + (E && !f.alarmsTouched ? '알림 · 바꾸지 않으면 기존 알림 그대로' : '알림 · 평소엔 꺼짐') + '</span><div class="row">' + f.alarms.map(v => '<span class="alarmchip">' + AL.find(x => x[0] === v)[1] + '<button data-a="alrm" data-v="' + v + '" aria-label="알림 끄기">' + ICON.x + '</button></span>').join('') + '<button class="pillb dash" data-a="addal" style="min-height:40px">' + (f.adding ? '닫기' : '+ 알림 추가') + '</button></div>'
    + (f.adding ? '<div class="row" style="padding:10px;border-radius:12px;background:#1B130E;border:1px solid var(--line)">' + AL.map(x => '<button class="pillb' + (f.alarms.includes(x[0]) ? ' on' : '') + '" data-a="alrm" data-v="' + x[0] + '">' + x[1] + '</button>').join('') + '</div>' : '') + '</div>'
    + '<label style="display:flex;flex-direction:column;gap:6px"><span class="lab">장소</span><input class="inp" id="fLoc" placeholder="장소 추가" value="' + esc(f.loc) + '"></label>'
    + '<label style="display:flex;flex-direction:column;gap:6px"><span class="lab">메모</span><textarea class="inp" id="fMemo" placeholder="설명 추가">' + esc(f.memo) + '</textarea></label>'
    + '<p class="note">구글 캘린더 <b>' + esc((st.calMap[f.cal] || {}).name || '') + '</b>에 저장됩니다.</p>' + (E && E.recurring && f.cal !== E.calId ? '<p class="note" style="color:var(--sun)">반복 일정은 캘린더를 옮길 수 없어요.</p>' : '');
  const keepX = () => { const o = {}; sh.querySelectorAll('.scrollx[id]').forEach(x => o[x.id] = x.scrollLeft); return o; };
  const redraw = (center) => { const b = sh.querySelector('.sbody'), y = b.scrollTop, xs = keepX(); b.innerHTML = body(); b.scrollTop = y;
    sh.querySelectorAll('.scrollx[id]').forEach(x => { if (center) { const on = x.querySelector('.on'); x.scrollLeft = on ? on.offsetLeft - x.clientWidth / 2 + on.offsetWidth / 2 : 0; } else if (xs[x.id] != null) x.scrollLeft = xs[x.id]; }); };
  const updTime = () => {
    const S1 = sh.querySelector('#tS'), E1 = sh.querySelector('#tE'), D1 = sh.querySelector('#tD');
    if (S1) S1.textContent = ko(f.st); if (E1) E1.textContent = ko(f.st + f.dur); if (D1) D1.textContent = durLabel();
    sh.querySelectorAll('[data-a=slot]').forEach(x => x.classList.toggle('on', Number(x.dataset.m) === Math.floor(f.st / 30) * 30));
    sh.querySelectorAll('[data-a=eslot]').forEach(x => x.classList.toggle('on', Number(x.dataset.m) === f.st + f.dur));
    sh.querySelectorAll('[data-a=dur]').forEach(x => x.classList.toggle('on', Number(x.dataset.v) === f.dur));
  };
  sh = openSheet('<div class="shead"><button class="tbtn" data-a="cancel">취소</button><h2 class="serif goldtext" style="font-size:calc(17px*var(--fz,1));letter-spacing:1px">' + (E ? '일정 수정' : '새 일정') + '</h2><button class="gbtn" data-a="save">저장</button></div><div class="sbody">' + body() + '</div>', async (a, t) => {
    const v = t.dataset.v;
    switch (a) {
      case 'cancel': closeSheet(); return;
      case 'cal': f.cal = t.dataset.id; break;
      case 'newcat': f.newOpen = !f.newOpen; break;
      case 'sw': f.newColor = t.dataset.c; break;
      case 'mkcat': {
        const n = (f.newName || '').trim(); if (!n) { toast('이름을 입력해 주세요'); return; }
        t.disabled = true;
        try { const r = await api('createCalendar', { name: n, color: f.newColor }, true); setCals(st.cals.concat([r.calendar])); f.cal = r.calendar.id; f.newOpen = false; f.newName = ''; toast('카테고리를 만들었습니다'); } catch (err) { toast(err.message); t.disabled = false; return; }
        break;
      }
      case 'allday': f.allDay = !f.allDay; f.open = ''; break;
      case 'openS': f.open = f.open === 's' ? '' : 's'; redraw(true); return;
      case 'openE': f.open = f.open === 'e' ? '' : 'e'; redraw(true); return;
      case 'slot': f.st = Number(t.dataset.m); updTime(); return;
      case 'fine': f.st = Math.max(0, Math.min(1435, f.st + Number(v))); updTime(); return;
      case 'eslot': f.dur = Math.max(5, Number(t.dataset.m) - f.st); updTime(); return;
      case 'dur': f.dur = Number(v); updTime(); { const r = sh.querySelector('#endRow'), on = r && r.querySelector('.on'); if (on) r.scrollTo({ left: on.offsetLeft - r.clientWidth / 2 + on.offsetWidth / 2, behavior: 'smooth' }); } return;
      case 'dfine': f.dur = Math.max(5, f.dur + Number(v)); updTime(); return;
      case 'rep': f.rep = v; break;
      case 'wd': f.days[v] = !f.days[v]; break;
      case 'addal': f.adding = !f.adding; break;
      case 'alrm': { f.alarmsTouched = true; const n = Number(v); f.alarms = f.alarms.includes(n) ? f.alarms.filter(x => x !== n) : f.alarms.concat([n]).sort((p, q) => p - q); break; }
      case 'save': {
        const title = (f.title || '').trim(); if (!title) { toast('제목을 입력해 주세요'); sh.querySelector('#fTitle').focus(); return; }
        if (!f.cal) { toast('캘린더를 골라 주세요'); return; }
        const base = pymd(f.date), ev = { calId: f.cal, title, allDay: f.allDay, location: f.loc, desc: f.memo, alarms: f.alarms };
        if (f.allDay) { const e = pymd(f.endDate < f.date ? f.date : f.endDate); ev.start = f.date; ev.end = ymd(addD(e, 1)); }
        else { const s = new Date(base.getFullYear(), base.getMonth(), base.getDate(), 0, f.st); ev.start = isoLocal(s); ev.end = isoLocal(new Date(s.getTime() + f.dur * 6e4)); }
        if (f.rep) ev.repeat = { freq: f.rep, days: f.rep === 'weekly' ? Object.keys(f.days).filter(k => f.days[k]).map(Number) : [] };
        t.disabled = true; t.textContent = '저장 중';
        if (E) {
          if (E.recurring && f.cal !== E.calId) { toast('반복 일정은 캘린더를 옮길 수 없어요'); t.disabled = false; t.textContent = '저장'; return; }
          t.disabled = true; t.textContent = '저장 중';
          try { const nev = await updateEvent(E, ev, f.alarmsTouched); cacheRemove(E); cacheAdd([nev]); toast('수정했습니다'); closeAll(); st.cur = base; render(); }
          catch (err) { toast('수정 실패: ' + err.message); t.disabled = false; t.textContent = '저장'; }
          return;
        }
        try {
          const r = await api('create', { event: ev }, true);
          if (f.rep) { Object.keys(M.ts).forEach(k => M.ts[k] = 0); } else if (r.event) cacheAdd([r.event]);
          toast('저장했습니다'); closeAll(); st.cur = base; render();
        } catch (err) { toast('저장 실패: ' + err.message); t.disabled = false; t.textContent = '저장'; }
        return;
      }
      default: return;
    }
    redraw();
  }, {
    keep: true,
    onInput: e => { const id = e.target.id; if (id === 'fTitle') f.title = e.target.value; if (id === 'fLoc') f.loc = e.target.value; if (id === 'fMemo') f.memo = e.target.value; if (id === 'fNewName') f.newName = e.target.value; if (id === 'fNewColor') f.newColor = e.target.value; },
    onChange: e => { const id = e.target.id; if (id === 'fDate') { f.date = e.target.value; if (f.endDate < f.date) f.endDate = f.date; redraw(); } if (id === 'fEnd') f.endDate = e.target.value; if (id === 'fNewColor') redraw(); }
  });
  if (!pre.date && !E) setTimeout(() => { const i = sh.querySelector('#fTitle'); if (i) i.focus(); }, 380);
}

/* ========== 복제 ========== */
async function openDuplicate(o) {
  const today = sod(new Date()), tgtBase = o.mode === 'import' ? sod(o.target) : today;
  const f = { src: 0, srcDate: ymd(addD(tgtBase, -1)), items: o.items || [], off: {}, targets: {}, cal: false, calMonth: new Date(tgtBase.getFullYear(), tgtBase.getMonth(), 1), shift: 0 };
  const evDay = o.items && o.items[0] ? sod(o.items[0].s) : today;
  f.targets[ymd(o.mode === 'import' ? tgtBase : (evDay < today ? today : addD(evDay, 1)))] = true;
  const SRC = [['어제', d => addD(d, -1)], ['지난주 같은 요일', d => addD(d, -7)], ['지난달 같은 날', d => new Date(d.getFullYear(), d.getMonth() - 1, Math.min(d.getDate(), new Date(d.getFullYear(), d.getMonth(), 0).getDate()))], ['날짜 고르기', null]];
  const loadSrc = async () => { const d = pymd(f.srcDate), a = addD(d, -1), b = addD(d, 2); if (!hasAll(a, b)) { try { await ensure(a, b); } catch (e) {} } f.items = onDay(fromCache(a, b), d).filter(x => !isHol(x.calId) && (st.calMap[x.calId] || {}).owned !== false && !x.gantt && (x.bar || same(x.s, d))).sort((p, q) => p.s - q.s); f.off = {}; };
  if (o.mode === 'import') await loadSrc();
  let sh;
  const keys = () => Object.keys(f.targets).filter(k => f.targets[k]).sort();
  const body = () => {
    const ks = keys(), sel = f.items.filter((x, i) => !f.off[i]);
    let h = '';
    let w = '';
    if (o.mode === 'import') { w += '<div class="row">' + SRC.map((s, i) => '<button class="pillb' + (f.src === i ? ' on' : '') + '" data-a="src" data-v="' + i + '">' + s[0] + '</button>').join('') + '</div>'; if (f.src === 3) w += '<input type="date" class="inp" id="fSrc" value="' + f.srcDate + '">'; w += '<span class="lab">' + koD(pymd(f.srcDate)) + '의 일정</span>'; }
    w += '<div class="box evlist">' + (f.items.length ? f.items.map((x, i) => '<label class="evrow"' + (f.off[i] ? ' style="opacity:.5"' : '') + '><input type="checkbox" data-i="' + i + '"' + (f.off[i] ? '' : ' checked') + '><span class="t">' + (x.bar ? '종일' : ko(mins(x.s) + f.shift)) + '</span><span class="n">' + esc(tagless(x.title)) + '</span><i style="width:8px;height:8px;border-radius:4px;background:' + x.color + '"></i></label>').join('') : '<p class="note" style="padding:14px">가져올 일정이 없습니다</p>') + '</div>';
    h += sec('1 · 무엇을', w);
    const Q = [['오늘 ' + today.getDate() + '일', today], ['내일 ' + addD(today, 1).getDate() + '일', addD(today, 1)], ['다음 주 ' + WD[today.getDay()] + ' ' + addD(today, 7).getDate() + '일', addD(today, 7)]];
    let w2 = '<div class="row">' + Q.map(q => { const k = ymd(q[1]); return '<button class="pillb' + (ks.length === 1 && ks[0] === k && !f.cal ? ' on' : '') + '" data-a="tq" data-v="' + k + '">' + q[0] + '</button>'; }).join('') + '<button class="pillb' + (f.cal ? ' on' : '') + '" data-a="tcal">날짜 여러 개</button></div>';
    if (o.mode === 'import' && !Q.some(q => ymd(q[1]) === ymd(tgtBase))) w2 = w2.replace('<div class="row">', '<div class="row"><button class="pillb' + (ks.length === 1 && ks[0] === ymd(tgtBase) && !f.cal ? ' on' : '') + '" data-a="tq" data-v="' + ymd(tgtBase) + '">' + koD(tgtBase) + '</button>');
    if (f.cal) {
      const m = f.calMonth, fd = new Date(m.getFullYear(), m.getMonth(), 1), nd = new Date(m.getFullYear(), m.getMonth() + 1, 0).getDate();
      w2 += '<div class="box" style="padding:10px;gap:6px"><div class="row" style="justify-content:space-between"><button class="ibtn" data-a="cm" data-v="-1" aria-label="이전 달">‹</button><span class="lab">' + (m.getMonth() + 1) + '월 · ' + ks.length + '일 선택</span><button class="ibtn" data-a="cm" data-v="1" aria-label="다음 달">›</button></div><div class="mini">' + WD.map(x => '<span>' + x + '</span>').join('') + '<i></i>'.repeat(fd.getDay()) + Array.from({ length: nd }, (_, i) => { const k = ymd(new Date(m.getFullYear(), m.getMonth(), i + 1)); return '<button class="' + (f.targets[k] ? 'on' : '') + '" data-a="td" data-v="' + k + '">' + (i + 1) + '</button>'; }).join('') + '</div></div>';
    }
    h += sec('2 · 언제로', w2);
    const SH = [[0, '그대로'], [-60, '−1시간'], [-30, '−30분'], [30, '+30분'], [60, '+1시간']];
    h += sec('3 · 시간', '<div class="row">' + SH.map(s => '<button class="pillb' + (f.shift === s[0] ? ' on' : '') + '" data-a="sh" data-v="' + s[0] + '">' + s[1] + '</button>').join('') + '</div>');
    const dt = ks.length === 0 ? '날짜를 골라 주세요' : ks.length <= 3 ? ks.map(k => koD(pymd(k))).join(', ') : koD(pymd(ks[0])) + ' 외 ' + (ks.length - 1) + '일';
    h += '<p class="summary">' + sel.length + '개 일정을 ' + dt + '로 복제합니다. 시간은 ' + (f.shift ? (f.shift > 0 ? '+' : '−') + (Math.abs(f.shift) === 60 ? '1시간' : '30분') + ' 옮겨서' : '그대로') + ', 캘린더·장소·메모도 함께 가져갑니다.</p>';
    h += '<button class="gbtn" data-a="go" style="height:52px;border-radius:14px;font-size:calc(14.5px*var(--fz,1))"' + (sel.length * ks.length ? '' : ' disabled') + '>' + (sel.length * ks.length ? '일정 ' + sel.length * ks.length + '개 만들기' : '고른 일정이 없어요') + '</button>';
    return h;
  };
  const redraw = () => { const b = sh.querySelector('.sbody'), y = b.scrollTop; b.innerHTML = body(); b.scrollTop = y; };
  sh = openSheet('<div class="shead"><button class="tbtn" data-a="cancel">취소</button><h2 class="serif goldtext" style="font-size:calc(17px*var(--fz,1))">복제하기</h2><span style="width:52px"></span></div><div class="sbody">' + body() + '</div>', async (a, t) => {
    const v = t.dataset.v;
    if (a === 'cancel') { closeSheet(); return; }
    if (a === 'src') { f.src = Number(v); if (SRC[f.src][1]) { f.srcDate = ymd(SRC[f.src][1](tgtBase)); await loadSrc(); } }
    if (a === 'tq') { f.targets = { [v]: true }; f.cal = false; }
    if (a === 'tcal') f.cal = !f.cal;
    if (a === 'cm') f.calMonth = new Date(f.calMonth.getFullYear(), f.calMonth.getMonth() + Number(v), 1);
    if (a === 'td') f.targets[v] = !f.targets[v];
    if (a === 'sh') f.shift = Number(v);
    if (a === 'go') {
      const items = f.items.filter((x, i) => !f.off[i]).map(x => ({ calId: x.calId, title: x.title, allDay: x.bar, start: x.bar ? ymd(x.s) : isoLocal(x.s), end: x.bar ? ymd(x.allDay ? x.e : addD(sod(new Date(x.e.getTime() - 1)), 1)) : isoLocal(x.e), location: x.location || '', desc: x.desc || '' }));
      t.disabled = true; t.textContent = '복제 중';
      try { const r = await api('duplicate', { items, dates: keys(), shift: f.shift }, true); cacheAdd(r.events || []); toast((r.events || []).length + '개 복제했습니다'); closeAll(); render(); } catch (err) { toast('복제 실패: ' + err.message); t.disabled = false; t.textContent = '다시 시도'; }
      return;
    }
    redraw();
  }, { keep: true, onChange: async e => { if (e.target.dataset.i != null) { f.off[e.target.dataset.i] = !e.target.checked; redraw(); } if (e.target.id === 'fSrc') { f.srcDate = e.target.value; await loadSrc(); redraw(); } } });
}

/* ========== 할 일 ========== */
const T = { lists: null, tasks: [], when: 'today', pick: '', rep: '', draft: '', showDone: false, ts: 0 };
(() => { const c = store.get('tasks'); if (c) { T.lists = c.lists; T.tasks = c.tasks; } })();
const saveTasks = () => store.set('tasks', { lists: T.lists, tasks: T.tasks });
async function loadTasks(force) {
  if (!force && T.lists && Date.now() - T.ts < 60000) return false;
  const r = await api('tasks'); const before = JSON.stringify(T.tasks);
  T.lists = r.lists; T.tasks = r.tasks; T.ts = Date.now(); saveTasks();
  if (!S.listId || !T.lists.find(l => l.id === S.listId)) { S.listId = (T.lists[0] || {}).id || ''; save(); }
  setTimeout(repSync, 0);
  return JSON.stringify(T.tasks) !== before;
}
function renderTasks() {
  loadFont(S.noteFont || 'pen');
  $('#hAlt').innerHTML = T.lists && T.lists.length > 1 ? '<select class="inp" id="listSel" aria-label="목록" style="height:40px;min-width:120px;border-radius:20px;font-size:calc(13px*var(--fz,1));background:#120C09">' + T.lists.map(l => '<option value="' + esc(l.id) + '"' + (l.id === S.listId ? ' selected' : '') + '>' + esc(l.title) + '</option>').join('') + '</select>' : '';
  drawTasks();
  loadTasks().then(ch => { if (st.tab === 'task' && (ch || !$('#tscroll'))) renderTasks(); }).catch(err => { if (!T.lists) $('#main').innerHTML = '<div class="empty">할 일을 불러오지 못했습니다.<br>' + esc(err.message) + '</div>'; });
}
function drawTasks() {
  if (st.tab !== 'task') { tasksChangedOnCal(); return; }
  const main = $('#main');
  if (!T.lists) { main.innerHTML = '<div class="empty">불러오는 중…</div>'; return; }
  const today = ymd(sod(new Date())), lid = S.listId || (T.lists[0] || {}).id;
  const mine = T.tasks.filter(x => x.listId === lid && !x.parent);
  const subs = id => T.tasks.filter(x => x.parent === id).length;
  const open = mine.filter(x => !x.done), late = open.filter(x => x.due && x.due < today);
  // 완료 시각은 구글이 UTC로 줌 → 반드시 이 기기 날짜로 바꿔 비교 (v3.23: 한국 0~9시에 끝낸 일이 전날로 계산돼 목록에서 사라지던 버그)
  const doneDay = x => { if (!x.completed) return ''; const d = new Date(x.completed); return isNaN(d) ? '' : ymd(d); };
  const tdy = mine.filter(x => x.due === today && (!x.done || !x.completed || doneDay(x) >= today));
  const up = open.filter(x => x.due > today).sort((a, b) => a.due < b.due ? -1 : 1), none = open.filter(x => !x.due);
  const doneOld = mine.filter(x => x.done && !tdy.includes(x)); // 오늘 마감인데 며칠 전에 미리 끝낸 일도 여기(완료됨)에 보이게
  const tot = tdy.length, dn = tdy.filter(x => x.done).length, pct = tot ? Math.round(dn / tot * 100) : 0;
  const dl = s => { const d = pymd(s); return koD(d); };
  const row = (x, kind) => { const lt = !x.done && x.due && x.due < today; const meta = [lt ? dl(x.due) + ' 까지였음' : '', kind === 'up' ? dl(x.due) : '', subs(x.id) ? '하위 ' + subs(x.id) + '개' : ''].filter(Boolean).join(' · '); const memo = plainNote(x.notes).split('\n').find(l => l.trim()) || '', tip = tipFor(x), rr = repOf(x.notes);
    return '<div class="trow' + (x.done ? ' done' : '') + (lt ? ' late' : '') + '" data-tid="' + esc(x.id) + '"><i class="shine"></i>' + ckHTML(x.title + ' 완료', 'data-tk="' + esc(x.id) + '"' + (x.done ? ' checked' : '')) + '<div class="tmain"><span class="ttl">' + esc(x.title) + '<i class="strike"></i></span>' + (meta || rr ? '<span class="tmeta">' + (rr ? repBadge(x, rr) + (meta ? ' · ' : '') : '') + esc(meta) + '</span>' : '') + (memo ? '<span class="tmemo" style="font-family:' + NF(S.noteFont || 'pen')[2] + '">' + esc(memo) + '</span>' : '') + (tip ? '<span class="tai' + (tip.ai ? '' : ' rule') + '">' + esc(tip.t) + '</span>' : '') + '</div>' + (lt ? '<button class="tside" data-tt="' + esc(x.id) + '">오늘로</button>' : '') + '</div>'; };
  const grp = (title, cls, items, kind, extra) => '<div class="tgroup"><div class="tgh"><h3 class="serif ' + cls + '">' + title + '<small>' + items.length + '개</small></h3>' + (extra || '') + '</div><div class="tlist">' + (items.length ? items.map(x => row(x, kind)).join('') : '<div class="note" style="padding:14px;text-align:center">비어 있어요</div>') + '</div></div>';
  const W = [['today', '오늘'], ['tomorrow', '내일'], ['nextmon', '다음 주 월'], ['none', '날짜 없음']];
  let h = '<div class="scroller" id="tscroll"><div class="prog"><div class="t"><span>오늘 ' + dn + ' / ' + tot + ' 완료</span><span>' + pct + '%</span></div><div class="b"><i style="width:' + pct + '%"></i></div></div>'
    + '<div class="qadd"><div class="r"><input id="tDraft" placeholder="할 일 추가…" aria-label="새 할 일" value="' + esc(T.draft) + '" autocomplete="off" enterkeyhint="done"><button class="go" data-tadd aria-label="추가">' + ICON.plus + '</button></div>'
      // 처음 등록할 때부터 날짜·반복 선택 (v3.20)
      + '<div class="row qrow">' + W.map(w => '<button class="pillb' + (T.when === w[0] ? ' on' : '') + '" data-when="' + w[0] + '">' + w[1] + '</button>').join('')
      + '<label class="pillb pick' + (T.when === 'pick' ? ' on' : '') + '">' + (T.when === 'pick' && T.pick ? esc(koD(pymd(T.pick))) : '날짜 고르기') + '<input type="date" id="tPick" aria-label="날짜 고르기" value="' + esc(T.pick || '') + '"></label></div>'
      + '<div class="row qrow"><span class="lab qlab">반복</span>' + REP.map(q => '<button class="pillb' + (T.rep === q[0] ? ' on' : '') + '" data-trep="' + q[0] + '">' + q[1] + '</button>').join('') + '</div></div>';
  if (late.length) h += grp('밀린 일', 'late', late, 'late', '<button class="tside" data-rollall style="margin-right:0;border-color:#8E6B3A;background:rgba(201,164,106,.1)">모두 오늘로</button>');
  h += grp('오늘 · ' + dl(today), '', tdy, 'today') + grp('다가오는 일', '', up, 'up') + grp('날짜 없음', 'mute', none, 'none');
  h += '<button class="donetoggle" data-donetog aria-expanded="' + T.showDone + '"><span style="display:inline-flex;transition:transform .2s;transform:rotate(' + (T.showDone ? 90 : 0) + 'deg)">' + ICON.chev + '</span>완료됨 ' + doneOld.length + '개</button>';
  if (T.showDone) h += '<div class="tlist" style="opacity:.85">' + (doneOld.length ? doneOld.slice(0, 50).map(x => row(x, 'done')).join('') : '<div class="note" style="padding:14px">최근 30일 동안 완료한 일이 여기 보입니다</div>') + '</div>';
  h += '</div>';
  const y = $('#tscroll') ? $('#tscroll').scrollTop : 0, ae = document.activeElement, foc = ae && ae.id === 'tDraft', cp = foc ? ae.selectionStart : 0;
  main.innerHTML = h; $('#tscroll').scrollTop = y;
  if (foc) { const d = $('#tDraft'); d.focus({ preventScroll: true }); try { d.setSelectionRange(cp, cp); } catch (e) {} }
}
const TAPI = 'https://tasks.googleapis.com/tasks/v1';
const NFONTS = [
  ['pen', '펜 손글씨', "'Nanum Pen Script', cursive", 'Nanum+Pen+Script', 1.25],
  ['brush', '붓 흘림', "'Nanum Brush Script', cursive", 'Nanum+Brush+Script', 1.25],
  ['calli', '캘리', "'Yeon Sung', cursive", 'Yeon+Sung', 1.05],
  ['dokdo', '거친 붓', "'East Sea Dokdo', cursive", 'East+Sea+Dokdo', 1.35],
  ['round', '동글', "'Gaegu', cursive", 'Gaegu', 1.1],
  ['melody', '멜로디', "'Hi Melody', cursive", 'Hi+Melody', 1.15],
  ['serif', '명조', "'Nanum Myeongjo', serif", '', 1],
  ['sans', '고딕', "'Noto Sans KR', sans-serif", '', 1]
];
const NF = id => NFONTS.find(x => x[0] === id) || NFONTS[0];
const loadedFonts = {};
function loadFont(id) { const f = NF(id); if (!f[3] || loadedFonts[f[3]]) return; loadedFonts[f[3]] = 1; const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = 'https://fonts.googleapis.com/css2?family=' + f[3] + '&display=swap'; document.head.appendChild(l); }
const NFONT = new Proxy({}, { get: (_, k) => NF(k)[2] });
const INKS = [['기본', '#E9DCC4'], ['금', '#E3C48E'], ['버건디', '#E07A6E'], ['청잉크', '#8FB2E0'], ['초록', '#8CC59A']];
/* 메모 서식: 구글 Tasks에는 글자만 저장되므로 **굵게** __밑줄__ [[금:글자]] 표시로 저장 */
function noteToHtml(t) {
  let h = esc(t || '');
  for (let k = 0; k < 3; k++) {
    h = h.replace(/\[\[([^:\]]+):([\s\S]*?)\]\]/g, (m, n, x) => { const c = (INKS.find(i => i[0] === n) || [])[1]; return c ? '<span style="color:' + c + '">' + x + '</span>' : m; });
    h = h.replace(/\*\*([\s\S]+?)\*\*/g, '<b>$1</b>').replace(/__([\s\S]+?)__/g, '<u>$1</u>');
  }
  return h.replace(/\n/g, '<br>');
}
const plainNote = t => repStrip(t).replace(/\[\[[^:\]]+:([\s\S]*?)\]\]/g, '$1').replace(/\*\*|__/g, '');
function hexOf(c) { if (!c) return ''; c = c.trim(); if (c[0] === '#') return c.length === 4 ? '#' + c[1] + c[1] + c[2] + c[2] + c[3] + c[3] : c.slice(0, 7); const m = c.match(/\d+/g); return m ? '#' + m.slice(0, 3).map(v => pad(Number(v).toString(16))).join('') : ''; }
function inkName(c) { const h = hexOf(c); if (!h) return ''; const v = x => [1, 3, 5].map(i => parseInt(x.substr(i, 2), 16)); const a = v(h); let best = '', bd = 1e9; INKS.forEach(i => { const b = v(i[1]), d = (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2; if (d < bd) { bd = d; best = i[0]; } }); return best === '기본' ? '' : best; }
function htmlToNote(root) {
  const walk = n => {
    if (n.nodeType === 3) return n.nodeValue.replace(/ /g, ' ');
    if (n.nodeType !== 1) return '';
    const tag = n.tagName; if (tag === 'BR') return '\n';
    let inner = Array.from(n.childNodes).map(walk).join('');
    const stl = n.style || {};
    if (tag === 'DIV' || tag === 'P') inner = '\n' + inner;
    if (!inner.replace(/\n/g, '')) return inner;
    const col = n.getAttribute && (n.getAttribute('color') || stl.color);
    if (col) { const nm = inkName(col); if (nm) inner = '[[' + nm + ':' + inner + ']]'; }
    if (tag === 'U' || /underline/.test(stl.textDecoration || stl.textDecorationLine || '')) inner = '__' + inner + '__';
    if (tag === 'B' || tag === 'STRONG' || /bold|[6-9]00/.test(stl.fontWeight || '')) inner = '**' + inner + '**';
    return inner;
  };
  return Array.from(root.childNodes).map(walk).join('').replace(/^\n/, '').replace(/\n+$/, '');
}
function openTask(x) {
  const today = sod(new Date());
  const r0 = repOf(x.notes), f = { title: x.title, due: x.due || '', armed: false, rep: r0 ? r0.k : '' };
  if (!S.noteSize) S.noteSize = 16; if (!NFONTS.some(z => z[0] === S.noteFont)) S.noteFont = 'pen';
  loadFont(S.noteFont);
  const Q = [['오늘', ymd(today)], ['내일', ymd(addD(today, 1))], ['다음 주 월', ymd(addD(today, ((8 - today.getDay()) % 7) || 7))], ['날짜 없음', '']];
  const fs = () => Math.round(S.noteSize * NF(S.noteFont)[4]), lh = () => Math.round(fs() * 1.7);
  const paperStyle = () => 'font-family:' + NF(S.noteFont)[2] + ';font-size:' + fs() + 'px;line-height:' + lh() + 'px;background-size:100% ' + lh() + 'px;min-height:' + (lh() * 10) + 'px';
  let sh;
  const dueRow = () => '<div class="scrollx" style="padding:0 0 8px 36px">' + Q.map(q => '<button class="nchip' + (f.due === q[1] ? ' on' : '') + '" data-a="kq" data-v="' + q[1] + '">' + q[0] + '</button>').join('') + '<label class="nchip" style="position:relative;overflow:hidden;flex-shrink:0">날짜 고르기<input type="date" id="kDue" value="' + f.due + '" style="position:absolute;inset:0;opacity:0"></label></div>';
  const repRow = () => '<div class="scrollx" style="padding:0 0 8px 36px"><span class="lab" style="align-self:center;flex-shrink:0;margin-right:2px">반복</span>' + REP.map(q => '<button class="nchip' + (f.rep === q[0] ? ' on' : '') + '" data-a="krep" data-v="' + q[0] + '">' + q[1] + '</button>').join('') + '</div>';
  const html = '<div class="shead"><button class="tbtn" data-a="cancel">취소</button><h2 class="serif goldtext" style="font-size:calc(17px*var(--fz,1))">할 일 · 메모</h2><button class="gbtn" data-a="ksave">저장</button></div>'
    + '<div class="ntoolbar">'
    + '<div class="scrollx" id="fontRow">' + NFONTS.map(z => '<button class="nchip fmt' + (S.noteFont === z[0] ? ' on' : '') + '" data-a="nf" data-v="' + z[0] + '"><span style="font-family:' + z[2] + ';font-size:' + Math.round(14 * z[4]) + 'px">' + z[1] + '</span></button>').join('') + '</div>'
    + '<div class="row" style="gap:4px;row-gap:8px;justify-content:space-between;flex-wrap:wrap"><div class="row" style="gap:4px;flex-wrap:nowrap"><button class="nchip fmt" data-a="bold" aria-label="굵게" style="font-weight:800;width:38px;justify-content:center">B</button><button class="nchip fmt" data-a="under" aria-label="밑줄" style="text-decoration:underline;width:38px;justify-content:center">U</button>'
    + INKS.map(k => '<button class="ink fmt" data-a="ink" data-v="' + k[1] + '" aria-label="' + k[0] + ' 잉크" style="background:' + k[1] + '"></button>').join('') + '</div>'
    + '<div class="row" style="gap:4px;flex-wrap:nowrap"><button class="nchip fmt" data-a="fsz" data-v="-1" aria-label="글자 작게">가<small>−</small></button><button class="nchip fmt" data-a="fsz" data-v="1" aria-label="글자 크게" style="font-size:calc(14.5px*var(--fz,1))">가<small>+</small></button></div></div></div>'
    + '<div class="sbody" style="gap:12px;padding-top:10px" id="kBody"><div class="npaper">'
    + '<div class="nhead"><span class="nstamp" id="kStamp">' + esc(f.due ? koD(pymd(f.due)) : '날짜 없음') + '</span><span class="nline"></span></div>'
    + '<input class="ntitle" id="kTitle" value="' + esc(f.title) + '" autocomplete="off" aria-label="할 일">'
    + '<div id="kDueRow">' + dueRow() + '</div><div id="kRepRow">' + repRow() + '</div>'
    + '<div class="nmemo" id="kNotes" contenteditable="true" role="textbox" aria-multiline="true" aria-label="메모" data-ph="여기에 메모를 끄적여 보세요…">' + noteToHtml(repStrip(x.notes)) + '</div>'
    + '</div><div class="row" style="justify-content:center;padding:4px 0 8px"><button class="obtn" data-a="kdel" id="kDel" style="min-width:140px">삭제</button></div>'
    + '<p class="note" style="text-align:center;font-size:calc(11px*var(--fz,1))">굵게·밑줄·잉크 색은 구글 Tasks에 **굵게**, __밑줄__, [[금:글자]] 같은 표시로 저장됩니다.</p></div>';
  const restyle = () => {
    loadFont(S.noteFont);
    const ta = sh.querySelector('#kNotes'), ti = sh.querySelector('#kTitle');
    ta.setAttribute('style', paperStyle()); ti.style.fontFamily = NF(S.noteFont)[2]; ti.style.fontSize = Math.round(fs() * 1.35) + 'px';
    sh.querySelectorAll('[data-a=nf]').forEach(b => b.classList.toggle('on', b.dataset.v === S.noteFont));
  };
  const setDue = v => { f.due = v; sh.querySelector('#kDueRow').innerHTML = dueRow(); sh.querySelector('#kStamp').textContent = v ? koD(pymd(v)) : '날짜 없음'; };
  const url = TAPI + '/lists/' + encodeURIComponent(x.listId) + '/tasks/' + encodeURIComponent(x.id);
  const exec = (cmd, val) => { const ed = sh.querySelector('#kNotes'); if (document.activeElement !== ed) ed.focus(); try { document.execCommand('styleWithCSS', false, false); document.execCommand(cmd, false, val); } catch (e) {} };
  sh = openSheet(html, async (a, t) => {
    if (a === 'cancel') { closeSheet(); return; }
    if (a === 'kq') { setDue(t.dataset.v); return; }
    if (a === 'krep') { f.rep = t.dataset.v; sh.querySelector('#kRepRow').innerHTML = repRow(); if (f.rep && !f.due) setDue(ymd(today)); return; }
    if (a === 'nf') { S.noteFont = t.dataset.v; save(); restyle(); return; }
    if (a === 'fsz') { S.noteSize = Math.max(12, Math.min(26, S.noteSize + Number(t.dataset.v) * 2)); save(); restyle(); return; }
    if (a === 'bold') { exec('bold'); return; }
    if (a === 'under') { exec('underline'); return; }
    if (a === 'ink') { exec('foreColor', t.dataset.v); return; }
    if (a === 'kdel') {
      if (!f.armed) { f.armed = true; t.textContent = '한 번 더 누르면 삭제'; t.style.borderColor = '#E8957A'; t.style.color = '#E8957A'; return; }
      t.disabled = true;
      try { const stop = repStopReq(x); await batch([{ method: 'delete', url }].concat(stop ? [stop.req] : [])); if (stop) stop.apply(); T.tasks = T.tasks.filter(y => y.id !== x.id && y.parent !== x.id); saveTasks(); toast(stop ? '삭제했습니다 · 반복도 멈췄어요' : '삭제했습니다'); closeSheet(); drawTasks(); } catch (err) { toast('삭제 실패: ' + err.message); t.disabled = false; }
      return;
    }
    if (a === 'ksave') {
      const title = (sh.querySelector('#kTitle').value || '').trim(); if (!title) { toast('내용을 입력해 주세요'); return; }
      const notes = repSet(htmlToNote(sh.querySelector('#kNotes')), f.rep, f.due);
      t.disabled = true; t.textContent = '저장 중';
      try { await batch([{ method: 'patch', url, body: { title, notes, due: f.due ? f.due + 'T00:00:00.000Z' : null } }]); Object.assign(x, { title, notes, due: f.due }); saveTasks(); toast(f.rep ? '저장했습니다 · ' + repLabel(repOf(notes)) + ' 반복' : '저장했습니다'); closeSheet(); drawTasks(); repSync(); }
      catch (err) { toast('저장 실패: ' + err.message); t.disabled = false; t.textContent = '저장'; }
    }
  }, { keep: true, height: '94%', onChange: e => { if (e.target.id === 'kDue') setDue(e.target.value); } });
  const keepSel = e => { if (e.target.closest('.fmt')) e.preventDefault(); };
  sh.addEventListener('mousedown', keepSel); sh.addEventListener('touchstart', e => { const b = e.target.closest('.fmt'); if (b && document.activeElement && document.activeElement.id === 'kNotes') { e.preventDefault(); b.click(); } }, { passive: false });
  restyle();
}
const nextDue = w => { const t = sod(new Date()); if (w === 'today') return ymd(t); if (w === 'tomorrow') return ymd(addD(t, 1)); if (w === 'nextmon') return ymd(addD(t, ((8 - t.getDay()) % 7) || 7)); return ''; };
async function taskToggle(id, el) {
  const x = T.tasks.find(y => y.id === id); if (!x) return;
  const done = !x.done, rowEl = el.closest('.trow');
  x.done = done; x.completed = done ? new Date().toISOString() : ''; saveTasks();
  rowEl.classList.remove('jd', 'ju'); void rowEl.offsetWidth;
  rowEl.classList.toggle('done', done); rowEl.classList.add(done ? 'jd' : 'ju');
  setTimeout(drawTasks, done ? 1400 : 750);
  try { await api('taskUpdate', { listId: x.listId, id, patch: { done } }, true); } catch (err) { x.done = !done; saveTasks(); toast('저장 실패: ' + err.message); drawTasks(); }
}
async function taskAdd() {
  const inp = $('#tDraft'), title = (inp.value || '').trim(); if (!title) { inp.focus(); return; }
  const rep = T.rep || '';
  let due = T.when === 'pick' ? (T.pick || '') : nextDue(T.when); if (rep && !due) due = ymd(sod(new Date())); // 반복은 날짜가 있어야 함
  const notes = repSet('', rep, due), tmp = { id: 'tmp' + Date.now(), listId: S.listId, title, notes, due, done: false, completed: '', parent: '' };
  T.tasks.unshift(tmp); T.draft = ''; T.rep = ''; drawTasks(); $('#tDraft').focus(); // 반복은 한 번 쓰고 '안 함'으로 되돌림(실수로 계속 반복 만들지 않게)
  try {
    if (rep) { const out = await batch([{ method: 'post', url: taskUrl(S.listId), body: { title, notes, due: due + 'T00:00:00.000Z' } }]); Object.assign(tmp, mapGTask(out[0].body, S.listId)); toast(repLabel(repOf(notes)) + ' 반복으로 추가했어요'); }
    else { const r = await api('taskAdd', { listId: S.listId, title, due }, true); Object.assign(tmp, r.task); }
    saveTasks(); drawTasks();
  } catch (err) { T.tasks = T.tasks.filter(y => y !== tmp); drawTasks(); toast('추가 실패: ' + err.message); }
}
async function taskMove(ids) {
  const due = ymd(sod(new Date()));
  const xs = T.tasks.filter(y => ids.includes(y.id)); xs.forEach(x => x.due = due); saveTasks(); drawTasks();
  try { await Promise.all(xs.map(x => api('taskUpdate', { listId: x.listId, id: x.id, patch: { due } }, true))); } catch (err) { toast('저장 실패: ' + err.message); loadTasks(true).then(drawTasks); }
}

/* ========== 간트 ========== */
const G = { phases: null, zoom: 1, filter: 'all', sel: '', ts: 0 };
(() => { const c = store.get('gantt'); if (c) G.phases = c; })();
async function loadGantt(force) {
  if (!force && G.phases && Date.now() - G.ts < 60000) return false;
  const r = await api('gantt'); const before = JSON.stringify(G.phases);
  G.phases = r.phases; G.ts = Date.now(); store.set('gantt', G.phases); return JSON.stringify(G.phases) !== before;
}
function projects() {
  const by = {};
  (G.phases || []).forEach(p => { const g = p.gantt || {}; const k = g.proj; if (!by[k]) by[k] = { id: k, name: g.pname, group: g.group || '업무', calId: p.calId, color: p.color, phases: [] }; by[k].phases.push(Object.assign(normal(p), { idx: Number(g.idx || 0), pname: g.phase || p.title, done: g.done === '1' })); });
  return Object.values(by).map(pr => { pr.phases.sort((a, b) => a.idx - b.idx || a.s - b.s); pr.s = pr.phases[0].s; pr.e = pr.phases[pr.phases.length - 1].e; return pr; }).sort((a, b) => a.s - b.s);
}
function renderGantt() {
  $('#hAlt').innerHTML = '<div class="seg" role="tablist" aria-label="기간">' + ['월', '분기', '1년'].map((n, i) => '<button role="tab" data-zoom="' + i + '" class="' + (G.zoom === i ? 'on' : '') + '">' + n + '</button>').join('') + '</div>';
  drawGantt();
  loadGantt().then(ch => { if (st.tab === 'gantt' && ch) drawGantt(); }).catch(err => { if (!G.phases) $('#main').innerHTML = '<div class="empty">계획을 불러오지 못했습니다.<br>' + esc(err.message) + '</div>'; });
}
function drawGantt() {
  const main = $('#main');
  if (!G.phases) { main.innerHTML = '<div class="empty">불러오는 중…</div>'; return; }
  const today = sod(new Date()), P = projects();
  const t = today, Z = [
    { a: new Date(t.getFullYear(), t.getMonth(), 1), b: new Date(t.getFullYear(), t.getMonth() + 1, 1), ticks: [1, 8, 15, 22, 29].map(d => [new Date(t.getFullYear(), t.getMonth(), d), d === 1 ? (t.getMonth() + 1) + '월' : String(d)]) },
    { a: new Date(t.getFullYear(), t.getMonth() - 1, 1), b: new Date(t.getFullYear(), t.getMonth() + 3, 1), ticks: [-1, 0, 1, 2].map(i => { const d = new Date(t.getFullYear(), t.getMonth() + i, 1); return [d, (d.getFullYear() !== t.getFullYear() ? (d.getFullYear() % 100) + '.' : '') + (d.getMonth() + 1) + '월']; }) },
    { a: new Date(t.getFullYear(), 0, 1), b: new Date(t.getFullYear() + 1, 0, 1), ticks: [0, 2, 4, 6, 8, 10].map(m => [new Date(t.getFullYear(), m, 1), (m + 1) + '월']) }
  ][G.zoom];
  const W = Math.max(200, (main.clientWidth || 390) - 24 - 2 - 24), L = 12, span = z => (z - Z.a) / (Z.b - Z.a) * W;
  const F = [['all', '전체'], ['업무', '업무'], ['공부', '공부'], ['개인', '개인']];
  let h = '<div class="scroller" id="gscroll"><div class="row" style="padding:2px 2px 4px">' + F.map(f => '<button class="pillb' + (G.filter === f[0] ? ' on' : '') + '" data-gf="' + f[0] + '">' + f[1] + '</button>').join('') + '<button class="pillb dash" data-gnew>+ 새 계획</button></div>';
  if (!P.length) h += '<div class="empty">아직 계획이 없습니다.<br>"+ 새 계획"으로 공부나 업무 프로젝트를 단계별로 넣어 보세요.</div>';
  else {
    h += '<div class="gcard"><div class="gticks">' + Z.ticks.map(x => '<span style="left:' + (L + span(x[0])) + 'px">' + x[1] + '</span>').join('') + '</div><div class="gbody">' + Z.ticks.map(x => '<i class="ggl" style="left:' + (L + span(x[0])) + 'px"></i>').join('');
    if (today >= Z.a && today < Z.b) h += '<i class="gtoday" style="left:' + (L + span(new Date(today.getTime() + 432e5))) + 'px"></i>';
    ['업무', '공부', '개인'].filter(g => G.filter === 'all' || G.filter === g).forEach(g => {
      const rows = P.filter(p => p.group === g); if (!rows.length) return;
      h += '<h4 class="serif gsec">' + g + '</h4>';
      rows.forEach(p => {
        const dn = p.phases.filter(x => x.done).length, pct = Math.round(dn / p.phases.length * 100), c = p.color;
        let segs = '';
        p.phases.forEach((ph, i) => {
          const a = ph.s < Z.a ? Z.a : ph.s, b = ph.e > Z.b ? Z.b : ph.e; if (b <= a) return;
          const now = ph.s <= today && today < ph.e, prog = Math.round((today - ph.s) / (ph.e - ph.s) * 100);
          const bg = ph.done ? 'background:linear-gradient(180deg,' + c + ',' + c + 'C0);box-shadow:0 2px 6px rgba(0,0,0,.5),inset 0 1px 0 rgba(255,255,255,.3)' : (now ? 'background:linear-gradient(90deg,' + c + 'B0 0%,' + c + 'B0 ' + prog + '%,' + c + '33 ' + prog + '%,' + c + '33 100%);border:1px solid ' + c : 'background:' + c + '2E;border:1px solid ' + c + '99');
          segs += '<i class="gseg" style="left:' + (span(a) + 1) + 'px;width:' + Math.max(span(b) - span(a) - 2, 3) + 'px;' + bg + ';animation-delay:' + (i * .08) + 's"></i>';
        });
        const inWin = p.e > Z.a && p.s < Z.b, last = new Date(p.e.getTime() - 864e5);
        h += '<button class="grow' + (G.sel === p.id ? ' on' : '') + '" data-gsel="' + esc(p.id) + '"><span class="n"><span>' + esc(p.name) + '</span><span>' + pct + '%</span></span><span class="gtrack">' + segs + (p.e > Z.a && p.e <= Z.b ? '<i class="gms" style="left:' + (span(p.e) - 5) + 'px"></i>' : '') + (inWin ? '' : '<span class="gout">' + (p.e <= Z.a ? '← ' + md(last) + ' 종료' : md(p.s) + ' 시작 →') + '</span>') + '</span></button>';
      });
    });
    h += '</div></div>';
    const sp = P.find(p => p.id === G.sel);
    if (sp) {
      const dn = sp.phases.filter(x => x.done).length, pct = Math.round(dn / sp.phases.length * 100);
      h += '<section class="gdet"><div style="display:flex;align-items:center;gap:10px"><span style="width:12px;height:40px;border-radius:6px;background:linear-gradient(180deg,' + sp.color + ',' + sp.color + 'A0);box-shadow:0 0 10px ' + sp.color + '66"></span><div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:2px"><h3 class="serif" style="margin:0;font-size:calc(17px*var(--fz,1));color:var(--goldL)">' + esc(sp.name) + '</h3><span class="lab">' + md(sp.s) + ' – ' + md(new Date(sp.e.getTime() - 864e5)) + ' · ' + esc((st.calMap[sp.calId] || {}).name || '') + '</span></div><span class="serif goldtext" style="font-size:calc(26px*var(--fz,1))">' + pct + '%</span></div>'
        + '<div class="prog" style="margin:0"><div class="b"><i style="width:' + pct + '%"></i></div></div><div class="tlist" style="background:transparent;border:none">'
        + sp.phases.map(ph => { const now = !ph.done && ph.s <= today && today < ph.e; return '<div class="trow' + (ph.done ? ' done' : '') + '">' + '<i class="shine"></i>' + ckHTML(ph.pname + ' 완료', 'data-gph="' + esc(ph.calId + '|' + ph.id) + '"' + (ph.done ? ' checked' : '')) + '<div class="tmain"><span class="ttl">' + esc(ph.pname) + '<i class="strike"></i></span><span class="tmeta">' + md(ph.s) + ' – ' + md(new Date(ph.e.getTime() - 864e5)) + '</span></div>' + (now ? '<span class="tside" style="border-color:#8E6B3A">진행 중</span>' : '') + '</div>'; }).join('')
        + '</div><div class="row" style="gap:8px"><button class="obtn" data-gedit="' + esc(sp.id) + '" style="flex:2;height:46px;border-color:#8E6B3A;color:var(--goldL)">계획 수정</button><button class="obtn" data-gdel="' + esc(sp.id) + '" style="flex:1;height:46px">계획 삭제</button></div><p class="note">단계마다 구글 캘린더 <b>' + esc((st.calMap[sp.calId] || {}).name || '') + '</b>에 여러 날 종일 일정으로 저장되어 있습니다.</p></section>';
    }
  }
  h += '</div>';
  const y = $('#gscroll') ? $('#gscroll').scrollTop : 0;
  main.innerHTML = h; $('#gscroll').scrollTop = y;
}
async function ganttToggle(key, el) {
  const [calId, id] = key.split('|'), p = (G.phases || []).find(x => x.calId === calId && x.id === id); if (!p) return;
  const done = p.gantt.done !== '1', rowEl = el.closest('.trow');
  p.gantt.done = done ? '1' : '0'; store.set('gantt', G.phases);
  rowEl.classList.remove('jd', 'ju'); void rowEl.offsetWidth; rowEl.classList.toggle('done', done); rowEl.classList.add(done ? 'jd' : 'ju');
  setTimeout(() => { if (st.tab === 'gantt') drawGantt(); }, done ? 1400 : 750);
  try { await api('ganttDone', { calId, id, props: p.gantt, done }, true); } catch (err) { p.gantt.done = done ? '0' : '1'; toast('저장 실패: ' + err.message); drawGantt(); }
}
function openPlan(P) {
  const owned = st.cals.filter(c => c.owned && !isHol(c.id)), t = sod(new Date());
  const f = { name: '', group: '업무', cal: (owned.find(c => c.name === '<업무>') || owned[0] || {}).id, phases: [{ name: '', start: ymd(t), end: ymd(addD(t, 6)) }], removed: [] };
  if (P) Object.assign(f, { name: P.name, group: P.group, cal: P.calId, phases: P.phases.map(ph => ({ id: ph.id, calId: ph.calId, name: ph.pname, start: ymd(ph.s), end: ymd(addD(ph.e, -1)), props: Object.assign({}, ph.gantt) })) });
  let sh;
  const body = () => '<label style="display:flex;flex-direction:column;gap:4px"><span class="lab">계획 이름</span><input class="title-inp" id="pName" placeholder="예: 자격증 준비" value="' + esc(f.name) + '"></label>'
    + sec('분류', '<div class="row">' + ['업무', '공부', '개인'].map(g => '<button class="pillb' + (f.group === g ? ' on' : '') + '" data-a="grp" data-v="' + g + '">' + g + '</button>').join('') + '</div>')
    + sec('캘린더 · 막대 색이 됩니다', '<div class="row">' + owned.map(c => '<button class="pillb' + (f.cal === c.id ? ' on' : '') + '" data-a="pcal" data-id="' + esc(c.id) + '">' + esc(c.name) + '</button>').join('') + '</div>')
    + sec('단계', f.phases.map((p, i) => '<div class="box" style="padding:10px 12px;gap:8px"><div class="row" style="flex-wrap:nowrap"><input class="inp" data-pi="' + i + '" data-pf="name" placeholder="' + (i + 1) + '단계 이름" value="' + esc(p.name) + '" style="flex:1">' + (f.phases.length > 1 ? '<button class="ibtn" data-a="prm" data-v="' + i + '" aria-label="단계 빼기">' + ICON.x + '</button>' : '') + '</div><div class="row" style="flex-wrap:nowrap"><input type="date" class="inp" data-pi="' + i + '" data-pf="start" value="' + p.start + '" style="flex:1"><span class="lab">~</span><input type="date" class="inp" data-pi="' + i + '" data-pf="end" value="' + p.end + '" style="flex:1"></div></div>').join('') + '<button class="pillb dash" data-a="padd" style="align-self:flex-start">+ 단계 추가</button>')
    + '<p class="note">단계마다 고른 캘린더에 여러 날 종일 일정으로 저장됩니다. 구글 캘린더에는 막대로 보이고, 이 앱의 캘린더 화면에서는 설정에서 켤 때만 보입니다.</p>';
  const redraw = () => { const b = sh.querySelector('.sbody'), y = b.scrollTop; b.innerHTML = body(); b.scrollTop = y; };
  sh = openSheet('<div class="shead"><button class="tbtn" data-a="cancel">취소</button><h2 class="serif goldtext" style="font-size:calc(17px*var(--fz,1))">' + (P ? '계획 수정' : '새 계획') + '</h2><button class="gbtn" data-a="save">저장</button></div><div class="sbody">' + body() + '</div>', async (a, t2) => {
    const v = t2.dataset.v;
    if (a === 'cancel') { closeSheet(); return; }
    if (a === 'grp') f.group = v;
    if (a === 'pcal') f.cal = t2.dataset.id;
    if (a === 'padd') { const last = f.phases[f.phases.length - 1], s = addD(pymd(last.end), 1); f.phases.push({ name: '', start: ymd(s), end: ymd(addD(s, 6)) }); }
    if (a === 'prm') { const rm = f.phases.splice(Number(v), 1)[0]; if (rm && rm.id) f.removed.push(rm); }
    if (a === 'save') {
      if (!f.name.trim()) { toast('계획 이름을 입력해 주세요'); return; }
      const ph = f.phases.map((p, i) => ({ name: p.name.trim() || (i + 1) + '단계', start: p.start, end: p.end < p.start ? p.start : p.end }));
      t2.disabled = true; t2.textContent = '저장 중';
      if (P) {
        try {
          const nm = f.name.trim(), E = id => GAPI + '/calendars/' + encodeURIComponent(f.cal) + '/events' + (id ? '/' + encodeURIComponent(id) : '');
          const moves = f.phases.filter(p => p.id && p.calId !== f.cal).map(p => ({ method: 'post', url: GAPI + '/calendars/' + encodeURIComponent(p.calId) + '/events/' + encodeURIComponent(p.id) + '/move?destination=' + encodeURIComponent(f.cal) }));
          if (moves.length) await batch(moves);
          const reqs = ph.map((p, i) => {
            const src = f.phases[i], props = Object.assign({ gantt: '1', proj: P.id, done: '0' }, src.props || {}, { pname: nm, group: f.group, idx: String(i), phase: p.name });
            const body = { summary: nm + ' · ' + p.name, start: { date: p.start }, end: { date: ymd(addD(pymd(p.end), 1)) }, extendedProperties: { private: props } };
            if (src.id) return { method: 'patch', url: E(src.id), body };
            body.reminders = { useDefault: false, overrides: [] }; return { method: 'post', url: E(), body };
          }).concat(f.removed.map(p => ({ method: 'delete', url: GAPI + '/calendars/' + encodeURIComponent(p.calId) + '/events/' + encodeURIComponent(p.id) })));
          await batch(reqs);
          await loadGantt(true); Object.keys(M.ts).forEach(k => M.ts[k] = 0); G.sel = P.id; toast('계획을 수정했습니다'); closeAll(); drawGantt();
        } catch (err) { toast('수정 실패: ' + err.message); t2.disabled = false; t2.textContent = '저장'; loadGantt(true).then(drawGantt).catch(() => {}); }
        return;
      }
      try { const r = await api('ganttCreate', { plan: { name: f.name.trim(), group: f.group, calId: f.cal, phases: ph } }, true); G.phases = (G.phases || []).concat(r.phases); store.set('gantt', G.phases); G.sel = (r.phases[0] || {}).gantt ? r.phases[0].gantt.proj : ''; Object.keys(M.ts).forEach(k => M.ts[k] = 0); toast('계획을 만들었습니다'); closeAll(); drawGantt(); }
      catch (err) { toast('저장 실패: ' + err.message); t2.disabled = false; t2.textContent = '저장'; }
      return;
    }
    redraw();
  }, { keep: true, onInput: e => { if (e.target.id === 'pName') f.name = e.target.value; const i = e.target.dataset.pi; if (i != null) f.phases[i][e.target.dataset.pf] = e.target.value; } });
}

/* ========== 설정 ========== */
/* ========== AI 코치 (Gemini 무료 등급 · 키는 이 기기에만) ========== */
const AI = { coach: '', q: [], busy: false, pauseTill: 0, store: null };
const COACH_FALLBACK = '당신은 따뜻하지만 현실적인 라이프 코치입니다. 한국어 해요체로 답합니다. 받은 숫자만 사용하고 지어내지 않습니다.';
const aiStore = () => { if (!AI.store) { try { AI.store = JSON.parse(localStorage.getItem('cal.ai') || '{}'); } catch (e) { AI.store = {}; } AI.store.tips = AI.store.tips || {}; AI.store.an = AI.store.an || {}; } return AI.store; };
const aiSave = () => { try { const s = aiStore(), k = Object.keys(s.tips); if (k.length > 400) k.slice(0, k.length - 400).forEach(x => delete s.tips[x]); localStorage.setItem('cal.ai', JSON.stringify(s)); } catch (e) {} };
const hsh = t => { let h = 5381; for (let i = 0; i < t.length; i++) h = (h * 33 + t.charCodeAt(i)) >>> 0; return h.toString(36); };
const aiOn = () => !!S.aiKey;
fetch('coach.md', { cache: 'no-cache' }).then(r => r.ok ? r.text() : '').then(t => { AI.coach = t; }).catch(() => {});

const AI_MODELS = ['gemini-flash-lite-latest', 'gemini-2.5-flash-lite', 'gemini-flash-latest', 'gemini-2.5-flash'];
async function gemini(prompt, maxTok) {
  if (!S.aiKey) throw new Error('키 없음');
  if (Date.now() < AI.pauseTill) throw new Error('잠시 쉬는 중');
  const models = S.aiModel ? [S.aiModel].concat(AI_MODELS.filter(m => m !== S.aiModel)) : AI_MODELS;
  let last = '';
  for (const m of models) {
    const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models/' + m + ':generateContent?key=' + encodeURIComponent(S.aiKey), {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ systemInstruction: { parts: [{ text: AI.coach || COACH_FALLBACK }] }, contents: [{ role: 'user', parts: [{ text: prompt }] }], generationConfig: { temperature: 0.8, maxOutputTokens: maxTok || 400 } })
    });
    let j = {}; try { j = await r.json(); } catch (e) {}
    if (r.ok) {
      const t = (((j.candidates || [])[0] || {}).content || {}).parts || [];
      const txt = t.map(p => p.text || '').join('').trim();
      if (!txt) throw new Error('빈 답변');
      if (S.aiModel !== m) { S.aiModel = m; save(); }
      return txt;
    }
    const msg = (j.error && j.error.message) || ('HTTP ' + r.status);
    if (r.status === 429) { AI.pauseTill = Date.now() + 60000; throw new Error('무료 사용량을 잠시 넘었어요. 1분 뒤 다시 됩니다'); }
    if (r.status === 400 && /API key|API_KEY/i.test(msg)) throw new Error('키가 올바르지 않아요');
    if (r.status === 403) throw new Error('키 권한이 없어요: ' + msg);
    last = msg; // 모델 없음(404) 등 → 다음 모델
  }
  throw new Error(last || '연결 실패');
}

/* --- 다른 기기로 연결 옮기기: 'MYCAL1:' + base64(JSON {url,key,ai}) --- */
const codeMake = () => 'MYCAL1:' + btoa(unescape(encodeURIComponent(JSON.stringify({ url: S.url, key: S.key, ai: S.aiKey || '' }))));
function codeRead(t) { if (!/^MYCAL1:/.test(t || '')) return null; try { const o = JSON.parse(decodeURIComponent(escape(atob(t.slice(7).trim())))); return o && o.url && o.key ? o : null; } catch (e) { return null; } }
async function copyText(t) {
  try { await navigator.clipboard.writeText(t); return true; } catch (e) {}
  try { const ta = document.createElement('textarea'); ta.value = t; ta.style.cssText = 'position:absolute;opacity:0'; document.body.appendChild(ta); ta.select(); const ok = document.execCommand('copy'); ta.remove(); return ok; } catch (e) { return false; }
}

/* --- 화면 진단 줄 (설정 맨 아래). 실제 기기 문제를 스크린샷 한 장으로 알 수 있게 --- */
function diagLine() {
  const d = document.documentElement, cs = getComputedStyle(d), a = $('#app'), n = $('nav');
  const px = v => Math.round(parseFloat(v) || 0);
  const pr = document.createElement('i'); pr.style.cssText = 'position:absolute;visibility:hidden;padding-top:var(--sat-top);padding-bottom:var(--sat-bot)'; d.appendChild(pr);
  const ps = getComputedStyle(pr), sat = px(ps.paddingTop), sab = px(ps.paddingBottom); pr.remove();
  return '화면 ' + screen.width + '×' + screen.height + ' · 창 ' + innerWidth + '×' + innerHeight + ' · 앱 ' + (a ? Math.round(a.getBoundingClientRect().height) : 0) + ' · 하단 바 ' + (n ? Math.round(n.getBoundingClientRect().height) : 0)
    + ' · 안전영역 ' + sat + '/' + sab + ' · 맞춤 ' + (d.getAttribute('data-fit') || '-') + ' · 홈 화면 앱 ' + ((navigator.standalone || matchMedia('(display-mode: standalone)').matches) ? '예' : '아니오') + ' · v' + APP_V;
}

/* --- 예비 코치: 키가 없거나 연결이 안 될 때 --- */
const TIP_RULES = [
  [/독서|책|읽기|독후감/, ['책을 먼저 펴야 다음이 시작돼요. 10쪽만 읽어 봐요.', '오늘은 딱 한 챕터만, 지금 펴 볼까요?']],
  [/운동|헬스|러닝|달리|걷기|골프|스트레칭|요가|수영/, ['시작은 의지가 아니라 신발 끈이에요. 지금 준비해요.', '10분만 해도 안 한 날보다 훨씬 나아요.']],
  [/보고|보고서|문서|작성|기안|ppt|PPT|자료/, ['빈 문서가 제일 무거워요. 제목 한 줄부터 써 봐요.', '목차 세 줄만 먼저 적으면 절반은 끝나요.']],
  [/공부|시험|기출|암기|강의|문제|기사/, ['딱 한 문제만 풀어 봐요. 시작하면 이어져요.', '25분 타이머 하나 켜고 바로 들어가요.']],
  [/점검|확인|검토|체크|순회/, ['확인은 미룰수록 커져요. 지금 5분만 봐요.', '체크리스트 첫 칸부터 바로 가 봐요.']],
  [/연락|전화|메일|문자|답장|카톡/, ['한 줄이면 충분해요. 지금 보내면 마음이 가벼워져요.']],
  [/청소|빨래|설거지|정리|분리수거/, ['딱 한 구역만 정해서 지금 시작해요.']],
  [/구매|주문|장보기|사기|예약/, ['미루면 잊어요. 지금 장바구니에 담아 둬요.']],
  [/계약|발주|업체|견적/, ['담당자에게 첫 연락부터 넣어 두면 일이 굴러가요.']]
];
function ruleTip(x) {
  const t = (x.title || '') + ' ' + plainNote(x.notes || ''), n = parseInt(hsh(t), 36);
  const today = ymd(sod(new Date()));
  if (x.due && x.due < today) return ['미뤄진 만큼 가볍게, 오늘 첫 단추만 끼워요.', '오래 묵힐수록 무거워져요. 5분만 손대 봐요.', '오늘 끝내면 내일이 가벼워져요. 지금 시작해요.'][n % 3];
  for (const r of TIP_RULES) if (r[0].test(t)) return r[1][n % r[1].length];
  return plainNote(x.notes || '').trim() ? '메모까지 적어 두셨으니 반은 했어요. 첫 단계만 시작해요.' : '작게 쪼개서 첫 걸음만 떼어 봐요.';
}
const tipKey = x => hsh((x.title || '') + '\n' + plainNote(x.notes || ''));
function tipFor(x) {
  if (S.aiTip === false || x.done) return '';
  const c = aiStore().tips[tipKey(x)];
  if (c && c.src === 'ai') return { t: c.t, ai: true };
  if (aiOn()) aiQueue(x);
  return { t: ruleTip(x), ai: false };
}
function aiQueue(x) { const k = tipKey(x); if (AI.q.some(q => q.k === k)) return; AI.q.push({ k, x }); aiPump(); }
async function aiPump() {
  if (AI.busy || !AI.q.length || !aiOn()) return;
  if (Date.now() < AI.pauseTill) { setTimeout(aiPump, AI.pauseTill - Date.now() + 500); return; }
  AI.busy = true;
  const { k, x } = AI.q.shift();
  try {
    const memo = plainNote(x.notes || '').trim().slice(0, 400);
    let t = await gemini('[할 일 한 줄 메시지]\n제목: ' + x.title + '\n메모: ' + (memo || '(없음)') + '\n마감: ' + (x.due || '없음') + '\n\n규칙대로 한 문장만 답하세요.', 200);
    t = t.split('\n').map(s => s.trim()).filter(Boolean)[0] || '';
    t = t.replace(/^["'“”‘’\-•\s]+|["'“”‘’\s]+$/g, '').slice(0, 60);
    if (t) { aiStore().tips[k] = { t, src: 'ai' }; aiSave(); document.querySelectorAll('.trow[data-tid="' + CSS.escape(x.id) + '"] .tai').forEach(el => { el.textContent = t; el.classList.remove('rule'); el.classList.add('fresh'); }); }
  } catch (e) { if (/키/.test(e.message)) AI.q = []; }
  AI.busy = false;
  setTimeout(aiPump, 4500); // 무료 등급 분당 요청 한도 안쪽으로
}

/* --- 주간·월간 분석 --- */
function periodOf(kind, off) {
  const c = st.cur;
  if (kind === 'week') { const a = addD(sod(c), -c.getDay() + off * 7); return { s: a, e: addD(a, 7), label: (a.getMonth() + 1) + '월 ' + a.getDate() + '일 주간', days: 7 }; }
  const a = new Date(c.getFullYear(), c.getMonth() + off, 1), b = new Date(a.getFullYear(), a.getMonth() + 1, 1);
  return { s: a, e: b, label: a.getFullYear() + '년 ' + (a.getMonth() + 1) + '월', days: Math.round((b - a) / 864e5) };
}
function statsOf(p) {
  const evs = fromCache(p.s, p.e), by = {};
  let n = 0;
  evs.forEach(x => {
    n++;
    const c = st.calMap[x.calId] || {}, k = x.calId;
    by[k] = by[k] || { name: calLabel(c.name || '기타'), color: c.color || '#8E6B3A', h: 0, n: 0, allDay: 0 };
    by[k].n++;
    if (x.allDay) { by[k].allDay++; return; }
    const s = Math.max(x.s, p.s), e = Math.min(x.e, p.e);
    if (e > s) by[k].h += (e - s) / 36e5;
  });
  const tasks = (T.tasks || []).filter(t => t.due && t.due >= ymd(p.s) && t.due < ymd(p.e));
  return { n, by, tasks: tasks.length, done: tasks.filter(t => t.done).length };
}
const calLabel = s => { const t = String(s), u = t.replace(/^\s*\[[^\]]*\]+\s*/, ''); return ((u && /^\s*\[[^\[]/.test(t) ? u : t).replace(/[\[\]<>]/g, '').trim()) || t; };
const r1 = v => Math.round(v * 10) / 10;
function ruleAnalysis(p, cur, prev) {
  const rows = Object.values(cur.by).filter(r => r.h > 0).sort((a, b) => b.h - a.h);
  if (!rows.length) return '이 기간에는 시간이 기록된 일정이 없어요. 일정을 시간과 함께 넣어 두면 흐름이 보이기 시작해요.';
  const out = ['가장 많은 시간을 쓴 건 ' + rows[0].name + '(' + r1(rows[0].h) + '시간)이에요.'];
  const pk = {}; Object.keys(prev.by).forEach(k => pk[k] = prev.by[k].h);
  let big = null; Object.keys(cur.by).forEach(k => { const d = cur.by[k].h - (pk[k] || 0); if (!big || Math.abs(d) > Math.abs(big.d)) big = { name: cur.by[k].name, d }; });
  const sleep = Object.values(cur.by).find(r => /수면|잠|sleep/i.test(r.name));
  if (sleep && sleep.h > 0) { const avg = sleep.h / p.days; out.push(avg < 6 ? '하루 평균 수면이 ' + r1(avg) + '시간으로 부족해요.' : '하루 평균 ' + r1(avg) + '시간 주무셨어요. 잘 지키고 있어요.'); }
  else if (big && Math.abs(big.d) >= 1) out.push('지난 기간보다 ' + big.name + ' 시간이 ' + r1(Math.abs(big.d)) + '시간 ' + (big.d > 0 ? '늘었어요.' : '줄었어요.'));
  if (cur.tasks) out.push('기한이 있던 할 일 ' + cur.tasks + '개 중 ' + cur.done + '개를 끝냈어요.' + (cur.done < cur.tasks ? ' 남은 일은 하나씩 날짜를 다시 잡아 봐요.' : ' 훌륭해요!'));
  return out.join(' ');
}
async function openAnalysis(kind0) {
  let kind = kind0 || (st.view === 'week' ? 'week' : 'month'), off = 0, sh, txt = '', src = '', busy = false, cur, prev, p;
  const calc = async () => {
    p = periodOf(kind, off); const pp = periodOf(kind, off - 1);
    try { await ensure(pp.s, p.e); } catch (e) {}
    try { if (!T.lists) await loadTasks(); } catch (e) {}
    cur = statsOf(p); prev = statsOf(pp);
    const key = kind + ymd(p.s) + hsh(JSON.stringify([cur, prev]));
    const c = aiStore().an[key]; txt = c ? c.t : ruleAnalysis(p, cur, prev); src = c ? 'ai' : 'rule';
    return key;
  };
  const body = () => {
    const rows = Object.keys(cur.by).map(k => Object.assign({ k }, cur.by[k])).sort((a, b) => b.h - a.h || b.n - a.n);
    const max = Math.max(1, ...rows.map(r => r.h)), tot = rows.reduce((a, r) => a + r.h, 0);
    let h = '<div class="row" style="gap:8px">' + [['week', '주간'], ['month', '월간']].map(z => '<button class="nchip' + (kind === z[0] ? ' on' : '') + '" data-a="kind" data-v="' + z[0] + '" style="flex:1;justify-content:center">' + z[1] + '</button>').join('') + '</div>'
      + '<div class="row" style="justify-content:space-between;align-items:center"><button class="navarrow" data-a="prev" aria-label="이전 기간">' + ICON.chevL + '</button><b class="serif goldtext" style="font-size:calc(15px*var(--fz,1))">' + esc(p.label) + '</b><button class="navarrow" data-a="next" aria-label="다음 기간"' + (off >= 0 ? ' disabled style="opacity:.3"' : '') + '>' + ICON.chev + '</button></div>'
      + '<div class="anstat"><div><b>' + cur.n + '</b><span>일정</span></div><div><b>' + r1(tot) + '</b><span>기록된 시간</span></div><div><b>' + (cur.tasks ? cur.done + '/' + cur.tasks : '–') + '</b><span>할 일 완료</span></div></div>'
      + '<section class="aibox' + (src === 'ai' ? '' : ' rule') + '"><div class="aih"><span>' + ICON.spark + (src === 'ai' ? 'AI 코치' : '코치 메모') + '</span>' + (aiOn() ? '<button class="nchip" data-a="ai"' + (busy ? ' disabled' : '') + '>' + (busy ? '분석 중…' : src === 'ai' ? '다시 분석' : 'AI로 분석') + '</button>' : '') + '</div><p>' + esc(txt) + '</p>' + (aiOn() ? '' : '<p class="note" style="margin:0">설정에서 Gemini 키를 넣으면 AI가 직접 분석해 줘요.</p>') + '</section>'
      + '<div class="box">' + (rows.length ? rows.map(r => { const pv = (prev.by[r.k] || {}).h || 0, d = r.h - pv; return '<div class="anrow"><div class="anl"><i style="background:' + r.color + '"></i><span>' + esc(r.name) + '</span><b>' + (r.h ? r1(r.h) + '시간' : r.allDay + '일 종일') + '</b>' + (r.h || pv ? '<em class="' + (d > 0 ? 'up' : d < 0 ? 'dn' : '') + '">' + (Math.abs(d) < 0.05 ? '–' : (d > 0 ? '▲' : '▼') + r1(Math.abs(d))) + '</em>' : '<em></em>') + '</div><div class="anbar"><i style="width:' + Math.max(2, r.h / max * 100) + '%;background:' + r.color + '"></i></div></div>'; }).join('') : '<div class="note" style="padding:14px;text-align:center">이 기간 일정이 없어요</div>') + '</div>'
      + '<p class="note">▲▼는 바로 전 ' + (kind === 'week' ? '주' : '달') + '와 비교한 시간입니다. 종일 일정은 시간에서 빠지고 일수로 셉니다. AI에는 카테고리별 시간 합계만 보내고 일정 제목은 보내지 않아요.</p>';
    return h;
  };
  let key = await calc();
  const redraw = () => { const b = sh.querySelector('.sbody'); if (b) b.innerHTML = body(); };
  const runAI = async () => {
    if (busy || !aiOn()) return; busy = true; redraw();
    const data = { 기간: p.label, 일수: p.days, 일정수: cur.n, 할일: { 기한있음: cur.tasks, 완료: cur.done },
      카테고리: Object.values(cur.by).map(r => ({ 이름: r.name, 시간: r1(r.h), 종일일정: r.allDay })),
      지난기간: Object.values(prev.by).map(r => ({ 이름: r.name, 시간: r1(r.h) })) };
    try { const t = (await gemini('[' + (kind === 'week' ? '주간' : '월간') + ' 분석]\n다음 데이터만 보고 규칙대로 3문장으로 답하세요.\n' + JSON.stringify(data), 600)).replace(/\n+/g, ' ').trim(); aiStore().an[key] = { t }; aiSave(); txt = t; src = 'ai'; }
    catch (e) { toast(e.message); }
    busy = false; redraw();
  };
  sh = openSheet('<div class="shead"><span style="width:52px"></span><h2 class="serif goldtext" style="font-size:calc(17px*var(--fz,1))">분석</h2><button class="tbtn" data-a="close">닫기</button></div><div class="sbody">' + body() + '</div>', async (a, t) => {
    if (a === 'close') { closeSheet(); return; }
    if (a === 'kind' && t.dataset.v !== kind) { kind = t.dataset.v; off = 0; key = await calc(); redraw(); }
    if (a === 'prev') { off--; key = await calc(); redraw(); }
    if (a === 'next' && off < 0) { off++; key = await calc(); redraw(); }
    if (a === 'ai') runAI();
  });
  if (aiOn() && src !== 'ai') runAI();
}

function openSettings() {
  const body = () => sec('구글 캘린더 연결', '<label style="display:flex;flex-direction:column;gap:6px"><span class="lab">앱스 스크립트 웹앱 주소</span><input class="inp" id="sUrl" placeholder="https://script.google.com/macros/s/…/exec" value="' + esc(S.url || (viaGas() && window.__BACKEND_URL) || '') + '" autocomplete="off" autocapitalize="off"></label>'
    + '<label style="display:flex;flex-direction:column;gap:6px"><span class="lab">비밀 키</span><input class="inp" id="sKey" type="password" placeholder="setup 실행 로그에 나온 키" value="' + esc(S.key) + '" autocomplete="off" autocapitalize="off"></label>'
    + '<div class="row"><button class="gbtn" data-a="test" style="flex:1;height:46px">저장하고 연결 확인</button>' + (S.url ? '<button class="obtn" data-a="unlink" style="height:46px">연결 해제</button>' : '') + '</div>'
    + '<p class="note">주소와 키는 이 기기에만 저장됩니다. 비워 두면 예시 데이터로 보여 줍니다. <b>다른 기기(PC)에서는 연결 코드를 주소 칸에 붙여 넣으면 한 번에 연결됩니다.</b></p>'
    + (demo() ? '' : '<p class="note">github 주소가 막힌 곳(회사 PC 등)에서는 <b>위 앱스 스크립트 주소를 그대로 크롬에서 열면</b> 앱이 열립니다(데이터 창구 v4 이상).' + (S.sv && S.sv < 4 ? ' <span style="color:var(--sun)">지금 데이터 창구는 v' + S.sv + ' → 업데이트가 필요해요.</span>' : '') + '</p>')
    + (demo() ? '' : '<button class="obtn" data-a="copycode" style="align-self:flex-start">다른 기기용 연결 코드 복사</button><p class="note" style="margin-top:-6px">코드에는 비밀 키가 들어 있어요. 나에게 보내기 같은 본인만 보는 곳으로만 옮기고, 쓴 뒤에는 지워 주세요.</p>')
    + (installEvt ? '<button class="gbtn" data-a="install" style="height:46px">이 기기에 앱 설치</button>' : '') + (demo() ? '' : '<button class="obtn" data-a="refresh" style="align-self:flex-start">캘린더 목록·색 새로 불러오기</button>'))
    + sec('월간 화면에서 숨길 캘린더', '<p class="note">숨겨도 주간과 하루 시간표에는 그대로 보입니다.</p><div class="box">' + st.cals.map(c => '<div class="boxrow"><i style="width:10px;height:10px;border-radius:5px;background:' + c.color + '"></i><span style="flex:1;font-size:calc(14px*var(--fz,1))">' + esc(c.name) + '</span><button class="switch' + (S.hiddenMonth.includes(c.id) ? '' : ' on') + '" role="switch" aria-checked="' + !S.hiddenMonth.includes(c.id) + '" aria-label="' + esc(c.name) + ' 월간 표시" data-a="hm" data-id="' + esc(c.id) + '"><i></i></button></div>').join('') + '</div>')
    + sec('표시', '<div class="box"><div class="boxrow" style="justify-content:space-between"><span style="font-size:calc(14px*var(--fz,1))">대괄호 태그 숨기기<br><span class="lab">[Golf]골프하자 → 골프하자</span></span><button class="switch' + (S.hideTags ? ' on' : '') + '" role="switch" aria-checked="' + S.hideTags + '" aria-label="대괄호 태그 숨기기" data-a="tags"><i></i></button></div><div class="boxrow" style="justify-content:space-between"><span style="font-size:calc(14px*var(--fz,1))">캘린더에 계획 막대 보기<br><span class="lab">간트의 장기 계획을 월간·주간에도 표시</span></span><button class="switch' + (S.showPlans ? ' on' : '') + '" role="switch" aria-checked="' + S.showPlans + '" aria-label="캘린더에 계획 막대 보기" data-a="plans"><i></i></button></div></div>')
    + sec('AI 코치', '<div class="box"><div class="boxrow" style="justify-content:space-between"><span style="font-size:calc(14px*var(--fz,1))">할 일 한 줄 응원<br><span class="lab">연두색 = AI가 쓴 문장 · 옅은 갈색 = 앱 기본 문장(키 없음·연결 실패)</span></span><button class="switch' + (S.aiTip !== false ? ' on' : '') + '" role="switch" aria-checked="' + (S.aiTip !== false) + '" aria-label="할 일 한 줄 응원" data-a="aitip"><i></i></button></div></div>'
      + '<label style="display:flex;flex-direction:column;gap:6px"><span class="lab">Gemini API 키 (무료)</span><input class="inp" id="sAi" type="password" placeholder="복사한 키를 붙여 넣기" value="' + esc(S.aiKey || '') + '" autocomplete="off" autocapitalize="off" spellcheck="false"></label>'
      + '<div class="row"><button class="gbtn" data-a="aitest" style="flex:1;height:46px">' + (S.aiKey ? '키 저장하고 다시 확인' : '키 저장하고 확인') + '</button>' + (S.aiKey ? '<button class="obtn" data-a="aioff" style="height:46px">키 지우기</button>' : '') + '</div>'
      + '<p class="note">' + (S.aiKey ? 'AI 연결됨' + (S.aiModel ? ' · ' + esc(S.aiModel) : '') + '. ' : '키가 없으면 앱에 들어 있는 예비 코치가 대신 답해요. ') + '키는 이 기기에만 저장됩니다. 무료 등급은 보낸 내용이 구글 서비스 개선에 쓰일 수 있어서, 할 일은 제목·메모만, 분석은 카테고리별 시간 합계만 보냅니다. 키 받는 곳: aistudio.google.com/apikey</p>')
    + sec('글자 크기', '<div class="row" style="gap:8px">' + [[0.92, '작게'], [1, '보통'], [1.1, '크게']].map(z => '<button class="nchip' + ((S.fz || 1) === z[0] ? ' on' : '') + '" data-a="fz" data-v="' + z[0] + '" style="flex:1;justify-content:center">' + z[1] + '</button>').join('') + '</div><p class="note">앱 전체 글자에 적용됩니다. 메모장 글씨는 메모 화면에서 따로 조절합니다.</p>')
    + '<p class="note">' + diagLine() + '</p>'
    + '<div class="box"><div class="boxrow" style="justify-content:space-between"><span style="font-size:calc(14px*var(--fz,1))">화면 아래 끝까지 채우기<br><span class="lab">아래가 잘려 보이면 끄세요</span></span><button class="switch' + (!S.noGap ? ' on' : '') + '" role="switch" aria-checked="' + !S.noGap + '" aria-label="화면 아래 끝까지 채우기" data-a="gapfix"><i></i></button></div></div>'
    + '<p class="note">화면 버전 ' + APP_V + ' · 데이터 창구 v' + (S.sv || '?') + ' · 테마 다크 레더 · PC는 창 크기에 맞춰 넓게 보입니다(창 모드·전체 화면). 테마 바꾸기는 다음 단계에서 열립니다.</p>';
  let sh;
  const redraw = () => { const b = sh.querySelector('.sbody'), y = b.scrollTop; b.innerHTML = body(); b.scrollTop = y; };
  const reset = () => { M.months = {}; M.ts = {}; T.lists = null; T.tasks = []; T.ts = 0; G.phases = null; G.ts = 0; loadLocal(); const tc = store.get('tasks'); if (tc) { T.lists = tc.lists; T.tasks = tc.tasks; } G.phases = store.get('gantt'); };
  sh = openSheet('<div class="shead"><span style="width:52px"></span><h2 class="serif goldtext" style="font-size:calc(17px*var(--fz,1))">설정</h2><button class="tbtn" data-a="close">닫기</button></div><div class="sbody">' + body() + '</div>', async (a, t) => {
    if (a === 'close') { closeSheet(); return; }
    if (a === 'hm') { const id = t.dataset.id; S.hiddenMonth = S.hiddenMonth.includes(id) ? S.hiddenMonth.filter(x => x !== id) : S.hiddenMonth.concat([id]); save(); redraw(); render(); }
    if (a === 'aitip') { S.aiTip = S.aiTip === false; save(); redraw(); render(); }
    if (a === 'aioff') { S.aiKey = ''; S.aiModel = ''; save(); redraw(); render(); toast('키를 지웠어요. 예비 코치로 돌아갑니다'); }
    if (a === 'aitest') {
      const k = sh.querySelector('#sAi').value.replace(/\s+/g, '').replace(/^["'“”]+|["'“”]+$/g, '');
      if (k.length < 20) { toast('키가 너무 짧아요. 복사 버튼으로 다시 복사해 주세요'); return; }
      const old = S.aiKey; S.aiKey = k; t.disabled = true; t.textContent = '확인 중';
      try { const r = await gemini('연결 확인입니다. "좋아요" 한 단어만 답하세요.', 50); save(); AI.pauseTill = 0; aiStore().tips = Object.fromEntries(Object.entries(aiStore().tips).filter(e => e[1].src === 'ai')); aiSave(); toast('AI 연결 완료: ' + r.slice(0, 20)); redraw(); render(); }
      catch (err) { S.aiKey = old; toast('연결 실패: ' + err.message); t.disabled = false; t.textContent = '키 저장하고 확인'; }
    }
    if (a === 'gapfix') { S.noGap = !S.noGap; save(); location.reload(); return; }
    if (a === 'fz') { S.fz = +t.dataset.v; save(); document.documentElement.style.setProperty('--fzu', S.fz); redraw(); render(); }
    if (a === 'tags') { S.hideTags = !S.hideTags; save(); redraw(); render(); }
    if (a === 'plans') { S.showPlans = !S.showPlans; save(); redraw(); render(); }
    if (a === 'refresh') { try { const r = await api('calendars', { fresh: '1' }); setCals(r.calendars); M.months = {}; M.ts = {}; toast('새로 불러왔습니다'); redraw(); render(); } catch (err) { toast(err.message); } }
    if (a === 'copycode') { copyText(codeMake()).then(ok => toast(ok ? '연결 코드를 복사했어요. PC 앱 설정의 주소 칸에 붙여 넣으세요' : '복사하지 못했어요')); return; }
    if (a === 'install') { if (installEvt) { installEvt.prompt(); installEvt.userChoice.finally(() => { installEvt = null; redraw(); }); } return; }
    if (a === 'unlink') { S.url = ''; S.key = ''; save(); reset(); await boot(); redraw(); toast('예시 데이터로 돌아왔습니다'); }
    if (a === 'test') {
      let url = sh.querySelector('#sUrl').value.trim(), key = sh.querySelector('#sKey').value.trim();
      const code = codeRead(url); if (code) { url = code.url; key = code.key; if (code.ai && !S.aiKey) S.aiKey = code.ai; }
      if (!url || !key) { toast('주소와 키를 모두 넣어 주세요'); return; }
      const old = { url: S.url, key: S.key }; S.url = url; S.key = key;
      t.disabled = true; t.textContent = '확인 중';
      try { const r = await api('ping'); if ((r.v || 1) < 3) toast('데이터 창구가 옛 버전입니다. 앱스 스크립트를 업데이트해 주세요'); save(); reset(); await boot(); toast('연결되었습니다'); redraw(); }
      catch (err) { S.url = old.url; S.key = old.key; toast('연결 실패: ' + err.message); t.disabled = false; t.textContent = '저장하고 연결 확인'; }
    }
  });
}

/* ========== 이벤트 연결 ========== */
$('#main').addEventListener('click', e => {
  const q = s => e.target.closest(s);
  let t;
  if ((t = q('[data-ev]'))) { const ev = findEv(t.dataset.ev); if (ev) openDetail(ev); return; }
  if ((t = q('[data-day]'))) { openDay(pymd(t.dataset.day)); return; }
  if ((t = q('[data-slot]'))) { const g = $('#wkgrid'), r = g.getBoundingClientRect(), px = Number(g.dataset.px); openCreate({ date: pymd(t.dataset.slot), min: Math.max(0, Math.min(1410, Math.floor(((e.clientY - r.top - 8) / px * 60) / 30) * 30)) }); return; }
  if ((t = q('[data-when]'))) { T.when = t.dataset.when; const d = $('#tDraft'); T.draft = d ? d.value : ''; drawTasks(); $('#tDraft').focus(); return; }
  if ((t = q('[data-trep]'))) { T.rep = t.dataset.trep; const d = $('#tDraft'); T.draft = d ? d.value : ''; drawTasks(); $('#tDraft').focus(); return; }
  if (q('[data-tadd]')) { taskAdd(); return; }
  if ((t = q('.trow[data-tid] .tmain'))) { const x = T.tasks.find(y => y.id === t.closest('.trow').dataset.tid); if (x && !String(x.id).startsWith('tmp')) { if (S.sv && S.sv < 3) { toast('데이터 창구 업데이트 후 쓸 수 있어요'); return; } openTask(x); } return; }
  if ((t = q('[data-tt]'))) { taskMove([t.dataset.tt]); return; }
  if (q('[data-rollall]')) { const today = ymd(sod(new Date())); taskMove(T.tasks.filter(x => x.listId === S.listId && !x.done && x.due && x.due < today).map(x => x.id)); return; }
  if (q('[data-donetog]')) { T.showDone = !T.showDone; drawTasks(); return; }
  if ((t = q('[data-gf]'))) { G.filter = t.dataset.gf; drawGantt(); return; }
  if (q('[data-gnew]')) { openPlan(); return; }
  if ((t = q('[data-gedit]'))) { if (S.sv && S.sv < 3) { toast('데이터 창구 업데이트 후 쓸 수 있어요'); return; } const p = projects().find(x => x.id === t.dataset.gedit); if (p) openPlan(p); return; }
  if ((t = q('[data-gdel]'))) {
    if (!t.dataset.armed) { t.dataset.armed = '1'; t.textContent = '한 번 더 누르면 삭제'; t.style.borderColor = '#E8957A'; t.style.color = '#E8957A'; return; }
    const p = projects().find(x => x.id === t.dataset.gdel); if (!p) return; t.disabled = true;
    batch(p.phases.map(ph => ({ method: 'delete', url: GAPI + '/calendars/' + encodeURIComponent(ph.calId) + '/events/' + encodeURIComponent(ph.id) })))
      .then(() => { G.phases = (G.phases || []).filter(x => !(x.gantt && x.gantt.proj === p.id)); store.set('gantt', G.phases); G.sel = ''; Object.keys(M.ts).forEach(k => M.ts[k] = 0); toast('계획을 삭제했습니다'); drawGantt(); })
      .catch(err => { toast('삭제 실패: ' + err.message); loadGantt(true).then(drawGantt); });
    return;
  }
  if ((t = q('[data-gsel]'))) { G.sel = G.sel === t.dataset.gsel ? '' : t.dataset.gsel; drawGantt(); return; }
});
$('#main').addEventListener('change', e => {
  const t = e.target;
  if (t.dataset.tk) taskToggle(t.dataset.tk, t);
  if (t.dataset.gph) ganttToggle(t.dataset.gph, t);
  if (t.id === 'tPick') { const d = $('#tDraft'); T.draft = d ? d.value : ''; if (t.value) { T.when = 'pick'; T.pick = t.value; } drawTasks(); }
});
$('#main').addEventListener('input', e => { if (e.target.id === 'tDraft') T.draft = e.target.value; });
$('#main').addEventListener('keydown', e => { if (e.target.id === 'tDraft' && e.key === 'Enter' && !e.isComposing) { e.preventDefault(); taskAdd(); } });
$('#hAlt').addEventListener('click', e => { const z = e.target.closest('[data-zoom]'); if (z) { G.zoom = Number(z.dataset.zoom); renderGantt(); } });
$('#hAlt').addEventListener('change', e => { if (e.target.id === 'listSel') { S.listId = e.target.value; save(); drawTasks(); } });
$('#bannerSlot').addEventListener('click', e => { const g = e.target.closest('[data-go]'); if (!g) return; if (g.dataset.go === 'upd') openUpd(); else openSettings(); });
function openUpd() {
  openSheet('<div class="shead"><span style="width:52px"></span><h2 class="serif goldtext" style="font-size:calc(17px*var(--fz,1))">마지막 수동 업데이트</h2><button class="tbtn" data-a="close">닫기</button></div><div class="sbody">'
    + '<p class="note">이번 한 번만 PC에서 해 주시면, 그다음부터는 화면 업데이트가 자동으로 적용됩니다.</p>'
    + '<div class="box" style="padding:14px;gap:10px"><p class="note" style="color:var(--ink)">1. script.google.com에서 이 앱의 프로젝트를 엽니다.<br>2. Code.gs와 appsscript.json을 GitHub의 apps-script 폴더 내용으로 바꿉니다.<br>&nbsp;&nbsp;&nbsp;github.com/Kangkong00/my-calendar/tree/main/apps-script<br>3. setup 실행 → 새 권한 허용<br>4. 배포 → 배포 관리 → 연필 → 버전: 새 버전 → 배포</p></div>'
    + '<p class="note">주소와 비밀 키는 그대로입니다.</p></div>', a => { if (a === 'close') closeSheet(); });
}
function move(n) { const c = st.cur; st.cur = st.view === 'month' ? new Date(c.getFullYear(), c.getMonth() + n, 1) : addD(c, n * 7); render(n > 0 ? 'l' : 'r'); }
$('#anBtn').onclick = () => openAnalysis(); $('#prevBtn').onclick = () => move(-1); $('#nextBtn').onclick = () => move(1);
// PC 키보드: Esc = 대화상자 닫기, ←/→ = 이전·다음 달(주). 글자 입력 중에는 동작 안 함
document.addEventListener('keydown', e => {
  const a = document.activeElement, typing = a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA' || a.tagName === 'SELECT' || a.isContentEditable);
  if (e.key === 'Escape' && sheetStack.length) { e.preventDefault(); closeSheet(); return; }
  if (typing || sheetStack.length || st.tab !== 'cal' || e.altKey || e.ctrlKey || e.metaKey) return;
  if (e.key === 'ArrowLeft') { e.preventDefault(); move(-1); } else if (e.key === 'ArrowRight') { e.preventDefault(); move(1); }
});
// 창 크기가 바뀌면(PC 창 크기 조절·전체 화면·가로세로 회전) 달력 칸 높이를 다시 계산. 아이폰 키보드(높이만 바뀜)는 무시
let lastW = innerWidth, rsT = 0;
addEventListener('resize', () => { clearTimeout(rsT); rsT = setTimeout(() => { const wide = innerWidth >= 700; if ((innerWidth !== lastW || wide) && st.tab === 'cal') { if (st.view === 'month') drawMonth(); else drawWeek(); } lastW = innerWidth; }, 150); });
// PC·안드로이드 설치(크롬·엣지): 설치 가능하면 설정에 '이 기기에 앱 설치' 버튼
let installEvt = null;
addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEvt = e; });
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
$('#titleBtn').onclick = () => { if (st.tab !== 'cal') return; st.cur = sod(new Date()); render(); };
$('#vMonth').onclick = () => { if (st.view === 'month') return; transit('down', () => { st.view = 'month'; S.view = 'month'; save(); render(); }); };
$('#vWeek').onclick = () => { if (st.view === 'week') return; transit('up', () => { const t = new Date(); st.cur = (t.getMonth() === st.cur.getMonth() && t.getFullYear() === st.cur.getFullYear()) ? sod(t) : new Date(st.cur.getFullYear(), st.cur.getMonth(), 1); st.view = 'week'; S.view = 'week'; save(); render(); }); };
let transiting = 0;
function transit(kind, fn) {
  const main = $('#main'), app = $('#app');
  if (Date.now() - transiting < 450) { fn(); return; } transiting = Date.now();
  if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) { fn(); return; }
  app.querySelectorAll('.pg').forEach(x => x.remove()); main.classList.remove('pgin-back', 'pgin-up'); main.style.background = '';
  const old = main.cloneNode(true); old.removeAttribute('id'); old.querySelectorAll('[id]').forEach(x => x.removeAttribute('id'));
  Object.assign(old.style, { position: 'absolute', left: '0', right: '0', top: main.offsetTop + 'px', height: main.offsetHeight + 'px', pointerEvents: 'none', background: 'var(--pagebg)', overflow: 'hidden' });
  const sy = (main.querySelector('.scroller') || {}).scrollTop || 0;
  fn();
  const os = old.querySelector('.scroller'); if (os) os.scrollTop = sy;
  if (kind === 'fwd' || kind === 'down') {
    old.className = 'pg ' + kind; old.style.zIndex = 4; app.appendChild(old);
    old.addEventListener('animationend', () => old.remove(), { once: true });
  } else {
    old.className = 'pg under'; old.style.zIndex = 1; app.insertBefore(old, main);
    main.style.zIndex = 2; main.style.background = 'var(--pagebg)'; main.classList.add(kind === 'back' ? 'pgin-back' : 'pgin-up');
    main.addEventListener('animationend', () => { main.classList.remove('pgin-back', 'pgin-up'); main.style.background = ''; main.style.zIndex = ''; old.remove(); }, { once: true });
  }
  setTimeout(() => old.remove(), 1000);
}
const TABS = ['cal', 'task', 'gantt'];
const setTab = t => { if (t === st.tab) return; const kind = TABS.indexOf(t) > TABS.indexOf(st.tab) ? 'fwd' : 'back'; transit(kind, () => { st.tab = t; S.tab = t; save(); render(); }); };
$('#nCal').onclick = () => setTab('cal'); $('#nTask').onclick = () => setTab('task'); $('#nGantt').onclick = () => setTab('gantt');
$('#nAdd').onclick = () => { if (st.tab === 'task') { const d = $('#tDraft'); if (d) { d.focus(); d.scrollIntoView({ block: 'center' }); } } else if (st.tab === 'gantt') openPlan(); else openCreate(); };
$('#nSet').onclick = () => openSettings();
let tx = null, ty = null;
$('#main').addEventListener('touchstart', e => { if (st.tab !== 'cal') return; if (e.touches.length === 1) { tx = e.touches[0].clientX; ty = e.touches[0].clientY; } }, { passive: true });
$('#main').addEventListener('touchend', e => { if (tx == null) return; const dx = e.changedTouches[0].clientX - tx, dy = e.changedTouches[0].clientY - ty; tx = null; if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) move(dx < 0 ? 1 : -1); }, { passive: true });
let rt; window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => render(), 200); });
let hiddenAt = 0;
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { hiddenAt = Date.now(); return; }
  if (sheetStack.length) return;
  checkUpdate(); Object.keys(M.ts).forEach(k => M.ts[k] = 0); T.ts = 0; G.ts = 0;
  // iOS 홈 화면 앱은 다시 열 때 새로 시작하지 않고 이어지는 경우가 많음 → 10분 넘게 쉬었으면 '새로 연 것'으로 보고 월간·이번 달로
  if (hiddenAt && Date.now() - hiddenAt > 600000) { st.tab = 'cal'; st.view = 'month'; st.cur = sod(new Date()); }
  render();
});

/* 새 화면 버전이 올라오면 저절로 새로 고침 */
// 구글 주소(앱스 스크립트)로 연 경우: 화면은 열 때마다 최신을 받아 오므로 업데이트 확인 안 함(iframe 안이라 새로고침도 불안정)
const viaGas = () => window.__APP_HOST === 'gas';
async function checkUpdate() {
  if (viaGas()) return;
  try {
    const r = await fetch('version.json?t=' + Date.now(), { cache: 'no-store' });
    if (!r.ok) return; const j = await r.json();
    if (j.v && j.v !== APP_V && !sheetStack.length) location.replace(location.pathname + '?v=' + encodeURIComponent(j.v));
  } catch (e) {}
}
function openCover() {
  const c = document.getElementById('cover'); if (!c || c.dataset.go) return;
  c.dataset.go = '1';
  const wait = Math.max(0, 1000 - performance.now());
  setTimeout(() => requestAnimationFrame(() => {
    c.classList.add('open');
    setTimeout(() => c.remove(), 1150);
  }), wait);
}
async function boot() {
  checkUpdate();
  loadLocal();
  try { render(); } finally { openCover(); }
  if (!demo()) api('ping').then(r => { const v = r.v || 1; if (v !== S.sv) { S.sv = v; save(); setHeader(); } }).catch(() => {});
  try { const r = await api('calendars'); const changed = JSON.stringify(r.calendars) !== JSON.stringify(st.cals); setCals(r.calendars); if (changed) render(); }
  catch (err) { toast('연결 실패: ' + err.message + ' · 설정을 확인해 주세요'); }
}
boot();
setTimeout(openCover, 4000);
</script>
</body>
</html>
