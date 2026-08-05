import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Navigation, Compass, Play, Pause, RotateCcw, MapPin, Award, Clock, Gauge, Route, Zap } from 'lucide-react';
import { Card } from '../ui/Card';

interface Coord {
  lat: number;
  lng: number;
}

interface GoogleMapMockProps {
  pickup: { name: string; lat: number; lng: number };
  drop: { name: string; lat: number; lng: number };
  routePath?: Coord[];
  eta?: string;
  distance?: string;
  isPlaying?: boolean;
  onReachDestination?: () => void;
  onProgress?: (percent: number) => void;
  height?: string;
  minimal?: boolean;
}

// Generate default route path interpolations if none provided
const interpolatePoints = (start: Coord, end: Coord, steps = 100): Coord[] => {
  const points: Coord[] = [];
  // Add some curve to make the route more realistic
  const midLat = (start.lat + end.lat) / 2 + (Math.random() - 0.5) * 0.008;
  const midLng = (start.lng + end.lng) / 2 + (Math.random() - 0.5) * 0.008;
  
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    // Quadratic bezier curve
    const lat = (1 - t) * (1 - t) * start.lat + 2 * (1 - t) * t * midLat + t * t * end.lat;
    const lng = (1 - t) * (1 - t) * start.lng + 2 * (1 - t) * t * midLng + t * t * end.lng;
    points.push({ lat, lng });
  }
  return points;
};

// Calculate bearing between two points for vehicle heading
const getBearing = (from: Coord, to: Coord): number => {
  const dLng = to.lng - from.lng;
  const dLat = to.lat - from.lat;
  return Math.atan2(dLng, dLat) * (180 / Math.PI);
};

export const GoogleMapMock: React.FC<GoogleMapMockProps> = ({
  pickup,
  drop,
  routePath,
  eta = '12 mins',
  distance = '4.2 km',
  isPlaying = false,
  onReachDestination,
  onProgress,
  height = '350px',
  minimal = false,
}) => {
  const [progressIndex, setProgressIndex] = useState(0);
  const [localIsPlaying, setLocalIsPlaying] = useState(isPlaying);
  const [speedMultiplier, setSpeedMultiplier] = useState(1);
  const animationRef = useRef<number | null>(null);

  // Generate full pathway coordinates
  const path = useMemo(() => routePath || interpolatePoints(pickup, drop, 150), [pickup, drop, routePath]);

  // Waypoint markers along the route (every 25%)
  const waypoints = useMemo(() => {
    const indices = [
      Math.floor(path.length * 0.25),
      Math.floor(path.length * 0.5),
      Math.floor(path.length * 0.75),
    ];
    return indices.map((idx) => path[idx]);
  }, [path]);

  useEffect(() => {
    setLocalIsPlaying(isPlaying);
  }, [isPlaying]);

  useEffect(() => {
    if (!localIsPlaying) {
      if (animationRef.current) {
        clearInterval(animationRef.current);
        animationRef.current = null;
      }
      return;
    }

    const intervalTime = Math.max(10, Math.round(150 / speedMultiplier));
    animationRef.current = window.setInterval(() => {
      setProgressIndex((prev) => {
        const next = prev + 1;
        if (next >= path.length) {
          if (animationRef.current) clearInterval(animationRef.current);
          setLocalIsPlaying(false);
          if (onReachDestination) onReachDestination();
          return path.length - 1;
        }
        if (onProgress) {
          onProgress(Math.round((next / (path.length - 1)) * 100));
        }
        return next;
      });
    }, intervalTime);

    return () => {
      if (animationRef.current) clearInterval(animationRef.current);
    };
  }, [localIsPlaying, path, onReachDestination, onProgress, speedMultiplier]);

  const currentPos = path[progressIndex] || path[0];
  const nextPos = path[Math.min(progressIndex + 1, path.length - 1)] || currentPos;

  // Vehicle heading angle
  const heading = getBearing(currentPos, nextPos);

  // Computed live stats
  const progressPercent = path.length > 1 ? Math.round((progressIndex / (path.length - 1)) * 100) : 0;
  const remainingPercent = 100 - progressPercent;
  
  // Parse original distance to compute remaining
  const totalDistNum = parseFloat(distance) || 4.2;
  const distRemaining = ((remainingPercent / 100) * totalDistNum).toFixed(1);
  
  // Parse ETA to compute remaining time
  const etaMatch = eta.match(/(\d+)/);
  const totalEtaMins = etaMatch ? parseInt(etaMatch[1]) : 12;
  const etaRemaining = Math.max(0, Math.ceil((remainingPercent / 100) * totalEtaMins));

  // Simulated speed
  const speed = localIsPlaying ? Math.round(20 + Math.random() * 25 + speedMultiplier * 5) : 0;

  const resetPlayback = () => {
    setProgressIndex(0);
    setLocalIsPlaying(false);
    if (onProgress) onProgress(0);
  };

  const mapId = useRef(Math.random().toString(36).substr(2, 9)).current;

  const getLeft = (lng: number) => 10 + ((lng - Math.min(pickup.lng, drop.lng) + 0.01) / 0.05) * 80;
  const getTop = (lat: number) => 80 - ((lat - Math.min(pickup.lat, drop.lat) + 0.01) / 0.05) * 60;

  return (
    <div className={`relative w-full overflow-hidden rounded-forge bg-[#F4F5F7] border border-forgeGray-200 shadow-sm map-container-${mapId}`}>
      <style>{`
        .map-container-${mapId} { height: ${height}; }
        .pin-pickup-${mapId} { left: ${getLeft(pickup.lng)}%; top: ${getTop(pickup.lat)}%; transform: translate(-50%, -100%); }
        .pin-drop-${mapId} { left: ${getLeft(drop.lng)}%; top: ${getTop(drop.lat)}%; transform: translate(-50%, -100%); }
        .pin-current-${mapId} { left: ${getLeft(currentPos.lng)}%; top: ${getTop(currentPos.lat)}%; transform: translate(-50%, -50%); }
        @keyframes pulse-ring { 0% { transform: scale(0.8); opacity: 0.6; } 50% { transform: scale(1.4); opacity: 0; } 100% { transform: scale(0.8); opacity: 0.6; } }
        @keyframes glow-line { 0% { stroke-opacity: 0.3; } 50% { stroke-opacity: 0.8; } 100% { stroke-opacity: 0.3; } }
        .route-glow-${mapId} { animation: glow-line 2s ease-in-out infinite; }
        .pulse-ring-${mapId} { animation: pulse-ring 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
      `}</style>
      
      {/* Grid Pattern Background */}
      <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)](#334155_1px,transparent_1px)] [background-size:16px_16px] opacity-70" />

      {/* Simulated Roads/Lanes */}
      <svg className="absolute inset-0 w-full h-full opacity-40">
        <path d="M 0,100 L 600,100 M 150,0 L 150,400 M 450,0 L 450,400 M 0,250 L 600,250" stroke="#E2E8F0" strokeWidth="20" fill="none" />
        <path d="M 0,100 L 600,100 M 150,0 L 150,400 M 450,0 L 450,400 M 0,250 L 600,250" stroke="#FFFFFF" strokeWidth="16" fill="none" />
      </svg>

      {/* Drawing simulated route path */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        {/* Full route - faded */}
        <polyline
          points={path.map((pt) => `${getLeft(pt.lng)}%,${getTop(pt.lat)}%`).join(' ')}
          fill="none"
          stroke="#94A3B8"
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="opacity-30"
          strokeDasharray="8 6"
        />

        {/* Glow effect on active path */}
        <polyline
          points={path.slice(0, progressIndex + 1).map((pt) => `${getLeft(pt.lng)}%,${getTop(pt.lat)}%`).join(' ')}
          fill="none"
          stroke="#3B82F6"
          strokeWidth="10"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`opacity-20 route-glow-${mapId}`}
        />

        {/* Drawn active progress path */}
        <polyline
          points={path.slice(0, progressIndex + 1).map((pt) => `${getLeft(pt.lng)}%,${getTop(pt.lat)}%`).join(' ')}
          fill="none"
          stroke="url(#routeGradient)"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Gradient definition */}
        <defs>
          <linearGradient id="routeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#10B981" />
            <stop offset="50%" stopColor="#3B82F6" />
            <stop offset="100%" stopColor="#6366F1" />
          </linearGradient>
        </defs>
      </svg>

      {/* Waypoint markers */}
      {waypoints.map((wp, idx) => (
        <div
          key={idx}
          className="absolute z-[5] transition-all duration-200"
          style={{
            left: `${getLeft(wp.lng)}%`,
            top: `${getTop(wp.lat)}%`,
            transform: 'translate(-50%, -50%)',
          }}
        >
          <div className={`h-3 w-3 rounded-full border-2 border-white shadow-sm ${
            progressIndex >= Math.floor(path.length * (0.25 * (idx + 1)))
              ? 'bg-emerald-500'
              : 'bg-slate-300'
          }`} />
        </div>
      ))}

      {/* Floating Pickup Pin */}
      <div className={`absolute transition-all duration-200 z-[6] pin-pickup-${mapId}`}>
        <div className="flex flex-col items-center">
          {/* Label */}
          <div className="bg-amber-500 text-white text-[7px] font-black px-1.5 py-0.5 rounded-md mb-1 shadow-md whitespace-nowrap uppercase tracking-wider">
            PICKUP
          </div>
          <div className="relative">
            <div className={`absolute -inset-2 rounded-full bg-amber-400/30 pulse-ring-${mapId}`} />
            <div className="bg-gradient-to-br from-amber-400 to-amber-600 border-2 border-white p-1.5 rounded-full shadow-lg relative z-10">
              <span className="w-1.5 h-1.5 rounded-full bg-white block" />
            </div>
          </div>
        </div>
      </div>

      {/* Floating Drop Pin */}
      <div className={`absolute transition-all duration-200 z-[6] pin-drop-${mapId}`}>
        <div className="flex flex-col items-center">
          {/* Label */}
          <div className="bg-blue-600 text-white text-[7px] font-black px-1.5 py-0.5 rounded-md mb-1 shadow-md whitespace-nowrap uppercase tracking-wider">
            DROP
          </div>
          <div className="relative">
            <div className={`absolute -inset-2 rounded-full bg-blue-400/30 pulse-ring-${mapId}`} />
            <div className="bg-gradient-to-br from-blue-500 to-indigo-600 border-2 border-white p-1.5 rounded-full shadow-lg relative z-10">
              <MapPin className="w-2.5 h-2.5 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Moving Live Vehicle Marker with heading rotation */}
      <div className={`absolute transition-all duration-150 z-10 pin-current-${mapId}`}>
        <div className="relative flex items-center justify-center">
          <span className={`absolute h-10 w-10 rounded-full bg-blue-500/20 pulse-ring-${mapId}`} />
          <span className="absolute h-6 w-6 rounded-full bg-blue-500/10 animate-ping" />
          <div
            className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 border-2 border-white shadow-lg flex items-center justify-center relative z-10"
            style={{ transform: `rotate(${heading + 135}deg)` }}
          >
            <Navigation className="w-4 h-4 text-white fill-white" />
          </div>
        </div>
      </div>

      {minimal ? (
        <>
          {/* Top Right GPS Status pill */}
          <div className="absolute top-3.5 right-3.5 bg-white border border-forgeGray-200 px-3 py-1.5 rounded-full shadow-sm flex items-center space-x-1.5 z-10">
            <span className="w-2 h-2 rounded-full bg-emerald-500 block" />
            <span className="text-[9px] font-black text-forgeGray-750 tracking-wider">GPS ACTIVE</span>
          </div>

          {/* Top Left Zoom & Compass stacked control buttons */}
          <div className="absolute top-16 left-3.5 flex flex-col space-y-1.5 z-10">
            <div className="flex flex-col bg-white border border-forgeGray-200 rounded-lg shadow-sm overflow-hidden">
              <button title="Zoom In" className="h-7 w-7 flex items-center justify-center text-xs font-bold hover:bg-forgeGray-50 border-b border-forgeGray-100 text-forgeGray-700">+</button>
              <button title="Zoom Out" className="h-7 w-7 flex items-center justify-center text-xs font-bold hover:bg-forgeGray-50 text-forgeGray-700">-</button>
            </div>
            <button title="Recenter Compass" className="h-7 w-7 bg-white border border-forgeGray-200 rounded-lg shadow-sm flex items-center justify-center hover:bg-forgeGray-50">
              <Compass className="w-3.5 h-3.5 text-forgeGray-500" />
            </button>
          </div>

          {/* Bottom Center Guide strip */}
          <div className="absolute bottom-3 left-3 right-3 bg-white border border-forgeGray-200 px-4 py-2.5 rounded-xl shadow-md flex items-center space-x-2.5 z-10">
            <Navigation className="w-3.5 h-3.5 text-blue-500 fill-blue-500 transform rotate-[45deg]" />
            <div className="flex items-center text-[10px] font-bold">
              <span className="text-forgeGray-950 font-extrabold">HSR Main Road</span>
              <span className="text-forgeGray-450 ml-1.5">2.1 km to next turn</span>
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Top Floating Live Stats HUD */}
          <div className="absolute top-3 left-3 right-3 flex items-start justify-between pointer-events-none gap-2 z-20">
            {/* Left: Live Stats Cluster */}
            <div className="pointer-events-auto bg-white/90 backdrop-blur-md border border-white/50 rounded-2xl p-3 shadow-xl">
              <div className="flex items-center space-x-4">
                {/* ETA */}
                <div className="flex items-center space-x-1.5">
                  <div className="p-1 bg-blue-500/10 rounded-lg">
                    <Clock className="w-3.5 h-3.5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-[8px] text-forgeGray-450 uppercase tracking-wider font-bold">ETA</p>
                    <p className="text-sm font-black text-forgeGray-900 leading-none">
                      {etaRemaining}<span className="text-[9px] font-bold text-forgeGray-400 ml-0.5">min</span>
                    </p>
                  </div>
                </div>

                <div className="w-px h-8 bg-forgeGray-200/60" />

                {/* Distance */}
                <div className="flex items-center space-x-1.5">
                  <div className="p-1 bg-emerald-500/10 rounded-lg">
                    <Route className="w-3.5 h-3.5 text-emerald-500" />
                  </div>
                  <div>
                    <p className="text-[8px] text-forgeGray-450 uppercase tracking-wider font-bold">LEFT</p>
                    <p className="text-sm font-black text-forgeGray-900 leading-none">
                      {distRemaining}<span className="text-[9px] font-bold text-forgeGray-400 ml-0.5">km</span>
                    </p>
                  </div>
                </div>

                <div className="w-px h-8 bg-forgeGray-200/60" />

                {/* Speed */}
                <div className="flex items-center space-x-1.5">
                  <div className="p-1 bg-violet-500/10 rounded-lg">
                    <Gauge className="w-3.5 h-3.5 text-violet-500" />
                  </div>
                  <div>
                    <p className="text-[8px] text-forgeGray-450 uppercase tracking-wider font-bold">SPEED</p>
                    <p className="text-sm font-black text-forgeGray-900 leading-none">
                      {speed}<span className="text-[9px] font-bold text-forgeGray-400 ml-0.5">km/h</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Map Utility Controls */}
            <div className="pointer-events-auto flex flex-col space-y-1 bg-white/90 backdrop-blur-md rounded-xl p-1 shadow-md border border-white/40">
              <button title="Recenter Map" aria-label="Recenter map" className="p-1.5 hover:bg-forgeGray-100 text-forgeGray-700 rounded-lg">
                <Compass className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* GPS Active Badge - top right below controls */}
          <div className="absolute top-[68px] right-3 bg-emerald-500/90 backdrop-blur text-white px-2.5 py-1 rounded-full shadow-md flex items-center space-x-1.5 z-20">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse block" />
            <span className="text-[8px] font-black tracking-wider">LIVE GPS</span>
          </div>

          {/* Bottom Floating Playback Controls Overlay */}
          <div className="absolute bottom-3 left-3 right-3 bg-white/90 backdrop-blur-md rounded-2xl p-3 border border-white/40 shadow-xl z-20">
            {/* Progress bar */}
            <div className="mb-2.5">
              <div className="h-1.5 bg-forgeGray-200/60 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 via-blue-500 to-indigo-500 rounded-full transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setLocalIsPlaying(!localIsPlaying)}
                  title={localIsPlaying ? 'Pause Simulation' : 'Start Simulation'}
                  aria-label={localIsPlaying ? 'Pause route playback' : 'Play route playback'}
                  className={`p-2.5 rounded-xl transition-all duration-200 shadow-sm ${
                    localIsPlaying 
                      ? 'bg-gradient-to-br from-amber-400 to-orange-500 hover:from-amber-500 hover:to-orange-600 text-white' 
                      : 'bg-gradient-to-br from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white'
                  }`}
                >
                  {localIsPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </button>
                <button
                  onClick={resetPlayback}
                  title="Reset playback"
                  aria-label="Reset route playback"
                  className="p-2 border border-forgeGray-200/60 hover:bg-forgeGray-100 text-forgeGray-600 rounded-xl transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>

                {/* Speed Selector */}
                <div className="flex items-center space-x-0.5 bg-forgeGray-100/60 rounded-xl p-0.5">
                  {[1, 2, 5].map((multiplier) => (
                    <button
                      key={multiplier}
                      onClick={() => setSpeedMultiplier(multiplier)}
                      className={`px-2 py-1 text-[10px] font-black rounded-lg transition-all duration-200 ${
                        speedMultiplier === multiplier
                          ? 'bg-white text-forgeGray-900 shadow-sm'
                          : 'text-forgeGray-500 hover:text-forgeGray-700'
                      }`}
                    >
                      <div className="flex items-center space-x-0.5">
                        {multiplier > 1 && <Zap className="w-2.5 h-2.5" />}
                        <span>{multiplier}x</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center space-x-3">
                {/* Scrubber */}
                <input
                  type="range"
                  min={0}
                  max={path.length - 1}
                  value={progressIndex}
                  title="Playback Progress"
                  aria-label="Playback Progress"
                  onChange={(e) => {
                    const idx = parseInt(e.target.value, 10);
                    setProgressIndex(idx);
                    if (onProgress) {
                      onProgress(Math.round((idx / (path.length - 1)) * 100));
                    }
                  }}
                  className="w-20 h-1 bg-forgeGray-200 rounded-full appearance-none cursor-pointer accent-blue-500 focus:outline-none"
                />

                {/* Progress Badge */}
                <div className="bg-forgeGray-900 text-white px-2.5 py-1 rounded-lg">
                  <p className="text-[10px] font-black">{progressPercent}%</p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
