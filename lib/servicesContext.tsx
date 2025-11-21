'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getAllServicesAndPrices, subscribeToServicesAndPrices, ServicePrice } from './realtimeDatabase';

interface ServicesContextType {
  services: ServicePrice[];
  loading: boolean;
  getServiceByName: (name: string) => ServicePrice | undefined;
  getServicesByCategory: (category: string) => ServicePrice[];
  getAllServiceNames: () => string[];
}

const ServicesContext = createContext<ServicesContextType | undefined>(undefined);

export function ServicesProvider({ children }: { children: ReactNode }) {
  const [services, setServices] = useState<ServicePrice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initial load
    const loadServices = async () => {
      try {
        const loadedServices = await getAllServicesAndPrices();
        setServices(loadedServices);
      } catch (error) {
        console.error('Error loading services:', error);
      } finally {
        setLoading(false);
      }
    };

    loadServices();

    // Subscribe to real-time updates
    const unsubscribe = subscribeToServicesAndPrices((updatedServices) => {
      setServices(updatedServices);
      setLoading(false);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const getServiceByName = (name: string): ServicePrice | undefined => {
    return services.find(s => s.service === name);
  };

  const getServicesByCategory = (category: string): ServicePrice[] => {
    return services.filter(s => s.category === category);
  };

  const getAllServiceNames = (): string[] => {
    return services.map(s => s.service).sort();
  };

  return (
    <ServicesContext.Provider
      value={{
        services,
        loading,
        getServiceByName,
        getServicesByCategory,
        getAllServiceNames,
      }}
    >
      {children}
    </ServicesContext.Provider>
  );
}

export function useServices() {
  const context = useContext(ServicesContext);
  if (context === undefined) {
    throw new Error('useServices must be used within a ServicesProvider');
  }
  return context;
}

