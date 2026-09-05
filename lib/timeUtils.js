/**
 * Enterprise Time Utilities for EOD and Shift Governance
 * UrbanGaon 2.0 Compliance System
 */

export function checkEodAllowed(date = new Date()) {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  
  // 6:30 PM = 18:30 in 24-hour time
  const isAllowed = hours > 18 || (hours === 18 && minutes >= 30);

  const target = new Date(date);
  target.setHours(18, 30, 0, 0);

  const diffMs = target.getTime() - date.getTime();
  const remainingMinutes = Math.max(0, Math.ceil(diffMs / (1000 * 60)));
  const remainingHours = Math.floor(remainingMinutes / 60);
  const remainingMins = remainingMinutes % 60;

  const formattedRemaining = remainingHours > 0
    ? `${remainingHours}h ${remainingMins}m`
    : `${remainingMins}m`;

  const currentTimeFormatted = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });

  return {
    isAllowed,
    currentTimeFormatted,
    targetTimeFormatted: '6:30 PM',
    remainingMinutes,
    formattedRemaining,
    unlockMessage: `EOD Checkout unlocks strictly after 6:30 PM (${formattedRemaining} remaining)`
  };
}
