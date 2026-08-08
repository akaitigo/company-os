# Role and Segregation of Duties Matrix

## 状態

- 状態: **内部統制設計案 / 要業務・監査専門家レビュー**
- 基準日: 2026-08-09
- 法令上の義務を一律に主張せず、Company OSの不正・誤謬防止controlとして定義する。

## Role model

| Role ID | Role | Scope | 主な責任 | 明示的に持たない権限 |
| --- | --- | --- | --- | --- |
| ROLE-PLATFORM-ADMIN | Platform Administrator | deployment/tenant config | 運用、設定、障害対応 | C4業務内容の通常閲覧、会計/支払承認 |
| ROLE-SECURITY-ADMIN | Security Administrator | tenant/security domain | policy、incident、access control | 自分の恒常権限承認、給与/通報閲覧 |
| ROLE-IAM-OPERATOR | IAM Operator | tenant/org | account provisioning/revoke | access request承認、employment変更 |
| ROLE-ORG-ADMIN | Organization Administrator | legal entity/org | 組織・position・calendar | payroll、supplier bank、journal post |
| ROLE-HR-ADMIN | HR Administrator | legal entity/workforce | employment、assignment、worker record | payroll final approval、IAM approval |
| ROLE-TIME-MANAGER | Time Approver | org/team/period | attendance/leave承認 | 自分のtime approval、payroll approval |
| ROLE-PAYROLL-PREPARER | Payroll Preparer | payroll group/period | input、simulation、calculation | payroll release、bank transmission |
| ROLE-PAYROLL-APPROVER | Payroll Approver | payroll group/period | result review、release承認 | worker master変更、bank execution |
| ROLE-REQUESTER | Requester | self/org | purchase/expense/access request | 自己承認 |
| ROLE-BUYER | Buyer | procurement org | sourcing、PO preparation | supplier master approval、receipt、payment |
| ROLE-RECEIVER | Receiver/Inspector | establishment/order | receipt、inspection | PO approval、invoice/payment approval |
| ROLE-AP-PREPARER | AP Preparer | legal entity | invoice capture/match、payment request | supplier bank変更、payment approval/execution |
| ROLE-PAYMENT-APPROVER | Payment Approver | legal entity/account/limit | payment batch approval | instruction creation、bank execution |
| ROLE-TREASURY-OPERATOR | Treasury Operator | bank account | approved instruction transmission/reconcile | supplier master、payment approval |
| ROLE-SALES-OPERATOR | Sales Operator | sales org | quote/order/customer | unrestricted discount、cash allocation |
| ROLE-AR-OPERATOR | AR Operator | legal entity | billing/receipt/allocation | customer credit override、journal approval |
| ROLE-ACCOUNTANT | Journal Preparer | legal entity/ledger | journal proposal、reconcile | own journal approval、period close approval |
| ROLE-CONTROLLER | Controller | legal entity/period | journal/close/report approval | source transaction rewrite |
| ROLE-COMPLIANCE | Compliance Owner | requirement/control | applicability、control、evidence | audit test resultの単独改変 |
| ROLE-AUDITOR | Auditor | approved audit scope | read evidence、test control、finding | business transaction変更、finding自己解決 |
| ROLE-PRIVACY | Privacy Officer | processing/case | privacy decision、rights/incident | unrelated C4閲覧 |
| ROLE-RECORDS | Records Manager | schedule/hold | retention、hold、disposition | 単独でC4 bulk delete |
| ROLE-LEGAL | Legal Counsel | contract/matter | legal review、privileged matter、hold request | payment execution、business approval代行 |
| ROLE-INVESTIGATOR | Restricted Investigator | assigned case | 通報/調査case | tenant-wide検索、case外閲覧 |
| ROLE-DATA-STEWARD | Data Steward | assigned master | quality、merge proposal | domain owner承認なしのmaster更新 |

## SoD rules

| Rule ID | Process | Conflicting duties | Enforcement | Exception | Audit evidence |
| --- | --- | --- | --- | --- | --- |
| SOD-IAM-001 | Access | request != approve != provision | same subject/resource/periodでdeny | emergency break-glass、期限付き二者承認 | request、decision、provision result、expiry |
| SOD-IAM-002 | Policy | policy author != publisher | publish時deny | security lead + auditor approval | diff、review、publish version |
| SOD-HR-001 | HR/Payroll | employment/compensation update != payroll approval | payroll run contributor graphでdeny | documented small-company compensating control | source changes、run approval |
| SOD-TIME-001 | Time | employee entry != final approval | self approval deny | owner-only entityは上位承認/事後review | entry、correction、approval |
| SOD-PTP-001 | Supplier | supplier create/change != supplier approval | master workflow deny | emergency vendor、支払hold必須 | due diligence、bank verification、approval |
| SOD-PTP-002 | Purchase | requisition/request != approval | same request deny | threshold based documented exception | request、budget/policy、decision |
| SOD-PTP-003 | P2P | PO approval != receipt/inspection != invoice approval | transaction lineage全体でconflict検査 | small-company compensating review | PO、receipt、match、approval |
| SOD-PAY-001 | Payment | payment prepare != approve != bank execute | batch/account/periodでdeny | dual-control external bank証跡 | batch hash、approval、transmission、ack |
| SOD-BANK-001 | Bank master | supplier bank change != verify != first payment approve | pending bankを支払不可 | verified rollback to prior account | before/after、verification channel |
| SOD-OTC-001 | Sales | quote/discount author != above-threshold approver | threshold ruleでdeny | product owner + finance approval | price version、margin、decision |
| SOD-AR-001 | Receipts | receipt import != write-off/refund approval | allocation chainでdeny | controller review | bank source、allocation、refund |
| SOD-GL-001 | Journal | journal create != approve/post | own proposal deny | auto-postはpre-approved rule + monitoring | journal lines、rule、decision |
| SOD-GL-002 | Close | journal approval != period close approval | close checklistでseparate role | emergency reopenはcontroller+audit notice | close/reopen reason、outstanding items |
| SOD-RET-001 | Disposal | schedule owner != disposition approver != delete operator | delete batchで三者分離 | small deployment dual control | scope/hash、hold check、approval、result |
| SOD-AUD-001 | Audit | control owner != control tester; finding owner != resolver | assignment conflict warning/deny | independent secondary review | evidence snapshot、test、resolution |
| SOD-WHB-001 | Speak-up | subject/manager of subject != investigator | relationship match deny and hide case | independent external investigator | conflict screening、assignment history |

## Policy evaluation inputs

- actor roleとtemporary elevation
- subject/resource tenant、legal entity、org、case、bank account
- transaction lineage上の過去action
- amount/threshold/currencyとpolicy version
- employment/manager/relationship conflict
- effective time、delegation、break-glass status

Role名だけではSoDを判定できない。SYS-AUT-001はcommandごとにlineageを照会し、decision IDをdomain transactionとSYS-AUD-001へ関連付ける。

## Break-glass

1. 通常policyでdenyされた操作を暗黙に許可しない。
2. incident ID、理由、対象、期限、approverを必須にする。
3. C4、bank execution、data deletion、policy publishは単独break-glass不可とする。
4. 使用直後にsecurity/auditへ通知し、24時間以内のreviewを製品方針とする。
5. elevationは自動失効し、credential共有を認めない。

## 受け入れ条件

- [x] 主要業務・管理roleのscopeと禁止権限を定義した。
- [x] HR、IAM、Procurement、Payment、Accounting、Retention、AuditのSoDを定義した。
- [x] transaction lineageを用いる動的SoDを明示した。
- [x] 例外とcompensating controlを監査可能にした。
Post-Milestone gate: 対象企業の最小人員profileでcompensating controlの運用可能性を検証する（pending）。
