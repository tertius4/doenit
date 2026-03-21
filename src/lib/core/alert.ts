// TODO XXX This should be remove and toast should be used directly.
import toast from "$display/toast/toast.svelte";

export const alert = {
  error: toast.error,
  success: toast.success,
  info: toast.info,
  warning: toast.warning,
};
