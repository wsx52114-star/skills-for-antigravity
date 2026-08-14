#!/usr/bin/env python3
"""Build a deterministic terminology snapshot from a Taiwan.md checkout."""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path


REPOSITORY = "https://github.com/frank890417/taiwan-md"


def _strip_quotes(value: str) -> str:
    value = value.strip()
    if len(value) >= 2 and value[0] == value[-1] and value[0] in "\"'":
        return value[1:-1]
    return value


def _parse_nested(lines: list[str], start: int, parent_indent: int) -> tuple[object, int]:
    result: dict[str, object] | list[object] = {}
    index = start
    consumed = 0
    while index < len(lines):
        line = lines[index]
        stripped = line.rstrip()
        if not stripped or stripped.lstrip().startswith("#"):
            index += 1
            consumed += 1
            continue
        indent = len(line) - len(line.lstrip())
        if indent <= parent_indent:
            break
        content = stripped.lstrip()
        if content.startswith("- "):
            if not isinstance(result, list):
                result = []
            item = content[2:].strip()
            match = re.match(r"^([A-Za-z_][\w-]*):\s*(.*)$", item)
            if not match:
                result.append(_strip_quotes(item))
                index += 1
                consumed += 1
                continue
            key, value = match.group(1), re.sub(r"\s+#.*$", "", match.group(2)).strip()
            item_dict = {key: _strip_quotes(value) if value else ""}
            index += 1
            consumed += 1
            while index < len(lines):
                child = lines[index]
                child_stripped = child.rstrip()
                if not child_stripped or child_stripped.lstrip().startswith("#"):
                    index += 1
                    consumed += 1
                    continue
                child_indent = len(child) - len(child.lstrip())
                if child_indent <= indent:
                    break
                child_match = re.match(
                    r"^([A-Za-z_][\w-]*):\s*(.*)$", child_stripped.lstrip()
                )
                if child_match:
                    child_value = re.sub(r"\s+#.*$", "", child_match.group(2)).strip()
                    item_dict[child_match.group(1)] = _strip_quotes(child_value) if child_value else ""
                index += 1
                consumed += 1
            result.append(item_dict)
            continue
        match = re.match(r"^([A-Za-z_][\w-]*):\s*(.*)$", content)
        if not match or isinstance(result, list):
            index += 1
            consumed += 1
            continue
        key, value = match.group(1), re.sub(r"\s+#.*$", "", match.group(2)).strip()
        if value:
            result[key] = _strip_quotes(value)
            index += 1
            consumed += 1
        else:
            nested, child_count = _parse_nested(lines, index + 1, indent)
            result[key] = nested
            index += 1 + child_count
            consumed += 1 + child_count
    return result, consumed


def parse_yaml_minimal(content: str) -> dict[str, object]:
    """Parse the scalar, mapping, and list subset used by Taiwan.md terms."""
    result: dict[str, object] = {}
    lines = content.splitlines()
    index = 0
    while index < len(lines):
        line = lines[index]
        stripped = line.rstrip()
        if not stripped or stripped.lstrip().startswith("#") or line.startswith((" ", "\t")):
            index += 1
            continue
        match = re.match(r"^([A-Za-z_][\w-]*):\s*(.*)$", stripped)
        if not match:
            index += 1
            continue
        key, value = match.group(1), re.sub(r"\s+#.*$", "", match.group(2)).strip()
        if value:
            result[key] = _strip_quotes(value)
            index += 1
        else:
            nested, consumed = _parse_nested(lines, index + 1, 0)
            result[key] = nested
            index += 1 + consumed
    return result


def variants(value: str) -> list[str]:
    result: list[str] = []
    for part in re.split(r"\s*[/／]\s*", value):
        part = part.strip()
        match = re.fullmatch(r"(.+?)（(.+?)）", part)
        candidates = [match.group(1), match.group(2)] if match else [part]
        for candidate in candidates:
            candidate = candidate.strip()
            if candidate and candidate not in result:
                result.append(candidate)
    return result


def build(source_root: Path, revision: str) -> dict[str, object]:
    terminology_dir = source_root / "data" / "terminology"
    if not terminology_dir.is_dir():
        raise ValueError(f"Taiwan.md terminology directory not found: {terminology_dir}")
    if not re.fullmatch(r"[0-9a-f]{40}", revision):
        raise ValueError("revision must be a full lowercase commit SHA")

    terms: list[dict[str, object]] = []
    for source in sorted(terminology_dir.glob("*.yaml")):
        if source.name.startswith("_"):
            continue
        parsed = parse_yaml_minimal(source.read_text(encoding="utf-8"))
        display = parsed.get("display")
        if not isinstance(display, dict):
            raise ValueError(f"Missing display mapping: {source.name}")
        taiwan_value = display.get("taiwan", "")
        china_value = display.get("china", "")
        taiwan_raw = taiwan_value.strip() if isinstance(taiwan_value, str) else ""
        china_raw = china_value.strip() if isinstance(china_value, str) else ""
        if not taiwan_raw:
            raise ValueError(f"Missing display.taiwan: {source.name}")
        if not china_raw or china_raw in {"{}", "[]", "null", "~"}:
            continue

        detection_data: dict[str, object] | None = None
        detection = parsed.get("detection")
        if isinstance(detection, dict):
            severity = str(detection.get("severity", "")).upper()
            if severity not in {"A", "B"}:
                raise ValueError(f"Invalid detection severity in {source.name}: {severity!r}")
            false_positives: list[str] = []
            raw_false_positives = detection.get("false_positives", [])
            if isinstance(raw_false_positives, list):
                for item in raw_false_positives:
                    if isinstance(item, dict) and str(item.get("pattern", "")).strip():
                        false_positives.append(str(item["pattern"]).strip())
            detection_data = {
                "severity": severity,
                "false_positives": sorted(set(false_positives)),
            }

        terms.append(
            {
                "china": variants(china_raw),
                "taiwan": variants(taiwan_raw),
                "fork_type": str(parsed.get("fork_type", "")).strip(),
                "detection": detection_data,
                "source_file": source.name,
            }
        )

    terms.sort(key=lambda item: (item["china"][0], item["source_file"]))
    return {
        "schema_version": 1,
        "source": {"repository": REPOSITORY, "commit": revision},
        "statistics": {
            "terms": len(terms),
            "severity_a": sum(item["detection"] is not None and item["detection"]["severity"] == "A" for item in terms),
            "severity_b": sum(item["detection"] is not None and item["detection"]["severity"] == "B" for item in terms),
        },
        "terms": terms,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source-root", type=Path, required=True)
    parser.add_argument("--revision", required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()

    snapshot = build(args.source_root.resolve(), args.revision)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(
        json.dumps(snapshot, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )
    stats = snapshot["statistics"]
    print(
        f"Built {stats['terms']} terms "
        f"({stats['severity_a']} severity A, {stats['severity_b']} severity B) "
        f"from {args.revision}."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
