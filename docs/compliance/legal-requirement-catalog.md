# TASK-004: Legal Requirement Catalog

## 状態

このカタログは調査中である。`verified`は記載した要件を公式一次情報で確認したことを意味し、製品全体の法令適合や専門家確認を意味しない。

基準日: 2026-08-09

| Requirement ID | 概要 | Authority | Status | Capability | System |
| --- | --- | --- | --- | --- | --- |
| JP-PRIVACY-001 | 漏えい等報告・本人通知 | 個人情報保護委員会 | verified / expert review required | CAP-LGL-04, CAP-TEC-04 | SYS-PRV-001, SYS-SEC-001 |
| JP-PRIVACY-002 | 第三者提供の確認・記録・保存 | 個人情報保護委員会 | verified / expert review required | CAP-LGL-04, CAP-LGL-03 | SYS-PRV-001, SYS-RET-001 |
| JP-TAX-001 | 電子取引データ保存 | 国税庁 | verified / expert review required | CAP-LGL-03, CAP-PTP-05 | SYS-DOC-001, SYS-RET-001, SYS-AP-001 |
| JP-LABOR-001 | 年次有給休暇管理簿 | 厚生労働省 | verified | CAP-WKF-04 | SYS-TIM-001, SYS-RET-001 |
| JP-LABOR-002 | 労働関係記録の保存 | 厚生労働省 | verified / expert review required | CAP-WKF-03, CAP-LGL-03 | SYS-HR-001, SYS-PAY-001, SYS-RET-001 |
| JP-LABOR-003 | 36協定・時間外上限 | 厚生労働省 | verified / expert review required | CAP-WKF-04, CAP-GOV-02 | SYS-TIM-001, SYS-RUL-001, SYS-GRC-001 |
| JP-TAX-002 | 法人税帳簿書類の保存 | 国税庁 | verified / expert review required | CAP-FIN-01, CAP-LGL-03 | SYS-GL-001, SYS-DOC-001, SYS-RET-001 |
| JP-TAX-003 | 適格請求書の写し等の保存 | 国税庁 | verified / expert review required | CAP-OTC-05, CAP-PTP-05 | SYS-BIL-001, SYS-AP-001, SYS-RET-001 |

## 調査バックログ

| Priority | Requirement group | 状態 |
| --- | --- | --- |
| P0 | 労働者名簿・賃金台帳・労働関係記録 | 保存期間確認、項目・起算詳細未確認 |
| P0 | 労働時間上限・36協定・割増賃金 | 上限確認、制度別特則・割増計算未確認 |
| P0 | 会計帳簿・計算書類・税務帳簿の保存 | 法人税帳簿確認、会社法記録未確認 |
| P0 | 適格請求書、仕入税額控除 | 発行写し保存確認、控除要件・経過措置未確認 |
| P0 | 個人情報の安全管理、委託、開示等 | 一部確認 |
| P1 | 会社機関、株主名簿、議事録 | 未確認 |
| P1 | 雇用・社会保険届出 | 未確認 |
| P1 | 電子契約・契約成立 | 未確認 |
| P1 | 下請・フリーランス取引 | 未確認 |
| P2 | 消費者、表示、特商、資金決済 | 未確認 |

## Schema

要件ファイルは[`requirement.schema.yaml`](../../compliance/schema/requirement.schema.yaml)に従う。法的義務、公式ガイダンス、内部統制、製品方針を`requirement_type`で区別する。

## 受け入れ条件（進行中）

- [x] 安定ID、公式URL、条文/公式参照、確認日を持つschemaを定義した。
- [x] RequirementからCapability、System、Control、Testへのtraceabilityを定義した。
- [x] effective dateとrule/test/output schema versionを保持できる。
- [x] verified、unverified、expert review required、supersededを区別できる。
- [x] v0.1対象の代表的P0要件を調査し、Applicability/Retention Matrixへ反映した。
- [x] YAMLをschema fieldsと参照規則に対して`./scripts/verify-spec`で自動検証した。

全P0/P1法令の調査完了はMilestone 0の完了条件ではない。未確認領域はLaw Catalogの優先調査キューに残し、各module実装前のDefinition of ReadyでRequirement化する。
