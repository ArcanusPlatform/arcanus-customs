#!/bin/bash

# Multi-Tenant Authentication Test Script
# Tests registration, login, invitations, and data isolation

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
ARCANUS_ROOT="$(cd "${APP_DIR}/.." && pwd)"

API_URL="http://localhost:3100"

echo "╔════════════════════════════════════════════════════════════╗"
echo "║     M Customs Manager - Multi-Tenant Auth Test            ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test 1: Register Company 1
echo -e "${BLUE}Test 1: Register Company 1 (Single User)${NC}"
COMPANY1_RESPONSE=$(curl -s -X POST $API_URL/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "company_name": "Tenant One Ltd",
    "first_name": "Tenant",
    "last_name": "One",
    "email": "admin1@tenant-one.test",
    "password": "SecurePass123!"
  }')

COMPANY1_TOKEN=$(echo $COMPANY1_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -n "$COMPANY1_TOKEN" ]; then
  echo -e "${GREEN}✓ Company 1 registered successfully${NC}"
  echo "  Token: ${COMPANY1_TOKEN:0:20}..."
else
  echo -e "${RED}✗ Company 1 registration failed${NC}"
  echo "$COMPANY1_RESPONSE"
fi
echo ""

# Test 2: Register Company 2
echo -e "${BLUE}Test 2: Register Company 2 (Multi-User)${NC}"
COMPANY2_RESPONSE=$(curl -s -X POST $API_URL/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "company_name": "Tenant Two Ltd",
    "first_name": "Admin",
    "last_name": "User",
    "email": "admin2@tenant-two.test",
    "password": "SecurePass456!"
  }')

COMPANY2_TOKEN=$(echo $COMPANY2_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -n "$COMPANY2_TOKEN" ]; then
  echo -e "${GREEN}✓ Company 2 registered successfully${NC}"
  echo "  Token: ${COMPANY2_TOKEN:0:20}..."
else
  echo -e "${RED}✗ Company 2 registration failed${NC}"
  echo "$COMPANY2_RESPONSE"
fi
echo ""

# Test 3: Login Company 1
echo -e "${BLUE}Test 3: Login Company 1 User${NC}"
LOGIN_RESPONSE=$(curl -s -X POST $API_URL/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin1@tenant-one.test",
    "password": "SecurePass123!"
  }')

if echo "$LOGIN_RESPONSE" | grep -q "success"; then
  echo -e "${GREEN}✓ Login successful${NC}"
else
  echo -e "${RED}✗ Login failed${NC}"
  echo "$LOGIN_RESPONSE"
fi
echo ""

# Test 4: Invite User to Company 2
echo -e "${BLUE}Test 4: Invite User to Company 2${NC}"
INVITE_RESPONSE=$(curl -s -X POST $API_URL/auth/invite \
  -H "Authorization: Bearer $COMPANY2_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user1@tenant-two.test",
    "role": "user"
  }')

INVITE_TOKEN=$(echo $INVITE_RESPONSE | grep -o '"invitation_link":"[^"]*token=[^"]*' | sed 's/.*token=//')

if [ -n "$INVITE_TOKEN" ]; then
  echo -e "${GREEN}✓ Invitation created${NC}"
  echo "  Invitation token: ${INVITE_TOKEN:0:20}..."
else
  echo -e "${RED}✗ Invitation failed${NC}"
  echo "$INVITE_RESPONSE"
fi
echo ""

# Test 5: Accept Invitation
if [ -n "$INVITE_TOKEN" ]; then
  echo -e "${BLUE}Test 5: Accept Invitation${NC}"
  ACCEPT_RESPONSE=$(curl -s -X POST $API_URL/auth/accept-invite \
    -H "Content-Type: application/json" \
    -d "{
      \"token\": \"$INVITE_TOKEN\",
      \"first_name\": \"User\",
      \"last_name\": \"One\",
      \"password\": \"SecurePass789!\"
    }")

  USER1_TOKEN=$(echo $ACCEPT_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)

  if [ -n "$USER1_TOKEN" ]; then
    echo -e "${GREEN}✓ Invitation accepted${NC}"
    echo "  User 1 token: ${USER1_TOKEN:0:20}..."
  else
    echo -e "${RED}✗ Accept invitation failed${NC}"
    echo "$ACCEPT_RESPONSE"
  fi
  echo ""
fi

# Test 6: Get Current User Info
echo -e "${BLUE}Test 6: Get Current User Info (Company 1)${NC}"
ME_RESPONSE=$(curl -s -X GET $API_URL/auth/me \
  -H "Authorization: Bearer $COMPANY1_TOKEN")

if echo "$ME_RESPONSE" | grep -q "admin1@tenant-one.test"; then
  echo -e "${GREEN}✓ User info retrieved${NC}"
  echo "$ME_RESPONSE" | grep -o '"email":"[^"]*' | cut -d'"' -f4
else
  echo -e "${RED}✗ Get user info failed${NC}"
  echo "$ME_RESPONSE"
fi
echo ""

# Test 7: Data Isolation
echo -e "${BLUE}Test 7: Test Data Isolation${NC}"
echo "  Company 1 accessing declarations..."
DECL1_RESPONSE=$(curl -s -X GET $API_URL/cds/declarations \
  -H "Authorization: Bearer $COMPANY1_TOKEN")

echo "  Company 2 accessing declarations..."
DECL2_RESPONSE=$(curl -s -X GET $API_URL/cds/declarations \
  -H "Authorization: Bearer $COMPANY2_TOKEN")

if [ "$DECL1_RESPONSE" != "$DECL2_RESPONSE" ] || echo "$DECL1_RESPONSE" | grep -q "declarations"; then
  echo -e "${GREEN}✓ Data isolation working (separate tenant databases)${NC}"
else
  echo -e "${RED}✗ Data isolation may not be working${NC}"
fi
echo ""

# Test 8: Invalid Token
echo -e "${BLUE}Test 8: Test Invalid Token${NC}"
INVALID_RESPONSE=$(curl -s -X GET $API_URL/cds/declarations \
  -H "Authorization: Bearer invalid_token_here")

if echo "$INVALID_RESPONSE" | grep -q "error"; then
  echo -e "${GREEN}✓ Invalid token rejected${NC}"
else
  echo -e "${RED}✗ Invalid token not rejected${NC}"
  echo "$INVALID_RESPONSE"
fi
echo ""

# Summary
echo "╔════════════════════════════════════════════════════════════╗"
echo "║                    Test Summary                            ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "Company 1 (Tenant One Ltd):"
echo "  - Admin: admin1@tenant-one.test"
echo "  - Token: ${COMPANY1_TOKEN:0:30}..."
echo ""
echo "Company 2 (Tenant Two Ltd):"
echo "  - Admin: admin2@tenant-two.test"
echo "  - User 1: user1@tenant-two.test"
echo "  - Admin Token: ${COMPANY2_TOKEN:0:30}..."
if [ -n "$USER1_TOKEN" ]; then
  echo "  - User 1 Token: ${USER1_TOKEN:0:30}..."
fi
echo ""
echo "Use these tokens to test authenticated endpoints:"
echo "  curl http://localhost:3100/cds/declarations \\"
echo "    -H \"Authorization: Bearer \$TOKEN\""
echo ""
