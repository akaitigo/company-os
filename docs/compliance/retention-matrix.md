# Retention Matrix

## 状態と原則

- 基準日: 2026-08-09
- 状態: **初期版 / 要専門家レビュー**
- 保存期間は単一のglobal設定にしない。
- 法定最低期間、業務上の必要期間、契約、紛争時効、Legal Hold、Privacy deletionを別根拠として評価する。
- 競合時は自動廃棄せず`review_required`へ送る。

## Matrix

| Schedule ID | Requirement | Record type | Scope | 起算event | Minimum period | 条件・例外 | Disposition | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| RET-LABOR-LEAVE-001 | JP-LABOR-001 | PaidLeaveLedger | Worker/leave period | 対象付与期間の満了 | 法定5年、当分の間3年 | 経過措置終了を監視 | 承認後secure delete | 確認済み |
| RET-LABOR-RECORD-001 | JP-LABOR-002 | Worker/Wage/Employment records | Worker/record type | record type別法定起算日 | 法定5年、当分の間3年 | 退職金・紛争・holdで延長 | 承認後archive/delete | 期間確認済み、起算詳細未確認 |
| RET-LABOR-AGREEMENT-001 | JP-LABOR-003 | 36Agreement/Evidence | Establishment/agreement period | 協定期間等の法定起算日 | JP-LABOR-002参照 | 届出・代表選出証跡を一体保持 | 承認後archive/delete | 要専門家レビュー |
| RET-PRIV-SHARE-001 | JP-PRIVACY-002 | ThirdPartyDisclosureRecord | Transfer/subject | 作成方法別に最後の提供日または作成日 | 1年または3年 | 契約書代替/一括/その他で分岐 | disclosure可能性確認後delete | 確認済み |
| RET-PRIV-RECEIVE-001 | JP-PRIVACY-002 | ThirdPartyReceiptRecord | Transfer/subject | 作成方法別に最後の受領日または作成日 | 1年または3年 | 受領記録方式で分岐 | disclosure可能性確認後delete | 確認済み |
| RET-TAX-BOOKS-001 | JP-TAX-002 | Corporate tax books/documents | LegalEntity/FiscalYear | 確定申告書提出期限の翌日 | 原則7年 | 欠損/災害条件は10年、2018-04-01前開始年度は9年 | 税務hold確認後archive/delete | 確認済み |
| RET-TAX-ELECTRONIC-001 | JP-TAX-001; JP-TAX-002 | Electronic transaction record | Transaction/FiscalYear | 基礎税法の起算event | 7/9/10年等 | 電帳法の真実性・可視性・検索要件を追加 | 原データと証跡を一体廃棄 | 条件付き確認済み |
| RET-TAX-INVOICE-001 | JP-TAX-003 | Qualified invoice copy/e-record | Invoice/TaxPeriod | 課税期間末日の翌日から2月経過日 | 7年 | 電子的授受はJP-TAX-001も適用 | 税務hold確認後delete | 確認済み |
| RET-AUDIT-001 | product_policy | AuditEvent | Tenant/resource class | event発生 | 未決 | source recordより長く残すと機微値を復元し得る | aggregate/redact/delete policy | 未確認 |
| RET-INCIDENT-001 | JP-PRIVACY-001 | PrivacyIncident/Report | Incident | case closure/report acceptance | 未決 | 訴訟・当局・security investigation hold | restricted archive | 未確認 |

## Disposal date計算

```text
candidate_dates = legal + contractual + business + limitation + investigation
if active_legal_hold or unresolved_conflict:
    disposition = review_required
else:
    disposition_date = max(candidate_dates)
```

`max`は同じrecordへ適法に適用できる候補だけに使う。Privacy上不要となったデータを「念のため」で無期限保存しない。

## 廃棄workflow

1. schedule versionとrecord classificationからcandidateを作成する。
2. legal hold、未解決case、backup、downstream copyを照合する。
3. data ownerとrecords/privacy ownerが対象件数・根拠を承認する。
4. domain正本、object、search index、cache、read modelへidempotent deletion commandを送る。
5. 内容そのものを含まないdisposal evidenceをSYS-AUD-001へ記録する。
6. backupは即時書換えず、隔離・期限切れ・restore時再削除手順で統制する。

## セキュリティ・運用リスク

- Legal Hold解除と自動廃棄のraceを防ぐため、同じrecord scopeで排他・version確認を行う。
- 削除jobは再実行可能にし、部分失敗を完了扱いしない。
- auditへ削除対象の機微payloadを複製しない。
- restore後は削除tombstoneとhold stateを再適用してから利用を再開する。

## 受け入れ条件

- [x] 初期Requirementの保存期間、起算点、例外、状態を分離した。
- [x] Legal HoldとPrivacy deletionの競合をfail-safeにした。
- [x] backup/read modelを含む廃棄workflowを定義した。
- [x] v0.1 Requirement 8件のうち保持対象となるrecord typeを追加した。
- [x] 未確認scheduleを`未確認`として分離し、推測による自動廃棄を禁止した。

RET-AUDIT-001とRET-INCIDENT-001の期間確定は、実装前に製品方針ADRとPrivacy/Legal reviewを必要とするbacklogである。
