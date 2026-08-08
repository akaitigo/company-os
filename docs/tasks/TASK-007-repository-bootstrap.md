# Implementation Contract: TASK-007 Repository Bootstrap

## Objective

Milestone 0のarchitectureを検証できる最小monorepo、CI、local environment、vertical sliceを構築し、リポジトリを委任可能性Level 0からLevel 1へ上げ、pilotを経てLevel 2判定可能にする。

## Current State

- base branch: `main`
- current branch: `main`（TASK-007開始時に`task/007-repository-bootstrap`を作る）
- current HEAD: unborn branch（Milestone 0成果物は未commit）
- upstream: なし
- worktree: Milestone 0文書のみ。所有者はCodex/ユーザー
- current delegation level: Level 0
- product code: なし
- successful verification: `./scripts/verify-spec`
- CI: なし

TASK-007開始前にMilestone 0をreview/commitし、base SHAをこの節へ固定する。

## Decision

- ADR-001: Modular Monolith + Event-driven Integration
- ADR-002: strict TypeScript、Node.js Active LTS、NestJS/Fastify、Next.js、PostgreSQL
- ADR-003: Keycloak/Managed IdPで認証、Company OSでresource authorization/SoD
- ADR-004: PostgreSQL transaction + outbox/inbox
- ADR-005: constrained versioned compliance DSL + typed evaluator
- ADR-006: DEV/SMB/ENT deployment profile

初期ORMはDrizzleを第一候補とし、同一vertical sliceでPrismaとのmigration/transaction/query comparisonを記録して最終確定する。新規依存はlockfile、license、maintenance、SCAを確認してから追加する。

## Invariants

- domain layerはNestJS、ORM、HTTP、queueをimportしない。
- moduleは他moduleの内部file/tableへ直接依存せずpublic API/eventだけを使う。
- tenant/resource authorizationは全server command/queryに適用する。
- aggregate変更、outbox、P0 audit intentは同一DB transactionにする。
- moneyはJS `number`で永続・計算せず、decimal value object + PostgreSQL numericを使う。
- published RuleVersion、posted Journal、AuditEventをUPDATE/DELETEしない。
- unknown applicabilityを`not_applicable`へ変換しない。
- C4 payloadをlog、trace、generic search、eventへ複製しない。
- external timeoutをsuccessにせず、blind retryしない。
- migrationでproduction schemaをdrop/recreateして回避しない。
- local sample dataに実在個人・口座・credentialを含めない。

## Scope

### Repository foundation

- pnpm workspace、Node.js Active LTS pin、TypeScript strict config
- `apps/web`, `apps/api`, `apps/worker`
- `modules/organization`, `modules/authorization`, `modules/audit`, `modules/integration`
- `packages/kernel`, `packages/contracts`, `packages/testing`, `packages/ui`
- formatter、lint、typecheck、unit/integration/architecture test、build
- Docker Compose: PostgreSQL、Keycloak、MinIO、Mailpit、OTel Collector
- `.env.example` placeholder、secret generation/local ignore
- GitHub Actions、Dependabot/Renovate候補、CodeQL/SCA/SBOM/container scan
- Issue/PR/Implementation Contract templates
- `docs/ARCHITECTURE.md`, `SECURITY_BOUNDARY.md`, `OPERATIONS.md`へのcanonical routing
- `./scripts/verify`でlocal/CI共通検証

### Vertical slice

`Create Organization Unit → authorize → persist aggregate + audit intent + outbox → worker projection → authorized query`

- OrganizationUnitはeffective-dated、opaque ID、tenant scope、optimistic versionを持つ。
- Policyはseed済みの最小role/scope rule。UI非表示だけに依存しない。
- outbox consumerはduplicate/replayへ冪等。
- audit projectionはC4 markerを拒否し、actor/action/resource/decision/requestを保持。
- Webはaccessible form/listとerror/focus handlingを持つ。

## Non-goals

- HR、Attendance、Procurement、AP、GLの業務実装
- Full rule DSL、Legal Catalog editor、Retention deletion
- SaaS billing/multi-tenant control plane
- Kubernetes/HA/production deployment
- IdP custom extension、MFA/credential実装
- microservice分割
- TASK-007外のrefactorやdependency導入

## Required Tests

### Unit

- OrganizationUnit effective period、code reuse、optimistic version
- authorization allow/deny/undetermined、self-escalation deny
- outbox envelope/idempotency key、audit redaction

### Integration

- PostgreSQL migration apply from empty DB
- aggregate + outbox + audit intent atomic commit/rollback
- duplicate event delivery、worker crash/lease expiry/retry
- cross-tenant command/query deny
- closed/superseded organization version query

### Architecture

- cross-module private import禁止
- domain→framework/ORM/network import禁止
- owner以外のschema migration/write禁止
- API route authorization metadata欠落検出

### E2E

- Keycloak login後、権限ありuserがunit作成・一覧表示
- 権限なしuser、他tenant user、stale versionを拒否
- keyboard/focus/accessibility smoke

### Security/failure injection

- C4 marker/token/secretがlog/event/auditへ出ない
- DB commit failureでaggregate/outbox/audit intentが部分確定しない
- worker duplicate/restartでprojectionが重複しない
- IdP/JWKS unavailable・key rotation・invalid issuer/audience

### Operations

- backup→data mutation/delete→restore smoke
- migration rollbackまたはforward-fix rehearsal
- SIGTERM drain、readiness dependency failure

## Commands

TASK-007で以下を正規commandとして実装する。

```bash
./scripts/verify
docker compose up -d
./scripts/test-integration
./scripts/test-e2e
./scripts/test-restore
```

`./scripts/verify`はformat check、lint、typecheck、unit、architecture、schema/migration diff、dependency/license/security scan、production build、generated diffを実行する。

## Acceptance Criteria

- [ ] clean cloneからdocumented commandだけでDEV環境を起動できる。
- [ ] `./scripts/verify`がlocalとCIで成功する。
- [ ] vertical sliceの正常・拒否・重複・rollback・cross-tenant testが成功する。
- [ ] architecture fitness functions FIT-ARCH/DATA/AUTH/AUD/EVT/PRV/MIGを自動化する。
- [ ] migration、backup/restore、rollback/forward-fixの証跡がある。
- [ ] SBOM、license、SCA、SAST、secret scan、container scanを実行する。
- [ ] README/Architecture/Security/Operationsが実装と一致する。
- [ ] 実行済み/未実行検証、環境依存項目、残存riskを報告する。
- [ ] Level 1 pilot IssueとImplementation Contractを1件作れる状態になる。

## Rollback / Fail-closed

- application: previous signed artifactへ戻す。ただしnew schema readable windowを維持。
- schema: expand migrationを原則とし、data-lossを伴うdown migrationを自動実行しない。forward-fixを優先。
- IdP unavailable: 新規authenticationはfail closed。開発用bypassをproduction buildへ含めない。
- Authorization/Audit unavailable: P0 commandはfail closed。
- Worker unavailable: API commitはoutbox pendingとして継続、queue age alert。不可逆external actionは未実行。
- Object scanner unavailable: attachmentはquarantineのまま公開しない。

## Stop Conditions

以下では推測で進めずCodexへ返す。

- ADR、Domain Model、NFRを変更しないと実装できない。
- ORM comparisonでtransaction/migration invariantを満たせない。
- 新規dependency/licenseが未承認、放棄、または重大脆弱性未評価。
- schema/API/auth/privacy boundaryのscope拡大が必要。
- testを削除、skip、過度にmockしないと成功しない。
- secret、実データ、既存変更との競合を発見した。
- acceptance criteria同士が矛盾する。

## Completion Report

1. 変更内容
2. 検証commandと結果
3. Contractとの差異
4. Security/Privacy/Operations/Performanceの残存risk
5. 変更file一覧
6. 現在のdelegation levelと次pilot

