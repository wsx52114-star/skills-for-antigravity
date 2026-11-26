#!/usr/bin/env bash
set -euo pipefail

target="$(cd "$(dirname "$0")" && pwd)"
config="${1:-$HOME/.gemini/config/plugins.json}"
mkdir -p "$(dirname "$config")"

if command -v python3 >/dev/null 2>&1; then
  python3 - "$config" "$target" <<'PY'
import json, pathlib, sys
f, t = pathlib.Path(sys.argv[1]), sys.argv[2].rstrip("/")
raw = f.read_text("utf-8").strip() if f.exists() else ""
d = json.loads(raw) if raw else {}
e = d["entries"] = d.get("entries") or []
if not any(isinstance(x, dict) and str(x.get("path", "")).replace("\\", "/").rstrip("/") == t for x in e):
    e.append({"path": t})
f.write_text(json.dumps(d, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
PY
elif command -v node >/dev/null 2>&1; then
  node - "$config" "$target" <<'JS'
const fs = require("node:fs");
const [config, target] = process.argv.slice(2);
const norm = (p) => String(p ?? "").replace(/\\/g, "/").replace(/\/+$/, "");
const raw = fs.existsSync(config) ? fs.readFileSync(config, "utf8").trim() : "";
const doc = raw ? JSON.parse(raw) : {};
const entries = Array.isArray(doc.entries) ? doc.entries : [];
if (!entries.some((x) => x && typeof x === "object" && norm(x.path) === norm(target))) {
  entries.push({ path: norm(target) });
}
doc.entries = entries;
fs.writeFileSync(config, `${JSON.stringify(doc, null, 2)}\n`, "utf8");
JS
elif [ ! -s "$config" ]; then
  escaped="${target//\\/\\\\}"
  escaped="${escaped//\"/\\\"}"
  printf '{\n  "entries": [\n    {\n      "path": "%s"\n    }\n  ]\n}\n' "$escaped" > "$config"
else
  echo "error: $config already exists; install python3 or node to merge automatically, or add {\"path\": \"$target\"} manually." >&2
  exit 1
fi

echo "Mounted $target -> $config"
