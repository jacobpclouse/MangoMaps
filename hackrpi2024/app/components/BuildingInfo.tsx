'use client';

import React, { useEffect, useState } from 'react';

interface BuildingInfoProps {
  latitude: number;
  longitude: number;
}

const BuildingInfo: React.FC<BuildingInfoProps> = ({ latitude, longitude }) => {
  const [buildingInfo, setBuildingInfo] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  console.log('latitude', latitude);
  console.log('longitude', longitude);

  useEffect(() => {
    setError(null);
    setBuildingInfo(null);
    const fetchBuildingInfo = async () => {
      try {
        const response = await fetch(`/api/getBuildingInfo?latitude=${latitude}&longitude=${longitude}`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch: ${response.statusText}`);
        }

        const data = await response.json();

        console.log('data', data); 

        setBuildingInfo(data);
      } catch (err) {
        setError('Error fetching building information.');
        //console.error(err);
      }
    };

    fetchBuildingInfo();
  }, [latitude, longitude]);

  return (
    <div>
      {error && <p>{error}</p>}
      {buildingInfo ? (
        <div>
          <div className="mb-4">
            <h3 className="text-xl font-bold">{buildingInfo.name}</h3>
            <p><strong>Address:</strong> {buildingInfo.vicinity}</p>
            {buildingInfo.rating && (
              <p><strong>Rating:</strong> {buildingInfo.rating} ({buildingInfo.user_ratings_total} reviews)</p>
            )}
            {buildingInfo.photos && buildingInfo.photos.length > 0 && (
              <div>
                <strong>Photo:</strong>
                <img
                  src={buildingInfo.photoURL}
                  alt="Building photo"
                />
              </div>
            )}
            <p><strong>Place Type:</strong> {buildingInfo.types.join(', ')}</p>
          </div>
        </div>
      ) : (
        !error && <p>Loading...</p>
      )}
    </div>
  );
};

export default BuildingInfo;
