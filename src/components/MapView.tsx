import { useState, useEffect, useMemo, useCallback } from 'react';
// @ts-ignore - react-map-gl has export resolution issues with some bundlers
import Map, { Marker, Popup, NavigationControl, GeolocateControl, Layer, Source } from 'react-map-gl';
import type { Trip, ItineraryItem } from '../types';
import 'mapbox-gl/dist/mapbox-gl.css';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

// Color palette for different days (max 10 days)
const DAY_COLORS = [
  '#3B82F6', // blue
  '#10B981', // green
  '#F59E0B', // amber
  '#EF4444', // red
  '#8B5CF6', // purple
  '#EC4899', // pink
  '#06B6D4', // cyan
  '#84CC16', // lime
  '#F97316', // orange
  '#6366F1', // indigo
];

// Type icon emojis
const TYPE_ICONS: Record<string, string> = {
  sight: '🏛️',
  food: '🍽️',
  museum: '🏛️',
  hike: '🥾',
  experience: '🎭',
  transport: '🚗',
  rest: '😴',
};

interface MapViewProps {
  trip: Trip;
  selectedDayIndex?: number | null;
  onMarkerClick?: (dayIndex: number, itemId: string) => void;
}

interface MarkerData {
  dayIndex: number;
  itemIndex: number;
  item: ItineraryItem;
  color: string;
}

export function MapView({ trip, selectedDayIndex, onMarkerClick }: MapViewProps) {
  const [viewState, setViewState] = useState({
    longitude: 0,
    latitude: 0,
    zoom: 10,
  });

  const [selectedMarker, setSelectedMarker] = useState<MarkerData | null>(null);
  const [routeGeometry, setRouteGeometry] = useState<GeoJSON.LineString | null>(null);

  // Collect all markers from trip days
  const markers = useMemo(() => {
    const result: MarkerData[] = [];

    trip.days.forEach((day, dayIndex) => {
      day.items.forEach((item, itemIndex) => {
        if (item.location) {
          result.push({
            dayIndex,
            itemIndex,
            item,
            color: DAY_COLORS[dayIndex % DAY_COLORS.length],
          });
        }
      });
    });

    return result;
  }, [trip]);

  // Filter markers by selected day if applicable
  const visibleMarkers = useMemo(() => {
    if (selectedDayIndex !== null && selectedDayIndex !== undefined) {
      return markers.filter((m) => m.dayIndex === selectedDayIndex);
    }
    return markers;
  }, [markers, selectedDayIndex]);

  // Calculate initial map center from markers
  useEffect(() => {
    if (markers.length > 0) {
      const lngs = markers.map((m) => m.item.location!.lng);
      const lats = markers.map((m) => m.item.location!.lat);

      const centerLng = (Math.min(...lngs) + Math.max(...lngs)) / 2;
      const centerLat = (Math.min(...lats) + Math.max(...lats)) / 2;

      setViewState({
        longitude: centerLng,
        latitude: centerLat,
        zoom: 11,
      });
    }
  }, [markers]);

  // Fetch route polyline when day is selected
  useEffect(() => {
    if (selectedDayIndex !== null && selectedDayIndex !== undefined) {
      const dayMarkers = markers.filter((m) => m.dayIndex === selectedDayIndex);

      if (dayMarkers.length >= 2) {
        // Fetch directions
        const coordinates = dayMarkers.map((m) => ({
          lng: m.item.location!.lng,
          lat: m.item.location!.lat,
        }));

        fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/map/directions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ coordinates, profile: 'walking' }),
        })
          .then((res) => res.json())
          .then((data) => {
            if (data.success) {
              setRouteGeometry(data.data.geometry);
            }
          })
          .catch((err) => {
            console.error('Failed to fetch route:', err);
          });
      } else {
        setRouteGeometry(null);
      }
    } else {
      setRouteGeometry(null);
    }
  }, [selectedDayIndex, markers]);

  // Handle centering on selected day
  const centerOnDay = useCallback(
    (dayIndex: number) => {
      const dayMarkers = markers.filter((m) => m.dayIndex === dayIndex);

      if (dayMarkers.length > 0) {
        const lngs = dayMarkers.map((m) => m.item.location!.lng);
        const lats = dayMarkers.map((m) => m.item.location!.lat);

        const centerLng = (Math.min(...lngs) + Math.max(...lngs)) / 2;
        const centerLat = (Math.min(...lats) + Math.max(...lats)) / 2;

        setViewState((prev) => ({
          ...prev,
          longitude: centerLng,
          latitude: centerLat,
          zoom: 13,
        }));
      }
    },
    [markers]
  );

  // Center on selected day when it changes
  useEffect(() => {
    if (selectedDayIndex !== null && selectedDayIndex !== undefined) {
      centerOnDay(selectedDayIndex);
    }
  }, [selectedDayIndex, centerOnDay]);

  if (!MAPBOX_TOKEN) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-100 text-gray-600 p-8 text-center">
        <div>
          <p className="text-lg font-semibold mb-2">Map Not Configured</p>
          <p className="text-sm">
            Please add <code className="bg-gray-200 px-2 py-1 rounded">VITE_MAPBOX_ACCESS_TOKEN</code> to your .env file
          </p>
        </div>
      </div>
    );
  }

  if (markers.length === 0) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-100 text-gray-600 p-8 text-center">
        <div>
          <p className="text-lg font-semibold mb-2">No Locations Found</p>
          <p className="text-sm">
            Itinerary items need location data to appear on the map
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full relative">
      <Map
        {...viewState}
        onMove={(evt) => setViewState(evt.viewState)}
        mapboxAccessToken={MAPBOX_TOKEN}
        style={{ width: '100%', height: '100%' }}
        mapStyle="mapbox://styles/mapbox/streets-v12"
      >
        {/* Navigation Controls */}
        <NavigationControl position="top-right" />
        <GeolocateControl position="top-right" />

        {/* Route Polyline */}
        {routeGeometry && (
          <Source
            id="route"
            type="geojson"
            data={{
              type: 'Feature',
              properties: {},
              geometry: routeGeometry,
            }}
          >
            <Layer
              id="route-layer"
              type="line"
              paint={{
                'line-color': selectedDayIndex !== null && selectedDayIndex !== undefined
                  ? DAY_COLORS[selectedDayIndex % DAY_COLORS.length]
                  : '#3B82F6',
                'line-width': 4,
                'line-opacity': 0.7,
              }}
            />
          </Source>
        )}

        {/* Markers */}
        {visibleMarkers.map((marker, idx) => (
          <Marker
            key={`${marker.dayIndex}-${marker.itemIndex}`}
            longitude={marker.item.location!.lng}
            latitude={marker.item.location!.lat}
            anchor="bottom"
            onClick={(e) => {
              e.originalEvent.stopPropagation();
              setSelectedMarker(marker);
              if (onMarkerClick) {
                onMarkerClick(marker.dayIndex, marker.item.id);
              }
            }}
          >
            <div
              className="cursor-pointer transition-transform hover:scale-110"
              style={{
                position: 'relative',
              }}
            >
              {/* Marker pin */}
              <div
                className="w-8 h-8 rounded-full border-2 border-white shadow-lg flex items-center justify-center text-sm"
                style={{ backgroundColor: marker.color }}
              >
                {TYPE_ICONS[marker.item.type] || '📍'}
              </div>
              {/* Day number badge */}
              <div
                className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-white border-2 flex items-center justify-center text-xs font-bold"
                style={{ borderColor: marker.color, color: marker.color }}
              >
                {marker.dayIndex + 1}
              </div>
              {/* Order number within day */}
              <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 bg-white border border-gray-300 rounded px-1 text-xs font-semibold shadow">
                {idx + 1}
              </div>
            </div>
          </Marker>
        ))}

        {/* Popup */}
        {selectedMarker && (
          <Popup
            longitude={selectedMarker.item.location!.lng}
            latitude={selectedMarker.item.location!.lat}
            anchor="top"
            onClose={() => setSelectedMarker(null)}
            closeOnClick={false}
          >
            <div className="p-2 max-w-xs">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xl">{TYPE_ICONS[selectedMarker.item.type] || '📍'}</span>
                <h3 className="font-bold text-sm">{selectedMarker.item.title}</h3>
              </div>
              <p className="text-xs text-gray-600 mb-1">
                Day {selectedMarker.dayIndex + 1}
                {selectedMarker.item.startTime && ` • ${selectedMarker.item.startTime}`}
              </p>
              <p className="text-xs text-gray-700">{selectedMarker.item.description}</p>
              {selectedMarker.item.duration && (
                <p className="text-xs text-gray-500 mt-1">⏱️ {selectedMarker.item.duration}</p>
              )}
              {selectedMarker.item.location?.address && (
                <p className="text-xs text-gray-500 mt-1">📍 {selectedMarker.item.location.address}</p>
              )}
            </div>
          </Popup>
        )}
      </Map>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg p-3 max-w-xs">
        <h4 className="font-semibold text-sm mb-2">Legend</h4>
        <div className="space-y-1">
          {trip.days.map((day, idx) => {
            const dayMarkers = markers.filter((m) => m.dayIndex === idx);
            if (dayMarkers.length === 0) return null;

            return (
              <div
                key={idx}
                className="flex items-center gap-2 text-xs cursor-pointer hover:bg-gray-50 p-1 rounded"
                onClick={() => centerOnDay(idx)}
              >
                <div
                  className="w-3 h-3 rounded-full border-2 border-white"
                  style={{ backgroundColor: DAY_COLORS[idx % DAY_COLORS.length] }}
                />
                <span className="font-medium">Day {idx + 1}</span>
                <span className="text-gray-500">({dayMarkers.length} stops)</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
