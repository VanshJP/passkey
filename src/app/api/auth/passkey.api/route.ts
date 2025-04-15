import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { getUser, saveUser, saveCredential, getUserByCredentialID } from '@/lib/db';

// Configuration constants
const RP_NAME = 'Passkey to Arweave Wallet';
const RP_ID = process.env.NEXT_PUBLIC_RP_ID || 'localhost';
const ORIGIN = process.env.NEXT_PUBLIC_ORIGIN || `https://${RP_ID}`;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  if (!action) {
    return NextResponse.json({ error: 'Missing action parameter' }, { status: 400 });
  }

  try {
    switch (action) {
      case 'register':
        return await handleRegistrationOptions(request);
      case 'authenticate':
        return await handleAuthenticationOptions(request);
      default:
        return NextResponse.json({ error: 'Invalid action parameter' }, { status: 400 });
    }
  } catch (error) {
    console.error('WebAuthn error:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  if (!action) {
    return NextResponse.json({ error: 'Missing action parameter' }, { status: 400 });
  }

  try {
    switch (action) {
      case 'verify-registration':
        return await handleVerifyRegistration(request);
      case 'verify-authentication':
        return await handleVerifyAuthentication(request);
      default:
        return NextResponse.json({ error: 'Invalid action parameter' }, { status: 400 });
    }
  } catch (error) {
    console.error('WebAuthn verification error:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

// Handle registration options generation
async function handleRegistrationOptions(request: NextRequest) {
  // Generate a new user ID
  const userId = uuidv4();
  
  // Create a new user with a random username for demo purposes
  const username = `user_${Math.floor(Math.random() * 10000)}`;
  
  // Generate a challenge
  const challenge = uuidv4();
  
  const user = {
    id: userId,
    username,
    credentials: [],
    challenge
  };
  
  // Save user to our database
  await saveUser(userId, user);
  
  // Return registration options in a format compatible with SimpleWebAuthn
  return NextResponse.json({
    challenge,
    rp: {
      name: RP_NAME,
      id: RP_ID
    },
    user: {
      id: userId,
      name: username,
      displayName: username
    },
    pubKeyCredParams: [
      { alg: -7, type: 'public-key' }, // ES256
      { alg: -257, type: 'public-key' } // RS256
    ],
    timeout: 60000,
    attestation: 'none',
    excludeCredentials: [],
    authenticatorSelection: {
      authenticatorAttachment: 'platform',
      userVerification: 'preferred',
      residentKey: 'discouraged',
    },
    // Add userId to the response so the frontend can send it back during verification
    userId: userId
  });
}

// Handle registration verification
async function handleVerifyRegistration(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Extract the userId and registration response
    const { userId, id, rawId, response } = body;
    
    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }
    
    // Get the user from our database
    const user = await getUser(userId);
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    if (!user.challenge) {
      return NextResponse.json({ error: 'Challenge not found for user' }, { status: 400 });
    }
    
    // In a real implementation, we would verify the attestation
    // For this mock, we'll just create a credential
    const credentialID = id;
    
    // Create a credential object
    const credential = {
      id: credentialID,
      // In a real implementation, this would be the actual public key
      publicKey: Buffer.from('mock-public-key'),
      counter: 0,
      transports: response.transports || [],
    };
    
    await saveCredential(userId, credential);
    
    // Clear the challenge
    const updatedUser = {
      ...user,
      challenge: undefined
    };
    
    await saveUser(userId, updatedUser);
    
    return NextResponse.json({
      verified: true,
      credentialID,
      userId
    });
  } catch (error) {
    console.error('Registration verification error:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}

// Handle authentication options generation
async function handleAuthenticationOptions(request: NextRequest) {
  try {
    // Generate a challenge for the session
    const challenge = uuidv4();
    
    // Return authentication options in a format compatible with SimpleWebAuthn
    return NextResponse.json({
      challenge,
      rpID: RP_ID,
      timeout: 60000,
      userVerification: 'preferred',
      allowCredentials: [],
      sessionChallenge: challenge // For tracking in the client
    });
  } catch (error) {
    console.error('Authentication options error:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}

// Handle authentication verification
async function handleVerifyAuthentication(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Extract the credential ID and challenge 
    // For frontend compatibility with SimpleWebAuthn browser client
    const credentialID = body.id;
    
    // Find the user who owns this credential
    const userCredentialInfo = await getUserByCredentialID(credentialID);
    
    if (!userCredentialInfo) {
      return NextResponse.json({ error: 'Credential not found' }, { status: 404 });
    }
    
    const { userId, credential } = userCredentialInfo;
    
    // In a real implementation, we would verify the assertion
    // For this mock, we'll just update the counter
    const newCounter = credential.counter + 1;
    
    // Save the updated credential
    await saveCredential(userId, {
      ...credential,
      counter: newCounter
    });
    
    return NextResponse.json({
      verified: true,
      credentialID,
      userId
    });
  } catch (error) {
    console.error('Authentication verification error:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
} 