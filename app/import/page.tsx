'use client';

import { useState } from 'react';
import Header from '@/components/Header';
import { importCustomersFromCSV, importCoachesFromCSV, importServicesFromCSV } from '@/lib/csvImporter';
import { seedAllToFirebase, seedCoachesToFirebase, seedServicesToFirebase } from '@/lib/seedFirebase';
import { seedDatabase } from '@/lib/seedData';
import { Upload, FileText, CheckCircle, XCircle, Download, Zap, Users } from 'lucide-react';
import { getUserRoleSync } from '@/lib/auth';

export default function ImportPage() {
  const userRole = getUserRoleSync();
  const [importType, setImportType] = useState<'customers' | 'coaches' | 'services'>('customers');
  const [csvText, setCsvText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [seedingCustomers, setSeedingCustomers] = useState(false);
  const [result, setResult] = useState<{ success: number; errors: string[] } | null>(null);
  const [seedResult, setSeedResult] = useState<{ coaches: { success: number; errors: string[] }; services: { success: number; errors: string[] } } | null>(null);
  const [customerSeedResult, setCustomerSeedResult] = useState<{ success: number; errors: number; total: number } | null>(null);

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
    let filename = '';
    let templateContent = '';

    switch (importType) {
      case 'customers':
        filename = 'customers-template.csv';
        templateContent = `name,email,phone,date,place,coach,service,status,price,sport
Anna Larsson,anna.larsson@example.com,0701234567,2024-10-15,Stockholm,Erik Helsing,Membership Standard,Aktiv,1195,Löpning
Marcus Berg,marcus.berg@example.com,0702345678,2024-09-20,Stockholm,Erik Helsing,Membership Premium,Aktiv,2195,Cykel`;
        break;
      case 'coaches':
        filename = 'coaches.csv';
        templateContent = `name,hourlyRate,isSeniorCoach,mainPlace,secondaryPlace,email,phone,address,bankAccount,bankName,clearingNumber,accountNumber,swishNumber,personalNumber,taxTable,notes
Anders Carbonnier,375,false,Stockholm,Falun,,,,,,,,,
Jeff Frydenlund,375,false,Stockholm,,,,,,,,,,
Jimmy Carlsson,375,false,Stockholm,Linköping,,,,,,,,,,
Kenny Steger,375,false,Stockholm,,,,,,,,,,
Micke Hanell,375,false,Stockholm,Göteborg,,,,,,,,,,
Gusten Nilber,375,false,Göteborg,,,,,,,,,,
Andreas Thell,375,false,Malmö,,,,,,,,,,
Evelina Asplund,375,false,Malmö,Göteborg,,,,,,,,,,
Isabella Hedberg,375,false,Stockholm,,,,,,,,,,
Jessica Unogård,375,false,Linköping,,,,,,,,,,
Andreas Nilsson,375,false,Linköping,Stockholm,,,,,,,,,,
Johan Hasselmark,375,false,Göteborg,Malmö,,,,,,,,,,
Evelina Järvinen,375,false,Stockholm,,,,,,,,,,
Erik Olsson,375,false,Göteborg,,,,,,,,,,
Gabriel Sandör,375,false,Malmö,,,,,,,,,,
Jenny Nae,375,false,Stockholm,Åre,,,,,,,,,,
Johan Nielsen,375,false,Falun,,,,,,,,,,
Linda Linhart,375,false,Stockholm,,,,,,,,,,
Linda Sjölund,375,false,Göteborg,,,,,,,,,,
Morgan Björkqvist,375,false,Malmö,,,,,,,,,,
Mattias Lundqvist,375,false,Stockholm,,,,,,,,,,
Marika Wagner,375,false,Göteborg,,,,,,,,,,
Maria Wahlberg,375,false,Malmö,,,,,,,,,,
Olle Bengtström,375,false,Linköping,,,,,,,,,,
Oliver Lindblom,375,false,Stockholm,Falun,,,,,,,,,,
Sofie Bondesson,375,false,Göteborg,,,,,,,,,,
Tove Larsson,375,false,Malmö,,,,,,,,,,
Selma Jormin,375,false,Stockholm,,,,,,,,,,
Arkatix Adgren,375,false,Göteborg,Malmö,,,,,,,,,,
Laurens Hoffer,375,false,Stockholm,,,,,,,,,,
Amy Whyte,375,false,Malmö,,,,,,,,,,
Natalie Persson,375,false,Göteborg,,,,,,,,,,
Mattias Pers,375,false,Stockholm,,,,,,,,,,
Jennifer,375,false,Linköping,,,,,,,,,,`;
        break;
      case 'services':
        filename = 'services.csv';
        templateContent = `service,basePrice,category,description
Membership Standard,1195,membership,Standard medlemskap med grundläggande tester
Membership Standard TRI/OCR/MULTI,1295,membership,Standard medlemskap för triathlon/OCR/multisport
Programskrivning Membership Standard,1495,membership,Standard medlemskap med programskrivning
Membership Premium,2195,membership,Premium medlemskap med utökade tester
Membership Premium TRI/OCR/MULTI,2295,membership,Premium medlemskap för triathlon/OCR/multisport
Membership Supreme,3295,membership,Supreme medlemskap med alla tester
Membership Supreme TRI/OCR/MULTI,3395,membership,Supreme medlemskap för triathlon/OCR/multisport
Membership Life,333,membership,Livslångt medlemskap
Membership Aktivitus Iform 4 mån,1998,membership,Iform medlemskap 4 månader
Membership Aktivitus Iform Tillägg till MS 4 mån,1748,membership,Iform tillägg till Membership Standard 4 månader
Membership Iform Extra månad,499,membership,Iform extra månad
Membership Aktivitus Iform Fortsättning,990,membership,Iform fortsättning
Membership BAS,995,membership,BAS medlemskap
Membership Avslut NOTERA SLUTDATUM,0,membership,Medlemskap avslut - notera slutdatum
Save - Samtal - Standard,0,membership,Save samtal standard
Membership Utan tester,1595,membership,Medlemskap utan tester
Membership Uppstart Coaching -  Test redan gjort och betalt,1795,membership,Uppstart coaching med test redan gjort
Konvertering från test till membership - Till kollega,0,membership,Konvertering från test till membership
Iform innan prisjusteringen - Sista testmomenten 2,5 h,1998,membership,Iform innan prisjustering
Iform uppstart/återtest/coachtimme MS utförd av någon annan - Minus 1 h tid,0,membership,Iform uppstart utförd av annan
Iform uppstart/återtest/coachtimme MS utförd till någon annan - Plus 1 h tid,0,membership,Iform uppstart utförd till annan
Tröskeltest,1890,test,Grundläggande tröskeltest
Tröskeltest + VO2max,2490,test,Tröskeltest med VO2max
Tröskeltest Triathlon,2690,test,Tröskeltest för triathlon
Tröskeltest Triathlon + VO2max,3290,test,Tröskeltest triathlon med VO2max
VO2max fristående,1390,test,VO2max test fristående
VO2max tillägg,600,test,VO2max tillägg till tröskeltest
Wingate fristående,490,test,Wingate test fristående
Wingatetest tillägg,350,test,Wingate tillägg
Styrketest tillägg,600,test,Styrketest tillägg
Teknikanalys tillägg,650,test,Teknikanalys tillägg
Teknikanalys,1290,test,Teknikanalys fristående
Funktionsanalys,1790,test,Funktionsanalys
Funktions- och löpteknikanalys,2290,test,Funktions- och löpteknikanalys
Hälsopaket,1990,test,Hälsopaket
Sommardubbel,2990,test,Sommardubbel testpaket
Sommardubbel Tri,4490,test,Sommardubbel triathlon
Träningsprogram Sommardubbel 1500kr,1500,test,Träningsprogram sommartest
Personlig Träning 1 - Betald yta,1190,training,Personlig träning 1 pass betald yta
Personlig Träning 1 - Gratis yta,1190,training,Personlig träning 1 pass gratis yta
Personlig Träning 5,5500,training,Personlig träning 5 pass
Personlig Träning 10,10500,training,Personlig träning 10 pass
Personlig Träning 20,19900,training,Personlig träning 20 pass
PT-Klipp - Betald yta,1190,training,PT-klipp betald yta
PT-Klipp - Gratis yta,1190,training,PT-klipp gratis yta
Konvertering från test till PT20 - Till kollega,0,training,Konvertering från test till PT20
Sen avbokning,500,other,Sen avbokning avgift
Kroppss fett% tillägg,450,test,Kroppsfettprocent tillägg
Kroppss fett% fristående,690,test,Kroppsfettprocent fristående
Blodanalys,690,test,Blodanalys
Hb endast,200,test,Hemoglobin endast
Glucos endast,150,test,Glukos endast
Blodfetter,400,test,Blodfetter
Kostregistrering,3990,other,Kostregistrering
Kostrådgivning,1250,other,Kostrådgivning
Natriumanalys (Svettest),1690,test,Natriumanalys svettest
Genomgång eller testdel utförd av någon annan - Minus 30 min tid,0,other,Genomgång utförd av annan
Genomgång eller testdel utförd till någon annan - Plus 30 min tid,0,other,Genomgång utförd till annan`;
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

          {/* Quick Seed Buttons */}
          <div className="mb-6 space-y-4">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="font-medium text-gray-900 mb-2">Snabb seedning</h3>
              <p className="text-sm text-gray-700 mb-3">
                Ladda automatiskt upp alla coacher och tjänster till Firebase direkt från koden (ingen CSV behövs).
              </p>
              <button
                onClick={async () => {
                  if (!confirm('Detta kommer att ladda upp alla coacher och tjänster till Firebase. Fortsätt?')) return;
                  
                  setSeeding(true);
                  setSeedResult(null);
                  
                  try {
                    const result = await seedAllToFirebase();
                    setSeedResult(result);
                    
                    if (result.coaches.errors.length === 0 && result.services.errors.length === 0) {
                      alert(`✅ Klar! ${result.coaches.success} coacher och ${result.services.success} tjänster har laddats upp till Firebase.`);
                    } else {
                      alert(`Delvis klar: ${result.coaches.success} coacher och ${result.services.success} tjänster sparade. Kontrollera felmeddelanden nedan.`);
                    }
                  } catch (error: any) {
                    alert(`Fel vid seedning: ${error.message}`);
                  } finally {
                    setSeeding(false);
                  }
                }}
                disabled={seeding}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {seeding ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Seedar...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    Seed coacher och tjänster till Firebase
                  </>
                )}
              </button>
            </div>

            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <h3 className="font-medium text-gray-900 mb-2">Generera mockkunder</h3>
              <p className="text-sm text-gray-700 mb-3">
                Generera och ladda upp ca 200 mockkunder med olika memberships, tester och historik till Firebase.
              </p>
              <button
                onClick={async () => {
                  const count = prompt('Hur många kunder vill du generera? (Standard: 200)', '200');
                  const numCount = count ? parseInt(count, 10) : 200;
                  
                  if (isNaN(numCount) || numCount < 1) {
                    alert('Ogiltigt antal. Använd ett positivt heltal.');
                    return;
                  }
                  
                  if (!confirm(`Detta kommer att generera och ladda upp ${numCount} mockkunder till Firebase. Detta kan ta en stund. Fortsätt?`)) return;
                  
                  setSeedingCustomers(true);
                  setCustomerSeedResult(null);
                  
                  try {
                    const result = await seedDatabase(numCount);
                    setCustomerSeedResult(result);
                    
                    if (result.errors === 0) {
                      alert(`✅ Klar! ${result.success} kunder har genererats och laddats upp till Firebase.`);
                    } else {
                      alert(`Delvis klar: ${result.success} kunder sparade, ${result.errors} fel. Kontrollera felmeddelanden nedan.`);
                    }
                  } catch (error: any) {
                    alert(`Fel vid seedning: ${error.message}`);
                  } finally {
                    setSeedingCustomers(false);
                  }
                }}
                disabled={seedingCustomers}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {seedingCustomers ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Genererar och importerar...
                  </>
                ) : (
                  <>
                    <Users className="w-4 h-4" />
                    Generera och seeda mockkunder till Firebase
                  </>
                )}
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

          {/* Seed Results */}
          {seedResult && (
            <div className={`mt-6 p-4 rounded-lg ${
              seedResult.coaches.errors.length === 0 && seedResult.services.errors.length === 0
                ? 'bg-green-50 border border-green-200'
                : seedResult.coaches.success > 0 || seedResult.services.success > 0
                ? 'bg-yellow-50 border border-yellow-200'
                : 'bg-red-50 border border-red-200'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                {seedResult.coaches.errors.length === 0 && seedResult.services.errors.length === 0 ? (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                ) : (
                  <XCircle className="w-5 h-5 text-yellow-600" />
                )}
                <h3 className="font-medium text-gray-900">
                  Seedning klar: {seedResult.coaches.success} coacher, {seedResult.services.success} tjänster
                </h3>
              </div>
              {(seedResult.coaches.errors.length > 0 || seedResult.services.errors.length > 0) && (
                <div className="mt-2">
                  <p className="text-sm font-medium text-gray-900 mb-1">Fel:</p>
                  <ul className="list-disc list-inside text-sm text-gray-700 space-y-1 max-h-40 overflow-y-auto">
                    {seedResult.coaches.errors.map((error, index) => (
                      <li key={`coach-${index}`}>{error}</li>
                    ))}
                    {seedResult.services.errors.map((error, index) => (
                      <li key={`service-${index}`}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Customer Seed Results */}
          {customerSeedResult && (
            <div className={`mt-6 p-4 rounded-lg ${
              customerSeedResult.errors === 0
                ? 'bg-green-50 border border-green-200'
                : customerSeedResult.success > 0
                ? 'bg-yellow-50 border border-yellow-200'
                : 'bg-red-50 border border-red-200'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                {customerSeedResult.errors === 0 ? (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                ) : (
                  <XCircle className="w-5 h-5 text-yellow-600" />
                )}
                <h3 className="font-medium text-gray-900">
                  Mockkunder seedade: {customerSeedResult.success} av {customerSeedResult.total} kunder
                  {customerSeedResult.errors > 0 && ` (${customerSeedResult.errors} fel)`}
                </h3>
              </div>
            </div>
          )}

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

