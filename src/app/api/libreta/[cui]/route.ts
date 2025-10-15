import { NextRequest, NextResponse } from "next/server";

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
