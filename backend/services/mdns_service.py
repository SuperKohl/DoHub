"""
mDNS / AirPrint Service für DoHub
----------------------------------
Schreibt Avahi .service-Dateien nach /etc/avahi/services/
und ruft systemctl reload avahi-daemon auf.

Der dohub-Service läuft mit SupplementaryGroups und braucht
Schreibrechte auf /etc/avahi/services – install.sh setzt chmod 777.
Fallback: sudo avahi-daemon --reload (via sudoers-Regel aus install.sh)
"""

import asyncio
import os
import socket
import logging
import subprocess

logger = logging.getLogger(__name__)

AVAHI_SERVICES_DIR = "/etc/avahi/services"


def _service_xml(printer_name: str, cups_name: str, port: int, color: bool, duplex: bool) -> str:
    hostname = socket.gethostname()
    txt_records = "\n".join(f"      <txt-record>{r}</txt-record>" for r in [
        "txtvers=1",
        "qtotal=1",
        "Transparent=T",
        "URF=none",
        "pdl=application/pdf,image/urf,image/pwg-raster",
        f"Color={'T' if color else 'F'}",
        f"Duplex={'T' if duplex else 'F'}",
        f"rp=printers/{cups_name}",
        f"adminurl=http://{hostname}.local:631/printers/{cups_name}",
        "priority=50",
        "note=",
    ])
    return f"""<?xml version="1.0" standalone='no'?>
<!DOCTYPE service-group SYSTEM "avahi-service.dtd">
<service-group>
  <name replace-wildcards="yes">{printer_name}</name>
  <service>
    <type>_ipp._tcp</type>
    <port>{port}</port>
{txt_records}
  </service>
  <service>
    <type>_universal._sub._ipp._tcp</type>
    <port>{port}</port>
  </service>
</service-group>
"""


def _safe_filename(name: str) -> str:
    safe = "".join(c if c.isalnum() or c in "-_" else "_" for c in name)
    return f"dohub-{safe}.service"


def _reload_avahi() -> bool:
    """Try multiple methods to reload avahi-daemon."""
    for cmd in [
        ["systemctl", "reload", "avahi-daemon"],
        ["sudo", "systemctl", "reload", "avahi-daemon"],
        ["killall", "-HUP", "avahi-daemon"],
        ["sudo", "killall", "-HUP", "avahi-daemon"],
    ]:
        try:
            r = subprocess.run(cmd, capture_output=True, timeout=5)
            if r.returncode == 0:
                logger.info(f"avahi reloaded via: {' '.join(cmd)}")
                return True
        except (subprocess.TimeoutExpired, FileNotFoundError):
            continue
    logger.warning("Could not reload avahi-daemon via any method")
    return False


def _write_file_as_root(filepath: str, content: str) -> bool:
    """Write file using tee+sudo if direct write fails."""
    try:
        with open(filepath, "w") as f:
            f.write(content)
        return True
    except PermissionError:
        pass
    # Try via sudo tee
    try:
        r = subprocess.run(
            ["sudo", "tee", filepath],
            input=content.encode(),
            capture_output=True,
            timeout=5,
        )
        return r.returncode == 0
    except Exception:
        return False


def _delete_file_as_root(filepath: str) -> bool:
    """Delete file, try sudo rm if direct delete fails."""
    try:
        os.remove(filepath)
        return True
    except PermissionError:
        pass
    try:
        r = subprocess.run(["sudo", "rm", "-f", filepath], capture_output=True, timeout=5)
        return r.returncode == 0
    except Exception:
        return False


class MDNSService:
    def __init__(self):
        self._registered: dict[str, str] = {}  # printer_name → filename

    async def start(self):
        # Ensure avahi-daemon is running
        try:
            r = subprocess.run(
                ["systemctl", "is-active", "avahi-daemon"],
                capture_output=True, text=True, timeout=5,
            )
            if r.stdout.strip() != "active":
                logger.warning("avahi-daemon not active, starting…")
                subprocess.run(["systemctl", "start", "avahi-daemon"],
                               capture_output=True, timeout=10)
        except Exception as e:
            logger.warning(f"avahi check failed: {e}")

        # Remove stale service files from previous run
        try:
            for fname in os.listdir(AVAHI_SERVICES_DIR):
                if fname.startswith("dohub-") and fname.endswith(".service"):
                    _delete_file_as_root(os.path.join(AVAHI_SERVICES_DIR, fname))
        except Exception:
            pass

        logger.info("MDNSService ready (avahi .service file mode)")

    async def stop(self):
        for name in list(self._registered.keys()):
            await self.unregister_printer(name)

    async def register_printer(
        self,
        printer_name: str,
        cups_printer_name: str,
        port: int = 631,
        color: bool = True,
        duplex: bool = True,
    ) -> bool:
        if printer_name in self._registered:
            await self.unregister_printer(printer_name)

        # Check avahi services dir exists
        if not os.path.isdir(AVAHI_SERVICES_DIR):
            raise RuntimeError(
                f"/etc/avahi/services existiert nicht – avahi-daemon installieren: "
                "sudo apt install avahi-daemon"
            )

        filename = _safe_filename(printer_name)
        filepath = os.path.join(AVAHI_SERVICES_DIR, filename)
        xml = _service_xml(printer_name, cups_printer_name, port, color, duplex)

        ok = _write_file_as_root(filepath, xml)
        if not ok:
            raise RuntimeError(
                f"Kann {AVAHI_SERVICES_DIR}/{filename} nicht schreiben. "
                "Fix: sudo chmod 777 /etc/avahi/services"
            )

        logger.info(f"Wrote AirPrint service: {filepath}")
        _reload_avahi()

        self._registered[printer_name] = filename
        logger.info(f"AirPrint registered: {printer_name}")
        return True

    async def unregister_printer(self, printer_name: str) -> bool:
        filename = self._registered.pop(printer_name, None)
        if not filename:
            filename = _safe_filename(printer_name)
        filepath = os.path.join(AVAHI_SERVICES_DIR, filename)
        if os.path.exists(filepath):
            _delete_file_as_root(filepath)
            _reload_avahi()
        logger.info(f"AirPrint unregistered: {printer_name}")
        return True

    def get_registered(self) -> list[str]:
        dead = [n for n, fn in self._registered.items()
                if not os.path.exists(os.path.join(AVAHI_SERVICES_DIR, fn))]
        for n in dead:
            del self._registered[n]
        return list(self._registered.keys())


mdns = MDNSService()
