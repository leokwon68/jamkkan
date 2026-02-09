"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { ArrowRight, Keyboard, Clock, X, LogOut, Sparkles } from "lucide-react";

// ✅ 오현 님의 키
const MY_SUPABASE_URL = "https://aywhegbqzwelzldjjgyq.supabase.co";
const MY_SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF5d2hlZ2JxendlbHpsZGpqZ3lxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyOTYwMTYsImV4cCI6MjA4NTg3MjAxNn0.gaS5v9iVl3pNTidzr1UcpPTwgcUXlLYPprCDzAC4bDo";

const supabase = createClient(MY_SUPABASE_URL, MY_SUPABASE_KEY);

export default function LandingPage() {
  const router = useRouter();
  const [inputCode, setInputCode] = useState("");
  const [recentRooms, setRecentRooms] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [isCreating, setIsCreating] = useState(false);
  const [newRoomTitle, setNewRoomTitle] = useState("");

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user || null);
      setIsLoading(false);
    };
    checkSession();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
      setIsLoading(false);
    });

    loadHistoryWithTitles();

    return () => { authListener.subscription.unsubscribe(); };
  }, []);

  const loadHistoryWithTitles = async () => {
    const savedCodes = JSON.parse(localStorage.getItem("jjamkkan_history") || "[]");
    if (savedCodes.length === 0) return;

    const { data } = await supabase.from("rooms").select("event_id, title").in("event_id", savedCodes);

    if (data) {
      const historyData = savedCodes.map((code: string) => {
        const roomInfo = data.find(r => r.event_id === code);
        return {
          id: code,
          title: roomInfo ? roomInfo.title : "알 수 없는 방"
        };
      });
      setRecentRooms(historyData);
    }
  };

  const handleSocialLogin = async () => {
    await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  const createRoom = async () => {
    if (!newRoomTitle.trim()) return alert("방 제목을 입력해주세요!");

    const randomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    const title = newRoomTitle.trim();

    await supabase.from("rooms").insert({ event_id: randomCode, title: title });

    const currentHistory = JSON.parse(localStorage.getItem("jjamkkan_history") || "[]");
    const newHistory = [randomCode, ...currentHistory].slice(0, 5);
    localStorage.setItem("jjamkkan_history", JSON.stringify(newHistory));

    router.push(`/${randomCode}`);
  };

  const joinRoom = () => {
    if (!inputCode.trim()) return alert("참여 코드를 입력해주세요!");
    const code = inputCode.trim().toUpperCase();

    const currentHistory = JSON.parse(localStorage.getItem("jjamkkan_history") || "[]");
    const newHistory = [code, ...currentHistory.filter((c: string) => c !== code)].slice(0, 5);
    localStorage.setItem("jjamkkan_history", JSON.stringify(newHistory));

    router.push(`/${code}`);
  };

  const removeHistory = (code: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const currentHistory = JSON.parse(localStorage.getItem("jjamkkan_history") || "[]");
    const newHistory = currentHistory.filter((c: string) => c !== code);
    localStorage.setItem("jjamkkan_history", JSON.stringify(newHistory));
    setRecentRooms(prev => prev.filter(r => r.id !== code));
  };

  return (
    <div className="min-h-screen bg-white text-gray-900 flex flex-col font-sans relative overflow-hidden">
      <style jsx global>{`@import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;700;900&display=swap'); body { font-family: 'Nunito', sans-serif; }`}</style>

      {isCreating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-6 animate-in fade-in duration-200">
          <div className="bg-white rounded-[32px] p-8 w-full max-w-sm shadow-2xl scale-100 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black">새로운 약속 만들기</h3>
              <button onClick={() => setIsCreating(false)} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200"><X size={20} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-400 ml-2 mb-1 block">방 제목</label>
                <input autoFocus className="w-full bg-gray-50 border-2 border-transparent focus:border-[#2962FF] focus:bg-white rounded-[20px] px-5 py-4 font-bold text-lg outline-none transition-all placeholder:text-gray-300" placeholder="예: 강남 불금 파티 🔥" value={newRoomTitle} onChange={(e) => setNewRoomTitle(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && createRoom()} />
              </div>
              <button onClick={createRoom} className="w-full py-4 bg-[#2962FF] text-white rounded-[24px] font-black text-lg shadow-lg hover:bg-blue-600 transition flex items-center justify-center gap-2">시작하기 <ArrowRight size={20} /></button>
            </div>
          </div>
        </div>
      )}

      {/* 배경 장식 */}
      <div className="absolute top-[-10%] right-[-10%] w-[300px] h-[300px] bg-blue-100 rounded-full blur-[80px] opacity-50 z-0"></div>
      <div className="absolute bottom-[-5%] left-[-10%] w-[200px] h-[200px] bg-pink-100 rounded-full blur-[60px] opacity-50 z-0"></div>

      <div className="pt-16 pb-8 flex flex-col items-center z-10">
        <div className="text-5xl font-black tracking-tighter select-none cursor-default flex items-center gap-1">
          <span className="text-black">jjam</span><span className="text-[#2962FF]">kkan</span>
          <div className="w-2 h-2 bg-[#2962FF] rounded-full mt-4 ml-1"></div>
        </div>
        <p className="text-gray-400 font-bold text-sm mt-3 tracking-wide">우리 만남의 중간 지점, 잠깐</p>
      </div>

      <div className="flex-1 flex flex-col px-6 max-w-md mx-auto w-full z-10 pb-10 gap-6">
        <div className="w-full">
          {isLoading ? (
            <div className="h-16 w-full bg-gray-50 rounded-[24px] animate-pulse"></div>
          ) : user ? (
            <div className="bg-white border-2 border-[#2962FF]/10 rounded-[28px] p-2 pr-4 flex items-center justify-between shadow-[0_8px_30px_rgba(41,98,255,0.08)]">
              <div className="flex items-center gap-3">
                {user.user_metadata.avatar_url ? (<img src={user.user_metadata.avatar_url} alt="Profile" className="w-12 h-12 rounded-[20px] object-cover border-2 border-white shadow-sm" />) : (<div className="w-12 h-12 bg-[#2962FF] text-white rounded-[20px] flex items-center justify-center font-bold text-lg">{user.email?.charAt(0).toUpperCase()}</div>)}
                <div><div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Welcome</div><div className="text-lg font-black text-gray-900">{user.user_metadata.full_name || user.email.split("@")[0]}</div></div>
              </div>
              <button onClick={handleLogout} className="bg-gray-50 text-gray-400 p-2.5 rounded-full hover:text-red-500 hover:bg-red-50 transition"><LogOut size={18} /></button>
            </div>
          ) : (
            <button onClick={handleSocialLogin} className="w-full bg-white border border-gray-200 text-gray-800 py-4 rounded-[24px] font-bold shadow-sm hover:bg-gray-50 transition flex items-center justify-center gap-2 transform active:scale-[0.98]">
              <svg viewBox="0 0 24 24" width="22" height="22" xmlns="http://www.w3.org/2000/svg"><g transform="matrix(1, 0, 0, 1, 27.009001, -39.238998)"><path fill="#4285F4" d="M -3.264 51.509 C -3.264 50.719 -3.334 49.969 -3.454 49.239 L -14.754 49.239 L -14.754 53.749 L -8.284 53.749 C -8.574 55.229 -9.424 56.479 -10.684 57.329 L -10.684 60.329 L -6.824 60.329 C -4.564 58.239 -3.264 55.159 -3.264 51.509 Z" /><path fill="#34A853" d="M -14.754 63.239 C -11.514 63.239 -8.804 62.159 -6.824 60.329 L -10.684 57.329 C -11.764 58.049 -13.134 58.489 -14.754 58.489 C -17.884 58.489 -20.534 56.379 -21.484 53.529 L -25.464 53.529 L -25.464 56.619 C -23.494 60.539 -19.444 63.239 -14.754 63.239 Z" /><path fill="#FBBC05" d="M -21.484 53.529 C -21.734 52.809 -21.864 52.039 -21.864 51.239 C -21.864 50.439 -21.724 49.669 -21.484 48.949 L -21.484 45.859 L -25.464 45.859 C -26.284 47.479 -26.754 49.299 -26.754 51.239 C -26.754 53.179 -26.284 54.999 -25.464 56.619 L -21.484 53.529 Z" /><path fill="#EA4335" d="M -14.754 43.989 C -12.984 43.989 -11.404 44.599 -10.154 45.789 L -6.734 42.369 C -8.804 40.429 -11.514 39.239 -14.754 39.239 C -19.444 39.239 -23.494 41.939 -25.464 45.859 L -21.484 48.949 C -20.534 46.099 -17.884 43.989 -14.754 43.989 Z" /></g></svg>
              <span>구글로 3초 만에 시작</span>
            </button>
          )}
        </div>

        <button onClick={() => { setIsCreating(true); setNewRoomTitle(""); }} className="w-full py-6 bg-[#2962FF] text-white rounded-[28px] font-black text-xl shadow-[0_15px_40px_rgba(41,98,255,0.4)] hover:bg-blue-600 transform hover:-translate-y-1 transition-all flex items-center justify-center gap-3 relative overflow-hidden group">
          <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition duration-300"></div>
          <Sparkles size={24} className="animate-pulse" />
          <span>새 약속방 만들기</span>
        </button>

        <div className="w-full space-y-3">
          <div className="bg-gray-50 rounded-[28px] p-2 pl-3 flex items-center focus-within:ring-2 ring-[#2962FF] transition-all border border-gray-100">
            <div className="w-12 h-12 bg-white rounded-[20px] flex items-center justify-center text-gray-300 shadow-sm"><Keyboard size={24} strokeWidth={2.5} /></div>
            <input className="w-full bg-transparent px-4 text-lg font-black text-black placeholder-gray-300 focus:outline-none uppercase" placeholder="초대 코드 입력" value={inputCode} onChange={(e) => setInputCode(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && joinRoom()} />
            <button onClick={joinRoom} className="w-14 h-12 bg-black text-white rounded-[20px] flex items-center justify-center hover:bg-gray-800 transition"><ArrowRight size={24} /></button>
          </div>
        </div>

        {recentRooms.length > 0 && (
          <div className="w-full mt-4">
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3 ml-2 flex items-center gap-1"><Clock size={12} /> 최근 방문한 방</h3>
            <div className="flex flex-col gap-2">
              {recentRooms.map((room) => (
                <div key={room.id} onClick={() => router.push(`/${room.id}`)} className="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-[24px] hover:border-[#2962FF] cursor-pointer transition active:scale-95 group">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="w-10 h-10 shrink-0 bg-gray-50 rounded-full flex items-center justify-center text-[#2962FF] font-black text-xs">#</div>
                    <div className="flex flex-col"><span className="font-black text-gray-900 truncate max-w-[200px]">{room.title}</span><span className="text-[10px] font-bold text-gray-400 tracking-wider">{room.id}</span></div>
                  </div>
                  <button onClick={(e) => removeHistory(room.id, e)} className="p-2 text-gray-300 hover:text-red-500 rounded-full transition"><X size={16} /></button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      <div className="p-6 text-center text-[10px] font-bold text-gray-300 uppercase tracking-widest">© 2026 jjamkkan.</div>
    </div>
  );
}