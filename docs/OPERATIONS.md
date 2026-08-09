# Operations

## 起動とhealth

`.env.example`を基に全placeholderを生成値へ置換し、`docker compose up -d --wait`で依存serviceを起動します。API livenessは`GET /health/live`、Webは`GET /api/health/live`と`GET /api/health/ready`です。demo dataは`./scripts/seed-demo`で冪等投入できます。demo credentialは保存されず、E2E時に一時生成されます。

## Web standalone artifact

`pnpm --filter @company-os/web build`は`dist/web`へstandalone server、`.next/static`、`public`、全fileの`MANIFEST.sha256`とそのidentityである`ARTIFACT.sha256`を生成します。VM/localとCIは`./scripts/start-web`を唯一のproduction entrypointとして使います。`SESSION_SECRET`（32文字以上）、`OIDC_ISSUER`、`OIDC_CLIENT_ID`、`OIDC_REDIRECT_URI`、`API_INTERNAL_URL`をsecret managerまたはruntime設定から注入します。loopback以外のOIDC issuer/redirectはHTTPS必須です。

containerは`docker build -f infra/containers/web.Dockerfile -t company-os-web:<release> .`でbuildします。runtimeはUID/GID 10001、`docker save | gzip`で100 MiB以下の転送sizeをCIで強制し、`--read-only --tmpfs /tmp:rw,noexec,nosuid,size=16m`で起動可能です。Docker engine間で意味が異なる`.Size`は参考値として圧縮sizeと併記します。imageへsecretをbuild argやENVとして保存しません。health probeは`/api/health/ready`、停止猶予は10秒とします。`./scripts/test-web-artifact`が改変・設定不備・read-only・CSP・static・health・SIGTERMを、`./scripts/test-web-container`が実imageを検証します。

## Deploy

設定の機械可読な正本は`infra/config/deployment-contract-v1.json`です。`DEPLOYMENT_PROFILE=SMB`では`DATABASE_URL`をapplication runtime、`MIGRATION_DATABASE_URL`をmigration owner専用にし、別user、`sslmode=verify-full`、信頼するCAを設定します。runtimeは`company_os_app`のmemberですがsuperuser/BYPASSRLSではなく、`migration` schemaへUSAGEを持ちません。ownerはdatabase CREATEとmigration ledgerを所有しますが`company_os_app`のmemberにはしません。秘密値はsecret managerまたは権限を限定したenvironment injectionで渡し、command line、image、JSON証跡へ保存しません。

`./scripts/preflight validate`は完全にofflineでrequired field、placeholder、URL/TLS、role分離、Node版を検査します。`./scripts/preflight check`はさらにDB権限、OIDC discoveryのexact issuer/HTTPS endpoint、telemetry TCP、Web artifact checksumを各5秒timeoutでread-only検査します。標準出力は固定check ID/codeだけのredacted JSONです。release/change recordには`contractVersion`とJSON証跡を保存し、終了statusが非zeroならdeployを停止します。preflightはgrant、migration、realm同期、secret rotationを実行しません。

1. release artifactと同じrevisionで`./scripts/preflight validate`を実行し、設定不備を修正する。
2. owner接続で`./scripts/migrate status`を実行する。`untracked_existing`は一度だけ`adopt`し、`drift`・`running`・`failed`は解消するまでdeployを停止する。
3. secret managerから32文字以上の`MIGRATION_BACKUP_SIGNING_KEY`を注入し、PostgreSQLと同版の`pg_dump`を使う`./scripts/backup`でbackup artifactとHMAC署名manifestを生成してrestore rehearsal成功を確認する。本番の`apply`/`adopt`/`recover`は署名、対象DB名、24時間以内の取得時刻、archive形式、artifact SHA-256が一致するmanifestだけを受理する。緊急時のみ`MIGRATION_ALLOW_WITHOUT_BACKUP=true`を外部変更記録付きで使う。
4. `DEPLOYMENT_PROFILE=SMB MIGRATION_DATABASE_URL="$MIGRATION_DATABASE_URL" MIGRATION_BACKUP_EVIDENCE=/secure/path/database.dump.manifest ./scripts/migrate apply`をowner roleで実行する。外部DB/VM/Kubernetes jobではpreflightと同じ`MIGRATION_DATABASE_URL`をsecret injectionし、URL queryの`sslmode=verify-full`と`sslrootcert`を維持する。DEV Composeおよび従来の運用では`PGHOST`、`PGPORT`、`PGUSER`、`PGPASSWORD`またはpassfile、`MIGRATION_DATABASE`も利用できる。台帳導入前のN-1環境は、実際に導入済みのversionを`MIGRATION_ADOPT_THROUGH=0006 ./scripts/migrate adopt`のように明示してから`apply`する。
5. Keycloak database backupとrestore rehearsalを確認し、secret managerから`KC_CLI_PASSWORD`（またはservice account用`KC_CLI_CLIENT_SECRET`）を注入する。`./scripts/reconcile-keycloak plan`のJSON Lines差分をreview後、`./scripts/reconcile-keycloak apply`を実行する。外部Keycloakでは`KEYCLOAK_KCADM`、`KEYCLOAK_URL`、`KEYCLOAK_ADMIN_REALM`を指定する。
6. migrationとIAM reconciliation後に`./scripts/preflight check > preflight-evidence.json`を実行し、`status=pass`と全connected checkを確認する。
7. `migration_state=applied`、再度のKeycloak `plan`が全件`no-op`、application smoke testを確認する。
8. immutable image digest、SBOM、security scan、CI結果をreleaseへ紐付ける。
9. Webの`ARTIFACT.sha256`、container image digest、sizeをrelease evidenceへ記録する。registry上のdigestでdeployし、tagをrollback identityにしない。
10. API/worker/Webを順に展開し、health、OIDC、outbox lag、error rateを確認する。

### Production runtime bundle（VM）

`infra/runtime/compose.production.yaml`は外部PostgreSQL、Keycloak、OpenTelemetryへ接続するAPI、worker、Webだけを展開し、DB/IdPを作成・変更しません。3 imageはregistryの`@sha256:` digestで指定し、tagや`latest`は`./scripts/runtime-bundle validate`が拒否します。全serviceはUID/GID 10001、read-only rootfs、`/tmp` 16 MiB、capability drop ALL、no-new-privileges、PID 128、CPU/memory上限、10秒停止猶予で動作します。

1. `infra/runtime/production.env.example`をrepository外へコピーし、image digestとHTTPS endpointを設定する。
2. database runtime URL、migration owner URL、session secret、backup signing keyをそれぞれ1行・8192 bytes以下の別fileへ保存する。DB URLの`sslrootcert`はコンテナ内の`/run/secrets/database_ca.crt`を指定し、検証済みCA certificateのhost pathを`DATABASE_CA_CERT_FILE`へ設定する。VM上のservice UID 10001をowner、runtime-bundle実行者の専用groupをgroupとし、mode 0440にする（例: `chown 10001:company-os-operator`、`chmod 0440`）。group writeとother accessは禁止する。値をenvironment file、Compose command、imageへ記載しない。
3. 同じreleaseの`dist/web`を配置し、`./scripts/runtime-bundle validate /secure/company-os/runtime.env`を実行する。offline preflightとCompose renderingの両方が成功しなければ進めない。
4. migration、Keycloak reconciliation、backup rehearsalを上記Deploy手順で完了する。
5. `./scripts/runtime-bundle up /secure/company-os/runtime.env`を実行する。connected preflightが全件passした場合だけ3 serviceを`--wait`で起動する。同じcommandの再実行は同じdigestを再利用する。
6. `./scripts/runtime-bundle evidence /secure/company-os/runtime.env > runtime-evidence.json`でcontract version、digest、health、UID、read-only状態を記録する。このJSONにsecret値は含まれない。

停止は`./scripts/runtime-bundle down /secure/company-os/runtime.env`でapplication container/networkだけを削除します。障害やcredential rotationでsecret/CA fileが失われていても停止できます。DB、IdP、telemetry、secret file、業務データは削除しません。rollbackは直前のruntime environment fileを複製せず、change recordに記録した3 digestへ明示的に差し戻し、connected preflight後に`up`します。

`status`はDBを書き換えません。runnerはDB単位のadvisory lock、SHA-256 ledger、各migrationのverify SQLで二重実行・改変・不完全適用を拒否します。`running`はprocess中断の可能性を示すため`./scripts/migrate recover`でschemaを検証し、成功時のみ`applied`、不一致時は`failed`にします。`apply`はfailed行そのものを再実行せず、より新しい未登録のforward-fixだけを適用できます（failedが残るため終了statusは非zero）。その後`recover`で元のverifyを再検証します。release済みSQLは編集せず、新しいforward migrationを追加して`checksums.sha256`を更新します。

## Rollback / forward-fix

migration fileは変更・削除しません。schema変更後の旧binary互換性がある場合だけapplicationをrollbackします。データmigration後はbackup restoreまたは新しいforward-fix migrationを使い、posted/audit evidenceをupdate/deleteしません。仕訳訂正はreversal、勤怠訂正はcorrected entry、rule変更は新versionです。

Keycloak reconciliationは管理対象role/client/mapper/profile属性を削除せず、途中失敗までのadditive変更も戻しません。desired stateを新versionでforward-fixして再実行します。`company-os-reconcile-lock`がprocess終了後も残る場合は、実行中processがないことを変更記録とKeycloak auditで確認してからKeycloak管理者がそのclientだけを削除し、必ず`plan`から再開します。realm全体の復元はuser/credential/sessionも戻るため、通常の設定誤りでは行いません。

Web rollbackは、直前に記録したimage digestと`ARTIFACT.sha256`の組へ戻します。artifactをサーバー上で編集・再packageせず、新旧imageを並行起動して新規trafficだけを切り戻します。起動前checksum/config検証が失敗した新artifactへtrafficを送らず、旧instanceを継続します。Webは業務正本を持たないためDB rollbackは行いません。

## Backup / recovery

PostgreSQLは暗号化backupとPITR、外部S3-compatible object storeはversioning/replicationをproduction要件とします。MinIO Communityのprebuilt imageは2026年に保守終了したため同梱しません。`./scripts/test-restore`がlogical backupのrestoreを検証し、`./scripts/test-migration-runner`がclean/N-1/adoption/drift/中断/排他/backup gateを実DBで検証します。復旧後はtenant policy、journal balance、append-only trigger、outbox未処理件数、object checksumを確認します。

## Incident runbook

- IdP/JWKS停止: 新規API requestはfail closed。復旧までwriteを受理しない。
- DB障害: writeを停止し、primary/restore整合性確認後にworkerを再開する。
- workerはDB切断時に停止せず、125ms〜30秒のjitter付き指数backoffで再接続する。`GET http://127.0.0.1:3002/health/ready`は切断中503、復旧後200へ自動復帰する。`WORKER_HEALTH_HOST`（既定`0.0.0.0`）と`WORKER_HEALTH_PORT`（既定`3002`）でhealth listenerを設定し、構造化logの`worker.database.disconnected`、`worker.database.retry`、`worker.database.recovered`を監視する。
- outbox滞留: API正本は維持し、consumerを冪等再実行する。dead-letter前に20回上限を確認する。
- credential漏洩: revoke/rotate、session無効化、audit範囲特定、security advisory手順を開始する。
- tenant漏洩疑い: 対象serviceを隔離し、auditを保全し、法務/privacy担当へ非公開連絡する。

RPO/RTO、on-call、region、通知先はdeploy組織が明示的に設定する必要があります。
