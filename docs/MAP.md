# Clinic map

The map shows included clinics with saved address coordinates.

## Implementation and interaction

- Leaflet 1.9.4 is loaded only when Compare markets needs the map.
- Austin, San Antonio, and Both markets controls fit the available pins. Zoom controls and dragging support closer exploration; wheel zoom is disabled to preserve page scrolling.
- Clicking a pin or using Enter/Space opens the existing provider evidence drawer. A text list offers the same information without map interaction.
- The view follows included providers. A pin requires physical-presence evidence and a saved coordinate linked to the exact recorded address. Changed addresses invalidate saved placements.
- Missing addresses, unresolved locations, and unmatched addresses remain visible in the unmapped clinic list. Providers with no recorded clinic are not counted as clinics.
- Default selection has 4 Austin pins and 6 San Antonio pins; 7 clinics remain unmapped.

## Saved coordinates

`data/clinic-coordinates.json` contains 14 accepted address matches, source feature URLs, original addresses, matched-address text, and retrieval dates. Original lookup responses and queries are saved in `data/sources/geocoding/`.

Coordinates were collected from OpenStreetMap Nominatim and cached. Preparation followed its [usage policy](https://operations.osmfoundation.org/policies/nominatim/): identification, caching, attribution, and fewer than one request per second. The app uses saved coordinates.

Matches require matching house numbers, reviewed roads, and postcodes. Coordinates locate the building approximately; suite and entrance positions are unverified.

Four lookup results were rejected: Achieve San Antonio (road only / conflicting postcode), KidVentures (road only), Capital Area Speech (road only / conflicting postcode), and Sol (postcode conflict). Three other initially included clinics lack street addresses.

## Map service and attribution

Background tiles load directly from `https://tile.openstreetmap.org/{z}/{x}/{y}.png` under the [OpenStreetMap tile policy](https://operations.osmfoundation.org/policies/tiles/). The browser supplies normal identification/referrer headers and honors cache headers. There is no tile prefetching, bulk downloading, or cache bypass. Attribution stays visible in the map. The UI shows a fallback notice if a tile request fails, and keeps the clinic lists available.

Map and geocoding data: © [OpenStreetMap contributors](https://www.openstreetmap.org/copyright), ODbL. Leaflet: BSD-2-Clause. Review tile-service suitability before a substantial public rollout; this proof of concept requires no map API key or paid service.
