export function load({ url, params, route, depends }) {
  depends("layout:main");

  return {
    is_home: !!(url.pathname === "/"),
    is_main_page: !!["/(main)", "/(main)/groups", "/(main)/contacts"].includes(route.id),
    is_task_page: !!(url.pathname === "/create" || params.task_id),
    is_friends_page: !!(url.pathname === "/friends"),
    is_completed_page: !!(url.pathname === "/complete"),
    is_group_page: !!params.group_id,
  };
}
