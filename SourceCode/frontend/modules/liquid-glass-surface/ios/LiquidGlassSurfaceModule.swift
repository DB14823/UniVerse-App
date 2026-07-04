import ExpoModulesCore

public class LiquidGlassSurfaceModule: Module {
    public func definition() -> ModuleDefinition {
        Name("LiquidGlassSurface")

        View(LiquidGlassSurfaceView.self) {
            Prop("cornerRadius") { (view: LiquidGlassSurfaceView, radius: Double) in
                view.cornerRadius = CGFloat(radius)
            }
        }
    }
}
