import { describe, expect, it } from "vitest";
import { createKmsAuditAnchorSigner, type KmsDigestClient } from "./kmsAuditAnchorSigner";

const digestHex = "a".repeat(64);

function client(): KmsDigestClient {
  return {
    async sign({ keyId, algorithm, messageType, message }) {
      return { signature: new TextEncoder().encode(`${keyId}:${algorithm}:${messageType}:${Buffer.from(message).toString("hex")}`) };
    },
    async verify({ keyId, algorithm, messageType, message, signature }) {
      const expected = `${keyId}:${algorithm}:${messageType}:${Buffer.from(message).toString("hex")}`;
      return { valid: Buffer.from(signature).toString() === expected };
    },
  };
}

describe("KMS audit anchor signer", () => {
  it("uses digest-only messages and base64url signatures", async () => {
    const signer = createKmsAuditAnchorSigner(client());
    const signature = await signer.signDigest({
      keyId: "kms://audit/versions/3",
      algorithm: "RSASSA_PSS_SHA_256",
      digestHex,
    });
    expect(signature).toMatch(/^[A-Za-z0-9_-]+$/);
    await expect(signer.verifyDigest({
      keyId: "kms://audit/versions/3",
      algorithm: "RSASSA_PSS_SHA_256",
      digestHex,
      signature,
    })).resolves.toBe(true);
  });

  it("rejects malformed digests and signatures before calling the KMS adapter", async () => {
    const signer = createKmsAuditAnchorSigner(client());
    await expect(signer.signDigest({
      keyId: "kms://audit/versions/3",
      algorithm: "ECDSA_SHA_256",
      digestHex: "not-a-digest",
    })).rejects.toThrow("32-byte SHA-256");
    await expect(signer.verifyDigest({
      keyId: "kms://audit/versions/3",
      algorithm: "ECDSA_SHA_256",
      digestHex,
      signature: "not valid+base64",
    })).rejects.toThrow("base64url");
  });
});
