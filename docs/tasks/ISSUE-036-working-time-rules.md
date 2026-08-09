# Implementation Contract: Issue #36

## Objective

Versioned勤務ruleと事業所calendarに基づく日次労働時間分類を勤怠の記録・永続化・API・UI・監査へ接続し、従業員と承認者が同じ計算根拠を再現できるようにする。

## Current State

- Branch `agent/working-time-rules-36`、base `main` at `c4c9b33`、parent #12、related #13。
- `AttendanceEntry`はelapsed/break/worked minutesだけを計算し、一覧APIがworked minutesを再計算する。
- `PAR-WKF-003`は`not_started`。`JP-LABOR-003`はverifiedだが`TEST-JP-LABOR-003`はexecutable draftでruntime未接続。
- Repository delegation levelはLevel 2。法令適用、DB、audit、authorization境界はCodexが設計し、委任しない。

## Decisions

- 勤務rule versionはtenant内でappend-onlyとし、effective range、timezone、所定開始/終了、所定分、日次法定分、深夜window、Requirement/control参照、expert review状態を保持する。
- employmentへのrule assignmentと連番付きappend-only calendar day eventの最新値をeffective sourceとする。既存tenantは全在籍者のcoverage確認後にHRが不可逆なenforcementを有効化し、それ以降の欠落・重複・review pendingは`WORK_RULE_UNDETERMINED`でfail closedする。移行前の未割当勤怠は互換性のため`legacy-unclassified`として保存する。
- classifierは勤務intervalから休憩intervalを除いたminute区間を境界分割する。primary分類（scheduled / outside_schedule）と法定時間外、深夜、法定休日のorthogonal dimensionを保持し、日次丸めをしない。
- 記録transaction内でrule/calendarをlockして解決し、canonical input SHA-256、rule version、分類JSON、説明schema versionをimmutable snapshotとして勤怠に関連付ける。
- 既存勤怠はbackfillしない。snapshotがない既存recordは`legacy-unclassified`と表示し、訂正時だけ新ruleでsnapshotを作る。
- 今回の法定時間外は設定された日次thresholdを超えたminuteの分類までとし、36協定rolling上限や適法性判定を実装しない。

## Invariants

- worked minutes = scheduled + outside schedule。breakはどのwork分類にも含めない。
- statutory overtime、night、statutory holidayはworked intervalのsubsetであり重複可能。各値は0..worked minutes。
- 分類はwhole minute、最大48時間、break最大10件のbounded inputだけを扱う。
- snapshot作成後にrule/calendarを変更しても過去結果・hash・説明は変わらない。
- rule/calendar/snapshot/enforcement activationはtenant RLSとappend-onlyを持ち、application roleは他tenantを読めない。
- expert reviewが`approved`でないruleを勤怠へ適用しない。UIは法令適合を断定しない。

## Scope

- `modules/workforce`: deterministic classifierと説明型
- `packages/contracts`: rule/calendar create/list schemas
- migration `0008`とverify/checksum
- API: HR設定command/query、attendance snapshot record/query、audit/outbox evidence
- Web: HR設定section、勤怠内訳・rule/version/review status表示
- unit、contract、integration、role E2E、a11y、migration、spec/evidence更新

## Non-goals

- 月45時間、年360/720時間、単月100時間、2〜6か月平均80時間、年6回のrolling enforcement
- 変形/フレックス/裁量/特則、給与額・割増率、給与export
- 実企業就業規則や専門家approvalを推測すること

## Resource and Time Limits

- rule/calendar list: 最大100件。classification explanation JSON: 16 KiB以下。
- classifier: 最大2,880 minute、休憩10件、外部I/Oなし。
- API body 1 MiB、request 10秒の既存上限を維持する。

## Required Tests

- Unit: 所定内/外、threshold、深夜境界、休日、overnight、休憩重複dimension、合計不変条件。
- Contract: invalid time/minute/range/status、unknown fields、bounds。
- Integration: RLS、append-only、重複effective range、missing/pending rule fail closed、snapshot不変、訂正、新旧binary expand compatibility。
- E2E: HR設定、employee記録・説明、manager同一説明、role拒否、keyboard/a11y。
- `./scripts/verify`、`./scripts/test-integration`、`./scripts/test-e2e`、independent review、全CI。

## Acceptance Criteria

- [ ] Issue #36の受け入れ条件をすべて自動証拠または明示的残存gapへ対応付ける。
- [ ] 全新規データがRLS/append-only/監査を持ち、rule未確定時に勤怠を保存しない。
- [ ] UI/API/DBの分類値とsnapshot hashが一致し、過去説明を再現できる。
- [ ] `PAR-WKF-003`とcompliance traceが実証範囲を過大表示せず更新される。
- [ ] CRITICAL/HIGH/MEDIUM review finding 0、全CI green。

## Rollback

Migrationはtable追加のみのexpand-firstとし、旧binaryは新tableを無視して動作できる。既存tenantはenforcement未有効のままupgradeでき、全在籍者へruleを割り当ててからHRが有効化する。新binaryの書込開始後もsnapshot・activationを削除しない。application rollback時は新規rule設定UIを停止し、DBはforward-fixする。

## Stop Conditions

- verified sourceにない閾値・特則をhard-codeする必要がある。
- 既存勤怠の破壊的backfillまたは更新が必要になる。
- rule未確定時のfail-closedを弱めないと既存E2Eを維持できない。
- payroll、rolling上限、実企業ruleへscopeが広がる。
