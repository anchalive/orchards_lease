const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export const calculateHarvestStatus = (harvestSeasons = []) => {
  if (!harvestSeasons || harvestSeasons.length === 0) {
    return {
      harvestSeasons: [],
      fruits: [],
      currentStatus: 'No Harvest Schedule',
      nextHarvest: null,
      badge: null,
      isCurrentlyHarvesting: false,
    };
  }

  const currentMonth = new Date().getMonth() + 1; // 1 to 12

  const inRange = (m, start, end) => {
    if (start <= end) {
      return m >= start && m <= end;
    } else {
      return m >= start || m <= end;
    }
  };

  const formattedSeasons = harvestSeasons.map((s) => ({
    fruitName: s.fruitName,
    startMonth: s.startMonth,
    peakStartMonth: s.peakStartMonth,
    peakEndMonth: s.peakEndMonth,
    endMonth: s.endMonth,
  }));

  const fruits = harvestSeasons.map((s) => ({
    fruitName: s.fruitName,
    startMonth: s.startMonth,
    peakStart: s.peakStartMonth,
    peakEnd: s.peakEndMonth,
    endMonth: s.endMonth,
  }));

  const activeSeasons = harvestSeasons.filter((s) =>
    inRange(currentMonth, s.startMonth, s.endMonth)
  );

  const peakSeasons = activeSeasons.filter((s) =>
    inRange(currentMonth, s.peakStartMonth, s.peakEndMonth)
  );

  const isCurrentlyHarvesting = activeSeasons.length > 0;

  let currentStatus = 'Harvest Completed';
  let badge = '✅ Harvest Completed';
  let nextHarvest = null;

  if (peakSeasons.length > 0) {
    currentStatus = 'Peak Season';
    badge = '⭐ Peak Season';
  } else if (activeSeasons.length > 0) {
    currentStatus = 'Harvesting Now';
    badge = '🍎 Harvesting Now';
  }

  let minMonthsUntil = Infinity;

  for (const s of harvestSeasons) {
    // If it's already harvesting, skip for next upcoming search
    if (inRange(currentMonth, s.startMonth, s.endMonth)) {
      continue;
    }

    let monthsUntil = 0;
    if (s.startMonth >= currentMonth) {
      monthsUntil = s.startMonth - currentMonth;
    } else {
      monthsUntil = 12 - currentMonth + s.startMonth;
    }

    if (monthsUntil < minMonthsUntil) {
      minMonthsUntil = monthsUntil;
      const startMonthName = MONTH_NAMES[s.startMonth - 1];
      nextHarvest = {
        fruitName: s.fruitName,
        startMonth: s.startMonth,
        startMonthName,
        monthsUntil,
        description: `${s.fruitName} harvest starts in ${startMonthName}`,
      };
    }
  }

  if (!isCurrentlyHarvesting && nextHarvest) {
    currentStatus = 'Upcoming Harvest';
    badge = `🌱 Starts in ${nextHarvest.startMonthName}`;
  }

  return {
    harvestSeasons: formattedSeasons,
    fruits,
    currentStatus,
    nextHarvest,
    badge,
    isCurrentlyHarvesting,
  };
};

