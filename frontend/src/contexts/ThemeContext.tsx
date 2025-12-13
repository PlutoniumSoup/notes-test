import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type Theme = 'light' | 'dark' | 'dark-black';
export type ColorScheme = 'blue' | 'green' | 'purple' | 'red' | 'orange' | 'pink';

interface ThemeContextType {
  theme: Theme;
  colorScheme: ColorScheme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
  setColorScheme: (scheme: ColorScheme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    // Get theme from localStorage or default to 'dark' (premium dark theme)
    const saved = localStorage.getItem('theme');
    return (saved === 'light' || saved === 'dark' || saved === 'dark-black') ? saved : 'dark';
  });

  const [colorScheme, setColorSchemeState] = useState<ColorScheme>(() => {
    // Get color scheme from localStorage or default to 'blue'
    const saved = localStorage.getItem('colorScheme');
    return (saved === 'blue' || saved === 'green' || saved === 'purple' || saved === 'red' || saved === 'orange' || saved === 'pink') 
      ? saved 
      : 'blue';
  });

  // Apply initial theme and color scheme on mount
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.setAttribute('data-color-scheme', colorScheme);
  }, []);

  useEffect(() => {
    // Apply theme to document root
    document.documentElement.setAttribute('data-theme', theme);
    // Save to localStorage
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    // Apply color scheme to document root
    document.documentElement.setAttribute('data-color-scheme', colorScheme);
    // Save to localStorage
    localStorage.setItem('colorScheme', colorScheme);
  }, [colorScheme]);

  const toggleTheme = () => {
    // Header toggle only switches between light and dark
    // dark-black is only available in settings
    // If user is on dark-black and clicks toggle, switch to light (not dark)
    setThemeState(prev => {
      if (prev === 'light') return 'dark';
      // If current theme is dark or dark-black, switch to light
      return 'light';
    });
  };

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  const setColorScheme = (scheme: ColorScheme) => {
    setColorSchemeState(scheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, colorScheme, toggleTheme, setTheme, setColorScheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
