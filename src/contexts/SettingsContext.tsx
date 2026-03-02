import React, { createContext, useContext, useState, useEffect } from 'react';

export interface AppSettings {
  // Appearance
  glassBlur: number;
  frostStrength: number;
  refractionEnabled: boolean;
  glassDepth: number;
  dynamicLighting: boolean;
  lightingIntensity: number;
  lightingSpeed: number;
  
  // Background
  backgroundMode: 'liquid' | 'cinematic';
  bgAnimationSpeed: number;
  tintStrength: number;
  vignetteIntensity: number;
  grainEnabled: boolean;
  
  // Album
  albumStyle: 'floating' | 'rounded' | 'circular' | 'elevated' | 'parallax' | 'immersive';
  albumCornerRadius: number;
  albumDepth: number;
  parallaxEnabled: boolean;
  parallaxStrength: number;
  hoverAnimationEnabled: boolean;
  beatPulseEnabled: boolean;
  glowStrength: number;
  
  // Controls
  physicsEnabled: boolean;
  springStiffness: number;
  dampingRatio: number;
  bounceIntensity: number;
  hapticStrength: number;
  buttonShape: 'circular' | 'rounded' | 'pill' | 'minimal';
  beatReactiveGlow: boolean;
  beatGlowIntensity: number;
  
  // Visual Effects
  visualizerEnabled: boolean;
  visualizerMode: 'bars' | 'waveform' | 'ambient';
  visualizerOpacity: number;
  visualizerSensitivity: number;
  edgeDistortionEnabled: boolean;
  
  // Performance
  reduceAnimation: boolean;
  disableDynamicLighting: boolean;
  lowerBlurQuality: boolean;
  batterySaver: boolean;
}

const defaultSettings: AppSettings = {
  glassBlur: 20,
  frostStrength: 0.2,
  refractionEnabled: true,
  glassDepth: 50,
  dynamicLighting: true,
  lightingIntensity: 50,
  lightingSpeed: 50,
  backgroundMode: 'liquid',
  bgAnimationSpeed: 50,
  tintStrength: 50,
  vignetteIntensity: 50,
  grainEnabled: true,
  albumStyle: 'immersive',
  albumCornerRadius: 24,
  albumDepth: 50,
  parallaxEnabled: true,
  parallaxStrength: 50,
  hoverAnimationEnabled: true,
  beatPulseEnabled: true,
  glowStrength: 50,
  physicsEnabled: true,
  springStiffness: 300,
  dampingRatio: 20,
  bounceIntensity: 50,
  hapticStrength: 50,
  buttonShape: 'circular',
  beatReactiveGlow: true,
  beatGlowIntensity: 50,
  visualizerEnabled: true,
  visualizerMode: 'bars',
  visualizerOpacity: 30,
  visualizerSensitivity: 50,
  edgeDistortionEnabled: true,
  reduceAnimation: false,
  disableDynamicLighting: false,
  lowerBlurQuality: false,
  batterySaver: false,
};

interface SettingsContextType {
  settings: AppSettings;
  updateSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem('appSettings');
    return saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings;
  });

  useEffect(() => {
    localStorage.setItem('appSettings', JSON.stringify(settings));
    
    // Apply CSS variables based on settings
    const root = document.documentElement;
    root.style.setProperty('--glass-blur', `${settings.lowerBlurQuality ? settings.glassBlur / 2 : settings.glassBlur}px`);
    root.style.setProperty('--frost-strength', `${settings.frostStrength}`);
    root.style.setProperty('--glass-depth', `${settings.glassDepth}%`);
    root.style.setProperty('--album-radius', `${settings.albumCornerRadius}px`);
  }, [settings]);

  const updateSetting = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSetting }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) throw new Error('useSettings must be used within SettingsProvider');
  return context;
};
