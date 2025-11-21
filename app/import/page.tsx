'use client';

import { useState } from 'react';
import Header from '@/components/Header';
import { importCustomersFromCSV, importCoachesFromCSV, importServicesFromCSV } from '@/lib/csvImporter';
import { Upload, FileText, CheckCircle, XCircle, Download } from 'lucide-react';
import { getUserRoleSync } from '@/lib/auth';

export default function ImportPage() {
  const userRole = getUserRoleSync();
  const [importType, setImportType] = useState<'customers' | 'coaches' | 'services'>('customers');
  const [csvText, setCsvText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ success: number; errors: string[] } | null>(null);

  // Only admin can access
  if (userRole !== 'admin') {
    return (
      <div>
        <Header title="Import" />
        <div className="p-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
            Du har inte behörighet att importera data. Endast administratörer kan göra detta.
          </div>
        </div>
      </div>
    );
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        setCsvText(text);
      };
      reader.readAsText(selectedFile);
    }
  };

  const handleImport = async () => {
    if (!csvText.trim()) {
      alert('Vänligen välj en CSV-fil eller klistra in CSV-data');
      return;
    }

    setImporting(true);
    setResult(null);

    try {
      let importResult;
      switch (importType) {
        case 'customers':
          importResult = await importCustomersFromCSV(csvText);
          break;
        case 'coaches':
          importResult = await importCoachesFromCSV(csvText);
          break;
        case 'services':
          importResult = await importServicesFromCSV(csvText);
          break;
      }

      setResult(importResult);
      
      if (importResult.success > 0) {
        // Clear form on success
        setTimeout(() => {
          setCsvText('');
          setFile(null);
        }, 3000);
      }
    } catch (error: any) {
      setResult({
        success: 0,
        errors: [`Fel vid import: ${error.message}`],
      });
    } finally {
      setImporting(false);
    }
  };

  const downloadTemplate = () => {
    let templateContent = '';
    let filename = '';

    switch (importType) {
      case 'customers':
        filename = 'customers-template.csv';
        templateContent = `name,email,phone,date,place,coach,service,status,price,sport
Anna Larsson,anna.larsson@example.com,0701234567,2024-10-15,Stockholm,Erik Helsing,Membership Standard,Aktiv,1195,Löpning
Marcus Berg,marcus.berg@example.com,0702345678,2024-09-20,Stockholm,Erik Helsing,Membership Premium,Aktiv,2195,Cykel`;
        break;
      case 'coaches':
        filename = 'coaches-template.csv';
        templateContent = `name,hourlyRate,isSeniorCoach,mainPlace,secondaryPlace,email,phone,address,bankAccount,swishNumber
Erik Helsing,375,false,Stockholm,,erik.helsing@aktivitus.se,0701234567,Stockholmsgatan 1,1234-56-78901,0701234567
Anders Carbonnier,400,true,Stockholm,Falun,anders.carbonnier@aktivitus.se,0702345678,Stockholmsgatan 2,1234-56-78902,0702345678`;
        break;
      case 'services':
        filename = 'services-template.csv';
        templateContent = `service,basePrice,category,description
Membership Standard,1195,membership,Standard medlemskap med grundläggande tester
Membership Premium,2195,membership,Premium medlemskap med utökade tester
Tröskeltest,1890,test,Grundläggande tröskeltest`;
        break;
    }

    const blob = new Blob([templateContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
  };

  return (
    <div>
      <Header title="Import Data" />
      <div className="p-6 max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Importera data från CSV</h2>

          {/* Import Type Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Välj typ av data att importera
            </label>
            <div className="flex gap-4">
              <button
                onClick={() => setImportType('customers')}
                className={`px-4 py-2 rounded-lg font-medium ${
                  importType === 'customers'
                    ? 'bg-[#1E5A7D] text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Kunder
              </button>
              <button
                onClick={() => setImportType('coaches')}
                className={`px-4 py-2 rounded-lg font-medium ${
                  importType === 'coaches'
                    ? 'bg-[#1E5A7D] text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Coacher
              </button>
              <button
                onClick={() => setImportType('services')}
                className={`px-4 py-2 rounded-lg font-medium ${
                  importType === 'services'
                    ? 'bg-[#1E5A7D] text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Tjänster/Priser
              </button>
            </div>
          </div>

          {/* Download Template */}
          <div className="mb-6">
            <button
              onClick={downloadTemplate}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
            >
              <Download className="w-4 h-4" />
              Ladda ner CSV-mall
            </button>
          </div>

          {/* File Upload */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Välj CSV-fil eller klistra in CSV-data
            </label>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              className="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#1E5A7D]"
            />
          </div>

          {/* CSV Text Area */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-900 mb-2">
              CSV-data
            </label>
            <textarea
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              rows={10}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E5A7D] text-gray-900 font-mono text-sm"
              placeholder="Klistra in CSV-data här eller välj en fil ovan..."
            />
          </div>

          {/* Import Button */}
          <button
            onClick={handleImport}
            disabled={importing || !csvText.trim()}
            className="w-full px-6 py-3 bg-[#1E5A7D] text-white rounded-lg font-medium hover:bg-[#164a66] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {importing ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Importerar...
              </>
            ) : (
              <>
                <Upload className="w-5 h-5" />
                Importera till Firebase
              </>
            )}
          </button>

          {/* Results */}
          {result && (
            <div className={`mt-6 p-4 rounded-lg ${
              result.errors.length === 0
                ? 'bg-green-50 border border-green-200'
                : result.success > 0
                ? 'bg-yellow-50 border border-yellow-200'
                : 'bg-red-50 border border-red-200'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                {result.errors.length === 0 ? (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                ) : (
                  <XCircle className="w-5 h-5 text-yellow-600" />
                )}
                <h3 className="font-medium text-gray-900">
                  {result.success} rader importerades framgångsrikt
                </h3>
              </div>
              {result.errors.length > 0 && (
                <div className="mt-2">
                  <p className="text-sm font-medium text-gray-900 mb-1">Fel ({result.errors.length}):</p>
                  <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                    {result.errors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Instructions */}
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-2">Instruktioner:</h3>
            <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
              <li>Ladda ner CSV-mallen för att se rätt format</li>
              <li>Första raden måste innehålla kolumnrubriker</li>
              <li>Datum ska vara i formatet YYYY-MM-DD</li>
              <li>För kunder: name, email, date, place, coach, service, status, price, sport är obligatoriska</li>
              <li>För coacher: name är obligatoriskt</li>
              <li>För tjänster: service och basePrice är obligatoriska</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

