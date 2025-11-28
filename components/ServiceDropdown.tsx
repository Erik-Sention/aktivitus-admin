'use client';

import { useState, useRef, useEffect } from 'react';
import { ServicePrice } from '@/lib/realtimeDatabase';
import { SERVICE_STRUCTURE } from '@/lib/serviceStructure';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface ServiceDropdownProps {
  value: string;
  onChange: (value: string) => void;
  services: ServicePrice[];
  className?: string;
}

interface GroupedServices {
  [category: string]: {
    [subCategory: string]: ServicePrice[];
  };
}

export default function ServiceDropdown({ value, onChange, services, className = '' }: ServiceDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [expandedSubCategory, setExpandedSubCategory] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const subDropdownRef = useRef<HTMLDivElement>(null);

  // Gruppera tjänster baserat på SERVICE_STRUCTURE
  const getGroupedServices = (): GroupedServices => {
    const grouped: GroupedServices = {};

    // Initiera strukturen från SERVICE_STRUCTURE
    for (const [mainCategory, subCategories] of Object.entries(SERVICE_STRUCTURE)) {
      grouped[mainCategory] = {};
      for (const [subCategory] of Object.entries(subCategories)) {
        grouped[mainCategory][subCategory] = [];
      }
    }

    // Mappa tjänster från Firebase till strukturen
    services.forEach(service => {
      let found = false;
      
      // Försök hitta tjänsten i strukturen
      for (const [mainCategory, subCategories] of Object.entries(SERVICE_STRUCTURE)) {
        for (const [subCategory, serviceNames] of Object.entries(subCategories)) {
          if (serviceNames.includes(service.service)) {
            grouped[mainCategory][subCategory].push(service);
            found = true;
            break;
          }
        }
        if (found) break;
      }

      // Om tjänsten inte hittades i strukturen, lägg den i Övrigt -> Alla
      if (!found) {
        if (!grouped['Övrigt']) {
          grouped['Övrigt'] = { 'Alla': [] };
        }
        if (!grouped['Övrigt']['Alla']) {
          grouped['Övrigt']['Alla'] = [];
        }
        grouped['Övrigt']['Alla'].push(service);
      }
    });

    return grouped;
  };

  const groupedServices = getGroupedServices();
  const selectedService = services.find(s => s.service === value) || 
    (value ? { service: value, basePrice: 0, category: '' as any } : null);

  // Stäng dropdown när man klickar utanför
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node) &&
          subDropdownRef.current && !subDropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setExpandedCategory(null);
        setExpandedSubCategory(null);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleCategoryHover = (category: string) => {
    setExpandedCategory(category);
    setExpandedSubCategory(null);
  };

  const handleSubCategoryHover = (category: string, subCategory: string) => {
    setExpandedCategory(category);
    setExpandedSubCategory(subCategory);
  };

  const handleServiceSelect = (service: string) => {
    onChange(service);
    setIsOpen(false);
    setExpandedCategory(null);
    setExpandedSubCategory(null);
  };

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E5A7D] text-gray-900 bg-white text-left flex items-center justify-between ${
          isOpen ? 'ring-2 ring-[#1E5A7D]' : ''
        }`}
      >
        <span className={selectedService ? 'text-gray-900' : 'text-gray-500'}>
          {selectedService ? selectedService.service : 'Välj tjänst...'}
        </span>
        <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? 'transform rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg overflow-hidden" style={{ minWidth: '300px' }}>
          <div className="flex">
            {/* Huvudkategorier */}
            <div ref={dropdownRef} className="border-r border-gray-200 bg-white">
              {Object.keys(groupedServices).map((category) => {
                const hasItems = Object.values(groupedServices[category]).some(subItems => subItems.length > 0);
                if (!hasItems) return null;
                
                return (
                  <div
                    key={category}
                    onMouseEnter={() => handleCategoryHover(category)}
                    className={`px-4 py-2 text-sm cursor-pointer transition-colors ${
                      expandedCategory === category 
                        ? 'bg-gray-100 font-semibold text-gray-900' 
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span>{category}</span>
                      {expandedCategory === category && (
                        <ChevronRight className="w-4 h-4 text-gray-500" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Sub-kategorier (visas när huvudkategori är expanderad) */}
            {expandedCategory && (
              <div className="border-r border-gray-200 bg-gray-50" style={{ minWidth: '250px' }}>
                {Object.entries(groupedServices[expandedCategory])
                  .filter(([_, items]) => items.length > 0)
                  .map(([subCategory, items]) => (
                    <div
                      key={subCategory}
                      onMouseEnter={() => handleSubCategoryHover(expandedCategory, subCategory)}
                      className={`px-4 py-2 text-sm cursor-pointer transition-colors ${
                        expandedSubCategory === subCategory
                          ? 'bg-gray-200 font-medium text-gray-900'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span>{subCategory}</span>
                        {expandedSubCategory === subCategory && (
                          <ChevronRight className="w-4 h-4 text-gray-500" />
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            )}

            {/* Tjänster (visas när sub-kategori är expanderad) */}
            {expandedCategory && expandedSubCategory && (
              <div ref={subDropdownRef} className="bg-white max-h-96 overflow-y-auto" style={{ minWidth: '350px' }}>
                {groupedServices[expandedCategory][expandedSubCategory].map((service) => (
                  <button
                    key={service.service}
                    type="button"
                    onClick={() => handleServiceSelect(service.service)}
                    className={`w-full text-left px-6 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors ${
                      value === service.service ? 'bg-[#1E5A7D] text-white hover:bg-[#0C3B5C]' : ''
                    }`}
                  >
                    {service.service}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
