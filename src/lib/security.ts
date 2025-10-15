// Sistema de rate limiting por IP
interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();

// Limpiar entradas expiradas cada 5 minutos
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitMap.entries()) {
    if (entry.resetAt < now) {
      rateLimitMap.delete(key);
    }
  }
}, 5 * 60 * 1000);

export function checkRateLimit(
  identifier: string,
  maxRequests: number = 10,
  windowMs: number = 60000 // 1 minuto
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const entry = rateLimitMap.get(identifier);

  if (!entry || entry.resetAt < now) {
    // Nueva ventana de tiempo
    rateLimitMap.set(identifier, {
      count: 1,
      resetAt: now + windowMs,
    });
    return { allowed: true, remaining: maxRequests - 1, resetAt: now + windowMs };
  }

  if (entry.count >= maxRequests) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count++;
  return {
    allowed: true,
    remaining: maxRequests - entry.count,
    resetAt: entry.resetAt,
  };
}

// Sistema de tokens de acceso temporales
interface AccessToken {
  cui: string;
  createdAt: number;
  expiresAt: number;
  usageCount: number;
  maxUsage: number;
}

const tokenStore = new Map<string, AccessToken>();

// Limpiar tokens expirados cada 2 minutos
setInterval(() => {
  const now = Date.now();
  for (const [token, data] of tokenStore.entries()) {
    if (data.expiresAt < now) {
      tokenStore.delete(token);
    }
  }
}, 2 * 60 * 1000);

export function generateAccessToken(cui: string): string {
  const token = crypto.randomUUID();
  const now = Date.now();
  
  tokenStore.set(token, {
    cui,
    createdAt: now,
    expiresAt: now + 5 * 60 * 1000, // Expira en 5 minutos
    usageCount: 0,
    maxUsage: 3, // Permitir 3 usos (HEAD, GET, y uno de respaldo)
  });

  return token;
}

export function validateAccessToken(
  token: string,
  cui: string
): { valid: boolean; error?: string } {
  const data = tokenStore.get(token);

  console.log("Validating token:", { token, cui, exists: !!data, data });

  if (!data) {
    return { valid: false, error: "Token inválido o expirado" };
  }

  if (data.expiresAt < Date.now()) {
    tokenStore.delete(token);
    console.log("Token expired:", { token, expiresAt: new Date(data.expiresAt) });
    return { valid: false, error: "Token expirado" };
  }

  if (data.cui !== cui) {
    console.log("CUI mismatch:", { tokenCui: data.cui, requestedCui: cui });
    return { valid: false, error: "Token no corresponde al CUI solicitado" };
  }

  if (data.usageCount >= data.maxUsage) {
    console.log("Token usage limit exceeded:", { usageCount: data.usageCount, maxUsage: data.maxUsage });
    return { valid: false, error: "Token ha excedido el límite de uso" };
  }

  // Incrementar contador de uso
  data.usageCount++;
  console.log("Token validated successfully. Usage:", data.usageCount, "/", data.maxUsage);

  return { valid: true };
}

export function getClientIp(request: Request): string {
  // Intentar obtener IP real desde headers de proxies
  const forwarded = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  
  if (realIp) {
    return realIp;
  }

  // Fallback (en desarrollo local)
  return "unknown";
}
