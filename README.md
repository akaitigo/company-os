# Company OS

日本企業の設立・雇用・取引・会計・統制・運営に必要な業務システムを、
法令・業務要件・データ・権限・監査・運用まで追跡可能にするOSS参照実装プロジェクト。

## 現在の状態

Milestone 0「Company OS Specification v0.1」は完了し、V1.0を実装中。
Platform vertical sliceとしてOrganization Unit、tenant認可、監査intent、transactional outbox、冪等worker projectionを実装済み。Workforce、Source-to-Pay、Finance、Web UIは進行中であり、現時点のリリースはまだV1.0ではない。

委任可能性はLevel 1。正規検証、CI、境界テスト、実DB migration/rollback、backup/restoreは成立したが、Level 1 pilot 3件とE2E安定化が未完了のためLevel 2とは判定しない。

## 文書

- [構想原典](COMPANY_OS_CODEX_HANDOFF.md)
- [TASK-001 Initial Gap Analysis](docs/reviews/initial-gap-analysis.md)
- [TASK-001〜006 調査・設計計画](docs/plans/task-001-006-plan.md)
- [TASK-002 Business Capability Map](docs/domains/business-capability-map.md)
- [TASK-003 System Catalog](docs/domains/system-catalog.md)
- [TASK-004 Legal Requirement Catalog（調査中）](docs/compliance/legal-requirement-catalog.md)
- [Law Catalog](docs/compliance/law-catalog.md)
- [Applicability Matrix](docs/compliance/applicability-matrix.md)
- [Retention Matrix](docs/compliance/retention-matrix.md)
- [Control Catalog](docs/compliance/control-catalog.md)
- [Compliance Test Catalog](docs/compliance/compliance-test-catalog.md)
- [Data Classification](docs/security/data-classification.md)
- [Master Data Ownership](docs/data-model/master-data-ownership.md)
- [TASK-005 Phase 1〜4 Domain Model](docs/data-model/domain-model.md)
- [Role / SoD Matrix](docs/governance/role-sod-matrix.md)
- [Integration Map](docs/integrations/integration-map.md)
- [Non-functional Requirements](docs/requirements/non-functional-requirements.md)
- [Threat Model](docs/security/threat-model.md)
- [Glossary](docs/glossary/glossary.md)
- [Technology Evaluation](docs/architecture/technology-evaluation.md)
- [Architecture Draft](docs/architecture/architecture-draft.md)
- [ADR-001 Modular Monolith](docs/adr/ADR-001-modular-monolith.md)
- [ADR-002 TypeScript Stack](docs/adr/ADR-002-typescript-stack.md)
- [ADR-003 Identity / Authorization](docs/adr/ADR-003-external-identity-internal-authorization.md)
- [ADR-004 PostgreSQL Outbox](docs/adr/ADR-004-postgresql-outbox.md)
- [ADR-005 Compliance Kernel](docs/adr/ADR-005-versioned-compliance-kernel.md)
- [ADR-006 Deployment Profiles](docs/adr/ADR-006-deployment-profiles.md)
- [Milestone 0 Manifest](docs/milestones/milestone-0-manifest.md)
- [TASK-007 Implementation Contract](docs/tasks/TASK-007-repository-bootstrap.md)
- [Delegation Readiness Gate](docs/plans/delegation-readiness.md)
- [リポジトリ作業規則](AGENTS.md)

## スコープ

初期対象は日本の一般企業。将来の国際化と業種拡張を妨げない境界を検討するが、Milestone 0では調査成果と設計判断のみを作成する。

## 非目標

- 法的・税務・労務上の助言を提供すること
- 現時点で「日本法へ完全対応」と保証すること
- TASK-001〜006完了前にERP機能を実装すること
- 認証、暗号、電子署名、税務申告、銀行決済を安易に自作すること

## 検証

Milestone 0の仕様検証:

```bash
./scripts/verify-spec
```

このcommandは必須成果物、Requirement YAML/schema fields、ID一意性・参照、Markdown link、System Catalog、Domain Model、ADR、manifestを検証する。Python 3とPyYAMLが必要。

プロダクトコードを含むローカル/CI共通の正規検証は `./scripts/verify`。

```bash
corepack enable
pnpm install --frozen-lockfile
./scripts/verify
./scripts/test-integration
./scripts/test-restore
```

ローカル依存サービスは `docker compose up -d` で起動する。`.env.example`を`.env`へコピーし、placeholder secretは必ず生成値へ置換すること。
