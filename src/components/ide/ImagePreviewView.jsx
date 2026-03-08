import React, { useState, useEffect, useRef } from 'react';
import { ZoomIn, ZoomOut, Maximize, ArrowLeft, ArrowRight, X } from 'lucide-react';

export default function ImagePreviewView({ file }) {
    // file.content is expected to be a JSON string of { images: [...], currentIndex: 0 }
    // or just handling file.images directly if we pass it that way.
    // For safety, let's parse file.content
    const [images, setImages] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [scale, setScale] = useState(1);
    const [isDragging, setIsDragging] = useState(false);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const startPos = useRef({ x: 0, y: 0 });

    useEffect(() => {
        try {
            const data = JSON.parse(file.content);
            setImages(data.images || []);
            setCurrentIndex(data.currentIndex || 0);
        } catch (e) {
            // Fallback if not JSON
            setImages([{ name: file.name, dataUrl: file.content }]);
            setCurrentIndex(0);
        }
        // Reset zoom when file changes
        setScale(1);
        setPosition({ x: 0, y: 0 });
    }, [file]);

    const handleZoomIn = () => setScale(s => Math.min(s + 0.25, 4));
    const handleZoomOut = () => setScale(s => Math.max(s - 0.25, 0.25));
    const handleReset = () => { setScale(1); setPosition({ x: 0, y: 0 }); };

    const handlePrev = () => {
        setCurrentIndex(i => Math.max(0, i - 1));
        handleReset();
    };
    const handleNext = () => {
        setCurrentIndex(i => Math.min(images.length - 1, i + 1));
        handleReset();
    };

    const handleWheel = (e) => {
        if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            if (e.deltaY < 0) handleZoomIn();
            else handleZoomOut();
        }
    };

    const currentImage = images[currentIndex];

    if (!currentImage) return <div className="p-8 text-center text-gray-400">No image to display</div>;

    return (
        <div
            className="flex flex-col h-full bg-[#1e1e1e] overflow-hidden"
            onWheel={handleWheel}
        >
            {/* Toolbar */}
            <div className="flex items-center justify-between p-2 border-b border-[#2e2e2e] bg-[#252526]">
                <div className="flex items-center gap-4 text-sm text-gray-300">
                    <span className="font-semibold">{currentImage.name}</span>
                    {images.length > 1 && (
                        <span className="text-gray-500 bg-[#333] px-2 py-0.5 rounded text-xs">
                            {currentIndex + 1} / {images.length}
                        </span>
                    )}
                    <span className="text-gray-500 text-xs">{(scale * 100).toFixed(0)}%</span>
                </div>
                <div className="flex items-center gap-2">
                    {images.length > 1 && (
                        <>
                            <button
                                onClick={handlePrev}
                                disabled={currentIndex === 0}
                                className="p-1.5 hover:bg-[#3c3c3c] rounded disabled:opacity-30"
                                title="Previous Image"
                            >
                                <ArrowLeft size={16} />
                            </button>
                            <button
                                onClick={handleNext}
                                disabled={currentIndex === images.length - 1}
                                className="p-1.5 hover:bg-[#3c3c3c] rounded disabled:opacity-30"
                                title="Next Image"
                            >
                                <ArrowRight size={16} />
                            </button>
                            <div className="w-px h-5 bg-[#3c3c3c] mx-2"></div>
                        </>
                    )}
                    <button onClick={handleZoomOut} className="p-1.5 hover:bg-[#3c3c3c] rounded text-gray-300" title="Zoom Out">
                        <ZoomOut size={16} />
                    </button>
                    <button onClick={handleReset} className="p-1.5 hover:bg-[#3c3c3c] rounded text-gray-300" title="Reset Zoom">
                        <Maximize size={16} />
                    </button>
                    <button onClick={handleZoomIn} className="p-1.5 hover:bg-[#3c3c3c] rounded text-gray-300" title="Zoom In">
                        <ZoomIn size={16} />
                    </button>
                </div>
            </div>

            {/* Image Container */}
            <div
                className="flex-1 relative overflow-auto flex items-center justify-center cursor-move"
                onMouseDown={e => {
                    e.preventDefault();
                    setIsDragging(true);
                    startPos.current = { x: e.clientX - position.x, y: e.clientY - position.y };
                }}
                onMouseMove={e => {
                    if (!isDragging) return;
                    setPosition({ x: e.clientX - startPos.current.x, y: e.clientY - startPos.current.y });
                }}
                onMouseUp={() => setIsDragging(false)}
                onMouseLeave={() => setIsDragging(false)}
            >
                <img
                    src={currentImage.dataUrl}
                    alt={currentImage.name}
                    style={{
                        transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                        transition: isDragging ? 'none' : 'transform 0.1s ease-out',
                        transformOrigin: 'center center',
                        maxWidth: '100%',
                        maxHeight: '100%',
                        objectFit: 'contain',
                        pointerEvents: 'none' // Let container handle dragging
                    }}
                />
            </div>
        </div>
    );
}
