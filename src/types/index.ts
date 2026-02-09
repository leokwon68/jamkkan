export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export interface Event {
    id: string
    title: string
    date_range: {
        startDate: string
        endDate: string
    }
    created_at: string
}

export interface Participant {
    id: string
    event_id: string
    name: string
    location_info: {
        address: string
        lat: number
        lng: number
    } | null
}

export interface Availability {
    id: string
    participant_id: string
    start_time: string // ISO string
    end_time: string // ISO string
}
