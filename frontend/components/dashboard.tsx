"use client"

import { useEffect, useMemo, useState } from "react"
import { Plus, Trash2 } from "lucide-react"
import { useAppState } from "@/lib/store"
import type { MealEntry } from "@/lib/types"
import { MacroDonut } from "./macro-donut"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { apiRequest } from "@/lib/api"

interface DashboardTotals {
  totalCalories: number
  totalProtein: number
  totalCarbs: number
  totalFat: number
}

interface DashboardTodayData {
  total_calories: number
  metabolism_base: number
  balance: number
  total_protein: number
  total_carbs: number
  total_fat: number
  macro_percentages: {
    protein_percent: number
    carbs_percent: number
    fat_percent: number
  }
}

interface DashboardProps {
  onAddFood: () => void
}

export function Dashboard({ onAddFood }: DashboardProps) {
  const { settings, meals, removeMeal } = useAppState()
  const [dashboardTotals, setDashboardTotals] = useState<DashboardTotals>({
    totalCalories: 0,
    totalProtein: 0,
    totalCarbs: 0,
    totalFat: 0,
  })
  const [dashboardData, setDashboardData] = useState<DashboardTodayData | null>(
    null
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const format2Decimals = (value: number) => {
    const n = Number(value)
    if (!Number.isFinite(n)) return "0.00"
    const truncated = Math.trunc(n * 100) / 100
    return truncated.toFixed(2)
  }

  async function loadDashboardFromApi() {
    try {
      setLoading(true)
      setError(null)

      const json = await apiRequest<{
        success: boolean
        message?: string
        data?: DashboardTodayData
      }>("/dashboard/today", {
        method: "GET",
      })

      const isBackendFormat = json && typeof json.success === "boolean"

      if (isBackendFormat && json.success && json.data) {
        const data = json.data

        setDashboardData(data)
        setDashboardTotals({
          totalCalories: data.total_calories,
          totalProtein: data.total_protein,
          totalCarbs: data.total_carbs,
          totalFat: data.total_fat,
        })
        return
      }

      const message =
        (isBackendFormat ? json.message : (json as any)?.message ?? (json as any)?.error) ??
        "No se pudo cargar el dashboard de hoy."
      setError(message)
      toast.error(message)
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Error al conectar con el servidor. Intenta de nuevo."
      setError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (typeof window !== "undefined") {
      loadDashboardFromApi()
    }
  }, [])

  const today = new Date().toISOString().split("T")[0]
  const todayMeals = useMemo(
    () => meals.filter((m) => m.date === today),
    [meals, today]
  )

  const meta = dashboardData?.metabolism_base ?? settings.basalMetabolism
  const balance =
    dashboardData?.balance ?? dashboardTotals.totalCalories - meta
  const progressPct = Math.min(
    meta > 0 ? (dashboardTotals.totalCalories / meta) * 100 : 0,
    100
  )
  const isDeficit = balance <= 0

  async function handleDeleteMeal(mealId: string) {
    try {
      await apiRequest<{
        success: boolean
        message?: string
      }>(`/meals/${mealId}`, {
        method: "DELETE",
      })

      removeMeal(mealId)
      await loadDashboardFromApi()
      toast.success("Comida eliminada correctamente")
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "No se pudo eliminar la comida. Intenta de nuevo."
      toast.error(message)
    }
  }

  return (
    <div className="flex flex-col gap-5 pb-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            NutriFA
          </h1>
          <p className="text-sm text-muted-foreground">
            {new Date().toLocaleDateString("es-ES", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </p>
        </div>
      </div>

      {error && (
        <p className="text-xs text-destructive">
          {error}
        </p>
      )}

      {/* Calorie Card */}
      <div className="rounded-2xl bg-card p-5 shadow-sm ring-1 ring-border">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              Consumido hoy
            </p>
            <p className="mt-1 text-4xl font-bold tabular-nums text-foreground">
              {format2Decimals(dashboardTotals.totalCalories)}
              <span className="ml-1 text-base font-medium text-muted-foreground">
                kcal
              </span>
            </p>
            {loading && (
              <p className="mt-1 text-xs text-muted-foreground">
                Cargando dashboard...
              </p>
            )}
          </div>
          <div className="text-right">
            <p className="text-xs font-medium text-muted-foreground">
              Meta: {meta} kcal
            </p>
            <p
              className={cn(
                "mt-0.5 text-lg font-bold tabular-nums",
                isDeficit ? "text-primary" : "text-destructive"
              )}
            >
              {isDeficit ? "" : "+"}
              {Math.round(balance)} kcal
            </p>
            <p
              className={cn(
                "text-xs font-medium",
                isDeficit ? "text-primary" : "text-destructive"
              )}
            >
              {isDeficit ? "Deficit" : "Superavit"}
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-4">
          <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-700 ease-out",
                isDeficit ? "bg-primary" : "bg-destructive"
              )}
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <div className="mt-1.5 flex justify-between text-[10px] font-medium text-muted-foreground">
            <span>0</span>
            <span>{Math.round(meta)} kcal</span>
          </div>
        </div>
      </div>

      {/* Macros Card */}
      <div className="rounded-2xl bg-card p-5 shadow-sm ring-1 ring-border">
        <h2 className="mb-4 text-sm font-semibold text-foreground">
          Macronutrientes
        </h2>
        <MacroDonut
          protein={dashboardTotals.totalProtein}
          carbs={dashboardTotals.totalCarbs}
          fat={dashboardTotals.totalFat}
          proteinGoal={settings.proteinGoal}
          carbsGoal={settings.carbsGoal}
          fatGoal={settings.fatGoal}
        />
        {dashboardData && (
          <div className="mt-3 flex justify-between text-[10px] text-muted-foreground">
            <span>
              Prot: {dashboardData.macro_percentages.protein_percent.toFixed(0)}%
            </span>
            <span>
              Carb: {dashboardData.macro_percentages.carbs_percent.toFixed(0)}%
            </span>
            <span>
              Gras: {dashboardData.macro_percentages.fat_percent.toFixed(0)}%
            </span>
          </div>
        )}
      </div>

      {/* Meals List */}
      <div className="rounded-2xl bg-card p-5 shadow-sm ring-1 ring-border">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">
            Comidas de hoy
          </h2>
          <span className="text-xs text-muted-foreground">
            {todayMeals.length} {todayMeals.length === 1 ? "comida" : "comidas"}
          </span>
        </div>

        {todayMeals.length === 0 ? (
          <div className="mt-6 flex flex-col items-center gap-2 py-4">
            <p className="text-sm text-muted-foreground">
              No hay comidas registradas
            </p>
            <button
              onClick={onAddFood}
              className="text-sm font-medium text-primary hover:underline"
            >
              Agregar primera comida
            </button>
          </div>
        ) : (
          <div className="mt-3 flex flex-col gap-2">
            {todayMeals.map((meal) => {
              const nutrients = calculateMealNutrients(meal)
              return (
                <div
                  key={meal.id}
                  className="flex items-center gap-3 rounded-xl bg-secondary/50 p-3 transition-colors"
                >
                  <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
                    {meal.time}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {meal.foodItem.name}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {meal.quantity}
                      {meal.foodItem.servingSize.replace("100", "")} &middot; P:
                      {nutrients.protein}g &middot; C:{nutrients.carbs}g &middot;
                      G:{nutrients.fat}g
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold tabular-nums text-foreground">
                      {nutrients.calories}
                    </span>
                    <button
                      onClick={() => handleDeleteMeal(meal.id)}
                      className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                      aria-label={`Eliminar ${meal.foodItem.name}`}
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* FAB */}
      <button
        onClick={onAddFood}
        className="fixed bottom-20 right-4 z-40 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/25 transition-all duration-200 hover:scale-105 active:scale-95"
        aria-label="Agregar comida"
      >
        <Plus className="size-6" strokeWidth={2.5} />
      </button>
    </div>
  )
}

function calculateMealNutrients(meal: MealEntry) {
  const factor = meal.quantity / 100
  return {
    calories: Math.round(meal.foodItem.calories * factor),
    protein: Math.round(meal.foodItem.protein * factor * 10) / 10,
    carbs: Math.round(meal.foodItem.carbs * factor * 10) / 10,
    fat: Math.round(meal.foodItem.fat * factor * 10) / 10,
  }
}


