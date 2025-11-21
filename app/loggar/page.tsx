'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';
import { getActivityLogs, ActivityLog, ActivityType } from '@/lib/activityLogger';
import { logPageView } from '@/lib/activityLogger';
import { Search, Filter, Download } from 'lucide-react';

export default function LoggarPage() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<ActivityLog[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('Alla');
  
  useEffect(() => {
    logPageView('Loggar');
    const activityLogs = getActivityLogs();
    setLogs(activityLogs);
    setFilteredLogs(activityLogs);
  }, []);
  
  useEffect(() => {
    let filtered = logs;
    
    // Filtrera på sökterm
    if (searchTerm) {
      filtered = filtered.filter(log =>
        log.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.userEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.details?.customerName?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Filtrera på typ
    if (selectedType !== 'Alla') {
      filtered = filtered.filter(log => log.activityType === selectedType);
    }
    
    setFilteredLogs(filtered);
  }, [searchTerm, selectedType, logs]);

  const getActionColor = (type: ActivityType) => {
    switch (type) {
      case 'customer_create':
        return 'bg-green-100 text-green-800';
      case 'customer_update':
      case 'invoice_update':
      case 'payment_status_update':
        return 'bg-blue-100 text-blue-800';
      case 'customer_delete':
        return 'bg-red-100 text-red-800';
      case 'page_view':
        return 'bg-purple-100 text-purple-800';
      case 'customer_view':
        return 'bg-indigo-100 text-indigo-800';
      case 'report_generate':
        return 'bg-yellow-100 text-yellow-800';
      case 'export_data':
        return 'bg-cyan-100 text-cyan-800';
      case 'login':
        return 'bg-emerald-100 text-emerald-800';
      case 'logout':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  const getActivityTypeLabel = (type: ActivityType): string => {
    const labels: Record<ActivityType, string> = {
      'page_view': 'Sidvisning',
      'customer_view': 'Visade kund',
      'customer_create': 'Skapade kund',
      'customer_update': 'Uppdaterade kund',
      'customer_delete': 'Tog bort kund',
      'invoice_update': 'Uppdaterade fakturering',
      'payment_status_update': 'Ändrade utbetalningsstatus',
      'report_generate': 'Genererade rapport',
      'export_data': 'Exporterade data',
      'settings_change': 'Ändrade inställningar',
      'login': 'Loggade in',
      'logout': 'Loggade ut',
    };
    return labels[type] || type;
  };
  
  const exportLogs = () => {
    const csvData = filteredLogs.map(log => ({
      Tidpunkt: format(log.timestamp, 'yyyy-MM-dd HH:mm:ss', { locale: sv }),
      Typ: getActivityTypeLabel(log.activityType),
      Beskrivning: log.description,
      Användare: log.userEmail,
      Roll: log.userRole,
      Kund: log.details?.customerName || '-',
      Detaljer: JSON.stringify(log.details || {}),
    }));
    
    const headers = Object.keys(csvData[0]).join(',');
    const rows = csvData.map(row => Object.values(row).map(v => `"${v}"`).join(',')).join('\n');
    const csv = `${headers}\n${rows}`;
    
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `aktivitetsloggar_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
  };

  return (
    <div>
      <Header
        title="Aktivitetsloggar"
        subtitle="Spåra alla ändringar i systemet"
      />

      {/* Filter och sök */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Sök i loggar..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E5A7D] text-gray-900"
          />
        </div>
        
        <div className="flex gap-3">
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E5A7D] text-gray-900"
          >
            <option value="Alla">Alla typer</option>
            <option value="page_view">Sidvisningar</option>
            <option value="customer_view">Visade kund</option>
            <option value="customer_create">Skapade kund</option>
            <option value="customer_update">Uppdaterade kund</option>
            <option value="customer_delete">Tog bort kund</option>
            <option value="invoice_update">Uppdaterade fakturering</option>
            <option value="payment_status_update">Ändrade utbetalningsstatus</option>
            <option value="report_generate">Genererade rapport</option>
            <option value="export_data">Exporterade data</option>
            <option value="login">Inloggningar</option>
            <option value="logout">Utloggningar</option>
          </select>
          
          <button
            onClick={exportLogs}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition text-gray-700"
          >
            <Download className="w-5 h-5" />
            Exportera
          </button>
        </div>
      </div>

      {/* Resultaträknare */}
      <div className="mb-4">
        <p className="text-sm text-gray-600">
          Visar <span className="font-semibold text-gray-900">{filteredLogs.length}</span> av{' '}
          <span className="font-semibold text-gray-900">{logs.length}</span> loggar
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Tidpunkt
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Typ
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Beskrivning
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Användare
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Roll
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Kund
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    Inga loggar hittades
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {format(log.timestamp, 'd MMM yyyy, HH:mm:ss', { locale: sv })}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getActionColor(
                          log.activityType
                        )}`}
                      >
                        {getActivityTypeLabel(log.activityType)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{log.description}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{log.userEmail}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600 capitalize">{log.userRole}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600">
                        {log.details?.customerName || '-'}
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

