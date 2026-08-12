# Economic Pulse — Commercial & Enterprise Roadmap

## Product Positioning

Economic Pulse is positioned as an institutional macroeconomic intelligence workspace rather than a simple chart dashboard. The product should combine trustworthy data provenance, fast market monitoring, explainable signals, team workflows, and reliable exports for analysts, treasury teams, research desks, and executives.

## Implemented in this delivery

| Capability | Commercial value | Status |
| --- | --- | --- |
| Hardened Windows desktop shell | A native-feeling application with isolated renderer, embedded local server, and controlled external links | Implemented |
| Installer and portable EXE targets | Supports both managed installation and no-install distribution | Implemented in build configuration |
| Automated Windows release pipeline | Reproducible typecheck, tests, Windows packaging, and GitHub Release assets | Implemented |
| Dependency and test baseline repair | Makes the existing PostCSS/Tailwind setup reproducible and keeps the baseline test suite green | Implemented |
| Dark-first analyst workspace | Reduces visual fatigue for long monitoring sessions | Existing and retained |

## Priority enterprise capabilities

| Priority | Capability | Acceptance criterion |
| --- | --- | --- |
| P0 | Data-source adapters for FRED, Alpha Vantage, ECB, and World Bank | Every observation has source, timestamp, frequency, unit, revision state, and freshness status |
| P0 | Durable watchlists and threshold alerts | Users can create, edit, pause, and acknowledge alerts with audit events |
| P0 | Data-quality and freshness center | Stale, delayed, missing, and revised series are visible before they affect decisions |
| P0 | Role-based access control | Owner, analyst, viewer, and administrator permissions are enforced server-side |
| P1 | Scenario and shock analysis | Users can define rate, FX, commodity, and inflation shocks and compare outputs |
| P1 | Explainable AI briefings | Every generated summary cites the series and observations used, with a visible confidence and limitations panel |
| P1 | Scheduled report distribution | PDF/Excel/CSV reports can be generated on a schedule and delivered to approved recipients |
| P1 | Team annotations and decision log | Analysts can annotate charts, mention teammates, and preserve decision context |
| P1 | Saved workspaces | Layout, filters, selected series, date ranges, and chart preferences are restorable |
| P2 | Forecast model registry | Models, vintages, assumptions, backtests, and forecast errors are versioned |
| P2 | SSO, SCIM, and audit export | Enterprise identity and compliance teams can manage access and export immutable audit records |
| P2 | OpenAPI and webhooks | External systems can consume normalized observations, alerts, and report events |
| P2 | Offline encrypted cache | Desktop users can inspect the latest approved snapshot during connectivity loss |

## Competitive standard

The product should be evaluated against institutional terminals and modern analytics workspaces on five dimensions: provenance, latency, explainability, collaboration, and operational reliability. The differentiator should not be attempting to replicate every asset class; it should be a focused, transparent macro intelligence workflow with superior usability, fast onboarding, and auditable outputs.

## Release gates

A commercial release should pass typecheck, unit tests, dependency audit, packaging validation, clean-install smoke tests, accessibility review, and a documented rollback procedure. Production data adapters must also include rate-limit handling, retries with backoff, caching, and explicit licensing notes for each provider.
