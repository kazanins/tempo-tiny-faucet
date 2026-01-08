import { Router, Request, Response } from 'express';
import { TempoService } from '../services/tempo.service';
import { RedisService } from '../services/redis.service';
import { validateFaucetRequest, FaucetRequestBody } from '../middleware/validation';
import { TEMPO_TOKENS, ALLOWED_AMOUNTS } from '../config';
import { logger } from '../logger';

export function createFaucetRouter(
  tempoService: TempoService,
  redisService: RedisService
): Router {
  const router = Router();

  router.get('/health', async (req: Request, res: Response) => {
    try {
      const chainId = await tempoService.getChainId();
      const walletAddress = tempoService.getWalletAddress();

      res.json({
        success: true,
        status: 'healthy',
        service: 'tempo-tiny-faucet',
        wallet: walletAddress,
        chainId: chainId.toString(),
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Health check failed', { error });
      res.status(503).json({
        success: false,
        status: 'unhealthy',
        error: 'Service unavailable',
      });
    }
  });

  router.get('/info', (req: Request, res: Response) => {
    res.json({
      success: true,
      supportedTokens: Object.keys(TEMPO_TOKENS).map(name => ({
        name,
        address: TEMPO_TOKENS[name as keyof typeof TEMPO_TOKENS],
      })),
      allowedAmounts: ALLOWED_AMOUNTS,
      walletAddress: tempoService.getWalletAddress(),
    });
  });

  router.get('/balance/:token', async (req: Request, res: Response) => {
    try {
      const { token } = req.params;

      if (!(token in TEMPO_TOKENS)) {
        res.status(400).json({
          success: false,
          error: `Invalid token. Must be one of: ${Object.keys(TEMPO_TOKENS).join(', ')}`,
        });
        return;
      }

      const balance = await tempoService.getTokenBalance(token as keyof typeof TEMPO_TOKENS);

      res.json({
        success: true,
        token,
        balance,
        address: TEMPO_TOKENS[token as keyof typeof TEMPO_TOKENS],
      });
    } catch (error) {
      logger.error('Failed to get balance', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to get balance',
      });
    }
  });

  router.get('/rate-limit/:address', async (req: Request, res: Response) => {
    try {
      const { address } = req.params;

      const info = await redisService.getRateLimitInfo(address);

      res.json({
        success: true,
        address,
        requestsUsed: info.count,
        requestsRemaining: info.remaining,
        resetAt: info.resetAt ? new Date(info.resetAt).toISOString() : null,
      });
    } catch (error) {
      logger.error('Failed to get rate limit info', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to get rate limit info',
      });
    }
  });

  router.post('/fund', validateFaucetRequest, async (req: Request, res: Response) => {
    try {
      const { address, token, amount } = req.body as FaucetRequestBody;

      const rateLimit = await redisService.checkRateLimit(address);

      if (!rateLimit.allowed) {
        logger.warn('Rate limit exceeded', { address });
        res.status(429).json({
          success: false,
          error: 'Rate limit exceeded',
          resetAt: new Date(rateLimit.resetAt).toISOString(),
          remaining: rateLimit.remaining,
        });
        return;
      }

      logger.info('Processing funding request', { address, token, amount });

      const txHash = await tempoService.sendTokens(address, token, amount);

      res.json({
        success: true,
        message: 'Tokens sent successfully',
        data: {
          recipient: address,
          token,
          tokenAddress: TEMPO_TOKENS[token],
          amount,
          txHash,
          explorerUrl: `https://explore.tempo.xyz/tx/${txHash}`,
        },
        rateLimit: {
          remaining: rateLimit.remaining,
          resetAt: new Date(rateLimit.resetAt).toISOString(),
        },
      });
    } catch (error) {
      logger.error('Failed to process funding request', { error, body: req.body });
      res.status(500).json({
        success: false,
        error: 'Failed to send tokens',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  return router;
}
