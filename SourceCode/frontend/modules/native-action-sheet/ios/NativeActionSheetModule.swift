import UIKit
import ExpoModulesCore

private func topViewController(_ base: UIViewController?) -> UIViewController? {
  if let nav = base as? UINavigationController {
    return topViewController(nav.visibleViewController)
  }
  if let tab = base as? UITabBarController {
    return topViewController(tab.selectedViewController)
  }
  if let presented = base?.presentedViewController {
    return topViewController(presented)
  }
  return base
}

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
          .first?.windows.first?.rootViewController,
          let topVC = topViewController(rootVC) else {
          promise.reject("NO_VC", "Could not find presenting view controller")
          return
        }

        // iPad requires popover anchor
        if let popover = alert.popoverPresentationController {
          popover.sourceView = topVC.view
          popover.sourceRect = CGRect(
            x: topVC.view.bounds.midX,
            y: topVC.view.bounds.midY,
            width: 0, height: 0
          )
          popover.permittedArrowDirections = []
        }

        topVC.present(alert, animated: true)
      }
    }
  }
}
