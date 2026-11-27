'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';
import { Crosshair, MapPin, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Notice, Skeleton } from '@/components/ui/feedback';
import type { LatLng } from './map-picker';

const MapPicker = dynamic(() => import('./map-picker'), { ssr: false, loading: () => <Skeleton className="h-[300px]" /> });

export interface DeliveryLocation extends LatLng {
  accuracy: number | null;
  source: 'gps' | 'map_pin';
}

type GeoState = 'idle' | 'asking' | 'denied' | 'unavailable' | 'timeout' | 'unsupported';

const GEO_MESSAGES: Record<Exclude<GeoState, 'idle' | 'asking'>, string> = {
  denied: 'Você não autorizou a localização. Sem problema: o endereço digitado é suficiente, ou marque o ponto no mapa.',
  unavailable: 'Não foi possível obter sua localização agora. Use o endereço digitado ou marque no mapa.',
  timeout: 'A localização demorou demais para responder. Tente de novo ou marque no mapa.',
  unsupported: 'Este navegador não oferece localização. Use o endereço digitado ou marque no mapa.',
};

/**
 * Localização OPCIONAL para entregas. Pedimos a permissão apenas quando o cliente
 * toca no botão, uma única vez (sem rastreamento contínuo).
 */
export function LocationStep({
  value,
  onChange,
  defaultCenter,
}: {
  value: DeliveryLocation | null;
  onChange: (value: DeliveryLocation | null) => void;
  defaultCenter: LatLng;
}) {
  const [geo, setGeo] = useState<GeoState>('idle');
  const [showMap, setShowMap] = useState(Boolean(value));

  function requestGps() {
    if (!('geolocation' in navigator)) {
      setGeo('unsupported');
      return;
    }
    setGeo('asking');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeo('idle');
        setShowMap(true);
        onChange({ latitude: pos.coords.latitude, longitude: pos.coords.longitude, accuracy: Math.round(pos.coords.accuracy), source: 'gps' });
      },
      (err) => {
        setGeo(err.code === err.PERMISSION_DENIED ? 'denied' : err.code === err.TIMEOUT ? 'timeout' : 'unavailable');
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 },
    );
  }

  return (
    <div className="space-y-3 rounded-2xl border border-line p-4" data-testid="location-step">
      <div>
        <p className="font-semibold">Localização no mapa (opcional)</p>
        <p className="text-sm text-muted">
          Ajuda o entregador a achar você. Usamos apenas para este pedido e ela não substitui o endereço escrito. A localização do celular pode ser imprecisa:
          confira o marcador.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="dark" size="sm" onClick={requestGps} loading={geo === 'asking'}>
          <Crosshair className="size-4" aria-hidden /> Usar minha localização atual
        </Button>
        {!showMap ? (
          <Button variant="outline" size="sm" onClick={() => setShowMap(true)}>
            <MapPin className="size-4" aria-hidden /> Marcar no mapa
          </Button>
        ) : null}
        {value ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              onChange(null);
              setShowMap(false);
            }}
          >
            <Trash2 className="size-4" aria-hidden /> Remover localização
          </Button>
        ) : null}
      </div>
      {geo !== 'idle' && geo !== 'asking' ? (
        <Notice tone="warning" live>
          {GEO_MESSAGES[geo]}
        </Notice>
      ) : null}
      {showMap ? (
        <>
          <MapPicker center={defaultCenter} position={value} onChange={(p) => onChange({ ...p, accuracy: null, source: 'map_pin' })} />
          <p className="text-xs text-muted" aria-live="polite">
            {value
              ? `Ponto marcado${value.source === 'gps' && value.accuracy ? ` (precisão aproximada de ${value.accuracy} m)` : ''}. Toque no mapa ou arraste o marcador para corrigir.`
              : 'Toque no mapa para marcar o ponto de entrega.'}
          </p>
        </>
      ) : null}
    </div>
  );
}
