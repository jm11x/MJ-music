import React, { useEffect, useState, useRef } from 'react';
// @ts-ignore
import ColorThief from 'colorthief';
import { useSettings } from '../contexts/SettingsContext';
import { motion, AnimatePresence } from 'framer-motion';

export const Background = ({ coverUrl, videoUrl, isPlaying, analyzer }: { coverUrl?: string, videoUrl?: string, isPlaying?: boolean, analyzer?: AnalyserNode | null }) => {
  const [colors, setColors] = useState<string[]>(['#1e3a8a', '#4c1d95', '#9d174d', '#ea580c']);
  const [beatScale, setBeatScale] = useState(1);
  const imgRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
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

  // Visualizer and Beat Detection
  useEffect(() => {
    if (!analyzer) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = analyzer.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    let animationFrameId: number;

    const draw = () => {
      animationFrameId = requestAnimationFrame(draw);
      analyzer.getByteFrequencyData(dataArray);

      // Beat detection (simple average of low frequencies)
      if (settings.beatReactiveGlow) {
        const lowFreqs = dataArray.slice(0, 10);
        const avg = lowFreqs.reduce((a, b) => a + b, 0) / lowFreqs.length;
        const scale = 1 + (avg / 255) * (settings.beatGlowIntensity / 100);
        setBeatScale(scale);
      } else {
        setBeatScale(1);
      }

      if (settings.visualizerEnabled) {
        // Sync canvas resolution with display size
        if (canvas.width !== window.innerWidth || canvas.height !== window.innerHeight) {
          canvas.width = window.innerWidth;
          canvas.height = window.innerHeight;
        }

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const opacity = settings.visualizerOpacity / 100;
        
        if (settings.visualizerMode === 'bars') {
          const barCount = 100;
          const barWidth = canvas.width / barCount;
          ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
          
          for (let i = 0; i < barCount; i++) {
            // Focus on the audible frequency range (first 50% of buffer)
            const index = Math.floor((i / barCount) * (bufferLength * 0.5));
            const barHeight = (dataArray[index] / 255) * canvas.height * 0.7;
            ctx.fillRect(i * barWidth, canvas.height - barHeight, barWidth - 2, barHeight);
          }
        } else if (settings.visualizerMode === 'gradient') {
          const avg = dataArray.reduce((a, b) => a + b, 0) / bufferLength;
          const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
          
          // Use the extracted colors for the gradient
          gradient.addColorStop(0, colors[0].replace('rgb', 'rgba').replace(')', `, ${opacity})`));
          gradient.addColorStop(0.5, colors[1].replace('rgb', 'rgba').replace(')', `, ${opacity * 0.5})`));
          gradient.addColorStop(1, colors[2].replace('rgb', 'rgba').replace(')', `, ${opacity * 0.2})`));
          
          ctx.fillStyle = gradient;
          
          // Draw a dynamic shape or just fill based on intensity
          const intensity = (avg / 255) * canvas.height * 0.5;
          ctx.beginPath();
          ctx.moveTo(0, canvas.height);
          ctx.bezierCurveTo(
            canvas.width * 0.25, canvas.height - intensity * 1.5,
            canvas.width * 0.75, canvas.height - intensity * 0.5,
            canvas.width, canvas.height
          );
          ctx.lineTo(canvas.width, canvas.height);
          ctx.lineTo(0, canvas.height);
          ctx.fill();
        } else if (settings.visualizerMode === 'ambient') {
          const avg = dataArray.reduce((a, b) => a + b, 0) / bufferLength;
          const radius = (avg / 255) * canvas.width * 0.5;
          const gradient = ctx.createRadialGradient(canvas.width/2, canvas.height/2, 0, canvas.width/2, canvas.height/2, radius);
          gradient.addColorStop(0, `rgba(255, 255, 255, ${opacity * 0.5})`);
          gradient.addColorStop(1, 'transparent');
          ctx.fillStyle = gradient;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
      }
    };

    draw();
    return () => cancelAnimationFrame(animationFrameId);
  }, [analyzer, settings.visualizerEnabled, settings.visualizerMode, settings.visualizerOpacity, settings.beatReactiveGlow, settings.beatGlowIntensity]);

  return (
    <div className="fixed inset-0 z-[-1] overflow-hidden bg-black" style={{ transform: `scale(${beatScale})`, transition: 'transform 0.1s ease-out' }}>
      {/* Base Animated Gradient - Always visible unless Solid Black */}
      {!settings.solidBlackUI && (
        <AnimatePresence mode="popLayout">
          <motion.div 
            key={colors.join(',')}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 2, ease: "easeInOut" }}
            className="bg-liquid w-full h-full absolute inset-0"
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
          </motion.div>
        </AnimatePresence>
      )}

      {/* App Wallpaper (if any) */}
      <AnimatePresence mode="popLayout">
        {!settings.solidBlackUI && videoUrl && (
          <motion.div
            key={videoUrl}
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.8 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.5, ease: "easeInOut" }}
            className="absolute inset-0 w-full h-full"
          >
            {videoUrl.includes('image') || videoUrl.includes('picsum') ? (
              <img src={videoUrl} className="w-full h-full object-cover" alt="wallpaper" referrerPolicy="no-referrer" />
            ) : (
              <video 
                src={videoUrl} 
                autoPlay 
                loop 
                muted 
                className="w-full h-full object-cover"
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cinematic Mode Overlay */}
      <AnimatePresence mode="popLayout">
        {!settings.solidBlackUI && settings.backgroundMode === 'cinematic' && coverUrl && !videoUrl && (
          <motion.div 
            key={`cinematic-${coverUrl}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.5, ease: "easeInOut" }}
            className="absolute inset-0"
          >
            <div 
              className="absolute inset-0 bg-cover bg-center scale-110"
              style={{ 
                backgroundImage: `url(${coverUrl})`, 
                filter: `blur(${settings.glassBlur * 2}px) saturate(${100 + settings.tintStrength}%)`,
                opacity: settings.tintStrength / 100
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Liquid Mode Cover Overlay */}
      <AnimatePresence mode="popLayout">
        {!settings.solidBlackUI && settings.backgroundMode === 'liquid' && coverUrl && !videoUrl && (
          <motion.div
            key={`liquid-${coverUrl}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.5, ease: "easeInOut" }}
            className="absolute inset-0 pointer-events-none"
          >
            <img ref={imgRef} src={coverUrl} crossOrigin="anonymous" className="hidden" alt="cover" referrerPolicy="no-referrer" />
            <div className="absolute inset-0 mix-blend-overlay" style={{ opacity: settings.tintStrength / 100 }}>
              <div 
                className="absolute inset-0 bg-cover bg-center scale-110"
                style={{ backgroundImage: `url(${coverUrl})`, filter: 'blur(60px)' }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Visualizer Canvas */}
      {settings.visualizerEnabled && (
        <canvas 
          ref={canvasRef} 
          className={`absolute inset-0 w-full h-full pointer-events-none ${settings.solidBlackUI ? 'z-20' : 'z-0'}`}
          width={window.innerWidth}
          height={window.innerHeight}
        />
      )}

      {settings.vignetteIntensity > 0 && (
        <div className="vignette" style={{ opacity: settings.vignetteIntensity / 100 }} />
      )}
      
      {settings.grainEnabled && (
        <div className="cinematic-grain" />
      )}
    </div>
  );
};
