"""Editable homepage wording: seeding, draft/publish isolation, validation and permissions."""
import json

from test_content import client, isolated  # noqa: F401
from test_roles import account, headers, owner

BASE = "/api/v1/staff/site-content"


def blocks(client, access):
    return {item["key"]: item for item in client.get(BASE, headers=access).json()["items"]}


def test_blocks_are_seeded_with_the_previous_wording(client):
    public = client.get("/api/v1/site-content").json()["blocks"]
    assert set(public) == {"hero", "trust", "about", "faq", "privacy", "footer"}
    assert len(public["faq"]["items"]) == 4 and len(public["about"]["paragraphs"]) == 3
    assert "{doctorName}" in public["hero"]["description"]
    assert len(public["trust"]["items"]) == 3 and public["about"]["quote"] == "" and len(public["about"]["facts"]) == 2
    home = client.get("/").text
    bootstrap = home.split('id="site-content-bootstrap" type="application/json">', 1)[1].split("</script>", 1)[0]
    assert json.loads(bootstrap)["blocks"]["footer"]["description"] == public["footer"]["description"]


def test_writer_edits_a_draft_and_only_a_publisher_makes_it_public(client):
    _, _, editor = account(builtin="content_editor")
    writer = headers(editor)
    chief = headers(owner()[2])
    hero = blocks(client, writer)["hero"]
    edited = dict(revision=hero["revision"], content=dict(description="متن تازه‌ی بالای صفحه برای آزمون نرم‌افزار؛ {doctorName} در اراک."))
    changed = client.put(f"{BASE}/hero", headers=writer, json=edited)
    assert changed.status_code == 200 and changed.json()["unpublished_changes"] is True
    assert "متن تازه" not in client.get("/api/v1/site-content").json()["blocks"]["hero"]["description"]
    assert client.post(f"{BASE}/hero/transition", headers=writer, json=dict(revision=changed.json()["revision"], action="publish")).status_code == 403
    published = client.post(f"{BASE}/hero/transition", headers=chief, json=dict(revision=changed.json()["revision"], action="publish"))
    assert published.status_code == 200 and published.json()["unpublished_changes"] is False
    assert "متن تازه" in client.get("/api/v1/site-content").json()["blocks"]["hero"]["description"]


def test_viewer_cannot_edit_and_anonymous_cannot_read_the_editor(client):
    _, _, viewer = account({"site_content.view"})
    access = headers(viewer)
    assert client.get(BASE, headers=access).status_code == 200
    hero = blocks(client, access)["hero"]
    assert client.put(f"{BASE}/hero", headers=access, json=dict(revision=hero["revision"], content=hero["content"])).status_code == 403
    assert client.get(BASE).status_code == 401


def test_validation_conflicts_and_unknown_blocks(client):
    access = headers(owner()[2])
    current = blocks(client, access)
    faq = current["faq"]
    assert client.put(f"{BASE}/faq", headers=access, json=dict(revision=faq["revision"], content=dict(items=[]))).status_code == 422
    too_long = dict(items=[dict(title="سوال", content="پ" * 2001)])
    assert client.put(f"{BASE}/faq", headers=access, json=dict(revision=faq["revision"], content=too_long)).status_code == 422
    assert client.put(f"{BASE}/faq", headers=access, json=dict(revision=faq["revision"], content=dict(items=faq["content"]["items"], extra="x"))).status_code == 422
    control = dict(description="متن با نویسه کنترلی \x01 که مجاز نیست")
    assert client.put(f"{BASE}/footer", headers=access, json=dict(revision=current["footer"]["revision"], content=control)).status_code == 422
    stale = dict(revision=faq["revision"] + 5, content=faq["content"])
    assert client.put(f"{BASE}/faq", headers=access, json=stale).status_code == 409
    assert client.put(f"{BASE}/unknown", headers=access, json=dict(revision=1, content={})).status_code == 422
    assert blocks(client, access)["faq"]["revision"] == faq["revision"]  # nothing was written


def test_discard_returns_the_draft_to_the_published_wording(client):
    access = headers(owner()[2])
    about = blocks(client, access)["about"]
    draft = client.put(f"{BASE}/about", headers=access, json=dict(revision=about["revision"], content=dict(paragraphs=["بند تازه‌ی پیش‌نویس برای آزمون"]))).json()
    assert draft["unpublished_changes"] is True
    back = client.post(f"{BASE}/about/transition", headers=access, json=dict(revision=draft["revision"], action="discard")).json()
    assert back["unpublished_changes"] is False and len(back["content"]["paragraphs"]) == 3


def test_seed_never_overwrites_edited_wording(client):
    access = headers(owner()[2])
    footer = blocks(client, access)["footer"]
    edited = client.put(f"{BASE}/footer", headers=access, json=dict(revision=footer["revision"], content=dict(description="متن ویرایش‌شده‌ی فوتر برای آزمون"))).json()
    client.post(f"{BASE}/footer/transition", headers=access, json=dict(revision=edited["revision"], action="publish"))
    from app.main import seed_defaults
    seed_defaults()
    assert client.get("/api/v1/site-content").json()["blocks"]["footer"]["description"] == "متن ویرایش‌شده‌ی فوتر برای آزمون"


def test_trust_strip_and_about_extras_are_editable_and_can_be_hidden(client):
    access = headers(owner()[2])
    current = blocks(client, access)
    trust = current["trust"]
    emptied = client.put(f"{BASE}/trust", headers=access, json=dict(revision=trust["revision"], content=dict(items=[])))
    assert emptied.status_code == 200 and emptied.json()["content"]["items"] == []
    too_many = dict(items=[dict(title="مورد", text="متن")] * 5)
    assert client.put(f"{BASE}/trust", headers=access, json=dict(revision=emptied.json()["revision"], content=too_many)).status_code == 422
    about = current["about"]
    content = dict(about["content"], quote="جمله‌ی آزمایشی", facts=[dict(value="۱۰", label="آزمون")])
    saved = client.put(f"{BASE}/about", headers=access, json=dict(revision=about["revision"], content=content))
    assert saved.status_code == 200 and saved.json()["content"]["quote"] == "جمله‌ی آزمایشی"
    too_many_facts = dict(about["content"], facts=[dict(value="۱", label="الف")] * 5)
    assert client.put(f"{BASE}/about", headers=access, json=dict(revision=saved.json()["revision"], content=too_many_facts)).status_code == 422


def test_privacy_page_is_served_linked_and_editable(client):
    page = client.get("/privacy/")
    assert page.status_code == 200 and "حریم خصوصی و اطلاعات شما" in page.text and "کوکی" in page.text
    assert client.get("/privacy", follow_redirects=False).status_code == 301
    assert "/privacy/" in client.get("/sitemap.xml").text
    assert 'href="/privacy/"' in client.get("/services/").text  # linked from the shared footer
    access = headers(owner()[2])
    privacy = blocks(client, access)["privacy"]
    items = [dict(title="عنوان آزمایشی", content="متن آزمایشی حریم خصوصی؛ تماس: {officePhone}")]
    saved = client.put(f"{BASE}/privacy", headers=access, json=dict(revision=privacy["revision"], content=dict(items=items)))
    assert saved.status_code == 200
    assert "عنوان آزمایشی" not in client.get("/privacy/").text  # drafts are never public
    assert client.post(f"{BASE}/privacy/transition", headers=access, json=dict(revision=saved.json()["revision"], action="publish")).status_code == 200
    live = client.get("/privacy/").text
    assert "عنوان آزمایشی" in live and "{officePhone}" not in live
    too_many = dict(items=[dict(title="عنوان", content="متن")] * 13)
    assert client.put(f"{BASE}/privacy", headers=access, json=dict(revision=saved.json()["revision"] + 1, content=too_many)).status_code == 422
