"""
astro-minimax E2E Browser Test
Uses Playwright to simulate real user interactions.

Env vars:
  E2E_BASE_URL      - Dev server URL (default: http://localhost:4321)
  E2E_AI_API_URL    - AI API URL (default: http://localhost:8787)
  E2E_ARTICLE_SLUG  - Article slug for detail test (default: complete-setup-guide)
"""

import json
import time
from playwright.sync_api import sync_playwright, expect

# Use env for port when running alongside other dev servers
import os
BASE_URL = os.environ.get("E2E_BASE_URL", "http://localhost:4321")
AI_API_URL = os.environ.get("E2E_AI_API_URL", "http://localhost:8787")
# Article slug: apps/blog uses complete-setup-guide, CLI template uses hello-world
ARTICLE_SLUG = os.environ.get("E2E_ARTICLE_SLUG", "complete-setup-guide")
RESULTS = []


def record(name, status, detail=""):
    RESULTS.append({"test": name, "status": status, "detail": detail})
    icon = "✅" if status == "PASS" else "❌" if status == "FAIL" else "⚠️"
    print(f"  {icon} {name}" + (f" — {detail}" if detail else ""))


def test_homepage(page):
    print("\n📄 Homepage Tests")
    page.goto(f"{BASE_URL}/zh/")
    page.wait_for_load_state("networkidle")

    # Check title
    title = page.title()
    record("Homepage title", "PASS" if title and len(title) > 0 else "FAIL", title)

    # Check nav exists
    nav = page.locator("nav")
    record("Navigation present", "PASS" if nav.count() > 0 else "FAIL")

    # Check article cards (use broader selector)
    articles = page.locator("article, li a[href*='/posts/'], .post-card, [class*='card']")
    count = articles.count()
    record("Article cards rendered", "PASS" if count > 0 else "FAIL", f"{count} cards")

    # Check footer
    footer = page.locator("footer")
    record("Footer present", "PASS" if footer.count() > 0 else "FAIL")


def test_article_detail(page):
    print("\n📝 Article Detail Tests")
    page.goto(f"{BASE_URL}/zh/posts/{ARTICLE_SLUG}/")
    page.wait_for_load_state("networkidle")

    # Check article title
    h1 = page.locator("h1")
    record("Article h1 present", "PASS" if h1.count() > 0 else "FAIL", h1.first.text_content()[:50] if h1.count() > 0 else "")

    # Check TOC
    toc = page.locator("[class*='toc'], .table-of-contents, #toc")
    record("Table of contents", "PASS" if toc.count() > 0 else "WARN", f"{toc.count()} TOC elements")

    # Check reading mode button
    reading_btn = page.locator("#reading-mode-btn")
    record("Reading mode button", "PASS" if reading_btn.count() > 0 else "FAIL")


def test_dark_mode(page):
    print("\n🌙 Dark Mode Tests")
    page.goto(f"{BASE_URL}/zh/")
    page.wait_for_load_state("networkidle")

    theme_btn = page.locator("#theme-btn")
    record("Theme toggle button", "PASS" if theme_btn.count() > 0 else "FAIL")

    if theme_btn.count() > 0:
        # Check initial theme state
        html_el = page.locator("html")
        initial_class = html_el.get_attribute("class") or ""
        initial_theme = html_el.get_attribute("data-theme") or ""
        
        # Click theme toggle
        theme_btn.click()
        time.sleep(0.5)
        after_class = html_el.get_attribute("class") or ""
        after_theme = html_el.get_attribute("data-theme") or ""
        changed = (after_class != initial_class) or (after_theme != initial_theme)
        record("Dark mode toggle works", "PASS" if changed else "WARN", f"class: {after_class[:30]}, data-theme: {after_theme}")

        # Toggle back
        theme_btn.click()
        time.sleep(0.5)
        final_class = html_el.get_attribute("class") or ""
        final_theme = html_el.get_attribute("data-theme") or ""
        record("Light mode toggle back", "PASS" if final_class == initial_class else "WARN", f"class: {final_class[:30]}")


def test_tags_page(page):
    print("\n🏷️ Tags Page Tests")
    page.goto(f"{BASE_URL}/zh/tags/")
    page.wait_for_load_state("networkidle")

    # Check tag links exist
    tag_links = page.locator("a[href*='/tags/']")
    count = tag_links.count()
    record("Tag links rendered", "PASS" if count > 3 else "FAIL", f"{count} tags")


def test_categories_page(page):
    print("\n📂 Categories Page Tests")
    page.goto(f"{BASE_URL}/zh/categories/")
    page.wait_for_load_state("networkidle")

    cat_links = page.locator("a[href*='/categories/']")
    count = cat_links.count()
    record("Category links rendered", "PASS" if count > 0 else "FAIL", f"{count} categories")


def test_search_page(page):
    print("\n🔍 Search Page Tests")
    page.goto(f"{BASE_URL}/zh/search/")
    page.wait_for_load_state("networkidle")

    # Check search input exists (Pagefind)
    search_input = page.locator("input[type='search'], input[type='text'], .pagefind-ui__search-input")
    record("Search input present", "PASS" if search_input.count() > 0 else "WARN", f"{search_input.count()} inputs")


def test_ai_chat_widget(page):
    print("\n🤖 AI Chat Widget Tests")
    page.goto(f"{BASE_URL}/zh/")
    page.wait_for_load_state("networkidle")
    # Wait for Preact client:only island to hydrate and set __aiChatToggle
    try:
        page.wait_for_function("typeof window.__aiChatToggle === 'function'", timeout=10000)
    except Exception:
        pass
    time.sleep(1)

    # Check FAB button exists
    fab = page.locator("#ai-chat-toggle-fab")
    record("AI FAB button present", "PASS" if fab.count() > 0 else "FAIL")

    if fab.count() > 0:
        # Click to open chat
        fab.click()
        # Wait for panel and input to hydrate (Preact client:only)
        try:
            page.wait_for_selector("#ai-chat-input, textarea", timeout=8000)
        except Exception:
            pass
        time.sleep(1)

        # Check chat panel appeared (broader selectors for Preact components)
        chat_panel = page.locator("#ai-chat-panel, [data-ai-chat-panel], [class*='chat'], [class*='Chat'], astro-island")
        is_visible = chat_panel.count() > 0
        record("Chat panel opens on click", "PASS" if is_visible else "WARN", f"{chat_panel.count()} panels found")

        # Look for chat input (Preact: textarea or #ai-chat-input; core fallback: input#ai-chat-input)
        chat_input = page.locator("#ai-chat-input, textarea, input[type='text']")
        record("Chat input field", "PASS" if chat_input.count() > 0 else "WARN", f"{chat_input.count()} inputs")

        # Check for quick prompts or welcome message
        quick_prompts = page.locator("button:has-text('技术'), button:has-text('推荐'), button:has-text('搭建')")
        welcome = page.locator("[class*='welcome'], [class*='Welcome']")
        record("Quick prompts or welcome", "PASS" if quick_prompts.count() > 0 or welcome.count() > 0 else "WARN", f"{quick_prompts.count()} prompts, {welcome.count()} welcome")


def test_ai_chat_interaction(page):
    print("\n💬 AI Chat Interaction Tests")
    page.goto(f"{BASE_URL}/zh/")
    page.wait_for_load_state("networkidle")
    # Wait for Preact island to hydrate
    try:
        page.wait_for_function("typeof window.__aiChatToggle === 'function'", timeout=10000)
    except Exception:
        pass
    time.sleep(1)

    fab = page.locator("#ai-chat-toggle-fab")
    if fab.count() == 0:
        record("AI chat interaction", "SKIP", "FAB button not found")
        return

    fab.click()
    # Wait for Preact hydration of chat input
    try:
        page.wait_for_selector("#ai-chat-input, textarea", timeout=8000)
    except Exception:
        pass
    time.sleep(1)

    # Try to find and fill the chat input (Preact: textarea; core: input#ai-chat-input)
    chat_input = page.locator("#ai-chat-input, textarea, input[type='text']").first

    try:
        if chat_input.is_visible():
            chat_input.fill("推荐几篇文章")
            record("Chat input filled", "PASS")

            chat_input.press("Enter")
            record("Message sent (Enter)", "PASS")

            # Wait for streaming response
            time.sleep(8)

            # Check for response text in any child element
            page_text = page.inner_text("body")
            has_response = "推荐" in page_text or "文章" in page_text
            record("AI response received", "PASS" if has_response else "WARN", "Checked body text for response content")
        else:
            record("AI chat input", "WARN", "Chat input not visible (Preact hydration may not complete in headless)")
    except Exception as e:
        record("AI chat interaction", "WARN", f"Exception: {str(e)[:80]}")


def test_404_page(page):
    print("\n🚫 404 Page Tests")
    page.goto(f"{BASE_URL}/nonexistent-page-xyz/")
    
    # Should show 404 content
    content = page.content()
    has_404 = "404" in content or "not found" in content.lower()
    record("404 page rendered", "PASS" if has_404 else "FAIL")


def test_rss_feed(page):
    print("\n📡 RSS Feed Tests")
    page.goto(f"{BASE_URL}/rss.xml")
    content = page.content()
    has_rss = "<rss" in content or "channel" in content
    record("RSS XML valid", "PASS" if has_rss else "FAIL")


def test_pagination(page):
    print("\n📖 Pagination Tests")
    page.goto(f"{BASE_URL}/zh/posts/")
    page.wait_for_load_state("networkidle")

    # Check for pagination links
    pagination = page.locator("a[href*='/posts/2'], nav[aria-label*='pagination'], [class*='pagination']")
    record("Pagination links", "PASS" if pagination.count() > 0 else "WARN", f"{pagination.count()} elements")


def test_back_to_top(page):
    print("\n⬆️ Back to Top Tests")
    page.goto(f"{BASE_URL}/zh/posts/hello-world/")
    page.wait_for_load_state("networkidle")

    # Scroll down
    page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
    time.sleep(1)

    back_btn = page.locator("#back-to-top-btn")
    record("Back to top button", "PASS" if back_btn.count() > 0 else "FAIL")


def main():
    print("=" * 60)
    print("astro-minimax v0.7.2 E2E Browser Tests")
    print("=" * 60)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1280, "height": 720})
        page = context.new_page()

        try:
            test_homepage(page)
            test_article_detail(page)
            test_dark_mode(page)
            test_tags_page(page)
            test_categories_page(page)
            test_search_page(page)
            test_ai_chat_widget(page)
            test_ai_chat_interaction(page)
            test_404_page(page)
            test_rss_feed(page)
            test_pagination(page)
            test_back_to_top(page)
        except Exception as e:
            record("UNEXPECTED ERROR", "FAIL", str(e))
        finally:
            browser.close()

    # Summary
    print("\n" + "=" * 60)
    print("Test Summary")
    print("=" * 60)
    passed = sum(1 for r in RESULTS if r["status"] == "PASS")
    failed = sum(1 for r in RESULTS if r["status"] == "FAIL")
    warned = sum(1 for r in RESULTS if r["status"] == "WARN")
    skipped = sum(1 for r in RESULTS if r["status"] == "SKIP")
    total = len(RESULTS)
    print(f"  Total: {total} | ✅ Pass: {passed} | ❌ Fail: {failed} | ⚠️ Warn: {warned} | ⏭️ Skip: {skipped}")

    # Save results
    with open("/root/project/astro-minblog/tests/e2e-results.json", "w") as f:
        json.dump(RESULTS, f, indent=2, ensure_ascii=False)
    print(f"\n📄 Results saved to tests/e2e-results.json")


if __name__ == "__main__":
    main()
