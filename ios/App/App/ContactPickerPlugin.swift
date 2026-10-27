import Capacitor
import ContactsUI

/// Opens the system contact picker for one e-mail address. The picker runs out of process, so no contacts
/// permission is needed. Resolves { name, email }, or {} when the user backs out.
@objc(ContactPickerPlugin)
public class ContactPickerPlugin: CAPPlugin, CAPBridgedPlugin, CNContactPickerDelegate {
    public let identifier = "ContactPickerPlugin"
    public let jsName = "ContactPicker"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "pickEmail", returnType: CAPPluginReturnPromise)
    ]

    private var pendingCall: CAPPluginCall?

    @objc func pickEmail(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            self.pendingCall = call
            let picker = CNContactPickerViewController()
            picker.delegate = self
            picker.displayedPropertyKeys = [CNContactEmailAddressesKey]
            picker.predicateForEnablingContact = NSPredicate(format: "emailAddresses.@count > 0")
            // Tapping an address selects it; tapping a contact only opens it.
            picker.predicateForSelectionOfContact = NSPredicate(value: false)
            self.bridge?.viewController?.present(picker, animated: true)
        }
    }

    public func contactPicker(_ picker: CNContactPickerViewController, didSelect contactProperty: CNContactProperty) {
        let name = CNContactFormatter.string(from: contactProperty.contact, style: .fullName) ?? ""
        let email = contactProperty.value as? String ?? ""
        pendingCall?.resolve(["name": name, "email": email])
        pendingCall = nil
    }

    public func contactPickerDidCancel(_ picker: CNContactPickerViewController) {
        pendingCall?.resolve([:])
        pendingCall = nil
    }
}

/// Registers the app's own plugins. Main.storyboard uses this instead of CAPBridgeViewController.
class MainViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(ContactPickerPlugin())
    }
}
