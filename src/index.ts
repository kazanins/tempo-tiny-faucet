import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config, validateConfig } from './config';
import { logger } from './logger';
import { TempoService } from './services/tempo.service';
import { RedisService } from './services/redis.service';
import { createFaucetRouter } from './routes/faucet.routes';
import { errorHandler } from './middleware/validation';

async function bootstrap(): Promise<void> {
  try {
    validateConfig();

    const app: Application = express();

    app.use(helmet());
    app.use(cors());
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    const tempoService = new TempoService();
    const redisService = new RedisService();

    app.use('/api', createFaucetRouter(tempoService, redisService));

    app.get('/', (req, res) => {
      const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Tempo Tiny Faucet</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            line-height: 1.6;
            max-width: 800px;
            margin: 0 auto;
            padding: 40px 20px;
            color: #333;
        }
        h1 { margin-bottom: 5px; }
        h2 { margin-top: 30px; margin-bottom: 10px; }
        p { margin: 10px 0; color: #666; }
        pre {
            background: #f5f5f5;
            padding: 15px;
            border-radius: 4px;
            overflow-x: auto;
        }
        code { font-family: monospace; }
        ul { margin: 10px 0 10px 20px; }
        .info { background: #f0f0f0; padding: 15px; border-radius: 4px; margin: 20px 0; }
    </style>
</head>
<body>
    <h1>Tempo Tiny Faucet</h1>
    <p>A faucet service for Tempo testnet tokens</p>

    <div class="info">
        <strong>Service Address:</strong> ${tempoService.getWalletAddress()}<br>
        <strong>Rate Limit:</strong> ${config.rateLimit.maxRequests} requests per ${Math.floor(config.rateLimit.windowMs / 3600000)} hours
    </div>

    <h2>Usage</h2>
    <p>Request tokens from the faucet:</p>
    <pre><code>curl -X POST http://localhost:${config.port}/api/fund \\
  -H "Content-Type: application/json" \\
  -d '{
    "address": "0xYourWalletAddress",
    "token": "pathUSD",
    "amount": 5000
  }'</code></pre>

    <h2>Available Tokens</h2>
    <ul>
        <li>pathUSD</li>
        <li>AlphaUSD</li>
        <li>BetaUSD</li>
        <li>ThetaUSD</li>
    </ul>

    <h2>Endpoints</h2>
    <ul>
        <li><code>GET /api/health</code> - Health check</li>
        <li><code>GET /api/info</code> - Service information</li>
        <li><code>POST /api/fund</code> - Request tokens</li>
        <li><code>GET /api/balance/:token</code> - Check faucet balance</li>
        <li><code>GET /api/rate-limit/:address</code> - Check rate limit status</li>
    </ul>
</body>
</html>
      `;
      res.send(html);
    });

    app.use(errorHandler);

    const server = app.listen(config.port, () => {
      logger.info(`Tempo Tiny Faucet started`, {
        port: config.port,
        env: config.nodeEnv,
        wallet: tempoService.getWalletAddress(),
      });
    });

    const shutdown = async () => {
      logger.info('Shutting down gracefully...');
      server.close(async () => {
        await redisService.close();
        logger.info('Server closed');
        process.exit(0);
      });
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);

    logger.info('Service wallet address', { address: tempoService.getWalletAddress() });
    logger.info('Initial funding can be done by calling: /api/fund-service (or manually via cast)');

  } catch (error) {
    logger.error('Failed to start server', { error });
    process.exit(1);
  }
}

bootstrap();
