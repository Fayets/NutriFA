"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Flame, Beef, Wheat, Droplets } from "lucide-react"
import { toast } from "sonner"
import { useAppState } from "@/lib/store"

export function SettingsScreen() {
  const router = useRouter()
  const { settings, setSettings } = useAppState()
  const [form, setForm] = useState({ ...settings })
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    async function loadSettingsFromApi() {
      if (typeof window === "undefined") return
      const token = window.localStorage.getItem("auth_token")
      if (!token) return

      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"
        const res = await fetch(`${apiUrl}/settings/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        const json = await res.json().catch(() => ({}))
        const isBackendFormat = json && typeof json.success === "boolean"

        if (res.ok && isBackendFormat && json.success && json.data) {
          const data = json.data as {
            metabolism_base: number
            protein_target: number | null
            carbs_target: number | null
            fat_target: number | null
          }

          const nextSettings = {
            basalMetabolism: data.metabolism_base,
            proteinGoal: data.protein_target ?? settings.proteinGoal,
            carbsGoal: data.carbs_target ?? settings.carbsGoal,
            fatGoal: data.fat_target ?? settings.fatGoal,
          }

          setSettings(nextSettings)
          setForm(nextSettings)
          return
        }

        if (res.status === 404) {
          const createRes = await fetch(`${apiUrl}/settings/create`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              metabolism_base: settings.basalMetabolism,
              protein_target: settings.proteinGoal,
              carbs_target: settings.carbsGoal,
              fat_target: settings.fatGoal,
            }),
          })

          const createJson = await createRes.json().catch(() => ({}))
          const isCreateFormat =
            createJson && typeof createJson.success === "boolean"

          if (
            createRes.ok &&
            isCreateFormat &&
            createJson.success &&
            createJson.data
          ) {
            const data = createJson.data as {
              metabolism_base: number
              protein_target: number | null
              carbs_target: number | null
              fat_target: number | null
            }

            const nextSettings = {
              basalMetabolism: data.metabolism_base,
              proteinGoal: data.protein_target ?? settings.proteinGoal,
              carbsGoal: data.carbs_target ?? settings.carbsGoal,
              fatGoal: data.fat_target ?? settings.fatGoal,
            }

            setSettings(nextSettings)
            setForm(nextSettings)
            return
          }
        }
      } catch {
        // En caso de error de red, mantener configuración local
      }
    }

    loadSettingsFromApi()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleSave() {
    if (typeof window === "undefined") {
      setSettings({ ...form })
      return
    }

    const token = window.localStorage.getItem("auth_token")
    if (!token) {
      toast.error("No hay sesión activa. Inicia sesión nuevamente.")
      return
    }

    setLoading(true)
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"
      const res = await fetch(`${apiUrl}/settings/update`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          metabolism_base: form.basalMetabolism,
          protein_target: form.proteinGoal,
          carbs_target: form.carbsGoal,
          fat_target: form.fatGoal,
        }),
      })

      const json = await res.json().catch(() => ({}))
      const isBackendFormat = json && typeof json.success === "boolean"

      if (res.ok && isBackendFormat && json.success && json.data) {
        setSettings({ ...form })
        setSaved(true)
        setTimeout(() => setSaved(false), 1500)
        toast.success(json.message ?? "Configuración guardada")
        return
      }

      const message =
        (isBackendFormat ? json.message : json?.message ?? json?.error) ??
        "No se pudo guardar la configuración. Intenta de nuevo."
      toast.error(message)
    } catch {
      toast.error("Error al conectar con el servidor. Intenta de nuevo.")
    } finally {
      setLoading(false)
    }
  }

  const hasChanges =
    form.basalMetabolism !== settings.basalMetabolism ||
    form.proteinGoal !== settings.proteinGoal ||
    form.carbsGoal !== settings.carbsGoal ||
    form.fatGoal !== settings.fatGoal

  return (
    <div className="flex flex-col gap-5 pb-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Ajustes
        </h1>
        <p className="text-sm text-muted-foreground">
          Configura tus metas nutricionales
        </p>
      </div>

      <div className="rounded-2xl bg-card p-5 shadow-sm ring-1 ring-border">
        <h2 className="mb-4 text-sm font-semibold text-foreground">
          Metabolismo base
        </h2>
        <SettingField
          icon={<Flame className="size-4 text-accent" />}
          label="Calorias diarias"
          unit="kcal"
          value={form.basalMetabolism}
          onChange={(v) => setForm({ ...form, basalMetabolism: v })}
        />
      </div>

      <div className="rounded-2xl bg-card p-5 shadow-sm ring-1 ring-border">
        <h2 className="mb-4 text-sm font-semibold text-foreground">
          Metas de macronutrientes
        </h2>
        <div className="flex flex-col gap-4">
          <SettingField
            icon={<Beef className="size-4 text-chart-1" />}
            label="Proteina"
            unit="g"
            value={form.proteinGoal}
            onChange={(v) => setForm({ ...form, proteinGoal: v })}
          />
          <SettingField
            icon={<Wheat className="size-4 text-chart-2" />}
            label="Carbohidratos"
            unit="g"
            value={form.carbsGoal}
            onChange={(v) => setForm({ ...form, carbsGoal: v })}
          />
          <SettingField
            icon={<Droplets className="size-4 text-chart-3" />}
            label="Grasas"
            unit="g"
            value={form.fatGoal}
            onChange={(v) => setForm({ ...form, fatGoal: v })}
          />
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={(!hasChanges && !saved) || loading}
        className="flex h-12 w-full items-center justify-center rounded-xl bg-primary text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 active:scale-[0.98] disabled:opacity-40"
      >
        {saved ? "Guardado!" : loading ? "Guardando..." : "Guardar cambios"}
      </button>

      <button
        type="button"
        onClick={() => {
          if (typeof window !== "undefined") {
            window.localStorage.removeItem("auth_token")
            window.localStorage.removeItem("auth_user")
          }
          toast.success("Sesión cerrada")
          router.replace("/login")
        }}
        className="flex h-11 w-full items-center justify-center rounded-xl border border-destructive/40 bg-background text-sm font-semibold text-destructive shadow-sm transition-all hover:bg-destructive/10 active:scale-[0.98]"
      >
        Cerrar sesión
      </button>

      <div className="rounded-2xl bg-card p-5 shadow-sm ring-1 ring-border">
        <h2 className="mb-2 text-sm font-semibold text-foreground">
          Acerca de
        </h2>
        <p className="text-xs leading-relaxed text-muted-foreground">
          NutriFA v1.0 - Tu tracker nutricional personal. Aplicación preparada
          para conectar con API de alimentos y lector de códigos de barras.
        </p>
      </div>
    </div>
  )
}

function SettingField({
  icon,
  label,
  unit,
  value,
  onChange,
}: {
  icon: React.ReactNode
  label: string
  unit: string
  value: number
  onChange: (v: number) => void
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex size-9 items-center justify-center rounded-xl bg-secondary">
        {icon}
      </div>
      <div className="flex-1">
        <label className="text-xs font-medium text-muted-foreground">
          {label}
        </label>
      </div>
      <div className="flex items-center gap-1.5">
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(parseInt(e.target.value) || 0)}
          className="h-9 w-20 rounded-lg bg-secondary px-2 text-right text-sm font-semibold text-foreground tabular-nums outline-none focus:ring-2 focus:ring-primary/50"
        />
        <span className="text-xs text-muted-foreground">{unit}</span>
      </div>
    </div>
  )
}
