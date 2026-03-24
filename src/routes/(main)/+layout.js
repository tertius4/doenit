export async function load({ url, params }) {
  return {
    is_home: !!(url.pathname === "/"),
    is_task_page: !!(url.pathname === "/create" || params.item_id),
    is_friends_page: !!(url.pathname === "/friends"),
    is_completed_page: !!(url.pathname === "/complete"),
  };
}
