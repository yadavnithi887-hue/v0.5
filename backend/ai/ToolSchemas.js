// backend/ai/ToolSchemas.js
// Gemini Function Declarations for all available IDE tools
// These schemas tell the AI what tools it can use

/**
 * All tool schemas formatted for Gemini API function calling
 */
const toolSchemas = [
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
