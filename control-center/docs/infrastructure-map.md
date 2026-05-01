# Infrastructure Cartography Embed

**Authority:** `plans/controlboard.md` Step 13

## What it is

The ControlBoard's **Embed** tab renders the Legacy AI infrastructure map — a single-file dark-themed diagram covering IONOS, Vercel, Hostinger, Railway, Supabase, DigitalOcean, GCP, GitHub, and the local AI stack. The map is static (no live backend) and refreshed by re-vendoring the source bundle.

## Source

Authoritative source HTML is bundled with the broader architecture documentation set at:

```
/Users/douglastalley/Downloads/Legacy_AI_Delivery_Architecture_Package/network-map/infrastructure-map.html
```

It is generated externally; this project is a *consumer*, not the editor.

## Vendoring policy

The map is **vendored, not linked** — `control-center/static/infrastructure-map.html` is an exact copy of the source. We do not point an iframe at the Downloads path because:

1. Browser file:// scheme has CORS friction inside iframes
2. The Downloads file is not under version control
3. Vendoring pins the diagram to the commit that ships it

When the source diagram changes, run:

```bash
bash control-center/scripts/refresh-infrastructure-map.sh
git add control-center/static/infrastructure-map.html
git commit -m "chore: re-vendor infrastructure-map.html"
```

The script also accepts an `INFRA_MAP_SOURCE` env var if the bundle moves.

## Serving

`server.py` already mounts `static/` at `/static/`. The map is served at:

```
http://localhost:10527/static/infrastructure-map.html
```

The Embed tab in `index.html` renders this URL inside an iframe filling the page container.

## External assets

The map loads Google Fonts (IBM Plex Mono/Sans, Fraunces) over CDN. All other styles and images are inline in the single HTML file. No local file references are used, so the vendored copy works standalone.
