# linku-discord-relay

LinkU 대시보드(정적 사이트)에서 Discord 웹훅 URL을 노출하지 않고
Discord 채널에 알림을 보내기 위한 Cloudflare Worker 중계 서버.

## 왜 필요한가

대시보드는 서버 없는 정적 사이트라 Discord 웹훅 URL을 클라이언트에 직접
넣으면 브라우저에서 그대로 노출된다. 이 Worker가 웹훅 URL을 비밀(secret)로
보관하고, 대시보드는 이 Worker에만 요청을 보낸다.

## 배포 방법 (최초 1회)

1. [Cloudflare 계정 가입](https://dash.cloudflare.com/sign-up) — 무료, 카드 등록 불필요
2. 이 폴더에서:
   ```bash
   cd cloudflare/discord-relay
   npm install
   npx wrangler login   # 브라우저가 열리고 Cloudflare 로그인 후 승인
   ```
3. Discord 채널에서 웹훅 URL 발급 — 채널 설정 → 연동 → 웹후크 → 새 웹후크 → URL 복사
4. 비밀 값 등록:
   ```bash
   npx wrangler secret put DISCORD_WEBHOOK_URL
   # 붙여넣기: 방금 복사한 디스코드 웹훅 URL

   npx wrangler secret put CLIENT_KEY
   # 아무 랜덤 문자열이나 직접 정해서 입력 (예: openssl rand -hex 16 결과)
   ```
5. 배포:
   ```bash
   npm run deploy
   ```
   완료되면 `https://linku-discord-relay.<계정서브도메인>.workers.dev` 같은 URL이 출력된다.

6. 대시보드 레포의 GitHub Actions Secrets에 추가:
   - `NEXT_PUBLIC_DISCORD_RELAY_URL` = 위에서 나온 Worker URL
   - `NEXT_PUBLIC_DISCORD_CLIENT_KEY` = 4번에서 정한 CLIENT_KEY와 동일한 값

   (이 두 값은 어차피 클라이언트 JS에 노출되지만, 실제 비밀인 디스코드 웹훅 URL은
   Worker 안에만 있어서 안전하다. CLIENT_KEY는 아무나 이 Worker를 호출해
   채널에 스팸을 보내는 걸 막는 최소한의 안전장치일 뿐이다.)

7. `.github/workflows/deploy.yml`의 build 스텝 `env`에 두 값을 추가해야 실제
   빌드에 반영된다 (Claude가 이미 워크플로 파일에 추가해둠 — 값만 Secrets에 채우면 됨).

## 로컬 테스트

```bash
npm run dev
curl -X POST http://localhost:8787 \
  -H "content-type: application/json" \
  -H "x-linku-key: <CLIENT_KEY>" \
  -d '{"event":"prd_comment","title":"테스트","description":"연결 확인"}'
```
