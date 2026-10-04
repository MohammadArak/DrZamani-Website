"""Real infrastructure acceptance on a fresh GitHub-hosted VM only.

Never run this on a VPS or self-hosted runner. No secrets, DBs, media, command
logs, certificates or environment files are included in the public report.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import shutil
import socket
import sqlite3
import ssl
import subprocess
import sys
import time
import zipfile
from pathlib import Path
from urllib.error import HTTPError
from urllib.request import urlopen

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'deploy'))
from release_manager import API, JOB, TIMER, Layout, ReleaseManager, Runtime
from state_snapshot import RecoveryError, digest_file
sys.path.pop(0)


class ObservedRuntime(Runtime):
    """Real adapter with fixed diagnostic labels; never emits command payloads."""
    def __init__(self):
        self.failures = []
        self.health_failure = {}

    def run(self, args, **kwargs):
        try:
            return super().run(args, **kwargs)
        except Exception:
            label = Path(args[0]).name
            if label == 'runuser':
                label += '/uv-sync' if 'uv' in args else '/python'
            elif label == 'systemctl':
                label += '/' + args[1]
            self.failures.append(label)
            raise

    def health(self, expected_version):
        try:
            return super().health(expected_version)
        except Exception:
            self.failures.append('API-health')
            self.health_failure['unit'] = subprocess.run(['systemctl','show',API,'--property=ActiveState,SubState,ExecMainStatus'],capture_output=True,text=True).stdout.strip().splitlines()
            try:
                with urlopen('http://127.0.0.1:8000/api/health', timeout=3) as response:
                    payload = json.loads(response.read(4096))
                self.health_failure['respondedOK'] = payload.get('status') == 'ok'
                self.health_failure['expectedVersionMatch'] = payload.get('version') == expected_version
            except Exception as error:
                self.health_failure['probeErrorType'] = type(error).__name__
            raise


def require_disposable_runner():
    if (sys.platform != 'linux' or os.geteuid() != 0
            or os.environ.get('GITHUB_ACTIONS') != 'true'
            or os.environ.get('RUNNER_ENVIRONMENT') != 'github-hosted'
            or os.environ.get('DRZ_RUNTIME_ACCEPTANCE') != 'fixture-only'
            or Path(os.environ.get('GITHUB_WORKSPACE', '/missing')).resolve() != ROOT):
        raise RecoveryError('Requires a fresh GitHub-hosted Linux fixture VM')
    # Refuse an existing installation before any service/file mutation.
    for path in ['/var/www/drzamani', '/var/lib/drzamani', '/var/backups/drzamani',
                 '/etc/drzamani', '/etc/systemd/system/drzamani-api.service',
                 '/etc/systemd/system/drzamani-jobs.service', '/etc/systemd/system/drzamani-jobs.timer']:
        if Path(path).exists() or Path(path).is_symlink():
            raise RecoveryError('Existing installation; acceptance refused')
    if Path('/proc/1/comm').read_text().strip() != 'systemd':
        raise RecoveryError('Actual systemd PID 1 is required')
    for port in (8000, 18080, 18443):
        with socket.socket() as sock:
            sock.bind(('127.0.0.1', port))


def fixture_setup(runtime, layout):
    # Match Ubuntu's independent system Python, not setup-python's CI process env.
    os.environ['UV_PYTHON'] = '/usr/bin/python3.12'
    import pwd
    owner = pwd.getpwnam('www-data')
    for path, mode in [(layout.releases, 0o750), (layout.data, 0o700),
                       (layout.data/'uploads', 0o700), (layout.data/'public-media', 0o700),
                       (layout.data/'uv-cache', 0o750), (layout.data/'uv-python', 0o750)]:
        path.mkdir(parents=True, mode=mode)
        os.chown(path, owner.pw_uid, owner.pw_gid)
        path.chmod(mode)
    # Parent must remain traversable by the service/Nginx worker.
    layout.current.parent.chmod(0o755)
    layout.backups.mkdir(parents=True, mode=0o700)
    layout.env.parent.mkdir(parents=True, mode=0o750)
    os.chown(layout.env.parent, 0, owner.pw_gid)
    import secrets
    env = (ROOT/'deploy/env.production.example').read_text()
    env = env.replace('SECRET_KEY=CHANGE_ME_GENERATE_WITH_openssl_rand_hex_32', 'SECRET_KEY='+secrets.token_hex(32))
    env = env.replace('https://drfarzadzamani.ir,https://www.drfarzadzamani.ir', 'https://127.0.0.1:18443')
    env = env.replace('FRONTEND_URL=https://drfarzadzamani.ir', 'FRONTEND_URL=https://127.0.0.1:18443')
    env = env.replace('CAPTCHA_HOSTNAMES=\n', 'CAPTCHA_HOSTNAMES=runtime.invalid\n')
    layout.env.write_text(env)
    os.chown(layout.env, 0, owner.pw_gid)
    layout.env.chmod(0o640)
    for name in (API, JOB, TIMER):
        shutil.copyfile(ROOT/'deploy'/name, Path('/etc/systemd/system')/name)
    logging_dropin = Path('/etc/systemd/system')/(API+'.d')
    logging_dropin.mkdir()
    (logging_dropin/'fixture-log.conf').write_text('[Service]\nStandardOutput=append:/var/lib/drzamani/fixture-api.log\nStandardError=append:/var/lib/drzamani/fixture-api.log\n')
    # Accelerate only this disposable timer; use the real job command and unit.
    dropin = Path('/etc/systemd/system')/(TIMER+'.d')
    dropin.mkdir()
    (dropin/'fixture.conf').write_text('[Timer]\nOnBootSec=\nOnUnitActiveSec=\nOnActiveSec=1s\nOnUnitActiveSec=2s\n')
    layout.snippets.mkdir(parents=True, exist_ok=True)
    for name in ('security', 'proxy'):
        file = f'drzamani-{name}-headers.conf'
        shutil.copyfile(ROOT/'deploy'/file, layout.snippets/file)
    shared = layout.current.parent/'shared'
    shared.mkdir()
    (shared/'maintenance.html').write_text('<!doctype html><title>Fixture maintenance</title>Fixture maintenance')
    runtime.run(['openssl', 'req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-days', '1',
                 '-subj', '/CN=localhost', '-addext', 'subjectAltName=IP:127.0.0.1,DNS:localhost',
                 '-keyout', str(layout.env.parent/'fixture-key.pem'), '-out', str(layout.env.parent/'fixture-cert.pem')])
    (layout.env.parent/'fixture-key.pem').chmod(0o600)
    config = (ROOT/'deploy/nginx-drfarzadzamani.conf').read_text()
    config = config.replace('listen 80;', 'listen 127.0.0.1:18080;')
    config = config.replace('listen 443 ssl http2;', 'listen 127.0.0.1:18443 ssl http2;')
    config = config.replace('https://drfarzadzamani.ir$request_uri', 'https://127.0.0.1:18443$request_uri')
    config = config.replace('www.drfarzadzamani.ir', 'www.runtime.invalid').replace('drfarzadzamani.ir', 'localhost')
    config = config.replace('/etc/letsencrypt/live/localhost/fullchain.pem', str(layout.env.parent/'fixture-cert.pem'))
    config = config.replace('/etc/letsencrypt/live/localhost/privkey.pem', str(layout.env.parent/'fixture-key.pem'))
    Path('/etc/nginx/sites-enabled/default').unlink(missing_ok=True)
    Path('/etc/nginx/conf.d/drzamani-runtime-fixture.conf').write_text(config)
    runtime.run(['systemctl', 'daemon-reload'])
    runtime.run(['nginx', '-t'])
    runtime.run(['systemctl', 'restart', 'nginx'])


def package(path, *, broken=False):
    with zipfile.ZipFile(path, 'w', zipfile.ZIP_DEFLATED) as archive:
        names = subprocess.check_output(['git', '-c', 'safe.directory='+str(ROOT), 'ls-files', '-z'], cwd=ROOT).decode().split('\0')
        for name in filter(None, names):
            if name == 'VERSION' or name.startswith(('api/', 'deploy/')):
                data = (ROOT/name).read_bytes()
                if broken and name == 'deploy/drzamani-security-headers.conf':
                    data += b'\nfixture_invalid_nginx_directive on;\n'
                archive.writestr(name, data)
        for file in (ROOT/'public_html').rglob('*'):
            if file.is_file():
                archive.write(file, file.relative_to(ROOT).as_posix())


def service_python(runtime, current, program):
    return runtime.run(['runuser', '-u', 'www-data', '--', str(current/'api/.venv/bin/python'), '-c', program], cwd=current/'api')


def seed(runtime, current):
    # One synthetic patient/session and unsent outbox; no owner/provider/account.
    return service_python(runtime, current, '''
from datetime import timedelta
from sqlalchemy import select, text
from app.database import SessionLocal
from app.models import Patient, AuthSession, SmsOutbox, StaffUser, ClinicSetting
from app.security import issue_session_token, utcnow
with SessionLocal.begin() as db:
    assert not db.scalar(select(StaffUser.id).limit(1))
    from app.runtime_settings import get_settings
    assert get_settings().booking_enabled is False
    patient = Patient(phone='00000000000', first_name='Synthetic', last_name='Fixture')
    db.add(patient); db.flush()
    token, hashed = issue_session_token()
    db.add(AuthSession(patient_id=patient.id, token_hash=hashed, expires_at=utcnow()+timedelta(hours=1)))
    db.add(SmsOutbox(event_key='fixture', phone='00000000000', rendered_body='Synthetic fixture only', dedupe_key='runtime-fixture'))
    db.execute(text('CREATE TABLE runtime_fixture (value TEXT NOT NULL)'))
    db.execute(text("INSERT INTO runtime_fixture VALUES ('baseline')"))
print(token)
''')


def request(path, context, expected=200):
    try:
        with urlopen('https://127.0.0.1:18443'+path, context=context, timeout=10) as response:
            status, body, headers = response.status, response.read(), response.headers
    except HTTPError as error:
        status, body, headers = error.code, error.read(), error.headers
    assert status == expected, f'Unexpected HTTP status for fixture path {path}'
    return body, headers


def websocket_check(runtime, current, token):
    # Token stays captured privately; never appears in command args or report.
    credential = Path('/var/lib/drzamani/runtime-token')
    credential.write_text(token)
    import pwd
    owner = pwd.getpwnam('www-data')
    os.chown(credential, owner.pw_uid, owner.pw_gid)
    credential.chmod(0o600)
    try:
        service_python(runtime, current, '''
import json, ssl
from pathlib import Path
from websockets.sync.client import connect
from websockets.exceptions import ConnectionClosed
context=ssl.create_default_context(cafile='/etc/drzamani/fixture-cert.pem')
url='wss://127.0.0.1:18443/api/v1/realtime'
with connect(url, ssl=context, origin='https://127.0.0.1:18443') as socket:
    socket.send(json.dumps({'audience':'patient','token':Path('/var/lib/drzamani/runtime-token').read_text()}))
    assert json.loads(socket.recv(timeout=10)) == {'type':'realtime.ready','audience':'patient'}
with connect(url, ssl=context, origin='https://127.0.0.1:18443') as socket:
    socket.send(json.dumps({'audience':'patient'}))
    try:
        socket.recv(timeout=10)
        raise AssertionError('Unauthenticated socket was admitted')
    except ConnectionClosed as error:
        assert error.rcvd.code == 4401
''')
    finally:
        credential.unlink(missing_ok=True)


def fingerprint(layout):
    with sqlite3.connect(layout.data/'appointments_v2.db') as db:
        assert db.execute('PRAGMA integrity_check').fetchone() == ('ok',)
        assert not db.execute('PRAGMA foreign_key_check').fetchall()
        rows = db.execute('SELECT value FROM runtime_fixture').fetchall()
        assert db.execute("SELECT status, attempts FROM sms_outbox WHERE dedupe_key='runtime-fixture'").fetchone() == ('pending', 0)
    files = [layout.env, layout.data/'uploads/fixture.bin', layout.data/'public-media/fixture.bin',
             layout.snippets/'drzamani-security-headers.conf', layout.snippets/'drzamani-proxy-headers.conf']
    return rows, [(digest_file(file), file.stat().st_uid, file.stat().st_gid, file.stat().st_mode & 0o777) for file in files]


def verify(report):
    require_disposable_runner()
    report.parent.mkdir(exist_ok=True, mode=0o700)
    runtime, layout = ObservedRuntime(), Layout()
    manager = ReleaseManager(layout, runtime)
    checks = []
    stage = 'fixture setup'
    try:
        fixture_setup(runtime, layout)
        stage = 'real runuser locked install and initial migration'
        archive = ROOT/'.work/runtime-release.zip'
        package(archive)
        first = manager.deploy(archive)
        token = seed(runtime, layout.current)
        for name in ('uploads', 'public-media'):
            service_python(runtime, layout.current, f"from pathlib import Path; Path('/var/lib/drzamani/{name}/fixture.bin').write_bytes(b'baseline fixture')")
        context = ssl.create_default_context(cafile=str(layout.env.parent/'fixture-cert.pem'))
        stage = 'real HTTPS, SSR, closed booking and WSS'
        health, headers = request('/api/health', context)
        assert json.loads(health)['version'] == (ROOT/'VERSION').read_text().strip()
        assert headers['X-Content-Type-Options'] == 'nosniff'
        assert b'canonical' in request('/services/rhinoplasty/', context)[0]
        assert b'booking-closed' in request('/appointment/', context)[0]
        request('/services/not-a-service/', context, 404)
        request('/uploads/fixture.bin', context, 404)
        websocket_check(runtime, layout.current, token)
        checks += ['runuser frozen install', 'all Alembic migrations', 'verified HTTPS and SSR', 'closed booking', 'private uploads inaccessible', 'authenticated WSS and unauthenticated rejection']
        stage = 'actual systemd hardening and timer jobs'
        for unit in (API, JOB):
            properties = runtime.run(['systemctl','show',unit,'--property=User,Group,ProtectSystem,ProtectHome,NoNewPrivileges,UMask'])
            for expected in ('User=www-data', 'Group=www-data', 'ProtectSystem=strict', 'ProtectHome=yes', 'NoNewPrivileges=yes', 'UMask=0077'):
                assert expected in properties
        runtime.start(JOB)
        assert runtime.run(['systemctl', 'show', JOB, '--property=ExecMainStatus', '--value']) == '0'
        runtime.start(TIMER)
        for _ in range(30):
            trigger = runtime.run(['systemctl', 'show', TIMER, '--property=LastTriggerUSec', '--value'])
            if trigger and trigger != 'n/a':
                break
            time.sleep(1)
        else:
            raise AssertionError('Timer did not fire')
        baseline = fingerprint(layout)
        checks += ['real API/job hardened units', 'real timer launches actual jobs', 'disabled SMS outbox remains unsent']
        stage = 'deploy with running timer'
        second = manager.deploy(archive)
        assert runtime.active(TIMER) and manager.current().name == second
        assert fingerprint(layout) == baseline
        assert not layout.maintenance.exists()
        checks += ['deploy stops real writers and resumes previously active timer']
        stage = 'populated rollback with original ownership'
        service_python(runtime, layout.current, "from app.database import engine; from sqlalchemy import text;\nwith engine.begin() as db: db.execute(text(\"UPDATE runtime_fixture SET value='changed'\"))")
        service_python(runtime, layout.current, "from pathlib import Path; Path('/var/lib/drzamani/uploads/fixture.bin').write_bytes(b'changed'); Path('/var/lib/drzamani/public-media/fixture.bin').write_bytes(b'changed')")
        with layout.env.open('a') as env:
            env.write('\n# synthetic post-release mutation\n')
        manager.rollback(first, second)
        assert manager.current().name == first and fingerprint(layout) == baseline
        assert runtime.active(TIMER) and not layout.maintenance.exists()
        runtime.health((ROOT/'VERSION').read_text().strip())
        websocket_check(runtime, layout.current, token)
        checks += ['populated DB/media/ENV/snippet rollback with ownership', 'API and WSS usable after restore']
        stage = 'real Nginx failure and recovery; timer previously off'
        runtime.stop(TIMER)
        broken = ROOT/'.work/runtime-broken-release.zip'
        package(broken, broken=True)
        try:
            manager.deploy(broken)
        except RecoveryError:
            pass
        else:
            raise AssertionError('Invalid Nginx release was accepted')
        assert manager.current().name == first and fingerprint(layout) == baseline
        assert not runtime.active(TIMER) and not layout.maintenance.exists()
        assert any(json.loads(file.read_text()).get('status') == 'recovered-after-failure' for file in layout.backups.glob('*.json'))
        request('/api/health', context)
        checks += ['real failed nginx validation restores coordinated state', 'previously disabled timer stays disabled']
        stage = 'unexpected API process termination'
        previous_pid = runtime.run(['systemctl','show','--property=MainPID','--value',API])
        runtime.run(['systemctl','kill','--kill-whom=main','--signal=SIGKILL',API])
        for _ in range(30):
            restarted_pid = runtime.run(['systemctl','show','--property=MainPID','--value',API])
            if restarted_pid not in ('0', previous_pid) and runtime.active(API):
                break
            time.sleep(1)
        else:
            raise AssertionError('API did not restart after SIGKILL')
        runtime.health((ROOT/'VERSION').read_text().strip())
        checks += ['systemd restarts API after SIGKILL; not a power-loss test']
        stage = 'maintenance HTTP guards'
        layout.maintenance.touch(mode=0o600)
        for path in ('/', '/services/', '/appointment/', '/sitemap.xml', '/api/v1/clinic-settings'):
            request(path, context, 503)
        layout.maintenance.unlink()
        checks += ['active TLS Nginx maintenance guards']
        result = {'status':'passed','checks':checks,'source':os.environ['GITHUB_SHA'],'version':(ROOT/'VERSION').read_text().strip(),
                  'releasePackageSha256':hashlib.sha256(archive.read_bytes()).hexdigest(),
                  'systemd':runtime.run(['systemctl','--version']).splitlines()[0],
                  'scope':'disposable GitHub-hosted VM; fixture data and loopback only; no VPS/production acceptance',
                  'openGates':['actual VPS/DNS/Cloudflare/providers','offsite encrypted backup/retention','host power loss','production artifact identity','live deploy authorization']}
    except Exception as error:
        diagnostics = {}
        for unit in (API, JOB):
            state = subprocess.run(['systemctl','show',unit,'--property=ActiveState,SubState,ExecMainStatus'], capture_output=True, text=True)
            diagnostics[unit] = state.stdout.strip().splitlines()
        journal = subprocess.run(['journalctl','-u',API,'--no-pager','-n','100'], capture_output=True, text=True).stdout
        log = layout.data/'fixture-api.log'
        if log.exists():
            journal += log.read_text(errors='replace')[-32000:]
        markers = ['PermissionError', 'ModuleNotFoundError', 'RuntimeError', 'OperationalError', 'SettingsUnavailable', 'No such file or directory', 'Permission denied', 'Failed at step', 'Read-only file system', 'error while loading shared libraries', 'Application startup complete', 'Uvicorn running']
        result = {'status':'failed','stage':stage,'errorType':type(error).__name__,'checks':checks,
                  'failedCommands':runtime.failures,'healthProbe':runtime.health_failure,'unitStatus':diagnostics,'journalErrorTypes':[marker for marker in markers if marker in journal]}
    finally:
        for unit in (TIMER, JOB, API):
            try:
                runtime.stop(unit)
            except Exception:
                pass
        runtime.run(['systemctl','stop','nginx'])
    report.write_text(json.dumps(result, indent=2)+'\n')
    report.chmod(0o644)  # Sanitized status only; no private resources are exported.
    print(json.dumps(result))
    if result['status'] != 'passed' and os.environ.get('GITHUB_ACTIONS') == 'true':
        # The sanitized failure summary is also published as an annotation: job logs need a login, annotations do not.
        print('::error title=linux-runtime failure::' + json.dumps(result).replace('%', '%25').replace('\r', '%0D').replace('\n', '%0A'))
    return 0 if result['status'] == 'passed' else 1


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--report', type=Path, required=True)
    args = parser.parse_args()
    if args.report.resolve().parent != ROOT/'.work':
        parser.error('Report must be in the workspace .work directory')
    try:
        sys.exit(verify(args.report))
    except RecoveryError:
        print('Runtime acceptance refused before fixture setup', file=sys.stderr)
        sys.exit(2)
