import sane
import asyncio
from functools import partial
from typing import Optional
import io
import base64
import logging
from PIL import Image

logger = logging.getLogger(__name__)

# sane.init() is not thread-safe – call once at module level
_sane_initialized = False


def _ensure_init():
    global _sane_initialized
    if not _sane_initialized:
        sane.init()
        _sane_initialized = True


def _get_devices_sync() -> list[dict]:
    _ensure_init()
    try:
        devices = sane.get_devices()
        return [
            {
                "name": d[0],
                "vendor": d[1],
                "model": d[2],
                "type": d[3],
            }
            for d in devices
        ]
    except Exception as e:
        logger.error(f"SANE get_devices error: {e}")
        return []


def _scan_sync(
    device_name: str,
    mode: str = "Color",
    resolution: int = 300,
    area: Optional[tuple] = None,   # (x0, y0, x1, y1) in mm
    format: str = "jpeg",
) -> tuple[bytes, str]:
    """Returns (image_bytes, mime_type)"""
    _ensure_init()
    dev = sane.open(device_name)
    try:
        dev.mode = mode
        dev.resolution = resolution
        if area:
            dev.tl_x, dev.tl_y, dev.br_x, dev.br_y = area

        img: Image.Image = dev.scan()

        buf = io.BytesIO()
        if format == "pdf":
            img.save(buf, format="PDF", resolution=resolution)
            mime = "application/pdf"
        elif format == "png":
            img.save(buf, format="PNG")
            mime = "image/png"
        else:
            img.save(buf, format="JPEG", quality=92)
            mime = "image/jpeg"

        return buf.getvalue(), mime
    finally:
        dev.close()


def _get_device_options_sync(device_name: str) -> dict:
    _ensure_init()
    dev = sane.open(device_name)
    try:
        opts = {}
        for opt in dev.get_options():
            if opt[1] and opt[1] != "":
                opts[opt[1]] = {
                    "title": opt[2],
                    "type": str(opt[3]),
                    "unit": str(opt[4]),
                    "constraint": opt[8],
                }
        return opts
    finally:
        dev.close()


# Async wrappers
async def get_devices() -> list[dict]:
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, _get_devices_sync)


async def scan(
    device_name: str,
    mode: str = "Color",
    resolution: int = 300,
    area: Optional[tuple] = None,
    format: str = "jpeg",
) -> tuple[bytes, str]:
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(
        None, partial(_scan_sync, device_name, mode, resolution, area, format)
    )


async def get_device_options(device_name: str) -> dict:
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, partial(_get_device_options_sync, device_name))
