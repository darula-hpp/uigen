#!/bin/bash

# End-to-End Test Runner Script
# This script helps set up and run E2E tests with the real backend

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
BACKEND_DIR="../../../examples/apps/fastapi/meeting-minutes"
BACKEND_URL="${BACKEND_URL:-http://localhost:8000}"
FRONTEND_URL="${FRONTEND_URL:-http://localhost:5173}"
TEST_USERNAME="${TEST_USERNAME:-e2e_test_user}"
TEST_PASSWORD="${TEST_PASSWORD:-e2e_test_pass_123}"
TEST_EMAIL="${TEST_EMAIL:-e2e_test@example.com}"

echo -e "${GREEN}=== Profile View E2E Test Runner ===${NC}\n"

# Function to check if a service is running
check_service() {
    local url=$1
    local name=$2
    
    if curl -s -f -o /dev/null "$url"; then
        echo -e "${GREEN}✓${NC} $name is running at $url"
        return 0
    else
        echo -e "${RED}✗${NC} $name is not running at $url"
        return 1
    fi
}

# Function to create test user
create_test_user() {
    echo -e "\n${YELLOW}Creating test user...${NC}"
    
    response=$(curl -s -w "\n%{http_code}" -X POST "$BACKEND_URL/api/v1/auth/register" \
        -H "Content-Type: application/json" \
        -d "{\"username\":\"$TEST_USERNAME\",\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}")
    
    http_code=$(echo "$response" | tail -n1)
    
    if [ "$http_code" = "200" ] || [ "$http_code" = "201" ]; then
        echo -e "${GREEN}✓${NC} Test user created successfully"
    elif [ "$http_code" = "409" ]; then
        echo -e "${YELLOW}!${NC} Test user already exists (this is okay)"
    else
        echo -e "${RED}✗${NC} Failed to create test user (HTTP $http_code)"
        echo "$response" | head -n-1
        return 1
    fi
}

# Check prerequisites
echo -e "${YELLOW}Checking prerequisites...${NC}\n"

# Check if backend is running
if ! check_service "$BACKEND_URL/health" "Backend"; then
    echo -e "\n${YELLOW}Backend is not running. Would you like to start it? (y/n)${NC}"
    read -r start_backend
    
    if [ "$start_backend" = "y" ]; then
        echo -e "${YELLOW}Starting backend...${NC}"
        cd "$BACKEND_DIR"
        
        # Check if venv exists
        if [ ! -d "venv" ]; then
            echo -e "${RED}✗${NC} Virtual environment not found. Please run:"
            echo "  cd $BACKEND_DIR"
            echo "  python -m venv venv"
            echo "  source venv/bin/activate"
            echo "  pip install -r requirements.txt"
            exit 1
        fi
        
        # Activate venv and start server in background
        source venv/bin/activate
        uvicorn app.main:app --port 8000 &
        BACKEND_PID=$!
        
        echo -e "${YELLOW}Waiting for backend to start...${NC}"
        sleep 5
        
        if ! check_service "$BACKEND_URL/health" "Backend"; then
            echo -e "${RED}✗${NC} Failed to start backend"
            exit 1
        fi
    else
        echo -e "${RED}Backend is required for E2E tests. Exiting.${NC}"
        exit 1
    fi
fi

# Check if frontend is running
if ! check_service "$FRONTEND_URL" "Frontend"; then
    echo -e "\n${YELLOW}Frontend is not running. Would you like to start it? (y/n)${NC}"
    read -r start_frontend
    
    if [ "$start_frontend" = "y" ]; then
        echo -e "${YELLOW}Starting frontend...${NC}"
        cd "$(dirname "$0")/.."
        pnpm dev &
        FRONTEND_PID=$!
        
        echo -e "${YELLOW}Waiting for frontend to start...${NC}"
        sleep 5
        
        if ! check_service "$FRONTEND_URL" "Frontend"; then
            echo -e "${RED}✗${NC} Failed to start frontend"
            exit 1
        fi
    else
        echo -e "${RED}Frontend is required for E2E tests. Exiting.${NC}"
        exit 1
    fi
fi

# Create test user
create_test_user

# Check if Playwright is installed
echo -e "\n${YELLOW}Checking Playwright installation...${NC}"
cd "$(dirname "$0")/.."

if ! npx playwright --version > /dev/null 2>&1; then
    echo -e "${YELLOW}Playwright not found. Installing...${NC}"
    pnpm add -D @playwright/test
    npx playwright install
fi

# Run tests
echo -e "\n${GREEN}=== Running E2E Tests ===${NC}\n"

export BACKEND_URL
export FRONTEND_URL
export TEST_USERNAME
export TEST_PASSWORD
export TEST_EMAIL

npx playwright test e2e/profile-real-backend.spec.ts "$@"

TEST_EXIT_CODE=$?

# Cleanup
if [ -n "$BACKEND_PID" ]; then
    echo -e "\n${YELLOW}Stopping backend...${NC}"
    kill $BACKEND_PID 2>/dev/null || true
fi

if [ -n "$FRONTEND_PID" ]; then
    echo -e "${YELLOW}Stopping frontend...${NC}"
    kill $FRONTEND_PID 2>/dev/null || true
fi

# Show results
echo -e "\n${GREEN}=== Test Results ===${NC}"
if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}✓ All tests passed!${NC}"
else
    echo -e "${RED}✗ Some tests failed${NC}"
    echo -e "\nView the test report:"
    echo -e "  npx playwright show-report"
fi

exit $TEST_EXIT_CODE
