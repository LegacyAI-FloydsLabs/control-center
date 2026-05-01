# MWIDE Port Migration: 10001 → 10602

**Authority:** plans/controlboard.md Step 9
**Reason:** Port 10001 collides with `legacy-ai-delivery-architecture-package-next-portal` per the global port registry. ROADMAP.md §12.3 reserves **10602** for MWIDE.
**Scope:** Three writes — all live OUTSIDE the Legacy Agents repo, so Douglas owns the apply.

This file documents the diff. Run the commands below from a shell that has write access to MWIDE and to `/Volumes/SanDisk1Tb/SSOT/`.

---

## 1. server.ts default port

**File:** `/Volumes/SanDisk1Tb/MWIDE/mobile-web-IDE/server.ts`
**Line:** 26

```diff
-  const PORT = Number(process.env.PORT || 10001);
+  const PORT = Number(process.env.PORT || 10602);
```

```bash
cd /Volumes/SanDisk1Tb/MWIDE/mobile-web-IDE
sed -i.bak 's/process.env.PORT || 10001/process.env.PORT || 10602/' server.ts
diff server.ts.bak server.ts && rm server.ts.bak
```

## 2. FLOYD.md placeholder fill

**File:** `/Volumes/SanDisk1Tb/MWIDE/mobile-web-IDE/FLOYD.md`
**Replacement:** every `{{PORT}}` token → `10602` (9 occurrences)

```bash
cd /Volumes/SanDisk1Tb/MWIDE/mobile-web-IDE
sed -i.bak 's/{{PORT}}/10602/g' FLOYD.md
grep -c '{{PORT}}' FLOYD.md   # must print 0
diff FLOYD.md.bak FLOYD.md | head -40
rm FLOYD.md.bak
```

## 3. Port-registry claim

**File:** `/Volumes/SanDisk1Tb/SSOT/port-registry.json` (governed; Douglas-only write)

Add a `mobile-web-ide` entry on port 10602. Use jq's `--argjson` so the port is stored as a number, not a string:

```bash
F=/Volumes/SanDisk1Tb/SSOT/port-registry.json
cp "$F" "$F.bak.$(date +%Y%m%d-%H%M)"
jq --argjson port 10602 '.allocations += [{
  "service": "mobile-web-ide",
  "project": "MWIDE",
  "port": $port,
  "claimed_at": "2026-05-01",
  "owner": "Douglas Talley",
  "scope": "single-user localhost",
  "notes": "ControlBoard MWIDE tab embeds this URL via iframe (Step 9, controlboard plan)"
}]' "$F" > "$F.tmp" && mv "$F.tmp" "$F"

# Verify
jq '.allocations[] | select(.port == 10602)' "$F"
```

If the registry uses a different shape (a top-level dict keyed by service name instead of an `allocations` array), ask first — do not blind-edit. Inspect with:

```bash
jq 'keys' /Volumes/SanDisk1Tb/SSOT/port-registry.json
```

## 4. Confirm

After steps 1–3:

```bash
# MWIDE picks up the new default
cd /Volumes/SanDisk1Tb/MWIDE/mobile-web-IDE
grep "10602" server.ts FLOYD.md
grep -c "{{PORT}}" FLOYD.md   # 0

# Registry knows about it
jq '.allocations[] | select(.port == 10602) // .[\"mobile-web-ide\"] // empty' /Volumes/SanDisk1Tb/SSOT/port-registry.json

# Start MWIDE
cd /Volumes/SanDisk1Tb/MWIDE/mobile-web-IDE && pnpm dev   # or whatever the start command is

# In another terminal, smoke-test the ControlBoard iframe
open http://localhost:10527/   # click MWIDE tab; expect iframe to load
```

## Rollback

```bash
# server.ts
cd /Volumes/SanDisk1Tb/MWIDE/mobile-web-IDE
git checkout server.ts FLOYD.md   # if MWIDE is its own git repo
# port-registry
F=/Volumes/SanDisk1Tb/SSOT/port-registry.json
ls "$F".bak.* | tail -1 | xargs -I {} cp {} "$F"
```
