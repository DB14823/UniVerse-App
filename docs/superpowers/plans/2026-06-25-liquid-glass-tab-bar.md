# Liquid Glass Tab Bar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace both React Native bottom nav components with a fully native Swift UIView that renders a floating liquid glass pill tab bar using iOS 26's `UIGlassEffect` API, with identical routing behaviour to the current implementation.

**Architecture:** A local Expo native module (`modules/liquid-glass-tab-bar/`) exposes a Swift `UIView` subclass to React Native. The view owns all rendering — glass material, SF Symbol icons, active highlight, unread badge, haptics. React Native owns all state (active tab, unread count) and routing, passing values as props and receiving tab press callbacks via an Expo event dispatcher.

**Tech Stack:** Swift 5.9, UIKit, `UIGlassEffect` (iOS 26) / `UIVisualEffectView` fallback (iOS 15–25), `expo-modules-core`, React Native, TypeScript, Expo Router

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `modules/liquid-glass-tab-bar/package.json` | Create | Local module manifest, referenced by root package.json |
| `modules/liquid-glass-tab-bar/LiquidGlassTabBar.podspec` | Create | Tells CocoaPods where to find Swift source files |
| `modules/liquid-glass-tab-bar/ios/LiquidGlassTabBarView.swift` | Create | UIView subclass — glass pill, icons, active state, badge, haptics |
| `modules/liquid-glass-tab-bar/ios/LiquidGlassTabBarModule.swift` | Create | Expo module registration — props, events |
| `modules/liquid-glass-tab-bar/index.ts` | Create | TypeScript interface for the native view |
| `app/components/LiquidGlassTabBar.tsx` | Create | RN wrapper — maps student/org props to native view props |
| `app/Students/_layout.tsx` | Modify | Swap import + component name, add role prop |
| `app/Organisations/_layout.tsx` | Modify | Swap import + component name, add role prop |
| `app/components/BottomNavStudent.tsx` | Delete | Replaced |
| `app/components/BottomNavOrg.tsx` | Delete | Replaced |
| `package.json` (frontend) | Modify | Add `"liquid-glass-tab-bar": "file:./modules/liquid-glass-tab-bar"` |

---

## Task 1: Module scaffold

**Files:**
- Create: `SourceCode/frontend/modules/liquid-glass-tab-bar/package.json`
- Create: `SourceCode/frontend/modules/liquid-glass-tab-bar/LiquidGlassTabBar.podspec`

- [ ] **Step 1: Create module directory and package.json**

```bash
mkdir -p SourceCode/frontend/modules/liquid-glass-tab-bar/ios
```

Write `SourceCode/frontend/modules/liquid-glass-tab-bar/package.json`:

```json
{
  "name": "liquid-glass-tab-bar",
  "version": "1.0.0",
  "description": "Native liquid glass tab bar for UniVerse",
  "main": "index.ts",
  "license": "MIT"
}
```

- [ ] **Step 2: Create podspec**

Write `SourceCode/frontend/modules/liquid-glass-tab-bar/LiquidGlassTabBar.podspec`:

```ruby
require 'json'

package = JSON.parse(File.read(File.join(__dir__, 'package.json')))

Pod::Spec.new do |s|
  s.name           = 'LiquidGlassTabBar'
  s.version        = package['version']
  s.summary        = package['description']
  s.description    = package['description']
  s.license        = package['license']
  s.homepage       = 'https://github.com/DB14823/UniVerse-App'
  s.platforms      = { ios: '15.0' }
  s.source         = { git: '' }
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.source_files   = 'ios/**/*.{swift}'
  s.swift_version  = '5.9'
end
```

- [ ] **Step 3: Register module in root package.json**

Open `SourceCode/frontend/package.json`. Add to the `dependencies` object (alphabetical position — after `"i18n-js"` or wherever `l` falls):

```json
"liquid-glass-tab-bar": "file:./modules/liquid-glass-tab-bar",
```

- [ ] **Step 4: Install the local module**

```bash
cd SourceCode/frontend && npm install
```

Expected: npm resolves the local file dependency. No errors.

- [ ] **Step 5: Commit scaffold**

```bash
git add modules/liquid-glass-tab-bar/package.json \
        modules/liquid-glass-tab-bar/LiquidGlassTabBar.podspec \
        package.json package-lock.json
git commit -m "chore: scaffold liquid-glass-tab-bar native module"
```

---

## Task 2: Swift native view

**Files:**
- Create: `SourceCode/frontend/modules/liquid-glass-tab-bar/ios/LiquidGlassTabBarView.swift`

This is the main implementation. It contains the `TabConfig` struct, a `UIColor` hex initialiser extension, and the `LiquidGlassTabBarView` class.

- [ ] **Step 1: Create `LiquidGlassTabBarView.swift`**

Write `SourceCode/frontend/modules/liquid-glass-tab-bar/ios/LiquidGlassTabBarView.swift`:

```swift
import UIKit
import ExpoModulesCore

// MARK: — Data

struct TabConfig {
    let key: String
    let label: String
    let sfSymbol: String
    let sfSymbolActive: String
}

// MARK: — UIColor hex helper

private extension UIColor {
    convenience init?(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        guard hex.count == 6 else { return nil }
        let r = CGFloat((int >> 16) & 0xFF) / 255
        let g = CGFloat((int >> 8) & 0xFF) / 255
        let b = CGFloat(int & 0xFF) / 255
        self.init(red: r, green: g, blue: b, alpha: 1)
    }
}

// MARK: — View

class LiquidGlassTabBarView: ExpoView {

    // MARK: Props
    var tabs: [TabConfig] = [] { didSet { rebuildTabButtons() } }
    var activeTab: String = "" { didSet { updateActiveState() } }
    var unreadCounts: [String: Int] = [:] { didSet { updateBadges() } }
    var accentColor: UIColor = UIColor(red: 0.545, green: 0.361, blue: 0.965, alpha: 1) {
        didSet { updateActiveState() }
    }
    let onTabPress = EventDispatcher()

    // MARK: UI
    private let pillContainer = UIView()
    private let activeHighlight = UIView()
    private var tabButtons: [UIButton] = []
    private var badgeViews: [String: UILabel] = [:]

    // MARK: Init
    required init(appContext: AppContext? = nil) {
        super.init(appContext: appContext)
        backgroundColor = .clear
        setupPill()
        setupActiveHighlight()
    }

    // MARK: Pill setup
    private func setupPill() {
        if #available(iOS 26.0, *) {
            let glassEffect = UIGlassEffect()
            let effectView = UIVisualEffectView(effect: glassEffect)
            effectView.autoresizingMask = [.flexibleWidth, .flexibleHeight]
            pillContainer.addSubview(effectView)
        } else {
            let blur = UIBlurEffect(style: .systemUltraThinMaterial)
            let effectView = UIVisualEffectView(effect: blur)
            effectView.autoresizingMask = [.flexibleWidth, .flexibleHeight]
            pillContainer.addSubview(effectView)
        }

        pillContainer.layer.cornerRadius = 32
        pillContainer.layer.cornerCurve = .continuous
        pillContainer.clipsToBounds = true
        pillContainer.layer.borderWidth = 0.5
        pillContainer.layer.borderColor = UIColor.white.withAlphaComponent(0.15).cgColor
        addSubview(pillContainer)
    }

    private func setupActiveHighlight() {
        activeHighlight.backgroundColor = UIColor.white.withAlphaComponent(0.18)
        activeHighlight.layer.cornerRadius = 24
        activeHighlight.layer.cornerCurve = .continuous
        activeHighlight.isUserInteractionEnabled = false
        activeHighlight.isHidden = true
        pillContainer.addSubview(activeHighlight)
    }

    // MARK: Tab button construction
    private func rebuildTabButtons() {
        tabButtons.forEach { $0.removeFromSuperview() }
        tabButtons.removeAll()
        badgeViews.values.forEach { $0.removeFromSuperview() }
        badgeViews.removeAll()

        for (index, tab) in tabs.enumerated() {
            let button = makeTabButton(tab: tab, index: index)
            pillContainer.addSubview(button)
            tabButtons.append(button)

            let badge = makeBadgeLabel()
            button.addSubview(badge)
            badgeViews[tab.key] = badge
        }

        updateActiveState()
        updateBadges()
        setNeedsLayout()
    }

    private func makeTabButton(tab: TabConfig, index: Int) -> UIButton {
        var cfg = UIButton.Configuration.plain()
        cfg.title = tab.label
        cfg.titleTextAttributesTransformer = UIConfigurationTextAttributesTransformer { attrs in
            var a = attrs
            a.font = UIFont.systemFont(ofSize: 11, weight: .semibold)
            return a
        }
        let symbolCfg = UIImage.SymbolConfiguration(pointSize: 22, weight: .medium)
        cfg.image = UIImage(systemName: tab.sfSymbol, withConfiguration: symbolCfg)
        cfg.imagePlacement = .top
        cfg.imagePadding = 4
        cfg.baseForegroundColor = UIColor.white.withAlphaComponent(0.55)

        let button = UIButton(configuration: cfg)
        button.tag = index
        button.addTarget(self, action: #selector(tabTapped(_:)), for: .touchUpInside)
        return button
    }

    private func makeBadgeLabel() -> UILabel {
        let badge = UILabel()
        badge.font = .systemFont(ofSize: 9, weight: .bold)
        badge.textColor = .white
        badge.backgroundColor = UIColor(red: 0.937, green: 0.267, blue: 0.267, alpha: 1)
        badge.textAlignment = .center
        badge.layer.cornerRadius = 7
        badge.clipsToBounds = true
        badge.isHidden = true
        return badge
    }

    // MARK: Tap handler
    @objc private func tabTapped(_ sender: UIButton) {
        guard sender.tag < tabs.count else { return }
        let generator = UIImpactFeedbackGenerator(style: .light)
        generator.impactOccurred()
        onTabPress(["tabKey": tabs[sender.tag].key])
    }

    // MARK: State updates
    func updateActiveState() {
        for (index, tab) in tabs.enumerated() {
            guard index < tabButtons.count else { continue }
            let button = tabButtons[index]
            let isActive = tab.key == activeTab
            let symbolName = isActive ? tab.sfSymbolActive : tab.sfSymbol
            let symbolCfg = UIImage.SymbolConfiguration(pointSize: 22, weight: .medium)

            guard var cfg = button.configuration else { continue }
            cfg.image = UIImage(systemName: symbolName, withConfiguration: symbolCfg)
            cfg.baseForegroundColor = isActive
                ? accentColor
                : UIColor.white.withAlphaComponent(0.55)
            button.configuration = cfg
        }
        positionActiveHighlight(animated: !activeHighlight.isHidden)
    }

    private func positionActiveHighlight(animated: Bool) {
        guard let idx = tabs.firstIndex(where: { $0.key == activeTab }),
              idx < tabButtons.count else {
            activeHighlight.isHidden = true
            return
        }
        activeHighlight.isHidden = false
        let targetFrame = tabButtons[idx].frame.insetBy(dx: 4, dy: 6)

        if animated {
            UIView.animate(
                withDuration: 0.3,
                delay: 0,
                usingSpringWithDamping: 0.75,
                initialSpringVelocity: 0.3,
                options: .curveEaseOut
            ) {
                self.activeHighlight.frame = targetFrame
            }
        } else {
            activeHighlight.frame = targetFrame
        }
    }

    func updateBadges() {
        for (key, badge) in badgeViews {
            let count = unreadCounts[key] ?? 0
            badge.isHidden = count == 0
            badge.text = count > 99 ? "99+" : "\(count)"
        }
        setNeedsLayout()
    }

    // MARK: Layout
    override func layoutSubviews() {
        super.layoutSubviews()

        let margin: CGFloat = 16
        let pillHeight: CGFloat = 64
        let pillWidth = bounds.width - (margin * 2)
        pillContainer.frame = CGRect(
            x: margin,
            y: bounds.height - pillHeight,
            width: pillWidth,
            height: pillHeight
        )

        // Ensure the effect view fills the pill
        pillContainer.subviews
            .first(where: { $0 is UIVisualEffectView })?
            .frame = pillContainer.bounds

        let buttonWidth = pillWidth / CGFloat(max(tabs.count, 1))
        for (i, button) in tabButtons.enumerated() {
            button.frame = CGRect(x: CGFloat(i) * buttonWidth, y: 0, width: buttonWidth, height: pillHeight)

            if let badge = badgeViews[tabs[i].key] {
                let badgeW = max(badge.intrinsicContentSize.width + 6, 14)
                badge.frame = CGRect(
                    x: (buttonWidth / 2) + 8,
                    y: 10,
                    width: badgeW,
                    height: 14
                )
                badge.layer.cornerRadius = 7
            }
        }

        positionActiveHighlight(animated: false)
    }
}
```

- [ ] **Step 2: Verify the file exists**

```bash
ls SourceCode/frontend/modules/liquid-glass-tab-bar/ios/
```

Expected: `LiquidGlassTabBarView.swift`

- [ ] **Step 3: Commit**

```bash
git add modules/liquid-glass-tab-bar/ios/LiquidGlassTabBarView.swift
git commit -m "feat: add LiquidGlassTabBarView Swift UIView"
```

---

## Task 3: Expo module registration

**Files:**
- Create: `SourceCode/frontend/modules/liquid-glass-tab-bar/ios/LiquidGlassTabBarModule.swift`

This file registers the native view with expo-modules-core, declaring all props and events so React Native can drive the Swift view.

- [ ] **Step 1: Create `LiquidGlassTabBarModule.swift`**

Write `SourceCode/frontend/modules/liquid-glass-tab-bar/ios/LiquidGlassTabBarModule.swift`:

```swift
import UIKit
import ExpoModulesCore

public class LiquidGlassTabBarModule: Module {
    public func definition() -> ModuleDefinition {
        Name("LiquidGlassTabBar")

        View(LiquidGlassTabBarView.self) {
            Events("onTabPress")

            // Array of { key, label, sfSymbol, sfSymbolActive }
            Prop("tabs") { (view: LiquidGlassTabBarView, rawTabs: [[String: String]]) in
                view.tabs = rawTabs.compactMap { dict in
                    guard
                        let key = dict["key"],
                        let label = dict["label"],
                        let sfSymbol = dict["sfSymbol"],
                        let sfSymbolActive = dict["sfSymbolActive"]
                    else { return nil }
                    return TabConfig(
                        key: key,
                        label: label,
                        sfSymbol: sfSymbol,
                        sfSymbolActive: sfSymbolActive
                    )
                }
            }

            Prop("activeTab") { (view: LiquidGlassTabBarView, activeTab: String) in
                view.activeTab = activeTab
            }

            Prop("unreadCounts") { (view: LiquidGlassTabBarView, counts: [String: Int]) in
                view.unreadCounts = counts
            }

            Prop("accentColor") { (view: LiquidGlassTabBarView, hex: String) in
                if let color = UIColor(hex: hex) {
                    view.accentColor = color
                }
            }
        }
    }
}
```

> **Note on `UIColor(hex:)`:** This extension is defined with `private` access in `LiquidGlassTabBarView.swift`. Because both files compile into the same Swift module (target), `private` means file-private — the module file cannot see it. Change the `UIColor` extension in `LiquidGlassTabBarView.swift` from `private extension UIColor` to `internal extension UIColor` so the module file can use it.

- [ ] **Step 2: Update access modifier in LiquidGlassTabBarView.swift**

In `LiquidGlassTabBarView.swift`, change line:
```swift
private extension UIColor {
```
to:
```swift
extension UIColor {
```

- [ ] **Step 3: Commit**

```bash
git add modules/liquid-glass-tab-bar/ios/LiquidGlassTabBarModule.swift \
        modules/liquid-glass-tab-bar/ios/LiquidGlassTabBarView.swift
git commit -m "feat: add LiquidGlassTabBarModule Expo registration"
```

---

## Task 4: TypeScript interface

**Files:**
- Create: `SourceCode/frontend/modules/liquid-glass-tab-bar/index.ts`

- [ ] **Step 1: Create `index.ts`**

Write `SourceCode/frontend/modules/liquid-glass-tab-bar/index.ts`:

```typescript
import { requireNativeViewManager } from "expo-modules-core";
import { ViewProps } from "react-native";

export interface TabConfig {
  key: string;
  label: string;
  sfSymbol: string;
  sfSymbolActive: string;
}

export interface LiquidGlassTabBarNativeProps extends ViewProps {
  tabs: TabConfig[];
  activeTab: string;
  unreadCounts: Record<string, number>;
  accentColor: string;
  onTabPress: (event: { nativeEvent: { tabKey: string } }) => void;
}

const NativeView =
  requireNativeViewManager<LiquidGlassTabBarNativeProps>("LiquidGlassTabBar");

export default NativeView;
```

- [ ] **Step 2: Commit**

```bash
git add modules/liquid-glass-tab-bar/index.ts
git commit -m "feat: add TypeScript interface for LiquidGlassTabBar native module"
```

---

## Task 5: React Native wrapper component

**Files:**
- Create: `SourceCode/frontend/app/components/LiquidGlassTabBar.tsx`

This component has the same surface area as both old nav components combined. It translates `role`, `activeTab`, `onTabPress`, and `unreadMessageCount` into the native view's props.

- [ ] **Step 1: Create `LiquidGlassTabBar.tsx`**

Write `SourceCode/frontend/app/components/LiquidGlassTabBar.tsx`:

```tsx
import React from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import NativeTabBar, { TabConfig } from "../../modules/liquid-glass-tab-bar/index";

const STUDENT_TABS: TabConfig[] = [
  { key: "events",   label: "Events",   sfSymbol: "calendar",    sfSymbolActive: "calendar.fill"    },
  { key: "tickets",  label: "Tickets",  sfSymbol: "ticket",      sfSymbolActive: "ticket.fill"      },
  { key: "social",   label: "Social",   sfSymbol: "person.3",    sfSymbolActive: "person.3.fill"    },
  { key: "messages", label: "Messages", sfSymbol: "message",     sfSymbolActive: "message.fill"     },
];

const ORG_TABS: TabConfig[] = [
  { key: "myEvents",    label: "My Events", sfSymbol: "calendar",    sfSymbolActive: "calendar.fill"    },
  { key: "createEvent", label: "Create",    sfSymbol: "plus.circle", sfSymbolActive: "plus.circle.fill" },
  { key: "social",      label: "Social",    sfSymbol: "person.3",    sfSymbolActive: "person.3.fill"    },
];

const STUDENT_ACCENT = "#8B5CF6";
const ORG_ACCENT = "#06B6D4";

interface StudentProps {
  role: "student";
  activeTab: string | null;
  onTabPress: (tab: string) => void;
  unreadMessageCount?: number;
}

interface OrgProps {
  role: "org";
  activeTab: string | null;
  onTabPress: (tab: string) => void;
}

type Props = StudentProps | OrgProps;

export default function LiquidGlassTabBar(props: Props) {
  const { bottom } = useSafeAreaInsets();
  // Container height = pill (64) + safe area bottom + 12pt above home indicator
  const containerHeight = 64 + bottom + 12;

  const tabs = props.role === "student" ? STUDENT_TABS : ORG_TABS;
  const accentColor = props.role === "student" ? STUDENT_ACCENT : ORG_ACCENT;
  const unreadCounts: Record<string, number> =
    props.role === "student" ? { messages: props.unreadMessageCount ?? 0 } : {};

  return (
    <View
      style={[styles.container, { height: containerHeight }]}
      pointerEvents="box-none"
    >
      <NativeTabBar
        style={StyleSheet.absoluteFill}
        tabs={tabs}
        activeTab={props.activeTab ?? ""}
        unreadCounts={unreadCounts}
        accentColor={accentColor}
        onTabPress={(event) => props.onTabPress(event.nativeEvent.tabKey)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "transparent",
  },
});
```

- [ ] **Step 2: Commit**

```bash
git add app/components/LiquidGlassTabBar.tsx
git commit -m "feat: add LiquidGlassTabBar React Native wrapper"
```

---

## Task 6: Wire up Students layout

**Files:**
- Modify: `SourceCode/frontend/app/Students/_layout.tsx`

- [ ] **Step 1: Swap the import**

In `app/Students/_layout.tsx`, replace:
```typescript
import BottomNavStudent from "../components/BottomNavStudent";
```
with:
```typescript
import LiquidGlassTabBar from "../components/LiquidGlassTabBar";
```

- [ ] **Step 2: Swap the component in the tabBar prop**

Find the `tabBar` section (around line 61) and replace:
```tsx
tabBar={() => (
  <BottomNavStudent
    activeTab={activeTab}
    unreadMessageCount={unreadCount}
    onTabPress={(tab) => {
      if (tab === activeTab && tab !== "messages") {
        router.setParams({ _r: Date.now().toString() });
        return;
      }
      router.replace(routeForTab(tab) as any);
    }}
  />
)}
```
with:
```tsx
tabBar={() => (
  <LiquidGlassTabBar
    role="student"
    activeTab={activeTab}
    unreadMessageCount={unreadCount}
    onTabPress={(tab) => {
      if (tab === activeTab && tab !== "messages") {
        router.setParams({ _r: Date.now().toString() });
        return;
      }
      router.replace(routeForTab(tab) as any);
    }}
  />
)}
```

- [ ] **Step 3: Commit**

```bash
git add app/Students/_layout.tsx
git commit -m "feat: wire LiquidGlassTabBar into Students layout"
```

---

## Task 7: Wire up Organisations layout

**Files:**
- Modify: `SourceCode/frontend/app/Organisations/_layout.tsx`

- [ ] **Step 1: Swap the import**

In `app/Organisations/_layout.tsx`, replace:
```typescript
import BottomNavOrg from "../components/BottomNavOrg";
```
with:
```typescript
import LiquidGlassTabBar from "../components/LiquidGlassTabBar";
```

- [ ] **Step 2: Swap the component in the tabBar prop**

Find the `tabBar` section (around line 35) and replace:
```tsx
tabBar={() => (
  <BottomNavOrg
    activeTab={activeTab}
    onTabPress={(tab) => {
      if (tab === activeTab) {
        router.setParams({ _r: Date.now().toString() });
        return;
      }
      router.replace(routeForTab(tab) as any);
    }}
  />
)}
```
with:
```tsx
tabBar={() => (
  <LiquidGlassTabBar
    role="org"
    activeTab={activeTab}
    onTabPress={(tab) => {
      if (tab === activeTab) {
        router.setParams({ _r: Date.now().toString() });
        return;
      }
      router.replace(routeForTab(tab) as any);
    }}
  />
)}
```

- [ ] **Step 3: Commit**

```bash
git add app/Organisations/_layout.tsx
git commit -m "feat: wire LiquidGlassTabBar into Organisations layout"
```

---

## Task 8: Delete old nav components

**Files:**
- Delete: `SourceCode/frontend/app/components/BottomNavStudent.tsx`
- Delete: `SourceCode/frontend/app/components/BottomNavOrg.tsx`

- [ ] **Step 1: Verify nothing else imports the old components**

```bash
grep -r "BottomNavStudent\|BottomNavOrg" SourceCode/frontend/app/
```

Expected: no output. If any file still imports them, update it first.

- [ ] **Step 2: Delete the files**

```bash
rm SourceCode/frontend/app/components/BottomNavStudent.tsx
rm SourceCode/frontend/app/components/BottomNavOrg.tsx
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "chore: remove BottomNavStudent and BottomNavOrg (replaced by native module)"
```

---

## Task 9: Build and verify

This is a native code change — it cannot run in Expo Go or via OTA update. You need a build that compiles the Swift module.

- [ ] **Step 1: Run TypeScript check**

```bash
cd SourceCode/frontend && npx tsc --noEmit
```

Expected: no errors. Fix any type errors before building.

- [ ] **Step 2: Trigger an EAS preview build**

```bash
eas build --platform ios --profile preview
```

This will take 10–20 minutes. The build compiles the Swift module via CocoaPods. Watch for any Swift compilation errors in the build log.

- [ ] **Step 3: Install on device and verify visually**

Install the build on a device running **iOS 26** for the full liquid glass effect. On iOS 15–25 you'll see the frosted glass fallback.

Checklist:
- [ ] Floating pill appears above home indicator with correct margins
- [ ] Glass material is visible (content shows through the pill)
- [ ] All 4 student tabs render with correct SF Symbol icons and labels
- [ ] All 3 org tabs render correctly when logged in as an org
- [ ] Tapping a tab navigates correctly
- [ ] Active tab highlight bubble animates to the tapped tab
- [ ] Active tab icon changes to filled variant and turns purple/cyan
- [ ] Haptic fires on every tap
- [ ] Unread message badge appears on Messages tab when count > 0
- [ ] Badge shows `99+` when count exceeds 99
- [ ] Badge disappears when count is 0

- [ ] **Step 4: Commit build confirmation**

```bash
git commit --allow-empty -m "chore: verify liquid glass tab bar on-device"
```

---

## Notes

### UIGlassEffect API
The `UIGlassEffect` class was introduced in iOS 26. If Xcode reports `cannot find type 'UIGlassEffect'`, ensure your Xcode SDK targets iOS 26 (`IPHONEOS_DEPLOYMENT_TARGET` or the Swift `@available` check). The fallback path (`UIBlurEffect(style: .systemUltraThinMaterial)`) will compile and run on all supported iOS versions regardless.

### Local Xcode builds for iteration
For faster UI iteration without waiting for EAS, open `SourceCode/frontend/ios/UniVerse.xcworkspace` in Xcode directly and run on a simulator or device. After the first `npm install` links the module, Xcode will compile the Swift files. Changes to the Swift files only require rebuilding from Xcode — no EAS needed during development.

### Module hot-reload limitation
Changes to `LiquidGlassTabBarView.swift` or `LiquidGlassTabBarModule.swift` require a native rebuild (Xcode or EAS). Changes to `LiquidGlassTabBar.tsx` or `index.ts` can be pushed as OTA updates after the initial native build is distributed.
