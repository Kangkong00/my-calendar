/**
 * 나만의 캘린더 — 데이터 창구 (v3)
 * v3부터는 '중계(batch)' 기능이 있어서, 앞으로 기능이 늘어도 이 코드는 다시 바꿀 필요가 없습니다.
 * (화면 쪽 GitHub 파일만 바뀝니다)
 * 화면은 GitHub Pages, 이 스크립트는 구글 캘린더·Tasks와 데이터만 주고받습니다.
 *
 * 업데이트·처음 설치 모두: 코드와 appsscript.json을 바꾼 뒤 setup 을 한 번 실행(권한 허용)하고,
 * 배포 → 배포 관리 → 연필 → 버전: 새 버전 → 배포.
 */

var TZ = 'Asia/Seoul';
var API = 'https://www.googleapis.com/calendar/v3';
var TAPI = 'https://tasks.googleapis.com/tasks/v1';
var EVENT_COLORS = {
  '1': '#7986CB', '2': '#33B679', '3': '#8E24AA', '4': '#E67C73', '5': '#F6BF26', '6': '#F4511E',
  '7': '#039BE5', '8': '#616161', '9': '#3F51B5', '10': '#0B8043', '11': '#D50000'
};

function setup() {
  var props = PropertiesService.getScriptProperties();
  var key = props.getProperty('API_KEY');
  if (!key) { key = Utilities.getUuid().replace(/-/g, ''); props.setProperty('API_KEY', key); }
  Calendar.CalendarList.list({ maxResults: 1 });
  Tasks.Tasklists.list({ maxResults: 1 });
  UrlFetchApp.fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList?maxResults=1', { headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() } });
  CacheService.getScriptCache().remove('cals');
  Logger.log('비밀 키: ' + key);
  Logger.log('권한 확인 완료 (캘린더·Tasks·병렬 조회)');
}

function resetKey() { PropertiesService.getScriptProperties().deleteProperty('API_KEY'); setup(); }

function doGet(e) {
  var p = e.parameter || {};
  if (!p.action) return appPage_(); // 요청 없이 주소만 열면 앱 화면 (github.io가 막힌 회사 PC용, v4)
  return handle_(p);
}

/* 앱 화면 중계 (v4): GitHub Pages의 최신 index.html을 구글 서버가 대신 받아서 보여 준다.
   - 화면은 매번 최신(앱 업데이트 때 이 스크립트를 다시 배포할 필요 없음)
   - 비밀 키는 넣지 않음(주소만 알아서는 데이터 접근 불가). 처음 한 번 앱 설정에 연결 코드를 붙여 넣으면 됨
   - 이미지 등은 <base>로 원래 주소를 가리킴 → github가 막힌 곳에선 표지 그림만 빠지고 기능은 그대로 */
var APP_BASE_ = 'https://kangkong00.github.io/my-calendar/';
function appPage_() {
  var html = null;
  try {
    var r = UrlFetchApp.fetch(APP_BASE_ + 'index.html?t=' + Date.now(), { muteHttpExceptions: true, followRedirects: true });
    if (r.getResponseCode() === 200) html = r.getContentText('UTF-8');
  } catch (err) {}
  if (!html) return HtmlService.createHtmlOutput('<p style="font-family:sans-serif;padding:24px">앱 화면을 불러오지 못했어요. 잠시 뒤 다시 열어 주세요.</p>').setTitle('나만의 캘린더');
  var inject = '<base href="' + APP_BASE_ + '"><script>window.__APP_HOST="gas";window.__BACKEND_URL=' + JSON.stringify(ScriptApp.getService().getUrl()) + ';</script>';
  html = html.replace(/<head>/i, '<head>' + inject);
  return HtmlService.createHtmlOutput(html).setTitle('나만의 캘린더').addMetaTag('viewport', 'width=device-width, initial-scale=1');
}
function doPost(e) {
  var body = {};
  try { body = JSON.parse(e.postData.contents || '{}'); } catch (err) { return out_({ ok: false, error: '요청 형식 오류' }); }
  return handle_(body);
}

function handle_(p) {
  try {
    var key = PropertiesService.getScriptProperties().getProperty('API_KEY');
    if (!key || p.key !== key) return out_({ ok: false, error: '비밀 키가 맞지 않습니다' });
    switch (p.action) {
      case 'ping': return out_({ ok: true, v: 4 });
      case 'batch': return out_({ ok: true, results: batch_(p.requests) });
      case 'calendars': return out_({ ok: true, calendars: calendars_(p.fresh === '1' || p.fresh === true) });
      case 'events': return out_({ ok: true, events: events_(p.start, p.end) });
      case 'create': return out_({ ok: true, event: create_(p.event) });
      case 'duplicate': return out_({ ok: true, events: duplicate_(p.items, p.dates, Number(p.shift || 0)) });
      case 'delete': return out_({ ok: true, done: delete_(p.calId, p.id) });
      case 'createCalendar': return out_({ ok: true, calendar: createCalendar_(p.name, p.color) });
      case 'tasks': return out_(Object.assign({ ok: true }, tasks_()));
      case 'taskAdd': return out_({ ok: true, task: taskAdd_(p.listId, p.title, p.due) });
      case 'taskUpdate': return out_({ ok: true, task: taskUpdate_(p.listId, p.id, p.patch || {}) });
      case 'gantt': return out_({ ok: true, phases: gantt_() });
      case 'ganttCreate': return out_({ ok: true, phases: ganttCreate_(p.plan) });
      case 'ganttDone': return out_({ ok: true, done: ganttDone_(p.calId, p.id, p.props, p.done) });
      default: return out_({ ok: false, error: '알 수 없는 요청: ' + p.action });
    }
  } catch (err) {
    return out_({ ok: false, error: String(err && err.message || err) });
  }
}

function out_(obj) { return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON); }
function auth_() { return { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() }; }
function iso_(d) { return Utilities.formatDate(d, TZ, "yyyy-MM-dd'T'HH:mm:ssXXX"); }

/* ---------- 캘린더 목록 (1시간 캐시) ---------- */
function calendars_(fresh) {
  var cache = CacheService.getScriptCache();
  if (!fresh) { var v = cache.get('cals'); if (v) return JSON.parse(v); }
  var items = [], pt;
  do { var r = Calendar.CalendarList.list({ maxResults: 250, pageToken: pt }); items = items.concat(r.items || []); pt = r.nextPageToken; } while (pt);
  var out = items.filter(function (x) { return !x.hidden; }).map(function (x) {
    return { id: x.id, name: x.summaryOverride || x.summary, color: x.backgroundColor, owned: x.accessRole === 'owner' || x.accessRole === 'writer', primary: !!x.primary, selected: x.selected !== false };
  });
  cache.put('cals', JSON.stringify(out), 3600);
  return out;
}

/* ---------- 일정 조회: 모든 캘린더를 동시에 ---------- */
function mapEvent_(it, cal) {
  if (it.status === 'cancelled') return null;
  var allDay = !!(it.start && it.start.date);
  var pv = (it.extendedProperties && it.extendedProperties['private']) || {};
  return {
    id: it.id, calId: cal.id, title: it.summary || '(제목 없음)', allDay: allDay,
    start: allDay ? it.start.date : it.start.dateTime, end: allDay ? it.end.date : it.end.dateTime,
    color: it.colorId && EVENT_COLORS[it.colorId] ? EVENT_COLORS[it.colorId] : cal.color,
    location: it.location || '', desc: it.description || '', recurring: !!it.recurringEventId,
    gantt: pv.gantt === '1' ? pv : null
  };
}

function listMany_(cals, query) {
  var h = auth_(), fields = 'items(id,summary,start,end,colorId,location,description,recurringEventId,status,extendedProperties)';
  var reqs = cals.map(function (c) {
    return { url: API + '/calendars/' + encodeURIComponent(c.id) + '/events?singleEvents=true&maxResults=2500&fields=' + encodeURIComponent(fields) + query, headers: h, muteHttpExceptions: true };
  });
  var res = UrlFetchApp.fetchAll(reqs), list = [];
  res.forEach(function (r, i) {
    if (r.getResponseCode() !== 200) return;
    (JSON.parse(r.getContentText()).items || []).forEach(function (it) { var m = mapEvent_(it, cals[i]); if (m) list.push(m); });
  });
  return list;
}

function events_(start, end) {
  var q = '&timeMin=' + encodeURIComponent(new Date(start).toISOString()) + '&timeMax=' + encodeURIComponent(new Date(end).toISOString());
  return listMany_(calendars_(), q);
}

function calOf_(id) {
  var c = calendars_().filter(function (x) { return x.id === id; })[0];
  if (!c) { c = calendars_(true).filter(function (x) { return x.id === id; })[0]; }
  if (!c) throw new Error('캘린더를 찾을 수 없습니다');
  return c;
}

/* ---------- 일정 만들기 ---------- */
function resource_(ev) {
  var r = { summary: ev.title, location: ev.location || '', description: ev.desc || '' };
  if (ev.allDay) { r.start = { date: ev.start }; r.end = { date: ev.end }; }
  else { r.start = { dateTime: ev.start, timeZone: TZ }; r.end = { dateTime: ev.end, timeZone: TZ }; }
  r.reminders = { useDefault: false, overrides: (ev.alarms || []).map(function (m) { return { method: 'popup', minutes: Number(m) }; }) };
  if (ev.repeat && ev.repeat.freq) {
    var BY = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
    var rule = 'RRULE:FREQ=' + ev.repeat.freq.toUpperCase();
    if (ev.repeat.freq === 'weekly' && ev.repeat.days && ev.repeat.days.length) rule += ';BYDAY=' + ev.repeat.days.map(function (d) { return BY[d]; }).join(',');
    r.recurrence = [rule];
  }
  if (ev.gantt) r.extendedProperties = { 'private': ev.gantt };
  return r;
}

function create_(ev) {
  var cal = calOf_(ev.calId);
  var made = Calendar.Events.insert(resource_(ev), cal.id);
  return mapEvent_(made, cal);
}

/** 원본 일정들을 여러 날짜로 한 번에 복제 (동시 처리) */
function duplicate_(items, dates, shift) {
  var h = auth_(), reqs = [], cals = [];
  (items || []).forEach(function (it) {
    var cal = calOf_(it.calId);
    (dates || []).forEach(function (d) {
      var copy = { title: it.title, allDay: it.allDay, location: it.location, desc: it.desc, alarms: [] };
      if (it.allDay) {
        var len = Math.max(1, Math.round((ymdDate_(it.end) - ymdDate_(it.start)) / 86400000));
        copy.start = d; copy.end = Utilities.formatDate(new Date(ymdDate_(d).getTime() + len * 86400000 + 3600000), TZ, 'yyyy-MM-dd');
      } else {
        var os = new Date(it.start), oe = new Date(it.end);
        var hm = Utilities.formatDate(os, TZ, 'HH:mm');
        var st = new Date(new Date(d + 'T' + hm + ':00+09:00').getTime() + shift * 60000);
        copy.start = iso_(st); copy.end = iso_(new Date(st.getTime() + (oe - os)));
      }
      reqs.push({ url: API + '/calendars/' + encodeURIComponent(cal.id) + '/events', method: 'post', contentType: 'application/json', payload: JSON.stringify(resource_(copy)), headers: h, muteHttpExceptions: true });
      cals.push(cal);
    });
  });
  var out = [];
  UrlFetchApp.fetchAll(reqs).forEach(function (r, i) { if (r.getResponseCode() === 200) { var m = mapEvent_(JSON.parse(r.getContentText()), cals[i]); if (m) out.push(m); } });
  return out;
}

function ymdDate_(s) { var p = s.slice(0, 10).split('-'); return new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]), 12); }

/** 이 일정만 지우기 (반복 일정이면 그날 것만) */
function delete_(calId, id) { Calendar.Events.remove(calId, id); return true; }

function createCalendar_(name, color) {
  if (!name) throw new Error('이름이 비어 있습니다');
  var cal = Calendar.Calendars.insert({ summary: name, timeZone: TZ });
  var entry = Calendar.CalendarList.patch({ backgroundColor: color || '#8E6B3A', foregroundColor: '#000000' }, cal.id, { colorRgbFormat: true });
  CacheService.getScriptCache().remove('cals');
  return { id: cal.id, name: name, color: entry.backgroundColor, owned: true, primary: false, selected: true };
}

/* ---------- 할 일 (구글 Tasks) ---------- */
function mapTask_(t, listId) {
  return { id: t.id, listId: listId, title: t.title || '', notes: t.notes || '', due: t.due ? t.due.slice(0, 10) : '', done: t.status === 'completed', completed: t.completed || '', parent: t.parent || '' };
}

function tasks_() {
  var lists = (Tasks.Tasklists.list({ maxResults: 100 }).items || []).map(function (l) { return { id: l.id, title: l.title }; });
  var h = auth_(), since = new Date(Date.now() - 30 * 86400000).toISOString();
  var reqs = lists.map(function (l) { return { url: TAPI + '/lists/' + encodeURIComponent(l.id) + '/tasks?showCompleted=true&showHidden=true&maxResults=100&completedMin=' + encodeURIComponent(since), headers: h, muteHttpExceptions: true }; });
  var reqs2 = lists.map(function (l) { return { url: TAPI + '/lists/' + encodeURIComponent(l.id) + '/tasks?showCompleted=false&maxResults=100', headers: h, muteHttpExceptions: true }; });
  var seen = {}, tasks = [];
  UrlFetchApp.fetchAll(reqs.concat(reqs2)).forEach(function (r, i) {
    if (r.getResponseCode() !== 200) return;
    var l = lists[i % lists.length];
    (JSON.parse(r.getContentText()).items || []).forEach(function (t) { if (seen[t.id]) return; seen[t.id] = 1; tasks.push(mapTask_(t, l.id)); });
  });
  return { lists: lists, tasks: tasks };
}

function taskAdd_(listId, title, due) {
  var r = { title: title };
  if (due) r.due = due + 'T00:00:00.000Z';
  return mapTask_(Tasks.Tasks.insert(r, listId), listId);
}

function taskUpdate_(listId, id, patch) {
  var r = {};
  if (patch.title != null) r.title = patch.title;
  if (patch.due !== undefined) r.due = patch.due ? patch.due + 'T00:00:00.000Z' : null;
  if (patch.done !== undefined) { r.status = patch.done ? 'completed' : 'needsAction'; if (!patch.done) r.completed = null; }
  return mapTask_(Tasks.Tasks.patch(r, listId, id), listId);
}

/* ---------- 간트 (장기 계획) ---------- */
/* 단계마다 고른 캘린더에 여러 날 종일 일정으로 저장, 숨김 정보(gantt=1, 프로젝트·분류·순서·완료) 붙임 */
function gantt_() {
  var now = Date.now();
  var q = '&privateExtendedProperty=' + encodeURIComponent('gantt=1') + '&timeMin=' + encodeURIComponent(new Date(now - 730 * 86400000).toISOString()) + '&timeMax=' + encodeURIComponent(new Date(now + 1095 * 86400000).toISOString());
  return listMany_(calendars_().filter(function (c) { return c.owned; }), q);
}

/** plan: {name, group, calId, phases:[{name,start,end}]}  end 는 마지막 날(포함) */
function ganttCreate_(plan) {
  var cal = calOf_(plan.calId), pid = Utilities.getUuid().slice(0, 8), h = auth_();
  var reqs = (plan.phases || []).map(function (ph, i) {
    var endEx = Utilities.formatDate(new Date(ymdDate_(ph.end).getTime() + 86400000), TZ, 'yyyy-MM-dd');
    var ev = { title: plan.name + ' · ' + ph.name, allDay: true, start: ph.start, end: endEx, alarms: [],
      gantt: { gantt: '1', proj: pid, pname: plan.name, group: plan.group || '업무', idx: String(i), phase: ph.name, done: '0' } };
    return { url: API + '/calendars/' + encodeURIComponent(cal.id) + '/events', method: 'post', contentType: 'application/json', payload: JSON.stringify(resource_(ev)), headers: h, muteHttpExceptions: true };
  });
  var out = [];
  UrlFetchApp.fetchAll(reqs).forEach(function (r) { if (r.getResponseCode() === 200) { var m = mapEvent_(JSON.parse(r.getContentText()), cal); if (m) out.push(m); } });
  return out;
}

function ganttDone_(calId, id, props, done) {
  var pv = Object.assign({}, props || {}, { gantt: '1', done: done ? '1' : '0' });
  Calendar.Events.patch({ extendedProperties: { 'private': pv } }, calId, id);
  return !!done;
}

/* ---------- 중계: 구글 캘린더·Tasks API만 허용 ---------- */
var ALLOW_ = ['https://www.googleapis.com/calendar/v3/', 'https://tasks.googleapis.com/tasks/v1/'];
/** requests: [{method:'get'|'post'|'patch'|'put'|'delete', url:'https://www.googleapis.com/calendar/v3/...', body:{...}}] 최대 50개, 동시에 처리 */
function batch_(requests) {
  requests = (requests || []).slice(0, 50);
  var h = auth_();
  var reqs = requests.map(function (r) {
    var url = String(r.url || '');
    if (!ALLOW_.some(function (p) { return url.indexOf(p) === 0; })) throw new Error('허용되지 않은 주소입니다');
    var m = String(r.method || 'get').toLowerCase();
    var q = { url: url, method: m, headers: h, muteHttpExceptions: true };
    if (r.body != null && m !== 'get' && m !== 'delete') { q.contentType = 'application/json'; q.payload = JSON.stringify(r.body); }
    return q;
  });
  return UrlFetchApp.fetchAll(reqs).map(function (res) {
    var t = res.getContentText(), b = null;
    try { b = t ? JSON.parse(t) : null; } catch (e) { b = t; }
    return { code: res.getResponseCode(), body: b };
  });
}
