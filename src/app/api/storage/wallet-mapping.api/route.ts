import { NextRequest, NextResponse } from 'next/server';

// In-memory storage for demonstration purposes
// In a real app, this would be a database or blockchain storage
const walletMappings = new Map<string, { walletAddress: string, timestamp: number }>();

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const credentialID = searchParams.get('credentialID');

    if (!credentialID) {
        return NextResponse.json({ error: 'Missing credential ID' }, { status: 400 });
    }

    try {
        // Get mapping from in-memory storage
        const mapping = walletMappings.get(credentialID);

        if (!mapping) {
            return NextResponse.json({ error: 'No mapping found for this credential' }, { status: 404 });
        }

        return NextResponse.json({
            walletAddress: mapping.walletAddress,
            credentialID: credentialID,
            timestamp: mapping.timestamp
        });
    } catch (error) {
        console.error('Error retrieving mapping:', error);
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { credentialID, walletAddress } = body;

        if (!credentialID || !walletAddress) {
            return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
        }

        // Create the mapping data
        const mappingData = {
            walletAddress,
            timestamp: Date.now()
        };

        // Store in-memory
        walletMappings.set(credentialID, mappingData);

        // Create a mock transaction ID
        const mockTxId = `mock-tx-${Math.random().toString(36).substring(2, 15)}`;

        return NextResponse.json({
            txId: mockTxId,
            success: true
        });
    } catch (error) {
        console.error('Error creating mapping:', error);
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
} 