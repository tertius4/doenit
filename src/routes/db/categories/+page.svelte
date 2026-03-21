<script>
  import { DB } from "$lib/DB";
  import { goto } from "$app/navigation";
  import { DateUtil } from "$lib/core/date_util";

  let categories = $state(await DB.Category.getAll());
  let tasks = $state(await DB.Task.getAll());
  let users = $state(await DB.User.getAll());
  let searchTerm = $state("");
  let filterType = $state("all"); // all, default, shared, private
  let sortBy = $state("created_at"); // created_at, name, task_count, user_count
  let sortOrder = $state("desc"); // asc, desc

  // Create user lookup map
  const userMap = $derived(
    users.reduce((map, user) => {
      map[user.email_address] = user;
      return map;
    }, {})
  );

  // Task count per category
  const taskCounts = $derived(
    tasks.reduce((map, task) => {
      if (!task.category_id) return map;
      map[task.category_id] = (map[task.category_id] || 0) + 1;
      return map;
    }, {})
  );

  // Statistics
  const stats = $derived({
    total: categories.length,
    default: categories.filter((c) => c.is_default).length,
    shared: categories.filter((c) => c.users && c.users.length > 0).length,
    private: categories.filter((c) => !c.users || c.users.length === 0).length,
    archived: categories.filter((c) => c.archived).length,
    with_tasks: Object.keys(taskCounts).length,
    total_tasks: Object.values(taskCounts).reduce((sum, count) => sum + count, 0),
  });

  // Filtered and sorted categories
  const filteredCategories = $derived(() => {
    let result = [...categories];

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(term) ||
          c.id.includes(term) ||
          c.users?.some((email) => email.toLowerCase().includes(term))
      );
    }

    // Type filter
    if (filterType !== "all") {
      switch (filterType) {
        case "default":
          result = result.filter((c) => c.is_default);
          break;
        case "shared":
          result = result.filter((c) => c.users && c.users.length > 0);
          break;
        case "private":
          result = result.filter((c) => !c.users || c.users.length === 0);
          break;
      }
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case "name":
          comparison = a.name.localeCompare(b.name);
          break;
        case "task_count":
          const aCount = taskCounts[a.id] || 0;
          const bCount = taskCounts[b.id] || 0;
          comparison = aCount - bCount;
          break;
        case "user_count":
          const aUsers = a.users?.length || 0;
          const bUsers = b.users?.length || 0;
          comparison = aUsers - bUsers;
          break;
        case "created_at":
        default:
          comparison = a.created_at.localeCompare(b.created_at);
          break;
      }
      return sortOrder === "asc" ? comparison : -comparison;
    });

    return result;
  });

  function formatDate(dateStr) {
    if (!dateStr) return "—";
    try {
      return DateUtil.format(new Date(dateStr), "YYYY-MM-DD HH:mm");
    } catch {
      return dateStr;
    }
  }

  function toggleSort(field) {
    if (sortBy === field) {
      sortOrder = sortOrder === "asc" ? "desc" : "asc";
    } else {
      sortBy = field;
      sortOrder = "desc";
    }
  }

  async function refreshData() {
    categories = await DB.Category.getAll();
    tasks = await DB.Task.getAll();
    users = await DB.User.getAll();
  }

  function getUserName(email) {
    return userMap[email]?.name || email;
  }
</script>

<div class="container mx-auto p-4 max-w-7xl">
  <div class="mb-6">
    <div class="flex justify-between items-center mb-4">
      <div>
        <h1 class="text-3xl font-bold">Categories Database</h1>
        <div class="flex gap-2 mt-2">
          <button
            onclick={() => goto("/db")}
            class="text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            ← Tasks
          </button>
          <span class="text-gray-400">|</span>
          <button
            onclick={() => goto("/db/users")}
            class="text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            Users →
          </button>
        </div>
      </div>
      <button
        onclick={refreshData}
        class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
      >
        🔄 Refresh
      </button>
    </div>

    <!-- Statistics Cards -->
    <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
      <div class="bg-gray-100 dark:bg-gray-800 p-3 rounded-lg">
        <div class="text-xs text-gray-600 dark:text-gray-400">Total</div>
        <div class="text-2xl font-bold">{stats.total}</div>
      </div>
      <div class="bg-yellow-100 dark:bg-yellow-900 p-3 rounded-lg">
        <div class="text-xs text-gray-600 dark:text-gray-400">Default</div>
        <div class="text-2xl font-bold">{stats.default}</div>
      </div>
      <div class="bg-green-100 dark:bg-green-900 p-3 rounded-lg">
        <div class="text-xs text-gray-600 dark:text-gray-400">Shared</div>
        <div class="text-2xl font-bold">{stats.shared}</div>
      </div>
      <div class="bg-blue-100 dark:bg-blue-900 p-3 rounded-lg">
        <div class="text-xs text-gray-600 dark:text-gray-400">Private</div>
        <div class="text-2xl font-bold">{stats.private}</div>
      </div>
      <div class="bg-gray-100 dark:bg-gray-800 p-3 rounded-lg">
        <div class="text-xs text-gray-600 dark:text-gray-400">Archived</div>
        <div class="text-2xl font-bold">{stats.archived}</div>
      </div>
      <div class="bg-purple-100 dark:bg-purple-900 p-3 rounded-lg">
        <div class="text-xs text-gray-600 dark:text-gray-400">With Tasks</div>
        <div class="text-2xl font-bold">{stats.with_tasks}</div>
      </div>
      <div class="bg-indigo-100 dark:bg-indigo-900 p-3 rounded-lg">
        <div class="text-xs text-gray-600 dark:text-gray-400">Total Tasks</div>
        <div class="text-2xl font-bold">{stats.total_tasks}</div>
      </div>
    </div>

    <!-- Filters -->
    <div class="bg-white dark:bg-gray-900 p-4 rounded-lg shadow mb-4">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <!-- Search -->
        <div>
          <label for="search" class="block text-sm font-medium mb-1">Search</label>
          <input
            id="search"
            type="text"
            bind:value={searchTerm}
            placeholder="Search categories..."
            class="w-full px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700"
          />
        </div>

        <!-- Type Filter -->
        <div>
          <label for="filterType" class="block text-sm font-medium mb-1">Type</label>
          <select
            id="filterType"
            bind:value={filterType}
            class="w-full px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700"
          >
            <option value="all">All</option>
            <option value="default">Default</option>
            <option value="shared">Shared</option>
            <option value="private">Private</option>
          </select>
        </div>

        <!-- Results Count -->
        <div class="flex items-end">
          <div class="text-sm text-gray-600 dark:text-gray-400">
            Showing {filteredCategories().length} of {stats.total} categories
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Table -->
  <div class="bg-white dark:bg-gray-900 rounded-lg shadow overflow-hidden">
    <div class="overflow-x-auto">
      <table class="w-full">
        <thead class="bg-gray-50 dark:bg-gray-800 border-b dark:border-gray-700">
          <tr>
            <th
              onclick={() => toggleSort("name")}
              class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              Name {sortBy === "name" ? (sortOrder === "asc" ? "↑" : "↓") : ""}
            </th>
            <th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">
              Type
            </th>
            <th
              onclick={() => toggleSort("task_count")}
              class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              Tasks {sortBy === "task_count" ? (sortOrder === "asc" ? "↑" : "↓") : ""}
            </th>
            <th
              onclick={() => toggleSort("user_count")}
              class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              Shared With {sortBy === "user_count" ? (sortOrder === "asc" ? "↑" : "↓") : ""}
            </th>
            <th
              onclick={() => toggleSort("created_at")}
              class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              Created {sortBy === "created_at" ? (sortOrder === "asc" ? "↑" : "↓") : ""}
            </th>
            <th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">
              Updated
            </th>
          </tr>
        </thead>
        <tbody class="divide-y dark:divide-gray-700">
          {#each filteredCategories() as category}
            <tr class="hover:bg-gray-50 dark:hover:bg-gray-800 transition">
              <td class="px-4 py-3">
                <div class="font-medium">
                  {category.name || "(Unnamed)"}
                </div>
                <div class="text-xs text-gray-500 mt-1">ID: {category.id}</div>
              </td>
              <td class="px-4 py-3">
                <div class="flex flex-col gap-1">
                  {#if category.is_default}
                    <span
                      class="inline-flex px-2 py-1 text-xs rounded bg-yellow-200 dark:bg-yellow-800"
                    >
                      ⭐ Default
                    </span>
                  {/if}
                  {#if category.archived}
                    <span class="inline-flex px-2 py-1 text-xs rounded bg-gray-200 dark:bg-gray-700">
                      Archived
                    </span>
                  {/if}
                  {#if category.users && category.users.length > 0}
                    <span
                      class="inline-flex px-2 py-1 text-xs rounded bg-green-200 dark:bg-green-800"
                    >
                      👥 Shared
                    </span>
                  {:else}
                    <span class="inline-flex px-2 py-1 text-xs rounded bg-blue-200 dark:bg-blue-800">
                      🔒 Private
                    </span>
                  {/if}
                </div>
              </td>
              <td class="px-4 py-3">
                <span class="inline-flex px-2 py-1 text-sm rounded bg-purple-100 dark:bg-purple-900">
                  {taskCounts[category.id] || 0} tasks
                </span>
              </td>
              <td class="px-4 py-3">
                {#if category.users && category.users.length > 0}
                  <div class="flex flex-col gap-1 max-w-xs">
                    {#each category.users.slice(0, 3) as userEmail}
                      <div class="text-sm text-gray-700 dark:text-gray-300 truncate">
                        {getUserName(userEmail)}
                      </div>
                    {/each}
                    {#if category.users.length > 3}
                      <div class="text-xs text-gray-500">
                        +{category.users.length - 3} more
                      </div>
                    {/if}
                  </div>
                {:else}
                  <span class="text-gray-400 text-sm">—</span>
                {/if}
              </td>
              <td class="px-4 py-3 text-sm">{formatDate(category.created_at)}</td>
              <td class="px-4 py-3 text-sm">{formatDate(category.updated_at)}</td>
            </tr>
          {:else}
            <tr>
              <td colspan="6" class="px-4 py-8 text-center text-gray-500">
                No categories found matching your filters
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </div>
</div>

<style>
  :global(body) {
    background: #f9fafb;
  }
  :global(body.dark) {
    background: #111827;
  }
</style>
