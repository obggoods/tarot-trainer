# Tarot Trainer

AI 기반 타로 정통해석 리딩 연습 웹앱 MVP입니다.

## Local Development

```bash
npm install
npm run dev
```

기본 개발 서버:

- Client: `http://127.0.0.1:5175`
- API server: `http://127.0.0.1:3002`

같은 Wi-Fi의 모바일 기기에서 테스트하려면 Vite client를 외부 접속 가능하게 별도로 실행합니다.

```bash
npx vite --host 0.0.0.0 --port 5176 --strictPort
```

그다음 모바일 브라우저에서 `http://<PC_LAN_IP>:5176`으로 접속합니다.

## Environment Variables

`.env.example`을 `.env.local`로 복사한 뒤 필요한 값을 채웁니다.

```bash
DEEPSEEK_API_KEY=
DEEPSEEK_MODEL=deepseek-chat
VITE_USE_MOCK=false
```

환경변수 설명:

- `DEEPSEEK_API_KEY`: 서버에서 DeepSeek Chat Completions API를 호출할 때 사용합니다. Vercel Production/Preview 환경변수에 설정합니다.
- `DEEPSEEK_MODEL`: 선택값입니다. 비워두면 기본값 `deepseek-chat`을 사용합니다.
- `VITE_USE_MOCK`: `true`이면 브라우저에서 mock evaluator를 사용합니다. 실제 AI 채점을 쓰려면 Vercel에 `false`로 설정합니다.

주의: DeepSeek API 키는 클라이언트용 `VITE_` 환경변수로 배포하지 마세요. 실제 AI 호출은 `/api/evaluate` 서버 함수에서 처리합니다.

## Build

```bash
npm run build
npm run lint
```

## Vercel Deployment

Vercel에서 Git repository를 Import한 뒤 아래 설정을 사용합니다.

- Framework Preset: `Vite`
- Build Command: `npm run build`
- Output Directory: `dist`
- Install Command: `npm install`

필수 환경변수:

```bash
DEEPSEEK_API_KEY=<your-deepseek-api-key>
VITE_USE_MOCK=false
```

선택 환경변수:

```bash
DEEPSEEK_MODEL=deepseek-chat
```

`vercel.json`에는 `/api/*`를 제외한 모든 경로를 `index.html`로 보내는 SPA fallback rewrite가 포함되어 있습니다.

## API

- `POST /api/evaluate`: 답변 채점
- `GET /api/problems/random`: 랜덤 문제 조회

## Supabase

현재 MVP의 오답노트는 `localStorage`를 사용합니다.

향후 Supabase 저장을 활성화할 때는 `supabase/schema.sql`을 Supabase SQL editor에서 실행해 `reading_attempts` 테이블을 생성합니다.
