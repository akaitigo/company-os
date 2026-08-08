# Operations

## 起動とhealth

`.env.example`を基に全placeholderを生成値へ置換し、`docker compose up -d --wait`で依存serviceを起動します。API livenessは`GET /health/live`です。demo dataは`./scripts/seed-demo`で冪等投入できます。demo credentialは保存されず、E2E時に一時生成されます。

## Deploy

1. backup取得とrestore rehearsal成功を確認する。
2. immutable image digest、SBOM、security scan、CI結果をreleaseへ紐付ける。
3. forward migrationをowner roleで適用し、各`*.verify.sql`を実行する。
4. API/worker/Webを順に展開し、health、OIDC、outbox lag、error rateを確認する。

## Rollback / forward-fix

migration fileは変更・削除しません。schema変更後の旧binary互換性がある場合だけapplicationをrollbackします。データmigration後はbackup restoreまたは新しいforward-fix migrationを使い、posted/audit evidenceをupdate/deleteしません。仕訳訂正はreversal、勤怠訂正はcorrected entry、rule変更は新versionです。

## Backup / recovery

PostgreSQLは暗号化backupとPITR、外部S3-compatible object storeはversioning/replicationをproduction要件とします。MinIO Communityのprebuilt imageは2026年に保守終了したため同梱しません。`./scripts/test-restore`がlogical backupのrestoreを検証します。復旧後はtenant policy、journal balance、append-only trigger、outbox未処理件数、object checksumを確認します。

## Incident runbook

- IdP/JWKS停止: 新規API requestはfail closed。復旧までwriteを受理しない。
- DB障害: writeを停止し、primary/restore整合性確認後にworkerを再開する。
- outbox滞留: API正本は維持し、consumerを冪等再実行する。dead-letter前に20回上限を確認する。
- credential漏洩: revoke/rotate、session無効化、audit範囲特定、security advisory手順を開始する。
- tenant漏洩疑い: 対象serviceを隔離し、auditを保全し、法務/privacy担当へ非公開連絡する。

RPO/RTO、on-call、region、通知先はdeploy組織が明示的に設定する必要があります。
