# Implementation Contract: Issue #27

## Objective

自社情シスが、CIで検証したものと同一のNext.js standalone artifactをローカル、VM、containerで非root・read-only前提で起動できるようにする。

## Current State

- Branch `agent/next-standalone-27`, base `main` at `c1b9ffc`。
- `apps/web/next.config.ts`は`output: standalone`だが、`@company-os/web start`は非対応の`next start`を実行する。
- production E2Eは警告を出し、`.next/standalone`に自動同梱されない`.next/static`を配布物として検証していない。
- Issue #27、parent #16。worktreeは本契約だけをCodexが所有する。

## Decision

- `pnpm --filter @company-os/web build`はNext build後、standalone treeとstatic/public assetを`dist/web`へpackageする。
- package時に全fileのSHA-256 manifestとそのartifact identityを生成する。release済みartifactは再buildせず、identityでrollback対象を選ぶ。
- `scripts/start-web`を唯一のproduction entrypointとし、manifest、static asset、必須runtime configをmutation前に検証してからstandalone `server.js`を`exec`する。
- Webに依存先を探査しないliveness/readiness endpointを追加する。起動時config検証済みであることをreadinessの前提とする。
- Playwright、VM手順、container imageは同じentrypointを使う。`next start`はproduction経路から除去する。
- containerはmulti-stage build、非root user、read-only root filesystem互換とし、書込みは`/tmp`だけに限定する。

## Invariants

- package外のworkspace source/node_modulesへruntime依存しない。
- missing/tampered manifest、static tree、32文字未満のsession secret、不正URLはlisten前に非zero終了する。
- secret値をmanifest、image layer、log、argvへ保存しない。
- production responseのCSPから`unsafe-eval`を許可しない。
- SIGTERMはstandalone serverへ直接届き、10秒以内に終了する。
- artifact treeは起動時に書込み不要であり、container userはrootではない。

## Scope

- Web health routes、static marker。
- package/start/verification scripts、Playwright production entrypoint。
- Web container build definitionとself-host運用文書。
- artifact integrity、config failure、HTTP header/static/readiness、graceful shutdown tests。

## Non-goals

- Kubernetes manifest、registry公開、TLS/WAF実装。
- API/worker imageの統合package（後続Issue）。
- CSP nonce化。`unsafe-inline`撤廃は別のsecurity hardeningで扱う。

## Required Tests

- `./scripts/test-web-artifact`: clean package、checksum改変、missing static、invalid config、read-only start、health/header/static、SIGTERM。
- `./scripts/test-e2e`: packaged standalone artifactに対するOIDC callback、CSP、UI/API/RBAC/accessibility。
- `./scripts/verify`: format/lint/type/unit/buildとartifact policy。
- container: nonroot identity、read-only filesystem、health endpoint、圧縮後100 MiB budgetとengine size記録。

## Acceptance Criteria

- [ ] `dist/web`だけでproduction Webを起動できる。
- [ ] local/VM/container/CIが`./scripts/start-web`を使う。
- [ ] unsupported-mode warningがなく、不足・改変・設定不備はlisten前に明示失敗する。
- [ ] static asset、CSP（`unsafe-eval`なし）、OIDC callback、liveness/readiness、graceful shutdownを検証する。
- [ ] containerは非root・read-onlyで起動し、image sizeとartifact identityを取得できる。
- [ ] rollback、immutable artifact、runtime secret注入手順を運用文書へ記録する。
- [ ] 独立reviewと全CIが成功する。

## Rollback

DBや公開APIは変更しない。直前のartifact identityを持つimmutable imageへ戻す。runtime config不備はfail-fastし、旧artifactを継続稼働させる。

## Stop Conditions

- 新規dependency、公開API、認証境界、永続書込みが必要になる。
- read-only起動のためにNext内部patchが必要になる。
- testをskip・緩和しないと成立しない。
