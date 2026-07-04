import UIKit
import ExpoModulesCore

public class NativeActionSheetModule: Module {
  public func definition() -> ModuleDefinition {
    Name("NativeActionSheet")

    // options: array of button labels
    // cancelButtonIndex: which index is the cancel button
    // destructiveButtonIndex: which index is destructive (shown in red), -1 for none
    AsyncFunction("showActionSheetAsync") { (config: [String: Any], promise: Promise) in
      await MainActor.run {
        let title = config["title"] as? String
        let message = config["message"] as? String
        let options = config["options"] as? [String] ?? []
        let cancelIndex = config["cancelButtonIndex"] as? Int ?? (options.count - 1)
        let destructiveIndex = config["destructiveButtonIndex"] as? Int ?? -1

        let alert = UIAlertController(title: title, message: message, preferredStyle: .actionSheet)

        for (index, label) in options.enumerated() {
          let style: UIAlertAction.Style
          if index == cancelIndex {
            style = .cancel
          } else if index == destructiveIndex {
            style = .destructive
          } else {
            style = .default
          }

          alert.addAction(UIAlertAction(title: label, style: style) { _ in
            promise.resolve(["buttonIndex": index])
          })
        }

        guard let rootVC = UIApplication.shared.connectedScenes
          .compactMap({ $0 as? UIWindowScene })
          .first?.windows.first?.rootViewController else {
          promise.reject("NO_VC", "Could not find root view controller")
          return
        }

        // iPad requires popover anchor
        if let popover = alert.popoverPresentationController {
          popover.sourceView = rootVC.view
          popover.sourceRect = CGRect(
            x: rootVC.view.bounds.midX,
            y: rootVC.view.bounds.midY,
            width: 0, height: 0
          )
          popover.permittedArrowDirections = []
        }

        rootVC.present(alert, animated: true)
      }
    }
  }
}
