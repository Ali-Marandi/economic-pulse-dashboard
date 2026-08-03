import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";

import { getUserWatchlist, addToWatchlist, removeFromWatchlist, getUserAlerts, createAlert, deleteAlert, getAllMarketData, getMarketData, getMacroIndicators } from "./db";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { priceAlerts } from "../drizzle/schema";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  watchlist: router({
    list: publicProcedure.query(async ({ ctx }) => {
      if (!ctx.user) return [];
      return getUserWatchlist(ctx.user.id);
    }),
    add: publicProcedure
      .input(z.object({
        symbol: z.string(),
        instrumentType: z.string(),
        name: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) throw new Error("Not authenticated");
        return addToWatchlist(ctx.user.id, input.symbol, input.instrumentType, input.name);
      }),
    remove: publicProcedure
      .input(z.string())
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) throw new Error("Not authenticated");
        return removeFromWatchlist(ctx.user.id, input);
      }),
  }),

  alerts: router({
    list: publicProcedure.query(async ({ ctx }) => {
      if (!ctx.user) return [];
      return getUserAlerts(ctx.user.id);
    }),
    create: publicProcedure
      .input(z.object({
        symbol: z.string(),
        instrumentType: z.string(),
        alertType: z.string(),
        targetPrice: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) throw new Error("Not authenticated");
        return createAlert(ctx.user.id, input.symbol, input.instrumentType, input.alertType, input.targetPrice);
      }),
    delete: publicProcedure
      .input(z.number())
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) throw new Error("Not authenticated");
        return deleteAlert(input);
      }),
    update: publicProcedure
      .input(z.object({
        id: z.number(),
        alertType: z.string().optional(),
        targetPrice: z.string().optional(),
        isActive: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) throw new Error("Not authenticated");
        const { id, ...updates } = input;
        const db = await (await import("./db")).getDb();
        if (!db) throw new Error("Database unavailable");
        await db.update(priceAlerts).set(updates).where(eq(priceAlerts.id, id));
        return { success: true };
      }),
  }),

  market: router({
    getAll: publicProcedure.query(async () => {
      return getAllMarketData();
    }),
    get: publicProcedure
      .input(z.string())
      .query(async ({ input }) => {
        return getMarketData(input);
      }),
  }),

  macro: router({
    getIndicators: publicProcedure.query(async () => {
      return getMacroIndicators();
    }),
  }),
});

export type AppRouter = typeof appRouter;
