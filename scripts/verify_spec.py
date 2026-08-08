#!/usr/bin/env python3
"""Dependency-light Milestone 0 specification verifier."""

from __future__ import annotations

import re
import sys
from datetime import date
from pathlib import Path
from urllib.parse import urlparse

try:
    import yaml
except ImportError as exc:  # pragma: no cover - environment guard
    raise SystemExit("PyYAML is required to validate compliance YAML") from exc


ROOT = Path(__file__).resolve().parent.parent
ERRORS: list[str] = []

REQUIRED_ARTIFACTS = [
    "COMPANY_OS_CODEX_HANDOFF.md",
    "docs/reviews/initial-gap-analysis.md",
    "docs/domains/business-capability-map.md",
    "docs/domains/system-catalog.md",
    "docs/compliance/law-catalog.md",
    "docs/compliance/legal-requirement-catalog.md",
    "docs/compliance/applicability-matrix.md",
    "docs/compliance/retention-matrix.md",
    "docs/compliance/control-catalog.md",
    "docs/compliance/compliance-test-catalog.md",
    "docs/security/data-classification.md",
    "docs/data-model/master-data-ownership.md",
    "docs/governance/role-sod-matrix.md",
    "docs/integrations/integration-map.md",
    "docs/requirements/non-functional-requirements.md",
    "docs/security/threat-model.md",
    "docs/glossary/glossary.md",
    "docs/data-model/domain-model.md",
    "docs/architecture/architecture-draft.md",
    "docs/architecture/technology-evaluation.md",
    "docs/tasks/TASK-007-repository-bootstrap.md",
    "docs/plans/delegation-readiness.md",
    "docs/milestones/milestone-0-manifest.md",
]

ADR_HEADINGS = [
    "## コンテキスト",
    "## 決定要因",
    "## 検討した選択肢",
    "## 決定",
    "## 結果",
    "## 実装メモ",
]


def error(message: str) -> None:
    ERRORS.append(message)


def load_yaml(path: Path) -> object:
    try:
        return yaml.safe_load(path.read_text(encoding="utf-8"))
    except Exception as exc:  # noqa: BLE001 - report all parse failures
        error(f"YAML parse failed: {path.relative_to(ROOT)}: {exc}")
        return None


def check_artifacts() -> None:
    for relative in REQUIRED_ARTIFACTS:
        if not (ROOT / relative).is_file():
            error(f"missing required artifact: {relative}")


def check_markdown() -> None:
    link_re = re.compile(r"(?<!!)\[[^\]]*\]\(([^)]+)\)")
    ignored_directories = {".git", "node_modules", "dist", "coverage", ".next", "artifacts"}
    for path in sorted(ROOT.rglob("*.md")):
        if ignored_directories.intersection(path.parts):
            continue
        text = path.read_text(encoding="utf-8")
        if "\t" in text:
            error(f"tab found: {path.relative_to(ROOT)}")
        for number, line in enumerate(text.splitlines(), 1):
            trailing = len(line) - len(line.rstrip(" "))
            if trailing not in (0, 2):
                error(f"invalid trailing spaces: {path.relative_to(ROOT)}:{number}")
        for match in link_re.finditer(text):
            raw = match.group(1).strip()
            target = raw.split("#", 1)[0].strip("<>")
            parsed = urlparse(target)
            if not target or parsed.scheme in {"http", "https", "mailto"}:
                continue
            if parsed.scheme:
                error(f"unsupported link scheme: {path.relative_to(ROOT)} -> {raw}")
                continue
            resolved = (path.parent / target).resolve()
            try:
                resolved.relative_to(ROOT)
            except ValueError:
                error(f"link escapes repository: {path.relative_to(ROOT)} -> {raw}")
                continue
            if not resolved.exists():
                error(f"broken relative link: {path.relative_to(ROOT)} -> {raw}")


def check_catalog_ids() -> tuple[set[str], set[str]]:
    system_text = (ROOT / "docs/domains/system-catalog.md").read_text(encoding="utf-8")
    system_ids = re.findall(r"^\| (SYS-[A-Z]+-[0-9]{3}) \|", system_text, re.MULTILINE)
    if len(system_ids) != len(set(system_ids)):
        error("duplicate System IDs")
    for number, line in enumerate(system_text.splitlines(), 1):
        if line.startswith("| SYS-") and line.count("|") != 18:
            error(f"System Catalog column count != 17 at line {number}")

    capability_text = (ROOT / "docs/domains/business-capability-map.md").read_text(encoding="utf-8")
    capability_ids = set(re.findall(r"CAP-[A-Z]{3}-[0-9]{2}-[0-9]{2}-[0-9]{2}", capability_text))
    if not capability_ids:
        error("no Capability IDs found")
    return set(system_ids), capability_ids


def check_requirements(system_ids: set[str], capability_ids: set[str]) -> None:
    schema = load_yaml(ROOT / "compliance/schema/requirement.schema.yaml")
    if not isinstance(schema, dict):
        error("requirement schema is not an object")
        return
    required = set(schema.get("required", []))
    allowed = set(schema.get("properties", {}))
    status_values = {"verified", "unverified", "expert_review_required", "superseded"}
    type_values = {
        "legal_obligation",
        "legal_prohibition",
        "official_guidance",
        "internal_control",
        "product_policy",
    }
    seen: set[str] = set()
    referenced_controls: set[str] = set()
    referenced_tests: set[str] = set()
    files = sorted((ROOT / "compliance/requirements").glob("*.yaml"))
    if not files:
        error("no requirement YAML files")
    for path in files:
        data = load_yaml(path)
        if not isinstance(data, dict):
            error(f"requirement is not an object: {path.name}")
            continue
        missing = required - set(data)
        extra = set(data) - allowed
        if missing:
            error(f"{path.name}: missing keys {sorted(missing)}")
        if extra:
            error(f"{path.name}: unknown keys {sorted(extra)}")
        requirement_id = data.get("requirement_id")
        if requirement_id != path.stem or not re.fullmatch(r"JP-[A-Z]+-[0-9]{3}", str(requirement_id)):
            error(f"{path.name}: invalid/mismatched requirement_id")
        if requirement_id in seen:
            error(f"duplicate requirement ID: {requirement_id}")
        seen.add(str(requirement_id))
        if data.get("status") not in status_values:
            error(f"{path.name}: invalid status")
        if data.get("requirement_type") not in type_values:
            error(f"{path.name}: invalid requirement_type")
        for field in ("effective_from", "verified_at"):
            try:
                date.fromisoformat(str(data[field]))
            except (KeyError, ValueError):
                error(f"{path.name}: invalid {field}")
        sources = data.get("sources")
        if not isinstance(sources, list) or not sources:
            error(f"{path.name}: official source required")
        else:
            for source in sources:
                if not isinstance(source, dict):
                    error(f"{path.name}: source must be object")
                    continue
                url = str(source.get("url", ""))
                if urlparse(url).scheme != "https" or not source.get("legal_reference") or not source.get("checked_at"):
                    error(f"{path.name}: source needs HTTPS/legal_reference/checked_at")
        trace = data.get("traceability", {})
        for system_id in trace.get("systems", []):
            if system_id not in system_ids:
                error(f"{path.name}: unknown System ID {system_id}")
        for capability_id in trace.get("capabilities", []):
            if capability_id not in capability_ids:
                error(f"{path.name}: unknown Capability ID {capability_id}")
        for control_id in trace.get("controls", []):
            if not re.fullmatch(r"CTL-[A-Z]+(?:-[A-Z]+)*-[0-9]{3}", control_id):
                error(f"{path.name}: invalid Control ID {control_id}")
            referenced_controls.add(control_id)
        for test_id in trace.get("tests", []):
            if not re.fullmatch(r"TEST-[A-Z]+(?:-[A-Z]+)*-[0-9]{3}", test_id):
                error(f"{path.name}: invalid Test ID {test_id}")
            referenced_tests.add(test_id)

    control_text = (ROOT / "docs/compliance/control-catalog.md").read_text(encoding="utf-8")
    defined_controls = set(re.findall(r"^\| (CTL-[A-Z]+(?:-[A-Z]+)*-[0-9]{3}) \|", control_text, re.MULTILINE))
    test_text = (ROOT / "docs/compliance/compliance-test-catalog.md").read_text(encoding="utf-8")
    defined_tests = set(re.findall(r"^## (TEST-[A-Z]+(?:-[A-Z]+)*-[0-9]{3}):", test_text, re.MULTILINE))
    if referenced_controls != defined_controls:
        error(
            "Control traceability mismatch: "
            f"missing definitions={sorted(referenced_controls - defined_controls)}, "
            f"unreferenced={sorted(defined_controls - referenced_controls)}"
        )
    if referenced_tests != defined_tests:
        error(
            "Test traceability mismatch: "
            f"missing definitions={sorted(referenced_tests - defined_tests)}, "
            f"unreferenced={sorted(defined_tests - referenced_tests)}"
        )


def check_domain_model() -> None:
    text = (ROOT / "docs/data-model/domain-model.md").read_text(encoding="utf-8")
    for label, pattern in (
        ("Aggregate", r"^\| (AGG-[A-Z]+-[A-Z0-9]+) \|"),
        ("Bounded Context", r"^\| (BC-[A-Z]+) \|"),
    ):
        ids = re.findall(pattern, text, re.MULTILINE)
        if not ids:
            error(f"no {label} IDs found")
        if len(ids) != len(set(ids)):
            error(f"duplicate {label} IDs")


def check_adrs() -> None:
    paths = sorted((ROOT / "docs/adr").glob("ADR-*.md"))
    numbers: list[int] = []
    for path in paths:
        match = re.match(r"ADR-(\d{3})-", path.name)
        if not match:
            error(f"invalid ADR filename: {path.name}")
            continue
        numbers.append(int(match.group(1)))
        text = path.read_text(encoding="utf-8")
        for heading in ADR_HEADINGS:
            if heading not in text:
                error(f"{path.name}: missing heading {heading}")
        if "**ステータス**:" not in text or "**決定者**:" not in text:
            error(f"{path.name}: missing status/decision maker")
    if numbers != list(range(1, len(numbers) + 1)):
        error(f"ADR numbering not contiguous: {numbers}")


def check_manifest() -> None:
    text = (ROOT / "docs/milestones/milestone-0-manifest.md").read_text(encoding="utf-8")
    registered = set(re.findall(r"`([^`]+\.(?:md|yaml))`", text))
    for relative in REQUIRED_ARTIFACTS:
        if relative in {"COMPANY_OS_CODEX_HANDOFF.md", "docs/milestones/milestone-0-manifest.md"}:
            continue
        if relative not in registered and "docs/adr/" not in relative:
            error(f"required artifact not registered in manifest: {relative}")


def main() -> int:
    check_artifacts()
    check_markdown()
    systems, capabilities = check_catalog_ids()
    check_requirements(systems, capabilities)
    check_domain_model()
    check_adrs()
    check_manifest()
    if ERRORS:
        print("Specification verification failed:", file=sys.stderr)
        for item in ERRORS:
            print(f"- {item}", file=sys.stderr)
        return 1
    requirement_count = len(list((ROOT / "compliance/requirements").glob("*.yaml")))
    adr_count = len(list((ROOT / "docs/adr").glob("ADR-*.md")))
    print(
        "Specification verification passed: "
        f"{len(REQUIRED_ARTIFACTS)} artifacts, {requirement_count} requirements, "
        f"{len(systems)} systems, {len(capabilities)} capability IDs, {adr_count} ADRs."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
