# Capability Evidence Model

## 目的

domain class、table、API、画面のいずれか一つが存在するだけで「実装済み」と判定する誤りを防ぐ。SaaS置換対象の各capabilityは、利用者jobと運用を含む証拠を揃えた場合だけ`verified`になる。

## Status

| Status | 意味 |
| --- | --- |
| `not_started` | 証拠がない |
| `primitive` | domain/schema等の部品だけがある |
| `vertical_slice` | UIから永続化・監査まで正常系が接続済み |
| `operational` | 訂正、失敗、再試行、監視、runbookを含む |
| `verified` | UAT、parallel run、法令/運用証拠までGA gateを満たす |
| `integrated` | 外部SoR/adapterとのcontract、reconciliation、障害処理を検証済み |
| `unsupported` | V1では提供しない。置換可否を阻害する場合GA不可 |

## 必須証拠

| Layer | Required evidence |
| --- | --- |
| User job | Persona、trigger、完了結果、例外、取消/訂正 |
| UX | list/detail/action/history、状態表示、権限/失敗、accessibility |
| Contract | bounded command/query、error、idempotency、compatibility |
| Domain | invariant、state transition、effective date、money/time rule |
| Persistence | migration、constraint、tenant isolation、concurrency、rollback |
| Authorization | role/attribute/ownership/SoD、deny/undetermined、access review |
| Audit/compliance | actor/time/reason/before-after/rule/decision/evidence、retention |
| Integration | timeout/retry/backoff/dead-letter/replay/reconciliation |
| Tests | unit、DB integration、role E2E、negative、race、load、a11y |
| Operations | config、metrics/alert、backup/restore、upgrade/rollback、runbook |
| Validation | UAT owner/date、parallel-run result、known risk acceptance |

## 判定規則

- `verified`は上記11 layerすべてに具体的なrepository evidenceまたは署名済みvalidation recordを必要とする。
- test file一つを複数layerの代用にしない。
- `unknown`、`expert_review_pending`、manual workaroundがあるcapabilityは`verified`にしない。
- 外部integrationを使う場合も、contract test、sandbox/fixture、reconciliation、障害時運用がなければ`integrated`にしない。
- evidence pathは存在確認だけでなく、CIでschema検証する。

