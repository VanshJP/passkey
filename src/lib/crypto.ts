import * as crypto from 'crypto';

// Define types for encrypted data
export interface EncryptedPackage {
    encryptedData: string;
    iv: string;
    authTag: string;
}

// Define types for mapping data
export interface MappingData {
    credentialID: string;
    walletAddress: string;
    timestamp: number;
}

// Get encryption key from environment or generate a secure one
// WARNING: In production, use a proper secrets management system
const getEncryptionKey = (): Buffer => {
    const envKey = process.env.ENCRYPTION_KEY;

    if (envKey) {
        // If environment key exists, use it (should be 32 bytes/256 bits for AES-256)
        return Buffer.from(envKey, 'hex');
    }

    // For development only: generate a random key and log warning
    console.warn(
        'WARNING: No encryption key found in environment variables. ' +
        'Using a generated key - this is NOT secure for production!'
    );

    return crypto.randomBytes(32); // 32 bytes = 256 bits
};

// Get or generate the encryption key
const ENCRYPTION_KEY = getEncryptionKey();

/**
 * Encrypts data using AES-256-GCM
 * 
 * @param data The data to encrypt
 * @returns Object containing encrypted data, initialization vector, and authentication tag
 */
export async function encryptData(data: MappingData): Promise<EncryptedPackage> {
    try {
        // Generate a random initialization vector
        const iv = crypto.randomBytes(16);

        // Create cipher using AES-256-GCM
        const cipher = crypto.createCipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);

        // Encrypt the data
        let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
        encrypted += cipher.final('hex');

        // Get the authentication tag
        const authTag = cipher.getAuthTag();

        return {
            encryptedData: encrypted,
            iv: iv.toString('hex'),
            authTag: authTag.toString('hex')
        };
    } catch (error) {
        console.error('Encryption error:', error);
        throw new Error(`Failed to encrypt data: ${(error as Error).message}`);
    }
}

/**
 * Decrypts data that was encrypted with AES-256-GCM
 * 
 * @param encryptedPackage Object containing encrypted data, initialization vector, and authentication tag
 * @returns The decrypted data
 */
export async function decryptData(encryptedPackage: EncryptedPackage): Promise<MappingData> {
    try {
        // Validate input
        if (!encryptedPackage.encryptedData || !encryptedPackage.iv || !encryptedPackage.authTag) {
            throw new Error('Invalid encrypted package: missing required fields');
        }

        // Create decipher
        const decipher = crypto.createDecipheriv(
            'aes-256-gcm',
            ENCRYPTION_KEY,
            Buffer.from(encryptedPackage.iv, 'hex')
        );

        // Set auth tag
        decipher.setAuthTag(Buffer.from(encryptedPackage.authTag, 'hex'));

        // Decrypt the data
        let decrypted = decipher.update(encryptedPackage.encryptedData, 'hex', 'utf8');
        decrypted += decipher.final('utf8');

        // Parse and return the data
        return JSON.parse(decrypted) as MappingData;
    } catch (error) {
        if (error instanceof SyntaxError) {
            throw new Error('Failed to parse decrypted data: invalid JSON');
        }

        console.error('Decryption error:', error);
        throw new Error(`Failed to decrypt data: ${(error as Error).message}`);
    }
}

/**
 * Generates a random encryption key for AES-256 (32 bytes)
 * Use this function to generate a key for your .env file
 * 
 * @returns Hex string of the generated key
 */
export function generateEncryptionKey(): string {
    return crypto.randomBytes(32).toString('hex');
}