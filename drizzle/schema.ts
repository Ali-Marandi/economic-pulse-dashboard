import { int, mysqlEnum, mysqlTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Enterprise tenancy and authorization foundation. Existing product data can
 * be migrated to a default organization before tenant scoping is enforced.
 */
export const organizations = mysqlTable("organizations", {
  id: varchar("id", { length: 36 }).primaryKey(),
  name: varchar("name", { length: 160 }).notNull(),
  status: mysqlEnum("status", ["active", "suspended", "archived"]).default("active").notNull(),
  dataResidency: varchar("dataResidency", { length: 32 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const organizationMembers = mysqlTable("organizationMembers", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: varchar("organizationId", { length: 36 }).notNull().references(() => organizations.id, { onDelete: "cascade" }),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: mysqlEnum("role", ["OrgAdmin", "RiskManager", "Analyst", "Viewer", "Auditor", "StreamOperator"]).default("Viewer").notNull(),
  status: mysqlEnum("status", ["active", "invited", "suspended", "deprovisioned"]).default("invited").notNull(),
  idpSubject: varchar("idpSubject", { length: 255 }),
  joinedAt: timestamp("joinedAt"),
  deprovisionedAt: timestamp("deprovisionedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => ({
  organizationUserUnique: uniqueIndex("organization_members_org_user_unique").on(table.organizationId, table.userId),
}));

export const ssoConnections = mysqlTable("ssoConnections", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: varchar("organizationId", { length: 36 }).notNull().references(() => organizations.id, { onDelete: "cascade" }),
  protocol: mysqlEnum("protocol", ["oidc", "saml"]).default("oidc").notNull(),
  issuer: varchar("issuer", { length: 512 }).notNull(),
  clientId: varchar("clientId", { length: 255 }).notNull(),
  jwksUri: varchar("jwksUri", { length: 512 }),
  secretRef: varchar("secretRef", { length: 255 }),
  scimEnabled: int("scimEnabled").default(0).notNull(),
  enabled: int("enabled").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => ({
  organizationIssuerUnique: uniqueIndex("sso_connections_org_issuer_unique").on(table.organizationId, table.issuer),
}));

export const auditEvents = mysqlTable("auditEvents", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: varchar("organizationId", { length: 36 }).notNull().references(() => organizations.id, { onDelete: "cascade" }),
  actorUserId: int("actorUserId").references(() => users.id, { onDelete: "set null" }),
  action: varchar("action", { length: 128 }).notNull(),
  resourceType: varchar("resourceType", { length: 96 }).notNull(),
  resourceId: varchar("resourceId", { length: 128 }),
  decision: mysqlEnum("decision", ["allow", "deny", "system"]).notNull(),
  reason: varchar("reason", { length: 255 }),
  traceId: varchar("traceId", { length: 128 }).notNull(),
  metadata: text("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const streamTelemetryWindows = mysqlTable("streamTelemetryWindows", {
  id: int("id").autoincrement().primaryKey(),
  organizationId: varchar("organizationId", { length: 36 }).notNull().references(() => organizations.id, { onDelete: "cascade" }),
  provider: varchar("provider", { length: 96 }).notNull(),
  channel: varchar("channel", { length: 96 }).notNull(),
  windowStartedAt: timestamp("windowStartedAt").notNull(),
  windowEndedAt: timestamp("windowEndedAt").notNull(),
  connectionAttempts: int("connectionAttempts").default(0).notNull(),
  successfulConnections: int("successfulConnections").default(0).notNull(),
  disconnects: int("disconnects").default(0).notNull(),
  invalidMessages: int("invalidMessages").default(0).notNull(),
  duplicateMessages: int("duplicateMessages").default(0).notNull(),
  outOfOrderMessages: int("outOfOrderMessages").default(0).notNull(),
  p95RecoveryMs: int("p95RecoveryMs"),
  p95StalenessMs: int("p95StalenessMs"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Organization = typeof organizations.$inferSelect;
export type OrganizationMember = typeof organizationMembers.$inferSelect;
export type SsoConnection = typeof ssoConnections.$inferSelect;

/**
 * Watchlist table for storing user's favorite instruments
 */
export const watchlist = mysqlTable("watchlist", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  symbol: varchar("symbol", { length: 20 }).notNull(),
  instrumentType: varchar("instrumentType", { length: 20 }).notNull(), // FX, Equities, Commodities, Rates
  name: text("name"),
  addedAt: timestamp("addedAt").defaultNow().notNull(),
});

export type Watchlist = typeof watchlist.$inferSelect;
export type InsertWatchlist = typeof watchlist.$inferInsert;

/**
 * Price Alerts table for storing user's price alerts
 */
export const priceAlerts = mysqlTable("priceAlerts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  symbol: varchar("symbol", { length: 20 }).notNull(),
  instrumentType: varchar("instrumentType", { length: 20 }).notNull(),
  alertType: varchar("alertType", { length: 20 }).notNull(), // above, below
  targetPrice: varchar("targetPrice", { length: 50 }).notNull(),
  isActive: int("isActive").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  triggeredAt: timestamp("triggeredAt"),
});

export type PriceAlert = typeof priceAlerts.$inferSelect;
export type InsertPriceAlert = typeof priceAlerts.$inferInsert;

/**
 * Market Data Cache table for storing latest market prices
 */
export const marketDataCache = mysqlTable("marketDataCache", {
  id: int("id").autoincrement().primaryKey(),
  symbol: varchar("symbol", { length: 20 }).notNull().unique(),
  instrumentType: varchar("instrumentType", { length: 20 }).notNull(),
  name: text("name"),
  price: varchar("price", { length: 50 }).notNull(),
  change: varchar("change", { length: 50 }).notNull(),
  changePercent: varchar("changePercent", { length: 50 }).notNull(),
  lastUpdated: timestamp("lastUpdated").defaultNow().onUpdateNow().notNull(),
});

export type MarketDataCache = typeof marketDataCache.$inferSelect;
export type InsertMarketDataCache = typeof marketDataCache.$inferInsert;

/**
 * Macro Indicators Cache table for storing macroeconomic data
 */
export const macroIndicators = mysqlTable("macroIndicators", {
  id: int("id").autoincrement().primaryKey(),
  indicator: varchar("indicator", { length: 50 }).notNull(), // CPI, PMI, Yield10Y, etc.
  value: varchar("value", { length: 50 }).notNull(),
  date: varchar("date", { length: 20 }).notNull(),
  source: varchar("source", { length: 50 }).notNull(), // FRED, World Bank, etc.
  lastUpdated: timestamp("lastUpdated").defaultNow().onUpdateNow().notNull(),
});

export type MacroIndicator = typeof macroIndicators.$inferSelect;
export type InsertMacroIndicator = typeof macroIndicators.$inferInsert;