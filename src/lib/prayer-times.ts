// Astronomical prayer-time solver — no external API required.
// Based on the standard solar position equations used by PrayTimes.org
// (US Naval Observatory approximations).

export type CalcMethodId = "MWL" | "ISNA" | "Egypt" | "Karachi" | "UmmAlQura";
export type AsrMethod = "standard" | "hanafi";

export const CALC_METHODS: Record<
  CalcMethodId,
  { label: string; fajr: number; isha: number | { minutesAfterMaghrib: number } }
> = {
  MWL: { label: "Muslim World League", fajr: 18, isha: 17 },
  ISNA: { label: "ISNA (North America)", fajr: 15, isha: 15 },
  Egypt: { label: "Egyptian General Authority", fajr: 19.5, isha: 17.5 },
  Karachi: { label: "Univ. of Islamic Sciences, Karachi", fajr: 18, isha: 18 },
  UmmAlQura: { label: "Umm al-Qura (Makkah)", fajr: 18.5, isha: { minutesAfterMaghrib: 90 } },
};

export const PRAYER_NAMES = ["fajr", "dhuhr", "asr", "maghrib", "isha"] as const;
export type PrayerName = (typeof PRAYER_NAMES)[number];

export interface PrayerTimes {
  fajr: number; // minutes of local day
  sunrise: number;
  dhuhr: number;
  asr: number;
  maghrib: number;
  isha: number;
}

const DEG = Math.PI / 180;
const dsin = (d: number) => Math.sin(d * DEG);
const dcos = (d: number) => Math.cos(d * DEG);
const dtan = (d: number) => Math.tan(d * DEG);
const darcsin = (x: number) => Math.asin(x) / DEG;
const darccos = (x: number) => Math.acos(x) / DEG;
const darctan2 = (y: number, x: number) => Math.atan2(y, x) / DEG;
const darccot = (x: number) => Math.atan(1 / x) / DEG;
const fixAngle = (a: number) => ((a % 360) + 360) % 360;
const fixHour = (h: number) => ((h % 24) + 24) % 24;

function julianDate(year: number, month: number, day: number) {
  if (month <= 2) {
    year -= 1;
    month += 12;
  }
  const A = Math.floor(year / 100);
  const B = 2 - A + Math.floor(A / 4);
  return (
    Math.floor(365.25 * (year + 4716)) +
    Math.floor(30.6001 * (month + 1)) +
    day +
    B -
    1524.5
  );
}

// Sun declination and equation of time for a given julian date
function sunPosition(jd: number) {
  const d = jd - 2451545.0;
  const g = fixAngle(357.529 + 0.98560028 * d);
  const q = fixAngle(280.459 + 0.98564736 * d);
  const L = fixAngle(q + 1.915 * dsin(g) + 0.02 * dsin(2 * g));
  const e = 23.439 - 0.00000036 * d;
  const RA = fixHour(darctan2(dcos(e) * dsin(L), dcos(L)) / 15);
  const declination = darcsin(dsin(e) * dsin(L));
  const equation = q / 15 - RA;
  return { declination, equation };
}

// Hour-angle offset from solar noon for the sun at `angle` below the horizon
function hourAngle(angle: number, lat: number, declination: number) {
  const cosH =
    (-dsin(angle) - dsin(declination) * dsin(lat)) /
    (dcos(declination) * dcos(lat));
  if (cosH > 1 || cosH < -1) return NaN; // sun never reaches this angle (high latitudes)
  return darccos(cosH) / 15;
}

export function computePrayerTimes(
  date: Date,
  latitude: number,
  longitude: number,
  method: CalcMethodId = "MWL",
  asrMethod: AsrMethod = "standard"
): PrayerTimes {
  const tzHours = -date.getTimezoneOffset() / 60;
  const jd = julianDate(date.getFullYear(), date.getMonth() + 1, date.getDate());

  // Two-pass: evaluate sun position near local solar noon for accuracy
  let { declination, equation } = sunPosition(jd + 0.5 - longitude / (15 * 24));
  let noonUTC = fixHour(12 - equation) - longitude / 15;
  ({ declination, equation } = sunPosition(jd + noonUTC / 24));
  noonUTC = fixHour(12 - equation) - longitude / 15;

  const m = CALC_METHODS[method];
  const sunriseHA = hourAngle(0.833, latitude, declination);
  const fajrHA = hourAngle(m.fajr, latitude, declination);

  // Asr: shadow factor 1 (standard) or 2 (hanafi)
  const factor = asrMethod === "hanafi" ? 2 : 1;
  const asrAngle = -darccot(factor + dtan(Math.abs(latitude - declination)));
  const asrHA = hourAngle(asrAngle, latitude, declination);

  const toLocal = (utcHours: number) => fixHour(utcHours + tzHours) * 60;

  const dhuhr = toLocal(noonUTC) + 2; // +2 min zawal buffer
  const sunrise = toLocal(noonUTC - (isNaN(sunriseHA) ? 6 : sunriseHA));
  const maghrib = toLocal(noonUTC + (isNaN(sunriseHA) ? 6 : sunriseHA)) + 1;
  const fajr = toLocal(noonUTC - (isNaN(fajrHA) ? 7.5 : fajrHA));
  const asr = toLocal(noonUTC + (isNaN(asrHA) ? 3.5 : asrHA));

  let isha: number;
  if (typeof m.isha === "object") {
    isha = maghrib + m.isha.minutesAfterMaghrib;
  } else {
    const ishaHA = hourAngle(m.isha, latitude, declination);
    isha = toLocal(noonUTC + (isNaN(ishaHA) ? 7.5 : ishaHA));
  }

  const r = (x: number) => Math.round(x) % (24 * 60);
  return {
    fajr: r(fajr),
    sunrise: r(sunrise),
    dhuhr: r(dhuhr),
    asr: r(asr),
    maghrib: r(maghrib),
    isha: r(isha),
  };
}

export function nextPrayer(
  times: PrayerTimes,
  now: Date = new Date()
): { name: PrayerName | "fajr_tomorrow"; minutesUntil: number; at: number } {
  const nowMin = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;
  for (const name of PRAYER_NAMES) {
    if (times[name] > nowMin) {
      return { name, minutesUntil: times[name] - nowMin, at: times[name] };
    }
  }
  // after isha → fajr tomorrow (approximate with today's fajr time)
  return {
    name: "fajr_tomorrow",
    minutesUntil: 24 * 60 - nowMin + times.fajr,
    at: times.fajr,
  };
}
