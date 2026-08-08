# Delegation Readiness Gate

## 現在の判定

- 現在: **Level 0**
- 理由: Milestone 0は設計段階で、build/CI/test/migration/rollbackの実装証拠がない。
- 次の作業: TASK-007 Repository Bootstrap
- 禁止: 生のIssueまたは本仕様書だけをClaudeへ渡して機能実装させない。

## Level 0 → Level 1 Gate

- [ ] READMEにsetup/verify/external dependencyが実装どおり記載される。
- [ ] repository AGENTS.mdに正規command、編集境界、禁止、Git/PR運用が確定する。
- [ ] `./scripts/verify`がclean clone/local/CIで成功する。
- [ ] Architecture/Security/Operations文書がactual code/deploymentと一致する。
- [ ] migration apply、schema diff、rollback/forward-fix testがある。
- [ ] vertical sliceにunit/integration/E2E/authz/audit/failure testがある。
- [ ] secret、実個人data、未知所有のdirty changeがない。
- [ ] Issue/PR/Implementation Contract templateがある。

満たした後も、委任は文言・test・明確な小規模bug等のLevel 1作業に限定する。

## Level 1 Pilot

30〜90分の独立taskを3件、順番に実施する。

| Pilot | Candidate | Success measure |
| --- | --- | --- |
| PILOT-001 | 既存patternに沿うvalidation/test追加 | scope外変更0、first verify成功 |
| PILOT-002 | accessibility/error-stateの小規模UI改善 | screenshot/E2E、architecture逸脱0 |
| PILOT-003 | document/fixture/adapterの明確な追加 | security/privacy逸脱0、review重大指摘0 |

各pilotで初回CI、重大指摘、scope外変更、test不足、手戻り、人間判断、所要時間を記録する。同じ不変条件違反、test弱体化、scope外refactorがあればLevelを維持/低下させる。

## Level 1 → Level 2 Gate

- [ ] Level 1 pilotを3件連続で重大設計逸脱なく完了する。
- [ ] module ownershipとpublic surfaceをarchitecture testで強制する。
- [ ] domain invariantを自動testできる。
- [ ] IssueごとのImplementation Contract templateとreview processが運用される。
- [ ] schema/API/auth/privacy/external changesをclassificationできる。
- [ ] migration、backup、rollback/fail-closedをtest/runbookで検証する。
- [ ] required CI gateをbranch protectionへ設定する。
- [ ] Codexがdiffと正規検証を独立確認する。

## Level 2で委任可能な範囲

- 詳細設計済みmodule機能、既存patternに沿うAPI/UI、test、migration実装。
- Contractで対象file、invariant、performance limit、required tests、stop conditionを指定する。

次はLevel 2でもCodexと人間が最終判断する。

- 認証・認可・暗号・key
- payment/billing
- C4 dataの外部送信
- backup/restore/delete
- arbitrary parser/URL/archive/deserialization
- dependency/license
- public API compatibility
- production migration/Ready/merge

## Level 3 Gate（将来）

module ownership、contract/integration/E2E安定、preview、PR size/手戻り/flaky metricsが揃い、衝突なくtask分割できる場合だけ継続委任を検討する。

## 受け入れ条件

- [x] 現在Level 0の根拠を明記した。
- [x] Level 1、pilot、Level 2の観測可能なgateを定義した。
- [x] Level 2でも人間/Codexが保持する判断を明記した。
- [x] 委任停止・低下条件をpilot metricsへ接続した。

