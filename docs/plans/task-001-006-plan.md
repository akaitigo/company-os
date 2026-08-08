# TASK-001〜006 調査・設計計画

## 1. 目的

Company OS Specification v0.1を、実装判断に利用できる一貫した仕様として完成させる。
本計画の期間中はプロダクトコードを実装しない。

## 2. 現状と委任ゲート

- 委任可能性: Level 0
- 根拠: 新規リポジトリであり、アーキテクチャ境界、検証コマンド、CI、テスト、rollback方針が未整備
- 方針: TASK-001〜006の設計判断はCodexが保持する。生の構想を実装担当へ渡さない。
- Level 2移行条件: TASK-007でリポジトリ基盤を整え、小規模なLevel 1 pilotを経て判定する。

## 3. 作業順序

### TASK-001: Initial Gap Analysis

成果物: `docs/reviews/initial-gap-analysis.md`

作業:

1. 業務能力の不足、重複、境界、実装順序をレビューする。
2. 法令調査対象を列挙する。ただし条文上の結論はTASK-004で一次情報を確認する。
3. OSSと商用化の責任・ライセンス・運用上の問題を整理する。
4. 後続タスクへ反映すべき決定候補を抽出する。

受け入れ条件:

- [x] 指定された8観点をすべて扱う。
- [x] 各指摘に問題、根拠、推奨、リスクを含める。
- [x] 優先度と反映先TASKを示す。
- [x] 未確認の法的事項を断定しない。

### TASK-002: Business Capability Map

成果物: `docs/domains/business-capability-map.md`

作業:

1. L0〜L3の分類規則を先に定義する。
2. 組織構造ではなく「企業が何をするか」で分類する。
3. 共通能力と業種固有能力を分離する。
4. Mermaid図と機械可読なIDを付与する。

受け入れ条件:

- [x] 全候補システムが少なくとも1つの能力へ対応する。
- [x] 能力の重複所有が明示される。
- [x] 小売拡張と共通コアの境界が分かる。
- [x] L0〜L3の粒度が一貫している。

### TASK-003: System Catalog

成果物: `docs/domains/system-catalog.md`

作業:

1. CapabilityとSystemを区別する。
2. System of Record、System of Engagement、分析系を分類する。
3. inbound/outbound、機密区分、監査、Build/Buy/Integrateを記録する。
4. 各システムをPhaseと依存関係へ割り当てる。

受け入れ条件:

- [x] 必須列が全行で定義されるか、未決理由がある。
- [x] Source of Truthの競合がない、または解消Issueがある。
- [x] 外部サービス障害時の責任境界が記載される。
- [x] Capability IDと相互参照できる。

### TASK-004: Legal Requirement Catalog

成果物: `compliance/requirements/*.yaml`、法令カタログ、Applicability Matrix、Retention Matrix

作業:

1. 調査時点の現行法を公式一次情報で確認する。
2. 条文・省令・告示・公式ガイドラインを区別する。
3. 法的義務、推奨統制、製品方針を別フィールドにする。
4. 適用条件、起算日、保存期間、証跡、例外、施行期間を構造化する。
5. 専門家レビューが必要な解釈を明示する。

Milestone 0 v0.1の完了境界は、Phase 1〜4の設計を検証する代表的P0要件を構造化し、残りを明示的backlogへ登録することとする。日本企業に適用され得る全法令の調査完了は、各module実装前のDefinition of Readyとして段階的に行う。

受け入れ条件:

- [x] 各v0.1要件に安定ID、公式URL、法的参照、施行期間、確認日がある。
- [x] RequirementからCapability、System、Control、Testへ追跡できる。
- [x] 過去時点の再現に必要なversion情報がある。
- [x] 未確認情報がstatusとLaw Catalog backlogで識別可能である。

### TASK-005: Domain Model

成果物: `docs/data-model/domain-model.md`

作業:

1. Party、Person、Worker、Organizationの同一性を分離する。
2. Phase 1〜4のbounded context、aggregate、所有データを決定する。
3. transaction境界、整合性、訂正、取消、期間管理を定義する。
4. domain eventと監査証跡を区別する。
5. tenant、jurisdiction、currency、timezoneは将来互換性を確保する。

受け入れ条件:

- [x] 各aggregateの不変条件と所有contextが明示される。
- [x] context間の直接DB参照を前提にしない。
- [x] 会計・監査データの訂正モデルが定義される。
- [x] Requirement IDと主要domain ruleが対応する。

### TASK-006: Architecture Decision

成果物: 技術評価表、Architecture Draft、初期ADR群

作業:

1. 評価基準と重みを要件から導く。
2. backend/frontend/identity/monorepo/rule engine/hostingを比較する。
3. Modular Monolithのmodule境界と依存方向を確定する。
4. セキュリティ境界、運用、migration、backup/restoreを設計する。
5. 採用案、却下案、再検討トリガーをADRへ記録する。

受け入れ条件:

- [x] 最低候補を同一基準で比較する。
- [x] 人気だけでなく保守性、型安全性、運用費、ライセンスを評価する。
- [x] Local、Cloud Small、Enterpriseの差が説明される。
- [x] TASK-007へ渡せる実装契約が完成する。

## 4. 横断成果物

Milestone 0では以下を揃える。

- Capability Map
- System Catalog
- Law / Requirement Catalog
- Applicability / Retention Matrix
- Data Classification
- Master Data Ownership
- Role / SoD Matrix
- Integration Map
- NFR、Threat Model、Glossary
- Architecture Draft、Technology Evaluation、Initial ADR

## 5. 停止条件

次の場合は推測で確定せず、未決事項として明示する。

- 公式一次情報同士の適用解釈が競合する。
- 法的助言または税務・社労士等の専門判断が必要である。
- OSSライセンスまたは商標の専門判断が必要である。
- 対象企業規模や提供形態により設計が大きく変わる。
- 外部サービスの契約・費用・データ所在地が確認できない。
