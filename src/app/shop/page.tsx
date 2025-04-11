"use client";

import React, { useEffect, useState } from 'react';
import { LoadScript, GoogleMap, Marker, InfoWindow } from '@react-google-maps/api';
import Image from 'next/image';
import { getAuth } from 'firebase/auth';
import { useGoogleMaps } from '@/hooks/useGoogleMaps';
import Header from '@/app/Header/page';
import { getShops } from '@/firebase/firestore';

interface Shop {
  lat: number;
  long: number;
  place_name: string;
  description: string;
  category: number;
  placeId?: string;
  images?: string[];
}

const center = { lat: 12.9716, lng: 77.5946 }; // Bangalore center
const mapContainerStyle = { width: '100%', height: '100%' };
const libraries: ("places" | "geometry")[] = ["places"];

export default function ShopPage() {
  const [shops, setShops] = useState<Shop[]>([]);
  const [selectedShop, setSelectedShop] = useState<Shop | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [showImageGallery, setShowImageGallery] = useState(false);
  const [loadingImages, setLoadingImages] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isGoogleMapsLoaded = useGoogleMaps();

  const fetchPlaceDetails = async (shop: Shop) => {
    if (!map) return shop;
    
    const service = new google.maps.places.PlacesService(map);
    const request = {
      location: new google.maps.LatLng(shop.lat, shop.long),
      radius: 500, // Increased radius to 500m to find nearby places
      keyword: shop.category === 1 ? 'restaurant' : 
               shop.category === 2 ? 'hotel' : 'temple'
    };

    return new Promise<Shop>((resolve) => {
      service.nearbySearch(request, (results, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && results && results.length > 0) {
          // Try to find exact match first
          const exactMatch = results.find(result => 
            result.name.toLowerCase().includes(shop.place_name.toLowerCase())
          );
          
          const placeToUse = exactMatch || results[0]; // Use exact match or first result
          const placeId = placeToUse.place_id;
          
          service.getDetails({ 
            placeId, 
            fields: ['photos', 'name', 'vicinity'] 
          }, (place, status) => {
            if (status === google.maps.places.PlacesServiceStatus.OK && place && place.photos) {
              const photos = place.photos.slice(0, 3).map(photo => photo.getUrl({ maxWidth: 800 }));
              resolve({ 
                ...shop, 
                placeId, 
                images: photos,
                // Update name and description if using nearby place
                place_name: exactMatch ? shop.place_name : `${shop.place_name} (Nearby: ${place.name})`,
                description: exactMatch ? shop.description : `${shop.description}\nNearby: ${place.vicinity}`
              });
            } else {
              // If no photos found, try next place
              if (results.length > 1) {
                const nextPlace = results[1];
                service.getDetails({ 
                  placeId: nextPlace.place_id, 
                  fields: ['photos', 'name', 'vicinity'] 
                }, (nextPlaceDetails, status) => {
                  if (status === google.maps.places.PlacesServiceStatus.OK && nextPlaceDetails && nextPlaceDetails.photos) {
                    const photos = nextPlaceDetails.photos.slice(0, 3).map(photo => photo.getUrl({ maxWidth: 800 }));
                    resolve({ 
                      ...shop, 
                      placeId: nextPlace.place_id, 
                      images: photos,
                      place_name: `${shop.place_name} (Nearby: ${nextPlaceDetails.name})`,
                      description: `${shop.description}\nNearby: ${nextPlaceDetails.vicinity}`
                    });
                  } else {
                    resolve(shop);
                  }
                });
              } else {
                resolve(shop);
              }
            }
          });
        } else {
          resolve(shop);
        }
      });
    });
  };

  useEffect(() => {
    const fetchShops = async () => {
      try {
        const shopsData = await getShops();
        const shopsWithDetails = await Promise.all(
          shopsData.map((shop: Shop) => fetchPlaceDetails(shop))
        );
        setShops(shopsWithDetails);
      } catch (err) {
        console.error('Error fetching shops:', err);
        setError('Failed to load shops');
      } finally {
        setLoading(false);
      }
    };

    if (isGoogleMapsLoaded) {
      fetchShops();
    }

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.error('Error getting location:', error);
        }
      );
    }
  }, [isGoogleMapsLoaded]);

  const handleMarkerClick = async (shop: Shop) => {
    setSelectedShop(shop);
    if (!shop.images) {
      setLoadingImages(true);
      const updatedShop = await fetchPlaceDetails(shop);
      setSelectedShop(updatedShop);
      setLoadingImages(false);
    }
    setShowImageGallery(true);
  };

  const getCategoryIcon = (category: number) => {
    const iconSize = 30;
    switch (category) {
      case 1: // Food
        return {
          url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#FF6B6B" width="${iconSize}" height="${iconSize}">
              <path d="M8.1 13.34l2.83-2.83L3.91 3.5c-1.56 1.56-1.56 4.09 0 5.66l4.19 4.18zm6.78-1.81c1.53.71 3.68.21 5.27-1.38 1.91-1.91 2.28-4.65.81-6.12-1.46-1.46-4.2-1.1-6.12.81-1.59 1.59-2.09 3.74-1.38 5.27L3.7 19.87l1.41 1.41L12 14.41l6.88 6.88 1.41-1.41L13.41 13l1.47-1.47z"/>
            </svg>
          `)}`,
          scaledSize: new window.google.maps.Size(iconSize, iconSize),
          anchor: new window.google.maps.Point(iconSize/2, iconSize/2)
        };
      case 2: // Stay
        return {
          url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#4ECDC4" width="${iconSize}" height="${iconSize}">
              <path d="M12 2L4 7v10l8 5 8-5V7l-8-5zm0 2.5L18 8v8l-6 3.75L6 16V8l6-3.5z"/>
              <path d="M12 7.5l-4 2.5v5l4 2.5 4-2.5v-5l-4-2.5z"/>
            </svg>
          `)}`,
          scaledSize: new window.google.maps.Size(iconSize, iconSize),
          anchor: new window.google.maps.Point(iconSize/2, iconSize/2)
        };
      case 3: // Temple
        return {
          url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#FFD166" width="${iconSize}" height="${iconSize}">
              <path d="M12 2L4 5v6.09c0 5.05 3.41 9.76 8 10.91 4.59-1.15 8-5.86 8-10.91V5l-8-3zm6 9.09c0 4-2.55 7.7-6 8.83-3.45-1.13-6-4.82-6-8.83V6.31l6-2.12 6 2.12v4.78z"/>
              <path d="M12 7.5c-1.1 0-2 .9-2 2v2h4v-2c0-1.1-.9-2-2-2z"/>
            </svg>
          `)}`,
          scaledSize: new window.google.maps.Size(iconSize, iconSize),
          anchor: new window.google.maps.Point(iconSize/2, iconSize/2)
        };
      default:
        return {
          url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#6C757D" width="${iconSize}" height="${iconSize}">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
            </svg>
          `)}`,
          scaledSize: new window.google.maps.Size(iconSize, iconSize),
          anchor: new window.google.maps.Point(iconSize/2, iconSize/2)
        };
    }
  };

  const onMapLoad = (map: google.maps.Map) => {
    setMap(map);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Header />
      
      {isGoogleMapsLoaded ? (
        <div className="flex h-screen">
          {/* Left panel - Shop list and Image Gallery */}
          <div className="w-1/3 p-6 bg-white/95 backdrop-blur-md shadow-xl overflow-y-auto">
            <h2 className="text-2xl font-bold mb-6">✨ Places in Bangalore ✨</h2>
            
            {showImageGallery && selectedShop ? (
              <div className="mb-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-semibold">{selectedShop.place_name}</h3>
                  <button 
                    onClick={() => setShowImageGallery(false)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    Back to List
                  </button>
                </div>
                {loadingImages ? (
                  <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                  </div>
                ) : selectedShop.images && selectedShop.images.length > 0 ? (
                  <div className="grid grid-cols-2 gap-4">
                    {selectedShop.images.map((image, index) => (
                      <div key={index} className="relative aspect-square rounded-lg overflow-hidden">
                        <Image
                          src={image}
                          alt={`${selectedShop.place_name} - Image ${index + 1}`}
                          fill
                          className="object-cover"
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-gray-500 py-8">
                    No images available for this location
                  </div>
                )}
              </div>
            ) : (
              <>
                {/* Category Legend */}
                <div className="flex items-center space-x-4 mb-6">
                  <div className="flex items-center">
                    <div className="w-6 h-6 mr-2" dangerouslySetInnerHTML={{ __html: `
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#FF6B6B" width="24" height="24">
                        <path d="M8.1 13.34l2.83-2.83L3.91 3.5c-1.56 1.56-1.56 4.09 0 5.66l4.19 4.18zm6.78-1.81c1.53.71 3.68.21 5.27-1.38 1.91-1.91 2.28-4.65.81-6.12-1.46-1.46-4.2-1.1-6.12.81-1.59 1.59-2.09 3.74-1.38 5.27L3.7 19.87l1.41 1.41L12 14.41l6.88 6.88 1.41-1.41L13.41 13l1.47-1.47z"/>
                      </svg>
                    ` }} />
                    <span className="text-sm">Food</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-6 h-6 mr-2" dangerouslySetInnerHTML={{ __html: `
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#4ECDC4" width="24" height="24">
                        <path d="M12 2L4 7v10l8 5 8-5V7l-8-5zm0 2.5L18 8v8l-6 3.75L6 16V8l6-3.5z"/>
                        <path d="M12 7.5l-4 2.5v5l4 2.5 4-2.5v-5l-4-2.5z"/>
                      </svg>
                    ` }} />
                    <span className="text-sm">Stay</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-6 h-6 mr-2" dangerouslySetInnerHTML={{ __html: `
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#FFD166" width="24" height="24">
                        <path d="M12 2L4 5v6.09c0 5.05 3.41 9.76 8 10.91 4.59-1.15 8-5.86 8-10.91V5l-8-3zm6 9.09c0 4-2.55 7.7-6 8.83-3.45-1.13-6-4.82-6-8.83V6.31l6-2.12 6 2.12v4.78z"/>
                        <path d="M12 7.5c-1.1 0-2 .9-2 2v2h4v-2c0-1.1-.9-2-2-2z"/>
                      </svg>
                    ` }} />
                    <span className="text-sm">Temple</span>
                  </div>
                </div>
                
                <div className="space-y-4">
                  {shops.map((shop, index) => (
                    <div
                      key={index}
                      className="bg-white rounded-lg shadow-md p-4 cursor-pointer hover:shadow-lg transition-shadow"
                      onClick={() => handleMarkerClick(shop)}
                    >
                      <h3 className="font-semibold text-lg">{shop.place_name}</h3>
                      <p className="text-sm text-gray-600 mt-1">{shop.description}</p>
                      <div className="flex items-center mt-2">
                        <span className="text-xs text-gray-500">
                          {shop.category === 1 ? 'Food' : 
                           shop.category === 2 ? 'Stay' : 'Temple'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Right panel - Map */}
          <div className="flex-1">
            <LoadScript 
              googleMapsApiKey="AIzaSyDGLM_J5yX62bYgvQiHaDLRlyKRwbNe7RQ"
              libraries={libraries}
              onLoad={() => setIsLoaded(true)}
            >
              <GoogleMap
                mapContainerStyle={mapContainerStyle}
                center={userLocation || center}
                zoom={12}
                onLoad={onMapLoad}
                options={{
                  styles: [
                    {
                      "featureType": "poi",
                      "elementType": "labels.icon",
                      "stylers": [{ "visibility": "off" }]
                    },
                    {
                      "featureType": "poi",
                      "elementType": "labels.text",
                      "stylers": [{ "visibility": "on" }]
                    },
                    {
                      "featureType": "transit",
                      "elementType": "all",
                      "stylers": [{ "visibility": "off" }]
                    },
                    {
                      "featureType": "road",
                      "elementType": "labels.icon",
                      "stylers": [{ "visibility": "off" }]
                    },
                    {
                      "featureType": "administrative",
                      "elementType": "labels.icon",
                      "stylers": [{ "visibility": "off" }]
                    },
                    {
                      "elementType": "geometry",
                      "stylers": [{ "color": "#242f3e" }]
                    },
                    {
                      "elementType": "labels.text.fill",
                      "stylers": [{ "color": "#746855" }]
                    },
                    {
                      "elementType": "labels.text.stroke",
                      "stylers": [{ "color": "#242f3e" }]
                    },
                    {
                      "featureType": "administrative.locality",
                      "elementType": "labels.text.fill",
                      "stylers": [{ "color": "#d59563" }]
                    },
                    {
                      "featureType": "poi",
                      "elementType": "labels.text.fill",
                      "stylers": [{ "color": "#d59563" }]
                    },
                    {
                      "featureType": "poi.park",
                      "elementType": "geometry",
                      "stylers": [{ "color": "#263c3f" }]
                    },
                    {
                      "featureType": "poi.park",
                      "elementType": "labels.text.fill",
                      "stylers": [{ "color": "#6b9a76" }]
                    },
                    {
                      "featureType": "road",
                      "elementType": "geometry",
                      "stylers": [{ "color": "#38414e" }]
                    },
                    {
                      "featureType": "road",
                      "elementType": "geometry.stroke",
                      "stylers": [{ "color": "#212a37" }]
                    },
                    {
                      "featureType": "road",
                      "elementType": "labels.text.fill",
                      "stylers": [{ "color": "#9ca5b3" }]
                    },
                    {
                      "featureType": "road.highway",
                      "elementType": "geometry",
                      "stylers": [{ "color": "#746855" }]
                    },
                    {
                      "featureType": "road.highway",
                      "elementType": "geometry.stroke",
                      "stylers": [{ "color": "#1f2835" }]
                    },
                    {
                      "featureType": "road.highway",
                      "elementType": "labels.text.fill",
                      "stylers": [{ "color": "#f3d19c" }]
                    },
                    {
                      "featureType": "water",
                      "elementType": "geometry",
                      "stylers": [{ "color": "#17263c" }]
                    },
                    {
                      "featureType": "water",
                      "elementType": "labels.text.fill",
                      "stylers": [{ "color": "#515c6d" }]
                    },
                    {
                      "featureType": "water",
                      "elementType": "labels.text.stroke",
                      "stylers": [{ "color": "#17263c" }]
                    }
                  ],
                  disableDefaultUI: true,
                  zoomControl: true,
                  mapTypeControl: true,
                  mapTypeControlOptions: {
                    position: google.maps.ControlPosition.TOP_RIGHT,
                    style: google.maps.MapTypeControlStyle.DROPDOWN_MENU,
                    mapTypeIds: [
                      google.maps.MapTypeId.ROADMAP,
                      google.maps.MapTypeId.SATELLITE
                    ]
                  },
                  streetViewControl: true,
                  fullscreenControl: false
                }}
              >
                {/* User location marker */}
                {userLocation && (
                  <Marker
                    position={userLocation}
                    icon={{
                      path: google.maps.SymbolPath.CIRCLE,
                      scale: 10,
                      fillColor: '#4285F4',
                      fillOpacity: 1,
                      strokeColor: '#ffffff',
                      strokeWeight: 2
                    }}
                  />
                )}

                {/* Shop markers */}
                {isLoaded && shops.map((shop, index) => (
                  <Marker
                    key={index}
                    position={{ lat: shop.lat, lng: shop.long }}
                    onClick={() => handleMarkerClick(shop)}
                    icon={getCategoryIcon(shop.category)}
                    animation={selectedShop?.place_name === shop.place_name ? google.maps.Animation.BOUNCE : undefined}
                  />
                ))}

                {/* Info window for selected shop */}
                {selectedShop && (
                  <InfoWindow
                    position={{ lat: selectedShop.lat, lng: selectedShop.long }}
                    onCloseClick={() => setSelectedShop(null)}
                  >
                    <div className="p-2">
                      <h3 className="font-semibold">{selectedShop.place_name}</h3>
                      <p className="text-sm">{selectedShop.description}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {selectedShop.category === 1 ? 'Food' : 
                         selectedShop.category === 2 ? 'Stay' : 'Temple'}
                      </p>
                    </div>
                  </InfoWindow>
                )}
              </GoogleMap>
            </LoadScript>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="mt-4 text-gray-300">Loading map...</p>
          </div>
        </div>
      )}
    </div>
  );
}
