import { NextResponse } from "next/server";
import OpenAI from "openai";

const apiKey = process.env.OPENAI_API_KEY;
const openai = new OpenAI({ apiKey: apiKey });

export async function POST(request: Request) {
    try {
        if (!apiKey) return NextResponse.json({ error: "API Key Missing" }, { status: 500 });

        const { message } = await request.json();
        console.log("🟡 사용자 입력:", message); // 터미널에서 확인용

        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "system",
                    content: `
            Analyze Korean input. Return JSON with APPROXIMATE coordinates.
            
            Output JSON format:
            { 
              "location": "Location Name (e.g. Gangnam Stn)", 
              "lat": 37.4979, 
              "lng": 127.0276, 
              "availability": "Time summary", 
              "comment": "Short Korean reply" 
            }
            
            * If vague (e.g. "Home"), set lat/lng to null.
          `,
                },
                { role: "user", content: message },
            ],
            response_format: { type: "json_object" },
        });

        const result = JSON.parse(completion.choices[0].message.content || "{}");
        console.log("🟢 AI 응답(좌표포함):", result); // 여기에 lat, lng가 찍혀야 성공!
        return NextResponse.json(result);

    } catch (error: any) {
        console.error("🔴 에러:", error);
        return NextResponse.json({ error: "분석 실패" }, { status: 500 });
    }
}       