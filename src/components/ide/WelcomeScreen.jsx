import React from "react";
import { FilePlus, FolderOpen, GitBranch, Settings, Command, Sparkles } from "lucide-react";

export default function WelcomeScreen({
    onOpenFolder,
    onCreateFile,
    onOpenRecent,
    recentProjects = [],
    onOpenSettings,
    onOpenCommandPalette,
    onOpenDocs,
    onOpenWhatsNew
}) {
    return (
        <div className="flex-1 h-full bg-gradient-to-br from-[#0e1116] via-[#1b1f27] to-[#0e1116] text-white overflow-y-auto">
            <div className="max-w-6xl mx-auto px-10 py-20 grid grid-cols-1 lg:grid-cols-2 gap-20">

                {/* LEFT */}
                <div className="space-y-12">
                    {/* Logo / Brand */}
                    <div className="space-y-4">
                        <div className="flex items-end gap-4">
                            {/* Hex logo with Command symbol */}
                            <div
                                className="w-16 h-16 shrink-0 relative"
                                style={{
                                    clipPath: "polygon(25% 6%, 75% 6%, 100% 50%, 75% 94%, 25% 94%, 0% 50%)",
                                }}
                            >
                                {/* Hex border */}
                                <div
                                    className="absolute inset-0 bg-gradient-to-br from-[#4fc3ff] to-[#007acc]"
                                    style={{ clipPath: "polygon(25% 6%, 75% 6%, 100% 50%, 75% 94%, 25% 94%, 0% 50%)" }}
                                />
                                {/* Inner hex */}
                                <div
                                    className="absolute inset-[3px] bg-[#0e1116] flex items-center justify-center"
                                    style={{ clipPath: "polygon(25% 6%, 75% 6%, 100% 50%, 75% 94%, 25% 94%, 0% 50%)" }}
                                >
                                    <span className="text-3xl font-thin text-[#4fc3ff]">⌘</span>
                                </div>
                            </div>

                            {/* Brand Text */}
                            <h1 className="text-5xl font-light leading-none">
                                <span className="inline-block italic tracking-[0.15em] bg-clip-text text-transparent bg-gradient-to-r from-white to-[#cfefff]">
                                    Dev
                                </span>
                                <span className="inline-block mx-1 font-semibold tracking-tight relative">
                                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-white via-[#dbefff] to-white">
                                        Studio
                                    </span>
                                    <span className="absolute -bottom-1 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-[#4fc3ff] to-transparent opacity-70" />
                                </span>
                                <span className="inline-block font-black italic tracking-wide text-[#4fc3ff]">
                                    AI
                                </span>
                            </h1>
                        </div>

                        <p className="text-[#9da5b4] max-w-md">
                            Your intelligent development workspace — build, explore, and ship faster with agent-powered coding.
                        </p>
                    </div>

                    {/* Primary Actions */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <ActionCard icon={FilePlus} title="New File" desc="Start coding from scratch" onClick={onCreateFile} />
                        <ActionCard icon={FolderOpen} title="Open Folder" desc="Open an existing project" onClick={onOpenFolder} />
                        <ActionCard icon={GitBranch} title="Clone Repo" desc="Coming soon" disabled />
                        <ActionCard icon={Settings} title="Settings" desc="Customize your setup" onClick={onOpenSettings} />
                    </div>

                    {/* Recent */}
                    {recentProjects.length > 0 && (
                        <div>
                            <h2 className="text-lg mb-3 text-[#c9d1d9]">Recent Projects</h2>
                            <div className="space-y-2">
                                {recentProjects.map((path, i) => (
                                    <button
                                        key={i}
                                        onClick={() => onOpenRecent(path)}
                                        className="w-full text-left px-4 py-3 rounded-xl bg-[#161b22] hover:bg-[#1f2630] transition"
                                    >
                                        <div className="text-sm font-medium text-[#4fc3ff] truncate">
                                            {path.split("\\").pop().split("/").pop()}
                                        </div>
                                        <div className="text-xs text-[#8b949e] truncate">{path}</div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* RIGHT */}
                <div className="space-y-10">
                    {/* Walkthrough */}
                    <div className="relative rounded-2xl p-8 bg-gradient-to-br from-[#1e2430] to-[#141821] border border-white/10 shadow-2xl">
                        <span className="absolute top-4 right-4 text-xs bg-[#4fc3ff] text-black px-2 py-0.5 rounded-full">
                            New
                        </span>
                        <h3 className="text-xl font-semibold mb-2">AI-Powered Walkthrough</h3>
                        <p className="text-sm text-[#b6c0d1] mb-6">
                            Learn how to unlock the full potential of DevStudio AI — agents, commands, and smart workflows.
                        </p>
                        <button
                            onClick={onOpenSettings}
                            className="inline-flex items-center gap-2 text-sm font-medium text-[#4fc3ff] hover:underline"
                        >
                            Start Setup <span>→</span>
                        </button>
                    </div>

                    {/* Help */}
                    <div className="space-y-3">
                        <h2 className="text-lg text-[#c9d1d9]">Help & Resources</h2>
                        <HelpItem icon={Command} label="Command Palette" onClick={onOpenCommandPalette} />
                        <HelpItem icon={Settings} label="Documentation" onClick={onOpenDocs} />
                        <HelpItem icon={Sparkles} label="What’s New" onClick={onOpenWhatsNew} />
                    </div>

                    {/* Tip */}
                    <div className="pt-6 border-t border-white/10">
                        <h4 className="text-sm text-[#9da5b4] mb-2">Tip of the Day</h4>
                        <p className="text-xs text-[#8b949e]">
                            Press <kbd className="px-1 rounded bg-white/10 text-white">Ctrl</kbd> +
                            <kbd className="px-1 rounded bg-white/10 text-white ml-1 text-xs">I</kbd> to activate AI Agent mode instantly.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

function ActionCard({ icon: Icon, title, desc, onClick, disabled }) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={`group rounded-2xl p-5 text-left transition shadow-lg border border-white/10
      ${disabled
                    ? "opacity-50 cursor-not-allowed bg-[#161b22]"
                    : "bg-[#161b22] hover:bg-[#1f2630]"}`}
        >
            <Icon size={22} className="mb-3 text-[#4fc3ff]" />
            <div className="font-medium">{title}</div>
            <div className="text-xs text-[#8b949e] mt-1">{desc}</div>
        </button>
    );
}

function HelpItem({ icon: Icon, label, onClick }) {
    return (
        <button onClick={onClick} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 transition text-sm w-full text-left">
            <Icon size={16} className="text-[#4fc3ff]" />
            <span>{label}</span>
        </button>
    );
}
