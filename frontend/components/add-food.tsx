"use client"

import { useState, useMemo } from "react"
import { ArrowLeft, Search, ScanBarcode, Minus, Plus } from "lucide-react"
import { toast } from "sonner"
import { useAppState } from "@/lib/store"
import type { FoodItem, MealEntry } from "@/lib/types"
import { cn } from "@/lib/utils"
import { apiRequest } from "@/lib/api"

interface AddFoodProps {
  onBack: () => void
  onScan: () => void
}

export function AddFood({ onBack, onScan }: AddFoodProps) {
  const { savedFoods, addMeal } = useAppState()
  const [query, setQuery] = useState("")
  const [selected, setSelected] = useState<FoodItem | null>(null)
  const [quantity, setQuantity] = useState(100)
  const [added, setAdded] = useState(false)
  const [loading, setLoading] = useState(false)

  const format2Decimals = (value: number) => {
    const n = Number(value)
    if (!Number.isFinite(n)) return "0.00"
    const truncated = Math.trunc(n * 100) / 100
    return truncated.toFixed(2)
  }

  const results = useMemo(() => {
    if (!query.trim()) return savedFoods.slice(0, 8)
    return savedFoods.filter((f) =>
      f.name.toLowerCase().includes(query.toLowerCase())
    )
  }, [query, savedFoods])

  const nutrients = useMemo(() => {
    if (!selected) return null
    const factor = quantity / 100
    return {
      calories: Math.round(selected.calories * factor),
      protein: Math.round(selected.protein * factor * 10) / 10,
      carbs: Math.round(selected.carbs * factor * 10) / 10,
      fat: Math.round(selected.fat * factor * 10) / 10,
    }
  }, [selected, quantity])

  async function handleAdd() {
    if (!selected || !nutrients) return

    try {
      if (typeof window === "undefined") return

      setLoading(true)

      const json = await apiRequest<{
        success: boolean
        message?: string
        data?: {
          id: number
          food_id: number
          quantity_grams: number
          consumed_at: string
        }
      }>("/meals/create", {
        method: "POST",
        body: JSON.stringify({
          food_id: Number(selected.id),
          quantity_grams: quantity,
        }),
      })

      const isBackendFormat = json && typeof json.success === "boolean"

      if (isBackendFormat && json.success && json.data) {
        const data = json.data

        const consumed = new Date(data.consumed_at)
        const date = consumed.toISOString().split("T")[0]
        const time = consumed.toLocaleTimeString("es-ES", {
          hour: "2-digit",
          minute: "2-digit",
        })

        const meal: MealEntry = {
          id: String(data.id),
          foodItem: selected,
          quantity: data.quantity_grams,
          time,
          date,
        }

        addMeal(meal)
        setAdded(true)
        toast.success(json.message ?? "Comida registrada")

        setTimeout(() => {
          setAdded(false)
          setSelected(null)
          setQuantity(100)
          setQuery("")
          onBack()
        }, 1200)
        return
      }

      const message =
        (isBackendFormat ? json.message : (json as any)?.message ?? (json as any)?.error) ??
        "No se pudo registrar la comida. Intenta de nuevo."
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

  if (added) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-3">
        <div className="flex size-16 items-center justify-center rounded-full bg-primary/10">
          <svg
            className="size-8 text-primary"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </div>
        <p className="text-lg font-semibold text-foreground">Agregado</p>
      </div>
    )
  }

  if (selected) {
    return (
      <div className="flex flex-col gap-5 pb-4">
        <button
          onClick={() => setSelected(null)}
          className="flex items-center gap-1.5 text-sm font-medium text-primary"
        >
          <ArrowLeft className="size-4" />
          Volver a buscar
        </button>

        <div className="rounded-2xl bg-card p-5 shadow-sm ring-1 ring-border">
          <h2 className="text-lg font-bold text-foreground">
            {selected.name}
          </h2>
          <p className="text-sm text-muted-foreground">
            por {selected.servingSize}
          </p>

          {/* Quantity selector */}
          <div className="mt-5 flex items-center justify-center gap-4">
            <button
              onClick={() => setQuantity((q) => Math.max(10, q - 10))}
              className="flex size-10 items-center justify-center rounded-full bg-secondary text-foreground transition-colors hover:bg-secondary/80 active:scale-95"
              aria-label="Disminuir cantidad"
            >
              <Minus className="size-4" />
            </button>
            <div className="flex flex-col items-center">
              <input
                type="number"
                value={quantity}
                onChange={(e) =>
                  setQuantity(Math.max(1, parseInt(e.target.value) || 0))
                }
                className="w-20 bg-transparent text-center text-3xl font-bold text-foreground outline-none"
                min={1}
              />
              <span className="text-xs text-muted-foreground">
                {selected.servingSize.replace("100", "")}
              </span>
            </div>
            <button
              onClick={() => setQuantity((q) => q + 10)}
              className="flex size-10 items-center justify-center rounded-full bg-secondary text-foreground transition-colors hover:bg-secondary/80 active:scale-95"
              aria-label="Aumentar cantidad"
            >
              <Plus className="size-4" />
            </button>
          </div>

          {/* Calculated nutrients */}
          {nutrients && (
            <div className="mt-5 grid grid-cols-4 gap-2">
              <NutrientPill label="Calorias" value={`${nutrients.calories}`} unit="kcal" accent />
              <NutrientPill label="Proteina" value={`${nutrients.protein}`} unit="g" />
              <NutrientPill label="Carbos" value={`${nutrients.carbs}`} unit="g" />
              <NutrientPill label="Grasas" value={`${nutrients.fat}`} unit="g" />
            </div>
          )}
        </div>

        <button
          onClick={handleAdd}
          disabled={loading}
          className="flex h-12 w-full items-center justify-center rounded-xl bg-primary text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Agregando..." : "Agregar"}
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 pb-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="flex size-9 items-center justify-center rounded-xl bg-secondary text-foreground transition-colors hover:bg-secondary/80"
          aria-label="Volver"
        >
          <ArrowLeft className="size-4" />
        </button>
        <h1 className="text-lg font-bold text-foreground">Agregar comida</h1>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Buscar alimento..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="h-11 w-full rounded-xl bg-card pl-10 pr-4 text-sm text-foreground shadow-sm ring-1 ring-border placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          autoFocus
        />
      </div>

      {/* Scan button */}
      <button
        onClick={onScan}
        className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-secondary text-sm font-medium text-secondary-foreground transition-colors hover:bg-secondary/80"
      >
        <ScanBarcode className="size-4" />
        Escanear codigo de barras
      </button>

      {/* Results */}
      <div className="flex flex-col gap-1.5">
        <p className="text-xs font-medium text-muted-foreground">
          {query.trim() ? `${results.length} resultados` : "Sugerencias"}
        </p>
        {results.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No se encontraron alimentos
          </p>
        ) : (
          results.map((food) => (
            <button
              key={food.id}
              onClick={() => {
                setSelected(food)
                setQuantity(100)
              }}
              className="flex items-center gap-3 rounded-xl bg-card p-3 text-left shadow-sm ring-1 ring-border transition-colors hover:bg-secondary/50 active:scale-[0.99]"
            >
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-medium text-foreground">
                  {food.name}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  P:{format2Decimals(food.protein)}g &middot; C:
                  {format2Decimals(food.carbs)}g &middot; G:
                  {format2Decimals(food.fat)}g &middot; {food.servingSize}
                </p>
              </div>
              <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
                {format2Decimals(food.calories)}
                <span className="ml-0.5 text-xs font-normal text-muted-foreground">
                  kcal
                </span>
              </span>
            </button>
          ))
        )}
      </div>
    </div>
  )
}

function NutrientPill({
  label,
  value,
  unit,
  accent,
}: {
  label: string
  value: string
  unit: string
  accent?: boolean
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-0.5 rounded-xl p-2.5",
        accent ? "bg-primary/10" : "bg-secondary"
      )}
    >
      <span
        className={cn(
          "text-lg font-bold tabular-nums",
          accent ? "text-primary" : "text-foreground"
        )}
      >
        {value}
      </span>
      <span className="text-[9px] font-medium text-muted-foreground">
        {unit}
      </span>
      <span className="text-[9px] text-muted-foreground">{label}</span>
    </div>
  )
}
