import { useState, useEffect } from 'react';

export function calcSLAHours(incidentDateISO) {
  const now = Date.now();
  const reported = new Date(incidentDateISO).getTime();
  return (now - reported) / (1000 * 60 * 60);
}

export function getSLAStatus(hours, warnThreshold = 36, critThreshold = 48) {
  if (hours >= critThreshold) return 'critical';
  if (hours >= warnThreshold) return 'warning';
  return 'ok';
}

export function formatSLALabel(hours) {
  const h = Math.floor(hours);
  const m = Math.floor((hours - h) * 60);
  return `${h}h ${m}m`;
}

export function useSLATimer(incidentDateISO, warnThreshold = 36, critThreshold = 48) {
  const [slaData, setSlaData] = useState(() => {
    if (!incidentDateISO) return { hours: 0, status: 'ok', label: '0h 0m' };
    const hours = calcSLAHours(incidentDateISO);
    return {
      hours,
      status: getSLAStatus(hours, warnThreshold, critThreshold),
      label: formatSLALabel(hours),
    };
  });

  useEffect(() => {
    if (!incidentDateISO) return;
    const update = () => {
      const hours = calcSLAHours(incidentDateISO);
      setSlaData({
        hours,
        status: getSLAStatus(hours, warnThreshold, critThreshold),
        label: formatSLALabel(hours),
      });
    };
    update();
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, [incidentDateISO, warnThreshold, critThreshold]);

  return slaData;
}
