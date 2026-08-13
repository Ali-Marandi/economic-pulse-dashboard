import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, watchlist, priceAlerts, marketDataCache, macroIndicators, InsertMarketDataCache, InsertMacroIndicator } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// Watchlist queries
export async function getUserWatchlist(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(watchlist).where(eq(watchlist.userId, userId));
}

export async function addToWatchlist(userId: number, symbol: string, instrumentType: string, name?: string) {
  const db = await getDb();
  if (!db) return null;
  await db.insert(watchlist).values({ userId, symbol, instrumentType, name });
  return { symbol, instrumentType };
}

export async function removeFromWatchlist(userId: number, symbol: string) {
  const db = await getDb();
  if (!db) return null;
  await db.delete(watchlist).where(
    and(eq(watchlist.userId, userId), eq(watchlist.symbol, symbol))
  );
}

// Price Alerts queries
export async function getUserAlerts(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(priceAlerts).where(eq(priceAlerts.userId, userId));
}

export async function createAlert(userId: number, symbol: string, instrumentType: string, alertType: string, targetPrice: string) {
  const db = await getDb();
  if (!db) return null;
  await db.insert(priceAlerts).values({ userId, symbol, instrumentType, alertType, targetPrice });
  return { symbol, alertType, targetPrice };
}

export async function deleteAlert(userId: number, alertId: number) {
  const db = await getDb();
  if (!db) return null;
  await db.delete(priceAlerts).where(and(eq(priceAlerts.id, alertId), eq(priceAlerts.userId, userId)));
  return { success: true };
}

export async function updateAlert(userId: number, alertId: number, updates: { alertType?: string; targetPrice?: string; isActive?: number }) {
  const db = await getDb();
  if (!db) return null;
  await db.update(priceAlerts).set(updates).where(and(eq(priceAlerts.id, alertId), eq(priceAlerts.userId, userId)));
  return { success: true };
}

// Market Data Cache queries
export async function getMarketData(symbol: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(marketDataCache).where(eq(marketDataCache.symbol, symbol)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function getAllMarketData() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(marketDataCache);
}

export async function upsertMarketData(data: InsertMarketDataCache) {
  const db = await getDb();
  if (!db) return null;
  await db.insert(marketDataCache).values(data).onDuplicateKeyUpdate({
    set: {
      price: data.price,
      change: data.change,
      changePercent: data.changePercent,
      lastUpdated: new Date(),
    },
  });
}

// Macro Indicators queries
export async function getMacroIndicators() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(macroIndicators);
}

export async function upsertMacroIndicator(data: InsertMacroIndicator) {
  const db = await getDb();
  if (!db) return null;
  await db.insert(macroIndicators).values(data).onDuplicateKeyUpdate({
    set: {
      value: data.value,
      lastUpdated: new Date(),
    },
  });
}
