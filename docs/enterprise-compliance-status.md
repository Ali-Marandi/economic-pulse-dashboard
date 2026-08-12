# Enterprise Compliance Status

## GitHub Actions review — 2026-08-12

The most recent CI workflow run (`CI #30`, commit `115ce92`) completed successfully. The matching `Security and Vulnerability Monitoring #7` run failed because the `npm audit` job found 11 vulnerabilities in the prior dependency graph: 1 low, 5 moderate, 4 high, and 1 critical.

Directly affected dependencies were updated locally to `electron@43.4.0`, `vitest@4.1.10`, and the latest available Drizzle packages. Type checking, unit testing, and production build passed after the update. The build still reports two non-blocking analytics placeholder warnings and a bundle-size warning. The npm audit API then returned a transient HTTP 400/retired-endpoint error in the sandbox, so the security workflow must be updated to use a supported audit approach and the GitHub Actions result rechecked after push.

## Active branch ruleset configuration

A ruleset named **Enterprise Main Branch Protection** has been prepared for the default branch (`main`) with active enforcement and no bypass actors. The selected controls are:

- pull requests required before merging;
- one approving review required;
- stale approvals dismissed after new commits;
- conversations resolved before merge;
- pull-request branch kept up to date before merge;
- `quality` GitHub Actions status check required;
- force pushes blocked;
- code-scanning results required.

The ruleset is pending final creation in GitHub.

## Remaining repository controls

Secret scanning and push protection, Dependabot alerts, private vulnerability reporting, and GitHub Advanced Security features must be enabled from the repository Security and analysis settings if the repository plan makes them available.

## References

- Security workflow run: https://github.com/Ali-Marandi/economic-pulse-dashboard/actions/runs/31643444239
- CI workflow run: https://github.com/Ali-Marandi/economic-pulse-dashboard/actions/runs/31643444244
- Rulesets page: https://github.com/Ali-Marandi/economic-pulse-dashboard/settings/rules

