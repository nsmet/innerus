import ObjectiveC
import UIKit

/// AC46 / spec §520 (A13): Apple Writing Tools must not appear in InnerUs's private text views (notes, transcripts,
/// draft memories, search). React Native's own UITextView / UITextField subclasses offer no prop for it, so every
/// text view and field gets the documented per-view control `writingToolsBehavior = .none` when it enters a window
/// (iOS 18+). Installed once at launch from InnerUsPlatformModule. No network, no access to the text itself.
enum WritingToolsOptOut {
  /// Lazily initialised static: runs exactly once, thread-safe.
  private static let swizzled: Void = {
    guard #available(iOS 18.0, *) else { return }
    swizzleDidMoveToWindow(UITextView.self, replacement: #selector(UITextView.innerus_didMoveToWindow))
    swizzleDidMoveToWindow(UITextField.self, replacement: #selector(UITextField.innerus_didMoveToWindow))
  }()

  static func install() {
    _ = swizzled
  }

  private static func swizzleDidMoveToWindow(_ cls: AnyClass, replacement: Selector) {
    let original = #selector(UIView.didMoveToWindow)
    guard let originalMethod = class_getInstanceMethod(cls, original),
          let replacementMethod = class_getInstanceMethod(cls, replacement) else { return }
    // Add the method on this class first, so UIView's implementation (shared by every view) is never exchanged.
    if class_addMethod(cls, original, method_getImplementation(replacementMethod), method_getTypeEncoding(replacementMethod)) {
      class_replaceMethod(cls, replacement, method_getImplementation(originalMethod), method_getTypeEncoding(originalMethod))
    } else {
      method_exchangeImplementations(originalMethod, replacementMethod)
    }
  }
}

extension UITextView {
  @objc func innerus_didMoveToWindow() {
    innerus_didMoveToWindow() // after the swap this calls the original didMoveToWindow
    if #available(iOS 18.0, *) { writingToolsBehavior = .none }
  }
}

extension UITextField {
  @objc func innerus_didMoveToWindow() {
    innerus_didMoveToWindow() // after the swap this calls the original didMoveToWindow
    if #available(iOS 18.0, *) { writingToolsBehavior = .none }
  }
}
