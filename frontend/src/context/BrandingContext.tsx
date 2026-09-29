import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { getPublicBranding } from "../api/settings";

interface BrandingContextType {
  websiteName: string;
  companyName: string;
  tagline: string;
  usdToKhrRate: number;
  setBranding: (branding: { websiteName: string; companyName?: string; tagline?: string; usdToKhrRate?: number }) => void;
  refreshBranding: () => Promise<void>;
}

const STORAGE_WEBSITE_NAME = "smartloan_website_name";
const STORAGE_COMPANY_NAME = "smartloan_company_name";
const STORAGE_TAGLINE = "smartloan_tagline";
const STORAGE_EXCHANGE_RATE = "smartloan_usd_to_khr_rate";

const BrandingContext = createContext<BrandingContextType | undefined>(undefined);

export function BrandingProvider({ children }: { children: ReactNode }) {
  const [websiteName, setWebsiteName] = useState<string>(() => {
    return localStorage.getItem(STORAGE_WEBSITE_NAME) || "Smart Loan Platform";
  });

  const [companyName, setCompanyName] = useState<string>(() => {
    return localStorage.getItem(STORAGE_COMPANY_NAME) || "Smart Loan Enterprise";
  });

  const [tagline, setTagline] = useState<string>(() => {
    return localStorage.getItem(STORAGE_TAGLINE) || "Credit Suite";
  });

  const [usdToKhrRate, setUsdToKhrRate] = useState<number>(() => {
    const stored = localStorage.getItem(STORAGE_EXCHANGE_RATE);
    return stored ? Number(stored) || 4100 : 4100;
  });

  const refreshBranding = async () => {
    try {
      const data = await getPublicBranding();
      if (data.website_name) {
        setWebsiteName(data.website_name);
        localStorage.setItem(STORAGE_WEBSITE_NAME, data.website_name);
      }
      if (data.company_name) {
        setCompanyName(data.company_name);
        localStorage.setItem(STORAGE_COMPANY_NAME, data.company_name);
      }
      if (data.tagline) {
        setTagline(data.tagline);
        localStorage.setItem(STORAGE_TAGLINE, data.tagline);
      }
      if (data.usd_to_khr_rate) {
        const r = Number(data.usd_to_khr_rate) || 4100;
        setUsdToKhrRate(r);
        localStorage.setItem(STORAGE_EXCHANGE_RATE, String(r));
      }
    } catch {
      // Use fallback/cached state silently
    }
  };

  useEffect(() => {
    refreshBranding();
  }, []);

  const setBranding = (branding: { websiteName: string; companyName?: string; tagline?: string; usdToKhrRate?: number }) => {
    setWebsiteName(branding.websiteName);
    localStorage.setItem(STORAGE_WEBSITE_NAME, branding.websiteName);

    if (branding.companyName !== undefined) {
      setCompanyName(branding.companyName);
      localStorage.setItem(STORAGE_COMPANY_NAME, branding.companyName);
    }
    if (branding.tagline !== undefined) {
      setTagline(branding.tagline);
      localStorage.setItem(STORAGE_TAGLINE, branding.tagline);
    }
    if (branding.usdToKhrRate !== undefined) {
      setUsdToKhrRate(branding.usdToKhrRate);
      localStorage.setItem(STORAGE_EXCHANGE_RATE, String(branding.usdToKhrRate));
    }
  };

  return (
    <BrandingContext.Provider
      value={{
        websiteName,
        companyName,
        tagline,
        usdToKhrRate,
        setBranding,
        refreshBranding,
      }}
    >
      {children}
    </BrandingContext.Provider>
  );
}

export function useBranding(): BrandingContextType {
  const context = useContext(BrandingContext);
  if (!context) {
    throw new Error("useBranding must be used within a BrandingProvider");
  }
  return context;
}
