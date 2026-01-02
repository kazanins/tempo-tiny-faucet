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
      res.json({
        name: 'Tempo Tiny Faucet',
        version: '1.0.0',
        description: 'A micro-faucet service for Tempo testnet',
        endpoints: {
          health: '/api/health',
          info: '/api/info',
          fund: 'POST /api/fund',
          balance: '/api/balance/:token',
          rateLimit: '/api/rate-limit/:address',
        },
        docs: 'https://github.com/yourusername/tempo-tiny-faucet',
      });
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
