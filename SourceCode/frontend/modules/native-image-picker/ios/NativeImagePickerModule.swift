import UIKit
import PhotosUI
import UniformTypeIdentifiers
import ExpoModulesCore

public class NativeImagePickerModule: Module {
  public func definition() -> ModuleDefinition {
    Name("NativeImagePicker")

    AsyncFunction("pickImageAsync") { (promise: Promise) in
      await MainActor.run {
        var config = PHPickerConfiguration(photoLibrary: .shared())
        config.filter = .images
        config.selectionLimit = 1

        let picker = PHPickerViewController(configuration: config)
        let delegate = ImagePickerDelegate(promise: promise)
        picker.delegate = delegate
        // Retain the delegate for the picker's lifetime via association
        objc_setAssociatedObject(picker, &AssociatedKeys.delegate, delegate, .OBJC_ASSOCIATION_RETAIN_NONATOMIC)

        guard let rootVC = UIApplication.shared.connectedScenes
          .compactMap({ $0 as? UIWindowScene })
          .first?.windows.first?.rootViewController else {
          promise.reject("NO_VC", "Could not find root view controller")
          return
        }

        rootVC.present(picker, animated: true)
      }
    }
  }
}

private enum AssociatedKeys {
  static var delegate = "NativeImagePickerDelegate"
}

private class ImagePickerDelegate: NSObject, PHPickerViewControllerDelegate {
  let promise: Promise

  init(promise: Promise) {
    self.promise = promise
  }

  func picker(_ picker: PHPickerViewController, didFinishPicking results: [PHPickerResult]) {
    picker.dismiss(animated: true)

    guard let result = results.first else {
      promise.resolve(["canceled": true, "uri": NSNull()])
      return
    }

    result.itemProvider.loadFileRepresentation(forTypeIdentifier: UTType.image.identifier) { [weak self] url, error in
      guard let self = self else { return }

      if let error = error {
        self.promise.reject("LOAD_ERROR", error.localizedDescription)
        return
      }

      guard let url = url else {
        self.promise.reject("NO_URL", "Failed to load image file")
        return
      }

      // The scoped URL expires after this closure returns — copy to a stable temp location
      let dest = FileManager.default.temporaryDirectory
        .appendingPathComponent(UUID().uuidString)
        .appendingPathExtension(url.pathExtension.isEmpty ? "jpg" : url.pathExtension)

      do {
        try FileManager.default.copyItem(at: url, to: dest)
        self.promise.resolve(["canceled": false, "uri": dest.absoluteString])
      } catch {
        self.promise.reject("COPY_ERROR", error.localizedDescription)
      }
    }
  }
}
