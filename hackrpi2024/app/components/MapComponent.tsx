import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'tailwindcss/tailwind.css';

mapboxgl.accessToken = 'pk.eyJ1Ijoid2FuZ3duaWNvIiwiYSI6ImNtM2FoeGtzZzFkZWMycG9tendleXhna2cifQ.FyBqY-UtfsFwpqeaY0vlpw';

const MapComponent: React.FC = () => {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const [loadingProgress, setLoadingProgress] = useState(0);
    const [isMapLoaded, setIsMapLoaded] = useState(false);

    const bounds: [number, number, number, number] = [-74.0210, 40.6981, -73.8655, 40.9153];
    const [selectedBuildingId, setSelectedBuildingId] = useState<number | null>(null);
    const [address, setAddress] = useState<string | null>(null);
    const [buildingInfo, setBuildingInfo] = useState<string | null>(null)
    const [highlightedBuilding, setHighlightedBuilding] = useState<string | null>(null); // To track the highlighted building

    useEffect(() => {
        const map = new mapboxgl.Map({
            container: mapContainerRef.current!,
            style: 'mapbox://styles/wangwnico/cm3ap0v5w00iv01qsb2d7hqfg',
            center: [-73.9654, 40.7829], // Centered on NYC
            zoom: 16,
            pitch: 60,
            bearing: -10,
            maxBounds: bounds,
        });
        
        // Increment loading progress faster with a simulated interval until fully loaded
        const interval = setInterval(() => {
            setLoadingProgress((prev) => (prev < 95 ? prev + 5 : prev));
        }, 100); // Increment by 5% every 100ms for faster loading effect
        
        map.on('load', () => {
            // Add the 3D buildings layer
            map.addLayer({
                'id': '3d-buildings',
                'source': 'composite',
                'source-layer': 'building',
                'filter': ['==', 'extrude', 'true'],
                'type': 'fill-extrusion',
                'minzoom': 15,
                'maxzoom': 22,
                'paint': {
                    'fill-extrusion-color': [
                        'interpolate',
                        ['linear'],
                        ['get', 'height'],
                        0, '#E3F2FD',       
                        20, '#BBDEFB',
                        40, '#90CAF9',
                        60, '#64B5F6',
                        80, '#42A5F5',
                        100, '#2196F3',     
                        150, '#1E88E5',
                        200, '#1976D2',
                        250, '#1565C0'      
                    ],
                    'fill-extrusion-height': ['get', 'height'],
                    'fill-extrusion-base': ['get', 'min_height'],
                    'fill-extrusion-opacity': 0.6,
                }
            });

            map.addLayer({
                'id': 'highlighted-building',
                'type': 'fill-extrusion',
                'source': 'composite',
                'source-layer': 'building',
                'filter': ['==', 'id', ''], // Initially no building is highlighted
                'paint': {
                    'fill-extrusion-color': '#ff0000', // Color of highlighted building
                    'fill-extrusion-opacity': 0.8,
                }
            });

            // End the interval and set loading to 100% when all data is loaded
            map.once('idle', () => {
                clearInterval(interval);
                setLoadingProgress(100);
                setIsMapLoaded(true);
            });

            map.on('click', (event) => {
                const { lng, lat } = event.lngLat;
                console.log("Longitude: " + lng + " Latitude: " + lat);
                reverseGeocode([lng, lat]);
                findBuildingAtCoordinates([lng, lat]);
            })
        });

        const reverseGeocode = async (coordinates: [number, number]) => {
            const [longitude, latitude] = coordinates;
            const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json?access_token=${mapboxgl.accessToken}`;

            try {
                const response = await fetch(url);
                const data = await response.json();
                const firstResult = data.features[0];

                if (firstResult) {
                    setAddress(firstResult.place_name);  // Extract and set the address
                } else {
                    setAddress("Address not found");
                }
            } catch (error) {
                console.error('Error in reverse geocoding:', error);
                setAddress("Error fetching address");
            }
        };

        const findBuildingAtCoordinates = (coordinates: [number, number]) => {
            const [longitude, latitude] = coordinates;
            
            // Use Mapbox's queryRenderedFeatures to query buildings layer at the clicked coordinates
            const features = map.queryRenderedFeatures(
                map.project([longitude, latitude]),
                { layers: ['3d-buildings'] }
            );

            if (features.length > 0) {
                const building = features[0];
                const buildingId = building.id as string;

                setBuildingInfo(`Building ID: ${building.id} Height: ${building.properties!.height}`);
                setHighlightedBuilding(buildingId);
                // Highlight the building by setting the filter of the 'highlighted-building' layer
                map.setFilter('highlighted-building', ['==', 'id', buildingId]);
            } else {
                setBuildingInfo("No building found at this location.");
                setHighlightedBuilding(null); // Reset if no building is found
            }
        };

        return () => map.remove();
    }, []);

    return (
        <div className="relative w-full h-screen">
            <div ref={mapContainerRef} className="absolute top-0 bottom-0 w-full h-full" />

            {!isMapLoaded ? (
                <div className="absolute inset-0 flex items-center justify-center bg-white z-50">
                    <div className="w-1/2 bg-gray-200 rounded-full h-4">
                        <div
                            className="bg-blue-500 h-4 rounded-full"
                            style={{ width: `${loadingProgress}%` }}
                        />
                    </div>
                </div>
            ) :
            (
                <div className="absolute top-0 right-0 p-4 bg-white text-black bg-opacity-70">
                    <h1 className="text-lg font-bold">Address: {address || 'Loading...'}</h1>
                    <h1 className="text-lg font-bold">Building Info: {buildingInfo || 'Loading...'}</h1>
                </div>
            )
            }
        </div>
    );
};

export default MapComponent;
