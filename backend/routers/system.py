"""
System routes: version, update-check, update
"""
from fastapi import APIRouter, HTTPException
import httpx
import subprocess
import os
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

DOHUB_VERSION = "1.0.0"
GITHUB_REPO = "SuperKohl/DoHub"  # Anpassen sobald Repo existiert
INSTALL_DIR = os.environ.get("DOHUB_DIR", "/opt/dohub")
SCRIPT_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


@router.get("/version")
async def get_version():
    return {"version": DOHUB_VERSION}


@router.get("/update-check")
async def check_update():
    async with httpx.AsyncClient(timeout=10.0) as c:
        try:
            r = await c.get(
                f"https://api.github.com/repos/{GITHUB_REPO}/releases/latest",
                headers={"Accept": "application/vnd.github.v3+json"},
            )
            if r.status_code == 404:
                return {"update_available": False, "current": DOHUB_VERSION,
                        "error": "GitHub-Repository noch nicht öffentlich"}
            if not r.is_success:
                return {"update_available": False, "error": f"GitHub: HTTP {r.status_code}"}
            d = r.json()
            latest = d.get("tag_name", "").lstrip("v")
            return {
                "update_available": bool(latest and latest != DOHUB_VERSION),
                "current": DOHUB_VERSION,
                "latest": latest,
                "url": d.get("html_url", ""),
                "notes": (d.get("body") or "")[:500],
            }
        except Exception as e:
            return {"update_available": False, "error": str(e)}


@router.post("/update")
async def do_update():
    """
    Trigger an update via the update.sh script.
    Runs asynchronously – client polls /api/status to detect restart.
    """
    update_script = os.path.join(INSTALL_DIR, "update.sh")
    # Fallback: try script next to source
    if not os.path.exists(update_script):
        update_script = os.path.join(SCRIPT_DIR, "update.sh")

    if not os.path.exists(update_script):
        raise HTTPException(
            status_code=404,
            detail=f"update.sh nicht gefunden in {INSTALL_DIR}. "
                   "Bitte manuell ausführen: sudo bash /opt/dohub/update.sh"
        )

    try:
        # Run in background – service will restart itself
        result = subprocess.run(
            ["bash", update_script],
            capture_output=True,
            text=True,
            timeout=120,
        )
        log = (result.stdout + result.stderr)[-2000:]  # last 2000 chars
        if result.returncode != 0:
            raise HTTPException(status_code=500,
                detail=f"Update fehlgeschlagen (exit {result.returncode}):\n{log}")
        return {"ok": True, "message": "Update abgeschlossen", "log": log}
    except subprocess.TimeoutExpired:
        return {"ok": True, "message": "Update gestartet (läuft im Hintergrund)…"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
