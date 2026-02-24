from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from services import cups_service
from services.mdns_service import mdns

router = APIRouter()

# In-memory display name overrides
_airprint_display_names: dict[str, str] = {}


class AddPrinterRequest(BaseModel):
    name: str
    uri: str
    ppd_name: str = "drv:///sample.drv/generic.ppd"
    location: str = ""
    description: str = ""
    shared: bool = True


class RenamePrinterRequest(BaseModel):
    airprint_display_name: Optional[str] = None


@router.get("/")
async def list_printers():
    try:
        printers = await cups_service.get_printers()
        registered = mdns.get_registered()
        for p in printers:
            p["airprint_registered"] = p["name"] in registered
            p["airprint_display_name"] = _airprint_display_names.get(p["name"], p["name"])
        return printers
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/")
async def add_printer(req: AddPrinterRequest):
    try:
        await cups_service.add_printer(
            req.name, req.uri, req.ppd_name,
            req.location, req.description, req.shared
        )
        if req.shared:
            try:
                await mdns.register_printer(req.name, req.name)
            except Exception:
                pass
        return {"ok": True, "name": req.name}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/{name}/rename")
async def rename_printer(name: str, req: RenamePrinterRequest):
    try:
        if req.airprint_display_name is not None:
            _airprint_display_names[name] = req.airprint_display_name
            registered = mdns.get_registered()
            if name in registered:
                printers = await cups_service.get_printers()
                p = next((x for x in printers if x["name"] == name), None)
                await mdns.unregister_printer(name)
                await mdns.register_printer(
                    req.airprint_display_name, name,
                    color=p["color"] if p else True,
                    duplex=p["duplex"] if p else True,
                )
        return {"ok": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{name}")
async def delete_printer(name: str):
    try:
        if name in mdns.get_registered():
            await mdns.unregister_printer(name)
        _airprint_display_names.pop(name, None)
        await cups_service.delete_printer(name)
        return {"ok": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{name}/default")
async def set_default(name: str):
    try:
        await cups_service.set_default_printer(name)
        return {"ok": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{name}/test")
async def test_page(name: str):
    try:
        await cups_service.print_test_page(name)
        return {"ok": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/discover/network")
async def discover():
    try:
        return await cups_service.discover_network_printers()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
