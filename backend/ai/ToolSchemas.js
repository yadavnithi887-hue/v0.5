// backend/ai/ToolSchemas.js
// Gemini Function Declarations for all available IDE tools
// These schemas tell the AI what tools it can use

/**
 * All tool schemas formatted for Gemini API function calling
 */
const toolSchemas = [
    // ==================== Memory & Profile Tools ====================
    {
        name: "read_user_profile",
        description: "Read the user's profile and preferences. Use this to remember the user's coding style, preferences, and personal notes. Takes no arguments.",
        parameters: { type: "object", properties: {} }
    },
    {
        name: "update_user_profile",
        description: "Update the user's profile and preferences. Use this when the user explicitly tells you to remember something about them.",
        parameters: {
            type: "object",
            properties: {
                Content: { type: "string", description: "The complete content to write, or the content to append." },
                Append: { type: "boolean", description: "If true, appends the content to the end. If false, overwrites the entire file." }
            },
            required: ["Content", "Append"]
        }
    },
    {
        name: "read_agent_memory",
        description: "Read the AI's long-term memory. Use this to remember important project context, architectural decisions, and tasks across different chats. Takes no arguments.",
        parameters: { type: "object", properties: {} }
    },
    {
        name: "update_agent_memory",
        description: "Update the AI's long-term memory. Use this to save important project context, architectural decisions, and tasks so you don't forget them in future chats.",
        parameters: {
            type: "object",
            properties: {
                Content: { type: "string", description: "The complete content to write, or the content to append." },
                Append: { type: "boolean", description: "If true, appends the content to the end. If false, overwrites the entire file." }
            },
            required: ["Content", "Append"]
        }
    },
    {
        name: "brain_list_artifacts",
        description: "List artifact files for the current session from hidden local brain storage. Use this before reading or updating task artifacts.",
        parameters: { type: "object", properties: {} }
    },
    {
        name: "brain_read_artifact",
        description: "Read a session artifact file from hidden local brain storage. Allowed names: task.md, implementation_plan.md, walkthrough.md, task.md.resolved.N",
        parameters: {
            type: "object",
            properties: {
                ArtifactName: { type: "string", description: "Artifact file name only, not a path." }
            },
            required: ["ArtifactName"]
        }
    },
    {
        name: "brain_write_artifact",
        description: "Write or append a session artifact file in hidden local brain storage. Never use workspace file tools for artifacts.",
        parameters: {
            type: "object",
            properties: {
                ArtifactName: { type: "string", description: "Artifact file name only, not a path." },
                Content: { type: "string", description: "Content to write or append." },
                Append: { type: "boolean", description: "If true append; if false overwrite." }
            },
            required: ["ArtifactName", "Content", "Append"]
        }
    },
    {
        name: "task_boundary",
        description: "Update structured task progress in the UI. Use this to report current mode, objective, and status while working.",
        parameters: {
            type: "object",
            properties: {
                Mode: {
                    type: "string",
                    description: "One of: PLANNING, EXECUTION, VERIFICATION"
                },
                TaskName: {
                    type: "string",
                    description: "Current objective title. Example: Implementing Authentication"
                },
                TaskSummary: {
                    type: "string",
                    description: "High-level summary of the objective and accumulated progress."
                },
                TaskStatus: {
                    type: "string",
                    description: "What you are doing right now."
                }
            },
            required: ["Mode", "TaskName", "TaskSummary", "TaskStatus"]
        }
    },

    // ==================== File Inspection Tools ====================
    {
        name: "view_file",
        description: "Read the contents of a file from the workspace. Use this to inspect code before making changes. Returns file content with line numbers.",
        parameters: {
            type: "object",
            properties: {
                AbsolutePath: {
                    type: "string",
                    description: "The absolute path to the file to read"
                },
                StartLine: {
                    type: "integer",
                    description: "Optional. Start line number (1-indexed) to read from"
                },
                EndLine: {
                    type: "integer",
                    description: "Optional. End line number (1-indexed) to read to"
                }
            },
            required: ["AbsolutePath"]
        }
    },
    {
        name: "list_dir",
        description: "List all files and subdirectories in a directory. Shows file sizes and folder structure. Use this to explore the workspace.",
        parameters: {
            type: "object",
            properties: {
                DirectoryPath: {
                    type: "string",
                    description: "Absolute path to the directory to list"
                }
            },
            required: ["DirectoryPath"]
        }
    },
    {
        name: "view_file_outline",
        description: "View the structural outline of a file — shows all functions, classes, and their line ranges. Best for understanding file structure before reading specific parts.",
        parameters: {
            type: "object",
            properties: {
                AbsolutePath: {
                    type: "string",
                    description: "Absolute path to the file"
                }
            },
            required: ["AbsolutePath"]
        }
    },
    {
        name: "view_code_item",
        description: "View a specific function or class definition in a file by its path name (e.g., 'ClassName.methodName').",
        parameters: {
            type: "object",
            properties: {
                File: {
                    type: "string",
                    description: "Absolute path to the file"
                },
                NodePaths: {
                    type: "array",
                    items: { type: "string" },
                    description: "Array of node paths to view (e.g., ['MyClass.myMethod'])"
                }
            },
            required: ["File", "NodePaths"]
        }
    },

    // ==================== Search Tools ====================
    {
        name: "find_by_name",
        description: "Search for files and directories by name pattern. Supports glob patterns. Use to find specific files in the workspace.",
        parameters: {
            type: "object",
            properties: {
                SearchDirectory: {
                    type: "string",
                    description: "Directory to search within"
                },
                Pattern: {
                    type: "string",
                    description: "Glob pattern to search for (e.g., '*.jsx', 'App*')"
                },
                Extensions: {
                    type: "array",
                    items: { type: "string" },
                    description: "Optional file extensions to filter (e.g., ['js', 'jsx'])"
                }
            },
            required: ["SearchDirectory", "Pattern"]
        }
    },
    {
        name: "grep_search",
        description: "Search for text patterns within file contents. Returns matching lines with line numbers. Use to find where something is used or defined.",
        parameters: {
            type: "object",
            properties: {
                SearchPath: {
                    type: "string",
                    description: "Directory or file path to search in"
                },
                Query: {
                    type: "string",
                    description: "Text or pattern to search for"
                },
                CaseInsensitive: {
                    type: "boolean",
                    description: "If true, ignore case when searching"
                }
            },
            required: ["SearchPath", "Query"]
        }
    },

    // ==================== File Modification Tools ====================
    {
        name: "write_to_file",
        description: "Create a new file or overwrite an existing file. Creates parent directories if needed. Use for new files.",
        parameters: {
            type: "object",
            properties: {
                TargetFile: {
                    type: "string",
                    description: "Absolute path to the file to create/overwrite"
                },
                CodeContent: {
                    type: "string",
                    description: "The file contents to write"
                },
                Overwrite: {
                    type: "boolean",
                    description: "Set to true to overwrite existing file. Default false."
                }
            },
            required: ["TargetFile", "CodeContent"]
        }
    },
    {
        name: "replace_file_content",
        description: "Replace specific text in a file. The TargetContent must exactly match existing text. Use for editing existing files.",
        parameters: {
            type: "object",
            properties: {
                TargetFile: {
                    type: "string",
                    description: "Absolute path to the file to edit"
                },
                TargetContent: {
                    type: "string",
                    description: "The exact text to find and replace (must match exactly)"
                },
                ReplacementContent: {
                    type: "string",
                    description: "The new text to replace with"
                },
                AllowMultiple: {
                    type: "boolean",
                    description: "If true, replace all occurrences. If false, only first."
                }
            },
            required: ["TargetFile", "TargetContent", "ReplacementContent"]
        }
    },
    {
        name: "multi_replace_file_content",
        description: "Make multiple non-contiguous edits in a single file. Each chunk specifies text to find and replace.",
        parameters: {
            type: "object",
            properties: {
                TargetFile: {
                    type: "string",
                    description: "Absolute path to the file"
                },
                ReplacementChunks: {
                    type: "array",
                    items: {
                        type: "object",
                        properties: {
                            TargetContent: { type: "string", description: "Exact text to replace" },
                            ReplacementContent: { type: "string", description: "New text" },
                            AllowMultiple: { type: "boolean" }
                        },
                        required: ["TargetContent", "ReplacementContent"]
                    },
                    description: "Array of replacement chunks"
                }
            },
            required: ["TargetFile", "ReplacementChunks"]
        }
    },

    // ==================== Command Tools ====================
    {
        name: "run_command",
        description: "Run a shell command in the workspace. Returns the output. Use for installing dependencies, building, testing, etc.",
        parameters: {
            type: "object",
            properties: {
                CommandLine: {
                    type: "string",
                    description: "The command to execute (e.g., 'npm install', 'node app.js')"
                },
                Cwd: {
                    type: "string",
                    description: "Working directory for the command"
                }
            },
            required: ["CommandLine", "Cwd"]
        }
    },
    {
        name: "command_status",
        description: "Check the status and output of a previously started background command. Can optionally wait for the command to complete.",
        parameters: {
            type: "object",
            properties: {
                CommandId: {
                    type: "string",
                    description: "The command ID returned from run_command"
                },
                OutputCharacterCount: {
                    type: "integer",
                    description: "Number of output characters to return"
                },
                WaitDurationSeconds: {
                    type: "integer",
                    description: "Number of seconds to wait for command completion before returning status. Set to 0 for immediate status. Max 300."
                }
            },
            required: ["CommandId"]
        }
    },

    // ==================== Diagnostics Tools ====================
    {
        name: "check_problems",
        description: "Check the IDE's Problems panel for real-time errors and warnings in workspace files. Returns all current diagnostics (syntax errors, type errors, CSS issues, etc.) detected by Monaco Editor's language services. CRITICAL: You MUST call this tool AFTER making ANY code changes (write_to_file, replace_file_content, multi_replace_file_content) to verify no errors were introduced. If errors are found, fix them and call check_problems again until the result shows 0 errors. Never deliver code with unresolved errors.",
        parameters: {
            type: "object",
            properties: {
                FilePaths: {
                    type: "array",
                    items: { type: "string" },
                    description: "Optional. Filter results to only these file paths. If empty or omitted, returns ALL workspace problems."
                }
            }
        }
    }
];
/**
 * Get tool schemas formatted for Gemini API
 */
export function getToolDeclarations() {
    return [{
        functionDeclarations: toolSchemas
    }];
}

/**
 * Get tool schemas formatted for OpenAI-compatible chat completions APIs.
 */
export function getOpenAITools() {
    return toolSchemas.map((schema) => ({
        type: 'function',
        function: {
            name: schema.name,
            description: schema.description,
            parameters: schema.parameters || { type: 'object', properties: {} },
        },
    }));
}

/**
 * Get a specific tool schema by name
 */
export function getToolSchema(name) {
    return toolSchemas.find(t => t.name === name);
}

/**
 * Get list of tool names
 */
export function getToolNames() {
    return toolSchemas.map(t => t.name);
}

export default toolSchemas;
