# Glossary

## 状態

- 状態: **Milestone 0共通語彙 v0.1**
- 基準日: 2026-08-09
- 法令用語は日常語と異なる場合があるため、具体的Requirementのsource定義を優先する。

| Term | Definition | Distinction / Owner |
| --- | --- | --- |
| Capability | 企業が成果を出すために持つ能力。組織・製品・実装から独立 | `CAP-*`; Systemではない |
| System | 業務状態またはinteraction/insightに責任を持つ論理システム | `SYS-*`; deployableとは限らない |
| Module | Modular Monolith内のcode/data責任境界 | TASK-005/006で決定 |
| Bounded Context | 用語・model・invariantが一貫するdomain境界 | DB schemaだけの区切りではない |
| Aggregate | 同一transactionで不変条件を守るentity/value群 | 外部contextをaggregate内参照しない |
| System of Record (SoR) | 対象業務状態のauthoritative source | PDF、cache、read modelではない |
| System of Engagement (SoE) | 利用者とのinteractionを担う | business正本を暗黙所有しない |
| System of Insight (SoI) | 分析・検索・reporting用derived state | stale watermarkが必要 |
| Party | 取引・雇用等のroleを演じ得るPersonまたはOrganization | Customer/Supplier/Workerではない |
| Person | 自然人のidentity record | User/Worker/Contactではない |
| Worker | 組織に労務を提供するParty role | Employeeだけに限定しない |
| Employment | 使用者とWorkerの期間付き雇用関係 | Identity accountではない |
| Assignment | WorkerをOrgUnit/Position/CostCenter等へ期間付き配置 | Employmentと分離 |
| Identity | 認証主体とaccount linkage | Personと1:1とは限らない |
| Authentication | 主体が誰かを確認する | Authorizationとは別 |
| Authorization | actorが特定resource/actionを行えるか決定する | UI非表示だけではない |
| RBAC | Roleを主入力とするauthorization | scope/attributes/SoDを別途要する |
| ABAC | actor/resource/context属性によるauthorization | policy versionと説明が必要 |
| SoD | 相反する職務を同一主体が完結しない統制 | Role分離だけでなく履歴lineageを含む |
| Requirement | 法令・公式指針・内部統制・製品方針から得た検証可能な要求 | `JP-*`; typeを必ず区別 |
| Applicability | Requirementが特定scope/時点/factsへ適用されるかの判断 | 不明をfalseにしない |
| Rule Version | effective periodを持つ機械評価可能なrule | code定数ではない |
| Control | Requirement/Riskへ対応する予防・発見・是正手段 | `CTL-*` |
| Evidence | Control/obligationの実施を裏付けるartifact/reference | DocumentやAuditEventと同一ではない |
| Audit Event | 誰がいつ何をなぜ行ったかを示す改変保護対象event | operational logではない |
| Domain Event | domainで確定した事実を他contextへ伝えるevent | auditの代替ではない |
| Observability Log | 障害解析・運用のtelemetry | 法定証跡の正本ではない |
| Record | 業務・法的価値のため宣言・保持・廃棄される情報 | 任意documentとは異なる |
| Retention Schedule | record type、根拠、起算、期間、廃棄を定めるversioned rule | global日数ではない |
| Legal Hold | 紛争・調査等のため通常廃棄を停止する指示 | 無期限保存の一般理由ではない |
| Correction | 原記録を残して誤りを是正する新しい記録 | destructive updateではない |
| Reversal | 会計等で元の効果を反対記録により打ち消す | 元journal削除ではない |
| Tenant | data/config/security boundaryを共有する契約主体 | LegalEntityと同一とは限らない |
| Legal Entity | 法的権利義務を持つ法人等 | Tenant/OrgUnit/Establishmentと分離 |
| Establishment | 所在地・労務等の適用判断単位となり得る事業場 | 法令ごとの定義をRequirementで確認 |
| Profile | DEV/SMB/ENT等のdeployment/NFR構成 | Plan/Billingではない |
| Outbox/Inbox | domain commitとevent送受信の回復可能性を担保するpattern | exactly-onceを主張しない |
| Idempotency | 同一operationを再実行しても業務効果が重複しない性質 | HTTP retryだけではない |
| Build / Buy / Integrate | 自作、製品購入、外部接続の責任分担判断 | 外部委譲してもaccountabilityは残る |
| Verified | 記載sourceと主張を基準日に公式情報で確認 | 法令完全対応・専門家保証ではない |
| Expert Review Required | 具体的事実への法令/税務/労務等の当てはめが必要 | 調査停止を意味しない |

## 受け入れ条件

- [x] Capability/System/Module/Contextの混同を解消した。
- [x] Party/Person/Worker/Employment/Identityを区別した。
- [x] Requirement/Rule/Control/Evidence/Audit/Logを区別した。
- [x] Retention/Hold/Correction/Reversalを区別した。

