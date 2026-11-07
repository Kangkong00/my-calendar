#!/usr/bin/env bash
# 원본(src/) → 배포본(index.html) 합치기 + 버전 일치 검사
set -e
cd "$(dirname "$0")"
cat src/head.html src/script.js > index.html
V=$(grep -o "const APP_V = '[^']*'" src/script.js | cut -d"'" -f2)
J=$(grep -o '"v":"[^"]*"' version.json | cut -d'"' -f4)
if [ "$V" != "$J" ]; then echo "⚠ 버전 불일치: APP_V=$V, version.json=$J"; exit 1; fi
node -e "const s=require('fs').readFileSync('index.html','utf8');const i=s.lastIndexOf('<script>');new Function(s.slice(i+8,s.lastIndexOf('</script>')));" && echo "✓ index.html 생성 (v$V), 문법 OK"
