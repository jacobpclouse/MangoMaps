/* eslint-disable */

import React, { useState, useEffect } from "react";
import { AlertTriangle, Radiation } from "lucide-react";

interface DisasterToolbarProps {
  map: any; // Replace 'any' with the appropriate type if known
  isMapLoaded: boolean;
}

const DisasterToolbar: React.FC<DisasterToolbarProps> = ({
  map,
  isMapLoaded,
}) => {
  const [isAnalysisMode, setIsAnalysisMode] = useState(false);
  const [activeDisaster, setActiveDisaster] = useState<string | null>(null);
  const [showAlert, setShowAlert] = useState(false);
  const [waterLevel, setWaterLevel] = useState(0); // State to manage water level

  const clearAnalysis = () => {
    if (map) {
      setShowAlert(false);
      if (map.getLayer("blast-radius")) {
        map.removeLayer("blast-radius");
      }
      if (map.getSource("blast-radius")) {
        map.removeSource("blast-radius");
      }
      if (map.getLayer("outer-blast-radius")) {
        map.removeLayer("outer-blast-radius");
      }
      if (map.getSource("outer-blast-radius")) {
        map.removeSource("outer-blast-radius");
      }
      if (map.getLayer("3d-buildings")) {
        map.setPaintProperty("3d-buildings", "fill-extrusion-color", [
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
        ]);
      }
      if (map.getLayer("water-elevation-layer")) {
        map.removeLayer("water-elevation-layer");
      }
      if (map.getSource("water-elevation-layer")) {
        map.removeSource("water-elevation-layer");
      }
      setWaterLevel(0);
      map.getCanvas().style.cursor = ""; // Reset cursor style
    }
    setIsAnalysisMode(false);
    setActiveDisaster(null);
  };

  const handleMapClick = (e: any) => {
    if (!isAnalysisMode || !activeDisaster) return;

    const { lng, lat } = e.lngLat;
    map.flyTo({
      center: [lng, lat],
      zoom: 13,
      pitch: 0,
      bearing: 0,
      essential: true, // this animation is considered essential with respect to prefers-reduced-motion
    });

    const center = [lng, lat];
    let innerRadius = 0;
    let outerRadius = 0;
    if (activeDisaster === "Nuke") {
      innerRadius = 610; // 610 meters
      outerRadius = 1220; // 1220 meters
    } else if (activeDisaster === "Big Nuke") {
      innerRadius = 1220; // 1220 meters
      outerRadius = 2440; // 2440 meters
    }

    const innerCircle = {
      type: "Feature",
      geometry: { type: "Point", coordinates: center },
      properties: { radius: innerRadius },
    };

    const outerCircle = {
      type: "Feature",
      geometry: { type: "Point", coordinates: center },
      properties: { radius: outerRadius },
    };

    if (map.getLayer("blast-radius")) {
      map.removeLayer("blast-radius");
    }
    if (map.getSource("blast-radius")) {
      map.removeSource("blast-radius");
    }

    if (map.getLayer("outer-blast-radius")) {
      map.removeLayer("outer-blast-radius");
    }
    if (map.getSource("outer-blast-radius")) {
      map.removeSource("outer-blast-radius");
    }

    map.addSource("blast-radius", {
      type: "geojson",
      data: innerCircle,
    });

    map.addSource("outer-blast-radius", {
      type: "geojson",
      data: outerCircle,
    });

    map.addLayer({
      id: "blast-radius",
      type: "circle",
      source: "blast-radius",
      paint: {
        "circle-radius": {
          stops: [
            [0, 0],
            [20, innerRadius / 0.075],
          ],
          base: 2,
        },
        "circle-color": "#FF0000",
        "circle-opacity": 0.5,
        "circle-stroke-width": 2,
        "circle-stroke-color": "#FF0000",
      },
    });

    map.addLayer({
      id: "outer-blast-radius",
      type: "circle",
      source: "outer-blast-radius",
      paint: {
        "circle-radius": {
          stops: [
            [0, 0],
            [20, outerRadius / 0.075],
          ],
          base: 2,
        },
        "circle-color": "#FFA500",
        "circle-opacity": 0.3,
        "circle-stroke-width": 2,
        "circle-stroke-color": "#FFA500",
      },
    });

    const bounds = [
      [lng - outerRadius / 111000, lat - outerRadius / 111000],
      [lng + outerRadius / 111000, lat + outerRadius / 111000],
    ];

    const features = map.queryRenderedFeatures(bounds, {
      layers: ["3d-buildings"],
    });

    if (features.length > 0) {
      const affectedBuildings = features.map((feature: any) => feature.id);

      map.setPaintProperty("3d-buildings", "fill-extrusion-color", [
        "case",
        ["in", ["id"], ["literal", affectedBuildings]],
        "#FF4444",
        [
          "interpolate",
          ["linear"],
          ["get", "height"],
          0,
          "#E3F2FD",
          250,
          "#1565C0",
        ],
      ]);
    }
  };

  useEffect(() => {
    if (!map) return;

    if (isAnalysisMode) {
      map.on("click", handleMapClick);
    } else {
      map.off("click", handleMapClick);
    }

    return () => {
      map.off("click", handleMapClick);
    };
  }, [isAnalysisMode, activeDisaster, map]);

  const activateDisasterTool = (disasterType: string) => {
    if (activeDisaster === disasterType) {
      clearAnalysis();
    } else {
      setIsAnalysisMode(true);
      setActiveDisaster(disasterType);
      setShowAlert(true);

      if (map) {
        map.getCanvas().style.cursor = "crosshair";
      }
    }
  };

  const handleWaterLevelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const level = parseInt(e.target.value, 10);
    setWaterLevel(level);
    if (map && map.isStyleLoaded()) {
      // Update water elevation layer based on the water level
      if (map.getLayer("water-elevation-layer")) {
        map.setPaintProperty(
          "water-elevation-layer",
          "fill-extrusion-height",
          level
        );
      } else {
        map.addLayer({
          id: "water-elevation-layer",
          type: "fill-extrusion",
          source: {
            type: "geojson",
            data: {
              type: "FeatureCollection",
              features: [
                {
                  type: "Feature",
                  geometry: {
                    type: "Polygon",
                    coordinates: [
                      [
                        [-180, -90],
                        [-180, 90],
                        [180, 90],
                        [180, -90],
                        [-180, -90],
                      ],
                    ],
                  },
                },
              ],
            },
          },
          paint: {
            "fill-extrusion-color": "#00008B", // Dark blue color
            "fill-extrusion-height": level,
            "fill-extrusion-base": 0,
            "fill-extrusion-opacity": 0.5,
          },
        });
      }
    }
  };

  if (!isMapLoaded) return null;

  return (
    <div
      className="absolute bottom-0 right-0 md:right-1/2 transform translate-x-0 md:translate-x-1/2 z-10"
    >
      <div className="bg-white p-4 w-64 shadow-md flex flex-col gap-2">
        <h3 className="font-bold text-black">Disaster Analysis Tools</h3>
        <button
          onClick={clearAnalysis}
          className="bg-red-500 text-white px-2 py-1 rounded-lg"
        >
          Clear
        </button>


        <div className="grid grid-cols-2 gap-2 mt-2">
          <button
            onClick={() => activateDisasterTool("Nuke")}
            className={`flex items-center gap-2 p-2 border border-gray-300 rounded cursor-pointer ${
              activeDisaster === "Nuke"
                ? "bg-red-500 text-white"
                : "bg-white text-black"
            }`}
          >
            <Radiation className="w-4 h-4" />
            Nuke (10 KT)
          </button>
          <button
            onClick={() => activateDisasterTool("Big Nuke")}
            className={`flex items-center gap-2 p-2 border border-gray-300 rounded cursor-pointer ${
              activeDisaster === "Big Nuke"
                ? "bg-red-500 text-white"
                : "bg-white text-black"
            }`}
          >
            <Radiation className="w-4 h-4" />
            Big Nuke (15 KT)
          </button>
        </div>
        <div className="mt-4">
          <label htmlFor="flood-slider" className="block mb-2 text-black">
            Water Level
          </label>
          <input
            id="flood-slider"
            type="range"
            min="0"
            max="100"
            value={waterLevel}
            onChange={handleWaterLevelChange}
            className="w-full"
          />
        </div>
        {showAlert && (
          <div className="mt-4 p-3 bg-red-100 flex items-center border border-red-500 rounded">
            <AlertTriangle className="w-4 h-4 mr-2 text-red-500" />
            <span className="text-black">BOMBA 💣</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default DisasterToolbar;
