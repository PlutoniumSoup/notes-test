# KnowYourPath Design System

## Brand Identity

**KnowYourPath** is an intelligent note-taking and knowledge management system. The design should reflect:
- **Intelligence & Clarity**: Clean, organized, and purposeful
- **Visual Depth**: Rich colors, smooth gradients, and layered interfaces
- **Dynamic Interaction**: Smooth animations and responsive feedback
- **Premium Feel**: Modern, polished, and professional

---

## Color Palette

### Light Theme
- **Primary**: `#4f46e5` (Indigo 600) - Main actions, links
- **Primary Hover**: `#4338ca` (Indigo 700)
- **Secondary**: `#10b981` (Emerald 500) - Success, save actions
- **Background**: `#f9fafb` (Gray 50) - App background
- **Surface**: `#ffffff` (White) - Cards, panels
- **Surface Elevated**: `#ffffff` with shadow
- **Border**: `#e5e7eb` (Gray 200)
- **Text Primary**: `#111827` (Gray 900)
- **Text Secondary**: `#6b7280` (Gray 500)
- **Text Tertiary**: `#9ca3af` (Gray 400)
- **Warning**: `#f59e0b` (Amber 500)
- **Error**: `#ef4444` (Red 500)
- **Accent**: `#8b5cf6` (Violet 500) - Knowledge gaps, highlights

### Dark Theme
- **Primary**: `#6366f1` (Indigo 500)
- **Primary Hover**: `#818cf8` (Indigo 400)
- **Secondary**: `#34d399` (Emerald 400)
- **Background**: `#0f172a` (Slate 900)
- **Surface**: `#1e293b` (Slate 800)
- **Surface Elevated**: `#334155` (Slate 700)
- **Border**: `#334155` (Slate 700)
- **Text Primary**: `#f1f5f9` (Slate 100)
- **Text Secondary**: `#94a3b8` (Slate 400)
- **Text Tertiary**: `#64748b` (Slate 500)
- **Warning**: `#fbbf24` (Amber 400)
- **Error**: `#f87171` (Red 400)
- **Accent**: `#a78bfa` (Violet 400)

---

## Typography

### Font Family
```css
--font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
--font-mono: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
```

### Font Sizes
- **xs**: 12px (0.75rem)
- **sm**: 14px (0.875rem)
- **base**: 16px (1rem)
- **lg**: 18px (1.125rem)
- **xl**: 20px (1.25rem)
- **2xl**: 24px (1.5rem)
- **3xl**: 30px (1.875rem)

### Font Weights
- **Regular**: 400
- **Medium**: 500
- **Semibold**: 600
- **Bold**: 700

---

## Spacing System

Based on 4px grid:
- **xs**: 4px
- **sm**: 8px
- **md**: 12px
- **lg**: 16px
- **xl**: 20px
- **2xl**: 24px
- **3xl**: 32px
- **4xl**: 48px

---

## Border Radius

- **sm**: 4px - Inputs, small elements
- **md**: 8px - Cards, buttons
- **lg**: 12px - Large cards, modals
- **xl**: 16px - Hero sections
- **full**: 9999px - Pills, circular elements

---

## Shadows

### Light Theme
- **sm**: `0 1px 2px 0 rgba(0, 0, 0, 0.05)`
- **md**: `0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)`
- **lg**: `0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)`
- **xl**: `0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)`

### Dark Theme
- **sm**: `0 1px 2px 0 rgba(0, 0, 0, 0.3)`
- **md**: `0 4px 6px -1px rgba(0, 0, 0, 0.4), 0 2px 4px -1px rgba(0, 0, 0, 0.3)`
- **lg**: `0 10px 15px -3px rgba(0, 0, 0, 0.5), 0 4px 6px -2px rgba(0, 0, 0, 0.4)`
- **xl**: `0 20px 25px -5px rgba(0, 0, 0, 0.6), 0 10px 10px -5px rgba(0, 0, 0, 0.5)`

---

## Glassmorphism

Modern glass-like frosted effect for premium UI feel.

### Glass Background Variables
```css
--glass-bg-light: rgba(255, 255, 255, 0.7);
--glass-bg-dark: rgba(30, 41, 59, 0.7);
--glass-border-light: rgba(255, 255, 255, 0.18);
--glass-border-dark: rgba(255, 255, 255, 0.1);
```

### Glass Effects
- **Backdrop filter**: `blur(10px) saturate(180%)`
- **Background**: Semi-transparent with opacity 0.7-0.9
- **Border**: 1px solid with low opacity (rgba white 0.1-0.2)
- **Shadow**: Subtle elevated shadow

### Usage Examples
**Glass Card:**
```css
background: var(--glass-bg);
backdrop-filter: blur(10px) saturate(180%);
border: 1px solid var(--glass-border);
box-shadow: var(--shadow-md);
```

**Glass Panel (Editor, Settings):**
```css
background: rgba(255, 255, 255, 0.05);
backdrop-filter: blur(20px);
border: 1px solid rgba(255, 255, 255, 0.1);
```

---

## Animations & Transitions

### Duration
- **fast**: 150ms - Hover states, toggles
- **normal**: 250ms - Most transitions
- **slow**: 350ms - Complex animations

### Easing
- **ease-in-out**: `cubic-bezier(0.4, 0, 0.2, 1)` - Standard
- **ease-out**: `cubic-bezier(0, 0, 0.2, 1)` - Entering
- **ease-in**: `cubic-bezier(0.4, 0, 1, 1)` - Exiting
- **bounce**: `cubic-bezier(0.68, -0.55, 0.265, 1.55)` - Playful

### Micro-animations
- **Button hover**: Scale up slightly (1.02) + shadow increase
- **Card hover**: Lift effect (translateY + shadow)
- **Input focus**: Border color + ring glow
- **Modal enter**: Fade in + scale from 0.95
- **Toast notification**: Slide in from right

---

## Component Patterns

### Buttons
- **Primary**: Bold background, high contrast
- **Secondary**: Outlined or subtle background
- **Ghost**: Transparent, text only
- **Icon**: Square or circular, icon-only

### Cards
- White/surface background
- Subtle shadow
- Rounded corners (md or lg)
- Hover effect: lift and shadow increase

### Inputs
- Clear border
- Focus ring with primary color
- Placeholder in tertiary text color
- Error state with red border

### Navigation
- Clean, minimal
- Active state with primary color
- Smooth transitions between sections

### Graph Visualization
- Vibrant node colors
- Subtle connection lines
- Highlight on hover/selection
- Smooth zoom/pan

---

## Accessibility

- Minimum contrast ratio: 4.5:1 for normal text
- Focus indicators on all interactive elements
- Keyboard navigation support
- Screen reader friendly labels
- Reduced motion support for animations

---

## Implementation Notes

Use CSS custom properties (CSS variables) for all design tokens.
This allows runtime theme switching without rebuilding.

Example:
```css
:root[data-theme="light"] {
  --color-primary: #4f46e5;
  --color-background: #f9fafb;
  /* ... */
}

:root[data-theme="dark"] {
  --color-primary: #6366f1;
  --color-background: #0f172a;
  /* ... */
}
```
