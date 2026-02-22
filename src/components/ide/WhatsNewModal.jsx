import React from 'react';
import { X, Sparkles, Zap, LayoutTemplate, Github } from 'lucide-react';

export default function WhatsNewModal({ isOpen, onClose }) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
            {/* Liquid Glass Container */}
            <div
                className="w-full max-w-2xl bg-white/10 backdrop-filter backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl overflow-hidden text-white relative flex flex-col max-h-[80vh]"
                style={{ boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)' }}
            >

                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-white/10 bg-white/5">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-500/20 rounded-lg">
                            <Sparkles className="text-blue-400" size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-blue-200">
                                What's New
                            </h2>
                            <p className="text-xs text-blue-200/70 uppercase tracking-widest font-semibold">
                                Version 1.2.0 • January 2026
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/70 hover:text-white"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content - Scrollable */}
                <div className="p-8 overflow-y-auto space-y-8 custom-scrollbar">

                    {/* Feature 1 */}
                    <div className="flex gap-4">
                        <div className="mt-1">
                            <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center border border-purple-500/30">
                                <Zap size={20} className="text-purple-300" />
                            </div>
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-white mb-1">AI Agents Integration</h3>
                            <p className="text-white/70 leading-relaxed text-sm">
                                Unlock the power of autonomous coding with our new Agentic Mode.
                                Press <kbd className="bg-white/10 px-1.5 py-0.5 rounded text-white text-xs">Ctrl+I</kbd> to summon the agent context-aware assistance.
                            </p>
                        </div>
                    </div>

                    {/* Feature 2 */}
                    <div className="flex gap-4">
                        <div className="mt-1">
                            <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center border border-blue-500/30">
                                <LayoutTemplate size={20} className="text-blue-300" />
                            </div>
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-white mb-1">Glassmorphism UI Upgrade</h3>
                            <p className="text-white/70 leading-relaxed text-sm">
                                Experience a completely redesigned interface featuring MacOS-inspired glass sidebars,
                                blurry transparent panels, and sleek neomorphism accents.
                            </p>
                        </div>
                    </div>

                    {/* Feature 3 */}
                    <div className="flex gap-4">
                        <div className="mt-1">
                            <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center border border-green-500/30">
                                <Github size={20} className="text-green-300" />
                            </div>
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-white mb-1">Enhanced Git & Sidebar</h3>
                            <p className="text-white/70 leading-relaxed text-sm">
                                New fluid sidebar icons, transparent backgrounds, and improved source control visualization.
                                Your workspace matches the beauty of your code.
                            </p>
                        </div>
                    </div>

                </div>

                {/* Footer */}
                <div className="p-6 bg-white/5 border-t border-white/10 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 bg-[#007acc] hover:bg-[#0063a5] text-white font-medium rounded-lg shadow-lg hover:shadow-blue-500/20 transition-all active:scale-95"
                    >
                        Got it
                    </button>
                </div>

            </div>
        </div>
    );
}
