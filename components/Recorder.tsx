import React, { useState, useRef, useEffect, useCallback } from 'react';
import { MicIcon, StopIcon } from './Icons';

interface RecorderProps {
  onRecordingComplete: (blob: Blob, duration: number) => void;
  isProcessing: boolean;
}

const Recorder: React.FC<RecorderProps> = ({ onRecordingComplete, isProcessing }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const requestRef = useRef<number>();
  const startTimeRef = useRef<number>(0);
  const timerRef = useRef<number>();

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      mediaRecorderRef.current = new MediaRecorder(stream);
      chunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' }); // webm is standard for MediaRecorder
        const finalDuration = (Date.now() - startTimeRef.current) / 1000;
        onRecordingComplete(blob, finalDuration);
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
        
        // Clean up visualizer
        if (audioContextRef.current) {
          audioContextRef.current.close();
          audioContextRef.current = null;
        }
        if (requestRef.current) {
          cancelAnimationFrame(requestRef.current);
        }
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      startTimeRef.current = Date.now();
      
      // Start Timer
      setDuration(0);
      timerRef.current = window.setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);

      // Setup Visualizer
      setupVisualizer(stream);

    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("Could not access microphone. Please check permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const setupVisualizer = (stream: MediaStream) => {
    if (!canvasRef.current) return;

    audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    const source = audioContextRef.current.createMediaStreamSource(stream);
    analyserRef.current = audioContextRef.current.createAnalyser();
    analyserRef.current.fftSize = 256;
    source.connect(analyserRef.current);

    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    const draw = () => {
      if (!analyserRef.current) return;
      
      requestRef.current = requestAnimationFrame(draw);
      analyserRef.current.getByteFrequencyData(dataArray);

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const barWidth = (canvas.width / bufferLength) * 2.5;
      let barHeight;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        barHeight = dataArray[i] / 2;

        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        gradient.addColorStop(0, '#0ea5e9'); // Sky 500
        gradient.addColorStop(1, '#6366f1'); // Indigo 500

        ctx.fillStyle = gradient;
        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);

        x += barWidth + 1;
      }
    };

    draw();
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      if (audioContextRef.current) audioContextRef.current.close();
    };
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  if (isProcessing) {
    return (
       <div className="w-full h-64 flex flex-col items-center justify-center bg-white rounded-2xl border border-slate-100 shadow-xl overflow-hidden relative">
          <div className="absolute inset-0 bg-slate-50/50 flex items-center justify-center">
             <div className="flex flex-col items-center gap-4 animate-pulse">
               <div className="h-12 w-12 rounded-full border-4 border-t-brand-500 border-slate-200 animate-spin"></div>
               <p className="text-slate-600 font-medium">Processing with Gemini...</p>
             </div>
          </div>
       </div>
    )
  }

  return (
    <div className="w-full flex flex-col items-center bg-white rounded-2xl border border-slate-100 shadow-xl overflow-hidden transition-all duration-300">
      
      {/* Visualizer Area */}
      <div className="w-full h-40 bg-slate-900 relative flex items-center justify-center overflow-hidden">
        <canvas 
          ref={canvasRef} 
          width={600} 
          height={160} 
          className="absolute inset-0 w-full h-full opacity-80"
        />
        {!isRecording && duration === 0 && (
           <p className="text-slate-400 relative z-10 font-light">Ready to record</p>
        )}
        {isRecording && (
          <div className="absolute top-4 right-4 flex items-center gap-2 bg-red-500/10 px-3 py-1 rounded-full border border-red-500/20 backdrop-blur-sm z-20">
             <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
             <span className="text-red-500 text-xs font-mono font-bold">REC</span>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="w-full p-6 flex flex-col items-center gap-4">
        <div className="text-4xl font-mono font-medium text-slate-700">
          {formatTime(duration)}
        </div>

        <div className="flex gap-4 items-center">
          {!isRecording ? (
            <button
              onClick={startRecording}
              className="group relative flex items-center justify-center w-16 h-16 rounded-full bg-brand-600 hover:bg-brand-500 text-white shadow-lg hover:shadow-brand-500/30 transition-all transform hover:scale-105 active:scale-95"
            >
              <MicIcon className="w-8 h-8" />
              <span className="absolute -bottom-8 text-xs text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">Record</span>
            </button>
          ) : (
            <button
              onClick={stopRecording}
              className="group relative flex items-center justify-center w-16 h-16 rounded-full bg-red-500 hover:bg-red-400 text-white shadow-lg hover:shadow-red-500/30 transition-all transform hover:scale-105 active:scale-95"
            >
              <StopIcon className="w-8 h-8" />
              <span className="absolute -bottom-8 text-xs text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">Stop</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Recorder;