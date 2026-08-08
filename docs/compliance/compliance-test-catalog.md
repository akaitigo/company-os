# Compliance Test Catalog

## 状態

- 状態: **Executable specification draft / test code未実装**
- 基準日: 2026-08-09
- 各caseはRequirement/Controlの外部観測可能な結果を定義し、TASK-007以降にfixture/test codeへ変換する。

## TEST-JP-LABOR-001: 年次有給休暇管理簿

- Requirement: JP-LABOR-001
- Control: CTL-LABOR-LEAVE-001
- Given: worker Wへ基準日2026-04-01、10日の年休を付与し、2026-05-01に1日取得する。
- When: PaidLeaveLedgerを確定し、付与期間をcloseする。
- Then: W、基準日、取得時季、取得日数、残高、rule version、保存起算eventを出力できる。
- Boundary: 半日・時間単位を別unitで保持し、丸めて日単位へ破壊変換しない。
- Failure: 基準日欠落ではledger確定を拒否する。
- Audit: grant、consume、correction、close actor/decisionを記録する。

## TEST-JP-LABOR-002: 労働関係記録の保存

- Requirement: JP-LABOR-002
- Control: CTL-LABOR-RECORD-001
- Given: 退職workerのWorkerLedgerとWageLedgerに異なる法定起算eventがあり、経過措置ruleがactiveである。
- When: disposition dateを評価する。
- Then: record type別起算日から当分の間3年を計算し、根拠として法定5年ruleと経過措置versionを説明する。
- Boundary: active Legal Holdがあれば期限を過ぎても自動廃棄しない。
- Failure: 起算event不明では`review_required`となり削除commandを発行しない。
- Historical: 経過措置終了後も過去recordは当時のruleで再計算できる。

## TEST-JP-LABOR-003: 36協定・時間外上限

- Requirement: JP-LABOR-003
- Control: CTL-LABOR-OVERTIME-001
- Given: standard work system、valid/filed agreement、特別条項ありのworkerについて時間外+休日労働のrolling factsを用意する。
- When: 新しいtime entry/approvalで単月100時間以上、または2〜6か月平均80時間超になる。
- Then: 確定/authorizationを拒否し、該当上限、window、agreement/rule versionを示す。
- Boundary: 月45時間超の月が年6回から7回になる入力を拒否する。
- Failure: establishment/work-system特則がundeterminedなら一般ruleで安全と断定せずblock/reviewする。
- Historical: 2024年特則前後をeffective dateで別ruleとして評価する。

## TEST-JP-PRIVACY-001: 漏えい等報告・本人通知

- Requirement: JP-PRIVACY-001
- Control: CTL-PRIV-INCIDENT-001
- Given: 要配慮個人情報を含む疑いのあるincidentと、組織が知った日時を登録する。
- When: reportabilityを評価する。
- Then: reportable候補となり、速報（概ね3〜5日）、確報（30日/該当時60日）、本人通知taskと期限根拠を生成する。
- Boundary: subject countが不明でもnot-reportableとしない。
- Failure: identity/permissionのないuserはcase存在を検索できない。
- Audit: C4内容をpayloadへ複製せず、全閲覧・export・報告・通知を記録する。

## TEST-JP-PRIVACY-002: 第三者提供記録

- Requirement: JP-PRIVACY-002
- Control: CTL-PRIV-SHARING-001
- Given: 個人データを外部organizationへ提供するrequestがあり、委託/共同利用等の適用除外が未確定である。
- When: transfer実行を要求する。
- Then: basis/exclusion未確定としてblockする。
- Success: 適法な根拠、提供先、本人/対象、日付、record methodを確定後、delivery refと記録を保存する。
- Retention: 契約書代替、一括、その他で1年/3年の起算を切替える。
- Audit: approval、delivery、correction、disclosure、dispositionを追跡する。

## TEST-JP-TAX-001: 電子取引データ保存

- Requirement: JP-TAX-001
- Control: CTL-TAX-ERECORD-001
- Given: emailで受領したinvoice originalとdate/amount/counterparty metadataがある。
- When: electronic transaction recordを保存完了にする。
- Then: checksum、原データ、検索項目、訂正削除統制、見読可能versionを関連付ける。
- Boundary: email mailbox上だけに存在する場合は保存完了としない。
- Failure: scanner/object unavailableならquarantine/pendingを維持する。
- Retention: JP-TAX-002/003等の基礎税法scheduleと組み合わせる。

## TEST-JP-TAX-002: 法人税帳簿書類

- Requirement: JP-TAX-002
- Control: CTL-TAX-BOOKS-001
- Given: 2026年度のbalanced journal proposalとopen fiscal periodがある。
- When: 別actorがapprove/postする。
- Then: immutable posted journal、posting sequence、source/rule/decision refs、outbox/audit intentをatomicに確定する。
- Boundary: debit/credit不一致、closed period、self approvalを拒否する。
- Correction: posted line更新ではなくreversal + replacementを要求する。
- Retention: filing due date翌日起算で通常7年、条件付き9/10年を選択する。

## TEST-JP-TAX-003: 適格請求書保存

- Requirement: JP-TAX-003
- Control: CTL-TAX-INVOICE-001
- Given: registered issuerが課税期間内に適格請求書を電子発行する。
- When: invoiceをissue/provideする。
- Then: required fields、invoice version、delivery reference、copy/e-recordを固定し、課税期間末日の翌日から2月経過日を起算として7年scheduleを作る。
- Boundary: required field/registration status不明ならqualified statusを付けない。
- Correction: 元invoiceを残しcorrection/return invoiceを関連付ける。
- Combined rule: 電子提供の場合はJP-TAX-001も適用評価する。

## Traceability matrix

| Test | Requirement | Control | Aggregate/System | Expected automation phase |
| --- | --- | --- | --- | --- |
| TEST-JP-LABOR-001 | JP-LABOR-001 | CTL-LABOR-LEAVE-001 | AGG-TIM-LEAVE / SYS-TIM-001 | P2 |
| TEST-JP-LABOR-002 | JP-LABOR-002 | CTL-LABOR-RECORD-001 | AGG-WKF-EMP / SYS-HR-001, SYS-RET-001 | P2 |
| TEST-JP-LABOR-003 | JP-LABOR-003 | CTL-LABOR-OVERTIME-001 | AGG-TIM-DAY/CLOSE / SYS-TIM-001 | P2 |
| TEST-JP-PRIVACY-001 | JP-PRIVACY-001 | CTL-PRIV-INCIDENT-001 | SYS-PRV-001, SYS-SEC-001 | P1 |
| TEST-JP-PRIVACY-002 | JP-PRIVACY-002 | CTL-PRIV-SHARING-001 | AGG-GRC-DEC / SYS-PRV-001 | P1 |
| TEST-JP-TAX-001 | JP-TAX-001 | CTL-TAX-ERECORD-001 | AGG-DOC-DOCUMENT / SYS-DOC-001 | P3 |
| TEST-JP-TAX-002 | JP-TAX-002 | CTL-TAX-BOOKS-001 | AGG-GL-JOURNAL / SYS-GL-001 | P4 |
| TEST-JP-TAX-003 | JP-TAX-003 | CTL-TAX-INVOICE-001 | AGG-AP-INVOICE / SYS-AP-001 | P3 |

## 受け入れ条件

- [x] v0.1 Requirement全件に正常、境界、失敗、audit/retention観点を定義した。
- [x] Requirement→Control→Aggregate/System→Testのtraceabilityを完成した。
- [x] 過去rule、undetermined、fail-closedをtest条件へ含めた。
Post-Milestone gate: 対応Phaseで自動test codeとして実装する（pending）。
