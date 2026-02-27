"use client"

import { Home, Database, Clock, Settings } from "lucide-react"
import { cn } from "@/lib/utils"

interface BottomNavProps {
  activeTab: string
  onTabChange: (tab: string) => void
}

const tabs = [
  { id: "dashboard", label: "Inicio", icon: Home },
  { id: "database", label: "Alimentos", icon: Database },
  { id: "history", label: "Historial", icon: Clock },
  { id: "settings", label: "Ajustes", icon: Settings },
]

export function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/80 backdrop-blur-xl safe-area-bottom">
      <div className="mx-auto flex max-w-md items-center justify-around px-2 py-1">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "flex flex-1 flex-col items-center gap-0.5 rounded-xl px-3 py-2 transition-all duration-200",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
              aria-label={tab.label}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon
                className={cn(
                  "transition-all duration-200",
                  isActive ? "size-6" : "size-5"
                )}
                strokeWidth={isActive ? 2.5 : 2}
              />
              <span
                className={cn(
                  "text-[10px] leading-tight transition-all duration-200",
                  isActive ? "font-semibold" : "font-medium"
                )}
              >
                {tab.label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
