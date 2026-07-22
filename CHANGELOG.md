# CHANGELOG

## 0.1.0

- StudyFlow 프로젝트 초기 구조를 생성했다.
- Electron 기반 교육 오버레이 MVP 계획을 반영했다.
- 첨부 테마 문서와 Noto Sans KR 번들 폰트를 프로젝트에 배치했다.
- 브라우저 전역 노출 스크립트 3종의 최상위 `const api` 이름 충돌을 파일별 고유 이름으로 수정했다. (Electron 렌더러 SyntaxError 해결)

## 2026-07-15

- PROMPT.md의 Claude Code 하네스 명세를 바탕으로 전역 규칙, 설정 템플릿, 8개 팀 구성, 하위 프로젝트 문서, README를 생성했다.

## 2026-07-22

- 등록 미리보기 서버를 확정했다: `studyflow` / 포트 `5187`, `tools/static-server.js`로 `web/`을 서빙한다.
- `.claude/launch.json`을 프로젝트에 추가하고 `AGENTS.md`의 서버 등록란을 채웠다.
- `package.json`에 `preview` 스크립트를 추가했다.
- 파일럿 대상 업무 프로그램을 첨부 화면 시안(전표 발행 화면)으로 확정했다. 자세한 내용은 자료 `docs/BACKLOG.md`에 기록.
