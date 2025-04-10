'use client';
import React from 'react';

export default function LocationPicker({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  const handleSelectLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        if (latitude && longitude) {
          onPick(latitude, longitude);
        } else {
          alert("Unable to fetch location values");
        }
      },
      (error) => {
        console.error("Geolocation error:", error);
        alert("Failed to get your location");
      }
    );
  };

  return (
    <button
      onClick={handleSelectLocation}
      className="bg-green-500 text-white px-4 py-2 rounded"
    >
      Use Current Location
    </button>
  );
}
