from fastapi import APIRouter, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel
from typing import Optional
from services import sane_service

router = APIRouter()


class ScanRequest(BaseModel):
    device: str
    mode: str = "Color"          # Color | Gray | Lineart
    resolution: int = 300        # 75 | 150 | 300 | 600 | 1200
    format: str = "jpeg"         # jpeg | png | pdf
    area: Optional[list[float]] = None  # [x0, y0, x1, y1] mm


@router.get("/devices")
async def list_devices():
    try:
        return await sane_service.get_devices()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/devices/{device_name}/options")
async def device_options(device_name: str):
    try:
        return await sane_service.get_device_options(device_name)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/")
async def do_scan(req: ScanRequest):
    try:
        area_tuple = tuple(req.area) if req.area else None
        image_bytes, mime_type = await sane_service.scan(
            req.device, req.mode, req.resolution, area_tuple, req.format
        )
        return Response(
            content=image_bytes,
            media_type=mime_type,
            headers={
                "Content-Disposition": f'attachment; filename="scan.{req.format}"',
                "X-Scan-Device": req.device,
                "X-Scan-Mode": req.mode,
                "X-Scan-Resolution": str(req.resolution),
            },
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
