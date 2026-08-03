import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

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