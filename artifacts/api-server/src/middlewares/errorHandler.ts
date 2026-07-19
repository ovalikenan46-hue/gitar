import type { Request, Response, NextFunction } from "express";

/**
 * FAZ 3.2: Tek tip hata sistemi.
 * Tüm API hataları standart formatta döner:
 *   { error: string, code: string, requestId?: string }
 */
export class AppError extends Error {
  readonly statusCode: number;
  readonly code: string;

  constructor(statusCode: number, message: string, code = "APP_ERROR") {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
  }
}

/** /api altında eşleşmeyen rotalar için standart 404 */
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    error: "Kaynak bulunamadı",
    code: "NOT_FOUND",
    path: req.path,
  });
}

/** Global hata yakalayıcı — Express 5 async hataları otomatik buraya iletir */
export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const requestId = String(req.id ?? "");

  if (err instanceof AppError) {
    req.log?.warn({ err, code: err.code }, err.message);
    res.status(err.statusCode).json({
      error: err.message,
      code: err.code,
      requestId,
    });
    return;
  }

  // JSON body parse hatası (express.json)
  if (
    err instanceof SyntaxError &&
    "status" in err &&
    (err as { status?: number }).status === 400
  ) {
    res.status(400).json({
      error: "Geçersiz JSON gövdesi",
      code: "INVALID_JSON",
      requestId,
    });
    return;
  }

  req.log?.error({ err }, "Beklenmeyen sunucu hatası");
  res.status(500).json({
    error: "Sunucu hatası. Lütfen daha sonra tekrar deneyin.",
    code: "INTERNAL_ERROR",
    requestId,
  });
}
