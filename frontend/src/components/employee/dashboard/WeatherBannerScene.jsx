// Painted mountain/lake backdrop for the Employee Dashboard hero banner. Pure inline SVG (no
// image asset) so it re-themes instantly between the sunny and rainy palettes and never needs a
// network round-trip of its own — only the `isRainy` flag (from useWeather) picks which palette
// and which of the sun/clouds/rain layers render.

// Deterministic layout (no Math.random in render — that would reshuffle every re-render)
const RAIN_DROPS = Array.from({ length: 50 }, (_, i) => ({
  x: (i * 173) % 1600,
  duration: 0.9 + ((i * 37) % 100) / 100,
  delay: ((i * 53) % 190) / 100,
  len: 24 + (i % 5) * 6,
}));

// Two depth rows per side: a smaller/duller back row and a bigger/closer front row, mirrored
// left<->right around the 1600-wide viewBox so the tree line reads as one continuous forest
// instead of a scattered handful of pines.
const PINES_LEFT_BACK = [[20, 157.12, 0.55], [55, 158.85, 0.5], [90, 156.29, 0.6], [125, 159.74, 0.5], [160, 157.12, 0.55], [195, 160.51, 0.48]];
const PINES_LEFT_FRONT = [[10, 175.04, 0.95], [70, 178.43, 0.8], [130, 175.87, 1.0], [190, 179.26, 0.75], [250, 176.77, 0.9], [300, 180.16, 0.7]];
// Thins the tree line out toward the middle (where the lake opens up into view) instead of
// stopping dead at x=300/1300 — reads as one continuous forest hugging the shore, not two
// isolated clumps in the corners.
const PINES_LEFT_MID = [[330, 162.24, 0.42], [375, 163.84, 0.36], [420, 161.6, 0.4], [465, 163.52, 0.3]];
const PINES_RIGHT_BACK = PINES_LEFT_BACK.map(([x, y, s]) => [1600 - x, y, s]);
const PINES_RIGHT_FRONT = PINES_LEFT_FRONT.map(([x, y, s]) => [1600 - x, y, s]);
const PINES_RIGHT_MID = PINES_LEFT_MID.map(([x, y, s]) => [1600 - x, y, s]);

const Pine = ({ x, y, scale = 1, color }) => (
  <g transform={`translate(${x} ${y}) scale(${scale})`} fill={color}>
    <path d="M0 -52 L16 -24 L8 -24 L24 -3 L12 -3 L28 26 L-28 26 L-12 -3 L-24 -3 L-8 -24 L-16 -24 Z" />
    <rect x="-3.5" y="26" width="7" height="10" />
  </g>
);

// Snow patch for one peak — the apex is the mountain path's OWN peak vertex (not a
// separately-eyeballed coordinate), and the two base corners sit partway down the peak's own
// left/right ridge edges. Sharing vertices with the mountain path this way guarantees the patch
// is always nestled inside the silhouette instead of floating disconnected above it.
const SnowCap = ({ peak: [px, py], left: [lx, ly], right: [rx, ry], t = 0.4, color, opacity }) => {
  const bx = px + t * (lx - px);
  const by = py + t * (ly - py);
  const cx2 = px + t * (rx - px);
  const cy2 = py + t * (ry - py);
  return <path d={`M${px},${py} L${bx},${by} L${cx2},${cy2} Z`} fill={color} opacity={opacity} />;
};

const WeatherBannerScene = ({ isRainy }) => (
  <svg
    viewBox="0 0 1600 204.8"
    preserveAspectRatio="xMidYMid slice"
    className="absolute inset-0 h-full w-full"
    aria-hidden="true"
  >
    <defs>
      <linearGradient id="whb-sky-sunny" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#bfe4f8" />
        <stop offset="45%" stopColor="#d7eefb" />
        <stop offset="100%" stopColor="#eef8ff" />
      </linearGradient>
      <linearGradient id="whb-sky-rainy" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#4b5563" />
        <stop offset="60%" stopColor="#3f4a5a" />
        <stop offset="100%" stopColor="#324054" />
      </linearGradient>
      <linearGradient id="whb-lake-sunny" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#a9d8ee" />
        <stop offset="100%" stopColor="#5fa9cf" />
      </linearGradient>
      <linearGradient id="whb-lake-rainy" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#3e4c5e" />
        <stop offset="100%" stopColor="#212c3a" />
      </linearGradient>
      <radialGradient id="whb-sun-glow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#fff8d8" stopOpacity="0.95" />
        <stop offset="45%" stopColor="#fff0b0" stopOpacity="0.5" />
        <stop offset="100%" stopColor="#fff0b0" stopOpacity="0" />
      </radialGradient>
      <radialGradient id="whb-sun-core" cx="40%" cy="35%" r="65%">
        <stop offset="0%" stopColor="#fffbe8" />
        <stop offset="60%" stopColor="#ffdf6b" />
        <stop offset="100%" stopColor="#ffc93d" />
      </radialGradient>
      <linearGradient id="whb-mtn1" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#d7e8f5" /><stop offset="100%" stopColor="#c3dcef" />
      </linearGradient>
      <linearGradient id="whb-mtn2" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#b3d3ea" /><stop offset="100%" stopColor="#9dc4e2" />
      </linearGradient>
      <linearGradient id="whb-mtn3" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#8bb9d9" /><stop offset="100%" stopColor="#75a9cc" />
      </linearGradient>
      <linearGradient id="whb-mtn4" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#5f95bc" /><stop offset="100%" stopColor="#4c81a8" />
      </linearGradient>
      <linearGradient id="whb-mtn1-rainy" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#7c8898" /><stop offset="100%" stopColor="#6c7a8c" />
      </linearGradient>
      <linearGradient id="whb-mtn2-rainy" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#69768a" /><stop offset="100%" stopColor="#5a687c" />
      </linearGradient>
      <linearGradient id="whb-mtn3-rainy" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#525f72" /><stop offset="100%" stopColor="#465264" />
      </linearGradient>
      <linearGradient id="whb-mtn4-rainy" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#3a4658" /><stop offset="100%" stopColor="#2e3a4a" />
      </linearGradient>
      <style>{`
        @keyframes whb-fall {
          0%   { transform: translateY(-40px); opacity: 0; }
          12%  { opacity: .6; }
          88%  { opacity: .6; }
          100% { transform: translateY(232px); opacity: 0; }
        }
        @keyframes whb-drift {
          0%, 100% { transform: translateX(0); }
          50%      { transform: translateX(18px); }
        }
        .whb-drop  { animation: whb-fall linear infinite; }
        .whb-cloud { animation: whb-drift 16s ease-in-out infinite; }
      `}</style>
    </defs>

    {/* sky */}
    <rect x="0" y="0" width="1600" height="204.8" fill={isRainy ? 'url(#whb-sky-rainy)' : 'url(#whb-sky-sunny)'} />

    {isRainy ? (
      <g className="whb-cloud">
        {[[60, 38.4], [420, 25.6], [820, 42.88], [1180, 30.08], [1460, 46.72]].map(([cx, cy], i) => (
          <g key={i} fill="#5b6b80" opacity="0.85">
            <ellipse cx={cx} cy={cy} rx="120" ry="14.72" />
            <ellipse cx={cx + 80} cy={cy + 7} rx="90" ry="12.16" />
            <ellipse cx={cx - 70} cy={cy + 9} rx="80" ry="10.24" />
          </g>
        ))}
      </g>
    ) : (
      <>
        {/* sun — top-left, with soft glow + birds passing nearby */}
        <circle cx="200" cy="30.08" r="64" fill="url(#whb-sun-glow)" />
        <circle cx="200" cy="30.08" r="14.72" fill="url(#whb-sun-core)" />
        <g stroke="#5b6b80" strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.55">
          <path d="M430 46.72 q10 -5.76 20 0 q10 -5.76 20 0" />
          <path d="M495 36.48 q8 -4.48 16 0 q8 -4.48 16 0" />
        </g>
        <g className="whb-cloud" fill="#ffffff" opacity="0.8">
          <ellipse cx="760" cy="40.32" rx="60" ry="7.04" />
          <ellipse cx="805" cy="37.76" rx="42" ry="5.76" />
          <ellipse cx="1180" cy="55.68" rx="70" ry="7.68" />
          <ellipse cx="1230" cy="51.84" rx="46" ry="5.76" />
        </g>
      </>
    )}

    {/* mountains — 4 layers, back to front, snow caps on the tallest front peaks of each layer.
        Coordinates are the original 1600x480 composition's mountain shapes, scaled to this
        1600x204.8 viewBox so the scene fits a short, wide banner without the sky/sun getting
        sliced off by preserveAspectRatio="slice" cropping. */}
    <path
      d="M0,110.91 L90,81.09 L170,64 L250,87.49 L330,59.71 L420,83.2 L520,51.2 L610,81.09 L700,66.11 L800,89.6 L900,64 L1000,85.31 L1100,61.89 L1200,87.49 L1300,68.29 L1400,91.71 L1500,74.69 L1600,93.89 L1600,128 L0,128 Z"
      fill={isRainy ? 'url(#whb-mtn1-rainy)' : 'url(#whb-mtn1)'}
    />
    <SnowCap peak={[520, 51.2]} left={[420, 83.2]} right={[610, 81.09]} color={isRainy ? '#c7d0dc' : '#ffffff'} opacity={isRainy ? 0.7 : 0.85} />
    <SnowCap peak={[1100, 61.89]} left={[1000, 85.31]} right={[1200, 87.49]} color={isRainy ? '#c7d0dc' : '#ffffff'} opacity={isRainy ? 0.7 : 0.85} />

    <path
      d="M0,123.71 L110,96 L210,115.2 L320,83.2 L430,110.91 L560,76.8 L670,108.8 L790,81.09 L900,106.69 L1020,78.91 L1140,106.69 L1260,85.31 L1380,108.8 L1500,89.6 L1600,106.69 L1600,140.8 L0,140.8 Z"
      fill={isRainy ? 'url(#whb-mtn2-rainy)' : 'url(#whb-mtn2)'}
    />
    <SnowCap peak={[560, 76.8]} left={[430, 110.91]} right={[670, 108.8]} color={isRainy ? '#c7d0dc' : '#ffffff'} opacity={isRainy ? 0.75 : 0.85} />
    <SnowCap peak={[1020, 78.91]} left={[900, 106.69]} right={[1140, 106.69]} color={isRainy ? '#c7d0dc' : '#ffffff'} opacity={isRainy ? 0.75 : 0.85} />

    <path
      d="M0,138.69 L130,108.8 L250,130.11 L380,100.29 L510,128 L640,96 L770,125.89 L900,102.4 L1030,128 L1160,104.51 L1290,128 L1420,106.69 L1600,123.71 L1600,153.6 L0,153.6 Z"
      fill={isRainy ? 'url(#whb-mtn3-rainy)' : 'url(#whb-mtn3)'}
    />
    <SnowCap peak={[640, 96]} left={[510, 128]} right={[770, 125.89]} color={isRainy ? '#dbe3ee' : '#ffffff'} opacity={isRainy ? 0.8 : 0.9} />
    <SnowCap peak={[380, 100.29]} left={[250, 130.11]} right={[510, 128]} color={isRainy ? '#dbe3ee' : '#ffffff'} opacity={isRainy ? 0.8 : 0.9} />

    <path
      d="M0,153.6 L160,119.49 L300,145.09 L440,113.09 L580,142.91 L720,108.8 L860,140.8 L1000,115.2 L1140,142.91 L1280,117.31 L1420,140.8 L1600,121.6 L1600,170.69 L0,170.69 Z"
      fill={isRainy ? 'url(#whb-mtn4-rainy)' : 'url(#whb-mtn4)'}
    />
    <SnowCap peak={[720, 108.8]} left={[580, 142.91]} right={[860, 140.8]} color={isRainy ? '#dbe3ee' : '#ffffff'} opacity={isRainy ? 0.85 : 0.95} />
    <SnowCap peak={[440, 113.09]} left={[300, 145.09]} right={[580, 142.91]} color={isRainy ? '#dbe3ee' : '#ffffff'} opacity={isRainy ? 0.85 : 0.95} />
    <SnowCap peak={[1280, 117.31]} left={[1140, 142.91]} right={[1420, 140.8]} color={isRainy ? '#dbe3ee' : '#ffffff'} opacity={isRainy ? 0.85 : 0.95} />

    {/* lake, with soft reflection blobs + shimmer ripples */}
    <rect x="0" y="156.16" width="1600" height="48.64" fill={isRainy ? 'url(#whb-lake-rainy)' : 'url(#whb-lake-sunny)'} />
    {/* Tree-line reflection — dark green, hugging the shore right under where the pine clusters
        sit, so the water reads as a mirror rather than a plain gradient. */}
    <g opacity={isRainy ? 0.16 : 0.2}>
      <ellipse cx="130" cy="160" rx="140" ry="5.76" fill={isRainy ? '#16281f' : '#1f5c3d'} />
      <ellipse cx="1470" cy="160" rx="140" ry="5.76" fill={isRainy ? '#16281f' : '#1f5c3d'} />
    </g>
    <g opacity={isRainy ? 0.15 : 0.24}>
      <ellipse cx="230" cy="167.36" rx="90" ry="5.95" fill={isRainy ? '#2e3a4a' : '#4c81a8'} />
      <ellipse cx="560" cy="169.92" rx="110" ry="6.4" fill={isRainy ? '#465264' : '#75a9cc'} />
      <ellipse cx="900" cy="167.81" rx="100" ry="5.95" fill={isRainy ? '#2e3a4a' : '#4c81a8'} />
      <ellipse cx="1230" cy="170.3" rx="110" ry="6.4" fill={isRainy ? '#465264' : '#75a9cc'} />
      <ellipse cx="1500" cy="167.81" rx="80" ry="5.12" fill={isRainy ? '#2e3a4a' : '#4c81a8'} />
    </g>
    <g stroke="#ffffff" strokeOpacity={isRainy ? 0.15 : 0.45} strokeWidth="2" strokeLinecap="round">
      <line x1="60" y1="175.04" x2="260" y2="175.04" />
      <line x1="330" y1="183.55" x2="490" y2="183.55" />
      <line x1="120" y1="192.13" x2="340" y2="192.13" />
      <line x1="670" y1="172.93" x2="910" y2="172.93" />
      <line x1="600" y1="190.02" x2="820" y2="190.02" />
      <line x1="1040" y1="184.45" x2="1220" y2="184.45" />
      <line x1="1000" y1="196.42" x2="1200" y2="196.42" />
      <line x1="1320" y1="177.22" x2="1490" y2="177.22" />
      <line x1="1280" y1="194.24" x2="1500" y2="194.24" />
    </g>

    {/* grass foreground corners, in front of the tree line */}
    <path d="M-10,204.8 C40,189.89 110,192.83 170,179.2 C230,169.79 300,172.35 360,162.11 L400,204.8 Z" fill={isRainy ? '#3a4a3d' : '#4f8f52'} />
    <path d="M-10,204.8 C30,196.29 90,199.68 150,191.17 L200,204.8 Z" fill={isRainy ? '#43543f' : '#5da261'} opacity="0.9" />
    <path d="M1610,204.8 C1560,189.89 1490,192.83 1430,179.2 C1370,169.79 1300,172.35 1240,162.11 L1200,204.8 Z" fill={isRainy ? '#3a4a3d' : '#4f8f52'} />
    <path d="M1610,204.8 C1570,196.29 1510,199.68 1450,191.17 L1400,204.8 Z" fill={isRainy ? '#43543f' : '#5da261'} opacity="0.9" />

    {/* rocks tucked into the foreground grass */}
    <g fill={isRainy ? '#3d4652' : '#5a6472'}>
      <path d="M20,204.8 L38,189.44 L58,192 L70,204.8 Z" />
      <path d="M55,204.8 L68,194.56 L84,204.8 Z" opacity="0.85" />
      <path d="M1580,204.8 L1562,189.44 L1542,192 L1530,204.8 Z" />
      <path d="M1545,204.8 L1532,194.56 L1516,204.8 Z" opacity="0.85" />
    </g>

    {/* pine forest — three depth rows per side, thinning toward the open lake view in the middle */}
    {PINES_LEFT_BACK.map(([x, y, s], i) => <Pine key={`lb${i}`} x={x} y={y} scale={s} color={isRainy ? '#1c3327' : '#2d6b4a'} />)}
    {PINES_RIGHT_BACK.map(([x, y, s], i) => <Pine key={`rb${i}`} x={x} y={y} scale={s} color={isRainy ? '#1c3327' : '#2d6b4a'} />)}
    {PINES_LEFT_MID.map(([x, y, s], i) => <Pine key={`lm${i}`} x={x} y={y} scale={s} color={isRainy ? '#1c3327' : '#2d6b4a'} />)}
    {PINES_RIGHT_MID.map(([x, y, s], i) => <Pine key={`rm${i}`} x={x} y={y} scale={s} color={isRainy ? '#1c3327' : '#2d6b4a'} />)}
    {PINES_LEFT_FRONT.map(([x, y, s], i) => <Pine key={`lf${i}`} x={x} y={y} scale={s} color={isRainy ? '#16281f' : '#1f5c3d'} />)}
    {PINES_RIGHT_FRONT.map(([x, y, s], i) => <Pine key={`rf${i}`} x={x} y={y} scale={s} color={isRainy ? '#16281f' : '#1f5c3d'} />)}

    {/* rain */}
    {isRainy && (
      <g stroke="#dce8f5" strokeWidth="2" strokeLinecap="round" opacity="0.6">
        {RAIN_DROPS.map((d, i) => (
          <line
            key={i}
            className="whb-drop"
            x1={d.x} y1="0" x2={d.x - 12} y2={d.len}
            style={{ animationDuration: `${d.duration}s`, animationDelay: `${d.delay}s` }}
          />
        ))}
      </g>
    )}
  </svg>
);

export default WeatherBannerScene;
