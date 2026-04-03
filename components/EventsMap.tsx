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
  const eventsWithCoords = events.filter(event => event.lat && event.lng);
  const nycCenter: [number, number] = [40.7128, -73.9654];

  return (
    <div className="h-[600px] w-full rounded-xl overflow-hidden border border-[#252528]">
      <MapContainer
        center={nycCenter}
        zoom={11}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        {eventsWithCoords.map((event, index) => (
          <Marker key={index} position={[event.lat!, event.lng!]}>
            <Popup>
              <div className="p-2 max-w-xs">
                <h3 className="font-semibold text-[#1a1a1a] mb-2 text-sm">{event.title}</h3>
                <p className="text-xs text-[#555] mb-2">{event.description.substring(0, 100)}...</p>
                <p className="text-xs text-[#777] mb-1"><strong>Time:</strong> {event.time}</p>
                <p className="text-xs text-[#777] mb-2"><strong>Location:</strong> {event.location}</p>
                {event.link && (
                  <a
                    href={event.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-[#E8503A] hover:underline"
                  >
                    Details &rarr;
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
