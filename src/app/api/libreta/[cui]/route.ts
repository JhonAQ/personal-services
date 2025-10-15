import { NextRequest, NextResponse } from "next/server";
import {
  checkRateLimit,
  getClientIp,
  validateAccessToken,
} from "@/lib/security";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ cui: string }> }
) {
  const { cui } = await params;

  // Validar que el CUI tenga 8 dígitos
  if (!cui || !/^\d{8}$/.test(cui)) {
    return NextResponse.json(
      { error: "CUI inválido. Debe tener 8 dígitos." },
      { status: 400 }
    );
  }

  // Obtener token de los query params
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.json(
      { error: "Token de acceso requerido" },
      { status: 401 }
    );
  }

  // Validar token
  const tokenValidation = validateAccessToken(token, cui);
  if (!tokenValidation.valid) {
    console.error("Token validation failed:", tokenValidation.error, {
      token,
      cui,
    });
    return NextResponse.json(
      { error: tokenValidation.error },
      { status: 403 }
    );
  }

  // Rate limiting adicional por IP
  const clientIp = getClientIp(request);
  const rateLimit = checkRateLimit(`download:${clientIp}`, 15, 60000);

  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        error: "Límite de descargas excedido. Intenta más tarde.",
        retryAfter: Math.ceil((rateLimit.resetAt - Date.now()) / 1000),
      },
      {
        status: 429,
        headers: {
          "Retry-After": Math.ceil(
            (rateLimit.resetAt - Date.now()) / 1000
          ).toString(),
        },
      }
    );
  }

  try {
    const apiUrl = `http://extranet.unsa.edu.pe/sisacad/libretas/descarga.php?file=/var/temporal/Libreta_De_Notas_${cui}_.pdf&codal=${cui}`;

    const response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json(
          { error: "No se encontró libreta para este CUI" },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { error: "Error al consultar la API de la UNSA" },
        { status: response.status }
      );
    }

    // Obtener el PDF como buffer
    const pdfBuffer = await response.arrayBuffer();

    // Retornar el PDF con los headers correctos
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="Libreta_${cui}.pdf"`,
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error) {
    console.error("Error fetching PDF:", error);
    return NextResponse.json(
      { error: "Error de conexión con el servidor de la UNSA" },
      { status: 500 }
    );
  }
}

// También soportar HEAD para verificar existencia
export async function HEAD(
  request: NextRequest,
  { params }: { params: Promise<{ cui: string }> }
) {
  const { cui } = await params;

  if (!cui || !/^\d{8}$/.test(cui)) {
    return new NextResponse(null, { status: 400 });
  }

  // HEAD también requiere token para evitar enumeración
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  console.log("HEAD request received:", { cui, token });

  if (!token) {
    console.error("HEAD: Token missing");
    return new NextResponse(null, { status: 401 });
  }

  const tokenValidation = validateAccessToken(token, cui);
  if (!tokenValidation.valid) {
    console.error("HEAD: Token validation failed:", tokenValidation.error);
    return new NextResponse(null, { status: 403 });
  }

  console.log("HEAD: Token validated successfully");

  // Rate limiting
  const clientIp = getClientIp(request);
  const rateLimit = checkRateLimit(`check:${clientIp}`, 30, 60000);

  if (!rateLimit.allowed) {
    return new NextResponse(null, { status: 429 });
  }

  try {
    const apiUrl = `http://extranet.unsa.edu.pe/sisacad/libretas/descarga.php?file=/var/temporal/Libreta_De_Notas_${cui}_.pdf&codal=${cui}`;

    const response = await fetch(apiUrl, {
      method: "HEAD",
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
    });

    return new NextResponse(null, {
      status: response.status,
      headers: {
        "Content-Type": "application/pdf",
      },
    });
  } catch (error) {
    return new NextResponse(null, { status: 500 });
  }
}
