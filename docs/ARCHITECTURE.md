# Architecture

## 概要

Company OS V1はTypeScript modular monolithです。Next.js WebはOIDC sessionと表示状態だけを所有し、NestJS APIが認証済みcommand boundary、domain modulesが不変条件、PostgreSQLが業務正本、workerがoutbox projectionを所有します。Keycloakはidentity source、OpenTelemetry Collectorはtelemetry出口です。document object本体はS3-compatible managed serviceへのadapter境界とし、V1 repositoryはmetadata、checksum、classification、retentionだけを所有します。

Webのproduction境界は`dist/web`のNext.js standalone artifactです。workspaceやbuild cacheはruntime依存ではなく、static/publicを含むchecksum付きartifactを`start-web`が検証して起動します。同じentrypointをlocal、VM、container、Playwrightで共有し、container filesystemはread-only、processは非rootです。

依存方向は`apps -> modules -> packages`です。domain module間の直接依存は禁止し、共有型はkernel/contractsへ置きます。architecture testがこの方向を検査します。

## データとtransaction

- 正本: `organization`、`party`、`workforce`、`procurement`、`finance`、`workflow`、`compliance`、`documents` schema。
- 同一commandのaggregate、audit intent、outbox eventは1 DB transactionでcommit/rollbackする。
- tenantは検証済みJWT claimから設定し、`SET LOCAL ROLE company_os_app`とRLSで二重に強制する。
- posted journal、rule version、document version、audit/payment/attendance evidenceは訂正またはreversalを追加し、上書きしない。
- projectionは正本ではなく、outbox idempotency keyとsource versionで再構築可能にする。

## 外部境界

OIDC discovery/JWKSとWeb→APIは5〜10秒timeoutでfail closedします。access tokenは15分以下、issuer/audience/algorithm/tenant/roleを検証します。documentは100 MiB上限、rule/event payloadは64 KiB上限です。外部決済・行政提出はV1ではadapter boundaryと証跡modelのみで、実送信しません。

## 変更時の必須検証

- domain/contract: unit + architecture + `./scripts/verify`
- schema/RLS/transaction: forward migration + verify SQL + `./scripts/test-integration` + restore rehearsal
- identity/UI: failure test + `./scripts/test-e2e`
- retention/security: threat model、operations、security scanを同時更新

詳細設計は[architecture draft](architecture/architecture-draft.md)と[ADR](adr/)を参照してください。
