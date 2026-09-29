import { useEffect } from "react";
import { useBranding } from "../context/BrandingContext";

export function useDocumentTitle(title: string): void {
  let websiteName = "Smart Loan Platform";
  try {
    const branding = useBranding();
    if (branding?.websiteName) {
      websiteName = branding.websiteName;
    }
  } catch {
    websiteName = localStorage.getItem("smartloan_website_name") || "Smart Loan Platform";
  }

  useEffect(() => {
    const previous = document.title;
    document.title = title ? `${title} — ${websiteName}` : websiteName;
    return () => {
      document.title = previous;
    };
  }, [title, websiteName]);
}
