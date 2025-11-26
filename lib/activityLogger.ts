// Aktivitetsloggning för användaraktiviteter
import { getCurrentUser } from './auth';

export type ActivityType = 
  | 'page_view'
  | 'customer_view'
  | 'customer_create'
  | 'customer_update'
  | 'customer_delete'
  | 'invoice_update'
  | 'payment_status_update'
  | 'report_generate'
  | 'export_data'
  | 'settings_change'
  | 'login'
  | 'logout';

export interface ActivityLog {
  id: string;
  timestamp: Date;
  userId: string;
  userEmail: string;
  userRole: string;
  activityType: ActivityType;
  description: string;
  details?: {
    page?: string;
    customerId?: string;
    customerName?: string;
    action?: string;
    [key: string]: any;
  };
}

const ACTIVITY_LOG_KEY = 'activity_logs';

// Hämta alla loggar från localStorage
export const getActivityLogs = (): ActivityLog[] => {
  if (typeof window === 'undefined') return [];
  
  const stored = localStorage.getItem(ACTIVITY_LOG_KEY);
  if (!stored) return [];
  
  try {
    const logs = JSON.parse(stored);
    return logs.map((log: any) => ({
      ...log,
      timestamp: new Date(log.timestamp),
    }));
  } catch {
    return [];
  }
};

// Spara logg till localStorage
const saveActivityLog = (log: ActivityLog): void => {
  if (typeof window === 'undefined') return;
  
  const logs = getActivityLogs();
  logs.unshift(log); // Lägg till i början
  
  // Behåll max 1000 loggar
  const maxLogs = 1000;
  const trimmedLogs = logs.slice(0, maxLogs);
  
  localStorage.setItem(ACTIVITY_LOG_KEY, JSON.stringify(trimmedLogs));
};

// Skapa en aktivitetslogg
export const logActivity = (
  activityType: ActivityType,
  description: string,
  details?: ActivityLog['details']
): void => {
  const user = getCurrentUser();
  
  if (!user) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('Kan inte logga aktivitet: Ingen användare inloggad');
    }
    return;
  }
  
  const userEmail = user.email || 'unknown';
  const userId = user.uid || 'unknown';
  
  // Hämta roll (försök hämta från user objektet eller bestäm från e-post)
  let userRole = 'unknown';
  if ('role' in user && user.role) {
    userRole = user.role;
  } else {
    const emailLower = userEmail.toLowerCase();
    if (emailLower.includes('coach') || emailLower.includes('tranare')) {
      userRole = 'coach';
    } else if (emailLower.includes('platschef') || emailLower.includes('manager')) {
      userRole = 'platschef';
    } else {
      userRole = 'admin';
    }
  }
  
  const log: ActivityLog = {
    id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date(),
    userId,
    userEmail,
    userRole,
    activityType,
    description,
    details,
  };
  
  saveActivityLog(log);
};

// Hjälpfunktioner för vanliga aktiviteter
export const logPageView = (page: string): void => {
  logActivity('page_view', `Besökte sidan: ${page}`, { page });
};

export const logCustomerView = (customerId: string, customerName: string): void => {
  logActivity('customer_view', `Visade kund: ${customerName}`, {
    customerId,
    customerName,
  });
};

export const logCustomerCreate = (customerId: string, customerName: string): void => {
  logActivity('customer_create', `Skapade ny kund: ${customerName}`, {
    customerId,
    customerName,
  });
};

export const logCustomerUpdate = (customerId: string, customerName: string, changes?: string): void => {
  logActivity('customer_update', `Uppdaterade kund: ${customerName}${changes ? ` (${changes})` : ''}`, {
    customerId,
    customerName,
    action: changes,
  });
};

export const logCustomerDelete = (customerId: string, customerName: string): void => {
  logActivity('customer_delete', `Tog bort kund: ${customerName}`, {
    customerId,
    customerName,
  });
};

export const logInvoiceUpdate = (customerId: string, customerName: string, action: string): void => {
  logActivity('invoice_update', `Uppdaterade fakturering för: ${customerName}`, {
    customerId,
    customerName,
    action,
  });
};

export const logPaymentStatusUpdate = (customerId: string, customerName: string, status: string): void => {
  logActivity('payment_status_update', `Ändrade utbetalningsstatus för: ${customerName} till ${status}`, {
    customerId,
    customerName,
    status,
  });
};

export const logReportGenerate = (reportName: string, reportType: string): void => {
  logActivity('report_generate', `Genererade rapport: ${reportName}`, {
    reportName,
    reportType,
  });
};

export const logExportData = (dataType: string): void => {
  logActivity('export_data', `Exporterade data: ${dataType}`, {
    dataType,
  });
};

export const logLogin = (): void => {
  const user = getCurrentUser();
  const userEmail = user?.email || 'unknown';
  logActivity('login', `Loggade in: ${userEmail}`);
};

export const logLogout = (): void => {
  const user = getCurrentUser();
  const userEmail = user?.email || 'unknown';
  logActivity('logout', `Loggade ut: ${userEmail}`);
};

// Rensa gamla loggar (behåll senaste X dagar)
export const cleanOldLogs = (daysToKeep: number = 30): void => {
  if (typeof window === 'undefined') return;
  
  const logs = getActivityLogs();
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
  
  const filteredLogs = logs.filter(log => log.timestamp >= cutoffDate);
  localStorage.setItem(ACTIVITY_LOG_KEY, JSON.stringify(filteredLogs));
};




