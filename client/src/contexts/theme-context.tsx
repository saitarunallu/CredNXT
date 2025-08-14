import { createContext, useContext } from "react";

// Light theme only - dark mode removed
type Theme = "light";

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  actualTheme: "light";
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Always use light theme
  const theme: Theme = "light";
  const actualTheme: "light" = "light";

  const handleSetTheme = (newTheme: Theme) => {
    // Force light theme only - no console logging needed
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme: handleSetTheme, actualTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}