import { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { ArrowUpRight, LocateFixed } from 'lucide-react';
import { clinicMapData } from '../../shared/clinic-map';
import type { Dataset, Selection, MarketId } from '../../shared/schema';

const marketNames = { austin: 'Austin', 'san-antonio': 'San Antonio' };
export function ClinicMap({ data, selection, onInspect }: { data: Dataset; selection: Selection; onInspect: (id: string) => void }) {
  const [market, setMarket] = useState<MarketId | 'all'>('austin');
  const [tileError, setTileError] = useState(false);
  const [fitVersion, setFitVersion] = useState(0);
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const inspect = useRef(onInspect);
  useEffect(() => { inspect.current = onInspect; }, [onInspect]);
  const clinics = useMemo(() => clinicMapData(data, selection), [data, selection]);
  const visible = useMemo(() => clinics.filter(c => market === 'all' || c.marketId === market), [clinics, market]);
  const mapped = visible.filter(c => c.coordinate);
  const unmapped = visible.filter(c => !c.coordinate);

  useEffect(() => {
    if (!container.current) return;
    const instance = L.map(container.current, { scrollWheelZoom: false, attributionControl: true });
    instance.attributionControl.setPrefix(false);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors',
    }).on('tileerror', () => setTileError(true)).addTo(instance);
    map.current = instance;
    const resize = new ResizeObserver(() => instance.invalidateSize({ pan: false }));
    resize.observe(container.current);
    return () => { resize.disconnect(); instance.remove(); map.current = null; };
  }, []);

  useEffect(() => {
    const instance = map.current;
    if (!instance) return;
    const markers = L.featureGroup().addTo(instance);
    visible.forEach(clinic => {
      if (!clinic.coordinate) return;
      const { lat, lon } = clinic.coordinate;
      const marker = L.marker([lat, lon], {
        keyboard: true, title: `${clinic.companyName} — ${clinic.name}`, alt: `Open ${clinic.companyName}, ${clinic.name}`,
        icon: L.divIcon({ className: `clinic-pin ${clinic.marketId}`, iconSize: [32, 40], iconAnchor: [16, 38], tooltipAnchor: [0, -35], html: '<svg width="32" height="40" viewBox="0 0 32 40" aria-hidden="true"><path d="M16 1C8 1 2 7 2 15c0 10 14 23 14 23s14-13 14-23C30 7 24 1 16 1Z"/><circle cx="16" cy="15" r="5"/></svg>' }),
      });
      const tooltip = document.createElement('span');
      tooltip.textContent = `${clinic.companyName} · ${clinic.name}`;
      marker.bindTooltip(tooltip).on('click', () => inspect.current(clinic.relationshipId)).on('add', () => {
        marker.getElement()?.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          event.stopPropagation();
          inspect.current(clinic.relationshipId);
        }
        });
      }).addTo(markers);
    });
    if (markers.getLayers().length) instance.fitBounds(markers.getBounds(), { padding: [30, 30], maxZoom: 13, animate: false });
    else instance.setView(market === 'san-antonio' ? [29.48, -98.49] : market === 'austin' ? [30.34, -97.75] : [29.95, -98.1], market === 'all' ? 8 : 10);
    return () => { markers.remove(); };
  }, [visible, market, fitVersion]);

  return <section className="bundle-panel clinic-map-panel">
    <h2>Where clinics are located</h2>
    <p>Explore the researched clinic locations. Select a pin to open provider information and evidence.</p>
    <div className="map-toolbar"><div className="map-markets" role="group" aria-label="Map market">{(['austin', 'san-antonio', 'all'] as const).map(id => <button key={id} aria-pressed={market === id} onClick={() => setMarket(id)}>{id === 'all' ? 'Both markets' : marketNames[id]}</button>)}</div><button className="map-fit" onClick={() => setFitVersion(n => n + 1)} aria-label="Fit map to clinics" title="Fit map to clinics"><LocateFixed size={17}/></button></div>
    <div className="clinic-map-canvas" ref={container} role="region" aria-label="Interactive clinic locations map"/>
    <div className="map-status" aria-live="polite"><span>{mapped.length} mapped clinics · {unmapped.length} not mapped</span>{market === 'all' && <span className="map-legend"><span>Austin</span><span>San Antonio</span></span>}</div>
    {tileError && <p className="map-warning" role="status">Some background map tiles could not load. Provider pins and the clinic list are still available.</p>}
    {!mapped.length && <p className="map-warning">No included clinic in this view has a saved address match. Review the unmapped clinics below.</p>}
    <details className="map-clinic-list"><summary>View mapped clinics ({mapped.length})</summary><ul>{mapped.map(clinic => <li key={clinic.id}><button className="text-button" onClick={() => onInspect(clinic.relationshipId)}>{clinic.companyName} · {clinic.name}<ArrowUpRight size={12}/></button><span>{clinic.address}</span></li>)}</ul></details>
    {unmapped.length > 0 && <details className="map-clinic-list"><summary>Clinics not mapped ({unmapped.length})</summary><ul>{unmapped.map(clinic => <li key={clinic.id}><button className="text-button" onClick={() => onInspect(clinic.relationshipId)}>{clinic.companyName}<ArrowUpRight size={12}/></button><span>{clinic.name} · {clinic.reason}</span></li>)}</ul></details>}
    <p className="small map-method">Pins use saved address matches and show approximate locations, not verified entrances. Only included clinics with physical-presence evidence can be pinned. Background map requires internet. <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">Location data © OpenStreetMap contributors</a>.</p>
  </section>;
}
