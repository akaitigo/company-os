# TASK-001: Initial Gap Analysis

## 1. 結論

構想は業務領域、法令、監査、運用を一体で扱う点が強い。一方、現状は「能力」「製品機能」「法的義務」「外部サービス」が同じ階層に混在し、初期スコープが一人または小規模チームで検証できる単位を超えている。

Milestone 0では網羅性を維持しつつ、実装対象を「共通基盤 + 1本の業務縦断フロー」に絞るべきである。推奨する最初の縦断フローは、法改正頻度と機微情報リスクが比較的低く、監査・承認・会計連携を検証できる `購買申請 → 承認 → 発注 → 検収 → 請求書 → 支払依頼 → 仕訳候補` である。

本レビューは構想の設計レビューであり、法令適合性の確認ではない。法令名・適用・保存期間・電子化要件はTASK-004で公式一次情報を確認する。

## 2. 優先度

| 優先度 | 意味 |
| --- | --- |
| P0 | 後続成果物の正しさを阻害するため、TASK-002開始前に方針決定が必要 |
| P1 | Milestone 0内で解消が必要 |
| P2 | TASK-007前までに判断すればよい |
| P3 | 将来フェーズの検討事項 |

## 3. 指摘一覧

| ID | 優先度 | 観点 | 問題 | 推奨 | 反映先 |
| --- | --- | --- | --- | --- | --- |
| GAP-001 | P0 | 境界 | Capability、System、Module、Controlが混在 | 用語と階層のメタモデルを先に定義 | TASK-002/003 |
| GAP-002 | P0 | スコープ | Phase 1が基盤だけで大規模かつ価値検証不能 | 最小縦断フローで基盤を実証 | TASK-002/005/006 |
| GAP-003 | P0 | データ | Party/Person/Worker/Customer/Supplierの同一性と正本が未定 | Party modelとcontext別ownershipを定義 | TASK-005 |
| GAP-004 | P0 | 法令 | 法的義務、ガイドライン、社内統制が未分離 | Requirement種別と証拠強度をschema化 | TASK-004 |
| GAP-005 | P0 | 商用 | OSSコア、SaaS control plane、導入固有設定の境界が未定 | 配布・拡張モデルをADR化 | TASK-006 |
| GAP-006 | P1 | 業務 | 経費、財務、経営管理、品質、顧客サポート等の一部が独立能力として不足 | Capability Mapへ追加 | TASK-002 |
| GAP-007 | P1 | 法令 | 会社法、民法、税法、電子取引、雇用、個人情報以外の横断調査群が不足 | 法令調査バックログを拡張 | TASK-004 |
| GAP-008 | P1 | 監査 | Audit Eventと法的証拠・業務証跡・observability logが混在 | 証跡種別、完全性、閲覧権限、保持を分離 | TASK-004/005/006 |
| GAP-009 | P1 | データ | 時点管理、訂正、取消、締め、再オープンが不足 | bitemporal/valid-time要否をcontext別決定 | TASK-005 |
| GAP-010 | P1 | 外部連携 | 障害、重複、再送、照合、契約終了時の設計が不足 | integration lifecycleをNFR化 | TASK-003/006 |
| GAP-011 | P1 | OSS | サンプルデータの匿名性、商標、貢献物、第三者ライセンスが不足 | governanceとsupply-chain方針を追加 | TASK-006/007 |
| GAP-012 | P1 | Privacy | データ主体、処理目的、根拠だけでなくデータフローとprocessor管理が不足 | RoPA相当の処理台帳とDPIAゲートを検討 | TASK-003/004/006 |
| GAP-013 | P2 | 実装順 | HR/勤怠を最初の業務実装にすると法令・機微情報負荷が高い | 調達/APをpilot候補に前倒し | Roadmap ADR |
| GAP-014 | P2 | 性能 | ワークロード、データ量、SLO、帳票締切が未定 | profile別の数値目標を設定 | TASK-003/006 |
| GAP-015 | P2 | 国際化 | 将来国際化の範囲が抽象的 | jurisdiction/currency/timezone/localization境界のみ先行確保 | TASK-005/006 |
| GAP-016 | P3 | 商用 | サポート、アップグレード、テナント退出、データ移行が不足 | commercial operating modelを別ロードマップ化 | 将来ADR |

## 4. 抜けている企業業務

### 4.1 問題

主要バックオフィスは広く含まれるが、企業能力として独立管理すべき領域が不足または他領域へ埋没している。

### 4.2 根拠

- 経費精算はリポジトリ案にあるが、全体ドメインの独立節と業務フローがない。
- Treasuryには資金繰り、支払予定、借入、為替、銀行権限、資金予測が必要だが、会計の「資金管理」だけでは責務が曖昧である。
- Enterprise Performance Managementとして連結、予実、KPI、シナリオ計画、経営報告が不足している。
- Customer Serviceは問い合わせ・苦情だけで、case、entitlement、SLA、escalation、返金との接続が弱い。
- Product/Service lifecycle、価格承認、カタログ、廃止管理が販売の下に埋没している。
- Vendor/Third-party lifecycleは購買、契約、セキュリティに分散し、onboardingからoffboardingまでの所有者がない。
- Records Management、eDiscovery/Legal Hold、印章・証明書、届出・許認可の管理が独立していない。
- Corporate Communications、IR、サステナビリティ、品質管理は一般企業でも必要になり得るが適用条件付き能力として未整理である。

### 4.3 推奨

TASK-002で少なくとも以下を能力として追加し、実装対象かIntegrate対象かをTASK-003で判断する。

- Expense & Travel Management
- Treasury & Cash Management
- Enterprise Performance Management
- Customer Service Management
- Product & Service Lifecycle Management
- Third-party Lifecycle & Risk Management
- Records & Evidence Management
- Regulatory Filing & License Management
- Data Governance & Analytics
- Quality Management（適用業種を明示）
- Corporate Communications / IR / Sustainability（適用条件付き）

### 4.4 リスク

追加項目をすべて自作対象にするとスコープがさらに膨張する。Capability Mapへの収録は実装コミットメントではなく、Build / Buy / Integrate判断の母集団とする。

## 5. 重複

### 5.1 問題

同一概念が複数ドメインで別システムとして列挙され、正本や責任境界が競合する。

### 5.2 根拠

主な重複候補は次のとおり。

| 概念 | 出現箇所 | 境界上の論点 |
| --- | --- | --- |
| IAM / Role / Permission | Common、ITSM、Security | identity lifecycle、authorization policy、provisioningを分離する必要 |
| Contract | Sales、Procurement、Legal、Governance | 法的契約の正本と各業務contextの契約projectionを分離する必要 |
| Project / Task | Common、Project Management、ITSM | 汎用taskとdomain case/taskを共通aggregateにしすぎない |
| Document / Evidence | Common、Legal、Tax、Governance | binary、metadata、record、evidenceの責務が異なる |
| Payment / Bank Account | Payroll、Sales、Procurement、Accounting | 支払指図、決済結果、消込、口座masterの所有者が異なる |
| Employee / User / Person | Common、HR、ITSM | 人、雇用関係、ログイン主体を同一entityにしない |
| Product | Sales、小売、製造 | 共通catalogと業種固有inventory/manufacturing modelの境界 |
| Incident | ITSM、Security、Compliance | case基盤は共有可能だがworkflowと閲覧権限は分離が必要 |

### 5.3 推奨

共通化の単位を「同名entity」ではなく、安定したplatform primitiveに限定する。Document storage、workflow runtime、audit writerなどは共通化し、Contract、Incident、Taskなどのdomain aggregateは各bounded contextが所有する。

### 5.4 リスク

過剰な共通化は巨大な共通モデルと権限漏洩を生む。逆に完全分離は二重入力を生むため、event/APIによるprojectionとsource-of-truth表が必要になる。

## 6. ドメイン境界の問題

### 6.1 問題

現在の章立ては部門組織に近く、end-to-end processとデータ所有境界が一致しない。

### 6.2 根拠

- Hire-to-RetireはHR、労務、給与、IAM、Facilities、Accountingを横断する。
- Procure-to-PayはProcurement、Contract、Document、AP、Treasury、Accountingを横断する。
- Order-to-CashはSales、Contract、Delivery、AR、Tax、Accountingを横断する。
- Record-to-Reportは各業務のsubledgerとGeneral Ledgerを接続する。
- Joiner/Mover/LeaverはHR eventを起点にIAMと資産管理を動かす。

### 6.3 推奨

TASK-005では「部門」ではなく、data ownershipとtransaction invariantでbounded contextを決める。横断processはorchestration/viewで表現し、単一巨大transactionを作らない。最低限、Party、Organization、Identity、Workforce、Workflow、Records、Procurement、Payables、Sales、Receivables、Ledger、Compliance、Auditを候補として検証する。

### 6.4 リスク

境界を早期に固定しすぎると業務調査で覆る。TASK-002〜004の成果を受け、TASK-005で確定し、ADRに再検討条件を残す。

## 7. 法令調査漏れ

### 7.1 問題

列挙された法令群は出発点として有用だが、企業横断、電子取引、表示・消費者、知財、サイバー事故、業種別の調査キューが不足する。

### 7.2 根拠

TASK-004で公式一次情報を確認すべき候補群:

- 会社・統治: 会社法、商業登記、株主・役員・計算書類・公告に関する下位法令
- 取引・契約: 民法、商法、下請・フリーランス取引、独占禁止、電子契約・電子署名に関する法令
- 会計・税務: 法人税、所得税、消費税、地方税、国税通則、電子帳簿保存、適格請求書に関する法令・通達
- 労務・社会保障: 労働時間・賃金・休業・安全衛生に加え、社会保険、年金、雇用・労災保険、障害者雇用等
- Privacy: 個人情報、番号利用、委託・越境・漏えい報告、従業員モニタリングに関する法令と公式ガイドライン
- 消費者・販売: 特定商取引、消費者契約、景品表示、製造物責任、資金決済（該当時）
- IT・セキュリティ: 不正アクセス、サイバー事故報告義務、電子署名、プロバイダ責任等の適用可能性
- 知的財産・OSS: 著作権、特許、商標、不正競争防止、第三者ライセンス義務
- 保存・証拠: 各法令の保存義務に加え、訴訟・調査時のLegal Holdとの優先関係

### 7.3 推奨

法令名のリストではなく、`legal source → applicability → obligation/prohibition → record/evidence → control → system behavior → test` の鎖で管理する。条文、下位法令、通達・FAQ、技術仕様を別sourceとして記録し、法的義務と推奨設計を混同しない。

### 7.4 リスク

上記は調査候補であり、適用を断定したものではない。2026年8月時点の現行性、施行予定、企業規模・業種条件を公式情報で再確認し、必要に応じて弁護士、税理士、社労士等の専門家レビューを受ける必要がある。

## 8. 不要または延期すべきスコープ

### 8.1 問題

参照実装としての価値よりも、法的責任、外部仕様追随、運用負荷が大きい領域まで自作候補に見える。

### 8.2 根拠

- Full Payroll、年末調整、税・社会保険申告は変更頻度と誤計算影響が大きい。
- e-Gov、e-Tax、eLTAX、銀行接続は認証、仕様変更、契約、実環境試験に依存する。
- SSO/MFA/PAM、電子署名、決済実行、ウイルススキャン、秘密管理を自作する合理性は低い。
- Kubernetes/HA/DRは実需要と運用能力がない段階では検証対象がぼやける。
- mobile native app、全業種拡張、完全な税務申告は最上位KPIに必須ではない。

### 8.3 推奨

- Phase 1では外部IdP、object storage、mail sandbox等をIntegrateする。
- Payrollは説明可能なsimulation/input exportまでに制限し、公式申告・送金は外部連携とする。
- Enterprise profileはarchitecture specificationと演習用IaCに留め、運用保証を主張しない。
- 小売以外の業種拡張はCapability Mapだけに置き、実装roadmapから外す。

### 8.4 リスク

外部委譲してもデータ保護、可用性、vendor exit、監査の責任は消えない。System Catalogに責任分界と障害時fallbackを記録する。

## 9. 実装順序の問題

### 9.1 問題

Phase 1の共通基盤を一括完成してから業務moduleへ進む順序は、汎用化の誤りを早期検出しにくい。HR/Attendanceは日本法と機微情報の密度が高く、最初の実装検証として重い。

### 9.2 根拠

Workflow、Document、Audit、Rule、Retentionは実際の業務フローなしでは適切な抽象度を検証できない。HR/Attendanceは雇用形態、労働時間制度、締め、訂正、休暇、給与接続まで同時に要求する。

### 9.3 推奨

Milestone 0後の実装順序を次のように再評価する。

1. Repository foundationとsecurity boundary
2. Organization、Identity integration、Authorization、Auditの最小slice
3. Procure-to-Payの最小縦断フロー
4. その実需からWorkflow、Document、Rule、Retentionを抽出
5. Ledgerへの仕訳候補連携
6. HR masterとJoiner/Mover/Leaver
7. Attendance、Payroll input/simulation

### 9.4 リスク

ポートフォリオ上HRを優先したい場合は順序が変わり得る。その場合も勤務計算から始めず、Employee/Employment/Assignmentの時点管理を先に検証する。

## 10. OSSとしての問題

### 10.1 問題

一般的なcommunity filesは列挙されているが、企業システム特有の安全な公開・貢献・配布方針が不足する。

### 10.2 根拠

- 法令データのライセンス、出典表示、更新責任が未定。
- サンプル会社・証憑・従業員データに再識別リスクがある。
- プラグインや連携adapterが内部APIへアクセスする権限境界が未定。
- CLA、DCO、商標方針、互換性、LTS、脆弱性受付、embargoが未定。
- SBOM、署名、provenance、再現可能build、依存ライセンス方針が未定。

### 10.3 推奨

TASK-006/007でlicense ADR、trademark policy、contribution model、security disclosure、dependency policy、release/signing policy、sample-data policyを追加する。法令データは出典・取得日・改変有無・利用条件をmetadataとして保持する。

### 10.4 リスク

ライセンス選択は将来の商用化と外部貢献に不可逆な影響を持つ。専門家確認前に「自由に商用利用可能」などの保証を記載しない。

## 11. 商用化時の問題

### 11.1 問題

multi-tenancy機能は列挙されているが、商用サービスとして必要な責任分界、運用、契約、アップグレードが不足する。

### 11.2 根拠

- tenant isolationはtenant_id追加だけでなく、key、queue、cache、object、log、backup、support accessへ及ぶ。
- データ所在地、subprocessor、越境移転、DPA、削除証明、監査対応が必要になる。
- control planeとtenant data plane、運用者権限、break-glass、support impersonationの境界が未定。
- version skew、migration window、rollback、customer-specific configuration、extension compatibilityが未定。
- SLA、RTO/RPO、incident notification、BCP、終了時export、料金未払い時の扱いが未定。

### 11.3 推奨

OSS参照実装とSaaS製品を別product profileとして扱う。初期domain modelではtenant境界を壊さない識別子とownershipだけ確保し、billing/control planeは実装しない。商用化判断時にThreat Model、DPA運用、SRE model、support access、migration policyを専用ADRで確定する。

### 11.4 リスク

将来互換性を理由に初期から完全なmulti-tenancyを実装すると、複雑性とテスト行列が急増する。一方、データ所有と識別子を無視すると後付け分離が困難になる。

## 12. 横断的なセキュリティ・性能・運用課題

### Security / Privacy

- 認可はRole名だけでなく、tenant、legal entity、organization、purpose、case sensitivity、SoDを含むpolicy decisionとして設計する。
- audit log自体に給与、健康、通報等の機微値を複製しない。before/afterの保存粒度とmaskingを分類別に決める。
- 添付ファイルはサイズ・形式・展開・malware・content disposition・download authorizationをtrust boundaryとして扱う。
- CSV/importはformula injection、encoding、巨大入力、再実行、部分失敗を設計対象にする。
- Legal Holdとprivacy deletion requestが競合する場合の承認・証跡を要件化する。

### Performance

- 会計締め、勤怠締め、帳票、監査検索は通常CRUDと異なる負荷を持つ。想定会社規模と締め時間のbudgetが必要である。
- append-only履歴とauditは無制限増加するため、partition、archive、検索index、保持コストを設計する。
- ABAC/SoD判定は一覧表示でN+1を起こしやすいため、authorization testと性能budgetを同時に定義する。

### Operations

- backup成功ではなくrestore成功を検証し、object storageとDBの整合点を定義する。
- rule versionとschema versionのdeploy/rollback順序、in-flight workflowの互換性を設計する。
- 外部連携はidempotency key、outbox/inbox、reconciliation、dead-letter、手動再処理、監査を必要とする。
- デモ環境と実運用profileを明確に分け、サンプル用の弱い認証や固定秘密をproductionへ持ち込ませない。

## 13. 後続TASKへの決定事項

1. TASK-002開始時にCapability/System/Module/Control/Requirementの語彙を固定する。
2. TASK-003ではSource of Truthだけでなく、責任主体と障害時fallbackを記録する。
3. TASK-004では法的義務、公式推奨、内部統制、製品方針を別種別にする。
4. TASK-005では同名entityの共通化よりdata ownershipを優先する。
5. TASK-006では最初の縦断sliceとOSS/SaaS境界をADRにする。
6. TASK-007はMilestone 0の受け入れ条件を満たすまで開始しない。

## 14. TASK-001 受け入れ条件

- [x] 抜けている企業業務を特定した。
- [x] 重複と正本競合を特定した。
- [x] ドメイン境界上の問題を特定した。
- [x] 法令調査候補の不足を特定し、未確認と明示した。
- [x] 延期・外部委譲候補を特定した。
- [x] 実装順序の代替案を示した。
- [x] OSS固有の問題を特定した。
- [x] 商用化固有の問題を特定した。
- [x] セキュリティ、性能、運用リスクと対策を記載した。
- [x] 後続TASKへの反映先を示した。

