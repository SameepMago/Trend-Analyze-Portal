from typing import Optional
import os
import time
import sys

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from webdriver_manager.chrome import ChromeDriverManager


def get_downloads_dir() -> str:
    """Return the user's Downloads directory in a cross-platform way."""
    home = os.path.expanduser("~")
    downloads = os.path.join(home, "Downloads")
    # Fallback to home if Downloads doesn't exist for some reason
    return downloads if os.path.isdir(downloads) else home


def download_google_trends_csv() -> Optional[str]:
    """Open Google Trends, click Export → Download CSV, and save to Downloads.

    Returns the absolute path of the downloaded CSV if found, otherwise None.
    """
    print("🔧 Preparing Chrome for Google Trends CSV download…")

    # Configure Chrome to download into the user's Downloads folder
    downloads_dir = get_downloads_dir()
    print(f"📁 Download directory: {downloads_dir}")

    chrome_options = Options()
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")
    chrome_options.add_argument("--disable-gpu")
    chrome_options.add_argument("--window-size=1920,1080")
    chrome_options.add_argument("--remote-debugging-port=9222")

    prefs = {
        "download.default_directory": downloads_dir,
        "download.prompt_for_download": False,
        "download.directory_upgrade": True,
        "safebrowsing.enabled": True,
    }
    chrome_options.add_experimental_option("prefs", prefs)

    service = Service(ChromeDriverManager().install())
    driver = webdriver.Chrome(service=service, options=chrome_options)

    try:
        print("🌐 Navigating to Google Trends…")
        driver.get("https://trends.google.com/trending?geo=US")

        WebDriverWait(driver, 20).until(EC.presence_of_element_located((By.TAG_NAME, "body")))
        time.sleep(5)  # extra time for dynamic content

        print(f"🔍 Page: {driver.title}")

        # Try to find Export button
        export_button = None
        export_selectors = [
            "button:contains('Export')",
            "button[aria-label*='Export']",
            "button[title*='Export']",
            "[role='button']:contains('Export')",
            "button[data-testid*='export']",
            "button[aria-label*='ios_share']",
            "[aria-label*='Export']",
            ".export-button",
            "[class*='export']",
        ]

        for selector in export_selectors:
            try:
                export_button = WebDriverWait(driver, 3).until(
                    EC.element_to_be_clickable((By.CSS_SELECTOR, selector))
                )
                print(f"✅ Export button via selector: {selector}")
                break
            except Exception:
                continue

        if not export_button:
            print("🔎 Scanning buttons for 'Export' text…")
            for button in driver.find_elements(By.TAG_NAME, "button"):
                try:
                    text = (button.text or "").lower()
                    aria = (button.get_attribute("aria-label") or "").lower()
                    title = (button.get_attribute("title") or "").lower()
                    if "export" in text or "export" in aria or "export" in title:
                        export_button = button
                        print("✅ Export button found by text")
                        break
                except Exception:
                    continue

        if not export_button:
            print("❌ Could not find Export button")
            return None

        try:
            export_button.click()
        except Exception:
            driver.execute_script("arguments[0].click();", export_button)
            print("ℹ️ Used JS click for Export")

        time.sleep(3)  # wait for dropdown to show

        # Find Download CSV
        csv_button = None
        csv_selectors = [
            "a:contains('Download CSV')",
            "button:contains('Download CSV')",
            "a[aria-label*='Download CSV']",
            "button[aria-label*='Download CSV']",
            "a[title*='Download CSV']",
            "button[title*='Download CSV']",
            "[role='menuitem']:contains('Download CSV')",
            "[role='menuitem'][aria-label*='Download CSV']",
            "[role='menuitem'][aria-label*='CSV']",
            "a[aria-label*='csv']",
            "button[aria-label*='csv']",
            ".menu-item:contains('Download CSV')",
            ".dropdown-item:contains('Download CSV')",
        ]

        for selector in csv_selectors:
            try:
                csv_button = WebDriverWait(driver, 3).until(
                    EC.element_to_be_clickable((By.CSS_SELECTOR, selector))
                )
                print(f"✅ 'Download CSV' via selector: {selector}")
                break
            except Exception:
                continue

        if not csv_button:
            print("🔎 Scanning dropdown elements for 'Download CSV'…")
            dropdown_elements = driver.find_elements(
                By.CSS_SELECTOR, "[role='menuitem'], .menu-item, .dropdown-item, a, button"
            )
            for element in dropdown_elements:
                try:
                    text = (element.text or "").lower()
                    aria = (element.get_attribute("aria-label") or "").lower()
                    title = (element.get_attribute("title") or "").lower()
                    if "download csv" in text or "download csv" in aria or "download csv" in title:
                        csv_button = element
                        print("✅ 'Download CSV' found by text")
                        break
                except Exception:
                    continue

        if not csv_button:
            print("❌ Could not find 'Download CSV' option")
            return None

        try:
            csv_button.click()
        except Exception:
            driver.execute_script("arguments[0].click();", csv_button)
            print("ℹ️ Used JS click for 'Download CSV'")

        # Wait for download to complete
        time.sleep(8)

        # Find newest CSV in Downloads
        csv_files = [
            f for f in os.listdir(downloads_dir)
            if f.lower().endswith(".csv")
        ]
        if not csv_files:
            print("❌ No CSV file detected in Downloads")
            return None

        csv_files.sort(
            key=lambda x: os.path.getmtime(os.path.join(downloads_dir, x)),
            reverse=True,
        )
        csv_path = os.path.join(downloads_dir, csv_files[0])
        print(f"✅ CSV downloaded: {csv_path}")
        return csv_path

    finally:
        driver.quit()


def main() -> int:
    csv_path = download_google_trends_csv()
    if not csv_path:
        return 1
    # Print the path on stdout for easy scripting
    print(csv_path)
    return 0


if __name__ == "__main__":
    sys.exit(main())
