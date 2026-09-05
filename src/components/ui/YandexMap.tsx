'use client';

import { useEffect, useRef, useState } from 'react';

interface YmapsMap {
  destroy(): void;
  geoObjects: {
    add(obj: unknown): void;
  };
}

interface YmapsPlacemark {
  new (coords: [number, number], properties?: unknown, options?: unknown): unknown;
}

interface Ymaps {
  Map: new (container: HTMLElement, state: unknown, options?: unknown) => YmapsMap;
  Placemark: YmapsPlacemark;
  ready(callback: () => void): void;
}

declare global {
  interface Window {
    ymaps?: Ymaps;
    __ymapsLoading?: boolean;
  }
}

interface YandexMapProps {
  lat: number;
  lng: number;
  zoom?: number;
  height?: number;
  className?: string;
}

export function YandexMap({ lat, lng, zoom = 16, height = 200, className = '' }: YandexMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<YmapsMap | null>(null);
  const [error, setError] = useState(false);

  const apiKey = process.env.NEXT_PUBLIC_YANDEX_MAPS_API_KEY;

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current || !apiKey) return;
    const container = mapRef.current;

    let destroyed = false;

    const initMap = () => {
      try {
        if (destroyed || !window.ymaps || !container) return;

        const ymaps = window.ymaps;

        const map = new ymaps.Map(container, {
          center: [lat, lng],
          zoom,
          controls: [],
        }, {
          suppressMapOpenBlock: true,
        });

        const placemark = new ymaps.Placemark(
          [lat, lng],
          {},
          {
            preset: 'islands#dot',
            iconColor: '#0096FF',
          }
        );

        map.geoObjects.add(placemark);
        mapInstanceRef.current = map;
      } catch (e) {
        console.error('[YandexMap] Init error:', e);
        if (!destroyed) setError(true);
      }
    };

    const onReady = () => {
      if (destroyed) return;
      try {
        window.ymaps?.ready(() => {
          if (!destroyed) initMap();
        });
      } catch (e) {
        console.error('[YandexMap] ready() error:', e);
        if (!destroyed) setError(true);
      }
    };

    if (window.ymaps) {
      onReady();
    } else if (window.__ymapsLoading) {
      const check = setInterval(() => {
        if (window.ymaps) {
          clearInterval(check);
          onReady();
        }
      }, 100);
    } else {
      window.__ymapsLoading = true;
      const script = document.createElement('script');
      script.src = `https://api-maps.yandex.ru/2.1/?apikey=${apiKey}&lang=ru_RU`;
      script.async = true;
      script.onload = () => onReady();
      script.onerror = () => {
        window.__ymapsLoading = false;
        if (!destroyed) setError(true);
      };
      document.head.appendChild(script);
    }

    return () => {
      destroyed = true;
      if (mapInstanceRef.current) {
        try { mapInstanceRef.current.destroy(); } catch {}
        mapInstanceRef.current = null;
      }
    };
  }, [lat, lng, zoom, apiKey]);

  const mapsUrl = `https://yandex.ru/maps/?pt=${lng},${lat}&z=16&ll=${lng},${lat}&spn=0.005,0.005&text=${lat},${lng}`;

  if (error || !apiKey) {
    return (
      <div className={`relative rounded-[var(--radius-md)] overflow-hidden border border-[var(--color-border)] ${className}`} style={{ height }}>
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full h-full flex items-center justify-center bg-[var(--color-surface)] text-[var(--color-text-secondary)] text-sm hover:text-[var(--color-accent)] transition-colors"
        >
          Открыть на Яндекс Картах
        </a>
      </div>
    );
  }

  return (
    <div className={`relative rounded-[var(--radius-md)] overflow-hidden border border-[var(--color-border)] ${className}`} style={{ height, maxWidth: '100%' }}>
      <div ref={mapRef} style={{ width: '100%', height: '100%', maxWidth: '100%', overflow: 'hidden' }} />
      <a
        href={mapsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="absolute bottom-2 right-2 px-2 py-1 rounded-[var(--radius-md)] bg-[var(--color-surface)] text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] border border-[var(--color-border)]"
      >
        Открыть в Картах
      </a>
    </div>
  );
}
