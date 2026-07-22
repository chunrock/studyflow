# project-dev 하위 프로젝트

## 목적

FE/BE 통합 개발 프로젝트를 빠르게 시작하기 위한 팀 구성 템플릿이다.

## 적용 대상

- 프론트엔드와 백엔드가 함께 있는 제품 개발
- API, 인증, 데이터 저장, 배포까지 포함하는 애플리케이션
- Docker, CI/CD, E2E 테스트가 필요한 프로젝트

## 기본 역할

| 에이전트 | 경로 | 담당 |
| --- | --- | --- |
| `team-lead@project-dev` | `<PROJECT_ROOT>` | 전체 조율, 인프라, 배포, Docker 관리 |
| `fe-developer@project-dev` | `<PROJECT_ROOT>/frontend` | 프론트엔드 구현 |
| `be-developer@project-dev` | `<PROJECT_ROOT>/backend` | 백엔드 API 구현 |
| `tester@project-dev` | `<PROJECT_ROOT>` | E2E 테스트, API 검증, 디버깅 |

## 적용 전 채울 값

- `<PROJECT_ROOT>`
- 프론트엔드 실행 명령
- 백엔드 실행 명령
- 테스트 명령
- 고정 미리보기 또는 API 포트
- 배포 산출물 경로

## 권장 작업 흐름

1. `team-lead`가 요구사항과 변경 범위를 정리한다.
2. `architect` 또는 `team-lead`가 구현 계획과 검증 기준을 만든다.
3. `fe-developer`와 `be-developer`가 병렬로 구현한다.
4. `tester`가 단위 테스트, API 테스트, E2E 검증을 수행한다.
5. `qa-team`이 코드 리뷰와 보안 점검을 수행한다.
