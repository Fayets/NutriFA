"use client"

import { useEffect, useMemo, useState } from "react"
import { useAppState } from "@/lib/store"
import { cn } from "@/lib/utils"

interface DashboardRangeItem {
  date: string
  total_calories: number
  total_protein: number
  total_carbs: number
  total_fat: number
}

export function History() {
  const { settings } = useAppState()
  const [items, setItems] = useState<DashboardRangeItem[]>([])

  useEffect(() => {
    if (typeof window === "undefined") return
    const token = window.localStorage.getItem("auth_token")
    if (!token) return

    async function loadHistoryFromApi() {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"
        const today = new Date()
        const endDate = today.toISOString().split("T")[0]
        const start = new Date()
        start.setDate(start.getDate() - 14)
        const startDate = start.toISOString().split("T")[0]

        const res = await fetch(
          `${apiUrl}/dashboard/range?start_date=${startDate}&end_date=${endDate}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        )

        const json = await res.json().catch(() => ({}))
        const isBackendFormat = json && typeof json.success === "boolean"

        if (
          res.ok &&
          isBackendFormat &&
          json.success &&
          json.data &&
          Array.isArray(json.data.items)
        ) {
          const backendItems = json.data.items as Array<{
            date: string
            total_calories: number
            total_protein: number
            total_carbs: number
            total_fat: number
          }>

          const mapped: DashboardRangeItem[] = backendItems
            .map((d) => ({
              date: d.date.split("T")[0],
              total_calories: d.total_calories,
              total_protein: d.total_protein,
              total_carbs: d.total_carbs,
              total_fat: d.total_fat,
            }))
            .sort((a, b) => b.date.localeCompare(a.date))

          setItems(mapped)
          return
        }
      } catch {
        // silencioso
      }
    }

    loadHistoryFromApi()
  }, [])

  const dailyLogs = useMemo(() => items, [items])

  function formatDate(dateStr: string): string {
    const date = new Date(dateStr + "T12:00:00")
    const today = new Date()
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)

    if (dateStr === today.toISOString().split("T")[0]) return "Hoy"
    if (dateStr === yesterday.toISOString().split("T")[0]) return "Ayer"

    return date.toLocaleDateString("es-ES", {
      weekday: "short",
      day: "numeric",
      month: "short",
    })
  }

  return (
    <div className="flex flex-col gap-4 pb-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Historial
        </h1>
        <p className="text-sm text-muted-foreground">
          Tu registro de alimentacion
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {dailyLogs.map((log) => {
          const balance = log.total_calories - settings.basalMetabolism
          const isDeficit = balance <= 0
          const totalMacros =
            log.total_protein + log.total_carbs + log.total_fat
          const proteinPct =
            totalMacros > 0 ? (log.total_protein / totalMacros) * 100 : 0
          const carbsPct =
            totalMacros > 0 ? (log.total_carbs / totalMacros) * 100 : 0
          const fatPct =
            totalMacros > 0 ? (log.total_fat / totalMacros) * 100 : 0

          return (
            <div
              key={log.date}
              className="rounded-2xl bg-card p-4 shadow-sm ring-1 ring-border"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {formatDate(log.date)}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Dia registrado
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold tabular-nums text-foreground">
                      {log.total_calories}
                    <span className="ml-0.5 text-xs font-normal text-muted-foreground">
                      kcal
                    </span>
                  </p>
                  <p
                    className={cn(
                      "text-xs font-semibold tabular-nums",
                      isDeficit ? "text-primary" : "text-destructive"
                    )}
                  >
                    {isDeficit ? "" : "+"}
                    {balance} kcal
                  </p>
                </div>
              </div>

              {/* Macro mini bar */}
              <div className="mt-3 flex h-2 w-full overflow-hidden rounded-full">
                <div
                  className="bg-chart-1 transition-all duration-500"
                  style={{ width: `${proteinPct}%` }}
                />
                <div
                  className="bg-chart-2 transition-all duration-500"
                  style={{ width: `${carbsPct}%` }}
                />
                <div
                  className="bg-chart-3 transition-all duration-500"
                  style={{ width: `${fatPct}%` }}
                />
              </div>
              <div className="mt-1.5 flex gap-4 text-[10px] text-muted-foreground">
                <span>P: {log.total_protein}g</span>
                <span>C: {log.total_carbs}g</span>
                <span>G: {log.total_fat}g</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
