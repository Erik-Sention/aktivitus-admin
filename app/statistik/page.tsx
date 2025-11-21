'use client';

import { useState } from 'react';
import Header from '@/components/Header';
import ChartCard from '@/components/ChartCard';
import { useCustomers } from '@/lib/CustomerContext';
import { PLACES, SPORTS, MEMBERSHIPS, TESTS } from '@/lib/constants';

export default function StatistikPage() {
  const { getStats, customers, getCrossTable, getCrossTrendData, getMonthlyTestTrend, getActiveMembershipDistribution, getServiceDistribution } = useCustomers();
  const [selectedPlaces, setSelectedPlaces] = useState<string[]>([]);
  const [selectedSports, setSelectedSports] = useState<string[]>([]);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [showPlaceFilter, setShowPlaceFilter] = useState(false);
  const [showSportFilter, setShowSportFilter] = useState(false);
  const [showServiceFilter, setShowServiceFilter] = useState(false);
  
  // Datumfilter - standard: senaste 6 månaderna
  const now = new Date();
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(now.getMonth() - 5);
  sixMonthsAgo.setDate(1); // Första dagen i månaden
  
  const [startDate, setStartDate] = useState<string>(
    sixMonthsAgo.toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState<string>(
    now.toISOString().split('T')[0]
  );
  
  const stats = getStats(selectedPlaces, selectedServices, startDate, endDate);
  const crossTable = getCrossTable(selectedPlaces, selectedServices);
  const crossTrendData = getCrossTrendData(selectedPlaces, selectedServices, startDate, endDate);
  const monthlyTestTrend = getMonthlyTestTrend(selectedPlaces, selectedServices, startDate, endDate);
  const activeMembershipDistribution = getActiveMembershipDistribution(selectedPlaces);
  const serviceDistribution = getServiceDistribution(selectedPlaces, startDate, endDate);

  return (
    <div>
      <Header
        title="Statistik"
        subtitle="Detaljerad översikt och analyser"
      />

      {/* Filters */}
      <div className="mb-6 bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Filter</h3>
        
        {/* Datumfilter */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 pb-4 border-b border-gray-200">
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Från datum
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E5A7D] text-gray-900"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Till datum
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              min={startDate}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E5A7D] text-gray-900"
            />
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                    Rensa
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

          {/* Gren Filter */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Grenar {selectedSports.length > 0 && <span className="text-[#1E5A7D]">({selectedSports.length} valda)</span>}
            </label>
            <button
              onClick={() => setShowSportFilter(!showSportFilter)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E5A7D] text-gray-900 text-left flex justify-between items-center"
            >
              <span>{selectedSports.length === 0 ? 'Alla grenar' : selectedSports.join(', ')}</span>
              <span>{showSportFilter ? '▲' : '▼'}</span>
            </button>
            {showSportFilter && (
              <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                <div className="p-2">
                  {SPORTS.map((sport) => (
                    <label key={sport} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedSports.includes(sport)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedSports([...selectedSports, sport]);
                          } else {
                            setSelectedSports(selectedSports.filter(s => s !== sport));
                          }
                        }}
                        className="w-4 h-4 text-[#1E5A7D] border-gray-300 rounded focus:ring-[#1E5A7D]"
                      />
                      <span className="text-sm text-gray-900">{sport}</span>
                    </label>
                  ))}
                </div>
                <div className="border-t border-gray-200 p-2 flex gap-2">
                  <button
                    onClick={() => setSelectedSports([])}
                    className="flex-1 px-3 py-1 text-sm text-gray-700 bg-gray-100 rounded hover:bg-gray-200"
                  >
                    Rensa
                  </button>
                  <button
                    onClick={() => setShowSportFilter(false)}
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
              <span className="truncate">{selectedServices.length === 0 ? 'Alla tjänster' : `${selectedServices.length} tjänster`}</span>
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
                    Rensa
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
                       <thead className="bg-gray-50">
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

                             // Formatera serienamnet för visning
                             let displaySeries = series;
                             if (series.includes(' - Vanlig coach')) {
                               displaySeries = series.replace(' - Vanlig coach', '') + ' (Vanlig coach)';
                             } else if (series.includes(' - Senior coach')) {
                               displaySeries = series.replace(' - Senior coach', '') + ' (Senior coach)';
                             }
                             
                             return (
                               <tr key={series} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                 <td className="px-4 py-3 text-sm font-medium text-gray-900 border-r border-gray-200 sticky left-0 bg-inherit">
                                   {displaySeries}
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

      <div className="grid grid-cols-1 gap-6">
        <ChartCard
          title="Månadsöversikt - Medlemskap"
          data={stats.monthlyTrend}
          type="bar"
        />

        <ChartCard
          title="Månadsöversikt - Tester"
          data={monthlyTestTrend}
          type="bar"
        />

        {activeMembershipDistribution.length > 0 && (
          <ChartCard
            title="Fördelning av aktiva medlemskap"
            data={activeMembershipDistribution}
            type="pie"
          />
        )}

        {serviceDistribution.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Tjänstefördelning
            </h3>
            <div className="space-y-4">
              {serviceDistribution.map((item) => {
                const total = serviceDistribution.reduce((sum, i) => sum + i.value, 0);
                const percentage = total > 0 ? (item.value / total) * 100 : 0;
                return (
                  <div key={item.name}>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium text-gray-700">
                        {item.name}
                      </span>
                      <span className="text-sm text-gray-600">{item.value} st ({percentage.toFixed(1)}%)</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-[#1E5A7D] h-2 rounded-full transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <ChartCard
          title="Trend över tid"
          data={stats.monthlyTrend}
          type="line"
        />

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Sammanfattning
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="text-sm text-gray-600 mb-1">Totalt antal medlemmar</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalMembers}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Genomförda tester</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalTests}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Aktiva medlemmar</p>
              <p className="text-2xl font-bold text-gray-900">{stats.activeMembers}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

