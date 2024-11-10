'use client';

import React, { useEffect, useState } from 'react';
import { Star, MapPin, Camera, Building, BatteryCharging } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

interface BuildingInfoProps {
  latitude: number;
  longitude: number;
}

interface BuildingData {
  name: string;
  vicinity: string;
  rating?: number;
  user_ratings_total?: number;
  photoURL?: string;
  types: string[];
  grade?: string;
}

const BuildingInfo: React.FC<BuildingInfoProps> = ({ latitude, longitude }) => {
  const [buildingInfo, setBuildingInfo] = useState<BuildingData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
    setBuildingInfo(null);

    const fetchBuildingInfo = async () => {
      try {
        const response = await fetch(
          `/api/getBuildingInfo?latitude=${latitude}&longitude=${longitude}`
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch: ${response.statusText}`);
        }

        const data = await response.json();
        setBuildingInfo(data);
      } catch (err) {
        setError('Unable to fetch building information. Please try again later.');
      }
    };

    fetchBuildingInfo();
  }, [latitude, longitude]);

  if (error) {
    return (
      <div className="rounded-lg bg-red-50 p-4 text-red-800">
        <p className="flex items-center gap-2">
          <span className="rounded-full bg-red-100 p-1">⚠️</span>
          {error}
        </p>
      </div>
    );
  }

  if (!buildingInfo) {
    return (
      <Card className="w-full">
        <CardHeader className="space-y-2">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building className="h-5 w-5" />
          {buildingInfo.name}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Address Section */}
        <div className="flex items-start gap-2">
          <MapPin className="mt-1 h-4 w-4 text-gray-500" />
          <p className="text-gray-600">{buildingInfo.vicinity}</p>
        </div>

        {/* Rating Section */}
        {buildingInfo.rating && (
          <div className="flex items-center gap-2">
            <Star className="h-4 w-4 text-yellow-400" />
            <span className="font-medium">{buildingInfo.rating}</span>
            <span className="text-sm text-gray-500">
              ({buildingInfo.user_ratings_total} reviews)
            </span>
          </div>
        )}

        {/* Building Photo */}
        {buildingInfo.photoURL && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Camera className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Building Photo</span>
            </div>
            <div className="overflow-hidden rounded-lg">
              <img
                src={buildingInfo.photoURL}
                alt={buildingInfo.name}
                className="h-48 w-full object-cover transition-transform hover:scale-105"
              />
            </div>
          </div>
        )}

        {/* Place Types */}
        <div className="flex flex-wrap gap-2">
          {buildingInfo.types.map((type) => (
            <Badge key={type} variant="secondary" className="capitalize">
              {type.replace(/_/g, ' ')}
            </Badge>
          ))}
        </div>

        {/* Energy Score */}
        {buildingInfo.grade && (
          <div className="flex items-center gap-2">
            <BatteryCharging className="h-4 w-4 text-green-500" />
            <span className="font-medium">Energy Grade: {buildingInfo.grade}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default BuildingInfo;