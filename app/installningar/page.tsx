'use client';

import Header from '@/components/Header';
import { Save } from 'lucide-react';

export default function InstallningarPage() {
  return (
    <div>
      <Header
        title="Inställningar"
        subtitle="Konfigurera systemet"
      />

      <div className="max-w-4xl">
        <div className="bg-white rounded-xl shadow-sm p-8 border border-gray-100 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Allmänna inställningar
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Företagsnamn
              </label>
              <input
                type="text"
                defaultValue="Aktivitus AB"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                E-postadress
              </label>
              <input
                type="email"
                defaultValue="admin@aktivitus.se"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Telefonnummer
              </label>
              <input
                type="tel"
                defaultValue="+46 70 123 45 67"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-8 border border-gray-100 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Notifieringar
          </h3>
          <div className="space-y-3">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                defaultChecked
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-900">E-post vid ny kund</span>
            </label>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                defaultChecked
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-900">E-post vid uppdatering</span>
            </label>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-900">Daglig sammanfattning</span>
            </label>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-8 border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Standardvärden
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Standardplats
              </label>
              <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900">
                <option>Stockholm</option>
                <option>Göteborg</option>
                <option>Malmö</option>
                <option>Uppsala</option>
                <option>Örebro</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Standardstatus för nya kunder
              </label>
              <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900">
                <option>Aktiv</option>
                <option>Inaktiv</option>
                <option>Pausad</option>
              </select>
            </div>
          </div>
        </div>

        <div className="mt-6">
          <button className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium">
            <Save className="w-5 h-5" />
            Spara inställningar
          </button>
        </div>
      </div>
    </div>
  );
}

