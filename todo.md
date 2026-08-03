# Economic Pulse Dashboard - Development TODO

## Phase 1: Database & Backend Setup
- [x] Design and implement database schema (users, watchlist, alerts, market_data, macro_indicators)
- [x] Create Drizzle ORM migrations for all tables
- [x] Set up tRPC procedures for watchlist CRUD operations
- [x] Set up tRPC procedures for alert management (create, update, delete, list)
- [ ] Implement market data caching layer for real-time updates
- [ ] Create API integration wrapper for Alpha Vantage (FX, Equities, Commodities)
- [ ] Create API integration wrapper for FRED (macroeconomic indicators)
- [ ] Set up background job for periodic data refresh (Heartbeat)
- [ ] Write vitest tests for database operations and API integrations

## Phase 2: Frontend Infrastructure & Styling
- [x] Configure Tailwind CSS with dark-first theme (navy, cyan, electric blue palette)
- [x] Update global styles in index.css with color tokens and typography
- [x] Set up theme provider with dark/light toggle capability
- [x] Create DashboardLayout with sidebar navigation (Overview, Macro, Markets, Reports)
- [x] Implement responsive mobile-first design
- [x] Set up authentication context and useAuth hook integration
- [x] Create reusable UI components (KPI card, market row, chart wrapper)

## Phase 3: Core Dashboard Pages
- [x] Build Overview page with KPI cards (CPI, Policy Rate, USD Index, Brent Crude)
- [x] Build Macro page with interactive multi-series chart (PMI, CPI YoY, 10Y Yield)
- [x] Implement range selector (1M, 3M, 6M, 1Y) for macro chart
- [x] Implement series toggle functionality for macro chart
- [x] Build Markets page with tabbed market watch (FX, Equities, Commodities, Rates)
- [x] Implement sparkline trend visualization for each market instrument
- [x] Build Reports page with placeholder for future reporting features

## Phase 4: Advanced Features
- [ ] Implement user watchlist feature (add/remove instruments)
- [ ] Implement persistent alert system (price alerts, threshold alerts)
- [ ] Build alert notification UI with in-app notifications
- [ ] Integrate LLM for AI-powered daily market summary
- [ ] Build sentiment analysis panel for market insights
- [ ] Implement CSV export for chart data
- [ ] Implement PDF export for dashboard snapshots
- [ ] Add real-time data refresh with visual indicators

## Phase 5: Polish & Testing
- [ ] Implement dark/light theme toggle in header
- [ ] Add loading states and error handling across all pages
- [ ] Add empty states for watchlist and alerts
- [ ] Implement responsive design verification on mobile/tablet
- [ ] Write comprehensive vitest tests for all components
- [ ] Performance optimization (lazy loading, code splitting)
- [ ] Accessibility audit (WCAG 2.1 compliance)
- [ ] Cross-browser testing

## Phase 6: Deployment & Release
- [ ] Create GitHub Release with version tag
- [ ] Publish to production via Manus Publish
- [ ] Create comprehensive README with feature documentation
- [ ] Set up GitHub Actions for CI/CD (optional)
- [ ] Document API endpoints and data structures


## Completed Features Summary

### Core Infrastructure
- Database schema with 5 tables (users, watchlist, priceAlerts, marketDataCache, macroIndicators)
- tRPC API with procedures for watchlist, alerts, and market data
- Dark-first theme with Navy, Cyan, and Electric Blue color palette
- Responsive DashboardLayout with sidebar navigation
- Full authentication integration with Manus OAuth

### Dashboard Pages
- Overview: KPI cards (CPI, Policy Rate, USD Index, Brent Crude), market activity chart, quick stats
- Macro: Interactive multi-series chart (PMI, CPI YoY, 10Y Yield), range selector (1M/3M/6M/1Y), indicator cards
- Markets: Tabbed market watch (FX, Equities, Commodities, Rates), sparkline trends, market summary
- Reports: Report generation interface, recent reports list, export options

### UI Components
- KPICard: Reusable component for displaying key performance indicators
- ChartWrapper: Reusable wrapper for chart containers
- MarketRow: Displays market instrument data with sparklines
- Sparkline: Mini trend visualization using Recharts
- Theme toggle button in sidebar footer
