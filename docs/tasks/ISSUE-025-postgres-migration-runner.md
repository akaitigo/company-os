# Implementation Contract: Issue #25

## Objective

自社情シスがclean DBと既存PostgreSQLの双方を、checksum検証・排他・失敗復旧付きの同一commandで安全にupgradeできるようにする。

## Current state

- Branch `agent/postgres-migration-runner-25`, base `main` at `0ec66a8`。
- SQL 0001–0007は各file内で`BEGIN`/`COMMIT`され、clean DBではDocker entrypointが適用する。
- 既存data volumeではentrypointが再実行されず、migration ledgerもrunnerもない。
- 手動適用済み環境を安全に自動判定できないため、暗黙baselineは禁止する。

## Decisions

- 正本ledgerは`migration.schema_migrations`。version、filename、migration/verify双方のSHA-256、status、開始/終了、errorを保持する。
- 全runner間排他はPostgreSQL session advisory lock `company-os:schema-migrations:v1`で行う。
- `status`は完全read-only。ledger未作成、clean、untracked existing、pending、applied、running、failed、driftを区別する。
- `apply`だけがclean DBのledgerをbootstrapしてpending migrationを順次適用する。
- 手動適用済みDBは`adopt`を明示実行し、各verify SQL成功後だけchecksumを記録する。
- process中断で`running`が残った場合、`recover`がverify成功ならapplied、失敗ならfailedへ遷移する。failedはapplyで再実行せず、forward-fix後のrecoverで再検証する。
- checksum drift、untracked existing、lock競合、verify不一致はfail closed。migration fileを自動で書き換えない。

## Invariants

- 1 versionに1 filename/checksumだけ。applied checksumは変更不可。
- 同時runnerは最大1つだけがmutationを実行する。
- migration SQLは先頭`BEGIN;`・末尾`COMMIT;`、`ON_ERROR_STOP`、forward-onlyを必須にする。
- runnerはcredentialをlogへ出さず、SQL pathはrepository内の連番fileだけを使用する。
- application runtime roleはledger/DDLを変更できない。
- backup成功証拠なしでproduction applyする場合は明示overrideが必要（DEV profileは除外）。

## Scope

- `scripts/migrate`: status/apply/adopt/recover、external URL/Compose接続。
- migration policy、ledger privilege verification、machine-readable status。
- clean、N-1、adoption、drift、concurrency、interruption testとCI。
- OPERATIONS/README/deployment profileのupgrade手順。

## Non-goals

- down migration、自動破壊rollback、Kubernetes operator。
- Keycloak/object/config/key migration（#26等で別管理）。
- release済みmigrationの内容変更を正当化する機構。

## Acceptance criteria

- Issue #25の全criteriaを実DB CIで証明する。
- backup→N-1→current→app smoke→restore/forward-fixを再現する。
- 5 review rounds、Medium以上0、全CI green後のみmergeする。
