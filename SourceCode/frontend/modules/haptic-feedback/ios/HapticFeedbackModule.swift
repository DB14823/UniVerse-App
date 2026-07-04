import UIKit
import ExpoModulesCore

public class HapticFeedbackModule: Module {
  public func definition() -> ModuleDefinition {
    Name("HapticFeedback")

    AsyncFunction("impactAsync") { (style: String) in
      await MainActor.run {
        let feedbackStyle: UIImpactFeedbackGenerator.FeedbackStyle
        switch style {
        case "light":  feedbackStyle = .light
        case "heavy":  feedbackStyle = .heavy
        case "rigid":  feedbackStyle = .rigid
        case "soft":   feedbackStyle = .soft
        default:       feedbackStyle = .medium
        }
        UIImpactFeedbackGenerator(style: feedbackStyle).impactOccurred()
      }
    }

    AsyncFunction("notificationAsync") { (type: String) in
      await MainActor.run {
        let feedbackType: UINotificationFeedbackGenerator.FeedbackType
        switch type {
        case "success": feedbackType = .success
        case "warning": feedbackType = .warning
        default:        feedbackType = .error
        }
        UINotificationFeedbackGenerator().notificationOccurred(feedbackType)
      }
    }
  }
}
