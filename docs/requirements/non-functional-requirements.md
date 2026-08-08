# Non-functional Requirements

## 状態とProfile

- 状態: **Milestone 0 baseline / TASK-006で実現方式を確定**
- 基準日: 2026-08-09
- 数値は参照実装の初期budgetであり、実測後にADRで更新する。

| Profile | 想定 | Availability target | Data scale baseline |
| --- | --- | --- | --- |
| DEV | local/demo、非本番 | best effort | 1 company、100 workers、1万transactions |
| SMB | single tenant/self-host/cloud small | 月99.5%（計画停止除外） | 1 legal entity、1,000 workers、年100万transactions |
| ENT | architecture/referenceのみ | 目標99.9%、個別設計 | 100 entities、10万workers、年1億transactions |

## Requirements

| NFR ID | Category | Requirement | Measure / Acceptance | Priority |
| --- | --- | --- | --- | --- |
| NFR-SEC-001 | Authentication | production profileはfederated IdPとMFAを使用 | local passwordをproductionで無効化できる | P0 |
| NFR-SEC-002 | Authorization | 全command/queryをserver-side policy decisionで保護 | deny/allow/undeterminedとdecision IDをtest | P0 |
| NFR-SEC-003 | Encryption | transit TLS、at-rest managed encryption、C4独立key境界 | plaintext secret/credentialのrepository・log混入ゼロ | P0 |
| NFR-SEC-004 | Input | file/API/importにsize、type、rate、timeout上限 | oversized/zip bomb/formula injection/SSRF test | P0 |
| NFR-SEC-005 | Supply chain | lockfile、SBOM、SAST/SCA、artifact provenance | releaseごとにSBOMとscan、critical未評価ゼロ | P0 |
| NFR-PRV-001 | Data minimization | purposeとclassificationに不要なfieldを収集・複製しない | C4 event/log payload allowlist test | P0 |
| NFR-PRV-002 | Data rights | search/export/correct/restrict/deleteをcase化 | action、exception、identity proofをaudit可能 | P1 |
| NFR-AUD-001 | Audit | 重要commandはactor/time/before-after ref/reason/rule/decisionを記録 | 欠落時command fail closed対象をcontract test | P0 |
| NFR-REL-001 | Transaction | domain invariantはlocal ACID transactionで確定 | failure injectionでpartial domain stateゼロ | P0 |
| NFR-REL-002 | Messaging | outbox/inbox、at-least-once、idempotent consumer | duplicate/reorder/replay test | P0 |
| NFR-REL-003 | External calls | timeout/retry/backoff/circuit/reconciliationを接続別設定 | 無制限retryゼロ、timeout後二重確定ゼロ | P0 |
| NFR-REL-004 | Backup/Restore | DB/object/config/key refの整合したrestoreを検証 | SMB: RPO 24h以下、RTO 8h以下の四半期演習 | P0 |
| NFR-REL-005 | Migration | expand/migrate/contractとrollback/forward-fixを文書化 | production相当copyでmigration test | P0 |
| NFR-PERF-001 | Interactive API | page query p95 500ms、command p95 1s（外部待ち除外） | SMB baseline loadで計測 | P1 |
| NFR-PERF-002 | Pagination | listはcursor/page上限100、unbounded query禁止 | API/schema/static check | P0 |
| NFR-PERF-003 | Export | sync最大1万行/25MiB、超過はasync、最大100万行/1GiB | limit/authorization/cancel/expiry test | P0 |
| NFR-PERF-004 | File | default最大25MiB、archive展開禁止、必要時contractで個別拡張 | boundary test | P0 |
| NFR-PERF-005 | Batch | jobはtenant/resourceで一意、checkpoint/restart可能 | kill/retry/duplicate test | P1 |
| NFR-OBS-001 | Correlation | request/job/eventにcorrelation/causation ID | API→event→job→external attemptをtrace可能 | P0 |
| NFR-OBS-002 | Telemetry | structured log、RED/USE metrics、trace、business control metrics | C4/credential leak test、alert exercise | P0 |
| NFR-OPS-001 | Health | startup/readiness/livenessを分離 | dependency failureで適切にtraffic停止/縮退 | P0 |
| NFR-OPS-002 | Shutdown | inflight request/jobを最大30秒drainしleaseを回復 | termination integration test | P1 |
| NFR-OPS-003 | Configuration | schema検証、version、approval、last-known-good rollback | invalid config deployを拒否 | P0 |
| NFR-ACC-001 | Accessibility | Web UIはWCAG 2.2 AAを目標 | keyboard、focus、name/role/value、contrast test | P1 |
| NFR-I18N-001 | Locale | business timezone、currency、language、jurisdictionを明示 | Asia/Tokyo境界、DST locale、JPY rounding test | P1 |
| NFR-COMP-001 | Rule reproducibility | effective-dated ruleと入力snapshot/hashで過去結果を再現 | historical compliance test | P0 |
| NFR-MTN-001 | Maintainability | module dependencyを自動検査し循環禁止 | architecture test | P0 |

## Error budgets and degradation

- IdP unavailable: 新規authはfail closed。既存session方針はtoken expiry内、high-risk commandは再認証要求。
- Object storage unavailable: metadata commandは`pending_content`まで、download/確定は停止。
- Notification unavailable: business transactionをrollbackせずdelivery pendingを明示。ただし法定通知deadlineをalert。
- Reporting unavailable: SoR commandは継続し、reportにstale watermarkを表示。
- Audit unavailable: P0重要commandはfail closed、read-only低risk queryは継続可。

## 受け入れ条件

- [x] Security、Privacy、Reliability、Performance、Observability、Operationsを数値/検証可能にした。
- [x] DEV/SMB/ENT profileを分離した。
- [x] 外部障害時の縮退とfail-closed対象を定義した。
Post-Milestone gate: TASK-007 technology prototype/benchmarkでbudget妥当性を確認する（pending）。
