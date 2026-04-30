#!/usr/bin/env bash
# refresh-registry.sh — Governance data generator for the HTML dashboard
# Reads live filesystem state, never writes to .supercache/ or project directories.
# Output: dashboard-data.json

set -euo pipefail

CANONICAL_VERSION=$(cat /Volumes/SanDisk1Tb/.supercache/VERSION 2>/dev/null || echo "UNKNOWN")
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
OUTFILE="$(cd "$(dirname "$0")/.." && pwd)/dashboard-data.json"
DRIVES=("/Volumes/SanDisk1Tb" "/Volumes/Storage")
TMPFILE=$(mktemp)

echo '{"generated":"'"$TIMESTAMP"'","canonical_version":"'"$CANONICAL_VERSION"'","projects":[' > "$TMPFILE"

first=true

categorize() {
  local dir="$1"
  local name="$2"

  local has_stamp=0 stamp_ver="" has_floyd=0 floyd_ver="" floyd_gov=""
  local has_claude=0 has_ssot=0 has_readme=0 has_pkgjson=0 has_gomod=0 has_py=0
  local report_json=""

  [ -f "$dir/.floyd/.supercache_version" ] 2>/dev/null && { has_stamp=1; stamp_ver=$(cat "$dir/.floyd/.supercache_version" 2>/dev/null); }
  [ -f "$dir/FLOYD.md" ] && has_floyd=1
  [ -f "$dir/CLAUDE.md" ] && has_claude=1
  [ -d "$dir/SSOT" ] && has_ssot=1
  [ -f "$dir/README.md" ] && has_readme=1
  [ -f "$dir/package.json" ] && has_pkgjson=1
  [ -f "$dir/go.mod" ] && has_gomod=1
  [ -f "$dir/pyproject.toml" ] || [ -f "$dir/requirements.txt" ] || [ -f "$dir/setup.py" ] && has_py=1
  [ -f "$dir/SSOT/repository_report.json" ] && report_json=$(cat "$dir/SSOT/repository_report.json" 2>/dev/null)

  if [ "$has_floyd" -eq 1 ]; then
    floyd_ver=$(grep -m1 '^\*\*Version:\*\*' "$dir/FLOYD.md" 2>/dev/null | sed 's/.*Version:\*\* *//' | xargs)
    floyd_gov=$(grep -m1 '^\*\*Governance:\*\*' "$dir/FLOYD.md" 2>/dev/null | sed 's/.*Governance:\*\* *//' | xargs)
  fi

  # Categorize
  local status="UNGOVERNED"
  if [ "$has_stamp" -eq 1 ]; then
    if [ "$stamp_ver" = "$CANONICAL_VERSION" ]; then
      status="GOVERNED"
    else
      status="DRIFTED"
    fi
  elif [ "$has_floyd" -eq 1 ] || [ "$has_claude" -eq 1 ]; then
    status="CANDIDATE"
  elif [ "$has_pkgjson" -eq 1 ] || [ "$has_gomod" -eq 1 ]; then
    status="CANDIDATE"
  elif [ "$has_readme" -eq 1 ] && [ "$has_ssot" -eq 1 ]; then
    status="CANDIDATE"
  else
    # Heuristic: if it has NO code artifacts and NO project markers, it's non-project
    local has_any_code=0
    [ "$has_pkgjson" -eq 1 ] && has_any_code=1
    [ "$has_gomod" -eq 1 ] && has_any_code=1
    [ "$has_py" -eq 1 ] && has_any_code=1
    [ "$has_floyd" -eq 1 ] && has_any_code=1
    [ "$has_claude" -eq 1 ] && has_any_code=1
    if [ "$has_any_code" -eq 0 ]; then
      # Check for known non-project patterns
      case "$name" in
        Applications|Backups|Library|tmp|node_modules|"Photos Library"*|"Music Library"*|*.photoslibrary|*.musiclibrary|Media.localized)
          status="NON-PROJECT" ;;
        HFModels|Ollama|InferenceCache|"exo-models"|GEMMA_LEGACY|models|cache|AGENT_CACHE)
          status="NON-PROJECT" ;;
        Reports|logs|CHATLOGS|ScreenShots|"Calls Images"|LAIAS_AGENT_OUTPUT|test-results|state|locks)
          status="NON-PROJECT" ;;
        reference|docs|archive|skillsdump|skills|"Prompt Library"|"Knowledge Bases"|"Research")
          status="NON-PROJECT" ;;
        *)
          status="UNGOVERNED" ;;
      esac
    fi
  fi

  # Build links
  local links_json="{}"
  [ -f "$dir/FLOYD.md" ] && links_json=$(echo "$links_json" | python3 -c "import json,sys; d=json.load(sys.stdin); d['FLOYD.md']='file://${dir}/FLOYD.md'; print(json.dumps(d))" 2>/dev/null || echo "$links_json")
  [ -f "$dir/CLAUDE.md" ] && links_json=$(echo "$links_json" | python3 -c "import json,sys; d=json.load(sys.stdin); d['CLAUDE.md']='file://${dir}/CLAUDE.md'; print(json.dumps(d))" 2>/dev/null || echo "$links_json")
  [ -d "$dir/SSOT" ] && links_json=$(echo "$links_json" | python3 -c "import json,sys; d=json.load(sys.stdin); d['SSOT/']='file://${dir}/SSOT'; print(json.dumps(d))" 2>/dev/null || echo "$links_json")
  [ -f "$dir/SSOT/repository_report.json" ] && links_json=$(echo "$links_json" | python3 -c "import json,sys; d=json.load(sys.stdin); d['Report']='file://${dir}/SSOT/repository_report.json'; print(json.dumps(d))" 2>/dev/null || echo "$links_json")

  # Build JSON entry
  local entry
  entry=$(python3 -c "
import json, sys
entry = {
    'name': '''$name''',
    'path': '''$dir''',
    'drive': '''$(dirname "$dir")''',
    'status': '$status',
    'stamp_version': '''$stamp_ver''',
    'floyd_version': '''$floyd_ver''',
    'floyd_governance': '''$floyd_gov''',
    'has_stamp': bool($has_stamp),
    'has_floyd': bool($has_floyd),
    'has_claude': bool($has_claude),
    'has_ssot': bool($has_ssot),
    'has_readme': bool($has_readme),
    'links': json.loads('''$links_json''')
}
# Embed report if available
try:
    report = json.loads(open('$dir/SSOT/repository_report.json').read()) if $has_ssot and '$report_json' != '' else {}
    entry['report'] = report
except:
    entry['report'] = {}

# Check for active finisher swarm
try:
    if $has_ssot:
        import os
        rr = os.path.join('$dir', 'SSOT', '05-Release-Readiness.md')
        if os.path.exists(rr):
            gates = {}
            for line in open(rr):
                line = line.strip()
                for g in ['Build/Run', 'Primary Journey', 'Automated Tests', 'E2E Tests', 'Multi-minute Sim', 'Security Hygiene', 'Demo']:
                    if line.startswith('- [' + g + ']') or line.startswith('| ' + g):
                        if 'PASS' in line.upper(): gates[g] = 'PASS'
                        elif 'FAIL' in line.upper(): gates[g] = 'FAIL'
                        elif 'UNKNOWN' in line.upper(): gates[g] = 'UNKNOWN'
                        elif 'WAIVED' in line.upper(): gates[g] = 'WAIVED'
            if gates: entry['gates'] = gates
except:
    pass

print(json.dumps(entry))
" 2>/dev/null)

  if [ -n "$entry" ]; then
    if $first; then first=false; else echo ',' >> "$TMPFILE"; fi
    printf '%s' "$entry" >> "$TMPFILE"
  fi
}

# Scan each drive
for drive in "${DRIVES[@]}"; do
  [ -d "$drive" ] || continue
  for d in "$drive"/*/; do
    d="${d%/}"
    name=$(basename "$d")
    # Skip hidden directories
    [[ "$name" == .* ]] && continue
    # Skip empty directories
    [ -n "$(ls -A "$d" 2>/dev/null)" ] || continue
    categorize "$d" "$name"
  done
done

echo ']}' >> "$TMPFILE"

# Validate JSON
if python3 -c "import json; json.load(open('$TMPFILE'))" 2>/dev/null; then
  mv "$TMPFILE" "$OUTFILE"
  echo "[ok] dashboard-data.json written — $(python3 -c "import json; print(len(json.load(open('$OUTFILE'))['projects']))") projects indexed"
else
  echo "[err] JSON validation failed — output at $TMPFILE"
  exit 1
fi
