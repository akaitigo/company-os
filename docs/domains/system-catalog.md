# TASK-003: System Catalog

## 1. 目的と状態

Company OSが必要とする論理システムと責任境界を一覧化する。ここでいうSystemは、独立deployableやmicroserviceを意味しない。初期実装では複数Systemを一つのModular Monolith内のmoduleとして実現できる。

- 文書状態: **確認済み（構想との対応）**
- 法令依存: **未確認（TASK-004でRequirement IDへ置換）**
- Build/Buy/Integrate: **設計案（TASK-006のADRで確定）**
- 基準日: 2026-08-09

## 2. 分類

- `SoR`: System of Record。対象業務状態の正本。
- `SoE`: System of Engagement。利用者との対話を担い、正本へcommandを送る。
- `SoI`: System of Insight。正本から導出した分析・検索・報告。
- Mandatoryは`Core`（Company OSの参照実装に必要）、`Conditional`（企業条件次第）、`Extension`（業種別）、`External`（外部委譲を既定）とする。
- Build/Buy/Integrateは`Build`、`Integrate`、`Hybrid`、`Evaluate`。`Buy`はOSS成果物として同梱できないため、商用導入時の`Integrate`候補に含める。
- Phaseは`M0`（仕様のみ）、`P1`以降、`External`、`Future`で表す。

## 3. カタログ

| ID | Capability | Domain | System / Type | Purpose | Primary User | Mandatory | Legal Dependency | Source of Truth | Inbound | Outbound | Sensitive Data | Audit Requirement | Failure Boundary / Fallback | B/B/I | Priority | Phase |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SYS-ORG-001 | CAP-ORG-01 | Organization | Enterprise Registry / SoR | 法人・事業所・組織・役職・原価軸を時点管理 | Corporate admin | Core | 会社・登記・労務（未確認） | LegalEntity, Establishment, OrgUnit, Position | 登記事項、管理者変更 | Workforce, IAM, Financeへ組織event | C2 | 作成・変更・統廃合、変更理由 | 下流停止時はoutbox再送。過去versionを保持 | Build | P0 | P1 |
| SYS-PTY-001 | CAP-ORG-02 | Party | Party Registry / SoR | 人・組織とcustomer/supplier等のroleを識別 | Data steward | Core | Privacy（未確認） | Party, PartyRole, ContactPoint | 業務moduleの登録要求 | party ID、正規化された連絡先 | C2-C3 | merge/split、閲覧、export | 重複疑いは自動mergeせずreview queue | Build | P0 | P1 |
| SYS-IAM-001 | CAP-TEC-01 | Identity | Identity Provider / SoR | 認証、MFA、federation、credential lifecycle | User, IAM admin | External | 認証・Security方針 | Identity, Credential（外部IdP） | worker/guest lifecycle | token、認証event | C3 | login、MFA、recovery、admin操作 | 障害時fail closed。break-glassは別統制 | Integrate | P0 | P1 |
| SYS-AUT-001 | CAP-TEC-01-02; CAP-COM-03 | Identity | Authorization Policy / SoR | 業務権限、scope、ABAC、SoDを評価 | Security admin, services | Core | Privacy、内部統制（未確認） | PolicyVersion, Assignment | identity、organization、resource属性 | permit/deny decision、decision log | C3-C4 | policy変更、判定理由、override | 判定不能はdeny。version cache期限を制限 | Build | P0 | P1 |
| SYS-WFL-001 | CAP-COM-01-01 | Workflow | Workflow Runtime / SoR | version付きworkflowと承認taskを実行 | Requester, approver | Core | 各domain要件 | WorkflowInstance, Task, Decision | domain command、policy | decision event、deadline | C2-C3 | 委任、承認、取消、escalation | rule障害時は進行停止し再開可能 | Build | P0 | P1 |
| SYS-NTF-001 | CAP-COM-01-02 | Notification | Notification Service / SoR+Integrate | 通知希望、配送、再送、期限通知を管理 | All users, operator | Core | 業務通知義務（未確認） | NotificationIntent, DeliveryAttempt | workflow/domain event | email等provider | C2 | 宛先、template version、配送結果 | provider停止時queue。業務正本は変更しない | Hybrid | P1 | P1 |
| SYS-DOC-001 | CAP-COM-02; CAP-LGL-03 | Content | Document Service / SoR | binary、metadata、version、malware判定を管理 | All modules | Core | 電子記録・Privacy（未確認） | DocumentMetadata, ObjectRef | upload、scan result | authorized download、evidence ref | C2-C4 | upload/read/export/delete | scan未完了は隔離。object障害時metadataを保持 | Hybrid | P0 | P1 |
| SYS-RUL-001 | CAP-COM-03-01; CAP-GOV-02-02 | Compliance | Rule & Applicability Engine / SoR | 法令・社内ruleをversion管理し説明可能に評価 | Compliance owner, services | Core | 全法令catalog | RuleVersion, ApplicabilityDecision | company profile、facts | decision、根拠、required controls | C2-C3 | publish、評価、override、根拠version | 不明は`undetermined`で停止。推測しない | Build | P0 | P1 |
| SYS-AUD-001 | CAP-COM-03-02 | Audit | Audit Ledger / SoR | 重要操作の改ざん検知可能な証跡を保持 | Auditor, security | Core | 記録・内部統制（未確認） | AuditEvent, IntegrityProof | 全moduleのsecurity/business event | restricted search/export | C3-C4 | append、閲覧、export、検証 | write失敗時は重要commandをfail closed | Build | P0 | P1 |
| SYS-RET-001 | CAP-COM-03-03; CAP-LGL-03 | Records | Retention & Legal Hold / SoR | 保持期限、hold、廃棄承認・証跡を管理 | Records manager, legal | Core | 保存義務・Privacy（未確認） | RetentionSchedule, Hold, Disposition | record metadata、rules、case hold | disposition command/evidence | C3-C4 | schedule、hold、release、dispose | 条件競合時は保持を優先しreview | Build | P0 | P1 |
| SYS-INT-001 | CAP-COM-04-01 | Integration | API/Event Gateway / SoR | API、webhook、outbox/inbox、再処理を統制 | Integrator, operator | Core | 外部仕様・Privacy | Message, Delivery, IdempotencyKey | domain events/API calls | versioned API/webhook | C2-C4 | client、payload hash、配送結果 | timeout、backoff、DLQ、reconciliation | Build | P0 | P1 |
| SYS-CFG-001 | CAP-COM-04-02 | Platform | Configuration & Feature Flag / SoR | profile別設定と安全な段階導入を管理 | Platform admin | Core | なし/各rule参照 | ConfigurationVersion, Flag | admin approval | evaluated config | C2-C3 | publish、rollback、secret参照 | 不正/欠損設定はlast-known-good | Build | P1 | P1 |
| SYS-HR-001 | CAP-WKF-01; CAP-WKF-03; CAP-WKF-07 | Workforce | Human Resource Management / SoR | position、employment、assignment、compensation、退出を時点管理 | HR | Core | 労働・社会保険（未確認） | Worker, Employment, Assignment | applicant/onboarding、org event | IAM、payroll、facility event | C3 | 閲覧、terms変更、訂正、退出 | 下流停止時outbox。雇用正本は維持 | Build | P0 | P2 |
| SYS-ATS-001 | CAP-WKF-02-01 | Workforce | Applicant Tracking / SoR+SoE | 応募、面接、選考、offerを管理 | Recruiter, candidate | Conditional | 雇用・Privacy（未確認） | Candidate, Application, Selection | candidate入力 | hire decision、rejection notice | C3 | consent、評価、decision、削除 | 外部ATS障害時export/import契約を用意 | Evaluate | P2 | Future |
| SYS-ONB-001 | CAP-WKF-02-02; CAP-TEC-01 | Workforce | On/Offboarding Orchestrator / SoR | 入退社の部門横断checklistを調整 | HR, manager, IT | Core | 労働・Security（未確認） | OnboardingCase, Checklist | employment event | IAM/asset/facility tasks | C3 | task、例外、完了証跡 | 部分失敗を可視化し補償task。自動完了しない | Build | P1 | P2 |
| SYS-TIM-001 | CAP-WKF-04 | Workforce | Time & Attendance / SoR | schedule、clock、break、leave、時間計算、締めを管理 | Worker, manager, labor admin | Core | 労働法令（未確認） | WorkSchedule, TimeEntry, Leave, Close | clock/import、employment | payroll input、compliance alert | C3 | 打刻、訂正、承認、締め、再開 | offline clockは署名付きqueue、重複排除 | Build | P0 | P2 |
| SYS-TAL-001 | CAP-WKF-05 | Workforce | Talent & Learning / SoR | 目標、評価、skill、資格、研修を管理 | Worker, manager, HR | Conditional | 労務・安全衛生（未確認） | Goal, Review, Skill, Training | HR、training provider | qualification/attestation | C3 | 評価閲覧、変更、calibration | 外部LMS停止時completionを保留 | Evaluate | P2 | Future |
| SYS-BEN-001 | CAP-WKF-05-03 | Workforce | Benefits Administration / SoR+Integrate | 福利厚生の加入・変更・終了を管理 | Worker, HR | Conditional | 社会保険等（未確認） | BenefitEnrollment | employment、user request | provider enrollment | C3-C4 | 選択、承認、外部送信 | provider不達は未完了としてreconcile | Evaluate | P2 | Future |
| SYS-HSE-001 | CAP-WKF-06 | Workforce | Health, Safety & Employee Relations / SoR | 健康安全、労災、相談、労使案件を分離管理 | HSE, occupational staff, HR | Conditional | 労働安全衛生等（未確認） | HealthCase, SafetyCase, RelationsCase | restricted intake | required report/task | C4 | 全アクセス、開示、case action | 一般HR検索から隔離。障害時限定手順 | Build | P1 | Future |
| SYS-PAY-001 | CAP-FIN-06 | Finance | Payroll Calculation / SoR | version付きruleで給与simulation、計算、説明を行う | Payroll specialist | Conditional | 税・労働・社保（未確認） | PayrollRun, Result, RuleRef | attendance、employment、rates | payslip、bank/tax/social outputs | C4 | input、rule、計算、承認、訂正 | 初期はsimulation/export。送金は外部 | Hybrid | P1 | P5 |
| SYS-GL-001 | CAP-FIN-01 | Finance | General Ledger / SoR | journal、period、ledger、財務諸表を管理 | Accountant, controller | Core | 会計・税・会社（未確認） | Account, JournalEntry, FiscalPeriod | subledger journal candidate | statements、tax/reporting | C2-C3 | propose/approve/post/reverse/close | posted entryは更新せず反対仕訳。閉鎖時queue | Build | P0 | P4 |
| SYS-AR-001 | CAP-FIN-02; CAP-OTC-05 | Finance | Accounts Receivable / SoR | 請求債権、入金、消込、督促を管理 | AR clerk | Core | 税・保存（未確認） | Receivable, Receipt, Allocation | billing、bank statement | GL candidate、collection state | C2-C3 | invoice correction、write-off、allocation | bank不達はunapplied cashとして保留 | Build | P1 | P4 |
| SYS-AP-001 | CAP-FIN-03; CAP-PTP-05 | Finance | Accounts Payable / SoR | supplier invoice、債務、支払予定を管理 | AP clerk | Core | 税・保存（未確認） | SupplierInvoice, Payable | invoice capture、match approval | payment request、GL candidate | C3 | invoice、match exception、liability変更 | 重複疑いはhold。支払とは別承認 | Build | P0 | P3 |
| SYS-AST-001 | CAP-FIN-04-01 | Finance | Fixed Asset & Lease / SoR | 資産、減価償却、lease、除却を管理 | Fixed asset accountant | Conditional | 会計・税（未確認） | Asset, DepreciationPlan, Lease | procurement/acceptance | depreciation journal、register | C2-C3 | capitalization、method、dispose | 再計算はrule versionを保持 | Evaluate | P2 | Future |
| SYS-CST-001 | CAP-FIN-04-02 | Finance | Cost & Management Accounting / SoR+SoI | 配賦、原価、部門/店舗別採算を管理 | Controller | Conditional | 会計方針 | CostRule, AllocationRun | GL、inventory、project | profitability、journal candidate | C2-C3 | rule、run、override | source close前はprovisional表示 | Build | P2 | P4 |
| SYS-TRY-001 | CAP-FIN-05 | Finance | Treasury & Banking / SoR+Integrate | 口座、資金予測、銀行照合、支払指図を統制 | Treasurer | Conditional | 銀行・AML等（適用未確認） | BankAccountRef, PaymentInstruction, Statement | AP/payroll、bank | bank instruction/result、GL | C4 | 口座変更、承認、送信、取消 | provider停止時二重送信せず照合後再開 | Hybrid | P0 | P3 |
| SYS-TAX-001 | CAP-FIN-07 | Finance | Tax Data & Filing Support / SoR+Integrate | tax分類、集計、証拠、申告補助exportを管理 | Tax specialist | Conditional | 税法令（未確認） | TaxDetermination, FilingPackage | transaction、rule | e-Tax/eLTAX/外部税務software | C3-C4 | rule、調整、export、受領結果 | 申告完了を外部ackなしに確定しない | Hybrid | P1 | Future |
| SYS-SUP-001 | CAP-PTP-01; CAP-GOV-03 | Procurement | Supplier Management / SoR | supplier onboarding、評価、bank変更、riskを管理 | Procurement, AP, risk | Core | 取引・Privacy（未確認） | SupplierRole, Qualification | party、due diligence | approved supplier、risk event | C3-C4 | 登録、bank変更、承認、停止 | bank変更はout-of-band確認とhold | Build | P0 | P3 |
| SYS-SRC-001 | CAP-PTP-02 | Procurement | Sourcing / SoR | RFQ、bid比較、選定根拠を管理 | Buyer | Conditional | 競争・取引（未確認） | SourcingEvent, Bid, Award | purchase need、supplier | award、contract request | C2-C3 | bid閲覧、評価、conflict、award | 締切/封印要件はpolicyで制御 | Evaluate | P2 | Future |
| SYS-PO-001 | CAP-PTP-03; CAP-PTP-04 | Procurement | Purchasing & Receiving / SoR | requisition、PO、receipt、inspection、returnを管理 | Requester, buyer, receiver | Core | 取引・保存（未確認） | Requisition, PurchaseOrder, Receipt | supplier/org/catalog | contract/AP/inventory event | C2-C3 | 承認、変更、検収、例外 | 連携停止時receiptを保持し再送 | Build | P0 | P3 |
| SYS-EXP-001 | CAP-PTP-06 | Procurement | Expense & Travel / SoR | 経費・出張申請、証憑、精算を管理 | Worker, manager, AP | Conditional | 税・労務・保存（未確認） | ExpenseClaim, Trip, EvidenceRef | worker、card feed | AP/payment、GL candidate | C3-C4 | 申請、証憑、policy例外、承認 | card/provider停止時手入力+後日照合 | Build | P1 | P3 |
| SYS-CRM-001 | CAP-OTC-01; CAP-OTC-02; CAP-OTC-03 | Sales | CRM / SoR+SoE | lead、customer role、opportunity、forecastを管理 | Sales, marketing | Conditional | Privacy・表示（未確認） | Lead, CustomerRole, Opportunity | web/import、party | quote、consent event、forecast | C2-C3 | consent、assignment、stage、export | 外部CRM時はexportとwebhook照合 | Evaluate | P2 | Future |
| SYS-CPQ-001 | CAP-OTC-03-02; CAP-PRD-01 | Sales | Catalog, Pricing & Quote / SoR | offering、price version、discount、quoteを管理 | Product owner, sales | Core | 税・表示・取引（未確認） | Offering, PriceList, Quote | product policy、customer | contract/order、approval | C2-C3 | price publish、discount、quote issue | price不明時は販売停止。既発行quote固定 | Build | P1 | P4 |
| SYS-ORD-001 | CAP-OTC-04 | Sales | Order & Fulfillment / SoR | order、delivery、acceptance、return、revenue eventを管理 | Sales ops, fulfillment | Core | 契約・会計（未確認） | SalesOrder, Fulfillment, Acceptance | quote/contract、inventory | billing、revenue、customer status | C2-C3 | accept/amend/cancel/deliver/return | 部分履行を保持し冪等再処理 | Build | P1 | P4 |
| SYS-BIL-001 | CAP-OTC-05; CAP-FIN-02 | Sales | Billing / SoR | 請求書、credit、refund、subscription billingを管理 | Billing clerk | Core | 税・保存（未確認） | BillingDocument, BillingSchedule | order/delivery/subscription | customer、AR、tax | C3 | issue/correct/deliver/refund | 配送失敗は再送、発行番号を再利用しない | Build | P1 | P4 |
| SYS-CSM-001 | CAP-OTC-06 | Sales | Customer Service / SoR+SoE | 問い合わせ、苦情、SLA、解約・返金caseを管理 | Service agent, customer | Conditional | 消費者・Privacy（未確認） | CustomerCase, Entitlement | portal/email/order | resolution、refund/cancel request | C3 | 閲覧、応答、escalation、closure | channel停止時case正本を維持 | Evaluate | P2 | Future |
| SYS-CLM-001 | CAP-LGL-01 | Legal | Contract Lifecycle / SoR | contract request、review、締結、更新、終了を管理 | Legal, business owner | Core | 民商事・電子署名等（未確認） | Contract, ClauseVersion, ExecutionEvidence | quote/PO、counterparty | entitlement/order、renewal task | C3-C4 | draft閲覧、承認、署名証跡、変更 | 署名provider不達時未締結。原本を保持 | Hybrid | P0 | P3 |
| SYS-LCM-001 | CAP-LGL-02 | Legal | Legal Matter & IP / SoR | dispute、claim、litigation、privileged matter、IPを管理 | Legal | Conditional | 民事・知財等（未確認） | LegalMatter, IPRight | complaint/incident/contract | hold、task、renewal | C4 | 全アクセス、export、privilege標識 | 一般検索から隔離。外部弁護士連携を制限 | Build | P1 | Future |
| SYS-PRV-001 | CAP-LGL-04; CAP-DAT-01 | Privacy | Privacy Operations / SoR | processing inventory、consent、第三者提供、rights requestを管理 | Privacy officer | Core | 個人情報・番号（未確認） | ProcessingActivity, Consent, RightsCase | systems/data subjects | search task、response/evidence | C4 | purpose、sharing、access、disposal | identity確認失敗時は開示しない | Build | P0 | P1 |
| SYS-GRC-001 | CAP-GOV-02; CAP-GOV-03 | GRC | Obligation, Risk & Control / SoR | requirement、applicability、risk、control、evidenceを接続 | Compliance, risk, auditor | Core | 全法令・内部統制 | Requirement, Risk, Control, EvidenceLink | official source/rule/system evidence | assessment、finding、remediation | C3-C4 | source確認、control test、acceptance | source失効時review-requiredへ遷移 | Build | P0 | P1 |
| SYS-GOV-001 | CAP-GOV-01 | Governance | Corporate Governance / SoR | 株主、株式、役員、会議、決議、規程を管理 | Corporate secretary | Conditional | 会社法等（未確認） | Shareholding, Officer, Meeting, Resolution | registry、board materials | filing、minutes、authority event | C3-C4 | 原本、決議、出席、変更 | e-sign/filing不達時statusを分離 | Build | P1 | Future |
| SYS-WHB-001 | CAP-GOV-03-04 | GRC | Speak-up & Investigation / SoR+SoE | 匿名/記名通報、case、是正を隔離管理 | Reporter, restricted investigator | Conditional | 公益通報・労務（未確認） | Report, InvestigationCase | protected channel | restricted remediation/task | C4 | metadataを含む全アクセス | tenant adminからも分離可能な権限境界 | Evaluate | P0 | Future |
| SYS-ITM-001 | CAP-TEC-02 | Technology | IT Service Management / SoR+SoE | service request、incident、problem、change、release、knowledgeを管理 | User, service desk | Conditional | Security・SLA方針 | Ticket, Problem, Change, Release | monitoring/user | task、status、postmortem | C2-C3 | assignment、approval、closure、override | 外部ITSM障害時read-only export/runbook | Integrate | P2 | Future |
| SYS-ASM-001 | CAP-TEC-03; CAP-OPS-01 | Technology | Asset & Facility Management / SoR | IT/physical asset、license、badge、seat、room、vehicle等を管理 | IT, general affairs | Core | Security・会計（未確認） | Asset, Assignment, License, Facility | procurement、worker event | IAM/offboarding、finance | C2-C3 | custody、access、dispose、inventory | offline inventoryを後日reconcile | Build | P1 | P2 |
| SYS-SEC-001 | CAP-TEC-04 | Security | Security Operations / SoR+Integrate | vulnerability、exception、security incident、SBOM、third-party riskを管理 | Security team | Core | Security・漏えい報告（未確認） | Finding, Exception, SecurityIncident | scanners/SIEM/report | remediation、notification case | C4 | finding、suppression、incident action | scanner停止を正常扱いせずcoverage alert | Hybrid | P0 | P1 |
| SYS-BCP-001 | CAP-OPS-03 | Operations | BCP & Disaster Recovery / SoR | BIA、plan、RTO/RPO、訓練、復旧証跡を管理 | Continuity owner, SRE | Core | 業界/契約要件（未確認） | ImpactAnalysis, RecoveryPlan, Exercise | system catalog、backup result | crisis task、exercise evidence | C3 | plan、override、exercise、recovery | Company OS停止時に利用できるoffline export | Build | P0 | P1 |
| SYS-PPM-001 | CAP-OPS-02; CAP-STR-02 | Operations | Project & Work Management / SoR | project、task、resource、worklog、budget、risk、decisionを管理 | PM, contributor | Conditional | 労務・会計（未確認） | Project, Task, WorkLog, Decision | strategy/worker | costing、timesheet、status | C2-C3 | assignment、time、decision、change | 外部tool時はproject IDとexportを保持 | Evaluate | P2 | Future |
| SYS-MDM-001 | CAP-DAT-01 | Data | Master Data Governance / SoR | master owner、change request、quality、mergeを統制 | Data steward | Core | Privacy・業務法令 | MasterDefinition, QualityIssue | domain candidate | approved domain command | C2-C3 | owner、rule、merge、override | domain SoRを直接上書きせずcommand送信 | Build | P1 | P1 |
| SYS-BI-001 | CAP-DAT-02; CAP-STR-03 | Data | Reporting & Analytics / SoI | KPI、dashboard、法定/管理帳票、read modelを提供 | Manager, analyst, auditor | Core | 各帳票要件（未確認） | MetricDefinition, ReportVersion; factsは非正本 | domain events/ETL | report/export | C2-C4 | query、export、metric publish | stale時刻とsource watermarkを表示 | Build | P1 | P1 |
| SYS-RTL-001 | CAP-RTL-01; CAP-RTL-03 | Retail | Store & Inventory / SoR | store、assortment、stock movement、count、lossを管理 | Store staff, merchandiser | Extension | 小売・税等（未確認） | Store, SKUAssortment, StockLedger | PO/receiving/POS | availability、valuation event | C2-C3 | adjustment、waste、count、transfer | offline store queue、重複movement排除 | Build | P1 | P7 |
| SYS-POS-001 | CAP-RTL-04-01 | Retail | Point of Sale / SoR+SoE | sale、tender、return、register closeを管理 | Cashier, store manager | Extension | 税・表示・決済（未確認） | Sale, TenderRef, RegisterClose | catalog/price/loyalty | stock、billing/accounting event | C3-C4 | override、discount、return、close | offline販売上限と後日reconciliation | Hybrid | P0 | P7 |
| SYS-ECM-001 | CAP-RTL-04-02 | Retail | E-commerce & Omnichannel / SoR+SoE | EC order、pickup、delivery、returnを調整 | Customer, operations | Extension | 消費者・Privacy（未確認） | ChannelOrder, FulfillmentPromise | catalog/stock/customer | order/fulfillment/payment provider | C3-C4 | consent、order、refund、override | stock不明時promiseを制限。provider照合 | Hybrid | P1 | P7 |
| SYS-LOY-001 | CAP-RTL-05 | Retail | Loyalty & Promotion / SoR | member、point liability、coupon、promotionを管理 | Customer, marketing | Extension | Privacy・表示・会計（未確認） | Membership, PointLedger, Coupon | POS/EC/consent | balance、redemption、accounting | C3 | grant、expire、adjust、redeem | ledgerはappend/correction。二重redeem防止 | Build | P1 | P7 |
| SYS-MFG-001 | CAP-IND-01 | Manufacturing | Manufacturing Operations / SoR | BOM、MRP、生産、工程、lot、品質、保全 | Planner, operator | Extension | 業種別（未確認） | BOM, ProductionOrder, Lot, Equipment | demand/inventory | stock/cost/quality event | C2-C3 | release、consume、complete、quality | 将来調査。P7まで実装しない | Evaluate | P3 | Future |
| SYS-SVC-001 | CAP-IND-02 | Service | Service Delivery / SoR | 予約、staff assign、作業、成果物、検収を管理 | Coordinator, worker | Extension | 業種別（未確認） | Booking, ServiceAssignment, Deliverable | order/worker | acceptance/billing/time | C2-C3 | assign、perform、accept、cancel | 将来調査。共通Taskへの過剰統合を避ける | Evaluate | P3 | Future |

## 4. Source of Truth境界

| 識別対象 | 正本 | 禁止事項 |
| --- | --- | --- |
| Person/Organizationの同一性 | SYS-PTY-001 | Customer/Supplier/Workerが人物属性を独自複製して更新しない |
| 雇用関係 | SYS-HR-001 | IAM accountを雇用正本にしない |
| credential/authentication | SYS-IAM-001 | アプリDBへpassword/MFA secretを保持しない |
| authorization policy | SYS-AUT-001 | UI表示制御だけで認可を完了しない |
| 契約原本と締結証跡 | SYS-CLM-001 + SYS-DOC-001 | Order/POへ原本文書を複製しない |
| Supplier invoice / payable | SYS-AP-001 | Document metadataを債務正本にしない |
| Customer billing / receivable | SYS-BIL-001 / SYS-AR-001 | PDFを請求状態の正本にしない |
| posted accounting entry | SYS-GL-001 | 業務moduleからposted journalを更新しない |
| Audit event | SYS-AUD-001 | observability logを監査正本と呼ばない |
| Retention/Hold decision | SYS-RET-001 | 各moduleが独自期限だけで物理削除しない |

## 5. 外部連携の共通責任境界

すべての`Integrate`/`Hybrid` Systemに以下を要求する。

1. timeout、最大retry回数、exponential backoff、circuit breakerを接続先別に設定する。
2. idempotency keyと送信payload hashを保持し、timeout後に同一業務を二重確定しない。
3. `requested / transmitted / acknowledged / rejected / reconciled`を別状態として扱う。
4. DLQ、手動再処理、照合、operator向けrunbookを備える。
5. 外部停止時も内部正本を破壊せず、stale/保留状態を利用者へ表示する。
6. credentialはsecret manager参照とし、log/auditへ値を残さない。
7. vendor exit用export、データ削除確認、version/EOL監視を契約に含める。

数値上限は接続先仕様が確定するTASK-006または個別Implementation Contractで定める。「無制限retry」は禁止する。

## 6. Build / Buy / Integrate判断の保留事項

| 対象 | 現時点の推奨 | 根拠 | TASK-006で確定する事項 |
| --- | --- | --- | --- |
| IdP/MFA | Integrate | credentialと認証protocolの自作リスク | Keycloak対Managed IdP、local profile |
| Workflow/Audit/Rule | Build | Company OSの横断的な説明可能性・統制を証明 | engine方式、storage、versioning |
| Document binary | Hybrid | metadata/authorizationは固有、object storage/scanは汎用品 | MinIO/S3、scanner、暗号境界 |
| Payroll/Tax filing | Hybrid | rule説明は価値、申告・送金の責任が大きい | simulation範囲、adapter contract |
| E-sign/Bank/Tax APIs | Integrate | 外部認証・契約・仕様追随が必要 | sandbox可用性、fallback、license/cost |
| CRM/ATS/ITSM/LMS | Evaluate | 自作は全体KPIへの寄与が限定的 | reference adapterと最小内製範囲 |

## 7. セキュリティ・性能・運用リスク

- C4データを持つSystemは独立permission、purpose-aware access、masking、全閲覧auditを要求する。
- SYS-AUD-001へbefore/afterを無条件複製せず、classification別のredaction schemaを使う。
- list/report APIにはpaginationと最大export件数を設定し、大量exportは非同期jobと追加承認を使う。
- append-only ledgerはpartition/archiveとrestore時の完全性検証を必要とする。
- integration/read modelの遅延はwatermarkで可視化し、stale dataを最新と表示しない。
- DB、object、external acknowledgmentの整合性は分散transactionではなくoutboxとreconciliationで回復する。

## 8. 受け入れ条件

- [x] 必須列を全Systemに定義した。
- [x] Source of Truthの競合と禁止事項を明示した。
- [x] 外部サービス障害時の共通責任境界と個別fallbackを記載した。
- [x] Capability IDとSystem IDを相互参照可能にした。
- [x] 原典の全システム候補を論理Systemへ包含した。
- [x] Mandatory、Build/Buy/Integrate、Priority、Phaseを付与した。
- [x] v0.1 Requirementから該当Systemへの逆引きをRequirement YAMLとLegal Catalogで定義した。
- [x] TASK-006のADRで技術・外部製品の選定方針を確定した。

未調査法令は曖昧なRequirement IDへ置換せず`未確認`を維持し、Law Catalog backlogから実装前に追加する。
