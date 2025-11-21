'use client';

import React, { useState } from 'react';
import { PaymentStatus } from '@/types';

const STATUS_STYLE_MAP: Record<PaymentStatus | 'default', string> = {
  Betald: 'bg-green-50 text-green-900 border-green-200 focus:ring-green-500 focus:border-green-500',
  'Väntar på fullständig faktureringsinfo':
    'bg-yellow-50 text-yellow-900 border-yellow-200 focus:ring-yellow-500 focus:border-yellow-500',
  'Väntar på utbetalning':
    'bg-blue-50 text-blue-900 border-blue-200 focus:ring-blue-500 focus:border-blue-500',
  'Delvis betald': 'bg-orange-50 text-orange-900 border-orange-200 focus:ring-orange-500 focus:border-orange-500',
  Avbruten: 'bg-red-50 text-red-900 border-red-200 focus:ring-red-500 focus:border-red-500',
  'Ej aktuell': 'bg-gray-50 text-gray-900 border-gray-200 focus:ring-gray-500 focus:border-gray-500',
  default: 'bg-gray-50 text-gray-900 border-gray-200 focus:ring-gray-500 focus:border-gray-500',
};

interface PaymentStatusSelectProps {
  value: PaymentStatus;
  options: PaymentStatus[];
  onChange: (status: PaymentStatus) => Promise<void> | void;
  label?: string;
}

export function PaymentStatusSelect({
  value,
  options,
  onChange,
  label = 'Utbetalningsstatus',
}: PaymentStatusSelectProps) {
  const [isSaving, setIsSaving] = useState(false);

  const handleChange = async (event: React.ChangeEvent<HTMLSelectElement>) => {
    const nextStatus = event.target.value as PaymentStatus;
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
    <div className="relative dropdown-container min-w-[230px]">
      <select
        aria-label={label}
        className={`w-full appearance-none rounded-lg border px-3 py-2 pr-8 text-sm font-medium shadow-sm transition focus:outline-none ${
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
      <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-gray-600">
        ▾
      </span>
      {isSaving && (
        <span className="absolute -bottom-5 left-0 text-xs text-gray-600">Sparar...</span>
      )}
    </div>
  );
}

