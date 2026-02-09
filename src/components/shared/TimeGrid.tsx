"use client"

import * as React from "react"
import { addDays, eachDayOfInterval, format, isSameDay, setHours, setMinutes, isBefore, addMinutes, startOfDay } from "date-fns"
import { cn } from "@/lib/utils"

interface TimeGridProps {
    startDate: Date
    endDate: Date
    selectedSlots?: string[] // Optional for heatmap mode
    onSlotChange?: (slots: string[]) => void // Optional for heatmap mode
    heatmapData?: Record<string, number> // ISO string -> count
    maxParticipants?: number
}

export function TimeGrid({ startDate, endDate, selectedSlots = [], onSlotChange, heatmapData, maxParticipants = 1 }: TimeGridProps) {
    const [isDragging, setIsDragging] = React.useState(false)
    const [dragMode, setDragMode] = React.useState<"select" | "deselect" | null>(null)
    const isInteractive = !!onSlotChange;

    // Generate days
    const days = React.useMemo(() => {
        return eachDayOfInterval({ start: startDate, end: endDate })
    }, [startDate, endDate])

    // Generate time slots (9 AM to 10 PM for MVP)
    const timeSlots = React.useMemo(() => {
        const slots = []
        let currentTime = setMinutes(setHours(startOfDay(new Date()), 9), 0) // Start 9:00
        const endTime = setMinutes(setHours(startOfDay(new Date()), 22), 0)   // End 22:00

        while (isBefore(currentTime, endTime)) {
            slots.push(format(currentTime, "HH:mm"))
            currentTime = addMinutes(currentTime, 30)
        }
        return slots
    }, [])

    const toggleSlot = (day: Date, time: string) => {
        if (!isInteractive || !onSlotChange) return

        const [hours, minutes] = time.split(":").map(Number)
        const slotDate = setMinutes(setHours(day, hours), minutes)
        const slotIso = slotDate.toISOString()

        const isSelected = selectedSlots.includes(slotIso)

        if (dragMode === "select" && !isSelected) {
            onSlotChange([...selectedSlots, slotIso])
        } else if (dragMode === "deselect" && isSelected) {
            onSlotChange(selectedSlots.filter(s => s !== slotIso))
        } else if (dragMode === null) {
            // Single click toggle
            if (isSelected) {
                onSlotChange(selectedSlots.filter(s => s !== slotIso))
            } else {
                onSlotChange([...selectedSlots, slotIso])
            }
        }
    }

    const handleMouseDown = (day: Date, time: string) => {
        if (!isInteractive) return
        const [hours, minutes] = time.split(":").map(Number)
        const slotDate = setMinutes(setHours(day, hours), minutes)
        const slotIso = slotDate.toISOString()
        const isSelected = selectedSlots.includes(slotIso)

        setIsDragging(true)
        setDragMode(isSelected ? "deselect" : "select")
        toggleSlot(day, time) // Toggle initial
    }

    const handleMouseEnter = (day: Date, time: string) => {
        if (isDragging && isInteractive) {
            toggleSlot(day, time)
        }
    }

    React.useEffect(() => {
        const handleUp = () => {
            setIsDragging(false)
            setDragMode(null)
        }
        window.addEventListener("mouseup", handleUp)
        window.addEventListener("touchend", handleUp)
        return () => {
            window.removeEventListener("mouseup", handleUp)
            window.removeEventListener("touchend", handleUp)
        }
    }, [])

    const getCellStyle = (day: Date, time: string) => {
        const [hours, minutes] = time.split(":").map(Number)
        const slotDate = setMinutes(setHours(day, hours), minutes)
        const slotIso = slotDate.toISOString()

        if (heatmapData) {
            const count = heatmapData[slotIso] || 0
            if (count === 0) return "bg-white"

            // Calculate intensity (0.2 to 1.0 opacity based on count/max)
            const intensity = maxParticipants > 0 ? (count / maxParticipants) : 0
            // Using purple (primary) with opacity
            return `bg-primary/${Math.max(20, Math.round(intensity * 100))}`
        } else {
            const isSelected = selectedSlots.includes(slotIso)
            return isSelected ? "bg-primary" : "bg-card hover:bg-neutral-100"
        }
    }

    // Mobile Touch Events (Simplified for MVP - maps touch content to element)
    // Real touch-drag on grid is complex; for MVP tapping is safer, or prevent scroll on grid.
    // For now, let's stick to click/tap logic working.

    return (
        <div className="overflow-x-auto pb-4 select-none touch-none"> {/* touch-none to prevent scrolling while dragging? Careful */}
            <div className="inline-block min-w-full">
                <div className="grid" style={{ gridTemplateColumns: `auto repeat(${days.length}, minmax(60px, 1fr))` }}>

                    {/* Header Row */}
                    <div className="sticky top-0 z-10 bg-background p-2"></div>
                    {days.map((day) => (
                        <div key={day.toISOString()} className="sticky top-0 z-10 bg-background p-2 text-center border-b font-medium">
                            <div className="text-xs text-muted-foreground">{format(day, "EEE")}</div>
                            <div className="text-lg">{format(day, "d")}</div>
                        </div>
                    ))}

                    {/* Time Rows */}
                    {timeSlots.map((time) => (
                        <React.Fragment key={time}>
                            {/* Time Label */}
                            <div className="sticky left-0 bg-background p-2 text-xs text-right text-muted-foreground translate-y-[-50%] h-8 mt-[-1rem]">
                                {time}
                            </div>

                            {/* Grid Cells */}
                            {days.map((day) => {
                                const className = getCellStyle(day, time)
                                // If heatmap mode, maybe show count on hover?

                                return (
                                    <div
                                        key={`${day.toISOString()}-${time}`}
                                        onMouseDown={() => handleMouseDown(day, time)}
                                        onMouseEnter={() => handleMouseEnter(day, time)}
                                        // Touch support needs more work to differentiate scroll vs drag.
                                        // For MVP, simplistic onClick/tap for touch users?
                                        // Or use a library like use-gesture.
                                        // Let's rely on click for now, simple tap to toggle.
                                        onClick={() => !isDragging && toggleSlot(day, time)}
                                        className={cn(
                                            "h-8 border-b border-r transition-colors",
                                            isInteractive ? "cursor-pointer" : "cursor-default",
                                            className // Dynamic class from helper
                                        )}
                                    />
                                )
                            })}
                        </React.Fragment>
                    ))}
                </div>
            </div>
        </div>
    )
}
