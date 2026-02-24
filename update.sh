#!/bin/bash
set -e

DOHUB_DIR="/opt/dohub"
DOHUB_USER="dohub"

GREEN='\033[0;32m'; CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'

if [[ $EUID -ne 0 ]]; then echo "Bitte als root ausführen: sudo bash update.sh"; exit 1; fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if   [ -d "$SCRIPT_DIR/dohub" ];         then SOURCE_DIR="$SCRIPT_DIR/dohub"
elif [ -f "$SCRIPT_DIR/backend/main.py" ];  then SOURCE_DIR="$SCRIPT_DIR"
else echo "Quellcode nicht gefunden."; exit 1; fi

echo -e "\n${BOLD}${CYAN}DoHub Update${NC}"

echo -e "${CYAN}[→]${NC} Stoppe Backend…"
systemctl stop dohub-backend

echo -e "${CYAN}[→]${NC} Kopiere neue Dateien…"
cp -r "$SOURCE_DIR/backend/"  "$DOHUB_DIR/backend/"
cp -r "$SOURCE_DIR/frontend/" "$DOHUB_DIR/frontend/"

echo -e "${CYAN}[→]${NC} Aktualisiere Python-Pakete…"
"$DOHUB_DIR/venv/bin/pip" install -r "$DOHUB_DIR/backend/requirements.txt" -q

echo -e "${CYAN}[→]${NC} Baue Frontend neu…"
cd "$DOHUB_DIR/frontend"
npm install --silent
npm run build

chown -R "$DOHUB_USER:$DOHUB_USER" "$DOHUB_DIR"

echo -e "${CYAN}[→]${NC} Starte Backend neu…"
systemctl start dohub-backend
sleep 2

HTTP=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/api/status 2>/dev/null || echo "000")
if [ "$HTTP" = "200" ]; then echo -e "${GREEN}[✓]${NC} Backend läuft (HTTP 200)"
else echo -e "\033[1;33m[!]\033[0m Backend antwortet noch nicht (HTTP $HTTP)"; fi

echo -e "${GREEN}[✓]${NC} Update abgeschlossen."
