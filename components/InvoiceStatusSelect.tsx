'use client';

import React, { useState } from 'react';
import { InvoiceStatus } from '@/types';

const STATUS_STYLE_MAP: Record<InvoiceStatus | 'default', string> = {
  Betald: 'bg-green-50 text-green-900 border-green-200 focus:ring-green-500 focus:border-green-500',
  'Väntar på betalning':
    'bg-yellow-50 text-yellow-900 border-yellow-200 focus:ring-yellow-500 focus:border-yellow-500',
  Förfallen: 'bg-red-50 text-red-900 border-red-200 focus:ring-red-500 focus:border-red-500',
  'Påminnelse skickad':
    'bg-orange-50 text-orange-900 border-orange-200 focus:ring-orange-500 focus:border-orange-500',
  'Ej betald efter påminnelse':
    'bg-red-100 text-red-900 border-red-200 focus:ring-red-500 focus:border-red-500',
  'Överlämnad till inkasso':
    'bg-purple-50 text-purple-900 border-purple-200 focus:ring-purple-500 focus:border-purple-500',
  'Betalning avvisad':
    'bg-pink-50 text-pink-900 border-pink-200 focus:ring-pink-500 focus:border-pink-500',
  'Ej aktuell': 'bg-gray-50 text-gray-900 border-gray-200 focus:ring-gray-500 focus:border-gray-500',
  default: 'bg-gray-50 text-gray-900 border-gray-200 focus:ring-gray-500 focus:border-gray-500',
};

interface InvoiceStatusSelectProps {
  value: InvoiceStatus;
  options: InvoiceStatus[];
  onChange: (status: InvoiceStatus) => Promise<void> | void;
  label?: string;
}

export function InvoiceStatusSelect({
  value,
  options,
  onChange,
  label = 'Faktureringsstatus',
}: InvoiceStatusSelectProps) {
  const [isSaving, setIsSaving] = useState(false);

  const handleChange = async (event: React.ChangeEvent<HTMLSelectElement>) => {
    const nextStatus = event.target.value as InvoiceStatus;
    if (nextStatus === value) {
      return;
    }

    setIsSaving(true);
    try {
      await Promise.resolve(onChange(nextStatus));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="relative min-w-[240px]">
      <select
        aria-label={label}
        className={`w-full appearance-none rounded-lg border px-3 py-2 pr-8 text-xs font-medium shadow-sm transition focus:outline-none ${
          STATUS_STYLE_MAP[value] ?? STATUS_STYLE_MAP.default
        }`}
        onChange={handleChange}
        value={value}
        disabled={isSaving}
      >
        {options.map((status) => (
          <option key={status} value={status} className="text-gray-900">
            {status}
          </option>
        ))}
      </select>
      <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-gray-600 text-sm">
        ▾
      </span>
      {isSaving && (
        <span className="absolute -bottom-5 left-0 text-[11px] text-gray-600">Sparar...</span>
      )}
    </div>
  );
}

