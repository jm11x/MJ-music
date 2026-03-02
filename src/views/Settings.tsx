import React, { useState } from 'react';
import { ArrowLeft, Video, ChevronDown, ChevronUp } from 'lucide-react';
import { useSettings, AppSettings } from '../contexts/SettingsContext';

interface SettingsProps {
  onBack?: () => void;
  onVideoWallpaperChange?: (url: string | undefined) => void;
}

const SectionHeader = ({ title, expandedSection, toggleSection }: { title: string, expandedSection: string | null, toggleSection: (s: string) => void }) => (
  <button 
    onClick={() => toggleSection(title)}
    className="w-full flex justify-between items-center text-sm font-semibold text-white/70 uppercase tracking-wider mb-4 hover:text-white transition-colors"
  >
    {title}
    {expandedSection === title ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
  </button>
);

const Slider = ({ label, value, min, max, onChange, unit = '', step = 1 }: any) => (
  <div className="flex flex-col space-y-2 py-2">
    <div className="flex justify-between text-sm">
      <span>{label}</span>
      <span className="text-white/50">{value}{unit}</span>
    </div>
    <input 
      type="range" 
      min={min} 
      max={max} 
      step={step}
      value={value} 
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full"
    />
  </div>
);

const Toggle = ({ label, checked, onChange }: any) => (
  <div className="flex justify-between items-center py-3">
    <span className="text-sm">{label}</span>
    <div 
      onClick={() => onChange(!checked)}
      className={`w-12 h-6 rounded-full relative cursor-pointer transition-colors ${checked ? 'bg-cyan-400' : 'bg-white/20'}`}
    >
      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${checked ? 'right-1' : 'left-1'}`} />
    </div>
  </div>
);

const Select = ({ label, value, options, onChange }: any) => (
  <div className="flex justify-between items-center py-3">
    <span className="text-sm">{label}</span>
    <select 
      value={value} 
      onChange={(e) => onChange(e.target.value)}
      className="bg-black/50 border border-white/10 rounded-lg px-3 py-1 text-sm text-white outline-none focus:border-cyan-400"
    >
      {options.map((opt: any) => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  </div>
);

export const Settings: React.FC<SettingsProps> = ({ onBack, onVideoWallpaperChange }) => {
  const { settings, updateSetting } = useSettings();
  const [expandedSection, setExpandedSection] = useState<string | null>('Appearance');

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const url = URL.createObjectURL(e.target.files[0]);
      if (onVideoWallpaperChange) onVideoWallpaperChange(url);
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSection(prev => prev === section ? null : section);
  };

  return (
    <div className="h-full flex flex-col p-6 overflow-y-auto pb-32">
      <div className="flex items-center space-x-4 mb-8">
        <button onClick={onBack} className="p-2 -ml-2 text-white/70 hover:text-white transition-colors">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>
      </div>
      
      <div className="space-y-6">
        {/* Appearance */}
        <section className="glass-panel rounded-2xl p-4">
          <SectionHeader title="Appearance" expandedSection={expandedSection} toggleSection={toggleSection} />
          {expandedSection === 'Appearance' && (
            <div className="space-y-2 animate-in slide-in-from-top-2 duration-200">
              <Select 
                label="Background Mode" 
                value={settings.backgroundMode} 
                options={[{label: 'Liquid', value: 'liquid'}, {label: 'Cinematic', value: 'cinematic'}]}
                onChange={(v: any) => updateSetting('backgroundMode', v)}
              />
              <Slider label="Glass Blur" value={settings.glassBlur} min={0} max={40} unit="px" onChange={(v: number) => updateSetting('glassBlur', v)} />
              <Slider label="Frost Strength" value={settings.frostStrength} min={0} max={1} step={0.1} onChange={(v: number) => updateSetting('frostStrength', v)} />
              <Slider label="Glass Depth" value={settings.glassDepth} min={0} max={100} unit="%" onChange={(v: number) => updateSetting('glassDepth', v)} />
              <Toggle label="Refraction Animation" checked={settings.refractionEnabled} onChange={(v: boolean) => updateSetting('refractionEnabled', v)} />
              <Toggle label="Dynamic Lighting" checked={settings.dynamicLighting} onChange={(v: boolean) => updateSetting('dynamicLighting', v)} />
              
              <div className="h-px bg-white/10 w-full my-4" />
              
              <Select 
                label="Album Style" 
                value={settings.albumStyle} 
                options={[
                  {label: 'Immersive', value: 'immersive'},
                  {label: 'Floating Glass', value: 'floating'}, 
                  {label: 'Rounded Frame', value: 'rounded'},
                  {label: 'Circular', value: 'circular'},
                  {label: 'Elevated', value: 'elevated'},
                  {label: '3D Parallax', value: 'parallax'}
                ]}
                onChange={(v: any) => updateSetting('albumStyle', v)}
              />
              <Slider label="Corner Radius" value={settings.albumCornerRadius} min={0} max={100} unit="px" onChange={(v: number) => updateSetting('albumCornerRadius', v)} />
              
              <div className="h-px bg-white/10 w-full my-4" />
              
              <div className="flex justify-between items-center py-3">
                <div className="flex items-center space-x-3">
                  <Video size={20} className="text-white/70" />
                  <span className="text-sm">Video Wallpaper</span>
                </div>
                <div className="flex space-x-2">
                  <label className="text-xs bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-full cursor-pointer transition-colors">
                    Select
                    <input type="file" accept="video/*" className="hidden" onChange={handleVideoChange} />
                  </label>
                  <button onClick={() => onVideoWallpaperChange && onVideoWallpaperChange(undefined)} className="text-xs bg-red-500/20 hover:bg-red-500/40 text-red-200 px-3 py-1.5 rounded-full transition-colors">
                    Clear
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Controls */}
        <section className="glass-panel rounded-2xl p-4">
          <SectionHeader title="Controls" expandedSection={expandedSection} toggleSection={toggleSection} />
          {expandedSection === 'Controls' && (
            <div className="space-y-2 animate-in slide-in-from-top-2 duration-200">
              <Toggle label="Enable Physics" checked={settings.physicsEnabled} onChange={(v: boolean) => updateSetting('physicsEnabled', v)} />
              {settings.physicsEnabled && (
                <>
                  <Slider label="Spring Stiffness" value={settings.springStiffness} min={100} max={500} onChange={(v: number) => updateSetting('springStiffness', v)} />
                  <Slider label="Damping Ratio" value={settings.dampingRatio} min={0} max={50} onChange={(v: number) => updateSetting('dampingRatio', v)} />
                  <Slider label="Bounce Intensity" value={settings.bounceIntensity} min={0} max={100} onChange={(v: number) => updateSetting('bounceIntensity', v)} />
                </>
              )}
              <Select 
                label="Button Shape" 
                value={settings.buttonShape} 
                options={[
                  {label: 'Circular', value: 'circular'}, 
                  {label: 'Rounded', value: 'rounded'},
                  {label: 'Pill', value: 'pill'},
                  {label: 'Minimal', value: 'minimal'}
                ]}
                onChange={(v: any) => updateSetting('buttonShape', v)}
              />
            </div>
          )}
        </section>

        {/* Visual Effects */}
        <section className="glass-panel rounded-2xl p-4">
          <SectionHeader title="Visual Effects" expandedSection={expandedSection} toggleSection={toggleSection} />
          {expandedSection === 'Visual Effects' && (
            <div className="space-y-2 animate-in slide-in-from-top-2 duration-200">
              <Toggle label="Beat Reactive Glow" checked={settings.beatReactiveGlow} onChange={(v: boolean) => updateSetting('beatReactiveGlow', v)} />
              <Toggle label="Enable Parallax" checked={settings.parallaxEnabled} onChange={(v: boolean) => updateSetting('parallaxEnabled', v)} />
              {settings.parallaxEnabled && (
                <Slider label="Parallax Strength" value={settings.parallaxStrength} min={0} max={100} onChange={(v: number) => updateSetting('parallaxStrength', v)} />
              )}
              
              <div className="h-px bg-white/10 w-full my-4" />
              
              <Toggle label="Enable Visualizer" checked={settings.visualizerEnabled} onChange={(v: boolean) => updateSetting('visualizerEnabled', v)} />
              {settings.visualizerEnabled && (
                <>
                  <Select 
                    label="Visualizer Mode" 
                    value={settings.visualizerMode} 
                    options={[{label: 'Bars', value: 'bars'}, {label: 'Waveform', value: 'waveform'}, {label: 'Ambient', value: 'ambient'}]}
                    onChange={(v: any) => updateSetting('visualizerMode', v)}
                  />
                  <Slider label="Opacity" value={settings.visualizerOpacity} min={0} max={100} unit="%" onChange={(v: number) => updateSetting('visualizerOpacity', v)} />
                </>
              )}
              
              <div className="h-px bg-white/10 w-full my-4" />
              
              <Toggle label="Edge Distortion" checked={settings.edgeDistortionEnabled} onChange={(v: boolean) => updateSetting('edgeDistortionEnabled', v)} />
              <Toggle label="Cinematic Grain" checked={settings.grainEnabled} onChange={(v: boolean) => updateSetting('grainEnabled', v)} />
              <Slider label="Vignette Intensity" value={settings.vignetteIntensity} min={0} max={100} unit="%" onChange={(v: number) => updateSetting('vignetteIntensity', v)} />
            </div>
          )}
        </section>

        {/* Performance */}
        <section className="glass-panel rounded-2xl p-4">
          <SectionHeader title="Performance" expandedSection={expandedSection} toggleSection={toggleSection} />
          {expandedSection === 'Performance' && (
            <div className="space-y-2 animate-in slide-in-from-top-2 duration-200">
              <Toggle label="Reduce Animation" checked={settings.reduceAnimation} onChange={(v: boolean) => updateSetting('reduceAnimation', v)} />
              <Toggle label="Disable Dynamic Lighting" checked={settings.disableDynamicLighting} onChange={(v: boolean) => updateSetting('disableDynamicLighting', v)} />
              <Toggle label="Lower Blur Quality" checked={settings.lowerBlurQuality} onChange={(v: boolean) => updateSetting('lowerBlurQuality', v)} />
              <Toggle label="Battery Saver Mode" checked={settings.batterySaver} onChange={(v: boolean) => updateSetting('batterySaver', v)} />
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
