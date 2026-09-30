"""HTTPS webhook egress with exact allowlist, global IPs and pinned DNS.

Resolve once, connect to the validated IP, and verify TLS/SNI against the hostname.
Never use proxies or redirects, and never return remote bodies to the admin.
"""
import http.client
import ipaddress
import json
import socket
import ssl
from urllib.parse import urlsplit

from . import config


def validate_webhook(url: str, *, resolve: bool = True):
    try:
        parsed = urlsplit(url)
        host = parsed.hostname
        if (parsed.scheme != "https" or not host or parsed.username or parsed.password
                or parsed.fragment or parsed.port not in {None, 443}
                or any(ord(char) < 33 for char in url)):
            raise ValueError
        if host.lower() not in {item.lower() for item in config.get_settings().sms_webhook_allowed_hosts}:
            raise ValueError
        # Numeric IP destinations are never configurable, including IPv6 and aliases.
        try:
            ipaddress.ip_address(host)
        except ValueError:
            pass
        else:
            raise ValueError
        addresses = []
        if resolve:
            for answer in socket.getaddrinfo(host, 443, type=socket.SOCK_STREAM):
                address = answer[4][0]
                ip = ipaddress.ip_address(address)
                if not ip.is_global or (ip.version == 6 and ip.ipv4_mapped and not ip.ipv4_mapped.is_global):
                    raise ValueError
                addresses.append(address)
            if not addresses:
                raise ValueError
        return parsed, addresses
    except (ValueError, socket.gaierror, OSError):
        raise ValueError("وب‌هوک باید HTTPS، دامنه مجاز و مقصد عمومی معتبر داشته باشد") from None


class PinnedHTTPSConnection(http.client.HTTPSConnection):
    def __init__(self, host, address):
        super().__init__(host, port=443, timeout=8, context=ssl.create_default_context())
        self.address = address

    def connect(self):
        connection = socket.create_connection((self.address, 443), timeout=self.timeout)
        try:
            self.sock = self._context.wrap_socket(connection, server_hostname=self.host)
        except Exception:
            connection.close()
            raise


def webhook_request(url: str, *, payload=None, token="", probe=False) -> int:
    parsed, addresses = validate_webhook(url)
    path = parsed.path or "/"
    if parsed.query:
        path += "?" + parsed.query
    connection = PinnedHTTPSConnection(parsed.hostname, addresses[0])
    try:
        headers = {"Accept": "application/json"}
        if token and not probe:
            headers["Authorization"] = "Bearer " + token
        if not probe:
            headers["Content-Type"] = "application/json"
        connection.request("HEAD" if probe else "POST", path,
                           body=None if probe else json.dumps(payload).encode(), headers=headers)
        response = connection.getresponse()
        # 3xx is rejected too; credentials never follow a redirect.
        if 300 <= response.status < 400:
            raise ValueError("تغییر مسیر وب‌هوک مجاز نیست")
        if not probe and not 200 <= response.status < 300:
            raise ValueError("وب‌هوک ارسال را تأیید نکرد")
        return response.status
    finally:
        connection.close()
