import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Loader2, Sparkles, X } from 'lucide-react';
import { analyzeItemAudio } from '../services/geminiService';
import { Item } from '../types';

interface VoiceInputProps {
    onItemParsed: (item: Partial<Item>) => void;
}

export const VoiceInput: React.FC<VoiceInputProps> = ({ onItemParsed }) => {
    const [isRecording, setIsRecording] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [visuals, setVisuals] = useState<number[]>(new Array(5).fill(20));

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const animationFrameRef = useRef<number>();
    const analyserRef = useRef<AnalyserNode | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);

    const startRecording = async () => {
        try {
            setError(null);
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

            // Audio Visualization Setup
            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            const analyser = audioContext.createAnalyser();
            const source = audioContext.createMediaStreamSource(stream);
            source.connect(analyser);
            analyser.fftSize = 32;
            analyserRef.current = analyser;
            audioContextRef.current = audioContext;

            visualize();

            // Media Recorder Setup
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                audioChunksRef.current.push(event.data);
            };

            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/mp3' });
                await processAudio(audioBlob);

                // Cleanup
                stream.getTracks().forEach(track => track.stop());
                if (audioContextRef.current) {
                    audioContextRef.current.close();
                }
                cancelAnimationFrame(animationFrameRef.current!);
            };

            mediaRecorder.start();
            setIsRecording(true);
        } catch (err) {
            console.error("Error accessing microphone:", err);
            setError("Could not access microphone.");
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            setIsProcessing(true);
        }
    };

    const visualize = () => {
        if (!analyserRef.current) return;

        const bufferLength = analyserRef.current.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyserRef.current.getByteFrequencyData(dataArray);

        // Pick 5 relevant frequencies for simple visualization
        const newVisuals = [
            dataArray[0],
            dataArray[2],
            dataArray[4],
            dataArray[6],
            dataArray[8]
        ].map(v => Math.max(20, v / 2)); // Normalize height

        setVisuals(newVisuals);
        animationFrameRef.current = requestAnimationFrame(visualize);
    };

    const processAudio = async (blob: Blob) => {
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = async () => {
            try {
                const base64Audio = reader.result as string;
                const result = await analyzeItemAudio(base64Audio);
                onItemParsed({
                    name: result.name,
                    description: result.description,
                    material: result.material,
                    color: result.color
                });
            } catch (err) {
                console.error("Error analyzing audio:", err);
                setError("Failed to analyze audio. Check API Key or try again.");
            } finally {
                setIsProcessing(false);
            }
        };
        // Handle sync errors in reader
        reader.onerror = () => {
            console.error("Reader error");
            setError("Failed to read audio file.");
            setIsProcessing(false);
        };
    };

    return (
        <div className="mb-6">
            {error && (
                <div className="mb-2 p-3 bg-red-50 text-red-600 rounded-lg text-sm flex justify-between items-center">
                    {error}
                    <button onClick={() => setError(null)}><X size={16} /></button>
                </div>
            )}

            <div className="flex items-center gap-3">
                <button
                    onClick={isRecording ? stopRecording : startRecording}
                    disabled={isProcessing}
                    className={`flex-none w-14 h-14 rounded-full flex items-center justify-center transition-all ${isRecording
                        ? 'bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/30'
                        : isProcessing
                            ? 'bg-gray-100 cursor-not-allowed'
                            : 'bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-500/30'
                        }`}
                >
                    {isProcessing ? (
                        <Loader2 className="animate-spin text-gray-500" size={24} />
                    ) : isRecording ? (
                        <Square className="text-white fill-current" size={20} />
                    ) : (
                        <Mic className="text-white" size={24} />
                    )}
                </button>

                <div className="flex-1 bg-gray-50 dark:bg-gray-900 rounded-2xl h-14 border border-gray-200 dark:border-gray-800 flex items-center justify-center px-4 relative overflow-hidden">
                    {isRecording ? (
                        <div className="flex items-center gap-1 h-full">
                            {visuals.map((height, i) => (
                                <div
                                    key={i}
                                    className="w-2 bg-indigo-500 rounded-full transition-all duration-75"
                                    style={{ height: `${height}%` }}
                                />
                            ))}
                        </div>
                    ) : isProcessing ? (
                        <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 text-sm font-medium animate-pulse">
                            <Sparkles size={16} />
                            <span>Analyzing with Gemini...</span>
                        </div>
                    ) : (
                        <div className="text-gray-400 text-sm">
                            Tap microphone to describe item...
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
