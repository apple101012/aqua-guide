import { useState, useCallback } from "react";
import { getAssistantLanguage, setAssistantLanguage } from "../lib/common";
import { languageCatalog } from "../lib/language-catalog";

export function useAssistantLanguage() {
  const [language, setLanguage] = useState(() => getAssistantLanguage());

  const changeLanguage = useCallback((lang) => {
    if (languageCatalog[lang]) {
      setAssistantLanguage(lang);
      setLanguage(lang);
    }
  }, []);

  return { language, changeLanguage };
}
