"""
Paperless-ngx Proxy Router
Alle Calls laufen durch das Backend → kein CORS/SSL-Problem im Browser.
Unterstützt API-Key UND Username/Password.
"""

from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from typing import Optional, Literal
import httpx
import base64
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

DOHUB_VERSION = "1.0.0"
GITHUB_REPO = "DoHubDev/dohub"   # <-- anpassen wenn Repo existiert


def _headers(auth_type: str, api_key: str, username: str, password: str) -> dict:
    if auth_type == "apikey" and api_key:
        return {"Authorization": f"Token {api_key}"}
    if auth_type == "basic" and username:
        creds = base64.b64encode(f"{username}:{password}".encode()).decode()
        return {"Authorization": f"Basic {creds}"}
    return {}


def _client(verify_ssl: bool) -> httpx.AsyncClient:
    return httpx.AsyncClient(timeout=20.0, verify=verify_ssl, follow_redirects=True)


class TestRequest(BaseModel):
    url: str
    auth_type: Literal["apikey", "basic"] = "apikey"
    api_key: str = ""
    username: str = ""
    password: str = ""
    verify_ssl: bool = True


@router.post("/test")
async def test_connection(req: TestRequest):
    base = req.url.rstrip("/")
    hdrs = _headers(req.auth_type, req.api_key, req.username, req.password)
    async with _client(req.verify_ssl) as c:
        try:
            r = await c.get(f"{base}/api/documents/?page_size=1", headers=hdrs)
            if r.status_code == 401:
                raise HTTPException(401, "Ungültiger API-Key oder falsche Zugangsdaten")
            if r.status_code == 403:
                raise HTTPException(403, "Zugriff verweigert – prüfe Benutzerrechte")
            if not r.is_success:
                raise HTTPException(r.status_code, f"Paperless antwortete mit HTTP {r.status_code}: {r.text[:100]}")
            ver = r.headers.get("x-version") or "?"
            return {"ok": True, "version": ver}
        except HTTPException:
            raise
        except httpx.ConnectError as e:
            raise HTTPException(502, f"Verbindung fehlgeschlagen: {e}")
        except httpx.SSLError as e:
            raise HTTPException(502, f"SSL-Fehler – 'SSL ignorieren' aktivieren: {e}")
        except httpx.TimeoutException:
            raise HTTPException(504, "Zeitüberschreitung – ist die URL erreichbar?")
        except Exception as e:
            raise HTTPException(500, str(e))


@router.post("/upload")
async def upload_document(
    url: str = Form(...),
    auth_type: str = Form("apikey"),
    api_key: str = Form(""),
    username: str = Form(""),
    password: str = Form(""),
    verify_ssl: str = Form("true"),
    title: Optional[str] = Form(None),
    correspondent: Optional[str] = Form(None),
    tags: Optional[str] = Form(None),
    document: UploadFile = File(...),
):
    base = url.rstrip("/")
    hdrs = _headers(auth_type, api_key, username, password)
    ssl = verify_ssl.lower() not in ("false", "0", "no")

    content = await document.read()
    files = {"document": (document.filename, content, document.content_type or "application/octet-stream")}

    data: list[tuple] = []
    if title:         data.append(("title", title))
    if correspondent: data.append(("correspondent_name", correspondent))
    if tags:
        for tag in [t.strip() for t in tags.split(",") if t.strip()]:
            data.append(("tags_name", tag))

    async with _client(ssl) as c:
        try:
            r = await c.post(f"{base}/api/documents/post_document/", headers=hdrs, files=files, data=data)
            if r.status_code == 401:
                raise HTTPException(401, "Ungültiger API-Key oder Zugangsdaten")
            if not r.is_success:
                raise HTTPException(r.status_code, f"Upload fehlgeschlagen: {r.text[:200]}")
            return {"ok": True, "task_id": r.text.strip().strip('"')}
        except HTTPException:
            raise
        except httpx.ConnectError as e:
            raise HTTPException(502, f"Verbindung fehlgeschlagen: {e}")
        except httpx.SSLError as e:
            raise HTTPException(502, f"SSL-Fehler: {e}")
        except httpx.TimeoutException:
            raise HTTPException(504, "Zeitüberschreitung beim Upload")
        except Exception as e:
            raise HTTPException(500, str(e))


@router.get("/system/version")
async def get_version():
    return {"version": DOHUB_VERSION}


@router.get("/system/update-check")
async def check_update():
    async with httpx.AsyncClient(timeout=10.0) as c:
        try:
            r = await c.get(
                f"https://api.github.com/repos/{GITHUB_REPO}/releases/latest",
                headers={"Accept": "application/vnd.github.v3+json"},
            )
            if not r.is_success:
                return {"update_available": False, "error": f"GitHub: HTTP {r.status_code}"}
            d = r.json()
            latest = d.get("tag_name", "").lstrip("v")
            return {
                "update_available": bool(latest and latest != DOHUB_VERSION),
                "current": DOHUB_VERSION,
                "latest": latest,
                "url": d.get("html_url", ""),
                "notes": d.get("body", "")[:600],
            }
        except Exception as e:
            return {"update_available": False, "error": str(e)}
