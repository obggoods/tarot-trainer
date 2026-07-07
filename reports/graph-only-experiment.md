# Graph-only Experiment

- Total cases: 10
- Graph-only PASS: 10
- Graph-only retention/pass rate: 100%
- Recommendation: question_contexts 축소 실험을 진행할 수 있습니다.
- Transition conclusion: Concept Graph Resolver를 기본 해석 소스로 전환하고 question_contexts/training_hints는 legacy fallback으로 낮출 수 있습니다.

## A/B Summary

| Case | A selectedMeaning | B selectedMeaning | A checks | B checks | B regression | B banned | B section similarity | Concept retention | PASS |
| --- | --- | --- | ---: | ---: | --- | --- | ---: | ---: | --- |
| 마법사 역방향 / 재회 장애물 | 재회 장애물에서의 말과 행동의 불일치와 실행력 부족 | 실행력 + 책임 소재 | 5 | 5 | PASS | - | 0.22 | 100% | PASS |
| 세계 정방향 / 사업 조언 | 사업 조언에서의 한 주기의 완성과 다음 단계로 넘어갈 준비 | 운영 체계 + 선택 기준 | 5 | 5 | PASS | - | 0.21 | 100% | PASS |
| 연인 역방향 / 재회 조언 | 재회 조언에서의 선택의 불일치와 관계 조율 실패 | 경계 + 선택 기준 | 5 | 5 | PASS | - | 0.18 | 100% | PASS |
| 소드 7 정방향 / 파트너십 확인 | 인간관계 확인 조건에서의 정보 비대칭과 책임 회피 구조 | 책임 소재 + 정보 비대칭 | 5 | 5 | PASS | - | 0.20 | 100% | PASS |
| 소드 8 정방향 / 진로 심리적 제한 | 제한 | 심리적 제한 + 경계 | 4 | 5 | PASS | - | 0.28 | 100% | PASS |
| 펜타클 페이지 역방향 / 사업 위험 | 사업 위험에서의 준비 부족과 현실 검증 미흡 | 준비 부족 + 운영 체계 | 5 | 5 | PASS | - | 0.21 | 100% | PASS |
| 펜타클 8 정방향 / 직업 훈련 | 훈련 | 기술 축적 + 반복 숙련 | 4 | 5 | PASS | - | 0.19 | 100% | PASS |
| 컵 5 정방향 / 연애 상실 집중 | 연애 현재에서의 상실감에 붙잡혀 남은 가능성을 보지 못하는 상태 | 상실 집중 + 남은 가능성 | 5 | 5 | PASS | - | 0.20 | 100% | PASS |
| 컵 7 정방향 / 연애 환상과 선택 혼란 | 선택지 | 환상 투사 + 선택 기준 | 4 | 5 | PASS | - | 0.26 | 100% | PASS |
| 완드 8 정방향 / 직업 빠른 진행 | 속도 | 빠른 진행 + 실행력 | 4 | 5 | PASS | - | 0.21 | 100% | PASS |

## Case Details

### 마법사 역방향 / 재회 장애물

- Graph primary concepts: execution(실행력), responsibility(책임 소재)
- Graph reasoning path: 실행력 -> 책임 소재 -> 실행 격차 -> 책임 이행 -> 문서화
- Graph recommended checks: 실제 행동 기록, 다음 일정, 담당자, 검증 가능한 결과물, 지속 루틴
- Graph recommended actions: 책임 이행, 처리한 일, 비용 부담 내역, 문서화
- B realWorldIssue: 실행력이 실행 격차로 이어져 실제 행동 기록, 다음 일정를 확인해야 하는 장면입니다.
- B sample answer: 실행력이 실행 격차로 이어져 실제 행동 기록, 다음 일정를 확인해야 하는 장면입니다. 내담자에게는 실제 행동 기록, 다음 일정, 담당자를 먼저 확인하라고 말할 수 있습니다.
- B wrong note: 사고 과정의 핵심은 실행력 + 책임 소재을 바로 결론으로 쓰지 않고, 실행력 -> 책임 소재 -> 실행 격차 흐름을 따라 확인 항목을 만든다는 점입니다.

### 세계 정방향 / 사업 조언

- Graph primary concepts: operation_system(운영 체계), decision_criteria(선택 기준)
- Graph reasoning path: 운영 체계 -> 선택 기준 -> 자원 우선순위 -> 결정의 질 -> 검증 -> 문서화
- Graph recommended checks: 업무 순서, 담당자별 권한, 기록 방식, 일정 관리표, 고객 응대 기준
- Graph recommended actions: 검증, 테스트 결과, 확인 자료, 문서화
- B realWorldIssue: 운영 체계이 자원 우선순위로 이어져 업무 순서, 담당자별 권한를 확인해야 하는 장면입니다.
- B sample answer: 운영 체계이 자원 우선순위로 이어져 업무 순서, 담당자별 권한를 확인해야 하는 장면입니다. 내담자에게는 업무 순서, 담당자별 권한, 기록 방식를 먼저 확인하라고 말할 수 있습니다.
- B wrong note: 사고 과정의 핵심은 운영 체계 + 선택 기준을 바로 결론으로 쓰지 않고, 운영 체계 -> 선택 기준 -> 자원 우선순위 흐름을 따라 확인 항목을 만든다는 점입니다.

### 연인 역방향 / 재회 조언

- Graph primary concepts: boundary(경계), decision_criteria(선택 기준)
- Graph reasoning path: 경계 -> 선택 기준 -> 금전 경계 -> 결정의 질 -> 투명한 소통 -> 문서화
- Graph recommended checks: 거절해야 할 범위, 연락 빈도, 업무 외 요청, 감정 노동 한계, 휴식 시간
- Graph recommended actions: 투명한 소통, 확인 질문, 합의 내용 반복 확인, 문서화
- B realWorldIssue: 경계이 금전 경계로 이어져 거절해야 할 범위, 연락 빈도를 확인해야 하는 장면입니다.
- B sample answer: 경계이 금전 경계로 이어져 거절해야 할 범위, 연락 빈도를 확인해야 하는 장면입니다. 내담자에게는 거절해야 할 범위, 연락 빈도, 업무 외 요청를 먼저 확인하라고 말할 수 있습니다.
- B wrong note: 사고 과정의 핵심은 경계 + 선택 기준을 바로 결론으로 쓰지 않고, 경계 -> 선택 기준 -> 금전 경계 흐름을 따라 확인 항목을 만든다는 점입니다.

### 소드 7 정방향 / 파트너십 확인

- Graph primary concepts: responsibility(책임 소재), information_asymmetry(정보 비대칭)
- Graph reasoning path: 책임 소재 -> 정보 비대칭 -> 책임 이행 -> 계약 불명확 -> 문서화
- Graph recommended checks: 역할 범위, 결정 권한, 문제 발생 시 책임자, 비용 부담 기준, 합의 위반 시 처리 방식
- Graph recommended actions: 문서화, 서면 계약, 메시지 기록
- B realWorldIssue: 책임 소재이 책임 이행로 이어져 역할 범위, 결정 권한를 확인해야 하는 장면입니다.
- B sample answer: 책임 소재이 책임 이행로 이어져 역할 범위, 결정 권한를 확인해야 하는 장면입니다. 내담자에게는 역할 범위, 결정 권한, 문제 발생 시 책임자를 먼저 확인하라고 말할 수 있습니다.
- B wrong note: 사고 과정의 핵심은 책임 소재 + 정보 비대칭을 바로 결론으로 쓰지 않고, 책임 소재 -> 정보 비대칭 -> 책임 이행 흐름을 따라 확인 항목을 만든다는 점입니다.

### 소드 8 정방향 / 진로 심리적 제한

- Graph primary concepts: mental_restriction(심리적 제한), boundary(경계)
- Graph reasoning path: 심리적 제한 -> 경계 -> 결정의 질 -> 금전 경계 -> 검증 -> 투명한 소통
- Graph recommended checks: 실제 제한 조건, 스스로 금지한 선택지, 도움을 요청할 사람, 작게 시도할 행동, 두려움의 근거
- Graph recommended actions: 검증, 테스트 결과, 확인 자료, 투명한 소통
- B realWorldIssue: 심리적 제한이 결정의 질로 이어져 실제 제한 조건, 스스로 금지한 선택지를 확인해야 하는 장면입니다.
- B sample answer: 심리적 제한이 결정의 질로 이어져 실제 제한 조건, 스스로 금지한 선택지를 확인해야 하는 장면입니다. 내담자에게는 실제 제한 조건, 스스로 금지한 선택지, 도움을 요청할 사람를 먼저 확인하라고 말할 수 있습니다.
- B wrong note: 사고 과정의 핵심은 심리적 제한 + 경계을 바로 결론으로 쓰지 않고, 심리적 제한 -> 경계 -> 결정의 질 흐름을 따라 확인 항목을 만든다는 점입니다.

### 펜타클 페이지 역방향 / 사업 위험

- Graph primary concepts: preparation(준비 부족), operation_system(운영 체계)
- Graph reasoning path: 준비 부족 -> 운영 체계 -> 검증 -> 자원 우선순위 -> 문서화
- Graph recommended checks: 초기 비용, 원가 계산, 월 고정비, 필요 역량, 실행 일정
- Graph recommended actions: 문서화, 서면 계약, 메시지 기록, 검증
- B realWorldIssue: 준비 부족이 검증로 이어져 초기 비용, 원가 계산를 확인해야 하는 장면입니다.
- B sample answer: 준비 부족이 검증로 이어져 초기 비용, 원가 계산를 확인해야 하는 장면입니다. 내담자에게는 초기 비용, 원가 계산, 월 고정비를 먼저 확인하라고 말할 수 있습니다.
- B wrong note: 사고 과정의 핵심은 준비 부족 + 운영 체계을 바로 결론으로 쓰지 않고, 준비 부족 -> 운영 체계 -> 검증 흐름을 따라 확인 항목을 만든다는 점입니다.

### 펜타클 8 정방향 / 직업 훈련

- Graph primary concepts: skill_building(기술 축적), craftsmanship(반복 숙련)
- Graph reasoning path: 기술 축적 -> 반복 숙련 -> 검증 -> 문서화
- Graph recommended checks: 훈련 시간, 기초 기술, 피드백 방식, 작업 반복 횟수, 포트폴리오
- Graph recommended actions: 문서화, 서면 계약, 메시지 기록
- B realWorldIssue: 기술 축적이 검증로 이어져 훈련 시간, 기초 기술를 확인해야 하는 장면입니다.
- B sample answer: 기술 축적이 검증로 이어져 훈련 시간, 기초 기술를 확인해야 하는 장면입니다. 내담자에게는 훈련 시간, 기초 기술, 피드백 방식를 먼저 확인하라고 말할 수 있습니다.
- B wrong note: 사고 과정의 핵심은 기술 축적 + 반복 숙련을 바로 결론으로 쓰지 않고, 기술 축적 -> 반복 숙련 -> 검증 흐름을 따라 확인 항목을 만든다는 점입니다.

### 컵 5 정방향 / 연애 상실 집중

- Graph primary concepts: grief_focus(상실 집중), remaining_possibility(남은 가능성)
- Graph reasoning path: 상실 집중 -> 남은 가능성 -> 미완료감 -> 치유 -> 회복 -> 감정 처리 -> 검증
- Graph recommended checks: 반복해서 떠올리는 장면, 이미 잃은 것, 상대의 반응, 감정의 균형, 대화 흐름
- Graph recommended actions: 감정 처리, 상처의 원인, 남은 감정, 검증
- B realWorldIssue: 상실 집중이 미완료감로 이어져 반복해서 떠올리는 장면, 이미 잃은 것를 확인해야 하는 장면입니다.
- B sample answer: 상실 집중이 미완료감로 이어져 반복해서 떠올리는 장면, 이미 잃은 것를 확인해야 하는 장면입니다. 내담자에게는 반복해서 떠올리는 장면, 이미 잃은 것, 상대의 반응를 먼저 확인하라고 말할 수 있습니다.
- B wrong note: 사고 과정의 핵심은 상실 집중 + 남은 가능성을 바로 결론으로 쓰지 않고, 상실 집중 -> 남은 가능성 -> 미완료감 흐름을 따라 확인 항목을 만든다는 점입니다.

### 컵 7 정방향 / 연애 환상과 선택 혼란

- Graph primary concepts: fantasy_projection(환상 투사), decision_criteria(선택 기준)
- Graph reasoning path: 환상 투사 -> 선택 기준 -> 결정의 질 -> 검증 -> 문서화
- Graph recommended checks: 확인된 사실, 상상과 실제 행동의 차이, 선택 기준, 실행 비용, 기한이 있는 결정
- Graph recommended actions: 검증, 테스트 결과, 확인 자료, 문서화
- B realWorldIssue: 환상 투사이 결정의 질로 이어져 확인된 사실, 상상과 실제 행동의 차이를 확인해야 하는 장면입니다.
- B sample answer: 환상 투사이 결정의 질로 이어져 확인된 사실, 상상과 실제 행동의 차이를 확인해야 하는 장면입니다. 내담자에게는 확인된 사실, 상상과 실제 행동의 차이, 선택 기준를 먼저 확인하라고 말할 수 있습니다.
- B wrong note: 사고 과정의 핵심은 환상 투사 + 선택 기준을 바로 결론으로 쓰지 않고, 환상 투사 -> 선택 기준 -> 결정의 질 흐름을 따라 확인 항목을 만든다는 점입니다.

### 완드 8 정방향 / 직업 빠른 진행

- Graph primary concepts: rapid_progress(빠른 진행), execution(실행력)
- Graph reasoning path: 빠른 진행 -> 실행력 -> 리스크 관리 -> 실행 격차 -> 검증 -> 책임 이행
- Graph recommended checks: 마감 일정, 응답 기한, 실행 순서, 전달 경로, 누락된 확인 사항
- Graph recommended actions: 검증, 테스트 결과, 확인 자료, 책임 이행
- B realWorldIssue: 빠른 진행이 리스크 관리로 이어져 마감 일정, 응답 기한를 확인해야 하는 장면입니다.
- B sample answer: 빠른 진행이 리스크 관리로 이어져 마감 일정, 응답 기한를 확인해야 하는 장면입니다. 내담자에게는 마감 일정, 응답 기한, 실행 순서를 먼저 확인하라고 말할 수 있습니다.
- B wrong note: 사고 과정의 핵심은 빠른 진행 + 실행력을 바로 결론으로 쓰지 않고, 빠른 진행 -> 실행력 -> 리스크 관리 흐름을 따라 확인 항목을 만든다는 점입니다.
