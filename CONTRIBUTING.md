# Contributing

Company OSへの貢献を歓迎します。参加者は[Code of Conduct](CODE_OF_CONDUCT.md)に従ってください。

## 変更手順

1. Issue templateで問題、根拠、非目標、受け入れ条件、rollbackを定義する。
2. `main`からtopic branchを作り、migrationは既存fileを変更せずforward-onlyで追加する。
3. テストと文書を実装と同時に更新する。
4. `./scripts/verify`、DB変更時は`./scripts/test-integration`、UI/認証変更時は`./scripts/test-e2e`を実行する。
5. Draft PRを作り、templateに検証結果と残存リスクを記載する。

秘密情報、実在人物・企業の個人データ、生成済みcredentialをcommitしないでください。法令解釈を変更する提案は、根拠・適用日・jurisdiction・専門家レビュー要否を明示してください。

## 完了条件

- format、lint、typecheck、unit/architecture、buildが成功する。
- tenant、権限、失敗、rollback、再試行を変更リスクに応じて検証する。
- API/schema/migrationと運用文書が一致する。
- CIの必須checkがすべて成功する。
