'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser, getUserRoleSync } from '@/lib/auth';
import { getUserProfile, saveUserProfile } from '@/lib/userProfile';
import { UserProfile } from '@/types/userProfile';
import { getAllCoachesSync } from '@/lib/coachMapping';
import { subscribeToCoachProfiles } from '@/lib/realtimeDatabase';
import { Save, User, Mail, Phone, Shield, Users, ArrowRight } from 'lucide-react';

export default function ProfilPage() {
  const router = useRouter();
  const user = getCurrentUser();
  const userEmail = user?.email || '';
  const userRole = getUserRoleSync();
  
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [allCoaches, setAllCoaches] = useState<string[]>([]);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingCoachName, setPendingCoachName] = useState('');
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [formData, setFormData] = useState({
    displayName: '',
    phone: '',
    linkedCoach: '',
  });

  // Hämta alla coacher från Firebase coachProfiles
  useEffect(() => {
    // Ladda från cache först
    const cachedCoaches = getAllCoachesSync();
    if (cachedCoaches.length > 0) {
      setAllCoaches(cachedCoaches.sort());
    }

    // Prenumerera på uppdateringar från Firebase
    const unsubscribe = subscribeToCoachProfiles((profiles: Record<string, any>) => {
      const coachNames = Object.keys(profiles).sort();
      setAllCoaches(coachNames);
    });

    return () => unsubscribe();
  }, []);

  // Ladda profil
  useEffect(() => {
    const loadProfile = async () => {
      if (!userEmail) return;
      
      setIsLoading(true);
      try {
        const userProfile = await getUserProfile(userEmail);
        
        if (userProfile) {
          setProfile(userProfile);
          setFormData({
            displayName: userProfile.displayName || '',
            phone: userProfile.phone || '',
            linkedCoach: userProfile.linkedCoach || '',
          });
        } else {
          // Skapa default profil
          setFormData({
            displayName: userEmail.split('@')[0],
            phone: '',
            linkedCoach: '',
          });
        }
      } catch (error) {
        console.error('Error loading profile:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadProfile();
  }, [userEmail]);

  const handleSave = async () => {
    setSaveMessage(null);

    if (!userEmail || !formData.displayName.trim()) {
      setSaveMessage({ type: 'error', text: 'Vänligen fyll i ditt namn' });
      return;
    }

    // Kräv att coach är vald för nya användare (om de inte är admin/superuser)
    if (!profile?.linkedCoach && !formData.linkedCoach && userRole !== 'admin' && userRole !== 'superuser') {
      setSaveMessage({ type: 'error', text: 'Du måste välja vilken coach du är kopplad till innan du kan spara din profil.' });
      return;
    }

    // Om användaren väljer en coach för första gången, kräv bekräftelse
    const isFirstTimeChoosingCoach = !profile?.linkedCoach && formData.linkedCoach;
    const isChangingCoach = profile?.linkedCoach && formData.linkedCoach !== profile.linkedCoach;
    
    if (isFirstTimeChoosingCoach) {
      setPendingCoachName(formData.linkedCoach);
      setShowConfirmDialog(true);
      return;
    }
    
    if (isChangingCoach && userRole !== 'admin' && userRole !== 'superuser') {
      setSaveMessage({ type: 'error', text: 'Endast administratörer kan ändra coach-koppling efter att den är sparad.' });
      return;
    }

    // Spara profilen
    await performSave(!!isFirstTimeChoosingCoach);
  };

  const performSave = async (isFirstTimeChoosingCoach: boolean) => {
    setIsSaving(true);
    setSaveMessage(null);
    
    try {
      const profileToSave: UserProfile = {
        email: userEmail,
        displayName: formData.displayName.trim(),
        phone: formData.phone.trim() || undefined,
        linkedCoach: formData.linkedCoach || undefined,
        role: profile?.role,
        createdAt: profile?.createdAt || new Date(),
        updatedAt: new Date(),
      };

      await saveUserProfile(profileToSave);
      setProfile(profileToSave);
      
      // Om användaren valde coach för första gången, omdirigera till dashboard
      if (isFirstTimeChoosingCoach) {
        setSaveMessage({ type: 'success', text: 'Välkommen! Din profil är nu komplett. Du omdirigeras till startsidan.' });
        setTimeout(() => {
          router.push('/');
        }, 2000);
      } else {
        setSaveMessage({ type: 'success', text: 'Profil sparad!' });
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      setSaveMessage({ type: 'error', text: 'Kunde inte spara profil. Försök igen.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmCoach = async () => {
    setShowConfirmDialog(false);
    await performSave(true);
  };

  const handleCancelCoach = () => {
    setShowConfirmDialog(false);
    setPendingCoachName('');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Laddar profil...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Bekräftelsedialog för coach-val */}
      {showConfirmDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-start gap-4 mb-4">
              <div className="shrink-0 w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                <Users className="w-6 h-6 text-[#1E5A7D]" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Bekräfta din coach-koppling
                </h3>
                <p className="text-gray-700 mb-3">
                  Du håller på att koppla dig till <strong className="text-[#1E5A7D]">{pendingCoachName}</strong>.
                </p>
                <p className="text-sm text-gray-600">
                  Efter att du sparat kan endast administratörer ändra denna koppling. 
                  Se till att du väljer rätt coach innan du fortsätter.
                </p>
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={handleCancelCoach}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
              >
                Avbryt
              </button>
              <button
                onClick={handleConfirmCoach}
                className="px-4 py-2 bg-[#1E5A7D] text-white rounded-lg hover:bg-[#164A6D] transition"
              >
                Bekräfta och spara
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Meddelanden */}
      {saveMessage && (
        <div className={`rounded-lg p-4 ${
          saveMessage.type === 'success' ? 'bg-green-50 border border-green-200' :
          saveMessage.type === 'error' ? 'bg-red-50 border border-red-200' :
          'bg-blue-50 border border-blue-200'
        }`}>
          <p className={`text-sm ${
            saveMessage.type === 'success' ? 'text-green-800' :
            saveMessage.type === 'error' ? 'text-red-800' :
            'text-blue-800'
          }`}>
            {saveMessage.text}
          </p>
        </div>
      )}

      {/* Hjälpsam info om coach inte är vald */}
      {!profile?.linkedCoach && userRole !== 'admin' && userRole !== 'superuser' && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-5">
          <div className="flex items-start gap-3">
            <Users className="w-5 h-5 text-[#1E5A7D] mt-0.5 shrink-0" />
            <div>
              <h3 className="text-base font-semibold text-gray-900 mb-1">
                Välkommen! Välj din coach-koppling
              </h3>
              <p className="text-sm text-gray-700">
                För att komma igång behöver du välja vilken coach du är kopplad till. 
                Detta hjälper oss att koppla dina aktiviteter och rapporter till rätt person.
              </p>
            </div>
          </div>
        </div>
      )}

      <div>
        <h1 className="text-3xl font-bold text-gray-900">Min profil</h1>
        <p className="text-gray-600 mt-1">Hantera dina profiluppgifter</p>
      </div>

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
            <p className="mt-1 text-xs text-gray-500">
              Email kan inte ändras
            </p>
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
              placeholder="Ditt namn som visas i systemet"
              required
            />
            <p className="mt-1 text-xs text-gray-500">
              Detta namn kommer att visas när du skapar eller godkänner beställningar
            </p>
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
              Kopplad coach {!profile?.linkedCoach && userRole !== 'admin' && userRole !== 'superuser' && <span className="text-red-500">*</span>}
            </label>
            <select
              value={formData.linkedCoach}
              onChange={(e) => setFormData({ ...formData, linkedCoach: e.target.value })}
              disabled={!!(
                // Kan ändras av admin/superuser alltid, annars bara om inte redan satt
                profile?.linkedCoach && userRole !== 'admin' && userRole !== 'superuser'
              )}
              className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E5A7D] text-gray-900 ${
                profile?.linkedCoach && userRole !== 'admin' && userRole !== 'superuser' ? 'bg-gray-50 cursor-not-allowed' : ''
              }`}
            >
              <option value="">Ingen coach vald</option>
              {allCoaches.map((coach) => (
                <option key={coach} value={coach}>
                  {coach}
                </option>
              ))}
            </select>
            {profile?.linkedCoach && userRole !== 'admin' && userRole !== 'superuser' && (
              <p className="mt-1 text-xs text-gray-600">
                Din coach-koppling är sparad. Kontakta en administratör om du behöver ändra den.
              </p>
            )}
            {!profile?.linkedCoach && (
              <p className="mt-1 text-xs text-gray-600">
                Välj vilken coach du är kopplad till. Detta kan endast ändras av administratörer efter att du sparat.
              </p>
            )}
            {(userRole === 'admin' || userRole === 'superuser') && (
              <p className="mt-1 text-xs text-[#1E5A7D]">
                Som {userRole === 'superuser' ? 'superuser' : 'administratör'} kan du ändra coach-koppling
              </p>
            )}
          </div>

          {/* Role (read-only) */}
          {profile?.role && (
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                <Shield className="w-4 h-4 inline mr-2" />
                Roll i systemet
              </label>
              <input
                type="text"
                value={
                  profile.role === 'superuser' ? 'Superuser' :
                  profile.role === 'admin' ? 'Administratör' : 
                  profile.role === 'platschef' ? 'Platschef' : 
                  'Coach'
                }
                disabled
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 cursor-not-allowed"
              />
            </div>
          )}

          {/* Save button */}
          <div className="flex gap-3 pt-4 border-t">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-6 py-2 bg-[#1E5A7D] text-white rounded-lg hover:bg-[#164A6D] transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              {isSaving ? 'Sparar...' : 'Spara profil'}
            </button>

            {/* Visa coachkort endast om profilen redan är sparad med en coach */}
            {profile?.linkedCoach && (
              <button
                onClick={() => router.push(`/coacher/${encodeURIComponent(profile.linkedCoach!)}`)}
                className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition flex items-center gap-2"
              >
                Se mitt coachkort
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
          
          {/* Visa info om coach är vald men inte sparad */}
          {!profile?.linkedCoach && formData.linkedCoach && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-gray-700">
                💡 Spara din profil för att se ditt coachkort
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

