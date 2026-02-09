export interface Station {
    id: string;
    name: string;
    lat: number;
    lng: number;
}

export const MOCK_STATIONS: Station[] = [
    { id: 'gangnam', name: '강남역', lat: 37.4979, lng: 127.0276 },
    { id: 'hongdae', name: '홍대입구역', lat: 37.5575, lng: 126.9245 },
    { id: 'itaewon', name: '이태원역', lat: 37.5345, lng: 126.9946 },
    { id: 'samsung', name: '삼성역', lat: 37.5088, lng: 127.0632 },
    { id: 'yeouido', name: '여의도역', lat: 37.5218, lng: 126.9242 },
    { id: 'yongsan', name: '용산역', lat: 37.5298, lng: 126.9647 },
    { id: 'sindorim', name: '신도림역', lat: 37.5087, lng: 126.8913 },
    { id: 'wangsimni', name: '왕십리역', lat: 37.5615, lng: 127.0374 },
];

// Mock Travel Times (in minutes)
// Simplified: Just returning random or fixed values based on distance for demo
// For specific prompt scenario:
// Gangnam Stn (A:20m, B:25m, C:20m) -> SD low
// Hongdae Stn (A:10m, B:50m, C:30m) -> SD high

// Let's assume 3 virtual users A, B, C for the mock scenario logic verification
// But for the actual app, we need to calculate based on inputs.

// Helper to calculate distance (Haversine simplified)
function getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number) {
    var R = 6371; // Radius of the earth in km
    var dLat = deg2rad(lat2 - lat1);  // deg2rad below
    var dLon = deg2rad(lon2 - lon1);
    var a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat1)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2)
        ;
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    var d = R * c; // Distance in km
    return d;
}

function deg2rad(deg: number) {
    return deg * (Math.PI / 180)
}

// Mock API: Get travel time (in minutes)
// We will simulate travel time as roughly 2 min per km + 5 min base.
export async function getTravelTime(fromLat: number, fromLng: number, toStationId: string): Promise<number> {
    const station = MOCK_STATIONS.find(s => s.id === toStationId);
    if (!station) return 999;

    // Hardcoded logic for the specific prompt demo scenario if needed?
    // "Mock Scenario: Between Gangnam Stn (A:20m, B:25m, C:20m) and Hongdae Stn (A:10m, B:50m, C:30m)"
    // If we want to strictly force this result, we might need to know WHO is asking.
    // But generalized logic is better for a real app feeling.

    // Generalized: Distance based
    const dist = getDistanceFromLatLonInKm(fromLat, fromLng, station.lat, station.lng);
    return Math.round((dist * 3) + 10); // 3 min/km + 10 min transfer/wait
}

export async function searchStations(query: string) {
    return MOCK_STATIONS.filter(s => s.name.includes(query));
}

export async function getAllStations() {
    return MOCK_STATIONS;
}
