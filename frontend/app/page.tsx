"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { AppProvider } from "@/components/app-provider"
import { BottomNav } from "@/components/bottom-nav"
import { Dashboard } from "@/components/dashboard"
import { AddFood } from "@/components/add-food"
import { BarcodeScanner } from "@/components/barcode-scanner"
import { FoodDatabase } from "@/components/food-database"
import { History } from "@/components/history"
import { SettingsScreen } from "@/components/settings-screen"

type Screen = "dashboard" | "add-food" | "barcode" | "database" | "history" | "settings"

export default function Home() {
  const router = useRouter()
  const [screen, setScreen] = useState<Screen>("dashboard")
  const [checkingAuth, setCheckingAuth] = useState(true)

  useEffect(() => {
    if (typeof window === "undefined") return
    const token = window.localStorage.getItem("auth_token")
    if (!token) {
      router.replace("/login")
    } else {
      setCheckingAuth(false)
    }
  }, [router])

  if (checkingAuth) {
    return null
  }

  function handleTabChange(tab: string) {
    setScreen(tab as Screen)
  }

  const activeTab =
    screen === "add-food" || screen === "barcode" ? "dashboard" : screen

  return (
    <AppProvider>
      <main className="mx-auto min-h-dvh max-w-md bg-background">
        <div className="px-4 pt-12 pb-24">
          {screen === "dashboard" && (
            <Dashboard onAddFood={() => setScreen("add-food")} />
          )}
          {screen === "add-food" && (
            <AddFood
              onBack={() => setScreen("dashboard")}
              onScan={() => setScreen("barcode")}
            />
          )}
          {screen === "barcode" && (
            <BarcodeScanner onBack={() => setScreen("add-food")} />
          )}
          {screen === "database" && <FoodDatabase />}
          {screen === "history" && <History />}
          {screen === "settings" && <SettingsScreen />}
        </div>
        <BottomNav activeTab={activeTab} onTabChange={handleTabChange} />
      </main>
    </AppProvider>
  )
}
