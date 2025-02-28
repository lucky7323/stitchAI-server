#!/bin/bash
set -e
echo ">>> Startup script 시작 (루트로 실행 중)"

# 루트로 필수 패키지 설치
apt-get update
apt-get install -y curl git build-essential pkg-config libopus-dev libudev-dev libusb-1.0-0-dev sqlite3

# /home/ubuntu 디렉토리가 있는지 확인하고 소유권 변경
mkdir -p /home/ubuntu
chown ubuntu:ubuntu /home/ubuntu

# 이제 "ubuntu" 사용자 환경에서 에이전트 작업을 수행
su - ubuntu <<'EOF2'
echo ">>> Running as $(whoami), HOME: $HOME"

# nvm 설치 (없으면 설치)
if [ ! -d "$HOME/.nvm" ]; then
  echo ">>> Installing nvm..."
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.1/install.sh | bash
fi

# nvm 환경 로드
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"

# Node.js 23 설치 및 사용
nvm install v23.3.0
nvm use v23.3.0
echo "Node 버전: $(node -v)"
echo "npm 버전: $(npm -v)"

# pnpm 글로벌 설치
npm install -g pnpm@9.15.1
echo "pnpm 버전: $(pnpm -v)"

# 작업 디렉토리 이동 및 리포지토리 클론
cd /home/ubuntu
if [ ! -d "eliza" ]; then
  echo ">>> Cloning eliza repository..."
  git clone https://github.com/lucky7323/eliza.git
fi
cd eliza
#git checkout $(git describe --tags --abbrev=0)
git submodule update --init

echo ">>> Updating dobby.character.json file to enable telegram client..."
sed -i 's/"clients": \[\]/"clients": \["telegram"\]/' characters/dobby.character.json
sed -i '/"Magic (house-elf style)",/d' characters/dobby.character.json
sed -i '/"Creative problem-solving",/d' characters/dobby.character.json
sed -i '/"Protective services",/d' characters/dobby.character.json
sed -i '/"Loyal assistance",/d' characters/dobby.character.json
sed -i '/"Unconventional solutions"/d' characters/dobby.character.json

# .env 파일 생성 및 환경 변수 설정
if [ ! -f ".env" ]; then
  echo ">>> Creating .env file from .env.example..."
  cp .env.example .env
  sed -i "s/OPENAI_API_KEY=.*/OPENAI_API_KEY=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/" .env
  sed -i "s/TELEGRAM_BOT_TOKEN.*/TELEGRAM_BOT_TOKEN=7504658195:AAExQJUiejYffSAMMSCHaWiDVXPx83RYDw/" .env
  sed -i "s/CACHE_STORE.*/CACHE_STORE=filesystem/" .env
fi

echo ">>> Installing dependencies and building..."
pnpm add -w @elizaos/client-telegram
pnpm install
pnpm run build
EOF2

echo ">>> Creating systemd service for pnpm start..."

# systemd 서비스 유닛 파일 생성 (ubuntu 사용자로 실행)
cat > /etc/systemd/system/eliza.service << 'EOL'
[Unit]
Description=Eliza Agent Service
After=network.target

[Service]
User=ubuntu
WorkingDirectory=/home/ubuntu/eliza
ExecStart=/bin/bash -c 'export NVM_DIR="/home/ubuntu/.nvm"; [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"; cd /home/ubuntu/eliza && NODE_OPTIONS="--max-old-space-size=16384" pnpm start --character="/home/ubuntu/eliza/characters/dobby.character.json"'
Restart=always
RestartSec=15
Environment=NODE_ENV=production
Environment=HTTP_PORT=3000

[Install]
WantedBy=multi-user.target
EOL

echo ">>> Reloading systemd daemon..."
systemctl daemon-reload
echo ">>> Enabling and starting eliza service..."
systemctl enable eliza
systemctl start eliza
sleep 1
service eliza restart

echo ">>> Eliza agent service is running on ports 3000 and 5173"
