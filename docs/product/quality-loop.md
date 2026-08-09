# Product Quality Loop

## Loop

各capabilityは次を一つのcycleとして繰り返す。

1. **Confirm**: 実ブラウザ、role別job、DB、API、code、law、operationsを確認する。
2. **Issue**: Problem、Evidence、Decision、Invariants、Acceptance、Stop Conditionsを持つIssue/contractを作る。
3. **Implement**: UI/API/domain/persistence/audit/operationsを縦に実装する。
4. **Verify**: 正常・失敗・訂正・取消・retry・race・権限・a11y・load・restoreを自動/実機確認する。
5. **Review**: 最低5ラウンドでsurface、implementation、design/security、integration、robustnessを確認する。
6. **Learn**: 発見をIssue、PRD、evidence model、test harness、runbookへ戻す。

## Cycle exit

- CRITICAL/HIGH/MEDIUM findingが0。
- capability statusを上げる全layer evidenceがある。
- CIと実機browser journeyがgreen。
- 新たなgapはowner/priority/acceptance付きIssueになっている。
- `verified`へ上げる場合はUATとparallel-run evidenceがある。

## Program exit

[PRD GA acceptance](PRD.md#ga-acceptance)を全て満たすまでgoalをcompleteにしない。

