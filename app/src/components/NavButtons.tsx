function GoogleMapsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 2C7.589 2 4 5.589 4 10c0 5.6 6.5 11.2 7.3 11.9a1 1 0 0 0 1.4 0C13.5 21.2 20 15.6 20 10c0-4.411-3.589-8-8-8z"
        fill="#4285F4"
      />
      <circle cx="12" cy="10" r="3" fill="white" />
    </svg>
  );
}

function OsmAndIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="2" y="2" width="20" height="20" rx="5" fill="#1B8A5A" />
      <path d="M12 5l4 13-4-3-4 3 4-13z" fill="white" />
    </svg>
  );
}

export default function NavButtons({ lat, lng }: { lat: number; lng: number }) {
  return (
    <>
      <a
        href={`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-sm px-3 py-1.5 border rounded hover:bg-gray-50 inline-flex items-center gap-1.5"
      >
        <GoogleMapsIcon />
        Accéder avec Google Maps
      </a>
      <a
        href={`https://osmand.net/go?lat=${lat}&lon=${lng}&z=15`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-sm px-3 py-1.5 border rounded hover:bg-gray-50 inline-flex items-center gap-1.5"
      >
        <OsmAndIcon />
        Accéder avec OsmAnd
      </a>
    </>
  );
}
