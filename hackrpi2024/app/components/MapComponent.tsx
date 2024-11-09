
import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'tailwindcss/tailwind.css';

mapboxgl.accessToken = 'pk.eyJ1Ijoid2FuZ3duaWNvIiwiYSI6ImNtM2FoeGtzZzFkZWMycG9tendleXhna2cifQ.FyBqY-UtfsFwpqeaY0vlpw';

const MapComponent: React.FC = () => {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const infoRef = useRef<HTMLDivElement>(null);

    const bounds: [number, number, number, number] = [-74.0210, 40.6981, -73.8655, 40.9153];
    const [selectedBuildingId, setSelectedBuildingId] = useState<number | null>(null);
    const [address, setAddress] = useState<string | null>(null);
    const [buildingInfo, setBuildingInfo] = useState<string | null>(null)
    const [highlightedBuilding, setHighlightedBuilding] = useState<string | null>(null); // To track the highlighted building

    useEffect(() => {
        const map = new mapboxgl.Map({
            container: mapContainerRef.current!,
            style: 'mapbox://styles/mapbox/streets-v11',
            center: [-73.9654, 40.7829], // Centered on NYC
            zoom: 15,
            pitch: 60,
            bearing: -20,
            maxBounds: bounds
        });

        map.on('load', () => {

            // Insert a 3D building layer with color based on height
            map.addLayer({
                'id': '3d-buildings',
                'source': 'composite',
                'source-layer': 'building',
                'filter': ['==', 'extrude', 'true'],
                'type': 'fill-extrusion',
                'minzoom': 15, // Minimum zoom level for showing 3D buildings
                'paint': {
                    'fill-extrusion-color': [
                        'interpolate',
                        ['linear'],
                        ['get', 'height'],
                        0, '#E3F2FD',       // Lightest blue
                        20, '#BBDEFB',
                        40, '#90CAF9',
                        60, '#64B5F6',
                        80, '#42A5F5',
                        100, '#2196F3',     // Medium blue
                        150, '#1E88E5',
                        200, '#1976D2',
                        250, '#1565C0'      // Darkest blue
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
            

            // Change the cursor to a pointer when the mouse is over the regions layer
            map.on('mouseenter', 'regions-layer', () => {
                map.getCanvas().style.cursor = 'pointer';
            });

            // Change the cursor back to default when it leaves the regions layer
            map.on('mouseleave', 'regions-layer', () => {
                map.getCanvas().style.cursor = '';
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
        <div>
            <div ref={mapContainerRef} className="absolute top-0 bottom-0 w-full" />
            <div ref={infoRef} className="absolute bottom-10 text-black left-10 bg-white p-4">
                {address ? (
                    <p>Street Address: {address}</p>
                ) : (
                    <p>Click on the map to get the street address.</p>
                )}
                {buildingInfo && <p>{buildingInfo}</p>}
            </div>
        </div>
    );
};

export default MapComponent;