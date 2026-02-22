# Antigravity AI Tools Reference

> Complete documentation of all 22 tools available to Antigravity AI for autonomous coding assistance.

## Table of Contents
1. [File System Tools](#file-system-tools)
2. [Command & Terminal Tools](#command--terminal-tools)
3. [Web & Browser Tools](#web--browser-tools)
4. [Image Generation](#image-generation)
5. [Task Management Tools](#task-management-tools)
6. [MCP Tools](#mcp-tools)
7. [Content Viewing Tools](#content-viewing-tools)
8. [Tool Usage Patterns](#tool-usage-patterns)

---

## File System Tools

### 1. view_file
**Category**: Reading  
**Purpose**: View the contents of a file from the local filesystem

**Capabilities**:
- Supports text and some binary files (images, videos)
- Line-indexed viewing (1-indexed)
- Can view specific line ranges or entire file
- Maximum 800 lines per view

**Parameters**:
- `AbsolutePath` (required): Absolute path to the file
- `StartLine` (optional): Starting line number (inclusive)
- `EndLine` (optional): Ending line number (inclusive)

**Usage Example**:
```
View entire file:
- AbsolutePath: /path/to/file.js

View specific range:
- AbsolutePath: /path/to/file.js
- StartLine: 100
- EndLine: 200
```

**Best Practices**:
- First time reading a file: enforces 800 lines to understand context
- View before edit to understand existing code
- Use line ranges for large files

---

### 2. view_file_outline
**Category**: Reading  
**Purpose**: View the structural outline of a file (classes, functions, methods)

**Capabilities**:
- Shows breakdown of functions and classes
- Displays node path, signature, and line ranges
- Pagination support for large files
- May show file contents if small enough

**Parameters**:
- `AbsolutePath` (required): Absolute path to the file
- `ItemOffset` (optional): Offset for pagination (default: 0)

**Usage Example**:
```
First view:
- AbsolutePath: /path/to/file.js
- ItemOffset: 0

Next page:
- AbsolutePath: /path/to/file.js
- ItemOffset: 50
```

**Best Practices**:
- Preferred first-step tool for exploring files
- Use before view_file to understand structure
- Only works on files, not directories

---

### 3. view_code_item
**Category**: Reading  
**Purpose**: View specific code items (classes, functions) directly

**Capabilities**:
- View up to 5 code items at once
- Supports fully qualified names (e.g., `Foo.bar`)
- Works with classes, functions, methods

**Parameters**:
- `File` (required): Absolute path to the file
- `NodePaths` (required): Array of node paths within file

**Usage Example**:
```
View function in class:
- File: /path/to/file.js
- NodePaths: ["Foo.bar", "Foo.baz"]

View top-level function:
- File: /path/to/file.js
- NodePaths: ["myFunction"]
```

**Best Practices**:
- Use after grep_search to find exact function location
- Faster than view_file for specific items
- Don't request symbols already shown by other tools

---

### 4. list_dir
**Category**: Reading  
**Purpose**: List contents of a directory

**Capabilities**:
- Shows all files and subdirectories
- Includes file sizes and child counts
- Recursive child counting (when workspace is small)

**Parameters**:
- `DirectoryPath` (required): Absolute path to directory

**Usage Example**:
```
- DirectoryPath: /path/to/project/src
```

**Output Includes**:
- Relative path to directory
- Type (file or directory)
- Size in bytes (for files)
- Number of children (for directories)

**Best Practices**:
- Must be absolute path to existing directory
- Use to explore project structure
- Helpful for finding related files

---

### 5. write_to_file
**Category**: Writing  
**Purpose**: Create new files or overwrite existing files

**Capabilities**:
- Creates file and parent directories automatically
- Can overwrite existing files
- Supports artifact creation
- Can create empty files

**Parameters**:
- `TargetFile` (required): Absolute path to file
- `Overwrite` (required): true to replace existing file
- `CodeContent` (required if not EmptyFile): File content
- `EmptyFile` (required): true to create empty file
- `Description` (required): What this change does
- `Complexity` (required): 1-10 rating for review importance
- `IsArtifact` (optional): true if creating artifact
- `ArtifactMetadata` (optional): Metadata for artifacts

**Usage Example**:
```
Create new file:
- TargetFile: /path/to/newfile.js
- Overwrite: false
- CodeContent: "console.log('Hello');"
- EmptyFile: false
- Description: "Created new utility file"
- Complexity: 3
```

**Best Practices**:
- Specify TargetFile as FIRST argument
- Only overwrite when explicitly intended
- Use replace_file_content for modifications
- Set appropriate complexity for user review

---

### 6. replace_file_content
**Category**: Writing  
**Purpose**: Make a SINGLE CONTIGUOUS edit to a file

**Capabilities**:
- Replace exact text matches with new content
- Line range specification for accuracy
- Can replace multiple occurrences

**Parameters**:
- `TargetFile` (required): Absolute path to file
- `CodeMarkdownLanguage` (required): Language for syntax highlighting
- `Instruction` (required): Description of changes
- `Description` (required): What this change does
- `Complexity` (required): 1-10 rating
- `AllowMultiple` (required): true to replace multiple matches
- `TargetContent` (required): Exact text to replace
- `ReplacementContent` (required): New content
- `StartLine` (required): Start of search range
- `EndLine` (required): End of search range

**Usage Example**:
```
Replace single block:
- TargetFile: /path/to/file.js
- TargetContent: "const x = 1;"
- ReplacementContent: "const x = 2;"
- StartLine: 10
- EndLine: 10
- AllowMultiple: false
```

**Best Practices**:
- Use ONLY for single contiguous edits
- TargetContent must EXACTLY match including whitespace
- Use multi_replace_file_content for multiple edits
- Don't make parallel calls for same file

---

### 7. multi_replace_file_content
**Category**: Writing  
**Purpose**: Make MULTIPLE NON-CONTIGUOUS edits to a file

**Capabilities**:
- Replace multiple separate blocks in one call
- Each edit has its own line range
- Efficient for scattered changes

**Parameters**:
- `TargetFile` (required): Absolute path to file
- `CodeMarkdownLanguage` (required): Language for highlighting
- `Instruction` (required): Description of changes
- `Description` (required): What this change does
- `Complexity` (required): 1-10 rating
- `ReplacementChunks` (required): Array of chunks to replace

Each chunk contains:
- `TargetContent`: Exact text to replace
- `ReplacementContent`: New content
- `StartLine`: Start of search range
- `EndLine`: End of search range
- `AllowMultiple`: true to replace multiple matches

**Usage Example**:
```
Replace two separate blocks:
- TargetFile: /path/to/file.js
- ReplacementChunks: [
    {
      TargetContent: "const x = 1;",
      ReplacementContent: "const x = 2;",
      StartLine: 10,
      EndLine: 10,
      AllowMultiple: false
    },
    {
      TargetContent: "const y = 3;",
      ReplacementContent: "const y = 4;",
      StartLine: 50,
      EndLine: 50,
      AllowMultiple: false
    }
  ]
```

**Best Practices**:
- Use for multiple non-adjacent edits
- Don't use for single block edits
- Each chunk must exactly match content
- Don't make parallel calls for same file

---

### 8. find_by_name
**Category**: Search  
**Purpose**: Search for files and directories by name

**Capabilities**:
- Smart case search
- Glob pattern support
- Extension filtering
- Exclude patterns
- Max depth control
- Results capped at 50 matches

**Parameters**:
- `SearchDirectory` (required): Directory to search
- `Pattern` (required): Glob pattern to match
- `Type` (optional): "file", "directory", or "any"
- `Extensions` (optional): File extensions to include
- `Excludes` (optional): Patterns to exclude
- `MaxDepth` (optional): Maximum depth to search
- `FullPath` (optional): Match against full path (default: filename only)

**Usage Example**:
```
Find all JavaScript files:
- SearchDirectory: /path/to/project
- Pattern: "*.js"
- Type: "file"

Find specific component:
- SearchDirectory: /path/to/src
- Pattern: "Button*"
- Extensions: ["jsx", "js"]
- Excludes: ["node_modules"]
```

**Best Practices**:
- Start specific, broaden if not found
- Use Extensions instead of Pattern for file types
- Exclude node_modules, dist for faster search
- Limit results with MaxDepth

---

### 9. grep_search
**Category**: Search  
**Purpose**: Find exact pattern matches within file contents

**Capabilities**:
- Line-by-line search with context
- Regex support
- Case-insensitive option
- File filtering with glob patterns
- Results capped at 50 matches

**Parameters**:
- `SearchPath` (required): Path to search (file or directory)
- `Query` (required): Search term or pattern
- `IsRegex` (optional): true for regex, false for literal
- `CaseInsensitive` (optional): true for case-insensitive
- `MatchPerLine` (optional): true to show lines, false for filenames only
- `Includes` (optional): Glob patterns to filter files

**Usage Example**:
```
Find function calls:
- SearchPath: /path/to/project/src
- Query: "myFunction("
- IsRegex: false
- MatchPerLine: true
- Includes: ["*.js", "*.jsx"]

Find with regex:
- SearchPath: /path/to/project
- Query: "const [a-z]+Config"
- IsRegex: true
- CaseInsensitive: false
```

**Output**:
- Filename
- Line number
- Line content (if MatchPerLine is true)

**Best Practices**:
- Use IsRegex: false for normal text searches
- Use Includes to filter by file type
- MatchPerLine: true for context, false for file list
- Start simple, add regex if needed

---

## Command & Terminal Tools

### 10. run_command
**Category**: Execution  
**Purpose**: Run shell commands in PowerShell (Windows)

**Capabilities**:
- Run any shell command
- Async execution support
- Background process management
- Auto-approval for safe commands
- PAGER=cat for consistent output

**Parameters**:
- `CommandLine` (required): Exact command to execute
- `Cwd` (required): Working directory
- `WaitMsBeforeAsync` (required): Milliseconds to wait before backgrounding (max 10000)
- `SafeToAutoRun` (required): true for safe commands

**Usage Example**:
```
Install dependencies:
- CommandLine: "npm install"
- Cwd: /path/to/project
- WaitMsBeforeAsync: 5000
- SafeToAutoRun: false

List files (safe):
- CommandLine: "ls"
- Cwd: /path/to/project
- WaitMsBeforeAsync: 1000
- SafeToAutoRun: true
```

**Safe Commands** (SafeToAutoRun: true):
- Read-only operations (ls, cat, git log)
- Status checks (git status, npm list)
- No destructive side effects

**Unsafe Commands** (SafeToAutoRun: false):
- Installing packages (npm install)
- Deleting files (rm, del)
- Modifying state (git commit)
- External requests (curl)

**Best Practices**:
- NEVER use cd command (use Cwd parameter)
- Set WaitMsBeforeAsync appropriately
- Use command_status for background commands
- Only auto-run truly safe commands

---

### 11. send_command_input
**Category**: Execution  
**Purpose**: Send input to a running command (for interactive CLIs)

**Capabilities**:
- Send stdin to running process
- Terminate running commands
- Interact with REPLs

**Parameters**:
- `CommandId` (required): ID from run_command
- `Input` (optional): Text to send to stdin
- `Terminate` (optional): true to kill process
- `WaitMs` (required): Wait time for output (500-10000ms)
- `SafeToAutoRun` (required): true for safe input

**Usage Example**:
```
Send input to REPL:
- CommandId: "cmd_123"
- Input: "console.log('test')\n"
- Terminate: false
- WaitMs: 1000
- SafeToAutoRun: false

Terminate process:
- CommandId: "cmd_123"
- Terminate: true
- WaitMs: 500
- SafeToAutoRun: false
```

**Best Practices**:
- Include newline characters when needed
- Use command_status after sending input
- Set WaitMs based on expected response time
- Exactly one of Input or Terminate must be specified

---

### 12. command_status
**Category**: Execution  
**Purpose**: Check status of background commands

**Capabilities**:
- Check if command is running or done
- Retrieve output
- Wait for completion
- Error reporting

**Parameters**:
- `CommandId` (required): ID from run_command
- `WaitDurationSeconds` (required): Seconds to wait (max 300)
- `OutputCharacterCount` (optional): Number of characters to view

**Usage Example**:
```
Check immediately:
- CommandId: "cmd_123"
- WaitDurationSeconds: 0
- OutputCharacterCount: 1000

Wait for completion:
- CommandId: "cmd_123"
- WaitDurationSeconds: 300
- OutputCharacterCount: 5000
```

**Returns**:
- Status: "running" or "done"
- Output lines (as specified)
- Error message (if any)

**Best Practices**:
- Only check background command IDs
- Keep OutputCharacterCount minimal
- Use max wait (300) if only waiting for completion
- Returns early if command completes

---

### 13. read_terminal
**Category**: Execution  
**Purpose**: Read contents of a terminal by process ID

**Parameters**:
- `ProcessID` (required): Process ID of terminal
- `Name` (required): Name of terminal

**Usage Example**:
```
- ProcessID: "12345"
- Name: "dev-server"
```

**Best Practices**:
- Use for reading terminal output
- Useful for debugging running processes

---

## Web & Browser Tools

### 14. browser_subagent
**Category**: Web Interaction  
**Purpose**: Control browser to interact with websites

**Capabilities**:
- Open URLs and navigate
- Click elements, type text
- Scroll, resize window
- Capture screenshots
- Record interactions as WebP videos

**Parameters**:
- `TaskName` (required): Human-readable task title
- `Task` (required): Detailed instructions for subagent
- `RecordingName` (required): Name for video recording (lowercase_with_underscores)

**Usage Example**:
```
Test login flow:
- TaskName: "Testing Login Form"
- Task: "Navigate to http://localhost:3000, click the login button,
        fill in username 'test@example.com', password 'password123',
        submit the form, and verify the dashboard appears. Take a
        screenshot of the final state."
- RecordingName: "login_flow_test"
```

**Important Notes**:
- Task must be highly detailed and specific
- Include exact stopping conditions
- State what information to return
- Recordings automatically saved to artifacts

**Best Practices**:
- Be very specific in Task description
- Include all necessary context
- Define clear success criteria
- Use for UI testing and verification

---

### 15. read_url_content
**Category**: Web Reading  
**Purpose**: Fetch content from URLs via HTTP (invisible to user)

**Capabilities**:
- Extract text from public pages
- Convert HTML to markdown
- No JavaScript execution
- No authentication support
- Fast batch processing

**Parameters**:
- `Url` (required): URL to fetch

**Usage Example**:
```
- Url: "https://example.com/docs"
```

**When to Use**:
- Reading static content/documentation
- Extracting text from public pages
- Batch processing multiple URLs
- Speed is important
- No visual interaction needed

**When NOT to Use**:
- Pages requiring login (use browser_subagent)
- JavaScript-heavy sites (use browser_subagent)
- Need visual verification (use browser_subagent)

**Best Practices**:
- Use for documentation and static sites
- Prefer over browser_subagent when possible (faster)
- No authentication supported

---

### 16. search_web
**Category**: Web Search  
**Purpose**: Perform web searches and get summarized results

**Capabilities**:
- Search across the web
- Get summary with citations
- Optional domain prioritization

**Parameters**:
- `query` (required): Search query
- `domain` (optional): Domain to prioritize

**Usage Example**:
```
General search:
- query: "React hooks best practices"

Domain-specific:
- query: "authentication guide"
- domain: "auth0.com"
```

**Best Practices**:
- Use for finding documentation
- Research best practices
- Find solutions to errors
- Get latest information

---

## Image Generation

### 17. generate_image
**Category**: Image Creation  
**Purpose**: Generate or edit images based on text prompts

**Capabilities**:
- Generate new images from text
- Edit existing images
- Combine multiple images
- Create UI designs and assets

**Parameters**:
- `Prompt` (required): Text description
- `ImageName` (required): Name for saved image (lowercase_with_underscores)
- `ImagePaths` (optional): Paths to existing images (max 3)

**Usage Example**:
```
Generate UI mockup:
- Prompt: "Modern login page with glassmorphism effect, dark theme,
          purple gradient background, clean form design"
- ImageName: "login_page_mockup"

Edit existing image:
- Prompt: "Change background to blue gradient"
- ImageName: "updated_mockup"
- ImagePaths: ["/path/to/original.png"]
```

**Best Practices**:
- Don't include device frames unless requested
- Be specific in prompts
- Use for UI mockups and assets
- Max 3 images for editing/combining
- Images saved as artifacts automatically

---

## Task Management Tools

### 18. task_boundary
**Category**: Task Management  
**Purpose**: Define and update task boundaries for structured workflow

**Capabilities**:
- Start new tasks
- Update task progress
- Switch between modes (PLANNING, EXECUTION, VERIFICATION)
- Track task status

**Parameters**:
- `TaskName` (required): Human-readable task identifier
- `Mode` (required): "PLANNING", "EXECUTION", or "VERIFICATION"
- `TaskSummary` (required): What has been accomplished
- `TaskStatus` (required): What you're about to do next
- `PredictedTaskSize` (required): Estimated remaining tool calls

**Usage Example**:
```
Start planning:
- TaskName: "Planning Authentication System"
- Mode: "PLANNING"
- TaskSummary: "Beginning research on authentication implementation"
- TaskStatus: "Searching for existing auth components"
- PredictedTaskSize: 15

Update to execution:
- TaskName: "Implementing Authentication System"
- Mode: "EXECUTION"
- TaskSummary: "Completed planning. Creating auth components."
- TaskStatus: "Writing login component"
- PredictedTaskSize: 10
```

**Special Value**: Use `"%SAME%"` to reuse previous value

**Best Practices**:
- Call as FIRST tool in sequence
- Use for complex multi-step tasks
- Skip for simple queries
- Change TaskName when switching major work areas
- Update regularly as work progresses

---

### 19. notify_user
**Category**: Communication  
**Purpose**: Communicate with user during active task

**Capabilities**:
- Request artifact review
- Ask blocking questions
- Notify of completion
- Auto-proceed option

**Parameters**:
- `PathsToReview` (required): Absolute paths to files for review
- `BlockedOnUser` (required): true if waiting for approval
- `Message` (required): Concise message to user
- `ShouldAutoProceed` (required): true if confident user can auto-approve

**Usage Example**:
```
Request plan review:
- PathsToReview: ["/path/to/implementation_plan.md"]
- BlockedOnUser: true
- Message: "Please review the implementation plan."
- ShouldAutoProceed: false

Notify completion:
- PathsToReview: ["/path/to/walkthrough.md"]
- BlockedOnUser: false
- Message: "Authentication system is complete and verified."
- ShouldAutoProceed: true
```

**Important Notes**:
- NEVER call in parallel with other tools
- Execution control returns to user
- Exits task view mode
- ONLY way to communicate during task

**Best Practices**:
- Keep message concise
- Don't summarize what's in files
- Ask specific questions only
- Set ShouldAutoProceed appropriately

---

## MCP Tools

### 20. list_resources
**Category**: MCP (Model Context Protocol)  
**Purpose**: List available resources from MCP server

**Parameters**:
- `ServerName` (required): Name of MCP server

**Usage Example**:
```
- ServerName: "github-server"
```

---

### 21. read_resource
**Category**: MCP  
**Purpose**: Read contents of a specific resource

**Parameters**:
- `ServerName` (required): Name of MCP server
- `Uri` (required): Unique identifier for resource

**Usage Example**:
```
- ServerName: "github-server"
- Uri: "repo://user/project/README.md"
```

---

## Content Viewing Tools

### 22. view_content_chunk
**Category**: Content Reading  
**Purpose**: View specific chunks of previously read web content

**Parameters**:
- `document_id` (required): ID from read_url_content
- `position` (required): Chunk position to view

**Usage Example**:
```
- document_id: "doc_abc123"
- position: 2
```

**Best Practices**:
- Can only view chunks from already-read documents
- Use after read_url_content for large documents

---

## Tool Usage Patterns

### Pattern 1: Exploring a New Codebase
```
1. list_dir → See project structure
2. find_by_name → Find relevant files
3. view_file_outline → See file structure
4. view_file → Read specific sections
5. grep_search → Find specific code patterns
```

### Pattern 2: Making Code Changes
```
1. grep_search → Find where to make changes
2. view_file → Understand context
3. replace_file_content → Make changes
4. run_command → Test changes (npm run dev)
5. browser_subagent → Verify in browser
```

### Pattern 3: Debugging Build Errors
```
1. run_command → Run build
2. command_status → Check error output
3. grep_search → Find error source
4. view_file → See problematic code
5. replace_file_content → Fix error
6. run_command → Rebuild
```

### Pattern 4: Complete Feature Implementation
```
1. task_boundary → Start PLANNING
2. find_by_name + grep_search → Research
3. notify_user → Get plan approval
4. task_boundary → Switch to EXECUTION
5. write_to_file → Create new files
6. replace_file_content → Modify existing
7. run_command → Start dev server
8. task_boundary → Switch to VERIFICATION
9. browser_subagent → Test UI
10. notify_user → Show completion
```

### Pattern 5: Web Research
```
1. search_web → Find relevant info
2. read_url_content → Get documentation
3. view_content_chunk → Read specific sections
```

---

## Tool Selection Decision Tree

```
What do you need to do?

├─ Find a file
│  └─ find_by_name (by filename) or grep_search (by content)
│
├─ Read code
│  ├─ Structure only? → view_file_outline
│  ├─ Specific function? → view_code_item
│  └─ Full content? → view_file
│
├─ Modify code
│  ├─ New file? → write_to_file
│  ├─ Single edit? → replace_file_content
│  └─ Multiple edits? → multi_replace_file_content
│
├─ Run something
│  ├─ Shell command? → run_command
│  ├─ Interactive input? → send_command_input
│  └─ Check status? → command_status
│
├─ Test/Verify
│  ├─ UI testing? → browser_subagent
│  └─ Check terminal? → read_terminal
│
├─ Research
│  ├─ Web search? → search_web
│  ├─ Read docs? → read_url_content
│  └─ View chunks? → view_content_chunk
│
├─ Create assets
│  └─ generate_image
│
└─ Communicate
   ├─ In task? → notify_user
   └─ Outside task? → Direct response
```

---

## Performance Tips

### Minimize Tool Calls
- Use `view_file_outline` before `view_file` to understand structure
- Use `grep_search` instead of viewing multiple files
- Batch related operations when possible

### Parallel Execution
- Call independent tools in parallel
- Never parallel edit same file
- Never call notify_user in parallel

### Efficient Searching
- Start specific, broaden if needed
- Use appropriate search tool (find_by_name for files, grep_search for content)
- Exclude common directories (node_modules, dist)

### Safe Command Execution
- Only auto-run read-only commands
- Set appropriate wait times
- Use background execution for long-running processes

---

## Common Mistakes to Avoid

❌ **Using relative paths** → Always use absolute paths  
❌ **Not viewing before editing** → Always understand context first  
❌ **Parallel edits to same file** → Use single tool call  
❌ **Auto-running unsafe commands** → Only auto-run read-only operations  
❌ **Using cd command** → Use Cwd parameter instead  
❌ **Ignoring line ranges** → Use StartLine/EndLine for accuracy  
❌ **Not verifying changes** → Always test after editing  
❌ **Using view_file_outline on directories** → Only works on files  

---

**Document Version**: 1.0  
**Total Tools**: 22  
**Last Updated**: January 2026  
**Purpose**: Complete reference for Antigravity AI tool capabilities
