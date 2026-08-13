# Market Data Connector Source Evidence

This record supports the next-phase market-streaming design. It documents provider capabilities rather than endorsing any security, market-data, or investment outcome.

| Provider | Verified capability | Integration decision | Official source |
| --- | --- | --- | --- |
| Coinbase Exchange | Its market-data APIs are public, and its available connectivity includes a WebSocket feed for market data. Trading APIs require authentication. | The desktop renderer may subscribe only to read-only public market data. It must not hold trading or account credentials. | [Coinbase Exchange API overview](https://docs.cdp.coinbase.com/exchange/docs/websocket-overview) |
| Coinbase Advanced Trade | It supports a WebSocket protocol for real-time market data and account updates; account or trading operations need an API key. | Keep account data and any authenticated capabilities outside the desktop renderer. | [Coinbase Advanced Trade API overview](https://docs.cdp.coinbase.com/advanced-trade/docs/ws-overview) |
| Finnhub | It streams real-time trades for US stocks, FX, and crypto via WebSocket. Its documentation specifies API-key authentication and notes one connection per API key. | Implement as a server-side adapter with secret storage, connection ownership, entitlement checks, and normalized events. | [Finnhub WebSocket trades documentation](https://finnhub.io/docs/api/websocket-trades) |

## Product safeguards

The client-side pilot is read-only and explicitly labels its source, channel, receipt time, and connection state. Forecasting controls are isolated from market-stream events, so a tick cannot silently alter a scenario input. Production equity, FX, rate, or news feeds must pass through an organization-controlled backend gateway, with provider credentials, rate limits, data-license checks, source timestamps, reconnect observability, and immutable audit records.

## Configuration finding

As of this implementation session, no enabled market-data provider integration was found in the workspace connector inventory. The production adapter UI therefore remains in a safe "not configured" state until the organization provides and approves the applicable provider credential and commercial data entitlement.
