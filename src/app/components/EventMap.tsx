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

  // Function to calculate distance and format it
  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): string => {
    if (!window.google || !window.google.maps) return '';
    
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c; // Distance in kilometers

    // Format distance
    if (distance < 1) {
      return `${Math.round(distance * 1000)} meters`;
    } else {
      const km = Math.floor(distance);
      const meters = Math.round((distance - km) * 1000);
      return `${km}km ${meters}m`;
    }
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

    // Clear existing markers and clusterer
    if (markerClusterer.current) {
      markerClusterer.current.clearMarkers();
    }
    markers.current.forEach(marker => marker.setMap(null));
    markers.current = [];

    // Initialize map with default center if no events
    const defaultCenter = events.length > 0 
      ? { lat: events[0].latitude, lng: events[0].longitude }
      : { lat: 0, lng: 0 };

    const map = new google.maps.Map(mapRef.current, {
      center: defaultCenter,
      zoom: events.length > 0 ? 10 : 2,
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

    // Filter out events with invalid coordinates
    const validEvents = events.filter(event => {
      const isValid = !isNaN(event.latitude) && 
                     !isNaN(event.longitude) && 
                     event.latitude !== 0 && 
                     event.longitude !== 0;
      
      if (!isValid) {
        console.warn(`Invalid coordinates for event: ${event.eventName}`, {
          latitude: event.latitude,
          longitude: event.longitude
        });
      }
      
      return isValid;
    });

    // Calculate distances for each event
    const eventsWithDistances = validEvents.map(event => ({
      ...event,
      distance: userLocation 
        ? calculateDistance(userLocation.lat, userLocation.lng, event.latitude, event.longitude)
        : ''
    }));

    // Group events by location
    const locationGroups = eventsWithDistances.reduce((groups, event) => {
      const key = `${event.latitude.toFixed(6)}_${event.longitude.toFixed(6)}`;
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(event);
      return groups;
    }, {} as Record<string, Event[]>);

    // Create markers for each location group
    const newMarkers = Object.entries(locationGroups).map(([location, events]) => {
      const [lat, lng] = location.split('_').map(Number);
      const isSingleEvent = events.length === 1;

      try {
        const marker = new google.maps.Marker({
          position: { lat, lng },
          map,
          title: isSingleEvent ? events[0].eventName : `${events.length} events`,
          icon: {
            url: isSingleEvent 
              ? 'https://maps.google.com/mapfiles/ms/icons/purple-dot.png'
              : 'https://maps.google.com/mapfiles/ms/icons/red-dot.png',
            scaledSize: new google.maps.Size(30, 30)
          }
        });

        // Create content for info window
        const content = isSingleEvent
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

        // Add info window
        const infoWindow = new google.maps.InfoWindow({
          content,
          maxWidth: 350
        });

        // Add event listener for navigation
        const handleNavigate = (e: CustomEvent) => {
          router.push(`/events/${e.detail}`);
        };

        window.addEventListener('navigateToEvent', handleNavigate as EventListener);

        marker.addListener('click', () => {
          // Close any open info windows
          markers.current.forEach(m => {
            const iw = m.get('infoWindow');
            if (iw) iw.close();
          });
          
          infoWindow.open(map, marker);
          marker.set('infoWindow', infoWindow);
        });

        // Cleanup event listener
        marker.addListener('unmount', () => {
          window.removeEventListener('navigateToEvent', handleNavigate as EventListener);
        });

        return marker;
      } catch (error) {
        console.error(`Error creating marker for location ${location}:`, error);
        return null;
      }
    }).filter(marker => marker !== null) as google.maps.Marker[];

    markers.current = newMarkers;

    // Create marker clusterer if available
    if (window.markerClusterer) {
      markerClusterer.current = new window.markerClusterer.MarkerClusterer({
        map,
        markers: newMarkers,
        renderer: {
          render: ({ count, position }) => {
            return new google.maps.Marker({
              position,
              icon: {
                path: google.maps.SymbolPath.CIRCLE,
                scale: 10 + Math.sqrt(count) * 2,
                fillColor: '#9333ea',
                fillOpacity: 0.8,
                strokeColor: '#ffffff',
                strokeWeight: 2,
              },
              label: {
                text: String(count),
                color: '#ffffff',
                fontSize: '12px',
              },
            });
          },
        },
      });
    }

    // Fit map to show all markers
    if (newMarkers.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      newMarkers.forEach(marker => {
        bounds.extend(marker.getPosition()!);
      });
      map.fitBounds(bounds);
    }
  }, [events, isScriptLoaded, router, userLocation]);

  return (
    <div className="w-full h-[400px] rounded-lg overflow-hidden shadow-lg">
      <div ref={mapRef} className="w-full h-full" />
    </div>
  );
} 