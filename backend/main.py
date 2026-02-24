from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging

from routers import printers, jobs, scan, airprint, paperless, system
from services.mdns_service import MDNSService

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

mdns_service = MDNSService()


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("DoHub starting up…")
    await mdns_service.start()
    yield
    logger.info("DoHub shutting down…")
    await mdns_service.stop()


app = FastAPI(title="DoHub API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(printers.router,  prefix="/api/printers",  tags=["printers"])
app.include_router(jobs.router,      prefix="/api/jobs",      tags=["jobs"])
app.include_router(scan.router,      prefix="/api/scan",      tags=["scan"])
app.include_router(airprint.router,  prefix="/api/airprint",  tags=["airprint"])
app.include_router(paperless.router, prefix="/api/paperless", tags=["paperless"])
app.include_router(system.router,    prefix="/api/system",    tags=["system"])


@app.get("/api/status")
async def status():
    return {"status": "ok", "cups": True, "avahi": True, "version": "1.0.0"}
