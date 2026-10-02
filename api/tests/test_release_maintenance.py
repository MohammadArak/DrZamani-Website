"""Actual isolated Nginx HTTP/TLS; upstream counts requests, contains no clinic data."""

import ipaddress
import os
import shutil
import socket
import ssl
import subprocess
import sys
import threading
import time
from datetime import datetime, timedelta, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import urlopen

import pytest
from cryptography import x509
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.x509.oid import NameOID

ROOT = Path(__file__).resolve().parents[2]


def free_port():
    with socket.socket() as sock:
        sock.bind(("127.0.0.1", 0))
        return sock.getsockname()[1]


def fixture_certificate(root):
    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    name = x509.Name(
        [x509.NameAttribute(NameOID.COMMON_NAME, "isolated-nginx-fixture")]
    )
    now = datetime.now(timezone.utc)
    cert = (
        x509.CertificateBuilder()
        .subject_name(name)
        .issuer_name(name)
        .public_key(key.public_key())
        .serial_number(x509.random_serial_number())
        .not_valid_before(now - timedelta(minutes=1))
        .not_valid_after(now + timedelta(hours=1))
        .add_extension(x509.BasicConstraints(ca=True, path_length=None), critical=True)
        .add_extension(
            x509.SubjectAlternativeName(
                [x509.IPAddress(ipaddress.ip_address("127.0.0.1"))]
            ),
            critical=False,
        )
        .sign(key, hashes.SHA256())
    )
    cert_path, key_path = root / "certificate.pem", root / "private-key.pem"
    cert_path.write_bytes(cert.public_bytes(serialization.Encoding.PEM))
    key_path.write_bytes(
        key.private_bytes(
            serialization.Encoding.PEM,
            serialization.PrivateFormat.PKCS8,
            serialization.NoEncryption(),
        )
    )
    key_path.chmod(0o600)
    return cert_path, key_path


@pytest.mark.parametrize(
    "template,tls",
    [("nginx-drzamani-http.conf.template", False), ("nginx-drfarzadzamani.conf", True)],
)
def test_maintenance_blocks_publication_requests_before_upstream(
    tmp_path, template, tls
):
    binary = os.environ.get("DRZ_TEST_NGINX") or shutil.which("nginx")
    if not binary:
        local = ROOT / ".work/tools/nginx/nginx-1.28.0/nginx.exe"
        if sys.platform == "win32" and local.is_file():
            binary = str(local)
        elif sys.platform == "linux":
            pytest.fail(
                "Nginx is required for Linux acceptance; install the CI dependency"
            )
        else:
            pytest.skip(
                "Nginx unavailable on this Windows checkout; Linux CI runs this integration"
            )
    hits = []

    class Upstream(BaseHTTPRequestHandler):
        def do_GET(self):
            hits.append(self.path)
            self.send_response(200)
            self.send_header("X-Upstream-Fixture", "yes")
            self.end_headers()
            self.wfile.write(b"synthetic upstream response")

        def log_message(self, *_args):
            pass

    upstream = ThreadingHTTPServer(("127.0.0.1", 0), Upstream)
    thread = threading.Thread(target=upstream.serve_forever, daemon=True)
    thread.start()
    html, shared = tmp_path / "html", tmp_path / "shared"
    html.mkdir()
    shared.mkdir()
    (shared / "maintenance.html").write_text("synthetic maintenance", encoding="utf8")
    (tmp_path / "logs").mkdir()
    temporary_paths = ""
    for kind in ("client_body", "proxy", "fastcgi", "uwsgi", "scgi"):
        directory = tmp_path / (kind + "_temp")
        directory.mkdir()
        temporary_paths += kind + '_temp_path "' + directory.as_posix() + '";\n'
    for name in ("security", "proxy"):
        (tmp_path / (name + ".conf")).write_text(
            (ROOT / f"deploy/drzamani-{name}-headers.conf").read_text(encoding="utf8"),
            encoding="utf8",
        )
    cert, key = fixture_certificate(tmp_path)
    configuration = (ROOT / "deploy" / template).read_text(encoding="utf8")
    replacements = {
        "/var/www/drzamani/current/public_html": html,
        "/var/www/drzamani/shared": shared,
        "/var/www/drzamani/maintenance.flag": tmp_path / "maintenance.flag",
        "/etc/nginx/snippets/drzamani-security-headers.conf": tmp_path
        / "security.conf",
        "/etc/nginx/snippets/drzamani-proxy-headers.conf": tmp_path / "proxy.conf",
        "/etc/letsencrypt/live/drfarzadzamani.ir/fullchain.pem": cert,
        "/etc/letsencrypt/live/drfarzadzamani.ir/privkey.pem": key,
    }
    for before, after in replacements.items():
        configuration = configuration.replace(before, '"' + after.as_posix() + '"')
    port, redirect_port = free_port(), free_port()
    configuration = configuration.replace("__DOMAIN__", "fixture.test").replace(
        "http://127.0.0.1:8000", f"http://127.0.0.1:{upstream.server_port}"
    )
    configuration = configuration.replace(
        "listen 443 ssl http2;", f"listen 127.0.0.1:{port} ssl;"
    )
    configuration = configuration.replace(
        "listen 80;", f"listen 127.0.0.1:{redirect_port if tls else port};"
    )
    config = tmp_path / "nginx.conf"
    config.write_text(
        'daemon off;\nmaster_process off;\npid "'
        + (tmp_path / "nginx.pid").as_posix()
        + '";\nerror_log "'
        + (tmp_path / "error.log").as_posix()
        + '" error;\nevents { worker_connections 64; }\nhttp { access_log off;\n'
        + temporary_paths
        + configuration
        + "\n}\n",
        encoding="utf8",
    )
    args = [binary, "-p", tmp_path.as_posix() + "/", "-c", str(config)]
    process = None
    try:
        syntax = subprocess.run(
            [*args, "-t"], capture_output=True, text=True, timeout=15
        )
        assert syntax.returncode == 0, syntax.stderr
        process = subprocess.Popen(
            args, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL
        )
        context = ssl.create_default_context(cafile=str(cert)) if tls else None
        origin = f"{'https' if tls else 'http'}://127.0.0.1:{port}"
        for _attempt in range(50):
            try:
                with urlopen(origin + "/", context=context, timeout=1) as response:
                    assert response.status == 200
                break
            except (URLError, OSError):
                assert process.poll() is None, "fixture Nginx exited before serving"
                time.sleep(0.1)
        else:
            pytest.fail("fixture Nginx did not become ready")
        paths = [
            "/articles/",
            "/articles/?page=2",
            "/articles/category/fixture/",
            "/articles/fixture/",
            "/sitemap.xml",
            "/media/fixture.webp",
            "/robots.txt",
            "/404.html",
            "/api/health",
            "/",
            "/appointment/",
            "/staff/",
        ]
        for path in paths:
            with urlopen(origin + path, context=context, timeout=3) as response:
                assert (
                    response.status == 200
                    and response.headers["X-Upstream-Fixture"] == "yes"
                )
        before = len(hits)
        (tmp_path / "maintenance.flag").touch()
        for path in paths:
            with pytest.raises(HTTPError) as error:
                urlopen(origin + path, context=context, timeout=3)
            assert error.value.code == 503
            assert b"synthetic maintenance" in error.value.read()
            error.value.close()
        assert len(hits) == before, (
            "maintenance request reached a possible database writer"
        )
        (tmp_path / "maintenance.flag").unlink()
        with urlopen(origin + "/articles/", context=context, timeout=3) as response:
            assert response.status == 200
        assert len(hits) == before + 1
    finally:
        if process is not None:
            process.terminate()
            process.wait(timeout=5)
        upstream.shutdown()
        upstream.server_close()
        thread.join(timeout=5)
