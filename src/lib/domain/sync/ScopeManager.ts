import DB from "$domain/db";

class ScopeManager {
  async getUserScopes() {
    const group_result = await DB.group.findMany({
      selector: { soft_deleted: { $ne: true } },
    });

    if (!group_result.ok) {
      throw new Error(`Failed to fetch groups: ${group_result.error}`);
    }

    const groups = group_result.value;
    const scopes = groups.map(({ id }) => id);

    return scopes;
  }
}

const scopeManager = new ScopeManager();
export default scopeManager;
