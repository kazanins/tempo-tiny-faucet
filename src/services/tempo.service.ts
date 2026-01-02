import { JsonRpcProvider, Wallet, parseUnits, formatUnits, Contract } from 'ethers';
import { config, TEMPO_TOKENS, TokenName } from '../config';
import { logger } from '../logger';

const ERC20_ABI = [
  'function transfer(address to, uint256 amount) returns (bool)',
  'function balanceOf(address account) view returns (uint256)',
  'function decimals() view returns (uint8)',
];

export class TempoService {
  private provider: JsonRpcProvider;
  private wallet: Wallet;

  constructor() {
    this.provider = new JsonRpcProvider(config.tempoRpcUrl);
    this.wallet = new Wallet(config.serviceWalletPrivateKey, this.provider);
    logger.info('TempoService initialized', { address: this.wallet.address });
  }

  async fundServiceWallet(): Promise<string[]> {
    try {
      logger.info('Requesting funds from native faucet', { address: this.wallet.address });

      const response = await this.provider.send('tempo_fundAddress', [this.wallet.address]);

      logger.info('Service wallet funded successfully', { txHashes: response });
      return response;
    } catch (error) {
      logger.error('Failed to fund service wallet', { error });
      throw new Error(`Failed to fund service wallet: ${error}`);
    }
  }

  async getTokenBalance(tokenName: TokenName): Promise<string> {
    const tokenAddress = TEMPO_TOKENS[tokenName];
    const tokenContract = new Contract(tokenAddress, ERC20_ABI, this.provider);

    try {
      const balance = await tokenContract.balanceOf(this.wallet.address);
      const decimals = await tokenContract.decimals();
      return formatUnits(balance, decimals);
    } catch (error) {
      logger.error('Failed to get token balance', { tokenName, error });
      throw error;
    }
  }

  async sendTokens(
    recipientAddress: string,
    tokenName: TokenName,
    amount: number
  ): Promise<string> {
    const tokenAddress = TEMPO_TOKENS[tokenName];
    const tokenContract = new Contract(tokenAddress, ERC20_ABI, this.wallet);

    try {
      const decimals = await tokenContract.decimals();
      const currentBalance = await tokenContract.balanceOf(this.wallet.address);
      const amountInWei = parseUnits(amount.toString(), decimals);

      logger.debug('Preparing token transfer', {
        tokenName,
        recipient: recipientAddress,
        amount,
        currentBalance: formatUnits(currentBalance, decimals),
      });

      if (currentBalance < amountInWei) {
        logger.warn('Insufficient balance, requesting funds from native faucet');
        await this.fundServiceWallet();

        await new Promise(resolve => setTimeout(resolve, 2000));

        const newBalance = await tokenContract.balanceOf(this.wallet.address);
        if (newBalance < amountInWei) {
          throw new Error(
            `Insufficient balance even after funding. Required: ${amount}, Available: ${formatUnits(newBalance, decimals)}`
          );
        }
      }

      const tx = await tokenContract.transfer(recipientAddress, amountInWei);
      logger.info('Token transfer initiated', {
        tokenName,
        recipient: recipientAddress,
        amount,
        txHash: tx.hash,
      });

      await tx.wait();
      logger.info('Token transfer confirmed', { txHash: tx.hash });

      return tx.hash;
    } catch (error) {
      logger.error('Failed to send tokens', {
        tokenName,
        recipient: recipientAddress,
        amount,
        error,
      });
      throw error;
    }
  }

  getWalletAddress(): string {
    return this.wallet.address;
  }

  async getChainId(): Promise<bigint> {
    const network = await this.provider.getNetwork();
    return network.chainId;
  }
}
