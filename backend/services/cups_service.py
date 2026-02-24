import cups
import asyncio
from functools import partial
from typing import Optional
import logging

logger = logging.getLogger(__name__)


def _get_connection() -> cups.Connection:
    return cups.Connection()


def _get_printers_sync() -> list[dict]:
    conn = _get_connection()
    printers = conn.getPrinters()
    result = []
    for name, info in printers.items():
        attrs = conn.getPrinterAttributes(name)
        result.append({
            "name": name,
            "uri": info.get("device-uri", ""),
            "state": _map_state(info.get("printer-state", 0)),
            "state_message": info.get("printer-state-message", ""),
            "location": info.get("printer-location", ""),
            "make_model": info.get("printer-make-and-model", ""),
            "is_default": name == conn.getDefault(),
            "accepting": info.get("printer-is-accepting-jobs", False),
            "shared": info.get("printer-is-shared", False),
            "duplex": "Duplex" in str(attrs.get("sides-supported", [])),
            "color": "color" in str(info.get("printer-make-and-model", "")).lower()
                     or "pixma" in str(info.get("printer-make-and-model", "")).lower()
                     or "inkjet" in str(info.get("printer-make-and-model", "")).lower(),
        })
    return result


def _get_jobs_sync(printer_name: Optional[str] = None, which_jobs: str = "not-completed") -> list[dict]:
    conn = _get_connection()
    jobs = conn.getJobs(which_jobs=which_jobs, requested_attributes=[
        "job-id", "job-name", "job-state", "job-printer-uri",
        "job-originating-user-name", "job-media-sheets-completed",
        "copies", "media", "sides",
    ])
    result = []
    for job_id, info in jobs.items():
        printer_uri = info.get("job-printer-uri", "")
        name_from_uri = printer_uri.split("/")[-1] if printer_uri else ""
        if printer_name and name_from_uri != printer_name:
            continue
        result.append({
            "id": job_id,
            "name": info.get("job-name", f"Job {job_id}"),
            "state": _map_job_state(info.get("job-state", 0)),
            "printer": name_from_uri,
            "user": info.get("job-originating-user-name", "unknown"),
            "pages_completed": info.get("job-media-sheets-completed", 0),
            "copies": info.get("copies", 1),
            "media": info.get("media", "A4"),
            "sides": info.get("sides", "one-sided"),
        })
    return result


def _add_printer_sync(name: str, uri: str, ppd_name: str = "drv:///sample.drv/generic.ppd",
                      location: str = "", description: str = "", shared: bool = True) -> bool:
    conn = _get_connection()
    try:
        conn.addPrinter(name, device=uri, ppdname=ppd_name,
                        location=location, info=description)
        conn.enablePrinter(name)
        conn.acceptJobs(name)
        if shared:
            conn.setPrinterShared(name, True)
        logger.info(f"Printer '{name}' added successfully")
        return True
    except Exception as e:
        logger.error(f"Failed to add printer '{name}': {e}")
        raise


def _delete_printer_sync(name: str) -> bool:
    conn = _get_connection()
    try:
        conn.deletePrinter(name)
        logger.info(f"Printer '{name}' deleted")
        return True
    except Exception as e:
        logger.error(f"Failed to delete printer '{name}': {e}")
        raise


def _cancel_job_sync(job_id: int) -> bool:
    conn = _get_connection()
    try:
        conn.cancelJob(job_id)
        return True
    except Exception as e:
        logger.error(f"Failed to cancel job {job_id}: {e}")
        raise


def _set_default_sync(name: str) -> bool:
    conn = _get_connection()
    conn.setDefault(name)
    return True


def _print_test_page_sync(name: str) -> bool:
    conn = _get_connection()
    conn.printTestPage(name)
    return True


def _discover_network_printers_sync() -> list[dict]:
    """Use CUPS to discover network printers via dnssd/IPP/socket."""
    devices = {}
    try:
        conn = _get_connection()
        # getDevices can be slow, run with timeout concept
        devices = conn.getDevices(exclude_schemes=["serial", "parallel"])
    except Exception as e:
        logger.warning(f"Device discovery error: {e}")

    result = []
    for uri, info in devices.items():
        if not uri or uri.startswith("file:"):
            continue
        result.append({
            "uri": uri,
            "make_model": info.get("device-make-and-model", "Unknown"),
            "info": info.get("device-info", ""),
            "class": info.get("device-class", ""),
        })
    return result


def _map_state(state_int: int) -> str:
    return {3: "idle", 4: "printing", 5: "stopped"}.get(state_int, "unknown")


def _map_job_state(state_int: int) -> str:
    return {
        3: "pending", 4: "pending_held", 5: "processing",
        6: "processing_stopped", 7: "canceled", 8: "aborted", 9: "completed"
    }.get(state_int, "unknown")


# Async wrappers
async def get_printers() -> list[dict]:
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, _get_printers_sync)


async def get_jobs(printer_name: Optional[str] = None, which_jobs: str = "not-completed") -> list[dict]:
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, partial(_get_jobs_sync, printer_name, which_jobs))


async def add_printer(name: str, uri: str, ppd_name: str = "drv:///sample.drv/generic.ppd",
                      location: str = "", description: str = "", shared: bool = True) -> bool:
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, partial(_add_printer_sync, name, uri, ppd_name, location, description, shared))


async def delete_printer(name: str) -> bool:
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, partial(_delete_printer_sync, name))


async def cancel_job(job_id: int) -> bool:
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, partial(_cancel_job_sync, job_id))


async def set_default_printer(name: str) -> bool:
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, partial(_set_default_sync, name))


async def print_test_page(name: str) -> bool:
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, partial(_print_test_page_sync, name))


async def discover_network_printers() -> list[dict]:
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, _discover_network_printers_sync)
