'use client';

import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface VenueMapProps {
  lat: number;
  lng: number;
  name?: string;
}

// Custom coral pin marker
const venueIcon = new L.DivIcon({
  className: '',
  html: `<div style="
    width: 14px; height: 14px;
    background: #E8503A;
    border: 2px solid #EDECE8;
    border-radius: 50%;
    box-shadow: 0 0 12px rgba(232, 80, 58, 0.5);
  "></div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

export default function VenueMap({ lat, lng }: VenueMapProps) {
  return (
    <div className="h-[180px] w-full rounded-lg overflow-hidden border border-[#252528]">
      <MapContainer
        center={[lat, lng]}
        zoom={14}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={false}
        zoomControl={false}
        dragging={false}
        attributionControl={false}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        <Marker position={[lat, lng]} icon={venueIcon} />
      </MapContainer>
    </div>
  );
}
