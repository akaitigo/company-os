# Implementation Contract: Issue #20

## Objective

固定9時間demoを、任意の出退勤・複数休憩・実働計算・履歴・append-only訂正を扱うtenant-safeな勤怠vertical sliceへ置換する。

## Current State

- Base: `main` at merge of PR #19
- Branch: `agent/attendance-recording-20`
- Worktree ownership: this contract and Issue #20 changes only
- Existing checks: `./scripts/verify`, PostgreSQL integration, restore, OIDC Playwright E2E, security CI
- Capability status: `PAR-WKF-002=primitive`

## Decision

- Entry header owns work date, bounds, source, status and correction reference.
- Break interval is an owned child row. Header stores derived total minutes for bounded queries and verifies it against children at commit.
- Correction never mutates an entry. A replacement entry references the corrected entry; current-list query excludes superseded rows.
- API calculates duration and break total; clients do not submit derived totals.
- V1 target timezone is supplied explicitly by the command contract and initially restricted to `Asia/Tokyo`; future tenant settings replace this without changing stored instants.

## Invariants

- `endedAt > startedAt`; duration is at most 48 hours.
- 0..10 breaks; each has `endedAt > startedAt`, lies within entry bounds, and does not overlap another break.
- total break minutes is whole minutes and less than elapsed minutes.
- `workDate` equals the calendar date of `startedAt` in the command timezone.
- employment and correction target exist in the same tenant; target uses the same employment.
- an entry can be corrected only once; replacement cannot self-reference.
- entry, breaks, audit and outbox commit or roll back together under RLS.
- list limit is 1..100 and defaults to 25.

## Scope

- workforce domain attendance model and tests
- bounded contracts for create/correct/list query
- forward migration + verify file for break rows and correction uniqueness
- API command/query and fixed web proxy paths
- employee-facing form and current-entry table
- DB integration, role E2E, accessibility and negative tests
- API/operations docs and capability evidence update

## Non-goals

- shift scheduling and assignment
- overtime/night/holiday legal calculation
- approval, rejection and period close
- clock-device adapter or geolocation

## Required Tests

- unit: bounds, break overlap/outside, overnight, derived minutes
- contract: count/size/timezone/correction boundaries
- integration: RLS, append-only, break/header consistency, one correction
- E2E: arbitrary entry displayed; invalid break rejected; correction chain
- architecture, lint, typecheck, build, migration, restore

## Acceptance Criteria

- [ ] Issue #20 acceptance conditions hold.
- [ ] Existing E2E no longer refers to fixed nine-hour attendance.
- [ ] `PAR-WKF-002` is at most `vertical_slice`, with concrete evidence layers.
- [ ] Five or more review rounds leave no CRITICAL/HIGH/MEDIUM findings.

## Stop Conditions

- authorization requires trusting employee/tenant headers rather than verified claims
- migration requires mutating or deleting existing attendance evidence
- timezone cannot be made explicit without breaking stored records
- tests must be skipped or weakened
