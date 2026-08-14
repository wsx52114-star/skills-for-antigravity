#!/usr/bin/env python3
"""Apply a Taiwan.md source snapshot to the fork-owned runtime skill."""

from __future__ import annotations

import argparse
import hashlib
import json
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path


REPOSITORY = "https://github.com/frank890417/taiwan-md"


def arguments() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repo-root", type=Path, required=True)
    parser.add_argument("--snapshot-root", type=Path, required=True)
    parser.add_argument("--sha", required=True)
    parser.add_argument("--synced-at")
    return parser.parse_args()


def regular_source_files(root: Path) -> list[Path]:
    terminology = root / "data" / "terminology"
    readme = root / "README.md"
    if not readme.is_file() or readme.is_symlink():
        raise ValueError("Taiwan.md root README.md is required")
    if not terminology.is_dir() or terminology.is_symlink():
        raise ValueError("Taiwan.md data/terminology directory is required")
    yaml_files = sorted(terminology.glob("*.yaml"))
    if not yaml_files:
        raise ValueError("Taiwan.md terminology snapshot contains no YAML terms")
    if any(path.is_symlink() or not path.is_file() for path in yaml_files):
        raise ValueError("Taiwan.md terminology source must contain regular YAML files only")
    return [readme, *yaml_files]


def main() -> int:
    args = arguments()
    repo_root = args.repo_root.resolve()
    snapshot_root = args.snapshot_root.resolve()
    if len(args.sha) != 40 or any(character not in "0123456789abcdef" for character in args.sha):
        raise ValueError("--sha must be a full lowercase commit SHA")
    regular_source_files(snapshot_root)

    skill_root = repo_root / "skills" / "language" / "taiwan-term"
    output = skill_root / "references" / "taiwan-md" / "terminology.snapshot.json"
    builder = skill_root / "scripts" / "build_snapshot.py"
    subprocess.run(
        [
            sys.executable,
            str(builder),
            "--source-root",
            str(snapshot_root),
            "--revision",
            args.sha,
            "--output",
            str(output),
        ],
        check=True,
    )

    snapshot = json.loads(output.read_text(encoding="utf-8"))
    digest = hashlib.sha256(output.read_bytes()).hexdigest()
    statistics = snapshot["statistics"]
    metadata = {
        "repository": REPOSITORY,
        "commit": args.sha,
        "source_paths": ["README.md", "data/terminology/*.yaml"],
        "snapshot": "terminology.snapshot.json",
        "snapshot_sha256": digest,
        "terms": statistics["terms"],
        "severity_a": statistics["severity_a"],
        "severity_b": statistics["severity_b"],
    }
    upstream_path = output.parent / "UPSTREAM.json"
    upstream_path.write_text(json.dumps(metadata, indent=2) + "\n", encoding="utf-8")

    lock = {
        **metadata,
        "syncedAt": args.synced_at or datetime.now(timezone.utc).isoformat(),
    }
    lock_path = repo_root / ".github" / "taiwan-terminology-sync" / "upstream-lock.json"
    lock_path.write_text(json.dumps(lock, indent=2) + "\n", encoding="utf-8")
    print(f"Applied {statistics['terms']} Taiwan.md terms from {args.sha}.")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (OSError, ValueError, subprocess.CalledProcessError) as error:
        print(f"error: {error}", file=sys.stderr)
        raise SystemExit(2)
