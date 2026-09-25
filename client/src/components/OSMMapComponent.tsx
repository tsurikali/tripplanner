import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Исправление для иконок в Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface Place {
  id: number;
  name: string;
  description?: string;
  address?: string;
  latitude?: number | null;
  longitude?: number | null;
  category?: string;
}

interface OSMMapComponentProps {
  places: Place[];
  center?: [number, number];
}

const getMarkerColor = (category: string = 'other') => {
  const colors: Record<string, string> = {
    attraction: '#3b82f6', // синий
    restaurant: '#ef4444',  // красный
    hotel: '#10b981',       // зеленый
    transport: '#f59e0b',   // оранжевый
    other: '#6b7280'        // серый
  };
  return colors[category] || colors.other;
};

// Создание кастомной иконки с цветом
const createColoredIcon = (color: string) => {
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="
      background-color: ${color};
      width: 24px;
      height: 24px;
      border-radius: 50% 50% 50% 0;
      border: 3px solid white;
      transform: rotate(-45deg);
      box-shadow: 0 2px 5px rgba(0,0,0,0.3);
    "></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12]
  });
};

const OSMMapComponent: React.FC<OSMMapComponentProps> = ({ places, center }) => {
  const [mapCenter, setMapCenter] = useState<[number, number]>(
    center || [55.751574, 37.573856] // Москва по умолчанию
  );

  useEffect(() => {
    if (center) {
      setMapCenter(center);
    } else {
      // Находим первое место с координатами
      const firstWithCoords = places.find(p => 
        p.latitude !== null && p.latitude !== undefined && 
        p.longitude !== null && p.longitude !== undefined
      );
      
      if (firstWithCoords && firstWithCoords.latitude && firstWithCoords.longitude) {
        setMapCenter([firstWithCoords.latitude, firstWithCoords.longitude]);
      }
    }
  }, [center, places]);

  // Фильтруем места с координатами
  const markers = places.filter((place): place is Place & { latitude: number; longitude: number } => 
    place.latitude !== null && 
    place.latitude !== undefined && 
    place.longitude !== null && 
    place.longitude !== undefined
  );

  return (
    <div className="h-[500px] w-full rounded-xl overflow-hidden shadow-lg">
      <MapContainer
        center={mapCenter}
        zoom={12}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        
        {markers.map((place) => (
          <Marker
            key={place.id}
            position={[place.latitude, place.longitude]}
            icon={createColoredIcon(getMarkerColor(place.category))}
          >
            <Popup>
              <div className="p-2 max-w-xs">
                <h3 className="font-bold text-gray-900">{place.name}</h3>
                {place.description && (
                  <p className="text-sm text-gray-600 mt-1">{place.description}</p>
                )}
                {place.address && (
                  <p className="text-xs text-gray-500 mt-2">{place.address}</p>
                )}
                {place.category && (
                  <div className="mt-2 text-xs text-gray-400 capitalize">
                    Категория: {place.category === 'attraction' ? 'Достопримечательность' :
                               place.category === 'restaurant' ? 'Ресторан/Кафе' :
                               place.category === 'hotel' ? 'Отель' :
                               place.category === 'transport' ? 'Транспорт' : 'Другое'}
                  </div>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};

export default OSMMapComponent;