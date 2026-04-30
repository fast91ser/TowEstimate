import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Gauge, Navigation, Moon, DollarSign, CalendarClock } from 'lucide-react';

const NIGHT_SCHEDULE = [
  { month: 'January', start: '18:00', end: '07:00' },
  { month: 'February', start: '18:15', end: '07:00' },
  { month: 'March', start: '19:30', end: '07:30' },
  { month: 'April', start: '19:45', end: '07:00' },
  { month: 'May', start: '20:00', end: '06:30' },
  { month: 'June', start: '20:15', end: '06:30' },
  { month: 'July', start: '20:15', end: '06:15' },
  { month: 'August', start: '20:00', end: '06:45' },
  { month: 'September', start: '19:30', end: '07:00' },
  { month: 'October', start: '18:45', end: '07:15' },
  { month: 'November', start: '17:30', end: '06:45' },
  { month: 'December', start: '17:30', end: '07:00' },
];

const RATES = {
  member: { day: 276, night: 324 },
  nonMember: { day: 410, night: 435 },
};

const SCA = {
  member: 50,
  nonMember: 84,
};

const FUEL = {
  member: 10, // $/hr
  nonMemberPct: 0.10, // 10%
};

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTE_OPTIONS = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));


function calcMinutes(distanceNm, speedKnots) {
  if (!distanceNm || !speedKnots) return 0;
  return Math.round((Number(distanceNm) / Number(speedKnots)) * 60);
}

function detailedMinsToReadable(totalMins) {
  const mins = Math.max(0, Math.round(totalMins || 0));
  const hours = Math.floor(mins / 60);
  const rem = mins % 60;
  if (hours === 0) return `${rem}m`;
  return `${hours}h ${String(rem).padStart(2, '0')}m`;
}

function nmToReadable(distanceNm) {
  return `${Number(distanceNm || 0).toFixed(1)} NM`;
}

function money(value) {
  return Number(value || 0).toLocaleString(undefined, {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function parseTimeToMinutes(time24) {
  if (!time24) return 0;
  const [h, m] = time24.split(':').map(Number);
  return (h * 60) + m;
}

function getTimeHour(time24) {
  return (time24 || '00:00').split(':')[0] || '00';
}

function getTimeMinute(time24) {
  return (time24 || '00:00').split(':')[1] || '00';
}

function addMinutes(dateObj, minutes) {
  return new Date(dateObj.getTime() + minutes * 60000);
}

function formatClock(dateObj) {
  if (!dateObj) return '—';
  return dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
}

function formatClock12(dateObj) {
  if (!dateObj) return '—';
  return dateObj.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
}

function formatClockBoth(dateObj) {
  if (!dateObj) return '—';
  return `${formatClock(dateObj)} / ${formatClock12(dateObj)}`;
}

function isNightMinute(dateObj) {
  const schedule = NIGHT_SCHEDULE[dateObj.getMonth()];
  const minuteOfDay = dateObj.getHours() * 60 + dateObj.getMinutes();
  const nightStart = parseTimeToMinutes(schedule.start);
  const nightEnd = parseTimeToMinutes(schedule.end);

  if (nightStart <= nightEnd) {
    return minuteOfDay >= nightStart && minuteOfDay < nightEnd;
  }

  return minuteOfDay >= nightStart || minuteOfDay < nightEnd;
}

function splitDayNightMinutes(startDate, totalMinutes) {
  let dayMinutes = 0;
  let nightMinutes = 0;

  for (let i = 0; i < totalMinutes; i += 1) {
    const minutePoint = addMinutes(startDate, i);
    if (isNightMinute(minutePoint)) {
      nightMinutes += 1;
    } else {
      dayMinutes += 1;
    }
  }

  return { dayMinutes, nightMinutes };
}

export default function BoatTowingPortal() {
  const [dispatchDate, setDispatchDate] = useState('');
  const [startTime, setStartTime] = useState('08:00');
  const [sca, setSca] = useState(false);
  const [fuel, setFuel] = useState(false);

  const [dist1, setDist1] = useState(0);
  const [dist2, setDist2] = useState(0);
  const [dist3, setDist3] = useState(0);

  const [speed1, setSpeed1] = useState(5.5);
  const [speed2, setSpeed2] = useState(5.0);
  const [speed3, setSpeed3] = useState(5.5);

  const [tieUpMinutes, setTieUpMinutes] = useState(25);

  const leg1Minutes = calcMinutes(dist1, speed1);
  const leg2Minutes = calcMinutes(dist2, speed2);
  const leg3Minutes = calcMinutes(dist3, speed3);

  const totals = useMemo(() => {
    const driveMinutes = leg1Minutes + leg2Minutes + leg3Minutes;
    const totalMinutes = driveMinutes + Number(tieUpMinutes || 0);
    const totalNm = Number(dist1) + Number(dist2) + Number(dist3);

    let startDateTime = null;
    let leg1End = null;
    let leg2End = null;
    let bufferEnd = null;
    let tripEnd = null;
    let dayMinutes = totalMinutes;
    let nightMinutes = 0;

    if (dispatchDate) {
      startDateTime = new Date(`${dispatchDate}T00:00:00`);
      startDateTime = addMinutes(startDateTime, parseTimeToMinutes(startTime));
      leg1End = addMinutes(startDateTime, leg1Minutes);
      leg2End = addMinutes(leg1End, leg2Minutes);
      bufferEnd = addMinutes(leg2End, Number(tieUpMinutes || 0));
      tripEnd = addMinutes(bufferEnd, leg3Minutes);

      const split = splitDayNightMinutes(startDateTime, totalMinutes);
      dayMinutes = split.dayMinutes;
      nightMinutes = split.nightMinutes;
    }

    const baseMemberTotal = (dayMinutes / 60) * RATES.member.day + (nightMinutes / 60) * RATES.member.night;
    const baseNonMemberTotal = (dayMinutes / 60) * RATES.nonMember.day + (nightMinutes / 60) * RATES.nonMember.night;

    const scaMemberAdd = sca ? (totalMinutes / 60) * SCA.member : 0;
    const scaNonMemberAdd = sca ? (totalMinutes / 60) * SCA.nonMember : 0;

    const memberSubtotal = baseMemberTotal + scaMemberAdd;
    const nonMemberSubtotal = baseNonMemberTotal + scaNonMemberAdd;

    const fuelMemberAdd = fuel ? (totalMinutes / 60) * FUEL.member : 0;
    const fuelNonMemberAdd = fuel ? nonMemberSubtotal * FUEL.nonMemberPct : 0;

    const memberTotal = memberSubtotal + fuelMemberAdd;
    const nonMemberTotal = nonMemberSubtotal + fuelNonMemberAdd;

    return {
      driveMinutes,
      totalMinutes,
      totalNm,
      startDateTime,
      leg1End,
      leg2End,
      bufferEnd,
      tripEnd,
      dayMinutes,
      nightMinutes,
      baseMemberTotal,
      baseNonMemberTotal,
      scaMemberAdd,
      scaNonMemberAdd,
      fuelMemberAdd,
      fuelNonMemberAdd,
      memberTotal,
      nonMemberTotal,
      savings: Math.max(nonMemberTotal - memberTotal, 0),
    };
  }, [dispatchDate, startTime, dist1, dist2, dist3, speed1, speed2, speed3, tieUpMinutes, leg1Minutes, leg2Minutes, leg3Minutes, sca, fuel]);

  const selectedSchedule = dispatchDate
    ? NIGHT_SCHEDULE[new Date(`${dispatchDate}T00:00:00`).getMonth()]
    : null;

  const routeLegs = [
    { label: 'Underway', distance: dist1, speed: speed1, duration: leg1Minutes, start: totals.startDateTime, end: totals.leg1End },
    { label: 'In Tow', distance: dist2, speed: speed2, duration: leg2Minutes, start: totals.leg1End, end: totals.leg2End },
    { label: 'RTB', distance: dist3, speed: speed3, duration: leg3Minutes, start: totals.bufferEnd, end: totals.tripEnd },
    { label: 'Tie-up / Drop-off Buffer', distance: 0, speed: 0, duration: Number(tieUpMinutes || 0), start: totals.leg2End, end: totals.bufferEnd, buffer: true },
  ];

  return (
    <div className="min-h-screen bg-slate-950 p-6 md:p-10 text-slate-100">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="rounded-3xl border border-cyan-900/50 bg-gradient-to-br from-slate-900 via-slate-950 to-cyan-950 p-6 shadow-2xl">
          <h1 className="text-3xl font-bold">Towing Estimate Calculator</h1>
          <p className="mt-2 text-sm text-slate-300">
            Enter distances, per-leg speeds, date, and start time to calculate daytime and nighttime towing charges.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-6">
            <Card className="rounded-3xl border-slate-700 bg-slate-900/95 text-slate-100">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-slate-100">
                  <CalendarClock className="h-5 w-5 text-cyan-400" /> Trip Info

                  <label className="ml-2 flex items-center gap-2 rounded-full border border-cyan-800/60 bg-cyan-950/30 px-3 py-1 text-sm font-medium text-cyan-200">
                    <input type="checkbox" checked={sca} onChange={(e) => setSca(e.target.checked)} className="accent-cyan-400" />
                    SCA
                  </label>

                  <label className="flex items-center gap-2 rounded-full border border-cyan-800/60 bg-cyan-950/30 px-3 py-1 text-sm font-medium text-cyan-200">
                    <input type="checkbox" checked={fuel} onChange={(e) => setFuel(e.target.checked)} className="accent-cyan-400" />
                    Fuel Surcharge
                  </label>
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label className="mb-2 block text-slate-200">Date</Label>
                    <Input className="border-slate-600 bg-slate-800 text-slate-100" type="date" value={dispatchDate} onChange={(e) => setDispatchDate(e.target.value)} />
                  </div>
                  <div>
                    <Label className="mb-2 block text-slate-200">Start Time</Label>
                    <div className="grid grid-cols-2 gap-3">
                      <select
                        className="h-10 w-full rounded-md border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
                        value={getTimeHour(startTime)}
                        onChange={(e) => setStartTime(`${e.target.value}:${getTimeMinute(startTime)}`)}
                      >
                        {HOUR_OPTIONS.map((hour) => (
                          <option key={hour} value={hour}>{hour}</option>
                        ))}
                      </select>

                      <select
                        className="h-10 w-full rounded-md border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
                        value={getTimeMinute(startTime)}
                        onChange={(e) => setStartTime(`${getTimeHour(startTime)}:${e.target.value}`)}
                      >
                        {MINUTE_OPTIONS.map((minute) => (
                          <option key={minute} value={minute}>{minute}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <Label className="mb-2 block text-slate-200">Underway (NM)</Label>
                    <Input className="border-slate-600 bg-slate-800 text-slate-100" type="number" value={dist1} onChange={(e) => setDist1(Number(e.target.value) || 0)} />
                  </div>
                  <div>
                    <Label className="mb-2 block text-slate-200">In Tow (NM)</Label>
                    <Input className="border-slate-600 bg-slate-800 text-slate-100" type="number" value={dist2} onChange={(e) => setDist2(Number(e.target.value) || 0)} />
                  </div>
                  <div>
                    <Label className="mb-2 block text-slate-200">RTB (NM)</Label>
                    <Input className="border-slate-600 bg-slate-800 text-slate-100" type="number" value={dist3} onChange={(e) => setDist3(Number(e.target.value) || 0)} />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <Label className="mb-2 block text-slate-200">Underway Speed (kt)</Label>
                    <Input className="border-slate-600 bg-slate-800 text-slate-100" type="number" value={speed1} onChange={(e) => setSpeed1(Number(e.target.value) || 0)} />
                  </div>
                  <div>
                    <Label className="mb-2 block text-slate-200">Speed In Tow (kt)</Label>
                    <Input className="border-slate-600 bg-slate-800 text-slate-100" type="number" value={speed2} onChange={(e) => setSpeed2(Number(e.target.value) || 0)} />
                  </div>
                  <div>
                    <Label className="mb-2 block text-slate-200">RTB Speed (kt)</Label>
                    <Input className="border-slate-600 bg-slate-800 text-slate-100" type="number" value={speed3} onChange={(e) => setSpeed3(Number(e.target.value) || 0)} />
                  </div>
                </div>

                <div>
                  <Label className="mb-2 block text-slate-200">Tie-up / Drop-off Buffer (min)</Label>
                  <Input className="border-slate-600 bg-slate-800 text-slate-100" type="number" value={tieUpMinutes} onChange={(e) => setTieUpMinutes(Number(e.target.value) || 0)} />
                </div>

                <div className="rounded-2xl border border-slate-700 bg-slate-800/70 p-4 text-sm text-slate-300">
                  {selectedSchedule ? (
                    <div className="flex items-center gap-2">
                      <Moon className="h-4 w-4 text-cyan-400" />
                      Night rate hours for {selectedSchedule.month}: <span className="font-semibold text-slate-100">{selectedSchedule.start} to {selectedSchedule.end}</span>
                    </div>
                  ) : (
                    'Select a date to apply the correct monthly night rate schedule.'
                  )}
                </div>

                {sca && (
                  <div className="rounded-2xl border border-amber-700/50 bg-amber-950/20 p-4 text-sm text-amber-200">
                    SCA active: adds <span className="font-semibold">$50/hr</span> to member pricing and <span className="font-semibold">$84/hr</span> to non-member pricing.
                  </div>
                )}

                {fuel && (
                  <div className="rounded-2xl border border-amber-700/50 bg-amber-950/20 p-4 text-sm text-amber-200">
                    Fuel surcharge active: adds <span className="font-semibold">$10/hr</span> for members and <span className="font-semibold">10%</span> of subtotal for non-members.
                  </div>
                )}

                <Button className="w-full bg-cyan-500 text-slate-950 hover:bg-cyan-400">Save Estimate</Button>
              </CardContent>
            </Card>

            <Card className="rounded-3xl border-slate-700 bg-slate-900/95 text-slate-100">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-slate-100">
                  <Moon className="h-5 w-5 text-cyan-400" /> Night Rate Hours
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-hidden rounded-2xl border border-slate-700">
                  <div className="grid grid-cols-2 bg-slate-800 text-sm font-semibold text-slate-100">
                    <div className="border-r border-slate-700 p-3">Month</div>
                    <div className="p-3">Effective Time</div>
                  </div>
                  {NIGHT_SCHEDULE.map((row) => (
                    <div key={row.month} className="grid grid-cols-2 border-t border-slate-700 text-sm text-slate-300">
                      <div className="border-r border-slate-700 p-3">{row.month}</div>
                      <div className="p-3">{row.start} to {row.end}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="rounded-3xl border-slate-700 bg-slate-900/95 text-slate-100">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-slate-100">
                  <Gauge className="h-5 w-5 text-cyan-400" /> Estimate Results
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-xl border border-slate-700 bg-slate-800 p-4">
                    <div className="text-xs text-slate-400">Total Distance</div>
                    <div className="text-2xl font-bold text-cyan-300">{nmToReadable(totals.totalNm)}</div>
                  </div>
                  <div className="rounded-xl border border-slate-700 bg-slate-800 p-4">
                    <div className="text-xs text-slate-400">Total Duration</div>
                    <div className="text-2xl font-bold text-cyan-300">{detailedMinsToReadable(totals.totalMinutes)}</div>
                  </div>
                  <div className="rounded-xl border border-slate-700 bg-slate-800 p-4">
                    <div className="text-xs text-slate-400">Daytime Time</div>
                    <div className="text-2xl font-bold text-emerald-300">{detailedMinsToReadable(totals.dayMinutes)}</div>
                  </div>
                  <div className="rounded-xl border border-slate-700 bg-slate-800 p-4">
                    <div className="text-xs text-slate-400">Nighttime Time</div>
                    <div className="text-2xl font-bold text-amber-300">{detailedMinsToReadable(totals.nightMinutes)}</div>
                  </div>
                  <div className="rounded-xl border border-slate-700 bg-slate-800 p-4 md:col-span-2">
                    <div className="text-xs text-slate-400">Tow Ends</div>
                    <div className="text-2xl font-bold text-cyan-300">{formatClockBoth(totals.tripEnd)}</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-3xl border-slate-700 bg-slate-900/95 text-slate-100">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-slate-100">
                  <Navigation className="h-5 w-5 text-cyan-400" /> Leg Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {routeLegs.map((leg) => (
                  <div key={leg.label} className="rounded-xl border border-slate-700 bg-slate-800 p-4">
                    <div className="flex items-center justify-between gap-3 text-slate-100">
                      <div className="font-semibold">{leg.label}</div>
                      <div className="text-cyan-300">{leg.buffer ? detailedMinsToReadable(leg.duration) : nmToReadable(leg.distance)}</div>
                    </div>
                    <div className="mt-2 text-sm text-slate-400">{leg.buffer ? 'Buffer / dock time' : `Speed: ${leg.speed} kt`}</div>
                    <div className="text-sm text-slate-400">Duration: {detailedMinsToReadable(leg.duration)}</div>
                    <div className="text-sm text-slate-400">Start: {formatClockBoth(leg.start)} • End: {formatClockBoth(leg.end)}</div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="rounded-3xl border-slate-700 bg-slate-900/95 text-slate-100">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-slate-100">
                  <DollarSign className="h-5 w-5 text-cyan-400" /> Pricing
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-xl border border-slate-700 bg-slate-800 p-4">
                    <div className="text-sm text-slate-400">Member Day / Night</div>
                    <div className="text-xl font-bold text-emerald-300">
                      ${RATES.member.day}{sca ? ` + ${SCA.member}` : ''} / ${RATES.member.night}{sca ? ` + ${SCA.member}` : ''}
                    </div>
                  </div>
                  <div className="rounded-xl border border-slate-700 bg-slate-800 p-4">
                    <div className="text-sm text-slate-400">Non-Member Day / Night</div>
                    <div className="text-xl font-bold text-rose-300">
                      ${RATES.nonMember.day}{sca ? ` + ${SCA.nonMember}` : ''} / ${RATES.nonMember.night}{sca ? ` + ${SCA.nonMember}` : ''}
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-700 bg-slate-800 p-4 space-y-3">
                  <div className="flex items-center justify-between text-sm text-slate-300">
                    <span>Daytime</span>
                    <span>{detailedMinsToReadable(totals.dayMinutes)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm text-slate-300">
                    <span>Nighttime</span>
                    <span>{detailedMinsToReadable(totals.nightMinutes)}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-xl border border-slate-700 bg-slate-800 p-5">
                    <div className="text-sm text-slate-400">Member Base Total</div>
                    <div className="mt-2 text-2xl font-bold text-emerald-300">{money(totals.baseMemberTotal)}</div>
                    {sca && <div className="mt-2 text-sm text-amber-300">SCA Add-On: +{money(totals.scaMemberAdd)}</div>}
                    {fuel && <div className="mt-2 text-sm text-amber-300">Fuel Add-On: +{money(totals.fuelMemberAdd)}</div>}
                    <div className="mt-3 text-3xl font-bold text-emerald-300">{money(totals.memberTotal)}</div>
                  </div>
                  <div className="rounded-xl border border-slate-700 bg-slate-800 p-5">
                    <div className="text-sm text-slate-400">Non-Member Base Total</div>
                    <div className="mt-2 text-2xl font-bold text-rose-300">{money(totals.baseNonMemberTotal)}</div>
                    {sca && <div className="mt-2 text-sm text-amber-300">SCA Add-On: +{money(totals.scaNonMemberAdd)}</div>}
                    {fuel && <div className="mt-2 text-sm text-amber-300">Fuel Add-On (10%): +{money(totals.fuelNonMemberAdd)}</div>}
                    <div className="mt-3 text-3xl font-bold text-rose-300">{money(totals.nonMemberTotal)}</div>
                  </div>
                </div>

                <div className="rounded-xl border border-cyan-800/60 bg-cyan-950/30 p-5">
                  <div className="text-sm text-slate-300">Member Savings</div>
                  <div className="mt-2 text-2xl font-bold text-cyan-300">{money(totals.savings)}</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
