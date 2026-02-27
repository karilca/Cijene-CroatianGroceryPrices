import React, { useState, useEffect, useCallback, useRef } from 'react';
import Webcam from 'react-webcam';
import { BrowserMultiFormatReader, NotFoundException } from '@zxing/library';
import { X, Camera, Zap, ZapOff, RefreshCcw } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

interface BarcodeScannerProps {
    onScan: (barcode: string) => void;
    onClose: () => void;
}

interface MediaTrackWithTorch extends MediaTrackCapabilities {
    torch?: boolean;
}

export const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ onScan, onClose }) => {
    const { t } = useLanguage();
    const webcamRef = useRef<Webcam>(null);
    // const [scanned, setScanned] = useState<string | null>(null);
    const [torchOn, setTorchOn] = useState(false);
    const [hasTorch, setHasTorch] = useState(false);
    const [cameraError, setCameraError] = useState<string | null>(null);
    const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');

    // Initialize barcode reader
    const codeReader = useRef(new BrowserMultiFormatReader());

    const videoConstraints = {
        width: { min: 640, ideal: 1280, max: 1920 },
        height: { min: 480, ideal: 720, max: 1080 },
        facingMode: facingMode
    };

    const toggleTorch = async () => {
        if (!webcamRef.current?.video?.srcObject) return;

        const stream = webcamRef.current.video.srcObject as MediaStream;
        const track = stream.getVideoTracks()[0];

        if (track) {
            try {
                await track.applyConstraints({
                    advanced: [{ torch: !torchOn } as unknown as MediaTrackConstraintSet]
                });
                setTorchOn(!torchOn);
            } catch (err) {
                console.error('Torch toggle failed:', err);
            }
        }
    };

    const toggleCamera = () => {
        setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
    };

    const checkTorchCapability = async () => {
        if (!webcamRef.current?.video?.srcObject) return;

        const stream = webcamRef.current.video.srcObject as MediaStream;
        const track = stream.getVideoTracks()[0];

        try {
            const capabilities = track.getCapabilities() as MediaTrackWithTorch;
            if (capabilities.torch) {
                setHasTorch(true);
            }
        } catch (err) {
            console.error('Failed to get track capabilities:', err);
        }
    };

    const capture = useCallback(() => {
        if (!webcamRef.current) return;

        const imageSrc = webcamRef.current.getScreenshot();
        if (imageSrc) {
            try {
                codeReader.current.decodeFromImage(undefined, imageSrc)
                    .then(result => {
                        if (result) {
                            const text = result.getText();
                            if (text) {
                                // setScanned(text);
                                onScan(text);
                                // Vibration feedback if available
                                if (navigator.vibrate) navigator.vibrate(200);
                            }
                        }
                    })
                    .catch((err) => {
                        if (!(err instanceof NotFoundException)) {
                            console.error(err);
                        }
                    });
            } catch (err) {
                console.error("Decode error", err);
            }
        }
    }, [onScan]);

    useEffect(() => {
        const interval = setInterval(capture, 500); // Scan every 500ms
        return () => clearInterval(interval);
    }, [capture]);

    useEffect(() => {
        // Check for torch capability once the stream is ready
        if (webcamRef.current?.video?.readyState === 4) {
            checkTorchCapability();
        }
    }, [webcamRef.current?.video?.readyState]);

    return (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-90 flex flex-col items-center justify-center p-4">
            <div className="relative w-full max-w-lg bg-black rounded-lg overflow-hidden shadow-2xl">
                {/* Header with controls */}
                <div className="absolute top-0 left-0 right-0 z-10 flex justify-between items-center p-4 bg-gradient-to-b from-black/70 to-transparent">
                    <div className="text-white font-medium flex items-center gap-2">
                        <Camera className="h-5 w-5" />
                        <span>{t('scanner.title')}</span>
                    </div>
                    <button onClick={onClose} className="text-white p-2 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm transition-colors">
                        <X className="h-6 w-6" />
                    </button>
                </div>

                {/* Camera View */}
                <div className="relative aspect-[3/4] sm:aspect-video bg-gray-900 w-full overflow-hidden">
                    {cameraError ? (
                        <div className="absolute inset-0 flex items-center justify-center text-white text-center p-6">
                            <p>{cameraError}</p>
                        </div>
                    ) : (
                        <>
                            <Webcam
                                audio={false}
                                ref={webcamRef}
                                screenshotFormat="image/jpeg"
                                videoConstraints={videoConstraints}
                                onUserMedia={() => checkTorchCapability()}
                                onUserMediaError={() => setCameraError(t('scanner.error.camera'))}
                                className="absolute inset-0 w-full h-full object-cover"
                            />

                            {/* Scan Area Overlay */}
                            <div className="absolute inset-0 border-2 border-white/30 m-8 sm:m-12 rounded-lg pointer-events-none">
                                <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-primary-500 rounded-tl-lg -mt-1 -ml-1"></div>
                                <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-primary-500 rounded-tr-lg -mt-1 -mr-1"></div>
                                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-primary-500 rounded-bl-lg -mb-1 -ml-1"></div>
                                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-primary-500 rounded-br-lg -mb-1 -mr-1"></div>

                                {/* Scanning line animation */}
                                <div className="absolute left-0 right-0 h-0.5 bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)] animate-[scan_2s_ease-in-out_infinite] top-1/2"></div>
                            </div>
                        </>
                    )}
                </div>

                {/* Footer Controls */}
                <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent flex justify-center gap-6">
                    {hasTorch && (
                        <button
                            onClick={toggleTorch}
                            className={`p-4 rounded-full backdrop-blur-md transition-all ${torchOn ? 'bg-yellow-500 text-black' : 'bg-white/20 text-white hover:bg-white/30'}`}
                        >
                            {torchOn ? <Zap className="h-6 w-6 fill-current" /> : <ZapOff className="h-6 w-6" />}
                        </button>
                    )}

                    <button
                        onClick={toggleCamera}
                        className="p-4 rounded-full bg-white/20 text-white hover:bg-white/30 backdrop-blur-md transition-all"
                    >
                        <RefreshCcw className="h-6 w-6" />
                    </button>
                </div>
            </div>
            <p className="text-white/70 mt-4 text-center text-sm px-4">
                {t('scanner.hint')}
            </p>

            <style>{`
                @keyframes scan {
                    0%, 100% { top: 10%; opacity: 0; }
                    10% { opacity: 1; }
                    50% { top: 90%; }
                    90% { opacity: 1; }
                }
            `}</style>
        </div>
    );
};
