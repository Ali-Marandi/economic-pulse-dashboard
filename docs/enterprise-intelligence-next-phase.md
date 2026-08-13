# Enterprise Intelligence and Market Streaming — Next-Phase Architecture

**Status:** Implemented desktop pilot plus production integration design.  
**Scope:** Explainable scenario planning, public read-only market streaming, and a secure provider-control boundary.

## What is now in the product

The Overview workspace now includes a **Forecast Studio**. It provides a transparent scenario distribution, central planning path, uncertainty range, horizon control, driver attribution, model-card metadata, and a copyable review brief. The module is intentionally a deterministic, explainable planning simulation: it does not represent a market consensus, call an external model, or produce an investment recommendation.

The workspace also includes a **Live Market Stream**. It connects to a public, read-only Coinbase Exchange WebSocket feed for BTC-USD and ETH-USD and labels connection state, source, channel, and received timestamps. Coinbase states that its market-data APIs are public and offers a WebSocket feed for market data, while trading APIs require authentication.[1]

> **Control boundary:** Live events and forecast inputs are deliberately separated. A streaming quote cannot silently alter a planning assumption or forecast output.

## Production connector architecture

| Layer | Responsibility | Security and governance control |
| --- | --- | --- |
| Desktop client | Presents normalized quotes, source metadata, feed state, and explicit scenario controls. | No provider secret, account permission, or trading action is stored in the renderer. |
| Provider gateway | Owns API credentials, provider protocol, symbol allowlist, entitlements, rate-limit handling, and reconnect lifecycle. | Secrets remain server-side; every event is tagged with provider, source timestamp, ingest time, and schema version. |
| Event normalization | Maps vendor payloads into a stable quote/event contract. | Validates symbol, price, timestamp, currency, and freshness before publication. |
| Forecast service | Runs approved models with versioned input snapshots and reviewable explanations. | Keeps model/prompt lineage, evaluation metrics, human approval, and immutable output evidence. |
| Governance plane | Retains audit evidence and governs release, access, alerts, and override policy. | Enforces role separation, retention, escalation, and change-management controls. |

## Two viable deployment paths

| Approach | Tradeoffs | Cost | Setup complexity |
| --- | --- | --- | --- |
| **Public-stream desktop pilot** | Immediate live market demonstration with read-only crypto data, but not suitable for licensed equity, rates, FX, or news distribution. | No provider credential in the product. | Low. The included Coinbase public-feed adapter runs in the client. |
| **Managed enterprise data gateway** | Supports licensed asset classes, entitlement enforcement, audit retention, and multi-user access, but requires an approved provider agreement and backend operations. | Depends on selected data licence and managed hosting. | Medium to high. Requires a backend gateway, provider key, security review, and data-quality monitoring. |

The first path is implemented in this release. The second path is the recommended production route for equity, FX, rates, fixed income, macro releases, or premium news. Finnhub documents real-time trades over WebSocket for US stocks, FX, and crypto, but requires API-key authentication and permits only one connection per key; this makes a server-side connection owner the appropriate design.[2]

## Design of the AI forecasting service

The desktop simulation is a safe UI and governance prototype. A production AI forecaster should be implemented as a separate, versioned service with the following contract:

1. **Feature snapshot.** Freeze the source identifiers, observation and release timestamps, transformations, and data-quality flags for every forecast request.
2. **Model ensemble.** Combine a transparent baseline model with a constrained AI narrative/explanation layer. A narrative must never overwrite a numeric baseline without a recorded policy-approved rule.
3. **Uncertainty and calibration.** Return scenario probabilities, confidence intervals, calibration data, and an explicit out-of-distribution indicator rather than a single unsupported number.
4. **Explainability.** Store driver attribution, counterfactual sensitivity, model version, prompt/template version if used, and the approving reviewer.
5. **Human release gate.** Require an authorized analyst to approve publication when freshness, confidence, or data-quality thresholds fail.
6. **Monitoring.** Track drift, realized-versus-predicted error, missing feeds, stale data, model version changes, and provider schema changes.

## Additional commercial capabilities prioritized for the next backlog

| Priority | Capability | Commercial value | Implementation prerequisite |
| --- | --- | --- | --- |
| P0 | Server-side licensed market-data gateway | Adds enterprise equity, FX, rates, news, and macro event coverage with controlled access. | Provider agreement, credential, entitlement model, and managed backend. |
| P0 | Forecast approval workflow | Gives risk, research, and compliance teams a maker-checker release process. | User identity, roles, durable audit store, and notification policy. |
| P1 | Model registry and evaluation dashboard | Makes model changes measurable, reversible, and reviewable. | Persistent metadata store and realized-outcome dataset. |
| P1 | Alert policy engine | Converts stale feeds, forecast regime changes, and stress thresholds into role-based action. | Event gateway, policy rules, and organization notification channel. |
| P2 | Portfolio/sector exposure mapper | Links macro scenarios to declared corporate or portfolio exposures without implying execution advice. | Customer-provided exposure data, access controls, and privacy policy. |
| P2 | Data contract and replay service | Enables incident review and reproducible historical analysis. | Immutable event storage and schema-versioning process. |

## Validation completed locally

The implementation passed `npm run check`, `npm test`, and `npm run build`. The production build emitted the new components without a TypeScript or Vite build error. Interactive local rendering is protected by the product's OAuth gate; therefore no authenticated visual walk-through was executed in the sandbox.

## References

[1] [Coinbase Exchange API overview](https://docs.cdp.coinbase.com/exchange/docs/websocket-overview)  
[2] [Finnhub WebSocket trades documentation](https://finnhub.io/docs/api/websocket-trades)  
