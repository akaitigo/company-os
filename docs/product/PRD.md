# PRD: Self-hosted Company OS

**作成者**: Ryusei | **日付**: 2026-08-09 | **ステータス**: Draft / Program Issue #10

## 一文の説明

日本の中小・中堅企業が、人事・勤怠・購買・会計の主要SaaSを停止しても、日常業務と月次締めを継続でき、自社情シスが標準手順で導入・更新・復旧できるself-hosted業務基盤。

## 問題定義

企業の基幹業務が複数SaaS、Excel、個別連携へ分断されると、ID・組織・承認・証跡・保持・マスタが重複し、退職者権限、二重入力、月次照合、法改正追随、ベンダーロックインが継続コストになる。

現行実装はtenant分離、OIDC、監査、outbox、domain invariantの技術検証であり、利用者が業務を完結する製品ではない。固定9時間の勤怠登録のようなdemo操作、未接続のschema/domain primitive、happy-path E2Eを製品能力の完成として扱っていた。この評価方法を廃止する。

## 対象企業と制約

| 項目 | V1 target |
| --- | --- |
| Jurisdiction | 日本。法的断定はverified requirementと専門家review状態を区別 |
| Company | 単一法人を基本とする50〜1,000名規模。複数事業所・部門・cost center対応 |
| Deployment | 顧客管理のVMまたはKubernetes。managed PostgreSQL/S3-compatible storage/IdPを許容 |
| Operators | 1〜5名の情シス。開発者常駐を前提にしない |
| Availability | SMB月99.5%。計画停止、RPO 24時間、RTO 8時間を初期基準とする |
| Language/time | 日本語、Asia/Tokyo、JPYをdefault。domain modelはlocale/currency/timezoneを固定しない |
| Scale | 1,000 workers、年100万business transactions、監査・保持期間を含めて検証 |

## 利用者・ステークホルダー

| Persona | 主な完了すべき仕事 |
| --- | --- |
| Employee | 個人情報確認、打刻、勤怠訂正、休暇、経費申請、状態確認 |
| Manager | team状況、例外確認、承認・差戻し、代理・期限対応 |
| HR/Labor | employee/employment、calendar/rule、勤怠締め、休暇台帳、証跡・export |
| Buyer/AP | supplier、購買申請、PO、検収、請求照合、支払例外 |
| Accountant | journal、AR/AP、入出金消込、配賦、照合、period close、report |
| Auditor/Compliance | rule適用根拠、変更履歴、証跡検索、保持・legal hold |
| IT administrator | install、SSO、role、設定、監視、upgrade、backup/restore、support bundle |
| Product owner | SaaS parity、UAT、cutover、残存risk、解約判断 |

## 目標と成功指標

| 目標 | 指標 | GA target |
| --- | --- | --- |
| SaaS置換 | 対象能力のparity判定 | Mandatory能力100%がbuilt/integrated。unsupported 0 |
| 業務完結 | role別critical journey | 100% E2E + UAT合格 |
| 隠れ依存排除 | 旧SaaS/非管理Excelへの必須作業 | 30日相当continuity drillで0 |
| 月次正確性 | parallel run差異 | 2期間連続で説明不能差異0、金額・残高・件数reconcile |
| 法令traceability | Requirementからtest/evidenceまで | P0/P1 requirement 100%。unknownは適合表示しない |
| 導入可能性 | clean環境の導入 | runbookだけで第三者情シスが成功 |
| 復旧可能性 | restore rehearsal | RPO 24h/RTO 8h以内、四半期演習を自動記録 |
| 品質 | unresolved defects/review | P0/P1およびCRITICAL/HIGH/MEDIUM 0 |
| Accessibility | WCAG 2.2 AA目標 | 自動違反0 + keyboard/screen-reader UAT |
| Performance | interactive API | SMB baseline p95 query 500ms、command 1s以内 |

## Product principles

1. 利用者のjobが完了しなければ、schema/API/domain classがあっても未実装とする。
2. 訂正・取消・差戻し・再実行・競合・障害・監査をhappy pathと同じ優先度で設計する。
3. 法令資料は静的文書で終わらせず、適用判定、rule version、画面説明、証跡、testへ接続する。
4. self-hostは配布形態ではなくproduct capabilityである。install、upgrade、rollback、restore、monitoringをDoDに含める。
5. SaaS解約可否は機能一覧ではなく、実データparallel runとrole別UATで判定する。
6. 未確認、要専門家review、integration依存、将来機能を「対応済み」と表示しない。

## 機能要件

### Platform / Shared services

- tenant、法人、事業所、組織、position、cost center、calendar、fiscal periodのeffective-dated管理
- OIDC/SAML federation、MFA policy、role/permission、SoD conflict、access review、joiner/mover/leaver
- versioned workflow、task inbox、代理、reminder、escalation、多段・金額条件承認
- document version、hash、classification、malware-scan adapter、retention、legal hold、disposition evidence
- audit search/export、before/after reference、reason、decision/rule/correlation、改ざん防止
- notification、outbox/inbox、idempotency、retry/backoff、dead-letter/replay/reconciliation
- admin settings、configuration version、health/metrics/log/trace、support bundle

### Workforce / Attendance / Leave

- employee/worker/employment/assignment/manager、機微情報のfield-level authorization、履歴、import/export
- clock-in/out、複数break、manual/clock/import、shift、overnight、holiday、timezone
- 実働・所定内・時間外・深夜・休日・遅刻早退のversioned calculationと説明
- missed punch、訂正申請、差戻し、承認、代理、period close/reopen/lock
- leave grant/accrual/reserve/consume/release/expiry、時間・半日休、残高負数禁止
- employee/manager/HR dashboard、calendar、exception queue、bulk approval/export

### Source-to-Pay / Expense / AP / Payment

- supplier onboarding、重複検知、bank detail変更の強化承認
- requisition、budget/authority check、多段承認、PO発行・変更・送付証跡
- partial receipt、return、close、expense detail/document/policy、承認・精算
- invoice、duplicate prevention、three-way match/tolerance、exception queue
- payment proposal、maker-checker、bank adapter、accepted/rejected/settled/returned、reconciliation

### Finance / Close / Reporting

- chart、period、dimension、opening balance、manual/subledger/recurring/accrual journal
- validation、approval、posting、reversal、immutable ledger
- AP/AR aging、receipt/application/unapplication、write-off approval、bank reconciliation
- cost allocation rule/run/reversal/reproduction
- trial balance、general ledger、P&L、balance sheet、cash、dimension drill-down、CSV/PDF
- close checklist、subledger reconciliation、lock/reopen、evidence package

### Compliance traceability

各P0/P1 Requirementは次を機械可読に連結する。

`official source → verified/effective date → applicability facts → rule ID/version → affected command/field → user guidance → audit/evidence → automated test → expert-review status`

## UX要件

全主要resourceは一覧、検索、filter、sort、bounded pagination、詳細、作成、訂正、状態遷移、履歴を持つ。空、loading、成功、validation、権限拒否、競合、依存障害、retryを明示し、利用者へ次のactionと計算・rule根拠を示す。必要な箇所ではbulk action、CSV import/export、print/PDFを提供する。

## Self-host運用要件

- VM/Kubernetesのversioned deployment profile、preflight、config schema、secret injection、TLS
- 初期admin/SSO/tenant/calendar/role/workflow/retention setup
- migration dry-run、pre-upgrade backup、forward-fix/rollback、maintenance mode
- metrics/log/trace/alert、dead-letter、reconciliation、support bundle、capacity guidance
- DB/object/config/key referenceの整合backupとrestore rehearsal
- source SaaSからmaster/open transaction/historyをimportし、count/amount/hashでreconcile

## スコープ外

- 全日本法令への無条件な完全準拠宣言
- 置換対象とcutoverを定義しない抽象的な「ERP全部入り」
- bank、government、mail、object storage等の全providerを内製すること
- demo固定値、happy-path、schemaだけをproduct capabilityとして数えること
- V1 target外の小売POS、製造MRP、業種固有機能。ただし拡張境界は維持する

## Deliveryと品質ループ

各Epic/Issueは次を繰り返す。

1. 実機・利用者job・code・data・law・operationsを確認
2. Evidence付きIssueとImplementation Contractを作成
3. end-to-end vertical sliceを実装
4. unit/integration/contract/E2E/security/accessibility/load/migration/restoreと実ブラウザで確認
5. 最低5ラウンドのreview/fixを行い、発見をbacklogへ反映

完成の証拠モデルは [Capability Evidence](capability-evidence.md) を正本とする。

## GA acceptance

- [ ] Mandatory parity capabilityに未実装、partial、manual workaroundがない。
- [ ] 全critical journeyがrole別E2Eと利用者UATに合格する。
- [ ] 代表企業データで2回以上の月次parallel runがreconcileする。
- [ ] SaaS停止後30日相当のcontinuity drillで旧SaaS・隠れExcel依存がない。
- [ ] clean install、upgrade、rollback/forward-fix、restoreが第三者情シスにより再現される。
- [ ] P0/P1法令requirementのtraceabilityと専門家review状態が明示される。
- [ ] P0/P1 defect、CRITICAL/HIGH/MEDIUM review findingが0、全CI green。
- [ ] Product ownerが対象SaaSの解約可否と残存riskを明示承認する。

## 未解決事項

- [ ] 実際に置換するSaaS製品名、契約、使用機能、export formatをinventory化する。
- [ ] Payrollをbuilt、integrated、またはV1の明示的な別system-of-recordとする判断を確定する。
- [ ] Production object storage、mail、bank、e-sign、malware scanのreference adapterを選定する。
- [ ] 資格ある労務・会計・法務専門家のreview ownerを割り当てる。

