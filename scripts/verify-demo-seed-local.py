#!/usr/bin/env python3
"""Recreate the public fictional demo in a new Unix-only PostgreSQL instance.

Does not use a dump, existing database, Docker, cloud or a saved credential.
The caller supplies a PostgreSQL installation; the report records its version.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parent.parent
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--postgres-bin", type=Path, required=True)
args = parser.parse_args()
bin_dir = args.postgres_bin.resolve(strict=True)
for name in ["initdb", "pg_ctl", "psql", "postgres"]:
    if not (bin_dir / name).is_file():
        raise SystemExit("Missing PostgreSQL program: " + name)
env = {k: v for k, v in os.environ.items() if k in ["PATH", "LANG", "LC_ALL", "TMPDIR"]}
env["LC_ALL"] = "C"
version = subprocess.check_output([str(bin_dir / "postgres"), "--version"], env=env, text=True).strip()
migrations = sorted(p for p in (ROOT / "infra/postgres/migrations").glob("[0-9]*.sql") if not p.name.endswith(".verify.sql"))
seed = ROOT / "infra/postgres/demo/seed.sql"
assert migrations and seed.is_file()
for path in [*migrations, seed]:
    text = path.read_text()
    assert not re.search(r"COPY\b.*\bPROGRAM\b|CREATE\s+FOREIGN|\\(?:!|connect)\b", text, re.I), "External SQL capability is outside this check"
with tempfile.TemporaryDirectory(prefix="company-demo-recovery-", dir="/tmp") as temporary:
    work = Path(temporary)
    work.chmod(0o700)
    data = work / "data"
    socket = work / "socket"
    socket.mkdir(mode=0o700)
    log = work / "postgres.log"
    subprocess.run([str(bin_dir / "initdb"), "-D", str(data), "-U", "company_os", "-A", "trust", "--no-locale", "--encoding=UTF8"], env=env, stdout=subprocess.DEVNULL, check=True)
    started = False
    try:
        subprocess.run([str(bin_dir / "pg_ctl"), "-D", str(data), "-l", str(log), "-o", "-h '' -k " + str(socket) + " -p 56573", "-w", "start"], env=env, stdout=subprocess.DEVNULL, check=True)
        started = True
        psql = [str(bin_dir / "psql"), "-X", "-w", "-h", str(socket), "-p", "56573", "-U", "company_os", "-d", "postgres", "-v", "ON_ERROR_STOP=1"]
        for path in migrations:
            subprocess.run([*psql, "-f", str(path)], env=env, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE, check=True)
        tables = subprocess.check_output([*psql, "-At", "-c", "SELECT schemaname||'.'||tablename FROM pg_tables WHERE schemaname NOT IN ('pg_catalog','information_schema') ORDER BY 1"], env=env, text=True).splitlines()
        assert all(re.fullmatch(r"[a-z_][a-z0-9_]*\.[a-z_][a-z0-9_]*", name) for name in tables)
        def counts():
            sql = " UNION ALL ".join("SELECT '" + name + "' AS name,count(*) AS rows FROM " + name for name in tables)
            return dict((name, int(count)) for name, count in (line.split("|") for line in subprocess.check_output([*psql, "-At", "-c", sql], env=env, text=True).splitlines()))
        subprocess.run([*psql, "-f", str(seed)], env=env, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE, check=True)
        first = counts()
        subprocess.run([*psql, "-f", str(seed)], env=env, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE, check=True)
        second = counts()
        assert first == second, "Demo seed row counts are not idempotent"
        assert sum(first.values()) > 0, "Demo seed created no records"
        print(json.dumps({"passed": True, "postgres_version": version, "unix_socket_only": True, "fresh_owned_database": True, "migrations": [p.name for p in migrations], "seed_sha256": hashlib.sha256(seed.read_bytes()).hexdigest(), "table_count": len(tables), "seeded_rows": sum(first.values()), "seed_repeated_row_counts_equal": True, "raw_dumps_or_credentials_used": False, "container_runtime_verified": False}, sort_keys=True))
    finally:
        if started:
            subprocess.run([str(bin_dir / "pg_ctl"), "-D", str(data), "-m", "fast", "-w", "stop"], env=env, stdout=subprocess.DEVNULL, check=True)
