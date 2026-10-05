"""Service SSR must survive clinic edits, unknown URLs and hostile text."""
import json
import re
from dataclasses import replace

import pytest
from fastapi.testclient import TestClient

from app import config
from app.database import SessionLocal
from app.main import app
from app.models import ClinicSetting
from app.site_services import SEED_CATALOG as SERVICES
from test_roles import schema  # noqa: F401


@pytest.fixture
def service_client(monkeypatch, tmp_path):
    settings = config.get_settings()
    root = tmp_path / 'html'
    root.mkdir()
    (root / 'index.html').write_text('<html><head><script type="module" src="/assets/app.js"></script><link rel="stylesheet" href="/assets/app.css"></head><body></body></html>', encoding='utf-8')
    monkeypatch.setattr(config, 'get_settings', lambda: replace(settings, public_html_dir=root))
    with TestClient(app) as client:
        yield client


def test_all_services_have_initial_html_canonical_and_breadcrumb(service_client):
    for service in SERVICES:
        response = service_client.get(f'/services/{service["slug"]}/')
        assert response.status_code == 200
        assert response.headers['cache-control'] == 'no-store'
        assert service['title'] in response.text
        assert service['description'] in response.text
        assert f'/services/{service["slug"]}/' in response.text
        assert 'type="module"' not in response.text  # Homepage SPA cannot replace service content.
        schemas = [json.loads(v) for v in re.findall(r'<script[^>]*type="application/ld\+json"[^>]*>(.*?)</script>', response.text)]
        breadcrumb = next(s for s in schemas if s['@type'] == 'BreadcrumbList')
        assert breadcrumb['itemListElement'][-1]['name'] == service['title']
        assert 'aggregateRating' not in response.text


def test_aliases_and_unknown_service_are_real_redirect_or_404(service_client):
    for path in ['/services', '/services/']:  # the index page is gone: old links land on the homepage section
        moved = service_client.get(path, follow_redirects=False)
        assert moved.status_code == 301 and moved.headers['location'] == '/#services'
    assert service_client.get('/services/rhinoplasty', follow_redirects=False).status_code == 301
    for path in ['/services/not-a-service', '/services/not-a-service/']:
        response = service_client.get(path)
        assert response.status_code == 404
        assert response.headers['x-robots-tag'].startswith('noindex')


def test_clinic_edits_are_fresh_and_html_escaped(service_client):
    with SessionLocal.begin() as db:
        clinic = db.get(ClinicSetting, 1)
        previous = {field: getattr(clinic, field) for field in ['doctor_name', 'address', 'office_phone']}
        clinic.doctor_name = 'پزشک نمونه <script>fixture()</script>'
        clinic.address = 'نشانی تازه <img src=x onerror=fixture()>'
        clinic.office_phone = '08612345678'
    try:
        response = service_client.get('/services/rhinoplasty/')
        assert '&lt;script&gt;fixture()&lt;/script&gt;' in response.text
        assert '<script>fixture()' not in response.text
        assert '&lt;img src=x onerror=fixture()&gt;' in response.text
        assert 'tel:+988612345678' in response.text
    finally:
        with SessionLocal.begin() as db:
            clinic = db.get(ClinicSetting, 1)
            for field, value in previous.items():
                setattr(clinic, field, value)


def test_sitemap_uses_stable_content_date_and_only_known_services(service_client):
    first = service_client.get('/sitemap.xml')
    second = service_client.get('/sitemap.xml')
    assert first.status_code == 200
    assert first.text == second.text
    assert '/services/not-a-service/' not in first.text
    for service in SERVICES:
        assert f'/services/{service["slug"]}/' in first.text
    assert '/staff/' not in first.text and '/appointment/' not in first.text
