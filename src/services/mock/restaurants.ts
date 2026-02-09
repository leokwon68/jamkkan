export interface Restaurant {
    id: string;
    stationId: string;
    name: string;
    category: string;
    rating: number; // 0.0 to 5.0
    imageUrl?: string; // Placeholder or null
}

export const MOCK_RESTAURANTS: Restaurant[] = [
    // Gangnam
    { id: 'g1', stationId: 'gangnam', name: '땀땀', category: 'Asian Fusion', rating: 4.8 },
    { id: 'g2', stationId: 'gangnam', name: 'Alver', category: 'Cafe', rating: 4.5 },
    { id: 'g3', stationId: 'gangnam', name: '고에몬', category: 'Japanese', rating: 4.6 },
    // Hongdae
    { id: 'h1', stationId: 'hongdae', name: '연남토마', category: 'Fusion', rating: 4.7 },
    { id: 'h2', stationId: 'hongdae', name: '테일러커피', category: 'Cafe', rating: 4.9 },
    // Itaewon
    { id: 'i1', stationId: 'itaewon', name: '바토스', category: 'Mexican', rating: 4.6 },
    // Samsung
    { id: 's1', stationId: 'samsung', name: '팀호완', category: 'Dim Sum', rating: 4.7 },
];

export async function getRestaurantsByStation(stationId: string) {
    return MOCK_RESTAURANTS
        .filter(r => r.stationId === stationId)
        .sort((a, b) => b.rating - a.rating);
}
