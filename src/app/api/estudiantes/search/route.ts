import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, getClientIp } from "@/lib/security";
import type { BusquedaEstudianteResponse, Estudiante } from "@/types/estudiante";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";
  const tipo = searchParams.get("tipo") ?? "general";
  const rawLimit = searchParams.get("limit");

  // Validar tipo
  if (!["general", "nombre", "dni"].includes(tipo)) {
    return NextResponse.json(
      { error: "Tipo de búsqueda inválido. Use 'nombre', 'dni' o 'general'." },
      { status: 400 }
    );
  }

  // Validar longitud mínima según tipo
  const minLength = tipo === "dni" ? 2 : 3;
  if (!q || q.length < minLength) {
    return NextResponse.json(
      {
        error: `Ingresa al menos ${minLength} caracteres para buscar por ${tipo === "dni" ? "DNI" : "nombre"}.`,
      },
      { status: 400 }
    );
  }

  // Validar límite
  const limit = Math.min(Math.max(parseInt(rawLimit ?? "8", 10) || 8, 1), 20);

  // Rate limiting por IP
  const clientIp = getClientIp(request);
  const rateLimit = checkRateLimit(`estudiantes:${clientIp}`, 20, 60000);

  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        error: "Demasiadas búsquedas. Espera un momento antes de continuar.",
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

  // Verificar que la API key esté configurada
  const apiKey = process.env.CHUNSADB_API_KEY;
  const apiUrlBase = process.env.CHUNSADB_API_URL || "https://chunsadb.jhonaq.me";

  if (!apiKey) {
    console.error("CHUNSADB_API_KEY no está configurada");
    return NextResponse.json(
      { error: "Servicio de búsqueda no configurado." },
      { status: 500 }
    );
  }

  // Construir URL del servicio externo
  let externalUrl: string;
  const encodedQ = encodeURIComponent(q);

  if (tipo === "nombre") {
    externalUrl = `${apiUrlBase}/estudiantes/buscar/nombre/${encodedQ}?limit=${limit}&offset=0`;
  } else if (tipo === "dni") {
    externalUrl = `${apiUrlBase}/estudiantes/buscar/dni/${encodedQ}?limit=${limit}&offset=0`;
  } else {
    externalUrl = `${apiUrlBase}/estudiantes?q=${encodedQ}&limit=${limit}&offset=0`;
  }

  try {
    const response = await fetch(externalUrl, {
      method: "GET",
      headers: {
        "X-API-Key": apiKey,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "Sin detalle");
      console.error("Error consultando chunsadb:", {
        status: response.status,
        body: body.slice(0, 200),
        url: externalUrl,
      });
      return NextResponse.json(
        { error: "Error al consultar el servicio de estudiantes." },
        { status: response.status }
      );
    }

    const raw = (await response.json()) as {
      total?: number;
      items?: Array<
        Omit<Estudiante, "facultad" | "escuela"> & {
          facultad?: { nombre?: string } | string | null;
          escuela?: { nombre?: string } | string | null;
        }
      >;
    };

    const items: Estudiante[] = (raw.items ?? []).map((item) => ({
      ...item,
      facultad:
        typeof item.facultad === "object" && item.facultad
          ? item.facultad.nombre
          : item.facultad ?? undefined,
      escuela:
        typeof item.escuela === "object" && item.escuela
          ? item.escuela.nombre
          : item.escuela ?? undefined,
    }));

    return NextResponse.json({
      total: raw.total ?? 0,
      items,
    });
  } catch (error) {
    console.error("Error de conexión con chunsadb:", error);
    return NextResponse.json(
      { error: "Error de conexión con el servicio de estudiantes." },
      { status: 502 }
    );
  }
}
