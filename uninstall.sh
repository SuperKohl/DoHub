#!/bin/bash
set -e

DOHUB_DIR="/opt/dohub"
DOHUB_USER="dohub"

RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

if [[ $EUID -ne 0 ]]; then
  echo -e "${RED}[✗]${NC} Bitte als root ausführen: sudo bash uninstall.sh"
  exit 1
fi

echo -e "\n${BOLD}${RED}DoHub Deinstallation${NC}"
read -p "Wirklich deinstallieren? CUPS und SANE bleiben erhalten. [y/N] " -n 1 -r
echo
[[ ! $REPLY =~ ^[Yy]$ ]] && echo "Abgebrochen." && exit 0

echo -e "${CYAN}[→]${NC} Stoppe Services…"
systemctl stop  dohub-backend 2>/dev/null || true
systemctl disable dohub-backend 2>/dev/null || true

echo -e "${CYAN}[→]${NC} Entferne Service-Dateien…"
rm -f /etc/systemd/system/dohub-backend.service
systemctl daemon-reload

echo -e "${CYAN}[→]${NC} Entferne Nginx-Konfiguration…"
rm -f /etc/nginx/sites-enabled/dohub
rm -f /etc/nginx/sites-available/dohub
rm -f /etc/nginx/conf.d/dohub.conf
systemctl restart nginx 2>/dev/null || true

echo -e "${CYAN}[→]${NC} Entferne Installationsverzeichnis…"
rm -rf "$DOHUB_DIR"

echo -e "${CYAN}[→]${NC} Entferne System-User '$DOHUB_USER'…"
userdel "$DOHUB_USER" 2>/dev/null || true

echo -e "${GREEN}[✓]${NC} DoHub wurde entfernt. CUPS, SANE und Avahi sind weiterhin aktiv."
