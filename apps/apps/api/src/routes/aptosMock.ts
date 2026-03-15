import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import { getAptosMockService } from "../services/aptosMockService";

const addressSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^0x[a-f0-9]{4,64}$/, "walletAddress must be a valid Aptos hex address");

const buyQuoteSchema = z.object({
  payToken: z.enum(["APT", "SHELBY_USD"]),
  payAmount: z.number().positive()
});

const buyExecuteSchema = z.object({
  walletAddress: addressSchema,
  payToken: z.enum(["APT", "SHELBY_USD"]),
  payAmount: z.number().positive()
});

const donateSchema = z.object({
  fromWallet: addressSchema,
  toWallet: addressSchema,
  amountS: z.number().positive(),
  idempotencyKey: z.string().min(1).max(128)
});

export const aptosMockRouter = new Hono();

aptosMockRouter.get("/wallets/:walletAddress/profile", (c) => {
  const parsed = addressSchema.safeParse(c.req.param("walletAddress"));
  if (!parsed.success) {
    throw new HTTPException(400, { message: parsed.error.message });
  }

  const service = getAptosMockService();
  return c.json(service.getProfile(parsed.data));
});

aptosMockRouter.get("/wallets/:walletAddress/balances", (c) => {
  const parsed = addressSchema.safeParse(c.req.param("walletAddress"));
  if (!parsed.success) {
    throw new HTTPException(400, { message: parsed.error.message });
  }

  const service = getAptosMockService();
  return c.json({
    walletAddress: parsed.data,
    balances: service.getBalances(parsed.data)
  });
});

aptosMockRouter.post("/s/buy/quote", async (c) => {
  const body = buyQuoteSchema.safeParse(await c.req.json());
  if (!body.success) {
    throw new HTTPException(400, { message: body.error.message });
  }

  const service = getAptosMockService();
  return c.json(service.quoteBuyS(body.data.payToken, body.data.payAmount));
});

aptosMockRouter.post("/s/buy/execute", async (c) => {
  const body = buyExecuteSchema.safeParse(await c.req.json());
  if (!body.success) {
    throw new HTTPException(400, { message: body.error.message });
  }

  const service = getAptosMockService();

  try {
    return c.json(service.executeBuyS(body.data.walletAddress, body.data.payToken, body.data.payAmount));
  } catch (error) {
    if (error instanceof Error) {
      throw new HTTPException(400, { message: error.message });
    }
    throw error;
  }
});

aptosMockRouter.post("/s/donate", async (c) => {
  const body = donateSchema.safeParse(await c.req.json());
  if (!body.success) {
    throw new HTTPException(400, { message: body.error.message });
  }

  const service = getAptosMockService();

  try {
    return c.json(
      service.donateS(body.data.fromWallet, body.data.toWallet, body.data.amountS, body.data.idempotencyKey)
    );
  } catch (error) {
    if (error instanceof Error) {
      throw new HTTPException(400, { message: error.message });
    }
    throw error;
  }
});

aptosMockRouter.get("/s/donate/:settlementId", (c) => {
  const settlementId = c.req.param("settlementId");
  if (!settlementId) {
    throw new HTTPException(400, { message: "settlementId is required" });
  }

  const service = getAptosMockService();

  try {
    return c.json(service.getDonationSettlement(settlementId));
  } catch (error) {
    if (error instanceof Error) {
      throw new HTTPException(404, { message: error.message });
    }
    throw error;
  }
});
