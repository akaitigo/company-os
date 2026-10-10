# Resume the migration branch

This branch preserves dependency pins, the PostgreSQL gosu rebuild, Compose
configuration and the preflight/security script changes. It is a review branch.
Full Docker integration, restore and image-security acceptance remain necessary.

Use Node 24, pnpm 9.15.9 and the repository's existing verification commands.
The public fictional demo seed is `infra/postgres/demo/seed.sql`; the schema is
in `infra/postgres/migrations`. No database dump or saved credential is included.
For the supported container environment, use `scripts/seed-demo` after checking
the intended project and conflicts with existing shared resources.

To check the same schema and seed independently in a new local PostgreSQL:

```sh
python3 scripts/verify-demo-seed-local.py --postgres-bin /path/to/postgresql/bin
```

This check starts its own Unix-only temporary instance, applies the migrations,
runs the public seed twice, compares table counts and stops that instance. Its
receipt states the actual PostgreSQL version; a PostgreSQL 17 result does not
validate the pinned PostgreSQL 18 container. It does not connect to an existing
database or copy authentication state. Keep any irreplaceable private business
data separately until its necessity and authorized destination are resolved.
