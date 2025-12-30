#!/bin/bash
# Krooster Production Deployment Script
# Deploys to production server via Tailscale after local tests pass

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

PROD_HOST="100.75.166.67"  # mamouth via Tailscale
PROD_USER="root"
PROD_DIR="/opt/krooster"
BRANCH="${1:-main}"

echo -e "${YELLOW}=== Krooster Deployment Script ===${NC}"
echo "Target: $PROD_HOST"
echo "Branch: $BRANCH"
echo ""

# Step 1: Run local tests
echo -e "${YELLOW}Step 1: Running local tests...${NC}"
cd /home/tarpediem/src/krooster/frontend

# TypeScript check
echo "  - TypeScript compilation..."
npm run build > /dev/null 2>&1 && echo -e "    ${GREEN}✓ TypeScript OK${NC}" || { echo -e "    ${RED}✗ TypeScript failed${NC}"; exit 1; }

# Step 2: Git status check
echo -e "${YELLOW}Step 2: Checking git status...${NC}"
cd /home/tarpediem/src/krooster
if [[ -n $(git status --porcelain) ]]; then
    echo -e "  ${RED}Uncommitted changes detected. Please commit first.${NC}"
    git status --short
    read -p "Continue anyway? (y/N): " confirm
    if [[ $confirm != "y" && $confirm != "Y" ]]; then
        exit 1
    fi
fi

# Step 3: Push to GitHub
echo -e "${YELLOW}Step 3: Pushing to GitHub...${NC}"
git push origin $BRANCH 2>/dev/null && echo -e "  ${GREEN}✓ Pushed to GitHub${NC}" || echo -e "  ${YELLOW}! Already up to date${NC}"

# Step 4: Deploy to production
echo -e "${YELLOW}Step 4: Deploying to production...${NC}"

ssh $PROD_USER@$PROD_HOST << 'ENDSSH'
set -e
cd /opt/krooster

echo "  - Pulling latest changes..."
git fetch origin
git reset --hard origin/main

echo "  - Rebuilding containers..."
docker-compose down
docker-compose build --no-cache frontend
docker-compose up -d

echo "  - Waiting for services..."
sleep 10

# Health check
if curl -s http://localhost:3000 > /dev/null; then
    echo "  ✓ Frontend is healthy"
else
    echo "  ✗ Frontend health check failed"
    docker-compose logs frontend --tail 20
    exit 1
fi

if curl -s http://localhost:5678/healthz > /dev/null; then
    echo "  ✓ n8n is healthy"
else
    echo "  ✗ n8n health check failed"
fi

echo "Deployment complete!"
ENDSSH

echo ""
echo -e "${GREEN}=== Deployment Complete ===${NC}"
echo "Production URL: http://$PROD_HOST:3000"
echo "n8n URL: http://$PROD_HOST:5678"
