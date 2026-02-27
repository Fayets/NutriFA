from uuid import uuid4

from fastapi.testclient import TestClient

import importlib.util
import pathlib
import sys


BACKEND_ROOT = pathlib.Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

spec = importlib.util.spec_from_file_location("main", BACKEND_ROOT / "main.py")
assert spec is not None and spec.loader is not None
main_module = importlib.util.module_from_spec(spec)
sys.modules["main"] = main_module
spec.loader.exec_module(main_module)

client = TestClient(main_module.app)


def _unique_username() -> str:
    return f"testuser_{uuid4().hex[:8]}"


def test_register_login_and_me_flow():
    username = _unique_username()
    password = "testpassword123"

    # Registro
    register_resp = client.post(
        "/register",
        json={"user": username, "password": password},
    )
    assert register_resp.status_code == 200
    register_data = register_resp.json()
    assert register_data["success"] is True
    assert register_data["data"]["user"] == username

    # Login
    login_resp = client.post(
        "/login",
        json={"user": username, "password": password},
    )
    assert login_resp.status_code == 200
    login_data = login_resp.json()
    assert login_data["success"] is True
    token = login_data["data"]["access_token"]
    assert token

    # /me
    me_resp = client.get(
        "/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert me_resp.status_code == 200
    me_data = me_resp.json()
    assert me_data["success"] is True
    assert me_data["data"]["user"] == username

