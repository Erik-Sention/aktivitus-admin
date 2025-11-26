'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { getCurrentUser, getUserRoleSync } from '@/lib/auth';
import { getUserProfile, saveUserProfile, getAllUserRoles } from '@/lib/userProfile';
import { UserProfile } from '@/types/userProfile';
import { UserRole } from '@/types';
import { Save, User, Mail, Phone, Shield, Users, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function EditUserPage() {
  const router = useRouter();
  const params = useParams();
  const currentUser = getCurrentUser();
  const currentUserRole = getUserRoleSync();
  const userEmail = decodeURIComponent(params.email as string);
  
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [allCoaches, setAllCoaches] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [formData, setFormData] = useState({
    displayName: '',
    phone: '',
    linkedCoach: '',
    role: 'coach' as UserRole,
  });

  // Kontrollera behörighet
  useEffect(() => {
    if (!currentUser || (currentUserRole !== 'superuser' && currentUserRole !== 'admin')) {
      router.push('/');
    }
  }, [currentUser, currentUserRole, router]);

  // Ladda användarprofil
  useEffect(() => {
    const loadProfile = async () => {
      setIsLoading(true);
      try {
        const userProfile = await getUserProfile(userEmail);
        
        if (userProfile) {
          setProfile(userProfile);
          setFormData({
            displayName: userProfile.displayName || '',
            phone: userProfile.phone || '',
            linkedCoach: userProfile.linkedCoach || '',
            role: userProfile.role || 'coach',
          });
        } else {
          setError('Användare hittades inte');
        }
      } catch (error) {
        console.error('Error loading profile:', error);
        setError('Kunde inte ladda användarprofil');
      } finally {
        setIsLoading(false);
      }
    };

    if (userEmail) {
      loadProfile();
    }

    // Ladda alla coacher
    const roles = getAllUserRoles();
    const coaches = Object.keys(roles).sort();
    setAllCoaches(coaches);
  }, [userEmail]);

  // Kontrollera om currentUser kan ändra denna användares roll
  const canEditRole = () => {
    if (currentUserRole === 'superuser') return true; // Superuser kan ändra allt
    if (currentUserRole === 'admin') {
      // Admin kan ändra platschef och coach, men inte admin eller superuser
      return formData.role === 'platschef' || formData.role === 'coach';
    }
    return false;
  };

  const handleSave = async () => {
    if (!formData.displayName.trim()) {
      setError('Vänligen fyll i användarens namn');
      return;
    }

    // Extra validering för rolländringar
    if (currentUserRole === 'admin' && (formData.role === 'admin' || formData.role === 'superuser')) {
      setError('Du kan inte tilldela admin- eller superuser-roller');
      return;
    }

    setIsSaving(true);
    setError('');
    setSuccess('');

    try {
      const profileToSave: UserProfile = {
        email: userEmail,
        displayName: formData.displayName.trim(),
        phone: formData.phone.trim() || undefined,
        linkedCoach: formData.linkedCoach || undefined,
        role: formData.role,
        createdAt: profile?.createdAt || new Date(),
        updatedAt: new Date(),
      };

      await saveUserProfile(profileToSave);
      setProfile(profileToSave);
      setSuccess('Profil sparad!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Error saving profile:', error);
      setError('Kunde inte spara profil. Försök igen.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Laddar användarprofil...</div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="space-y-6">
        <Link href="/admin/anvandare" className="flex items-center gap-2 text-[#1E5A7D] hover:underline">
          <ArrowLeft className="w-4 h-4" />
          Tillbaka till användarhantering
        </Link>
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error || 'Användare hittades inte'}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link href="/admin/anvandare" className="flex items-center gap-2 text-[#1E5A7D] hover:underline mb-2">
            <ArrowLeft className="w-4 h-4" />
            Tillbaka till användarhantering
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Redigera användare</h1>
          <p className="text-gray-600 mt-1">{userEmail}</p>
        </div>
      </div>

      {/* Meddelanden */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
          {success}
        </div>
      )}

      {/* Formulär */}
      <div className="bg-white rounded-lg shadow p-6 max-w-2xl">
        <div className="space-y-6">
          {/* Email (read-only) */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              <Mail className="w-4 h-4 inline mr-2" />
              Email
            </label>
            <input
              type="email"
              value={userEmail}
              disabled
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 cursor-not-allowed"
            />
          </div>

          {/* Display Name */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              <User className="w-4 h-4 inline mr-2" />
              Visningsnamn <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.displayName}
              onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E5A7D] text-gray-900"
              placeholder="Användarens namn"
              required
            />
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              <Phone className="w-4 h-4 inline mr-2" />
              Telefonnummer
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E5A7D] text-gray-900"
              placeholder="070-123 45 67"
            />
          </div>

          {/* Linked Coach */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              <Users className="w-4 h-4 inline mr-2" />
              Kopplad coach
            </label>
            <select
              value={formData.linkedCoach}
              onChange={(e) => setFormData({ ...formData, linkedCoach: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E5A7D] text-gray-900"
            >
              <option value="">Ingen coach vald</option>
              {allCoaches.map((coach) => (
                <option key={coach} value={coach}>
                  {coach}
                </option>
              ))}
            </select>
          </div>

          {/* Role */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              <Shield className="w-4 h-4 inline mr-2" />
              Roll i systemet <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
              disabled={!canEditRole()}
              className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E5A7D] text-gray-900 ${
                !canEditRole() ? 'bg-gray-50 cursor-not-allowed' : ''
              }`}
            >
              <option value="coach">Coach</option>
              <option value="platschef">Platschef</option>
              {currentUserRole === 'superuser' && <option value="admin">Administratör</option>}
              {currentUserRole === 'superuser' && <option value="superuser">Superuser</option>}
            </select>
            {!canEditRole() && (
              <p className="mt-1 text-xs text-gray-500">
                Du kan inte ändra denna användares roll
              </p>
            )}
            {currentUserRole === 'admin' && (
              <p className="mt-1 text-xs text-gray-600">
                Som admin kan du endast tilldela rollerna Coach och Platschef
              </p>
            )}
          </div>

          {/* Save button */}
          <div className="flex gap-3 pt-4 border-t">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-6 py-2 bg-[#1E5A7D] text-white rounded-lg hover:bg-[#164A6D] transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              {isSaving ? 'Sparar...' : 'Spara ändringar'}
            </button>

            <Link
              href="/admin/anvandare"
              className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
            >
              Avbryt
            </Link>
          </div>
        </div>
      </div>

      {/* Info om behörigheter */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-2xl">
        <h3 className="text-sm font-semibold text-blue-900 mb-2">Behörigheter</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          {currentUserRole === 'superuser' && (
            <li>Som <strong>Superuser</strong> kan du ändra allt för alla användare</li>
          )}
          {currentUserRole === 'admin' && (
            <>
              <li>Som <strong>Admin</strong> kan du redigera platschefer och coacher</li>
              <li>Du kan <strong>inte</strong> ändra roller för andra admins eller superusers</li>
            </>
          )}
        </ul>
      </div>
    </div>
  );
}

