# TASK-006: Technology Evaluation

## 1. 状態と結論

- 状態: **決定済み（ADR-002、ADR-003参照）**
- 評価日: 2026-08-09
- 再評価期限: TASK-007開始時、または採用majorのsupport policy変更時

推奨stack:

- Backend: TypeScript + Node.js Active LTS + NestJS/Fastify adapter
- Frontend: React + Next.js Active LTS
- Monorepo: pnpm workspace + Turborepo（TASK-007で実測し不要ならpnpm scriptsのみ）
- Database: PostgreSQL 18系の最新minor（TASK-007時点）
- ORM/query: Drizzle ORMを第一候補、migration SQLをreview対象にする
- Identity: Local/OSS profileはKeycloak、CloudはOIDC/SAML互換Managed IdPを選択可能
- Object: S3-compatible API（LocalはMinIO、Cloudはmanaged object storage）
- Queue/Event: 初期はPostgreSQL outbox + worker。専用brokerは測定・分離要件発生後
- Policy: application-owned versioned policy/rule engine。認証はIdP、業務認可はCompany OS
- Observability: OpenTelemetry、structured logging、Prometheus-compatible metrics
- IaC: OpenTofu/Terraform compatible modules。Enterprise profileのみHelm/Kubernetes

## 2. 評価基準と重み

1〜5点で評価し、`score × weight`を合計する。点数は要件に対する設計評価であり、市場占有率の精密な統計ではない。

| Criterion | Weight | Company OSでの意味 |
| --- | ---: | --- |
| Domain/type safety | 18 | 金額、期間、状態遷移、不変条件を表現・検査しやすい |
| Development/AI velocity | 16 | 個人開発、code generation、review、上下文共有 |
| Enterprise ecosystem | 14 | auth、DB、migration、job、testing、observability |
| Maintainability/talent | 12 | 採用可能性、可読性、long-term ownership |
| Testing/tooling | 10 | unit/integration/contract/E2E/architecture test |
| Security/support lifecycle | 10 | patch cadence、LTS、dependency visibility |
| Runtime/operations | 8 | memory、startup、container、diagnostics |
| Performance | 6 | SMB baselineとbatch/reportを満たす余力 |
| License/portability | 4 | OSS配布、vendor neutral deployment |
| Frontend sharing | 2 | type/schema/toolchain共有 |

## 3. Backend比較

| Candidate | Type | Velocity | Ecosystem | Talent | Test | Support | Ops | Perf | License | Sharing | Weighted / 500 | 評価 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| TypeScript/Node | 4 | 5 | 5 | 5 | 5 | 4 | 4 | 3 | 5 | 5 | 442 | 採用 |
| Go | 4 | 4 | 4 | 4 | 5 | 4 | 5 | 5 | 5 | 1 | 420 | 有力代替。UI/schema共有が弱い |
| Java | 5 | 3 | 5 | 5 | 5 | 5 | 3 | 4 | 4 | 1 | 418 | Enterprise最有力だが個人開発速度/運用重量で次点 |
| Kotlin/JVM | 5 | 4 | 5 | 3 | 5 | 4 | 3 | 4 | 4 | 1 | 410 | 表現力高いがtalent/tooling複雑性 |
| C#/.NET | 5 | 4 | 5 | 4 | 5 | 5 | 4 | 4 | 5 | 1 | 442 | 同点有力代替。full-stack TS統一でTypeScriptを選択 |
| Rust | 5 | 2 | 3 | 2 | 4 | 3 | 5 | 5 | 5 | 1 | 340 | 性能/安全性は高いが業務開発速度と人材risk |

### TypeScript採用理由

- Web、API contract、validation schema、test fixtureの認知負荷を一言語へ寄せられる。
- Company OSの主要リスクはCPU throughputより、domain境界、authorization、rule version、audit、integration correctnessである。
- Node.js公式はproductionにActive/Maintenance LTSを推奨し、2026-08時点でv24がLTS、v26はCurrentであるため、TASK-007ではv24 latest patchを固定する。
- runtime type消失、`number`、依存増加を弱点として認識し、strict compiler、schema validation、decimal type、dependency budget、architecture testで補う。

### 却下ではなく再検討する条件

- SMB load testでNFR-PERFを満たせず、query/index/async化後もCPU-bound bottleneckが残る。
- enterprise導入主体が.NET/JVM標準化とvendor supportを必須にする。
- Node/TypeScriptのLTSまたは主要framework supportが2回連続で計画より短縮される。
- module境界をschema/API contractで保てず、compile-time enforcementの価値が上回る。

## 4. Frontend比較

| Candidate | Type safety | Enterprise ecosystem | Accessibility/testing | SSR/BFF optionality | Upgrade policy | AI/dev velocity | Result |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| React + Next.js | 5 | 5 | 5 | 5 | 4 | 5 | 採用 |
| Vue + Nuxt | 5 | 4 | 4 | 5 | 4 | 5 | 有力代替 |
| SvelteKit | 5 | 3 | 4 | 5 | 3 | 4 | 小規模には魅力的、enterprise部品/人材で劣後 |

Next.jsを採用するが、business logicとauthorizationをReact Server Component/route handlerへ閉じ込めない。UIはpublic API clientを使用し、backendと独立deploy可能にする。Next.js公式のActive/Maintenance LTSだけをproduction対象とする。

## 5. Database比較

PostgreSQLを採用する。transaction、constraint、JSON、full-text、partitioning、row lock、成熟したbackup/replication ecosystemがPhase 1〜4に適合する。公式version policyはmajorを5年supportし、2026-08時点で18/17/16等がsupportedである。

| Option | 採否 | 根拠 |
| --- | --- | --- |
| PostgreSQL 18 latest minor | 採用 | 2030年までの公式support window、DEV/SMB/ENTを共通化 |
| MySQL | 非採用 | 利用可能だが本projectで複数RDBをsupportする価値が低い |
| Distributed SQL | 非採用 | 初期scaleに不要、transaction semantics/operationsを複雑化 |
| Document DB | 非採用 | 会計・SoD・期間整合・参照整合の中心SoRに不適 |

PostgreSQL majorは固定せず、TASK-007時点で最低4年のsupport残を要求する。minor patchを追従し、major upgradeはrestore/pg_upgrade rehearsalを必要とする。

## 6. ORM / Migration

| Option | Strength | Weakness | Decision |
| --- | --- | --- | --- |
| Drizzle ORM + reviewed SQL migration | TypeScript型、SQL可視性、薄いabstraction | ecosystem/高度機能はSQL知識必須 | 第一候補 |
| Prisma | developer experience、schema/tooling | query/migration抽象化と生成clientの制約 | prototype比較 |
| Kysely + migration tool | SQL型安全、薄い | schema/migration統合を組み立てる必要 | 第二候補 |
| raw SQL only | 完全制御 | boilerplate、mapping/validation負荷 | hot path/特殊queryのみ |

TASK-007のvertical sliceでDrizzleとPrismaを同じschema/query/migration/rollback testにかけ、重大な制約があればADR-002を更新する。migration生成物は必ずreviewし、production schemaを破壊的再生成しない。

## 7. Identity比較

| Option | Local OSS | Enterprise federation | Operational burden | Lock-in | Decision |
| --- | ---: | ---: | ---: | ---: | --- |
| Keycloak | 5 | 5 | 2 | 5 | Local/OSS reference |
| Auth.js | 4 | 3 | 4 | 5 | application login helperとしては有用、enterprise IdP正本には非採用 |
| Managed IdP | 2 | 5 | 5 | 2-3 | Cloud/Commercial profileでadapter選択 |

Keycloakは認証・MFA・OIDC/SAMLを担うが、Company OSのresource authorization/SoDはSYS-AUT-001が担う。Keycloakのminor/major upgradeにはbreaking/deprecationがあり、公式upgrade guideとbackup rehearsalを要求する。preview/non-public APIへ依存しない。

## 8. Queue/Event比較

| Option | Initial complexity | Replay/ops | Scale | Decision |
| --- | ---: | ---: | ---: | --- |
| PostgreSQL outbox + SKIP LOCKED worker | 5 | 4 | 3 | P1〜P4初期採用 |
| RabbitMQ | 3 | 4 | 4 | routing/backpressure要件発生時 |
| Kafka/Redpanda | 1 | 5 | 5 | audit analytics/large event streamが実測で必要時 |
| Cloud managed queue | 4 | 4 | 5 | Cloud profile adapter |

event busを抽象interfaceにしすぎず、outbox/inbox schemaとdelivery semanticsをcontractにする。broker導入はNFR、consumer数、throughput、retention/replay要件をADRで再評価する。

## 9. Deployment/IaC比較

| Profile | Runtime | DB | Object | Identity | Observability | IaC |
| --- | --- | --- | --- | --- | --- | --- |
| DEV | Docker Compose | PostgreSQL | MinIO | Keycloak | OTel Collector + local backends | compose/config |
| SMB | managed container or VM containers | managed PostgreSQL | managed S3 | Keycloak or Managed IdP | managed metrics/logs/traces | OpenTofu/Terraform |
| ENT | Kubernetes option | managed HA PostgreSQL | managed object/KMS | enterprise IdP | SIEM/APM | OpenTofu + Helm |

Kubernetesをcore requirementにしない。self-hostの最低運用単位はcontainer compose + documented backup/restoreとする。

## 10. Official support evidence

| Technology | Official evidence checked | Implication |
| --- | --- | --- |
| Node.js | [Release policy](https://nodejs.org/en/about/previous-releases) | productionはActive/Maintenance LTSのみ。v24 LTSを初期target |
| Go | [Release policy](https://go.dev/doc/devel/release) | 最新2 majorのみsupportのため更新頻度を考慮 |
| Java | [Java SE Support Roadmap](https://www.oracle.com/java/technologies/java-se-support-roadmap.html) | 21/25等LTS。ただしdistribution/licenseを別評価 |
| Kotlin | [Release process](https://kotlinlang.org/docs/releases.html) | release lineのsupport期限を追跡する必要 |
| .NET | [Official support policy](https://dotnet.microsoft.com/en-us/platform/support/policy) | .NET 10 LTSは2028-11まで、latest patch必須 |
| Rust | [Rust Reference release model](https://doc.rust-lang.org/stable/reference/) | 6週release、MSRV/dependency policyが必要 |
| Next.js | [Support policy](https://nextjs.org/support-policy) | Active/Maintenance LTS majorのみ使用 |
| Keycloak | [Upgrading guide](https://www.keycloak.org/docs/latest/upgrading/) | patch以外でdowntime/breaking changeを想定しrehearsal |
| PostgreSQL | [Versioning policy](https://www.postgresql.org/support/versioning/) | major 5年support、minor追従、majorはdata upgrade必要 |

## 11. License policy

- runtime/framework/databaseのlicenseとtransitive licensesをSBOMで検査する。
- Oracle JDK固有licenseへ依存せず、OpenJDK distributionをADR/operationsで固定する。
- AGPL/SSPL/BSL等のnetwork/service制約を持つdependencyは無断採用しない。
- SaaS/managed providerの利用規約、data location、subprocessor、exit/exportをOSS licenseと別に評価する。

## 12. 受け入れ条件

- [x] Backendの指定6候補を同一基準・重みで比較した。
- [x] Frontendの指定3候補を比較した。
- [x] PostgreSQL、Identity、Queue、Deploymentを評価した。
- [x] 人気だけでなく型安全、速度、保守、人材、support、運用、licenseを評価した。
- [x] 公式support情報を2026-08-09時点で確認した。
- [x] 採用案、弱点、mitigation、再検討triggerを示した。
Post-Milestone gate: TASK-007 vertical sliceでORM候補とNFR baselineを実測する（pending）。
