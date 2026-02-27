"use client"

import { createContext, useContext } from "react"
import type { FoodItem, MealEntry, UserSettings } from "./types"

export interface AppState {
  settings: UserSettings
  meals: MealEntry[]
  savedFoods: FoodItem[]
  setSettings: (settings: UserSettings) => void
  addMeal: (meal: MealEntry) => void
  removeMeal: (id: string) => void
  addSavedFood: (food: FoodItem) => void
  removeSavedFood: (id: string) => void
  updateSavedFood: (food: FoodItem) => void
}

export const AppContext = createContext<AppState | null>(null)

export function useAppState(): AppState {
  const context = useContext(AppContext)
  if (!context) {
    throw new Error("useAppState must be used within AppProvider")
  }
  return context
}
