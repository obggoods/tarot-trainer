# Prompt Token Optimization Report

## Prompt Payload Structure

### Before
- Card meaning keywords, traditional meaning, positive aspect, warning, must_include, common_mistakes, symbolism
- question_contexts selected_meaning, real_world_issues, concrete_checks, bad_readings, model_logic
- training_hints hint_keywords, hint_title, hint_body, answer_seed used by local/debug paths

### After
- Graph Resolver payload is the default prompt source.
- primaryConcepts / secondaryConcepts: concept id and Korean concept name
- reasoningPath: code-selected reasoning flow
- recommendedChecks: resolver-selected check items
- recommendedActions: resolver-selected action hints
- question_contexts and training_hints are not sent by default.
- Legacy fallback is sent only when Graph Resolver has no primary concepts or fewer than 2 recommended checks.

## Sample Token Estimate

| Sample | Before Tokens | After Tokens | Reduction |
| --- | ---: | ---: | ---: |
| swords_07.upright.relationship.partnership_check | 390 | 118 | 70% |
| pentacles_page.reversed.business.warning | 399 | 117 | 71% |
| major_01_magician.reversed.reunion.obstacle | 416 | 113 | 73% |
| Total | 1204 | 348 | 71% |

## Duplicate Block Estimate

- Current mapped-card old repeated blocks: 1984 context/hint blocks for 62 cards x 2 orientations x 8 axes x 2 data types.
- Current concept engine blocks: 211 blocks (75 concepts + 124 orientation maps + 12 question rules).
- Removed or centralized blocks in current mapped scope: 1773.
- 78-card old structure estimate: 2496 context/hint blocks.
- 78-card concept engine rough estimate: 224 blocks if about 60 reusable concepts are enough.
- 78-card rough block reduction: 2272 blocks, about 91%.

## Graph-first Fallback Estimate

- Default prompt path now sends only Graph Resolver payload.
- question_contexts/training_hints remain stored as legacy fallback data, but normal Analysis prompts do not include them.
- Expected default-prompt saving versus v2 payload: nearly the full question_contexts/training_hints prompt payload for all covered Graph cases.
- Additional fallback overhead: 0 tokens in normal cases; legacy payload appears only for insufficient Graph payload cases.

## Quality Loss Audit

- Resolver audit report: `reports/concept-resolver-report.md`
- Audited resolver cases: 22
- PASS: 22
- WARNING: 0
- FAIL: 0
- Quality gate: selected meaning alignment, concrete check preservation, and answer_seed signal coverage must pass before treating the reduced prompt payload as equivalent.
- Loss risk after audit: none detected for the audited resolver cases when Resolver payload is used as the prompt source.
