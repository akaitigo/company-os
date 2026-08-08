# Control Catalog

## 状態

- 状態: **Milestone 0 design controls / 実装・運用有効性は未検証**
- 基準日: 2026-08-09
- Controlの存在は法令適合を保証しない。design、implementation、operating effectivenessを別statusで管理する。

## Status model

- `designed`: owner、trigger、evidence、failure behavior、testを定義。
- `implemented`: code/config/workflowへ実装し、automated test成功。
- `operating`: production/対象環境で所定期間の証拠をreview。
- `deficient`: design/implementation/operationに不足。

## Controls

| Control ID | Requirement | Type | Owner | Trigger / Frequency | Control activity | Evidence | Failure behavior | Test |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| CTL-LABOR-LEAVE-001 | JP-LABOR-001 | preventive/detective | Labor admin | leave grant/consume + monthly | worker/付与期間ごとに基準日・時季・日数をledger化し欠落を検出 | PaidLeaveLedger version、exception、export manifest | ledger確定をblock、period close exception | TEST-JP-LABOR-001 |
| CTL-LABOR-RECORD-001 | JP-LABOR-002 | preventive | HR/Payroll/Records | record確定・retention evaluation | record type、起算event、rule versionから期限を計算しholdを適用 | RecordDeclaration、schedule decision、disposition evidence | 不明時廃棄せずreview | TEST-JP-LABOR-002 |
| CTL-LABOR-OVERTIME-001 | JP-LABOR-003 | preventive/detective | Labor admin/Manager | time entry/approval/forecast | 事業場・work system・36協定versionで単月/複数月/年上限を計算し警告・禁止 | ApplicabilityDecision、accumulator、warning/deny、agreement ref | rule/協定不明時overtime authorizationをblock | TEST-JP-LABOR-003 |
| CTL-PRIV-INCIDENT-001 | JP-PRIVACY-001 | detective/corrective | Privacy officer | incident intake/update + deadline scheduler | 報告対象4類型、awareness time、速報/確報/本人通知をcaseで追跡 | assessment、report version、receipt、notification evidence | 不明時caseを閉じずescalate | TEST-JP-PRIVACY-001 |
| CTL-PRIV-SHARING-001 | JP-PRIVACY-002 | preventive | Privacy/Data owner | third-party provide/receive | recipient、purpose、basis/exclusion、data、record methodを承認・保存 | Disclosure/ReceiptRecord、decision、delivery ref | basis/exclusion不明時transferをblock | TEST-JP-PRIVACY-002 |
| CTL-TAX-ERECORD-001 | JP-TAX-001 | preventive/detective | Records/Tax | electronic transaction intake + daily exception | 原データ、checksum、date/amount/counterparty、訂正削除統制、検索/見読性を検証 | ElectronicTransactionRecord、scan/status、search test | 不備を保存完了にせずquarantine/review | TEST-JP-TAX-001 |
| CTL-TAX-BOOKS-001 | JP-TAX-002 | preventive | Controller/Records | journal post、period close、retention | balanced/immutable journal、fiscal facts、7/9/10年scheduleを適用 | posted journal/hash、close certification、schedule decision | unbalanced/closed periodをblock、期限不明はretain | TEST-JP-TAX-002 |
| CTL-TAX-INVOICE-001 | JP-TAX-003 | preventive | Billing/AP/Tax | qualified invoice issue/receive | required fields、registration/tax period、issue method、copy/e-record retention triggerを検証 | invoice version、delivery ref、retention decision | qualified statusを付けずexception | TEST-JP-TAX-003 |

## Control invariants

- control ownerはcontrol testerと同一にしない（SOD-AUD-001）。
- evidenceはsource recordのimmutable ID/version/hashを参照し、C4 payloadを複製しない。
- manual overrideは理由、scope、expiry、approver、compensating reviewを必須とする。
- automated controlが停止した時間帯を正常実施と記録しない。coverage gapをfinding化する。
- Requirement/Rule version変更時に影響ControlとTestをreview queueへ戻す。

## 受け入れ条件

- [x] v0.1 Requirement全件にControl ID、owner、activity、evidence、failure、testを割り当てた。
- [x] preventive/detective/correctiveと有効性statusを区別した。
- [x] override、coverage gap、C4 evidenceの統制を定義した。
Post-Milestone gate: TASK-007以降にimplemented/operating effectivenessを検証する（pending）。
