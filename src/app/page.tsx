'use client';

import { useState, useEffect } from 'react';
import { startRegistration, startAuthentication } from '@simplewebauthn/browser';
import Image from 'next/image';

// Define TypeScript types for our states
type Status = 'ready' | 'loading' | 'success' | 'error' | string;

export default function Home() {
  // State management with proper typing
  const [credentialID, setCredentialID] = useState<string | null>(null);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [txId, setTxId] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>('ready');
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [isArConnectAvailable, setIsArConnectAvailable] = useState<boolean>(false);

  useEffect(() => {
    // Check if user is already logged in (via localStorage)
    const savedWalletAddress = localStorage.getItem('walletAddress');
    if (savedWalletAddress) {
      setWalletAddress(savedWalletAddress);
      setIsLoggedIn(true);
    }

    // Check for ArConnect availability
    const checkArConnect = () => {
      if (typeof window !== 'undefined' && 'arweaveWallet' in window) {
        setIsArConnectAvailable(true);
      } else {
        setIsArConnectAvailable(false);
      }
    };

    checkArConnect();
    window.addEventListener('arweaveWalletLoaded', checkArConnect);

    return () => {
      window.removeEventListener('arweaveWalletLoaded', checkArConnect);
    };
  }, []);

  // Register a new passkey
  async function registerPasskey() {
    try {
      setStatus('loading');
      
      // Get registration options from our API
      const optionsRes = await fetch('/api/auth/passkey.api?action=register');
      if (!optionsRes.ok) throw new Error('Failed to get registration options');
      
      const options = await optionsRes.json();
      
      // Start registration process on the client
      const regResponse = await startRegistration(options);
      
      // Verify registration with our API
      const verifyRes = await fetch('/api/auth/passkey.api?action=verify-registration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({...regResponse, userId: options.userId})
      });
      
      if (!verifyRes.ok) throw new Error('Failed to verify registration');
      
      const verification = await verifyRes.json();
      
      if (verification.verified) {
        setCredentialID(verification.credentialID);
        setStatus('Passkey registered successfully');
        return verification.credentialID;
      } else {
        throw new Error('Passkey verification failed');
      }
    } catch (error) {
      setStatus(`Error: ${(error as Error).message}`);
      console.error('Passkey registration error:', error);
      return null;
    }
  }
  
  // Connect to Arweave wallet
  async function connectWallet() {
    try {
      setStatus('Connecting wallet...');
      
      if (!window.arweaveWallet) {
        setStatus('ArConnect extension not found');
        return null;
      }
      
      // Request permission to access address and sign transactions
      await window.arweaveWallet.connect(['ACCESS_ADDRESS', 'SIGN_TRANSACTION']);
      
      // Get the wallet address
      const address = await window.arweaveWallet.getActiveAddress();
      setWalletAddress(address);
      
      setStatus('Wallet connected');
      return address;
    } catch (error) {
      setStatus(`Error: ${(error as Error).message}`);
      console.error('Wallet connection error:', error);
      return null;
    }
  }
  
  // Create mapping between passkey and wallet
  async function createMapping() {
    try {
      if (!credentialID || !walletAddress) {
        setStatus('Register passkey and connect wallet first');
        return null;
      }
      
      setStatus('Creating mapping...');
      
      // Create mapping via our API
      const mappingRes = await fetch('/api/storage/wallet-mapping.api', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          credentialID,
          walletAddress
        })
      });
      
      if (!mappingRes.ok) throw new Error('Failed to create mapping');
      
      const mapping = await mappingRes.json();
      
      if (mapping.txId) {
        setTxId(mapping.txId);
        setStatus('Mapping stored successfully');
        return mapping.txId;
      } else {
        throw new Error('No transaction ID returned');
      }
    } catch (error) {
      setStatus(`Error: ${(error as Error).message}`);
      console.error('Mapping error:', error);
      return null;
    }
  }
  
  // Login with passkey
  async function loginWithPasskey() {
    try {
      setStatus('Authenticating...');
      
      // Get authentication options from our API
      const optionsRes = await fetch('/api/auth/passkey.api?action=authenticate');
      if (!optionsRes.ok) throw new Error('Failed to get authentication options');
      
      const options = await optionsRes.json();
      
      // Start authentication on the client
      const authResponse = await startAuthentication(options);
      
      // Verify authentication with our API
      const verifyRes = await fetch('/api/auth/passkey.api?action=verify-authentication', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(authResponse)
      });
      
      if (!verifyRes.ok) throw new Error('Failed to verify authentication');
      
      const verification = await verifyRes.json();
      
      if (verification.verified) {
        // Get the wallet mapping for the credential
        const mappingRes = await fetch(`/api/storage/wallet-mapping.api?credentialID=${verification.credentialID}`);
        if (!mappingRes.ok) throw new Error('Failed to retrieve mapping');
        
        const mapping = await mappingRes.json();
        
        if (mapping.walletAddress) {
          setWalletAddress(mapping.walletAddress);
          setIsLoggedIn(true);
          
          // Store in localStorage for persistence
          localStorage.setItem('walletAddress', mapping.walletAddress);
          
          setStatus('Logged in successfully');
        } else {
          throw new Error('No wallet mapping found');
        }
      } else {
        throw new Error('Authentication failed');
      }
    } catch (error) {
      setStatus(`Error: ${(error as Error).message}`);
      console.error('Login error:', error);
    }
  }
  
  // Logout function
  function logout() {
    localStorage.removeItem('walletAddress');
    setWalletAddress(null);
    setIsLoggedIn(false);
    setStatus('Logged out');
    
    // Disconnect from ArConnect if available
    if (window.arweaveWallet) {
      window.arweaveWallet.disconnect().catch(console.error);
    }
  }
  
  return (
    <div className="flex flex-col min-h-screen items-center p-8">
      <header className="flex flex-col items-center mb-8">
        <Image
          className="dark:invert mb-6"
          src="/next.svg"
          alt="Next.js logo"
          width={120}
          height={25}
          priority
        />
        <h1 className="text-3xl font-bold">Passkey to Arweave Wallet</h1>
      </header>
      
      <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-md w-full max-w-md mb-8">
        <strong>Status:</strong> {status}
      </div>
      
      {!isLoggedIn ? (
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-md p-6 w-full max-w-md">
          <h2 className="text-xl font-semibold mb-4">Setup</h2>
          <button 
            onClick={registerPasskey} 
            className="w-full bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-md mb-4"
          >
            Register Passkey
          </button>
          
          {credentialID && (
            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-md mb-4">
              <p>Passkey ID: {`${credentialID.substring(0, 10)}...`}</p>
            </div>
          )}
          
          <button 
            onClick={connectWallet} 
            className="w-full bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-md mb-4"
            disabled={!isArConnectAvailable}
          >
            {isArConnectAvailable ? 'Connect Arweave Wallet' : 'ArConnect Not Available'}
          </button>
          
          {walletAddress && (
            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-md mb-4">
              <p>Wallet: {`${walletAddress.substring(0, 10)}...${walletAddress.substring(walletAddress.length - 5)}`}</p>
            </div>
          )}
          
          {credentialID && walletAddress && (
            <button 
              onClick={createMapping} 
              className="w-full bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-md mb-4"
            >
              Store Mapping
            </button>
          )}
          
          {txId && (
            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-md mb-4">
              <p>
                Transaction:
                <a 
                  href={`https://viewblock.io/arweave/tx/${txId}`} 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 ml-2"
                >
                  {txId.substring(0, 10)}...
                </a>
              </p>
            </div>
          )}
          
          <hr className="border-t border-gray-200 dark:border-gray-700 my-6" />
          
          <h2 className="text-xl font-semibold mb-4">Login</h2>
          <button 
            onClick={loginWithPasskey} 
            className="w-full bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-md"
          >
            Login with Passkey
          </button>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-md p-6 w-full max-w-md">
          <h2 className="text-xl font-semibold mb-4">Welcome!</h2>
          <p>You are logged in with wallet:</p>
          <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-md font-mono break-all my-4">
            {walletAddress}
          </div>
          <button 
            onClick={logout} 
            className="w-full bg-red-600 hover:bg-red-700 text-white p-3 rounded-md"
          >
            Logout
          </button>
        </div>
      )}
    </div>
  );
}

// TypeScript definitions for ArConnect
declare global {
  interface Window {
    arweaveWallet?: {
      connect: (permissions: string[]) => Promise<void>;
      disconnect: () => Promise<void>;
      getActiveAddress: () => Promise<string>;
      sign: (transaction: any) => Promise<any>;
    };
  }
}
