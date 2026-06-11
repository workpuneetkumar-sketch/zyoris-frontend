export type LeadTemperature = 'cold' | 'warm' | 'hot' | 'dead';

export interface LeadTemperatureInfo {
  label: string;
  emoji: string;
  style: string;
  progressColor: string;
  conversionReadiness: string;
}

const TEMPERATURE_CONFIG: Record<LeadTemperature, LeadTemperatureInfo> = {
  cold: {
    label: 'Cold Lead',
    emoji: '❄️',
    style: 'bg-blue-50 text-blue-700 border border-blue-200',
    progressColor: 'bg-blue-400',
    conversionReadiness: 'Requires nurturing'
  },
  warm: {
    label: 'Warm Lead',
    emoji: '🌤',
    style: 'bg-amber-50 text-amber-700 border border-amber-200',
    progressColor: 'bg-amber-400',
    conversionReadiness: 'Needs follow-up'
  },
  hot: {
    label: 'Hot Lead',
    emoji: '🔥',
    style: 'bg-red-50 text-red-700 border border-red-200',
    progressColor: 'bg-red-500',
    conversionReadiness: 'High conversion probability'
  },
  dead: {
    label: 'Dead Lead',
    emoji: '🧊',
    style: 'bg-gray-50 text-gray-600 border border-gray-200',
    progressColor: 'bg-gray-300',
    conversionReadiness: 'Low engagement'
  }
};

export function getLeadTemperature(score?: number | null, isInactive?: boolean): LeadTemperatureInfo {
  if (isInactive || (score ?? 0) === 0) {
    return TEMPERATURE_CONFIG.dead;
  }
  
  const safeScore = score ?? 0;
  
  if (safeScore >= 80) {
    return TEMPERATURE_CONFIG.hot;
  } else if (safeScore >= 40) {
    return TEMPERATURE_CONFIG.warm;
  } else {
    return TEMPERATURE_CONFIG.cold;
  }
}
