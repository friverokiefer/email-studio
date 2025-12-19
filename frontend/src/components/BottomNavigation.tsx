// frontend/src/components/BottomNavigation.tsx
import React from "react";
import { Settings, Edit3, Eye } from "lucide-react";
import type { AppView } from "@/App";

interface BottomNavigationProps {
  activeView: AppView;
  onViewChange: (view: AppView) => void;
}

export function BottomNavigation({
  activeView,
  onViewChange,
}: BottomNavigationProps) {
  const tabs = [
    { id: "config" as AppView, label: "Ajustes", icon: Settings },
    { id: "edit" as AppView, label: "Contenido", icon: Edit3 },
    { id: "preview" as AppView, label: "Vista Previa", icon: Eye },
  ];

  return (
    <nav className="safe-area-bottom fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] lg:hidden">
      <div className="flex items-center justify-around h-16">
        {tabs.map((tab) => {
          const isActive = activeView === tab.id;
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              onClick={() => onViewChange(tab.id)}
              className={`
                flex flex-col items-center justify-center gap-1 px-4 py-2 transition-all duration-200 flex-1
                ${isActive ? "text-sky-600" : "text-slate-400"}
              `}
            >
              <div
                className={`
                  flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-200
                  ${
                    isActive
                      ? "bg-sky-100 scale-110"
                      : "bg-transparent scale-100"
                  }
                `}
              >
                <Icon
                  className={`w-5 h-5 transition-all duration-200 ${
                    isActive ? "stroke-[2.5]" : "stroke-[2]"
                  }`}
                />
              </div>
              <span
                className={`text-[10px] font-semibold uppercase tracking-wide transition-all duration-200 ${
                  isActive ? "opacity-100" : "opacity-70"
                }`}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}