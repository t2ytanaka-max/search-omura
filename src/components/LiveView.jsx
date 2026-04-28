import React, { useState, useEffect, useRef } from 'react';
import { db } from '../lib/firebase';
import { collection, query, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { Video, Camera, StopCircle, Eye, RefreshCw, AlertCircle } from 'lucide-react';

const corps = [
    '1分団', '2分団', '3分団', '4分団', '5分団', '6分団', '7分団', '8分団', '9分団', '10分団',
    '11分団', '12分団', '13分団', '14分団', '15分団', 'その他'
];

function useInterval(callback, delay) {
    const savedCallback = useRef();
    useEffect(() => {
        savedCallback.current = callback;
    }, [callback]);
    useEffect(() => {
        if (delay !== null) {
            let id = setInterval(() => savedCallback.current(), delay);
            return () => clearInterval(id);
        }
    }, [delay]);
}

export default function LiveView() {
    const [mode, setMode] = useState('watch');
    const [activeStreams, setActiveStreams] = useState([]);
    const [sendCount, setSendCount] = useState(0);
    const isSendingRef = useRef(false);
    const countRef = useRef(0);
    const [isBroadcasting, setIsBroadcasting] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [myCorp, setMyCorp] = useState('');
    const [memo, setMemo] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const streamRef = useRef(null);
    const latestCorpRef = useRef(myCorp);

    useEffect(() => {
        latestCorpRef.current = myCorp;
    }, [myCorp]);

    useEffect(() => {
        if (mode === 'watch' && db) {
            const q = query(collection(db, "live_streams"));
            const unsubscribe = onSnapshot(q, (snapshot) => {
                const streams = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                setActiveStreams(streams);
            }, (err) => {
                console.error("Live streams listen error:", err);
            });
            return () => unsubscribe();
        }
    }, [mode]);

    useEffect(() => {
        return () => stopBroadcast();
    }, []);

    useInterval(() => {
        if (isBroadcasting) sendFrame();
    }, isBroadcasting ? 3000 : null);

    const startBroadcast = async () => {
        if (!myCorp) {
            setErrorMsg('所属分団を選択してください。');
            return;
        }
        setErrorMsg('');
        setIsLoading(true);

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } },
                audio: false
            });
            streamRef.current = stream;
            setIsBroadcasting(true);
            
            setTimeout(async () => {
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    try { await videoRef.current.play(); } catch (e) { console.error(e); }
                }
                setIsLoading(false);
                sendFrame();
            }, 100);
        } catch (err) {
            setErrorMsg(`カメラ起動失敗: ${err.message}`);
            setIsLoading(false);
            setIsBroadcasting(false);
        }
    };

    const stopBroadcast = () => {
        const targetCorp = latestCorpRef.current;
        if (targetCorp && db) {
            deleteDoc(doc(db, "live_streams", targetCorp)).catch(e => console.error(e));
        }
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        setIsBroadcasting(false);
    };

    const sendFrame = async () => {
        if (!videoRef.current || !canvasRef.current || !isBroadcasting || isSendingRef.current || !db) return;
        
        try {
            isSendingRef.current = true;
            const canvas = canvasRef.current;
            const video = videoRef.current;
            if (video.readyState < 2) return;

            const MAX_SIZE = 640;
            let targetWidth = video.videoWidth;
            let targetHeight = video.videoHeight;
            if (targetWidth > MAX_SIZE) {
                targetHeight = Math.round((targetHeight * MAX_SIZE) / targetWidth);
                targetWidth = MAX_SIZE;
            }

            canvas.width = targetWidth;
            canvas.height = targetHeight;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(video, 0, 0, targetWidth, targetHeight);

            const base64Image = canvas.toDataURL('image/jpeg', 0.3);

            await setDoc(doc(db, "live_streams", myCorp), {
                corp: myCorp,
                image: base64Image,
                status: 'LIVE',
                memo: memo,
                timestamp: Date.now()
            });

            countRef.current += 1;
            setSendCount(countRef.current);
        } catch (e) {
            console.error('Frame send error:', e);
        } finally {
            isSendingRef.current = false;
        }
    };

    return (
        <div className="bg-gray-50 p-2 sm:p-4 rounded-3xl min-h-[300px] overflow-y-auto max-h-[70vh]">
            <div className="flex bg-gray-200 p-1 rounded-2xl mb-4">
                <button 
                    onClick={() => { setMode('watch'); stopBroadcast(); }} 
                    className={`flex-1 py-2 text-xs font-black rounded-xl flex items-center justify-center gap-1 transition-all ${mode === 'watch' ? 'bg-white text-primary-600 shadow-md' : 'text-gray-500'}`}
                >
                    <Eye size={16} /> 視聴
                </button>
                <button 
                    onClick={() => setMode('broadcast')} 
                    className={`flex-1 py-2 text-xs font-black rounded-xl flex items-center justify-center gap-1 transition-all ${mode === 'broadcast' ? 'bg-white text-blue-600 shadow-md' : 'text-gray-500'}`}
                >
                    <Video size={16} /> 配信
                </button>
            </div>

            {mode === 'watch' ? (
                <div className="space-y-4">
                    {activeStreams.length === 0 ? (
                        <div className="text-center py-12 text-gray-400 text-sm font-bold">配信中なし</div>
                    ) : (
                        activeStreams.map((s, i) => (
                            <div key={i} className="relative rounded-2xl overflow-hidden bg-black aspect-video border border-gray-100">
                                <div className="absolute top-2 left-2 z-10 flex items-center gap-2">
                                    <span className="bg-black/50 text-white text-[10px] font-black px-2 py-0.5 rounded-full">{s.corp}</span>
                                    <span className="bg-red-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full animate-pulse">LIVE</span>
                                </div>
                                <img src={s.image} alt="Live" className="w-full h-full object-cover" />
                                {s.memo && (
                                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                                        <p className="text-[10px] text-white font-bold">{s.memo}</p>
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            ) : (
                <div className="space-y-4">
                    {errorMsg && <div className="bg-red-50 text-red-600 p-3 rounded-xl text-xs font-bold">{errorMsg}</div>}
                    
                    {!isBroadcasting ? (
                        <div className="space-y-4">
                            <select 
                                className="w-full h-12 border-2 border-gray-200 rounded-xl px-4 text-sm font-bold"
                                value={myCorp} 
                                onChange={e => setMyCorp(e.target.value)}
                            >
                                <option value="">所属分団を選択</option>
                                {corps.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                            <textarea 
                                placeholder="状況メモ" 
                                className="w-full h-20 border-2 border-gray-200 rounded-xl px-4 py-2 text-sm font-bold"
                                value={memo}
                                onChange={e => setMemo(e.target.value)}
                            />
                            <button 
                                className="w-full h-14 bg-blue-600 text-white rounded-xl font-black text-sm shadow-lg" 
                                onClick={startBroadcast} 
                                disabled={isLoading}
                            >
                                {isLoading ? '起動中...' : '配信開始'}
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <button 
                                className="w-full h-14 bg-gray-900 text-white rounded-xl font-black text-sm" 
                                onClick={stopBroadcast}
                            >
                                配信停止
                            </button>
                            <div className="relative rounded-2xl overflow-hidden bg-black aspect-video border-4 border-red-500">
                                <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                                <canvas ref={canvasRef} className="hidden" />
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
