"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import {
    Search, Share2, Navigation, User, Trash2, Zap, Bus, ThumbsUp, Utensils,
    MessageSquare, Send, Dices, X, Crown, MapPin, ChevronUp, ChevronDown, Trophy,
    Edit3, RotateCcw, Calendar, Clock, ChevronLeft, ChevronRight, Sparkles,
    ExternalLink, Calculator, Receipt, TrainFront, CreditCard, Smile
} from "lucide-react";

// ✅ 오현 님의 키
const MY_SUPABASE_URL = "https://aywhegbqzwelzldjjgyq.supabase.co";
const MY_SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF5d2hlZ2JxendlbHpsZGpqZ3lxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyOTYwMTYsImV4cCI6MjA4NTg3MjAxNn0.gaS5v9iVl3pNTidzr1UcpPTwgcUXlLYPprCDzAC4bDo";
const KAKAO_JS_KEY = "67a8b15aa890f41473bcc02541296208";

const supabase = createClient(MY_SUPABASE_URL, MY_SUPABASE_KEY);

declare global { interface Window { kakao: any; } }

export default function RoomPage() {
    const params = useParams();
    const eventId = params.id as string;

    // Data State
    const [roomTitle, setRoomTitle] = useState("즐거운 모임 🔥");
    const [roomTheme, setRoomTheme] = useState("general");
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [participants, setParticipants] = useState<any[]>([]);
    const [candidates, setCandidates] = useState<any[]>([]);
    const [memos, setMemos] = useState<any[]>([]);
    const [availabilities, setAvailabilities] = useState<any[]>([]);
    const [user, setUser] = useState<any>(null);

    // UI State
    const [myName, setMyName] = useState("");
    const [keyword, setKeyword] = useState("");
    const [memoInput, setMemoInput] = useState("");
    const [searchResult, setSearchResult] = useState<any[]>([]);
    const [selectedPlace, setSelectedPlace] = useState<any>(null);
    const [midpointName, setMidpointName] = useState<string>("");
    const [midpointCoords, setMidpointCoords] = useState<{ lat: number, lng: number } | null>(null);
    const [isPanelExpanded, setIsPanelExpanded] = useState(true);
    const [mainTab, setMainTab] = useState<"vote" | "time" | "tools" | "talk">("vote");
    const [activeCategory, setActiveCategory] = useState("all");
    const [randomWinner, setRandomWinner] = useState<any>(null);
    const [isMapLoaded, setIsMapLoaded] = useState(false);
    const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);
    const [isSending, setIsSending] = useState(false);

    // 🆕 Tools & VIP
    const [vipUser, setVipUser] = useState<string>("");
    const [showReceipt, setShowReceipt] = useState(false);
    const [calcTotal, setCalcTotal] = useState("");
    const [rouletteResult, setRouletteResult] = useState("");
    const [isSpinning, setIsSpinning] = useState(false);

    // 📅 Time Selection State
    const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [myTimeSlots, setMyTimeSlots] = useState<string[]>([]);
    const [aiInput, setAiInput] = useState("");

    const [mapInstance, setMapInstance] = useState<any>(null);
    const markersRef = useRef<any[]>([]);
    const linesRef = useRef<any[]>([]);
    const centerMarkerRef = useRef<any>(null);
    const chatContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            setUser(session?.user || null);
        };
        checkSession();

        if (eventId) {
            const currentHistory = JSON.parse(localStorage.getItem("jjamkkan_history") || "[]");
            if (!currentHistory.includes(eventId)) {
                const newHistory = [eventId, ...currentHistory].slice(0, 5);
                localStorage.setItem("jjamkkan_history", JSON.stringify(newHistory));
            }
        }

        fetchRoomData();
        fetchParticipants();
        fetchCandidates();
        fetchMemos();
        fetchAvailabilities();

        const channel = supabase.channel(`room:${eventId}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms', filter: `event_id=eq.${eventId}` }, (payload: any) => {
                if (payload.new && payload.new.title) setRoomTitle(payload.new.title);
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'participants', filter: `event_id=eq.${eventId}` }, fetchParticipants)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'places', filter: `event_id=eq.${eventId}` }, fetchCandidates)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'availabilities', filter: `event_id=eq.${eventId}` }, fetchAvailabilities)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'memos', filter: `event_id=eq.${eventId}` }, (payload: any) => {
                const newMemo = payload.new;
                setMemos((prev) => {
                    if (prev.some(m => m.id === newMemo.id || (m.isOptimistic && m.content === newMemo.content))) {
                        return prev.map(m => m.isOptimistic && m.content === newMemo.content ? newMemo : m);
                    }
                    return [...prev, newMemo];
                });
            })
            .subscribe();

        if (window.kakao && window.kakao.maps) initMap();
        else {
            const script = document.createElement("script");
            script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_JS_KEY}&libraries=services&autoload=false`;
            script.async = true;
            script.onload = () => window.kakao.maps.load(initMap);
            document.head.appendChild(script);
        }

        return () => { supabase.removeChannel(channel); };
    }, []);

    useEffect(() => {
        const name = user ? (user.user_metadata.full_name || user.email.split("@")[0]) : myName;
        if (name && availabilities.length > 0) {
            const myData = availabilities.find(a => a.user_name === name);
            if (myData) setMyTimeSlots(myData.selected_times || []);
        }
    }, [user, myName, availabilities]);

    useEffect(() => {
        if (chatContainerRef.current) chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }, [memos, mainTab]);

    const initMap = () => {
        const container = document.getElementById('map');
        const options = { center: new window.kakao.maps.LatLng(37.5665, 126.9780), level: 7 };
        const map = new window.kakao.maps.Map(container, options);
        setMapInstance(map);
        setIsMapLoaded(true);
    };

    async function fetchRoomData() {
        const { data } = await supabase.from("rooms").select("*").eq("event_id", eventId).single();
        if (data) setRoomTitle(data.title);
        else await supabase.from("rooms").insert({ event_id: eventId, title: "즐거운 모임 🔥" });
    }
    async function updateRoomTitle() {
        await supabase.from("rooms").upsert({ event_id: eventId, title: roomTitle });
        setIsEditingTitle(false);
    }
    async function fetchParticipants() {
        const { data } = await supabase.from("participants").select("*").eq("event_id", eventId);
        setParticipants(data || []);
    }
    async function fetchCandidates() {
        const { data } = await supabase.from("places").select("*").eq("event_id", eventId).order('votes', { ascending: false });
        setCandidates(data || []);
    }
    async function fetchMemos() {
        const { data } = await supabase.from("memos").select("*").eq("event_id", eventId).order('created_at', { ascending: true });
        setMemos(data || []);
    }
    async function fetchAvailabilities() {
        const { data } = await supabase.from("availabilities").select("*").eq("event_id", eventId);
        setAvailabilities(data || []);
    }

    useEffect(() => {
        if (!mapInstance || !isMapLoaded) return;
        markersRef.current.forEach(marker => marker.setMap(null));
        markersRef.current = [];
        const bounds = new window.kakao.maps.LatLngBounds();

        participants.forEach((p) => {
            try {
                const loc = JSON.parse(p.location_info);
                const markerPosition = new window.kakao.maps.LatLng(loc.lat, loc.lng);
                const marker = new window.kakao.maps.Marker({ position: markerPosition, map: mapInstance });

                const isMe = user && (p.name === user.user_metadata.full_name || p.name === user.email.split("@")[0]);
                const markerColor = isMe ? "#2962FF" : "#222222";
                const isVip = p.name === vipUser;
                const crownHtml = isVip ? '<span style="position:absolute; top:-15px; left:50%; transform:translateX(-50%); font-size:16px;">👑</span>' : '';
                const iwContent = `<div style="position:relative; padding:8px 12px; border-radius:99px; background:${markerColor}; color:white; font-size:13px; font-weight:800; border:2px solid white; box-shadow:0 4px 10px rgba(0,0,0,0.2); font-family:'Nunito',sans-serif;">${crownHtml}${p.name}</div>`;
                const infowindow = new window.kakao.maps.InfoWindow({ position: markerPosition, content: iwContent });
                infowindow.open(mapInstance, marker);
                markersRef.current.push(marker);
                bounds.extend(markerPosition);
            } catch (e) { }
        });

        if (midpointCoords) bounds.extend(new window.kakao.maps.LatLng(midpointCoords.lat, midpointCoords.lng));
        if (hasLocation(bounds)) mapInstance.setBounds(bounds);
    }, [participants, mapInstance, isMapLoaded, midpointCoords, user, vipUser]);

    const hasLocation = (bounds: any) => bounds.toString() !== "((0, 0), (0, 0))";

    function handleSearch() {
        if (!isMapLoaded || !keyword) return;
        const ps = new window.kakao.maps.services.Places();
        ps.keywordSearch(keyword, (data: any, status: any) => {
            if (status === window.kakao.maps.services.Status.OK) setSearchResult(data);
            else alert("검색 결과가 없습니다.");
        });
    }

    function selectPlace(place: any) {
        setSelectedPlace(place);
        setSearchResult([]);
        setKeyword(place.place_name);
        if (mapInstance) mapInstance.panTo(new window.kakao.maps.LatLng(place.y, place.x));
    }

    async function handleRegister() {
        if (!user && !myName) return alert("로그인하거나 이름을 입력해주세요.");
        const displayName = user ? (user.user_metadata.full_name || user.email.split("@")[0]) : myName;
        if (!selectedPlace) return alert("장소를 선택해주세요.");

        const { error } = await supabase.from("participants").insert({
            event_id: eventId, name: displayName,
            location_info: JSON.stringify({ address: selectedPlace.place_name, lat: parseFloat(selectedPlace.y), lng: parseFloat(selectedPlace.x) })
        });
        if (error) alert("등록 실패: " + error.message);
        else { await fetchParticipants(); setKeyword(""); setSelectedPlace(null); }
    }

    async function confirmDelete() {
        if (!deleteTargetId) return;
        await supabase.from("participants").delete().eq("id", deleteTargetId);
        await fetchParticipants();
        setDeleteTargetId(null);
    }

    function calculateSmartMidpoint() {
        if (!mapInstance || participants.length < 2) return alert("2명 이상 모여야 합니다!");
        linesRef.current.forEach(line => line.setMap(null));
        linesRef.current = [];
        if (centerMarkerRef.current) centerMarkerRef.current.setMap(null);
        setCandidates([]); setIsPanelExpanded(true);

        let totalLat = 0, totalLng = 0, weightSum = 0;

        participants.forEach(p => {
            const loc = JSON.parse(p.location_info);
            const weight = (vipUser && p.name === vipUser) ? 3 : 1;

            totalLat += loc.lat * weight;
            totalLng += loc.lng * weight;
            weightSum += weight;
        });

        const centerLat = totalLat / weightSum;
        const centerLng = totalLng / weightSum;
        const centerPosition = new window.kakao.maps.LatLng(centerLat, centerLng);

        const ps = new window.kakao.maps.services.Places();
        ps.categorySearch('SW8', (data: any, status: any) => {
            if (status === window.kakao.maps.services.Status.OK) {
                const bestStation = data[0];
                const stationLat = parseFloat(bestStation.y);
                const stationLng = parseFloat(bestStation.x);
                const stationPosition = new window.kakao.maps.LatLng(stationLat, stationLng);
                setMidpointName(bestStation.place_name);
                setMidpointCoords({ lat: stationLat, lng: stationLng });

                const imageSrc = "https://t1.daumcdn.net/localimg/localimages/07/mapapidoc/marker_red.png";
                const imageSize = new window.kakao.maps.Size(64, 69);
                const markerImage = new window.kakao.maps.MarkerImage(imageSrc, imageSize);
                const marker = new window.kakao.maps.Marker({ position: stationPosition, image: markerImage, map: mapInstance });
                centerMarkerRef.current = marker;

                participants.forEach(p => {
                    const loc = JSON.parse(p.location_info);
                    const polyline = new window.kakao.maps.Polyline({
                        path: [new window.kakao.maps.LatLng(loc.lat, loc.lng), stationPosition],
                        strokeWeight: 6, strokeColor: '#2962FF', strokeOpacity: 0.6, strokeStyle: 'solid'
                    });
                    polyline.setMap(mapInstance);
                    linesRef.current.push(polyline);
                });
                mapInstance.panTo(stationPosition);
            } else { alert("근처에 지하철역이 없어요 ㅠㅠ"); }
        }, { location: centerPosition, radius: 5000 });
    }

    async function recommendPlaces() {
        if (!midpointCoords) return;
        const ps = new window.kakao.maps.services.Places();

        let extraKeyword = "";
        if (roomTheme === "date") extraKeyword = "분위기 좋은 ";
        if (roomTheme === "study") extraKeyword = "조용한 ";
        if (roomTheme === "party") extraKeyword = "단체 ";

        const categories = [
            { code: 'korean', keyword: extraKeyword + '한식 맛집', label: '한식' },
            { code: 'chinese', keyword: extraKeyword + '중식 맛집', label: '중식' },
            { code: 'japanese', keyword: extraKeyword + '일식 맛집', label: '일식' },
            { code: 'western', keyword: extraKeyword + '양식 맛집', label: '양식' },
            { code: 'cafe', keyword: extraKeyword + '카페', label: '카페' },
            { code: 'play', keyword: '놀거리', label: '놀거리' },
        ];

        let allPlaces: any[] = [];
        const promises = categories.map(cat => new Promise((resolve) => {
            ps.keywordSearch(cat.keyword, (data: any, status: any) => {
                if (status === window.kakao.maps.services.Status.OK) {
                    const top3 = data.slice(0, 3).map((p: any) => ({ ...p, type: cat.code }));
                    resolve(top3);
                }
                else resolve([]);
            }, { location: new window.kakao.maps.LatLng(midpointCoords.lat, midpointCoords.lng), radius: 1000, sort: window.kakao.maps.services.SortBy.ACCURACY });
        }));

        const results = await Promise.all(promises);
        results.forEach((res: any) => { allPlaces = [...allPlaces, ...res]; });

        if (allPlaces.length === 0) return alert("근처에 추천할 장소가 없어요 ㅠㅠ");

        for (const place of allPlaces) {
            const detailCategory = place.category_name ? place.category_name.split('>').pop().trim() : place.category_group_name;
            await supabase.from("places").insert({
                event_id: eventId,
                place_name: place.place_name,
                place_url: place.place_url,
                category: detailCategory,
                type: place.type,
                votes: 0,
                voted_users: []
            });
        }
        await fetchCandidates();
    }

    async function votePlace(place: any) {
        if (!user && !myName) return alert("투표하려면 이름을 입력해주세요!");
        const displayName = user ? (user.user_metadata.full_name || user.email.split("@")[0]) : myName;
        const currentVotedUsers = place.voted_users || [];
        const isAlreadyVoted = currentVotedUsers.includes(displayName);
        let newVotes = place.votes;
        let newVotedUsers = [...currentVotedUsers];
        if (isAlreadyVoted) { newVotes = Math.max(0, newVotes - 1); newVotedUsers = newVotedUsers.filter((u: string) => u !== displayName); }
        else { newVotes = newVotes + 1; newVotedUsers.push(displayName); }
        await supabase.from("places").update({ votes: newVotes, voted_users: newVotedUsers }).eq("id", place.id);
        fetchCandidates();
    }

    async function sendMemo() {
        if (!user && !myName) return alert("대화하려면 이름을 입력해주세요!");
        if (!memoInput.trim()) return;
        if (isSending) return;
        setIsSending(true);
        const content = memoInput;
        const displayName = user ? (user.user_metadata.full_name || user.email.split("@")[0]) : myName;
        const tempId = Date.now();
        const tempMemo = { id: tempId, content: content, author_name: displayName, event_id: eventId, created_at: new Date().toISOString(), isOptimistic: true };
        setMemos(prev => [...prev, tempMemo]);
        setMemoInput("");
        const { error } = await supabase.from("memos").insert({ event_id: eventId, content: content, author_name: displayName });
        setIsSending(false);
        if (error) setMemos(prev => prev.filter(m => m.id !== tempId));
    }

    async function handleAiTimeInput() {
        if (!aiInput.trim()) return;
        if (!user && !myName) return alert("이름을 먼저 입력해주세요!");
        const displayName = user ? (user.user_metadata.full_name || user.email.split("@")[0]) : myName;

        let targetDate = new Date(selectedDate);
        const text = aiInput.toLowerCase().replace(/\s/g, "");
        let timeSlotsToAdd: string[] = [];

        if (text.includes("내일")) targetDate.setDate(targetDate.getDate() + 1);
        else if (text.includes("모레")) targetDate.setDate(targetDate.getDate() + 2);

        const newDateStr = targetDate.toISOString().split('T')[0];
        setSelectedDate(newDateStr);

        if (text.includes("저녁") || text.includes("밤")) timeSlotsToAdd = ["18:00", "18:30", "19:00", "19:30", "20:00", "20:30"];
        else if (text.includes("점심")) timeSlotsToAdd = ["11:30", "12:00", "12:30", "13:00"];
        else if (text.includes("오후")) timeSlotsToAdd = ["13:00", "14:00", "15:00", "16:00", "17:00"];
        else {
            const match = text.match(/(\d{1,2})(?:시|:)?(반|30)?/);
            if (match) {
                let h = parseInt(match[1]);
                let m = match[2] ? "30" : "00";
                if (h < 10 && !text.includes("오전")) h += 12;
                if (h >= 0 && h <= 23) timeSlotsToAdd = [`${h.toString().padStart(2, '0')}:${m}`];
            }
        }

        if (timeSlotsToAdd.length === 0) return alert("시간을 인식하지 못했어요 🥲");

        const newSlots = timeSlotsToAdd.map(t => `${newDateStr} ${t}`);
        const uniqueSlots = Array.from(new Set([...myTimeSlots, ...newSlots]));
        setMyTimeSlots(uniqueSlots);
        setAiInput("");

        const { data: existing } = await supabase.from("availabilities").select("*").eq("event_id", eventId).eq("user_name", displayName).single();
        if (existing) {
            await supabase.from("availabilities").update({ selected_times: uniqueSlots, updated_at: new Date() }).eq("id", existing.id);
        } else {
            await supabase.from("availabilities").insert({ event_id: eventId, user_name: displayName, selected_times: uniqueSlots });
        }
    }

    async function toggleTimeSlot(time: string) {
        if (!user && !myName) return alert("먼저 이름을 입력하거나 로그인해주세요!");
        const displayName = user ? (user.user_metadata.full_name || user.email.split("@")[0]) : myName;

        const timeStr = `${selectedDate} ${time}`;
        let newSlots = [];
        if (myTimeSlots.includes(timeStr)) newSlots = myTimeSlots.filter(t => t !== timeStr);
        else newSlots = [...myTimeSlots, timeStr];

        setMyTimeSlots(newSlots);
        const { data: existing } = await supabase.from("availabilities").select("*").eq("event_id", eventId).eq("user_name", displayName).single();
        if (existing) await supabase.from("availabilities").update({ selected_times: newSlots, updated_at: new Date() }).eq("id", existing.id);
        else await supabase.from("availabilities").insert({ event_id: eventId, user_name: displayName, selected_times: newSlots });
    }

    const calculateBestTimes = () => {
        const counts: { [key: string]: number } = {};
        availabilities.forEach(person => {
            if (person.selected_times) {
                person.selected_times.forEach((time: string) => { counts[time] = (counts[time] || 0) + 1; });
            }
        });
        return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 3);
    };

    const changeDate = (offset: number) => {
        const d = new Date(selectedDate);
        d.setDate(d.getDate() + offset);
        setSelectedDate(d.toISOString().split('T')[0]);
    };

    function pickRandom() {
        if (candidates.length === 0) return alert("추천 장소가 없습니다!");
        setRandomWinner(candidates[Math.floor(Math.random() * candidates.length)]);
    }

    function spinRoulette() {
        if (participants.length < 2) return alert("최소 2명은 있어야 내기를 하죠! 😉");
        setIsSpinning(true);
        setRouletteResult("");
        setTimeout(() => {
            const victim = participants[Math.floor(Math.random() * participants.length)];
            setRouletteResult(victim.name);
            setIsSpinning(false);
        }, 2000);
    }

    const topRanking = candidates.filter(c => c.votes > 0).sort((a, b) => b.votes - a.votes).slice(0, 3);
    const bestTimes = calculateBestTimes();
    const filteredCandidates = activeCategory === "all" ? candidates : candidates.filter(c => {
        if (activeCategory === 'meal') return ['korean', 'chinese', 'japanese', 'western'].includes(c.type);
        if (activeCategory === 'cafe') return c.type === 'cafe';
        if (activeCategory === 'play') return ['pc', 'karaoke', 'board', 'bowling', 'billiards'].includes(c.type);
        return c.type === activeCategory;
    });

    const timeSlots = [];
    for (let h = 0; h <= 23; h++) {
        const hour = h.toString().padStart(2, '0');
        timeSlots.push(`${hour}:00`);
        timeSlots.push(`${hour}:30`);
    }

    const todayStr = new Date().toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' });

    return (
        <div className="min-h-screen bg-white text-gray-900 pb-40 font-sans">
            <style jsx global>{`@import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;700;900&display=swap'); body { font-family: 'Nunito', sans-serif; }`}</style>

            {deleteTargetId !== null && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"><div className="bg-white rounded-[32px] p-8 w-full max-w-[320px] text-center shadow-2xl"><h3 className="text-2xl font-black mb-2">삭제할까요?</h3><div className="flex gap-3 mt-6"><button onClick={confirmDelete} className="flex-1 py-4 bg-[#2962FF] text-white font-bold rounded-full">네</button><button onClick={() => setDeleteTargetId(null)} className="flex-1 py-4 bg-gray-100 font-bold rounded-full">아니요</button></div></div></div>
            )}

            {randomWinner && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-6"><div className="bg-white rounded-[32px] p-8 w-full max-w-sm text-center shadow-[0_20px_60px_rgba(255,255,255,0.3)] animate-in zoom-in-95 duration-300 relative overflow-hidden border-4 border-[#2962FF]"><div className="absolute top-0 left-0 w-full h-20 bg-gradient-to-b from-blue-100 to-transparent opacity-50"></div><div className="relative z-10"><div className="w-16 h-16 bg-[#2962FF] text-white rounded-full flex items-center justify-center mx-auto mb-4 text-3xl shadow-lg animate-bounce">🎲</div><h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-1">TODAY'S PICK</h3><h2 className="text-3xl font-black text-black mb-2 leading-tight break-keep">{randomWinner.place_name}</h2><p className="text-sm text-gray-500 font-bold mb-8">{randomWinner.category}</p><div className="flex flex-col gap-3"><a href={randomWinner.place_url} target="_blank" className="w-full py-4 bg-black text-white font-bold rounded-[20px] hover:bg-gray-800 transition">상세보기</a><button onClick={() => setRandomWinner(null)} className="w-full py-4 bg-gray-100 text-gray-600 font-bold rounded-[20px] hover:bg-gray-200 transition">닫기</button></div></div></div></div>
            )}

            {/* 🧾 영수증 팝업 */}
            {showReceipt && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-6" onClick={() => setShowReceipt(false)}>
                    <div className="bg-white w-full max-w-xs p-6 shadow-2xl relative animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()} style={{ clipPath: 'polygon(0 0, 100% 0, 100% 100%, 95% 98%, 90% 100%, 85% 98%, 80% 100%, 75% 98%, 70% 100%, 65% 98%, 60% 100%, 55% 98%, 50% 100%, 45% 98%, 40% 100%, 35% 98%, 30% 100%, 25% 98%, 20% 100%, 15% 98%, 10% 100%, 5% 98%, 0 100%)' }}>
                        <div className="text-center mb-6">
                            <div className="text-2xl font-black tracking-tighter mb-1">jamkkan</div>
                            <div className="text-xs text-gray-400 font-mono">PROMISE RECEIPT</div>
                        </div>
                        <div className="space-y-4 font-mono text-sm border-b-2 border-dashed border-gray-200 pb-4 mb-4">
                            <div className="flex justify-between"><span>DATE</span><span className="font-bold">{todayStr}</span></div>
                            <div className="flex justify-between"><span>EVENT</span><span className="font-bold">{roomTitle}</span></div>
                            <div className="flex justify-between"><span>LOCATION</span><span className="font-bold">{midpointName || "미정"}</span></div>
                            <div className="flex justify-between"><span>MEMBERS</span><span className="font-bold">{participants.length}명</span></div>
                        </div>
                        {topRanking[0] && (
                            <div className="text-center mb-4">
                                <div className="text-xs text-gray-400 mb-1">BEST PLACE</div>
                                <div className="text-xl font-black">{topRanking[0].place_name}</div>
                            </div>
                        )}
                        <div className="text-center text-[10px] text-gray-300 font-mono mt-4">Screenshot to share 📸</div>
                    </div>
                </div>
            )}

            {/* 헤더 */}
            <div className="sticky top-0 z-10 px-6 py-4 bg-white/90 backdrop-blur-md flex flex-col gap-3 items-center max-w-lg mx-auto">
                <div className="flex justify-between items-center w-full">
                    <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.location.href = '/'}>
                        <span className="text-xl font-black text-black">jjam<span className="text-[#2962FF]">kkan</span></span>
                    </div>

                    <div className="flex items-center gap-2">
                        {isEditingTitle ? (
                            <input autoFocus className="bg-gray-100 px-3 py-1 rounded-lg text-sm font-bold w-32 focus:outline-none" value={roomTitle} onChange={e => setRoomTitle(e.target.value)} onBlur={() => setIsEditingTitle(false)} onKeyDown={e => e.key === 'Enter' && updateRoomTitle()} />
                        ) : (
                            <div onClick={() => setIsEditingTitle(true)} className="flex items-center gap-1 cursor-pointer hover:bg-gray-50 px-2 py-1 rounded-lg transition">
                                <span className="font-bold text-sm max-w-[120px] truncate">{roomTitle}</span>
                                <Edit3 size={14} className="text-gray-400" />
                            </div>
                        )}
                        <button onClick={() => { navigator.clipboard.writeText(window.location.href); alert("링크가 복사되었습니다!"); }} className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 transition"><Share2 size={16} /></button>
                    </div>
                </div>

                {/* 테마 셀렉터 */}
                <div className="flex gap-2 w-full overflow-x-auto custom-scrollbar pb-1">
                    {[
                        { id: 'general', label: '🙌 일반', icon: '🔥' },
                        { id: 'date', label: '💘 데이트', icon: '🍷' },
                        { id: 'study', label: '📚 카공/팀플', icon: '💻' },
                        { id: 'party', label: '🍻 회식', icon: '🍺' }
                    ].map(t => (
                        <button
                            key={t.id}
                            onClick={() => setRoomTheme(t.id)}
                            className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1 border ${roomTheme === t.id ? 'bg-black text-white border-black' : 'bg-white text-gray-500 border-gray-200'}`}
                        >
                            <span>{t.icon}</span> {t.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* 메인 컨텐츠 */}
            <div className="max-w-lg mx-auto px-6 space-y-6 mt-2">
                <div className="w-full h-72 bg-gray-50 rounded-[40px] overflow-hidden relative border-4 border-gray-50 shadow-sm"><div id="map" className="w-full h-full"></div>{!isMapLoaded && <div className="absolute inset-0 flex items-center justify-center bg-white z-10 font-black text-[#2962FF]">LOADING...</div>}</div>

                {/* 입력창 */}
                <div className="space-y-3">
                    {!user && (
                        <div className="bg-gray-100 rounded-[24px] p-2 flex items-center"><div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm ml-1 text-gray-400"><User size={20} /></div><input className="w-full bg-transparent px-4 font-bold h-12 focus:outline-none" placeholder="이름을 입력하세요 (로그인 권장)" value={myName} onChange={e => setMyName(e.target.value)} /></div>
                    )}
                    <div className="relative bg-gray-100 rounded-[24px] p-2 flex items-center ring-[#2962FF]/20 focus-within:ring-2"><div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm ml-1 text-[#2962FF]"><Search size={20} /></div><input className="w-full bg-transparent px-4 font-bold h-12 focus:outline-none" placeholder={isMapLoaded ? "출발지 검색" : "..."} disabled={!isMapLoaded} value={keyword} onChange={e => setKeyword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearch()} /><button onClick={handleSearch} className="bg-black text-white px-5 h-10 rounded-full font-bold hover:bg-[#2962FF]">GO</button></div>
                    {searchResult.length > 0 && (<ul className="bg-white mt-2 rounded-[24px] shadow-xl p-2 max-h-60 overflow-y-auto border border-gray-100">{searchResult.map((place) => (<li key={place.id} onClick={() => selectPlace(place)} className="p-4 rounded-[16px] hover:bg-blue-50 cursor-pointer"><div className="font-bold">{place.place_name}</div><div className="text-xs text-gray-400">{place.address_name}</div></li>))}</ul>)}
                    {selectedPlace && <button onClick={handleRegister} className="w-full mt-2 bg-black text-white py-5 rounded-[24px] font-black shadow-lg">여기서 출발하기</button>}
                </div>

                {/* 참여자 */}
                <div className="grid grid-cols-1 gap-3 pb-24">{participants.map(p => {
                    const loc = JSON.parse(p.location_info); const isMe = user ? (p.name === user.user_metadata.full_name || p.name === user.email.split("@")[0]) : p.name === myName; return (<div key={p.id} className={`bg-white p-4 rounded-[24px] shadow-sm border flex justify-between items-center ${isMe ? 'border-[#2962FF] bg-blue-50/30' : 'border-gray-100'}`}><div className="flex items-center gap-4"><div className={`w-12 h-12 flex items-center justify-center font-black rounded-full ${isMe ? 'bg-[#2962FF] text-white' : 'bg-gray-100 text-gray-400'}`}>{isMe ? "ME" : p.name.charAt(0)}</div><div><div className="font-extrabold">{p.name}</div><div className="text-xs text-gray-400 font-bold truncate max-w-[120px]">{loc.address}</div></div></div><div className="flex gap-2">
                        {midpointCoords && (
                            <a href={`https://map.kakao.com/link/to/${midpointName},${midpointCoords.lat},${midpointCoords.lng}/from/${loc.address},${loc.lat},${loc.lng}`} target="_blank" className="w-10 h-10 flex items-center justify-center bg-gray-900 rounded-full text-white hover:bg-[#2962FF]">
                                <Bus size={18} />
                            </a>
                        )}
                        <button onClick={() => setDeleteTargetId(p.id)} className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center text-gray-300"><Trash2 size={18} /></button></div></div>);
                })}</div>
            </div>

            {/* 👇 하단 패널 */}
            <div className="fixed bottom-0 left-0 w-full z-30 pointer-events-none">
                <div className="max-w-lg mx-auto pointer-events-auto">
                    {midpointName ? (
                        <div className={`bg-white rounded-t-[32px] shadow-[0_-10px_40px_rgba(0,0,0,0.15)] transition-transform duration-300 border-t border-gray-100 ${isPanelExpanded ? 'translate-y-0' : 'translate-y-[calc(100%-85px)]'}`}>
                            <div className="flex flex-col items-center pt-3 pb-2 cursor-pointer bg-white rounded-t-[32px]" onClick={() => setIsPanelExpanded(!isPanelExpanded)}><div className="w-12 h-1.5 bg-gray-200 rounded-full mb-3"></div><div className="px-6 w-full flex justify-between items-center"><div className="text-lg font-black flex items-center gap-2"><span className="text-[#2962FF]">📍</span> {midpointName}</div>{isPanelExpanded ? <ChevronDown className="text-gray-400" /> : <ChevronUp className="text-gray-400" />}</div></div>

                            {/* 4가지 탭 버튼 */}
                            <div className={`flex px-6 gap-2 mt-2 mb-4 ${!isPanelExpanded && 'hidden'}`}>
                                <button onClick={() => setMainTab("vote")} className={`flex-1 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all ${mainTab === "vote" ? 'bg-black text-white shadow-lg' : 'bg-gray-100 text-gray-400'}`}><Utensils size={16} /> 장소</button>
                                <button onClick={() => setMainTab("time")} className={`flex-1 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all ${mainTab === "time" ? 'bg-[#2962FF] text-white shadow-lg' : 'bg-gray-100 text-gray-400'}`}><Clock size={16} /> 시간</button>
                                <button onClick={() => setMainTab("tools")} className={`flex-1 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all ${mainTab === "tools" ? 'bg-orange-500 text-white shadow-lg' : 'bg-gray-100 text-gray-400'}`}><Zap size={16} /> 도구</button>
                                <button onClick={() => setMainTab("talk")} className={`flex-1 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all ${mainTab === "talk" ? 'bg-[#2962FF] text-white shadow-lg' : 'bg-gray-100 text-gray-400'}`}><MessageSquare size={16} /> 토크</button>
                            </div>

                            <div className={`px-4 pb-8 h-[60vh] overflow-y-auto ${isPanelExpanded ? '' : 'hidden'}`}>

                                {/* [1] 📍 장소 */}
                                {mainTab === "vote" && (
                                    <div>
                                        <div className="bg-black text-white p-6 rounded-[32px] shadow-lg relative overflow-hidden mb-6">
                                            <div className="absolute top-0 right-0 w-40 h-40 bg-[#2962FF] blur-[80px] opacity-60 rounded-full pointer-events-none"></div>
                                            <div className="flex justify-between items-start mb-4 relative z-10">
                                                <span className="text-[10px] font-black text-[#2962FF] bg-white px-3 py-1.5 rounded-full tracking-widest">RESULT</span>
                                                <button onClick={() => { setMidpointName(""); setCandidates([]); }} className="bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1 transition"><RotateCcw size={12} /> 다시 찾기</button>
                                            </div>
                                            <div className="mb-6"><div className="text-3xl font-black mb-1">{midpointName}</div><p className="text-sm text-gray-400 font-medium">모두의 중간 지점입니다.</p></div>
                                            <div className="flex gap-2 relative z-10">
                                                {midpointCoords && (<a href={`https://map.kakao.com/link/to/${midpointName},${midpointCoords.lat},${midpointCoords.lng}`} target="_blank" className="flex-1 bg-[#2962FF] py-4 rounded-[24px] font-black text-lg flex justify-center gap-2 hover:scale-[1.02] transition shadow-md"><Navigation size={20} /> 길찾기</a>)}
                                                {/* 🚇 막차 확인 버튼 */}
                                                <a href={`https://map.kakao.com/?sName=${midpointName}&eName=집&target=transit`} target="_blank" className="bg-white/20 hover:bg-white/30 text-white px-4 py-4 rounded-[24px] font-bold flex items-center justify-center transition"><TrainFront size={20} /></a>
                                            </div>
                                        </div>
                                        <div className="mb-20">
                                            <div className="flex justify-between items-center mb-4"><h3 className="text-lg font-black flex items-center gap-2">🗳️ 추천 장소 <span className="text-[#2962FF] text-sm">{filteredCandidates.length}곳</span></h3>{candidates.length === 0 ? (<button onClick={recommendPlaces} className="bg-gray-100 text-black px-4 py-3 rounded-full text-xs font-bold hover:bg-[#2962FF] hover:text-white transition flex items-center gap-1 shadow-md"><Utensils size={14} /> 장소 추천받기</button>) : (<button onClick={pickRandom} className="bg-pink-100 text-pink-600 px-3 py-2 rounded-full text-xs font-bold hover:bg-pink-200 transition flex items-center gap-1"><Dices size={14} /> 랜덤 뽑기</button>)}</div>
                                            {candidates.length > 0 && (
                                                <div className="flex gap-2 overflow-x-auto pb-3 custom-scrollbar mb-1">
                                                    {[
                                                        { id: 'all', label: '전체' }, { id: 'meal', label: '🍚 밥' }, { id: 'cafe', label: '☕ 카페' },
                                                        { id: 'play', label: '🎮 놀거리' }, { id: 'korean', label: '한식' }, { id: 'japanese', label: '일식' }, { id: 'chinese', label: '중식' }, { id: 'western', label: '양식' },
                                                    ].map(tab => (<button key={tab.id} onClick={() => setActiveCategory(tab.id)} className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all ${activeCategory === tab.id ? 'bg-black text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>{tab.label}</button>))}
                                                </div>
                                            )}
                                            {topRanking.length > 0 && (<div className="bg-blue-50 rounded-[20px] p-4 mb-4 border border-[#2962FF]/20"><h4 className="text-xs font-black text-[#2962FF] mb-2 flex items-center gap-1"><Trophy size={12} /> 실시간 랭킹</h4><div className="space-y-2">{topRanking.map((place, index) => (<div key={place.id} className="flex justify-between items-center"><div className="flex items-center gap-2 overflow-hidden">{index === 0 && <Crown size={14} className="text-yellow-500 fill-yellow-500" />}<span className={`text-sm font-bold ${index === 0 ? 'text-black' : 'text-gray-500'}`}>{index + 1}위</span><span className="text-sm font-medium truncate max-w-[150px]">{place.place_name}</span></div><span className="text-xs font-black bg-white px-2 py-0.5 rounded-full border shadow-sm">{place.votes}표</span></div>))}</div></div>)}
                                            {candidates.length > 0 ? (<ul className="space-y-2">{filteredCandidates.map((place) => {
                                                const hasVoted = user ? place.voted_users.includes(user.user_metadata.full_name || user.email.split("@")[0]) : place.voted_users.includes(myName); return (
                                                    <li key={place.id} className={`flex justify-between items-center p-3 rounded-[20px] border transition-all ${hasVoted ? 'bg-blue-50 border-[#2962FF]' : 'bg-gray-50 border-transparent'}`}>
                                                        <div className="flex-1 min-w-0 pr-2"><div className="font-bold text-sm truncate">{place.place_name}</div><div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5"><MapPin size={10} /><span className="truncate">{place.category || '장소'}</span></div><a href={place.place_url} target="_blank" className="text-[10px] font-bold text-[#2962FF] bg-blue-50 px-2 py-1 rounded-md mt-1.5 inline-flex items-center gap-1 hover:bg-[#2962FF] hover:text-white transition"><ExternalLink size={10} /> 후기/메뉴 보기</a></div>
                                                        <button onClick={() => votePlace(place)} className={`flex items-center gap-1 px-3 py-2 rounded-full transition active:scale-95 shrink-0 ${hasVoted ? 'bg-[#2962FF] text-white shadow-md' : 'bg-white border border-gray-200 hover:border-[#2962FF] hover:text-[#2962FF]'}`}><ThumbsUp size={14} fill={hasVoted ? "currentColor" : "none"} /><span className="font-black">{place.votes}</span></button>
                                                    </li>
                                                );
                                            })}</ul>) : (<div className="text-center text-xs text-gray-400 py-4 bg-gray-50 rounded-[20px]">맛집 추천 버튼을 눌러보세요!</div>)}
                                        </div>
                                    </div>
                                )}

                                {/* [2] ⏰ 시간 */}
                                {mainTab === "time" && (
                                    <div>
                                        {bestTimes.length > 0 ? (
                                            <div className="bg-blue-50 border border-[#2962FF]/20 rounded-[24px] p-5 mb-6 shadow-sm"><div className="flex items-center gap-2 mb-3"><div className="bg-[#2962FF] text-white p-1 rounded-full"><Zap size={14} fill="currentColor" /></div><h3 className="font-black text-lg text-[#2962FF]">모두가 되는 시간 Best 3</h3></div><div className="space-y-3">{bestTimes.map(([time, count], i) => { const d = new Date(time); const timeLabel = `${d.getMonth() + 1}월 ${d.getDate()}일 ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`; return (<div key={i} className="flex justify-between items-center bg-white p-3 rounded-[16px] shadow-sm"><div className="flex items-center gap-3"><span className={`font-black text-lg ${i === 0 ? 'text-[#2962FF]' : 'text-gray-400'}`}>{i + 1}위</span><span className="font-bold text-gray-800">{timeLabel}</span></div><span className="text-xs font-bold bg-black text-white px-2 py-1 rounded-full">{count}명 가능</span></div>) })}</div></div>
                                        ) : (<div className="text-center py-6 text-gray-400 text-sm font-bold bg-gray-50 rounded-[24px] mb-6 border border-dashed border-gray-200">아직 겹치는 시간이 없어요 🥲<br />아래에서 가능한 시간을 꾹 눌러주세요!</div>)}
                                        <div className="bg-white rounded-[24px] border border-gray-100 p-5 shadow-sm">
                                            <div className="flex justify-between items-center mb-4"><h3 className="font-black text-lg flex items-center gap-2"><Clock size={18} /> 내 시간 입력</h3><button onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])} className="text-xs font-bold bg-gray-100 px-3 py-1.5 rounded-full hover:bg-gray-200 transition">오늘</button></div>
                                            <div className="flex gap-2 mb-4"><div className="relative flex-1"><div className="absolute left-3 top-3 text-[#2962FF]"><Sparkles size={16} /></div><input className="w-full bg-blue-50/50 border border-blue-100 rounded-[16px] pl-9 pr-3 py-3 text-sm font-bold focus:outline-none focus:border-[#2962FF] focus:ring-1 focus:ring-[#2962FF]" placeholder="예: 내일 저녁, 7시반..." value={aiInput} onChange={(e) => setAiInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAiTimeInput()} /></div><button onClick={handleAiTimeInput} className="bg-[#2962FF] text-white px-4 rounded-[16px] font-bold text-sm">입력</button></div>
                                            <div className="flex items-center justify-between mb-6 bg-gray-50 p-2 rounded-[20px]"><button onClick={() => changeDate(-1)} className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm hover:bg-gray-100 transition"><ChevronLeft size={20} /></button><div className="text-center"><div className="text-xs font-bold text-gray-400 mb-0.5">DATE</div><div className="text-lg font-black text-gray-900 tracking-tight">{selectedDate}</div></div><button onClick={() => changeDate(1)} className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm hover:bg-gray-100 transition"><ChevronRight size={20} /></button></div>
                                            <div className="grid grid-cols-4 gap-2">{timeSlots.map((time) => { const timeStr = `${selectedDate} ${time}`; const isSelected = myTimeSlots.includes(timeStr); return (<button key={time} onClick={() => toggleTimeSlot(time)} className={`py-3 rounded-[16px] font-bold text-sm transition-all border-2 ${isSelected ? 'bg-[#2962FF] border-[#2962FF] text-white shadow-md' : 'bg-white border-gray-100 text-gray-400 hover:border-gray-200 hover:text-gray-600'}`}>{time}</button>) })}</div>
                                        </div>
                                    </div>
                                )}

                                {/* [3] ⚡ 도구 */}
                                {mainTab === "tools" && (
                                    <div className="space-y-4">
                                        {/* 🧾 영수증 */}
                                        <div onClick={() => setShowReceipt(true)} className="bg-white border border-gray-100 p-5 rounded-[24px] flex items-center justify-between shadow-sm cursor-pointer hover:bg-gray-50 transition">
                                            <div className="flex items-center gap-4"><div className="w-12 h-12 bg-gray-900 text-white rounded-full flex items-center justify-center"><Receipt size={24} /></div><div><div className="font-black text-lg">약속 영수증</div><div className="text-xs text-gray-400 font-bold">인스타 스토리용 이미지 📸</div></div></div><ChevronRight className="text-gray-300" />
                                        </div>
                                        {/* 💸 N빵 */}
                                        <div className="bg-white border border-gray-100 p-5 rounded-[24px] shadow-sm">
                                            <div className="flex items-center gap-2 mb-4"><Calculator size={20} /><span className="font-black text-lg">N빵 계산기</span></div>
                                            <div className="flex gap-2"><input type="number" placeholder="총 금액 입력" className="flex-1 bg-gray-50 px-4 py-3 rounded-[16px] font-bold outline-none focus:ring-2 ring-orange-400" value={calcTotal} onChange={(e) => setCalcTotal(e.target.value)} /><div className="bg-black text-white px-4 py-3 rounded-[16px] font-bold flex items-center justify-center shrink-0">{participants.length}명</div></div>
                                            {calcTotal && (<div className="mt-4 text-center bg-orange-50 py-4 rounded-[20px] animate-in zoom-in"><div className="text-xs text-orange-400 font-bold mb-1">한 사람당</div><div className="text-2xl font-black text-orange-600">{Math.floor(parseInt(calcTotal) / (participants.length || 1)).toLocaleString()}원</div></div>)}
                                        </div>
                                        {/* 🤡 룰렛 */}
                                        <div className="bg-white border border-gray-100 p-5 rounded-[24px] shadow-sm text-center">
                                            <div className="flex items-center gap-2 mb-4 justify-center"><Smile size={20} /><span className="font-black text-lg">벌칙 룰렛</span></div>
                                            <div className="w-32 h-32 bg-gray-50 rounded-full mx-auto flex items-center justify-center mb-4 border-4 border-dashed border-gray-200"><span className="font-black text-xl">{isSpinning ? "🎲..." : (rouletteResult || "Start!")}</span></div>
                                            <button onClick={spinRoulette} disabled={isSpinning} className="w-full py-3 bg-black text-white rounded-[16px] font-bold hover:bg-gray-800 transition">돌리기!</button>
                                        </div>
                                    </div>
                                )}

                                {/* [4] 💬 토크 */}
                                {mainTab === "talk" && (
                                    <div className="flex flex-col h-full pb-10">
                                        <div className="flex-1 overflow-y-auto space-y-3 p-1 custom-scrollbar" ref={chatContainerRef}>{memos.length === 0 ? (<div className="text-center text-gray-300 text-sm py-10 font-bold">아직 대화가 없어요.<br />첫 메시지를 남겨보세요! 👋</div>) : (memos.map(memo => { const isMe = user ? (memo.author_name === (user.user_metadata.full_name || user.email.split("@")[0])) : (memo.author_name === myName); return (<div key={memo.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}><span className="text-[10px] text-gray-400 mb-1 px-1">{memo.author_name}</span><div className={`px-4 py-3 rounded-[20px] max-w-[80%] text-sm font-bold shadow-sm ${isMe ? 'bg-[#2962FF] text-white rounded-tr-none' : 'bg-gray-100 text-gray-800 rounded-tl-none'}`}>{memo.content}</div></div>) }))}</div>
                                        <div className="mt-4 flex gap-2"><input className="flex-1 bg-gray-100 rounded-full px-5 py-3 text-sm font-bold focus:outline-none focus:ring-2 ring-[#2962FF]" placeholder={user || myName ? "메시지 입력..." : "이름을 등록해주세요"} disabled={!user && !myName} value={memoInput} onChange={e => setMemoInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) { e.preventDefault(); sendMemo(); } }} /><button onClick={sendMemo} disabled={!user && !myName} className="w-12 h-12 bg-black text-white rounded-full flex items-center justify-center hover:scale-105 active:scale-95 disabled:opacity-50"><Send size={18} /></button></div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="p-4 bg-gradient-to-t from-white via-white to-transparent">
                            {/* 👑 VIP 선택 드롭다운 */}
                            <div className="mb-3 px-2">
                                <label className="text-xs font-bold text-gray-500 ml-1 mb-1 block">오늘의 주인공 (가중치 3배)</label>
                                <select className="w-full bg-white border border-gray-200 rounded-[16px] px-4 py-3 font-bold text-sm outline-none focus:ring-2 ring-[#2962FF]" value={vipUser} onChange={(e) => setVipUser(e.target.value)}>
                                    <option value="">없음 (공평하게)</option>
                                    {participants.map(p => (<option key={p.id} value={p.name}>{p.name} 👑</option>))}
                                </select>
                            </div>
                            <button onClick={calculateSmartMidpoint} disabled={!isMapLoaded || participants.length < 2} className={`w-full py-5 rounded-[28px] font-black text-lg flex justify-center items-center gap-2 shadow-xl ${participants.length < 2 ? "bg-gray-200 text-gray-400" : "bg-black text-white"}`}>{participants.length < 2 ? "2명 이상 모이면 시작!" : <><Zap size={22} className="text-[#2962FF]" /> 중간 지점 찾기</>}</button>
                        </div>
                    )}
                </div>
            </div>
            <style jsx global>{`@keyframes slide-up { from { transform: translateY(40px); opacity: 0; } to { transform: translateY(0); opacity: 1; } } .animate-slide-up { animation: slide-up 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; } .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; } .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #E5E7EB; border-radius: 99px; }`}</style>
        </div>
    );
}