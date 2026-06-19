import { prisma } from '../index';

interface TrendResult {
  cropName: string;
  state: string | null;
  district: string | null;
  trendDirection: 'up' | 'down' | 'stable';
  avgPrice: number;
  minPrice: number;
  maxPrice: number;
  priceChange: number;
  percentChange: number;
  periodDays: number;
  sampleSize: number;
  periodStart: Date;
  periodEnd: Date;
}

interface ForecastPoint {
  date: string;
  predicted: number;
  confidenceLow: number;
  confidenceHigh: number;
}

interface SeasonalInsight {
  month: number;
  monthName: string;
  avgPrice: number;
  minPrice: number;
  maxPrice: number;
  volatility: number;
  seasonType: string;
  recommendation: string | null;
}

export class PriceIntelligence {
  async computeTrend(cropName: string, state?: string, district?: string, days = 30): Promise<TrendResult> {
    const where: any = { cropName };
    if (state) where.state = state;
    if (district) where.district = district;

    const periodStart = new Date();
    periodStart.setDate(periodStart.getDate() - days);

    const prices = await prisma.cropPriceHistory.findMany({
      where: { ...where, priceDate: { gte: periodStart } },
      orderBy: { priceDate: 'asc' },
    });

    if (prices.length < 2) {
      if (prices.length === 1) {
        const singlePrice = prices[0].modalPrice;
        return {
          cropName, state: state || null, district: district || null,
          trendDirection: 'stable', avgPrice: singlePrice, minPrice: singlePrice, maxPrice: singlePrice,
          priceChange: 0, percentChange: 0, periodDays: days, sampleSize: 1,
          periodStart, periodEnd: new Date(),
        };
      }
      return {
        cropName, state: state || null, district: district || null,
        trendDirection: 'stable', avgPrice: 0, minPrice: 0, maxPrice: 0,
        priceChange: 0, percentChange: 0, periodDays: days, sampleSize: 0,
        periodStart, periodEnd: new Date(),
      };
    }

    const prices_only = prices.map(p => p.modalPrice);
    const avg = prices_only.reduce((a, b) => a + b, 0) / prices_only.length;
    const min = Math.min(...prices_only);
    const max = Math.max(...prices_only);
    const firstPrice = prices_only[0];
    const lastPrice = prices_only[prices_only.length - 1];
    const change = lastPrice - firstPrice;
    const pctChange = firstPrice > 0 ? (change / firstPrice) * 100 : 0;

    let direction: 'up' | 'down' | 'stable' = 'stable';
    if (pctChange > 3) direction = 'up';
    else if (pctChange < -3) direction = 'down';

    const trend = await prisma.marketTrend.create({
      data: {
        cropName, state: state || null, district: district || null,
        trendDirection: direction, avgPrice: avg, minPrice: min, maxPrice: max,
        priceChange: change, percentChange: pctChange, periodDays: days,
        sampleSize: prices.length, periodStart, periodEnd: new Date(),
      },
    });

    return {
      cropName, state: state || null, district: district || null,
      trendDirection: direction, avgPrice: avg, minPrice: min, maxPrice: max,
      priceChange: change, percentChange: pctChange, periodDays: days,
      sampleSize: prices.length, periodStart, periodEnd: trend.periodEnd,
    };
  }

  async computeSeasonality(cropName: string, state?: string, district?: string): Promise<SeasonalInsight[]> {
    const where: any = { cropName };
    if (state) where.state = state;
    if (district) where.district = district;

    const prices = await prisma.cropPriceHistory.findMany({ where });

    const byMonth = new Map<number, number[]>();
    for (const p of prices) {
      const month = p.priceDate.getMonth() + 1;
      if (!byMonth.has(month)) byMonth.set(month, []);
      byMonth.get(month)!.push(p.modalPrice);
    }

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const insights: SeasonalInsight[] = [];

    const overallAvg = prices.length > 0
      ? prices.reduce((s, p) => s + p.modalPrice, 0) / prices.length
      : 0;

    for (let m = 1; m <= 12; m++) {
      const monthPrices = byMonth.get(m) || [];
      if (monthPrices.length === 0) {
        insights.push({
          month: m, monthName: monthNames[m - 1],
          avgPrice: 0, minPrice: 0, maxPrice: 0, volatility: 0,
          seasonType: 'unknown', recommendation: null,
        });
        continue;
      }

      const avg = monthPrices.reduce((a, b) => a + b, 0) / monthPrices.length;
      const min = Math.min(...monthPrices);
      const max = Math.max(...monthPrices);
      const variance = monthPrices.reduce((sum, p) => sum + Math.pow(p - avg, 2), 0) / monthPrices.length;
      const volatility = Math.sqrt(variance);

      let seasonType = 'normal';
      let recommendation: string | null = null;
      if (avg > overallAvg * 1.15) {
        seasonType = 'peak';
        recommendation = 'High price season - ideal for selling';
      } else if (avg < overallAvg * 0.85) {
        seasonType = 'low';
        recommendation = 'Low price season - consider storage or alternative crops';
      } else {
        recommendation = 'Stable pricing - normal market conditions';
      }

      const pattern = await prisma.seasonalPattern.upsert({
        where: { cropName_state_district_month: { cropName, state: state || '', district: district || '', month: m } },
        update: { avgPrice: avg, minPrice: min, maxPrice: max, priceVolatility: volatility, sampleYears: { increment: 1 }, seasonType, recommendation },
        create: { cropName, state: state || null, district: district || null, month: m, avgPrice: avg, minPrice: min, maxPrice: max, priceVolatility: volatility, sampleYears: 1, seasonType, recommendation },
      });

      insights.push({
        month: m, monthName: monthNames[m - 1],
        avgPrice: pattern.avgPrice, minPrice: pattern.minPrice, maxPrice: pattern.maxPrice,
        volatility: pattern.priceVolatility, seasonType: pattern.seasonType, recommendation: pattern.recommendation,
      });
    }

    return insights;
  }

  async forecastPrice(cropName: string, state?: string, district?: string, daysAhead = 30): Promise<{ forecast: ForecastPoint[]; confidence: number }> {
    const where: any = { cropName };
    if (state) where.state = state;
    if (district) where.district = district;

    const historicalPrices = await prisma.cropPriceHistory.findMany({
      where,
      orderBy: { priceDate: 'asc' },
      take: 90,
    });

    if (historicalPrices.length < 7) {
      return { forecast: [], confidence: 0 };
    }

    const values = historicalPrices.map(p => p.modalPrice);
    const n = values.length;
    const avg = values.reduce((a, b) => a + b, 0) / n;

    const sumX = (n * (n - 1)) / 2;
    const sumY = values.reduce((a, b) => a + b, 0);
    let sumXY = 0;
    let sumX2 = 0;
    for (let i = 0; i < n; i++) {
      sumXY += i * values[i];
      sumX2 += i * i;
    }
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    const residuals = values.map((v, i) => Math.abs(v - (slope * i + intercept)));
    const mae = residuals.reduce((a, b) => a + b, 0) / n;
    const confidence = Math.max(0, Math.min(1, 1 - mae / (avg || 1)));

    const lastDate = historicalPrices[historicalPrices.length - 1].priceDate;
    const forecast: ForecastPoint[] = [];
    for (let d = 1; d <= daysAhead; d++) {
      const futureX = n + d - 1;
      const predicted = Math.max(0, slope * futureX + intercept);
      const date = new Date(lastDate);
      date.setDate(date.getDate() + d);

      forecast.push({
        date: date.toISOString().split('T')[0],
        predicted: Math.round(predicted * 100) / 100,
        confidenceLow: Math.round((predicted - mae * 1.5) * 100) / 100,
        confidenceHigh: Math.round((predicted + mae * 1.5) * 100) / 100,
      });
    }

    await prisma.priceForecast.create({
      data: {
        cropName, state: state || null, district: district || null,
        forecastDate: new Date(lastDate.getTime() + daysAhead * 86400000),
        predictedPrice: forecast[forecast.length - 1]?.predicted || 0,
        confidenceLow: forecast[forecast.length - 1]?.confidenceLow || 0,
        confidenceHigh: forecast[forecast.length - 1]?.confidenceHigh || 0,
        confidenceScore: confidence,
        modelUsed: 'linear_regression',
      },
    });

    return { forecast, confidence };
  }

  async getBestCrops(state?: string, district?: string, limit = 5): Promise<any[]> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const where: any = { priceDate: { gte: thirtyDaysAgo } };
    if (state) where.state = state;
    if (district) where.district = district;

    const prices = await prisma.cropPriceHistory.findMany({ where });

    const byCrop = new Map<string, { prices: number[]; states: Set<string>; count: number }>();
    for (const p of prices) {
      if (!byCrop.has(p.cropName)) byCrop.set(p.cropName, { prices: [], states: new Set(), count: 0 });
      const crop = byCrop.get(p.cropName)!;
      crop.prices.push(p.modalPrice);
      crop.states.add(p.state);
      crop.count++;
    }

    const scored = Array.from(byCrop.entries()).map(([cropName, data]) => {
      const avg = data.prices.reduce((a, b) => a + b, 0) / data.prices.length;
      const min = Math.min(...data.prices);
      const max = Math.max(...data.prices);
      const firstPrice = data.prices[0] || 0;
      const lastPrice = data.prices[data.prices.length - 1] || 0;
      const priceChange = firstPrice > 0 ? ((lastPrice - firstPrice) / firstPrice) * 100 : 0;
      const spread = avg > 0 ? (max - min) / avg : 0;

      const score = (priceChange > 0 ? priceChange * 0.5 : priceChange * 0.3) + (1 - spread) * 20 + data.count * 2;
      return { cropName, avgPrice: avg, minPrice: min, maxPrice: max, priceChange, spread, score, sampleCount: data.count, states: Array.from(data.states) };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, limit);
  }

  async computeHeatmap(state?: string, cropName?: string): Promise<any[]> {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const where: any = { priceDate: { gte: sevenDaysAgo } };
    if (state) where.state = state;
    if (cropName) where.cropName = cropName;

    const prices = await prisma.cropPriceHistory.findMany({ where, orderBy: { priceDate: 'desc' } });

    const regionMap = new Map<string, Map<string, number[]>>();
    for (const p of prices) {
      if (!regionMap.has(p.state)) regionMap.set(p.state, new Map());
      const districts = regionMap.get(p.state)!;
      if (!districts.has(p.district)) districts.set(p.district, []);
      districts.get(p.district)!.push(p.modalPrice);
    }

    const heatmap = Array.from(regionMap.entries()).map(([stateName, districts]) => {
      const districtData = Array.from(districts.entries()).map(([districtName, dPrices]) => ({
        district: districtName,
        avgPrice: Math.round((dPrices.reduce((a, b) => a + b, 0) / dPrices.length) * 100) / 100,
        latestPrice: dPrices[dPrices.length - 1],
        sampleCount: dPrices.length,
      }));

      const allPrices = Array.from(districts.values()).flat();
      return {
        state: stateName,
        avgPrice: Math.round((allPrices.reduce((a, b) => a + b, 0) / allPrices.length) * 100) / 100,
        districts: districtData,
        totalSamples: allPrices.length,
      };
    });

    return heatmap;
  }

  async getMarketOverview(): Promise<any> {
    const today = new Date();
    const lastWeek = new Date(today.getTime() - 7 * 86400000);
    const lastMonth = new Date(today.getTime() - 30 * 86400000);

    const [totalPrices, weeklyPrices, monthlyPrices, cropCount, stateCount] = await Promise.all([
      prisma.cropPriceHistory.count(),
      prisma.cropPriceHistory.count({ where: { priceDate: { gte: lastWeek } } }),
      prisma.cropPriceHistory.count({ where: { priceDate: { gte: lastMonth } } }),
      prisma.cropPriceHistory.findMany({ distinct: ['cropName'], select: { cropName: true } }),
      prisma.cropPriceHistory.findMany({ distinct: ['state'], select: { state: true } }),
    ]);

    return {
      totalRecords: totalPrices,
      weeklyRecords: weeklyPrices,
      monthlyRecords: monthlyPrices,
      uniqueCrops: cropCount.length,
      uniqueStates: stateCount.length,
      lastUpdated: today,
    };
  }
}

export const priceIntelligence = new PriceIntelligence();
