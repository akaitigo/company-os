# ADR-005: Versioned Compliance KernelとしてRule・Audit・Retentionを初期から組み込む

**日付**: 2026-08-09  
**ステータス**: 承認済み  
**決定者**: Codex（Milestone 0設計責任）

## コンテキスト

法令・料率・保存期間・適用条件は変更され、過去時点再計算と根拠説明が必要である。各moduleへの定数hard-codeや後付けaudit/retentionではCompany OSの最上位KPIを満たせない。

## 決定要因

- Requirement→Rule→Decision→Control→Evidence→Testのtraceability。
- effective dateと過去結果の再現。
- 任意code executionを避ける。
- C4をauditへ複製せず操作証跡を残す。
- Legal Holdとrecord ownerによる安全な廃棄。

## 検討した選択肢

### 選択肢A: Domain codeへ条件を実装
**メリット**: 型安全、debug容易。  
**デメリット**: 法改正deploy必須、根拠/versionが分散。

### 選択肢B: 汎用script/DMN engine
**メリット**: 柔軟、外部編集。  
**デメリット**: sandbox、型、upgrade、説明可能性、licenseが複雑。

### 選択肢C: 制約されたversioned DSL + typed evaluator
**メリット**: 安全な入力、source/version/testを一体管理、domain integration可能。  
**デメリット**: DSL/evaluatorを設計・保守する必要。

## 決定

**選択肢C**を採用する。初期はYAML/JSON declarative rule schemaとtyped evaluatorを実装し、任意expression/code executionを許可しない。Rule/Audit/Retentionはshared libraryではなく責任を持つbounded contextsとする。

## 結果

**ポジティブ**: 法改正、説明、test、過去再現の一貫性。  
**ネガティブ/トレードオフ**: 複雑な計算はdomain code + rule parameterの組合せが必要。  
**リスク**: DSL肥大、誤ったrule publish、audit payload漏えい、hold race。

## 実装メモ

- publishにはofficial source、effective period、input/output schema、test vector、二者reviewを必須化。
- unknown inputはnot-applicableへ変換せずundetermined。
- audit eventはallowlisted delta/ref/hashで、source payloadを無条件複製しない。
- disposition直前にauthoritative hold versionを再確認し、partial deleteを追跡。
- 複雑な給与/税計算をDSLへ無理に入れず、versioned domain calculator interfaceを許可する。

