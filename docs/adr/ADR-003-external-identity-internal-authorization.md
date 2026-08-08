# ADR-003: 認証を外部IdP、業務認可をCompany OSで管理する

**日付**: 2026-08-09  
**ステータス**: 承認済み  
**決定者**: Codex（Milestone 0設計責任）

## コンテキスト

MFA、OIDC、SAML、recovery、credentialを安全に自作する価値は低い。一方、legal entity/org/resource/purpose/SoDを用いる業務認可はCompany OS固有であり、IdP groupだけでは表現・監査できない。

## 決定要因

- credentialをapplication DBへ保持しない。
- Local OSSとenterprise federationを両立する。
- SYS-AUT-001のversioned RBAC/ABAC/SoDを再現可能にする。
- IdP交換可能性とfail-closedを維持する。

## 検討した選択肢

### 選択肢A: 認証・認可をすべて自作
**メリット**: 完全制御。  
**デメリット**: 高risk、標準/patch追随、credential責任が過大。

### 選択肢B: IdP group/roleだけで認可
**メリット**: 単純。  
**デメリット**: resource scope、purpose、dynamic SoD、decision evidenceが不足。

### 選択肢C: 外部IdP + 内部業務認可
**メリット**: 標準認証とdomain policyを適切に分離。  
**デメリット**: identity mapping、二つのadmin plane、cache invalidationが必要。

## 決定

**選択肢C**を採用する。DEV/OSSはKeycloak、Cloudはmanaged IdP adapterを許可し、OIDC/SAML/SCIM境界を使う。内部Authorizationはpolicy version、scope、purpose、SoD、decision IDを管理する。

## 結果

**ポジティブ**: credential riskを外部化し、Company OS固有統制を保持。  
**ネガティブ/トレードオフ**: JML同期とIdP/内部assignmentの整合が必要。  
**リスク**: stale token/role、subject mapping誤り、Keycloak upgrade。

## 実装メモ

- issuer/audience/alg/timeをallowlistし、key rotationをtestする。
- external subject + issuerをidentity keyとし、emailをidentityにしない。
- high-risk commandはfresh authorization/re-authを要求可能にする。
- IdP unavailable時の新規authはfail closed。break-glassは独立account/期限/二者承認。
- Keycloak preview/non-public APIへ依存しない。major/minor upgradeはbackup/rehearsal後に実施。

