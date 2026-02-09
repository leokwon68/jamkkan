import { Station, getAllStations, getTravelTime } from "./mock/transport";

export interface RecommendationResult {
    station: Station;
    averageTime: number;
    stdDev: number; // The lower, the fairer
    travelTimes: Record<string, number>; // participantId -> minutes
}

export interface ParticipantLocation {
    id: string; // participant ID
    lat: number;
    lng: number;
}

export async function getFairLocationRecommendations(participants: ParticipantLocation[]): Promise<RecommendationResult[]> {
    if (participants.length === 0) return [];

    // 1. Calculate Centroid (Geometric Center)
    const totalLat = participants.reduce((sum, p) => sum + p.lat, 0);
    const totalLng = participants.reduce((sum, p) => sum + p.lng, 0);
    const centroid = {
        lat: totalLat / participants.length,
        lng: totalLng / participants.length
    };

    // 2. Fetch Candidates
    // In a real app, we would search for stations NEAR the centroid.
    // For Mock, we just evaluate ALL mock stations.
    const candidates = await getAllStations();

    const results: RecommendationResult[] = [];

    // 3. Evaluate each candidate
    for (const station of candidates) {
        const times: number[] = [];
        const timesMap: Record<string, number> = {};

        for (const p of participants) {
            const time = await getTravelTime(p.lat, p.lng, station.id);
            times.push(time);
            timesMap[p.id] = time;
        }

        const avg = times.reduce((a, b) => a + b, 0) / times.length;

        // Standard Deviation
        const squareDiffs = times.map(value => Math.pow(value - avg, 2));
        const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / squareDiffs.length;
        const stdDev = Math.sqrt(avgSquareDiff);

        results.push({
            station,
            averageTime: Math.round(avg),
            stdDev,
            travelTimes: timesMap
        });
    }

    // 4. Sort by Standard Deviation (Fairness) -> Ascending
    // If StdDev is very similar, maybe prioritize Average Time?
    // Prompt says "Minimize Standard Deviation... rather than just shortest average".
    results.sort((a, b) => {
        // Primary: SD
        if (Math.abs(a.stdDev - b.stdDev) > 1) { // 1 min threshold
            return a.stdDev - b.stdDev;
        }
        // Secondary: Average Time
        return a.averageTime - b.averageTime;
    });

    return results.slice(0, 3); // Top 3
}
