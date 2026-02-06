'use client';

import { useEffect, useState } from 'react';
import { Cloud, Sun, CloudRain, CloudSnow, Wind } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// Mock Weather Data
const CITIES = [
    { id: 'seoul', name: '서울', x: 30, y: 20, temp: 22, condition: 'Sunny' },
    { id: 'incheon', name: '인천', x: 20, y: 22, temp: 21, condition: 'Cloudy' },
    { id: 'daejeon', name: '대전', x: 35, y: 45, temp: 24, condition: 'Sunny' },
    { id: 'daegu', name: '대구', x: 60, y: 55, temp: 27, condition: 'Sunny' },
    { id: 'gwangju', name: '광주', x: 30, y: 70, temp: 25, condition: 'Rainy' },
    { id: 'busan', name: '부산', x: 70, y: 75, temp: 26, condition: 'Cloudy' },
    { id: 'ulsan', name: '울산', x: 75, y: 65, temp: 25, condition: 'Cloudy' },
    { id: 'jeju', name: '제주', x: 25, y: 90, temp: 28, condition: 'Sunny' },
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
                <div className="relative w-[300px] h-[400px] opacity-90 scale-90 md:scale-100">
                    {/* Abstract Map Shape (SVG) */}
                    <svg className="absolute inset-0 w-full h-full drop-shadow-xl" viewBox="0 0 400 600">
                        <path
                            d="M180,50 L220,60 L240,100 L280,120 L270,180 L300,220 L280,260 L320,300 L300,350 L250,450 L200,480 L180,450 L150,420 L120,380 L100,300 L120,200 L180,150 Z"
                            fill="#cbd5e1"
                            stroke="white"
                            strokeWidth="2"
                        />
                        {/* Jeju */}
                        <ellipse cx="120" cy="550" rx="30" ry="15" fill="#cbd5e1" stroke="white" strokeWidth="2" />
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
