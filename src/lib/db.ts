// Simple in-memory database for demo purposes
// In production, you would use a real database

type Credential = {
    id: string;
    publicKey: Buffer;
    counter: number;
    transports?: string[];
};

type User = {
    id: string;
    username: string;
    challenge?: string;
    credentials: Credential[];
};

// In-memory storage
const users: Map<string, User> = new Map();
const credentialToUserMap: Map<string, string> = new Map();

export async function getUser(userId: string): Promise<User | null> {
    return users.get(userId) || null;
}

export async function saveUser(userId: string, userData: User): Promise<void> {
    users.set(userId, userData);
}

export async function saveCredential(userId: string, credential: Credential): Promise<void> {
    const user = users.get(userId);

    if (!user) {
        throw new Error('User not found');
    }

    // Find if credential already exists
    const existingCredentialIndex = user.credentials.findIndex(cred => cred.id === credential.id);

    if (existingCredentialIndex >= 0) {
        // Update existing credential
        user.credentials[existingCredentialIndex] = credential;
    } else {
        // Add new credential
        user.credentials.push(credential);
    }

    // Update the credential to user mapping
    credentialToUserMap.set(credential.id, userId);

    // Update the user
    users.set(userId, user);
}

export async function getUserByCredentialID(credentialId: string): Promise<{ userId: string, credential: Credential } | null> {
    const userId = credentialToUserMap.get(credentialId);

    if (!userId) {
        return null;
    }

    const user = users.get(userId);

    if (!user) {
        return null;
    }

    const credential = user.credentials.find(cred => cred.id === credentialId);

    if (!credential) {
        return null;
    }

    return { userId, credential };
}