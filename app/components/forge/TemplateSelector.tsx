/**
 * TemplateSelector - Reusable Template Picker
 * Used by: Legal Studio, Email Studio
 */

'use client';

import { type ReactNode } from 'react';

export interface Template {
  id: string;
  name: string;
  description: string;
  icon: ReactNode;
}

interface TemplateSelectorProps {
  templates: Template[];
  onSelect: (templateId: string) => void;
  selectedId?: string;
  disabled?: boolean;
}

export function TemplateSelector({
  templates,
  onSelect,
  selectedId,
  disabled = false,
}: TemplateSelectorProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {templates.map((template) => {
        const isSelected = selectedId === template.id;

        return (
          <button
            key={template.id}
            onClick={() => onSelect(template.id)}
            disabled={disabled}
            className={`glass-card p-6 rounded-xl border transition-all text-left hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 ${
              isSelected
                ? 'border-[#FF9900] bg-[#FF9900]/5 ring-2 ring-[#FF9900]/20'
                : 'border-white/10 hover:border-white/20'
            }`}
          >
            {/* Icon + Title */}
            <div className="flex items-start gap-4 mb-3">
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  isSelected ? 'bg-[#FF9900]/10' : 'bg-white/5'
                }`}
              >
                {template.icon}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold text-white mb-1 truncate">
                  {template.name}
                </h3>
              </div>
            </div>

            {/* Description */}
            <p className="text-xs text-white/60 line-clamp-2 leading-relaxed">
              {template.description}
            </p>

            {/* Selected Indicator */}
            {isSelected && (
              <div className="mt-4 flex items-center gap-2 text-xs font-bold text-[#FF9900]">
                <div className="w-1.5 h-1.5 rounded-full bg-[#FF9900]" />
                Ausgewählt
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}