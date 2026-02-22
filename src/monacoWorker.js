// 🔥 Monaco Editor Worker Configuration for Vite
// This file must be imported BEFORE any Monaco usage

import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker';
import cssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker';
import htmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker';
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker';

// 🔥 Use window instead of self for browser context
window.MonacoEnvironment = {
    getWorker(workerId, label) {
        console.log('🔧 Monaco requesting worker for:', label);

        if (label === 'json') {
            return new jsonWorker();
        }
        if (label === 'css' || label === 'scss' || label === 'less') {
            return new cssWorker();
        }
        if (label === 'html' || label === 'handlebars' || label === 'razor') {
            return new htmlWorker();
        }
        if (label === 'typescript' || label === 'javascript') {
            return new tsWorker();
        }
        return new editorWorker();
    },
};

console.log('✅ Monaco Worker Environment configured:', window.MonacoEnvironment);

// 🔥 Configure TypeScript/JavaScript IntelliSense
import * as monaco from 'monaco-editor';

// Wait for Monaco to be ready, then configure TypeScript
const configureTypeScript = () => {
    const ts = monaco.languages.typescript;

    // ✅ JavaScript Configuration
    ts.javascriptDefaults.setDiagnosticsOptions({
        noSemanticValidation: false,
        noSyntaxValidation: false,
    });

    ts.javascriptDefaults.setCompilerOptions({
        target: ts.ScriptTarget.ESNext,
        module: ts.ModuleKind.ESNext,
        moduleResolution: ts.ModuleResolutionKind.NodeJs,
        allowNonTsExtensions: true,
        allowJs: true,
        checkJs: true,
        jsx: ts.JsxEmit.React,
        jsxFactory: 'React.createElement',
        allowSyntheticDefaultImports: true,
        esModuleInterop: true,
    });

    // ✅ TypeScript Configuration
    ts.typescriptDefaults.setDiagnosticsOptions({
        noSemanticValidation: false,
        noSyntaxValidation: false,
    });

    ts.typescriptDefaults.setCompilerOptions({
        target: ts.ScriptTarget.ESNext,
        module: ts.ModuleKind.ESNext,
        moduleResolution: ts.ModuleResolutionKind.NodeJs,
        allowNonTsExtensions: true,
        jsx: ts.JsxEmit.React,
        jsxFactory: 'React.createElement',
        allowSyntheticDefaultImports: true,
        esModuleInterop: true,
        strict: true,
    });

    // ✅ Add React Type Definitions for JSX IntelliSense
    const reactTypes = `
    declare namespace React {
      function createElement(type: any, props?: any, ...children: any[]): any;
      function useState<T>(initialState: T | (() => T)): [T, (value: T | ((prev: T) => T)) => void];
      function useEffect(effect: () => (void | (() => void)), deps?: any[]): void;
      function useRef<T>(initialValue: T): { current: T };
      function useCallback<T extends (...args: any[]) => any>(callback: T, deps: any[]): T;
      function useMemo<T>(factory: () => T, deps: any[]): T;
      function useContext<T>(context: Context<T>): T;
      function useReducer<R extends Reducer<any, any>>(reducer: R, initialState: any): [any, Dispatch<any>];
      interface Context<T> { Provider: any; Consumer: any; }
      type Reducer<S, A> = (state: S, action: A) => S;
      type Dispatch<A> = (action: A) => void;
    }
    declare const React: typeof React;
  `;

    // ✅ Add Console/DOM type definitions
    const globalTypes = `
    interface Console {
      log(...args: any[]): void;
      error(...args: any[]): void;
      warn(...args: any[]): void;
      info(...args: any[]): void;
      debug(...args: any[]): void;
      table(data: any): void;
      clear(): void;
      group(...label: any[]): void;
      groupEnd(): void;
      time(label?: string): void;
      timeEnd(label?: string): void;
    }
    declare const console: Console;
    
    declare function setTimeout(handler: (...args: any[]) => void, timeout?: number): number;
    declare function setInterval(handler: (...args: any[]) => void, timeout?: number): number;
    declare function clearTimeout(handle?: number): void;
    declare function clearInterval(handle?: number): void;
    declare function fetch(input: string, init?: any): Promise<Response>;
    
    interface Response {
      json(): Promise<any>;
      text(): Promise<string>;
      ok: boolean;
      status: number;
    }
    
    interface Document {
      getElementById(id: string): HTMLElement | null;
      querySelector(selectors: string): Element | null;
      querySelectorAll(selectors: string): NodeList;
      createElement(tagName: string): HTMLElement;
    }
    declare const document: Document;
    
    interface Window {
      localStorage: Storage;
      sessionStorage: Storage;
    }
    declare const window: Window;
    
    interface Storage {
      getItem(key: string): string | null;
      setItem(key: string, value: string): void;
      removeItem(key: string): void;
      clear(): void;
    }
  `;

    // Add type definitions to both JS and TS
    ts.javascriptDefaults.addExtraLib(reactTypes, 'react.d.ts');
    ts.javascriptDefaults.addExtraLib(globalTypes, 'globals.d.ts');
    ts.typescriptDefaults.addExtraLib(reactTypes, 'react.d.ts');
    ts.typescriptDefaults.addExtraLib(globalTypes, 'globals.d.ts');

    // ✅ Enable eager model sync for better IntelliSense
    ts.javascriptDefaults.setEagerModelSync(true);
    ts.typescriptDefaults.setEagerModelSync(true);

    console.log('✅ TypeScript/JavaScript IntelliSense configured!');
};

// Run configuration
configureTypeScript();
