export type StreamStatus = "connecting" | "live" | "degraded" | "offline";

export type StreamTelemetry = {
  sessionStartedAt: number;
  connectionAttempts: number;
  successfulConnections: number;
  subscriptionRequests: number;
  subscriptionAcknowledgements: number;
  disconnects: number;
  validMessages: number;
  invalidMessages: number;
  duplicateMessages: number;
  outOfOrderMessages: number;
  lastTimeToFirstQuoteMs: number | null;
  awaitingFirstQuoteSince: number | null;
  lastQuoteReceivedAt: number | null;
  liveStartedAt: number | null;
  liveDurationMs: number;
  recoveryStartedAt: number | null;
  recoveryMs: number[];
  interArrivalMs: number[];
  lastProviderTimestampByProduct: Record<string, number>;
  lastFingerprintByProduct: Record<string, string>;
};

export type QuoteObservation = {
  productId: string;
  price: number;
  providerTime?: string;
  size?: number;
};

export type QuoteClassification = "accepted" | "duplicate" | "out_of_order";

const MAX_INTER_ARRIVAL_SAMPLES = 120;

export function createStreamTelemetry(now = Date.now()): StreamTelemetry {
  return {
    sessionStartedAt: now,
    connectionAttempts: 0,
    successfulConnections: 0,
    subscriptionRequests: 0,
    subscriptionAcknowledgements: 0,
    disconnects: 0,
    validMessages: 0,
    invalidMessages: 0,
    duplicateMessages: 0,
    outOfOrderMessages: 0,
    lastTimeToFirstQuoteMs: null,
    awaitingFirstQuoteSince: null,
    lastQuoteReceivedAt: null,
    liveStartedAt: null,
    liveDurationMs: 0,
    recoveryStartedAt: null,
    recoveryMs: [],
    interArrivalMs: [],
    lastProviderTimestampByProduct: {},
    lastFingerprintByProduct: {},
  };
}

export function recordConnectionAttempt(telemetry: StreamTelemetry): StreamTelemetry {
  return { ...telemetry, connectionAttempts: telemetry.connectionAttempts + 1 };
}

export function recordConnectionOpen(telemetry: StreamTelemetry, now = Date.now()): StreamTelemetry {
  return {
    ...telemetry,
    successfulConnections: telemetry.successfulConnections + 1,
    awaitingFirstQuoteSince: now,
  };
}

export function recordSubscriptionRequest(telemetry: StreamTelemetry): StreamTelemetry {
  return { ...telemetry, subscriptionRequests: telemetry.subscriptionRequests + 1 };
}

export function recordSubscriptionAcknowledgement(telemetry: StreamTelemetry): StreamTelemetry {
  return { ...telemetry, subscriptionAcknowledgements: telemetry.subscriptionAcknowledgements + 1 };
}

export function recordInvalidMessage(telemetry: StreamTelemetry): StreamTelemetry {
  return { ...telemetry, invalidMessages: telemetry.invalidMessages + 1 };
}

export function recordDisconnect(telemetry: StreamTelemetry, now = Date.now()): StreamTelemetry {
  const liveStartedAt = telemetry.liveStartedAt;
  const liveDurationMs = liveStartedAt === null ? telemetry.liveDurationMs : telemetry.liveDurationMs + Math.max(0, now - liveStartedAt);
  return {
    ...telemetry,
    disconnects: telemetry.disconnects + 1,
    liveDurationMs,
    liveStartedAt: null,
    recoveryStartedAt: telemetry.recoveryStartedAt ?? now,
  };
}

export function recordQuote(
  telemetry: StreamTelemetry,
  quote: QuoteObservation,
  now = Date.now(),
): { telemetry: StreamTelemetry; classification: QuoteClassification } {
  const providerTimestamp = quote.providerTime ? Date.parse(quote.providerTime) : Number.NaN;
  const sourceTimestamp = Number.isFinite(providerTimestamp) ? providerTimestamp : null;
  const fingerprint = `${quote.price}|${quote.size ?? ""}|${quote.providerTime ?? ""}`;
  const previousFingerprint = telemetry.lastFingerprintByProduct[quote.productId];
  const previousProviderTimestamp = telemetry.lastProviderTimestampByProduct[quote.productId];

  if (previousFingerprint === fingerprint) {
    return {
      telemetry: { ...telemetry, validMessages: telemetry.validMessages + 1, duplicateMessages: telemetry.duplicateMessages + 1 },
      classification: "duplicate",
    };
  }

  if (sourceTimestamp !== null && previousProviderTimestamp !== undefined && sourceTimestamp < previousProviderTimestamp) {
    return {
      telemetry: { ...telemetry, validMessages: telemetry.validMessages + 1, outOfOrderMessages: telemetry.outOfOrderMessages + 1 },
      classification: "out_of_order",
    };
  }

  const interArrival = telemetry.lastQuoteReceivedAt === null ? telemetry.interArrivalMs : [...telemetry.interArrivalMs, Math.max(0, now - telemetry.lastQuoteReceivedAt)].slice(-MAX_INTER_ARRIVAL_SAMPLES);
  const nextProviderTimestamps = sourceTimestamp === null
    ? telemetry.lastProviderTimestampByProduct
    : { ...telemetry.lastProviderTimestampByProduct, [quote.productId]: sourceTimestamp };
  const nextFingerprints = { ...telemetry.lastFingerprintByProduct, [quote.productId]: fingerprint };
  const readinessStartedAt = telemetry.awaitingFirstQuoteSince;
  const liveStartedAt = telemetry.liveStartedAt ?? now;
  const recoveryMs = telemetry.recoveryStartedAt === null
    ? telemetry.recoveryMs
    : [...telemetry.recoveryMs, Math.max(0, now - telemetry.recoveryStartedAt)].slice(-MAX_INTER_ARRIVAL_SAMPLES);

  return {
    telemetry: {
      ...telemetry,
      validMessages: telemetry.validMessages + 1,
      lastTimeToFirstQuoteMs: readinessStartedAt === null ? telemetry.lastTimeToFirstQuoteMs : Math.max(0, now - readinessStartedAt),
      awaitingFirstQuoteSince: null,
      lastQuoteReceivedAt: now,
      liveStartedAt,
      recoveryStartedAt: null,
      recoveryMs,
      interArrivalMs: interArrival,
      lastProviderTimestampByProduct: nextProviderTimestamps,
      lastFingerprintByProduct: nextFingerprints,
    },
    classification: "accepted",
  };
}

export type StreamTelemetrySnapshot = {
  connectionSuccessRate: number | null;
  subscriptionAcknowledgementRate: number | null;
  connectedRatio: number;
  quoteStalenessMs: number | null;
  p95InterArrivalMs: number | null;
  p95RecoveryMs: number | null;
  invalidMessageRate: number;
  dataQualityIncidentRate: number;
  timeToFirstQuoteMs: number | null;
};

export function summarizeStreamTelemetry(telemetry: StreamTelemetry, status: StreamStatus, now = Date.now()): StreamTelemetrySnapshot {
  const totalMessages = telemetry.validMessages + telemetry.invalidMessages;
  const elapsed = Math.max(1, now - telemetry.sessionStartedAt);
  const openLiveMs = status === "live" && telemetry.liveStartedAt !== null ? Math.max(0, now - telemetry.liveStartedAt) : 0;
  const p95InterArrivalMs = percentile(telemetry.interArrivalMs, 0.95);

  return {
    connectionSuccessRate: telemetry.connectionAttempts === 0 ? null : telemetry.successfulConnections / telemetry.connectionAttempts,
    subscriptionAcknowledgementRate: telemetry.subscriptionRequests === 0 ? null : telemetry.subscriptionAcknowledgements / telemetry.subscriptionRequests,
    connectedRatio: Math.min(1, (telemetry.liveDurationMs + openLiveMs) / elapsed),
    quoteStalenessMs: telemetry.lastQuoteReceivedAt === null ? null : Math.max(0, now - telemetry.lastQuoteReceivedAt),
    p95InterArrivalMs,
    p95RecoveryMs: percentile(telemetry.recoveryMs, 0.95),
    invalidMessageRate: totalMessages === 0 ? 0 : telemetry.invalidMessages / totalMessages,
    dataQualityIncidentRate: telemetry.validMessages === 0 ? 0 : (telemetry.duplicateMessages + telemetry.outOfOrderMessages) / telemetry.validMessages,
    timeToFirstQuoteMs: telemetry.lastTimeToFirstQuoteMs,
  };
}

function percentile(values: number[], quantile: number): number | null {
  if (values.length === 0) return null;
  const ordered = [...values].sort((left, right) => left - right);
  const index = Math.min(ordered.length - 1, Math.max(0, Math.ceil(ordered.length * quantile) - 1));
  return ordered[index];
}

export function formatDuration(value: number | null): string {
  if (value === null) return "Awaiting data";
  if (value < 1_000) return `${Math.round(value)} ms`;
  return `${(value / 1_000).toFixed(value < 10_000 ? 1 : 0)} s`;
}

export function formatRatio(value: number | null): string {
  if (value === null) return "Awaiting data";
  return `${(value * 100).toFixed(value * 100 >= 99.95 ? 2 : 1)}%`;
}
