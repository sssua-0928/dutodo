# Todo 로컬 웹앱 개발기

> Claude Code로 todomate 대체 앱을 만든 과정 — 기획부터 QA까지

---

## 왜 만들게 되었나

취준, 데놀 회의, e4i2 사이드프로젝트, 비행기 예약, 당근 판매까지 — 해야 할 일이 한꺼번에 쏟아지는 시기였다. 기존에 todomate 앱으로 할일을 관리하고 있었는데, 문제가 있었다:

1. **Claude와 할일이 분리되어 있었다** — Claude에서 면접 준비를 하면서도, 할일 체크는 todomate에서 따로 해야 했다
2. **카테고리가 flat했다** — "취준" 카테고리 하나에 펜타시큐리티, PTK코리아 할일이 섞여서 매번 기업명을 적어야 했다
3. **데이터 접근이 안 됐다** — todomate 데이터를 Claude에서 읽거나 수정할 수 없었다

그래서 Claude Code 안에서 직접 쓸 수 있는 로컬 웹앱을 만들기로 했다.

---

## Step 1: 기획 — todomate 분석과 요구사항 정리

todomate 스크린샷을 Claude에게 보여주며 "이런 걸 로컬 웹사이트로 만들어줘"라고 요청했다.

**todomate에서 가져올 기능:**
- 카테고리별 할일 그룹 (취준 💰, To-do ✨, 데이터야놀자 📈)
- 할일 체크 (둥근 원형 토글)
- 소요시간 배지 (15m, 1h)
- 예정 시간 표시 (PM 6:00)
- 월간 캘린더 뷰

**기술 결정:**
- 단일 HTML 파일 (외부 의존성 없음)
- Vanilla JS + CSS
- localStorage 저장 (처음에는)
- 브라우저에서 `open todo-app.html`로 실행

---

## Step 2: v1 구현 — 단일 HTML 파일

Claude Code의 designer 에이전트에게 전체 구현을 위임했다. 약 5분 만에 동작하는 웹앱이 나왔다.

**결과물:**
- 좌측 월간 캘린더 + 우측 카테고리별 할일
- 할일 추가/체크/수정/삭제 모두 동작
- todomate의 현재 할일들이 초기 데이터로 세팅됨

**첫 번째 문제: `file://` 프로토콜 제한**
- HTML 파일을 직접 열면 (`file:///...`) localStorage가 보안 정책으로 제한됨
- `python3 -m http.server 8080`으로 로컬 서버를 띄워 해결

---

## Step 3: 서브카테고리 추가

"취준 카테고리에 기업별 서브카테고리를 나눌 수 있을까?" 라는 요청.

**이유:** 펜타시큐리티와 PTK코리아를 동시에 준비할 때, 매번 "펜타시큐리티 면접 준비"처럼 기업명을 쓰는 게 번거로움. 서브카테고리로 나누면 "면접 준비"만 적어도 어디 기업인지 바로 알 수 있다.

**구현 내용:**
- Category 데이터 모델에 `parentId` 필드 추가 (null = 최상위, 값 = 하위)
- 서브카테고리 UI: 부모 카드 안에 들여쓰기된 소 헤더로 표시
- 서브카테고리 추가/이름변경/삭제 기능
- 서브카테고리 없는 카테고리는 기존처럼 flat 동작 (하위 호환)

**초기 데이터 변경:**
```
Before: 취준 > 펜타시큐리티 면접 준비
After:  취준 > 펜타시큐리티 > 면접 준비
```

---

## Step 4: JSON 파일 저장 (localStorage → 파일)

"DB에도 저장할 수 있어?" 라는 질문에 3가지 옵션을 제시:
1. JSON 파일 저장 (Node.js 서버)
2. SQLite
3. Notion DB 동기화

**1번(JSON 파일) 선택 이유:**
- 별도 DB 설치 불필요
- Claude에서 `todo-data.json` 파일을 직접 읽고 수정 가능
- 브라우저 캐시 삭제해도 데이터 안 날아감

**구현:**
- `todo-server.js` — Node.js HTTP 서버 (API + HTML 서빙)
- `GET /api/data` — JSON 파일 읽기
- `POST /api/data` — JSON 파일 쓰기
- 프론트엔드: API 우선, 실패 시 localStorage fallback
- 양쪽 모두에 dual write (백업)

---

## Step 5: 버그 사냥 — POST가 안 나가는 미스터리

JSON 파일 저장을 구현한 후, 브라우저에서 `todo-data.json`이 생성되지 않는 문제가 발생했다. 서버 로그에 `GET /api/data`만 찍히고 `POST /api/data`는 한 번도 호출되지 않았다.

### 디버깅 과정

**1차 시도: `location.origin` 확인**
- `file://` 프로토콜에서 `location.origin`이 `null`이 될 수 있어서, API URL을 `http://localhost:8080`으로 하드코딩
- 결과: 여전히 POST 안 나감

**2차 시도: async/await 문제 의심**
- `loadData()`는 `async`인데 `saveData()`는 일반 함수
- `await saveData()` 호출이 실제로는 동기적으로 실행되어 fetch가 취소될 수 있다고 판단
- `saveDataAsync()` 함수를 별도 추가하고 첫 로드 시에만 사용
- 결과: 여전히 POST 안 나감

**3차 시도: 서버 쿼리스트링 처리 누락 발견**
- 캐시 우회를 위해 `?t=timestamp`를 붙여 열었는데, 서버가 `req.url === '/'`로만 매칭해서 404 반환
- `req.url.split('?')[0]`으로 수정
- 결과: HTML은 서빙되지만 여전히 POST 안 나감
- (이때 유저는 "Not Found 뜨는데"라고 알려줌 — 이게 실마리였음)

**4차 시도: 서버 요청 로깅 추가**
- `console.log(\`${req.method} ${req.url}\`)` 추가해서 실제 요청 흐름 추적
- `GET /`만 찍히고 `GET /api/data`도 없었음 → JS가 아예 실행 안 되고 있었음
- 브라우저 캐시가 옛날 HTML(file:// 시절)을 로드하고 있었던 것

**5차 시도: QA 에이전트 투입 — 근본 원인 발견**
- 체계적 QA를 돌려보니 `saveData` 함수가 **2번 선언**되어 있었음
- 1번째 (line 1022): API + localStorage 저장 (올바른 버전)
- 2번째 (line 1062): localStorage만 저장 (잘못된 버전)
- JavaScript에서 같은 이름의 function 선언은 마지막이 이김 → API 저장 코드가 덮어씌워짐

**근본 원인:** 서브카테고리 기능을 추가할 때 코드 블록을 이동하면서, 기존 `saveData`가 남아있었고 새로운 `saveData`(API 버전)가 추가됨. 결과적으로 2개가 공존하게 되었고, JavaScript hoisting으로 인해 뒤쪽 선언(localStorage만)이 우선함.

**해결:** 중복된 `saveData` 선언 삭제. 1줄 수정으로 해결.

### 교훈
- function 중복 선언은 에러를 던지지 않아 발견하기 어렵다
- 서버 로깅은 디버깅의 기본인데, 처음부터 넣었어야 했다
- 체계적 QA(자동화된 검증)가 수동 디버깅보다 빠르게 근본 원인을 찾았다

---

## Step 6: QA

qa-tester 에이전트가 15개 테스트 케이스를 작성하고 실행:

| 영역 | 테스트 수 | 결과 |
|------|----------|------|
| 서버 API | 6 | 전체 PASS |
| 브라우저 시뮬레이션 | 1 | PASS |
| HTML/JS 문법 | 2 | PASS |
| 데이터 모델 | 3 | PASS |
| JS 함수 연결 | 3 | 2 PASS, **1 FAIL** |

FAIL 1건이 `saveData` 중복 선언이었고, 이것이 전체 문제의 근본 원인이었다.

---

## 최종 결과물

```
todo-app/
├── todo-app.html      # 프론트엔드 (단일 HTML, 인라인 CSS+JS)
├── todo-server.js     # Node.js API 서버
├── todo-data.json     # 데이터 (자동 생성)
├── API.md             # API 명세서
└── build-log.md       # 이 문서
```

**실행 방법:**
```bash
cd ~/Desktop/Claude_Home/todo-app
node todo-server.js
# → http://localhost:8080 에서 접속
```

**주요 기능:**
- 카테고리별 할일 관리 (서브카테고리 지원)
- 월간 캘린더 뷰 + 날짜별 할일 전환
- 할일 체크/추가/수정/삭제
- 소요시간 + 예정시간 표시
- JSON 파일 저장 (Claude에서 직접 접근 가능)
- localStorage 백업 (오프라인 fallback)

---

## 소요 시간 & 에이전트 활용

| 단계 | 에이전트 | 설명 |
|------|---------|------|
| 기획 | Plan | 기능 정의, 기술 선택 |
| v1 구현 | Designer | 전체 HTML/CSS/JS 생성 |
| 서브카테고리 | 직접 수정 | 데이터 모델 + 렌더링 로직 |
| JSON 저장 | 직접 수정 | Node.js 서버 + API 연동 |
| QA | QA Tester | 15개 TC 자동 실행 |

전체 과정은 하나의 Claude Code 대화 안에서 이루어졌다.
