'use client';

import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface Event {
  title: string;
  description: string;
  time: string;
  location: string;
  borough?: string;
  neighborhood?: string;
  lat?: number;
  lng?: number;
  link?: string;
  ticketLink?: string;
}

interface EventsMapProps {
  events: Event[];
}

// Fix for default marker icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

export default function EventsMap({ events }: EventsMapProps) {
  // Filter events that have coordinates
  const eventsWithCoords = events.filter(event => event.lat && event.lng);

  // NYC center
  const nycCenter: [number, number] = [40.7128, -73.9654];

  return (
    <div className="h-[600px] w-full rounded-3xl overflow-hidden border border-[#E0D5C7]">
      <MapContainer
        center={nycCenter}
        zoom={11}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />
        {eventsWithCoords.map((event, index) => (
          <Marker key={index} position={[event.lat!, event.lng!]}>
            <Popup>
              <div className="p-2 max-w-xs">
                <h3 className="font-semibold text-[#3D3426] mb-2">{event.title}</h3>
                <p className="text-sm text-[#6B5D4F] mb-2">{event.description.substring(0, 100)}...</p>
                <p className="text-xs text-[#8B7D6F] mb-1"><strong>Time:</strong> {event.time}</p>
                <p className="text-xs text-[#8B7D6F] mb-2"><strong>Location:</strong> {event.location}</p>
                {event.link && (
                  <a
                    href={event.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-[#3D3426] underline"
                  >
                    Details →
                  </a>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
