# ADR-007: PostgreSQL migrationを台帳・検証・排他で管理する

**日付**: 2026-08-09  
**ステータス**: 承認済み  
**決定者**: Codex（DB migration設計責任）

## コンテキスト

Docker entrypointはclean volumeでしかSQLを適用せず、既存のself-host環境をupgradeできない。業務データを保持したままDEV・SMB・ENTで同じreleaseを適用し、改変・二重実行・process中断・不完全schemaを検出する必要がある。

## 決定要因

- clean DBと既存DBの双方を同じrelease artifactで扱う。
- migrationの内容・順序・適用結果を再現可能にする。
- 複数deploy jobとprocess中断をfail closedで扱う。
- runtime application roleとDDL owner権限を分離する。
- 自動down migrationによるデータ損失を避ける。

## 検討した選択肢

### 選択肢A: Docker entrypointと手動SQL

**メリット**: 追加実装が少ない。  
**デメリット**: 既存volume、排他、改変検知、中断復旧の証跡がない。

### 選択肢B: 外部migration frameworkを追加

**メリット**: 一般的なversion管理機能を利用できる。  
**デメリット**: 新しいruntime依存と生成規則が増え、既存のtransactional SQL/verify資産を移行する必要がある。

### 選択肢C: PostgreSQL台帳とrepository内SQLを使う単一runner

**メリット**: 現行SQLを正本に保ち、Compose・VM・Kubernetes jobで同一commandを利用できる。  
**デメリット**: runnerと状態遷移を自社で保守し、PostgreSQL互換性を継続検証する必要がある。

## 決定

**選択肢C**を採用する。`migration.schema_migrations`へversion・filename・migration/verify双方のSHA-256・状態・時刻・errorを記録し、DB単位のsession advisory lockでmutationを直列化する。`apply`はSQLとverifyの両方が成功した場合だけ`applied`にする。台帳のない既存DBは暗黙baselineせず、全verifyを通す明示的な`adopt`を要求する。

## 結果

**ポジティブ**: upgradeの判断と証跡がDB内に残り、checksum drift、不完全適用、競合を自動停止できる。  
**ネガティブ/トレードオフ**: owner接続と同一majorのclient toolが必要で、migrationはPostgreSQL固有となる。  
**リスク**: verify SQLの網羅性不足、owner credential漏洩、誤ったbreak-glass、DDL commit後かつ台帳更新前の中断。

## 実装メモ

- `status`はread-only、`apply`・`adopt`・`recover`だけが台帳を変更する。
- runtime roleへ`migration` schema権限を与えない。owner credentialはsecret managerまたはPostgreSQL passfileで注入し、引数・log・repositoryへ含めない。
- 各migration SQLは明示transaction、forward-only、対応verifyを必須にし、migrationとverifyの両SQL artifactを固定checksumで保護する。
- DDL commit後の中断は`running`として残す。`recover`はverify成功なら`applied`、失敗なら`failed`へ遷移し、SQLを推測で再実行しない。
- production profileは対象DB名・取得時刻・archive形式・artifact checksumをHMAC署名で結合したbackup manifestを必須とする。署名鍵はsecret managerで分離し、break-glass overrideは外部変更記録へ理由・実行者・時刻を残す。
- `adopt`は指定baselineまでの全verifyと台帳作成を単一transactionで行い、失敗時は未追跡状態へrollbackする。
- rollbackは互換性があるapplication binaryだけを戻す。schemaはbackup restoreまたは新しいforward-fix migrationで復旧し、release済みSQLを変更しない。
- 台帳はmigration audit evidenceであり、DB backup/PITRと同じ保護・保持・アクセス監査の対象にする。

## 受け入れ条件

- [x] clean、既存current、N-1 upgradeを実PostgreSQLで検証する。
- [x] checksum/filename drift、verify失敗、同時実行、中断復旧をfail closedにする。
- [x] application roleがmigration台帳を参照・変更できない。
- [x] backup gate、rollback、forward-fix手順を運用文書へ記載する。
