# SaaS Replacement Parity Matrix

## 状態

初期baseline。実際の解約対象SaaS inventoryを取得後、製品名・契約・利用機能・export/import・法定archiveを追記する。`Mandatory`が`verified`または`integrated`でない限りGA不可。

| ID | Domain | Capability | Priority | Current | Target | Gap summary |
| --- | --- | --- | --- | --- | --- | --- |
| PAR-PLT-001 | Platform | Tenant/company/site/calendar/settings | Mandatory | primitive | verified | Admin setup、変更、履歴、config version不足 |
| PAR-PLT-002 | Platform | SSO、role、SoD、access review | Mandatory | vertical_slice | verified | Admin UI、JML、certification、SAML不足 |
| PAR-PLT-003 | Platform | Workflow/task/delegation/escalation | Mandatory | primitive | verified | 利用者inboxと運用処理が未接続 |
| PAR-PLT-004 | Platform | Documents/retention/legal hold | Mandatory | primitive | verified | content adapter、scan、UI、disposition未接続 |
| PAR-PLT-005 | Platform | Audit/evidence/search/export | Mandatory | vertical_slice | verified | authorized search/export、before/after、運用不足 |
| PAR-PLT-006 | Platform | Notification/retry/dead-letter/reconcile | Mandatory | primitive | operational | DB再接続・health・retryは実証済み。adapter、admin UI、alert、dead-letter、replay不足 |
| PAR-WKF-001 | Workforce | Employee/employment/assignment lifecycle | Mandatory | primitive | verified | 業務UI、履歴、JML、import/export不足 |
| PAR-WKF-002 | Workforce | Clock/break/shift/calendar | Mandatory | vertical_slice | verified | 任意時刻・複数休憩・履歴・訂正を実装。shift/calendarは未実装 |
| PAR-WKF-003 | Workforce | Working-time calculation/explanation | Mandatory | not_started | verified | overtime/night/holiday/rule説明なし |
| PAR-WKF-004 | Workforce | Correction/approval/close/reopen | Mandatory | vertical_slice | verified | 追記型訂正・承認/差戻し・雇用月次close/reopen・DB lockを実装。team queue、代理、bulk、給与連携不足 |
| PAR-WKF-005 | Workforce | Leave accrual/request/approval/balance | Mandatory | primitive | verified | UI、accrual/expiry、approval/取消不足 |
| PAR-STP-001 | Source-to-Pay | Supplier onboarding/change control | Mandatory | primitive | verified | UI、duplicate、bank change approval不足 |
| PAR-STP-002 | Source-to-Pay | Requisition/approval/PO | Mandatory | vertical_slice | verified | approval、PO lifecycle、budget不足 |
| PAR-STP-003 | Source-to-Pay | Receipt/return/expense | Mandatory | primitive | verified | 利用者flow未接続 |
| PAR-STP-004 | Source-to-Pay | Invoice/match/exception/AP | Mandatory | primitive | verified | intake、duplicate、exception queue不足 |
| PAR-STP-005 | Source-to-Pay | Payment/reconciliation | Mandatory | primitive | verified | proposal、bank adapter、state/reconcile不足 |
| PAR-FIN-001 | Finance | Chart/period/dimension | Mandatory | primitive | verified | Admin UI、period control、opening不足 |
| PAR-FIN-002 | Finance | Journal/post/reverse | Mandatory | vertical_slice | verified | approval、detail/search/reversal UI不足 |
| PAR-FIN-003 | Finance | AR/AP/receipt/application | Mandatory | vertical_slice | verified | full lifecycle、unapply、aging不足 |
| PAR-FIN-004 | Finance | Allocation | Mandatory | vertical_slice | verified | rule/run/reversal/explanation UI不足 |
| PAR-FIN-005 | Finance | Reconciliation/close | Mandatory | not_started | verified | checklist、lock、evidence packageなし |
| PAR-FIN-006 | Finance | TB/GL/P&L/BS/cash/export | Mandatory | not_started | verified | 帳票・drill-downなし |
| PAR-CMP-001 | Compliance | Requirement-rule-command-evidence-test trace | Mandatory | primitive | verified | runtime/UI/CIの連結不足 |
| PAR-OPS-001 | Operations | Install/preflight/config/secrets/TLS | Mandatory | vertical_slice | verified | preflightとVM runtime bundleは実装、registry release、clean-host第三者UAT、Kubernetes profile不足 |
| PAR-OPS-002 | Operations | Upgrade/rollback/backup/restore | Mandatory | vertical_slice | verified | version upgrade rehearsal、object/config/key不足 |
| PAR-OPS-003 | Operations | Monitoring/alert/support bundle/capacity | Mandatory | primitive | operational | dashboard/alert/SLO/load evidence不足 |
| PAR-MIG-001 | Migration | Source export/import/reconciliation/cutover | Mandatory | not_started | verified | migration product未実装 |
