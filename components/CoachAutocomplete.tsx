'use client';

import { useState, useRef, useEffect } from 'react';
import { COACHES } from '@/lib/constants';

interface CoachAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  error?: boolean;
}

export default function CoachAutocomplete({
  value,
  onChange,
  placeholder = 'Ange coach-namn',
  className = '',
  error = false,
}: CoachAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [filteredCoaches, setFilteredCoaches] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value.length === 0) {
      setFilteredCoaches([]);
      setIsOpen(false);
      return;
    }

    const filtered = COACHES.filter((coach) =>
      coach.toLowerCase().includes(value.toLowerCase())
    );

    setFilteredCoaches(filtered);
    setIsOpen(filtered.length > 0 && value.length > 0);
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  const handleSelectCoach = (coach: string) => {
    onChange(coach);
    setIsOpen(false);
    inputRef.current?.blur();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' && filteredCoaches.length > 0) {
      e.preventDefault();
      setIsOpen(true);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleInputChange}
        onFocus={() => {
          if (value.length > 0 && filteredCoaches.length > 0) {
            setIsOpen(true);
          }
        }}
        onKeyDown={handleKeyDown}
        className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E5A7D] text-gray-900 ${
          error ? 'border-red-500' : 'border-gray-300'
        } ${className}`}
        placeholder={placeholder}
        autoComplete="off"
      />
      {isOpen && filteredCoaches.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto"
        >
          {filteredCoaches.map((coach, index) => (
            <button
              key={coach}
              type="button"
              onClick={() => handleSelectCoach(coach)}
              className="w-full px-4 py-2 text-left text-sm text-gray-900 hover:bg-blue-50 focus:bg-blue-50 focus:outline-none transition"
            >
              {coach}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}


