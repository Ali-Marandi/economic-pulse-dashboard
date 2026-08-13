import { describe, expect, it } from "vitest";
import {
  createStreamTelemetry,
  recordConnectionAttempt,
  recordConnectionOpen,
  recordDisconnect,
  recordInvalidMessage,
  recordQuote,
  summarizeStreamTelemetry,
} from "./marketStreamTelemetry";

describe("market stream telemetry", () => {
  it("measures readiness, quote freshness, and connected time after a valid first quote", () => {
    let telemetry = createStreamTelemetry(1_000);
    telemetry = recordConnectionAttempt(telemetry);
    telemetry = recordConnectionOpen(telemetry, 1_120);
    const observation = recordQuote(telemetry, { productId: "BTC-USD", price: 64_000, providerTime: "1970-01-01T00:00:01.150Z" }, 1_360);

    expect(observation.classification).toBe("accepted");
    const snapshot = summarizeStreamTelemetry(observation.telemetry, "live", 2_360);

    expect(snapshot.connectionSuccessRate).toBe(1);
    expect(snapshot.timeToFirstQuoteMs).toBe(240);
    expect(snapshot.quoteStalenessMs).toBe(1_000);
    expect(snapshot.connectedRatio).toBeCloseTo(1_000 / 1_360, 5);
  });

  it("does not allow duplicate or out-of-order quotes to replace a valid chronology", () => {
    let telemetry = createStreamTelemetry(0);
    telemetry = recordConnectionAttempt(telemetry);
    telemetry = recordConnectionOpen(telemetry, 10);
    telemetry = recordQuote(telemetry, { productId: "ETH-USD", price: 2_000, providerTime: "1970-01-01T00:00:01.000Z" }, 1_000).telemetry;

    const duplicate = recordQuote(telemetry, { productId: "ETH-USD", price: 2_000, providerTime: "1970-01-01T00:00:01.000Z" }, 1_100);
    const outOfOrder = recordQuote(duplicate.telemetry, { productId: "ETH-USD", price: 1_999, providerTime: "1970-01-01T00:00:00.900Z" }, 1_200);

    expect(duplicate.classification).toBe("duplicate");
    expect(outOfOrder.classification).toBe("out_of_order");
    const snapshot = summarizeStreamTelemetry(outOfOrder.telemetry, "live", 1_400);

    expect(snapshot.dataQualityIncidentRate).toBeCloseTo(2 / 3, 5);
  });

  it("records reconnect recovery from disconnect to the next valid quote", () => {
    let telemetry = createStreamTelemetry(0);
    telemetry = recordConnectionAttempt(telemetry);
    telemetry = recordConnectionOpen(telemetry, 10);
    telemetry = recordQuote(telemetry, { productId: "BTC-USD", price: 50_000 }, 100).telemetry;
    telemetry = recordDisconnect(telemetry, 500);
    telemetry = recordConnectionAttempt(telemetry);
    telemetry = recordConnectionOpen(telemetry, 800);
    telemetry = recordQuote(telemetry, { productId: "BTC-USD", price: 50_100 }, 1_100).telemetry;

    const snapshot = summarizeStreamTelemetry(telemetry, "live", 1_200);
    expect(snapshot.p95RecoveryMs).toBe(600);
    expect(snapshot.timeToFirstQuoteMs).toBe(300);
  });

  it("exposes invalid-message rate separately from valid data quality incidents", () => {
    let telemetry = createStreamTelemetry(0);
    telemetry = recordConnectionAttempt(telemetry);
    telemetry = recordConnectionOpen(telemetry, 0);
    telemetry = recordInvalidMessage(telemetry);
    telemetry = recordQuote(telemetry, { productId: "BTC-USD", price: 60_000 }, 100).telemetry;

    const snapshot = summarizeStreamTelemetry(telemetry, "live", 200);
    expect(snapshot.invalidMessageRate).toBe(0.5);
    expect(snapshot.dataQualityIncidentRate).toBe(0);
  });
});
