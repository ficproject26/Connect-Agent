import React, { createContext, useContext, useState, useEffect } from 'react';

type Theme = 'light' | 'dark';
type Language = 'en' | 'hi' | 'kn' | 'ta';

interface ThemeContextType {
  theme: Theme;
  language: Language;
  toggleTheme: () => void;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const translations: Record<Language, Record<string, string>> = {
  en: {
    dashboard: 'Dashboard',
    orders: 'Orders',
    active_delivery: 'Active Delivery',
    wallet: 'Wallet',
    history: 'History',
    attendance: 'Attendance',
    notifications: 'Notifications',
    profile: 'Profile',
    settings: 'Settings',
    support: 'Support',
    future_features: 'Future Features',
    jobs: 'Jobs',
    schedule: 'Subscriptions',
    revenue: 'Revenue',
    reports: 'Reports',
    shift_status: 'Shift Status',
    checked_out: 'Checked Out',
    offline: 'Offline',
    online: 'Online (Ready)',
    busy: 'Busy (On Job)',
    break: 'On Break',
    bookings: 'Bookings',
    rooms: 'Rooms',
    housekeeping: 'Housekeeping',
    complaints: 'Complaints',
    trips: 'Trips',
    drivers: 'Drivers',
    vehicles: 'Vehicles',
    assignments: 'Assignments',
    verifications: 'Pending Approvals',
  },
  hi: {
    dashboard: 'डैशबोर्ड',
    orders: 'ऑर्डर',
    active_delivery: 'सक्रिय वितरण',
    wallet: 'बटुआ',
    history: 'इतिहास',
    attendance: 'उपस्थिति',
    notifications: 'सूचनाएं',
    profile: 'प्रोफ़ाइल',
    settings: 'सेटिंग्स',
    support: 'सहायता',
    future_features: 'भविष्य की विशेषताएं',
    jobs: 'कार्य',
    schedule: 'अनुसूची',
    revenue: 'राजस्व',
    reports: 'रिपोर्ट',
    shift_status: 'शिफ्ट की स्थिति',
    checked_out: 'चेक आउट',
    offline: 'ऑफ़लाइन',
    online: 'ऑनलाइन (तैयार)',
    busy: 'व्यस्त',
    break: 'ब्रेक पर',
    bookings: 'बुकिंग',
    rooms: 'कमरे',
    housekeeping: 'सफाई व्यवस्था',
    complaints: 'शिकायतें',
    trips: 'यात्राएं',
    drivers: 'ड्राइवर',
    vehicles: 'वाहन',
    assignments: 'कार्य आवंटन',
    verifications: 'सत्यापन लंबित',
  },
  kn: {
    dashboard: 'ಡ್ಯಾಶ್‌ಬೋರ್ಡ್',
    orders: 'ಆರ್ಡರ್‌ಗಳು',
    active_delivery: 'ಸಕ್ರಿಯ ವಿತರಣೆ',
    wallet: 'ವ್ಯಾಲೆಟ್',
    history: 'ಇತಿಹಾಸ',
    attendance: 'ಹಾಜರಾತಿ',
    notifications: 'ಅಧಿಸೂಚನೆಗಳು',
    profile: 'ಪ್ರೊಫೈಲ್',
    settings: 'ಸಂಯೋಜನೆಗಳು',
    support: 'ಬೆಂಬಲ',
    future_features: 'ಭವಿಷ್ಯದ ವೈಶಿಷ್ಟ್ಯಗಳು',
    jobs: 'ಕೆಲಸಗಳು',
    schedule: 'ವೇಳಾಪಟ್ಟಿ',
    revenue: 'ಆದಾಯ',
    reports: 'ವರದಿಗಳು',
    shift_status: 'ಶಿಫ್ಟ್ ಸ್ಥಿತಿ',
    checked_out: 'ಚೆಕ್ ಔಟ್',
    offline: 'ಆಫ್‌ಲೈನ್',
    online: 'ಆನ್‌ಲೈನ್',
    busy: 'ಕಾರ್ಯನಿರತ',
    break: 'ವಿರಾಮ',
    bookings: 'ಬುಕಿಂಗ್‌ಗಳು',
    rooms: 'ಕೊಠಡಿಗಳು',
    housekeeping: 'ಮನೆಗೆಲಸ',
    complaints: 'ದೂರುಗಳು',
    trips: 'ಪ್ರವಾಸಗಳು',
    drivers: 'ಚಾಲಕರು',
    vehicles: 'ವಾಹನಗಳು',
    assignments: 'ನಿಯೋಜನೆಗಳು',
    verifications: 'ಅನುಮೋದನೆ ಬಾಕಿ',
  },
  ta: {
    dashboard: 'டாஷ்போர்டு',
    orders: 'ஆர்டர்கள்',
    active_delivery: 'செயலில் உள்ள விநியோகம்',
    wallet: 'வாலட்',
    history: 'வரலாறு',
    attendance: 'வருகை',
    notifications: 'அறிவிப்புகள்',
    profile: 'சுயவிவரம்',
    settings: 'அமைப்புகள்',
    support: 'ஆதரவு',
    future_features: 'எதிர்கால அம்சங்கள்',
    jobs: 'பணிகள்',
    schedule: 'அட்டவணை',
    revenue: 'வருவாய்',
    reports: 'அறிக்கைகள்',
    shift_status: 'ஷிப்ட் நிலை',
    checked_out: 'வெளியேறியது',
    offline: 'ஆஃப்லைன்',
    online: 'ஆன்லைன்',
    busy: 'வேலையில் உள்ளார்',
    break: 'ஓய்வு',
    bookings: 'பதிவுகள்',
    rooms: 'அறைகள்',
    housekeeping: 'துப்புரவு பணி',
    complaints: 'புகார்கள்',
    trips: 'பயணங்கள்',
    drivers: 'ஓட்டுநர்கள்',
    vehicles: 'வாகனங்கள்',
    assignments: 'ஒதுக்கீடுகள்',
    verifications: 'சரிபார்ப்பு நிலுவையில்',
  }
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const theme: Theme = 'light';

  useEffect(() => {
    // Ensure light mode is always active and dark classes are removed
    const root = window.document.documentElement;
    root.classList.remove('dark');
    document.body.classList.remove('dark');
    localStorage.setItem('forge-theme', 'light');
  }, []);

  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('forge-lang');
    return (saved === 'en' || saved === 'hi' || saved === 'kn' || saved === 'ta') ? saved : 'en';
  });

  // No-op: dark mode is permanently disabled
  const toggleTheme = () => {};

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('forge-lang', lang);
  };

  const t = (key: string): string => {
    return translations[language][key] || translations['en'][key] || key;
  };

  return (
    <ThemeContext.Provider value={{ theme, language, toggleTheme, setLanguage, t }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
