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

extension UIColor {
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

    // MARK: Lifecycle
    override func didMoveToSuperview() {
        super.didMoveToSuperview()
        // Clear all ancestor backgrounds so the blur/glass samples real app content,
        // not the opaque white UIViews React Navigation inserts between our view and the screen.
        var ancestor: UIView? = superview
        while let v = ancestor {
            v.backgroundColor = .clear
            ancestor = v.superview
        }
    }

    // MARK: Pill setup
    private func setupPill() {
        pillContainer.backgroundColor = .clear
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
        activeHighlight.backgroundColor = .clear

        let blur = UIBlurEffect(style: .systemUltraThinMaterialLight)
        let effectView = UIVisualEffectView(effect: blur)
        effectView.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        activeHighlight.addSubview(effectView)

        activeHighlight.layer.cornerRadius = 28
        activeHighlight.layer.cornerCurve = .continuous
        activeHighlight.clipsToBounds = true
        activeHighlight.layer.borderWidth = 0.5
        activeHighlight.layer.borderColor = UIColor.white.withAlphaComponent(0.5).cgColor
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
                ?? UIImage(systemName: tab.sfSymbol, withConfiguration: symbolCfg)
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
        let targetFrame = tabButtons[idx].frame.insetBy(dx: 4, dy: 4)

        if animated {
            UIView.animate(
                withDuration: 0.42,
                delay: 0,
                usingSpringWithDamping: 0.68,
                initialSpringVelocity: 0.6,
                options: [.curveEaseOut, .allowUserInteraction]
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
            y: 0,
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
