# Implementation Contract: Issue #26

## Objective

自社情シスがclean/既存Keycloak realmを、既存user・role assignment・sessionを保持したままversioned desired stateへ冪等upgradeできるようにする。

## Current state

- Branch `agent/keycloak-reconciliation-26`, base `main` at `be233bb`。
- `--import-realm`はclean realmを作成するが既存realmを更新しない。
- `scripts/test-e2e`が不足roleと`tenant_id` profileを場当たり的に作成し、upgrade gapを隠している。
- Keycloak Admin REST APIはrealm role、client、user profileの公開管理境界を提供する。client操作では内部UUIDが必要で、role mappingは既存userへ独立して保持される。

## Decisions

- desired stateはversion付きJSONとし、realm roles、Company OS clients/mappers、user-profile attributesだけを管理する。
- `scripts/reconcile-keycloak plan|apply`を唯一のupgrade commandにする。planはread-onlyでcreate/update/no-opをJSON Lines出力する。
- applyはadditive既定。未知role/client/mapper/profile属性、user、credential、session、role assignmentを削除しない。
- managed fieldの差分だけupdateし、server生成ID/default、secret、既存assignmentをdesired stateで上書きしない。
- Composeはcontainer内`kcadm.sh`、外部は`KEYCLOAK_KCADM`を利用する。password/secretは`KC_CLI_PASSWORD`/`KC_CLI_CLIENT_SECRET`環境変数で渡しlog/argvへ出さない。
- mutation前にrealm単位のbest-effort leaseを取得する。途中失敗は次回applyで冪等forward-fixし、自動削除rollbackは行わない。

## Invariants

- user ID/count、role mapping、credential、active sessionを変更しない。
- role/client名は一意。client type、redirect URI、web origin、mapper claimは安全側へ収束する。
- destructive removalはこのcommandの非目標で、別のreview済みplanとbackupを要求する。
- auth failure、timeout、ambiguous duplicate、unsupported desired schemaはmutation前または対象操作でfail closed。
- audit outputはdesired version、action、resource type/name、resultを含みsecret/全user payloadを含めない。

## Required tests

- clean realm apply→plan no-op。
- prior fixtureからcurrentへupgradeし、新role/profile/mapperが追加される。
- 既存user ID、assignment、credential login、sessionが保持される。
- duplicate client、auth failure、concurrent apply、途中失敗、2回applyを検証する。
- E2E setupの場当たり補修をreconcile commandへ置換する。

## Rollback / forward-fix

追加済みrole/mapper/profile属性は既存token/userへ破壊的影響を与えないため自動削除しない。誤設定はdesired stateの新versionでforward-fixする。Keycloak database backup/restoreはrealm全体を戻す必要がある場合だけmaintenance windowで行う。

## Acceptance criteria

- Issue #26の全criteriaを実Keycloak CIで証明する。
- ADR/脅威モデル/OPERATIONSを実装と一致させる。
- 独立レビューでMedium以上0、全CI green後のみmergeする。
