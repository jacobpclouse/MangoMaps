import React, { useEffect, useRef, useState } from "react";
import mapboxgl, { DataDrivenPropertyValueSpecification } from "mapbox-gl";
import BuildingInfo from "./BuildingInfo";
import DisasterToolbar from "./Disaster";
import axios from "axios";
import { fromArrayBuffer } from "geotiff"; // For processing GeoTIFF files

mapboxgl.accessToken = "pk.eyJ1Ijoid2FuZ3duaWNvIiwiYSI6ImNtM2FoeGtzZzFkZWMycG9tendleXhna2cifQ.FyBqY-UtfsFwpqeaY0vlpw";

const MapComponent: React.FC = () => {
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [isAirVisible, setIsAirVisible] = useState<boolean>(false);
  const [isSolarVisible, setIsSolarVisible] = useState<boolean>(false);

  const bounds: [number, number, number, number] = [
    -74.021, 40.6981, -73.8655, 40.9153,
  ];
  const [buildingInfo, setBuildingInfo] = useState<any | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const [currMap, setCurrMap] = useState<mapboxgl.Map | null>(null);


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
        fetchSolarData(40.7829, -73.9654, 5000); // Fetch solar data for NYC        
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
        
        map.addSource('earthquakes', {
          type: 'geojson',
          data: "earthquake.geojson",
          generateId: true // This ensures that all features have unique IDs
        });

        map.addLayer({
          id: 'earthquakes-viz',
          type: 'circle',
          source: 'earthquakes',
          paint: {
            'circle-radius': [
              'case',
              ['boolean', ['feature-state', 'hover'], false],
              [
                'interpolate',
                ['linear'],
                ['get', 'mag'],
                1,
                8,
                1.5,
                10,
                2,
                12,
                2.5,
                14,
                3,
                16,
                3.5,
                18,
                4.5,
                20,
                6.5,
                22,
                8.5,
                24,
                10.5,
                26
              ],
              5
            ],
            'circle-stroke-color': '#000',
            'circle-stroke-width': 1,
            'circle-color': [
              'case',
              ['boolean', ['feature-state', 'hover'], false],
              [
                'interpolate',
                ['linear'],
                ['get', 'mag'],
                1,
                '#fff7ec',
                1.5,
                '#fee8c8',
                2,
                '#fdd49e',
                2.5,
                '#fdbb84',
                3,
                '#fc8d59',
                3.5,
                '#ef6548',
                4.5,
                '#d7301f',
                6.5,
                '#b30000',
                8.5,
                '#7f0000',
                10.5,
                '#000'
              ],
              '#000'
            ]
          }
        });

        map.setLayoutProperty(
          "earthquakes-viz",
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

          const features = map.queryRenderedFeatures(map.project([lng, lat]), {
            layers: ["3d-buildings"],
          });

          if (features.length > 0) {
            const building = features[0];
            const buildingId = building.id as number;
            console.log(building);
            setBuildingInfo({
              id: building.id,
              height: building.properties!.height,
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
            setBuildingInfo("No building found at this location.");

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
  }, [currMap]); // Depend on updateTrigger to re-render when it changes

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
  
  const [isEarthquakeVisible, setIsEarthquakeVisible] = useState<boolean>(false);
  const toggleEarthquakeVisibility = () => {
    if (currMap) {
      const newVisibility = isEarthquakeVisible ? "none" : "visible";
      currMap.setLayoutProperty(
        "earthquakes-viz",
        "visibility",
        newVisibility
      );
      setIsEarthquakeVisible(!isEarthquakeVisible);
    }
  };
  
  // const [isEnergyVisible, setIsEnergyVisible] = useState<boolean>(false);
  // const toggleEnergyVisibility = () => {
  //   if (currMap) {
  //     console.log("Energy layer toggled");
  //     setIsEnergyVisible(!isEnergyVisible);
  //   }
  // }

  

  const fetchAirQualityData = async () => {
    try {
      const apiKey = "AIzaSyA-51pZHoT-21FHrhXwzTGT-vO3rn5fByc"; // Replace with your actual API key
      const zipCodeGeoJson = await axios.get('/zipCodeData.geojson').then(response => response.data);
      const features = zipCodeGeoJson.features;
      const airQualityDataPromises = features.map(async (feature: any) => {
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

        const airQualityData = response.data.indexes.find((index: any) => index.code === "uaqi");
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

  

  // Function to fetch solar data from Google Solar API
  const fetchSolarData = async (latitude: number, longitude: number, radius: number) => {
    const apiKey = "AIzaSyA-51pZHoT-21FHrhXwzTGT-vO3rn5fByc"; // Replace with your actual API key
    const url = `https://solar.googleapis.com/v1/dataLayers:get?key=${apiKey}`;

    const params = {
      lat: latitude,
      lng: longitude,
      radius: radius,
      data: 'DSM,RGB,mask,annual_flux,monthly_flux', // Specify the data layers you need
      min_quality: 'HIGH', // Optional: specify the minimum quality
      min_scale: 1, // Optional: specify the minimum scale in meters per pixel
    };

    try {
      const response = await axios.get(url, { params });
      console.log('Solar data response:', response.data); // Log the response for debugging
      const solarData = response.data;
      // Log the response to see if it contains the data
      console.log('Solar data:', solarData);

      // Check if the DSM URL exists
      if (solarData.dsmUrl) {
        console.log('DSM URL:', solarData.dsmUrl);
      } else {
        console.error('DSM URL not available');
      }


      // Call the process function to handle GeoTIFF URLs
      processGeoTIFF(solarData.dsmUrl); // You can choose which data to display (e.g., dsmUrl)
    } catch (error) {
      const err = error as any;
      console.error("Error fetching solar data:", err.response?.data || err.message);
    }
  };

  // Function to process GeoTIFF data (Digital Surface Model)
  const processGeoTIFF = async (url: string) => {
    try {
      const arrayBuffer = await fetch(url).then((res) => res.arrayBuffer());
      const tiff = await fromArrayBuffer(arrayBuffer);
      const image = await tiff.getImage();
      const data = await image.readRasters();
      
      // Example: you might process DSM (Digital Surface Model) data here
      const dsmData = data[0];

      // For example, visualize it as a raster layer on the map
      addRasterLayer(dsmData);
    } catch (error) {
      console.error("Error processing GeoTIFF data:", error);
    }
  };

  // Function to add raster layer to Mapbox map
  const addRasterLayer = (dsmData: any) => {
    if (currMap) {
      currMap.addSource("solar-raster", {
        type: "image",
        url: dsmData, // GeoTIFF data URL or processed image data
        coordinates: [
          [-74.021, 40.6981],
          [-73.8655, 40.6981],
          [-73.8655, 40.9153],
          [-74.021, 40.9153],
        ],
      });

      currMap.addLayer({
        id: "solar-raster-layer",
        type: "raster",
        source: "solar-raster",
        paint: {
          "raster-opacity": 0.8,
        },
      });
    }
  };

  // Toggle Solar Layer Visibility
  const toggleSolarVisibility = () => {
    if (currMap) {
      const newVisibility = isSolarVisible ? "none" : "visible";

      if (currMap.getLayer("solar-raster-layer")) {
        currMap.setLayoutProperty("solar-raster-layer", "visibility", newVisibility);
      }

      setIsSolarVisible(!isSolarVisible);
    }
  };
  
  
  return (
    <div className="relative w-full h-screen overflow-clip">
      <div
        ref={mapContainerRef}
        className="absolute top-0 bottom-0 w-full h-full"
      />

      {!isMapLoaded ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-white z-50">
          <div className="w-1/2 bg-gray-200 rounded-full h-4 mb-4">
            <div
              className="bg-blue-500 h-4 rounded-full"
              style={{ width: `${loadingProgress}%` }}
            />
          </div>
          <p className="text-lg font-semibold text-black">
            Loading map... {loadingProgress}%
          </p>
        </div>
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
                "No building found at this location."
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
            {/* Energy
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="energy"
                className="h-5 w-5"
                checked={isEnergyVisible}
                onChange={toggleEnergyVisibility}
              />
              <label htmlFor="energy" className="text-sm">
                Energy
              </label>
            </div> */}
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
            {/* Earthquake Visibility */}
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="earthquakeLayer"
              className="h-5 w-5"
              checked={isEarthquakeVisible}
              onChange={toggleEarthquakeVisibility}
            />
            <label htmlFor="earthquakeLayer" className="text-sm">
              Earthquake
            </label>
          </div>
            {/* Solar */}
            <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="pollenLayer"
              className="h-5 w-5"
              checked={isSolarVisible}
              onChange={toggleSolarVisibility}
            />
            <label htmlFor="pollenLayer" className="text-sm">
              Solar
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
                Air
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MapComponent;
