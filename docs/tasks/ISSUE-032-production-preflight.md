# Implementation Contract: Issue #32

## Objective

自社情シスがproduction deploymentへ変更を加える前に、versioned config contract、secret/TLS、runtimeとmigration権限分離、OIDC、telemetry、Web artifactを一括検査し、redacted JSON evidenceを取得できるようにする。

## Current State

- Branch `agent/production-preflight-32`, base `main` at `18e125a`。
- Issue #32、parent #16、capability PAR-OPS-001。
- Webは#27で起動時検証済み。API/workerはdevelopment defaultと遅延接続errorを持ち、deployment横断preflightはない。
- Worktreeは本契約だけをCodexが所有する。repositoryはLevel 2。

## Decision

- `infra/config/deployment-contract-v1.json`を環境変数、profile、secret分類、validation責任の機械可読な正本にする。
- `scripts/preflight validate`はnetwork/DBへ接続せず、`check`は各接続先へ5秒timeoutでread-only検査する。
- stdoutは単一JSON documentとし、profile、contract version、mode、check ID、status、secretを含まない定型messageだけを記録する。診断stderrにも入力値を出さない。
- SMBは`DATABASE_URL`（runtime）と`MIGRATION_DATABASE_URL`（owner）を別credentialとして要求する。両方TLS `verify-full`、別user、非superuser/非BYPASSRLSとし、runtimeだけが`company_os_app` member、migration schemaはruntimeから不可視にする。
- OIDC discoveryはissuer完全一致とHTTPS endpointを確認し、realm名をKeycloak desired stateと照合する。
- OpenTelemetryはURLのhost/portへTCP connectする。Web artifact検証は#27のchecksum verifierを再利用する。
- preflightはgrant、migration、realm reconciliation、file生成、secret rotationを行わない。

## Invariants

- `validate`はsocket接続もfile変更も行わない。`check`もSELECT/HTTP GET/TCP connectだけを使う。
- secret値、URL userinfo、host、tenant固有値をstdout/stderr/argvへ出さない。
- 全checkを収集してから非zero終了し、一件の失敗で後続検査を隠さない。
- 各外部検査は5秒以内、全体30秒以内を既定とし、retryしない。
- SMBのplaceholder、既定credential、HTTP OIDC/redirect、DB TLS不足、同一DB user、superuser/BYPASSRLSをfail closedする。
- evidence schemaとcheck IDはversionedで、順序はdeterministic。

## Scope

- deployment config contract、Node-based preflight、artifact verifier分離。
- DEV ComposeとTLS PostgreSQL fixtureを使うvalidation/connected/negative tests。
- OIDC discovery、telemetry TCP、timeout、DB privilege、redaction、offline保証のtest。
- CI、threat model、operations、README、capability evidence更新。

## Non-goals

- credential作成/grant、CA/certificate発行、Kubernetes operator、vendor secret manager integration。
- external SaaS本番endpointへの接続。
- installer本体、API/worker container化（後続Issue）。

## Required Tests

- contract schema/duplicate/unknown profile検査。
- offline `validate`でsocket接続ゼロを証明。
- DEV Composeのruntime DB、Keycloak、telemetry、artifactをconnected検査。
- SMB TLS PostgreSQL fixtureでowner/runtime分離をpositive検査。
- placeholder/短いsecret/HTTP/redirect/sslmode/同一user/superuser/権限過多をnegative検査。
- unreachable/timeout、tampered artifact、issuer mismatch、secret redaction。
- `./scripts/verify`、`./scripts/test-preflight`、独立review、CI。

## Acceptance Criteria

- [ ] config contractがDEV/SMBのrequired/secret/ownerを表現する。
- [ ] `validate|check`がdeterministic redacted JSONを出し、失敗時非zeroになる。
- [ ] SMBのsecret/TLS/URL/DB分離と最小権限をfail closed検証する。
- [ ] DB、OIDC、telemetry、artifact、Nodeをtimeout付きread-only検査する。
- [ ] clean positive、全negative、offline、timeoutを実環境CIで証明する。
- [ ] runbook、threat、rollback、evidence ledgerが実装と一致する。
- [ ] CRITICAL/HIGH/MEDIUM review finding 0、全CI green。

## Rollback

preflightはread-onlyで永続状態を変更しない。問題があればpreflight versionを旧releaseへ戻せるが、検査をskipしてdeployしない。contract downgradeは旧artifactと組でのみ許可する。

## Stop Conditions

- 接続検査にmutationが必要になる。
- secretをargv/file/logへ保存しなければ検査できない。
- 新規runtime dependencyまたは公開API変更が必要になる。
- testをskip/緩和しないと成立しない。
