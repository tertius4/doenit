import { query, getRequestEvent } from "$app/server";

export const logApiExecutionTime = query("unchecked", logApiExecutionTimeHandler);

/**
 * @param {Object} param0
 * @param {string} param0.fn_name - The name of the API function being executed.
 * @param {number} param0.elapsed - The elapsed time in milliseconds since the API function started execution.
 * @param {any[]} param0.args - The arguments passed to the API function.
 */
function logApiExecutionTimeHandler({ fn_name, elapsed, args }) {

  const { getClientAddress } = getRequestEvent();

  fn_name = fn_name.replace(/Handler$/, "");
  const ip = getClientAddress();
  const timestamp = new Date().toLocaleDateString("af-ZA", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    day: "2-digit",
    month: "2-digit",
  });
  console.log(
    `[${timestamp}] ${ip.padStart(15)} ${("" + elapsed).padStart(4)}ms ${fn_name}(${args.map((arg) => JSON.stringify(arg)).join(", ")})`,
  );
}
