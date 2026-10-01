import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, PhoneCall, PhoneOff, X } from 'lucide-react';

interface VoiceConversationModalProps {
  isOpen: boolean;
  onClose: () => void;
  workflowTitle?: string;
  onTranscriptReceived?: (transcript: string) => void;
}

export const VoiceConversationModal: React.FC<VoiceConversationModalProps> = ({
  isOpen,
  onClose,
  workflowTitle = 'Intake Workflow',
  onTranscriptReceived,
}) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isTalking, setIsTalking] = useState(false);
  const [isAiResponding, setIsAiResponding] = useState(false);
  const [statusText, setStatusText] = useState('Click to start conversation');
  const [audioLevel, setAudioLevel] = useState<number>(0);

  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const playbackContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);

  const pcmToBase64 = (float32Array: Float32Array): string => {
    const l = float32Array.length;
    const int16Array = new Int16Array(l);
    for (let i = 0; i < l; i++) {
      const s = Math.max(-1, Math.min(1, float32Array[i]));
      int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    const bytes = new Uint8Array(int16Array.buffer);
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  };

  const playPcmChunk = (base64Audio: string) => {
    try {
      if (!playbackContextRef.current || playbackContextRef.current.state === 'closed') {
        playbackContextRef.current = new AudioContext({ sampleRate: 24000 });
      }
      const ctx = playbackContextRef.current;
      const binary = atob(base64Audio);
      const len = binary.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      const int16 = new Int16Array(bytes.buffer);
      const float32 = new Float32Array(int16.length);
      for (let i = 0; i < int16.length; i++) {
        float32[i] = int16[i] / 32768.0;
      }

      const audioBuffer = ctx.createBuffer(1, float32.length, 24000);
      audioBuffer.getChannelData(0).set(float32);

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);
      source.start();
    } catch (err) {
      console.warn('PCM audio playback error:', err);
    }
  };

  const startVoice = async () => {
    try {
      setStatusText('Connecting...');
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/api/live`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = async () => {
        setIsConnected(true);
        setStatusText('Requesting microphone access...');

        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          mediaStreamRef.current = stream;

          const audioCtx = new AudioContext({ sampleRate: 16000 });
          audioContextRef.current = audioCtx;

          const source = audioCtx.createMediaStreamSource(stream);
          const processor = audioCtx.createScriptProcessor(4096, 1, 1);
          processorRef.current = processor;

          source.connect(processor);
          processor.connect(audioCtx.destination);

          processor.onaudioprocess = (e) => {
            if (ws.readyState === WebSocket.OPEN) {
              const inputData = e.inputBuffer.getChannelData(0);
              let sum = 0;
              for (let i = 0; i < inputData.length; i++) {
                sum += inputData[i] * inputData[i];
              }
              const rms = Math.sqrt(sum / inputData.length);
              setAudioLevel(Math.min(1, rms * 10));
              setIsTalking(rms > 0.02);

              const base64Pcm = pcmToBase64(inputData);
              ws.send(JSON.stringify({ audio: base64Pcm }));
            }
          };

          setStatusText('Listening · Speak naturally');
        } catch (micErr: any) {
          console.error('Mic access error:', micErr);
          setStatusText('Microphone unavailable or blocked');
        }
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'ready') {
            setStatusText('Gemini Live ready · Start speaking');
          } else if (data.type === 'audio' && data.audio) {
            setIsAiResponding(true);
            playPcmChunk(data.audio);
          } else if (data.type === 'text' && data.text) {
            if (onTranscriptReceived) {
              onTranscriptReceived(data.text);
            }
          } else if (data.type === 'turn_complete') {
            setIsAiResponding(false);
          } else if (data.type === 'error') {
            setStatusText(`Error: ${data.error}`);
          }
        } catch (e) {
          console.error('WS parse error:', e);
        }
      };

      ws.onclose = () => {
        stopVoice();
      };

      ws.onerror = () => {
        setStatusText('Voice server connection failed');
        stopVoice();
      };
    } catch (err: any) {
      setStatusText(err?.message || 'Connection error');
    }
  };

  const stopVoice = () => {
    setIsConnected(false);
    setIsTalking(false);
    setIsAiResponding(false);
    setAudioLevel(0);
    setStatusText('Session ended');

    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    if (playbackContextRef.current) {
      playbackContextRef.current.close().catch(() => {});
      playbackContextRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  };

  useEffect(() => {
    if (!isOpen) {
      stopVoice();
    }
    return () => {
      stopVoice();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-2xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-5 border border-zinc-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
          <div>
            <h3 className="text-xs font-semibold text-zinc-900 tracking-tight">Voice Intake</h3>
            <p className="text-[11px] text-zinc-400 truncate max-w-[220px]">{workflowTitle}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-zinc-400 hover:text-zinc-700"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Minimalist Audio Visualizer */}
        <div className="py-8 flex flex-col items-center justify-center space-y-4">
          <div className="h-10 flex items-center justify-center gap-1">
            {[40, 70, 100, 60, 90, 50, 80].map((h, i) => {
              const activeHeight = isConnected
                ? isAiResponding
                  ? Math.min(36, 12 + ((i * 13 + Date.now() / 40) % 24))
                  : isTalking
                  ? Math.max(8, h * audioLevel * 0.4)
                  : 6
                : 4;
              return (
                <div
                  key={i}
                  className={`w-1 rounded-full transition-all duration-150 ${
                    isAiResponding
                      ? 'bg-zinc-900'
                      : isTalking
                      ? 'bg-zinc-800'
                      : 'bg-zinc-200'
                  }`}
                  style={{ height: `${activeHeight}px` }}
                />
              );
            })}
          </div>

          <div className="text-center space-y-0.5">
            <p className="text-xs font-medium text-zinc-800">{statusText}</p>
            {isConnected && (
              <p className="text-[11px] text-zinc-400">
                {isAiResponding ? 'Gemini is speaking' : isTalking ? 'User speaking' : 'Microphone active'}
              </p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="pt-2 flex justify-center">
          {!isConnected ? (
            <button
              onClick={startVoice}
              className="inline-flex items-center space-x-1.5 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-medium rounded-md transition-colors shadow-2xs"
            >
              <Mic className="w-3.5 h-3.5" />
              <span>Connect Voice</span>
            </button>
          ) : (
            <button
              onClick={stopVoice}
              className="inline-flex items-center space-x-1.5 px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs font-medium rounded-md transition-colors"
            >
              <MicOff className="w-3.5 h-3.5" />
              <span>End Call</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
