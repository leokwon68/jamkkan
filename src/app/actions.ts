'use server'

import { supabase } from "@/lib/supabase"
import { redirect } from "next/navigation"

export async function createEvent(formData: FormData) {
    const title = formData.get("title") as string
    const startDate = formData.get("startDate") as string
    const endDate = formData.get("endDate") as string

    if (!title || !startDate || !endDate) {
        throw new Error("Missing required fields")
    }

    const { data, error } = await supabase
        .from("events")
        .insert([
            {
                title,
                date_range: { startDate, endDate },
            },
        ])
        .select("id")
        .single()

    if (error) {
        console.error("Error creating event:", error)
        throw new Error("Failed to create event")
    }

    redirect(`/${data.id}`)
}
