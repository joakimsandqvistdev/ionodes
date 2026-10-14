# Accessibility and keyboard shortcuts

The palette and inspector use named regions, icon-only actions have accessible names, inputs have visible labels and focus rings, and connection handles expose their direction and label. Connector color is accompanied by a text label and optional type key. Validation errors include text and an icon.

React Flow provides keyboard navigation and canvas controls. The editor adds these shortcuts when focus is outside a text field:

| Shortcut             | Action                             |
| -------------------- | ---------------------------------- |
| Ctrl/Cmd + Z         | Undo                               |
| Ctrl/Cmd + Shift + Z | Redo                               |
| Ctrl/Cmd + Y         | Redo                               |
| Delete / Backspace   | Delete selected node or connection |
| Ctrl/Cmd + 0         | Fit graph to canvas                |

Motion is reduced when the operating system requests reduced motion. Consumers should provide meaningful connector labels and descriptions and retain sufficient contrast when customizing theme tokens.
