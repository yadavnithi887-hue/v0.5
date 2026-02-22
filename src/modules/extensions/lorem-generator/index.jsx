import React, { useState } from 'react';
import { AlignLeft, Copy } from 'lucide-react';

export const metadata = {
    id: 'devstudio.lorem-generator',
    name: 'Lorem Generator',
    version: '1.0.0',
    description: 'Generate placeholder text.',
    author: 'DevStudio Team',
    icon: 'AlignLeft',
    readme: `
# Lorem Generator

## Features
- Generate words or paragraphs
- Copy to clipboard
`
};

export const settings = [
    {
        id: 'lorem.defaultCount',
        label: 'Default Count',
        type: 'number',
        default: 5,
        description: 'Default number of items to generate',
        section: 'extensions',
        extensionId: metadata.id
    }
];

const LOREM_TEXT = "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.";

const LoremPanel = ({ context }) => {
    const [count, setCount] = useState(3);
    const [type, setType] = useState('paragraphs');
    const [result, setResult] = useState('');

    const generate = () => {
        let text = [];
        for (let i = 0; i < count; i++) {
            text.push(LOREM_TEXT);
        }
        const final = text.join(type === 'paragraphs' ? '\n\n' : ' ');
        setResult(final);
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(result);
        context.window.showInformationMessage("Copied to clipboard!");
    };

    return (
        <div className="h-full flex flex-col bg-[#252526] text-white p-3 gap-3">
            <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                    <label className="text-[10px] uppercase text-[#999] font-bold">Count</label>
                    <input
                        type="number"
                        min="1"
                        max="50"
                        value={count}
                        onChange={e => setCount(parseInt(e.target.value))}
                        className="bg-[#3c3c3c] text-white text-xs p-1.5 rounded outline-none border border-transparent focus:border-[#007fd4]"
                    />
                </div>
                <div className="flex flex-col gap-1">
                    <label className="text-[10px] uppercase text-[#999] font-bold">Type</label>
                    <select
                        value={type}
                        onChange={e => setType(e.target.value)}
                        className="bg-[#3c3c3c] text-white text-xs p-1.5 rounded outline-none border border-transparent focus:border-[#007fd4]"
                    >
                        <option value="paragraphs">Paragraphs</option>
                        <option value="sentences">Sentences</option>
                    </select>
                </div>
            </div>

            <button
                onClick={generate}
                className="bg-[#007fd4] text-white text-xs py-1.5 rounded hover:bg-[#006bb3] font-medium"
            >
                Generate
            </button>

            {result && (
                <div className="flex-1 flex flex-col min-h-0 bg-[#1e1e1e] rounded border border-[#3c3c3c]">
                    <div className="flex justify-between items-center p-2 border-b border-[#3c3c3c]">
                        <span className="text-xs text-[#999]">{result.length} chars</span>
                        <button onClick={copyToClipboard} className="hover:text-white text-[#999]">
                            <Copy size={14} />
                        </button>
                    </div>
                    <div className="p-2 overflow-auto text-xs text-[#cccccc] leading-relaxed">
                        {result}
                    </div>
                </div>
            )}
        </div>
    );
};

export const activate = (context) => {
    context.registerSidebarPanel(
        'lorem-generator',
        {
            icon: 'align-left',
            label: 'Lorem Ipsum',
        },
        (props) => <LoremPanel context={context} {...props} />
    );

    console.log("Lorem Generator Activated");
};
