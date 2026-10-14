"""Status documents work without the API, clinic DB, or a JavaScript bundle."""
import html
import json
from pathlib import Path
from fastapi.responses import HTMLResponse

ROOT = Path(__file__).parent
PAGES = json.loads((ROOT / "status_pages.json").read_text(encoding="utf-8"))

def status_document(kind, *, title=None, description=None, code=None):
    item = PAGES[kind]
    values = {"KIND": kind, "TITLE": title or item["title"], "DESCRIPTION": description or item["description"], "CODE": code if code is not None else item["code"], "LABEL": item["label"]}
    values = {key: html.escape(value) for key, value in values.items()}
    values["CSS"] = (ROOT / "status_page.css").read_text(encoding="utf-8") + (ROOT / "brand_credit.css").read_text(encoding="utf-8")
    values["SYMBOL"] = (ROOT / "status_symbols" / (kind + ".svg")).read_text(encoding="utf-8")
    values["ACTIONS"] = '<a href="/">بازگشت به صفحه اصلی</a><a class="site-status__secondary" href="/articles/">مشاهدهٔ مقالات</a>' if kind == 'missing' else '<a href="">تلاش دوباره</a><a class="site-status__secondary" href="/">صفحه اصلی</a>'
    document = (ROOT / "status_page_template.html").read_text(encoding="utf-8")
    for key, value in values.items(): document = document.replace("{{" + key + "}}", value)
    return document

def status_response(kind, status_code, **kwargs):
    headers = {"Cache-Control": "no-store", "X-Robots-Tag": "noindex, follow"}
    if kind == 'maintenance': headers.update({"X-DrZ-Status": "maintenance", "Retry-After": "60"})
    return HTMLResponse(status_document(kind, **kwargs), status_code=status_code, headers=headers)
