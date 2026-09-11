import { useWeather } from '@/hooks/useWeather';
import WeatherBannerScene from './WeatherBannerScene';

// Same rotation convention as the old GreetingIllustration tip: pick by day-of-month so it's
// stable through the day but varies day to day, without needing any state of its own.
const SUNNY_QUOTES = [
  'Great work starts with a great log.',
  'Sunshine and productivity go hand in hand.',
  'Clear skies, clear goals.',
];
const RAINY_QUOTES = [
  'Even rainy days count towards your goals.',
  'Storms pass, progress stays.',
  'Cloudy skies, clear priorities.',
];

// `datePicker` and `actions` are passed in from EmployeeDashboard so this component only owns
// the weather fetch and the decorative scene, not page navigation/date state. Kept as two
// separate props (rather than one `controls` node) so the weather pill can sit between them in
// the single top-right row, same order as the reference layout.
const WeatherHeroBanner = ({ greeting, firstName, datePicker, actions }) => {
  const { data: weather, isLoading } = useWeather();
  const isRainy = weather?.isRainy ?? false;
  const dayIdx = new Date().getDate();

  const quote = (isRainy ? RAINY_QUOTES : SUNNY_QUOTES)[dayIdx % 3];

  return (
    <div className="relative min-h-[108px] overflow-hidden rounded-3xl shadow-md sm:min-h-[120px] lg:min-h-[136px]">
      <WeatherBannerScene isRainy={isRainy} />

      {/* `absolute inset-0` (not `h-full`) — the outer banner's height comes only from its
          min-height, so a percentage-based h-full here would resolve against no definite parent
          height and collapse to auto, breaking the greeting's top-1/2 vertical centering below. */}
      <div className="absolute inset-0 p-3 sm:p-4">
        {/* Top-right block: the date-picker/weather-pill/action-buttons row, with the quote
            centered directly below the date picker — not the whole row — since that's the one
            item it's meant to sit under. Absolutely positioned (not a flex sibling of the
            greeting) so its own height never shifts where the greeting block below ends up
            centering.
            `pb-8`/`sm:pb-9` reserves the quote's own height as bottom padding on this row, since
            the quote itself is positioned `absolute` below (so it doesn't grow the row's box on
            its own) — without this, `top-1/2` centers only the thin pills row, leaving the quote
            to hang well past the visual middle and down near the banner's bottom edge instead of
            sitting close beneath the row as one balanced block. */}
        <div className="absolute right-4 top-1/2 flex -translate-y-1/2 flex-wrap items-start justify-end gap-2.5 pb-8 sm:right-5 sm:gap-3 sm:pb-9">
          {/* `relative` + the quote as an `absolute` overlay below — the quote is wider than the
              date picker, so sizing this wrapper by flex content (e.g. flex-col items-center)
              would stretch it to the quote's width and shove the date picker off its normal
              spot, pushing every sibling after it (divider/weather pill/buttons) to the right.
              Absolute positioning keeps this wrapper exactly as wide as the date picker itself,
              so nothing else in the row moves; the quote just centers underneath it. */}
          <div className="relative">
            {datePicker}
            {/* `whitespace-nowrap` (no max-w) — a wrap to a second line would grow past the
                banner's own height and clip under the card's overflow-hidden, as happened before. */}
            <div className="absolute left-1/2 top-full mt-2 hidden -translate-x-1/2 sm:block">
              <div className="mx-auto h-0.5 w-10 rounded bg-blue-500/70" />
              <p className="mt-2 whitespace-nowrap text-center text-xs italic font-bold text-white [text-shadow:0_1px_3px_rgba(0,0,0,0.35)] sm:text-sm">
                &ldquo;{quote}&rdquo;
              </p>
            </div>
          </div>
          <div className="hidden h-5 w-px bg-slate-400/40 sm:block" />
          <div className="flex items-center gap-1.5 rounded-full bg-white/90 px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm">
            <span className="text-sm leading-none">{isLoading || !weather ? '⛅' : weather.icon}</span>
            <span>{isLoading || !weather ? '--°C' : `${weather.tempC}°C`}</span>
            <span className="text-slate-300">|</span>
            <span className="font-medium text-slate-500">{isLoading || !weather ? 'Loading…' : weather.label}</span>
          </div>
          {actions}
        </div>

        {/* Greeting block — truly vertically centered on the banner itself (not just the
            leftover space below the controls), left-aligned, same as the reference. */}
        <div className="absolute left-4 top-1/2 max-w-md -translate-y-1/2 sm:left-5">
          <h1 className="text-lg font-black tracking-tight text-slate-900 [text-shadow:0_1px_3px_rgba(255,255,255,0.75)] sm:text-xl lg:text-2xl">
            {greeting}, {firstName} 👋
          </h1>
          <p className="mt-1 text-xs font-semibold text-slate-800 [text-shadow:0_1px_2px_rgba(255,255,255,0.6)] sm:text-sm">
            Let&apos;s keep your work log up to date.
          </p>
        </div>
      </div>
    </div>
  );
};

export default WeatherHeroBanner;
