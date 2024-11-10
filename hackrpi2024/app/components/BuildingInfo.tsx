'use client';

import React, { useEffect, useState } from 'react';

interface BuildingInfoProps {
  latitude: number;
  longitude: number;
}

const BuildingInfo: React.FC<BuildingInfoProps> = ({ latitude, longitude }) => {
  const [buildingInfo, setBuildingInfo] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBuildingInfo = async () => {
      try {
        const response = await fetch(`/api/getBuildingInfo?latitude=${latitude}&longitude=${longitude}`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch: ${response.statusText}`);
        }

        const data = await response.json();
        setBuildingInfo(data.results); // Store the list of nearby places
        console.log("data, ", data); // Optional: for debugging
      } catch (err) {
        setError('Error fetching building information.');
        console.error(err);
      }
    };

    fetchBuildingInfo();
  }, [latitude, longitude]);

  return (
    <div>
      {error && <p>{error}</p>}
      {buildingInfo ? (
        <div>
          {buildingInfo.map((place: any, index: number) => (
            <div key={index} className="mb-4">
              <h3 className="text-xl font-bold">{place.name}</h3>
              <p><strong>Address:</strong> {place.vicinity}</p>
              {place.rating && (
                <p><strong>Rating:</strong> {place.rating} ({place.user_ratings_total} reviews)</p>
              )}
              {place.opening_hours && (
                <div>
                  <strong>Opening Hours:</strong>
                  <ul>
                    {place.opening_hours.weekday_text.map((day: string, i: number) => (
                      <li key={i}>{day}</li>
                    ))}
                  </ul>
                </div>
              )}
              {place.photos && place.photos.length > 0 && (
                <div>
                  <strong>Photos:</strong>
                  <img
                    src={`https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${place.photos[0].photo_reference}&key=AIzaSyAp4c2P5a1tvcUfFSkTIZelltuHcTpQAjs`}
                    alt="Building photo"
                    className="w-full h-auto my-2"
                  />
                </div>
              )}
              {place.price_level && (
                <p><strong>Price Level:</strong> {place.price_level}</p>
              )}
              <p><strong>Place Type:</strong> {place.types.join(', ')}</p>
            </div>
          ))}
        </div>
      ) : (
        !error && <p>Loading...</p>
      )}
    </div>
  );
};

export default BuildingInfo;
