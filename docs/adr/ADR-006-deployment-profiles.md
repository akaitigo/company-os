# ADR-006: DEV・SMB・ENTの3 Deployment Profileを分離する

**日付**: 2026-08-09  
**ステータス**: 承認済み  
**決定者**: Codex（Milestone 0設計責任）

## コンテキスト

OSS demo、実用的な小規模運用、enterprise参照構成ではavailability、cost、operational skillが異なる。一つのKubernetes構成を全用途へ強制するとlocal採用性を損ない、Composeだけでenterprise保証を主張すると誤解を招く。

## 決定要因

- local one-command setup。
- SMBのmanaged service活用とrestore可能性。
- ENTのHA/DR/IdP/SIEM要求を将来阻害しない。
- profileごとの保証範囲を明示する。

## 検討した選択肢

### 選択肢A: Kubernetes only
**メリット**: deployment統一、enterprise pattern。  
**デメリット**: local/SMB複雑性と運用cost。

### 選択肢B: Docker Compose only
**メリット**: 簡単。  
**デメリット**: HA、managed integration、enterprise controlsを表現しにくい。

### 選択肢C: Profile分離 + 共通artifact/config contract
**メリット**: 各用途適合、過剰設計回避。  
**デメリット**: IaC/test matrixが増える。

## 決定

**選択肢C**を採用する。DEVはCompose、SMBはmanaged container/DB/object/secrets、ENTはoptional Kubernetes/Helm + enterprise servicesとする。application artifact、migration、health、telemetry contractは共通化する。

## 結果

**ポジティブ**: OSS体験と実運用optionの両立。  
**ネガティブ/トレードオフ**: profile driftをCIで防ぐ必要。  
**リスク**: 未検証ENT構成をproduction-readyと誤表示すること。

## 実装メモ

- DEV smoke、SMB IaC plan/test、ENT manifest validationを別CI jobにする。
- secret値をCompose/IaC state/repositoryへ平文保存しない。
- SMBはRPO≤24h/RTO≤8h restore exerciseをbaselineとする。
- ENTは実環境load/DR/security reviewなしにSLA保証しない。
- rollbackはprofile別runbookを持ち、DB major/key rotationをapplication rollbackと分離する。

