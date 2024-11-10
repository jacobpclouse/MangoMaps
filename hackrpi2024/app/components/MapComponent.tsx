import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';

mapboxgl.accessToken = 'pk.eyJ1Ijoid2FuZ3duaWNvIiwiYSI6ImNtM2FoeGtzZzFkZWMycG9tendleXhna2cifQ.FyBqY-UtfsFwpqeaY0vlpw';

const MapComponent: React.FC = () => {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const [loadingProgress, setLoadingProgress] = useState(0);
    const [isMapLoaded, setIsMapLoaded] = useState(false);

    const bounds: [number, number, number, number] = [-74.0210, 40.6981, -73.8655, 40.9153];
    const [selectedBuildingId, setSelectedBuildingId] = useState<number | null>(null);
    const [address, setAddress] = useState<string | null>(null);
    const [buildingInfo, setBuildingInfo] = useState<string | null>(null);

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
        
        const interval = setInterval(() => {
            setLoadingProgress((prev) => (prev < 95 ? prev + 5 : prev));
        }, 100);

        map.on('load', () => {
            map.addLayer({
                'id': '3d-buildings',
                'source': 'composite',
                'source-layer': 'building',
                'filter': ['==', 'extrude', 'true'],
                'type': 'fill-extrusion',
                'minzoom': 15,
                'maxzoom': 20,
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
                id: 'highlighted-building',
                type: 'fill',
                source: 'composite',
                'source-layer': 'building', // the specific source layer in mapbox streets for buildings
                paint: {
                  'fill-color': '#FFD700', // Highlight color, e.g., gold
                  'fill-opacity': 0.6
                },
                filter: ['==', 'id', ''] // Initially filter to an empty string (no buildings highlighted)
              });

            map.once('idle', () => {
                clearInterval(interval);
                setLoadingProgress(100);
                setIsMapLoaded(true);
            });

            map.on('click', (event) => {
                const { lng, lat } = event.lngLat;
                reverseGeocode([lng, lat]);
            
                // Fly to the clicked location smoothly
                map.flyTo({
                    center: [lng, lat],
                    zoom: 18,
                    pitch: 40,
                    bearing: -10,
                    speed: 0.8,
                    curve: 1,
                    easing: (t) => t * (2 - t), // Smooth easing
                });
            
                const features = map.queryRenderedFeatures(
                    map.project([lng, lat]),
                    { layers: ['3d-buildings'] }
                );
            
                if (features.length > 0) {
                    const building = features[0];
                    const buildingId = building.id as number;
            
                    setBuildingInfo(`Building ID: ${buildingId} Height: ${building.properties!.height}`);
                    setSelectedBuildingId(buildingId);
            
                    // Disable extrusion from the 3d-buildings layer
                    map.setPaintProperty('3d-buildings', 'fill-extrusion-color', 'rgba(0, 0, 0, 0)'); // Make extrusion invisible
                    map.setPaintProperty('3d-buildings', 'fill-extrusion-height', 0);  // Set extrusion height to 0
            
                    // Remove the existing highlight layer if it exists
                    if (map.getLayer('highlighted-building-layer')) {
                        map.removeLayer('highlighted-building-layer');
                        map.removeSource('highlighted-building-source');
                    }
            
                    // Create a new source with only the selected building
                    map.addSource('highlighted-building-source', {
                        type: 'geojson',
                        data: {
                            type: 'FeatureCollection',
                            features: [building]  // Add only the selected building
                        }
                    });
            
                    // Add a new layer to highlight the selected building
                    map.addLayer({
                        id: 'highlighted-building-layer',
                        type: 'fill-extrusion',
                        source: 'highlighted-building-source',
                        paint: {
                            'fill-extrusion-color': '#00FF00',  // Highlight with green color
                            'fill-extrusion-height': ['get', 'height'],
                            'fill-extrusion-base': ['get', 'min_height'],
                            'fill-extrusion-opacity': 0.8,
                        }
                    });
                    
                } else {
                    setBuildingInfo("No building found at this location.");
            
                    // Clear selection by removing the highlighted building layer
                    setSelectedBuildingId(null);
                    if (map.getLayer('highlighted-building-layer')) {
                        map.removeLayer('highlighted-building-layer');
                        map.removeSource('highlighted-building-source');
                    }
            
                    // Restore extrusion for all buildings
                    map.setPaintProperty('3d-buildings', 'fill-extrusion-color', [
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
                    ]); // Restore color based on height
                    map.setPaintProperty('3d-buildings', 'fill-extrusion-height', ['get', 'height']);  // Restore extrusion height
                }
            });

            map.addSource('sandy-inundation', {
                type: 'geojson',
                data: '/sandy_inundation.geojson',
            });

            map.addLayer({
                id: 'sandy-inundation-layer',
                type: 'fill',
                source: 'sandy-inundation',
                paint: {
                    'fill-color': '#00008B', // Dark blue color for inundation areas
                    'fill-opacity': 0.5,
                },
            });
            
        }); 

        const reverseGeocode = async (coordinates: [number, number]) => {
            const [longitude, latitude] = coordinates;
            const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json?access_token=${mapboxgl.accessToken}`;

            try {
                const response = await fetch(url);
                const data = await response.json();
                const firstResult = data.features[0];

                if (firstResult) {
                    setAddress(firstResult.place_name);
                } else {
                    setAddress("Address not found");
                }
            } catch (error) {
                console.error('Error in reverse geocoding:', error);
                setAddress("Error fetching address");
            }
        };

        return () => map.remove();
    }, []); // Depend on updateTrigger to re-render when it changes

    return (
        <div className="relative w-full h-screen">
            <div ref={mapContainerRef} className="absolute top-0 bottom-0 w-full h-full" />

            {!isMapLoaded ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-white z-50">
                    <div className="w-1/2 bg-gray-200 rounded-full h-4 mb-4">
                        <div
                            className="bg-blue-500 h-4 rounded-full"
                            style={{ width: `${loadingProgress}%` }}
                        />
                    </div>
                    <p className="text-lg font-semibold text-black">Loading map... {loadingProgress}%</p>
                </div>
            ) : (
                <div className="absolute top-0 right-0 p-4 bg-white text-black bg-opacity-70">
                    <h1 className="text-lg font-bold">Address: {address || 'Loading...'}</h1>
                    <h1 className="text-lg font-bold">Building Info: {buildingInfo || 'Loading...'}</h1>
                </div>
            )}
        </div>
    );
};

export default MapComponent;
