export const ENROLLMENT_DIALOG_EVENT = "agentalpha:open-enrollment"

export function openEnrollmentDialog() {
  window.dispatchEvent(new Event(ENROLLMENT_DIALOG_EVENT))
}
