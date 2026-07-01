import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type UserType = 'self' | 'agent';
export type ThemeMode = 'light' | 'dark';

export interface SystemSettings {
  // Appearance
  themeMode: ThemeMode;

  // User Type
  userType: UserType;

  // Profile
  fullName: string;
  email: string;
  phone: string;
  address: string; // Address line 1
  address_line_2?: string;
  city?: string;
  postcode?: string;
  country?: string;

  // Declarant Information (locked after signup)
  declarantName?: string;
  declarantCapacity?: 'importer' | 'agent' | 'duty_representative' | 'employee_of_importer';
  declarantOrganisationName?: string;
  entityType?:
    | 'PERSON'
    | 'SOLE_TRADER'
    | 'PARTNERSHIP'
    | 'LTD_COMPANY'
    | 'LLP'
    | 'CHARITY'
    | 'TRUST'
    | 'OTHER_ORGANISATION';

  // Tax Registration
  hasEori: boolean;
  eori?: string;
  hasVat: boolean;
  vat?: string;

  // Bank Details (self only)
  bankAccountName?: string;
  bankSortCode?: string;
  bankAccountNumber?: string;

  // Agent Details
  agentId?: string;
  companyName?: string;
  agentContact?: string;
  agentRefundAllowed?: boolean;

  // Branding
  allowBranding: boolean;
  logo?: string;
  signature?: string;
  footerText?: string;

  // HMRC Gateway
  gatewayUserId?: string;
  gatewayPassword?: string;
}

interface SettingsContextType {
  settings: SystemSettings;
  updateSettings: (updates: Partial<SystemSettings>) => void;
  isLoaded: boolean;
}

const defaultSettings: SystemSettings = {
  themeMode: 'light',
  userType: 'self',
  fullName: '',
  email: '',
  phone: '',
  address: '',
  address_line_2: '',
  city: '',
  postcode: '',
  country: 'GB',
  hasEori: false,
  hasVat: false,
  allowBranding: false,
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<SystemSettings>(defaultSettings);
  const [isLoaded, setIsLoaded] = useState(false);

  const loadSettings = () => {
    const stored = localStorage.getItem('systemSettings');
    if (stored) {
      try {
        setSettings({ ...defaultSettings, ...JSON.parse(stored) });
      } catch (error) {
        console.error('Failed to load settings:', error);
        setSettings(defaultSettings);
      }
    } else {
      setSettings(defaultSettings);
    }
  };

  useEffect(() => {
    // Load settings from localStorage on mount
    loadSettings();
    setIsLoaded(true);

    // Listen for storage changes (e.g., when demo mode is entered)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'systemSettings') {
        loadSettings();
      }
    };

    // Listen for custom event when settings are updated programmatically
    const handleSettingsUpdate = () => {
      loadSettings();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('settingsUpdated', handleSettingsUpdate);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('settingsUpdated', handleSettingsUpdate);
    };
  }, []);

  const updateSettings = (updates: Partial<SystemSettings>) => {
    const newSettings = { ...settings, ...updates };
    setSettings(newSettings);
    localStorage.setItem('systemSettings', JSON.stringify(newSettings));
    // Dispatch custom event to notify other components
    window.dispatchEvent(new Event('settingsUpdated'));
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, isLoaded }}>
      {children}
    </SettingsContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within SettingsProvider');
  }
  return context;
}
