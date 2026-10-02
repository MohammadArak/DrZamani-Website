"""The privileged fixture harness refuses ordinary developer/production hosts."""
import importlib.util
from pathlib import Path

import pytest


def test_runtime_harness_refuses_non_hosted_runner_before_setup(monkeypatch):
    source = Path(__file__).resolve().parents[2] / 'scripts/verify-linux-runtime.py'
    spec = importlib.util.spec_from_file_location('runtime_acceptance', source)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    monkeypatch.setattr(module.sys, 'platform', 'linux')
    monkeypatch.setattr(module.os, 'geteuid', lambda: 0, raising=False)
    monkeypatch.setenv('GITHUB_ACTIONS', 'true')
    monkeypatch.setenv('RUNNER_ENVIRONMENT', 'self-hosted')
    monkeypatch.setenv('DRZ_RUNTIME_ACCEPTANCE', 'fixture-only')
    with pytest.raises(module.RecoveryError, match='fresh GitHub-hosted'):
        module.require_disposable_runner()


def test_runtime_harness_requires_explicit_fixture_marker(monkeypatch):
    source = Path(__file__).resolve().parents[2] / 'scripts/verify-linux-runtime.py'
    spec = importlib.util.spec_from_file_location('runtime_acceptance', source)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    monkeypatch.setattr(module.sys, 'platform', 'linux')
    monkeypatch.setattr(module.os, 'geteuid', lambda: 0, raising=False)
    monkeypatch.setenv('GITHUB_ACTIONS', 'true')
    monkeypatch.setenv('RUNNER_ENVIRONMENT', 'github-hosted')
    monkeypatch.delenv('DRZ_RUNTIME_ACCEPTANCE', raising=False)
    with pytest.raises(module.RecoveryError, match='fresh GitHub-hosted'):
        module.require_disposable_runner()
