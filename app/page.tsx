'use client';

import { useState } from 'react';
import Header from '@/components/Header';
import StatCard from '@/components/StatCard';
import ChartCard from '@/components/ChartCard';
import { Users, CheckCircle, TrendingUp, DollarSign, AlertCircle, Clock, Receipt } from 'lucide-react';
import { useCustomers } from '@/lib/CustomerContext';
import { PLACES, MEMBERSHIPS, TESTS, isMembershipService } from '@/lib/constants';
import Link from 'next/link';

export default function DashboardPage() {
  const { getStats, customers, getCrossTable, getCrossTrendData } = useCustomers();
  const [selectedPlaces, setSelectedPlaces] = useState<string[]>([]);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [showPlaceFilter, setShowPlaceFilter] = useState(false);
  const [showServiceFilter, setShowServiceFilter] = useState(false);
  
  const stats = getStats(selectedPlaces, selectedServices);
  const crossTable = getCrossTable(selectedPlaces, selectedServices);
  const crossTrendData = getCrossTrendData(selectedPlaces, selectedServices);

  return (
    <div>
      <Header
        title="Dashboard"
        subtitle="Översikt över dina kunder och statistik"
      />

      {/* Filters */}
      <div className="mb-6 bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Filter</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Plats Filter */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Platser {selectedPlaces.length > 0 && <span className="text-[#1E5A7D]">({selectedPlaces.length} valda)</span>}
            </label>
            <button
              onClick={() => setShowPlaceFilter(!showPlaceFilter)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E5A7D] text-gray-900 text-left flex justify-between items-center"
            >
              <span>{selectedPlaces.length === 0 ? 'Alla platser' : selectedPlaces.join(', ')}</span>
              <span>{showPlaceFilter ? '▲' : '▼'}</span>
            </button>
            {showPlaceFilter && (
              <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                <div className="p-2">
                  {PLACES.map((place) => (
                    <label key={place} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedPlaces.includes(place)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedPlaces([...selectedPlaces, place]);
                          } else {
                            setSelectedPlaces(selectedPlaces.filter(p => p !== place));
                          }
                        }}
                        className="w-4 h-4 text-[#1E5A7D] border-gray-300 rounded focus:ring-[#1E5A7D]"
                      />
                      <span className="text-sm text-gray-900">{place}</span>
                    </label>
                  ))}
                </div>
                <div className="border-t border-gray-200 p-2 flex gap-2">
                  <button
                    onClick={() => setSelectedPlaces([])}
                    className="flex-1 px-3 py-1 text-sm text-gray-700 bg-gray-100 rounded hover:bg-gray-200"
                  >
                    Rensa alla
                  </button>
                  <button
                    onClick={() => setShowPlaceFilter(false)}
                    className="flex-1 px-3 py-1 text-sm text-white bg-[#1E5A7D] rounded hover:bg-[#0C3B5C]"
                  >
                    Stäng
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Tjänst Filter */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Tjänster {selectedServices.length > 0 && <span className="text-[#1E5A7D]">({selectedServices.length} valda)</span>}
            </label>
            <button
              onClick={() => setShowServiceFilter(!showServiceFilter)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E5A7D] text-gray-900 text-left flex justify-between items-center"
            >
              <span className="truncate">{selectedServices.length === 0 ? 'Alla tjänster' : `${selectedServices.length} tjänster valda`}</span>
              <span>{showServiceFilter ? '▲' : '▼'}</span>
            </button>
            {showServiceFilter && (
              <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-lg max-h-80 overflow-y-auto">
                <div className="p-2">
                  <div className="mb-2 pb-2 border-b border-gray-200">
                    <p className="text-xs font-semibold text-gray-500 uppercase px-2">Memberships</p>
                  </div>
                  {MEMBERSHIPS.map((membership) => (
                    <label key={membership} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedServices.includes(membership)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedServices([...selectedServices, membership]);
                          } else {
                            setSelectedServices(selectedServices.filter(s => s !== membership));
                          }
                        }}
                        className="w-4 h-4 text-[#1E5A7D] border-gray-300 rounded focus:ring-[#1E5A7D]"
                      />
                      <span className="text-sm text-gray-900">{membership}</span>
                    </label>
                  ))}
                  <div className="my-2 pb-2 border-b border-gray-200">
                    <p className="text-xs font-semibold text-gray-500 uppercase px-2">Tester</p>
                  </div>
                  {TESTS.map((test) => (
                    <label key={test} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedServices.includes(test)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedServices([...selectedServices, test]);
                          } else {
                            setSelectedServices(selectedServices.filter(s => s !== test));
                          }
                        }}
                        className="w-4 h-4 text-[#1E5A7D] border-gray-300 rounded focus:ring-[#1E5A7D]"
                      />
                      <span className="text-sm text-gray-900">{test}</span>
                    </label>
                  ))}
                </div>
                <div className="border-t border-gray-200 p-2 flex gap-2">
                  <button
                    onClick={() => setSelectedServices([])}
                    className="flex-1 px-3 py-1 text-sm text-gray-700 bg-gray-100 rounded hover:bg-gray-200"
                  >
                    Rensa alla
                  </button>
                  <button
                    onClick={() => setShowServiceFilter(false)}
                    className="flex-1 px-3 py-1 text-sm text-white bg-[#1E5A7D] rounded hover:bg-[#0C3B5C]"
                  >
                    Stäng
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Cross-reference Trend Chart */}
             {crossTrendData.length > 0 && (
               <div className="mb-6 bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                 <h3 className="text-lg font-semibold text-gray-900 mb-4">Fördelning över tid: Platser vs Tjänster</h3>
                 <ChartCard
                   title=""
                   data={crossTrendData}
                   type="bar"
                 />
                 
                 {/* Tabellvy */}
                 <div className="mt-8">
                   <h4 className="text-md font-semibold text-gray-900 mb-4">Tabellvy</h4>
                   <div className="overflow-x-auto">
                     <table className="min-w-full divide-y divide-gray-200 border border-gray-200">
                       <thead className="bg-gray-50 sticky top-0 z-10">
                         <tr>
                           <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider border-r border-gray-200 sticky left-0 bg-gray-50 z-10">
                             Plats - Tjänst
                           </th>
                           {crossTrendData.map((dataPoint: any) => (
                             <th key={dataPoint.month} className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">
                               {dataPoint.month}
                             </th>
                           ))}
                           <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider bg-blue-50 border-l border-gray-200">
                             Totalt
                           </th>
                         </tr>
                       </thead>
                       <tbody className="bg-white divide-y divide-gray-200">
                         {(() => {
                           // Extrahera alla unika serier (plats - tjänst kombinationer)
                           const allSeries = new Set<string>();
                           crossTrendData.forEach((dataPoint: any) => {
                             Object.keys(dataPoint).forEach((key) => {
                               if (key !== 'month') {
                                 allSeries.add(key);
                               }
                             });
                           });

                           return Array.from(allSeries).map((series, index) => {
                             // Beräkna totalt för denna serie
                             const total = crossTrendData.reduce((sum: number, dataPoint: any) => {
                               return sum + (dataPoint[series] || 0);
                             }, 0);

                             return (
                               <tr key={series} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                 <td className="px-4 py-3 text-sm font-medium text-gray-900 border-r border-gray-200 sticky left-0 bg-inherit">
                                   {series}
                                 </td>
                                 {crossTrendData.map((dataPoint: any) => (
                                   <td key={`${series}-${dataPoint.month}`} className="px-4 py-3 text-sm text-center text-gray-700">
                                     {dataPoint[series] || 0}
                                   </td>
                                 ))}
                                 <td className="px-4 py-3 text-sm text-center font-semibold text-gray-900 bg-blue-50 border-l border-gray-200">
                                   {total}
                                 </td>
                               </tr>
                             );
                           });
                         })()}
                         {/* Total rad */}
                         <tr className="bg-gray-100 font-semibold">
                           <td className="px-4 py-3 text-sm text-gray-900 border-r border-gray-200 sticky left-0 bg-gray-100">
                             Totalt per månad
                           </td>
                           {crossTrendData.map((dataPoint: any) => {
                             const monthTotal = Object.keys(dataPoint).reduce((sum, key) => {
                               if (key !== 'month') {
                                 return sum + (dataPoint[key] || 0);
                               }
                               return sum;
                             }, 0);
                             return (
                               <td key={`total-${dataPoint.month}`} className="px-4 py-3 text-sm text-center text-gray-900">
                                 {monthTotal}
                               </td>
                             );
                           })}
                           <td className="px-4 py-3 text-sm text-center text-gray-900 bg-blue-100 border-l border-gray-200">
                             {(() => {
                               const grandTotal = crossTrendData.reduce((sum: number, dataPoint: any) => {
                                 return sum + Object.keys(dataPoint).reduce((monthSum, key) => {
                                   if (key !== 'month') {
                                     return monthSum + (dataPoint[key] || 0);
                                   }
                                   return monthSum;
                                 }, 0);
                               }, 0);
                               return grandTotal;
                             })()}
                           </td>
                         </tr>
                       </tbody>
                     </table>
                   </div>
                 </div>
               </div>
             )}

      {/* Fakturerings-widget */}
      <div className="mb-8 bg-gradient-to-r from-[#1E5A7D] to-[#0C3B5C] rounded-xl shadow-lg p-6 text-white">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Receipt className="w-6 h-6" />
            <h3 className="text-xl font-bold">Fakturering</h3>
          </div>
          <Link
            href="/fakturering"
            className="px-4 py-2 bg-white text-[#1E5A7D] rounded-lg hover:bg-gray-100 transition font-medium text-sm"
          >
            Visa alla
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(() => {
            const activeServices = customers.flatMap((customer) => {
              if (!customer.serviceHistory || customer.serviceHistory.length === 0) return [];
              return customer.serviceHistory
                .filter((service) => service.status === 'Aktiv' && isMembershipService(service.service))
                .map((service) => ({
                  ...service,
                  customer,
                }));
            });
            
            const toBePaid = activeServices.filter((s) => s.invoiceStatus === 'Väntar på betalning').length;
            const overdue = activeServices.filter((s) => s.invoiceStatus === 'Förfallen').length;

            return (
              <>
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="w-5 h-5" />
                    <span className="text-sm font-medium">Väntar på betalning</span>
                  </div>
                  <p className="text-3xl font-bold">{toBePaid}</p>
                </div>

                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="w-5 h-5" />
                    <span className="text-sm font-medium">Förfallna</span>
                  </div>
                  <p className="text-3xl font-bold">{overdue}</p>
                  {overdue > 0 && (
                    <p className="text-xs mt-1 opacity-90">Kräver uppföljning!</p>
                  )}
                </div>

                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="w-5 h-5" />
                    <span className="text-sm font-medium">Autogiro</span>
                  </div>
                  <p className="text-3xl font-bold">
                    {activeServices.filter((s) => s.paymentMethod === 'Autogiro').length}
                  </p>
                  <p className="text-xs mt-1 opacity-90">Automatiska betalningar</p>
                </div>
              </>
            );
          })()}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Totalt antal medlemmar"
          value={stats.totalMembers}
          subtitle="Alla medlemmar"
          icon={Users}
          color="blue"
          trend={{ value: 12, isPositive: true }}
        />
        <StatCard
          title="Aktiva medlemmar"
          value={stats.activeMembers}
          subtitle={`${Math.round((stats.activeMembers / stats.totalMembers) * 100)}% aktiva`}
          icon={CheckCircle}
          color="green"
          trend={{ value: 8, isPositive: true }}
        />
        <StatCard
          title="Genomförda tester"
          value={stats.totalTests}
          subtitle="Senaste månaden"
          icon={TrendingUp}
          color="purple"
          trend={{ value: 5, isPositive: false }}
        />
        <Link href="/intakter" className="block">
          <StatCard
            title="Månadsintäkter"
            value={`${stats.monthlyRevenue.toLocaleString('sv-SE')} kr`}
            subtitle="Aktuell månad"
            icon={DollarSign}
            color="yellow"
            trend={{ value: 15, isPositive: true }}
          />
        </Link>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <ChartCard
          title="Månadsöversikt"
          data={stats.monthlyTrend}
          type="bar"
        />
        <ChartCard
          title="Trend över tid"
          data={stats.monthlyTrend}
          type="line"
        />
      </div>

      {/* Distribution Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Members by Place */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Medlemmar per plats
          </h3>
          <div className="space-y-4">
            {Object.entries(stats.membersByPlace).map(([place, count]) => {
              const percentage = (count / stats.totalMembers) * 100;
              return (
                <div key={place}>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700">
                      {place}
                    </span>
                    <span className="text-sm text-gray-600">{count} st</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Service Distribution */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Tjänstefördelning
          </h3>
          <div className="space-y-4">
            {Object.entries(stats.serviceDistribution).map(([service, count]) => {
              const percentage = (count / stats.totalMembers) * 100;
              return (
                <div key={service}>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700">
                      {service}
                    </span>
                    <span className="text-sm text-gray-600">{count} st</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-purple-600 h-2 rounded-full transition-all"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
