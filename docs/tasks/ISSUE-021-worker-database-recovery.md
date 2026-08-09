# ISSUE-021 Worker database recovery implementation contract

## Problem

PostgreSQL再起動時にoutbox workerが未処理のpool errorで終了し、operatorが手動再起動するまでprojection配送が停止する。

## Scope and invariants

- DB切断をprocess終了条件にせず、上限付き指数backoffとjitterで再接続する。
- livenessはprocess生存、readinessは直近DB poll成功を表す。
- 復旧後も既存の`FOR UPDATE SKIP LOCKED`、at-least-once、projection version guardを維持する。
- disconnect、retry、recoveryを機械可読な構造化logとして出力する。

## Acceptance evidence

- backoff境界と切断・復旧state transitionのunit test。
- 実PostgreSQL containerを停止・再開し、worker processが同一PIDで生存、503→200へ復旧、新規outbox eventがprojectionへ配送されるintegration test。
- CI、build、restoreにregressionがない。
