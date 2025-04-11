'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Event {
  id: string;
  eventName: string;
  latitude: number;
  longitude: number;
  createdBy: string;
  imageUrl?: string;
  distance?: string;
}

interface EventMapProps {
  events: Event[];
}

// Default image URL
const DEFAULT_IMAGE = '/placeholder-event.jpg';

// Global variable to track if the script is already loaded
declare global {
  interface Window {
    google: any;
    initMap: () => void;
    markerClusterer: any;
  }
}

export default function EventMap({ events }: EventMapProps) {
  const router = useRouter();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<google.maps.Map | null>(null);
  const markers = useRef<google.maps.Marker[]>([]);
  const markerClusterer = useRef<any>(null);
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [validEvents, setValidEvents] = useState<Event[]>([]);
  const [maxDistance, setMaxDistance] = useState<number | null>(null); // Changed to allow null for "show all"
  const [customDistance, setCustomDistance] = useState<{ km: number; m: number }>({ km: 0, m: 0 });
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([]);

  // Function to calculate distance in kilometers
  const calculateDistanceInKm = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // Function to format distance
  const formatDistance = (distance: number): string => {
    if (distance < 1) {
      return `${Math.round(distance * 1000)} meters`;
    } else {
      const km = Math.floor(distance);
      const meters = Math.round((distance - km) * 1000);
      return `${km}km ${meters}m`;
    }
  };

  // Filter events based on distance
  useEffect(() => {
    if (!userLocation) return;

    const eventsWithDistance = validEvents.map(event => {
      const distance = calculateDistanceInKm(
        userLocation.lat,
        userLocation.lng,
        event.latitude,
        event.longitude
      );
      return {
        ...event,
        distance: formatDistance(distance),
        distanceInKm: distance
      };
    });

    // If no filter is applied (maxDistance is null), show all events
    const filtered = maxDistance === null 
      ? eventsWithDistance 
      : eventsWithDistance.filter(event => event.distanceInKm <= maxDistance);
    
    setFilteredEvents(filtered);
  }, [validEvents, userLocation, maxDistance]);

  // Handle custom distance input
  const handleCustomDistanceChange = (type: 'km' | 'm', value: string) => {
    const numValue = parseInt(value) || 0;
    setCustomDistance(prev => ({
      ...prev,
      [type]: numValue
    }));
  };

  // Apply custom distance filter
  const applyCustomDistance = () => {
    const totalDistance = customDistance.km + (customDistance.m / 1000);
    setMaxDistance(totalDistance);
  };

  // Reset filter to show all events
  const resetFilter = () => {
    setMaxDistance(null);
    setCustomDistance({ km: 0, m: 0 });
  };

  // Get user's current location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.error("Error getting location:", error);
        }
      );
    }
  }, []);

  // Log events when they change
  useEffect(() => {
    console.log('Events received by map:', events);
  }, [events]);

  useEffect(() => {
    // Check if script is already loaded
    if (window.google) {
      setIsScriptLoaded(true);
      return;
    }

    // Load Google Maps API
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=AIzaSyDGLM_J5yX62bYgvQiHaDLRlyKRwbNe7RQ&libraries=places,geometry`;
    script.async = true;
    script.defer = true;
    script.id = 'google-maps-script';

    // Load MarkerClusterer script
    const clusterScript = document.createElement('script');
    clusterScript.src = 'https://unpkg.com/@googlemaps/markerclusterer/dist/index.min.js';
    clusterScript.async = true;
    clusterScript.defer = true;
    clusterScript.id = 'marker-clusterer-script';

    // Define the callback function
    script.onload = () => {
      setIsScriptLoaded(true);
    };

    // Check if scripts are already in the document
    if (!document.getElementById('google-maps-script')) {
      document.head.appendChild(script);
    }
    if (!document.getElementById('marker-clusterer-script')) {
      document.head.appendChild(clusterScript);
    }

    return () => {
      // Cleanup function
      if (markerClusterer.current) {
        markerClusterer.current.clearMarkers();
      }
      markers.current.forEach(marker => marker.setMap(null));
      markers.current = [];
      if (document.getElementById('google-maps-script')) {
        document.head.removeChild(script);
      }
      if (document.getElementById('marker-clusterer-script')) {
        document.head.removeChild(clusterScript);
      }
    };
  }, []);

  useEffect(() => {
    if (!isScriptLoaded || !mapRef.current || !window.google) return;

    // Filter out events with invalid coordinates
    const filteredEvents = events.filter(event => {
      const isValid = !isNaN(event.latitude) && 
                     !isNaN(event.longitude) && 
                     event.latitude !== 0 && 
                     event.longitude !== 0;
      
      if (!isValid) {
        console.warn(`Invalid coordinates for event: ${event.eventName}`, {
          latitude: event.latitude,
          longitude: event.longitude,
          eventId: event.id
        });
      }
      
      return isValid;
    });

    setValidEvents(filteredEvents);

    // Create map instance if it doesn't exist
    if (!mapInstance.current) {
      const map = new window.google.maps.Map(mapRef.current, {
        center: { lat: 0, lng: 0 },
        zoom: 2,
        styles: [
          {
            featureType: 'all',
            elementType: 'labels.text.fill',
            stylers: [{ color: '#ffffff' }]
          },
          {
            featureType: 'all',
            elementType: 'labels.text.stroke',
            stylers: [{ visibility: 'off' }]
          },
          {
            featureType: 'all',
            elementType: 'labels.icon',
            stylers: [{ visibility: 'off' }]
          },
          {
            featureType: 'administrative',
            elementType: 'geometry.fill',
            stylers: [{ color: '#000000' }, { lightness: 20 }]
          },
          {
            featureType: 'administrative',
            elementType: 'geometry.stroke',
            stylers: [{ color: '#000000' }, { lightness: 17 }, { weight: 1.2 }]
          },
          {
            featureType: 'landscape',
            elementType: 'geometry',
            stylers: [{ color: '#000000' }, { lightness: 20 }]
          },
          {
            featureType: 'poi',
            elementType: 'geometry',
            stylers: [{ color: '#000000' }, { lightness: 21 }]
          },
          {
            featureType: 'road.highway',
            elementType: 'geometry.fill',
            stylers: [{ color: '#000000' }, { lightness: 17 }]
          },
          {
            featureType: 'road.highway',
            elementType: 'geometry.stroke',
            stylers: [{ color: '#000000' }, { lightness: 29 }, { weight: 0.2 }]
          },
          {
            featureType: 'road.arterial',
            elementType: 'geometry',
            stylers: [{ color: '#000000' }, { lightness: 18 }]
          },
          {
            featureType: 'road.local',
            elementType: 'geometry',
            stylers: [{ color: '#000000' }, { lightness: 16 }]
          },
          {
            featureType: 'transit',
            elementType: 'geometry',
            stylers: [{ color: '#000000' }, { lightness: 19 }]
          },
          {
            featureType: 'water',
            elementType: 'geometry',
            stylers: [{ color: '#000000' }, { lightness: 17 }]
          }
        ]
      });
      mapInstance.current = map;
    }

    const map = mapInstance.current;

    // Clear existing markers
    markers.current.forEach(marker => marker.setMap(null));
    markers.current = [];

    // Create bounds to fit all markers
    const bounds = new window.google.maps.LatLngBounds();

    // Calculate distances and filter events based on maxDistance
    const eventsWithDistance = filteredEvents.map(event => {
      const distance = userLocation 
        ? calculateDistanceInKm(userLocation.lat, userLocation.lng, event.latitude, event.longitude)
        : 0;
      return {
        ...event,
        distance: formatDistance(distance),
        distanceInKm: distance
      };
    });

    // Filter events based on maxDistance
    const eventsToShow = maxDistance === null
      ? eventsWithDistance
      : eventsWithDistance.filter(event => event.distanceInKm <= maxDistance);

    console.log('Events to show on map:', eventsToShow.length);

    // Group events by location
    const locationGroups = eventsToShow.reduce((groups, event) => {
      const key = `${event.latitude.toFixed(6)}_${event.longitude.toFixed(6)}`;
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(event);
      return groups;
    }, {} as Record<string, Event[]>);

    // Create markers for each location group
    Object.entries(locationGroups).forEach(([location, events]) => {
      const [lat, lng] = location.split('_').map(Number);
      const position = { lat, lng };
      
      console.log(`Creating marker for location: ${location} with ${events.length} events`);

      // Create custom marker icon
      const markerIcon = {
        path: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z',
        fillColor: events.length === 1 ? '#9333ea' : '#ef4444',
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeWeight: 2,
        scale: 1.5,
        anchor: new window.google.maps.Point(12, 24)
      };

      const marker = new window.google.maps.Marker({
        position,
        map,
        title: events.length === 1 ? events[0].eventName : `${events.length} events`,
        icon: markerIcon,
        animation: window.google.maps.Animation.DROP
      });

      // Add marker to bounds
      bounds.extend(position);

      // Create info window content
      const content = events.length === 1
        ? `
          <div class="p-2 max-w-sm">
            <div class="bg-gray-800 rounded-lg overflow-hidden shadow-lg cursor-pointer hover:bg-gray-700 transition-colors" 
                 onclick="window.dispatchEvent(new CustomEvent('navigateToEvent', { detail: '${events[0].id}' }))">
              <div class="relative h-48">
                <img src="${events[0].imageUrl || DEFAULT_IMAGE}" 
                     alt="${events[0].eventName}" 
                     class="w-full h-full object-cover"
                     onerror="this.src='${DEFAULT_IMAGE}'" />
              </div>
              <div class="p-4">
                <h3 class="font-bold text-purple-400 text-lg mb-2">${events[0].eventName}</h3>
                <p class="text-gray-400 text-sm">Created by: ${events[0].createdBy}</p>
                ${events[0].distance ? `
                  <p class="text-gray-400 text-sm mt-1 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    ${events[0].distance} away
                  </p>
                ` : ''}
              </div>
            </div>
          </div>
        `
        : `
          <div class="p-2 max-w-sm">
            <h3 class="font-bold text-red-400 text-lg mb-3">${events.length} Events at this location</h3>
            <div class="space-y-3 max-h-96 overflow-y-auto">
              ${events.map(event => `
                <div class="bg-gray-800 rounded-lg overflow-hidden shadow-lg cursor-pointer hover:bg-gray-700 transition-colors"
                     onclick="window.dispatchEvent(new CustomEvent('navigateToEvent', { detail: '${event.id}' }))">
                  <div class="relative h-32">
                    <img src="${event.imageUrl || DEFAULT_IMAGE}" 
                         alt="${event.eventName}" 
                         class="w-full h-full object-cover"
                         onerror="this.src='${DEFAULT_IMAGE}'" />
                  </div>
                  <div class="p-3">
                    <h4 class="font-medium text-purple-400 text-sm mb-1">${event.eventName}</h4>
                    <p class="text-gray-400 text-xs">Created by: ${event.createdBy}</p>
                    ${event.distance ? `
                      <p class="text-gray-400 text-xs mt-1 flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        ${event.distance} away
                      </p>
                    ` : ''}
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        `;

      // Create info window
      const infoWindow = new window.google.maps.InfoWindow({
        content,
        maxWidth: 300
      });

      // Add click event to marker
      marker.addListener('click', () => {
        // Close all other info windows
        markers.current.forEach(m => {
          const iw = m.get('infoWindow');
          if (iw) iw.close();
        });
        
        // Open this marker's info window
        infoWindow.open(map, marker);
        
        // Store info window reference
        marker.set('infoWindow', infoWindow);
      });

      // Add hover effects
      marker.addListener('mouseover', () => {
        marker.setAnimation(window.google.maps.Animation.BOUNCE);
      });

      marker.addListener('mouseout', () => {
        marker.setAnimation(null);
      });

      // Store marker reference
      markers.current.push(marker);
    });

    // Fit map to bounds if we have valid markers
    if (eventsToShow.length > 0) {
      console.log('Fitting map to bounds with markers:', eventsToShow.length);
      map.fitBounds(bounds);
    } else {
      console.warn('No valid markers to display on map');
      // Set a default view if no markers are visible
      map.setCenter({ lat: 0, lng: 0 });
      map.setZoom(2);
    }

    // Cleanup function
    return () => {
      markers.current.forEach(marker => marker.setMap(null));
      markers.current = [];
      if (markerClusterer.current) {
        markerClusterer.current.clearMarkers();
      }
    };
  }, [events, isScriptLoaded, router, userLocation, maxDistance]);

  // Function to render event card
  const renderEventCard = (event: Event, isMapCard: boolean = false) => {
    const cardClasses = isMapCard 
      ? "bg-gray-800 rounded-lg overflow-hidden shadow-lg cursor-pointer hover:bg-gray-700 transition-colors"
      : "bg-gray-800 rounded-lg overflow-hidden shadow-lg cursor-pointer hover:bg-gray-700 transition-colors transform hover:scale-105 duration-300";

    return `
      <div class="${cardClasses}" 
           onclick="window.dispatchEvent(new CustomEvent('navigateToEvent', { detail: '${event.id}' }))">
        <div class="relative ${isMapCard ? 'h-48' : 'h-64'}">
          <img src="${event.imageUrl || DEFAULT_IMAGE}" 
               alt="${event.eventName}" 
               class="w-full h-full object-cover"
               onerror="this.src='${DEFAULT_IMAGE}'" />
        </div>
        <div class="p-4">
          <h3 class="font-bold text-purple-400 ${isMapCard ? 'text-lg' : 'text-xl'} mb-2">${event.eventName}</h3>
          <p class="text-gray-400 ${isMapCard ? 'text-sm' : 'text-base'}">Created by: ${event.createdBy}</p>
          ${event.distance ? `
            <p class="text-gray-400 ${isMapCard ? 'text-sm' : 'text-base'} mt-1 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              ${event.distance} away
            </p>
          ` : ''}
        </div>
      </div>
    `;
  };

  return (
    <div className="space-y-8">
      {/* Distance Filter */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <label className="text-white">
            Show events within:
            <select 
              value={maxDistance || ''}
              onChange={(e) => {
                const value = e.target.value;
                if (value === 'custom') {
                  setMaxDistance(null);
                } else {
                  setMaxDistance(value ? Number(value) : null);
                }
              }}
              className="ml-2 bg-gray-800 text-white rounded px-2 py-1"
            >
              <option value="">All Events</option>
              <option value={10}>10 km</option>
              <option value={25}>25 km</option>
              <option value={50}>50 km</option>
              <option value={100}>100 km</option>
              <option value={200}>200 km</option>
              <option value={500}>500 km</option>
              <option value="custom">Custom Distance</option>
            </select>
          </label>
          {userLocation && (
            <span className="text-gray-400 text-sm">
              {filteredEvents.length} events found {maxDistance ? `within ${maxDistance}km` : 'in total'}
            </span>
          )}
        </div>

        {/* Custom Distance Input */}
        {maxDistance === null && (
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={customDistance.km}
                onChange={(e) => handleCustomDistanceChange('km', e.target.value)}
                placeholder="Kilometers"
                className="bg-gray-800 text-white rounded px-2 py-1 w-24"
                min="0"
              />
              <span className="text-white">km</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={customDistance.m}
                onChange={(e) => handleCustomDistanceChange('m', e.target.value)}
                placeholder="Meters"
                className="bg-gray-800 text-white rounded px-2 py-1 w-24"
                min="0"
                max="999"
              />
              <span className="text-white">m</span>
            </div>
            <button
              onClick={applyCustomDistance}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-1 rounded"
            >
              Apply
            </button>
            <button
              onClick={resetFilter}
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-1 rounded"
            >
              Show All
            </button>
          </div>
        )}
      </div>

      {/* Map Section */}
      <div className="w-full h-[400px] rounded-lg overflow-hidden shadow-lg">
        <div ref={mapRef} className="w-full h-full" />
      </div>

      {/* Events Grid Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredEvents.map(event => (
          <div 
            key={event.id}
            className="bg-gray-800 rounded-lg overflow-hidden shadow-lg cursor-pointer hover:bg-gray-700 transition-colors transform hover:scale-105 duration-300"
            onClick={() => router.push(`/events/${event.id}`)}
          >
            <div className="relative h-64">
              <img 
                src={event.imageUrl || DEFAULT_IMAGE} 
                alt={event.eventName} 
                className="w-full h-full object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = DEFAULT_IMAGE;
                }}
              />
            </div>
            <div className="p-4">
              <h3 className="font-bold text-purple-400 text-xl mb-2">{event.eventName}</h3>
              <p className="text-gray-400 text-base">Created by: {event.createdBy}</p>
              {event.distance && (
                <p className="text-gray-400 text-base mt-1 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {event.distance} away
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 