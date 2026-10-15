import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Trash2, Play, Pause, Upload, RotateCcw, AlertCircle, Volume2 } from 'lucide-react';

interface VoiceRecorderProps {
  audioData: string | null;
  onChange: (audioData: string | null) => void;
  disabled?: boolean;
}

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({
  audioData,
  onChange,
  disabled = false
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordingError, setRecordingError] = useState<string | null>(null);
  const [mode, setMode] = useState<'record' | 'upload'>('record');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    return () => {
      // Cleanup streams and timers on unmount
      if (timerRef.current) clearInterval(timerRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const startRecording = async () => {
    setRecordingError(null);
    audioChunksRef.current = [];

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setRecordingError('Microphone recording is not supported on this browser. Please use the upload option.');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Determine supported mime type
      const mimeTypes = ['audio/webm', 'audio/mp4', 'audio/ogg', 'audio/wav'];
      let selectedMimeType = '';
      for (const mime of mimeTypes) {
        if (MediaRecorder.isTypeSupported(mime)) {
          selectedMimeType = mime;
          break;
        }
      }

      const options = selectedMimeType ? { mimeType: selectedMimeType } : undefined;
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const mime = selectedMimeType || 'audio/webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: mime });
        
        // Convert to base64 DataURL for payload persistence
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64Data = reader.result as string;
          onChange(base64Data);
        };
        reader.readAsDataURL(audioBlob);

        // Stop all tracks
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
      };

      mediaRecorder.start(200); // 200ms slice
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          if (prev >= 300) { // Max 5 minutes
            stopRecording();
            return 300;
          }
          return prev + 1;
        });
      }, 1000);

    } catch (err: any) {
      console.error('Microphone access error:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setRecordingError('Microphone permission was denied. Please allow microphone access in your browser or upload an audio file.');
      } else {
        setRecordingError(`Could not start recording: ${err.message || 'Microphone unavailable'}. Please use the upload option.`);
      }
    }
  };

  const stopRecording = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setRecordingError(null);

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setRecordingError('Audio file exceeds 10MB size limit. Please upload a smaller recording.');
      return;
    }

    // Validate audio format
    const validTypes = ['audio/mp3', 'audio/mpeg', 'audio/mp4', 'audio/m4a', 'audio/x-m4a', 'audio/webm', 'audio/wav', 'audio/ogg', 'audio/aac'];
    if (!validTypes.some(type => file.type.includes(type) || file.name.match(/\.(mp3|m4a|webm|wav|ogg|aac)$/i))) {
      setRecordingError('Invalid audio file format. Please upload MP3, M4A, WEBM, WAV, or AAC.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      onChange(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleDeleteAudio = () => {
    if (isPlaying && audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      setIsPlaying(false);
    }
    onChange(null);
    setRecordingTime(0);
    setRecordingError(null);
  };

  const togglePlayback = () => {
    if (!audioPlayerRef.current) return;
    if (isPlaying) {
      audioPlayerRef.current.pause();
      setIsPlaying(false);
    } else {
      audioPlayerRef.current.play();
      setIsPlaying(true);
    }
  };

  return (
    <div className="space-y-3">
      {/* Header & Tabs */}
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
          <Volume2 className="w-4 h-4 text-amber-600" />
          <span>Audio Voice Note <span className="text-slate-400 font-normal">(Optional)</span></span>
        </label>
        {!audioData && !isRecording && (
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-[11px] font-semibold">
            <button
              type="button"
              onClick={() => { setMode('record'); setRecordingError(null); }}
              className={`px-2.5 py-1 rounded-md transition-all ${mode === 'record' ? 'bg-white text-amber-700 shadow-2xs font-bold' : 'text-slate-500 hover:text-slate-800'}`}
            >
              Record Mic
            </button>
            <button
              type="button"
              onClick={() => { setMode('upload'); setRecordingError(null); }}
              className={`px-2.5 py-1 rounded-md transition-all ${mode === 'upload' ? 'bg-white text-amber-700 shadow-2xs font-bold' : 'text-slate-500 hover:text-slate-800'}`}
            >
              Upload File
            </button>
          </div>
        )}
      </div>

      {/* Error Message */}
      {recordingError && (
        <div className="flex items-start gap-2 p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{recordingError}</span>
        </div>
      )}

      {/* State 1: Audio Exists (Playback Preview & Controls) */}
      {audioData ? (
        <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={togglePlayback}
              disabled={disabled}
              className="w-10 h-10 rounded-full bg-amber-600 hover:bg-amber-700 text-white flex items-center justify-center shrink-0 shadow-sm transition-all"
            >
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
            </button>
            <div className="flex-1">
              <p className="text-xs font-bold text-slate-800">Voice Note Attached</p>
              <p className="text-[11px] text-amber-800 font-medium">Ready for submission</p>
            </div>
          </div>

          <audio
            ref={audioPlayerRef}
            src={audioData}
            onEnded={() => setIsPlaying(false)}
            onPause={() => setIsPlaying(false)}
            className="hidden"
          />

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={handleDeleteAudio}
              disabled={disabled}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100 rounded-xl border border-rose-200 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Remove</span>
            </button>
          </div>
        </div>
      ) : isRecording ? (
        /* State 2: Active Recording In Progress */
        <div className="p-4 bg-rose-50 border-2 border-rose-400 border-dashed rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="relative">
              <span className="w-4 h-4 bg-rose-600 rounded-full block animate-ping absolute"></span>
              <span className="w-4 h-4 bg-rose-600 rounded-full block relative"></span>
            </div>
            <div>
              <p className="text-xs font-extrabold text-rose-800 uppercase tracking-wider">Recording in progress...</p>
              <p className="text-xl font-black text-rose-900 font-mono">{formatTime(recordingTime)}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={stopRecording}
              className="inline-flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-md transition-all"
            >
              <Square className="w-4 h-4 fill-white" />
              <span>Stop & Save</span>
            </button>
          </div>
        </div>
      ) : mode === 'record' ? (
        /* State 3: Ready to Record via Microphone */
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-center">
          <button
            type="button"
            onClick={startRecording}
            disabled={disabled}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all transform active:scale-98 disabled:opacity-50"
          >
            <Mic className="w-4 h-4" />
            <span>Tap to Record Voice Note</span>
          </button>
          <p className="text-[11px] text-slate-500 mt-2">
            Record verbal feedback or observations (up to 5 mins)
          </p>
        </div>
      ) : (
        /* State 4: Upload Audio File */
        <div className="p-4 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl text-center">
          <label className="cursor-pointer inline-flex flex-col items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-bold text-amber-700 underline">Select Audio File</span>
              <p className="text-[11px] text-slate-500 mt-0.5">MP3, M4A, WEBM, WAV (Max 10 MB)</p>
            </div>
            <input
              type="file"
              accept="audio/*,.mp3,.m4a,.webm,.wav,.aac"
              onChange={handleFileUpload}
              disabled={disabled}
              className="hidden"
            />
          </label>
        </div>
      )}
    </div>
  );
};

export default VoiceRecorder;
