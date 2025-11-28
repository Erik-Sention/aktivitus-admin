'use client';

import { useState, useMemo } from 'react';
import Header from '@/components/Header';
import { useCustomers } from '@/lib/CustomerContext';
import { PLACES, MEMBERSHIPS, TESTS, isMembershipService, isTestService } from '@/lib/constants';
import { Customer, ServiceEntry, Place } from '@/types';
import { DollarSign, TrendingUp, Calendar, MapPin } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { getServiceEndDate, calculateMembershipRevenue } from '@/lib/revenueCalculations';

export default function IntakterPage() {
  const { customers } = useCustomers();
  const [selectedPlaces, setSelectedPlaces] = useState<Place[]>([]);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [startDate, setStartDate] = useState<string>(
    new Date(new Date().getFullYear(), new Date().getMonth() - 5, 1).toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  // Filtrera kunder baserat på platser och datum
  const filteredCustomers = useMemo(() => {
    let filtered = customers;

    // Filtrera på platser
    if (selectedPlaces.length > 0) {
      filtered = filtered.filter((c) => selectedPlaces.includes(c.place));
    }

    // Filtrera på datumintervall
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    return filtered.filter((customer) => {
      // Kolla huvudtjänsten
      const customerDate = new Date(customer.date);
      customerDate.setHours(0, 0, 0, 0);

      // Om huvudtjänsten är inom datumintervall
      if (customerDate >= start && customerDate <= end) {
        // Om inga specifika tjänster är valda, eller om huvudtjänsten matchar
        if (selectedServices.length === 0 || selectedServices.includes(customer.service)) {
          return true;
        }
      }

      // Kolla serviceHistory
      if (customer.serviceHistory && customer.serviceHistory.length > 0) {
        return customer.serviceHistory.some((serviceEntry) => {
          const serviceDate = new Date(serviceEntry.date);
          serviceDate.setHours(0, 0, 0, 0);

          // För memberships: kolla om tjänsten var aktiv under någon del av perioden
          if (isMembershipService(serviceEntry.service)) {
            const serviceStartDate = serviceDate;
            const serviceEndDate = serviceEntry.endDate
              ? new Date(serviceEntry.endDate)
              : (serviceEntry.status === 'Aktiv' ? end : serviceStartDate);
            serviceEndDate.setHours(23, 59, 59, 999);

            const overlapsPeriod = serviceStartDate <= end && serviceEndDate >= start;
            const matchesService = selectedServices.length === 0 || selectedServices.includes(serviceEntry.service);

            return overlapsPeriod && matchesService;
          } else {
            // För tester: kolla om tjänsten genomfördes under perioden
            const withinPeriod = serviceDate >= start && serviceDate <= end;
            const matchesService = selectedServices.length === 0 || selectedServices.includes(serviceEntry.service);

            return withinPeriod && matchesService;
          }
        });
      }

      return false;
    });
  }, [customers, selectedPlaces, selectedServices, startDate, endDate]);

  // Beräkna intäkter per månad
  const monthlyRevenue = useMemo(() => {
    const revenueMap: Record<string, number> = {};
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    // Generera alla månader i perioden
    const current = new Date(start.getFullYear(), start.getMonth(), 1);
    const endMonth = new Date(end.getFullYear(), end.getMonth(), 1);

    while (current <= endMonth) {
      const monthKey = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`;
      revenueMap[monthKey] = 0;
      current.setMonth(current.getMonth() + 1);
    }

    // Beräkna intäkter för varje månad
    filteredCustomers.forEach((customer) => {
      // Hantera huvudtjänsten
      if (isMembershipService(customer.service)) {
        const membershipStart = new Date(customer.date);
        membershipStart.setHours(0, 0, 0, 0);
        const membershipEnd = getServiceEndDate(customer, end);
        
        // Hämta billingInterval från customer (kan finnas i serviceHistory eller som default)
        const billingInterval = customer.serviceHistory?.find(sh => sh.service === customer.service)?.billingInterval 
          || (isMembershipService(customer.service) ? 'Månadsvis' : 'Engångsbetalning');

        // För årlig/kvartalsvis betalning: lägg till en gång i månaden tjänsten startade (om inom perioden)
        if (billingInterval === 'Årlig' || billingInterval === 'Kvartalsvis') {
          if (membershipStart >= start && membershipStart <= end) {
            const monthKey = `${membershipStart.getFullYear()}-${String(membershipStart.getMonth() + 1).padStart(2, '0')}`;
            revenueMap[monthKey] = (revenueMap[monthKey] || 0) + customer.price;
          }
        } else {
          // För månadsvis betalning: lägg till månadspriset för varje månad tjänsten var aktiv
          const currentMonth = new Date(Math.max(membershipStart.getTime(), start.getTime()));
          currentMonth.setDate(1);
          const lastMonth = new Date(Math.min(membershipEnd.getTime(), end.getTime()));
          lastMonth.setDate(1);

          while (currentMonth <= lastMonth) {
            const monthKey = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}`;
            const monthStart = new Date(currentMonth);
            const monthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
            monthEnd.setHours(23, 59, 59, 999);
            
            if (membershipStart <= monthEnd && membershipEnd >= monthStart) {
              revenueMap[monthKey] = (revenueMap[monthKey] || 0) + customer.price;
            }
            currentMonth.setMonth(currentMonth.getMonth() + 1);
          }
        }
      } else {
        // För tester: engångsbetalning - lägg till i månaden det genomfördes
        const customerDate = new Date(customer.date);
        customerDate.setHours(0, 0, 0, 0);

        if (customerDate >= start && customerDate <= end) {
          const monthKey = `${customerDate.getFullYear()}-${String(customerDate.getMonth() + 1).padStart(2, '0')}`;
          revenueMap[monthKey] = (revenueMap[monthKey] || 0) + customer.price;
        }
      }

      // Hantera serviceHistory
      if (customer.serviceHistory && customer.serviceHistory.length > 0) {
        customer.serviceHistory.forEach((serviceEntry: ServiceEntry) => {
          const serviceDate = new Date(serviceEntry.date);
          serviceDate.setHours(0, 0, 0, 0);

          if (isMembershipService(serviceEntry.service)) {
            const serviceStartDate = serviceDate;
            const serviceEndDate = getServiceEndDate(serviceEntry, end);
            const billingInterval = serviceEntry.billingInterval || 'Månadsvis';

            // För årlig/kvartalsvis betalning: lägg till en gång i månaden tjänsten startade (om inom perioden)
            if (billingInterval === 'Årlig' || billingInterval === 'Kvartalsvis') {
              if (serviceStartDate >= start && serviceStartDate <= end) {
                const monthKey = `${serviceStartDate.getFullYear()}-${String(serviceStartDate.getMonth() + 1).padStart(2, '0')}`;
                revenueMap[monthKey] = (revenueMap[monthKey] || 0) + serviceEntry.price;
              }
            } else {
              // För månadsvis betalning: lägg till intäkt för varje månad tjänsten var aktiv
              const currentMonth = new Date(Math.max(serviceStartDate.getTime(), start.getTime()));
              currentMonth.setDate(1);
              const lastMonth = new Date(Math.min(serviceEndDate.getTime(), end.getTime()));
              lastMonth.setDate(1);

              while (currentMonth <= lastMonth) {
                const monthKey = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}`;
                const monthStart = new Date(currentMonth);
                const monthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
                monthEnd.setHours(23, 59, 59, 999);
                
                if (serviceStartDate <= monthEnd && serviceEndDate >= monthStart) {
                  revenueMap[monthKey] = (revenueMap[monthKey] || 0) + serviceEntry.price;
                }
                currentMonth.setMonth(currentMonth.getMonth() + 1);
              }
            }
          } else {
            // För tester: engångsbetalning
            if (serviceDate >= start && serviceDate <= end) {
              const monthKey = `${serviceDate.getFullYear()}-${String(serviceDate.getMonth() + 1).padStart(2, '0')}`;
              revenueMap[monthKey] = (revenueMap[monthKey] || 0) + serviceEntry.price;
            }
          }
        });
      }
    });

    // Konvertera till array för diagram
    return Object.entries(revenueMap)
      .map(([month, revenue]) => ({
        month: month,
        monthLabel: new Date(month + '-01').toLocaleDateString('sv-SE', { month: 'short', year: 'numeric' }),
        revenue: Math.round(revenue),
      }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }, [filteredCustomers, startDate, endDate]);

  // Beräkna intäkter per tjänst
  const revenueByService = useMemo(() => {
    const serviceMap: Record<string, number> = {};
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    filteredCustomers.forEach((customer) => {
      // Hantera huvudtjänsten
      if (isMembershipService(customer.service)) {
        const membershipStart = new Date(customer.date);
        membershipStart.setHours(0, 0, 0, 0);
        const membershipEnd = getServiceEndDate(customer, end);
        
        // Hämta billingInterval från customer (kan finnas i serviceHistory eller som default)
        const billingInterval = customer.serviceHistory?.find(sh => sh.service === customer.service)?.billingInterval 
          || (isMembershipService(customer.service) ? 'Månadsvis' : 'Engångsbetalning');

        const revenue = calculateMembershipRevenue(
          { ...customer, billingInterval },
          membershipStart,
          membershipEnd,
          start,
          end
        );
        
        serviceMap[customer.service] = (serviceMap[customer.service] || 0) + revenue;
      } else {
        // För tester: engångsbetalning
        const customerDate = new Date(customer.date);
        customerDate.setHours(0, 0, 0, 0);

        if (customerDate >= start && customerDate <= end) {
          serviceMap[customer.service] = (serviceMap[customer.service] || 0) + customer.price;
        }
      }

      // Hantera serviceHistory
      if (customer.serviceHistory && customer.serviceHistory.length > 0) {
        customer.serviceHistory.forEach((serviceEntry: ServiceEntry) => {
          const serviceDate = new Date(serviceEntry.date);
          serviceDate.setHours(0, 0, 0, 0);

          if (isMembershipService(serviceEntry.service)) {
            const serviceStartDate = serviceDate;
            const serviceEndDate = getServiceEndDate(serviceEntry, end);
            const billingInterval = serviceEntry.billingInterval || 'Månadsvis';

            const revenue = calculateMembershipRevenue(
              { ...serviceEntry, billingInterval },
              serviceStartDate,
              serviceEndDate,
              start,
              end
            );
            
            serviceMap[serviceEntry.service] = (serviceMap[serviceEntry.service] || 0) + revenue;
          } else {
            // För tester: engångsbetalning
            if (serviceDate >= start && serviceDate <= end) {
              serviceMap[serviceEntry.service] = (serviceMap[serviceEntry.service] || 0) + serviceEntry.price;
            }
          }
        });
      }
    });

    return Object.entries(serviceMap)
      .map(([service, revenue]) => ({
        service,
        revenue: Math.round(revenue),
      }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [filteredCustomers, startDate, endDate]);

  // Totalt intäkt
  const totalRevenue = useMemo(() => {
    return monthlyRevenue.reduce((sum, month) => sum + month.revenue, 0);
  }, [monthlyRevenue]);

  // Intäkter per ort
  const revenueByPlace = useMemo(() => {
    const placeMap: Record<string, number> = {};
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    filteredCustomers.forEach((customer) => {
      if (isMembershipService(customer.service)) {
        const membershipStart = new Date(customer.date);
        membershipStart.setHours(0, 0, 0, 0);
        const membershipEnd = getServiceEndDate(customer, end);
        
        // Hämta billingInterval från customer (kan finnas i serviceHistory eller som default)
        const billingInterval = customer.serviceHistory?.find(sh => sh.service === customer.service)?.billingInterval 
          || (isMembershipService(customer.service) ? 'Månadsvis' : 'Engångsbetalning');

        const revenue = calculateMembershipRevenue(
          { ...customer, billingInterval },
          membershipStart,
          membershipEnd,
          start,
          end
        );
        
        placeMap[customer.place] = (placeMap[customer.place] || 0) + revenue;
      } else {
        // För tester: engångsbetalning
        const customerDate = new Date(customer.date);
        customerDate.setHours(0, 0, 0, 0);

        if (customerDate >= start && customerDate <= end) {
          placeMap[customer.place] = (placeMap[customer.place] || 0) + customer.price;
        }
      }

      if (customer.serviceHistory && customer.serviceHistory.length > 0) {
        customer.serviceHistory.forEach((serviceEntry: ServiceEntry) => {
          const serviceDate = new Date(serviceEntry.date);
          serviceDate.setHours(0, 0, 0, 0);

          if (isMembershipService(serviceEntry.service)) {
            const serviceStartDate = serviceDate;
            const serviceEndDate = getServiceEndDate(serviceEntry, end);
            const billingInterval = serviceEntry.billingInterval || 'Månadsvis';

            const revenue = calculateMembershipRevenue(
              { ...serviceEntry, billingInterval },
              serviceStartDate,
              serviceEndDate,
              start,
              end
            );
            
            placeMap[customer.place] = (placeMap[customer.place] || 0) + revenue;
          } else {
            if (serviceDate >= start && serviceDate <= end) {
              placeMap[customer.place] = (placeMap[customer.place] || 0) + serviceEntry.price;
            }
          }
        });
      }
    });

    return Object.entries(placeMap)
      .map(([place, revenue]) => ({
        place,
        revenue: Math.round(revenue),
      }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [filteredCustomers, startDate, endDate]);

  const COLORS = ['#1E5A7D', '#0C3B5C', '#3B9DD6', '#5FB3D3', '#7FC8E8', '#9FDDFD'];

  return (
    <div className="space-y-6">
      <Header
        title="Intäkter över tid"
        subtitle="Detaljerad översikt över intäkter per tjänst, ort och månad"
      />

      {/* Aktiva filter */}
      {(selectedPlaces.length > 0 || selectedServices.length > 0) && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-blue-900">Aktiva filter:</span>
            {selectedPlaces.length > 0 && (
              <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm font-medium">
                {selectedPlaces.length} ort{selectedPlaces.length > 1 ? 'er' : ''}
              </span>
            )}
            {selectedServices.length > 0 && (
              <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-sm font-medium">
                {selectedServices.length} tjänst{selectedServices.length > 1 ? 'er' : ''}
              </span>
            )}
            <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-sm font-medium">
              {new Date(startDate).toLocaleDateString('sv-SE')} - {new Date(endDate).toLocaleDateString('sv-SE')}
            </span>
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Datum-filter */}
        <div className="bg-white rounded-lg shadow p-6">
          <label className="block text-sm font-medium text-gray-900 mb-2">
            <Calendar className="w-4 h-4 inline mr-1" />
            Från datum
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E5A7D] text-gray-900"
          />
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <label className="block text-sm font-medium text-gray-900 mb-2">
            <Calendar className="w-4 h-4 inline mr-1" />
            Till datum
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E5A7D] text-gray-900"
          />
        </div>

        {/* Ort-filter */}
        <div className="bg-white rounded-lg shadow p-6">
          <label className="block text-sm font-medium text-gray-900 mb-2">
            <MapPin className="w-4 h-4 inline mr-1" />
            Filtrera på stad/ort
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

        {/* Tjänst-filter */}
        <div className="bg-white rounded-lg shadow p-6">
          <label className="block text-sm font-medium text-gray-900 mb-2">
            Filtrera på tjänst {selectedServices.length > 0 && <span className="text-[#1E5A7D]">({selectedServices.length} valda)</span>}
          </label>
          <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
            {[...MEMBERSHIPS, ...TESTS].map((service) => (
              <button
                key={service}
                onClick={() => {
                  if (selectedServices.includes(service)) {
                    setSelectedServices(selectedServices.filter(s => s !== service));
                  } else {
                    setSelectedServices([...selectedServices, service]);
                  }
                }}
                className={`px-2 py-1 rounded text-xs font-medium transition ${
                  selectedServices.includes(service)
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                title={service}
              >
                {service.length > 25 ? service.substring(0, 25) + '...' : service}
              </button>
            ))}
            {selectedServices.length > 0 && (
              <button
                onClick={() => setSelectedServices([])}
                className="px-2 py-1 rounded text-xs font-medium bg-gray-200 text-gray-700 hover:bg-gray-300 transition"
              >
                Rensa alla
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Totalt intäkt */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">Total intäkt för vald period</p>
            <p className="text-4xl font-bold text-gray-900 mt-2">
              {totalRevenue.toLocaleString('sv-SE')} kr
            </p>
          </div>
          <DollarSign className="w-16 h-16 text-green-600" />
        </div>
      </div>

      {/* Diagram: Intäkter över tid */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Intäkter över tid</h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={monthlyRevenue}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="monthLabel" 
              tick={{ fill: '#374151', fontSize: 12 }}
            />
            <YAxis 
              tick={{ fill: '#374151', fontSize: 12 }}
              tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
            />
            <Tooltip 
              formatter={(value: number) => [`${value.toLocaleString('sv-SE')} kr`, 'Intäkt']}
              labelStyle={{ color: '#374151' }}
            />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="revenue" 
              stroke="#1E5A7D" 
              strokeWidth={3}
              name="Intäkt (kr)"
              dot={{ fill: '#1E5A7D', r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Diagram: Intäkter per tjänst */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Intäkter per tjänst</h2>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={revenueByService.slice(0, 10)}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="service" 
                angle={-45}
                textAnchor="end"
                height={120}
                tick={{ fill: '#374151', fontSize: 10 }}
              />
              <YAxis 
                tick={{ fill: '#374151', fontSize: 12 }}
                tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip 
                formatter={(value: number) => [`${value.toLocaleString('sv-SE')} kr`, 'Intäkt']}
                labelStyle={{ color: '#374151' }}
              />
              <Legend />
              <Bar dataKey="revenue" fill="#1E5A7D" name="Intäkt (kr)" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Intäkter per ort</h2>
          <ResponsiveContainer width="100%" height={400}>
            <PieChart>
              <Pie
                data={revenueByPlace}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ place, percent }: { place?: string; percent?: number }) => `${place || ''}: ${((percent || 0) * 100).toFixed(0)}%`}
                outerRadius={120}
                fill="#8884d8"
                dataKey="revenue"
              >
                {revenueByPlace.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value: number) => `${value.toLocaleString('sv-SE')} kr`}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tabell: Intäkter per tjänst */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Detaljerad intäkt per tjänst</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Tjänst
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Intäkt (kr)
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Andel (%)
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {revenueByService.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-6 py-4 text-center text-gray-500">
                    Inga intäkter för vald period
                  </td>
                </tr>
              ) : (
                revenueByService.map((item) => (
                  <tr key={item.service} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {item.service}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                      {item.revenue.toLocaleString('sv-SE')} kr
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-600">
                      {totalRevenue > 0 ? ((item.revenue / totalRevenue) * 100).toFixed(1) : 0}%
                    </td>
                  </tr>
                ))
              )}
              {revenueByService.length > 0 && (
                <tr className="bg-gray-50 font-semibold">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">Totalt</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                    {totalRevenue.toLocaleString('sv-SE')} kr
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">100%</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

