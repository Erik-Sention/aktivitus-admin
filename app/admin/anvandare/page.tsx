'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser, getUserRoleSync } from '@/lib/auth';
import { 
  getAllUserRoles, 
  updateUserRole,
  getUserProfile,
  saveUserProfile
} from '@/lib/userProfile';
import { UserRole } from '@/types';
import { Shield, User, Trash2, Save, Plus, AlertCircle, Edit } from 'lucide-react';
import Header from '@/components/Header';
import Link from 'next/link';

interface UserRoleEntry {
  email: string;
  role: UserRole;
  isNew?: boolean;
}

export default function AnvandarehanteringPage() {
  const router = useRouter();
  const currentUser = getCurrentUser();
  const currentUserRole = getUserRoleSync();
  const [users, setUsers] = useState<UserRoleEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState<UserRole>('coach');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Kontrollera behörighet - endast superuser har åtkomst
  useEffect(() => {
    if (!currentUser || currentUserRole !== 'superuser') {
      router.push('/');
    }
  }, [currentUser, currentUserRole, router]);

  // Ladda alla användare och deras roller
  useEffect(() => {
    const loadUsers = () => {
      setIsLoading(true);
      try {
        const roles = getAllUserRoles();
        const userList: UserRoleEntry[] = Object.entries(roles).map(([email, role]) => ({
          email,
          role,
        }));
        setUsers(userList.sort((a, b) => a.email.localeCompare(b.email)));
      } catch (error) {
        console.error('Error loading users:', error);
        setError('Kunde inte ladda användare');
      } finally {
        setIsLoading(false);
      }
    };

    if (currentUserRole === 'superuser') {
      loadUsers();
      
      // Ladda om när profiler uppdateras
      const interval = setInterval(loadUsers, 2000);
      return () => clearInterval(interval);
    }
  }, [currentUserRole]);

  const handleRoleChange = (email: string, newRole: UserRole) => {
    setUsers(users.map(u => u.email === email ? { ...u, role: newRole } : u));
  };

  const handleSaveUser = async (email: string) => {
    const user = users.find(u => u.email === email);
    if (!user) return;

    setIsSaving(true);
    setError('');
    setSuccess('');

    try {
      await updateUserRole(email, user.role);
      setSuccess(`Roll uppdaterad för ${email}`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Error saving user role:', error);
      setError('Kunde inte spara roll');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteUser = async (email: string) => {
    if (!confirm(`Är du säker på att du vill ta bort ${email}? Detta tar bort användarens profil men inte deras Firebase Authentication-konto.`)) {
      return;
    }

    setIsSaving(true);
    setError('');
    setSuccess('');

    try {
      const profile = await getUserProfile(email);
      if (profile) {
        // Ta bort genom att sätta profilen som inaktiv eller ta bort helt från Firebase
        // För nu, visa bara ett meddelande att de måste ta bort från Firebase Console
        setError('Ta bort användare från Firebase Console → Authentication istället');
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      setError('Kunde inte ta bort användare');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddUser = async () => {
    setError('');
    setSuccess('');
    setError('Skapa användare i Firebase Console → Authentication först. När de loggar in första gången skapas deras profil automatiskt här.');
  };

  const getRoleLabel = (role: UserRole): string => {
    switch (role) {
      case 'superuser': return 'Superuser';
      case 'admin': return 'Administratör';
      case 'platschef': return 'Platschef';
      case 'coach': return 'Coach';
      default: return role;
    }
  };

  const getRoleColor = (role: UserRole): string => {
    switch (role) {
      case 'superuser': return 'bg-red-100 text-red-800 border-red-300';
      case 'admin': return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'platschef': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'coach': return 'bg-green-100 text-green-800 border-green-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  if (currentUserRole !== 'superuser') {
    return null; // Omdirigering sker via useEffect
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Laddar användare...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Header title="Användarhantering" subtitle="Hantera användare och deras roller" />

      {/* Meddelanden */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center gap-2">
          <Shield className="w-5 h-5" />
          {success}
        </div>
      )}

      {/* Lägg till ny användare */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Plus className="w-5 h-5" />
          Lägg till ny användare
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-900 mb-2">
              E-postadress
            </label>
            <input
              type="email"
              value={newUserEmail}
              onChange={(e) => setNewUserEmail(e.target.value)}
              placeholder="anvandare@exempel.se"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E5A7D] text-gray-900"
              disabled={isSaving}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Roll
            </label>
            <select
              value={newUserRole}
              onChange={(e) => setNewUserRole(e.target.value as UserRole)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E5A7D] text-gray-900"
              disabled={isSaving}
            >
              <option value="coach">Coach</option>
              <option value="platschef">Platschef</option>
              <option value="admin">Administratör</option>
              <option value="superuser">Superuser</option>
            </select>
          </div>
        </div>

        <button
          onClick={handleAddUser}
          disabled={isSaving || !newUserEmail.trim()}
          className="mt-4 px-6 py-2 bg-[#1E5A7D] text-white rounded-lg hover:bg-[#164A6D] transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="w-4 h-4" />
          Lägg till användare
        </button>
      </div>

      {/* Användarlista */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <User className="w-5 h-5" />
            Användare ({users.length})
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  E-postadress
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Roll
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Åtgärder
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={user.email} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-gray-400" />
                      <span className="text-sm font-medium text-gray-900">{user.email}</span>
                      {user.email === currentUser?.email && (
                        <span className="text-xs text-gray-500 italic">(Du)</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <select
                      value={user.role}
                      onChange={(e) => handleRoleChange(user.email, e.target.value as UserRole)}
                      className={`px-3 py-1 rounded-full text-xs font-medium border ${getRoleColor(user.role)}`}
                      disabled={isSaving}
                    >
                      <option value="coach">Coach</option>
                      <option value="platschef">Platschef</option>
                      <option value="admin">Administratör</option>
                      <option value="superuser">Superuser</option>
                    </select>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/admin/anvandare/${encodeURIComponent(user.email)}`}
                        className="text-[#1E5A7D] hover:text-[#164A6D]"
                        title="Redigera användarinfo"
                      >
                        <Edit className="w-4 h-4" />
                      </Link>
                      <button
                        onClick={() => handleSaveUser(user.email)}
                        disabled={isSaving}
                        className="text-green-600 hover:text-green-800 disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Snabbspara roll"
                      >
                        <Save className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user.email)}
                        disabled={isSaving || user.email === currentUser?.email}
                        className="text-red-600 hover:text-red-800 disabled:opacity-50 disabled:cursor-not-allowed"
                        title={user.email === currentUser?.email ? 'Kan inte ta bort dig själv' : 'Ta bort användare'}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {users.length === 0 && (
          <div className="p-12 text-center text-gray-600">
            <User className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            Inga användare hittades
          </div>
        )}
      </div>

      {/* Info om rollbehörigheter */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-blue-900 mb-2">Rollbehörigheter</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li><strong className="text-red-700">Superuser:</strong> Full åtkomst till allt inkl. användarhantering</li>
          <li><strong className="text-orange-700">Administratör:</strong> Ekonomihantering, fakturering, personalekonomi</li>
          <li><strong className="text-yellow-700">Platschef:</strong> Statistik och översikt för sin ort</li>
          <li><strong className="text-green-700">Coach:</strong> Grundläggande åtkomst (kunder, egna timmar)</li>
        </ul>
      </div>
    </div>
  );
}

