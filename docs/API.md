# HTTP API v1

Company OS exposes a deliberately small command API. All `/v1` routes require an OIDC bearer token; tenant, actor, and roles are derived from verified claims and never trusted from request headers. Every successful command writes its domain state, audit intent, and outbox event in one PostgreSQL transaction.

## Protocol

- Base URL: `http://127.0.0.1:3001` in the development profile.
- Media type: `application/json`.
- Identifiers: UUID.
- Dates: ISO 8601 calendar dates; timestamps require an explicit offset.
- Money: JSON numbers with at most four decimal places and an ISO 4217 uppercase currency code.
- Unknown object properties are rejected. Request bodies are limited to 1 MiB and requests time out after 10 seconds.
- Success: command routes return HTTP `201` with `{ "id": "uuid", "version": 1 }`.
- Failure: `403` for authorization denial, `422` for invalid input or a rejected business precondition, and `503` when readiness dependencies are unavailable.

## Routes

| Method | Route | Required role | Purpose |
| --- | --- | --- | --- |
| GET | `/health/live` | public | Process liveness only |
| GET | `/health/ready` | public | PostgreSQL readiness |
| GET | `/v1/organization-units` | `organization-reader` or `organization-admin` | Bounded organization directory |
| POST | `/v1/organization-units` | `organization-admin` | Create an effective-dated organization unit |
| POST | `/v1/workforce/attendance` | `workforce-manager` | Append an attendance entry |
| POST | `/v1/workforce/leave-requests` | `workforce-manager` | Reserve available leave and create a pending request |
| POST | `/v1/procurement/requisitions` | `procurement-buyer` | Submit a bounded requisition with 1–100 lines |
| POST | `/v1/finance/journals` | `finance-accountant` | Post a balanced journal with 2–500 lines |
| POST | `/v1/finance/receipts` | `finance-accountant` | Record and atomically apply a receipt without over-application |
| POST | `/v1/finance/cost-allocations` | `finance-accountant` | Append a versioned-rule-backed cost allocation |

The exact executable request schemas live in [`packages/contracts/src/index.ts`](../packages/contracts/src/index.ts). The authenticated browser workflow in [`tests/e2e/auth-navigation.spec.ts`](../tests/e2e/auth-navigation.spec.ts) is the canonical runnable example.

## Idempotency and retries

Aggregate IDs and external references are uniqueness keys. A caller retrying after an ambiguous timeout must reuse the same identifier. A uniqueness conflict is not evidence that the original command failed; clients should reconcile by authorized query or event projection before issuing a different identifier. Outbox consumers are at-least-once and deduplicate using `idempotency_key`.

## Security boundary

The web application proxies only a fixed route allowlist. It does not accept a caller-supplied upstream URL. Production deployments must terminate TLS before the API, configure a trusted OIDC issuer and audience, replace all example credentials, and keep PostgreSQL unavailable from untrusted networks. See [Security Boundary](SECURITY_BOUNDARY.md).
