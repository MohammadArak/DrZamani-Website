"""The article header/sidebar layout, populated only from published rows."""
import html
import json

from .content import public_rows
from .public_chrome import outline, sidebar as build_sidebar, site_footer, site_header


def image(data, *, thumbnail=False):
    """Cover image tag with the historical markup."""
    if not data.get('cover_key'):
        return ''
    return f'<img class="legacy-article-image" src="/media/{data["cover_key"]}.webp" alt="{html.escape(data["cover_alt"])}" loading="{"lazy" if thumbnail else "eager"}" decoding="async">'


def published_items(db):
    """Published articles as plain dicts (content + published_at/updated_at), newest first."""
    items = []
    for row in public_rows(db):
        data = json.loads(row.published_json)
        data['published_at'] = row.published_at
        data['updated_at'] = row.public_updated_at
        items.append(data)
    return items


def layout(db, clinic, content, *, current_slug='', q='', index=False, crumbs=None, after=''):
    items = published_items(db)
    columns = 'legacy-article-index-container' if index else 'legacy-article-columns'
    page_class = 'legacy-article-page legacy-article-page--index' if index else 'legacy-article-page'
    side = '' if index else build_sidebar(items, current_slug=current_slug, q=q)
    return (
        site_header(clinic, crumbs=crumbs)
        + f'<main class="{page_class}" dir="rtl" lang="fa"><div class="{columns}">' + content + side + '</div>' + after + '</main>'
        + site_footer(clinic)
    )
