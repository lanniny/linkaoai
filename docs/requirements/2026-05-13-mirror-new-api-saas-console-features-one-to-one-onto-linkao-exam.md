# Mirror new-api SaaS console features one-to-one onto Linkao exam-review Next.js+...

## Summary
Mirror new-api SaaS console features one-to-one onto Linkao exam-review Next.js+...

## Goal
Mirror new-api SaaS console features one-to-one onto Linkao exam-review Next.js+...

## Deliverable
Governed implementation artifacts, verification evidence, and cleanup receipts

## Constraints
- Do not bypass the fixed six-stage governed runtime.
- Do not widen scope silently beyond the frozen requirement document.

## Acceptance Criteria
- Requirement document is frozen before execution.
- Execution plan exists before implementation.
- Verification evidence exists before completion claims.
- Phase cleanup receipt is produced.

## Product Acceptance Criteria
- Requirement document is frozen before execution.
- Execution plan exists before implementation.
- Verification evidence exists before completion claims.
- Phase cleanup receipt is produced.
- The delivered output must satisfy observable behavior implied by the frozen goal and deliverable, not only internal runtime progress.
- Full completion wording is allowed only after downstream delivery truth is passing.

## Manual Spot Checks
- Open the primary user-facing flow and confirm the main path works from entry to completion.
- Exercise one meaningful unhappy-path or validation-path interaction and record whether behavior matches the frozen requirement.

## Completion Language Policy
- Full completion wording is allowed only when governance truth, engineering verification truth, workflow completion truth, and product acceptance truth are all passing.
- `completed_with_failures`, degraded execution, or pending manual actions must be reported as non-complete states.
- If manual spot checks remain pending, the run must be described as requiring manual review rather than fully ready.

## Delivery Truth Contract
- Governance truth: requirement, plan, execution, and cleanup artifacts remain traceable and authoritative.
- Engineering verification truth: targeted verification passes or fails explicitly; silence does not count as success.
- Workflow completion truth: planned units, delegated lanes, and specialist outputs reconcile back into the governed plan.
- Product acceptance truth: observable deliverable behavior satisfies frozen acceptance criteria before full completion language is allowed.

## Artifact Review Requirements
No additional artifact review requirements were frozen for this run.

## Code Task TDD Mode
TDD mode: required
Decision source: runtime_inference
Reason: The task includes implementation or defect-correction intent that requires code-task TDD evidence.

## Code Task TDD Evidence Requirements
- Record failing-first evidence for the changed behavior before implementation or defect correction.
- Record the green rerun that proves the targeted behavior passed after implementation.
- Map the changed behavior to targeted verification evidence; generic suite success alone is insufficient.
- If automated failing-first evidence is not appropriate, freeze and honor an explicit code-task TDD exception instead of silently skipping the requirement.

## Code Task TDD Exceptions
No code-task TDD exceptions were frozen for this run.

## Baseline Document Quality Dimensions
No baseline document quality dimensions were frozen for this run.

## Baseline UI Quality Dimensions
- Structure Completeness
- Interaction Feedback
- State Coverage
- Design System Consistency
- Responsive Stability
- Spec Fidelity

## Task-Specific Acceptance Extensions
No additional task-specific acceptance extensions were frozen for this run.

## Research Augmentation Sources
No research augmentation sources were frozen for this run.

> Fill the anti-drift fields once here. Downstream governed plan and completion surfaces should reuse them rather than restate them.

## Primary Objective
Mirror new-api SaaS console features one-to-one onto Linkao exam-review Next.js+...

## Non-Objective Proxy Signals
- single sample pass only
- current test green only
- demo success only

## Validation Material Role
validation_only

## Anti-Proxy-Goal-Drift Tier
Tier C

## Intended Scope
scenario_specific

## Abstraction Layer Target
_author_to_declare_

## Completion State
partial

## Generalization Evidence Bundle
- cases: []
- note: add independent evidence before generalized completion claims

## Non-Goals
- Do not treat M/L/XL as user-facing entry branches.
- Do not introduce a second router or control plane.

## Autonomy Mode
interactive_governed

## Assumptions
- Interactive clarification is allowed if unresolved ambiguity materially changes implementation.

## Evidence Inputs
- Source task: Mirror new-api SaaS console features one-to-one onto Linkao exam-review Next.js+Supabase web app. Add equivalent or analogous features: tokens / api keys, user balance + quota, channels, request logs, statistics dashboards, redemption codes, top-up history. Preserve Linkao education domain (高数/线代/概率论 exam review, 19.9 RMB/subject, fail-refund). Deliver systematic completion plan plus implementation. Existing stack: Next.js 16 App Router, Supabase auth+postgres+RLS, role-based admin already in place, deployed at linkaoai.com.
- Intent contract: intent-contract.json
- Runtime input packet: runtime-input-packet.json

## Runtime Input Truth
- Governance scope: root
- Root run id: 20260513T030155Z-c94fa082
- Entry intent: vibe
- Requested stop stage: requirement_doc
- Requested grade floor: none
- Selected pack: orchestration-core
- Router-selected skill: vibe
- Runtime-selected skill: vibe
- Route mode: pack_overlay
- Route reason: candidate_signal_auto_route
- Confirm required: False

## Specialist Decision
- Governed `vibe` must explicitly record whether specialist execution is happening, stayed advisory, or remained unresolved before closeout.
- Decision state: approved_dispatch
- Resolution mode: approved_dispatch
- Notes: Bounded specialist recommendations were surfaced and promoted into effective approved dispatch.

## Specialist Recommendations
Raw router candidates remain in `runtime-input-packet.json` for audit and are not frozen as user-facing requirements.
Only host-adopted or effective approved specialist dispatch is shown here; non-adopted candidates and stage assistants stay out of the requirement surface.
- Adopted Skill: scrapling
  Role: specialist_assist; native usage required: True; preserve workflow: True
  Binding: profile=default; phase=in_execution; lane policy=inherit_grade; parallel in XL=True
  Write scope: specialist:scrapling; review mode: native_contract; execution priority: 50
  Reason: top ranked specialist candidate from pack 'web-scraping' via fallback_task_default
  Required inputs: bounded specialist subtask contract, frozen requirement context, relevant source files or domain artifacts
  Expected outputs: bounded specialist findings or code changes, verification notes aligned with the specialist skill
  Verification expectation: Preserve the specialist skill's native workflow, boundaries, and validation style.
- Adopted Skill: tdd-guide
  Role: specialist_assist; native usage required: True; preserve workflow: True
  Binding: profile=default; phase=in_execution; lane policy=inherit_grade; parallel in XL=True
  Write scope: specialist:tdd-guide; review mode: native_contract; execution priority: 50
  Reason: top ranked specialist candidate from pack 'code-quality' via fallback_task_default
  Required inputs: bounded specialist subtask contract, frozen requirement context, relevant source files or domain artifacts
  Expected outputs: bounded specialist findings or code changes, verification notes aligned with the specialist skill
  Verification expectation: Preserve the specialist skill's native workflow, boundaries, and validation style.

## Specialist Consultation
These are specialists resolved for discussion-time handling under governed `vibe` before this requirement doc was frozen. Depending on policy, they may be consulted live or routed for direct current-session loading.
- Consulted Skill: scrapling
  Why now: top ranked specialist candidate from pack 'web-scraping' via fallback_task_default
  Loaded from: C:\Users\16643\.claude\skills\vibe\bundled\skills\scrapling\SKILL.runtime-mirror.md
- Consulted Skill: tdd-guide
  Why now: top ranked specialist candidate from pack 'code-quality' via fallback_task_default
  Loaded from: C:\Users\16643\.claude\skills\vibe\bundled\skills\tdd-guide\SKILL.runtime-mirror.md

## Unified Specialist Lifecycle Disclosure This unified disclosure keeps routing truth, consultation truth, and execution truth separate while showing one user-readable specialist timeline.  ### discussion_routing - Skill: scrapling   State: routed   Why now: top ranked specialist candidate from pack 'web-scraping' via fallback_task_default   Loaded from: C:\Users\16643\.claude\skills\vibe\bundled\skills\scrapling\SKILL.runtime-mirror.md - Skill: tdd-guide   State: routed   Why now: top ranked specialist candidate from pack 'code-quality' via fallback_task_default   Loaded from: C:\Users\16643\.claude\skills\vibe\bundled\skills\tdd-guide\SKILL.runtime-mirror.md  ### discussion_consultation - Skill: scrapling   State: routed_pending_current_session   Why now: top ranked specialist candidate from pack 'web-scraping' via fallback_task_default   Loaded from: C:\Users\16643\.claude\skills\vibe\bundled\skills\scrapling\SKILL.runtime-mirror.md - Skill: tdd-guide   State: routed_pending_current_session   Why now: top ranked specialist candidate from pack 'code-quality' via fallback_task_default   Loaded from: C:\Users\16643\.claude\skills\vibe\bundled\skills\tdd-guide\SKILL.runtime-mirror.md

## Memory Context
Bounded stage-aware memory context injected into requirement freezing:
- Disclosure level: decision_focused
- Capsule [1fc6c37a274f5979] Cognee relation: vibe-enter-unattended-mode-context-build-linkao-mvp-ai-exam-revi specified_by 2026-05-10-vibe-enter-unattended-mode-context...
  Owner: Cognee
  Why now: Matched Cognee memory for requirement_doc.
  Expansion Ref: I:\514claude\linkao\outputs\runtime\vibe-sessions\20260513T030155Z-c94fa082\memory-backend\cognee-read-response.json#1fc6c37a274f5979
  Summary: Cognee relation: vibe-enter-unattended-mode-context-build-linkao-mvp-ai-exam-revi specified_by 2026-05-10-vibe-enter-unattended-mode-context-build-linkao-mvp-ai-exam-revi.md
  Summary: specified_by
