# DoHub

Moderne Web-GUI für CUPS, SANE und AirPrint – selbst gehostet auf deinem Linux-Server.

## Features

- **Drucker verwalten** – USB, Netzwerk (IPP, socket), Auto-Discovery
- **AirPrint / Bonjour** – Drucker für iOS/macOS automatisch sichtbar machen
- **Job-Queue** – Live-Updates via WebSocket, Jobs abbrechen
- **Scannen** – SANE-Scanner mit Vorschau, Export als JPEG/PNG/PDF
- **Dunkles UI** – schickes, modernes Interface

## Voraussetzungen

- Docker & Docker Compose
- `cups` und `sane` bereits auf dem Host installiert und konfiguriert
- `avahi-daemon` läuft auf dem Host (für Bonjour)

## Schnellstart

### Option A: Docker Compose (empfohlen)

```bash
git clone <dein-repo> dohub
cd dohub
docker compose up -d
```

Öffne: **http://localhost:8080**

### Option B: Direkt ohne Docker (Entwicklung)

**Backend:**
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

Öffne: **http://localhost:3000**

## Konfiguration

### CUPS-Berechtigungen
Damit der Backend-Prozess mit CUPS kommunizieren kann:
```bash
# Den User zur lpadmin-Gruppe hinzufügen (falls nicht als root):
sudo usermod -aG lpadmin $USER

# Oder: CUPS für lokalen Zugriff ohne Auth konfigurieren
# in /etc/cups/cupsd.conf:
#   <Location />
#     Order allow,deny
#     Allow localhost
#   </Location>
```

### SANE-Berechtigungen
```bash
# Scanner-Gruppe
sudo usermod -aG scanner $USER

# Oder udev-Regel für USB-Scanner
```

### AirPrint (Bonjour)
Für AirPrint muss `avahi-daemon` auf dem Host laufen:
```bash
sudo systemctl enable --now avahi-daemon
```

Der DoHub-Backend registriert Drucker automatisch via Zeroconf/mDNS wenn du
in den **Einstellungen** den AirPrint-Toggle aktivierst.

## Projektstruktur

```
dohub/
├── backend/
│   ├── main.py                 # FastAPI App
│   ├── routers/
│   │   ├── printers.py         # Drucker CRUD
│   │   ├── jobs.py             # Jobs + WebSocket
│   │   ├── scan.py             # SANE Scan-API
│   │   └── airprint.py         # Bonjour/mDNS
│   ├── services/
│   │   ├── cups_service.py     # pycups Wrapper
│   │   ├── sane_service.py     # python-sane Wrapper
│   │   └── mdns_service.py     # Zeroconf AirPrint
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── api.js              # API-Client
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Printers.jsx
│   │   │   ├── Jobs.jsx
│   │   │   ├── Scan.jsx
│   │   │   └── Settings.jsx
│   │   └── components/
│   │       ├── Sidebar.jsx
│   │       ├── AddPrinterModal.jsx
│   │       └── ui.jsx          # Shared UI-Komponenten
│   ├── Dockerfile
│   └── package.json
├── docker-compose.yml
├── nginx.conf
└── README.md
```

## API-Dokumentation

Nach dem Start erreichbar unter: **http://localhost:8000/docs** (Swagger UI)

## Ports

| Port | Dienst |
|------|--------|
| 8080 | DoHub Web-UI (Nginx Proxy) |
| 8000 | Backend API (FastAPI, intern) |
| 3000 | Frontend (intern) |
| 631  | CUPS (direkt, bereits vorhanden) |
