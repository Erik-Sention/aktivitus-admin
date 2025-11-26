'use client';

import React, { useState } from 'react';

const PRIORITY_STYLE_MAP: Record<number | 'default', string> = {
  1: 'bg-red-50 text-red-900 border-red-200 focus:ring-red-500 focus:border-red-500',
  2: 'bg-orange-50 text-orange-900 border-orange-200 focus:ring-orange-500 focus:border-orange-500',
  3: 'bg-yellow-50 text-yellow-900 border-yellow-200 focus:ring-yellow-500 focus:border-yellow-500',
  4: 'bg-green-50 text-green-900 border-green-200 focus:ring-green-500 focus:border-green-500',
  default: 'bg-gray-50 text-gray-900 border-gray-200 focus:ring-gray-500 focus:border-gray-500',
};

const PRIORITY_LABELS: Record<number, string> = {
  1: '1 - Produktionsvägörande',
  2: '2 - Brådskande',
  3: '3 - Planerad',
  4: '4 - Kan vänta',
};

interface PrioritySelectProps {
  value: 1 | 2 | 3 | 4;
  onChange: (priority: 1 | 2 | 3 | 4) => Promise<void> | void;
  label?: string;
  disabled?: boolean;
}

export function PrioritySelect({
  value,
  onChange,
  label = 'Prioritet',
  disabled = false,
}: PrioritySelectProps) {
  const [isSaving, setIsSaving] = useState(false);

  const handleChange = async (event: React.ChangeEvent<HTMLSelectElement>) => {
    const nextPriority = parseInt(event.target.value) as 1 | 2 | 3 | 4;
    if (nextPriority === value) {
      return;
    }

    setIsSaving(true);
    try {
      await Promise.resolve(onChange(nextPriority));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="relative min-w-[140px]">
      <select
        aria-label={label}
        className={`w-full appearance-none rounded-md border px-2 py-1.5 pr-6 text-[11px] font-medium shadow-sm transition focus:outline-none ${
          PRIORITY_STYLE_MAP[value] ?? PRIORITY_STYLE_MAP.default
        }`}
        onChange={handleChange}
        value={value}
        disabled={isSaving || disabled}
      >
        {[1, 2, 3, 4].map((priority) => (
          <option key={priority} value={priority} className="text-gray-900">
            {priority} - {PRIORITY_LABELS[priority as 1 | 2 | 3 | 4]}
          </option>
        ))}
      </select>
      <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-gray-600 text-xs">
        ▾
      </span>
      {isSaving && (
        <span className="absolute -bottom-4 left-0 text-[10px] text-gray-600">Sparar...</span>
      )}
    </div>
  );
}

