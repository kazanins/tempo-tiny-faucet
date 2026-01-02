# Tempo Tiny Faucet

A micro-faucet service for the Tempo testnet that sends smaller, controlled amounts of test tokens compared to the native faucet.

## Overview

While Tempo's native faucet sends $1 million worth of tokens, the Tiny Faucet allows developers to request smaller amounts ($1,000, $5,000, or $10,000) of specific tokens. This is ideal for building realistic retail app demos where users need smaller token balances.

## Supported Tokens

The service supports the same four test stablecoins as the native Tempo faucet:

- **pathUSD** - `0x20c0000000000000000000000000000000000000`
- **AlphaUSD** - `0x20c0000000000000000000000000000000000001`
- **BetaUSD** - `0x20c0000000000000000000000000000000000002`
- **ThetaUSD** - `0x20c0000000000000000000000000000000000003`

## Features

- **Configurable amounts**: Request $1,000, $5,000, or $10,000 per transaction
- **Token selection**: Choose which specific token to receive
- **Rate limiting**: Redis-backed rate limiting (default: 3 requests per address per 24 hours)
- **Automatic refills**: Service wallet automatically refills from native faucet when needed
- **RESTful API**: Easy to integrate into any application
- **Production-ready**: Includes logging, error handling, and health checks

## Prerequisites

- Node.js 18+ and npm/yarn
- Redis server (for rate limiting)
- A funded Ethereum wallet for the service (private key)

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/tempo-tiny-faucet.git
cd tempo-tiny-faucet
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file from the example:
```bash
cp .env.example .env
```

4. Generate a new wallet for the service:
```bash
cast wallet new
```

5. Update `.env` with your configuration:
```env
PORT=3000
NODE_ENV=development
TEMPO_RPC_URL=https://rpc.testnet.tempo.xyz
SERVICE_WALLET_PRIVATE_KEY=your_private_key_here
REDIS_HOST=localhost
REDIS_PORT=6379
RATE_LIMIT_WINDOW_MS=86400000
RATE_LIMIT_MAX_REQUESTS=3
```

## Running the Service

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm run build
npm start
```

The service will start on `http://localhost:3000` (or your configured PORT).

## API Endpoints

### 1. Get Service Information
```bash
GET /api/info
```

**Response:**
```json
{
  "success": true,
  "supportedTokens": [
    {
      "name": "pathUSD",
      "address": "0x20c0000000000000000000000000000000000000"
    },
    ...
  ],
  "allowedAmounts": [1000, 5000, 10000],
  "walletAddress": "0x..."
}
```

### 2. Request Tokens
```bash
POST /api/fund
Content-Type: application/json

{
  "address": "0xYourWalletAddress",
  "token": "pathUSD",
  "amount": 5000
}
```

**Response:**
```json
{
  "success": true,
  "message": "Tokens sent successfully",
  "data": {
    "recipient": "0xYourWalletAddress",
    "token": "pathUSD",
    "tokenAddress": "0x20c0000000000000000000000000000000000000",
    "amount": 5000,
    "txHash": "0x...",
    "explorerUrl": "https://explorer.testnet.tempo.xyz/tx/0x..."
  },
  "rateLimit": {
    "remaining": 2,
    "resetAt": "2026-01-03T00:00:00.000Z"
  }
}
```

### 3. Check Rate Limit Status
```bash
GET /api/rate-limit/:address
```

**Response:**
```json
{
  "success": true,
  "address": "0x...",
  "requestsUsed": 1,
  "requestsRemaining": 2,
  "resetAt": "2026-01-03T00:00:00.000Z"
}
```

### 4. Check Token Balance
```bash
GET /api/balance/:token
```

**Response:**
```json
{
  "success": true,
  "token": "pathUSD",
  "balance": "998500.0",
  "address": "0x20c0000000000000000000000000000000000000"
}
```

### 5. Health Check
```bash
GET /api/health
```

**Response:**
```json
{
  "success": true,
  "status": "healthy",
  "service": "tempo-tiny-faucet",
  "wallet": "0x...",
  "chainId": "...",
  "timestamp": "2026-01-02T..."
}
```

## Usage Examples

### Using cURL
```bash
curl -X POST http://localhost:3000/api/fund \
  -H "Content-Type: application/json" \
  -d '{
    "address": "0xYourAddress",
    "token": "pathUSD",
    "amount": 5000
  }'
```

### Using JavaScript/TypeScript
```typescript
const response = await fetch('http://localhost:3000/api/fund', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    address: '0xYourAddress',
    token: 'pathUSD',
    amount: 5000,
  }),
});

const data = await response.json();
console.log('Transaction hash:', data.data.txHash);
```

### Using Python
```python
import requests

response = requests.post('http://localhost:3000/api/fund', json={
    'address': '0xYourAddress',
    'token': 'pathUSD',
    'amount': 5000
})

data = response.json()
print(f"Transaction hash: {data['data']['txHash']}")
```

## Configuration

### Rate Limiting

By default, the service allows 3 requests per address per 24 hours. You can adjust this in the `.env` file:

```env
RATE_LIMIT_WINDOW_MS=86400000  # 24 hours in milliseconds
RATE_LIMIT_MAX_REQUESTS=3      # Maximum requests per window
```

### Allowed Amounts

The service is configured to allow specific amounts. To modify these, edit [src/config.ts:12](src/config.ts#L12):

```typescript
export const ALLOWED_AMOUNTS = [1000, 5000, 10000] as const;
```

## How It Works

1. The service maintains a wallet that receives tokens from the native Tempo faucet
2. When a user requests tokens, the service:
   - Validates the request (address, token, amount)
   - Checks rate limits
   - Ensures the service wallet has sufficient balance
   - If needed, automatically calls the native faucet to refill
   - Transfers the requested amount to the user's address
3. Rate limits are tracked in Redis per address

## Architecture

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │
       │ HTTP Request
       ▼
┌─────────────────┐
│  Express API    │
│  - Validation   │
│  - Rate Limit   │
└────────┬────────┘
         │
         ├──────────┐
         ▼          ▼
  ┌───────────┐  ┌────────┐
  │   Redis   │  │ Tempo  │
  │ (Limits)  │  │Service │
  └───────────┘  └────┬───┘
                      │
                      ▼
              ┌──────────────┐
              │ Tempo RPC    │
              │ - Native     │
              │   Faucet     │
              │ - ERC20      │
              │   Transfers  │
              └──────────────┘
```

## Development

### Project Structure
```
tempo-tiny-faucet/
├── src/
│   ├── index.ts              # Main entry point
│   ├── config.ts             # Configuration and constants
│   ├── logger.ts             # Winston logger setup
│   ├── middleware/
│   │   └── validation.ts     # Request validation
│   ├── routes/
│   │   └── faucet.routes.ts  # API routes
│   └── services/
│       ├── tempo.service.ts  # Tempo blockchain interaction
│       └── redis.service.ts  # Redis rate limiting
├── logs/                     # Log files (created at runtime)
├── package.json
├── tsconfig.json
└── .env                      # Environment variables
```

### Adding New Features

To add a new token amount, edit the `ALLOWED_AMOUNTS` array in [src/config.ts:12](src/config.ts#L12).

To modify rate limiting logic, see [src/services/redis.service.ts](src/services/redis.service.ts).

## Deployment

### Quick Deploy Options

**🚫 Not Recommended: Vercel** - Serverless limitations make it unsuitable for this service

**✅ Recommended Platforms:**

1. **Railway** (Easiest) - Built-in Redis, auto-deploy from GitHub (~$5-10/mo)
2. **Render** (Free tier) - Managed Redis, simple setup (Free or $7/mo)
3. **Fly.io** - Great Docker support, global edge (Free tier available)
4. **DigitalOcean App Platform** - Reliable, simple (~$12/mo)
5. **VPS + Docker** - Full control, cheapest long-term ($5-10/mo)

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed deployment guides for each platform.

### Using Docker Compose (Local/VPS)

The project includes `docker-compose.yml` for easy deployment:

```bash
docker-compose up -d
```

This starts both the faucet service and Redis together.

## Troubleshooting

### Service wallet runs out of tokens
The service automatically refills from the native faucet when balance is low. If this fails, check:
- RPC endpoint is accessible
- Service wallet private key is correct
- Native faucet is operational

### Rate limit not working
Ensure Redis is running and accessible:
```bash
redis-cli ping
```

### Transactions failing
Check the service logs in `logs/error.log` and verify:
- Correct network and RPC URL
- Service wallet has ETH for gas (if required)
- Token addresses are correct

## Security Considerations

- Store the service wallet private key securely (use environment variables or secrets management)
- The service wallet should only hold testnet tokens
- Implement additional security measures (API keys, CAPTCHA) for public deployments
- Rate limiting is essential to prevent abuse
- Use HTTPS in production
- Consider implementing IP-based rate limiting in addition to address-based

## License

MIT

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## Support

For issues related to:
- This faucet service: Open an issue on GitHub
- Tempo blockchain: Visit https://docs.tempo.xyz
- Native faucet: See https://docs.tempo.xyz/guide/use-accounts/add-funds
