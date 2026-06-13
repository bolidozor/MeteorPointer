/**
 * Device identity = an Ed25519 key pair generated on the phone.
 *
 * The private key never leaves the device — it is held in the OS secure store
 * (Keychain / Keystore) via react-native-keychain. We expose only the public
 * key (for registration) and a signing helper (for the auth challenge).
 */
import nacl from 'tweetnacl';
import { decodeBase64, decodeUTF8, encodeBase64 } from 'tweetnacl-util';
import * as Keychain from 'react-native-keychain';

const SERVICE = 'cz.bolidozor.meteorpointer.devicekey';

async function loadSecretKey(): Promise<Uint8Array | null> {
  const creds = await Keychain.getGenericPassword({ service: SERVICE });
  if (!creds) {
    return null;
  }
  return decodeBase64(creds.password);
}

/** Public key (base64) of the existing key pair, or null if none is stored. */
export async function getPublicKey(): Promise<string | null> {
  const secret = await loadSecretKey();
  if (!secret) {
    return null;
  }
  return encodeBase64(nacl.sign.keyPair.fromSecretKey(secret).publicKey);
}

/** Generate and persist a new key pair, returning its public key (base64). */
export async function createKeypair(): Promise<string> {
  const pair = nacl.sign.keyPair();
  await Keychain.setGenericPassword('device', encodeBase64(pair.secretKey), {
    service: SERVICE,
  });
  return encodeBase64(pair.publicKey);
}

/** Ensure a key pair exists; return its public key (base64). */
export async function ensureKeypair(): Promise<string> {
  return (await getPublicKey()) ?? (await createKeypair());
}

/** Sign a message (the challenge nonce) with the device key. */
export async function sign(message: string): Promise<string | null> {
  const secret = await loadSecretKey();
  if (!secret) {
    return null;
  }
  return encodeBase64(nacl.sign.detached(decodeUTF8(message), secret));
}

/** Remove the device key (on account deletion / reset). */
export async function clearKeypair(): Promise<void> {
  await Keychain.resetGenericPassword({ service: SERVICE });
}
