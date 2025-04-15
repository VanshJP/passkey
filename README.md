# 🔐 Passkey to Arweave Wallet Mapping

A lightweight demo that links a **WebAuthn passkey** to an **Arweave wallet**, letting users authenticate with passkeys instead of the traditional wallet connect flow.

Built with Next.js, ArConnect, and `@simplewebauthn`.

---

## 🌐 Run code

```bash
git clone https://github.com/yourname/passkey-wallet-map.git
cd passkey-wallet-map
npm install
npm run dev ```

---

## 🧠 How It Works

1. **Register a Passkey**  
   Uses the browser’s WebAuthn API to generate a passkey (credential ID) stored on the user’s device.

2. **Connect an Arweave Wallet**  
   Uses ArConnect to request permissions and get the active wallet address.

3. **Create a Mapping**  
   Stores a mapping of `credentialID <-> walletAddress` and uploads it to Arweave as a signed transaction.

4. **Log In with Passkey**  
   Authenticates the user via passkey, fetches the mapped wallet from Arweave, and logs them in without needing to connect again.

---

## 🛠 Tech Stack

- **Next.js 14**
- **Tailwind CSS**
- **ArConnect** for wallet access
- **@simplewebauthn/browser/server** for passkey handling
- **Arweave** for decentralized storage

---

## 🔐 Future Plans

- Encrypt the credential ID before uploading to Arweave
- Make it fully backendless (no database required)
- SDK version for other Arweave apps
- Optional QR or password manager integration for syncing across devices

---