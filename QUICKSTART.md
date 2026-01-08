# Quick Start Guide

Get the Tempo Tiny Faucet running in 5 minutes.

## Prerequisites

- Node.js 18+ installed
- Redis installed and running
- A Tempo wallet (we'll generate one)

## Setup Steps

### 1. Install Redis

**macOS (using Homebrew):**
```bash
brew install redis
brew services start redis
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt update
sudo apt install redis-server
sudo systemctl start redis
```

**Windows:**
Download from https://redis.io/download or use Docker:
```bash
docker run -d -p 6379:6379 redis:7-alpine
```

**Verify Redis is running:**
```bash
redis-cli ping
# Should respond with "PONG"
```

### 2. Clone and Install

```bash
git clone https://github.com/yourusername/tempo-tiny-faucet.git
cd tempo-tiny-faucet
npm install
```

### 3. Generate a Service Wallet

You need Foundry's `cast` tool for this. Install it if you don't have it:

```bash
# Install Foundry
curl -L https://foundry.paradigm.xyz | bash
foundryup
```

Generate a new wallet:
```bash
cast wallet new
```

This will output something like:
```
Successfully created new keypair.
Address:     0x1234567890abcdef1234567890abcdef12345678
Private key: 0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890
```

**Important:** Save the private key securely!

### 4. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` and add your private key:
```env
PORT=3000
NODE_ENV=development
TEMPO_RPC_URL=https://rpc.moderato.tempo.xyz
SERVICE_WALLET_PRIVATE_KEY=0xYourPrivateKeyHere
REDIS_HOST=localhost
REDIS_PORT=6379
RATE_LIMIT_WINDOW_MS=86400000
RATE_LIMIT_MAX_REQUESTS=3
```

### 5. Start the Service

```bash
npm run dev
```

You should see:
```
Tempo Tiny Faucet started { port: 3000, env: 'development', wallet: '0x...' }
```

### 6. Test It

In a new terminal, test the health endpoint:
```bash
curl http://localhost:3000/api/health
```

Get service info:
```bash
curl http://localhost:3000/api/info
```

Request tokens (replace with your wallet address):
```bash
curl -X POST http://localhost:3000/api/fund \
  -H "Content-Type: application/json" \
  -d '{
    "address": "0xYourWalletAddress",
    "token": "pathUSD",
    "amount": 5000
  }'
```

## Using Docker (Alternative)

If you prefer Docker:

```bash
# Copy and configure .env first
cp .env.example .env
# Edit .env with your private key

# Start everything with Docker Compose
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

## Next Steps

- Read the full [README.md](README.md) for detailed API documentation
- Check out [examples/client-example.ts](examples/client-example.ts) for integration code
- See [examples/demo-app-integration.tsx](examples/demo-app-integration.tsx) for React component example

## Troubleshooting

### "Failed to fund service wallet"
- Check that `TEMPO_RPC_URL` is correct
- Verify your internet connection
- The native faucet might be temporarily unavailable

### "Redis connection error"
- Ensure Redis is running: `redis-cli ping`
- Check `REDIS_HOST` and `REDIS_PORT` in `.env`

### "Insufficient balance"
The service automatically refills from the native faucet. If this persists:
- Check service logs in `logs/error.log`
- Manually fund your service wallet using the native faucet

### Port 3000 already in use
Change the `PORT` in `.env` to another value (e.g., 3001).

## Support

- GitHub Issues: https://github.com/yourusername/tempo-tiny-faucet/issues
- Tempo Docs: https://docs.tempo.xyz
