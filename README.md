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

개발/PWA 실행 중 생성될 수 있는 `dev-dist/`는 service worker 관련 개발 산출물이며 Git 관리 대상이 아닙니다.

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

## PWA Service Worker Notes

Development mode does not register the PWA service worker. If localhost still shows the offline page after a PWA configuration change, clear the old browser state:

1. Open DevTools.
2. Go to Application -> Service Workers.
3. Click Unregister for the localhost service worker.
4. Go to Cache Storage and delete localhost-related caches.
5. Refresh the page.

The SPA navigation fallback must point to `/index.html`. Do not use `/offline.html` as the general navigation fallback, because it can replace the online app shell with the offline page.

## AI Quality Test

새 카드 의미, `question_contexts`, `training_hints`를 추가한 뒤에는 반드시 AI 품질 테스트를 실행합니다.

```bash
npm run test:ai-quality
```

이 테스트는 현재 v2 품질 검증 대상 카드의 Analysis → Feedback 흐름을 자동으로 만들고 다음 항목을 검사합니다.

- `selectedMeaning`이 `question_contexts.selected_meaning`과 맞는지
- `realWorldIssue`가 실제 장면으로 작성됐는지
- `concreteChecks`가 충분하고 추상어만 남지 않았는지
- Feedback에 금지 문장이나 과도한 반복이 없는지
- 정통 해설, 상담 예시, 모범 답안, 오답노트가 서로 다른 역할을 하는지
- 힌트 본문과 `answer_seed`가 학습에 충분한지

테스트가 끝나면 `reports/ai-quality-report.md`가 자동 생성됩니다. FAIL이 있는 카드는 원인을 수정한 뒤 다시 실행하고, PASS가 되어야 Merge합니다.

## Semantic Regression Test

프롬프트나 모델을 바꾼 뒤 핵심 의미가 다른 표현으로 유지되는지 확인하려면 semantic regression test를 실행합니다.

```bash
npm run test:ai-regression
```

이 테스트는 `requiredReasoning`과 `requiredChecks`를 검사할 때 단순 문자열 포함이 아니라 `src/data/testing/semanticAliases.json`의 alias까지 함께 봅니다. 예를 들어 `정보 비대칭`은 `정보 공유 부족`, `불투명한 정보`, `조건을 숨김` 같은 표현으로 나와도 같은 개념으로 PASS 처리됩니다.

테스트가 끝나면 `reports/ai-regression-report.md`가 자동 생성되며 다음 항목을 확인할 수 있습니다.

- Semantic Score
- Matched Concepts
- Matched Aliases
- Missing Concepts
- Missing Checks

금지 문장 검사와 섹션 유사도 검사는 기존과 동일하게 유지됩니다.

표준 카드 확장 절차:

1. 카드 의미 JSON 작성
2. `question_contexts` 작성
3. `training_hints` 작성
4. `npm run validate:meanings`
5. `npm run build`
6. `npm run test:ai-quality`
7. `npm run test:ai-regression`
8. PASS 확인 후 다음 카드 작업

## Tarot Concept Engine

Tarot Trainer v2는 장기적으로 AI가 의미를 기억하는 구조가 아니라, 엔진이 의미를 선택하고 AI가 설명하는 구조를 사용합니다.

```text
Card
↓
Concept
↓
Question Rule
↓
Resolver
↓
Analysis
↓
Feedback
```

MVP 데이터는 다음 파일에 있습니다.

- `src/data/tarot/concepts/tarotConcepts.json`: 공통 의미 사전
- `src/data/tarot/concepts/cardConceptMap.json`: 카드/정역별 Concept ID 매핑
- `src/data/tarot/concepts/questionConceptRules.json`: 질문축별 우선 Concept 규칙
- `src/lib/tarot/conceptResolver.ts`: 카드, 정역, 질문축을 받아 최종 개념과 확인 항목을 선택

Analysis Prompt에는 `question_contexts`, `training_hints`, aliases, definition, bad_readings 전체를 보내지 않습니다. Resolver가 선택한 `selectedConcepts`, `realWorldIssues`, `concreteChecks`만 전달해 토큰을 줄이고 의미 선택을 코드에서 통제합니다.

새 Concept, 카드 매핑, 질문 규칙을 추가한 뒤에는 반드시 검증합니다.

```bash
npm run validate:concepts
npm run validate:meanings
npm run test:ai-quality
npm run test:ai-regression
npm run build
```

`npm run validate:concepts`는 Concept ID 중복, Card Map 참조, Question Rule 참조, Resolver 동작을 검사하고 `reports/prompt-token-optimization.md`에 프롬프트 토큰 절감 리포트를 생성합니다.

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

## Graph-first Standard

새 카드 추가의 기본 작업 단위는 `question_contexts`/`training_hints`가 아니라 Concept Graph입니다.

1. `tarotConcepts.json`에 재사용 가능한 concept을 추가합니다.
2. `cardConceptMap.json`에 카드 정/역방향 concept ID를 연결합니다.
3. `questionConceptRules.json`과 `questionGraphRules.json`에서 질문축 우선순위를 보강합니다.
4. `npm run validate:graph`
5. `npm run validate:concepts`
6. `npm run test:graph-only`
7. `npm run test:ai-quality`
8. `npm run test:ai-regression`
9. `npm run build`

`question_contexts`와 `training_hints`는 삭제하지 않지만 legacy fallback 데이터입니다. Graph Resolver가 비어 있거나 `recommendedChecks`가 2개 미만인 예외 케이스에서만 보조 입력으로 사용합니다.
