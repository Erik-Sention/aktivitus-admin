'use client';

import React, { useState } from 'react';
import { PurchaseStatus } from '@/types/purchases';

const STATUS_STYLE_MAP: Record<PurchaseStatus | 'default', string> = {
  'Väntar': 'bg-gray-50 text-gray-900 border-gray-200 focus:ring-gray-500 focus:border-gray-500',
  'Godkänd': 'bg-blue-50 text-blue-900 border-blue-200 focus:ring-blue-500 focus:border-blue-500',
  'Beställd': 'bg-purple-50 text-purple-900 border-purple-200 focus:ring-purple-500 focus:border-purple-500',
  'Levererad': 'bg-green-50 text-green-900 border-green-200 focus:ring-green-500 focus:border-green-500',
  'Avbruten': 'bg-red-50 text-red-900 border-red-200 focus:ring-red-500 focus:border-red-500',
  default: 'bg-gray-50 text-gray-900 border-gray-200 focus:ring-gray-500 focus:border-gray-500',
};

const PURCHASE_STATUSES: PurchaseStatus[] = [
  'Väntar',
  'Godkänd',
  'Beställd',
  'Levererad',
  'Avbruten',
];

interface PurchaseStatusSelectProps {
  value: PurchaseStatus;
  onChange: (status: PurchaseStatus) => Promise<void> | void;
  label?: string;
  disabled?: boolean;
}

export function PurchaseStatusSelect({
  value,
  onChange,
  label = 'Status',
  disabled = false,
}: PurchaseStatusSelectProps) {
  const [isSaving, setIsSaving] = useState(false);

  const handleChange = async (event: React.ChangeEvent<HTMLSelectElement>) => {
    const nextStatus = event.target.value as PurchaseStatus;
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
    <div className="relative min-w-[110px]">
      <select
        aria-label={label}
        className={`w-full appearance-none rounded-md border px-2 py-1.5 pr-6 text-[11px] font-medium shadow-sm transition focus:outline-none ${
          STATUS_STYLE_MAP[value] ?? STATUS_STYLE_MAP.default
        }`}
        onChange={handleChange}
        value={value}
        disabled={isSaving || disabled}
      >
        {PURCHASE_STATUSES.map((status) => (
          <option key={status} value={status} className="text-gray-900">
            {status}
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

