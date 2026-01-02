/**
 * Example client usage for Tempo Tiny Faucet
 *
 * This demonstrates how developers can integrate the faucet into their apps
 */

const FAUCET_URL = 'http://localhost:3000';

interface FaucetResponse {
  success: boolean;
  message?: string;
  data?: {
    recipient: string;
    token: string;
    tokenAddress: string;
    amount: number;
    txHash: string;
    explorerUrl: string;
  };
  rateLimit?: {
    remaining: number;
    resetAt: string;
  };
  error?: string;
}

export class TinyFaucetClient {
  private baseUrl: string;

  constructor(baseUrl: string = FAUCET_URL) {
    this.baseUrl = baseUrl;
  }

  async requestTokens(
    address: string,
    token: 'pathUSD' | 'AlphaUSD' | 'BetaUSD' | 'ThetaUSD',
    amount: 1000 | 5000 | 10000
  ): Promise<FaucetResponse> {
    const response = await fetch(`${this.baseUrl}/api/fund`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        address,
        token,
        amount,
      }),
    });

    return await response.json();
  }

  async checkRateLimit(address: string): Promise<{
    requestsUsed: number;
    requestsRemaining: number;
    resetAt: string | null;
  }> {
    const response = await fetch(`${this.baseUrl}/api/rate-limit/${address}`);
    const data = await response.json();

    return {
      requestsUsed: data.requestsUsed,
      requestsRemaining: data.requestsRemaining,
      resetAt: data.resetAt,
    };
  }

  async getInfo(): Promise<{
    supportedTokens: Array<{ name: string; address: string }>;
    allowedAmounts: number[];
    walletAddress: string;
  }> {
    const response = await fetch(`${this.baseUrl}/api/info`);
    const data = await response.json();

    return {
      supportedTokens: data.supportedTokens,
      allowedAmounts: data.allowedAmounts,
      walletAddress: data.walletAddress,
    };
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/health`);
      const data = await response.json();
      return data.success && data.status === 'healthy';
    } catch {
      return false;
    }
  }
}

// Example usage
async function example() {
  const faucet = new TinyFaucetClient();

  // Check if service is healthy
  const isHealthy = await faucet.healthCheck();
  console.log('Faucet service healthy:', isHealthy);

  // Get service info
  const info = await faucet.getInfo();
  console.log('Supported tokens:', info.supportedTokens);
  console.log('Allowed amounts:', info.allowedAmounts);

  // Request tokens for a user's wallet
  const userWallet = '0xYourWalletAddress';

  try {
    // Check current rate limit status
    const rateLimit = await faucet.checkRateLimit(userWallet);
    console.log('Requests remaining:', rateLimit.requestsRemaining);

    if (rateLimit.requestsRemaining > 0) {
      // Request tokens
      const result = await faucet.requestTokens(userWallet, 'pathUSD', 5000);

      if (result.success && result.data) {
        console.log('Success! Transaction hash:', result.data.txHash);
        console.log('Explorer URL:', result.data.explorerUrl);
        console.log('Remaining requests:', result.rateLimit?.remaining);
      } else {
        console.error('Failed to get tokens:', result.error);
      }
    } else {
      console.log('Rate limit reached. Reset at:', rateLimit.resetAt);
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

// Uncomment to run the example
// example();

export default TinyFaucetClient;
