# 2026-07-15 agent-harness-refresh

## 작업 목표

PROMPT.md의 Claude Code 하네스 명세와 기존 AGENTS.md 운영 규칙을 참고해 에이전트 및 하위 프로젝트 자료를 갱신하고 README를 생성한다.

## 수행 내용

- 루트 `AGENTS.md`를 생성해 이 저장소의 에이전트 운영 규칙을 정리했다.
- `agents/global/CLAUDE.md`와 `agents/global/settings.template.json`을 생성했다.
- `agents/teams/` 아래 8개 팀 config를 생성했다.
- 각 팀 멤버별 `agents/<name>.md` 문서 23개를 생성했다.
- `subprojects/project-dev.md`, `subprojects/project-frontend-dev.md`를 생성했다.
- `README.md`와 `CHANGELOG.md`를 생성했다.

## 산출물

- `AGENTS.md`
- `README.md`
- `CHANGELOG.md`
- `agents/global/CLAUDE.md`
- `agents/global/settings.template.json`
- `agents/teams/*/config.json`
- `agents/teams/*/agents/*.md`
- `subprojects/*.md`

## 검증

- `agents/global/settings.template.json` JSON 파싱 확인 완료.
- `agents/teams/*/config.json` 8개 JSON 파싱 확인 완료.
- 팀 config 8개, 멤버 문서 23개 생성 확인 완료.

## 이슈 및 해결

- 현재 작업 폴더에는 기존 프로젝트 자료가 없어 새 자료 구조를 생성하는 방식으로 진행했다.
- 실제 `~/.claude` 홈 설정은 안전을 위해 직접 수정하지 않고 저장소 템플릿으로만 정리했다.

## 다음 단계

- 실제 적용 시 `<PROJECT_ROOT>` 값을 프로젝트별 경로로 교체한다.
- 필요하면 `agents/global` 내용을 `~/.claude`로 백업 후 반영한다.

## 최종 상태

완료
