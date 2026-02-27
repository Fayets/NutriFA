"use client"

import { useState, useCallback, useEffect, type ReactNode } from "react"
import { AppContext, type AppState } from "@/lib/store"
import type { FoodItem, MealEntry, UserSettings } from "@/lib/types"

export function AppProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<UserSettings>({
    basalMetabolism: 1770,
    proteinGoal: 0,
    carbsGoal: 0,
    fatGoal: 0,
  })
  const [meals, setMeals] = useState<MealEntry[]>([])
  const [savedFoods, setSavedFoods] = useState<FoodItem[]>([])

  useEffect(() => {
    if (typeof window === "undefined") return
    const token = window.localStorage.getItem("auth_token")
    if (!token) return

    async function loadFoodsAndMealsFromApi() {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"
        const res = await fetch(`${apiUrl}/foods/all`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        const json = await res.json().catch(() => ({}))
        const isBackendFormat = json && typeof json.success === "boolean"

        if (res.ok && isBackendFormat && json.success && Array.isArray(json.data)) {
          const backendFoods = json.data as Array<{
            id: number
            name: string
            calories_per_100g: number
            protein_per_100g: number
            carbs_per_100g: number
            fat_per_100g: number
          }>

          const mapped: FoodItem[] = backendFoods.map((f) => ({
            id: String(f.id),
            name: f.name,
            calories: f.calories_per_100g,
            protein: f.protein_per_100g,
            carbs: f.carbs_per_100g,
            fat: f.fat_per_100g,
            servingSize: "100g",
          }))

          setSavedFoods(mapped)

          const today = new Date()
          const startDate = today.toISOString().split("T")[0]
          const endDate = startDate

          const mealsRes = await fetch(
            `${apiUrl}/meals/range?start_date=${startDate}&end_date=${endDate}`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          )

          const mealsJson = await mealsRes.json().catch(() => ({}))
          const isMealsFormat =
            mealsJson && typeof mealsJson.success === "boolean"

          if (
            mealsRes.ok &&
            isMealsFormat &&
            mealsJson.success &&
            mealsJson.data &&
            Array.isArray(mealsJson.data.items)
          ) {
            const backendMeals = mealsJson.data.items as Array<{
              id: number
              food_id: int
              quantity_grams: number
              consumed_at: string
            }>

            const mappedMeals: MealEntry[] = backendMeals
              .map((m) => {
                const food = mapped.find(
                  (f) => Number(f.id) === m.food_id
                )
                if (!food) return null

                const consumed = new Date(m.consumed_at)
                const date = consumed.toISOString().split("T")[0]
                const time = consumed.toLocaleTimeString("es-ES", {
                  hour: "2-digit",
                  minute: "2-digit",
                })

                return {
                  id: String(m.id),
                  foodItem: food,
                  quantity: m.quantity_grams,
                  time,
                  date,
                }
              })
              .filter((m): m is MealEntry => m !== null)

            setMeals(mappedMeals)
          }
        }
      } catch {
      }
    }

    loadFoodsAndMealsFromApi()
  }, [])

  const addMeal = useCallback((meal: MealEntry) => {
    setMeals((prev) => [...prev, meal])
  }, [])

  const removeMeal = useCallback((id: string) => {
    setMeals((prev) => prev.filter((m) => m.id !== id))
  }, [])

  const addSavedFood = useCallback((food: FoodItem) => {
    setSavedFoods((prev) => [...prev, food])
  }, [])

  const removeSavedFood = useCallback((id: string) => {
    setSavedFoods((prev) => prev.filter((f) => f.id !== id))
  }, [])

  const updateSavedFood = useCallback((food: FoodItem) => {
    setSavedFoods((prev) => prev.map((f) => (f.id === food.id ? food : f)))
  }, [])

  const value: AppState = {
    settings,
    meals,
    savedFoods,
    setSettings,
    addMeal,
    removeMeal,
    addSavedFood,
    removeSavedFood,
    updateSavedFood,
  }

  return <AppContext value={value}>{children}</AppContext>
}
