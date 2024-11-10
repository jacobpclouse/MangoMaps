import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const latitude = searchParams.get('latitude');
  const longitude = searchParams.get('longitude');
  
  if (!latitude || !longitude) {
    return NextResponse.json({ error: 'Latitude and longitude are required' }, { status: 400 });
  }

  const apiKey = 'AIzaSyAp4c2P5a1tvcUfFSkTIZelltuHcTpQAjs';

  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${latitude},${longitude}&radius=1000&type=premise&key=${apiKey}`
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.statusText}`);
    }

    const data = await response.json();
    
    // Optionally fetch details for each place
    const placesWithDetails = await Promise.all(
      data.results.map(async (place: any) => {
        const placeDetailsResponse = await fetch(
          `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place.place_id}&key=${apiKey}`
        );
        const placeDetails = await placeDetailsResponse.json();
        return { ...place, details: placeDetails.result };
      })
    );
    
    return NextResponse.json(placesWithDetails);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch building information' }, { status: 500 });
  }
}
