# Implementation Contract: Issue #24

## Objective

Manager/HRが勤怠を追記型で承認・差戻しし、HRが雇用単位の暦月を安全にclose/reopenできる運用確定境界を提供する。

## Current state

- Branch: `agent/attendance-approval-24`, base `main` at `edc8a01`
- Issue: #24, parent Epic #12
- Worktree開始時はclean。Issue #20で任意時刻・休憩・履歴・訂正・employment accessを実装済み。
- `./scripts/verify`、production E2E、PostgreSQL integration、restore、worker recoveryがmain CIで成功済み。

## Decisions

- 勤怠recordは更新せず、`attendance_decisions`へ1 record当たり1回のapprove/rejectを追記する。
- rejectされたrecordは再決定せず、既存のcorrection flowで新recordを作り直す。
- 月次状態は`attendance_period_events`のclose/reopen履歴を正本にする。直接更新するstatus rowは持たない。
- periodはemployment + Asia/Tokyo暦月（毎月1日）で識別する。
- API transactionとDB triggerの両方でclose状態を検証し、application bypassもfail closedにする。
- UI/APIの表示は「運用上の承認・締め」であり、法令・給与計算の適合や完了を意味しない。

## Invariants

- superseded済みrecord、既決record、closed periodのrecordは決定できない。
- 同じrecordへの並行決定は一方だけ成功し、他方は409相当の競合となる。
- closeはcurrent recordがすべてapprovedの場合だけ成功する。recordなしの月はclose可能。
- close中は同月への新規record/correctionをAPIとDBの両境界で拒否する。
- reopenはcurrent stateがclosedの場合だけ、closeはopenの場合だけ成功する。
- approve/reject/close/reopenはactor、時刻、必須reason、audit intent、outbox eventと同一transactionに記録する。
- employeeは承認・締め不可。managerは明示されたemploymentの承認のみ。HRは明示されたemploymentの承認とperiod管理のみ。
- decision/period eventはRLS対象かつUPDATE/DELETE不可。listは100件以下。

## Scope

- Migration `0007`: decision、period event、RLS、append-only、transition/lock trigger。
- Workforce domain: review decisionとperiod transitionの入力不変条件。
- Contracts/API: decision、period transition、attendance read model拡張。
- Web: accessibleなreview status/actionとperiod close/reopen操作。
- Keycloak/authorization: `workforce-hr`とaction境界。
- Unit、integration、role E2E、migration verify、audit/outbox evidence、product evidence。

## Non-goals

- shift/calendar、所定内/残業/深夜/休日計算、給与export。
- delegation、escalation、bulk approval、全team横断queue。
- 法令適合宣言または専門家review完了扱い。

## Required tests

- Unit: reason、transition、role action、schema境界。
- Integration: RLS、append-only、DB bypass lock、close precondition、invalid transition。
- E2E: manager approve/reject、employee denial、HR close/reopen、closed-period record拒否。
- Regression: `./scripts/verify`, `./scripts/test-integration`, `./scripts/test-e2e`, `./scripts/test-restore`。

## Rollback / fail-closed

Migrationはforward-only。新table/triggerを旧applicationが参照しなくてもrecord insertだけはclosed periodを尊重する。triggerまたはcurrent state判定に失敗した場合はwriteを拒否し、openとして推測しない。

## Acceptance criteria

- Issue #24の全criteriaと本契約のinvariantが自動証拠を持つ。
- 5 review roundsでMedium以上の未解決findingが0。
- 全CI green後のみReady化・mergeする。
