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
- 제작 패널(단계 제목/설명/강조 좌표 편집)을 추가했다.
- 교육 시나리오 JSON 저장과 불러오기를 추가했다.
- 시나리오를 새로 불러올 때 제작 패널이 이전 시나리오 상태를 계속 참조하던 문제를 발견해, `open` 액션에서 `editor`를 새 `state`로 다시 생성하도록 수정했다. (계획서 원안은 `editor.loadCurrentStep()`만 호출해 이전 시나리오의 클로저를 그대로 썼음)
