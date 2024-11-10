import React, { useEffect, useRef, useState } from "react";
import mapboxgl, { DataDrivenPropertyValueSpecification } from "mapbox-gl";
import BuildingInfo from "./BuildingInfo";
import DisasterToolbar from "./Disaster";

mapboxgl.accessToken =
  "pk.eyJ1Ijoid2FuZ3duaWNvIiwiYSI6ImNtM2FoeGtzZzFkZWMycG9tendleXhna2cifQ.FyBqY-UtfsFwpqeaY0vlpw";

const MapComponent: React.FC = () => {
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [isMapLoaded, setIsMapLoaded] = useState(false);

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
        const apiKey = "AIzaSyA-51pZHoT-21FHrhXwzTGT-vO3rn5fByc"; // Replace with your actual API key

        // Add the air quality heatmap as a raster source, but keep it hidden initially
        map.addSource("air-quality-heatmap", {
          type: "raster",
          tiles: [], // Will be dynamically updated
          tileSize: 256,
        });

        // Add the air quality heatmap layer with visibility set to none
        map.addLayer({
          id: "air-quality-heatmap-layer",
          type: "raster",
          source: "air-quality-heatmap",
          paint: {
            "raster-opacity": 0.7, // Adjust opacity as needed
          },
          layout: {
            visibility: "none", // Hide initially
          },
        });

        // Function to update the tile URL dynamically based on the map state
        const updateTileUrl = () => {
          const zoom = Math.floor(map.getZoom());  // Ensure zoom is an integer
          const center = map.getCenter();
          const x = Math.floor((center.lng + 180) / 360 * Math.pow(2, zoom));  // Ensure x is an integer
          const y = Math.floor(
            (1 - Math.log(Math.tan(center.lat * Math.PI / 180) + 1 / Math.cos(center.lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom)
          );  // Ensure y is an integer
          
          // Construct tile URL with proper zoom, x, and y
          const tileURL = `https://airquality.googleapis.com/v1/mapTypes/US_AQI/heatmapTiles/${zoom}/${x}/${y}?key=${apiKey}`;
          
          // Add null check for the source and cast to RasterSource
          const source = map.getSource("air-quality-heatmap") as mapboxgl.RasterTileSource | undefined;
        
          if (source) {
            source.setTiles([tileURL]);
          } else {
            console.warn("Air quality heatmap source is not available yet.");
          }
        };
        
        
        // Call updateTileUrl to load the initial set of tiles
        updateTileUrl();

        // Listen to map events to update the tile URL when zoom or map center changes
        map.on("moveend", updateTileUrl);
        map.on("zoomend", updateTileUrl);
        
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
  
  const [isEnergyVisible, setIsEnergyVisible] = useState<boolean>(false);
  const toggleEnergyVisibility = () => {
    if (currMap) {
      console.log("Energy layer toggled");
      setIsEnergyVisible(!isEnergyVisible);
    }
  }

  const [isAirVisible, setIsAirVisible] = useState<boolean>(false);
  const toggleAirVisibility = () => {
    if (currMap) {
      const newVisibility = isAirVisible ? "none" : "visible";
      currMap.setLayoutProperty(
        "air-quality-heatmap-layer",
        "visibility",
        newVisibility
      );
      setIsAirVisible(!isAirVisible);
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
            {/* Energy */}
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
