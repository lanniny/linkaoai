# $vibe enter unattended mode [CONTEXT] Build Linkao 临考 MVP — AI exam review web a...

## Execution Summary
Governed runtime execution plan for `vibe` in mode interactive_governed.

## Frozen Inputs
- Requirement doc: I:\514claude\linkao\docs\requirements\2026-05-10-vibe-enter-unattended-mode-context-build-linkao-mvp-ai-exam-revi.md
- Runtime input packet: I:\514claude\linkao\outputs\runtime\vibe-sessions\20260510T042157Z-fd8d285e\runtime-input-packet.json
- Source task: $vibe enter unattended mode [CONTEXT] Build Linkao 临考 MVP — AI exam review web a... Deliverable: Governed implementation artifacts, verification evidence, and cleanup receipts. Constraints: Do not bypass the fixed six-stage governed runtime.; Do not widen scope silently beyond the frozen requirement document.. Update: Continue Linkao 临考 MVP build after xl_plan approved by user. Advance plan_execute and produce Phase 0 deliverables in this run, then halt at phase_cleanup bounded stop for user review.

[Phase 0 deliverables to produce in this execute pass — files to write under I:/514claude/linkao]
1. ops/day0-domain-account-checklist.md — domain availability commands (linkao.ai/.app/.cn via dig/whois/namecheap/aliyun) + 微信/小红书/抖音/B站 brand-name occupancy self-check + alternates fallback (临考侠/通/AI/帮)
2. ops/day0-30day-commitment.md — 手写打印用的承诺备忘录，含 2026-05-10 起到 2026-06-09 截止、目标 30+用户/10+付费/1000+小红书粉、第一性原则 行动>思考 真实>完美 用户>想法
3. ops/day0-public-announcement.md — 朋友圈/即刻 三版文案：坦诚版、故事版、数据版，每版独立段
4. ops/day0-day1-three-tasks.md — 明天三件事 上午/下午/晚上 各一件，必须含 acceptance + cut-off time
5. .env.example + ops/day0-account-prerequisite.md — 注册前置 (邮箱/手机/付款方式/$20 预算/2FA) + Anthropic/Supabase/Vercel/GitHub 账号注册步骤分解

Stop at phase_cleanup bounded gate after Phase 0 artifacts are written; do not roll into Phase 1 scaffold yet — that is a separate larger execution pass that should be re-entered after Day-0 deliverables are reviewed.

Verification commands (post-execute):
- ls I:/514claude/linkao/ops should list five day0-*.md files plus .env.example
- grep -l "代写\|作弊\|包过" I:/514claude/linkao/ops/*.md should return zero matches (compliance lane)
- grep "AI 生成内容仅供参考" I:/514claude/linkao/ops/day0-30day-commitment.md or相关 docs (AI disclaimer baked in where applicable)
- ops/day0-account-prerequisite.md must mention "官方 API only, no proxy/transit"

- Governance scope: root
- Root run id: 20260510T042157Z-fd8d285e
- Entry intent: vibe
- Requested stop stage: phase_cleanup
- Requested grade floor: none
- Frozen route pack: orchestration-core
- Frozen route skill: vibe
- Frozen route mode: pack_overlay
- Router/runtime skill mismatch: False
- Execution topology companion: I:\514claude\linkao\outputs\runtime\vibe-sessions\20260510T042157Z-fd8d285e\execution-topology.json
## Anti-Proxy-Goal-Drift Controls
Prefill from the frozen requirement doc where available. Only diverge with explicit justification.

### Primary Objective
$vibe enter unattended mode [CONTEXT] Build Linkao 临考 MVP — AI exam review web a...

### Non-Objective Proxy Signals
- single sample pass only
- current test green only
- demo success only

### Validation Material Role
validation_only

### Declared Tier
Tier C

### Intended Scope
scenario_specific

### Abstraction Layer Target
_author_to_declare_

### Completion State Target
partial

### Generalization Evidence Plan
- Reuse the requirement-declared proof boundary as the starting point.
- cases: []
- note: add independent evidence before generalized completion claims

## Internal Grade Decision
- Grade: XL
- User-facing runtime remains fixed; grade is internal only.
- `vibe` remains the governor and final authority for execution flow.

## Wave Plan
- Wave 1: skeleton, intent freeze, and requirement validation
- Wave 2: implementation decomposition and bounded ownership assignment
- Wave 3: verification, reconciliation, and cleanup handoff

## Delivery Acceptance Plan
- Freeze downstream product acceptance inside the governed requirement doc and reuse it rather than inventing closeout claims later.
- Emit a per-run delivery-acceptance report during `phase_cleanup` so runtime/process success is kept separate from project-delivery success.
- Delivery-acceptance report: I:\514claude\linkao\outputs\runtime\vibe-sessions\20260510T042157Z-fd8d285e\delivery-acceptance-report.json
- If manual spot checks are declared in the requirement doc, final completion wording stays blocked until they are cleared or explicitly downgraded to manual review.
- Release truth aggregation remains an outer-layer gate; this run emits the per-run delivery-truth report only.

## Artifact Review Strategy
- If the frozen requirement doc declares `Artifact Review Requirements`, execution must leave behind explicit artifact-review evidence rather than relying on generic completion wording.
- Artifact review may be recorded inline in `phase-execute.json` or through a dedicated `artifact-review.json` sidecar, but one of those governed surfaces must exist when direct artifact review is required.
- Product acceptance stays blocked when required artifact review remains missing, partial, degraded, or manual-review-only.

## Code Task TDD Evidence Plan
- Reuse the frozen `Code Task TDD Evidence Requirements` section from the requirement doc rather than inventing late closeout claims.
- Reuse the frozen `Code Task TDD Exceptions` section when strict failing-first sequencing is intentionally exempted.
- Map each frozen requirement or exception to an implementation step, a targeted verification command, and a proof artifact.
- If strict failing-first sequencing is blocked, execution must record the bounded reason and fallback evidence explicitly.

## Baseline Document Quality Mapping
- Use the frozen `Baseline Document Quality Dimensions` section in the requirement doc as the authoritative list of document-artifact quality dimensions that artifact review must cover before a document delivery can claim full completion.
- Track each baseline document dimension through artifact-review annotations so the delivery-acceptance report can show which structure, formatting, completeness, reference integrity, layout stability, and output fidelity expectations were inspected.
- Treat missing document-dimension coverage as a manual-review-required hit and keep this mapping separate from UI baselines and code-task TDD evidence.

## Baseline UI Quality Mapping
- Use the frozen `Baseline UI Quality Dimensions` section in the requirement doc as the authoritative list of dimensions that artifact review must cover before a UI delivery can claim full completion.
- Track each baseline dimension through execution and artifact-review annotations so the delivery-acceptance report can show which structure, interaction, state, consistency, responsiveness, and fidelity expectations were inspected.
- Treat missing dimension coverage as a manual-review-required hit and include explicit mapping steps or targeted verification units that drive reviewers to capture the evidence the requirement doc established.

## Task-Specific Acceptance Mapping
- Reuse frozen task-specific acceptance extensions from the requirement doc instead of inventing late closeout criteria.
- Keep base delivery truth separate from task-specific expectations so each can be inspected independently during review.

## Research Augmentation Plan
- Preserve any frozen research augmentation sources from the requirement doc so later reviewers can tell which external standards strengthened the brief.
- Research augmentation may strengthen rough asks, but it must not replace the user-owned requirement surface.

## Execution Topology Snapshot
- Delegation mode: selective_parallel_child_lanes
- Review mode: checkpoint_per_step
- Specialist execution mode: native_bounded_units
- Max parallel units: 2
- Wave `wave-1` has 2 executable step(s).
  Step `wave-1-parallel` -> mode `bounded_parallel`, units `2`.
  Step `wave-1-specialist-in_execution-group-1-parallel` -> mode `bounded_parallel`, units `2`.

## Specialist Decision Plan
- The governed runtime must keep one explicit specialist decision surface from freeze through delivery acceptance.
- Frozen decision state: approved_dispatch
- Frozen resolution mode: approved_dispatch
- Frozen decision notes: Bounded specialist recommendations were surfaced and promoted into effective approved dispatch.

## Specialist Skill Dispatch Plan
- Specialist routing is mandatory and bounded inside governed `vibe`; it does not transfer runtime authority away from vibe.
- This section lists only effective approved dispatch; non-adopted router candidates and local suggestions remain packet/audit data, not user-facing execution requirements.
- Before specialist execution starts, governed `vibe` emits one unified disclosure for the effective `approved_dispatch` set using each skill's real `native_skill_entrypoint`.
- Each specialist must be invoked through its native workflow, input contract, and validation style.
- Specialist outputs remain subordinate to the frozen requirement and the governed plan.
- Dispatch scrapling as specialist_assist.
  Binding profile: default; dispatch phase: in_execution; lane policy: inherit_grade; parallel in XL: True
  Write scope: specialist:scrapling; review mode: native_contract; execution priority: 50
  Reason: top ranked specialist candidate from pack 'web-scraping' via fallback_task_default
  Required inputs: bounded specialist subtask contract, frozen requirement context, relevant source files or domain artifacts
  Expected outputs: bounded specialist findings or code changes, verification notes aligned with the specialist skill
  Verification: Preserve the specialist skill's native workflow, boundaries, and validation style.
- Dispatch vercel-deploy as specialist_assist.
  Binding profile: default; dispatch phase: in_execution; lane policy: inherit_grade; parallel in XL: True
  Write scope: specialist:vercel-deploy; review mode: native_contract; execution priority: 50
  Reason: top ranked specialist candidate from pack 'integration-devops' via fallback_task_default
  Required inputs: bounded specialist subtask contract, frozen requirement context, relevant source files or domain artifacts
  Expected outputs: bounded specialist findings or code changes, verification notes aligned with the specialist skill
  Verification: Preserve the specialist skill's native workflow, boundaries, and validation style.

## Specialist Consultation
These are specialists resolved for plan-time handling under governed `vibe` before this execution plan was frozen. Depending on policy, they may be consulted live or routed for direct current-session loading.
- Consulted Skill: scrapling
  Why now: top ranked specialist candidate from pack 'web-scraping' via fallback_task_default
  Loaded from: C:\Users\16643\.claude\skills\vibe\bundled\skills\scrapling\SKILL.runtime-mirror.md
- Consulted Skill: vercel-deploy
  Why now: top ranked specialist candidate from pack 'integration-devops' via fallback_task_default
  Loaded from: C:\Users\16643\.claude\skills\vibe\bundled\skills\vercel-deploy\SKILL.runtime-mirror.md

## Unified Specialist Lifecycle Disclosure This unified disclosure keeps routing truth, consultation truth, and execution truth separate while showing one user-readable specialist timeline.  ### discussion_routing - Skill: scrapling   State: routed   Why now: top ranked specialist candidate from pack 'web-scraping' via fallback_task_default   Loaded from: C:\Users\16643\.claude\skills\vibe\bundled\skills\scrapling\SKILL.runtime-mirror.md - Skill: vercel-deploy   State: routed   Why now: top ranked specialist candidate from pack 'integration-devops' via fallback_task_default   Loaded from: C:\Users\16643\.claude\skills\vibe\bundled\skills\vercel-deploy\SKILL.runtime-mirror.md  ### discussion_consultation - Skill: scrapling   State: routed_pending_current_session   Why now: top ranked specialist candidate from pack 'web-scraping' via fallback_task_default   Loaded from: C:\Users\16643\.claude\skills\vibe\bundled\skills\scrapling\SKILL.runtime-mirror.md - Skill: vercel-deploy   State: routed_pending_current_session   Why now: top ranked specialist candidate from pack 'integration-devops' via fallback_task_default   Loaded from: C:\Users\16643\.claude\skills\vibe\bundled\skills\vercel-deploy\SKILL.runtime-mirror.md  ### planning_consultation - Skill: scrapling   State: routed_pending_current_session   Why now: top ranked specialist candidate from pack 'web-scraping' via fallback_task_default   Loaded from: C:\Users\16643\.claude\skills\vibe\bundled\skills\scrapling\SKILL.runtime-mirror.md - Skill: vercel-deploy   State: routed_pending_current_session   Why now: top ranked specialist candidate from pack 'integration-devops' via fallback_task_default   Loaded from: C:\Users\16643\.claude\skills\vibe\bundled\skills\vercel-deploy\SKILL.runtime-mirror.md

## Completion Language Rules
- Do not report runtime completion as downstream project delivery unless the delivery-acceptance report returns `PASS`.
- `completed_with_failures`, degraded execution, or pending manual actions must downgrade completion wording.
- Child-governed completion remains local-scope only and cannot justify root-level completion language.

## Ownership Boundaries
- One owner per artifact set.
- Parallel work must use disjoint write scopes.
- Subagent prompts must end with `$vibe`.
- Specialist help stays bounded and native-mode; it must not become a second planner or a second runtime.

## Verification Commands
- Run targeted repo verification for changed surfaces.
- Run runtime contract gate before claiming completion.
- Review the delivery-acceptance report emitted during `phase_cleanup` before using full completion language.
- Re-run mirror sync and parity validation before release claims.

## Rollback Plan
- Revert only the governed-runtime change set if verification fails.
- Do not roll back unrelated user changes.

## Phase Cleanup Contract
- Remove temp artifacts created by the wave.
- Run node audit and cleanup when needed.
- Write cleanup receipt before completion.
