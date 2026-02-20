'use client';

import { useState, useEffect } from 'react';
import { CloudRain, CloudSnow, Sun, CloudLightning, ThermometerSnowflake } from 'lucide-react';

interface WeatherData {
    temperature: number;
    weatherCode: number;
}

interface Particle {
    left: string;
    duration: string;
    delay: string;
    width?: string;
    height?: string;
    top?: number;
}

export function WeatherLogo({ className }: { className?: string }) {
    const [weather, setWeather] = useState<WeatherData | null>(null);
    const [mounted, setMounted] = useState(false);
    const [snowParticles, setSnowParticles] = useState<Particle[]>([]);
    const [rainParticles, setRainParticles] = useState<Particle[]>([]);

    useEffect(() => {
        setMounted(true);

        // Generate particles only on the client
        setSnowParticles([...Array(20)].map(() => ({
            width: Math.random() * 5 + 3 + 'px',
            height: Math.random() * 5 + 3 + 'px',
            left: Math.random() * 100 + '%',
            duration: Math.random() * 3 + 3 + 's',
            delay: Math.random() * 5 + 's',
        })));

        setRainParticles([...Array(12)].map(() => ({
            left: Math.random() * 100 + '%',
            top: -10,
            duration: '0.4s',
            delay: Math.random() * 2 + 's'
        })));

        // 기본값: 서울 좌표 (37.5665, 126.9780)
        const lat = 37.5665;
        const lon = 126.9780;

        const fetchWeather = async (lat: number, lon: number) => {
            try {
                const res = await fetch(
                    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`
                );
                if (!res.ok) throw new Error("Weather API failed");
                const data = await res.json();
                setWeather({
                    temperature: data.current_weather.temperature,
                    weatherCode: data.current_weather.weathercode,
                });
            } catch (e) {
                console.warn("Weather fetch failed (using default):", e);
                // Fallback weather if API fails
                setWeather({ temperature: 10, weatherCode: 0 });
            }
        };

        fetchWeather(lat, lon);
    }, []);

    if (!mounted) return <div className={className} style={{ width: 40, height: 16 }} />; // Placeholder to avoid layout shift

    // 날씨 상태 판별
    const isFrozen = weather ? weather.temperature <= 0 : false;
    const wCode = weather?.weatherCode ?? 0;

    const isRainy = [51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(wCode);
    const isSnowy = true; // Still forced for effect
    const isThunder = [95, 96, 99].includes(wCode);
    const isSunny = [0, 1].includes(wCode) && !isSnowy;

    return (
        <div className="relative inline-block group overflow-visible z-[60]">
            {/* 기본 로고 */}
            <img
                src="/logo.png?v=weather"
                alt="Brownstreet"
                className={`relative z-20 transition-all duration-700 ${className} ${isFrozen ? 'brightness-125 hue-rotate-180 saturate-50' : ''
                    }`}
            />

            {/* 1. 얼어붙음 효과 */}
            {isFrozen && (
                <>
                    <div className="absolute inset-0 z-30 pointer-events-none opacity-60 mix-blend-screen bg-gradient-to-t from-white/40 to-transparent rounded-sm" />
                    <ThermometerSnowflake className="absolute -right-3 -top-2 w-3 h-3 text-cyan-300 opacity-80 animate-pulse z-40" />
                </>
            )}

            {/* 2. 눈 내림 효과 */}
            {isSnowy && (
                <div className="absolute inset-x-0 -top-12 -bottom-8 z-[100] pointer-events-none overflow-visible">
                    {snowParticles.map((p, i) => (
                        <div
                            key={i}
                            className="absolute rounded-full bg-white animate-snow blur-[0.2px] shadow-[0_0_2px_rgba(255,255,255,0.8)]"
                            style={{
                                width: p.width,
                                height: p.height,
                                left: p.left,
                                animationDuration: p.duration,
                                animationDelay: p.delay,
                                opacity: 0.2
                            }}
                        />
                    ))}
                    <div className="absolute top-0 left-0 right-0 h-[2px] bg-white opacity-20 blur-[1px] z-[110] shadow-[0_1px_2px_rgba(255,255,255,0.2)]" />
                </div>
            )}

            {/* 3. 비 효과 */}
            {isRainy && (
                <div className="absolute inset-0 z-[100] pointer-events-none -mt-4 h-[150%] overflow-visible">
                    {rainParticles.map((p, i) => (
                        <div
                            key={i}
                            className="absolute bg-blue-300 w-[1.5px] h-4 animate-rain opacity-60"
                            style={{
                                left: p.left,
                                top: p.top,
                                animationDuration: p.duration,
                                animationDelay: p.delay
                            }}
                        />
                    ))}
                </div>
            )}

            {/* 4. 번개 효과 */}
            {isThunder && (
                <div className="absolute inset-0 z-[105] pointer-events-none bg-white opacity-0 animate-lightning mix-blend-screen" />
            )}

            {/* 5. 맑음 (햇살) 효과 */}
            {(isSunny || (!isRainy && !isSnowy && !isThunder)) && !isFrozen && (
                <div className="absolute -top-4 -right-4 z-10 pointer-events-none">
                    <div className="w-8 h-8 bg-orange-400/30 rounded-full blur-xl animate-pulse" />
                </div>
            )}

            <style jsx>{`
        @keyframes snow {
          0% { transform: translateY(-10px) translateX(0px); opacity: 0; }
          20% { opacity: 1; }
          50% { transform: translateY(20px) translateX(15px) scale(1.1); }
          80% { opacity: 1; }
          100% { transform: translateY(45px) translateX(-5px) scale(0.9); opacity: 0; }
        }
        @keyframes rain {
          0% { transform: translateY(-10px); opacity: 0; }
          30% { opacity: 1; }
          100% { transform: translateY(40px); opacity: 0; }
        }
        @keyframes lightning {
          0%, 90%, 100% { opacity: 0; }
          91% { opacity: 1; }
          92% { opacity: 0.1; }
          93% { opacity: 1; }
          94% { opacity: 0; }
        }
      `}</style>
        </div>
    );
}
