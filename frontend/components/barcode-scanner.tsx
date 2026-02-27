"use client"

import { useState } from "react"
import { ArrowLeft, Camera } from "lucide-react"
import { toast } from "sonner"
import { useAppState } from "@/lib/store"
import type { FoodItem } from "@/lib/types"
import { apiRequest } from "@/lib/api"

interface BarcodeScannerProps {
  onBack: () => void
}

export function BarcodeScanner({ onBack }: BarcodeScannerProps) {
  const { addSavedFood } = useAppState()
  const [code, setCode] = useState("")
  const [scannedFood, setScannedFood] = useState<FoodItem | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleScan() {
    const raw = code.trim()
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
      setLoading(true)

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

        addSavedFood(food)
        setScannedFood(food)
        toast.success(
          json.message ?? "Alimento registrado correctamente desde código de barras"
        )
        return
      }

      const message =
        (isBackendFormat ? json.message : (json as any)?.message ?? (json as any)?.error) ??
        "No se pudo registrar el alimento por código de barras."
      toast.error(message)
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message)
      } else {
        toast.error("Error al conectar con el servidor. Intenta de nuevo.")
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-5 pb-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="flex size-9 items-center justify-center rounded-xl bg-secondary text-foreground transition-colors hover:bg-secondary/80"
          aria-label="Volver"
        >
          <ArrowLeft className="size-4" />
        </button>
        <h1 className="text-lg font-bold text-foreground">Escanear codigo</h1>
      </div>

      {/* Camera mock */}
      <div className="relative flex h-52 items-center justify-center overflow-hidden rounded-2xl bg-foreground/5 ring-1 ring-border">
        <div className="absolute inset-6 rounded-xl border-2 border-dashed border-primary/40" />
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <Camera className="size-10 opacity-40" />
          <span className="text-xs font-medium">Camara no disponible</span>
        </div>
      </div>

      {/* Manual input */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-medium text-muted-foreground">
          Ingreso manual de codigo
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Ej: 7501234567890"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="h-11 flex-1 rounded-xl bg-card px-4 text-sm text-foreground shadow-sm ring-1 ring-border placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          <button
            onClick={handleScan}
            disabled={loading}
            className="flex h-11 items-center justify-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? "Buscando..." : "Buscar y registrar"}
          </button>
        </div>
      </div>

      {/* Result */}
      {scannedFood && (
        <div className="rounded-2xl bg-card p-5 shadow-sm ring-1 ring-border animate-in fade-in slide-in-from-bottom-2 duration-300">
          <h3 className="text-base font-bold text-foreground">
            {scannedFood.name}
          </h3>
          <p className="mb-4 text-xs text-muted-foreground">
            Codigo: {scannedFood.barcode ?? code}
          </p>

          <div className="overflow-hidden rounded-xl ring-1 ring-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-secondary/70">
                  <th className="px-3 py-2 text-left text-xs font-semibold text-foreground">
                    Nutriente
                  </th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-foreground">
                    por 100g
                  </th>
                </tr>
              </thead>
              <tbody>
                <NutrientRow
                  label="Calorias"
                  value={`${scannedFood.calories} kcal`}
                />
                <NutrientRow
                  label="Proteinas"
                  value={`${scannedFood.protein} g`}
                />
                <NutrientRow
                  label="Carbohidratos"
                  value={`${scannedFood.carbs} g`}
                />
                <NutrientRow
                  label="Grasas"
                  value={`${scannedFood.fat} g`}
                />
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

function NutrientRow({ label, value }: { label: string; value: string }) {
  return (
    <tr className="border-t border-border">
      <td className="px-3 py-2.5 text-muted-foreground">{label}</td>
      <td className="px-3 py-2.5 text-right font-medium text-foreground tabular-nums">
        {value}
      </td>
    </tr>
  )
}
