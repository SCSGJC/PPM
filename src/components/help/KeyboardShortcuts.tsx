import React from 'react';
import { Keyboard, Command } from 'lucide-react';

const KeyboardShortcuts: React.FC = () => {
  const shortcuts = [
    {
      category: 'General Navigation',
      items: [
        { keys: ['Ctrl', 'S'], mac: ['⌘', 'S'], description: 'Save current quotation' },
        { keys: ['Ctrl', 'Z'], mac: ['⌘', 'Z'], description: 'Undo last action' },
        { keys: ['Ctrl', 'Y'], mac: ['⌘', 'Shift', 'Z'], description: 'Redo last action' },
        { keys: ['Esc'], mac: ['Esc'], description: 'Close modal or cancel action' },
        { keys: ['Ctrl', 'P'], mac: ['⌘', 'P'], description: 'Print or export quotation' },
      ],
    },
    {
      category: 'Line Items',
      items: [
        { keys: ['Ctrl', 'N'], mac: ['⌘', 'N'], description: 'Add new line item' },
        { keys: ['Ctrl', 'D'], mac: ['⌘', 'D'], description: 'Duplicate selected line item' },
        { keys: ['Delete'], mac: ['Delete'], description: 'Delete selected line item' },
        { keys: ['Tab'], mac: ['Tab'], description: 'Move to next field' },
        { keys: ['Shift', 'Tab'], mac: ['Shift', 'Tab'], description: 'Move to previous field' },
        { keys: ['Enter'], mac: ['Enter'], description: 'Save and add new line item' },
      ],
    },
    {
      category: 'Search & Find',
      items: [
        { keys: ['Ctrl', 'F'], mac: ['⌘', 'F'], description: 'Search in current quotation' },
        { keys: ['Ctrl', 'K'], mac: ['⌘', 'K'], description: 'Quick search component library' },
      ],
    },
    {
      category: 'Editing',
      items: [
        { keys: ['Ctrl', 'C'], mac: ['⌘', 'C'], description: 'Copy selected text or item' },
        { keys: ['Ctrl', 'V'], mac: ['⌘', 'V'], description: 'Paste copied text or item' },
        { keys: ['Ctrl', 'X'], mac: ['⌘', 'X'], description: 'Cut selected text or item' },
        { keys: ['Ctrl', 'A'], mac: ['⌘', 'A'], description: 'Select all text in field' },
      ],
    },
    {
      category: 'View Options',
      items: [
        { keys: ['Ctrl', '+'], mac: ['⌘', '+'], description: 'Zoom in' },
        { keys: ['Ctrl', '-'], mac: ['⌘', '-'], description: 'Zoom out' },
        { keys: ['Ctrl', '0'], mac: ['⌘', '0'], description: 'Reset zoom level' },
      ],
    },
  ];

  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;

  const KeyBadge: React.FC<{ keyName: string }> = ({ keyName }) => (
    <kbd className="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-xs font-mono font-semibold text-gray-700">
      {keyName}
    </kbd>
  );

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-2xl font-bold text-gray-900 mb-2">Keyboard Shortcuts</h3>
        <p className="text-gray-600">
          Speed up your workflow with these keyboard shortcuts. Press the keys simultaneously unless otherwise noted.
        </p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Command className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <h4 className="font-bold text-blue-900 mb-1">Platform Detected</h4>
            <p className="text-blue-800 text-sm">
              You're on {isMac ? 'macOS' : 'Windows/Linux'}. Shortcuts shown below are for your platform.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {shortcuts.map((section) => (
          <div key={section.category} className="bg-white border-2 border-gray-200 rounded-lg overflow-hidden">
            <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
              <h4 className="font-bold text-gray-900 flex items-center gap-2">
                <Keyboard className="w-5 h-5 text-blue-600" />
                {section.category}
              </h4>
            </div>
            <div className="divide-y divide-gray-200">
              {section.items.map((item, idx) => (
                <div key={idx} className="px-6 py-4 flex items-center justify-between">
                  <span className="text-gray-700">{item.description}</span>
                  <div className="flex items-center gap-1">
                    {(isMac ? item.mac : item.keys).map((key, keyIdx) => (
                      <React.Fragment key={keyIdx}>
                        {keyIdx > 0 && <span className="text-gray-400 mx-1">+</span>}
                        <KeyBadge keyName={key} />
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <h4 className="font-bold text-yellow-900 mb-2">Note about Shortcuts</h4>
        <ul className="space-y-2 text-sm text-yellow-800">
          <li className="flex items-start gap-2">
            <span className="font-medium">•</span>
            <span>Some shortcuts may not work in all contexts (e.g., when a modal is open)</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="font-medium">•</span>
            <span>Browser shortcuts may override application shortcuts in some cases</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="font-medium">•</span>
            <span>Custom keyboard shortcuts may be added in future updates</span>
          </li>
        </ul>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
        <h4 className="font-bold text-gray-900 mb-3">Symbol Key</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <KeyBadge keyName="⌘" />
            <span className="text-gray-700">Command (Mac)</span>
          </div>
          <div className="flex items-center gap-2">
            <KeyBadge keyName="Ctrl" />
            <span className="text-gray-700">Control</span>
          </div>
          <div className="flex items-center gap-2">
            <KeyBadge keyName="Shift" />
            <span className="text-gray-700">Shift</span>
          </div>
          <div className="flex items-center gap-2">
            <KeyBadge keyName="Alt" />
            <span className="text-gray-700">Alt/Option</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KeyboardShortcuts;
