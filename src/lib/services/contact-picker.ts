import { Capacitor } from "@capacitor/core";

interface ContactPickerPlugin {
  /** Opens the system picker for one e-mail address. Resolves {} when the user backs out. */
  pickEmail(): Promise<{ name?: string; email?: string }>;
}

/** Native only (android/.../ContactPickerPlugin.java, ios/App/App/ContactPickerPlugin.swift). Needs no contacts permission. */
export const ContactPicker = Capacitor.registerPlugin<ContactPickerPlugin>("ContactPicker");

export const can_pick_contact = Capacitor.isNativePlatform();
