export function addBusinessDays(startDate, days) {
  const result = new Date(startDate);
  let added = 0;
  while (added < days) {
    result.setDate(result.getDate() + 1);
    const dow = result.getDay();
    if (dow !== 0 && dow !== 6) added++;
  }
  return result;
}

export function businessDaysRemaining(startDate, deadlineDays) {
  const now = new Date();
  const deadline = addBusinessDays(new Date(startDate), deadlineDays);
  const diffMs = deadline.getTime() - now.getTime();
  return {
    deadline,
    diffHours: diffMs / (1000 * 60 * 60),
    diffDays: Math.floor(diffMs / (1000 * 60 * 60 * 24)),
    overdue: diffMs < 0,
  };
}

export function formatCountdown(diffHours) {
  if (diffHours < 0) return 'VENCIDO';
  const totalMins = Math.floor(diffHours * 60);
  const days = Math.floor(totalMins / (60 * 24));
  const hours = Math.floor((totalMins % (60 * 24)) / 60);
  const mins = totalMins % 60;
  if (days > 0) return `${days}d ${hours}h ${mins}m`;
  return `${hours}h ${mins}m`;
}

export function getANPDStatus(diffHours, totalHours) {
  if (diffHours < 0) return 'overdue';
  const pct = diffHours / totalHours;
  if (pct < 0.25) return 'critical';
  if (pct < 0.5) return 'warning';
  return 'ok';
}
