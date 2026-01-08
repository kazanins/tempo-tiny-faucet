import dotenv from 'dotenv';

dotenv.config();

export const TEMPO_TOKENS = {
  pathUSD: '0x20c0000000000000000000000000000000000000',
  AlphaUSD: '0x20c0000000000000000000000000000000000001',
  BetaUSD: '0x20c0000000000000000000000000000000000002',
  ThetaUSD: '0x20c0000000000000000000000000000000000003',
} as const;

export type TokenName = keyof typeof TEMPO_TOKENS;

export const ALLOWED_AMOUNTS = [1000, 5000, 10000] as const;
export type AllowedAmount = typeof ALLOWED_AMOUNTS[number];

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  tempoRpcUrl: process.env.TEMPO_RPC_URL || 'https://rpc.moderato.tempo.xyz',
  serviceWalletPrivateKey: process.env.SERVICE_WALLET_PRIVATE_KEY || '',
  redis: {
    url: process.env.REDIS_URL || undefined,
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
  },
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '86400000', 10),
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '3', 10),
  },
} as const;

export function validateConfig(): void {
  if (!config.serviceWalletPrivateKey) {
    throw new Error('SERVICE_WALLET_PRIVATE_KEY is required');
  }

  if (!config.tempoRpcUrl) {
    throw new Error('TEMPO_RPC_URL is required');
  }

  // Log RPC URL for debugging
  console.log('[Config] Using Tempo RPC URL:', config.tempoRpcUrl);
}
