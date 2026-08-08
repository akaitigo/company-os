# Company OS — Codex Handoff Specification

## 0. この文書の目的

この文書は、以下の構想を Codex / Claude Code 等の実装エージェントへ引き継ぐための作業仕様書である。

目的は単なる「社内システムの寄せ集め」を作ることではない。

> 日本企業の設立・雇用・取引・会計・統制・運営に必要な業務システム群を整理し、
> 法令・業務要件・データモデル・権限・監査・インフラ・デプロイまで含めて参照実装する
> “Company OS” をOSSとして構築する。

成果物は GitHub 上で公開可能な品質を目指し、以下の用途に耐えうる設計とする。

- 個人ポートフォリオ
- OSS
- 企業向け参照実装
- 学習教材
- システム設計資料
- 将来的なSaaS / 導入支援への発展
- 「会社経営に必要なシステムを横断して理解・設計・実装できる」ことの証明

---

# 1. プロジェクトのゴール

最終的には、企業運営に必要なシステムを次の観点から漏れなく整理し、それぞれについて実装可能な状態にする。

1. 業務目的
2. 対象ユーザー
3. 業務フロー
4. 必要データ
5. 法令・制度上の根拠
6. 適用条件
7. 保存期間
8. 権限・職務分離
9. 監査証跡
10. 外部システム連携
11. 非機能要件
12. セキュリティ要件
13. テスト要件
14. デプロイ方法
15. 運用・バックアップ・復旧
16. 法改正への追随方法
17. SaaS化・マルチテナント化の可能性

「動くデモ」だけではなく、

**業務要件 → 法的根拠 → システム要件 → データ → 実装 → テスト**

のトレーサビリティを持たせる。

---

# 2. 前提

## 2.1 対象国

初期対象は日本。

将来的な国際化を阻害しないデータモデルにするが、
Phase 1 では日本法・日本の商習慣を優先する。

## 2.2 対象企業

特定業種専用ではなく、まず一般企業の共通業務を対象とする。

その上で業種別モジュールを追加できるようにする。

初期業種拡張の第一候補は小売業。

## 2.3 重要な思想

「すべてを自前実装する」こと自体を目的にしない。

以下を区別する。

- 自社固有ロジックとして持つべきもの
- OSSで代替できるもの
- SaaS / 外部サービスへ委譲すべきもの
- 法令変更が激しく外部連携に寄せた方が合理的なもの
- 学習目的で自作する価値があるもの

各機能について Build / Buy / Integrate の判断理由を記録する。

---

# 3. プロジェクトで証明したい能力

このプロジェクトは以下の能力を示すためのものでもある。

- 企業業務理解
- 業務分析
- 要件定義
- ドメインモデリング
- エンタープライズアーキテクチャ
- 会計・労務・法務・内部統制の基礎理解
- API設計
- データモデリング
- セキュリティ設計
- IAM / RBAC / ABAC
- DevSecOps
- CI/CD
- IaC
- Observability
- バックアップ / DR
- 法改正対応
- SaaS設計
- OSS設計
- AIエージェントを利用したソフトウェア開発

---

# 4. Company OS 全体ドメイン

以下を現時点の全体スコープとする。

---

## 4.1 Common Platform / 共通基盤

すべての業務システムから利用される基盤。

### 必須候補

- 法人管理
- 事業所管理
- 組織管理
- 部署
- 役職
- ユーザー
- 従業員
- 外部ユーザー
- 認証
- SSO
- MFA
- RBAC
- ABAC
- 職務分離（SoD）
- 承認ワークフロー
- 通知
- タスク
- 期限管理
- 文書管理
- 添付ファイル管理
- 電子証憑管理
- コメント
- タグ
- 監査ログ
- 変更履歴
- 法令ルール
- 規程ルール
- データ保持 / 廃棄
- API
- Webhook
- CSV import/export
- バッチ
- ジョブ管理
- マスターデータ管理
- Feature Flag
- 設定管理
- レポート
- ダッシュボード

---

# 5. 人事 / HR

## システム候補

- 採用管理 ATS
- 応募者管理
- 面接管理
- 内定管理
- 入社手続
- 雇用契約
- 従業員台帳
- 人事マスター
- 組織異動
- 配属
- 出向
- 兼務
- 役職
- 評価
- 目標管理
- スキル管理
- 資格管理
- 研修管理
- キャリア管理
- 福利厚生
- 人員計画
- 人件費計画
- 退職手続
- Offboarding
- 貸与物返却
- アカウント停止

---

# 6. 労務 / Labor

## システム候補

- 勤怠管理
- 打刻
- 勤務予定
- シフト
- 所定労働時間
- フレックス
- 変形労働時間
- 裁量労働
- 残業申請
- 休日勤務
- 深夜勤務
- 休憩
- 有給休暇
- 特別休暇
- 休業
- 育児・介護休業
- 36協定管理
- 労働時間上限監視
- 勤務間インターバル
- 健康診断
- 安全衛生
- ストレスチェック
- 労災
- ハラスメント相談
- 産業医関連
- 衛生委員会
- 就業規則
- 労使協定
- 労働条件通知

## 法令調査対象例

- 労働基準法
- 労働契約法
- 労働安全衛生法
- 育児・介護休業法
- 男女雇用機会均等法
- パートタイム・有期雇用労働法
- 最低賃金法
- 労働者災害補償保険法
- 雇用保険法

Codexは法令名だけで完了とせず、
「どの機能・項目・保存・通知・制御に影響するか」を整理すること。

---

# 7. 給与 / Payroll

## システム候補

- 月例給与
- 賞与
- 手当
- 控除
- 遡及計算
- 欠勤控除
- 残業代
- 深夜割増
- 休日割増
- 社会保険
- 雇用保険
- 所得税
- 住民税
- 年末調整
- 源泉徴収票
- 給与明細
- 賃金台帳
- 振込データ
- 退職時精算

### 外部連携候補

- e-Gov
- 日本年金機構
- e-Tax
- eLTAX
- 銀行振込

給与は法改正・料率変更の影響が大きいため、
ルールエンジン / バージョン管理を必須設計とする。

---

# 8. 会計 / Accounting

## システム候補

- 勘定科目
- 補助科目
- 仕訳
- 仕訳帳
- 総勘定元帳
- 試算表
- 売掛金
- 買掛金
- 未収金
- 未払金
- 前払
- 前受
- 仮払
- 仮受
- 固定資産
- 減価償却
- リース
- 資金管理
- 銀行口座
- 入出金
- 消込
- 月次決算
- 四半期決算
- 年次決算
- 貸借対照表
- 損益計算書
- キャッシュフロー
- 部門別会計
- 管理会計
- 原価計算
- 予算
- Forecast
- 実績比較

---

# 9. 税務 / Tax

## 対象

- 法人税
- 消費税
- 源泉所得税
- 住民税
- 固定資産税関連
- インボイス制度
- 電子帳簿保存法

### システム設計上の原則

税務申告ソフトそのものを完全再実装することを最初の目標にしない。

Company OS から、

- 必要な帳簿
- 証憑
- 集計データ
- API / CSV
- 申告補助データ

を正しく出力できることを優先する。

---

# 10. 購買 / Procurement

## システム候補

- 購買申請
- 見積依頼
- 相見積
- サプライヤー選定
- 発注
- 発注変更
- 納品
- 検収
- 請求書受領
- 三点照合
- 支払申請
- 支払承認
- 支払実行
- 取引先評価
- 基本契約
- 個別契約

### 内部統制

以下の職務分離を検討する。

- 取引先登録
- 発注
- 検収
- 請求書承認
- 支払承認
- 振込実行

---

# 11. 販売 / Sales

## システム候補

- CRM
- 見込客
- 顧客
- 商談
- 見積
- 契約
- 受注
- 商品
- サービス
- 価格
- 値引
- 納品
- 売上
- 請求
- 入金
- 消込
- 督促
- 継続課金
- サブスクリプション
- 解約
- 顧客ポータル
- 問い合わせ
- 苦情
- 返品

重要な業務トレーサビリティ：

Lead
→ Opportunity
→ Quote
→ Contract
→ Order
→ Delivery
→ Revenue
→ Invoice
→ Payment
→ Journal Entry

---

# 12. 契約 / Legal

## システム候補

- 契約申請
- 契約審査
- 法務レビュー
- 電子契約
- 締結
- 契約原本管理
- 契約期限
- 更新
- 自動更新
- 解約
- NDA
- 基本契約
- 個別契約
- 利用規約
- プライバシーポリシー
- 知的財産
- 商標
- 訴訟
- 紛争
- クレーム

---

# 13. Corporate Governance / 会社統治

## システム候補

- 株主
- 株式
- 役員
- 取締役会
- 株主総会
- 決議
- 議事録
- 定款
- 規程
- 社内規則
- 稟議
- 決裁権限
- 権限規程
- 内部監査
- 内部統制
- J-SOX
- リスク管理
- コンプライアンス
- 内部通報

---

# 14. Privacy / 個人情報保護

## 対象

- 個人情報
- 要配慮個人情報
- マイナンバー
- Cookie / Web tracking
- 顧客情報
- 従業員情報
- 委託先管理
- 第三者提供
- 開示請求
- 訂正請求
- 利用停止
- 削除
- データ保持期間

## 必須設計

- Data Classification
- Purpose of Processing
- Consent
- Legal Basis
- Access Control
- Retention
- Deletion
- Audit
- Export
- Disclosure Request

---

# 15. IT Service Management

## システム候補

- IT資産
- PC
- スマートフォン
- ソフトウェア
- ライセンス
- SaaS
- アカウント
- IAM
- 権限申請
- Service Desk
- Incident
- Problem
- Change
- Release
- Knowledge Base
- CMDB
- SLA
- SLO
- Vendor management

---

# 16. セキュリティ

## システム / 機能候補

- IAM
- MFA
- SSO
- RBAC
- ABAC
- PAM
- Secrets Management
- Audit Log
- Vulnerability Management
- Security Incident
- Security Training
- Asset Inventory
- Risk Register
- Third Party Risk
- Exception Management
- SBOM

## 参照候補

- IPA
- NISC
- 個人情報保護委員会
- OWASP
- NIST
- CIS

日本法優先。
国際標準は設計品質向上のため利用する。

---

# 17. BCP / Disaster Recovery

## 対象

- Business Impact Analysis
- BCP
- DR
- 緊急連絡
- 災害対応
- システム停止
- Backup
- Restore
- RTO
- RPO
- 復旧訓練
- 代替業務
- 手作業Fallback

---

# 18. Facilities / 総務

## システム候補

- 備品
- 貸与品
- 入退室
- 鍵
- 社員証
- 座席
- 会議室
- 車両
- 保険
- 契約施設
- 郵便
- 社内申請
- 印章
- 防災用品

---

# 19. Project / Work Management

## システム候補

- Project
- Task
- Milestone
- Resource
- Assignment
- Work Log
- Timesheet
- Cost
- Budget
- Issue
- Risk
- Decision
- Change Request

---

# 20. 業種別拡張

## 小売

優先度高。

- 店舗
- 商品
- SKU
- JAN
- 商品分類
- 仕入先
- 原価
- 売価
- 特売
- POS
- 販売
- 在庫
- 発注
- 入荷
- 棚卸
- 移動
- 廃棄
- ロス
- 返品
- 店舗シフト
- 会員
- ポイント
- クーポン
- EC
- Omni-channel
- 店舗別P/L

## 製造

- BOM
- MRP
- 生産計画
- 製造指図
- 工程
- 品質
- ロット
- トレーサビリティ
- 設備保全

## サービス

- 予約
- 案件
- スタッフアサイン
- 作業
- 成果物
- 検収
- 継続契約

## 規制業種

将来個別調査。

- 医療
- 介護
- 金融
- 建設
- 運送
- 教育
- 人材
- 不動産

---

# 21. 共通データモデル

最低限以下を検討する。

## Organization

- LegalEntity
- Establishment
- OrganizationUnit
- Department
- Position
- CostCenter
- Project
- FiscalPeriod

## People

- Person
- Worker
- Employment
- EmploymentContract
- Assignment
- Compensation
- WorkSchedule
- Qualification
- Training

## Parties

- Counterparty
- Customer
- Supplier
- Contact
- BankAccount

## Commerce

- Product
- Service
- Price
- Quote
- Contract
- Order
- Delivery
- Inspection
- Invoice
- Payment

## Accounting

- Account
- JournalEntry
- JournalLine
- FiscalPeriod
- TaxCategory

## Governance

- ApprovalRequest
- ApprovalDecision
- Policy
- PolicyVersion
- Rule
- RuleVersion
- Document
- Evidence
- AuditEvent
- RetentionSchedule
- ComplianceRequirement
- IncidentCase

---

# 22. 法令をコードへ直書きしない

重要原則。

法令・税率・保険料率・給与計算・保存期間等は、
可能な限り以下のような構造で管理する。

```yaml
rule_id:
jurisdiction:
authority:
legal_source:
legal_reference:
effective_from:
effective_to:
applicability:
calculation:
rounding:
required_evidence:
retention:
output_schema_version:
test_case_version:
verified_at:
verified_by:
```

目的：

- 過去時点再計算
- 法改正対応
- ルール差替
- テスト
- 根拠確認
- Audit

---

# 23. 法令調査ルール

Codexが法令調査を行う場合、以下を必須とする。

## 優先情報源

1. e-Gov法令検索
2. 厚生労働省
3. 国税庁
4. 日本年金機構
5. 個人情報保護委員会
6. 金融庁
7. 消費者庁
8. デジタル庁
9. 総務省
10. IPA
11. その他所管省庁

二次情報は補助に留める。

## 1法令につき記録する内容

- 法令名
- 条文番号
- 所管
- URL
- 公布日
- 施行日
- 最終確認日
- 対象者
- 適用条件
- 義務
- 禁止事項
- 必要な記録
- 必要項目
- 保存期間
- 提出先
- 提出期限
- 電子提出可否
- システム要件
- UI要件
- Validation
- Audit Log 要件
- Test Case
- 関連するCompany OS module

---

# 24. Applicability Engine

日本法では企業規模だけでなく、

- 法人
- 事業場
- 従業員数
- 常時使用労働者
- 雇用形態
- 業種
- 取引内容
- 上場状態
- 資本金
- 売上
- 許認可
- 自治体
- 年度

等で義務が変わる。

よって、

```text
Company Profile
       ↓
Applicability Engine
       ↓
Applicable Requirements
       ↓
Required Controls / Records / Reports
```

という仕組みを検討する。

例：

```text
if establishment.employee_count >= X:
    require(...)
```

ただし人数・条件はコード定数に直接固定せず、
法令ルールとして管理する。

---

# 25. 記録保存

保存期間は単一設定にしない。

```text
Document Type
× Law
× Fiscal Year
× Employee / Transaction Status
× Legal Hold
= Disposal Date
```

RetentionSchedule を中核機能とする。

必要機能：

- 保存開始日
- 保存期限
- 起算イベント
- 延長
- Legal Hold
- 自動廃棄
- 廃棄承認
- 廃棄証跡

---

# 26. Audit

原則すべての重要操作で、

- Who
- When
- What
- Before
- After
- Why
- Source
- Approval
- Rule Version
- Request ID

を残す。

重要データについて履歴を物理削除しない。

訂正として扱う。

---

# 27. 職務分離 / SoD

例：

## Procurement

Supplier registration
≠ Purchase approval
≠ Inspection
≠ Payment approval
≠ Bank execution

## HR

Employee master update
≠ Payroll approval

## Accounting

Journal creation
≠ Journal approval
≠ Closing approval

## IAM

Access request
≠ Access approval
≠ Access provisioning

ルールをPolicy Engineで定義可能にする。

---

# 28. センシティブデータ

以下は通常データと分離を検討する。

- My Number
- Health information
- Stress check
- Salary
- Bank account
- Internal whistleblowing
- Harassment reports
- Credentials
- Security incidents

必要事項：

- 独立権限
- Encryption
- Masking
- Access audit
- Retention
- Secure deletion

---

# 29. アーキテクチャ方針

初期はマイクロサービス化しない。

推奨：

> Modular Monolith + Event Driven Integration

理由：

- 個人開発可能
- Domain Boundaryを維持できる
- オーバーヘッドが小さい
- 将来的な分割が可能

候補構成：

```text
Web / Mobile
   ↓
API / Backend
   ↓
Domain Modules
   ↓
PostgreSQL

+ Object Storage
+ Job Queue
+ Event Bus
+ IAM / IdP
+ Audit
+ Observability
```

---

# 30. 技術選定原則

特定技術を先に固定しない。

以下の評価軸でADRを作成する。

- 要件適合
- 開発速度
- 型安全性
- テスト性
- エコシステム
- 人気
- 採用実績
- コミュニティ規模
- メンテナンス継続性
- ライブラリ成熟度
- AI Coding Agentとの相性
- Hosting cost
- 運用難易度
- セキュリティ
- OSS License
- 将来の人材確保

「人気だから採用」ではなく、
人気・採用実績も保守性リスクの指標として評価する。

---

# 31. 非機能要件

## Security

- MFA
- OIDC
- SAML
- Least Privilege
- RBAC
- ABAC
- Encryption at Rest
- Encryption in Transit
- Secret Management
- CSRF
- XSS
- SQL Injection
- SSRF
- Rate Limit
- Session Management
- Audit
- SBOM
- SAST
- SCA
- DAST
- Container Scan

## Reliability

- Backup
- Restore
- PITR
- Retry
- Idempotency
- Dead Letter
- Health Check
- Graceful Shutdown

## Observability

- Structured Log
- Metrics
- Trace
- Alert
- Dashboard
- Correlation ID

## Availability

段階別Profileを設ける。

### Development

best effort

### SMB

実用的なSLAを想定

### Enterprise

HA / DRを検討

## Performance

- pagination
- indexing
- caching
- async
- batch
- reporting read model

---

# 32. デプロイ

最低3種類のプロファイルを提供する。

## Local

Docker Compose

例：

- App
- PostgreSQL
- MinIO
- Keycloak
- Mailpit
- OpenTelemetry Collector

## Cloud Small

候補：

- Managed Container
- Managed PostgreSQL
- Object Storage
- Managed Secrets
- CDN / WAF

## Enterprise

- Kubernetes
- Managed Database
- HA
- DR
- SIEM
- Enterprise IdP
- Private Network
- KMS

IaCは必須。

候補：

- Terraform
- OpenTofu
- Kubernetes manifests
- Helm

---

# 33. CI/CD

最低限：

```text
Pull Request
  ↓
Lint
  ↓
Type Check
  ↓
Unit Test
  ↓
Integration Test
  ↓
Security Scan
  ↓
Build
  ↓
E2E
  ↓
Deploy Preview
```

main:

```text
Build
→ Migration Check
→ Deploy
→ Smoke Test
→ Monitoring
```

---

# 34. Testing Strategy

## Unit

Domain rule

## Integration

DB / API / Event

## Contract

External API

## E2E

主要業務

## Compliance Test

法令ルール

例：

```text
Given:
  employee condition X

When:
  working hours Y

Then:
  warning Z
```

## Migration Test

旧schema → 新schema

## Security

- SAST
- SCA
- DAST
- authz test

## DR

定期Restoreテスト。

---

# 35. GitHub Repository案

```text
company-os/
├─ README.md
├─ LICENSE
├─ SECURITY.md
├─ CONTRIBUTING.md
├─ CODE_OF_CONDUCT.md
├─ docs/
│  ├─ vision/
│  ├─ domains/
│  ├─ business-processes/
│  ├─ laws/
│  ├─ requirements/
│  ├─ architecture/
│  ├─ data-model/
│  ├─ threat-model/
│  ├─ operations/
│  └─ adr/
├─ compliance/
│  ├─ requirements/
│  ├─ applicability/
│  ├─ retention/
│  ├─ evidence/
│  └─ change-log/
├─ apps/
│  ├─ admin-web/
│  ├─ employee-web/
│  └─ mobile/
├─ modules/
│  ├─ organization/
│  ├─ identity/
│  ├─ workflow/
│  ├─ documents/
│  ├─ hr/
│  ├─ attendance/
│  ├─ payroll/
│  ├─ expenses/
│  ├─ accounting/
│  ├─ procurement/
│  ├─ sales/
│  ├─ contracts/
│  ├─ compliance/
│  └─ audit/
├─ packages/
│  ├─ common/
│  ├─ authz/
│  ├─ audit-sdk/
│  ├─ policy-engine/
│  └─ rules-jp/
├─ integrations/
│  ├─ egov/
│  ├─ etax/
│  ├─ eltax/
│  ├─ banking/
│  └─ identity/
├─ infra/
│  ├─ docker/
│  ├─ terraform/
│  ├─ kubernetes/
│  └─ observability/
├─ tests/
│  ├─ unit/
│  ├─ integration/
│  ├─ e2e/
│  ├─ compliance/
│  └─ disaster-recovery/
└─ sample-data/
```

これは初期案。
Codexは必要に応じて変更可能だがADRで理由を残す。

---

# 36. 実装ロードマップ

## Phase 0 — Research & Specification

コードを書く前に完成させる。

### Deliverables

- Domain Map
- Business Capability Map
- System Catalog
- Law Catalog
- Requirement Catalog
- Applicability Matrix
- Retention Matrix
- Data Classification
- Master Data Ownership
- Role Matrix
- SoD Matrix
- Integration Map
- Non Functional Requirements
- Threat Model
- Glossary

---

# 37. Phase 1 — Platform

実装：

- Organization
- Identity
- User
- Role
- Permission
- Workflow
- Approval
- Document
- Audit
- Notification
- Rule Engine
- Retention

完了条件：

複数業務モジュールから再利用可能。

---

# 38. Phase 2 — HR + Attendance

実装：

- Employee
- Employment
- Organization Assignment
- Work Schedule
- Attendance
- Clock
- Break
- Overtime
- Leave
- Monthly Closing

出力：

- Employee Ledger
- Attendance Report
- Paid Leave Management
- Payroll Input

---

# 39. Phase 3 — Expense + Procurement + AP

実装：

- Supplier
- Expense
- Purchase Request
- PO
- Receipt
- Inspection
- Invoice
- Approval
- Payment Request

電子帳簿保存・インボイス関連要件を含める。

---

# 40. Phase 4 — Accounting

実装：

- Journal
- Ledger
- AP
- AR
- Closing
- Trial Balance
- BS
- PL
- Department PL

---

# 41. Phase 5 — Payroll

順序を遅らせる。

理由：

- 法令
- 税
- 社保
- 遡及
- 端数
- 年末調整

が複雑。

最初は、

```text
Attendance
→ Payroll Input
→ Payroll Simulation
→ Explanation
```

を作る。

その後、

- Full Payroll
- Social Insurance
- Tax
- Year End Adjustment

へ進む。

---

# 42. Phase 6 — Governance

- Contract
- Policy
- Risk
- Compliance
- Internal Audit
- Whistleblowing
- SoD
- Internal Control

---

# 43. Phase 7 — Retail Extension

最後に小売業拡張。

```text
Product
→ Store
→ Purchase
→ Receiving
→ Inventory
→ POS Sales
→ Accounting
```

加えて、

- Store Labor
- Shift
- Store PL

まで接続する。

---

# 44. 最初にCodexへ依頼する作業

いきなり実装を始めないこと。

最初のTaskは以下。

## TASK-001

この文書をレビューし、

1. 抜けている企業業務
2. 重複
3. ドメイン境界の問題
4. 法令調査漏れ
5. 不要なスコープ
6. 実装順序の問題
7. OSSとしての問題
8. 商用化時の問題

を洗い出す。

成果：

`docs/reviews/initial-gap-analysis.md`

---

# 45. TASK-002 — Business Capability Map

全Company OSを、

```text
L0
L1
L2
L3
```

程度で階層化する。

例：

```text
Human Resources
 ├─ Workforce Planning
 ├─ Recruiting
 ├─ Employment
 ├─ Attendance
 ├─ Payroll
 └─ Offboarding
```

成果：

`docs/domains/business-capability-map.md`

Mermaid図も作成。

---

# 46. TASK-003 — System Catalog

全システムを表にする。

列：

```text
ID
Domain
System
Purpose
Primary User
Mandatory?
Legal Dependency
Source of Truth
Inbound
Outbound
Sensitive Data
Audit Requirement
Build / Buy / Integrate
Priority
Phase
```

成果：

`docs/domains/system-catalog.md`

---

# 47. TASK-004 — Legal Requirement Catalog

重要法令を調査。

各RequirementにID付与。

例：

```text
JP-LABOR-001
JP-TAX-001
JP-PRIVACY-001
```

成果：

```text
compliance/requirements/*.yaml
```

各要件は公式情報源へのURLを保持する。

---

# 48. TASK-005 — Domain Model

Phase 1〜4を中心に、

- aggregate
- entity
- value object
- lifecycle
- invariant
- event

を整理。

成果：

`docs/data-model/domain-model.md`

---

# 49. TASK-006 — Architecture Decision

技術選定。

最低候補として比較するもの：

Backend:

- TypeScript
- Go
- Java
- Kotlin
- Rust
- C#

Frontend:

- React / Next.js
- Vue / Nuxt
- SvelteKit

DB:

- PostgreSQL

Identity:

- Keycloak
- Auth.js系
- Managed IdP

比較結果をADRとして残す。

---

# 50. TASK-007 — Repository Bootstrap

TASK-001〜006完了後。

作成：

- monorepo
- formatter
- lint
- typecheck
- test
- CI
- Docker
- docs
- ADR
- SECURITY
- license

---

# 51. Definition of Done

機能単位のDoD：

- Requirement ID がある
- Sourceがある
- Domain modelがある
- API contractがある
- Authorization ruleがある
- Audit ruleがある
- Validationがある
- Unit testがある
- Integration testがある
- Compliance testがある
- Migrationがある
- Observabilityがある
- Documentationがある
- Sample dataがある
- UIがある場合accessibility考慮

---

# 52. 品質方針

「100点の巨大ERPを最初から作る」のではない。

各領域について、

> 実務で80点以上の設計品質を安定して出せる参照実装

を目標とする。

その代わり、

- 根拠
- 設計思想
- 拡張性
- テスト
- 運用性

を極めて高い水準で揃える。

---

# 53. 商用化を想定した設計

後から以下に発展できる構造を意識する。

- Single tenant
- Multi tenant
- SaaS
- Self-host
- Enterprise deployment
- Managed service

必要になるもの：

- Tenant
- Subscription
- Feature Flag
- Plan
- Usage
- Billing
- Tenant isolation
- Data export
- Data deletion
- Migration
- Support tooling

ただし初期実装で請求システムまで作らない。

---

# 54. OSSとして必要なもの

- README
- License
- SECURITY.md
- CONTRIBUTING.md
- Code of Conduct
- Issue Template
- PR Template
- Architecture
- Roadmap
- Demo
- Sample Company
- Seed Data
- Screenshots
- Threat Model
- Security Policy
- Version Policy
- Migration Guide

---

# 55. 避けること

Codexは以下を避ける。

### 1. 法令の推測

必ず公式情報確認。

### 2. 法令ロジックのハードコード

ルールとして管理。

### 3. 最初からマイクロサービス

不要。

### 4. UIから先に作る

Domain / Requirement優先。

### 5. CRUDだけ作って完成扱い

業務ルールを実装する。

### 6. Auditを後付け

最初から組み込む。

### 7. セキュリティを最後に実装

設計時から考慮。

### 8. SaaS前提で過剰設計

初期はOSS参照実装。

### 9. 「法律完全対応」と軽率に宣言

公式情報と確認時点を明記。

---

# 56. Codexへの重要な指示

このプロジェクトでは、
一般的な「ベストプラクティス」を無条件に採用してはいけない。

各設計判断について、

- なぜ必要か
- 他候補は何か
- 何を犠牲にするか
- どの要件から導かれるか

を考える。

技術選定でも、

- 新しいから
- 人気だから
- Googleだから
- Cloud Nativeだから

という理由だけで選ばない。

ただし、

- 人気
- 採用数
- Community
- Ecosystem
- Maintenance

は将来の保守性に直結するため重要な評価軸である。

---

# 57. 最終的な理想像

最終的なGitHub READMEを見た人が、

> この人は勤怠システムを作れる

ではなく、

> この人は「会社がどう動くのか」を理解し、
> 人・金・契約・取引・会計・統制・法令・ITを
> 一つのシステムアーキテクチャとして設計できる

と判断できる状態。

これをCompany OSプロジェクトの最上位KPIとする。

---

# 58. Codexの開始プロンプト

以下をCodexへの最初の指示として利用できる。

```text
このリポジトリでは、日本企業の経営・業務運営に必要となる
社内システム群を "Company OS" としてOSS参照実装します。

最初からコードを書かないでください。

まず COMPANY_OS_CODEX_HANDOFF.md を全文読み、
TASK-001〜006を順に進めるための調査・設計計画を作成してください。

特に重要なのは以下です。

- 日本企業に必要な業務領域の網羅性
- 公式情報源に基づく法令要件
- 法令→業務要件→システム要件のトレーサビリティ
- 適用条件
- 保存期間
- 権限
- 職務分離
- Audit
- Privacy
- Security
- Operability
- Deployability

一般論・慣例をそのまま採用せず、
要件、制約、保守性、エコシステム、人気、採用実績等を比較して
合理的に判断してください。

不確かな法令・制度・仕様は推測せず、
必ず一次情報を確認してください。

TASK-001として、
この構想のGap Analysisから開始してください。
```

---

# 59. 最初のマイルストーン

Milestone 0:

**Company OS Specification v0.1**

完了条件：

- Company Capability Map
- System Catalog
- Legal Catalog
- Requirement Catalog
- Applicability Matrix
- Data Classification
- Retention Matrix
- SoD Matrix
- Integration Map
- Architecture Draft
- Technology Evaluation
- Initial ADR

ここが完成するまでは本格実装へ進まない。

---

# 60. 最終注意

この文書は設計の基点であり、法的助言そのものではない。

法令・省令・告示・ガイドラインは変更されるため、
実運用・商用利用を想定する際は最新一次情報と専門家レビューを前提とする。

Codexは調査時点を記録し、
「確認済み」「未確認」「要専門家レビュー」を区別すること。
