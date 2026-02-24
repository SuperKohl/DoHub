from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect
from typing import Optional
import asyncio
import json
from services import cups_service

router = APIRouter()

# Connected WebSocket clients for live job updates
_ws_clients: list[WebSocket] = []


@router.get("/")
async def list_jobs(printer: Optional[str] = None, which: str = "not-completed"):
    try:
        return await cups_service.get_jobs(printer, which)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/history")
async def job_history(printer: Optional[str] = None):
    try:
        return await cups_service.get_jobs(printer, which_jobs="completed")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{job_id}")
async def cancel_job(job_id: int):
    try:
        await cups_service.cancel_job(job_id)
        return {"ok": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.websocket("/ws")
async def jobs_websocket(ws: WebSocket):
    """Push job queue updates to client every 2 seconds."""
    await ws.accept()
    _ws_clients.append(ws)
    try:
        while True:
            try:
                jobs = await cups_service.get_jobs()
                await ws.send_text(json.dumps({"type": "jobs", "data": jobs}))
            except Exception as e:
                await ws.send_text(json.dumps({"type": "error", "message": str(e)}))
            await asyncio.sleep(2)
    except WebSocketDisconnect:
        _ws_clients.remove(ws)
