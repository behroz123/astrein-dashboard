"use client";

import React, { useEffect, useState } from "react";
import { usePrefs } from "./prefs";

export default function SiteClock({ showDate = true, compact = false, className = "" }: { showDate?: boolean; compact?: boolean; className?: string; }){
  const { lang } = usePrefs();
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const iv = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(iv);
  }, []);

  const hours = now.getHours() % 12;
  const minutes = now.getMinutes();
  const seconds = now.getSeconds();

  const hourDeg = (hours + minutes / 60) * 30; // 360/12
  const minuteDeg = (minutes + seconds / 60) * 6; // 360/60
  const secondDeg = seconds * 6;

  let dateStr = "";
  try{
    dateStr = new Intl.DateTimeFormat(lang || undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' }).format(now);
  }catch{
    dateStr = now.toDateString();
  }

  let timeStr = "";
  try{
    timeStr = new Intl.DateTimeFormat(lang || undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(now);
  }catch{
    timeStr = now.toTimeString().slice(0,8);
  }

  return (
    <div className={`site-clock ${compact ? 'compact' : ''} ${className}`.trim()} aria-hidden={false}>
      <div className="clock-wrap">
        <svg viewBox="0 0 100 100" className="clock-analog" role="img" aria-label={timeStr}>
          <defs>
            <radialGradient id="cg" cx="50%" cy="30%">
              <stop offset="0%" stopColor="rgba(255,255,255,0.14)" />
              <stop offset="60%" stopColor="rgba(255,255,255,0.02)" />
            </radialGradient>
          </defs>
          <g transform="translate(50,50)">
            <circle r="44" className="clock-ring" />
            {/* ticks */}
            {Array.from({length:12}).map((_,i)=> (
              <line key={i} x1={0} y1={-36} x2={0} y2={-40} className="tick" transform={`rotate(${i*30})`} />
            ))}
            <g className="hands">
              <line className="hand hour" x1={0} y1={0} x2={0} y2={-22} style={{transform:`rotate(${hourDeg}deg)`}} />
              <line className="hand minute" x1={0} y1={0} x2={0} y2={-30} style={{transform:`rotate(${minuteDeg}deg)`}} />
              <line className="hand second" x1={0} y1={6} x2={0} y2={-34} style={{transform:`rotate(${secondDeg}deg)`}} />
              <circle r="2.2" className="hub" />
            </g>
          </g>
        </svg>
      </div>

      <div className="clock-digital">
        <div className="time-chip">{timeStr}</div>
        {showDate && <div className="date-chip">{dateStr}</div>}
      </div>
    </div>
  );
}
