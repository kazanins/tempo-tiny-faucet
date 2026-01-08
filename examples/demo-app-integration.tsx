/**
 * React Component Example: Integrating Tempo Tiny Faucet into a demo app
 *
 * This shows how developers building retail demos can integrate the faucet
 */

import React, { useState, useEffect } from 'react';

const FAUCET_API = 'http://localhost:3000/api';

type TokenName = 'pathUSD' | 'AlphaUSD' | 'BetaUSD' | 'ThetaUSD';

interface FaucetState {
  loading: boolean;
  success: boolean | null;
  txHash: string | null;
  error: string | null;
  rateLimit: {
    remaining: number;
    resetAt: string | null;
  };
}

export function FaucetWidget({ userAddress }: { userAddress: string }) {
  const [selectedToken, setSelectedToken] = useState<TokenName>('pathUSD');
  const [selectedAmount, setSelectedAmount] = useState<number>(5000);
  const [state, setState] = useState<FaucetState>({
    loading: false,
    success: null,
    txHash: null,
    error: null,
    rateLimit: {
      remaining: 3,
      resetAt: null,
    },
  });

  // Check rate limit on mount
  useEffect(() => {
    async function checkLimit() {
      try {
        const response = await fetch(`${FAUCET_API}/rate-limit/${userAddress}`);
        const data = await response.json();
        setState(prev => ({
          ...prev,
          rateLimit: {
            remaining: data.requestsRemaining,
            resetAt: data.resetAt,
          },
        }));
      } catch (error) {
        console.error('Failed to check rate limit:', error);
      }
    }

    if (userAddress) {
      checkLimit();
    }
  }, [userAddress]);

  async function requestTokens() {
    setState(prev => ({ ...prev, loading: true, error: null, success: null }));

    try {
      const response = await fetch(`${FAUCET_API}/fund`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          address: userAddress,
          token: selectedToken,
          amount: selectedAmount,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setState({
          loading: false,
          success: true,
          txHash: data.data.txHash,
          error: null,
          rateLimit: {
            remaining: data.rateLimit.remaining,
            resetAt: data.rateLimit.resetAt,
          },
        });
      } else {
        setState(prev => ({
          ...prev,
          loading: false,
          success: false,
          error: data.error || 'Failed to request tokens',
        }));
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        success: false,
        error: 'Network error. Please try again.',
      }));
    }
  }

  const canRequest = state.rateLimit.remaining > 0 && !state.loading;

  return (
    <div style={{ padding: '20px', border: '1px solid #ccc', borderRadius: '8px', maxWidth: '400px' }}>
      <h2>Get Test Tokens</h2>

      <div style={{ marginBottom: '15px' }}>
        <label>
          Token:
          <select
            value={selectedToken}
            onChange={(e) => setSelectedToken(e.target.value as TokenName)}
            style={{ marginLeft: '10px', padding: '5px' }}
          >
            <option value="pathUSD">pathUSD</option>
            <option value="AlphaUSD">AlphaUSD</option>
            <option value="BetaUSD">BetaUSD</option>
            <option value="ThetaUSD">ThetaUSD</option>
          </select>
        </label>
      </div>

      <div style={{ marginBottom: '15px' }}>
        <label>
          Amount:
          <select
            value={selectedAmount}
            onChange={(e) => setSelectedAmount(Number(e.target.value))}
            style={{ marginLeft: '10px', padding: '5px' }}
          >
            <option value={1000}>$1,000</option>
            <option value={5000}>$5,000</option>
            <option value={10000}>$10,000</option>
          </select>
        </label>
      </div>

      <button
        onClick={requestTokens}
        disabled={!canRequest}
        style={{
          padding: '10px 20px',
          backgroundColor: canRequest ? '#007bff' : '#ccc',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          cursor: canRequest ? 'pointer' : 'not-allowed',
          width: '100%',
          marginBottom: '10px',
        }}
      >
        {state.loading ? 'Requesting...' : 'Get Tokens'}
      </button>

      <div style={{ fontSize: '12px', color: '#666' }}>
        Requests remaining: {state.rateLimit.remaining}
        {state.rateLimit.resetAt && state.rateLimit.remaining === 0 && (
          <span> (resets {new Date(state.rateLimit.resetAt).toLocaleString()})</span>
        )}
      </div>

      {state.success && state.txHash && (
        <div style={{ marginTop: '15px', padding: '10px', backgroundColor: '#d4edda', borderRadius: '5px' }}>
          <strong>Success!</strong>
          <br />
          <a
            href={`https://explore.tempo.xyz/tx/${state.txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#155724', wordBreak: 'break-all' }}
          >
            View transaction
          </a>
        </div>
      )}

      {state.error && (
        <div style={{ marginTop: '15px', padding: '10px', backgroundColor: '#f8d7da', borderRadius: '5px', color: '#721c24' }}>
          <strong>Error:</strong> {state.error}
        </div>
      )}
    </div>
  );
}

// Example usage in a larger app
export function DemoApp() {
  const [walletAddress, setWalletAddress] = useState<string>('');

  // In a real app, this would come from wallet connection (e.g., MetaMask)
  const connectWallet = async () => {
    // Simulate wallet connection
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      try {
        const accounts = await (window as any).ethereum.request({
          method: 'eth_requestAccounts',
        });
        setWalletAddress(accounts[0]);
      } catch (error) {
        console.error('Failed to connect wallet:', error);
      }
    }
  };

  return (
    <div style={{ padding: '40px' }}>
      <h1>My Retail Demo App</h1>

      {!walletAddress ? (
        <button onClick={connectWallet} style={{ padding: '10px 20px' }}>
          Connect Wallet
        </button>
      ) : (
        <>
          <p>Connected: {walletAddress}</p>
          <FaucetWidget userAddress={walletAddress} />
        </>
      )}
    </div>
  );
}
