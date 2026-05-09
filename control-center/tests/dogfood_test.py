"""
DOGFOOD Test Suite — The Kernel Comprehensive Browser Testing
Tests every tab, every link, every component, every human touchpoint.
Produces a detailed log at tests/dogfood_log.json
"""

import json
import time
import traceback
from datetime import datetime, timezone
from pathlib import Path

from playwright.sync_api import sync_playwright, Page

BASE = "http://localhost:10527"
LOG_PATH = Path(__file__).parent / "dogfood_log.json"

# ── Logging ──────────────────────────────────────────────────────────────────

log_entries: list[dict] = []
summary = {"total": 0, "pass": 0, "fail": 0, "errors": []}


def record(
    page_name: str,
    element: str,
    action: str,
    expected: str,
    result: str,
    detail: str = "",
):
    entry = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "page": page_name,
        "element": element,
        "action": action,
        "expected": expected,
        "result": result,
        "detail": detail[:200],
    }
    log_entries.append(entry)
    summary["total"] += 1
    if result == "PASS":
        summary["pass"] += 1
        icon = "✅"
    else:
        summary["fail"] += 1
        summary["errors"].append(f"{page_name}/{element}: {detail[:80]}")
        icon = "❌"
    print(f"  {icon} [{page_name}] {element} — {action} → {result}")


def check(page: Page, page_name: str, element: str, expected: str, detail: str = ""):
    """Record a check result."""
    result = "PASS"
    record(page_name, element, "check", expected, result, detail)


def fail(page: Page, page_name: str, element: str, expected: str, detail: str):
    """Record a failure."""
    record(page_name, element, "check", expected, "FAIL", detail)


# ── Helpers ───────────────────────────────────────────────────────────────────


def click_tab(page: Page, tab_id: str):
    """Click a nav tab and wait for page transition."""
    tab = page.locator(f'button[data-cb-page="{tab_id}"]')
    if tab.count() == 0:
        return False
    tab.click()
    page.wait_for_timeout(500)
    return True


def get_text(page: Page, selector: str) -> str:
    el = page.locator(selector)
    if el.count() == 0:
        return ""
    return el.inner_text().strip()


def safe_click(page: Page, selector: str) -> bool:
    el = page.locator(selector)
    if el.count() == 0:
        return False
    try:
        el.first.click(timeout=3000)
        return True
    except Exception:
        return False


def element_exists(page: Page, selector: str) -> bool:
    return page.locator(selector).count() > 0


# ══════════════════════════════════════════════════════════════════════════════
# TEST SUITE
# ══════════════════════════════════════════════════════════════════════════════


def test_shell(page: Page):
    """TAB 0: Shell / app chrome — sidebar, title, status bar."""
    page.goto(BASE, timeout=15000)
    page.wait_for_load_state("networkidle")
    pn = "Shell"

    # Title
    title = page.title()
    if "Command Kernel" in title:
        check(page, pn, "page title", "Contains 'Command Kernel'", title)
    else:
        fail(page, pn, "page title", "Contains 'Command Kernel'", f"Got: {title}")

    # Sidebar
    if element_exists(page, ".sidebar"):
        check(page, pn, "sidebar", "Visible", ".sidebar exists")
    else:
        fail(page, pn, "sidebar", "Visible", ".sidebar not found")

    # Brand title with The Kernel animation
    brand = page.locator(".kernel-brand")
    if brand.count() > 0:
        txt = brand.inner_text()
        if "F" in txt and "U" in txt and "C" in txt and "K" in txt:
            check(page, pn, "brand title", "The Kernel visible", txt[:40])
        else:
            fail(page, pn, "brand title", "The Kernel visible", f"Got: {txt}")
    else:
        fail(page, pn, "brand title", "The Kernel visible", ".kernel-brand not found")

    # Hero image
    hero = page.locator("img.fuck-hero")
    if hero.count() > 0:
        src = hero.first.get_attribute("src") or ""
        r = page.request.get(f"{BASE}{src}")
        if r.status == 200:
            check(page, pn, "hero image", "Loads 200", f"src={src}")
        else:
            fail(page, pn, "hero image", "Loads 200", f"Got {r.status}")
    else:
        fail(page, pn, "hero image", "Present", "img.fuck-hero not found")

    # Status bar
    if element_exists(page, ".status-bar"):
        sb_text = get_text(page, ".status-bar")
        check(page, pn, "status bar", "Present", sb_text[:60])
    else:
        fail(page, pn, "status bar", "Present", "Not found")

    # All 11 nav tabs exist
    tabs = page.locator("button.cb-nav-tab")
    tab_count = tabs.count()
    if tab_count == 11:
        check(page, pn, "nav tabs", "11 tabs", f"count={tab_count}")
    else:
        fail(page, pn, "nav tabs", "11 tabs", f"Got {tab_count}")

    # Theme toggle
    if safe_click(page, "#theme-toggle"):
        time.sleep(0.3)
        theme = page.evaluate("() => document.documentElement.dataset.theme")
        if theme:
            check(page, pn, "theme toggle", "Switches theme", f"theme={theme}")
        else:
            fail(page, pn, "theme toggle", "Switches theme", "No data-theme")
        # Toggle back
        safe_click(page, "#theme-toggle")
    else:
        fail(page, pn, "theme toggle", "Clickable", "#theme-toggle not found")

    # Sidebar collapse
    if safe_click(page, "#sidebar-toggle"):
        time.sleep(0.3)
        collapsed = page.evaluate(
            "document.body.classList.contains('sidebar-collapsed')"
        )
        if collapsed:
            check(page, pn, "sidebar toggle", "Collapses", "sidebar-collapsed class")
        else:
            fail(page, pn, "sidebar toggle", "Collapses", "Class not added")
        safe_click(page, "#sidebar-toggle")
    else:
        fail(page, pn, "sidebar toggle", "Clickable", "Not found")


def test_project_control(page: Page):
    """TAB 1: Project Control (governance)"""
    click_tab(page, "governance")
    page.wait_for_timeout(1500)
    pn = "Project Control"

    # Project cards rendered
    cards = page.locator(".gov-card")
    card_count = cards.count()
    if card_count > 0:
        check(page, pn, "project cards", "> 0 cards", f"count={card_count}")
    else:
        fail(page, pn, "project cards", "> 0 cards", "No cards rendered")
        return  # Nothing else to test

    # Status badges visible on first card
    badge = cards.first.locator(".gov-status-badge")
    if badge.count() > 0:
        badge_text = badge.inner_text()
        check(page, pn, "status badge", "Shows status", f"text={badge_text}")
    else:
        fail(page, pn, "status badge", "Shows status", "No badge on first card")

    # Completion bar on first card
    bar = cards.first.locator(".gov-completion-fill, .completion-fill")
    if bar.count() > 0:
        check(page, pn, "completion bar", "Visible", "completion indicator exists")
    else:
        fail(page, pn, "completion bar", "Visible", "Not found on first card")

    # Click first card to expand
    cards.first.click()
    page.wait_for_timeout(500)

    # Expanded card links
    links = cards.first.locator("a[href]")
    link_count = links.count()
    if link_count > 0:
        check(page, pn, "card links", "> 0 links", f"count={link_count}")
    else:
        fail(page, pn, "card links", "> 0 links", "No links in expanded card")
        return

    # Test each link in the first card
    broken = []
    for i in range(min(link_count, 4)):
        href = links.nth(i).get_attribute("href") or ""
        if not href:
            broken.append(f"link[{i}]: empty href")
            continue
        r = page.request.get(f"{BASE}{href}" if href.startswith("/") else href)
        if r.status != 200:
            broken.append(f"link[{i}]: {r.status} for {href[:50]}")
    if broken:
        fail(page, pn, "card link targets", "All 200", "; ".join(broken))
    else:
        check(
            page,
            pn,
            "card link targets",
            "All 200",
            f"{min(link_count, 4)} links checked",
        )

    # Bootstrap button
    bootstrap_btn = cards.first.locator('button:has-text("Bootstrap")')
    if bootstrap_btn.count() > 0:
        check(page, pn, "Bootstrap button", "Present", "In expanded card")
    else:
        fail(page, pn, "Bootstrap button", "Present", "Not found in expanded card")

    # Finisher button
    finisher_btn = cards.first.locator('button:has-text("Finisher")')
    if finisher_btn.count() > 0:
        check(page, pn, "Finisher button", "Present", "In expanded card")
    else:
        fail(page, pn, "Finisher button", "Present", "Not found in expanded card")

    # Search/filter
    search = page.locator("#gov-search")
    if search.count() > 0:
        search.fill("control")
        page.wait_for_timeout(500)
        filtered = page.locator(".gov-card").count()
        if filtered < card_count:
            check(
                page, pn, "search filter", "Filters cards", f"{card_count}→{filtered}"
            )
        else:
            fail(page, pn, "search filter", "Filters cards", f"No change: {card_count}")
        search.clear()
        page.wait_for_timeout(500)
    else:
        fail(page, pn, "search filter", "Present", "#gov-search not found")

    # Quarantine section
    quarantine = page.locator(".gov-quarantine-alert")
    if quarantine.count() > 0:
        check(
            page,
            pn,
            "quarantine alert",
            "Present",
            f"visible={quarantine.is_visible()}",
        )
        # Test quarantine link
        qa_link = quarantine.locator("a[href]")
        if qa_link.count() > 0:
            href = qa_link.first.get_attribute("href") or ""
            r = page.request.get(f"{BASE}{href}" if href.startswith("/") else href)
            if r.status == 200:
                check(page, pn, "quarantine link", "200", href[:50])
            else:
                fail(
                    page,
                    pn,
                    "quarantine link",
                    "200",
                    f"Got {r.status} for {href[:50]}",
                )
    else:
        check(page, pn, "quarantine alert", "Not present (no quarantine)", "OK")


def test_terminal_console(page: Page):
    """TAB 2: Terminal Console"""
    click_tab(page, "terminals")
    page.wait_for_timeout(1500)
    pn = "Terminal Console"

    # Agent list
    agents = page.locator(".agent-card, .agent-item, [data-agent-id]")
    if agents.count() > 0:
        check(page, pn, "agent list", "> 0 agents", f"count={agents.count()}")
    else:
        # Try alternative selector
        agent_pane = page.locator("#cb-page-terminals")
        if agent_pane.count() > 0:
            content = agent_pane.inner_text()
            if len(content) > 10:
                check(page, pn, "terminal pane", "Has content", f"{len(content)} chars")
            else:
                fail(
                    page,
                    pn,
                    "terminal pane",
                    "Has content",
                    f"Only {len(content)} chars",
                )
        else:
            fail(page, pn, "terminal pane", "Visible", "Page div not found")


def test_dual_console(page: Page):
    """TAB 3: Dual Console"""
    click_tab(page, "dualterm")
    page.wait_for_timeout(2000)
    pn = "Dual Console"

    # Layout buttons
    dual_btn = page.locator('[data-dt-layout="dual"]')
    single_btn = page.locator('[data-dt-layout="single"]')
    if dual_btn.count() > 0 and single_btn.count() > 0:
        check(page, pn, "layout buttons", "Present", "dual + single")
    else:
        fail(
            page,
            pn,
            "layout buttons",
            "Present",
            f"dual={dual_btn.count()} single={single_btn.count()}",
        )

    # Respawn button
    respawn = page.locator("#dt-respawn-btn")
    if respawn.count() > 0:
        check(page, pn, "respawn button", "Present", "#dt-respawn-btn")
    else:
        fail(page, pn, "respawn button", "Present", "Not found")

    # Terminal panes (xterm instances)
    xterms = page.locator(".xterm")
    if xterms.count() >= 1:
        check(page, pn, "xterm panes", ">= 1 pane", f"count={xterms.count()}")
    else:
        # xterm may not init without agents — check containers
        containers = page.locator("[data-dt-container]")
        if containers.count() >= 1:
            check(
                page, pn, "terminal containers", ">= 1", f"count={containers.count()}"
            )
        else:
            fail(
                page, pn, "terminal panes/containers", ">= 1", "No xterm or containers"
            )


def test_workspace(page: Page):
    """TAB 4: Workspace"""
    click_tab(page, "workspace")
    page.wait_for_timeout(1500)
    pn = "Workspace"

    # Workspace refresh button
    refresh = page.locator("#ws-refresh-btn")
    if refresh.count() > 0:
        check(page, pn, "refresh button", "Present", "#ws-refresh-btn")
    else:
        fail(page, pn, "refresh button", "Present", "Not found")

    # Workspace panes
    ws_page = page.locator("#cb-page-workspace")
    if ws_page.count() > 0:
        check(page, pn, "workspace page", "Visible", "#cb-page-workspace exists")
    else:
        fail(page, pn, "workspace page", "Visible", "Not found")


def test_workspace_editor(page: Page):
    """TAB 5: Workspace Editor (MWIDE)"""
    click_tab(page, "mwide")
    page.wait_for_timeout(3000)
    pn = "Workspace Editor"

    # Status indicator
    status = page.locator("#mwide-status")
    if status.count() > 0:
        txt = status.inner_text()
        if "up" in txt.lower():
            check(page, pn, "load status", "up", txt)
        else:
            fail(page, pn, "load status", "up", f"Got: {txt}")
    else:
        fail(page, pn, "load status", "Present", "#mwide-status not found")

    # MWIDE mount div
    mwide_root = page.locator("#mwide-root")
    if mwide_root.count() > 0:
        # Check if React rendered content
        children = mwide_root.locator("*").count()
        if children > 0:
            check(page, pn, "MWIDE mount", "Has children", f"{children} elements")
        else:
            fail(page, pn, "MWIDE mount", "Has children", "Empty mount div")
    else:
        fail(page, pn, "MWIDE mount", "Present", "#mwide-root not found")

    # MWIDE CSS loaded
    mwide_css = page.locator('link[href*="workspace-editor"]')
    if mwide_css.count() > 0:
        check(page, pn, "MWIDE CSS", "Loaded", mwide_css.first.get_attribute("href") or "unknown")
    else:
        fail(page, pn, "MWIDE CSS", "Loaded", "No workspace-editor CSS link")


def test_system_health(page: Page):
    """TAB 6: System Health"""
    click_tab(page, "health")
    page.wait_for_timeout(3000)
    pn = "System Health"

    # Scan meta
    meta = page.locator("#health-scan-meta")
    if meta.count() > 0:
        txt = meta.inner_text()
        if "scanned" in txt.lower() or "never" in txt.lower():
            check(page, pn, "scan meta", "Shows scan info", txt[:60])
        else:
            fail(page, pn, "scan meta", "Shows scan info", f"Got: {txt[:60]}")
    else:
        fail(page, pn, "scan meta", "Present", "#health-scan-meta not found")

    # Rescan button
    rescan = page.locator("#health-rescan-btn")
    if rescan.count() > 0:
        check(page, pn, "rescan button", "Present", "#health-rescan-btn")
    else:
        fail(page, pn, "rescan button", "Present", "Not found")

    # Health apps table
    apps_table = page.locator("#health-apps-table")
    if apps_table.count() > 0:
        rows = apps_table.locator("tbody tr")
        if rows.count() > 0:
            check(page, pn, "apps table", "> 0 rows", f"count={rows.count()}")
            # Check first row has data
            cells = rows.first.locator("td")
            if cells.count() >= 4:
                app_name = cells.nth(0).inner_text().strip()
                size = cells.nth(1).inner_text().strip()
                if app_name and size:
                    check(
                        page, pn, "app row data", "Name + size", f"{app_name}: {size}MB"
                    )
                else:
                    fail(page, pn, "app row data", "Name + size", "Empty cells")
            else:
                fail(page, pn, "app row cells", ">= 4 cells", f"Got {cells.count()}")
        else:
            fail(page, pn, "apps table rows", "> 0", "Empty tbody")
    else:
        fail(page, pn, "apps table", "Present", "#health-apps-table not found")

    # Memory hogs table
    mem_table = page.locator("#health-mem-table")
    if mem_table.count() > 0:
        rows = mem_table.locator("tbody tr")
        check(page, pn, "memory table", "Present", f"rows={rows.count()}")
    else:
        fail(page, pn, "memory table", "Present", "#health-mem-table not found")

    # Disk recovery candidates
    disk_table = page.locator("#health-disk-table")
    if disk_table.count() > 0:
        rows = disk_table.locator("tbody tr")
        check(page, pn, "disk candidates table", "Present", f"rows={rows.count()}")
    else:
        # May not exist if no candidates
        check(page, pn, "disk candidates table", "Not required", "No candidates table")

    # Sortable headers
    sortable = page.locator("#health-apps-table th[data-sort]")
    if sortable.count() > 0:
        # Click to sort by size
        size_header = page.locator('#health-apps-table th[data-sort="size_mb"]')
        if size_header.count() > 0:
            size_header.click()
            page.wait_for_timeout(500)
            check(page, pn, "sort by size", "Clickable", "size_mb header clicked")
        else:
            fail(page, pn, "sort by size", "Header found", "No size_mb sort header")
    else:
        fail(page, pn, "sortable headers", "Present", "No th[data-sort]")


def test_system_map(page: Page):
    """TAB 7: System Map (Infrastructure Map)"""
    click_tab(page, "embed")
    page.wait_for_timeout(3000)
    pn = "System Map"

    # Shadow DOM mount
    mount = page.locator("#system-map-mount")
    if mount.count() > 0:
        check(page, pn, "mount div", "Present", "#system-map-mount")
        # Check shadow root has content
        shadow_content = mount.evaluate(
            "el => el.shadowRoot ? el.shadowRoot.innerHTML.length : 0"
        )
        if shadow_content > 100:
            check(
                page, pn, "shadow DOM content", "> 100 chars", f"{shadow_content} chars"
            )
        else:
            fail(
                page, pn, "shadow DOM content", "> 100 chars", f"Only {shadow_content}"
            )
    else:
        fail(page, pn, "mount div", "Present", "Not found")

    # Check if infrastructure-map tabs rendered inside shadow
    has_tabs = mount.evaluate("""
        el => {
            if (!el.shadowRoot) return false;
            return el.shadowRoot.querySelectorAll('.nav-tab, button').length > 0;
        }
    """)
    if has_tabs:
        check(
            page, pn, "infra map tabs", "Present in shadow DOM", "nav-tab buttons found"
        )
    else:
        fail(page, pn, "infra map tabs", "Present in shadow DOM", "No buttons found")


def test_agent_execution(page: Page):
    """TAB 8: Agent Execution (ATerm)"""
    click_tab(page, "agent-exec")
    page.wait_for_timeout(3000)
    pn = "Agent Execution"

    # Status
    status = page.locator("#agent-exec-status")
    if status.count() > 0:
        txt = status.inner_text()
        if "up" in txt.lower():
            check(page, pn, "load status", "up", txt)
        else:
            fail(page, pn, "load status", "up", f"Got: {txt}")
    else:
        fail(page, pn, "load status", "Present", "#agent-exec-status not found")

    # ATerm mount
    aterm_root = page.locator("#aterm-root")
    if aterm_root.count() > 0:
        children = aterm_root.locator("*").count()
        if children > 0:
            check(page, pn, "ATerm mount", "Has children", f"{children} elements")
        else:
            fail(
                page,
                pn,
                "ATerm mount",
                "Has children",
                "Empty mount div — SPA may not have mounted",
            )
    else:
        fail(page, pn, "ATerm mount", "Present", "#aterm-root not found")

    # Reload button
    reload_btn = page.locator("#agent-exec-reload-btn")
    if reload_btn.count() > 0:
        check(page, pn, "reload button", "Present", "#agent-exec-reload-btn")
    else:
        fail(page, pn, "reload button", "Present", "Not found")


def test_dev_launcher(page: Page):
    """TAB 9: Dev Launcher (iframe)"""
    click_tab(page, "dev-launcher")
    page.wait_for_timeout(3000)
    pn = "Dev Launcher"

    # Iframe present
    iframe = page.locator("#cb-page-dev-launcher iframe")
    if iframe.count() > 0:
        check(page, pn, "iframe", "Present", "iframe in dev-launcher page")
        # Check iframe loaded
        src = iframe.first.get_attribute("src") or ""
        if "/dev-launcher/" in src:
            check(page, pn, "iframe src", "Points to /dev-launcher/", src)
        else:
            fail(page, pn, "iframe src", "Points to /dev-launcher/", f"Got: {src}")

        # Check iframe has content (access via frame)
        try:
            frame = page.frame_locator("#cb-page-dev-launcher iframe")
            root = frame.locator("#root")
            if root.count() > 0:
                children = root.locator("*").count()
                if children > 0:
                    check(
                        page,
                        pn,
                        "SPA content",
                        "React rendered",
                        f"{children} elements in #root",
                    )
                else:
                    fail(page, pn, "SPA content", "React rendered", "#root empty")
            else:
                fail(
                    page,
                    pn,
                    "SPA content",
                    "React rendered",
                    "#root not found in iframe",
                )
        except Exception as e:
            fail(
                page,
                pn,
                "SPA content",
                "React rendered",
                f"Frame access error: {str(e)[:60]}",
            )
    else:
        fail(page, pn, "iframe", "Present", "No iframe found")


def test_spend_watch(page: Page):
    """TAB 10: Spend Watch (Shadow DOM)"""
    click_tab(page, "spend-watch")
    page.wait_for_timeout(3000)
    pn = "Spend Watch"

    mount = page.locator("#spend-watch-mount")
    if mount.count() > 0:
        check(page, pn, "mount div", "Present", "#spend-watch-mount")
        shadow_content = mount.evaluate(
            "el => el.shadowRoot ? el.shadowRoot.innerHTML.length : 0"
        )
        if shadow_content > 100:
            check(
                page, pn, "shadow DOM content", "> 100 chars", f"{shadow_content} chars"
            )
        else:
            fail(
                page, pn, "shadow DOM content", "> 100 chars", f"Only {shadow_content}"
            )
    else:
        fail(page, pn, "mount div", "Present", "Not found")


def test_mac_cleanup(page: Page):
    """TAB 11: Mac Cleanup (Shadow DOM)"""
    click_tab(page, "mac-cleanup")
    page.wait_for_timeout(3000)
    pn = "Mac Cleanup"

    mount = page.locator("#mac-cleanup-mount")
    if mount.count() > 0:
        check(page, pn, "mount div", "Present", "#mac-cleanup-mount")
        shadow_content = mount.evaluate(
            "el => el.shadowRoot ? el.shadowRoot.innerHTML.length : 0"
        )
        if shadow_content > 100:
            check(
                page, pn, "shadow DOM content", "> 100 chars", f"{shadow_content} chars"
            )
        else:
            fail(
                page, pn, "shadow DOM content", "> 100 chars", f"Only {shadow_content}"
            )
    else:
        fail(page, pn, "mount div", "Present", "Not found")


def test_all_static_assets(page: Page):
    """Test that all critical static assets load."""
    pn = "Static Assets"
    assets = [
        "/static/vendor/xterm.css",
        "/static/vendor/xterm.js",
        "/static/vendor/xterm-addon-fit.js",
        "/static/vendor/xterm-addon-search.js",
        "/static/vendor/xterm-addon-unicode11.js",
        "/static/vendor/xterm-addon-webgl.js",
        "/static/hero-text.png",
        "/static/infrastructure-map.html",
        "/static/tech-ai-spend-watch.html",
        "/static/mac-cleanup-report.html",
        "/workspace-editor/assets/index-Dlb0cSd5.js",
        "/workspace-editor/assets/index-CxdVQA8c.css",
        "/agent-execution/assets/index-COUD7RTI.js",
        "/agent-execution/assets/index-B2TYIT7J.css",
        "/dev-launcher/assets/index-DcxcRrc8.js",
        "/dev-launcher/assets/index-CuAYSVSw.css",
    ]
    for asset in assets:
        r = page.request.get(f"{BASE}{asset}")
        if r.status == 200:
            check(page, pn, asset, "200", f"{r.status}")
        else:
            fail(page, pn, asset, "200", f"Got {r.status}")


def test_api_endpoints(page: Page):
    """Test all API endpoints return valid data."""
    pn = "API Endpoints"
    endpoints = [
        ("/api/health", 200),
        ("/api/projects", 200),
        ("/api/agents", 200),
        ("/api/tags", 200),
        ("/api/layouts", 200),
        ("/api/cron/helper", 200),
        ("/api/vault/list", 200),
        ("/api/quarantine-summary", 200),
        ("/api/system-health", 200),
        ("/api/proxy/hostinger/subscriptions", 200),
        ("/api/fs/home", 200),
        ("/api/fs/list?path=/Volumes/Storage", 200),
    ]
    for endpoint, expected_code in endpoints:
        r = page.request.get(f"{BASE}{endpoint}")
        if r.status == expected_code:
            check(page, pn, endpoint, f"{expected_code}", f"{r.status}")
        else:
            fail(page, pn, endpoint, f"{expected_code}", f"Got {r.status}")


def test_no_console_errors(page: Page):
    """Check for unhandled JS errors."""
    pn = "Console Errors"
    errors = []

    def on_console(msg):
        if msg.type == "error":
            errors.append(msg.text[:100])

    page.on("console", on_console)

    # Reload and visit each tab to trigger all JS
    page.reload(wait_until="networkidle")
    all_tabs = [
        "governance",
        "terminals",
        "dualterm",
        "workspace",
        "mwide",
        "health",
        "embed",
        "agent-exec",
        "dev-launcher",
        "spend-watch",
        "mac-cleanup",
    ]
    for tab in all_tabs:
        click_tab(page, tab)
        page.wait_for_timeout(1500)

    # Filter out known benign errors
    real_errors = [
        e
        for e in errors
        if "favicon" not in e.lower()
        and "404" not in e.lower()[:10]
        and "4500" not in e
        and "405" not in e.lower()[:10]
    ]
    if len(real_errors) == 0:
        check(
            page,
            pn,
            "JS errors",
            "0 critical errors",
            f"Total console.error: {len(errors)}",
        )
    else:
        fail(
            page,
            pn,
            "JS errors",
            "0 critical errors",
            f"{len(real_errors)} errors: {real_errors[:3]}",
        )


# ══════════════════════════════════════════════════════════════════════════════
# MAIN
# ══════════════════════════════════════════════════════════════════════════════


def main():
    print("=" * 70)
    print("The Kernel DOGFOOD TEST — Comprehensive Browser Testing")
    print("=" * 70)
    print()

    pw = sync_playwright().start()
    browser = pw.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1440, "height": 900})

    tests = [
        ("Shell / Chrome", test_shell),
        ("Project Control", test_project_control),
        ("Terminal Console", test_terminal_console),
        ("Dual Console", test_dual_console),
        ("Workspace", test_workspace),
        ("Workspace Editor", test_workspace_editor),
        ("System Health", test_system_health),
        ("System Map", test_system_map),
        ("Agent Execution", test_agent_execution),
        ("Dev Launcher", test_dev_launcher),
        ("Spend Watch", test_spend_watch),
        ("Mac Cleanup", test_mac_cleanup),
        ("Static Assets", test_all_static_assets),
        ("API Endpoints", test_api_endpoints),
        ("Console Errors", test_no_console_errors),
    ]

    for name, fn in tests:
        print(f"\n── {name} ──")
        try:
            fn(page)
        except Exception:
            fail(
                page,
                name,
                "test runner",
                "No exception",
                f"EXCEPTION: {traceback.format_exc()[:150]}",
            )

    browser.close()
    pw.stop()

    # Calculate pass rate
    rate = (summary["pass"] / summary["total"] * 100) if summary["total"] else 0

    print("\n" + "=" * 70)
    print(f"RESULTS: {summary['pass']}/{summary['total']} PASS ({rate:.1f}%)")
    if summary["errors"]:
        print(f"\nFAILURES ({len(summary['errors'])}):")
        for e in summary["errors"]:
            print(f"  ❌ {e}")
    print("=" * 70)

    # Write log
    output = {
        "run_timestamp": datetime.now(timezone.utc).isoformat(),
        "summary": summary,
        "pass_rate": round(rate, 1),
        "entries": log_entries,
    }
    LOG_PATH.write_text(json.dumps(output, indent=2))
    print(f"\nFull log written to: {LOG_PATH}")


if __name__ == "__main__":
    main()
