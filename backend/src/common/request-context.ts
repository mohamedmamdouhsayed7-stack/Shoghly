import { randomUUID } from "node:crypto";
import type { Request, Response, NextFunction } from "express";

export type RequestWithContext = Request & {
  requestId: string;
  user?: { id: string; email?: string };
  supabaseAccessToken?: string;
};

export function requestContext(
  req: RequestWithContext,
  res: Response,
  next: NextFunction,
) {
  const requestId = randomUUID();
  req.requestId = requestId;
  res.setHeader("x-request-id", requestId);
  next();
}
