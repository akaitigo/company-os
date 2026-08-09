# Implementation Contract: Issue #34

## Objective

API、worker、Webを同一release revisionのimmutable containerとして配布し、自社情シスが外部PostgreSQL、Keycloak、OpenTelemetryへ接続するVM向けproduction runtime bundleを再現可能に導入・再適用・停止できるようにする。

## Current State

- Branch `agent/production-runtime-34`、base `main` at `564f580`、parent #16。
- Web imageは非root/read-only検証済み。API/workerはbuild済みJavaScriptをhost processで起動するだけでcontainer artifactがない。
- #32のdeployment contract/preflightはDB、OIDC、telemetry、Web artifactを検査するが、実runtime bundleを展開しない。
- Repository delegation levelはLevel 2。認証、DB、secret、release境界はCodexが設計し、委任しない。

## Decisions

- `infra/containers/{api,worker}.Dockerfile`をWebと同じpinned Node Alpine、UID/GID 10001、multi-stage buildで作る。
- runtime imageにはproduction dependencyとbuild outputだけを含め、workspace source、dev dependency、package manager、secretを含めない。
- `infra/runtime/compose.production.yaml`を外部dependencyへ接続する3 service bundleの正本とし、imageは`${*_IMAGE}`でdigest指定を必須にする。DB/IdP/telemetryはprovisionしない。
- APIは`API_HOST=0.0.0.0`を明示可能にし、workerと共にliveness/readiness、10秒以内のSIGTERM停止を保証する。
- root filesystemはread-only、`/tmp`のみ16 MiB tmpfs、capability drop ALL、no-new-privileges、PID/memory/CPU上限、restart policyを固定する。
- `scripts/runtime-bundle validate|up|down|evidence`を唯一のoperator entrypointにする。`validate`は#32 preflightを先に実行し、mutable tagや不足digestを拒否する。`up`はmigrationやIAMを暗黙実行しない。
- CI smokeはlocal TLS fixtureを用い、clean start、health、再適用、DB restart/degraded/recovery、SIGTERM、secret非露出、evidence redactionを検証する。

## Invariants

- production image referenceは`@sha256:<64 hex>`のみ。tag、latest、未指定を拒否する。
- secretをDockerfile `ARG`/`ENV`、Compose command、image history、evidence、logへ出さない。
- API/worker/Webはroot、writable rootfs、privileged capability、host networkで起動しない。
- DB migration、Keycloak reconciliation、backup/restoreはruntime `up`から実行しない。
- readinessは実dependency状態を反映し、固定sleepをproduction orchestrationに使わない。
- bundle再適用は冪等で、同一digestのserviceを不必要に再作成しない。

## Resource and Time Limits

- API: 512 MiB、1 CPU、PID 128、request 10秒、body 1 MiB。
- worker: 256 MiB、0.5 CPU、PID 128、DB connect 3秒、retry 125ms〜30秒。
- Web: 256 MiB、0.5 CPU、PID 128、停止猶予10秒。
- tmpfs: 各service `/tmp` 16 MiB、`noexec,nosuid`。
- health interval 5秒、timeout 3秒、retries 12、start period 30秒。
- image compressed transfer size: API 150 MiB、worker 100 MiB、Web 100 MiB以下。

## Required Tests

- 3 imageのpinned base、UID/GID、read-only、cap drop、no-new-privileges、size、health、SIGTERM。
- API host bindingとDB readiness、worker DB disconnect/recovery。
- mutable/missing image、placeholder secret、preflight failureのnegative test。
- clean `up`、2回目のidempotent `up`、`down`、同一release evidence。
- image history/inspect/evidence/log/process argvのseeded secret scan。
- `./scripts/verify`、integration、E2E、independent review、CI。

## Acceptance Criteria

- [ ] API/worker/Web production imageとbundle policyが数値制約を満たす。
- [ ] production bundleが外部dependencyだけを利用し、digestとpreflightをfail closedする。
- [ ] health、DB切断復旧、冪等再適用、graceful shutdownを実containerで証明する。
- [ ] release evidenceがdigest、contract、healthを記録しsecretを含まない。
- [ ] runbook、threat model、rollback、capability ledgerが実装と一致する。
- [ ] CRITICAL/HIGH/MEDIUM review finding 0、全CI green。

## Rollback

直前release evidenceに記録した3 image digestと対応contractへ戻す。DB migration後に旧binary互換性がない場合はapplication rollbackせずforward-fixする。bundleはDB、IdP、object dataを削除しない。`down`はapplication container/networkのみを停止する。

## Stop Conditions

- build/run時にsecretをimage、argv、生成manifestへ保存する必要がある。
- runtime bundleがDB/IdPの破壊的provisionまたはmigration rollbackを要求する。
- security policyを緩和しなければhealth/smokeが成立しない。
- N-1互換性をschema contractから証明できないまま自動updateを実装する。
