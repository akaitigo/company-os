# ADR-002: TypeScript full-stackとPostgreSQLを採用する

**日付**: 2026-08-09  
**ステータス**: 承認済み  
**決定者**: Codex（Milestone 0設計責任）

## コンテキスト

Company OSはdomain rule、API、admin/employee UI、integration、compliance testを一人または小規模teamで開発する。Backend候補としてTypeScript、Go、Java、Kotlin、Rust、C#を、FrontendとしてNext.js、Nuxt、SvelteKitを比較した。runtime性能だけでなく、domain型、AI coding、ecosystem、LTS、運用、将来人材を評価した。

## 決定要因

- API/UI/schema/test fixtureの型とtoolchainを共有したい。
- NFR-PERFのSMB baselineはCPU特化runtimeを必要としない。
- 金額・日時・validationのruntime安全性を明示的に補う必要がある。
- OSS contributorがlocal Dockerで再現できること。
- supported releaseへ計画的に追従できること。

## 検討した選択肢

### 選択肢A: TypeScript + Node.js + Next.js

**メリット**: full-stack共有、最大級ecosystem、開発/AI速度、Web人材。  
**デメリット**: runtime型消失、`number`精度、dependency churn、CPU性能。

### 選択肢B: C#/.NET + Next.js

**メリット**: 強い型、enterprise ecosystem、公式LTS、性能・tooling。  
**デメリット**: 二言語/toolchain、個人開発のcontext switch。

### 選択肢C: Java/Kotlin + Next.js

**メリット**: 成熟enterprise ecosystem、長期運用実績、強いdomain modeling。  
**デメリット**: build/運用重量、二言語、Kotlin人材範囲。

### 選択肢D: Go/Rust + Next.js

**メリット**: 小さいruntime、性能、Goの単純性/Rustのmemory safety。  
**デメリット**: business ecosystem、開発速度、schema/UI共有、人材risk。

## 決定

**選択肢A**を採用する。BackendはNode.js Active LTS上のstrict TypeScript、NestJSのmodule/DI/guard構造とFastify adapter、FrontendはNext.js Active LTS、DBはsupported PostgreSQL latest stable lineを使用する。

TASK-007時点ではNode.js 24 latest patch、Next.js 16系supported release、PostgreSQL 18 latest minorを初期候補とする。versionはlockfile/container digestで固定し、公式support表を確認して最終決定する。

## 結果

**ポジティブ**: contract/tooling共有、迅速なvertical slice、豊富なtest/integration ecosystem。  
**ネガティブ/トレードオフ**: runtime validationとnumeric disciplineを開発規則で強制する必要。  
**リスク**: framework magicとdependency増加、event loop block、unsupported Nodeへの放置。

## 実装メモ

1. `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`等を有効化する。
2. external/domain boundaryでschema validationを必須にし、TypeScript typeだけを信用しない。
3. moneyにJS floatを使わず、DB numeric + decimal library/value objectを使う。
4. CPU-heavy report/file処理はbounded workerへ移す。
5. pnpm lockfile、dependency budget、SCA/SBOMをverifyへ含める。
6. ORMはTASK-007 pilotでDrizzle/Prismaを比較し、migration SQL、transaction、query observabilityを検証する。
7. rollbackはprevious artifact + backward-compatible schema。unsupported majorへ進む場合はこのADRを更新する。

