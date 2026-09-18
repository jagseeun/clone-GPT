# CloneGPT

ChatGPT의 인터페이스 및 기능을 벤치마킹하여 구현한 풀스택 AI 대화 웹 서비스입니다.

## 📌 프로젝트 개요
- **프로젝트명**: CloneGPT
- **개요**: ChatGPT와 최대한 유사한 화면과 사용 흐름을 제공하는 AI 웹 서비스
- **학습 목적**: 외부 AI API(DeepSeek API) 연동 학습, React + Node.js(Express) + PostgreSQL 풀스택 연동 및 실제 웹 서비스 아키텍처 이해

## 🛠️ 기술 스택
- **Frontend**: React, JavaScript, HTML5, CSS3, Lucide Icons, Vite
- **Backend**: Node.js, Express, CORS, dotenv
- **Database**: PostgreSQL
- **AI API**: DeepSeek API (`deepseek-chat`)
- **Tools**: VS Code, Git / GitHub, Docker

## 🚀 프로젝트 구조
```
clone-GPT/
├── client/          # React 프론트엔드 (Vite)
│   ├── src/
│   │   ├── components/ # Sidebar, ChatArea, ChatInput, WelcomeScreen
│   │   ├── App.jsx
│   │   └── index.css   # ChatGPT 테마 스타일
│   └── package.json
├── server/          # Express 백엔드
│   ├── src/
│   │   ├── config/     # PostgreSQL 연결 설정
│   │   ├── schema/     # DB init SQL 스키마
│   │   └── server.js   # API 엔드포인트
│   └── package.json
├── docker-compose.yml # PostgreSQL 컨테이너 (포트 5433)
└── README.md
```

## 📅 주차별 개발 일정
- [x] **1주차**: 기획 및 요구사항 정리, 구현 기능 선정, 화면 분석
- [x] **2주차**: 개발 환경 구성, 데이터베이스 설계, 주요 화면 개발 (사이드바, 메인 환영 화면, 대화 화면)
- [x] **3주차**: 채팅 기능 구현, DeepSeek API 연동, SSE 스트리밍 및 오류/예외 처리
- [ ] **4주차**: 전체 기능 테스트, 오류 수정, UI 보완 및 프로젝트 마무리

## 💻 실행 방법

### 1. 데이터베이스 실행
Docker Compose를 사용하는 경우:
```bash
docker compose up -d
```

### 2. 백엔드 서버 실행
```bash
cd server
npm install
npm run dev
```

### 3. 프론트엔드 실행
```bash
cd client
npm install
npm run dev
```
브라우저에서 `http://localhost:5173` 접속
