import UIKit
import ExpoModulesCore

class LiquidGlassSurfaceView: ExpoView {

    private let effectView: UIVisualEffectView

    required init(appContext: AppContext? = nil) {
        if #available(iOS 26.0, *) {
            effectView = UIVisualEffectView(effect: UIGlassEffect())
        } else {
            effectView = UIVisualEffectView(effect: UIBlurEffect(style: .systemUltraThinMaterial))
        }
        super.init(appContext: appContext)
        addSubview(effectView)
        clipsToBounds = true
        layer.cornerCurve = .continuous
    }

    // Prevent React Native from applying a background colour that would
    // block the glass from sampling content behind it.
    override var backgroundColor: UIColor? {
        get { .clear }
        set { }
    }

    var cornerRadius: CGFloat = 0 {
        didSet { layer.cornerRadius = cornerRadius }
    }

    // Walk up the ancestor chain and clear any opaque backgrounds so the
    // glass effect can sample the real content below (React Navigation inserts
    // opaque white ancestor views that would otherwise block it).
    override func didMoveToSuperview() {
        super.didMoveToSuperview()
        var ancestor: UIView? = superview
        while let v = ancestor {
            v.backgroundColor = .clear
            ancestor = v.superview
        }
    }

    override func layoutSubviews() {
        super.layoutSubviews()
        effectView.frame = bounds
        // Keep the glass layer behind all React Native child views.
        sendSubviewToBack(effectView)
    }
}
