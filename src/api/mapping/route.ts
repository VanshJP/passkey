import { NextRequest, NextResponse } from 'next/server';
import { encryptData, decryptData } from '@/lib/crypto';
import { storeOnArweave, queryArweave } from '@/lib/arweave';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const credentialID = searchParams.get('credentialID');

    if (!credentialID) {
        return NextResponse.json({ error: 'Missing credential ID' }, { status: 400 });
    }

    try {
        // Query Arweave for the transaction
        const transaction = await queryArweave(credentialID);

        if (!transaction) {
            return NextResponse.json({ error: 'No mapping found for this credential' }, { status: 404 });
        }

        // Decrypt the mapping data
        const decryptedData = await decryptData(transaction.data);

        return NextResponse.json({
            walletAddress: decryptedData.walletAddress,
            credentialID: decryptedData.credentialID,
            timestamp: decryptedData.timestamp
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
            credentialID,
            walletAddress,
            timestamp: Date.now()
        };

        // Encrypt the data
        const encryptedData = await encryptData(mappingData);

        // Store on Arweave
        const txId = await storeOnArweave(encryptedData, credentialID);

        return NextResponse.json({
            txId,
            success: true
        });
    } catch (error) {
        console.error('Error creating mapping:', error);
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}