"use client"

import { useMemo } from "react"

interface MacroDonutProps {
  protein: number
  carbs: number
  fat: number
  proteinGoal: number
  carbsGoal: number
  fatGoal: number
}

export function MacroDonut({
  protein,
  carbs,
  fat,
  proteinGoal,
  carbsGoal,
  fatGoal,
}: MacroDonutProps) {
  const format2Decimals = (value: number) => {
    const n = Number(value)
    if (!Number.isFinite(n)) return "0.00"
    const truncated = Math.trunc(n * 100) / 100
    return truncated.toFixed(2)
  }
  const segments = useMemo(() => {
    const total = protein + carbs + fat
    if (total === 0) return []

    const proteinPct = (protein / total) * 100
    const carbsPct = (carbs / total) * 100
    const fatPct = (fat / total) * 100

    const radius = 42
    const circumference = 2 * Math.PI * radius

    const proteinDash = (proteinPct / 100) * circumference
    const carbsDash = (carbsPct / 100) * circumference
    const fatDash = (fatPct / 100) * circumference

    return [
      {
        color: "stroke-chart-1",
        dashArray: `${proteinDash} ${circumference - proteinDash}`,
        offset: 0,
      },
      {
        color: "stroke-chart-2",
        dashArray: `${carbsDash} ${circumference - carbsDash}`,
        offset: -proteinDash,
      },
      {
        color: "stroke-chart-3",
        dashArray: `${fatDash} ${circumference - fatDash}`,
        offset: -(proteinDash + carbsDash),
      },
    ]
  }, [protein, carbs, fat])

  const totalCals = Math.round(protein * 4 + carbs * 4 + fat * 9)

  return (
    <div className="flex items-center gap-6">
      <div className="relative size-28 shrink-0">
        <svg viewBox="0 0 100 100" className="-rotate-90">
          <circle
            cx="50"
            cy="50"
            r="42"
            fill="none"
            strokeWidth="12"
            className="stroke-muted"
          />
          {segments.map((seg, i) => (
            <circle
              key={i}
              cx="50"
              cy="50"
              r="42"
              fill="none"
              strokeWidth="12"
              strokeLinecap="round"
              className={seg.color}
              strokeDasharray={seg.dashArray}
              strokeDashoffset={seg.offset}
              style={{
                transition: "stroke-dasharray 0.6s ease, stroke-dashoffset 0.6s ease",
              }}
            />
          ))}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-bold text-foreground">{totalCals}</span>
          <span className="text-[10px] text-muted-foreground">kcal</span>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3">
        <MacroRow
          label="Proteina"
          value={format2Decimals(protein)}
          goal={format2Decimals(proteinGoal)}
          unit="g"
          colorClass="bg-chart-1"
        />
        <MacroRow
          label="Carbos"
          value={format2Decimals(carbs)}
          goal={format2Decimals(carbsGoal)}
          unit="g"
          colorClass="bg-chart-2"
        />
        <MacroRow
          label="Grasas"
          value={format2Decimals(fat)}
          goal={format2Decimals(fatGoal)}
          unit="g"
          colorClass="bg-chart-3"
        />
      </div>
    </div>
  )
}

function MacroRow({
  label,
  value,
  goal,
  unit,
  colorClass,
}: {
  label: string
  value: string
  goal: string
  unit: string
  colorClass: string
}) {
  const numericValue = Number(value)
  const numericGoal = Number(goal) || 0
  const pct = numericGoal > 0 ? Math.min((numericValue / numericGoal) * 100, 100) : 0
  const isOver = numericGoal > 0 && numericValue > numericGoal

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <div className={cn("size-2 rounded-full", colorClass)} />
          <span className="text-xs font-medium text-foreground">{label}</span>
        </div>
        <span
          className={cn(
            "text-xs font-semibold tabular-nums",
            isOver ? "text-destructive" : "text-foreground"
          )}
        >
          {value}
          <span className="text-muted-foreground font-normal">
            /{goal}
            {unit}
          </span>
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500",
            isOver ? "bg-destructive" : colorClass
          )}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
    </div>
  )
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ")
}
