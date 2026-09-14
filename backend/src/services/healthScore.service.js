import {
  SOIL_FERTILITY_SCORES,
  MAINTENANCE_STATUS_SCORES,
  WATER_SOURCE_QUALITY_SCORES,
  PEST_HISTORY_SCORES,
  DISEASE_HISTORY_SCORES,
} from '../utils/constants.js';

/**
 * Calculates a dynamic health score and breakdown for an orchard.
 * @param {Object} orchard - The orchard document/data.
 * @returns {Object} { score, rating, breakdown }
 */
export const calculateHealthScore = (orchard) => {
  if (!orchard) {
    return {
      score: 0,
      rating: 'Needs Improvement',
      breakdown: {
        soil: 0,
        irrigation: 0,
        maintenance: 0,
        production: 0,
        certification: 0,
        pestHistory: 0,
        diseaseHistory: 0,
        waterSource: 0,
        orchardAge: 0,
      },
    };
  }

  // 1. Soil Fertility (max 20)
  const soil = SOIL_FERTILITY_SCORES[orchard.soilFertility] || 0;

  // 2. Maintenance Status (max 20)
  const maintenance = MAINTENANCE_STATUS_SCORES[orchard.maintenanceStatus] || 0;

  // 3. Irrigation Availability (max 15)
  let irrigation = 0;
  const irrMethod = orchard.irrigationMethod ? String(orchard.irrigationMethod).trim() : '';
  if (irrMethod && irrMethod.toLowerCase() !== 'none') {
    const isYearRound = orchard.waterSources?.availableYearRound;
    if (isYearRound === true) {
      irrigation = 15;
    } else if (isYearRound === false) {
      irrigation = 10;
    } else {
      irrigation = 8;
    }
  }

  // 4. Water Source Quality (max 10)
  const waterSource = WATER_SOURCE_QUALITY_SCORES[orchard.waterSourceQuality] || 0;

  // 5. Pest History (max 10)
  const pestHistory = PEST_HISTORY_SCORES[orchard.pestHistory] || 0;

  // 6. Disease History (max 10)
  const diseaseHistory = DISEASE_HISTORY_SCORES[orchard.diseaseHistory] || 0;

  // 7. Organic Certification (max 5)
  const certification = orchard.organicCertification?.isCertified ? 5 : 0;

  // 8. Production Estimate (max 5)
  let production = 0;
  const yieldVal = orchard.expectedYield || 0;
  if (yieldVal > 5000) {
    production = 5;
  } else if (yieldVal > 1000) {
    production = 3;
  } else if (yieldVal > 0) {
    production = 1;
  }

  // 9. Orchard Age (max 5)
  let orchardAge = 0;
  const age = orchard.orchardAge || 0;
  if (age >= 5 && age <= 20) {
    orchardAge = 5;
  } else if ((age >= 1 && age < 5) || (age > 20 && age <= 30)) {
    orchardAge = 3;
  } else if (age > 30) {
    orchardAge = 1;
  }

  // Calculate overall score
  const score =
    soil +
    irrigation +
    maintenance +
    waterSource +
    pestHistory +
    diseaseHistory +
    certification +
    production +
    orchardAge;

  // Calculate rating
  let rating = 'Needs Improvement';
  if (score >= 90) {
    rating = 'Excellent';
  } else if (score >= 75) {
    rating = 'Good';
  } else if (score >= 60) {
    rating = 'Fair';
  }

  return {
    score,
    rating,
    breakdown: {
      soil,
      irrigation,
      maintenance,
      production,
      certification,
      pestHistory,
      diseaseHistory,
      waterSource,
      orchardAge,
    },
  };
};
