import { NextResponse } from 'next/server';
import axios from 'axios';

interface Location {
  latitude: number;
  longitude: number;
}

interface AirQualityData {
  aqi: string;
  category: string;
  color: {
    red: number;
    green: number;
    blue: number;
  };
}

export async function POST(request: Request) {
  try {
    const { location } = await request.json() as { location: Location };
    const apiKey = process.env.GOOGLE_MAPS_API_KEY_JUSTIN;

    if (!apiKey) {
      throw new Error('Google Maps API key is not configured');
    }

    const response = await axios.post(
      `https://airquality.googleapis.com/v1/currentConditions:lookup?key=${apiKey}`,
      { location },
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    const airQualityData = response.data.indexes.find(
      (index: { code: string }) => index.code === "uaqi"
    ) as AirQualityData;

    return NextResponse.json({
      airQuality: airQualityData ? airQualityData.aqi : "N/A",
      airQualityCategory: airQualityData ? airQualityData.category : "N/A",
      airQualityColor: airQualityData 
        ? `rgba(${airQualityData.color.red * 255}, ${airQualityData.color.green * 255}, ${airQualityData.color.blue * 255}, 1)` 
        : "rgba(0, 0, 0, 0)",
    });
  } catch (error) {
    console.error('Error fetching air quality data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch air quality data' },
      { status: 500 }
    );
  }
}