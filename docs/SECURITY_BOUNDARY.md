# Security Boundary

## Trust boundary

Browserと外部systemはuntrustedです。Web session cookieはHTTP-only、SameSite=Lax、production Secureで暗号化します。APIはbrowserやproxyが付与したtenant headerを信頼せず、Keycloak署名済みaccess tokenのissuer、audience、期限、algorithm、`tenant_id`、rolesを検証します。未知action、欠落claim、JWKS/discovery障害はdenyします。

PostgreSQL owner接続はmigration/backup専用です。通常APIはtransaction内で`company_os_app`へ降格し、tenant RLSを設定します。DB URL、session key、IdP admin、object-store keyはsecret managerから注入し、repoのlocal-development placeholderを本番利用しません。

## データ保護

- C1〜C4分類を使用し、C3/C4は最小権限、暗号化、監査対象とする。
- audit/rules/journals/document versions/payment eventsはappend-only。
- legal hold中のdocumentはdisposition禁止。保持期限到来は自動削除ではなく承認workflowへ送る。
- logへtoken、cookie、password、document本文、個人データを出さない。認証失敗logは理由だけを記録する。

## 脅威と対策

Tenant越境はJWT tenant + authorization + RLS、権限昇格はknown-action allowlist、支払自己承認はSoD constraint、event重複はidempotency key、不均衡仕訳はdeferred DB constraint、供給網はlockfile/CodeQL/SCA/SBOM/secret/container scanで軽減します。

残存リスク: 本reference implementationはHSM、production KMS/PITR、WAF、SIEM、実行政/銀行adapterを提供しません。deploy側で設計・検証が必要です。
