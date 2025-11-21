'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser, getUserRoleSync } from '@/lib/auth';
import { getAllCoachesFromCustomers, getCoachFullName } from '@/lib/coachMapping';
import { useCustomers } from '@/lib/CustomerContext';
import { UserRole } from '@/types';
import {
  getAllAdministrativeHours,
  addAdministrativeHour,
  updateAdministrativeHour,
  deleteAdministrativeHour,
  getAdministrativeHoursForMonth,
} from '@/lib/administrativeHours';
import { AdministrativeHour, AdministrativeCategory } from '@/types/administrativeHours';
import { Plus, Edit2, Trash2, Save, X, Calendar, Clock, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';

const ADMINISTRATIVE_CATEGORIES: AdministrativeCategory[] = [
  'Save samtal',
  'Avbokning',
  'Membership avslut',
  'Kundkontakt',
  'Administration',
  'Annat',
];

export default function AdministrativeHoursPage() {
  const router = useRouter();
  const { customers } = useCustomers();
  const user = getCurrentUser();
  const userEmail = user?.email || 'unknown';
  const userRole = getUserRoleSync();

  // Hämta coach-namn från email (för coacher)
  const getCoachNameFromEmail = (email: string): string | null => {
    if (!email) return null;
    
    // Ta bort @ och allt efter
    const namePart = email.split('@')[0].toLowerCase();
    
    // Försök hitta matchande coach i kunddata
    const allCoaches = getAllCoachesFromCustomers(customers);
    const matchingCoach = allCoaches.find(coach => {
      const coachLower = coach.toLowerCase();
      const firstName = coachLower.split(' ')[0];
      return firstName === namePart || coachLower.includes(namePart);
    });
    
    return matchingCoach || null;
  };

  // Bestäm om coach-dropdown ska vara låst
  const isCoachLocked = userRole === 'coach';
  const defaultCoachName = isCoachLocked ? getCoachNameFromEmail(userEmail) : null;

  const [selectedMonth, setSelectedMonth] = useState<string>(
    new Date().toISOString().slice(0, 7)
  );
  const [selectedCoach, setSelectedCoach] = useState<string>(defaultCoachName || '');
  const [adminHours, setAdminHours] = useState<AdministrativeHour[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Formulärdata
  const [formData, setFormData] = useState({
    coachName: defaultCoachName || '',
    date: new Date().toISOString().split('T')[0],
    hours: 0.5,
    description: '',
    category: 'Annat' as AdministrativeCategory,
  });

  // Hämta alla coacher (filtrera för platschefer om nödvändigt)
  const allCoaches = useMemo(() => {
    const coaches = getAllCoachesFromCustomers(customers);
    
    // Om användaren är coach, visa bara deras eget namn
    if (isCoachLocked && defaultCoachName) {
      return [defaultCoachName];
    }
    
    return coaches;
  }, [customers, isCoachLocked, defaultCoachName]);

  // Ladda administrativa timmar
  useEffect(() => {
    const hours = getAllAdministrativeHours();
    setAdminHours(hours);
  }, []);

  // Filtrera timmar baserat på vald coach och månad
  const filteredHours = useMemo(() => {
    let filtered = adminHours;

    // Om användaren är coach, visa endast deras egna timmar
    if (isCoachLocked && defaultCoachName) {
      filtered = filtered.filter(h => h.coachName === defaultCoachName);
    } else if (selectedCoach) {
      filtered = filtered.filter(h => h.coachName === selectedCoach);
    }

    if (selectedMonth) {
      const [year, month] = selectedMonth.split('-').map(Number);
      filtered = filtered.filter(h => {
        const hourDate = new Date(h.date);
        return hourDate.getFullYear() === year && hourDate.getMonth() === month - 1;
      });
    }

    return filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [adminHours, selectedCoach, selectedMonth, isCoachLocked, defaultCoachName]);

  // Beräkna totala timmar för filtrerade resultat
  const totalHours = useMemo(() => {
    return filteredHours.reduce((sum, h) => sum + h.hours, 0);
  }, [filteredHours]);

  const handleAdd = () => {
    // Om användaren är coach, använd deras eget namn
    const coachNameToSave = isCoachLocked ? (defaultCoachName || formData.coachName) : formData.coachName;
    
    if (!coachNameToSave || !formData.date || formData.hours <= 0 || !formData.description.trim()) {
      alert('Vänligen fyll i alla obligatoriska fält');
      return;
    }

    const newHour = addAdministrativeHour(
      coachNameToSave,
      new Date(formData.date),
      formData.hours,
      formData.description,
      formData.category,
      userEmail
    );

    setAdminHours([...adminHours, newHour]);
    setIsAdding(false);
    setFormData({
      coachName: isCoachLocked ? (defaultCoachName || '') : (selectedCoach || ''),
      date: new Date().toISOString().split('T')[0],
      hours: 0.5,
      description: '',
      category: 'Annat',
    });
  };

  const handleEdit = (hour: AdministrativeHour) => {
    // Om användaren är coach, kontrollera att de bara kan redigera sina egna timmar
    if (isCoachLocked && hour.coachName !== defaultCoachName) {
      alert('Du kan endast redigera dina egna administrativa timmar');
      return;
    }
    
    setEditingId(hour.id);
    setFormData({
      coachName: isCoachLocked ? (defaultCoachName || hour.coachName) : hour.coachName,
      date: format(new Date(hour.date), 'yyyy-MM-dd'),
      hours: hour.hours,
      description: hour.description,
      category: hour.category || 'Annat',
    });
    setIsAdding(false);
  };

  const handleSaveEdit = () => {
    if (!editingId) return;

    // Om användaren är coach, använd deras eget namn
    const coachNameToSave = isCoachLocked ? (defaultCoachName || formData.coachName) : formData.coachName;

    const updated = updateAdministrativeHour(editingId, {
      coachName: coachNameToSave,
      date: new Date(formData.date),
      hours: formData.hours,
      description: formData.description,
      category: formData.category,
    });

    if (updated) {
      const updatedHours = adminHours.map(h =>
        h.id === editingId
          ? {
              ...h,
              coachName: formData.coachName,
              date: new Date(formData.date),
              hours: formData.hours,
              description: formData.description,
              category: formData.category,
            }
          : h
      );
      setAdminHours(updatedHours);
      setEditingId(null);
      setFormData({
        coachName: selectedCoach || '',
        date: new Date().toISOString().split('T')[0],
        hours: 0.5,
        description: '',
        category: 'Annat',
      });
    }
  };

  const handleDelete = (id: string) => {
    if (!confirm('Är du säker på att du vill ta bort denna registrering?')) return;

    // Om användaren är coach, kontrollera att de bara kan ta bort sina egna timmar
    const hourToDelete = adminHours.find(h => h.id === id);
    if (isCoachLocked && hourToDelete && hourToDelete.coachName !== defaultCoachName) {
      alert('Du kan endast ta bort dina egna administrativa timmar');
      return;
    }

    const deleted = deleteAdministrativeHour(id);
    if (deleted) {
      setAdminHours(adminHours.filter(h => h.id !== id));
    }
  };

  const handleCancel = () => {
    setIsAdding(false);
    setEditingId(null);
    setFormData({
      coachName: isCoachLocked ? (defaultCoachName || '') : (selectedCoach || ''),
      date: new Date().toISOString().split('T')[0],
      hours: 0.5,
      description: '',
      category: 'Annat',
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Administrativa timmar</h1>
          <p className="text-gray-600 mt-1">Registrera och hantera administrativa timmar för coacher</p>
        </div>
      </div>

      {/* Filter */}
      <div className={`grid grid-cols-1 ${isCoachLocked ? 'md:grid-cols-2' : 'md:grid-cols-3'} gap-6`}>
        <div className="bg-white rounded-lg shadow p-6">
          <label className="block text-sm font-medium text-gray-900 mb-2">
            <Calendar className="w-4 h-4 inline mr-1" />
            Välj månad
          </label>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E5A7D] text-gray-900"
          />
        </div>

        {!isCoachLocked && (
          <div className="bg-white rounded-lg shadow p-6">
            <label className="block text-sm font-medium text-gray-900 mb-2">
              <FileText className="w-4 h-4 inline mr-1" />
              Filtrera på coach
            </label>
            <select
              value={selectedCoach}
              onChange={(e) => setSelectedCoach(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E5A7D] text-gray-900"
            >
              <option value="">Alla coacher</option>
              {allCoaches.map((coach) => (
                <option key={coach} value={coach}>
                  {coach}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="bg-white rounded-lg shadow p-6 flex items-end">
          <button
            onClick={() => {
              setIsAdding(true);
              setEditingId(null);
              setFormData({
                coachName: isCoachLocked ? (defaultCoachName || '') : (selectedCoach || ''),
                date: new Date().toISOString().split('T')[0],
                hours: 0.5,
                description: '',
                category: 'Annat',
              });
            }}
            className="w-full px-4 py-2 bg-[#1E5A7D] text-white rounded-lg hover:bg-[#164A6D] transition flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Lägg till timmar
          </button>
        </div>
      </div>

      {/* Formulär för att lägga till/redigera */}
      {(isAdding || editingId) && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            {editingId ? 'Redigera administrativa timmar' : 'Lägg till administrativa timmar'}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Coach <span className="text-red-500">*</span>
              </label>
              {isCoachLocked && defaultCoachName ? (
                <div className="w-full px-4 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-900">
                  {defaultCoachName}
                </div>
              ) : (
                <select
                  value={formData.coachName}
                  onChange={(e) => setFormData({ ...formData, coachName: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E5A7D] text-gray-900"
                  required
                >
                  <option value="">Välj coach</option>
                  {allCoaches.map((coach) => (
                    <option key={coach} value={coach}>
                      {coach}
                    </option>
                  ))}
                </select>
              )}
              {isCoachLocked && (
                <p className="mt-1 text-xs text-gray-500">
                  Du kan endast registrera timmar för dig själv
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Datum <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E5A7D] text-gray-900"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Antal timmar <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.25"
                min="0.25"
                value={formData.hours}
                onChange={(e) => setFormData({ ...formData, hours: parseFloat(e.target.value) || 0 })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E5A7D] text-gray-900"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Kategori
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value as AdministrativeCategory })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E5A7D] text-gray-900"
              >
                {ADMINISTRATIVE_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Beskrivning <span className="text-red-500">*</span>
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E5A7D] text-gray-900"
                placeholder="Beskriv vad som gjordes..."
                required
              />
            </div>
          </div>

          <div className="flex gap-3 mt-4">
            <button
              onClick={editingId ? handleSaveEdit : handleAdd}
              className="px-4 py-2 bg-[#1E5A7D] text-white rounded-lg hover:bg-[#164A6D] transition flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {editingId ? 'Spara ändringar' : 'Lägg till'}
            </button>
            <button
              onClick={handleCancel}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition flex items-center gap-2"
            >
              <X className="w-4 h-4" />
              Avbryt
            </button>
          </div>
        </div>
      )}

      {/* Sammanfattning */}
      {filteredHours.length > 0 && (
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="flex items-center gap-2 text-blue-900">
            <Clock className="w-5 h-5" />
            <span className="font-semibold">
              Totalt: {totalHours.toFixed(2)} timmar för {filteredHours.length} registreringar
            </span>
          </div>
        </div>
      )}

      {/* Lista över administrativa timmar */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Datum
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Coach
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Kategori
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Beskrivning
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Timmar
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Åtgärder
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredHours.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    Inga administrativa timmar hittades för valda filter
                  </td>
                </tr>
              ) : (
                filteredHours.map((hour) => (
                  <tr key={hour.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {format(new Date(hour.date), 'd MMM yyyy', { locale: sv })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {hour.coachName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                        {hour.category || 'Annat'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {hour.description}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                      {hour.hours.toFixed(2)} h
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(hour)}
                          className="text-[#1E5A7D] hover:text-[#164A6D] transition"
                          title="Redigera"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(hour.id)}
                          className="text-red-600 hover:text-red-800 transition"
                          title="Ta bort"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

