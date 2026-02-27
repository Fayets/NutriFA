const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"

export interface ApiError extends Error {
  status?: number
  details?: unknown
}

export interface ApiRequestOptions extends RequestInit {
  /**
   * Si es true (por defecto), lee el token de localStorage
   * y agrega el header Authorization.
   */
  requireAuth?: boolean
}

export async function apiRequest<T = any>(
  path: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  if (typeof window === "undefined") {
    throw new Error("apiRequest solo puede usarse en el cliente")
  }

  const { requireAuth = true, headers, ...rest } = options

  let token: string | null = null
  if (requireAuth) {
    token = window.localStorage.getItem("auth_token")
    if (!token) {
      const error: ApiError = new Error(
        "No hay sesión activa. Inicia sesión nuevamente."
      )
      error.status = 401
      throw error
    }
  }

  const mergedHeaders: HeadersInit = {
    ...(headers || {}),
  }

  if (!("Content-Type" in mergedHeaders) && rest.body) {
    mergedHeaders["Content-Type"] = "application/json"
  }

  if (requireAuth && token) {
    mergedHeaders["Authorization"] = `Bearer ${token}`
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...rest,
    headers: mergedHeaders,
  })

  let json: any = null
  try {
    json = await response.json()
  } catch {
    // Ignorar errores al parsear JSON; se maneja más abajo
  }

  if (response.status !== 200 && response.status !== 201) {
    const message =
      (json && (json.message || json.detail || json.error)) ||
      "Error al conectar con el servidor. Intenta de nuevo."

    const error: ApiError = new Error(message)
    error.status = response.status
    error.details = json
    throw error
  }

  return json as T
}

