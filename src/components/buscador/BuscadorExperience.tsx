"use client";

import { type ChangeEvent, useMemo, useState } from "react";
import { Combobox, Tab } from "@headlessui/react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  Clock3,
  DownloadCloud,
  FileDown,
  History,
  Layers,
  Loader2,
  ScanSearch,
  Search,
  Sparkles,
  Users2,
} from "lucide-react";

const sampleRecords = [
  {
    cui: "202215634",
    nombres: "Ana Gabriela Chavez",
    programa: "Ingenieria de Sistemas",
    dni: "74125683",
    ultimoPeriodo: "2024-II",
    promedio: 17.3,
    creditos: 168,
  },
  {
    cui: "202198530",
    nombres: "Diego Martin Ugarte",
    programa: "Ingenieria Industrial",
    dni: "73112094",
    ultimoPeriodo: "2024-II",
    promedio: 15.8,
    creditos: 154,
  },
  {
    cui: "202045612",
    nombres: "Maria Elena Solis",
    programa: "Arquitectura",
    dni: "72488951",
    ultimoPeriodo: "2023-II",
    promedio: 16.1,
    creditos: 142,
  },
  {
    cui: "202301875",
    nombres: "Renzo Andres Benavides",
    programa: "Ciencias de la Computacion",
    dni: "76544123",
    ultimoPeriodo: "2024-I",
    promedio: 18.2,
    creditos: 96,
  },
];

const recentBatches = [
  {
    id: "Lote-152",
    createdAt: "12 Oct, 09:24",
    quantity: 8,
    status: "Completado",
    owner: "Agenda Acad",
  },
  {
    id: "Lote-151",
    createdAt: "11 Oct, 18:11",
    quantity: 3,
    status: "En progreso",
    owner: "Personal",
  },
  {
    id: "Lote-150",
    createdAt: "10 Oct, 07:55",
    quantity: 12,
    status: "Completado",
    owner: "Personal",
  },
];

const uiHighlights = [
  {
    title: "Busquedas Inteligentes",
    description: "Autocompletado sensible al contexto y estadisticas historicas para acelerar cada consulta.",
    icon: Sparkles,
  },
  {
    title: "Vista previa inmediata",
    description: "Verifica la libreta antes de descargarla con un panel interactivo y anotaciones.",
    icon: Layers,
  },
  {
    title: "Colas en lote",
    description: "Agrupa descargas masivas con seguimiento en tiempo real y reportes listos.",
    icon: DownloadCloud,
  },
];

const searchOptions = [
  {
    key: "cui",
    title: "Por CUI",
    description: "Ingresa el codigo universitario para acceder directamente a la libreta.",
    placeholder: "Ej. 202215634",
  },
  {
    key: "nombre",
    title: "Por nombre",
    description: "Busca en la base institucional y selecciona la persona correcta.",
    placeholder: "Ej. Ana Gabriela",
  },
  {
    key: "dni",
    title: "Por DNI",
    description: "Localiza resultados coincidentes y autocompleta el CUI.",
    placeholder: "Ej. 74125683",
  },
];

type StudentRecord = (typeof sampleRecords)[number];

type SearchMode = (typeof searchOptions)[number]["key"];

export default function BuscadorExperience() {
  const [modeIndex, setModeIndex] = useState(0);
  const [manualInput, setManualInput] = useState("");
  const [nameQuery, setNameQuery] = useState("");
  const [selectedRecord, setSelectedRecord] = useState<StudentRecord>(
    sampleRecords[0]
  );
  const [isQueuing, setIsQueuing] = useState(false);

  const activeMode: SearchMode = searchOptions[modeIndex].key as SearchMode;

  const filteredByName = useMemo(() => {
    if (nameQuery.trim().length === 0) {
      return sampleRecords;
    }
    return sampleRecords.filter((record) =>
      record.nombres.toLowerCase().includes(nameQuery.toLowerCase())
    );
  }, [nameQuery]);

  const handleSelectRecord = (record: StudentRecord) => {
    setSelectedRecord(record);
  };

  const handleQueueDownload = () => {
    setIsQueuing(true);
    const timeout = setTimeout(() => {
      setIsQueuing(false);
    }, 900);
    return () => clearTimeout(timeout);
  };

  const previewUrl = selectedRecord
    ? `http://extranet.unsa.edu.pe/sisacad/libretas/descarga.php?file=/var/temporal/Libreta_De_Notas_${selectedRecord.cui}_.pdf&codal=${selectedRecord.cui}`
    : undefined;

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-slate-900/40 to-slate-950" />
      <div className="relative mx-auto flex w-full max-w-[1280px] flex-col gap-10 px-6 pb-16 pt-14 lg:px-10">
        <header className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full bg-cyan-500/10 px-3 py-1 text-sm font-medium text-cyan-200 ring-1 ring-inset ring-cyan-400/40">
              <Sparkles className="h-4 w-4" />
              Suite Personal · Buscador de Libretas
            </div>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-100 sm:text-4xl lg:text-5xl">
              Localiza, visualiza y organiza libretas en segundos.
            </h1>
            <p className="text-slate-300">
              Diseñado para flujos de trabajo academicos exigentes: paneles intuitivos,
              filtros inteligentes y una experiencia consistente entre proyectos. Todo
              el enfoque en tu productividad, sin comprometer el detalle.
            </p>
          </div>
          <div className="glass-panel flex w-full max-w-sm flex-col gap-3 px-6 py-5 text-sm text-slate-200">
            <div className="flex items-center justify-between">
              <span className="font-medium text-slate-300">Actividad de hoy</span>
              <History className="h-4 w-4 text-slate-400" />
            </div>
            <div className="flex items-center justify-between text-base font-semibold text-slate-100">
              <span>18 consultas</span>
              <span className="flex items-center gap-2 text-xs font-medium text-emerald-300">
                <ArrowRight className="h-4 w-4" /> +4 frente a ayer
              </span>
            </div>
            <div className="divider-fade mt-4" />
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Tiempo promedio</span>
              <span>42 s</span>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Descargas en lote</span>
              <span>2 procesos</span>
            </div>
          </div>
        </header>

        <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
          <aside className="glass-panel flex flex-col gap-6 px-6 py-7">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-500/15 ring-1 ring-cyan-400/40">
                <ScanSearch className="h-6 w-6 text-cyan-300" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-100">Motor de busqueda</h2>
                <p className="text-sm text-slate-400">
                  Configurado para integrarse a cualquier flujo del hub personal.
                </p>
              </div>
            </div>
            <div className="grid gap-5">
              {uiHighlights.map((highlight) => (
                <article
                  key={highlight.title}
                  className="flex items-start gap-4 rounded-2xl border border-white/5 bg-white/5 p-4 text-slate-200 backdrop-blur"
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
            <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-5 text-sm text-slate-300">
              <p className="font-medium text-slate-200">Lineamientos del hub</p>
              <ul className="mt-3 space-y-2">
                <li className="flex items-start gap-2">
                  <span className="mt-1 inline-flex h-2 w-2 rounded-full bg-cyan-300" />
                  <span>Diseño coherente entre subproyectos con componentes reutilizables.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 inline-flex h-2 w-2 rounded-full bg-emerald-300" />
                  <span>Acceso rapido a descargas y visor en pantalla completa.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 inline-flex h-2 w-2 rounded-full bg-sky-300" />
                  <span>Preparado para integraciones con APIs internas y externas.</span>
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
                }}
              >
                <Tab.List className="flex flex-wrap gap-2 rounded-2xl bg-slate-900/40 p-2">
                  {searchOptions.map((option, index) => (
                    <Tab key={option.key} className="focus:outline-none">
                      {({ selected }: { selected: boolean }) => (
                        <motion.button
                          type="button"
                          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
                            selected
                              ? "bg-slate-800 text-slate-100 shadow-lg shadow-cyan-500/10"
                              : "text-slate-400 hover:text-slate-200"
                          }`}
                          layout
                          transition={{ type: "spring", stiffness: 500, damping: 40 }}
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
                                {index === 0 ? "Directo" : index === 1 ? "Asistido" : "Documento"}
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
                    <Tab.Panel key={option.key} className="rounded-3xl bg-slate-900/40 p-6">
                      <div className="flex flex-col gap-2">
                        <p className="text-sm text-slate-400">{option.description}</p>
                        {option.key === "nombre" ? (
                          <Combobox value={selectedRecord} onChange={handleSelectRecord}>
                            <div className="relative mt-3">
                              <Combobox.Input
                                className="h-12 w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 text-sm text-slate-100 outline-none transition focus:border-cyan-400/70 focus:ring-2 focus:ring-cyan-400/30"
                                displayValue={(record: StudentRecord) => record?.nombres ?? ""}
                                placeholder={option.placeholder}
                                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                                  setNameQuery(event.target.value)
                                }
                              />
                              <Combobox.Button className="absolute inset-y-0 right-3 flex items-center text-slate-500">
                                <Users2 className="h-5 w-5" />
                              </Combobox.Button>
                              <AnimatePresence>
                                {filteredByName.length > 0 && (
                                  <Combobox.Options className="absolute z-20 mt-2 w-full overflow-hidden rounded-2xl border border-white/10 bg-slate-900/95 backdrop-blur">
                                    {filteredByName.map((record) => (
                                      <Combobox.Option key={record.cui} value={record}>
                                        {({ active }: { active: boolean }) => (
                                          <div
                                            className={`flex flex-col gap-1 px-4 py-3 text-sm transition ${
                                              active
                                                ? "bg-cyan-500/10 text-slate-100"
                                                : "text-slate-300"
                                            }`}
                                          >
                                            <span className="font-semibold">{record.nombres}</span>
                                            <span className="text-xs text-slate-400">
                                              CUI {record.cui} · {record.programa}
                                            </span>
                                          </div>
                                        )}
                                      </Combobox.Option>
                                    ))}
                                  </Combobox.Options>
                                )}
                              </AnimatePresence>
                            </div>
                          </Combobox>
                        ) : (
                          <form
                            className="mt-3 flex flex-col gap-4 md:flex-row"
                            onSubmit={(event) => {
                              event.preventDefault();
                              const value = manualInput.trim();
                              if (!value) return;
                              const match = sampleRecords.find((record) =>
                                option.key === "cui"
                                  ? record.cui === value
                                  : record.dni === value
                              );
                              if (match) {
                                handleSelectRecord(match);
                              }
                            }}
                          >
                            <label className="flex-1">
                              <span className="sr-only">{option.title}</span>
                              <input
                                className="h-12 w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 text-sm text-slate-100 outline-none transition focus:border-cyan-400/70 focus:ring-2 focus:ring-cyan-400/30"
                                placeholder={option.placeholder}
                                value={manualInput}
                                onChange={(event) => setManualInput(event.target.value)}
                              />
                            </label>
                            <button
                              type="submit"
                              className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-cyan-500/90 px-6 text-sm font-semibold text-slate-950 shadow-lg shadow-cyan-500/30 transition hover:bg-cyan-400"
                            >
                              <Search className="h-4 w-4" />
                              Buscar
                            </button>
                          </form>
                        )}
                        <div className="mt-5 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                          <span className="inline-flex items-center gap-2 rounded-full bg-slate-900/60 px-3 py-1 text-slate-300">
                            <Clock3 className="h-4 w-4 text-cyan-300" /> Tiempo estimado: 5 s
                          </span>
                          <span className="inline-flex items-center gap-2 rounded-full bg-slate-900/60 px-3 py-1">
                            <Layers className="h-4 w-4 text-emerald-300" /> Algoritmo adaptable por proyecto
                          </span>
                          <span className="inline-flex items-center gap-2 rounded-full bg-slate-900/60 px-3 py-1">
                            <Users2 className="h-4 w-4 text-slate-300" /> Ultimas selecciones sincronizadas
                          </span>
                        </div>
                      </div>
                    </Tab.Panel>
                  ))}
                </Tab.Panels>
              </Tab.Group>
            </section>

            <section className="grid gap-6 lg:grid-cols-[1.45fr_minmax(0,_1fr)]">
              <div className="glass-panel overflow-hidden">
                <div className="flex items-center justify-between border-b border-white/5 px-6 py-4">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-100">Resultados recientes</h2>
                    <p className="text-sm text-slate-400">
                      Selecciona un registro para mostrar la vista previa y la descarga.
                    </p>
                  </div>
                  <button className="inline-flex items-center gap-2 rounded-xl border border-cyan-500/40 bg-cyan-500/10 px-3 py-2 text-xs font-medium text-cyan-200 transition hover:bg-cyan-500/20">
                    <History className="h-4 w-4" /> Ver historial completo
                  </button>
                </div>
                <div className="divide-y divide-white/5">
                  {sampleRecords.map((record) => {
                    const isActive = selectedRecord?.cui === record.cui;
                    return (
                      <button
                        key={record.cui}
                        type="button"
                        onClick={() => handleSelectRecord(record)}
                        className={`flex w-full flex-col gap-2 px-6 py-4 text-left transition ${
                          isActive ? "bg-cyan-500/10" : "hover:bg-slate-900/50"
                        }`}
                      >
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-semibold text-slate-100">{record.nombres}</span>
                          <span className="rounded-full bg-slate-900/70 px-3 py-1 text-xs text-slate-400">
                            CUI {record.cui}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-400">
                          <span>{record.programa}</span>
                          <span>Ultimo periodo {record.ultimoPeriodo}</span>
                          <span>Promedio {record.promedio}</span>
                          <span>{record.creditos} creditos</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="glass-panel flex flex-col gap-4 p-6">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-100">
                      Vista previa de libreta
                    </h2>
                    <p className="text-xs text-slate-400">
                      Revisa los datos clave antes de proceder con la descarga oficial.
                    </p>
                  </div>
                  <FileDown className="h-5 w-5 text-cyan-300" />
                </div>
                <div className="rounded-2xl border border-white/5 bg-slate-950/60 p-4">
                  {selectedRecord ? (
                    <div className="space-y-4 text-sm text-slate-300">
                      <div className="flex flex-col gap-1">
                        <span className="text-xs uppercase tracking-wide text-slate-500">
                          Estudiante seleccionado
                        </span>
                        <p className="text-base font-semibold text-slate-100">
                          {selectedRecord.nombres}
                        </p>
                        <p className="text-xs text-slate-500">
                          CUI {selectedRecord.cui} · DNI {selectedRecord.dni}
                        </p>
                      </div>
                      <div className="rounded-xl bg-slate-900/70 p-4">
                        <p className="text-xs uppercase tracking-wide text-slate-500">
                          Programa
                        </p>
                        <p className="font-medium text-slate-200">
                          {selectedRecord.programa}
                        </p>
                        <div className="mt-3 grid grid-cols-3 gap-4 text-xs">
                          <div>
                            <p className="text-slate-500">Promedio</p>
                            <p className="text-lg font-semibold text-emerald-300">
                              {selectedRecord.promedio}
                            </p>
                          </div>
                          <div>
                            <p className="text-slate-500">Creditos</p>
                            <p className="text-lg font-semibold text-sky-300">
                              {selectedRecord.creditos}
                            </p>
                          </div>
                          <div>
                            <p className="text-slate-500">Periodo</p>
                            <p className="text-lg font-semibold text-cyan-300">
                              {selectedRecord.ultimoPeriodo}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col gap-3 text-xs text-slate-400">
                        <span>
                          Link generado:
                          <br />
                          <span className="break-all font-mono text-[11px] text-slate-300">
                            {previewUrl}
                          </span>
                        </span>
                        <div className="flex flex-wrap items-center gap-3">
                          <a
                            className="inline-flex items-center gap-2 rounded-xl border border-cyan-400/60 bg-cyan-500/10 px-4 py-2 text-xs font-semibold text-cyan-100 transition hover:bg-cyan-500/20"
                            href={previewUrl}
                            target="_blank"
                            rel="noreferrer"
                          >
                            <FileDown className="h-4 w-4" /> Abrir en pestaña nueva
                          </a>
                          <button
                            type="button"
                            onClick={() => handleQueueDownload()}
                            className="inline-flex items-center gap-2 rounded-xl bg-slate-900/70 px-4 py-2 text-xs font-semibold text-slate-200 transition hover:bg-slate-800"
                          >
                            {isQueuing ? (
                              <Loader2 className="h-4 w-4 animate-spin text-cyan-300" />
                            ) : (
                              <DownloadCloud className="h-4 w-4 text-cyan-300" />
                            )}
                            Enviar a lote
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex h-52 items-center justify-center text-sm text-slate-500">
                      Selecciona un registro para mostrar la vista previa.
                    </div>
                  )}
                </div>
              </div>
            </section>

            <section className="glass-panel grid gap-6 p-6 lg:grid-cols-[1.6fr_minmax(0,_1fr)]">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-100">
                      Colas de descarga en lote
                    </h2>
                    <p className="text-xs text-slate-400">
                      Organiza procesos masivos sin perder visibilidad.
                    </p>
                  </div>
                  <button className="inline-flex items-center gap-2 rounded-xl bg-cyan-500/80 px-3 py-2 text-xs font-semibold text-slate-950 shadow-lg shadow-cyan-500/20 transition hover:bg-cyan-400">
                    <DownloadCloud className="h-4 w-4" /> Nuevo lote
                  </button>
                </div>
                <div className="grid gap-4">
                  {recentBatches.map((batch) => (
                    <article
                      key={batch.id}
                      className="flex items-center justify-between rounded-2xl border border-white/5 bg-slate-900/60 p-4 text-sm text-slate-200"
                    >
                      <div className="flex flex-col">
                        <span className="text-xs uppercase tracking-wide text-slate-500">
                          {batch.status}
                        </span>
                        <span className="text-base font-semibold text-slate-100">
                          {batch.id}
                        </span>
                        <span className="text-xs text-slate-400">
                          Programado por {batch.owner} · {batch.createdAt}
                        </span>
                      </div>
                      <div className="flex flex-col items-end text-xs text-slate-400">
                        <span className="rounded-full bg-slate-900/70 px-3 py-1 font-medium text-slate-300">
                          {batch.quantity} libretas
                        </span>
                        <button className="mt-3 inline-flex items-center gap-2 text-cyan-200 hover:text-cyan-100">
                          Seguimiento <ArrowRight className="h-4 w-4" />
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-5">
                <h3 className="text-sm font-semibold text-slate-200">
                  Agenda & proximos pasos
                </h3>
                <ul className="mt-4 space-y-3 text-xs text-slate-400">
                  <li className="flex items-start gap-2">
                    <Sparkles className="mt-0.5 h-4 w-4 text-cyan-300" />
                    <span>Integrar notificaciones en tiempo real para lotes extensos.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Search className="mt-0.5 h-4 w-4 text-emerald-300" />
                    <span>Conectar con la API oficial del padron para completar los resultados.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Users2 className="mt-0.5 h-4 w-4 text-sky-300" />
                    <span>Soporte multiusuario con perfiles y permisos segmentados.</span>
                  </li>
                </ul>
                <div className="mt-5 rounded-xl bg-slate-950/60 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">
                    Consistencia en el hub
                  </p>
                  <p className="mt-2 text-sm text-slate-300">
                    Este modulo hereda componentes base para mantener alineada la experiencia
                    visual con el resto de servicios personales.
                  </p>
                </div>
              </div>
            </section>
          </main>
        </div>
      </div>
    </div>
  );
}
