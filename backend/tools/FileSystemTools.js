// backend/tools/FileSystemTools.js
import fs from 'fs';
import path from 'path';
import { glob } from 'glob';
import { exec } from 'child_process';
import util from 'util';

const execAsync = util.promisify(exec);

class FileSystemTools {
    constructor(io) {
        this.io = io;
        this.workspacePath = null; // Will be set by ToolRouter
    }

    /**
     * Set the workspace root path — all file operations are locked to this directory
     */
    setWorkspacePath(wPath) {
        this.workspacePath = wPath;
        console.log(`[FS] Workspace locked to: ${wPath}`);
    }

    /**
     * Validate that a given path is within the workspace root
     * Throws an error if the path escapes the workspace boundary
     */
    _validatePath(targetPath) {
        if (!this.workspacePath) return; // No workspace set, skip validation
        const resolved = path.resolve(targetPath);
        const workspace = path.resolve(this.workspacePath);
        if (!resolved.toLowerCase().startsWith(workspace.toLowerCase())) {
            throw new Error(`🚫 ACCESS DENIED: Path "${targetPath}" is outside the workspace root "${this.workspacePath}". The AI is only allowed to operate within the current workspace.`);
        }
    }

    /**
     * Emit file system refresh event to frontend
     */
    _emitRefresh(targetPath) {
        if (!this.io) return;
        try {
            // Refresh the parent directory of the changed file
            const parentDir = path.dirname(targetPath);
            this.io.emit('fs:refresh', { path: parentDir });
            console.log(`[FS] Emitted refresh for ${parentDir}`);
        } catch (err) {
            console.error('[FS] Failed to emit refresh event:', err);
        }
    }

    // 1. view_file
    async viewFile({ AbsolutePath, StartLine, EndLine }) {
        this._validatePath(AbsolutePath);
        if (!fs.existsSync(AbsolutePath)) {
            throw new Error(`File not found: ${AbsolutePath}`);
        }

        const content = fs.readFileSync(AbsolutePath, 'utf-8');
        const lines = content.split('\n');

        // Handle line ranges (1-indexed)
        if (StartLine || EndLine) {
            const start = (StartLine || 1) - 1;
            const end = (EndLine || lines.length);
            return lines.slice(start, end).join('\n');
        }

        // Limit default view to 800 lines if no range specified
        if (lines.length > 800) {
            return lines.slice(0, 800).join('\n') + `\n\n... File truncated (showing 800 of ${lines.length} lines)`;
        }

        return content;
    }

    // 2. list_dir
    async listDir({ DirectoryPath }) {
        this._validatePath(DirectoryPath);
        if (!fs.existsSync(DirectoryPath)) {
            throw new Error(`Directory not found: ${DirectoryPath}`);
        }

        const items = fs.readdirSync(DirectoryPath, { withFileTypes: true });

        return items.map(item => {
            const isDir = item.isDirectory();
            const details = {
                name: item.name,
                isDir: isDir,
                path: path.join(DirectoryPath, item.name)
            };

            if (!isDir) {
                const stats = fs.statSync(path.join(DirectoryPath, item.name));
                details.sizeBytes = stats.size;
            } else {
                // Try to count children (non-recursive for performance)
                try {
                    const children = fs.readdirSync(path.join(DirectoryPath, item.name));
                    details.numChildren = children.length;
                } catch (e) {
                    details.numChildren = 'unknown';
                }
            }

            return details;
        }).sort((a, b) => {
            // Directories first
            if (a.isDir && !b.isDir) return -1;
            if (!a.isDir && b.isDir) return 1;
            return a.name.localeCompare(b.name);
        });
    }

    // 3. write_to_file
    async writeToFile({ TargetFile, Overwrite, CodeContent, EmptyFile }) {
        this._validatePath(TargetFile);
        console.log(`[FS] write_to_file: ${TargetFile} (Overwrite: ${Overwrite})`);

        if (fs.existsSync(TargetFile) && !Overwrite) {
            console.error(`   [FS] File exists and Overwrite is false`);
            throw new Error(`File already exists: ${TargetFile}. Set Overwrite to true to replace.`);
        }

        const dir = path.dirname(TargetFile);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
            console.log(`   [FS] Created directory: ${dir}`);
        }

        const content = EmptyFile ? '' : CodeContent || '';
        fs.writeFileSync(TargetFile, content, 'utf-8');

        console.log(`   [FS] Wrote ${content?.length || 0} chars to ${TargetFile}`);

        // Notify frontend
        this._emitRefresh(TargetFile);

        return `Successfully wrote to ${TargetFile}`;
    }

    // 4. replace_file_content
    async replaceFileContent({ TargetFile, TargetContent, ReplacementContent, AllowMultiple }) {
        this._validatePath(TargetFile);
        console.log(`[FS] replace_file_content: ${TargetFile}`);
        console.log(`   Target (first 80 chars): "${TargetContent?.substring(0, 80)}..."`);

        if (!fs.existsSync(TargetFile)) {
            console.error(`   [FS] File not found: ${TargetFile}`);
            throw new Error(`File not found: ${TargetFile}`);
        }

        let content = fs.readFileSync(TargetFile, 'utf-8');
        console.log(`   File size: ${content.length} chars`);

        if (!content.includes(TargetContent)) {
            console.error(`   [FS] Target content NOT FOUND in file!`);
            throw new Error('Target content not found in file');
        }

        // Check occurrence count
        const occurrences = content.split(TargetContent).length - 1;
        console.log(`   Found ${occurrences} occurrence(s)`);
        if (occurrences > 1 && !AllowMultiple) {
            throw new Error(`Found ${occurrences} occurrences of target content. Set AllowMultiple to true to replace all.`);
        }

        content = content.replaceAll(TargetContent, ReplacementContent);
        fs.writeFileSync(TargetFile, content, 'utf-8');

        console.log(`   [FS] Replaced ${content.length} chars in ${TargetFile}`);

        // Notify frontend
        this._emitRefresh(TargetFile);

        return `Successfully replaced content in ${TargetFile}`;
    }

    // 5. find_by_name
    async findByName({ SearchDirectory, Pattern, Extensions, Excludes }) {
        this._validatePath(SearchDirectory);
        const options = {
            cwd: SearchDirectory,
            absolute: true,
            ignore: ['**/node_modules/**', '**/dist/**', '**/build/**', '**/coverage/**', ...(Excludes || [])]
        };

        // If Extensions provided, modify pattern to match extensions
        let searchPattern = Pattern;
        if (Extensions && Extensions.length > 0) {
            // Example: "Button*" with extensions ["js", "jsx"] becomes "Button*.{js,jsx}"
            const extPattern = Extensions.length === 1 ? Extensions[0] : `{${Extensions.join(',')}}`;
            searchPattern = `${Pattern}.${extPattern}`;
        }

        const files = await glob(searchPattern ? `**/${searchPattern}` : '**/*', options);
        return files.slice(0, 50); // Cap at 50 results
    }

    // 6. grep_search (Simple implementation using grep/findstr logic)
    async grepSearch({ SearchPath, Query, CaseInsensitive }) {
        this._validatePath(SearchPath);
        if (!fs.existsSync(SearchPath)) {
            throw new Error(`Path not found: ${SearchPath}`);
        }

        // Need to implement a simple JS-based grep to avoid OS dependency issues initially
        // Proper grep/ripgrep integration would be better for later phases
        const stats = fs.statSync(SearchPath);
        const filesToSearch = [];

        if (stats.isDirectory()) {
            const files = await glob('**/*', {
                cwd: SearchPath,
                absolute: true,
                nodir: true,
                ignore: ['**/node_modules/**', '**/dist/**']
            });
            filesToSearch.push(...files);
        } else {
            filesToSearch.push(SearchPath);
        }

        const results = [];
        const regex = new RegExp(Query, CaseInsensitive ? 'i' : '');

        for (const file of filesToSearch) {
            if (results.length >= 50) break;

            try {
                const content = fs.readFileSync(file, 'utf-8');
                const lines = content.split('\n');

                lines.forEach((line, index) => {
                    if (regex.test(line)) {
                        results.push({
                            file,
                            lineNumber: index + 1,
                            lineContent: line.trim()
                        });
                    }
                });
            } catch (error) {
                // Skip binary files or read errors
            }
        }

        return results.slice(0, 50);
    }

    // 7. view_file_outline
    async viewFileOutline({ AbsolutePath, ItemOffset = 0 }) {
        this._validatePath(AbsolutePath);
        if (!fs.existsSync(AbsolutePath)) {
            throw new Error(`File not found: ${AbsolutePath}`);
        }

        const content = fs.readFileSync(AbsolutePath, 'utf-8');
        const ext = path.extname(AbsolutePath).toLowerCase();
        const items = [];

        // Simple regex-based parsing
        const lines = content.split('\n');

        if (['.js', '.jsx', '.ts', '.tsx'].includes(ext)) {
            // Match functions and classes
            const regex = /(?:export\s+)?(?:default\s+)?(?:async\s+)?(?:class|function)\s+([a-zA-Z0-9_]+)|(?:const|var|let)\s+([a-zA-Z0-9_]+)\s*=\s*(?:async\s*)?(?:function\s*\(|\()/g;

            lines.forEach((line, index) => {
                let match;
                while ((match = regex.exec(line)) !== null) {
                    const name = match[1] || match[2];
                    if (name) {
                        items.push({
                            name,
                            kind: line.includes('class') ? 'class' : 'function',
                            line: index + 1
                        });
                    }
                }
            });
        } else if (['.py'].includes(ext)) {
            const regex = /^(?:async\s+)?(class|def)\s+([a-zA-Z0-9_]+)/;
            lines.forEach((line, index) => {
                const match = line.trim().match(regex);
                if (match) {
                    items.push({
                        name: match[2],
                        kind: match[1] === 'class' ? 'class' : 'function',
                        line: index + 1
                    });
                }
            });
        }

        // Pagination
        const pageSize = 50;
        const totalItems = items.length;
        const slicedItems = items.slice(ItemOffset, ItemOffset + pageSize);

        return {
            totalItems,
            items: slicedItems,
            fileContent: totalItems === 0 && content.length < 5000 ? content : undefined // Show content if no items and file is small
        };
    }

    // 8. view_code_item
    async viewCodeItem({ File, NodePaths }) {
        this._validatePath(File);
        if (!fs.existsSync(File)) {
            throw new Error(`File not found: ${File}`);
        }

        const content = fs.readFileSync(File, 'utf-8');
        const lines = content.split('\n');
        const results = [];

        for (const nodePath of NodePaths) {
            // Naive search for the definition matching the last part of nodePath
            const name = nodePath.split('.').pop();
            const index = lines.findIndex(line => line.includes(name) && (line.includes('function') || line.includes('class') || line.includes('const')));

            if (index !== -1) {
                // Determine end line based on indentation or braces (naive implementation)
                let endIndex = index;
                const startIndent = lines[index].search(/\S|$/);

                // Scan forward to find end of block 
                // This is a simplified heuristic
                let braceCount = 0;
                let foundBrace = false;

                for (let i = index; i < lines.length; i++) {
                    const line = lines[i];
                    braceCount += (line.match(/\{/g) || []).length;
                    braceCount -= (line.match(/\}/g) || []).length;

                    if (line.includes('{')) foundBrace = true;

                    if (foundBrace && braceCount === 0) {
                        endIndex = i;
                        break;
                    }
                }

                // Fallback for Python or if braces missing: look for next line with same/less indent
                if (!foundBrace) {
                    for (let i = index + 1; i < lines.length; i++) {
                        if (lines[i].trim() && lines[i].search(/\S|$/) <= startIndent) {
                            endIndex = i - 1;
                            break;
                        }
                        endIndex = i;
                    }
                }

                results.push(lines.slice(index, endIndex + 1).join('\n'));
            } else {
                results.push(`// Item ${nodePath} not found`);
            }
        }

        return results.join('\n\n' + '-'.repeat(40) + '\n\n');
    }

    // 9. multi_replace_file_content
    async multiReplaceFileContent({ TargetFile, ReplacementChunks, Description }) {
        this._validatePath(TargetFile);
        console.log(`[FS] multi_replace_file_content: ${TargetFile}`);
        console.log(`   Chunks to apply: ${ReplacementChunks?.length || 0}`);

        if (!fs.existsSync(TargetFile)) {
            console.error(`   [FS] File not found: ${TargetFile}`);
            throw new Error(`File not found: ${TargetFile}`);
        }

        let content = fs.readFileSync(TargetFile, 'utf-8');
        console.log(`   File size: ${content.length} chars`);

        // Sort chunks by StartLine descending to avoid offset issues
        const sortedChunks = [...ReplacementChunks].sort((a, b) => b.StartLine - a.StartLine);

        for (let i = 0; i < sortedChunks.length; i++) {
            const chunk = sortedChunks[i];
            const { TargetContent, ReplacementContent, AllowMultiple } = chunk;

            console.log(`   Chunk ${i + 1}: Target (first 80 chars): "${TargetContent?.substring(0, 80)}..."`);

            // Check if content exists
            if (!content.includes(TargetContent)) {
                console.error(`   [FS] Chunk ${i + 1}: Target content NOT FOUND!`);
                throw new Error(`Target content not found: "${TargetContent.substring(0, 50)}..."`);
            }

            if (AllowMultiple) {
                content = content.replaceAll(TargetContent, ReplacementContent);
            } else {
                content = content.replace(TargetContent, ReplacementContent);
            }
            console.log(`   [FS] Chunk ${i + 1} applied`);
        }

        fs.writeFileSync(TargetFile, content, 'utf-8');
        console.log(`   [FS] Wrote ${content.length} chars to ${TargetFile}`);

        // Notify frontend
        this._emitRefresh(TargetFile);

        return `Successfully applied ${ReplacementChunks.length} changes to ${TargetFile}`;
    }
}

export default FileSystemTools;
