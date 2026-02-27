"use client"

import { useState, useMemo, useEffect, useRef } from "react"
import { Search, Pencil, Trash2, X, Check, Plus, ScanBarcode } from "lucide-react"
import { toast } from "sonner"
import { useAppState } from "@/lib/store"
import type { FoodItem } from "@/lib/types"
import { apiRequest } from "@/lib/api"

export function FoodDatabase() {
  const { savedFoods, addSavedFood, removeSavedFood, updateSavedFood } =
    useAppState()
  const [query, setQuery] = useState("")
  const [barcodeQuery, setBarcodeQuery] = useState("")
  const [barcodeLoading, setBarcodeLoading] = useState(false)
  const [scannerOpen, setScannerOpen] = useState(false)
  const [scannerError, setScannerError] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const animationFrameIdRef = useRef<number | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<FoodItem | null>(null)
  const [creating, setCreating] = useState(false)
  const [createForm, setCreateForm] = useState<FoodItem>({
    id: "",
    name: "",
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    servingSize: "100g",
  })

  const format2Decimals = (value: number) => {
    const n = Number(value)
    if (!Number.isFinite(n)) return "0.00"
    const truncated = Math.trunc(n * 100) / 100
    return truncated.toFixed(2)
  }

  const filtered = useMemo(() => {
    if (!query.trim()) return savedFoods
    return savedFoods.filter((f) =>
      f.name.toLowerCase().includes(query.toLowerCase())
    )
  }, [query, savedFoods])

  function stopScanner() {
    if (animationFrameIdRef.current != null) {
      cancelAnimationFrame(animationFrameIdRef.current)
      animationFrameIdRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
  }

  async function startScanner() {
    setScannerError(null)

    if (typeof window === "undefined") {
      setScannerError("El escáner solo funciona en el navegador.")
      return
    }

    // @ts-expect-error: BarcodeDetector puede no estar declarado en TS por defecto
    const SupportedBarcodeDetector = window.BarcodeDetector as
      | (new (opts: { formats: string[] }) => BarcodeDetector)
      | undefined

    if (!navigator.mediaDevices?.getUserMedia) {
      setScannerError("Tu navegador no permite acceder a la cámara.")
      return
    }

    if (!SupportedBarcodeDetector) {
      setScannerError(
        "Tu navegador no soporta escaneo de códigos de barras. Ingresa el código manualmente."
      )
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
      })
      streamRef.current = stream

      if (!videoRef.current) {
        setScannerError("No se pudo inicializar el video del escáner.")
        return
      }

      videoRef.current.srcObject = stream
      await videoRef.current.play()

      const detector = new SupportedBarcodeDetector({
        formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128"],
      })

      const scanLoop = async () => {
        if (!videoRef.current) return
        try {
          const barcodes = await detector.detect(videoRef.current)
          if (barcodes.length > 0) {
            const value = barcodes[0].rawValue?.trim()
            if (value) {
              setBarcodeQuery(value)
              setScannerOpen(false)
              stopScanner()
              // Lanzar la búsqueda automáticamente
              handleBarcodeSearch(value)
              return
            }
          }
        } catch (err) {
          console.error(err)
        }
        animationFrameIdRef.current = requestAnimationFrame(scanLoop)
      }

      animationFrameIdRef.current = requestAnimationFrame(scanLoop)
    } catch (error) {
      console.error(error)
      setScannerError(
        "No se pudo acceder a la cámara. Verifica los permisos del navegador."
      )
    }
  }

  useEffect(() => {
    if (scannerOpen) {
      startScanner()
    } else {
      stopScanner()
    }

    return () => {
      stopScanner()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scannerOpen])

  function startEdit(food: FoodItem) {
    setEditingId(food.id)
    setEditForm({ ...food })
  }

  function cancelEdit() {
    setEditingId(null)
    setEditForm(null)
  }

  async function handleDelete(food: FoodItem) {
    if (typeof window === "undefined") {
      removeSavedFood(food.id)
      return
    }

    const token = window.localStorage.getItem("auth_token")
    if (!token) {
      toast.error("No hay sesión activa. Inicia sesión nuevamente.")
      return
    }

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"
      const res = await fetch(`${apiUrl}/foods/${food.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const json = await res.json().catch(() => ({}))
      const isBackendFormat = json && typeof json.success === "boolean"

      if (
        res.ok &&
        isBackendFormat &&
        json.success &&
        json.data &&
        json.data.deleted
      ) {
        removeSavedFood(food.id)
        toast.success(json.message ?? "Alimento eliminado correctamente")
        return
      }

      const message =
        (isBackendFormat ? json.message : json?.message ?? json?.error) ??
        "No se pudo eliminar el alimento. Intenta de nuevo."
      toast.error(message)
    } catch {
      toast.error("Error al conectar con el servidor. Intenta de nuevo.")
    }
  }

  async function saveEdit() {
    if (!editForm) return
    if (typeof window === "undefined") {
      updateSavedFood(editForm)
      setEditingId(null)
      setEditForm(null)
      return
    }

    const token = window.localStorage.getItem("auth_token")
    if (!token) {
      toast.error("No hay sesión activa. Inicia sesión nuevamente.")
      return
    }

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"
      const res = await fetch(`${apiUrl}/foods/${editForm.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: editForm.name,
          calories_per_100g: editForm.calories,
          protein_per_100g: editForm.protein,
          carbs_per_100g: editForm.carbs,
          fat_per_100g: editForm.fat,
          barcode: editForm.barcode,
        }),
      })

      const json = await res.json().catch(() => ({}))
      const isBackendFormat = json && typeof json.success === "boolean"

      if (res.ok && isBackendFormat && json.success && json.data) {
        updateSavedFood(editForm)
        setEditingId(null)
        setEditForm(null)
        toast.success(json.message ?? "Alimento actualizado correctamente")
        return
      }

      const message =
        (isBackendFormat ? json.message : json?.message ?? json?.error) ??
        "No se pudo actualizar el alimento. Intenta de nuevo."
      toast.error(message)
    } catch {
      toast.error("Error al conectar con el servidor. Intenta de nuevo.")
    }
  }

  async function handleCreate() {
    if (typeof window === "undefined") return
    if (!createForm.name.trim()) {
      toast.error("El nombre es obligatorio.")
      return
    }
    const token = window.localStorage.getItem("auth_token")
    if (!token) {
      toast.error("No hay sesión activa. Inicia sesión nuevamente.")
      return
    }

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"
      const res = await fetch(`${apiUrl}/foods/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: createForm.name,
          calories_per_100g: createForm.calories,
          protein_per_100g: createForm.protein,
          carbs_per_100g: createForm.carbs,
          fat_per_100g: createForm.fat,
          barcode: createForm.barcode,
        }),
      })

      const json = await res.json().catch(() => ({}))
      const isBackendFormat = json && typeof json.success === "boolean"

      if (res.ok && isBackendFormat && json.success && json.data) {
        const data = json.data as {
          id: number
          name: string
          calories_per_100g: number
          protein_per_100g: number
          carbs_per_100g: number
          fat_per_100g: number
          barcode: string | null
        }

        const food: FoodItem = {
          id: String(data.id),
          name: data.name,
          calories: data.calories_per_100g,
          protein: data.protein_per_100g,
          carbs: data.carbs_per_100g,
          fat: data.fat_per_100g,
          servingSize: "100g",
          barcode: data.barcode ?? undefined,
        }

        addSavedFood(food)
        toast.success(json.message ?? "Alimento creado correctamente")
        setCreating(false)
        setCreateForm({
          id: "",
          name: "",
          calories: 0,
          protein: 0,
          carbs: 0,
          fat: 0,
          servingSize: "100g",
        })
        return
      }

      const message =
        (isBackendFormat ? json.message : json?.message ?? json?.error) ??
        "No se pudo crear el alimento. Intenta de nuevo."
      toast.error(message)
    } catch {
      toast.error("Error al conectar con el servidor. Intenta de nuevo.")
    }
  }

  async function handleBarcodeSearch(forcedValue?: string) {
    const raw = (forcedValue ?? barcodeQuery).trim()
    if (!raw) {
      toast.error("Ingresa un código de barras.")
      return
    }

    if (!/^\d+$/.test(raw) || raw.length < 8 || raw.length > 20) {
      toast.error(
        "El código de barras debe ser numérico y tener una longitud válida."
      )
      return
    }

    try {
      if (typeof window === "undefined") return
      setBarcodeLoading(true)

      const json = await apiRequest<{
        success: boolean
        message?: string
        data?: {
          id: number
          name: string
          calories_per_100g: number
          protein_per_100g: number
          carbs_per_100g: number
          fat_per_100g: number
          barcode: string | null
        }
      }>(`/foods/barcode/${encodeURIComponent(raw)}`)

      const isBackendFormat = json && typeof json.success === "boolean"

      if (isBackendFormat && json.success && json.data) {
        const data = json.data

        const food: FoodItem = {
          id: String(data.id),
          name: data.name,
          calories: data.calories_per_100g,
          protein: data.protein_per_100g,
          carbs: data.carbs_per_100g,
          fat: data.fat_per_100g,
          servingSize: "100g",
          barcode: data.barcode ?? undefined,
        }

        const exists = savedFoods.find((f) => f.id === food.id)
        if (exists) {
          updateSavedFood(food)
        } else {
          addSavedFood(food)
        }

        toast.success(json.message ?? "Alimento obtenido por código de barras")
        setBarcodeQuery("")
        return
      }

      const message =
        (isBackendFormat ? json.message : (json as any)?.message ?? (json as any)?.error) ??
        "No se pudo obtener el alimento por código de barras."
      toast.error(message)
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message)
      } else {
        toast.error("Error al conectar con el servidor. Intenta de nuevo.")
      }
    } finally {
      setBarcodeLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-4 pb-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Base de datos
        </h1>
        <p className="text-sm text-muted-foreground">
          {savedFoods.length} alimentos guardados
        </p>
      </div>

      <button
        onClick={() => setCreating((v) => !v)}
        className="flex h-9 items-center justify-center gap-2 self-start rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 active:scale-[0.98]"
      >
        <Plus className="size-3.5" />
        {creating ? "Cancelar" : "Nuevo alimento"}
      </button>

      {creating && (
        <div className="flex flex-col gap-3 rounded-xl bg-card p-3.5 shadow-sm ring-1 ring-border">
          <input
            type="text"
            placeholder="Nombre del alimento"
            value={createForm.name}
            onChange={(e) =>
              setCreateForm({ ...createForm, name: e.target.value })
            }
            className="h-9 w-full rounded-lg bg-secondary px-3 text-sm font-medium text-foreground outline-none focus:ring-2 focus:ring-primary/50"
          />
          <div className="grid grid-cols-4 gap-2">
            <EditField
              label="Cal"
              value={createForm.calories}
              onChange={(v) => setCreateForm({ ...createForm, calories: v })}
            />
            <EditField
              label="Prot"
              value={createForm.protein}
              onChange={(v) => setCreateForm({ ...createForm, protein: v })}
            />
            <EditField
              label="Carb"
              value={createForm.carbs}
              onChange={(v) => setCreateForm({ ...createForm, carbs: v })}
            />
            <EditField
              label="Gras"
              value={createForm.fat}
              onChange={(v) => setCreateForm({ ...createForm, fat: v })}
            />
          </div>
          <input
            type="text"
            placeholder="Código de barras (opcional)"
            value={createForm.barcode ?? ""}
            onChange={(e) =>
              setCreateForm({ ...createForm, barcode: e.target.value || undefined })
            }
            className="h-9 w-full rounded-lg bg-secondary px-3 text-xs text-foreground outline-none focus:ring-2 focus:ring-primary/50"
          />
          <button
            onClick={handleCreate}
            className="flex h-9 items-center justify-center rounded-lg bg-primary text-xs font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 active:scale-[0.98]"
          >
            Guardar alimento
          </button>
        </div>
      )
      }

      {/* Search by name */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Buscar alimento por nombre..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="h-11 w-full rounded-xl bg-card pl-10 pr-4 text-sm text-foreground shadow-sm ring-1 ring-border placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
      </div>

      {/* Search by barcode (backend + registro de alimento) */}
      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <ScanBarcode className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar o registrar alimento por código de barras..."
              value={barcodeQuery}
              onChange={(e) => setBarcodeQuery(e.target.value)}
              className="h-11 w-full rounded-xl bg-card pl-10 pr-4 text-sm text-foreground shadow-sm ring-1 ring-border placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <button
            onClick={() => handleBarcodeSearch()}
            disabled={barcodeLoading}
            className="flex h-11 items-center justify-center rounded-xl bg-primary px-3 text-xs font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {barcodeLoading ? "Buscando..." : "Buscar"}
          </button>
        </div>
        <button
          type="button"
          onClick={() => setScannerOpen(true)}
          className="flex h-10 items-center justify-center gap-2 self-start rounded-lg bg-secondary px-3 text-xs font-semibold text-foreground shadow-sm ring-1 ring-border transition-colors hover:bg-secondary/80 active:scale-[0.98]"
        >
          <ScanBarcode className="size-4" />
          Escanear código con cámara
        </button>
        {scannerError && (
          <p className="text-xs text-destructive">{scannerError}</p>
        )}
      </div>

      {scannerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-2xl bg-card p-4 shadow-lg ring-1 ring-border">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-semibold text-foreground">
                  Escanear código de barras
                </h2>
                <p className="text-xs text-muted-foreground">
                  Apunta la cámara al código de barras del producto.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setScannerOpen(false)}
                className="flex size-8 items-center justify-center rounded-full bg-secondary text-muted-foreground hover:bg-secondary/80"
                aria-label="Cerrar escáner"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="overflow-hidden rounded-xl border border-border bg-black">
              <video
                ref={videoRef}
                className="aspect-video w-full object-cover"
                autoPlay
                muted
                playsInline
              />
            </div>
            {scannerError && (
              <p className="mt-2 text-xs text-destructive">{scannerError}</p>
            )}
            <p className="mt-2 text-[11px] text-muted-foreground">
              Por privacidad, el video nunca se envía al servidor: solo se usa
              en tu dispositivo para detectar el código.
            </p>
          </div>
        </div>
      )}

      {/* List */}
      <div className="flex flex-col gap-2">
        {filtered.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No se encontraron alimentos
          </p>
        ) : (
          filtered.map((food) => (
            <div
              key={food.id}
              className="rounded-xl bg-card p-3.5 shadow-sm ring-1 ring-border transition-all"
            >
              {editingId === food.id && editForm ? (
                /* Edit mode */
                <div className="flex flex-col gap-3">
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) =>
                      setEditForm({ ...editForm, name: e.target.value })
                    }
                    className="h-9 w-full rounded-lg bg-secondary px-3 text-sm font-medium text-foreground outline-none focus:ring-2 focus:ring-primary/50"
                  />
                  <div className="grid grid-cols-4 gap-2">
                    <EditField
                      label="Cal"
                      value={editForm.calories}
                      onChange={(v) =>
                        setEditForm({ ...editForm, calories: v })
                      }
                    />
                    <EditField
                      label="Prot"
                      value={editForm.protein}
                      onChange={(v) =>
                        setEditForm({ ...editForm, protein: v })
                      }
                    />
                    <EditField
                      label="Carb"
                      value={editForm.carbs}
                      onChange={(v) =>
                        setEditForm({ ...editForm, carbs: v })
                      }
                    />
                    <EditField
                      label="Gras"
                      value={editForm.fat}
                      onChange={(v) => setEditForm({ ...editForm, fat: v })}
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={cancelEdit}
                      className="flex size-8 items-center justify-center rounded-lg bg-secondary text-muted-foreground hover:bg-secondary/80"
                      aria-label="Cancelar"
                    >
                      <X className="size-4" />
                    </button>
                    <button
                      onClick={saveEdit}
                      className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground hover:bg-primary/90"
                      aria-label="Guardar"
                    >
                      <Check className="size-4" />
                    </button>
                  </div>
                </div>
              ) : (
                /* View mode */
                <div className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {food.name}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
                      <span>{format2Decimals(food.calories)} kcal</span>
                      <span>P:{format2Decimals(food.protein)}g</span>
                      <span>C:{format2Decimals(food.carbs)}g</span>
                      <span>G:{format2Decimals(food.fat)}g</span>
                      <span className="text-muted-foreground/60">
                        {food.servingSize}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => startEdit(food)}
                      className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                      aria-label={`Editar ${food.name}`}
                    >
                      <Pencil className="size-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(food)}
                      className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                      aria-label={`Eliminar ${food.name}`}
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

function EditField({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (v: number) => void
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[9px] font-medium text-muted-foreground">
        {label}
      </label>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className="h-8 w-full rounded-lg bg-secondary px-2 text-center text-xs font-medium text-foreground tabular-nums outline-none focus:ring-2 focus:ring-primary/50"
      />
    </div>
  )
}
