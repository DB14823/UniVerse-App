# Liquid Glass Tab Bar — Design Spec

**Date:** 2026-06-25  
**Status:** Approved

---

## Overview

Replace the two React Native bottom navigation components (`BottomNavStudent`, `BottomNavOrg`) with a fully native Swift UIView that uses iOS 26's `UIGlassEffect` API to render a floating liquid glass pill tab bar. Navigation logic, active state, and unread badge counts remain managed in React Native and passed as props to the native view.

---

## Goals

- Tab bar visually and behaviourally identical to native iOS 26 apps (real `UIGlassEffect`, not simulated blur)
- Zero changes to routing logic in `Students/_layout.tsx` or `Organisations/_layout.tsx`
- Graceful fallback to `UIVisualEffectView` + `systemUltraThinMaterial` on iOS < 26
- Unread message badge preserved
- Haptics preserved (upgraded to native `UIImpactFeedbackGenerator`)

---

## Module Structure

```
SourceCode/frontend/
  modules/
    liquid-glass-tab-bar/
      ios/
        LiquidGlassTabBarModule.swift      # Expo module registration
        LiquidGlassTabBarView.swift        # UIView subclass — main implementation
      index.ts                             # TypeScript interface (props + events)
      LiquidGlassTabBar.podspec            # CocoaPods spec for local module
  app/
    components/
      LiquidGlassTabBar.tsx               # RN wrapper component
```

`BottomNavStudent.tsx` and `BottomNavOrg.tsx` are deleted. Both layout files import `LiquidGlassTabBar` instead.

---

## Native View: `LiquidGlassTabBarView`

### Layout

- Floating pill, horizontally centred, positioned above the safe area bottom inset
- 16pt horizontal margin from screen edges on each side
- Height: 64pt
- Corner radius: 32pt (full pill)
- Does **not** span full screen width

### Glass Material

```swift
// iOS 26+
if #available(iOS 26.0, *) {
    let glassEffect = UIGlassEffect()
    // applied via UIVisualEffectView wrapping the pill
}
// iOS < 26 fallback
else {
    let blur = UIBlurEffect(style: .systemUltraThinMaterial)
    // UIVisualEffectView with blur
}
```

A thin white border (`rgba(255,255,255,0.15)`) is added around the pill on both paths to give definition against dark backgrounds.

### Tab Items

Each tab item is a `UIButton` laid out with equal flex spacing inside the pill.

Icon: SF Symbol (system image), size 22pt  
Label: System font, 11pt, semibold  
Vertical stack: icon above label, 4pt gap

**SF Symbol mappings:**

| RN tab key    | Inactive symbol        | Active symbol           |
|---------------|------------------------|-------------------------|
| events        | `calendar`             | `calendar.fill`         |
| tickets       | `ticket`               | `ticket.fill`           |
| social        | `person.3`             | `person.3.fill`         |
| messages      | `message`              | `message.fill`          |
| myEvents      | `calendar`             | `calendar.fill`         |
| createEvent   | `plus.circle`          | `plus.circle.fill`      |

### Active State

Active tab item is wrapped in a secondary glass highlight:
- Inset rounded rect background within the pill
- On iOS 26: nested `UIGlassEffect` view (slightly more opaque)
- On iOS < 26: `rgba(255,255,255,0.12)` background
- Icon and label tinted with the accent colour passed from RN (purple for students, cyan for orgs)
- Inactive items: `rgba(255,255,255,0.55)` tint (legible on both light and dark content behind)

### Unread Badge

Rendered on the messages tab item only, top-right corner of the icon:
- Red circle (`#EF4444`) for counts 1–9
- Red pill with number for 10–99
- `99+` text for 100+
- Hidden when count is 0

### Haptics

```swift
let generator = UIImpactFeedbackGenerator(style: .light)
generator.impactOccurred()
```

Called on `touchUpInside` before firing the RN event.

### Positioning

The view is absolutely positioned by the Expo module. The parent RN `View` in `LiquidGlassTabBar.tsx` has `pointerEvents="none"` and fills the bottom safe area region. The native pill floats 12pt above the home indicator.

---

## Expo Module: `LiquidGlassTabBarModule`

Registered as a native view using `expo-modules-core`'s `ExpoView` base class.

### Props (RN → Native)

```typescript
tabs: Array<{
  key: string;
  label: string;
  sfSymbol: string;        // inactive SF Symbol name
  sfSymbolActive: string;  // active SF Symbol name
}>;
activeTab: string;
unreadCounts: Record<string, number>;  // keyed by tab key
accentColor: string;                   // hex, e.g. "#8B5CF6"
```

### Events (Native → RN)

```typescript
onTabPress: (event: { tabKey: string }) => void;
```

---

## TypeScript Interface: `index.ts`

```typescript
import { requireNativeViewManager } from 'expo-modules-core';
import { ViewProps } from 'react-native';

export interface TabConfig {
  key: string;
  label: string;
  sfSymbol: string;
  sfSymbolActive: string;
}

export interface LiquidGlassTabBarProps extends ViewProps {
  tabs: TabConfig[];
  activeTab: string;
  unreadCounts: Record<string, number>;
  accentColor: string;
  onTabPress: (event: { nativeEvent: { tabKey: string } }) => void;
}

const NativeView = requireNativeViewManager('LiquidGlassTabBar');
export default NativeView;
```

---

## React Native Wrapper: `LiquidGlassTabBar.tsx`

Thin wrapper that translates the existing `BottomNavStudent`/`BottomNavOrg` props shape into the native view's props shape. Handles the static tab config arrays and SF Symbol mappings at the JS level so the native view is generic.

The wrapper:
- Accepts the same props as the existing bottom nav components
- Passes `accentColor` based on user role (purple for students, cyan for orgs)
- Maps `unreadMessageCount` → `unreadCounts: { messages: n }`
- Calls `onTabPress(tab.key)` from the native `onTabPress` event

---

## Layout Integration

`Students/_layout.tsx` and `Organisations/_layout.tsx` change only the import and component name:

```diff
- import BottomNavStudent from "../components/BottomNavStudent";
+ import LiquidGlassTabBar from "../components/LiquidGlassTabBar";

  tabBar={() => (
-   <BottomNavStudent ... />
+   <LiquidGlassTabBar ... />
  )}
```

No routing, state, or callback logic changes.

---

## Build Requirement

Adding a native Swift module requires a **full EAS rebuild**. OTA updates cannot deliver native code changes. After the initial rebuild, any changes to the JS wrapper or props can still ship as OTA updates.

Command after implementation:
```
eas build --platform ios --profile preview
```

---

## Fallback Behaviour (iOS < 26)

On devices running iOS 15–25, the pill renders with `UIBlurEffect(style: .systemUltraThinMaterial)` — a frosted glass look that reads well on dark backgrounds. All layout, active state, badge, and haptic behaviour is identical. The only difference is the glass material itself.

---

## Module Linking

The local module must be registered as a local package dependency so Expo's build system picks up the native code:

```json
// package.json — add to dependencies
"liquid-glass-tab-bar": "file:./modules/liquid-glass-tab-bar"
```

Then `npx expo install` to link it. The `.podspec` file tells CocoaPods where to find the Swift source files during the EAS build.

---

## Tab Bar Container Height

Expo Router's `Tabs` component renders the `tabBar` prop inside a container whose height determines the bottom inset applied to screen content. This needs to be set explicitly to accommodate the floating pill plus its bottom margin:

```tsx
// LiquidGlassTabBar.tsx
// Container height = pill height (64) + bottom safe area + 12pt margin above home indicator
// Use useSafeAreaInsets() to compute dynamically
const { bottom } = useSafeAreaInsets();
const containerHeight = 64 + bottom + 12;
```

The container background must be transparent so screen content is visible behind the floating pill.

---

## Files Changed

| File | Action |
|------|--------|
| `modules/liquid-glass-tab-bar/ios/LiquidGlassTabBarView.swift` | Create |
| `modules/liquid-glass-tab-bar/ios/LiquidGlassTabBarModule.swift` | Create |
| `modules/liquid-glass-tab-bar/index.ts` | Create |
| `modules/liquid-glass-tab-bar/LiquidGlassTabBar.podspec` | Create |
| `app/components/LiquidGlassTabBar.tsx` | Create |
| `app/Students/_layout.tsx` | Update import + component name |
| `app/Organisations/_layout.tsx` | Update import + component name |
| `app/components/BottomNavStudent.tsx` | Delete |
| `app/components/BottomNavOrg.tsx` | Delete |
| `package.json` | Add local module dependency |
