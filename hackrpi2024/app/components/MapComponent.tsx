import React, { useEffect, useRef, useState } from "react";
import mapboxgl, { DataDrivenPropertyValueSpecification } from "mapbox-gl";
import BuildingInfo from "./BuildingInfo";
import DisasterToolbar from "./Disaster";
import axios from "axios";
import LoadingBar from "./LoadingBar";

mapboxgl.accessToken = "pk.eyJ1Ijoid2FuZ3duaWNvIiwiYSI6ImNtM2FoeGtzZzFkZWMycG9tendleXhna2cifQ.FyBqY-UtfsFwpqeaY0vlpw";

const MapComponent: React.FC = () => {
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const bounds: [number, number, number, number] = [
    -74.021, 40.6981, -73.8655, 40.9153,
  ];
  const [buildingInfo, setBuildingInfo] = useState<{lng: number, lat: number} | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const [currMap, setCurrMap] = useState<mapboxgl.Map | null>(null);



  const [isFloodVisible, setIsFloodVisible] = useState<boolean>(false);
  const toggleFloodVisibility = () => {
    if (currMap) {
      const newVisibility = isFloodVisible ? "none" : "visible";
      currMap.setLayoutProperty(
        "sandy-inundation-layer",
        "visibility",
        newVisibility
      );
      setIsFloodVisible(!isFloodVisible);
    }
  };

  const [isEvacuationVisible, setIsEvacuationVisible] = useState<boolean>(false);
  const toggleEvacuationVisibility = () => {
    if (currMap) {
      const newVisibility = isEvacuationVisible ? "none" : "visible";
      currMap.setLayoutProperty(
        "hurricane-evac-layer",
        "visibility",
        newVisibility
      );
      setIsEvacuationVisible(!isEvacuationVisible);
    }
  };

  const [isAirVisible, setIsAirVisible] = useState<boolean>(false);
  const toggleAirVisibility = () => {
    if (currMap) {
      if (!isAirVisible) {
        currMap.flyTo({
          center: [-73.9654, 40.7829], // Centered on NYC
          zoom: 12, // Zoom out to a larger view
          pitch: 0, // Set to top-down view
          bearing: 0, // Reset bearing to north
        });
        if (currMap.getLayer('air-quality-labels')) {
          currMap.setLayoutProperty('air-quality-labels', 'visibility', 'visible');
        }
        if (currMap.getLayer('air-quality-polygons')) {
          currMap.setLayoutProperty('air-quality-polygons', 'visibility', 'visible');
        }
        else {
          fetchAirQualityData();
        }
      } else {
        // Set air quality labels and polygons to be invisible
        if (currMap.getLayer('air-quality-labels')) {
          currMap.setLayoutProperty('air-quality-labels', 'visibility', 'none');
        }
        if (currMap.getLayer('air-quality-polygons')) {
          currMap.setLayoutProperty('air-quality-polygons', 'visibility', 'none');
        }
      }
      setIsAirVisible(!isAirVisible);
    }
  };

  useEffect(() => {
    if (mapContainerRef.current && !currMap) {
      const map = new mapboxgl.Map({
        container: mapContainerRef.current!,
        style: "mapbox://styles/wangwnico/cm3ap0v5w00iv01qsb2d7hqfg",
        center: [-73.9654, 40.7829], // Centered on NYC
        zoom: 16,
        pitch: 60,
        bearing: -10,
        maxBounds: bounds,
      });

      const interval = setInterval(() => {
        setLoadingProgress((prev) => (prev < 95 ? prev + 5 : prev));
      }, 100);

      map.on("load", () => {
        const defaultBuildingPaint: DataDrivenPropertyValueSpecification<string> = [
          "interpolate",
          ["linear"],
          ["get", "height"],
          0,
          "#E3F2FD",
          20,
          "#BBDEFB",
          40,
          "#90CAF9",
          60,
          "#64B5F6",
          80,
          "#42A5F5",
          100,
          "#2196F3",
          150,
          "#1E88E5",
          200,
          "#1976D2",
          250,
          "#1565C0",
        ];

        // Add zip code GeoJSON data as a source
        map.addSource('zip-codes', {
          type: 'geojson',
          data: '/zipCodeData.geojson'
        });

        // Add a layer to display the zip code boundaries
        map.addLayer({
          id: 'zip-code-boundaries',
          type: 'line',
          source: 'zip-codes',
          paint: {
            'line-color': '#888',
            'line-width': 2,
          },
        });
        
        map.addSource("sandy-inundation", {
          type: "geojson",
          data: "/sandy_inundation.geojson",
        });

        map.addLayer({
          id: "sandy-inundation-layer",
          type: "fill",
          source: "sandy-inundation",
          paint: {
            "fill-color": "#00008B", // Dark blue color for inundation areas
            "fill-opacity": 0.5,
          },
        });

        map.setLayoutProperty(
          "sandy-inundation-layer",
          "visibility",
          isFloodVisible ? "visible" : "none"
        );
        
        map.addSource("hurricane-evacuation", {
          type: "geojson",
          data: "Hurricane_Evac.geojson", // Replace with the correct path to your file
        });
        
        map.addLayer({
          id: "hurricane-evac-layer",
          type: "circle", // Change to 'circle' to display points instead of fill
          source: "hurricane-evacuation",
          paint: {
            "circle-color": "#FF6347", // Tomato red color for evacuation centers
            "circle-radius": 6, // Adjust radius to suit your map's scale
            "circle-opacity": 0.7,
          },
        });
        
        
        map.setLayoutProperty(
          "hurricane-evac-layer",
          "visibility",
          isEvacuationVisible ? "visible" : "none" // Control visibility based on the `isEvacuationVisible` variable
        );

        map.addLayer({
          id: "3d-buildings",
          source: "composite",
          "source-layer": "building",
          filter: ["==", "extrude", "true"],
          type: "fill-extrusion",
          minzoom: 15,
          maxzoom: 20,
          paint: {
            "fill-extrusion-color": defaultBuildingPaint,
            "fill-extrusion-height": ["get", "height"],
            "fill-extrusion-base": ["get", "min_height"],
            "fill-extrusion-opacity": 0.85,
          },
        });

        map.once("idle", () => {
          clearInterval(interval);
          setLoadingProgress(100);
          setIsMapLoaded(true);
        });

        map.on("click", (event) => {
          const { lng, lat } = event.lngLat;
          
          const features = map.queryRenderedFeatures(map.project([lng, lat]), {
            layers: ["3d-buildings"],
          });

          if (features.length > 0) {
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
            const building = features[0];
            setBuildingInfo({
              lng: lng,
              lat: lat,
            });

            // Disable extrusion from the 3d-buildings layer
            map.setPaintProperty(
              "3d-buildings",
              "fill-extrusion-color",
              "rgba(0, 0, 0, 0)"
            ); // Make extrusion invisible
            map.setPaintProperty("3d-buildings", "fill-extrusion-height", 0); // Set extrusion height to 0

            // Remove the existing highlight layer if it exists
            if (map.getLayer("highlighted-building-layer")) {
              map.removeLayer("highlighted-building-layer");
              map.removeSource("highlighted-building-source");
            }

            // Create a new source with only the selected building
            map.addSource("highlighted-building-source", {
              type: "geojson",
              data: {
                type: "FeatureCollection",
                features: [building], // Add only the selected building
              },
            });

            // Add a new layer to highlight the selected building
            map.addLayer({
              id: "highlighted-building-layer",
              type: "fill-extrusion",
              source: "highlighted-building-source",
              paint: {
                "fill-extrusion-color": "#00FF00", // Highlight with green color
                "fill-extrusion-height": ["get", "height"],
                "fill-extrusion-base": ["get", "min_height"],
                "fill-extrusion-opacity": 0.85,
              },
            });
          } else {
            setBuildingInfo(null);

            // Clear selection by removing the highlighted building layer
            if (map.getLayer("highlighted-building-layer")) {
              map.removeLayer("highlighted-building-layer");
              map.removeSource("highlighted-building-source");
            }

            // Restore extrusion for all buildings
            map.setPaintProperty(
              "3d-buildings",
              "fill-extrusion-color",
              defaultBuildingPaint
            ); // Restore color based on height
            map.setPaintProperty("3d-buildings", "fill-extrusion-height", [
              "get",
              "height",
            ]); // Restore extrusion height
          }
        });
      });

      setCurrMap(map);
    }
    return () => currMap?.remove();
  }, [currMap]);   

  const fetchAirQualityData = async () => {
    try {
      const apiKey = "AIzaSyA-51pZHoT-21FHrhXwzTGT-vO3rn5fByc"; // Replace with your actual API key
      const zipCodeGeoJson = await axios.get('/zipCodeData.geojson').then(response => response.data);
      const features = zipCodeGeoJson.features;
      interface FeatureProperties {
        airQuality: string;
        airQualityCategory: string;
        airQualityColor: string;
        [key: string]: unknown;
      }

      interface FeatureGeometry {
        type: string;
        coordinates: number[][][];
      }

      interface Feature {
        type: string;
        properties: FeatureProperties;
        geometry: FeatureGeometry;
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

      const airQualityDataPromises = features.map(async (feature: Feature) => {
        const { coordinates } = feature.geometry;
        const [lng, lat] = coordinates[0][0]; // Get the first coordinate of the polygon
        
        const requestBody = {
          location: {
            latitude: lat,
            longitude: lng,
          },
        };

        const response = await axios.post(
          `https://airquality.googleapis.com/v1/currentConditions:lookup?key=${apiKey}`,
          requestBody,
          {
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );
        
        console.log(response);
        console.log(`Air quality data for coordinates (${lat}, ${lng}):`, response.data);

        const airQualityData = response.data.indexes.find((index: { code: string }) => index.code === "uaqi") as AirQualityData;
        return {
          ...feature,
          properties: {
            ...feature.properties,
            airQuality: airQualityData ? airQualityData.aqi : "N/A",
            airQualityCategory: airQualityData ? airQualityData.category : "N/A",
            airQualityColor: airQualityData ? `rgba(${airQualityData.color.red * 255}, ${airQualityData.color.green * 255}, ${airQualityData.color.blue * 255}, 1)` : "rgba(0, 0, 0, 0)",
          },
        };
      });

      const airQualityData = await Promise.all(airQualityDataPromises);
  
      const updatedGeoJson = {
        ...zipCodeGeoJson,
        features: airQualityData,
      };

      if (currMap) {
        const airQualitySource = currMap.getSource('zip-codes') as mapboxgl.GeoJSONSource;
        airQualitySource.setData(updatedGeoJson);

        if (!currMap.getLayer('air-quality-polygons')) {
          currMap.addLayer({
        id: 'air-quality-polygons',
        type: 'fill',
        source: 'zip-codes',
        paint: {
          'fill-color': ['get', 'airQualityColor'],
          'fill-opacity': 0.5,
        },
          });
        }
        
        if (!currMap.getLayer('air-quality-labels')) {
          currMap.addLayer({
        id: 'air-quality-labels',
        type: 'symbol',
        source: 'zip-codes',
        layout: {
          'text-field': [
            'format',
            ['get', 'airQuality'], { 'font-scale': 1.5, 'text-font': ['Open Sans Bold'] },
            '\n', {},
            ['get', 'airQualityCategory'], { 'font-scale': 1.2, 'text-font': ['Open Sans Regular'] }
          ],
          'text-size': 14,
          'text-offset': [0, 0],
          'text-anchor': 'center',
        },
        paint: {
          'text-color': '#000000',
          'text-halo-color': '#ffffff',
          'text-halo-width': 2,
        },
          });
        }
      }
      }
    catch (error) {
      console.error('Error fetching air quality data:', error);
    }
  };
  
  return (
    <div className="relative w-full h-screen overflow-clip">
      <div
        ref={mapContainerRef}
        className="absolute top-0 bottom-0 w-full h-full"
      />

      {!isMapLoaded ? (
        <LoadingBar loadingProgress={loadingProgress} />
      ) : (
        <div className="">
          <DisasterToolbar map={currMap} isMapLoaded={isMapLoaded} />
          <div className="absolute top-0 right-0 p-4 bg-white text-black bg-opacity-70">
            {buildingInfo ? (
              <BuildingInfo
                longitude={buildingInfo.lng}
                latitude={buildingInfo.lat}
              />
            ) : (
              <p className="text-black">
                Select Building to Display Information
              </p>
            )}
          </div>
          <div className="absolute bottom-0 left-0 p-4 bg-white text-black bg-opacity-70 rounded-md shadow-lg flex flex-col gap-2">
            <h1 className="text-lg font-bold">Toggle Filters</h1>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="sandyInundationLayer"
                className="h-5 w-5"
                checked={isFloodVisible}
                onChange={toggleFloodVisibility}
              />
              <label htmlFor="sandyInundationLayer" className="text-sm">
                Flood
              </label>
            </div>

            {/* Evacuation */}
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="evacuationLayer"
                className="h-5 w-5"
                checked={isEvacuationVisible}
                onChange={toggleEvacuationVisibility}
              />
              <label htmlFor="evacuationLayer" className="text-sm">
                Evacuation
              </label>
            </div>
            {/* Air */}
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="air"
                className="h-5 w-5"
                checked={isAirVisible}
                onChange={toggleAirVisibility}
              />
              <label htmlFor="air" className="text-sm">
                Air Quality 💨
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MapComponent;
