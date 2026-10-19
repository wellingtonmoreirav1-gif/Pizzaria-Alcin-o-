'use client';

import { useEffect, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';

export interface LatLng {
  latitude: number;
  longitude: number;
}

const pinIcon = L.divIcon({
  className: '',
  html: '<div style="width:34px;height:34px;transform:translate(-50%,-100%);position:absolute"><svg viewBox="0 0 24 24" width="34" height="34" fill="#c8102e" stroke="#fff" stroke-width="1.5"><path d="M12 22s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12z"/><circle cx="12" cy="10" r="2.6" fill="#fff"/></svg></div>',
  iconSize: [0, 0],
});

function ClickToPlace({ onChange }: { onChange: (p: LatLng) => void }) {
  useMapEvents({
    click(e) {
      onChange({ latitude: e.latlng.lat, longitude: e.latlng.lng });
    },
  });
  return null;
}

function Recenter({ position }: { position: LatLng | null }) {
  const map = useMap();
  useEffect(() => {
    if (position) map.setView([position.latitude, position.longitude], Math.max(map.getZoom(), 16));
  }, [position?.latitude, position?.longitude]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

/**
 * Mapa (Leaflet + OpenStreetMap). O cliente toca no mapa ou arrasta o marcador para
 * ajustar o ponto de entrega. Nenhuma chave de API é necessária.
 */
export default function MapPicker({ center, position, onChange }: { center: LatLng; position: LatLng | null; onChange: (p: LatLng) => void }) {
  const start = useMemo(() => position ?? center, []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="overflow-hidden rounded-2xl border border-line" data-testid="map-picker">
      <MapContainer center={[start.latitude, start.longitude]} zoom={position ? 17 : 15} scrollWheelZoom={false} style={{ height: 300, width: '100%' }}>
        <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <ClickToPlace onChange={onChange} />
        <Recenter position={position} />
        {position ? (
          <Marker
            position={[position.latitude, position.longitude]}
            draggable
            icon={pinIcon}
            keyboard
            title="Ponto de entrega (arraste para ajustar)"
            eventHandlers={{
              dragend(e) {
                const ll = (e.target as L.Marker).getLatLng();
                onChange({ latitude: ll.lat, longitude: ll.lng });
              },
            }}
          />
        ) : null}
      </MapContainer>
    </div>
  );
}
