# CloneGPT

ChatGPT의 인터페이스 및 기능을 벤치마킹하여 구현한 풀스택 AI 대화 웹 서비스입니다.

---

## 📌 프로젝트 개요
- **프로젝트명**: CloneGPT
- **개요**: ChatGPT와 최대한 유사한 화면과 사용 흐름을 제공하는 AI 웹 서비스
- **학습 목적**: 외부 AI API(DeepSeek API) 연동 학습, React + Node.js(Express) + PostgreSQL 풀스택 연동 및 실제 웹 서비스 아키텍처 이해

---

## 🛠️ 기술 스택
- **Frontend**: React 18, JavaScript (ES6+), HTML5, CSS3 (Custom Design System), Lucide Icons, Vite
- **Backend**: Node.js, Express, CORS, dotenv, Server-Sent Events (SSE)
- **Database**: PostgreSQL 16 (Docker Compose)
- **AI API**: DeepSeek API (`deepseek-chat` / `deepseek-reasoner`)
- **Syntax & Markdown**: `react-markdown`, `remark-gfm`, `highlight.js` (atom-one-dark)
- **Tools**: VS Code, Git / GitHub, Docker

---

## 🚀 프로젝트 구조
```
clone-GPT/
├── client/          # React 프론트엔드 (Vite)
│   ├── src/
│   │   ├── components/
│   │   │   ├── Sidebar.jsx       # 사이드바 (실시간 검색, 인라인 수정, 안전 삭제, 테마 제어)
│   │   │   ├── ChatArea.jsx      # 메시지 영역 (마크다운, TOC, 페이징, 스마트 스크롤 락)
│   │   │   ├── ChatToc.jsx       # 마크다운 헤딩 기반 인라인 목차
│   │   │   ├── ChatInput.jsx     # 입력창 (파일 첨부, 자동 높이 조절, 프롬프트 개선)
│   │   │   ├── WelcomeScreen.jsx # 메인 환영 화면 (추천 프롬프트 카드 4종)
│   │   │   └── PromptModal.jsx   # AI 프롬프트 마스터 개선 확인 모달
│   │   ├── App.jsx               # 전역 상태, 다중 세션 스트리밍 보존, 내보내기
│   │   └── index.css             # ChatGPT 다크/라이트 테마 및 애니메이션
│   └── package.json
├── server/          # Express 백엔드
│   ├── src/
│   │   ├── config/               # PostgreSQL Pool 연결 설정
│   │   ├── schema/               # DB 초기화 SQL (conversations, messages)
│   │   ├── services/             # DeepSeek API 연동 & 프롬프트 최적화 & 스마트 제목 분석
│   │   └── server.js             # REST API & SSE 실시간 스트리밍 엔드포인트
│   └── package.json
├── docker-compose.yml            # PostgreSQL 컨테이너 정의 (포트 5433:5432)
└── README.md
```

---

## 📅 주차별 개발 일정 및 달성 내역
- [x] **1주차**: 기획 및 요구사항 정리, 구현 기능 선정, 화면 분석
- [x] **2주차**: 개발 환경 구성, 데이터베이스 설계, 주요 화면 개발 (사이드바, 메인 환영 화면, 대화 화면)
- [x] **3주차**: 채팅 기능 구현, DeepSeek API 연동, SSE 실시간 스트리밍, 대화 맥락 보존, 스마트 페이징 & 인라인 목차, 스마트 스크롤 락
- [x] **4주차 (완료)**: 전체 기능 통합 테스트, UI 완성도 극대화, 프로젝트 마무리
  - 🔍 **사이드바 실시간 대화 검색**: 대화 제목 키워드로 과거 대화 즉시 필터링
  - ✏️ **대화 제목 인라인 수정 (Rename)**: 사이드바에서 원하는 대화 제목으로 즉시 변경
  - 🛡️ **안전 삭제 확인 UI**: 실수로 인한 대화방 삭제 방지
  - 📎 **텍스트 & 소스코드 파일 첨부 (Paperclip)**: `.txt`, `.py`, `.js`, `.json`, `.md` 등 파일 업로드 및 분석
  - 📥 **대화 내보내기 (Export)**: Markdown (`.md`), 텍스트 (`.txt`) 파일 다운로드 및 전체 클립보드 복사
  - 🔔 **플로팅 토스트 알림**: 내보내기, 클립보드 복사, 제목 수정 완료 시 감성적인 알림 제공

---

## 💻 실행 방법

### 1. 데이터베이스 실행
Docker Compose를 사용하여 PostgreSQL 컨테이너를 구동합니다:
```bash
docker compose up -d
```

### 2. 백엔드 서버 실행
```bash
cd server
npm install
npm run dev
```
- 서버 주소: `http://localhost:5000`
- 환경 변수 설정: `server/.env`에 `DEEPSEEK_API_KEY` 설정

### 3. 프론트엔드 실행
```bash
cd client
npm install
npm run dev
```
- 브라우저 접속 주소: `http://localhost:5173`

---

## 🌟 주요 기능 하이라이트
1. **실제 DeepSeek AI 연동**: OpenAI 호환 SDK 기반 `deepseek-chat` 및 `deepseek-reasoner` 실시간 SSE 스트리밍.
2. **헤딩 기반 인라인 목차(TOC) & 스마트 페이징**: 긴 답변도 책처럼 넘겨보거나 목차 클릭으로 부드럽게 스크롤.
3. **인간공학적 스마트 스크롤 락 (`onWheelCapture`)**: 스트리밍 타이핑 중에도 마우스 휠을 올리면 즉시 화면 고정.
4. **신택스 하이라이팅**: `highlight.js` 기반 모든 언어 구문 색상 지원 및 원클릭 코드 복사.
5. **크로스 챗 전역 메모리 & AI 스마트 제목**: 이전 대화 맥락 지능형 공유 및 2~4단어 스마트 제목 자동 생성.
6. **대화 검색, 이름 변경, 파일 첨부, 내보내기**: 상용 ChatGPT 수준의 풍부한 편의 기능 완비.
