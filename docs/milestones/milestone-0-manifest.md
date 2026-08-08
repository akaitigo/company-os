# Milestone 0: Company OS Specification v0.1 Manifest

## Completion boundary

Milestone 0は「全日本法令の調査完了」ではなく、次を満たす実装前baselineである。

1. 全企業能力と論理Systemを網羅的に分類する。
2. Phase 1〜4のdomain/architecture境界を決定する。
3. P1〜4で最初に扱う代表的なP0法令要件を公式一次情報から構造化し、rule/schema/matrix/testへのtraceabilityを実証する。
4. 未調査法令・適用解釈・専門家確認を明示的backlog/statusとして残し、「完全対応」を主張しない。
5. TASK-007を設計判断なしで開始できるImplementation Contractとdelegation gateを作る。

Payroll full calculation、社会保険申告、会社統治、消費者、小売等の個別法令をすべてMilestone 0で確定することは非目標であり、それぞれの実装Phase前のDefinition of Readyとする。

## Artifact manifest

| Artifact ID | Required deliverable | Evidence | Status |
| --- | --- | --- | --- |
| M0-001 | Initial Gap Analysis | `docs/reviews/initial-gap-analysis.md` | complete |
| M0-002 | Business Capability Map | `docs/domains/business-capability-map.md` | complete / expert review pending |
| M0-003 | System Catalog | `docs/domains/system-catalog.md` | complete / legal dependencies evolve |
| M0-004 | Law Catalog | `docs/compliance/law-catalog.md` | v0.1 complete / backlog explicit |
| M0-005 | Requirement Catalog/schema | `docs/compliance/legal-requirement-catalog.md`, `compliance/requirements/*.yaml` | v0.1 complete / expert review flags |
| M0-006 | Applicability Matrix | `docs/compliance/applicability-matrix.md` | v0.1 complete / expansion required per phase |
| M0-007 | Retention Matrix | `docs/compliance/retention-matrix.md` | v0.1 complete / unresolved schedules flagged |
| M0-008 | Data Classification | `docs/security/data-classification.md` | complete |
| M0-009 | Master Data Ownership | `docs/data-model/master-data-ownership.md` | complete |
| M0-010 | Role/SoD Matrix | `docs/governance/role-sod-matrix.md` | complete / staffing review pending |
| M0-011 | Integration Map | `docs/integrations/integration-map.md` | complete / provider details deferred |
| M0-012 | NFR | `docs/requirements/non-functional-requirements.md` | complete / TASK-007 benchmark pending |
| M0-013 | Threat Model | `docs/security/threat-model.md` | complete / implementation review pending |
| M0-014 | Glossary | `docs/glossary/glossary.md` | complete |
| M0-015 | Phase 1〜4 Domain Model | `docs/data-model/domain-model.md` | complete / expert review pending |
| M0-016 | Architecture Draft | `docs/architecture/architecture-draft.md` | complete / vertical slice pending |
| M0-017 | Technology Evaluation | `docs/architecture/technology-evaluation.md` | complete / version recheck at TASK-007 |
| M0-018 | Initial ADR | `docs/adr/ADR-001-*.md`〜`ADR-006-*.md` | complete |
| M0-019 | TASK-007 Contract | `docs/tasks/TASK-007-repository-bootstrap.md` | complete |
| M0-020 | Delegation Gate | `docs/plans/delegation-readiness.md` | complete |
| M0-021 | Control Catalog | `docs/compliance/control-catalog.md` | complete / operation pending |
| M0-022 | Compliance Test Catalog | `docs/compliance/compliance-test-catalog.md` | complete / automation per phase |

## Status semantics

- `complete`: Milestone 0の定義範囲で受け入れ条件を満たす。
- `expert review pending`: 商用/実運用前に資格ある専門家または担当実務家が確認する。
- `TASK-007 pending`: 実装証拠を必要とし、仕様完成を妨げないがLevel 0継続理由になる。
- `backlog explicit`: 未調査を適用済みと誤認せず、Law Catalogに優先度付きで管理する。

## Milestone acceptance

- [x] TASK-001〜006の成果物が存在し、相互参照されている。
- [x] 全必須横断成果物がmanifestに登録されている。
- [x] Requirementはofficial URL、legal reference、effective/verified date、status、traceabilityを持つ。
- [x] 確認済み・未確認・要専門家レビューを区別している。
- [x] Phase 1〜4のaggregate、invariant、event、transaction/ownershipを定義している。
- [x] Architecture/Technology/ADRに代替案、trade-off、rollback/revisit triggerがある。
- [x] TASK-007 ContractとLevel 0→2 gateがある。
- [x] `./scripts/verify-spec`が全検証に成功する。
- [x] 完了auditでmanifestの全required evidenceを再確認する。
