// static/js/crypto.js
// ChatCrypto: ECDH (P-256) -> HKDF -> AES-GCM + HMAC-SHA256
// Exports functions via window.ChatCrypto

(function () {
  const enc = new TextEncoder();
  const dec = new TextDecoder();

  // ---------- Helpers ArrayBuffer <-> Base64 ----------
  function abToBase64(buf) {
    const bytes = new Uint8Array(buf);
    let binary = "";
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
    }
    return btoa(binary);
  }

  function base64ToAb(base64) {
    const binary = atob(base64);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
    return bytes.buffer;
  }

  // ---------- Key export/import (ECDH public key raw format) ----------
  async function exportPublicKeyRawBase64(publicKey) {
    // For ECDH P-256 we export as "raw" (X||Y)
    const raw = await crypto.subtle.exportKey("raw", publicKey);
    return abToBase64(raw);
  }

  async function importPublicKeyRawBase64(base64) {
    const ab = base64ToAb(base64);
    return await crypto.subtle.importKey(
      "raw",
      ab,
      { name: "ECDH", namedCurve: "P-256" },
      false,
      []
    );
  }

  // ---------- Signing (ECDSA) helpers - optional for authenticity ----------
  async function generateSigningKeyPair() {
    // ECDSA P-256 for signatures (optional)
    return await crypto.subtle.generateKey(
      { name: "ECDSA", namedCurve: "P-256" },
      true,
      ["sign", "verify"]
    );
  }

  async function exportSigningPublicKeyPEM(publicKey) {
    const spki = await crypto.subtle.exportKey("spki", publicKey);
    const b64 = abToBase64(spki);
    const pem = `-----BEGIN PUBLIC KEY-----\n${b64.match(/.{1,64}/g).join("\n")}\n-----END PUBLIC KEY-----`;
    return pem;
  }

  async function signDataECDSA(privateKey, data) {
    // data: Uint8Array or ArrayBuffer
    return await crypto.subtle.sign(
      { name: "ECDSA", hash: "SHA-256" },
      privateKey,
      data
    ); // returns signature ArrayBuffer (DER-encoded)
  }

  async function verifySignatureECDSA(publicKey, signature, data) {
    return await crypto.subtle.verify(
      { name: "ECDSA", hash: "SHA-256" },
      publicKey,
      signature,
      data
    );
  }

  // ---------- Generate ECDH key pair ----------
  async function generateDHKeyPair() {
    // We keep private key non-extractable for better security
    const kp = await crypto.subtle.generateKey(
      {
        name: "ECDH",
        namedCurve: "P-256"
      },
      false, // private key non-extractable (recommended)
      ["deriveKey", "deriveBits"]
    );
    return kp; // { publicKey, privateKey }
  }

  // ---------- Derive session keys via HKDF ----------
  // Given our privateKey (CryptoKey) and peerPublicKey (CryptoKey),
  // derive two keys:
  //  - K_enc : AES-GCM 256 (CryptoKey)
  //  - K_mac : HMAC-SHA256 (CryptoKey)
  async function deriveSessionKeysFromPeer(privateKey, peerPublicKey) {
    // 1) derive raw shared secret bits (we can deriveBits or deriveKey; deriveBits is fine)
    // Use deriveBits to get raw shared secret
    const sharedBits = await crypto.subtle.deriveBits(
      { name: "ECDH", public: peerPublicKey },
      privateKey,
      256 // 256 bits
    ); // ArrayBuffer

    // 2) import raw shared secret as a Key usable by HKDF
    const hkdfKey = await crypto.subtle.importKey(
      "raw",
      sharedBits,
      { name: "HKDF" },
      false,
      ["deriveKey"]
    );

    // 3) derive K_enc (AES-GCM 256)
    const K_enc = await crypto.subtle.deriveKey(
      {
        name: "HKDF",
        hash: "SHA-256",
        salt: new Uint8Array([]), // could use context-specific salt
        info: enc.encode("whatschat enc")
      },
      hkdfKey,
      { name: "AES-GCM", length: 256 },
      false, // non-extractable (recommended)
      ["encrypt", "decrypt"]
    );

    // 4) derive K_mac (HMAC-SHA256)
    const K_mac = await crypto.subtle.deriveKey(
      {
        name: "HKDF",
        hash: "SHA-256",
        salt: new Uint8Array([]),
        info: enc.encode("whatschat mac")
      },
      hkdfKey,
      { name: "HMAC", hash: "SHA-256", length: 256 },
      false,
      ["sign", "verify"]
    );

    return { K_enc, K_mac };
  }

  // ---------- AES-GCM encryption + HMAC creation ----------
  async function encryptMessage(K_enc, K_mac, plaintext) {
    // plaintext: string
    const iv = crypto.getRandomValues(new Uint8Array(12)); // 96-bit recommended
    const ptBuf = enc.encode(plaintext);

    // AES-GCM encryption
    const ciphertextBuf = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: iv },
      K_enc,
      ptBuf
    ); // ArrayBuffer

    // Compute HMAC over (ciphertext || iv)
    const concat = new Uint8Array(ciphertextBuf.byteLength + iv.byteLength);
    concat.set(new Uint8Array(ciphertextBuf), 0);
    concat.set(iv, ciphertextBuf.byteLength);

    const macBuf = await crypto.subtle.sign(
      "HMAC",
      K_mac,
      concat.buffer
    ); // ArrayBuffer

    // Return base64-encoded fields
    return {
      ciphertext: abToBase64(ciphertextBuf),
      iv: abToBase64(iv.buffer),
      mac: abToBase64(macBuf)
    };
  }

  // ---------- Verify HMAC + AES-GCM decrypt ----------
  async function decryptMessage(K_enc, K_mac, ciphertext_b64, iv_b64, mac_b64) {
    const ciphertextBuf = base64ToAb(ciphertext_b64);
    const ivBuf = base64ToAb(iv_b64);
    const macBuf = base64ToAb(mac_b64);

    // Recompute HMAC over ciphertext||iv
    const concat = new Uint8Array(ciphertextBuf.byteLength + ivBuf.byteLength);
    concat.set(new Uint8Array(ciphertextBuf), 0);
    concat.set(new Uint8Array(ivBuf), ciphertextBuf.byteLength);

    const verified = await crypto.subtle.verify(
      "HMAC",
      K_mac,
      macBuf,
      concat.buffer
    ); // boolean

    if (!verified) {
      throw new Error("HMAC verification failed — integrity check failed.");
    }

    // If HMAC ok -> decrypt
    const plaintextBuf = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: new Uint8Array(ivBuf) },
      K_enc,
      ciphertextBuf
    );

    return dec.decode(plaintextBuf);
  }

  // ---------- Convenience: export/import session public key (raw base64) ----------
  async function exportDHPublicKeyBase64(publicKey) {
    return await exportPublicKeyRawBase64(publicKey);
  }

  async function importDHPublicKeyBase64(base64) {
    return await importPublicKeyRawBase64(base64);
  }

  // ---------- Persistence helpers (very small, with notes) ----------
  // NOTE: Best practice is to keep private keys non-exportable and rely on browser's storage
  // (IndexedDB) to persist CryptoKey objects. For portability and simplicity in this project,
  // we provide a safe-ish helper that:
  //  - stores the user's SIGNING public key (or DH public) as base64 in localStorage
  //  - does NOT export non-extractable private keys
  //
  // If you want to persist private keys across sessions, you must either:
  //  - generate extractable keys and export JWK (less secure), or
  //  - rely on the browser keeping the non-extractable CryptoKey (structured clone into IndexedDB).
  //
  // Below we implement a small IndexedDB wrapper to store CryptoKey using structured clone.
  // Modern browsers support structured clone of CryptoKey (for non-extractable keys).
  function openIndexedDB(dbName = "whatschat-keys") {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(dbName, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains("keys")) {
          db.createObjectStore("keys");
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async function idbPut(keyName, value) {
    const db = await openIndexedDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("keys", "readwrite");
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);

      const store = tx.objectStore("keys");
      store.put(value, keyName);
    });
  }

  async function idbGet(keyName) {
    const db = await openIndexedDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("keys", "readonly");
      const store = tx.objectStore("keys");
      const req = store.get(keyName);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  // Save CryptoKey object (structured clone)
  async function saveCryptoKeyToIDB(name, cryptoKey) {
    // modern browsers allow storing CryptoKey via structured clone in IndexedDB
    // This keeps non-extractable keys safe (not exportable)
    return await idbPut(name, cryptoKey);
  }

  async function loadCryptoKeyFromIDB(name) {
    return await idbGet(name);
  }

  // ---------- High-level initialization helper ----------
  // Usage scenario for chat:
  // 1) call generateDHKeyPair() to create local DH keys
  // 2) exportDHPublicKeyBase64() and send to peer via server
  // 3) when receiving peer's public key, call importDHPublicKeyBase64()
  // 4) call deriveSessionKeysFromPeer(localPrivateKey, peerPublicKey)
  async function initLocalDHOrLoad(storageKey = "local_dh") {
    // Try to load a saved keypair (structured clone)
    try {
      const saved = await loadCryptoKeyFromIDB(storageKey);
      if (saved && saved.privateKey && saved.publicKey) {
        return saved;
      }
    } catch (e) {
      // ignore - db may not have key or browser unsupported
    }
    // Generate fresh pair and try to persist
    const kp = await generateDHKeyPair(); // non-extractable private
    // Try to persist structured keypair (may or may not work depending on browser)
    try {
      await saveCryptoKeyToIDB(storageKey, kp);
    } catch (e) {
      // If persistence fails, still return kp - but note it won't survive reloads
      console.warn("Persisting CryptoKey to IndexedDB failed:", e);
    }
    return kp;
  }

  // ---------- Export public signing key (SPKI PEM) - convenience ----------
  async function exportPublicSigningKeyPEMFromCryptoKey(publicKey) {
    const spki = await crypto.subtle.exportKey("spki", publicKey);
    const b64 = abToBase64(spki);
    return `-----BEGIN PUBLIC KEY-----\n${b64.match(/.{1,64}/g).join("\n")}\n-----END PUBLIC KEY-----`;
  }

  // ---------- Expose API ----------
  window.ChatCrypto = {
    // helpers
    abToBase64,
    base64ToAb,

    // ECDH (DH) key generation / export / import
    generateDHKeyPair,
    exportDHPublicKeyBase64,
    importDHPublicKeyBase64,
    initLocalDHOrLoad,

    // derive session keys
    deriveSessionKeysFromPeer,

    // encrypt / decrypt
    encryptMessage,
    decryptMessage,

    // signing (optional)
    generateSigningKeyPair,
    signDataECDSA,
    verifySignatureECDSA,
    exportSigningPublicKeyPEM,
    exportPublicSigningKeyPEMFromCryptoKey,

    // persistence helpers
    saveCryptoKeyToIDB,
    loadCryptoKeyFromIDB,
    idbPut,
    idbGet
  };
})();
