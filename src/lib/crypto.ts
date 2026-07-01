'use client';

/** UUID → SHA-256 → AES-GCM 256-bit CryptoKey */
async function deriveKey(uuid: string): Promise<CryptoKey> {
  const raw = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(uuid));
  return crypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

/** 평문 → AES-GCM 암호화 → base64 (IV 12바이트 앞에 포함) */
export async function encryptData(uuid: string, plaintext: string): Promise<string> {
  const key = await deriveKey(uuid);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const enc = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(plaintext),
  );
  const combined = new Uint8Array(12 + enc.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(enc), 12);
  return btoa(String.fromCharCode(...combined));
}

/** base64(IV+암호문) → AES-GCM 복호화 → 평문 */
export async function decryptData(uuid: string, ciphertext: string): Promise<string> {
  const key = await deriveKey(uuid);
  const combined = Uint8Array.from(atob(ciphertext), c => c.charCodeAt(0));
  const dec = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: combined.slice(0, 12) },
    key,
    combined.slice(12),
  );
  return new TextDecoder().decode(dec);
}
