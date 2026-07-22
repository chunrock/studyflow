# 전역 작업 규칙

## 실행 방식

- 모든 작업은 plan 모드로 시작한다.
- 모든 작업은 팀 에이전트 구성으로 실행한다.
- tmux split pane으로 각 에이전트를 분리해 병렬 실행한다.
- 작업은 분석, 작성, 검증 역할로 분리한다.
- 작업 이력은 프로젝트 루트 `materials/history/`에 `YYYY-MM-DD_{주제-슬러그}.md`로 저장한다.

## 필수 이력 항목

- 작업 목표
- 수행 내용
- 산출물 경로
- 이슈 및 해결
- 다음 단계
- 최종 상태: 완료, 미완, 차후작업 중 하나

## 스킬

- 모든 작업 시작 전 `using-superpowers` 스킬을 적용한다.

## 전역 기본 팀

- `proposal-team`: 제안서, RFP 분석, 국책과제 보고서, 산출물 작성
- `dev-team`: 코드 개발, API, 인프라, 테스트, CI/CD
- `bizdev-team`: 시장조사, 경쟁분석, 사업화 전략, 영업지원
- `design-team`: 인포그래픽, 다이어그램, UI/UX, 발표자료
- `ops-team`: 일정관리, 내부 커뮤니케이션, 프로젝트 운영
- `qa-team`: 문서 검증, 코드 리뷰, 컴플라이언스 체크

## 프로젝트 개발 팀

- `project-dev`: FE/BE 통합 개발
- `project-frontend-dev`: Figma to React 변환 및 프론트엔드 전용 구현
