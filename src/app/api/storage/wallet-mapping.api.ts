import { NextRequest, NextResponse } from 'next/server';
import * as crypto from 'crypto';

// Define types for our mock database
type WalletMapping = {
  credentialID: string;
  walletAddress: string;
  timestamp: number;
};

// Mock storage with type annotation
const mockMappings: Record<string, WalletMapping> = {};

/**
 * POST handler - Create a new mapping between passkey and wallet
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { credentialID, walletAddress } = body;
    
    if (!credentialID || !walletAddress) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }
    
    // Generate a mock transaction ID
    const txId = crypto.randomBytes(32).toString('base64');
    
    // Store the mapping
    mockMappings[credentialID] = {
      credentialID,
      walletAddress,
      timestamp: Date.now()
    };
    
    // Return success response with transaction ID
    return NextResponse.json({
      txId,
      status: 200,
      message: 'Wallet mapping created successfully'
    });
  } catch (error) {
    console.error('Wallet Mapping Error:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

/**
 * GET handler - Retrieve a wallet mapping by credential ID
 */
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const credentialID = url.searchParams.get('credentialID');
    
    if (!credentialID) {
      return NextResponse.json({ error: 'Missing credential ID' }, { status: 400 });
    }
    
    // Look up the mapping
    const mapping = mockMappings[credentialID];
    
    if (mapping) {
      return NextResponse.json(mapping);
    } else {
      // Generate a mock wallet address if no mapping exists
      const mockWalletAddress = '0x' + crypto.randomBytes(20).toString('hex');
      
      // Create a temporary mapping for demo purposes
      const tempMapping = {
        walletAddress: mockWalletAddress,
        credentialID,
        timestamp: Date.now()
      };
      
      // Store for future use
      mockMappings[credentialID] = tempMapping;
      
      return NextResponse.json(tempMapping);
    }
  } catch (error) {
    console.error('Wallet Mapping Error:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
} 