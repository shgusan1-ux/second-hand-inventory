'use client';

import { useEffect, useState } from 'react';
import { Cloud, Sun, CloudRain, CloudSnow, Wind } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// Mock Weather Data
const CITIES = [
    { id: 'seoul', name: '서울', x: 28, y: 22, temp: 22, condition: 'Sunny' },
    { id: 'incheon', name: '인천', x: 18, y: 22, temp: 21, condition: 'Cloudy' },
    { id: 'daejeon', name: '대전', x: 35, y: 45, temp: 24, condition: 'Sunny' },
    { id: 'daegu', name: '대구', x: 65, y: 58, temp: 27, condition: 'Sunny' },
    { id: 'gwangju', name: '광주', x: 30, y: 75, temp: 25, condition: 'Rainy' },
    { id: 'busan', name: '부산', x: 75, y: 78, temp: 26, condition: 'Cloudy' },
    { id: 'ulsan', name: '울산', x: 82, y: 68, temp: 25, condition: 'Cloudy' },
    { id: 'jeju', name: '제주', x: 25, y: 92, temp: 28, condition: 'Sunny' },
    { id: 'gangneung', name: '강릉', x: 65, y: 25, temp: 20, condition: 'Windy' },
];

const WeatherIcon = ({ condition, className }: { condition: string, className?: string }) => {
    switch (condition) {
        case 'Sunny': return <Sun className={`text-orange-500 ${className}`} />;
        case 'Cloudy': return <Cloud className={`text-slate-400 ${className}`} />;
        case 'Rainy': return <CloudRain className={`text-blue-500 ${className}`} />;
        case 'Snowy': return <CloudSnow className={`text-sky-300 ${className}`} />;
        case 'Windy': return <Wind className={`text-teal-500 ${className}`} />;
        default: return <Sun className={`text-orange-500 ${className}`} />;
    }
};

export function KoreaWeatherMap() {
    const [weatherData, setWeatherData] = useState(CITIES);

    useEffect(() => {
        // Simulate live updates
        const interval = setInterval(() => {
            setWeatherData(prev => prev.map(city => ({
                ...city,
                temp: city.temp + (Math.random() > 0.5 ? 1 : -1) * (Math.random() * 0.5)
            })));
        }, 5000);
        return () => clearInterval(interval);
    }, []);

    return (
        <Card className="h-full bg-slate-50 border-slate-200 shadow-sm relative overflow-hidden">
            <CardHeader className="pb-2">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <Sun className="h-5 w-5 text-orange-500" />
                    전국 실시간 날씨
                </CardTitle>
            </CardHeader>
            <CardContent className="h-[400px] relative p-0 flex items-center justify-center bg-blue-50/50">
                {/* Simplified Korea Map Background using CSS Shapes/SVG */}
                <div className="relative w-[300px] h-[400px] scale-90 md:scale-100">
                    {/* More Accurate Korea Map Shape */}
                    <svg className="absolute inset-0 w-full h-full drop-shadow-md opacity-80" viewBox="0 0 300 450">
                        <path
                            d="M130,20 L150,25 L160,50 L180,60 L170,90 L200,100 L220,130 L230,200 L210,250 L240,280 L230,320 L240,350 L200,380 L160,390 L130,400 L80,380 L60,350 L90,300 L70,250 L80,200 L60,150 L80,100 L70,60 L100,40 Z"
                            fill="#cbd5e1"
                            stroke="white"
                            strokeWidth="2"
                        />
                        {/* Jeju Island */}
                        <ellipse cx="80" cy="420" rx="25" ry="12" fill="#cbd5e1" stroke="white" strokeWidth="2" />
                        {/* Dokdo / Ulleungdo (simplified) */}
                        <circle cx="260" cy="180" r="5" fill="#cbd5e1" stroke="white" strokeWidth="1" />
                    </svg>

                    {weatherData.map((city) => (
                        <div
                            key={city.id}
                            className="absolute transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center group cursor-pointer transition-all hover:scale-110 z-10"
                            style={{ left: `${city.x}%`, top: `${city.y}%` }}
                        >
                            <div className="bg-white/90 backdrop-blur rounded-full p-2 shadow-sm border border-slate-100 group-hover:border-emerald-400 group-hover:shadow-md transition-all">
                                <WeatherIcon condition={city.condition} className="w-5 h-5 md:w-6 md:h-6" />
                            </div>
                            <div className="mt-1 flex flex-col items-center">
                                <span className="text-[10px] font-bold text-slate-700 bg-white/80 px-1.5 py-0.5 rounded-full shadow-sm">{city.name}</span>
                                <span className="text-xs font-extrabold text-slate-900 drop-shadow-sm">{city.temp.toFixed(1)}°</span>
                            </div>

                            {/* Hover Details */}
                            <div className="absolute bottom-full mb-2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-xs p-2 rounded w-max z-20 pointer-events-none">
                                {city.name}: {city.condition}
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
