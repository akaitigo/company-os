# Law Catalog

## 状態と利用方法

- 基準日: 2026-08-09
- 状態: **調査中**
- `確認済み`は公式一次情報の参照先と対象Requirementを確認した状態。
- `未確認`はCompany OSの調査対象であり、適用を断定しない。
- `要専門家レビュー`は具体的な企業・取引・事実への当てはめを製品だけで判断しない状態。

## 確認済み法令群

| Law ID | 法令・制度 | 所管 | Official source | Company OSへの影響 | Requirement | 状態 |
| --- | --- | --- | --- | --- | --- | --- |
| LAW-JP-LABOR-STANDARDS | 労働基準法・施行規則 | 厚生労働省 | [労働時間・36協定の公式解説](https://www.check-roudou.mhlw.go.jp/study/roudousya_jikangai.html) | 勤怠、台帳、保存、届出、警告、給与input | JP-LABOR-001〜003 | 確認済み / 要専門家レビュー |
| LAW-JP-APPI | 個人情報保護法・施行令・施行規則 | 個人情報保護委員会 | [通則ガイドライン](https://www.ppc.go.jp/personalinfo/legal/guidelines_tsusoku/) | processing、sharing、incident、通知、監査、保持 | JP-PRIVACY-001〜002 | 一部確認 / 要専門家レビュー |
| LAW-JP-EBOOKS | 電子帳簿保存法・施行令・施行規則 | 国税庁 | [電子取引関係Q&A](https://www.nta.go.jp/law/joho-zeikaishaku/sonota/jirei/07denshi/01.htm) | 電子証憑、検索、訂正削除統制、見読性 | JP-TAX-001 | 確認済み / 要税務レビュー |
| LAW-JP-CORPORATE-TAX | 法人税法・施行規則 | 国税庁 | [帳簿書類等の保存期間](https://www.nta.go.jp/taxes/shiraberu/taxanswer/hojin/5930.htm) | 会計帳簿、取引書類、保持起算、欠損年度 | JP-TAX-002 | 確認済み / 要税務レビュー |
| LAW-JP-CONSUMPTION-TAX | 消費税法・施行令 | 国税庁 | [適格請求書の保存期間等](https://www.nta.go.jp/taxes/shiraberu/zeimokubetsu/shohi/keigenzeiritsu/pdf/qa/79.pdf) | invoice項目、写し、電子記録、保持 | JP-TAX-003 | 一部確認 / 要税務レビュー |

## 優先調査キュー

| Priority | Law ID | 法令・制度群 | 主なModule | 期待するRequirement |
| --- | --- | --- | --- | --- |
| P0 | LAW-JP-APPI | 安全管理、委託、開示・訂正・利用停止、越境提供 | Privacy, IAM, Document | privacy control/data rights |
| P0 | LAW-JP-LABOR-STANDARDS | 法定労働時間、休憩、休日、割増賃金、各種労働時間制度 | Attendance, Payroll | calculation/applicability rules |
| P0 | LAW-JP-LABOR-CONTRACT | 労働条件明示、雇用契約、解雇・更新 | HR, Document | employment records/notice |
| P0 | LAW-JP-SOCIAL-INSURANCE | 健康保険、厚生年金、雇用・労災保険 | HR, Payroll | applicability/filing/retention |
| P0 | LAW-JP-CORPORATE | 会社法・会社法施行規則・会社計算規則 | Governance, Accounting | board/shareholder/books/records |
| P1 | LAW-JP-CIVIL-COMMERCIAL | 民法、商法、電子契約・電子署名 | Contract, Sales, Procurement | formation/evidence/agency |
| P1 | LAW-JP-TRANSACTION | 下請法・フリーランス法・独禁法 | Procurement, AP | counterparty applicability/payment |
| P1 | LAW-JP-MYNUMBER | 番号法・特定個人情報ガイドライン | HR, Payroll, Privacy | collection/access/retention/delete |
| P1 | LAW-JP-WHISTLEBLOWER | 公益通報者保護法・指針 | GRC | channel/confidentiality/retaliation |
| P2 | LAW-JP-CONSUMER | 消費者契約法、特商法、景表法、PL法 | Sales, Retail | display/cancel/refund/evidence |
| P2 | LAW-JP-IP | 著作権、商標、特許、不正競争 | OSS, Legal | license/provenance/trademark |

## 更新統制

1. `authority + official URL + legal reference + effective period`をsource単位で保持する。
2. 公布、施行、経過措置終了を別eventとして追跡する。
3. source更新検知だけでruleを自動公開せず、二者確認とcompliance testを要求する。
4. 旧ruleを削除せず、過去時点再計算のためeffective periodを閉じる。
5. 最終確認から180日、または所管庁の更新通知のいずれか早い時点でreview queueへ戻す。
6. 公式ページが移動・失効した場合、Requirementを`unverified`へ戻し、計算をfail openにしない。

## 受け入れ条件

- [x] 確認済み法令群に所管、公式source、影響、Requirementを対応付けた。
- [x] 未確認法令を優先度付きbacklogとして分離した。
- [x] 現行性の監視とrule更新統制を定義した。
- [x] Milestone 0で選定した代表的P0法令群をRequirementへ分解し、残りを優先調査キューへ登録した。
