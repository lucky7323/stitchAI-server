#!/bin/bash
set -e

if [ $# -lt 4 ]; then
  echo "Usage: $0 <TELEGRAM_BOT_TOKEN> <AGENT_NAME> <DESCRIPTION> <SOCIAL_LINK>"
  exit 1
fi

TELEGRAM_BOT_TOKEN="$1"
AGENT_NAME="$2"
DESCRIPTION="$3"
SOCIAL_LINK="$4"

# .env 파일에서 OpenAI API 키 로드
if [ -f ".env" ]; then
  source .env
else
  echo "오류: .env 파일을 찾을 수 없습니다. 다음 형식으로 .env 파일을 만들어주세요:"
  echo "OPENAI_API_KEY=your_openai_api_key"
  exit 1
fi

# API 키가 제대로 로드되었는지 확인
if [ -z "$OPENAI_API_KEY" ]; then
  echo "오류: OPENAI_API_KEY가 .env 파일에 설정되지 않았습니다."
  exit 1
fi

# ===== 설정 변수 =====
PROJECT_ID="stitch-ai-451906"               # gcloud 프로젝트 ID
ZONE="us-central1-f"                        # VM 인스턴스 생성 zone
INSTANCE_NAME="eliza-agent-$(date +%s)"     # 고유 인스턴스 이름 (타임스탬프 활용)
MACHINE_TYPE="n2-highmem-8"                 # 머신 타입
IMAGE_FAMILY="ubuntu-2204-lts"              # Ubuntu 이미지 패밀리
IMAGE_PROJECT="ubuntu-os-cloud"             # Ubuntu 이미지 프로젝트
BOOT_DISK_SIZE="100GB"                      # 부팅 디스크 크기
FIREWALL_RULE_NAME="allow-eliza-agent-ports"
# 사용할 포트: 3000, 5173, 5432(PostgreSQL) (각각 tcp 프로토콜)
ALLOWED_PORTS=("tcp:3000" "tcp:5173")

# ===== gcloud 프로젝트 설정 =====
echo "프로젝트를 ${PROJECT_ID}로 설정합니다..."
gcloud config set project "${PROJECT_ID}"

# ===== 방화벽 규칙 생성 (필요시) =====
echo "포트 3000, 5173에 대한 방화벽 규칙을 확인합니다..."
if ! gcloud compute firewall-rules list --filter="name=${FIREWALL_RULE_NAME}" --format="value(name)" | grep -q "${FIREWALL_RULE_NAME}"; then
  echo "방화벽 규칙이 없으므로 생성합니다..."
  gcloud compute firewall-rules create "${FIREWALL_RULE_NAME}" \
    --allow="${ALLOWED_PORTS[0]},${ALLOWED_PORTS[1]}" \
    --description="Allow traffic on ports 3000, 5173"
else
  echo "이미 방화벽 규칙이 존재합니다."
fi

# ===== startup script 파일 생성 =====
echo "startup script 파일을 생성합니다..."
cat > startup.sh << EOF
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
echo ">>> Running as \$(whoami), HOME: \$HOME"

# nvm 설치 (없으면 설치)
if [ ! -d "\$HOME/.nvm" ]; then
  echo ">>> Installing nvm..."
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.1/install.sh | bash
fi

# nvm 환경 로드
export NVM_DIR="\$HOME/.nvm"
[ -s "\$NVM_DIR/nvm.sh" ] && . "\$NVM_DIR/nvm.sh"

# Node.js 23 설치 및 사용
nvm install v23.3.0
nvm use v23.3.0
echo "Node 버전: \$(node -v)"
echo "npm 버전: \$(npm -v)"

# pnpm 글로벌 설치
npm install -g pnpm@9.15.1
echo "pnpm 버전: \$(pnpm -v)"

# 작업 디렉토리 이동 및 리포지토리 클론
cd /home/ubuntu
if [ ! -d "eliza" ]; then
  echo ">>> Cloning eliza repository..."
  git clone https://github.com/lucky7323/eliza.git
fi
cd eliza
#git checkout \$(git describe --tags --abbrev=0)
git submodule update --init

echo ">>> Updating character.json file to enable telegram client..."
sed -i 's/{{agent_name}}/${AGENT_NAME}/g' characters/character.json
sed -i 's/{{description}}/${DESCRIPTION}/g' characters/character.json
sed -i 's/{{social_link}}/${SOCIAL_LINK}/g' characters/character.json
sed -i 's/"clients": \[\]/"clients": \["telegram"\]/' characters/character.json

# .env 파일 생성 및 환경 변수 설정
if [ ! -f ".env" ]; then
  echo ">>> Creating .env file from .env.example..."
  cp .env.example .env
  sed -i "s/OPENAI_API_KEY=.*/OPENAI_API_KEY=${OPENAI_API_KEY}/" .env
  sed -i "s/TELEGRAM_BOT_TOKEN.*/TELEGRAM_BOT_TOKEN=${TELEGRAM_BOT_TOKEN}/" .env
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
ExecStart=/bin/bash -c 'export NVM_DIR="/home/ubuntu/.nvm"; [ -s "\$NVM_DIR/nvm.sh" ] && . "\$NVM_DIR/nvm.sh"; cd /home/ubuntu/eliza && NODE_OPTIONS="--max-old-space-size=16384" pnpm start --character="/home/ubuntu/eliza/characters/character.json"'
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
EOF

chmod +x startup.sh

# ===== VM 인스턴스 생성 및 startup script 파일 지정 =====
echo "인스턴스 ${INSTANCE_NAME}를 생성합니다..."
gcloud compute instances create "${INSTANCE_NAME}" \
  --zone="${ZONE}" \
  --machine-type="${MACHINE_TYPE}" \
  --boot-disk-size="${BOOT_DISK_SIZE}" \
  --image-family="${IMAGE_FAMILY}" \
  --image-project="${IMAGE_PROJECT}" \
  --metadata-from-file startup-script=startup.sh

echo "인스턴스 생성 및 startup script 설정 완료."
echo "Eliza agent server는 생성된 인스턴스에서 자동으로 실행됩니다."