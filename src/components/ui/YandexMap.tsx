'use client';

import { useEffect, useRef, useState } from 'react';

declare global {
  interface Window {
    ymaps: any;
  }
}

interface YandexMapProps {
  lat: number;
  lng: number;
  zoom?: number;
  height?: number;
  className?: string;
}

export function YandexMap({ lat, lng, zoom = 15, height = 200, className = '' }: YandexMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!mapRef.current) return;

    const apiKey = process.env.NEXT_PUBLIC_YANDEX_MAPS_API_KEY;
    if (!apiKey) {
      setError(true);
      setLoading(false);
      return;
    }

    const loadYandexMaps = async () => {
      if (window.ymaps) {
        initMap();
        return;
      }

      const script = document.createElement('script');
      script.src = `https://api-maps.yandex.ru/2.1/?apikey=${apiKey}&lang=ru_RU`;
      script.async = true;
      script.onload = () => initMap();
      script.onerror = () => {
        setError(true);
        setLoading(false);
      };
      document.head.appendChild(script);
    };

    const initMap = async () => {
      try {
        await window.ymaps.ready();
        
        if (!mapRef.current) return;

        const map = new window.ymaps.Map(mapRef.current, {
          center: [lat, lng],
          zoom,
          controls: ['zoom', 'fullscreen'],
        });

        const placemark = new window.ymaps.Placemark([lat, lng], {}, {
          preset: 'islands#blueDotIcon',
        });

        map.geoObjects.add(placemark);
        mapInstanceRef.current = map;
        setLoading(false);
      } catch {
        setError(true);
        setLoading(false);
      }
    };

    loadYandexMaps();

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.destroy();
        mapInstanceRef.current = null;
      }
    };
  }, [lat, lng, zoom]);

  if (error) {
    return (
      <div className={`rounded-xl overflow-hidden border border-[var(--color-border)] ${className}`} style={{ height }}>
        <div className="w-full h-full flex items-center justify-center bg-[var(--color-surface-secondary)] text-[var(--color-text-tertiary)] text-sm">
          Карта недоступна
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-xl overflow-hidden border border-[var(--color-border)] relative ${className}`} style={{ height }}>
      {loading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-[var(--color-surface-secondary)]">
          <div className="animate-pulse text-[var(--color-text-tertiary)] text-sm">Загрузка карты...</div>
        </div>
      )}
      <div ref={mapRef} className="w-full h-full" />
    </div>
  );
}
