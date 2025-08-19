import { createContext, useContext } from "react";

// Light theme only - dark mode removed
type Theme = "light";

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  actualTheme: "light";
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

/**
 * Provides a theme context and handles theme setting logic for its children.
 * @example
 * ThemeProvider({ children: <YourComponent /> })
 * // Wraps `YourComponent` with theme context
 * @param {Object} { children: React.ReactNode } - The children components that require access to the theme context.
 * @returns {JSX.Element} A ThemeContext.Provider component wrapping the provided children with theme context.
 */
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