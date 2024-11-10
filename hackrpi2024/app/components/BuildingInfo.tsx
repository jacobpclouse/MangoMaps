// app/components/BuildingInfo.tsx
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
        setBuildingInfo(data.results[0]); // Store the first nearby place
        console.log(data);
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
          <h3>{buildingInfo.name}</h3>
          <p>Address: {buildingInfo.vicinity}</p>
        </div>
      ) : (
        !error && <p>Loading...</p>
      )}
    </div>
  );
};

export default BuildingInfo;
