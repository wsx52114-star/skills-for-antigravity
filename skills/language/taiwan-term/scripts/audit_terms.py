#!/usr/bin/env python3
"""Scan Git-tracked text files with the pinned Taiwan.md snapshot."""

from __future__ import annotations

import argparse
import fnmatch
import json
import os
import subprocess
from pathlib import Path, PurePosixPath


DEFAULT_SNAPSHOT = (
    Path(__file__).resolve().parent.parent
    / "references"
    / "taiwan-md"
    / "terminology.snapshot.json"
)


def repository_root(path: Path) -> Path:
    result = subprocess.run(
        ["git", "-C", str(path), "rev-parse", "--show-toplevel"],
        check=True,
        capture_output=True,
        text=True,
    )
    return Path(result.stdout.strip()).resolve()


def tracked_files(root: Path, paths: list[str]) -> list[str]:
    result = subprocess.run(
        ["git", "-C", str(root), "ls-files", "-z", "--", *paths],
        check=True,
        capture_output=True,
    )
    return sorted(item.decode("utf-8") for item in result.stdout.split(b"\0") if item)


def excluded(relative: str, patterns: list[str]) -> bool:
    path = PurePosixPath(relative)
    return any(fnmatch.fnmatch(relative, pattern) or path.match(pattern) for pattern in patterns)


def protected_span(line: str, start: int, end: int, patterns: list[str]) -> bool:
    for pattern in patterns:
        offset = 0
        while True:
            found = line.find(pattern, offset)
            if found < 0:
                break
            if found <= start and end <= found + len(pattern):
                return True
            offset = found + 1
    return False


def candidates(snapshot: dict[str, object], mode: str, min_chars: int) -> list[dict[str, object]]:
    result: list[dict[str, object]] = []
    for entry in snapshot["terms"]:
        detection = entry.get("detection")
        if mode == "detection" and detection is None:
            continue
        for term in entry["china"]:
            if len(term) < min_chars:
                continue
            result.append(
                {
                    "term": term,
                    "taiwan": " / ".join(entry["taiwan"]),
                    "severity": detection["severity"] if detection else "review",
                    "false_positives": detection["false_positives"] if detection else [],
                    "source_file": entry["source_file"],
                }
            )
    return sorted(result, key=lambda item: (-len(item["term"]), item["term"], item["source_file"]))


def scan_file(root: Path, relative: str, terms: list[dict[str, object]]) -> tuple[list[dict[str, object]], str | None]:
    path = root / relative
    if path.is_symlink() or not path.is_file():
        return [], "non-regular-or-symlink"
    try:
        content = path.read_text(encoding="utf-8")
    except (UnicodeDecodeError, OSError):
        return [], "non-utf8-or-unreadable"
    if "\x00" in content:
        return [], "binary"

    findings: list[dict[str, object]] = []
    seen: set[tuple[int, int, str, str]] = set()
    for line_number, line in enumerate(content.splitlines(), start=1):
        for candidate in terms:
            term = candidate["term"]
            offset = 0
            while True:
                position = line.find(term, offset)
                if position < 0:
                    break
                end = position + len(term)
                key = (line_number, position, term, candidate["source_file"])
                if key not in seen and not protected_span(
                    line, position, end, candidate["false_positives"]
                ):
                    seen.add(key)
                    findings.append(
                        {
                            "path": relative,
                            "line": line_number,
                            "column": position + 1,
                            "term": term,
                            "taiwan": candidate["taiwan"],
                            "severity": candidate["severity"],
                            "source_file": candidate["source_file"],
                            "text": line.strip(),
                        }
                    )
                offset = position + 1
    return findings, None


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("paths", nargs="*", default=["."], help="Git pathspecs to scan")
    parser.add_argument("--repo", type=Path, default=Path.cwd())
    parser.add_argument("--snapshot", type=Path, default=DEFAULT_SNAPSHOT)
    parser.add_argument("--mode", choices=("detection", "full"), default="detection")
    parser.add_argument("--exclude", action="append", default=[], metavar="GLOB")
    parser.add_argument("--min-chars", type=int, default=2)
    parser.add_argument("--format", choices=("text", "json"), default="text")
    parser.add_argument("--fail-on", choices=("none", "a", "any"), default="none")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    if args.min_chars < 1:
        raise SystemExit("--min-chars must be positive")
    root = repository_root(args.repo.resolve())
    snapshot = json.loads(args.snapshot.read_text(encoding="utf-8"))
    terms = candidates(snapshot, args.mode, args.min_chars)
    files = [path for path in tracked_files(root, args.paths) if not excluded(path, args.exclude)]

    findings: list[dict[str, object]] = []
    skipped: dict[str, str] = {}
    for relative in files:
        file_findings, reason = scan_file(root, relative, terms)
        findings.extend(file_findings)
        if reason:
            skipped[relative] = reason
    findings.sort(key=lambda item: (item["path"], item["line"], item["column"], -len(item["term"])))

    payload = {
        "mode": args.mode,
        "source": snapshot["source"],
        "files_scanned": len(files) - len(skipped),
        "files_skipped": skipped,
        "findings": findings,
    }
    if args.format == "json":
        print(json.dumps(payload, ensure_ascii=False, indent=2))
    else:
        print(f"Taiwan.md revision: {snapshot['source']['commit']}")
        print(f"Mode: {args.mode}; files: {payload['files_scanned']}; findings: {len(findings)}")
        for finding in findings:
            print(
                f"{finding['path']}:{finding['line']}:{finding['column']} "
                f"[{finding['severity']}] {finding['term']} -> {finding['taiwan']}"
            )

    if args.fail_on == "any" and findings:
        return 1
    if args.fail_on == "a" and any(item["severity"] == "A" for item in findings):
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
