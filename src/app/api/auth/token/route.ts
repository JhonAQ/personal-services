import { NextRequest, NextResponse } from "next/server";
import {
  checkRateLimit,
  generateAccessToken,
  getClientIp,
} from "@/lib/security";

export async function POST(request: NextRequest) {
  try {
    const clientIp = getClientIp(request);

    // Rate limiting: máximo 20 tokens por minuto por IP
    const rateLimit = checkRateLimit(`token:${clientIp}`, 20, 60000);

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: "Demasiadas solicitudes. Intenta nuevamente más tarde.",
          retryAfter: Math.ceil((rateLimit.resetAt - Date.now()) / 1000),
        },
        {
          status: 429,
          headers: {
            "Retry-After": Math.ceil(
              (rateLimit.resetAt - Date.now()) / 1000
            ).toString(),
            "X-RateLimit-Limit": "20",
            "X-RateLimit-Remaining": rateLimit.remaining.toString(),
            "X-RateLimit-Reset": new Date(rateLimit.resetAt).toISOString(),
          },
        }
      );
    }

    const { cui } = await request.json();

    // Validar CUI
    if (!cui || !/^\d{8}$/.test(cui)) {
      return NextResponse.json(
        { error: "CUI inválido. Debe tener 8 dígitos." },
        { status: 400 }
      );
    }

    // Generar token de acceso
    const token = generateAccessToken(cui);

    console.log("Token generated:", { cui, token });

    return NextResponse.json(
      {
        token,
        cui,
        expiresIn: 300, // 5 minutos
      },
      {
        status: 200,
        headers: {
          "X-RateLimit-Limit": "20",
          "X-RateLimit-Remaining": rateLimit.remaining.toString(),
          "X-RateLimit-Reset": new Date(rateLimit.resetAt).toISOString(),
        },
      }
    );
  } catch (error) {
    console.error("Error generating access token:", error);
    return NextResponse.json(
      { error: "Error al generar token de acceso" },
      { status: 500 }
    );
  }
}
