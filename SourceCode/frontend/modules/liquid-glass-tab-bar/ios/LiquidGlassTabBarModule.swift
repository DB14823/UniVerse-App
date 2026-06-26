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
