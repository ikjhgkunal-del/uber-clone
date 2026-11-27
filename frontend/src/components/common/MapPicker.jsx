import { useEffect, useState } from "react";
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  useMapEvents,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
function Point({ value, onChange }) {
  const map = useMapEvents({
    click: (e) => onChange({ latitude: e.latlng.lat, longitude: e.latlng.lng }),
  });
  useEffect(() => {
    if (value && !map.getBounds().contains([value.latitude, value.longitude]))
      map.panTo([value.latitude, value.longitude], { animate: false });
  }, [value?.latitude, value?.longitude, map]);
  return value ? (
    <CircleMarker
      center={[value.latitude, value.longitude]}
      radius={8}
      pathOptions={{
        color: "#fff",
        weight: 3,
        fillColor: "#000",
        fillOpacity: 1,
      }}
    />
  ) : null;
}
function Size() {
  const map = useMap();
  useEffect(() => {
    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(map.getContainer());
    return () => observer.disconnect();
  }, [map]);
  return null;
}
export default function MapPicker({ value, onChange }) {
  const [unavailable, setUnavailable] = useState(false);
  return (
    <div>
      <MapContainer
        center={value ? [value.latitude, value.longitude] : [28.6139, 77.209]}
        zoom={13}
        className="place-map"
        scrollWheelZoom={false}
      >
        <TileLayer
          url={
            import.meta.env.VITE_MAP_TILE_URL ||
            "https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          }
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          referrerPolicy="strict-origin-when-cross-origin"
          eventHandlers={{ tileerror: () => setUnavailable(true) }}
        />
        <Point value={value} onChange={onChange} />
        <Size />
      </MapContainer>
      <small>
        {unavailable
          ? "Map tiles could not load. You can still enter coordinates below."
          : "Click the map to place a pin, or enter coordinates below."}
      </small>
    </div>
  );
}
