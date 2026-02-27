export interface FoodItem {
  id: string
  name: string
  calories: number
  protein: number
  carbs: number
  fat: number
  servingSize: string
  barcode?: string
}

export interface MealEntry {
  id: string
  foodItem: FoodItem
  quantity: number
  time: string
  date: string
}

export interface DailyLog {
  date: string
  meals: MealEntry[]
  totalCalories: number
  totalProtein: number
  totalCarbs: number
  totalFat: number
}

export interface UserSettings {
  basalMetabolism: number
  proteinGoal: number
  carbsGoal: number
  fatGoal: number
}
