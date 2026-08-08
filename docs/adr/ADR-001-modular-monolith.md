# ADR-001: Modular MonolithとEvent-driven Integrationを採用する

**日付**: 2026-08-09  
**ステータス**: 承認済み  
**決定者**: Codex（Milestone 0設計責任）

## コンテキスト

Company OSは19 bounded contexts、法令rule、監査、会計、認可を持つ。一方、初期は個人または小規模teamで開発・運用し、DEV/SMB profileの低コストと一貫したtransactionを優先する。最初からmicroservicesへ分割すると、distributed transaction、service auth、schema/version、observability、deploymentの負荷が実証価値を上回る。

## 決定要因

- Domain Modelのcontext/data ownershipをcodeで保つ必要がある。
- NFR-REL-001/002のtransactionとevent recoveryを実証する。
- 一つのDB clusterで開始しつつ、context間の直接table更新を防ぐ。
- 将来、負荷・組織・security boundaryに基づき一部contextを分離可能にする。
- DEV/SMBの運用component数を抑える。

## 検討した選択肢

### 選択肢A: Layered Monolith

**メリット**: 最小構成、開発開始が速い。  
**デメリット**: domain ownershipがservice/repository層へ横断し、巨大共通modelになりやすい。

### 選択肢B: Modular Monolith + Event-driven Integration

**メリット**: local ACID transaction、低運用負荷、明示的context、outboxによる将来分離。  
**デメリット**: module dependencyとDB accessを自動検査しないと境界が崩れる。

### 選択肢C: Microservices

**メリット**: 独立deploy/scale、強い技術・data boundary。  
**デメリット**: 初期teamに過大なdistributed systems/operations負荷、integration testとlocal setup悪化。

## 決定

**選択肢B**を採用する。business contextはmoduleとして分離し、module内部だけがown schemaを更新する。context間はpublic application APIまたはversioned domain eventで連携する。deployment unitは初期1つだが、background workerをprocessとして分離可能にする。

## 結果

**ポジティブ**: transaction correctnessと開発速度を維持しながらdomain boundaryを検証できる。  
**ネガティブ/トレードオフ**: process/resource障害は共有し、moduleごとの独立scaleはできない。  
**リスク**: shared DBを理由にcross-schema join/writeが増える。architecture testとDB role/schema権限で防止する。

## 実装メモ

1. `modules/<context>`はdomain/application/infrastructure/public APIを持つ。
2. import ruleとarchitecture testで禁止依存・cycleを検出する。
3. aggregate transactionとoutbox appendを同一transactionにする。
4. cross-context readはprojectionまたはowner APIを使う。
5. 分離triggerは独立scale、C4 isolation、release cadence、team ownership、障害隔離のうち2つ以上が継続して必要な場合。
6. rollbackは単一deploy artifactとexpand/contract migrationを用いる。module分離は新ADRなしに実行しない。

