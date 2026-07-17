import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, getClientIp } from "@/lib/security";
import type { BusquedaEstudianteResponse, Estudiante } from "@/types/estudiante";

interface EstudianteRaw {
  id: string;
  dni: string;
  cui: string;
  nombres: string;
  apellido_paterno: string;
  apellido_materno: string;
  facultad?: { nombre?: string } | string | null;
  escuela?: { nombre?: string } | string | null;
  created_at?: string;
  updated_at?: string;
}

interface ResultadoScored extends Estudiante {
  matchedTokens: number;
  score: number;
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s]/g, "")
    .trim();
}

function tokenize(query: string): string[] {
  return normalize(query)
    .split(/\s+/)
    .filter((token) => token.length >= 2)
    .slice(0, 4);
}

function normalizeEstudiante(item: EstudianteRaw): Estudiante {
  return {
    ...item,
    facultad:
      typeof item.facultad === "object" && item.facultad
        ? item.facultad.nombre
        : item.facultad ?? undefined,
    escuela:
      typeof item.escuela === "object" && item.escuela
        ? item.escuela.nombre
        : item.escuela ?? undefined,
  };
}

function scoreEstudiante(estudiante: Estudiante, tokens: string[]): ResultadoScored {
  const campos = [
    estudiante.nombres,
    estudiante.apellido_paterno,
    estudiante.apellido_materno,
    estudiante.dni,
  ].map((campo) => normalize(campo ?? ""));

  let matched = 0;
  let score = 0;

  for (const token of tokens) {
    const tokenMatches = campos.some((campo) => campo.includes(token));
    if (tokenMatches) {
      matched++;
      score += token.length; // preferir tokens más largos (más específicos)
    }
  }

  return {
    ...estudiante,
    matchedTokens: matched,
    score,
  };
}

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

  // Validar límite de resultados a mostrar
  const clientLimit = Math.min(Math.max(parseInt(rawLimit ?? "8", 10) || 8, 1), 20);

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

  try {
    if (tipo === "dni") {
      // Búsqueda por DNI: usa el endpoint específico de la API externa
      const externalUrl = `${apiUrlBase}/estudiantes/buscar/dni/${encodeURIComponent(q)}?limit=${clientLimit}&offset=0`;
      const response = await fetch(externalUrl, {
        method: "GET",
        headers: {
          "X-API-Key": apiKey,
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        const body = await response.text().catch(() => "Sin detalle");
        console.error("Error consultando chunsadb (DNI):", {
          status: response.status,
          body: body.slice(0, 200),
          url: externalUrl,
        });
        return NextResponse.json(
          { error: "Error al consultar el servicio de estudiantes." },
          { status: response.status }
        );
      }

      const data = (await response.json()) as { total?: number; items?: EstudianteRaw[] };
      const items = (data.items ?? []).map(normalizeEstudiante);

      return NextResponse.json({
        total: data.total ?? 0,
        items,
      });
    }

    // Búsqueda por nombre/general: tokenizar y buscar cada palabra por separado
    const tokens = tokenize(q);
    if (tokens.length === 0) {
      return NextResponse.json({ total: 0, items: [] });
    }

    // Para armar la lista de candidatos pedimos más resultados por token; luego
    // ranqueamos localmente y devolvemos solo los top clientLimit.
    const searchLimit = Math.min(clientLimit * 12, 100);

    const responses = await Promise.all(
      tokens.map((token) =>
        fetch(
          `${apiUrlBase}/estudiantes?q=${encodeURIComponent(token)}&limit=${searchLimit}&offset=0`,
          {
            method: "GET",
            headers: {
              "X-API-Key": apiKey,
              Accept: "application/json",
            },
          }
        )
      )
    );

    // Indexar resultados por id
    const byId = new Map<string, Estudiante>();

    for (let i = 0; i < responses.length; i++) {
      const response = responses[i];
      const token = tokens[i];

      if (!response.ok) {
        const body = await response.text().catch(() => "Sin detalle");
        console.error("Error consultando chunsadb (token):", {
          token,
          status: response.status,
          body: body.slice(0, 200),
        });
        continue;
      }

      const data = (await response.json()) as {
        total?: number;
        items?: EstudianteRaw[];
      };

      for (const raw of data.items ?? []) {
        if (!byId.has(raw.id)) {
          byId.set(raw.id, normalizeEstudiante(raw));
        }
      }
    }

    // Calcular relevancia y ordenar
    const estudiantes = Array.from(byId.values());
    const scored = estudiantes.map((estudiante) =>
      scoreEstudiante(estudiante, tokens)
    );

    scored.sort((a, b) => {
      // Más tokens coincidentes primero
      if (b.matchedTokens !== a.matchedTokens) {
        return b.matchedTokens - a.matchedTokens;
      }
      // Luego mayor score (tokens más específicos / largos)
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      // Finalmente orden alfabético estable
      return `${a.apellido_paterno} ${a.apellido_materno} ${a.nombres}`.localeCompare(
        `${b.apellido_paterno} ${b.apellido_materno} ${b.nombres}`
      );
    });

    const items = scored
      .slice(0, clientLimit)
      .map(({ matchedTokens, score, ...estudiante }) => estudiante);

    return NextResponse.json({
      total: scored.length,
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
