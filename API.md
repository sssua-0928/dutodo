# Todo App API 명세서

## 개요
- Base URL: `http://localhost:8080`
- 데이터 저장: `todo-data.json` (서버 로컬 파일)
- 인증: 없음 (로컬 전용)

---

## Endpoints

### 1. GET /api/data

할일 데이터 전체 조회

**Request**
```
GET /api/data
```

**Response**

| 상황 | Status | Body |
|------|--------|------|
| 데이터 파일 없음 (첫 실행) | 200 | `null` |
| 데이터 존재 | 200 | `{ categories: [...], todos: [...] }` |

**Response Body (데이터 존재 시)**
```json
{
  "categories": [
    {
      "id": "cat-1",
      "name": "취준",
      "icon": "💰",
      "color": "#FFB800",
      "order": 0,
      "parentId": null
    },
    {
      "id": "cat-1-1",
      "name": "펜타시큐리티",
      "icon": null,
      "color": null,
      "order": 0,
      "parentId": "cat-1"
    }
  ],
  "todos": [
    {
      "id": "todo-1",
      "categoryId": "cat-1-1",
      "text": "면접 준비",
      "date": "2026-04-07",
      "done": false,
      "duration": "1h",
      "scheduledTime": "14:00",
      "order": 0
    }
  ]
}
```

---

### 2. POST /api/data

할일 데이터 전체 저장 (덮어쓰기)

**Request**
```
POST /api/data
Content-Type: application/json

{ "categories": [...], "todos": [...] }
```

**Response**
```json
{ "ok": true }
```

| Status | 설명 |
|--------|------|
| 200 | 저장 성공 |

---

### 3. GET /

Todo 웹앱 HTML 페이지 반환

**Request**
```
GET /
GET /todo-app.html
GET /?any=query  (쿼리스트링 무시)
```

**Response**
- Status: 200
- Content-Type: `text/html; charset=utf-8`
- Body: todo-app.html 파일 내용

---

## 데이터 모델

### Category

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| id | string | Y | 고유 ID (`cat-1`, `id-lxyz...`) |
| name | string | Y | 카테고리명 |
| icon | string\|null | Y | 이모지 아이콘 (서브카테고리는 null) |
| color | string\|null | Y | HEX 색상 (서브카테고리는 null, 부모 색상 상속) |
| order | number | Y | 정렬 순서 (0부터) |
| parentId | string\|null | Y | 부모 카테고리 ID (최상위는 null) |
| archived | boolean | N | 숨김 여부 (기본 false, 서브카테고리용) |

### Todo

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| id | string | Y | 고유 ID |
| categoryId | string | Y | 소속 카테고리 ID (서브카테고리 ID 가능) |
| text | string | Y | 할일 내용 |
| date | string | Y | 날짜 (`YYYY-MM-DD`) |
| done | boolean | Y | 완료 여부 |
| estimatedTime | string\|null | Y | 예상 소요시간 (`15m`, `30m`, `45m`, `1h`, `1h 30m`, `2h`, `2h 30m`, `3h`, …). 리사이즈로 생긴 비표준 값 허용 |
| actualTime | string\|null | Y | 실제 걸린 시간 (같은 포맷). 완료 시 입력 또는 타임테이블 리사이즈로 기록 |
| scheduledTime | string\|null | Y | 예정 시간 (`HH:MM`, 24시간) |
| order | number | Y | 카테고리 내 정렬 순서 |
| createdDate | string | Y | 최초 생성 날짜 (`YYYY-MM-DD`, 변경 안 됨) |

> **마이그레이션**: 기존 `duration` 필드는 `loadData()`에서 자동으로 `estimatedTime`으로 이관되며, 이관 후 `duration`은 삭제됨.

---

## 저장 방식

- **Primary**: `POST /api/data` → `todo-data.json` 파일 저장
- **Fallback**: API 불가 시 브라우저 localStorage (`todoApp` 키)
- **Dual write**: API 가능 시에도 localStorage에 백업 저장

---

## 서버 실행

```bash
cd ~/Desktop/Claude_Home/todo-app
node todo-server.js
# → http://localhost:8080
```

## 파일 구조

```
todo-app/
├── todo-app.html      # 프론트엔드 (단일 HTML, 인라인 CSS+JS)
├── todo-server.js     # Node.js 서버 (API + 정적 파일)
├── todo-data.json     # 데이터 저장 파일 (자동 생성)
└── API.md             # 이 문서
```
