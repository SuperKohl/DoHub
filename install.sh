#!/bin/bash
set -e

# ============================================================
#  DoHub Installer
#  Installiert CUPS, SANE, Node.js, Python, alle Abhängig-
#  keiten und richtet DoHub als systemd-Service ein.
# ============================================================

DOHUB_DIR="/opt/dohub"
DOHUB_USER="dohub"
BACKEND_PORT="8000"
FRONTEND_PORT="3000"
PROXY_PORT="8080"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

log()     { echo -e "${GREEN}[✓]${NC} $1"; }
info()    { echo -e "${CYAN}[→]${NC} $1"; }
warn()    { echo -e "${YELLOW}[!]${NC} $1"; }
error()   { echo -e "${RED}[✗]${NC} $1"; exit 1; }
section() { echo -e "\n${BOLD}${CYAN}━━━ $1 ━━━${NC}"; }

# ── Root-Check ──────────────────────────────────────────────
if [[ $EUID -ne 0 ]]; then
  error "Dieses Skript muss als root ausgeführt werden.\n  Bitte: sudo bash install.sh"
fi

# ── Banner ───────────────────────────────────────────────────
echo -e "
${CYAN}${BOLD}
  ██████╗ ██████╗ ██╗███╗   ██╗████████╗██╗  ██╗██╗   ██╗██████╗
  ██╔══██╗██╔══██╗██║████╗  ██║╚══██╔══╝██║  ██║██║   ██║██╔══██╗
  ██████╔╝██████╔╝██║██╔██╗ ██║   ██║   ███████║██║   ██║██████╔╝
  ██╔═══╝ ██╔══██╗██║██║╚██╗██║   ██║   ██╔══██║██║   ██║██╔══██╗
  ██║     ██║  ██║██║██║ ╚████║   ██║   ██║  ██║╚██████╔╝██████╔╝
  ╚═╝     ╚═╝  ╚═╝╚═╝╚═╝  ╚═══╝   ╚═╝   ╚═╝  ╚═╝ ╚═════╝ ╚═════╝
${NC}
  ${BOLD}Installer v1.0${NC} – CUPS · SANE · AirPrint · Web-UI
"

# ── Distro erkennen ──────────────────────────────────────────
if [ -f /etc/os-release ]; then
  . /etc/os-release
  DISTRO=$ID
  DISTRO_LIKE=$ID_LIKE
else
  error "Betriebssystem nicht erkannt."
fi

info "Erkanntes System: ${BOLD}$PRETTY_NAME${NC}"

case "$DISTRO" in
  ubuntu|debian|linuxmint|pop)   PKG="apt" ;;
  fedora|rhel|centos|rocky|alma) PKG="dnf" ;;
  arch|manjaro|endeavouros)      PKG="pacman" ;;
  opensuse*|sles)                PKG="zypper" ;;
  *)
    # Fallback via ID_LIKE
    if echo "$DISTRO_LIKE" | grep -q "debian"; then PKG="apt"
    elif echo "$DISTRO_LIKE" | grep -q "fedora\|rhel"; then PKG="dnf"
    elif echo "$DISTRO_LIKE" | grep -q "arch"; then PKG="pacman"
    else error "Nicht unterstützter Paketmanager (Distro: $DISTRO)"; fi
    ;;
esac
log "Paketmanager: $PKG"

# ── Installationspfad ────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Prüfe ob wir im dohub-Verzeichnis sind oder ob es ./dohub gibt
if [ -d "$SCRIPT_DIR/dohub" ]; then
  SOURCE_DIR="$SCRIPT_DIR/dohub"
elif [ -f "$SCRIPT_DIR/backend/main.py" ]; then
  SOURCE_DIR="$SCRIPT_DIR"
else
  error "DoHub-Quellcode nicht gefunden.\nBitte install.sh im selben Verzeichnis wie den dohub/-Ordner ablegen."
fi

info "Quellcode gefunden in: $SOURCE_DIR"

# ============================================================
section "System-Pakete aktualisieren"
# ============================================================
info "Paketlisten aktualisieren…"
case $PKG in
  apt)    apt-get update -qq ;;
  dnf)    dnf check-update -q || true ;;
  pacman) pacman -Sy --noconfirm ;;
  zypper) zypper refresh -q ;;
esac
log "Paketlisten aktuell"

# ── Hilfsfunktion: Paket installieren ───────────────────────
install_pkg() {
  case $PKG in
    apt)    apt-get install -y -qq "$@" ;;
    dnf)    dnf install -y -q "$@" ;;
    pacman) pacman -S --noconfirm --needed "$@" ;;
    zypper) zypper install -y -q "$@" ;;
  esac
}

# ============================================================
section "CUPS installieren & konfigurieren"
# ============================================================
info "Installiere CUPS (Latest)…"
case $PKG in
  apt)    install_pkg cups cups-bsd cups-client cups-filters printer-driver-gutenprint ;;
  dnf)    install_pkg cups cups-filters cups-pdf gutenprint-cups ;;
  pacman) install_pkg cups cups-filters gutenprint ;;
  zypper) install_pkg cups cups-filters ;;
esac

log "CUPS installiert"

info "Konfiguriere CUPS für Netzwerkzugriff…"
# Backup der original config
cp /etc/cups/cupsd.conf /etc/cups/cupsd.conf.bak 2>/dev/null || true

# CUPS so konfigurieren dass es auf allen Interfaces lauscht
# und lokaler Zugriff ohne Auth möglich ist (für DoHub-Backend)
cat > /etc/cups/cupsd.conf << 'CUPSCONF'
# DoHub-optimierte CUPS-Konfiguration
LogLevel warn
PageLogFormat
MaxLogSize 0

# Lausche auf localhost + alle Netzwerkschnittstellen
Listen localhost:631
Listen *:631
ServerAlias *

# Web-Interface aktivieren
WebInterface Yes

# Browsen aktivieren (für Netzwerk-Drucker-Discovery)
Browsing On
BrowseLocalProtocols dnssd

# Standard-Richtlinien
DefaultEncryption Never

<Location />
  Order allow,deny
  Allow localhost
  Allow 127.0.0.1
</Location>

<Location /admin>
  Order allow,deny
  Allow localhost
  Allow 127.0.0.1
</Location>

<Location /admin/conf>
  AuthType Default
  Require user @SYSTEM
  Order allow,deny
  Allow localhost
</Location>

<Location /printers>
  Order allow,deny
  Allow All
</Location>

<Policy default>
  JobPrivateAccess default
  JobPrivateValues default
  SubscriptionPrivateAccess default
  SubscriptionPrivateValues default

  <Limit Create-Job Print-Job Print-URI Validate-Job>
    Order deny,allow
  </Limit>
  <Limit Send-Document Send-URI Hold-Job Release-Job Restart-Job Purge-Jobs Set-Job-Attributes Create-Job-Subscription Renew-Subscription Cancel-Subscription Get-Notifications Reprocess-Job Cancel-Current-Job Suspend-Current-Job Resume-Job Cancel-My-Jobs Close-Job CUPS-Move-Job CUPS-Get-Document>
    Require user @OWNER @SYSTEM
    Order deny,allow
  </Limit>
  <Limit CUPS-Add-Modify-Printer CUPS-Delete-Printer CUPS-Add-Modify-Class CUPS-Delete-Class CUPS-Set-Default CUPS-Get-Devices>
    AuthType Default
    Require user @SYSTEM
    Order deny,allow
    Allow localhost
  </Limit>
  <Limit Pause-Printer Resume-Printer Enable-Printer Disable-Printer Pause-Printer-After-Current-Job Hold-New-Jobs Release-Held-New-Jobs Deactivate-Printer Activate-Printer Restart-Printer Shutdown-Printer Startup-Printer Promote-Job Schedule-Job-After Cancel-Jobs CUPS-Accept-Jobs CUPS-Reject-Jobs>
    AuthType Default
    Require user @SYSTEM
    Order deny,allow
    Allow localhost
  </Limit>
  <Limit Cancel-Job CUPS-Authenticate-Job>
    Require user @OWNER @SYSTEM
    Order deny,allow
  </Limit>
  <Limit All>
    Order deny,allow
  </Limit>
</Policy>
CUPSCONF

log "CUPS konfiguriert"

systemctl enable cups --now
systemctl restart cups
log "CUPS-Dienst gestartet"

# ============================================================
section "SANE installieren"
# ============================================================
info "Installiere SANE (Scanner-Unterstützung)…"
case $PKG in
  apt)    install_pkg sane sane-utils libsane libsane-dev ;;
  dnf)    install_pkg sane-backends sane-backends-devel ;;
  pacman) install_pkg sane ;;
  zypper) install_pkg sane-backends sane-backends-devel ;;
esac
log "SANE installiert"

# ============================================================
section "Avahi / Bonjour installieren"
# ============================================================
info "Installiere Avahi für AirPrint/mDNS…"
case $PKG in
  apt)    install_pkg avahi-daemon avahi-utils libnss-mdns ;;
  dnf)    install_pkg avahi avahi-tools nss-mdns ;;
  pacman) install_pkg avahi nss-mdns ;;
  zypper) install_pkg avahi ;;
esac

# Avahi CUPS-Integration
case $PKG in
  apt)    install_pkg cups-browsed 2>/dev/null || true ;;
  *)      ;;
esac

systemctl enable avahi-daemon --now
systemctl restart avahi-daemon
log "Avahi gestartet"

# Avahi-Services-Verzeichnis + sudoers für AirPrint
mkdir -p /etc/avahi/services
chmod 777 /etc/avahi/services

# sudoers-Regel: dohub darf avahi neu laden + tee in /etc/avahi/services
cat > /etc/sudoers.d/dohub-avahi << 'SUDOEOF'
# DoHub: AirPrint service file management
dohub ALL=(root) NOPASSWD: /bin/systemctl reload avahi-daemon
dohub ALL=(root) NOPASSWD: /bin/systemctl start avahi-daemon
dohub ALL=(root) NOPASSWD: /usr/bin/tee /etc/avahi/services/*
dohub ALL=(root) NOPASSWD: /bin/rm -f /etc/avahi/services/*
dohub ALL=(root) NOPASSWD: /usr/bin/killall -HUP avahi-daemon
SUDOEOF
chmod 440 /etc/sudoers.d/dohub-avahi
log "Sudoers-Regel für AirPrint gesetzt"

# ============================================================
section "Python 3 & pip"
# ============================================================
info "Installiere Python 3.11+…"
case $PKG in
  apt)    install_pkg python3 python3-pip python3-venv python3-dev gcc libcups2-dev ;;
  dnf)    install_pkg python3 python3-pip python3-devel gcc cups-devel ;;
  pacman) install_pkg python python-pip ;;
  zypper) install_pkg python3 python3-pip python3-devel gcc cups-devel ;;
esac

PYTHON=$(command -v python3 || command -v python)
PIP=$(command -v pip3 || command -v pip)
log "Python: $($PYTHON --version)"

# ============================================================
section "Node.js installieren (für Frontend-Build)"
# ============================================================
if ! command -v node &>/dev/null || [ "$(node -e 'process.stdout.write(String(parseInt(process.version.slice(1))))')" -lt 18 ]; then
  info "Installiere Node.js 20 LTS…"
  case $PKG in
    apt)
      curl -fsSL https://deb.nodesource.com/setup_20.x | bash - -q
      install_pkg nodejs
      ;;
    dnf)
      curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
      install_pkg nodejs
      ;;
    pacman)
      install_pkg nodejs npm
      ;;
    zypper)
      install_pkg nodejs20 npm20 2>/dev/null || install_pkg nodejs npm
      ;;
  esac
else
  info "Node.js bereits installiert: $(node --version)"
fi
log "Node.js: $(node --version)"

# ============================================================
section "Nginx installieren (Reverse Proxy)"
# ============================================================
info "Installiere Nginx…"
case $PKG in
  apt)    install_pkg nginx ;;
  dnf)    install_pkg nginx ;;
  pacman) install_pkg nginx ;;
  zypper) install_pkg nginx ;;
esac
log "Nginx installiert"

# ============================================================
section "DoHub-System-User anlegen"
# ============================================================
if ! id "$DOHUB_USER" &>/dev/null; then
  useradd --system --no-create-home --shell /bin/false \
    --comment "DoHub Service User" "$DOHUB_USER"
  log "System-User '$DOHUB_USER' erstellt"
else
  info "System-User '$DOHUB_USER' existiert bereits"
fi

# Gruppen für CUPS, SANE, USB
for GRP in lpadmin scanner lp netdev; do
  if getent group "$GRP" &>/dev/null; then
    usermod -aG "$GRP" "$DOHUB_USER"
    log "User zur Gruppe '$GRP' hinzugefügt"
  fi
done

# ============================================================
section "DoHub-Dateien installieren"
# ============================================================
info "Kopiere nach $DOHUB_DIR…"
mkdir -p "$DOHUB_DIR"
cp -r "$SOURCE_DIR/backend"  "$DOHUB_DIR/"
cp -r "$SOURCE_DIR/frontend" "$DOHUB_DIR/"
[ -f "$SOURCE_DIR/nginx.conf" ] && cp "$SOURCE_DIR/nginx.conf" "$DOHUB_DIR/"
log "Dateien kopiert"

# ── Python venv + Abhängigkeiten ─────────────────────────────
section "Python-Abhängigkeiten installieren"
info "Erstelle virtuelle Python-Umgebung…"
$PYTHON -m venv "$DOHUB_DIR/venv"
VENV_PIP="$DOHUB_DIR/venv/bin/pip"
VENV_PYTHON="$DOHUB_DIR/venv/bin/python"

info "Installiere Backend-Pakete (pycups, python-sane, FastAPI, …)…"
"$VENV_PIP" install --upgrade pip -q
"$VENV_PIP" install -r "$DOHUB_DIR/backend/requirements.txt" -q
log "Python-Pakete installiert"

# ── Frontend bauen ───────────────────────────────────────────
section "Frontend bauen (npm build)"
info "npm install…"
cd "$DOHUB_DIR/frontend"
npm install --silent
info "npm run build…"
npm run build
log "Frontend gebaut → dist/"

# ── Berechtigungen ───────────────────────────────────────────
chown -R "$DOHUB_USER:$DOHUB_USER" "$DOHUB_DIR"
# Backend muss CUPS-Socket lesen/schreiben können
chmod 755 "$DOHUB_DIR"

# ============================================================
section "Systemd-Services einrichten"
# ============================================================

# ── Backend-Service ──────────────────────────────────────────
cat > /etc/systemd/system/dohub-backend.service << EOF
[Unit]
Description=DoHub Backend (FastAPI)
After=network.target cups.service avahi-daemon.service
Wants=cups.service avahi-daemon.service

[Service]
Type=simple
User=$DOHUB_USER
Group=$DOHUB_USER
WorkingDirectory=$DOHUB_DIR/backend
ExecStart=$DOHUB_DIR/venv/bin/uvicorn main:app --host 127.0.0.1 --port $BACKEND_PORT
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal
SyslogIdentifier=dohub-backend

# CUPS-Socket-Zugriff
SupplementaryGroups=lpadmin lp scanner netdev
ReadWritePaths=/var/run/cups /tmp /run/avahi-daemon
Environment=PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin

[Install]
WantedBy=multi-user.target
EOF

log "Backend-Service erstellt"

# ── Nginx-Konfiguration ──────────────────────────────────────
cat > /etc/nginx/sites-available/dohub << EOF
server {
    listen $PROXY_PORT;
    server_name _;

    # API + WebSocket → FastAPI Backend
    location /api/ {
        proxy_pass http://127.0.0.1:$BACKEND_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_read_timeout 300s;
        proxy_send_timeout 300s;
    }

    # Statisches Frontend (React-Build)
    location / {
        root $DOHUB_DIR/frontend/dist;
        index index.html;
        try_files \$uri \$uri/ /index.html;
        expires 1h;
        add_header Cache-Control "public, no-transform";
    }

    # Gzip
    gzip on;
    gzip_types text/plain text/css application/json application/javascript;
}
EOF

# Symlink aktivieren (Debian/Ubuntu)
if [ -d /etc/nginx/sites-enabled ]; then
  ln -sf /etc/nginx/sites-available/dohub /etc/nginx/sites-enabled/dohub
  # Default-Site deaktivieren falls vorhanden
  rm -f /etc/nginx/sites-enabled/default
fi

# Für RPM-basierte Systeme (Fedora etc.) direkt in conf.d
if [ -d /etc/nginx/conf.d ] && [ ! -d /etc/nginx/sites-enabled ]; then
  cp /etc/nginx/sites-available/dohub /etc/nginx/conf.d/dohub.conf
fi

nginx -t && log "Nginx-Konfiguration gültig" || error "Nginx-Konfiguration fehlerhaft"

# ── Services aktivieren & starten ────────────────────────────
section "Services starten"

systemctl daemon-reload

systemctl enable dohub-backend --now
log "dohub-backend gestartet"

systemctl enable nginx --now
systemctl restart nginx
log "Nginx gestartet"

# ── Vite-Config für Produktion patchen ───────────────────────
# Im Build wurde /api/ bereits korrekt als Prefix genutzt – kein Proxy nötig
# Aber wir müssen sicherstellen dass die API-URL im Build korrekt ist
if grep -q "localhost:8000" "$DOHUB_DIR/frontend/src/api.js" 2>/dev/null; then
  warn "api.js verweist noch auf localhost:8000 – wird für Produktion gepatcht"
  # Im Prod-Build läuft alles über /api/ relativ – bereits korrekt im Code
fi

# ============================================================
section "Firewall (optional)"
# ============================================================
if command -v ufw &>/dev/null && ufw status | grep -q "Status: active"; then
  ufw allow $PROXY_PORT/tcp comment "DoHub Web-UI" 2>/dev/null || true
  ufw allow 631/tcp comment "CUPS" 2>/dev/null || true
  log "UFW-Regeln für Port $PROXY_PORT und 631 hinzugefügt"
elif command -v firewall-cmd &>/dev/null; then
  firewall-cmd --permanent --add-port=$PROXY_PORT/tcp 2>/dev/null || true
  firewall-cmd --permanent --add-service=ipp 2>/dev/null || true
  firewall-cmd --reload 2>/dev/null || true
  log "firewalld-Regeln gesetzt"
fi

# ============================================================
section "Health Check"
# ============================================================
info "Warte auf Backend…"
sleep 4

HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:$BACKEND_PORT/api/status" 2>/dev/null || echo "000")
if [ "$HTTP_CODE" = "200" ]; then
  log "Backend antwortet (HTTP $HTTP_CODE)"
else
  warn "Backend antwortet noch nicht (HTTP $HTTP_CODE) – evtl. noch beim Starten"
fi

HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:$PROXY_PORT/" 2>/dev/null || echo "000")
if [ "$HTTP_CODE" = "200" ]; then
  log "Web-UI erreichbar (HTTP $HTTP_CODE)"
else
  warn "Web-UI antwortet noch nicht (HTTP $HTTP_CODE)"
fi

# ============================================================
# Abschluss
# ============================================================
LOCAL_IP=$(hostname -I | awk '{print $1}')

echo -e "
${BOLD}${GREEN}
╔══════════════════════════════════════════════════════╗
║          DoHub erfolgreich installiert!           ║
╚══════════════════════════════════════════════════════╝${NC}

  ${BOLD}Web-UI:${NC}         ${CYAN}http://$LOCAL_IP:$PROXY_PORT${NC}
  ${BOLD}API-Docs:${NC}        ${CYAN}http://$LOCAL_IP:$BACKEND_PORT/docs${NC}
  ${BOLD}CUPS-UI:${NC}         ${CYAN}http://$LOCAL_IP:631${NC}

  ${BOLD}Service-Befehle:${NC}
    sudo systemctl status  dohub-backend
    sudo systemctl restart dohub-backend
    sudo systemctl stop    dohub-backend

    sudo journalctl -u dohub-backend -f   ${YELLOW}# Live-Logs${NC}

  ${BOLD}Deinstallieren:${NC}
    sudo bash $SCRIPT_DIR/uninstall.sh
"
