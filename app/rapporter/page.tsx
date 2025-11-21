'use client';

import { useState, useEffect, useMemo } from 'react';
import Header from '@/components/Header';
import { FileText, Download, Calendar, X, MapPin } from 'lucide-react';
import { useCustomers } from '@/lib/CustomerContext';
import { PLACES } from '@/lib/constants';
import { Place } from '@/types';
import {
  generateMonthlyReport,
  generateQuarterlyReport,
  generateYearlyReport,
  generateCustomReport,
  exportReportToCSV,
  calculateReportSize,
  Report,
  ReportType,
} from '@/lib/reportGenerator';
import { logReportGenerate, logExportData } from '@/lib/activityLogger';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';

export default function RapporterPage() {
  const { customers } = useCustomers();
  const [reports, setReports] = useState<Report[]>(() => {
    if (typeof window === 'undefined') return [];
    const stored = localStorage.getItem('savedReports');
    return stored ? JSON.parse(stored).map((r: any) => ({
      ...r,
      createdAt: new Date(r.createdAt),
    })) : [];
  });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [reportType, setReportType] = useState<ReportType>('Månadsrapport');
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedQuarter, setSelectedQuarter] = useState<number>(Math.floor((new Date().getMonth() + 1) / 3) + 1);
  const [customStartDate, setCustomStartDate] = useState<string>(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
  );
  const [customEndDate, setCustomEndDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [selectedPlaces, setSelectedPlaces] = useState<Place[]>([]);

  // Spara rapporter till localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('savedReports', JSON.stringify(reports));
    }
  }, [reports]);

  const handleCreateReport = () => {
    let reportData: any;
    let reportName: string;
    let reportDate: string;

    const places = selectedPlaces.length > 0 ? selectedPlaces : undefined;

    switch (reportType) {
      case 'Månadsrapport':
        reportData = generateMonthlyReport(customers, selectedYear, selectedMonth, places);
        reportName = `Månadsrapport ${format(new Date(selectedYear, selectedMonth - 1, 1), 'MMMM yyyy', { locale: sv })}`;
        reportDate = format(new Date(selectedYear, selectedMonth - 1, 1), 'yyyy-MM-dd');
        break;
      case 'Kvartalsrapport':
        reportData = generateQuarterlyReport(customers, selectedYear, selectedQuarter, places);
        reportName = `Kvartalsrapport Q${selectedQuarter} ${selectedYear}`;
        reportDate = format(new Date(selectedYear, (selectedQuarter - 1) * 3, 1), 'yyyy-MM-dd');
        break;
      case 'Årsrapport':
        reportData = generateYearlyReport(customers, selectedYear, places);
        reportName = `Årsrapport ${selectedYear}`;
        reportDate = format(new Date(selectedYear, 0, 1), 'yyyy-MM-dd');
        break;
      case 'Anpassad':
        reportData = generateCustomReport(
          customers,
          new Date(customStartDate),
          new Date(customEndDate),
          places
        );
        reportName = `Anpassad rapport ${customStartDate} - ${customEndDate}`;
        reportDate = customEndDate;
        break;
      default:
        return;
    }

    const newReport: Report = {
      id: `report_${Date.now()}`,
      name: reportName,
      date: reportDate,
      type: reportType,
      size: calculateReportSize(reportData),
      startDate: reportData.startDate,
      endDate: reportData.endDate,
      data: reportData,
      createdAt: new Date(),
    };

    setReports([newReport, ...reports]);
    setShowCreateModal(false);
    
    // Logga rapportgenerering
    logReportGenerate(reportName, reportType);
    
    // Rensa formulär
    setSelectedPlaces([]);
  };

  const handleDownloadReport = (report: Report) => {
    exportReportToCSV(report.data, report.name);
    logExportData(`Rapport: ${report.name}`);
  };

  const handleDeleteReport = (reportId: string) => {
    setReports(reports.filter(r => r.id !== reportId));
  };

  // Sortera rapporter (nyaste först)
  const sortedReports = useMemo(() => {
    return [...reports].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }, [reports]);

  return (
    <div>
      <Header
        title="Rapporter"
        subtitle="Generera och ladda ner rapporter"
      />

      <div className="mb-6">
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-6 py-3 bg-[#1E5A7D] text-white rounded-lg hover:bg-[#0C3B5C] transition font-medium shadow-sm"
        >
          <Calendar className="w-5 h-5" />
          Skapa ny rapport
        </button>
      </div>

      {/* Skapa rapport modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">Skapa ny rapport</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-600 transition"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Rapporttyp */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Rapporttyp
                </label>
                <select
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value as ReportType)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E5A7D] text-gray-900"
                >
                  <option value="Månadsrapport">Månadsrapport</option>
                  <option value="Kvartalsrapport">Kvartalsrapport</option>
                  <option value="Årsrapport">Årsrapport</option>
                  <option value="Anpassad">Anpassad</option>
                </select>
              </div>

              {/* Månadsrapport */}
              {reportType === 'Månadsrapport' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      År
                    </label>
                    <input
                      type="number"
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                      min="2020"
                      max={new Date().getFullYear()}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E5A7D] text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      Månad
                    </label>
                    <select
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E5A7D] text-gray-900"
                    >
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                        <option key={month} value={month}>
                          {format(new Date(selectedYear, month - 1, 1), 'MMMM', { locale: sv })}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Kvartalsrapport */}
              {reportType === 'Kvartalsrapport' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      År
                    </label>
                    <input
                      type="number"
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                      min="2020"
                      max={new Date().getFullYear()}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E5A7D] text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      Kvartal
                    </label>
                    <select
                      value={selectedQuarter}
                      onChange={(e) => setSelectedQuarter(parseInt(e.target.value))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E5A7D] text-gray-900"
                    >
                      <option value={1}>Q1 (Jan-Mar)</option>
                      <option value={2}>Q2 (Apr-Jun)</option>
                      <option value={3}>Q3 (Jul-Sep)</option>
                      <option value={4}>Q4 (Okt-Dec)</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Årsrapport */}
              {reportType === 'Årsrapport' && (
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    År
                  </label>
                  <input
                    type="number"
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                    min="2020"
                    max={new Date().getFullYear()}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E5A7D] text-gray-900"
                  />
                </div>
              )}

              {/* Anpassad rapport */}
              {reportType === 'Anpassad' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      Från datum
                    </label>
                    <input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E5A7D] text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      Till datum
                    </label>
                    <input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E5A7D] text-gray-900"
                    />
                  </div>
                </div>
              )}

              {/* Ort-filter */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  <MapPin className="w-4 h-4 inline mr-1" />
                  Filtrera på stad/ort (valfritt)
                </label>
                <div className="flex flex-wrap gap-2">
                  {PLACES.map((place) => (
                    <button
                      key={place}
                      onClick={() => {
                        if (selectedPlaces.includes(place)) {
                          setSelectedPlaces(selectedPlaces.filter(p => p !== place));
                        } else {
                          setSelectedPlaces([...selectedPlaces, place]);
                        }
                      }}
                      className={`px-3 py-1 rounded-lg text-sm font-medium transition ${
                        selectedPlaces.includes(place)
                          ? 'bg-[#1E5A7D] text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {place}
                    </button>
                  ))}
                  {selectedPlaces.length > 0 && (
                    <button
                      onClick={() => setSelectedPlaces([])}
                      className="px-3 py-1 rounded-lg text-sm font-medium bg-gray-200 text-gray-700 hover:bg-gray-300 transition"
                    >
                      Rensa
                    </button>
                  )}
                </div>
              </div>

              {/* Knappar */}
              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={handleCreateReport}
                  className="flex-1 px-4 py-2 bg-[#1E5A7D] text-white rounded-lg hover:bg-[#0C3B5C] transition font-medium"
                >
                  Generera rapport
                </button>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition text-gray-700 font-medium"
                >
                  Avbryt
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tillgängliga rapporter */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Tillgängliga rapporter {reports.length > 0 && <span className="text-gray-500 font-normal">({reports.length})</span>}
          </h3>
        </div>

        <div className="divide-y divide-gray-200">
          {sortedReports.length === 0 ? (
            <div className="p-12 text-center">
              <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg font-medium">Inga rapporter skapade ännu</p>
              <p className="text-gray-400 text-sm mt-2">Klicka på "Skapa ny rapport" för att generera din första rapport</p>
            </div>
          ) : (
            sortedReports.map((report) => (
              <div key={report.id} className="p-6 hover:bg-gray-50 transition">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="bg-blue-100 rounded-lg p-3">
                      <FileText className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{report.name}</h4>
                      <p className="text-sm text-gray-600 mt-1">
                        {report.type} • {format(new Date(report.date), 'yyyy-MM-dd')} • {report.size}
                        {report.startDate && report.endDate && report.startDate !== report.endDate && (
                          <span> • {format(new Date(report.startDate), 'yyyy-MM-dd')} - {format(new Date(report.endDate), 'yyyy-MM-dd')}</span>
                        )}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Skapad: {format(report.createdAt, 'yyyy-MM-dd HH:mm')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleDownloadReport(report)}
                      className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition text-gray-700"
                    >
                      <Download className="w-5 h-5" />
                      Ladda ner
                    </button>
                    <button
                      onClick={() => handleDeleteReport(report.id)}
                      className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                      title="Ta bort rapport"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}


