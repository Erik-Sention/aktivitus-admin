'use client';

import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

interface ChartCardProps {
  title?: string;
  data: any[];
  type?: 'bar' | 'line' | 'pie';
}

// Custom Tooltip för cross-reference data
const CustomCrossTooltip = ({ active, payload, label, places, services }: any) => {
  if (!active || !payload || !places || !services) return null;

  // Gruppera data per plats
  const dataByPlace: Record<string, any[]> = {};
  
  places.forEach((place: string) => {
    dataByPlace[place] = [];
  });

  payload.forEach((entry: any) => {
    if (entry.dataKey && entry.dataKey.includes('|||')) {
      const [place, service] = entry.dataKey.split('|||');
      if (entry.value > 0) {
        dataByPlace[place].push({
          service,
          value: entry.value,
          color: entry.fill,
        });
      }
    }
  });

  // Filtrera bort platser utan data
  const placesWithData = places.filter((place: string) => dataByPlace[place].length > 0);
  if (placesWithData.length === 0) return null;

  return (
    <div className="bg-white p-4 border-2 border-gray-300 rounded-lg shadow-xl">
      <p className="font-bold text-gray-900 mb-3 text-base">{label}</p>
      {placesWithData.map((place: string) => {
        const placeData = dataByPlace[place];
        const total = placeData.reduce((sum, item) => sum + item.value, 0);
        
        return (
          <div key={place} className="mb-3 last:mb-0">
            <p className="font-bold text-gray-900 text-sm mb-2">{place} <span className="text-gray-700">(Totalt: {total})</span></p>
            <div className="ml-2 space-y-1.5">
              {placeData.map((item, idx) => {
                // Formatera service-namnet för visning
                let displayService = item.service;
                if (item.service.includes(' - Vanlig coach')) {
                  displayService = item.service.replace(' - Vanlig coach', '') + ' (Vanlig coach)';
                } else if (item.service.includes(' - Senior coach')) {
                  displayService = item.service.replace(' - Senior coach', '') + ' (Senior coach)';
                }
                
                return (
                  <div key={idx} className="flex items-center gap-2 text-sm">
                    <span
                      className="w-4 h-4 rounded flex-shrink-0 border border-gray-300"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="font-medium text-gray-900">{displayService}:</span>
                    <span className="font-bold text-gray-900">{item.value}</span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// Custom Legend för cross-reference data
const CustomCrossLegend = ({ services, getServiceColor }: any) => {
  if (!services || services.length === 0) return null;

  return (
    <div className="flex flex-wrap justify-center gap-4 mt-4">
      {services.map((service: string) => {
        // Formatera service-namnet för visning
        let displayName = service;
        if (service.includes(' - Vanlig coach')) {
          displayName = service.replace(' - Vanlig coach', '') + ' (Vanlig coach)';
        } else if (service.includes(' - Senior coach')) {
          displayName = service.replace(' - Senior coach', '') + ' (Senior coach)';
        }
        
        return (
          <div key={service} className="flex items-center gap-2">
            <span
              className="w-4 h-4 rounded flex-shrink-0"
              style={{ backgroundColor: getServiceColor(service) }}
            />
            <span className="text-sm text-gray-700">{displayName}</span>
          </div>
        );
      })}
    </div>
  );
};

export default function ChartCard({ title, data, type = 'bar' }: ChartCardProps) {
  // Dynamiskt hitta alla dataKeys utom "month" från ALLA objekt i data-arrayen
  // (inte bara första objektet, eftersom första månaden kan sakna data)
  const allKeys = new Set<string>();
  data.forEach((item) => {
    Object.keys(item).forEach((key) => {
      if (key !== 'month') {
        allKeys.add(key);
      }
    });
  });
  const dataKeys = Array.from(allKeys);

  // Fallback till standard beteende om dataKeys är "members" och "tests"
  // Men om det finns membership-typer, använd dem istället
  const hasMembershipTypes = dataKeys.some(key => 
    key.includes('Membership') && key !== 'tests'
  );
  const isStandardData = !hasMembershipTypes && dataKeys.length === 2 && 
    dataKeys.includes('members') && 
    dataKeys.includes('tests');

  // För cross-reference data, extrahera unika platser och tjänster
  const places = new Set<string>();
  const services = new Set<string>();
  
  dataKeys.forEach(key => {
    if (key.includes('|||')) {
      const [place, service] = key.split('|||');
      places.add(place);
      // Behåll coach-typ suffix för att visa båda staplarna
      services.add(service);
    }
  });

  const uniquePlaces = Array.from(places);
  const uniqueServices = Array.from(services);

  // Utökad färgpalett för alla tjänster (konsistent färg per tjänst)
  const serviceColors: Record<string, string> = {
    // Memberships
    'Membership Standard': '#3b82f6',
    'Membership Standard TRI/OCR/MULTI': '#1d4ed8',
    'Programskrivning Membership Standard': '#2563eb',
    'Membership Premium': '#10b981',
    'Membership Premium TRI/OCR/MULTI': '#059669',
    'Membership Supreme': '#f59e0b',
    'Membership Supreme TRI/OCR/MULTI': '#d97706',
    'Membership Life': '#8b5cf6',
    'Membership Aktivitus Iform 4 mån': '#ec4899',
    'Membership Aktivitus Iform Tillägg till MS 4 mån': '#f472b6',
    'Membership Iform Extra månad': '#f9a8d4',
    'Membership Aktivitus Iform Fortsättning': '#fbcfe8',
    'Membership BAS': '#06b6d4',
    'Membership Avslut NOTERA SLUTDATUM': '#64748b',
    'Save - Samtal - Standard': '#84cc16',
    'Membership Utan tester': '#a3e635',
    'Membership Uppstart Coaching -  Test redan gjort och betalt': '#22d3ee',
    'Konvertering från test till membership - Till kollega': '#34d399',
    'Iform innan prisjusteringen - Sista testmomenten 2,5 h': '#fbbf24',
    'Iform uppstart/återtest/coachtimme MS utförd av någon annan - Minus 1 h tid': '#fb923c',
    'Iform uppstart/återtest/coachtimme MS utförd till någon annan - Plus 1 h tid': '#fdba74',
    
    // Tester
    'Tröskeltest': '#ef4444',
    'Tröskeltest + VO2max': '#dc2626',
    'Tröskeltest Triathlon': '#f97316',
    'Tröskeltest Triathlon + VO2max': '#ea580c',
    'VO2max fristående': '#b91c1c',
    'VO2max tillägg': '#991b1b',
    'Wingate fristående': '#7f1d1d',
    'Wingatetest tillägg': '#450a0a',
    'Styrketest tillägg': '#f87171',
    'Teknikanalys tillägg': '#fb7185',
    'Teknikanalys': '#fda4af',
    'Funktionsanalys': '#f43f5e',
    'Funktions- och löpteknikanalys': '#e11d48',
    'Hälsopaket': '#be123c',
    'Sommardubbel': '#9f1239',
    'Sommardubbel Tri': '#831843',
    'Träningsprogram Sommardubbel 1500kr': '#701a75',
    'Personlig Träning 1 - Betald yta': '#86198f',
    'Personlig Träning 1 - Gratis yta': '#a21caf',
    'Personlig Träning 5': '#c026d3',
    'Personlig Träning 10': '#d946ef',
    'Personlig Träning 20': '#e879f9',
    'PT-Klipp - Betald yta': '#f0abfc',
    'PT-Klipp - Gratis yta': '#f5d0fe',
    'Konvertering från test till PT20 - Till kollega': '#fae8ff',
    'Sen avbokning': '#fce7f3',
    'Kroppss fett% tillägg': '#fdf2f8',
    'Kroppss fett% fristående': '#fecdd3',
    'Blodanalys': '#fda4af',
    'Hb endast': '#fb7185',
    'Glucos endast': '#f43f5e',
    'Blodfetter': '#e11d48',
    'Kostregistrering': '#be123c',
    'Kostrådgivning': '#9f1239',
    'Natriumanalys (Svettest)': '#831843',
  };

  const getServiceColor = (service: string) => {
    // Hantera coach-typ suffix för Premium och Supreme
    let baseService = service;
    let isSenior = false;
    
    if (service.includes(' - Vanlig coach')) {
      baseService = service.replace(' - Vanlig coach', '');
    } else if (service.includes(' - Senior coach')) {
      baseService = service.replace(' - Senior coach', '');
      isSenior = true;
    }
    
    // Om vi har en definierad färg för bas-tjänsten
    if (serviceColors[baseService]) {
      // För senior coach, använd en mörkare/djupare variant
      if (isSenior) {
        // Konvertera hex till RGB, mörkare med 20%
        const hex = serviceColors[baseService].replace('#', '');
        const r = Math.max(0, parseInt(hex.substr(0, 2), 16) - 40);
        const g = Math.max(0, parseInt(hex.substr(2, 2), 16) - 40);
        const b = Math.max(0, parseInt(hex.substr(4, 2), 16) - 40);
        return `rgb(${r}, ${g}, ${b})`;
      }
      return serviceColors[baseService];
    }
    
    // Annars generera en konsistent färg baserat på tjänstens hash
    const hash = service.split('').reduce((acc, char) => {
      return char.charCodeAt(0) + ((acc << 5) - acc);
    }, 0);
    
    const fallbackColors = ['#8b5cf6', '#ec4899', '#06b6d4', '#14b8a6', '#84cc16', '#a3e635'];
    let color = fallbackColors[Math.abs(hash) % fallbackColors.length];
    
    // Om det är senior coach, mörkare färgen
    if (isSenior) {
      const hex = color.replace('#', '');
      const r = Math.max(0, parseInt(hex.substr(0, 2), 16) - 40);
      const g = Math.max(0, parseInt(hex.substr(2, 2), 16) - 40);
      const b = Math.max(0, parseInt(hex.substr(4, 2), 16) - 40);
      return `rgb(${r}, ${g}, ${b})`;
    }
    
    return color;
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
      {title && <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>}
      <div className={type === 'pie' ? 'h-[500px]' : 'h-80'}>
        <ResponsiveContainer width="100%" height="100%">
          {type === 'bar' ? (
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              {uniquePlaces.length > 0 ? (
                <>
                  <Tooltip content={<CustomCrossTooltip places={uniquePlaces} services={uniqueServices} />} />
                </>
              ) : hasMembershipTypes ? (
                <>
                  <Tooltip 
                    content={({ active, payload, label }) => {
                      if (!active || !payload) return null;
                      return (
                        <div className="bg-white p-4 border-2 border-gray-300 rounded-lg shadow-xl">
                          <p className="font-bold text-gray-900 mb-3 text-base">{label}</p>
                          {payload.map((entry: any, index: number) => (
                            <div key={index} className="flex items-center gap-2 text-sm mb-2">
                              <span
                                className="w-4 h-4 rounded flex-shrink-0 border border-gray-300"
                                style={{ backgroundColor: entry.fill }}
                              />
                              <span className="font-medium text-gray-900">{entry.name}:</span>
                              <span className="font-bold text-gray-900">{entry.value}</span>
                            </div>
                          ))}
                        </div>
                      );
                    }}
                  />
                </>
              ) : (
                <>
                  <Tooltip 
                    content={({ active, payload, label }) => {
                      if (!active || !payload) return null;
                      return (
                        <div className="bg-white p-4 border-2 border-gray-300 rounded-lg shadow-xl">
                          <p className="font-bold text-gray-900 mb-3 text-base">{label}</p>
                          {payload.map((entry: any, index: number) => (
                            <div key={index} className="flex items-center gap-2 text-sm mb-2">
                              <span
                                className="w-4 h-4 rounded flex-shrink-0 border border-gray-300"
                                style={{ backgroundColor: entry.fill }}
                              />
                              <span className="font-medium text-gray-900">{entry.name}:</span>
                              <span className="font-bold text-gray-900">{entry.value}</span>
                            </div>
                          ))}
                        </div>
                      );
                    }}
                  />
                </>
              )}
              {isStandardData ? (
                <>
                  <Bar dataKey="members" fill="#3b82f6" name="Medlemmar" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="tests" fill="#10b981" name="Tester" radius={[8, 8, 0, 0]} />
                </>
              ) : uniquePlaces.length > 0 ? (
                // Cross-reference data: Stacked bars grupperade per plats
                uniquePlaces.map((place) => (
                  <React.Fragment key={place}>
                    {uniqueServices.map((service) => {
                      const key = `${place}|||${service}`;
                      return (
                        <Bar
                          key={key}
                          dataKey={key}
                          stackId={place}
                          fill={getServiceColor(service)}
                          name={`${place} - ${service}`}
                        />
                      );
                    })}
                  </React.Fragment>
                ))
              ) : hasMembershipTypes ? (
                // Visa membership-typer med olika färger (stacked bars)
                dataKeys.map((key) => {
                  if (key === 'tests') {
                    return (
                      <Bar
                        key={key}
                        dataKey={key}
                        fill="#10b981"
                        name="Tester"
                        radius={[8, 8, 0, 0]}
                      />
                    );
                  }
                  return (
                    <Bar
                      key={key}
                      dataKey={key}
                      stackId="memberships"
                      fill={getServiceColor(key)}
                      name={key}
                      radius={[8, 8, 0, 0]}
                    />
                  );
                })
              ) : (
                // Fallback för annan data
                dataKeys.map((key) => (
                  <Bar
                    key={key}
                    dataKey={key}
                    fill={getServiceColor(key)}
                    name={key}
                    radius={[8, 8, 0, 0]}
                  />
                ))
              )}
            </BarChart>
          ) : type === 'pie' ? (
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent, value }) => {
                  // Visa bara större segment (över 2%) för bättre läsbarhet
                  if (percent < 0.02) return '';
                  // Kortare namn för bättre läsbarhet
                  const shortName = name.length > 25 ? name.substring(0, 22) + '...' : name;
                  return `${shortName}: ${(percent * 100).toFixed(0)}%`;
                }}
                outerRadius={180}
                innerRadius={60}
                fill="#8884d8"
                dataKey="value"
                paddingAngle={3}
              >
                {data.map((entry: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={getServiceColor(entry.name)} />
                ))}
              </Pie>
              <Tooltip 
                content={({ active, payload }) => {
                  if (!active || !payload || !payload[0]) return null;
                  const data = payload[0].payload;
                  const total = data.total || data.reduce((sum: number, item: any) => sum + (item.value || 0), 0);
                  const percent = total > 0 ? ((data.value / total) * 100).toFixed(1) : '0';
                  return (
                    <div className="bg-white p-4 border-2 border-gray-300 rounded-lg shadow-xl max-w-xs">
                      <p className="font-bold text-gray-900 text-base mb-2 break-words">{data.name}</p>
                      <p className="text-sm font-medium text-gray-900">Antal: <span className="font-bold">{data.value}</span></p>
                      <p className="text-sm font-medium text-gray-900">Andel: <span className="font-bold">{percent}%</span></p>
                    </div>
                  );
                }}
              />
            </PieChart>
          ) : (
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip 
                content={({ active, payload, label }) => {
                  if (!active || !payload) return null;
                  return (
                    <div className="bg-white p-4 border-2 border-gray-300 rounded-lg shadow-xl">
                      <p className="font-bold text-gray-900 mb-3 text-base">{label}</p>
                      {payload.map((entry: any, index: number) => (
                        <div key={index} className="flex items-center gap-2 text-sm mb-2">
                          <span
                            className="w-4 h-4 rounded flex-shrink-0 border border-gray-300"
                            style={{ backgroundColor: entry.color }}
                          />
                          <span className="font-medium text-gray-900">{entry.name}:</span>
                          <span className="font-bold text-gray-900">{entry.value}</span>
                        </div>
                      ))}
                    </div>
                  );
                }}
              />
              {isStandardData ? (
                <>
                  <Line
                    type="monotone"
                    dataKey="members"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    name="Medlemmar"
                  />
                  <Line
                    type="monotone"
                    dataKey="tests"
                    stroke="#10b981"
                    strokeWidth={2}
                    name="Tester"
                  />
                </>
              ) : (
                dataKeys.map((key) => (
                  <Line
                    key={key}
                    type="monotone"
                    dataKey={key}
                    stroke={getServiceColor(key)}
                    strokeWidth={2}
                    name={key}
                  />
                ))
              )}
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
