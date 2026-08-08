# ADR-004: PostgreSQLを正本としTransactional Outboxから統合を開始する

**日付**: 2026-08-09  
**ステータス**: 承認済み  
**決定者**: Codex（Milestone 0設計責任）

## コンテキスト

Phase 1〜4はlocal transaction、会計整合、workflow、external adapterを必要とする。初期からKafka等を必須にするとDEV/SMB運用が重くなるが、DB commit後のevent lossや二重配送は許容できない。

## 決定要因

- aggregate stateとevent intentをatomicに確定する。
- at-least-once/idempotency/replay/reconciliationを実証する。
- DEV/SMB component数を抑える。
- 将来brokerへ接続できるstable message contractを持つ。

## 検討した選択肢

### 選択肢A: commit後に直接publish
**メリット**: 単純。  
**デメリット**: crash windowでevent loss、外部待ちでtransaction問題。

### 選択肢B: PostgreSQL outbox/inbox
**メリット**: local atomicity、少ない運用component、replay可能。  
**デメリット**: DB polling負荷、ordering/retentionを自前運用。

### 選択肢C: Kafka/RabbitMQを初期必須
**メリット**: routing/stream/replay/scale。  
**デメリット**: DBとのdual-write、local/SMB運用負荷。

## 決定

**選択肢B**を採用する。PostgreSQLをbusiness SoRとし、aggregate更新とoutboxを同一transactionへ入れる。workerがleaseしてinternal consumerまたはexternal adapterへat-least-once配送する。

## 結果

**ポジティブ**: message loss windowをなくし、低コストでrecoveryを検証。  
**ネガティブ/トレードオフ**: high-volume stream用途には限界。  
**リスク**: outbox肥大、poison message、worker競合、consumer非冪等。

## 実装メモ

- event ID、aggregate/version、schema version、classification、payload hashを必須化。
- `SKIP LOCKED`相当lease、bounded batch/concurrency、attempt/backoff/next_at、DLQ/reconciliation。
- inbox unique(event ID, consumer)でdeduplicate。
- outbox retention/archiveとoldest-age alertを設定。
- broker移行時もproducer transaction/outboxは維持し、relay先だけ切替可能にする。

