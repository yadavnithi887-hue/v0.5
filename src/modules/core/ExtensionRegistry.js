
import * as PrettierFormatter from '../extensions/prettier-formatter';
import * as LiveServer from '../extensions/live-server';
import * as TodoManager from '../extensions/todo-manager';
import * as ThemePicker from '../extensions/theme-picker';
import * as RestClient from '../extensions/rest-client';
import * as LoremGenerator from '../extensions/lorem-generator';

class ExtensionRegistry {
  constructor() {
    this.extensions = [

      PrettierFormatter,
      LiveServer,

      TodoManager,
      ThemePicker,
      RestClient,
      LoremGenerator
    ];

    // Core registries
    this.commands = new Map();
    this.sidebarItems = [];
    this.sidebarPanels = new Map();
    this.settingsSchema = [];

    // Store actual UI items
    this.statusBarItems = [];
    this.editorButtons = [];

    // Callbacks for real-time updates
    this.statusBarCallbacks = [];
    this.editorButtonCallbacks = [];

    // 🔥 NEW: Extension state management
    this.extensionStates = new Map(); // Track enabled/disabled state
    this.extensionMetadata = []; // Store full metadata

    // Initialization flag
    this.initialized = false;

    // 🔥 Load saved extension states from localStorage
    this.loadExtensionStates();
  }

  // 🔥 Load extension states from localStorage
  loadExtensionStates() {
    try {
      const saved = localStorage.getItem('extension_states');
      if (saved) {
        const states = JSON.parse(saved);
        Object.entries(states).forEach(([id, enabled]) => {
          this.extensionStates.set(id, enabled);
        });
        console.log('📦 Loaded extension states:', states);
      }
    } catch (e) {
      console.error('Error loading extension states:', e);
    }
  }

  // 🔥 Save extension states to localStorage
  saveExtensionStates() {
    try {
      const states = {};
      this.extensionStates.forEach((enabled, id) => {
        states[id] = enabled;
      });
      localStorage.setItem('extension_states', JSON.stringify(states));
      console.log('💾 Saved extension states:', states);
    } catch (e) {
      console.error('Error saving extension states:', e);
    }
  }

  // 🔥 Check if extension is enabled
  isExtensionEnabled(extensionId) {
    // Default to enabled if no state is set
    return this.extensionStates.get(extensionId) !== false;
  }

  // 🔥 Enable/Disable extension
  setExtensionEnabled(extensionId, enabled) {
    console.log(`${enabled ? '✅' : '❌'} ${extensionId} → ${enabled ? 'ENABLED' : 'DISABLED'}`);

    this.extensionStates.set(extensionId, enabled);
    this.saveExtensionStates();

    // Re-initialize to apply changes
    if (this.context) {
      this.initialize(this.context);
    }
  }

  // 🔥 Get all extensions with metadata
  getAllExtensions() {
    return this.extensionMetadata;
  }

  initialize(context) {
    console.log("🚀 Initializing Internal Extensions...");

    // Store context for re-initialization
    this.context = context;

    // Clear everything on re-initialization
    this.commands.clear();
    this.sidebarItems = [];
    this.sidebarPanels.clear();
    this.settingsSchema = [];
    this.statusBarItems = [];
    this.editorButtons = [];
    this.extensionMetadata = [];

    this.extensions.forEach(ext => {
      if (!ext.metadata) {
        console.warn(`Extension missing metadata:`, ext);
        return;
      }

      const extId = ext.metadata.id;
      const isEnabled = this.isExtensionEnabled(extId);

      // 🔥 Store metadata for all extensions (even disabled ones)
      this.extensionMetadata.push({
        ...ext.metadata,
        enabled: isEnabled,
        settings: ext.settings || []
      });

      // Skip activation if disabled
      if (!isEnabled) {
        console.log(`⏸️  ${ext.metadata.name} (DISABLED)`);
        return;
      }

      console.log(`📦 Loading: ${ext.metadata.name}`);

      // Load settings schema (only if enabled)
      if (ext.settings) {
        const settingsWithExtId = ext.settings.map(s => ({
          ...s,
          extensionId: extId
        }));
        this.settingsSchema.push(...settingsWithExtId);
      }

      // Activate extension
      if (ext.activate) {
        try {
          const extContext = {
            ...context,

            // Register commands
            registerCommand: (id, fn) => {
              console.log(`  ✓ Command registered: ${id}`);
              this.commands.set(id, fn);
            },

            // Register sidebar panels
            registerSidebarPanel: (id, item, component) => {
              console.log(`  ✓ Sidebar panel registered: ${id}`);
              this.sidebarItems.push({
                id,
                ...item,
                extensionId: extId // Track which extension owns this
              });
              this.sidebarPanels.set(id, component);
            },

            // Window API for UI elements
            window: {
              showInformationMessage: (msg) => context.toast.success(msg),
              showWarningMessage: (msg) => context.toast.warning(msg),
              showErrorMessage: (msg) => context.toast.error(msg),

              // Create status bar item
              createStatusBarItem: (item) => {
                console.log(`  ✓ Status bar item created:`, item);

                const itemWithExtId = { ...item, extensionId: extId };
                this.statusBarItems.push(itemWithExtId);

                this.statusBarCallbacks.forEach(cb => {
                  try {
                    cb(itemWithExtId);
                  } catch (e) {
                    console.error('Error in statusBar callback:', e);
                  }
                });
              },

              // Register editor button
              registerEditorButton: (btn) => {
                console.log(`  ✓ Editor button registered:`, btn);

                const btnWithExtId = { ...btn, extensionId: extId };
                this.editorButtons.push(btnWithExtId);

                this.editorButtonCallbacks.forEach(cb => {
                  try {
                    cb(btnWithExtId);
                  } catch (e) {
                    console.error('Error in editorButton callback:', e);
                  }
                });
              }
            }
          };

          ext.activate(extContext);
          console.log(`  ✅ ${ext.metadata.name} activated successfully`);

        } catch (e) {
          console.error(`❌ Failed to activate ${ext.metadata.name}:`, e);
        }
      }
    });

    this.initialized = true;
    console.log("✅ All extensions initialized");
    console.log(`📊 Active: ${this.extensionMetadata.filter(e => e.enabled).length}/${this.extensionMetadata.length}`);
  }

  // Get current data
  getCommands() {
    return this.commands;
  }

  getSidebarItems() {
    return this.sidebarItems;
  }

  getSidebarPanel(id) {
    return this.sidebarPanels.get(id);
  }

  getSettings() {
    return this.settingsSchema;
  }

  getStatusBarItems() {
    return this.statusBarItems;
  }

  getEditorButtons() {
    return this.editorButtons;
  }

  // Execute command
  executeCommand(id, args) {
    if (this.commands.has(id)) {
      try {
        console.log(`⚡ Executing command: ${id}`);
        return this.commands.get(id)(args);
      } catch (e) {
        console.error(`Error executing command ${id}:`, e);
      }
    } else {
      console.warn(`⚠️ Command not found: ${id}`);
    }
  }

  // Register listeners with initial data
  onStatusBarUpdate(callback) {
    console.log('📡 Status bar listener registered');
    this.statusBarCallbacks.push(callback);

    if (this.initialized) {
      console.log(`  → Sending ${this.statusBarItems.length} existing items`);
      this.statusBarItems.forEach(item => {
        try {
          callback(item);
        } catch (e) {
          console.error('Error sending existing statusBar item:', e);
        }
      });
    }

    return () => {
      console.log('📡 Status bar listener removed');
      this.statusBarCallbacks = this.statusBarCallbacks.filter(
        cb => cb !== callback
      );
    };
  }

  onEditorButtonUpdate(callback) {
    console.log('📡 Editor button listener registered');
    this.editorButtonCallbacks.push(callback);

    if (this.initialized) {
      console.log(`  → Sending ${this.editorButtons.length} existing buttons`);
      this.editorButtons.forEach(btn => {
        try {
          callback(btn);
        } catch (e) {
          console.error('Error sending existing editorButton:', e);
        }
      });
    }

    return () => {
      console.log('📡 Editor button listener removed');
      this.editorButtonCallbacks = this.editorButtonCallbacks.filter(
        cb => cb !== callback
      );
    };
  }
}

export const registry = new ExtensionRegistry();