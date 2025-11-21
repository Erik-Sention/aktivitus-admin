'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import { useCustomers } from '@/lib/CustomerContext';
import { Customer } from '@/types';
import { isMembershipService, INVOICE_STATUSES } from '@/lib/constants';
import { InvoiceStatus } from '@/types';
import { format, isAfter, isBefore, addMonths } from 'date-fns';
import { sv } from 'date-fns/locale';
import { Download, CheckCircle, AlertCircle, Clock, Filter, Bell, XCircle, FileText, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

export default function InvoicingPage() {
  const { customers, updateCustomer } = useCustomers();
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('Alla');
  const [selectedStatus, setSelectedStatus] = useState<string>('Alla');
  const [selectedPlace, setSelectedPlace] = useState<string>('Alla');

  // Automatisk uppdatering av förfallna fakturor
  useEffect(() => {
    const today = new Date();
    let hasUpdates = false;

    customers.forEach((customer) => {
      if (!customer.serviceHistory) return;

      const updatedHistory = customer.serviceHistory.map((service) => {
        if (
          service.status === 'Aktiv' &&
          isMembershipService(service.service) &&
          service.nextInvoiceDate &&
          isBefore(new Date(service.nextInvoiceDate), today) &&
          service.invoiceStatus === 'Väntar på betalning'
        ) {
          hasUpdates = true;
          return { ...service, invoiceStatus: 'Förfallen' as const };
        }
        return service;
      });

      if (hasUpdates) {
        updateCustomer(customer.id, { serviceHistory: updatedHistory });
      }
    });
  }, [customers, updateCustomer]);

  // Samla alla aktiva membership-tjänster från alla kunder
  const today = new Date();
  const activeMembershipServices = customers.flatMap((customer) => {
    if (!customer.serviceHistory || customer.serviceHistory.length === 0) return [];
    
    return customer.serviceHistory
      .filter((service) => service.status === 'Aktiv' && isMembershipService(service.service))
      .map((service) => ({
        ...service,
        customer,
      }));
  });

  // Filtrera baserat på betalningsmetod, status och plats
  const filteredServices = activeMembershipServices.filter((item) => {
    const matchesPayment = selectedPaymentMethod === 'Alla' || item.paymentMethod === selectedPaymentMethod;
    const matchesStatus = selectedStatus === 'Alla' || item.invoiceStatus === selectedStatus;
    const matchesPlace = selectedPlace === 'Alla' || item.customer.place === selectedPlace;
    return matchesPayment && matchesStatus && matchesPlace;
  });

  // Gruppera efter faktureringsstatus
  const toBePaid = filteredServices.filter((s) => s.invoiceStatus === 'Väntar på betalning');
  const paid = filteredServices.filter((s) => s.invoiceStatus === 'Betald');
  const overdue = filteredServices.filter((s) => 
    s.invoiceStatus === 'Förfallen' || 
    s.invoiceStatus === 'Påminnelse skickad' ||
    s.invoiceStatus === 'Ej betald efter påminnelse' ||
    s.invoiceStatus === 'Överlämnad till inkasso' ||
    s.invoiceStatus === 'Betalning avvisad'
  );
  const autogiro = filteredServices.filter((s) => s.paymentMethod === 'Autogiro');

  // Beräkna förfallna (nästa faktureringsdatum har passerat)
  const overdueByDate = filteredServices.filter((s) => {
    if (!s.nextInvoiceDate) return false;
    return isBefore(new Date(s.nextInvoiceDate), today) && s.invoiceStatus !== 'Betald';
  });

  // Kommande fakturor (inom 7 dagar)
  const upcomingInvoices = filteredServices.filter((s) => {
    if (!s.nextInvoiceDate) return false;
    const nextDate = new Date(s.nextInvoiceDate);
    const sevenDaysFromNow = addMonths(today, 0);
    sevenDaysFromNow.setDate(today.getDate() + 7);
    return isAfter(nextDate, today) && isBefore(nextDate, sevenDaysFromNow);
  });

  // Beräkna total omsättning per kategori
  const totalToBePaid = toBePaid.reduce((sum, s) => sum + s.price, 0);
  const totalPaid = paid.reduce((sum, s) => sum + s.price, 0);
  const totalOverdue = overdue.reduce((sum, s) => sum + s.price, 0);
  const totalAutogiro = autogiro.reduce((sum, s) => sum + s.price, 0);

  // Generisk funktion för att sätta faktureringsstatus
  const handleSetStatus = (customerId: string, serviceId: string, newStatus: InvoiceStatus) => {
    const customer = customers.find((c) => c.id === customerId);
    
    // Logga faktureringsuppdatering
    if (customer) {
      import('@/lib/activityLogger').then(({ logInvoiceUpdate }) => {
        logInvoiceUpdate(customerId, customer.name, `Status ändrad till ${newStatus}`);
      });
    }
    
    if (customer && customer.serviceHistory) {
      const service = customer.serviceHistory.find((s) => s.id === serviceId);
      const currentNote = service?.invoiceNote || '';
      const timestamp = format(today, 'yyyy-MM-dd', { locale: sv });
      
      const updatedHistory = customer.serviceHistory.map((service) => {
        if (service.id === serviceId) {
          const update: any = {
            ...service,
            invoiceStatus: newStatus,
          };
          
          // Om statusen inte är "Betald" eller "Ej aktuell", lägg till notering
          if (newStatus !== 'Betald' && newStatus !== 'Ej aktuell' && newStatus !== 'Väntar på betalning') {
            update.invoiceNote = currentNote 
              ? `${currentNote}\n[${timestamp}] ${newStatus}` 
              : `[${timestamp}] ${newStatus}`;
          }
          
          // Om status är "Betald", uppdatera nästa faktureringsdatum
          if (newStatus === 'Betald') {
            const nextMonth = addMonths(today, 1);
            update.nextInvoiceDate = nextMonth;
          }
          
          return update;
        }
        return service;
      });
      
      updateCustomer(customerId, {
        serviceHistory: updatedHistory,
      });
    }
  };

  const handleMarkAsPaid = (customerId: string, serviceId: string) => {
    handleSetStatus(customerId, serviceId, 'Betald');
  };

  const handleWriteOff = (customerId: string, serviceId: string) => {
    if (!confirm('Är du säker på att du vill avskriva denna skuld?')) return;
    handleSetStatus(customerId, serviceId, 'Ej aktuell');
  };

  const exportInvoiceList = () => {
    // Skapa CSV-data
    const csvData = filteredServices.map((item) => ({
      Namn: item.customer.name,
      Email: item.customer.email,
      Tjänst: item.service,
      Pris: item.price,
      Betalningsmetod: item.paymentMethod || '-',
      Status: item.invoiceStatus || '-',
      Faktureringsintervall: item.billingInterval || '-',
      'Antal månader': item.numberOfMonths || '-',
      'Nästa faktura': item.nextInvoiceDate ? format(new Date(item.nextInvoiceDate), 'yyyy-MM-dd') : '-',
      Plats: item.customer.place,
    }));

    // Konvertera till CSV-sträng
    const headers = Object.keys(csvData[0]).join(',');
    const rows = csvData.map((row) => Object.values(row).join(',')).join('\n');
    const csv = `${headers}\n${rows}`;

    // Ladda ner filen
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `fakturering_${format(today, 'yyyy-MM-dd')}.csv`;
    link.click();
    
    // Logga export
    import('@/lib/activityLogger').then(({ logExportData }) => {
      logExportData('Fakturering');
    });
  };

  const getInvoiceStatusColor = (status?: string) => {
    switch (status) {
      case 'Betald':
        return 'bg-green-100 text-green-800';
      case 'Väntar på betalning':
        return 'bg-yellow-100 text-yellow-800';
      case 'Förfallen':
        return 'bg-red-100 text-red-800';
      case 'Påminnelse skickad':
        return 'bg-orange-100 text-orange-800';
      case 'Ej betald efter påminnelse':
        return 'bg-red-200 text-red-900';
      case 'Överlämnad till inkasso':
        return 'bg-purple-100 text-purple-800';
      case 'Betalning avvisad':
        return 'bg-pink-100 text-pink-800';
      case 'Ej aktuell':
        return 'bg-gray-100 text-gray-600';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPaymentMethodColor = (method?: string) => {
    switch (method) {
      case 'Autogiro':
        return 'bg-blue-100 text-blue-800';
      case 'Faktura':
        return 'bg-purple-100 text-purple-800';
      case 'Swish':
        return 'bg-pink-100 text-pink-800';
      case 'Förskottsbetalning':
        return 'bg-emerald-100 text-emerald-800';
      case 'Klarna':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div>
      <Header
        title="Fakturering"
        subtitle="Hantera fakturor och betalningar för aktiva medlemmar"
      />

      {/* Statistik Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">Väntar på betalning</h3>
            <Clock className="w-5 h-5 text-yellow-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900">{toBePaid.length}</p>
          <p className="text-sm text-gray-600 mt-1">{totalToBePaid.toLocaleString('sv-SE')} kr</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">Betalda denna månad</h3>
            <CheckCircle className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900">{paid.length}</p>
          <p className="text-sm text-gray-600 mt-1">{totalPaid.toLocaleString('sv-SE')} kr</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">Förfallna</h3>
            <AlertCircle className="w-5 h-5 text-red-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900">{overdue.length}</p>
          <p className="text-sm text-gray-600 mt-1">{totalOverdue.toLocaleString('sv-SE')} kr</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">Autogiro</h3>
            <CheckCircle className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900">{autogiro.length}</p>
          <p className="text-sm text-gray-600 mt-1">{totalAutogiro.toLocaleString('sv-SE')} kr/mån</p>
        </div>
      </div>

      {/* Filter och Export */}
      <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100 mb-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">Filter:</span>
          </div>

          <select
            value={selectedPaymentMethod}
            onChange={(e) => setSelectedPaymentMethod(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E5A7D] text-gray-900"
          >
            <option value="Alla">Alla betalningsmetoder</option>
            <option value="Autogiro">Autogiro</option>
            <option value="Faktura">Faktura</option>
            <option value="Swish">Swish</option>
            <option value="Förskottsbetalning">Förskottsbetalning</option>
            <option value="Klarna">Klarna</option>
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E5A7D] text-gray-900"
          >
            <option value="Alla">Alla statusar</option>
            {INVOICE_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>

          <select
            value={selectedPlace}
            onChange={(e) => setSelectedPlace(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E5A7D] text-gray-900"
          >
            <option value="Alla">Alla platser</option>
            <option value="Stockholm">Stockholm</option>
            <option value="Göteborg">Göteborg</option>
            <option value="Malmö">Malmö</option>
            <option value="Linköping">Linköping</option>
            <option value="Falun">Falun</option>
            <option value="Åre">Åre</option>
          </select>

          <button
            onClick={exportInvoiceList}
            className="ml-auto flex items-center gap-2 px-4 py-2 bg-[#1E5A7D] text-white rounded-lg hover:bg-[#0C3B5C] transition text-sm font-medium"
          >
            <Download className="w-4 h-4" />
            Exportera lista
          </button>
        </div>
      </div>

      {/* Varningar */}
      {overdueByDate.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
            <div>
              <h4 className="font-semibold text-red-900 mb-1">
                {overdueByDate.length} förfallna fakturor
              </h4>
              <p className="text-sm text-red-800">
                Dessa kunder har passerat sitt nästa faktureringsdatum och behöver följas upp.
              </p>
            </div>
          </div>
        </div>
      )}

      {upcomingInvoices.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
          <div className="flex items-start gap-3">
            <Clock className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="font-semibold text-blue-900 mb-1">
                {upcomingInvoices.length} fakturor inom 7 dagar
              </h4>
              <p className="text-sm text-blue-800">
                Dessa kunder ska faktureras inom de närmaste 7 dagarna.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Faktureringslista */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Kund
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Tjänst
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Pris
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Betalningsmetod
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Nästa faktura
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Plats
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Åtgärder
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredServices.map((item) => (
                <tr key={`${item.customer.id}-${item.id}`} className="hover:bg-gray-50 transition">
                  <td className="px-4 py-3">
                    <Link href={`/kunder/${item.customer.id}`} className="text-[#1E5A7D] hover:underline font-medium">
                      {item.customer.name}
                    </Link>
                    <p className="text-xs text-gray-500">{item.customer.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-gray-900">{item.service}</span>
                    {item.billingInterval && item.billingInterval !== 'Månadsvis' && (
                      <p className="text-xs text-gray-500">{item.billingInterval}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm font-semibold text-gray-900">
                      {item.price.toLocaleString('sv-SE')} kr
                    </span>
                    <span className="text-xs text-gray-500">/mån</span>
                    {item.numberOfMonths && item.numberOfMonths > 1 && (
                      <p className="text-xs text-blue-600">× {item.numberOfMonths} mån</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 text-xs font-medium rounded ${getPaymentMethodColor(item.paymentMethod)}`}>
                      {item.paymentMethod || 'Ej angiven'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 text-xs font-medium rounded ${getInvoiceStatusColor(item.invoiceStatus)}`}>
                      {item.invoiceStatus || 'Ej aktuell'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {item.nextInvoiceDate ? (
                      <span className="text-sm text-gray-900">
                        {format(new Date(item.nextInvoiceDate), 'd MMM yyyy', { locale: sv })}
                      </span>
                    ) : (
                      <span className="text-sm text-gray-400">-</span>
                    )}
                    {item.paidUntil && (
                      <p className="text-xs text-emerald-600">
                        Betald till: {format(new Date(item.paidUntil), 'd MMM yyyy', { locale: sv })}
                      </p>
                    )}
                    {item.invoiceReference && (
                      <p className="text-xs text-gray-500">Ref: {item.invoiceReference}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-gray-700">{item.customer.place}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {/* Primär åtgärd - alltid synlig */}
                      {item.invoiceStatus !== 'Betald' && (
                        <button
                          onClick={() => handleMarkAsPaid(item.customer.id, item.id)}
                          className="text-xs px-3 py-1.5 bg-green-600 text-white rounded hover:bg-green-700 transition font-medium flex items-center gap-1"
                          title="Markera som betald"
                        >
                          <CheckCircle className="w-3 h-3" />
                          Betald
                        </button>
                      )}
                      
                      {/* Dropdown för statusmarkeringar - ALLA STATUSAR */}
                      <div className="relative group">
                        <button className="text-xs px-3 py-1.5 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition font-medium">
                          Markera status ▾
                        </button>
                        <div className="absolute right-0 mt-1 w-56 bg-white rounded-lg shadow-lg border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10 max-h-96 overflow-y-auto">
                          <div className="py-1">
                            {INVOICE_STATUSES.map((status) => {
                              // Hoppa över nuvarande status
                              if (status === item.invoiceStatus) return null;
                              
                              return (
                                <button
                                  key={status}
                                  onClick={() => handleSetStatus(item.customer.id, item.id, status)}
                                  className={`w-full text-left px-4 py-2 text-xs hover:bg-gray-50 flex items-center gap-2 ${
                                    status === 'Ej aktuell' ? 'text-red-600 font-medium' : 'text-gray-700'
                                  }`}
                                >
                                  <span className={`px-2 py-0.5 text-xs rounded ${getInvoiceStatusColor(status)}`}>
                                    {status}
                                  </span>
                                </button>
                              );
                            })}
                            
                            {/* Avskriv skuld - separerad */}
                            {item.invoiceStatus !== 'Ej aktuell' && (
                              <>
                                <div className="border-t border-gray-200 my-1"></div>
                                <button
                                  onClick={() => handleWriteOff(item.customer.id, item.id)}
                                  className="w-full text-left px-4 py-2 text-xs text-red-600 hover:bg-red-50 flex items-center gap-2 font-medium"
                                >
                                  <XCircle className="w-3 h-3" />
                                  Avskriv skuld
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredServices.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">Inga tjänster matchar de valda filtren.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

