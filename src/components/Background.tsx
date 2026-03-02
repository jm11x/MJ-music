import React, { useEffect, useState, useRef } from 'react';
// @ts-ignore
import ColorThief from 'colorthief';
import { useSettings } from '../contexts/SettingsContext';

export const Background = ({ coverUrl, videoUrl, isPlaying }: { coverUrl?: string, videoUrl?: string, isPlaying?: boolean }) => {
  const [colors, setColors] = useState<string[]>(['#1e3a8a', '#4c1d95', '#9d174d', '#ea580c']);
  const imgRef = useRef<HTMLImageElement>(null);
  const { settings } = useSettings();

  useEffect(() => {
    if (coverUrl && imgRef.current) {
      const img = imgRef.current;
      const extractColors = () => {
        try {
          // @ts-ignore
          const colorThief = new ColorThief();
          const palette = colorThief.getPalette(img, 4);
          if (palette && palette.length >= 4) {
            setColors(palette.map((p: number[]) => `rgb(${p[0]}, ${p[1]}, ${p[2]})`));
          }
        } catch (e) {
          console.error("Color extraction failed", e);
        }
      };

      if (img.complete) {
        extractColors();
      } else {
        img.addEventListener('load', extractColors);
        return () => img.removeEventListener('load', extractColors);
      }
    } else {
      setColors(['#1e3a8a', '#4c1d95', '#9d174d', '#ea580c']);
    }
  }, [coverUrl]);

  return (
    <div className="fixed inset-0 z-[-1] overflow-hidden bg-transparent">
      {/* Base Animated Gradient - Always visible */}
      <div 
        className="bg-liquid w-full h-full absolute inset-0 transition-all duration-1000"
        style={{
          backgroundImage: `linear-gradient(125deg, ${colors[0]}, ${colors[1]}, ${colors[2]}, ${colors[3]}, ${colors[0]})`,
          backgroundSize: '400% 400%',
          animationDuration: `${100 - settings.bgAnimationSpeed + 10}s`
        }}
      >
        {!settings.reduceAnimation && (
          <>
            <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full mix-blend-screen filter blur-[100px] animate-pulse" style={{ backgroundColor: colors[1], animationDuration: '8s', opacity: 0.5 }} />
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full mix-blend-screen filter blur-[100px] animate-pulse" style={{ backgroundColor: colors[2], animationDuration: '12s', opacity: 0.5 }} />
          </>
        )}
      </div>

      {/* Video Wallpaper (if any) */}
      {videoUrl && (
        <video 
          src={videoUrl} 
          autoPlay 
          loop 
          muted 
          className="absolute inset-0 w-full h-full object-cover opacity-80"
        />
      )}

      {/* Cinematic Mode Overlay */}
      {settings.backgroundMode === 'cinematic' && coverUrl && !videoUrl && (
        <div className="absolute inset-0 transition-opacity duration-1000 ease-in-out">
          <div 
            className="absolute inset-0 bg-cover bg-center scale-110"
            style={{ 
              backgroundImage: `url(${coverUrl})`, 
              filter: `blur(${settings.glassBlur * 2}px) saturate(${100 + settings.tintStrength}%)`,
              opacity: settings.tintStrength / 100
            }}
          />
        </div>
      )}
      
      {/* Liquid Mode Cover Overlay */}
      {settings.backgroundMode === 'liquid' && coverUrl && !videoUrl && (
        <>
          <img ref={imgRef} src={coverUrl} crossOrigin="anonymous" className="hidden" alt="cover" />
          <div className="absolute inset-0 transition-opacity duration-1000 ease-in-out mix-blend-overlay pointer-events-none" style={{ opacity: settings.tintStrength / 100 }}>
            <div 
              className="absolute inset-0 bg-cover bg-center scale-110"
              style={{ backgroundImage: `url(${coverUrl})`, filter: 'blur(60px)' }}
            />
          </div>
        </>
      )}

      {/* Visualizer removed as requested */}

      {settings.vignetteIntensity > 0 && (
        <div className="vignette" style={{ opacity: settings.vignetteIntensity / 100 }} />
      )}
      
      {settings.grainEnabled && (
        <div className="cinematic-grain" />
      )}
    </div>
  );
};
