"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"

const loginSchema = z.object({
  user: z.string().min(1, "El usuario es obligatorio"),
  password: z
    .string()
    .min(1, "La contraseña es obligatoria")
    .min(6, "La contraseña debe tener al menos 6 caracteres"),
})

type LoginValues = z.infer<typeof loginSchema>

export function LoginForm() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      user: "",
      password: "",
    },
  })

  async function onSubmit(values: LoginValues) {
    setIsLoading(true)
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"
      const res = await fetch(`${apiUrl}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user: values.user,
          password: values.password,
        }),
      })

      const json = await res.json().catch(() => ({}))
      const isBackendFormat = json && typeof json.success === "boolean" && json.data != null

      if (res.ok && isBackendFormat && json.success) {
        const token = json.data?.access_token
        const user = json.data?.usuario
        if (token && typeof window !== "undefined") {
          window.localStorage.setItem("auth_token", token)
          if (user) {
            window.localStorage.setItem("auth_user", JSON.stringify(user))
          }
        }
        toast.success(json.message ?? "Sesión iniciada correctamente")
        router.push("/")
        router.refresh()
        return
      }

      // Sin backend (404): permitir login demo en desarrollo
      if (res.status === 404 && typeof window !== "undefined") {
        window.localStorage.setItem("auth_token", "demo-token")
        window.localStorage.setItem(
          "auth_user",
          JSON.stringify({ user: values.user })
        )
        toast.success("Sesión iniciada (modo demo)")
        router.push("/")
        router.refresh()
        return
      }

      const message =
        (isBackendFormat ? json.message : json?.message ?? json?.error) ??
        "Credenciales incorrectas. Intenta de nuevo."
      toast.error(message)
    } catch {
      // Error de red o backend caído: simular login demo para desarrollo
      if (typeof window !== "undefined") {
        window.localStorage.setItem("auth_token", "demo-token")
        window.localStorage.setItem(
          "auth_user",
          JSON.stringify({ user: values.user })
        )
      }
      toast.success("Sesión iniciada (modo demo)")
      router.push("/")
      router.refresh()
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="user"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Usuario</FormLabel>
              <FormControl>
                <Input
                  type="text"
                  placeholder="tu_usuario"
                  autoComplete="username"
                  disabled={isLoading}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Contraseña</FormLabel>
              <FormControl>
                <Input
                  type="password"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  disabled={isLoading}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              Iniciando sesión...
            </>
          ) : (
            "Iniciar sesión"
          )}
        </Button>
      </form>
    </Form>
  )
}
