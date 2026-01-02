import { Request, Response, NextFunction } from 'express';
import { isAddress } from 'ethers';
import { TEMPO_TOKENS, ALLOWED_AMOUNTS, TokenName, AllowedAmount } from '../config';
import { logger } from '../logger';

export interface FaucetRequestBody {
  address: string;
  token: TokenName;
  amount: AllowedAmount;
}

export function validateFaucetRequest(req: Request, res: Response, next: NextFunction): void {
  const { address, token, amount } = req.body as Partial<FaucetRequestBody>;

  const errors: string[] = [];

  if (!address) {
    errors.push('Address is required');
  } else if (!isAddress(address)) {
    errors.push('Invalid Ethereum address');
  }

  if (!token) {
    errors.push('Token is required');
  } else if (!(token in TEMPO_TOKENS)) {
    errors.push(`Invalid token. Must be one of: ${Object.keys(TEMPO_TOKENS).join(', ')}`);
  }

  if (amount === undefined || amount === null) {
    errors.push('Amount is required');
  } else if (!ALLOWED_AMOUNTS.includes(amount as AllowedAmount)) {
    errors.push(`Invalid amount. Must be one of: ${ALLOWED_AMOUNTS.join(', ')}`);
  }

  if (errors.length > 0) {
    logger.warn('Validation failed', { errors, body: req.body });
    res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors,
    });
    return;
  }

  next();
}

export function errorHandler(err: Error, req: Request, res: Response, next: NextFunction): void {
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
}
