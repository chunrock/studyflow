# StudyFlow

교육 플로우를 화면 위 오버레이로 안내하는 StudyFlow 프로젝트입니다. 이 저장소에는 Electron 기반 교육 오버레이 앱 자료와 Claude Code/Codex 하네스 구성을 재현하기 위한 에이전트, 팀, 하위 프로젝트 자료가 함께 들어 있습니다.

## 구조

```text
.
├── AGENTS.md
├── CHANGELOG.md
├── CLAUDE.md
├── README.md
├── THEME.md
├── agents
│   ├── global
│   │   ├── CLAUDE.md
│   │   └── settings.template.json
│   └── teams
│       ├── bizdev-team
│       ├── design-team
│       ├── dev-team
│       ├── ops-team
│       ├── project-dev
│       ├── project-frontend-dev
│       ├── proposal-team
│       └── qa-team
├── electron
├── tests
├── web
└── subprojects
    ├── project-dev.md
    └── project-frontend-dev.md
```

## 포함 내용

- `web/`: StudyFlow 오버레이 웹 UI 원본
- `electron/`: Electron 메인/프리로드 코드
- `tests/`: 오버레이 상태, 위치 계산, 시나리오 스키마 테스트
- `AGENTS.md`: 이 저장소에서 에이전트가 따라야 할 운영 규칙
- `agents/global/CLAUDE.md`: Claude Code 전역 작업 규칙 템플릿
- `agents/global/settings.template.json`: `~/.claude/settings.json`에 반영할 수 있는 설정 템플릿
- `agents/teams/*/config.json`: PROMPT.md에 정의된 8개 팀 구성
- `subprojects/*.md`: 하위 프로젝트별 적용 목적, 역할, 사전 입력값, 작업 흐름

## 팀 목록

| 팀 | 용도 |
| --- | --- |
| `proposal-team` | RFP 분석, 제안서/보고서 작성, 최종 교정 |
| `dev-team` | 설계, 프론트엔드, 백엔드, 테스트 |
| `bizdev-team` | 시장조사, 사업화 전략, IR/영업자료 |
| `design-team` | UI/UX, 인포그래픽, 발표자료 |
| `ops-team` | 일정관리, 회의록, 상태보고 |
| `qa-team` | 문서 검증, 코드 리뷰, 테스트 자동화 |
| `project-dev` | 프로젝트별 FE/BE 통합 개발 |
| `project-frontend-dev` | 프로젝트별 프론트엔드 전용 개발 |

## 실제 적용 방법

1. `agents/global/settings.template.json`을 검토하고 민감한 설정이 없는지 확인합니다.
2. 기존 `~/.claude/settings.json`, `~/.claude/CLAUDE.md`, `~/.claude/teams`를 백업합니다.
3. 필요한 전역 규칙과 팀 설정만 `~/.claude` 아래로 복사합니다.
4. `project-dev` 또는 `project-frontend-dev`의 `<PROJECT_ROOT>` 값을 실제 프로젝트 경로로 바꿉니다.
5. Claude Code에서 팀 인식, 플러그인 로드, 히스토리 훅 동작을 검증합니다.

## 갱신 원칙

- 실제 홈 디렉터리 설정을 바로 수정하지 않고, 먼저 이 저장소에서 템플릿을 갱신합니다.
- 프로젝트별 경로, 포트, 비밀정보는 커밋하지 않습니다.
- 팀 구성 변경 시 `agents/teams/<team>/config.json`과 관련 `subprojects/*.md`를 함께 갱신합니다.
