"""Public photos: resized copies on request, cache revalidation, and no leak after unpublishing."""
from io import BytesIO

from PIL import Image

from test_content import client, isolated, draft, transition  # noqa: F401
from test_roles import headers, owner


def big_png():
    output = BytesIO()
    Image.new("RGB", (1600, 1000), "teal").save(output, format="PNG")
    return output.getvalue()


def upload_big(client, access):
    response = client.post("/api/v1/staff/media", headers=access, data={"alt": "تصویر بزرگ آزمایشی"}, files={"file": ("big.png", big_png(), "image/png")})
    assert response.status_code == 201, response.text
    return response.json()


def publish_article_with_cover(client, access, key):
    content = draft("variant-article")
    content.update(cover_key=key, cover_alt="کاور آزمایشی")
    row = client.post("/api/v1/staff/articles", headers=access, json=dict(revision=0, content=content)).json()
    assert transition(client, access, row).status_code == 200
    return row


def test_resized_copies_etag_and_unpublish(client):
    access = headers(owner()[2])
    media = upload_big(client, access)
    key = media["key"]
    assert client.get(f"/media/{key}.webp?w=480").status_code == 404  # private until a published page uses it
    row = publish_article_with_cover(client, access, key)

    small = client.get(f"/media/{key}.webp?w=480")
    assert small.status_code == 200 and Image.open(BytesIO(small.content)).width == 480
    original = client.get(f"/media/{key}.webp")
    assert original.status_code == 200 and len(small.content) < len(original.content)
    assert small.headers["cache-control"] == "no-cache" and small.headers["x-content-type-options"] == "nosniff"
    assert client.get(f"/media/{key}.webp?w=123").status_code == 400  # only the fixed widths
    assert Image.open(BytesIO(client.get(f"/media/{key}.webp?w=1280").content)).width == 1280

    again = client.get(f"/media/{key}.webp?w=480", headers={"If-None-Match": small.headers["etag"]})
    assert again.status_code == 304 and not again.content  # the browser keeps its copy after asking

    page = client.get("/articles/variant-article/").text
    assert f"/media/{key}.webp?w=960 960w" in page and 'sizes="' in page

    unpublished = transition(client, access, client.get(f"/api/v1/staff/articles/{row['id']}", headers=access).json(), "unpublish")
    assert unpublished.status_code == 200
    assert client.get(f"/media/{key}.webp?w=480", headers={"If-None-Match": small.headers["etag"]}).status_code == 404  # revalidation is refused
    assert client.get(f"/media/{key}.webp").status_code == 404
