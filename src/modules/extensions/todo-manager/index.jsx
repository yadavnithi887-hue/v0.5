import React, { useState, useEffect } from 'react';
import { CheckSquare, Plus, Trash2, RefreshCw, Filter, Circle, CheckCircle2, Clock, AlertCircle } from 'lucide-react';

export const metadata = {
    id: 'devstudio.todo-manager',
    name: 'Todo Manager',
    version: '2.0.0',
    description: 'Manage TODOs, track tasks, and scan workspace for TODO comments.',
    author: 'DevStudio Team',
    icon: 'CheckSquare',
    readme: `
# Todo Manager

## Features
- Create and manage tasks
- Scan workspace for TODO/FIXME/NOTE comments
- Priority levels (High, Medium, Low)
- Filter by status and priority
- Click to jump to file location
`
};

export const settings = [
    {
        id: 'todo.keywords',
        label: 'Keywords',
        type: 'text',
        default: 'TODO,FIXME,NOTE,HACK,BUG',
        description: 'Comma separated keywords to scan for',
        section: 'extensions',
        extensionId: metadata.id
    },
    {
        id: 'todo.autoScan',
        label: 'Auto Scan',
        type: 'boolean',
        default: true,
        description: 'Automatically scan workspace on activation',
        section: 'extensions',
        extensionId: metadata.id
    }
];

const TodoPanel = ({ context, files = [] }) => {
    const [todos, setTodos] = useState([]);
    const [scannedComments, setScannedComments] = useState([]);
    const [newTodoText, setNewTodoText] = useState('');
    const [filter, setFilter] = useState('all'); // all, active, completed
    const [activeTab, setActiveTab] = useState('manual'); // manual, scanned
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        // Load saved todos from localStorage
        const saved = localStorage.getItem('devstudio-todos');
        if (saved) {
            try {
                setTodos(JSON.parse(saved));
            } catch (e) {
                console.error('Failed to load todos:', e);
            }
        }

        // Auto-scan on mount
        scanWorkspace();
    }, []);

    useEffect(() => {
        // Save todos to localStorage
        localStorage.setItem('devstudio-todos', JSON.stringify(todos));

        // Update status bar count
        const activeCount = todos.filter(t => !t.completed).length;
        if (context.window.createStatusBarItem) {
            context.window.createStatusBarItem({
                id: 'todo.count',
                text: `$(check) ${activeCount} TODOs`,
                tooltip: 'Click to view todos',
                command: 'todo-explorer.focus',
                alignment: 'right',
                priority: 90
            });
        }
    }, [todos]);

    const scanWorkspace = async () => {
        if (!window.electronAPI) {
            context.window.showErrorMessage("File system access not available");
            return;
        }

        setLoading(true);
        const keywords = ['TODO', 'FIXME', 'NOTE', 'HACK', 'BUG'];
        const found = [];

        try {
            const rootPath = localStorage.getItem('devstudio-last-project');
            console.log('[TODO] Root path:', rootPath);

            if (!rootPath) {
                context.window.showWarningMessage("No project opened");
                setLoading(false);
                return;
            }

            // Use files from props
            console.log('[TODO] Files from props:', files);
            const filesToScan = files
                .filter(f => f.realPath || f.path)
                .map(f => f.realPath || f.path);

            console.log('[TODO] Files to scan:', filesToScan);

            // Scan open files
            if (filesToScan.length > 0) {
                for (const filePath of filesToScan) {
                    console.log('[TODO] Scanning file:', filePath);
                    const result = await window.electronAPI.readFile(filePath);
                    if (result.success) {
                        console.log('[TODO] File read successfully, content length:', result.content.length);
                        scanFileContent(filePath, result.content, found, keywords);
                    } else {
                        console.log('[TODO] Failed to read file:', result);
                    }
                }
            } else {
                console.warn('[TODO] No files to scan!');
            }

            console.log('[TODO] Total found:', found.length, found);
            setScannedComments(found);
            context.window.showInformationMessage(`Found ${found.length} TODO comments in ${filesToScan.length} files`);
        } catch (e) {
            console.error('[TODO] Scan error:', e);
            context.window.showErrorMessage("Failed to scan workspace: " + e.message);
        }

        setLoading(false);
    };

    const scanFileContent = (filePath, content, found, keywords) => {
        const lines = content.split('\n');
        lines.forEach((line, index) => {
            keywords.forEach(keyword => {
                // Simple case-insensitive search for keyword followed by optional colon and text
                const lowerLine = line.toLowerCase();
                const keywordLower = keyword.toLowerCase();
                const keywordIndex = lowerLine.indexOf(keywordLower);

                if (keywordIndex !== -1) {
                    // Check if it's in a comment context
                    const beforeKeyword = line.substring(0, keywordIndex).trim();
                    const isComment =
                        beforeKeyword.includes('//') ||
                        beforeKeyword.includes('/*') ||
                        beforeKeyword.includes('#') ||
                        beforeKeyword.includes('<!--') ||
                        line.trim().startsWith('//') ||
                        line.trim().startsWith('/*') ||
                        line.trim().startsWith('#') ||
                        line.trim().startsWith('<!--');

                    if (isComment) {
                        // Extract text after keyword
                        let textAfterKeyword = line.substring(keywordIndex + keyword.length).trim();
                        // Remove leading colon and whitespace
                        if (textAfterKeyword.startsWith(':')) {
                            textAfterKeyword = textAfterKeyword.substring(1).trim();
                        }
                        // Remove trailing comment markers
                        textAfterKeyword = textAfterKeyword.replace(/\*\/\s*$/, '').replace(/-->\s*$/, '').trim();

                        if (textAfterKeyword && !found.some(f => f.file === filePath && f.line === index + 1)) {
                            found.push({
                                file: filePath,
                                line: index + 1,
                                text: textAfterKeyword,
                                type: keyword,
                                fullLine: line.trim()
                            });
                        }
                    }
                }
            });
        });
    };

    const addTodo = () => {
        if (!newTodoText.trim()) return;

        const newTodo = {
            id: Date.now(),
            text: newTodoText,
            completed: false,
            priority: 'medium',
            createdAt: Date.now()
        };

        setTodos([newTodo, ...todos]);
        setNewTodoText('');
    };

    const toggleTodo = (id) => {
        setTodos(todos.map(todo =>
            todo.id === id ? { ...todo, completed: !todo.completed } : todo
        ));
    };

    const deleteTodo = (id) => {
        setTodos(todos.filter(todo => todo.id !== id));
    };

    const setPriority = (id, priority) => {
        setTodos(todos.map(todo =>
            todo.id === id ? { ...todo, priority } : todo
        ));
    };

    const openFile = async (filePath, line) => {
        if (window.electronAPI && context.commands) {
            context.window.showInformationMessage(`Opening ${filePath}:${line}`);
            // TODO: Implement actual file open with line number
        }
    };

    const filteredTodos = todos.filter(todo => {
        if (filter === 'active') return !todo.completed;
        if (filter === 'completed') return todo.completed;
        return true;
    });

    const getPriorityColor = (priority) => {
        if (priority === 'high') return 'text-red-400';
        if (priority === 'low') return 'text-green-400';
        return 'text-yellow-400';
    };

    const getTypeColor = (type) => {
        if (type === 'FIXME' || type === 'BUG') return 'bg-red-500/20 text-red-400';
        if (type === 'TODO') return 'bg-blue-500/20 text-blue-400';
        if (type === 'HACK') return 'bg-orange-500/20 text-orange-400';
        return 'bg-gray-500/20 text-gray-400';
    };

    return (
        <div className="h-full flex flex-col bg-[#252526] text-white">
            {/* Header */}
            <div className="p-3 border-b border-[#3c3c3c] bg-[#1e1e1e]">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                        <CheckSquare size={14} className="text-blue-400" />
                        <span className="font-bold text-xs">TODO MANAGER</span>
                    </div>
                    <button
                        onClick={scanWorkspace}
                        disabled={loading}
                        className="p-1 hover:bg-[#3c3c3c] rounded transition-colors disabled:opacity-50"
                        title="Scan Workspace"
                    >
                        <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 text-xs">
                    <button
                        onClick={() => setActiveTab('manual')}
                        className={`px-3 py-1 rounded transition-colors ${activeTab === 'manual' ? 'bg-[#007fd4] text-white' : 'bg-[#3c3c3c] text-[#ccc] hover:text-white'
                            }`}
                    >
                        Tasks ({todos.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('scanned')}
                        className={`px-3 py-1 rounded transition-colors ${activeTab === 'scanned' ? 'bg-[#007fd4] text-white' : 'bg-[#3c3c3c] text-[#ccc] hover:text-white'
                            }`}
                    >
                        Comments ({scannedComments.length})
                    </button>
                </div>
            </div>

            {/* Manual Todos Tab */}
            {activeTab === 'manual' && (
                <>
                    {/* Add Todo */}
                    <div className="p-2 border-b border-[#3c3c3c] bg-[#1e1e1e]">
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={newTodoText}
                                onChange={(e) => setNewTodoText(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && addTodo()}
                                placeholder="Add new task..."
                                className="flex-1 bg-[#3c3c3c] text-xs px-2 py-1.5 rounded outline-none border border-transparent focus:border-[#007fd4]"
                            />
                            <button
                                onClick={addTodo}
                                className="bg-[#007fd4] px-2 py-1.5 rounded text-xs hover:bg-[#006bb3] transition-colors"
                            >
                                <Plus size={12} />
                            </button>
                        </div>
                    </div>

                    {/* Filter */}
                    <div className="px-2 py-1 border-b border-[#3c3c3c] bg-[#1e1e1e] flex gap-2 text-[10px]">
                        {['all', 'active', 'completed'].map(f => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`px-2 py-1 rounded capitalize ${filter === f ? 'bg-[#007fd4] text-white' : 'text-[#999] hover:text-white'
                                    }`}
                            >
                                {f}
                            </button>
                        ))}
                    </div>

                    {/* Todo List */}
                    <div className="flex-1 overflow-y-auto p-2">
                        {filteredTodos.length === 0 && (
                            <div className="flex flex-col items-center justify-center h-full text-xs text-[#888]">
                                <CheckSquare size={32} className="mb-2 opacity-30" />
                                <p>No tasks yet</p>
                                <p className="text-[10px]">Add your first task above</p>
                            </div>
                        )}

                        {filteredTodos.map((todo) => (
                            <div
                                key={todo.id}
                                className="mb-2 p-2 rounded bg-[#37373d] hover:bg-[#444] cursor-pointer border-l-2 border-transparent hover:border-blue-400 group"
                            >
                                <div className="flex items-start gap-2">
                                    <button
                                        onClick={() => toggleTodo(todo.id)}
                                        className="mt-0.5"
                                    >
                                        {todo.completed ? (
                                            <CheckCircle2 size={16} className="text-green-400" />
                                        ) : (
                                            <Circle size={16} className="text-[#666]" />
                                        )}
                                    </button>

                                    <div className="flex-1 min-w-0">
                                        <div className={`text-sm ${todo.completed ? 'line-through text-[#888]' : 'text-[#ddd]'}`}>
                                            {todo.text}
                                        </div>
                                        <div className="flex items-center gap-2 mt-1">
                                            <select
                                                value={todo.priority}
                                                onChange={(e) => setPriority(todo.id, e.target.value)}
                                                className={`text-[10px] bg-transparent border-none outline-none ${getPriorityColor(todo.priority)}`}
                                            >
                                                <option value="low">Low</option>
                                                <option value="medium">Medium</option>
                                                <option value="high">High</option>
                                            </select>
                                            <span className="text-[10px] text-[#666]">
                                                {new Date(todo.createdAt).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => deleteTodo(todo.id)}
                                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/20 rounded transition-all"
                                    >
                                        <Trash2 size={12} className="text-red-400" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}

            {/* Scanned Comments Tab */}
            {activeTab === 'scanned' && (
                <div className="flex-1 overflow-y-auto p-2">
                    {loading && (
                        <div className="flex items-center justify-center h-full text-xs text-[#888]">
                            <RefreshCw size={16} className="animate-spin mr-2" />
                            Scanning workspace...
                        </div>
                    )}

                    {!loading && scannedComments.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-full text-xs text-[#888]">
                            <AlertCircle size={32} className="mb-2 opacity-30" />
                            <p>No TODO comments found</p>
                            <p className="text-[10px]">Click refresh to scan workspace</p>
                        </div>
                    )}

                    {!loading && scannedComments.map((comment, i) => (
                        <div
                            key={i}
                            className="mb-2 p-2 rounded bg-[#37373d] hover:bg-[#444] cursor-pointer border-l-2 border-transparent hover:border-blue-400"
                            onClick={() => openFile(comment.file, comment.line)}
                        >
                            <div className="flex items-center gap-2 mb-1">
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${getTypeColor(comment.type)}`}>
                                    {comment.type}
                                </span>
                                <span className="text-xs text-[#999] truncate flex-1">
                                    {comment.file.split('/').pop()}:{comment.line}
                                </span>
                            </div>
                            <div className="text-sm text-[#ddd]">{comment.text}</div>
                            <div className="text-[10px] text-[#666] mt-1 font-mono">{comment.fullLine}</div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export const activate = (context) => {
    context.registerSidebarPanel(
        'todo-explorer',
        {
            icon: 'check-square',
            label: 'Todo Manager',
        },
        (props) => <TodoPanel context={context} {...props} />
    );

    // Update status bar with todo count
    const updateStatusBar = () => {
        const saved = localStorage.getItem('devstudio-todos');
        let count = 0;
        if (saved) {
            try {
                const todos = JSON.parse(saved);
                count = todos.filter(t => !t.completed).length;
            } catch (e) { }
        }

        context.window.createStatusBarItem({
            id: 'todo.count',
            text: `$(check) ${count} TODOs`,
            tooltip: 'Click to view todos',
            command: 'todo-explorer.focus',
            alignment: 'right',
            priority: 90
        });
    };

    updateStatusBar();

    // Update every 5 seconds
    setInterval(updateStatusBar, 5000);

    console.log("Todo Manager Activated");
};
