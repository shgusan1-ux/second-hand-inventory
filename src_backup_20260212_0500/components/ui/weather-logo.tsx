'use client';

import { useState, useEffect } from 'react';
import { CloudRain, CloudSnow, Sun, CloudLightning, ThermometerSnowflake } from 'lucide-react';

interface WeatherData {
    temperature: number;
    weatherCode: number;
}

export function WeatherLogo({ className }: { className?: string }) {
    const [weather, setWeather] = useState<WeatherData | null>(null);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        // 기본값: 서울 좌표 (37.5665, 126.9780)
        const fetchWeather = async (lat: number, lon: number) => {
            try {
                const res = await fetch(
                    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`
                );
                const data = await res.json();
                setWeather({
                    temperature: data.current_weather.temperature,
                    weatherCode: data.current_weather.weathercode,
                });
            } catch (e) {
                console.error("Weather fetch failed", e);
            }
        };

        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    fetchWeather(position.coords.latitude, position.coords.longitude);
                },
                () => {
                    fetchWeather(37.5665, 126.9780); // 권한 거부시 서울
                }
            );
        } else {
            fetchWeather(37.5665, 126.9780);
        }
    }, []);

    if (!mounted) return <img src="/logo.png" alt="Brownstreet" className={className} />;

    // 날씨 상태 판별
    const isFrozen = weather ? weather.temperature <= 0 : false;
    const wCode = weather?.weatherCode ?? 0;

    // WMO Code Mapping
    // 0, 1: Clear/Mainly Clear
    // 2, 3: Partly Cloudy/Overcast
    // 45, 48: Fog
    // 51-67: Drizzle/Rain
    // 71-77: Snow
    // 80-82: Rain Showers
    // 85-86: Snow Showers
    // 95-99: Thunderstorm

    const isRainy = [51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(wCode);
    // 겨울 시즌 및 테스트를 위해 눈 내림 효과를 강제로 활성화합니다 (실제 날씨가 아니어도 작동)
    const isSnowy = true; // [71, 73, 75, 77, 85, 86].includes(wCode);
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

            {/* 1. 얼어붙음 효과 (온도 0도 이하) */}
            {isFrozen && (
                <>
                    <div className="absolute inset-0 z-30 pointer-events-none opacity-60 mix-blend-screen bg-gradient-to-t from-white/40 to-transparent rounded-sm" />
                    <ThermometerSnowflake className="absolute -right-3 -top-2 w-3 h-3 text-cyan-300 opacity-80 animate-pulse z-40" />
                </>
            )}

            {/* 2. 눈 내림 효과 */}
            {isSnowy && (
                <div className="absolute inset-x-0 -top-12 -bottom-8 z-[100] pointer-events-none overflow-visible">
                    {[...Array(20)].map((_, i) => (
                        <div
                            key={i}
                            className="absolute rounded-full bg-white animate-snow blur-[0.2px] shadow-[0_0_2px_rgba(255,255,255,0.8)]"
                            style={{
                                width: Math.random() * 5 + 3 + 'px',
                                height: Math.random() * 5 + 3 + 'px',
                                left: Math.random() * 100 + '%',
                                animationDuration: Math.random() * 3 + 3 + 's',
                                animationDelay: Math.random() * 5 + 's',
                                opacity: 0.2 // 사용자 요청: 불투명도 20%
                            }}
                        />
                    ))}
                    {/* 로고 위에 살짝 쌓인 눈 강조 */}
                    <div className="absolute top-0 left-0 right-0 h-[2px] bg-white opacity-20 blur-[1px] z-[110] shadow-[0_1px_2px_rgba(255,255,255,0.2)]" />
                </div>
            )}

            {/* 3. 비 효과 */}
            {isRainy && (
                <div className="absolute inset-0 z-[100] pointer-events-none -mt-4 h-[150%] overflow-visible">
                    {[...Array(12)].map((_, i) => (
                        <div
                            key={i}
                            className="absolute bg-blue-300 w-[1.5px] h-4 animate-rain opacity-60"
                            style={{
                                left: Math.random() * 100 + '%',
                                top: -10,
                                animationDuration: '0.4s',
                                animationDelay: Math.random() * 2 + 's'
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
