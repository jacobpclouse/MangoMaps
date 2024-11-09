
import React, { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'tailwindcss/tailwind.css';

mapboxgl.accessToken = 'pk.eyJ1Ijoid2FuZ3duaWNvIiwiYSI6ImNtM2FoeGtzZzFkZWMycG9tendleXhna2cifQ.FyBqY-UtfsFwpqeaY0vlpw';

const MapComponent: React.FC = () => {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const infoRef = useRef<HTMLDivElement>(null);

    const bounds: [number, number, number, number] = [-74.0210, 40.6981, -73.8655, 40.9153];
      
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
            // Add a source for the regions
            map.addSource('regions', {
                type: 'geojson',
                data: '/regions.geojson' // Path to your GeoJSON file
            });

            // Add a layer to display the regions
            map.addLayer({
                id: 'regions-layer',
                type: 'fill',
                source: 'regions',
                paint: {
                    'fill-color': '#888888',
                    'fill-opacity': 0.4
                }
            });

            // Add a layer for the region borders
            map.addLayer({
                id: 'regions-borders',
                type: 'line',
                source: 'regions',
                paint: {
                    'line-color': '#000000',
                    'line-width': 2
                }
            });

            // Insert a 3D building layer
            map.addLayer({
                'id': '3d-buildings',
                'source': 'composite',
                'source-layer': 'building',
                'filter': ['==', 'extrude', 'true'],
                'type': 'fill-extrusion',
                'minzoom': 15, // Minimum zoom level for showing 3D buildings
                'paint': {
                'fill-extrusion-color': '#aaa',
                'fill-extrusion-height': ['get', 'height'],
                'fill-extrusion-base': ['get', 'min_height'],
                'fill-extrusion-opacity': 0.6,
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
            })
        });

        return () => map.remove();
    }, []);

    return (
        <div>
            <div ref={mapContainerRef} className="absolute top-0 bottom-0 w-full" />
            <div ref={infoRef} className="absolute bottom-10 left-10 bg-white p-4" />
        </div>
    );
};

export default MapComponent;