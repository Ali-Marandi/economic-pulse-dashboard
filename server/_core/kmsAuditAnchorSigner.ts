import type { AuditAnchorAlgorithm, AuditAnchorSigner } from "./auditBatchIntegrity";

export type KmsDigestMessageType = "DIGEST";

/**
 * Provider-neutral shape that an AWS KMS, GCP KMS or on-prem HSM adapter must
 * implement. The application sends a precomputed SHA-256 digest only; key
 * material and provider credentials never enter the app domain.
 */
export type KmsDigestClient = {
  sign(input: {
    keyId: string;
    algorithm: AuditAnchorAlgorithm;
    messageType: KmsDigestMessageType;
    message: Uint8Array;
  }): Promise<{ signature: Uint8Array }>;
  verify(input: {
    keyId: string;
    algorithm: AuditAnchorAlgorithm;
    messageType: KmsDigestMessageType;
    message: Uint8Array;
    signature: Uint8Array;
  }): Promise<{ valid: boolean }>;
};

function digestBytes(digestHex: string): Uint8Array {
  if (!/^[a-f0-9]{64}$/i.test(digestHex)) {
    throw new Error("Audit anchor digest must be a 32-byte SHA-256 hexadecimal value.");
  }
  return new Uint8Array(Buffer.from(digestHex, "hex"));
}

function signatureToBase64Url(signature: Uint8Array): string {
  return Buffer.from(signature).toString("base64url");
}

function signatureFromBase64Url(signature: string): Uint8Array {
  if (!/^[A-Za-z0-9_-]+$/.test(signature)) {
    throw new Error("Audit anchor signature must use base64url encoding.");
  }
  return new Uint8Array(Buffer.from(signature, "base64url"));
}

/**
 * Wraps a cloud KMS or HSM client in the audit-anchor signer contract. The
 * adapter uses MessageType=DIGEST to avoid ambiguous rehashing by providers.
 */
export function createKmsAuditAnchorSigner(client: KmsDigestClient): AuditAnchorSigner {
  return {
    async signDigest({ keyId, algorithm, digestHex }) {
      const response = await client.sign({
        keyId,
        algorithm,
        messageType: "DIGEST",
        message: digestBytes(digestHex),
      });
      return signatureToBase64Url(response.signature);
    },
    async verifyDigest({ keyId, algorithm, digestHex, signature }) {
      const response = await client.verify({
        keyId,
        algorithm,
        messageType: "DIGEST",
        message: digestBytes(digestHex),
        signature: signatureFromBase64Url(signature),
      });
      return response.valid;
    },
  };
}
