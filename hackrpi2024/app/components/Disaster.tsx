import React, { useState, useEffect } from 'react';
import { AlertTriangle, Radiation } from 'lucide-react';

interface DisasterToolbarProps {
  map: any; // Replace 'any' with the appropriate type if known
  isMapLoaded: boolean;
}

const DisasterToolbar: React.FC<DisasterToolbarProps> = ({ map, isMapLoaded }) => {
  const [isAnalysisMode, setIsAnalysisMode] = useState(false);
  const [activeDisaster, setActiveDisaster] = useState<string | null>(null);
  const [showAlert, setShowAlert] = useState(false);

  const clearAnalysis = () => {
    if (map) {
        map.boxZoom.enable();
        map.doubleClickZoom.enable();
        map.dragPan.enable();
        map.dragRotate.enable();
        map.keyboard.enable();
        map.scrollZoom.enable();
        map.touchZoomRotate.enable();
        setShowAlert(false);
    if (map.getLayer('blast-radius')) {
      map.removeLayer('blast-radius');
    }
    if (map.getSource('blast-radius')) {
      map.removeSource('blast-radius');
    }
    if (map.getLayer('outer-blast-radius')) {
      map.removeLayer('outer-blast-radius');
    }
    if (map.getSource('outer-blast-radius')) {
      map.removeSource('outer-blast-radius');
    }
      if (map.getLayer('3d-buildings')) {
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
        ]);
      }
  
      map.getCanvas().style.cursor = ''; // Reset cursor style
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
      essential: true // this animation is considered essential with respect to prefers-reduced-motion
    });
    map.boxZoom.disable();
    map.doubleClickZoom.disable();
    map.dragPan.disable();
    map.dragRotate.disable();
    map.keyboard.disable();
    map.scrollZoom.disable();
    map.touchZoomRotate.disable();
  
    if (activeDisaster === 'nuclear') {
      const center = [lng, lat];
      const innerRadius = 0.6; // 610m in kilometers
      const outerRadius = 1.2; // 1220m in kilometers
  
      const innerCircle = {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: center },
        properties: { radius: innerRadius }
      };
  
      const outerCircle = {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: center },
        properties: { radius: outerRadius }
      };
  
      if (map.getLayer('blast-radius')) {
        map.removeLayer('blast-radius');
      }
      if (map.getSource('blast-radius')) {
        map.removeSource('blast-radius');
      }
  
      if (map.getLayer('outer-blast-radius')) {
        map.removeLayer('outer-blast-radius');
      }
      if (map.getSource('outer-blast-radius')) {
        map.removeSource('outer-blast-radius');
      }
  
      map.addSource('blast-radius', {
        type: 'geojson',
        data: innerCircle
      });
  
      map.addSource('outer-blast-radius', {
        type: 'geojson',
        data: outerCircle
      });
  
      map.addLayer({
        id: 'blast-radius',
        type: 'circle',
        source: 'blast-radius',
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, ['*', innerRadius, 100], 15, ['*', innerRadius, 1000]],
          'circle-color': '#FF0000',
          'circle-opacity': 0.5,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#FF0000'
        }
      });
  
      map.addLayer({
        id: 'outer-blast-radius',
        type: 'circle',
        source: 'outer-blast-radius',
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, ['*', outerRadius, 100], 15, ['*', outerRadius, 1000]],
          'circle-color': '#FFA500',
          'circle-opacity': 0.3,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#FFA500'
        }
      });
  
      const bounds = [
        [lng - outerRadius / 111, lat - outerRadius / 111],
        [lng + outerRadius / 111, lat + outerRadius / 111]
      ];
  
      const features = map.queryRenderedFeatures(bounds, { layers: ['3d-buildings'] });
  
      if (features.length > 0) {
        const affectedBuildings = features.map(feature => feature.id);
  
        map.setPaintProperty('3d-buildings', 'fill-extrusion-color', [
          'case',
          ['in', ['id'], ['literal', affectedBuildings]],
          '#FF4444',
          ['interpolate', ['linear'], ['get', 'height'], 0, '#E3F2FD', 250, '#1565C0']
        ]);
      }
    }
  };
  
  useEffect(() => {
    if (!map) return;
  
    if (isAnalysisMode) {
      map.on('click', handleMapClick);
    } else {
      map.off('click', handleMapClick);
    }
  
    return () => {
      map.off('click', handleMapClick);
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
        map.getCanvas().style.cursor = 'crosshair';
      }
    }
  };
  
  if (!isMapLoaded) return null;
  
  return (
    <div style={{ position: 'absolute', bottom: '1rem', left: '50%', transform: 'translateX(-50%)', zIndex: 10 }}>
      <div style={{ backgroundColor: '#fff', padding: '1rem', width: '16rem', boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ fontWeight: 'bold', color: '#000' }}>Disaster Analysis Tools</h3>
          {isAnalysisMode && (
            <button onClick={clearAnalysis} style={{ backgroundColor: '#ff4444', color: '#fff', padding: '0.25rem 0.5rem', border: 'none', cursor: 'pointer' }}>
              Clear
            </button>
          )}
        </div>
  
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
          <button
            onClick={() => activateDisasterTool('nuclear')}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem', border: '1px solid #ccc',
              borderRadius: '0.25rem', cursor: 'pointer', backgroundColor: activeDisaster === 'nuclear' ? '#ff4444' : '#fff',
              color: activeDisaster === 'nuclear' ? '#fff' : '#000'
            }}
          >
            <Radiation style={{ width: '1rem', height: '1rem' }} />
            Nuclear
          </button>
        </div>
  
        {showAlert && (
          <div style={{ marginTop: '1rem', padding: '0.75rem', backgroundColor: '#ffe4e4', display: 'flex', alignItems: 'center', border: '1px solid #ff4444', borderRadius: '0.25rem' }}>
            <AlertTriangle style={{ width: '1rem', height: '1rem', marginRight: '0.5rem', color: '#ff4444' }} />
            <span style={{ color: '#000' }}>Click on the map to analyze the impact zone. The red circle shows a 610m radius.</span>
          </div>
        )}
      </div>
    </div>
    );
  };

export default DisasterToolbar;