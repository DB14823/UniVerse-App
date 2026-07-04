import UIKit
import ExpoModulesCore

public class ShareSheetModule: Module {
  public func definition() -> ModuleDefinition {
    Name("ShareSheet")

    AsyncFunction("shareAsync") { (content: [String: String], promise: Promise) in
      await MainActor.run {
        var items: [Any] = []
        if let message = content["message"] { items.append(message) }
        if let urlString = content["url"], let url = URL(string: urlString) {
          items.append(url)
        }

        guard !items.isEmpty else {
          promise.resolve(["dismissed": true])
          return
        }

        let vc = UIActivityViewController(activityItems: items, applicationActivities: nil)
        vc.completionWithItemsHandler = { _, completed, _, _ in
          promise.resolve(["dismissed": !completed])
        }

        guard let rootVC = UIApplication.shared.connectedScenes
          .compactMap({ $0 as? UIWindowScene })
          .first?.windows.first?.rootViewController else {
          promise.reject("NO_VC", "Could not find root view controller")
          return
        }

        // iPad requires a source rect for the popover anchor
        if let popover = vc.popoverPresentationController {
          popover.sourceView = rootVC.view
          popover.sourceRect = CGRect(
            x: rootVC.view.bounds.midX,
            y: rootVC.view.bounds.midY,
            width: 0, height: 0
          )
          popover.permittedArrowDirections = []
        }

        rootVC.present(vc, animated: true)
      }
    }
  }
}
