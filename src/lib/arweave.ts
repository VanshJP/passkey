import Arweave from 'arweave';

// Initialize Arweave
const arweave = Arweave.init({
    host: 'arweave.net',
    port: 443,
    protocol: 'https'
});

// Demo wallet - in production, use a secure wallet or client-side signing
// This is a placeholder - you'll need a real wallet file or ArConnect integration
const jwk = require('./demo-wallet.json');

interface EncryptedData {
    encryptedData: string;
    iv: string;
    authTag: string;
}

export async function storeOnArweave(encryptedData: EncryptedData, credentialID: string): Promise<string> {
    try {
        // Create transaction
        const tx = await arweave.createTransaction({
            data: JSON.stringify(encryptedData)
        });

        // Add tags for searching
        tx.addTag('Content-Type', 'application/json');
        tx.addTag('App-Name', 'PasskeyArweaveMapper');
        tx.addTag('Credential-ID', credentialID);

        // Sign the transaction
        await arweave.transactions.sign(tx, jwk);

        // Post to Arweave network
        const response = await arweave.transactions.post(tx);

        if (response.status === 200 || response.status === 202) {
            return tx.id;
        } else {
            throw new Error(`Failed to post transaction: ${response.statusText}`);
        }
    } catch (error) {
        console.error('Arweave storage error:', error);
        throw error;
    }
}

export async function queryArweave(credentialID: string): Promise<{ id: string, data: any } | null> {
    try {
        // GraphQL query to find transaction
        const query = `
      query {
        transactions(
          tags: [
            { name: "App-Name", values: ["PasskeyArweaveMapper"] },
            { name: "Credential-ID", values: ["${credentialID}"] }
          ],
          first: 1,
          sort: HEIGHT_DESC
        ) {
          edges {
            node {
              id
            }
          }
        }
      }
    `;

        // Execute query
        const response = await fetch('https://arweave.net/graphql', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ query })
        });

        const result = await response.json();

        if (!result.data.transactions.edges.length) {
            return null;
        }

        const txId = result.data.transactions.edges[0].node.id;

        // Get transaction data
        const txDataRaw = await arweave.transactions.getData(txId, {
            decode: true,
            string: false
        });

        // Convert Uint8Array to string if necessary
        const txData = typeof txDataRaw === 'string' ? txDataRaw : new TextDecoder().decode(txDataRaw);

        return {
            id: txId,
            data: JSON.parse(txData)
        };
    } catch (error) {
        console.error('Arweave query error:', error);
        throw error;
    }
}

// For client-side use with ArConnect
export async function clientStoreOnArweave(encryptedData: any, credentialID: string): Promise<string> {
    try {
        if (!window.arweaveWallet) {
            throw new Error('ArConnect not available');
        }

        // Create transaction
        const tx = await arweave.createTransaction({
            data: JSON.stringify(encryptedData)
        });

        // Add tags for searching
        tx.addTag('Content-Type', 'application/json');
        tx.addTag('App-Name', 'PasskeyArweaveMapper');
        tx.addTag('Credential-ID', credentialID);

        // Sign with ArConnect
        await window.arweaveWallet.sign(tx);

        // Post to Arweave network
        const response = await arweave.transactions.post(tx);

        if (response.status === 200 || response.status === 202) {
            return tx.id;
        } else {
            throw new Error(`Failed to post transaction: ${response.statusText}`);
        }
    } catch (error) {
        console.error('Arweave client storage error:', error);
        throw error;
    }
}