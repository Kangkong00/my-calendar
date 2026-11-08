/* 나만의 캘린더 — 서비스 워커 (PC·안드로이드 '앱 설치'용, v3.21)
   캐시하지 않음: 화면은 항상 인터넷에서 새로 받음(version.json 자동 업데이트와 충돌 없게).
   인터넷이 끊겼을 때만 안내 화면을 보여 줌. */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', e => {
  if (e.request.mode !== 'navigate') return;
  e.respondWith(fetch(e.request).catch(() => new Response(
    '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>캘린더</title>'
    + '<body style="margin:0;height:100vh;display:flex;align-items:center;justify-content:center;background:#070504;color:#E3C48E;font-family:sans-serif;text-align:center">'
    + '<div><p style="font-size:18px">인터넷에 연결되어 있지 않아요</p><p style="color:#A89275;font-size:14px">연결되면 다시 열어 주세요</p></div></body>',
    { headers: { 'Content-Type': 'text/html; charset=utf-8' } })));
});
