from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from services.mdns_service import mdns
from services import cups_service

router = APIRouter()


class RegisterRequest(BaseModel):
    printer_name: str
    cups_printer_name: str
    port: int = 631
    color: bool = True
    duplex: bool = False


class SetNameRequest(BaseModel):
    display_name: str


@router.get("/registered")
async def list_registered():
    return {"registered": mdns.get_registered()}


@router.post("/register")
async def register(req: RegisterRequest):
    try:
        await mdns.register_printer(
            req.printer_name, req.cups_printer_name,
            req.port, req.color, req.duplex,
        )
        return {"ok": True, "name": req.printer_name}
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/register/{name}")
async def unregister(name: str):
    ok = await mdns.unregister_printer(name)
    return {"ok": ok}


@router.patch("/name/{name}")
async def set_display_name(name: str, req: SetNameRequest):
    try:
        printers = await cups_service.get_printers()
        p = next((x for x in printers if x["name"] == name), None)
        registered = mdns.get_registered()
        if name in registered:
            await mdns.unregister_printer(name)
        if p:
            await mdns.register_printer(
                req.display_name, name,
                color=p.get("color", True),
                duplex=p.get("duplex", False),
            )
        return {"ok": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/status")
async def airprint_status():
    """Check if avahi-daemon and avahi-publish are available."""
    import shutil, asyncio
    has_binary = bool(shutil.which("avahi-publish") or shutil.which("avahi-publish-service"))
    daemon_ok = False
    if has_binary:
        proc = await asyncio.create_subprocess_exec(
            "systemctl", "is-active", "--quiet", "avahi-daemon",
            stdout=asyncio.subprocess.DEVNULL, stderr=asyncio.subprocess.DEVNULL,
        )
        await proc.wait()
        daemon_ok = proc.returncode == 0
    return {
        "avahi_binary": has_binary,
        "avahi_daemon": daemon_ok,
        "registered": mdns.get_registered(),
    }
