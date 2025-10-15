"use client";

import { type ChangeEvent, useRef, useState } from "react";
import { Tab } from "@headlessui/react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Clock3,
  DownloadCloud,
  FileDown,
  FileText,
  History,
  Layers,
  Loader2,
  ScanSearch,
  Search,
  Sparkles,
  Upload,
  X,
} from "lucide-react";

const uiHighlights = [
  {
    title: "Busquedas Inteligentes",
    description:
      "Busca por CUI directamente y obtén la libreta al instante desde la API institucional.",
    icon: Sparkles,
  },
  {
    title: "Vista previa inmediata",
    description:
      "Visualiza el PDF integrado en el panel antes de decidir descargarlo.",
    icon: Layers,
  },
  {
    title: "Descargas en lote",
    description:
      "Carga un archivo CSV con CUIs y descarga todas las libretas automáticamente.",
    icon: DownloadCloud,
  },
];

const searchOptions = [
  {
    key: "cui",
    title: "Por CUI",
    description:
      "Ingresa el codigo universitario para acceder directamente a la libreta.",
    placeholder: "Ej. 20233489",
  },
  {
    key: "nombre",
    title: "Por nombre",
    description:
      "Busca en la base institucional y selecciona la persona correcta.",
    placeholder: "Ej. Ana Gabriela",
  },
  {
    key: "dni",
    title: "Por DNI",
    description: "Localiza resultados coincidentes y autocompleta el CUI.",
    placeholder: "Ej. 74125683",
  },
];

interface BatchJob {
  id: string;
  cui: string;
  status: "pending" | "downloading" | "completed" | "error";
  error?: string;
}

export default function BuscadorExperience() {
  const [modeIndex, setModeIndex] = useState(0);
  const [manualInput, setManualInput] = useState("");
  const [selectedCui, setSelectedCui] = useState<string>("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [batchJobs, setBatchJobs] = useState<BatchJob[]>([]);
  const [isProcessingBatch, setIsProcessingBatch] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSearchByCui = async (cui: string) => {
    if (!cui || cui.trim().length !== 8) {
      setSearchError("El CUI debe tener exactamente 8 dígitos");
      return;
    }

    setIsSearching(true);
    setSearchError(null);
    setPdfUrl(null);

    try {
      // Usar la API proxy local para evitar problemas de CORS
      const apiUrl = `/api/libreta/${cui.trim()}`;

      // Verificar si el recurso existe
      const response = await fetch(apiUrl, {
        method: "HEAD",
      });

      if (response.ok) {
        setSelectedCui(cui.trim());
        setPdfUrl(apiUrl);
      } else if (response.status === 404) {
        setSearchError("No se encontró libreta para este CUI");
      } else {
        setSearchError("Error al consultar la API. Intenta nuevamente.");
      }
    } catch (error) {
      console.error("Error fetching student data:", error);
      setSearchError(
        "Error de conexión. Verifica tu red e intenta de nuevo."
      );
    } finally {
      setIsSearching(false);
    }
  };

  const handleDownloadPdf = () => {
    if (!pdfUrl || !selectedCui) return;

    const link = document.createElement("a");
    link.href = pdfUrl;
    link.download = `Libreta_${selectedCui}.pdf`;
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCsvUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target?.result as string;
      const lines = text.split(/\r?\n/).filter((line) => line.trim());

      // Parsear CUIs del CSV (asume una columna con header o sin header)
      const cuis = lines
        .map((line) => line.split(",")[0].trim())
        .filter((cui) => /^\d{8}$/.test(cui));

      if (cuis.length === 0) {
        setSearchError("No se encontraron CUIs válidos en el archivo CSV");
        return;
      }

      // Crear jobs
      const jobs: BatchJob[] = cuis.map((cui) => ({
        id: `${cui}-${Date.now()}-${Math.random()}`,
        cui,
        status: "pending",
      }));

      setBatchJobs(jobs);
      setIsProcessingBatch(true);

      // Procesar descargas secuencialmente con delay
      for (let i = 0; i < jobs.length; i++) {
        const job = jobs[i];

        setBatchJobs((prev) =>
          prev.map((j) =>
            j.id === job.id ? { ...j, status: "downloading" } : j
          )
        );

        try {
          // Usar la API proxy local
          const apiUrl = `/api/libreta/${job.cui}`;
          const response = await fetch(apiUrl);

          if (response.ok) {
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = `Libreta_${job.cui}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            setBatchJobs((prev) =>
              prev.map((j) =>
                j.id === job.id ? { ...j, status: "completed" } : j
              )
            );
          } else {
            throw new Error("PDF no encontrado");
          }
        } catch (error) {
          setBatchJobs((prev) =>
            prev.map((j) =>
              j.id === job.id
                ? { ...j, status: "error", error: "Error al descargar" }
                : j
            )
          );
        }

        // Delay entre descargas para no saturar
        if (i < jobs.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 800));
        }
      }

      setIsProcessingBatch(false);
    };

    reader.readAsText(file);

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const clearBatchJobs = () => {
    setBatchJobs([]);
  };

  const completedJobs = batchJobs.filter((j) => j.status === "completed").length;
  const errorJobs = batchJobs.filter((j) => j.status === "error").length;

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-slate-800/35 to-slate-900/75" />
      <div className="relative mx-auto flex w-full max-w-[1440px] flex-col gap-10 px-6 pb-16 pt-14 lg:px-10">
        <header className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full bg-cyan-500/10 px-3 py-1 text-sm font-medium text-cyan-200 ring-1 ring-inset ring-cyan-400/40">
              <Sparkles className="h-4 w-4" />
              Suite Personal · Buscador de Libretas
            </div>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-100 sm:text-4xl lg:text-5xl">
              Localiza, visualiza y descarga libretas al instante.
            </h1>
            <p className="text-slate-300">
              Conectado a la API institucional de UNSA. Busca por CUI, visualiza
              la libreta en tiempo real y descarga individual o masivamente
              mediante archivos CSV.
            </p>
          </div>
          <div className="glass-panel flex w-full max-w-sm flex-col gap-3 px-6 py-5 text-sm text-slate-200">
            <div className="flex items-center justify-between">
              <span className="font-medium text-slate-300">
                Estado de la sesión
              </span>
              <History className="h-4 w-4 text-slate-400" />
            </div>
            <div className="flex items-center justify-between text-base font-semibold text-slate-100">
              <span>{selectedCui || "Sin búsquedas"}</span>
              {selectedCui && (
                <span className="flex items-center gap-2 text-xs font-medium text-emerald-300">
                  <CheckCircle2 className="h-4 w-4" /> Activo
                </span>
              )}
            </div>
            <div className="divider-fade mt-4" />
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Lotes procesados</span>
              <span>{batchJobs.length > 0 ? "1" : "0"}</span>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Última consulta</span>
              <span>{selectedCui ? "Ahora" : "—"}</span>
            </div>
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
          <aside className="glass-panel flex flex-col gap-6 px-6 py-7">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-500/15 ring-1 ring-cyan-400/40">
                <ScanSearch className="h-6 w-6 text-cyan-300" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-100">
                  Motor de búsqueda
                </h2>
                <p className="text-sm text-slate-400">
                  Integración directa con la API de UNSA.
                </p>
              </div>
            </div>
            <div className="grid gap-5">
              {uiHighlights.map((highlight) => (
                <article
                  key={highlight.title}
                  className="flex items-start gap-4 rounded-2xl border border-white/5 bg-white/30 p-4 text-slate-200 backdrop-blur"
                >
                  <div className="mt-1 rounded-xl bg-slate-900/60 p-2 text-cyan-300">
                    <highlight.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-100">
                      {highlight.title}
                    </h3>
                    <p className="text-xs text-slate-400">
                      {highlight.description}
                    </p>
                  </div>
                </article>
              ))}
            </div>
            <div className="rounded-2xl border border-white/5 bg-slate-800/40 p-5 text-sm text-slate-300">
              <p className="font-medium text-slate-200">
                Endpoint de la API
              </p>
              <p className="mt-2 break-all font-mono text-xs text-slate-400">
                https://ouis.unsa.edu.pe/tramited/ventanilla/find-student/
                {"{cui}"}
              </p>
              <ul className="mt-4 space-y-2">
                <li className="flex items-start gap-2">
                  <span className="mt-1 inline-flex h-2 w-2 rounded-full bg-cyan-300" />
                  <span className="text-xs">
                    Devuelve el PDF directamente sin redirecciones
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 inline-flex h-2 w-2 rounded-full bg-emerald-300" />
                  <span className="text-xs">
                    Formato CSV para lotes: una columna con CUIs (8 dígitos)
                  </span>
                </li>
              </ul>
            </div>
          </aside>

          <main className="flex flex-col gap-6">
            <section className="glass-panel overflow-hidden p-2">
              <Tab.Group
                selectedIndex={modeIndex}
                onChange={(index: number) => {
                  setModeIndex(index);
                  setManualInput("");
                  setSearchError(null);
                }}
              >
                <Tab.List className="flex flex-wrap gap-2 rounded-2xl bg-slate-800/35 p-2">
                  {searchOptions.map((option, index) => (
                    <Tab key={option.key} className="focus:outline-none">
                      {({ selected }: { selected: boolean }) => (
                        <motion.button
                          type="button"
                          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
                            selected
                              ? "bg-slate-100/10 text-slate-50 shadow-lg shadow-cyan-500/15"
                              : "text-slate-300 hover:text-slate-100"
                          }`}
                          layout
                          transition={{
                            type: "spring",
                            stiffness: 500,
                            damping: 40,
                          }}
                        >
                          <Search className="h-4 w-4" />
                          {option.title}
                          <AnimatePresence>
                            {selected && (
                              <motion.span
                                layoutId="active-pill"
                                className="ml-2 hidden rounded-full bg-cyan-500/20 px-3 py-0.5 text-xs text-cyan-200 md:block"
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.85 }}
                              >
                                {index === 0
                                  ? "Directo"
                                  : index === 1
                                  ? "Asistido"
                                  : "Documento"}
                              </motion.span>
                            )}
                          </AnimatePresence>
                        </motion.button>
                      )}
                    </Tab>
                  ))}
                </Tab.List>
                <Tab.Panels className="mt-6">
                  {searchOptions.map((option) => (
                    <Tab.Panel
                      key={option.key}
                      className="rounded-3xl bg-slate-800/30 p-6"
                    >
                      <div className="flex flex-col gap-2">
                        <p className="text-sm text-slate-400">
                          {option.description}
                        </p>
                        {option.key === "nombre" || option.key === "dni" ? (
                          <div className="mt-3">
                            <div className="rounded-2xl border border-amber-400/40 bg-amber-500/10 p-4 text-sm text-amber-200">
                              <p className="flex items-center gap-2">
                                <AlertCircle className="h-4 w-4" />
                                Función en desarrollo - Base de datos en
                                construcción
                              </p>
                            </div>
                          </div>
                        ) : (
                          <form
                            className="mt-3 flex flex-col gap-4"
                            onSubmit={(event) => {
                              event.preventDefault();
                              handleSearchByCui(manualInput);
                            }}
                          >
                            <div className="flex flex-col gap-4 md:flex-row">
                              <label className="flex-1">
                                <span className="sr-only">{option.title}</span>
                                <input
                                  className="h-12 w-full rounded-2xl border border-white/10 bg-slate-900/45 px-4 text-sm text-slate-100 outline-none transition focus:border-cyan-400/70 focus:ring-2 focus:ring-cyan-400/30 placeholder:text-slate-400"
                                  placeholder={option.placeholder}
                                  value={manualInput}
                                  onChange={(event) =>
                                    setManualInput(event.target.value)
                                  }
                                  maxLength={8}
                                  disabled={isSearching}
                                />
                              </label>
                              <button
                                type="submit"
                                disabled={
                                  isSearching ||
                                  manualInput.trim().length !== 8
                                }
                                className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-cyan-400/95 px-6 text-sm font-semibold text-slate-950 shadow-lg shadow-cyan-400/30 transition hover:bg-cyan-300 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {isSearching ? (
                                  <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Buscando...
                                  </>
                                ) : (
                                  <>
                                    <Search className="h-4 w-4" />
                                    Buscar
                                  </>
                                )}
                              </button>
                            </div>
                            {searchError && (
                              <div className="rounded-xl border border-red-400/40 bg-red-500/10 p-3 text-sm text-red-200">
                                <p className="flex items-center gap-2">
                                  <AlertCircle className="h-4 w-4" />
                                  {searchError}
                                </p>
                              </div>
                            )}
                          </form>
                        )}
                        <div className="mt-5 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                          <span className="inline-flex items-center gap-2 rounded-full bg-slate-800/35 px-3 py-1 text-slate-200">
                            <Clock3 className="h-4 w-4 text-cyan-300" /> Respuesta
                            instantánea
                          </span>
                          <span className="inline-flex items-center gap-2 rounded-full bg-slate-800/35 px-3 py-1 text-slate-200">
                            <Layers className="h-4 w-4 text-emerald-300" /> API
                            oficial UNSA
                          </span>
                        </div>
                      </div>
                    </Tab.Panel>
                  ))}
                </Tab.Panels>
              </Tab.Group>
            </section>

            <div className="grid gap-6 lg:grid-cols-2">
              <section className="glass-panel flex flex-col p-6">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-100">
                      Vista previa de libreta
                    </h2>
                    <p className="text-xs text-slate-400">
                      El PDF se mostrará automáticamente tras buscar por CUI.
                    </p>
                  </div>
                  <FileDown className="h-5 w-5 text-cyan-300" />
                </div>

                {pdfUrl && selectedCui ? (
                  <div className="flex flex-col gap-4">
                    <div className="rounded-2xl border border-white/10 bg-slate-800/30 p-4">
                      <div className="mb-3 flex items-center justify-between text-xs text-slate-400">
                        <span className="inline-flex items-center gap-2 text-slate-200">
                          <FileText className="h-4 w-4 text-cyan-300" /> Vista
                          previa generada
                        </span>
                        <span className="rounded-full bg-slate-900/45 px-3 py-0.5 text-[11px] uppercase tracking-wide text-slate-400">
                          PDF
                        </span>
                      </div>
                      <div className="aspect-[3/4] w-full overflow-hidden rounded-xl border border-white/10 bg-slate-900/30">
                        <object
                          data={`${pdfUrl}#toolbar=0&navpanes=0&view=FitH`}
                          type="application/pdf"
                          className="h-full w-full"
                        >
                          <div className="flex h-full items-center justify-center bg-slate-800/45 p-4 text-center text-xs text-slate-400">
                            <div className="flex flex-col gap-2">
                              <FileText className="mx-auto h-8 w-8 text-slate-500" />
                              <p>
                                El visor PDF no está disponible. Usa el botón de
                                descarga a continuación.
                              </p>
                            </div>
                          </div>
                        </object>
                      </div>
                      <p className="mt-3 text-[11px] text-slate-500">
                        CUI: <span className="font-mono text-slate-300">{selectedCui}</span>
                      </p>
                    </div>
                    <div className="flex flex-col gap-3 text-xs text-slate-400">
                      <div className="flex flex-wrap items-center gap-3">
                        <button
                          type="button"
                          onClick={handleDownloadPdf}
                          className="inline-flex items-center gap-2 rounded-xl border border-cyan-400/60 bg-cyan-500/15 px-4 py-2.5 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-500/25"
                        >
                          <FileDown className="h-4 w-4" /> Descargar libreta
                        </button>
                        <a
                          href={pdfUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 rounded-xl bg-slate-900/45 px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-slate-800/80"
                        >
                          <ArrowRight className="h-4 w-4" /> Abrir en nueva pestaña
                        </a>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-1 items-center justify-center rounded-2xl border border-white/5 bg-slate-900/30 p-8 text-center text-sm text-slate-500">
                    <div className="flex flex-col items-center gap-3">
                      <FileText className="h-12 w-12 text-slate-600" />
                      <p>
                        Ingresa un CUI en el buscador para mostrar la vista previa
                      </p>
                    </div>
                  </div>
                )}
              </section>

              <section className="glass-panel flex flex-col p-6">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-100">
                      Descarga por lotes
                    </h2>
                    <p className="text-xs text-slate-400">
                      Sube un archivo CSV con CUIs para descarga masiva.
                    </p>
                  </div>
                  <DownloadCloud className="h-5 w-5 text-cyan-300" />
                </div>

                <div className="flex flex-col gap-4">
                  <div className="rounded-2xl border-2 border-dashed border-slate-700/50 bg-slate-900/30 p-6 text-center transition hover:border-cyan-400/40 hover:bg-slate-900/50">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv"
                      onChange={handleCsvUpload}
                      disabled={isProcessingBatch}
                      className="hidden"
                      id="csv-upload"
                    />
                    <label
                      htmlFor="csv-upload"
                      className="flex cursor-pointer flex-col items-center gap-3"
                    >
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-500/10 ring-1 ring-cyan-400/30">
                        <Upload className="h-7 w-7 text-cyan-300" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-200">
                          {isProcessingBatch
                            ? "Procesando..."
                            : "Haz clic para cargar CSV"}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          Formato: una columna con CUIs de 8 dígitos
                        </p>
                      </div>
                    </label>
                  </div>

                  {batchJobs.length > 0 && (
                    <div className="rounded-2xl border border-white/5 bg-slate-800/30 p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <span className="text-sm font-semibold text-slate-200">
                          Progreso del lote
                        </span>
                        <button
                          onClick={clearBatchJobs}
                          className="text-slate-400 transition hover:text-slate-200"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="mb-3 grid grid-cols-3 gap-2 text-xs">
                        <div className="rounded-lg bg-slate-900/50 p-2 text-center">
                          <p className="text-slate-400">Total</p>
                          <p className="text-base font-semibold text-slate-200">
                            {batchJobs.length}
                          </p>
                        </div>
                        <div className="rounded-lg bg-emerald-500/10 p-2 text-center">
                          <p className="text-emerald-300">Completados</p>
                          <p className="text-base font-semibold text-emerald-200">
                            {completedJobs}
                          </p>
                        </div>
                        <div className="rounded-lg bg-red-500/10 p-2 text-center">
                          <p className="text-red-300">Errores</p>
                          <p className="text-base font-semibold text-red-200">
                            {errorJobs}
                          </p>
                        </div>
                      </div>
                      <div className="max-h-48 space-y-2 overflow-y-auto">
                        {batchJobs.map((job) => (
                          <div
                            key={job.id}
                            className="flex items-center justify-between rounded-lg bg-slate-900/50 px-3 py-2 text-xs"
                          >
                            <span className="font-mono text-slate-300">
                              {job.cui}
                            </span>
                            {job.status === "pending" && (
                              <span className="text-slate-400">Pendiente</span>
                            )}
                            {job.status === "downloading" && (
                              <span className="flex items-center gap-1 text-cyan-300">
                                <Loader2 className="h-3 w-3 animate-spin" />
                                Descargando
                              </span>
                            )}
                            {job.status === "completed" && (
                              <span className="flex items-center gap-1 text-emerald-300">
                                <CheckCircle2 className="h-3 w-3" />
                                Completado
                              </span>
                            )}
                            {job.status === "error" && (
                              <span className="flex items-center gap-1 text-red-300">
                                <AlertCircle className="h-3 w-3" />
                                Error
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="rounded-xl border border-white/5 bg-slate-900/40 p-4 text-xs text-slate-400">
                    <p className="font-medium text-slate-300">
                      Formato del CSV:
                    </p>
                    <pre className="mt-2 overflow-x-auto rounded bg-slate-950/50 p-2 font-mono text-[11px] text-slate-400">
{`CUI
20233489
20228741
20215620`}
                    </pre>
                  </div>
                </div>
              </section>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
