import { useWeather } from '@/hooks/useWeather';
import { cn } from '@/utils/cn';
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
    // `flex items-center` (not two independently absolute+translate-y-1/2 blocks) — neither
    // block used to know the other's width, so at container widths where the sidebar/a longer
    // name/the quote left less room than expected, the greeting and controls overlapped instead
    // of making room for each other. A normal flex row fixes that at any resolution: `min-h-*` is
    // only a floor (so the banner still reads as a hero on short content), and `flex-wrap` below
    // drops the controls to their own line — instead of colliding with the greeting — the moment
    // there truly isn't room for both on one line, on a real phone or a merely-narrow desktop
    // window alike.
    <div className="relative flex min-h-[108px] items-center overflow-hidden rounded-3xl shadow-md sm:min-h-[120px] lg:min-h-[136px]">
      <WeatherBannerScene isRainy={isRainy} />

      <div className="relative z-10 flex w-full flex-wrap items-center justify-between gap-3 p-3 sm:gap-4 sm:p-4">
        {/* Greeting — `min-w-0` lets this shrink instead of forcing the row wider than the
            banner, so it wraps onto its own line above the controls rather than pushing them
            off/under the edge. */}
        <div className="min-w-0 sm:max-w-md">
          <h1 className={cn(
            'text-lg font-black tracking-tight sm:text-xl lg:text-2xl',
            isRainy
              ? 'text-white [text-shadow:0_2px_6px_rgba(0,0,0,0.65)]'
              : 'text-slate-900 [text-shadow:0_1px_3px_rgba(255,255,255,0.75)]',
          )}
          >
            {greeting}, {firstName} 👋
          </h1>
          <p className={cn(
            'mt-1 text-xs font-semibold sm:text-sm',
            isRainy
              ? 'text-white/90 [text-shadow:0_1px_4px_rgba(0,0,0,0.55)]'
              : 'text-slate-800 [text-shadow:0_1px_2px_rgba(255,255,255,0.6)]',
          )}
          >
            Let&apos;s keep your work log up to date.
          </p>
        </div>

        {/* Below `sm`: an even 2x2 grid (date + weather, then both buttons stretched to match
            widths) — reads as a deliberate, modern mobile layout instead of everything sitting
            at whatever width its own label happens to need, which is what made two
            differently-sized buttons on the same row look unpolished. No reserved space below it
            here — the quote is hidden below `sm` (see it further down), so there's nothing to
            leave room for; reserving it anyway used to stretch the banner and expose more of the
            decorative scene underneath than intended.
            `sm:flex` switches this back to the original single wrapping row exactly as it was on
            desktop, where `sm:pb-9` DOES reserve room below the row for the quote, which sits
            directly under the date picker specifically (not the whole row) via the
            `relative`/`absolute` pairing just inside it. `sm:items-start` there is what keeps the
            quote inside that reserved space — it's anchored to the date picker's own bottom edge
            via `top-full` below, which only stays inside that space if the date picker sits flush
            at the row's top instead of vertically centered within it. `self-center` on the
            divider opts just that element back into looking centered against its neighbors. */}
        <div className="relative grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-start sm:gap-2.5 sm:pb-9">
          <div className="relative w-full sm:w-auto">
            {datePicker}
            {/* `whitespace-nowrap` (no max-w) — a wrap to a second line would grow past the
                reserved pb-8/pb-9 below and clip under the card's overflow-hidden. */}
            <div className="absolute left-1/2 top-full mt-2 hidden -translate-x-1/2 sm:block">
              <div className="mx-auto h-0.5 w-10 rounded bg-blue-500/70" />
              <p className="mt-2 whitespace-nowrap text-center text-xs italic font-bold text-white [text-shadow:0_1px_3px_rgba(0,0,0,0.35)] sm:text-sm">
                &ldquo;{quote}&rdquo;
              </p>
            </div>
          </div>
          <div className="hidden h-5 w-px self-center bg-slate-400/40 sm:block" />
          <div className="flex h-7 items-center justify-center gap-1 rounded-full bg-white/90 px-2.5 text-[11px] font-semibold text-slate-700 shadow-sm sm:h-8 sm:gap-1.5 sm:px-3.5 sm:text-xs">
            <span className="text-xs leading-none sm:text-sm">{isLoading || !weather ? '⛅' : weather.icon}</span>
            <span>{isLoading || !weather ? '--°C' : `${weather.tempC}°C`}</span>
            <span className="text-slate-300">|</span>
            <span className="font-medium text-slate-500">{isLoading || !weather ? 'Loading…' : weather.label}</span>
          </div>
          {actions}
        </div>
      </div>
    </div>
  );
};

export default WeatherHeroBanner;
