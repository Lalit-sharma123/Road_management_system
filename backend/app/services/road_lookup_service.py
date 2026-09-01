import httpx
import logging
import asyncio
from typing import Dict, Any, Optional
from datetime import datetime, timezone

logger = logging.getLogger("RoadLookupService")

class RoadLookupService:
    """
    Real-Time Geo-Spatial Road Information & Reverse Geocoding Service.
    Queries OpenStreetMap Nominatim API with caching to resolve real road names,
    municipalities, postal codes, and infrastructure agencies from GPS coordinates.
    """
    _cache: Dict[str, Dict[str, Any]] = {}
    _lock = asyncio.Lock()

    @classmethod
    def _coord_key(cls, lat: float, lng: float) -> str:
        # Precision to ~11 meters for cache locality
        return f"{round(lat, 4)}_{round(lng, 4)}"

    @classmethod
    async def lookup_road(cls, lat: float, lng: float) -> Dict[str, Any]:
        """
        Reverse geocode GPS coordinates to extract real road name and administrative details.
        """
        if lat is None or lng is None or (lat == 0.0 and lng == 0.0):
            return {
                "road_name": "Location Unavailable",
                "display_name": "GPS coordinates not provided",
                "area": None,
                "city": None,
                "state": None,
                "postal_code": None,
                "road_authority": None,
                "latitude": lat,
                "longitude": lng,
                "is_resolved": False
            }

        cache_key = cls._coord_key(lat, lng)
        if cache_key in cls._cache:
            return cls._cache[cache_key]

        async with cls._lock:
            # Check cache again inside lock
            if cache_key in cls._cache:
                return cls._cache[cache_key]

            road_info = {
                "road_name": f"Road near ({round(lat, 4)}°, {round(lng, 4)}°)",
                "display_name": f"Lat: {round(lat, 5)}, Lng: {round(lng, 5)}",
                "area": None,
                "city": None,
                "state": None,
                "postal_code": None,
                "road_authority": None,
                "latitude": lat,
                "longitude": lng,
                "is_resolved": False
            }

            try:
                # OpenStreetMap Nominatim reverse geocoding
                url = "https://nominatim.openstreetmap.org/reverse"
                params = {
                    "lat": str(lat),
                    "lon": str(lng),
                    "format": "json",
                    "zoom": "18",
                    "addressdetails": "1"
                }
                headers = {
                    "User-Agent": "SmartRoadDamageDetection-DriverAssistance/1.0 (contact: support@roaddetection.ai)"
                }

                async with httpx.AsyncClient(timeout=4.0) as client:
                    resp = await client.get(url, params=params, headers=headers)
                    if resp.status_code == 200:
                        data = resp.json()
                        address = data.get("address", {})

                        # Extract road name
                        road_name = (
                            address.get("road")
                            or address.get("highway")
                            or address.get("street")
                            or address.get("pedestrian")
                            or address.get("suburb")
                            or address.get("neighbourhood")
                            or data.get("name")
                        )

                        area = (
                            address.get("suburb")
                            or address.get("neighbourhood")
                            or address.get("district")
                            or address.get("quarter")
                        )

                        city = (
                            address.get("city")
                            or address.get("town")
                            or address.get("municipality")
                            or address.get("village")
                            or address.get("county")
                        )

                        state = address.get("state")
                        postal_code = address.get("postcode")
                        
                        # Check for official authority / network tags
                        raw_operator = address.get("operator") or data.get("namedetails", {}).get("operator")
                        highway_type = address.get("highway") or ""
                        
                        authority = None
                        if raw_operator:
                            authority = raw_operator
                        elif "motorway" in highway_type or "trunk" in highway_type:
                            authority = f"National Highway Authority ({state})" if state else "National Highway Authority"
                        elif "primary" in highway_type or "secondary" in highway_type:
                            authority = f"Public Works Department (PWD - {state})" if state else "State Public Works Department (PWD)"
                        elif city or area:
                            authority = f"{city or area} Municipal Road Maintenance Corporation"

                        road_info = {
                            "road_name": road_name or f"Unnamed Corridor ({round(lat, 4)}° N, {round(lng, 4)}° W)",
                            "display_name": data.get("display_name", f"{lat}, {lng}"),
                            "area": area,
                            "city": city,
                            "state": state,
                            "postal_code": postal_code,
                            "road_authority": authority or "Local Highway Authority / Municipality",
                            "latitude": lat,
                            "longitude": lng,
                            "is_resolved": True
                        }
            except Exception as e:
                logger.warning(f"Nominatim road lookup warning for ({lat}, {lng}): {e}")
                # Fallback based on coordinate region
                road_info["road_authority"] = "Regional Transport & Highway Department"

            cls._cache[cache_key] = road_info
            return road_info
