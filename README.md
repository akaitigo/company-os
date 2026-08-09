# Company OS

日本企業の組織・雇用・購買・会計・統制を、tenant分離、権限、監査、適用日、保持、再試行まで一つの設計で扱うApache-2.0 OSS projectです。法的・税務・労務上の助言や、日本法への完全適合を保証する製品ではありません。

> [!WARNING]
> `v1.0.0`は技術アーキテクチャを検証したTechnology Previewです。実機確認の結果、既存SaaSを置換できる製品GAではないと判定しました。現在は[Program Issue #10](https://github.com/akaitigo/company-os/issues/10)と[Product PRD](docs/product/PRD.md)に基づき再構築中です。

## Technology Preview scope

- Platform: Organization/Party、Keycloak OIDC + PKCE、RBAC/SoD、Workflow、Documents metadata/retention、versioned Compliance Rules、append-only Audit、outbox/projection。
- Workforce: employment、attendance corrections、leave request/ledger。
- Source-to-Pay: supplier、requisition、PO/receipt、expense、AP three-way match、payment approval/event evidence。
- Finance: chart of accounts、balanced append-only GL/reversal、AR receipt/application、cost allocation。
- Delivery: Next.js console、NestJS/Fastify API、worker、PostgreSQL RLS、OpenTelemetry、sample company、unit/integration/restore/E2E/security CI。

Full Payroll、bank/government live adapters、tax filing、Governance/Retail、production KMS/PITR/SIEMはV2以降またはdeploy組織の責務です。MinIO Community prebuilt imageは保守終了と未修正Criticalのため同梱せず、document objectはmanaged S3-compatible adapter境界にしています。

## Quick start

前提はNode.js 24、pnpm 9.15.9、Docker Compose、Python 3 + PyYAMLです。

```bash
corepack enable
pnpm install --frozen-lockfile
docker compose up -d --wait
./scripts/seed-demo
./scripts/verify
./scripts/test-integration
./scripts/test-restore
./scripts/migrate status
pnpm exec playwright install chromium
./scripts/test-e2e
./scripts/test-web-container
```

`.env.example`を基に設定し、placeholder credentialは必ず生成値またはworkload identityへ置換してください。demo seedは架空データのみで冪等です。E2E user/passwordは実行時に一時生成され、repositoryへ保存されません。

Webのproduction buildは検証用checksumを含む`dist/web`を生成します。ローカルとVMは必要なruntime環境変数を注入して`./scripts/start-web`、containerは`infra/containers/web.Dockerfile`を使用します。どちらも同じentrypointとstandalone artifactを起動し、`next start`は使用しません。

本番相当の設定は`infra/config/deployment-contract-v1.json`を正本とします。ネットワークへ接続しない`./scripts/preflight validate`で設定を検査し、変更適用前にread-onlyの`./scripts/preflight check > preflight-evidence.json`でDB権限、OIDC discovery、telemetry、Node版、Web artifactを確認してください。SMB profileはruntime DBとmigration ownerを別credentialにし、両方でTLS `verify-full`を必須とします。詳細は[Operations](docs/OPERATIONS.md)を参照してください。

## Security and supply chain

```bash
./scripts/verify-security
```

このcommandはproduction dependency audit、vulnerability/misconfiguration/secret scan、CycloneDX SBOM、Compose image scanを実行します。Trivyは2026年のtag compromiseを踏まえ、incident後のcontainer digestへ固定しています。High/Critical reportとSBOMは`artifacts/`へ生成し、未抑制Criticalを失敗させます。期限付きVEXは[`.trivyignore.yaml`](.trivyignore.yaml)に根拠と失効日を明記します。

脆弱性は公開Issueではなく[Security Policy](SECURITY.md)のprivate reporting経路へ連絡してください。

## Architecture and operations

- [Architecture](docs/ARCHITECTURE.md)
- [Product PRD](docs/product/PRD.md)
- [SaaS replacement parity](docs/product/parity-matrix.md)
- [Machine-readable capability ledger](docs/product/capabilities.json)
- [Capability evidence model](docs/product/capability-evidence.md)
- [Product quality loop](docs/product/quality-loop.md)
- [HTTP API v1](docs/API.md)
- [Security Boundary](docs/SECURITY_BOUNDARY.md)
- [Operations / migration / rollback / incident runbook](docs/OPERATIONS.md)
- [Domain model](docs/data-model/domain-model.md)
- [Role / SoD matrix](docs/governance/role-sod-matrix.md)
- [Compliance applicability](docs/compliance/applicability-matrix.md)
- [Retention matrix](docs/compliance/retention-matrix.md)
- [ADRs](docs/adr/)
- [V1 feature evidence](docs/plans/v1-features.json)

## Contributing

[Contributing guide](CONTRIBUTING.md)、[Code of Conduct](CODE_OF_CONDUCT.md)、[Governance](GOVERNANCE.md)を参照してください。通常変更はDraft PR、`./scripts/verify`、リスクに応じたDB/E2E/security test、green CIを必須とします。

Copyright 2026 Company OS contributors. Licensed under the [Apache License 2.0](LICENSE).
