'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Header from '@/components/Header';
import { getAllServicesAndPrices, saveServicePrice, updateServicePrice, deleteServicePrice, subscribeToServicesAndPrices, ServicePrice } from '@/lib/realtimeDatabase';
import { Plus, Edit2, Trash2, Search, ArrowUpDown, X } from 'lucide-react';
import { getUserRoleSync } from '@/lib/auth';

type SortField = 'service' | 'basePrice' | 'category';
type SortDirection = 'asc' | 'desc';

export default function TjansterPage() {
  const userRole = getUserRoleSync();
  const [services, setServices] = useState<ServicePrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [sortField, setSortField] = useState<SortField>('service');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingService, setEditingService] = useState<ServicePrice | null>(null);
  const [formData, setFormData] = useState({
    service: '',
    basePrice: 0,
    category: '',
    description: '',
    timeBudget: 0,
  });

  // Ladda tjänster från Firebase
  useEffect(() => {
    const loadServices = async () => {
      try {
        const loadedServices = await getAllServicesAndPrices();
        setServices(loadedServices);
      } catch (error) {
        console.error('Error loading services:', error);
      } finally {
        setLoading(false);
      }
    };

    loadServices();

    // Prenumerera på realtidsuppdateringar
    const unsubscribe = subscribeToServicesAndPrices((updatedServices) => {
      setServices(updatedServices);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Filtrera och sortera tjänster
  const filteredAndSortedServices = useMemo(() => {
    let filtered = services;

    // Sökfilter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        s =>
          s.service.toLowerCase().includes(query) ||
          s.description?.toLowerCase().includes(query) ||
          s.category?.toLowerCase().includes(query)
      );
    }

    // Kategorifilter
    if (categoryFilter) {
      filtered = filtered.filter(s => s.category === categoryFilter);
    }

    // Sortering
    filtered = [...filtered].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case 'service':
          aValue = a.service.toLowerCase();
          bValue = b.service.toLowerCase();
          break;
        case 'basePrice':
          aValue = a.basePrice;
          bValue = b.basePrice;
          break;
        case 'category':
          aValue = (a.category || '').toLowerCase();
          bValue = (b.category || '').toLowerCase();
          break;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [services, searchQuery, categoryFilter, sortField, sortDirection]);

  // Hämta unika kategorier
  const categories = useMemo(() => {
    const cats = new Set<string>();
    services.forEach(s => {
      if (s.category) cats.add(s.category);
    });
    return Array.from(cats).sort();
  }, [services]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleAdd = () => {
    setEditingService(null);
    setFormData({
      service: '',
      basePrice: 0,
      category: '',
      description: '',
      timeBudget: 0,
    });
    setShowAddModal(true);
  };

  const handleEdit = (service: ServicePrice) => {
    setEditingService(service);
    setFormData({
      service: service.service,
      basePrice: service.basePrice,
      category: service.category || '',
      description: service.description || '',
      timeBudget: service.timeBudget !== undefined && service.timeBudget !== null ? service.timeBudget : 0,
    });
    setShowAddModal(true);
  };

  const handleDelete = async (service: ServicePrice) => {
    if (!confirm(`Är du säker på att du vill ta bort "${service.service}"?`)) return;

    try {
      await deleteServicePrice(service.service);
      alert('Tjänst borttagen!');
    } catch (error: any) {
      console.error('Error deleting service:', error);
      alert(`Kunde inte ta bort tjänst: ${error.message}`);
    }
  };

  const handleSave = async () => {
    if (!formData.service.trim()) {
      alert('Ange ett tjänst-namn');
      return;
    }

    if (formData.basePrice < 0) {
      alert('Priset kan inte vara negativt');
      return;
    }

    try {
      const serviceData: ServicePrice = {
        service: formData.service.trim(),
        basePrice: formData.basePrice,
        category: formData.category || undefined,
        description: formData.description || undefined,
        timeBudget: formData.timeBudget > 0 ? formData.timeBudget : undefined,
      };

      if (editingService) {
        await updateServicePrice(editingService.service, serviceData);
        alert('Tjänst uppdaterad!');
      } else {
        await saveServicePrice(serviceData);
        alert('Tjänst tillagd!');
      }

      setShowAddModal(false);
      setEditingService(null);
      setFormData({
        service: '',
        basePrice: 0,
        category: '',
        description: '',
        timeBudget: 0,
      });
    } catch (error: any) {
      console.error('Error saving service:', error);
      alert(`Kunde inte spara tjänst: ${error.message}`);
    }
  };

  if (loading) {
    return (
      <div>
        <Header title="Tjänster" />
        <div className="p-6">
          <div className="text-center text-gray-600">Laddar tjänster...</div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Header title="Tjänster" />
      <div className="p-6">
        <div className="bg-white rounded-lg shadow">
          {/* Header */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Tjänster och priser</h1>
                <p className="text-gray-600 mt-1">Hantera alla tjänster och deras baspriser</p>
              </div>
              {userRole === 'admin' && (
                <button
                  onClick={handleAdd}
                  className="px-4 py-2 bg-[#1E5A7D] text-white rounded-lg hover:bg-[#164a66] flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Lägg till tjänst
                </button>
              )}
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Sök tjänster..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E5A7D] text-gray-900"
                />
              </div>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E5A7D] text-gray-900"
              >
                <option value="">Alla kategorier</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('service')}>
                    <div className="flex items-center gap-2">
                      Tjänst
                      <ArrowUpDown className="w-4 h-4" />
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('basePrice')}>
                    <div className="flex items-center gap-2">
                      Baspris (kr)
                      <ArrowUpDown className="w-4 h-4" />
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('category')}>
                    <div className="flex items-center gap-2">
                      Kategori
                      <ArrowUpDown className="w-4 h-4" />
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                    Tidsbudget (h)
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                    Tidsbudget (h)
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 uppercase tracking-wider">
                    Beskrivning
                  </th>
                  {userRole === 'admin' && (
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-900 uppercase tracking-wider">
                      Åtgärder
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredAndSortedServices.length === 0 ? (
                  <tr>
                    <td colSpan={userRole === 'admin' ? 6 : 5} className="px-6 py-8 text-center text-gray-500">
                      {searchQuery || categoryFilter ? 'Inga tjänster matchar filtren' : 'Inga tjänster hittades'}
                    </td>
                  </tr>
                ) : (
                  filteredAndSortedServices.map((service, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {service.service}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {service.basePrice.toLocaleString('sv-SE')} kr
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {service.category ? (
                          <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                            {service.category}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {service.timeBudget !== undefined ? `${service.timeBudget} h` : <span className="text-gray-400">-</span>}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {service.description || <span className="text-gray-400">-</span>}
                      </td>
                      {userRole === 'admin' && (
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleEdit(service)}
                              className="text-[#1E5A7D] hover:text-[#164a66]"
                              title="Redigera"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(service)}
                              className="text-red-600 hover:text-red-800"
                              title="Ta bort"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Summary */}
          <div className="p-4 bg-gray-50 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              Visar {filteredAndSortedServices.length} av {services.length} tjänster
            </p>
          </div>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">
                {editingService ? 'Redigera tjänst' : 'Lägg till ny tjänst'}
              </h2>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setEditingService(null);
                  setFormData({
                    service: '',
                    basePrice: 0,
                    category: '',
                    description: '',
                    timeBudget: 0,
                  });
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">
                  Tjänst-namn *
                </label>
                <input
                  type="text"
                  value={formData.service}
                  onChange={(e) => setFormData({ ...formData, service: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E5A7D] text-gray-900"
                  placeholder="T.ex. Membership Standard"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">
                  Baspris (kr) *
                </label>
                <input
                  type="number"
                  value={formData.basePrice}
                  onChange={(e) => setFormData({ ...formData, basePrice: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E5A7D] text-gray-900"
                  min="0"
                  step="1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">
                  Kategori
                </label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E5A7D] text-gray-900"
                  placeholder="T.ex. membership, test, training"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">
                  Tidsbudget (timmar)
                </label>
                <input
                  type="number"
                  value={formData.timeBudget}
                  onChange={(e) => setFormData({ ...formData, timeBudget: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E5A7D] text-gray-900"
                  min="0"
                  step="0.25"
                  placeholder="T.ex. 2.5 för medlemskap per månad"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Timmar per månad för medlemskap, eller timmar för tester
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">
                  Beskrivning
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E5A7D] text-gray-900"
                  placeholder="Beskrivning av tjänsten..."
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleSave}
                disabled={!formData.service.trim()}
                className="flex-1 px-4 py-2 bg-[#1E5A7D] text-white rounded-lg hover:bg-[#164a66] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {editingService ? 'Spara ändringar' : 'Lägg till'}
              </button>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setEditingService(null);
                  setFormData({
                    service: '',
                    basePrice: 0,
                    category: '',
                    description: '',
                    timeBudget: 0,
                  });
                }}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-900 rounded-lg hover:bg-gray-300"
              >
                Avbryt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

