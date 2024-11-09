import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'tailwindcss/tailwind.css';

mapboxgl.accessToken = 'pk.eyJ1Ijoid2FuZ3duaWNvIiwiYSI6ImNtM2FoeGtzZzFkZWMycG9tendleXhna2cifQ.FyBqY-UtfsFwpqeaY0vlpw';

const MapComponent: React.FC = () => {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const [loadingProgress, setLoadingProgress] = useState(0);
    const [isMapLoaded, setIsMapLoaded] = useState(false);

    const bounds: [number, number, number, number] = [-74.0210, 40.6981, -73.8655, 40.9153];
    
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

            // End the interval and set loading to 100% when all data is loaded
            map.once('idle', () => {
                clearInterval(interval);
                setLoadingProgress(100);
                setIsMapLoaded(true);
            });
        });

        // Clean up on component unmount
        return () => map.remove();
    }, []);

    return (
        <div className="relative w-full h-screen">
            <div ref={mapContainerRef} className="absolute top-0 bottom-0 w-full h-full" />

            {!isMapLoaded && (
                <div className="absolute inset-0 flex items-center justify-center bg-white z-50">
                    <div className="w-1/2 bg-gray-200 rounded-full h-4">
                        <div
                            className="bg-blue-500 h-4 rounded-full"
                            style={{ width: `${loadingProgress}%` }}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default MapComponent;
