import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'http';

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

export function setupGeminiLiveWebSocket(server: Server) {
  const wss = new WebSocketServer({ server, path: '/api/live' });

  wss.on('connection', async (clientWs: WebSocket) => {
    console.log('[Live API] Client connected for voice conversation');

    let geminiSession: any = null;

    try {
      if (!process.env.GEMINI_API_KEY) {
        clientWs.send(JSON.stringify({
          type: 'error',
          error: 'GEMINI_API_KEY not configured on server',
        }));
        return;
      }

      geminiSession = await ai.live.connect({
        model: 'gemini-3.8-live',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Zephyr' },
            },
          },
          systemInstruction: `You are the CollectAI Intelligent Voice Intake Assistant.
Your job is to speak warmly, naturally, and concisely with users to collect information for their request (such as a restaurant food order or citizen service application).
Keep spoken responses short (1-2 sentences maximum), friendly, and conversational.
Clarify details such as item quantities, delivery addresses, phone numbers, or applicant names.`,
        },
        callbacks: {
          onmessage: (message: LiveServerMessage) => {
            const audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            const text = message.serverContent?.modelTurn?.parts?.[0]?.text;

            if (audio) {
              clientWs.send(JSON.stringify({ type: 'audio', audio }));
            }
            if (text) {
              clientWs.send(JSON.stringify({ type: 'text', text }));
            }
            if (message.serverContent?.turnComplete) {
              clientWs.send(JSON.stringify({ type: 'turn_complete' }));
            }
            if (message.serverContent?.interrupted) {
              clientWs.send(JSON.stringify({ type: 'interrupted' }));
            }
          },
          onclose: () => {
            console.log('[Live API] Gemini Live connection closed');
          },
          onerror: (err) => {
            console.error('[Live API] Gemini Live error:', err);
            clientWs.send(JSON.stringify({ type: 'error', error: String(err) }));
          },
        },
      });

      clientWs.send(JSON.stringify({ type: 'ready', message: 'Gemini 3.8 Live Voice Session Ready' }));

      clientWs.on('message', async (data: Buffer | string) => {
        try {
          const parsed = JSON.parse(data.toString());
          if (parsed.audio) {
            // Send Realtime Audio input to Gemini 3.8 Live
            geminiSession.sendRealtimeInput({
              audio: {
                data: parsed.audio,
                mimeType: 'audio/pcm;rate=16000',
              },
            });
          } else if (parsed.text) {
            // Text fallback / context injection
            geminiSession.sendClientContent({
              turns: [
                {
                  role: 'user',
                  parts: [{ text: parsed.text }],
                },
              ],
              turnComplete: true,
            });
          }
        } catch (e) {
          console.error('[Live API] Client message parse error:', e);
        }
      });

      clientWs.on('close', () => {
        console.log('[Live API] Client disconnected');
      });
    } catch (err: any) {
      console.error('[Live API] Failed to connect to Gemini Live:', err);
      clientWs.send(JSON.stringify({
        type: 'error',
        error: err?.message || 'Failed to start Live Voice session',
      }));
    }
  });

  return wss;
}
