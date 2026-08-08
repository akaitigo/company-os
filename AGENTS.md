# Company OS Repository Rules

このファイルは本リポジトリ全体に適用する。上位の
`/home/ryusei/AGENTS.md` と `/home/ryusei/code/AGENTS.md` も遵守すること。

## 現在のフェーズ

- Milestone 0: Company OS Specification v0.1
- TASK-001〜006とMilestone 0の受け入れ条件が満たされるまで、本格的な機能実装とTASK-007を開始しない。
- 法令・制度に関する断定は、確認日付きの公式一次情報を根拠にする。
- 「確認済み」「未確認」「要専門家レビュー」を区別する。

## 正本と変更規則

- 構想の原典は `COMPANY_OS_CODEX_HANDOFF.md` とする。
- 調査成果は原典を直接書き換えず、`docs/` または `compliance/` に配置する。
- 要件、法令、設計、テストの識別子を相互参照し、トレーサビリティを維持する。
- 法令の条件、料率、期間などをアプリケーションコードへ定数として直書きしない。
- 既存変更を取り消さず、破壊的なGit操作を行わない。
- 秘密情報、実在人物の個人情報、実在企業の機密情報をfixtureや文書へ含めない。

## 設計ゲート

- 認証・認可、個人データ、監査、削除、バックアップ、外部通信、公開API、DB migrationは、ADR・脅威モデル・rollback方針を確定してから実装する。
- Build / Buy / Integrate の判断には、責任分界、データ移転、ロックイン、ライセンス、終了時のデータ搬出を含める。
- OSSコアと商用機能の境界は、open-core化を既定とせずADRで決定する。

## 検証

- 現在の文書フェーズでは、Markdownリンク、識別子、表構造、一次情報URL、確認日を検証する。
- TASK-007で `./scripts/verify` を導入し、ローカルとCIの正規検証コマンドを統一する。
- 未実行の検証は理由とリスクを完了報告に記載する。

## Git / PR

- 原則として1 Issue = 1 branch = 1 Draft PRとする。
- IssueはDefinition of Ready、PRはDefinition of Doneを満たすこと。
- Codexの独立レビューとCI成功前にReady for reviewまたはmergeへ進めない。

