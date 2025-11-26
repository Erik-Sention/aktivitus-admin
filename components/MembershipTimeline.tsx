'use client';

import { ServiceEntry } from '@/types';
import { SERVICE_COLORS, isMembershipService } from '@/lib/constants';
import { format, differenceInMonths, eachMonthOfInterval, isSameMonth } from 'date-fns';
import { sv } from 'date-fns/locale';

interface MembershipTimelineProps {
  serviceHistory: ServiceEntry[];
}

export default function MembershipTimeline({ serviceHistory }: MembershipTimelineProps) {
  if (!serviceHistory || serviceHistory.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Medlemskapstidslinje</h3>
        <p className="text-sm text-gray-500">Ingen historik ännu</p>
      </div>
    );
  }

  // Hitta första och sista datum från alla tjänster
  // Viktigt: För aktiva tjänster, använd bara dagens datum (inte framtida slutdatum)
  const now = new Date();
  const allDates = serviceHistory.flatMap(entry => {
    const startDate = new Date(entry.date);
    let endDate: Date;
    
    if (entry.status === 'Aktiv') {
      // För aktiva tjänster: använd bara dagens datum (räkna bara faktiska månader hittills)
      endDate = now;
    } else if (entry.endDate) {
      // För avslutade tjänster: använd slutdatum, men max till idag
      endDate = new Date(entry.endDate);
      if (endDate > now) {
        endDate = now; // Om slutdatum är i framtiden, använd idag
      }
    } else {
      // Ingen slutdatum och inte aktiv = engångstjänst
      endDate = startDate;
    }
    
    return [startDate, endDate];
  });
  
  if (allDates.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Medlemskapstidslinje</h3>
        <p className="text-sm text-gray-500">Ingen historik ännu</p>
      </div>
    );
  }
  
  const minDate = new Date(Math.min(...allDates.map(d => d.getTime())));
  // Maxdatum ska aldrig vara i framtiden - använd idag om något datum är framtida
  const calculatedMaxDate = new Date(Math.max(...allDates.map(d => d.getTime())));
  const maxDate = calculatedMaxDate > now ? now : calculatedMaxDate;

  // Skapa en array av alla månader mellan första och sista
  const months = eachMonthOfInterval({ start: minDate, end: maxDate });

  // För varje månad, hitta vilka tjänster som var aktiva den månaden
  const monthlyData = months.map(month => {
    const activeServices = serviceHistory.filter(entry => {
      const startDate = new Date(entry.date);
      startDate.setHours(0, 0, 0, 0);
      
      // För aktiva tjänster: använd bara dagens datum (räkna bara faktiska månader hittills)
      // För avslutade/pausade: använd endDate om det finns, men max till idag
      let endDate: Date;
      if (entry.status === 'Aktiv') {
        endDate = new Date(); // Använd bara idag, inte framtida slutdatum
      } else if (entry.endDate) {
        endDate = new Date(entry.endDate);
        if (endDate > now) {
          endDate = now; // Om slutdatum är i framtiden, använd idag
        }
      } else {
        endDate = startDate; // Engångstjänst
      }
      endDate.setHours(23, 59, 59, 999);
      
      // Kolla om denna månad är mellan start och slut
      const monthStart = new Date(month.getFullYear(), month.getMonth(), 1);
      const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0);
      monthEnd.setHours(23, 59, 59, 999);
      
      return (startDate <= monthEnd && endDate >= monthStart);
    });

    // Dela upp i memberships och andra tjänster
    const memberships = activeServices.filter(s => isMembershipService(s.service));
    const otherServices = activeServices.filter(s => !isMembershipService(s.service));
    
    // Ta det senaste/aktiva membershipet
    const activeMembership = memberships.find(m => m.status === 'Aktiv') || memberships[0];
    
    // Sortera andra tjänster efter datum (äldsta först så nyaste hamnar överst)
    const sortedOthers = otherServices.sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    return {
      month,
      membership: activeMembership, // Bas-membership (genomgående)
      otherServices: sortedOthers, // Tester och andra tjänster ovanpå
      count: activeServices.length,
      hasService: activeServices.length > 0,
    };
  });

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
      <h3 className="text-lg font-semibold text-gray-900 mb-2">Medlemskapstidslinje</h3>
      <p className="text-sm text-gray-600 mb-4">
        Visar tjänster över tid • Totalt: <span className="font-semibold">
          {(() => {
            // Räkna bara faktiska månader där kunden har varit aktiv
            const activeMonths = monthlyData.filter(data => data.hasService).length;
            return activeMonths;
          })()} månader
        </span>
      </p>

      {/* Diagrammet */}
      <div className="overflow-x-auto pb-4 border border-gray-200 rounded-lg">
        <div style={{ minWidth: `${months.length * 45}px`, padding: '12px' }}>
          {/* Y-axel labels */}
          <div className="flex items-end justify-start gap-1 mb-2" style={{ height: '300px' }}>
            {monthlyData.map((data, index) => {
              const membership = data.membership;
              const otherServices = data.otherServices;
              
              // Om ingen tjänst aktiv denna månad - visa grå stapel för att visa paus
              if (!membership && (!otherServices || otherServices.length === 0)) {
                return (
                  <div
                    key={index}
                    className="flex-1 min-w-[40px] relative group cursor-pointer"
                    title={`${format(data.month, 'MMM yyyy', { locale: sv })}: Ingen aktiv tjänst`}
                  >
                    <div className="h-full flex items-end">
                      <div 
                        className="w-full rounded-t"
                        style={{ 
                          height: '12px',
                          backgroundColor: '#e5e7eb',
                          opacity: 0.5,
                          borderTop: '2px dashed #9ca3af'
                        }}
                      >
                        {/* Tooltip för tom månad */}
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-20 pointer-events-none">
                          <div className="bg-gray-700 text-white text-xs rounded-lg py-2 px-3 whitespace-nowrap shadow-lg">
                            <div className="font-semibold">{format(data.month, 'MMM yyyy', { locale: sv })}</div>
                            <div className="mt-1 text-gray-300">Ingen aktiv tjänst</div>
                          </div>
                          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1">
                            <div className="border-4 border-transparent border-t-gray-700"></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }

              const membershipHeightPx = 80; // Fast höjd i pixlar för membership-basen (samma överallt!)
              const otherServiceHeightPx = 50; // Höjd i pixlar per extra tjänst

              return (
                <div
                  key={index}
                  className="flex-1 min-w-[40px] relative group cursor-pointer"
                  title={`${format(data.month, 'MMM yyyy', { locale: sv })}: ${data.count} tjänst(er)`}
                >
                  <div className="h-full flex flex-col justify-end items-stretch">
                    {/* Bas-membership (genomgående lila bas med FAST höjd) */}
                    {membership && (
                      <div
                        className={`w-full ${
                          otherServices && otherServices.length > 0 ? '' : 'rounded-t'
                        } transition-all hover:opacity-90 ${
                          SERVICE_COLORS[membership.service] || 'bg-purple-600'
                        }`}
                        style={{ 
                          height: `${membershipHeightPx}px`,
                          boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                        }}
                      />
                    )}
                    
                    {/* Andra tjänster staplade ovanpå */}
                    {otherServices && otherServices.map((service, serviceIndex) => {
                      const colorClass = SERVICE_COLORS[service.service] || 'bg-red-600';
                      const isLast = serviceIndex === otherServices.length - 1;

                      return (
                        <div
                          key={`${index}-other-${serviceIndex}`}
                          className={`w-full transition-all hover:opacity-90 ${colorClass} ${
                            isLast ? 'rounded-t' : ''
                          } border-t-2 border-white`}
                          style={{ 
                            height: `${otherServiceHeightPx}px`,
                            boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                          }}
                        />
                      );
                    })}
                    
                    {/* Tooltip för hela stacken */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-20 pointer-events-none">
                      <div className="bg-gray-900 text-white text-xs rounded-lg py-2 px-3 whitespace-nowrap shadow-lg max-w-xs">
                        <div className="font-semibold mb-2">{format(data.month, 'MMM yyyy', { locale: sv })}</div>
                        
                        {/* Visa membership först */}
                        {membership && (
                          <div className="mb-1 pb-1 border-b border-gray-700">
                            <div className="font-medium">{membership.service}</div>
                            <div className="text-gray-300 text-[10px]">
                              {membership.price.toLocaleString('sv-SE')} kr/mån • {membership.status}
                            </div>
                          </div>
                        )}
                        
                        {/* Sedan visa andra tjänster */}
                        {otherServices && otherServices.map((service, idx) => (
                          <div key={idx} className="mt-1 pb-1 border-b border-gray-700 last:border-0">
                            <div className="font-medium">{service.service}</div>
                            <div className="text-gray-300 text-[10px]">
                              {service.price.toLocaleString('sv-SE')} kr • {service.status}
                            </div>
                          </div>
                        ))}
                        
                        {data.count > 1 && (
                          <div className="text-yellow-300 mt-2 pt-1 border-t border-gray-700 text-[10px]">
                            📊 Totalt {data.count} tjänster
                          </div>
                        )}
                      </div>
                      <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1">
                        <div className="border-4 border-transparent border-t-gray-900"></div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* X-axel */}
          <div className="flex gap-1 mt-2 pt-2 border-t border-gray-200">
            {monthlyData.map((data, index) => {
              // Visa labels baserat på antal månader
              const totalMonths = monthlyData.length;
              const interval = totalMonths > 36 ? 6 : totalMonths > 18 ? 4 : totalMonths > 12 ? 3 : totalMonths > 6 ? 2 : 1;
              const showLabel = index === 0 || index === monthlyData.length - 1 || index % interval === 0;
              
              return (
                <div key={index} className="flex-1 min-w-[40px] text-center">
                  {showLabel && (
                    <div className="text-[10px] text-gray-600 font-medium">
                      {format(data.month, 'MMM yy', { locale: sv })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <h4 className="text-sm font-medium text-gray-900 mb-2">Tjänster:</h4>
        <div className="flex flex-wrap gap-3">
          {Array.from(new Set(serviceHistory.map(s => s.service))).map(service => (
            <div key={service} className="flex items-center gap-2">
              <div className={`w-4 h-4 rounded ${SERVICE_COLORS[service] || 'bg-gray-500'}`}></div>
              <span className="text-xs text-gray-700">{service}</span>
            </div>
          ))}
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-gray-200 border-t-2 border-dashed border-gray-400 opacity-50"></div>
            <span className="text-xs text-gray-500">Ingen aktiv tjänst</span>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-gray-600">
          <p>📊 Memberships = Större block (bredare färgade sektioner)</p>
          <p>📈 Tester = Mindre block (smalare färgade sektioner)</p>
          <p className="col-span-2">⏸️ Grå streckad = Paus mellan tjänster</p>
          <p className="col-span-2">📚 Flera färger på samma stapel = Flera tjänster samma månad (staplade)</p>
          <p className="col-span-2">💡 Hover över en stapel för att se alla detaljer!</p>
        </div>
      </div>
    </div>
  );
}

