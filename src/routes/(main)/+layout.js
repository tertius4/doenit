export function load({ params, route, depends }) {
  depends("layout:main");

  // Use route (instead of pathname), because of iOS.
  return {
    is_home: route.id === "/(main)",
    is_main_page: !!["/(main)", "/(main)/groups", "/(main)/contacts"].includes(route.id),
    is_task_page: route.id === "/(main)/create" || !!params.task_id,
    is_completed_page: route.id === "/(main)/complete",
    is_group_page: !!params.group_id,
  };
}
