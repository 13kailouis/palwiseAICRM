#!/usr/bin/env bash
#
# Siapkan VPS Ubuntu kosong untuk Palwise.
#
# Jalankan sebagai root di server yang baru:
#
#   bash pasang-server.sh
#
# Atau, karena kodenya belum ada di server waktu langkah ini dikerjakan, salin
# tempel isinya ke terminal. Berkas ini tetap disimpan di repo supaya kalau
# suatu hari servernya diganti, tidak ada yang perlu diingat lagi.
#
# YANG TIDAK DIKERJAKAN SKRIP INI, dan itu disengaja:
#
#   - Mematikan login SSH pakai password. Itu pengaman terpenting di seluruh
#     pemasangan, TAPI kalau dijalankan sebelum kunci SSH-mu terbukti bisa
#     masuk, kamu mengunci diri sendiri di luar servermu sendiri dan satu-satunya
#     jalan masuk tinggal konsol darurat penyedia VPS. Jadi dia sengaja
#     dikerjakan manual, sesudah kamu membuktikan kuncinya jalan. Perintahnya
#     dicetak di akhir skrip ini.
#   - Menyentuh berkas Palwise, database, atau .env. Skrip ini cuma menyiapkan
#     sistemnya.
#
# Aman dijalankan berulang kali. Tiap bagian memeriksa dirinya dulu.

set -euo pipefail

if [ "$(id -u)" -ne 0 ]; then
  echo "Jalankan sebagai root: sudo bash pasang-server.sh"
  exit 1
fi

garis() { echo; echo "── $1"; }

garis "1/5 Paket dasar"
apt-get update -qq
# rsync dipasang di sini karena dia yang dipakai mengirim kode dari laptop, dan
# Ubuntu minimal sering tidak membawanya.
apt-get install -y -qq curl git ca-certificates gnupg debian-keyring \
  debian-archive-keyring apt-transport-https fail2ban

garis "2/5 Node.js 20"
if command -v node >/dev/null 2>&1 && node -v | grep -qE '^v(2[0-9]|[3-9][0-9])'; then
  echo "sudah ada: $(node -v)"
else
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y -qq nodejs
  echo "terpasang: $(node -v)"
fi

if command -v pm2 >/dev/null 2>&1; then
  echo "pm2 sudah ada"
else
  npm install -g pm2 --silent
  echo "pm2 terpasang"
fi

garis "3/5 Caddy"
if command -v caddy >/dev/null 2>&1; then
  echo "sudah ada: $(caddy version | head -1)"
else
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' \
    | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' \
    > /etc/apt/sources.list.d/caddy-stable.list
  apt-get update -qq
  apt-get install -y -qq caddy
  echo "terpasang: $(caddy version | head -1)"
fi

garis "4/5 Firewall"
# Porta 4000 SENGAJA tidak dibuka. Di baliknya ada kemampuan mengirim WhatsApp
# atas nama pelanggan dan membaca lampiran mereka. Cukup dashboard yang
# menghubunginya, dan itu terjadi di dalam server.
ufw allow 22 >/dev/null
ufw allow 80 >/dev/null
ufw allow 443 >/dev/null
ufw --force enable >/dev/null
ufw status | head -8

garis "5/5 Swap 2 GB"
# Di VPS 2 GB, "npm run build" sering mati sendiri dengan pesan "Killed", dan itu
# terbaca seperti bug padahal cuma kehabisan memori.
if swapon --show | grep -q '/swapfile'; then
  echo "swap sudah aktif"
else
  fallocate -l 2G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile >/dev/null
  swapon /swapfile
  grep -q '/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
  echo "swap 2 GB aktif"
fi

echo
echo "═══════════════════════════════════════════════════════════"
echo "Server siap. Node $(node -v), pm2, Caddy, firewall, swap."
echo
echo "BERIKUTNYA, di server ini juga, ambil kodenya:"
echo
echo "  git clone https://github.com/13kailouis/palwiseAICRM.git /opt/palwise"
echo "  cd /opt/palwise && npm install && cp .env.example .env"
echo "  mkdir -p data/log data/media data/wa-sessions data/cadangan"
echo
echo "SESUDAH kunci SSH-mu terbukti bisa masuk, keraskan SSH-nya:"
echo
echo "  sed -i 's/^#*PasswordAuthentication.*/PasswordAuthentication no/;" \
     "s/^#*PermitRootLogin.*/PermitRootLogin prohibit-password/' \\"
echo "    /etc/ssh/sshd_config && systemctl restart ssh"
echo
echo "JANGAN jalankan yang itu sebelum kuncinya terbukti jalan."
echo "═══════════════════════════════════════════════════════════"
