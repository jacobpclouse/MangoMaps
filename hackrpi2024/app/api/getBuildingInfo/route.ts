import { NextResponse } from 'next/server';

const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const dLat = lat2 - lat1;
  const dLon = lon2 - lon1;

  // Calculate Euclidean distance (ignoring Earth curvature, assuming flat 2D space)
  const distance = Math.sqrt(dLat * dLat + dLon * dLon);

  return distance;
};

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const latitude = searchParams.get('latitude');
  const longitude = searchParams.get('longitude');
  
  if (!latitude || !longitude || latitude === 'undefined' || longitude === 'undefined') {
    return NextResponse.json({ error: 'Latitude and longitude are required' }, { status: 400 });
  }

  const apiKey = 'AIzaSyAp4c2P5a1tvcUfFSkTIZelltuHcTpQAjs';

  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${latitude},${longitude}&radius=100&key=${apiKey}`
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.statusText}`);
    }

    const data = await response.json();

    const places = data.results;

    if (places.length > 0) {
      const sortedPlaces = places.map((place: any) => {
        const distance = calculateDistance(
          Number(latitude),
          Number(longitude),
          place.geometry.location.lat,
          place.geometry.location.lng
        );
        return { ...place, distance };
      }).sort((a: any, b: any) => a.distance - b.distance);


      if (sortedPlaces[0].photos) {
        try {
          const photoResponse = await fetch(`https://maps.googleapis.com/maps/api/place/photo?maxheight=500&maxwidth=500&photo_reference=${sortedPlaces[0].photos[0].photo_reference}&key=${apiKey}`);
          if (!photoResponse.ok) {
            throw new Error(`Failed to fetch: ${photoResponse.statusText}`);
          }
          
          sortedPlaces[0].photoURL = photoResponse.url;
          return NextResponse.json(sortedPlaces[0]);
        } catch (error) {
          //console.error(error);
          return NextResponse.json({ error: 'Failed to fetch photo information' }, { status: 500 });
        }
      }

      return NextResponse.json(sortedPlaces[0]);

    } else {
      throw new Error(`Failed to fetch: ${response.statusText}`);
    }
  } catch (error) {
    //console.error(error);
    return NextResponse.json({ error: 'Failed to fetch building information' }, { status: 500 });
  }
}