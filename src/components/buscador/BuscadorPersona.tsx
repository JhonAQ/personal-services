"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { AlertCircle, Loader2, Search, User } from "lucide-react";
import type { Estudiante } from "@/types/estudiante";

interface BuscadorPersonaProps {
  mode: "nombre" | "dni";
  placeholder?: string;
  onSelect: (persona: Estudiante) => void;
}

function formatNombre(persona: Estudiante) {
  return `${persona.nombres} ${persona.apellido_paterno} ${persona.apellido_materno}`.trim();
}

export default function BuscadorPersona({
  mode,
  placeholder,
  onSelect,
}: BuscadorPersonaProps) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Estudiante[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const minLength = mode === "dni" ? 2 : 3;

  const handleSelect = useCallback(
    (persona: Estudiante) => {
      setQuery(formatNombre(persona));
      setSuggestions([]);
      setShowSuggestions(false);
      setActiveIndex(-1);
      onSelect(persona);
    },
    [onSelect]
  );

  // Debounce + búsqueda
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    setError(null);
    setActiveIndex(-1);

    const trimmed = query.trim();
    if (trimmed.length < minLength) {
      setSuggestions([]);
      setShowSuggestions(false);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setShowSuggestions(true);

    debounceRef.current = setTimeout(async () => {
      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        const response = await fetch(
          `/api/estudiantes/search?q=${encodeURIComponent(trimmed)}&tipo=${mode}&limit=8`,
          { signal: controller.signal }
        );

        if (!response.ok) {
          if (response.status === 429) {
            setError("Demasiadas búsquedas. Espera un momento.");
          } else {
            setError("Error al buscar. Intenta nuevamente.");
          }
          setSuggestions([]);
          return;
        }

        const data = (await response.json()) as { items: Estudiante[] };
        setSuggestions(data.items ?? []);
        setActiveIndex(-1);
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          return;
        }
        setError("Error de conexión. Verifica tu red.");
        setSuggestions([]);
      } finally {
        // Solo apagar el spinner si esta petición sigue siendo la actual
        if (controller === abortControllerRef.current) {
          setIsLoading(false);
        }
      }
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [query, mode, minLength]);

  // Cerrar sugerencias al hacer clic fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || suggestions.length === 0) return;

    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        setActiveIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case "ArrowUp":
        event.preventDefault();
        setActiveIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case "Enter":
        event.preventDefault();
        if (activeIndex >= 0 && activeIndex < suggestions.length) {
          handleSelect(suggestions[activeIndex]);
        }
        break;
      case "Escape":
        setShowSuggestions(false);
        setActiveIndex(-1);
        break;
    }
  };

  return (
    <div ref={containerRef} className="relative mt-3 flex flex-col gap-4">
      <div className="relative">
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
          <Search className="h-4 w-4" />
        </span>
        <input
          ref={inputRef}
          type="text"
          inputMode={mode === "dni" ? "numeric" : "text"}
          className="h-12 w-full rounded-2xl border border-white/10 bg-slate-900/45 py-2 pl-10 pr-10 text-sm text-slate-100 outline-none transition focus:border-cyan-400/70 focus:ring-2 focus:ring-cyan-400/30 placeholder:text-slate-400"
          placeholder={placeholder}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onFocus={() => {
            if (suggestions.length > 0) setShowSuggestions(true);
          }}
          onKeyDown={handleKeyDown}
          role="combobox"
          aria-expanded={showSuggestions}
          aria-autocomplete="list"
          aria-controls="sugerencias-lista"
          autoComplete="off"
        />
        {isLoading && (
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-cyan-400">
            <Loader2 className="h-4 w-4 animate-spin" />
          </span>
        )}
      </div>

      {showSuggestions && (
        <div
          id="sugerencias-lista"
          role="listbox"
          className="absolute top-full z-20 mt-2 w-full overflow-hidden rounded-2xl border border-white/10 bg-slate-900/95 py-2 shadow-2xl shadow-black/40 backdrop-blur"
        >
          {suggestions.length === 0 && !isLoading && (
            <div className="px-4 py-3 text-sm text-slate-400">
              No se encontraron resultados.
            </div>
          )}

          {suggestions.map((persona, index) => {
            const nombre = formatNombre(persona);
            const isActive = index === activeIndex;

            return (
              <button
                key={persona.id}
                type="button"
                role="option"
                aria-selected={isActive}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => handleSelect(persona)}
                className={`flex w-full items-start gap-3 px-4 py-3 text-left transition ${
                  isActive
                    ? "bg-cyan-500/15 text-cyan-50"
                    : "text-slate-200 hover:bg-slate-800/60"
                }`}
              >
                <div className="mt-0.5 rounded-lg bg-slate-800/70 p-1.5">
                  <User className="h-4 w-4 text-cyan-300" />
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-medium">{nombre}</span>
                  <span className="text-xs text-slate-400">
                    DNI: {persona.dni} · CUI: {persona.cui}
                  </span>
                  {persona.escuela && (
                    <span className="text-xs text-slate-500">{persona.escuela}</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-400/40 bg-red-500/10 p-3 text-sm text-red-200">
          <p className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            {error}
          </p>
        </div>
      )}
    </div>
  );
}
