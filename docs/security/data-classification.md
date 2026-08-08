# Data Classification

## 状態

- 状態: **Company OS製品方針 v0.1 / TASK-006でADR化予定**
- 基準日: 2026-08-09
- 法的分類との関係: 法令用語を置換しない。個人情報、要配慮個人情報、個人番号、営業秘密等の法的属性は別tagとして保持する。

## 分類

| Class | 名称 | 代表例 | 既定access | Encryption | Logging | Export | Non-production |
| --- | --- | --- | --- | --- | --- | --- | --- |
| C0 | Public | 公開規程、OSS文書、公開商品情報 | anonymous可 | transit必須 | security event | 制限なし | 利用可 |
| C1 | Internal | 組織図、一般master、社内手順 | authenticated tenant member | transit/at-rest | 変更操作 | 認証・rate limit | synthetic推奨 |
| C2 | Confidential | 契約metadata、価格、仕訳、supplier/customer業務情報 | role + organization scope | transit/at-rest | 閲覧はrisk-based、変更は必須 | purpose/件数制限 | 原則synthetic |
| C3 | Restricted | 給与、評価、銀行口座、個人連絡先、税務、未公開財務 | role + purpose + resource scope | field/object追加暗号を評価 | 全閲覧・変更・export | 追加承認・非同期・透かし | 実データ禁止 |
| C4 | Highly Restricted | 個人番号、健康・stress check、通報、harassment、credential、security incident詳細 | dedicated role + case membership + purpose | 独立key/secret boundary必須 | 全アクセス、payload非記録 | 原則禁止、例外二者承認 | 実データ禁止・fixture分離 |

## 法的・業務tag

| Tag | 意味 | 例 | 追加統制 |
| --- | --- | --- | --- |
| TAG-PII | 識別可能な個人に関する情報 | 氏名、連絡先、従業員ID | purpose、data subject request、sharing record |
| TAG-SENSITIVE-PII | 要配慮または高影響の個人情報 | 健康、障害、労災 | C4、閲覧監査、独立権限 |
| TAG-MYNUMBER | 個人番号・特定個人情報 | マイナンバー | 専用vault/adapter、利用目的限定、非表示 |
| TAG-FINANCIAL | 財務・決済 | 口座、給与、仕訳 | SoD、改変履歴、export制限 |
| TAG-CREDENTIAL | 認証・署名秘密 | password hash、MFA secret、private key | アプリDB保存禁止、secret manager/IdP |
| TAG-PRIVILEGED | 法的秘匿・調査情報 | 弁護士相談、調査memo | case membership、検索隔離 |
| TAG-TRADE-SECRET | 営業秘密候補 | 原価、価格戦略、source code | need-to-know、download制限 |
| TAG-REGULATED-RECORD | 法定保存対象 | 台帳、invoice、会計帳簿 | Requirement/Retention ID必須 |

## Domain別既定値

| Data set | Owner System | Class | Tags | 特記事項 |
| --- | --- | --- | --- | --- |
| LegalEntity/OrgUnit | SYS-ORG-001 | C1-C2 | - | 公開登記事項と内部組織をfield単位で分離 |
| Person/ContactPoint | SYS-PTY-001 | C3 | TAG-PII | tenant間dedup禁止、masking |
| Credential/Auth factor | SYS-IAM-001 | C4 | TAG-CREDENTIAL | 外部IdP正本、Company OSへ値を複製しない |
| Authorization policy/decision | SYS-AUT-001 | C3 | TAG-REGULATED-RECORD | deny reasonに機微属性値を含めない |
| Employment/Assignment | SYS-HR-001 | C3 | TAG-PII | manager表示とHR表示をfield scopeで分離 |
| Compensation/Payroll | SYS-HR-001/SYS-PAY-001 | C4 | TAG-PII, TAG-FINANCIAL | 給与担当とmanager権限を分離 |
| Health/Safety/Relations case | SYS-HSE-001 | C4 | TAG-SENSITIVE-PII | 一般HR indexへ投入しない |
| Whistleblowing/Harassment | SYS-WHB-001/SYS-HSE-001 | C4 | TAG-SENSITIVE-PII, TAG-PRIVILEGED | tenant adminからの分離を可能にする |
| Customer/Supplier transaction | domain SoR | C2-C3 | TAG-PII, TAG-FINANCIAL | contact fieldだけC3 |
| Bank account/Payment | SYS-TRY-001 | C4 | TAG-FINANCIAL | tokenized ref、変更時out-of-band確認 |
| Contract content | SYS-CLM-001/SYS-DOC-001 | C3-C4 | TAG-TRADE-SECRET, TAG-PRIVILEGED | contract単位ACL、full-text index分離 |
| Journal/Financial statement | SYS-GL-001 | C2-C3 | TAG-FINANCIAL, TAG-REGULATED-RECORD | posted dataは訂正model |
| Privacy/Security incident | SYS-PRV-001/SYS-SEC-001 | C4 | TAG-SENSITIVE-PII, TAG-PRIVILEGED | 通知用projectionは最小化 |
| AuditEvent | SYS-AUD-001 | C3 | TAG-REGULATED-RECORD | source classを継承し得るためpayload allowlist |
| Operational log/trace | Observability | C2 | - | PII/credential禁止、短期保持 |

## Handling rules

1. recordは最も高いfield classificationを既定値とし、低いviewは明示的projectionで作る。
2. audit、search、analytics、cache、backupにもsource classificationを伝播する。
3. C3/C4のbulk exportは目的、対象件数、承認、expiry、downloadを監査する。
4. C4の全文検索、汎用comment/tag、通知本文への埋込みを禁止する。
5. 添付はupload時に暫定C3として隔離し、scanとclassification完了後のみ公開する。
6. synthetic sample dataは実在識別子・実在口座・有効credentialを含めない。
7. classification downgradeはdata ownerとprivacy/security ownerの二者承認を要する。

## 受け入れ条件

- [x] C0〜C4のaccess、暗号、監査、export、非本番取扱いを定義した。
- [x] 法的tagと製品classificationを分離した。
- [x] 主要Systemのdata setへ既定分類を割り当てた。
- [x] audit/search/cache/backupへの分類伝播を定義した。
- [x] TASK-004のv0.1 Requirement 8件に対してclassification/tagを再確認した。
