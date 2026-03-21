<script>
  import { DB } from "$lib/DB";
  import { goto } from "$app/navigation";
  import { DateUtil } from "$lib/core/date_util";

  let users = $state(await DB.User.getAll());
  let categories = $state(await DB.Category.getAll());
  let tasks = $state(await DB.Task.getAll());
  let searchTerm = $state("");
  let filterStatus = $state("all"); // all, active, pending, plus
  let sortBy = $state("created_at"); // created_at, name, email, category_count
  let sortOrder = $state("desc"); // asc, desc

  // Calculate user statistics
  const userStats = $derived(() => {
    const stats = {};
    
    users.forEach((user) => {
      const email = user.email_address;
      
      // Count categories shared with this user
      const categoryCount = categories.filter((cat) => 
        cat.users && cat.users.includes(email)
      ).length;
      
      // Count tasks assigned to this user
      const taskCount = tasks.filter((task) => 
        task.assigned_user_email === email
      ).length;
      
      stats[email] = {
        categoryCount,
        taskCount,
      };
    });
    
    return stats;
  });

  // Statistics
  const stats = $derived({
    total: users.length,
    active: users.filter((u) => !u.is_pending).length,
    pending: users.filter((u) => u.is_pending).length,
    plus: users.filter((u) => u.is_plus_user).length,
    with_avatar: users.filter((u) => u.avatar).length,
    in_categories: new Set(
      categories.flatMap((cat) => cat.users || [])
    ).size,
  });

  // Filtered and sorted users
  const filteredUsers = $derived(() => {
    let result = [...users];

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (u) =>
          u.name.toLowerCase().includes(term) ||
          u.email_address.toLowerCase().includes(term) ||
          u.uid?.toLowerCase().includes(term) ||
          u.id.includes(term)
      );
    }

    // Status filter
    if (filterStatus !== "all") {
      switch (filterStatus) {
        case "active":
          result = result.filter((u) => !u.is_pending);
          break;
        case "pending":
          result = result.filter((u) => u.is_pending);
          break;
        case "plus":
          result = result.filter((u) => u.is_plus_user);
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
        case "email":
          comparison = a.email_address.localeCompare(b.email_address);
          break;
        case "category_count":
          const aCount = userStats()[a.email_address]?.categoryCount || 0;
          const bCount = userStats()[b.email_address]?.categoryCount || 0;
          comparison = aCount - bCount;
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
    users = await DB.User.getAll();
    categories = await DB.Category.getAll();
    tasks = await DB.Task.getAll();
  }
</script>

<div class="container mx-auto p-4 max-w-7xl">
  <div class="mb-6">
    <div class="flex justify-between items-center mb-4">
      <div>
        <h1 class="text-3xl font-bold">Users Database</h1>
        <div class="flex gap-2 mt-2">
          <button
            onclick={() => goto("/db")}
            class="text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            ← Tasks
          </button>
          <span class="text-gray-400">|</span>
          <button
            onclick={() => goto("/db/categories")}
            class="text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            ← Categories
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
    <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
      <div class="bg-gray-100 dark:bg-gray-800 p-3 rounded-lg">
        <div class="text-xs text-gray-600 dark:text-gray-400">Total</div>
        <div class="text-2xl font-bold">{stats.total}</div>
      </div>
      <div class="bg-green-100 dark:bg-green-900 p-3 rounded-lg">
        <div class="text-xs text-gray-600 dark:text-gray-400">Active</div>
        <div class="text-2xl font-bold">{stats.active}</div>
      </div>
      <div class="bg-yellow-100 dark:bg-yellow-900 p-3 rounded-lg">
        <div class="text-xs text-gray-600 dark:text-gray-400">Pending</div>
        <div class="text-2xl font-bold">{stats.pending}</div>
      </div>
      <div class="bg-purple-100 dark:bg-purple-900 p-3 rounded-lg">
        <div class="text-xs text-gray-600 dark:text-gray-400">Plus Users</div>
        <div class="text-2xl font-bold">{stats.plus}</div>
      </div>
      <div class="bg-blue-100 dark:bg-blue-900 p-3 rounded-lg">
        <div class="text-xs text-gray-600 dark:text-gray-400">With Avatar</div>
        <div class="text-2xl font-bold">{stats.with_avatar}</div>
      </div>
      <div class="bg-indigo-100 dark:bg-indigo-900 p-3 rounded-lg">
        <div class="text-xs text-gray-600 dark:text-gray-400">In Categories</div>
        <div class="text-2xl font-bold">{stats.in_categories}</div>
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
            placeholder="Search users..."
            class="w-full px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700"
          />
        </div>

        <!-- Status Filter -->
        <div>
          <label for="status" class="block text-sm font-medium mb-1">Status</label>
          <select
            id="status"
            bind:value={filterStatus}
            class="w-full px-3 py-2 border rounded dark:bg-gray-800 dark:border-gray-700"
          >
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="pending">Pending</option>
            <option value="plus">Plus Users</option>
          </select>
        </div>

        <!-- Results Count -->
        <div class="flex items-end">
          <div class="text-sm text-gray-600 dark:text-gray-400">
            Showing {filteredUsers().length} of {stats.total} users
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
            <th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">
              Avatar
            </th>
            <th
              onclick={() => toggleSort("name")}
              class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              Name {sortBy === "name" ? (sortOrder === "asc" ? "↑" : "↓") : ""}
            </th>
            <th
              onclick={() => toggleSort("email")}
              class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              Email {sortBy === "email" ? (sortOrder === "asc" ? "↑" : "↓") : ""}
            </th>
            <th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">
              Status
            </th>
            <th
              onclick={() => toggleSort("category_count")}
              class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              Categories {sortBy === "category_count" ? (sortOrder === "asc" ? "↑" : "↓") : ""}
            </th>
            <th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">
              Tasks
            </th>
            <th
              onclick={() => toggleSort("created_at")}
              class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              Created {sortBy === "created_at" ? (sortOrder === "asc" ? "↑" : "↓") : ""}
            </th>
          </tr>
        </thead>
        <tbody class="divide-y dark:divide-gray-700">
          {#each filteredUsers() as user}
            <tr class="hover:bg-gray-50 dark:hover:bg-gray-800 transition">
              <td class="px-4 py-3">
                {#if user.avatar}
                  <img
                    src={user.avatar}
                    alt={user.name}
                    class="w-10 h-10 rounded-full object-cover"
                  />
                {:else}
                  <div
                    class="w-10 h-10 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center text-gray-600 dark:text-gray-300 font-medium"
                  >
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                {/if}
              </td>
              <td class="px-4 py-3">
                <div class="font-medium">{user.name}</div>
                <div class="text-xs text-gray-500 mt-1">ID: {user.id}</div>
                {#if user.uid}
                  <div class="text-xs text-gray-500">UID: {user.uid}</div>
                {/if}
              </td>
              <td class="px-4 py-3 text-sm">{user.email_address}</td>
              <td class="px-4 py-3">
                <div class="flex flex-col gap-1">
                  {#if user.is_pending}
                    <span
                      class="inline-flex px-2 py-1 text-xs rounded bg-yellow-200 dark:bg-yellow-800"
                    >
                      ⏳ Pending
                    </span>
                  {:else}
                    <span
                      class="inline-flex px-2 py-1 text-xs rounded bg-green-200 dark:bg-green-800"
                    >
                      ✓ Active
                    </span>
                  {/if}
                  {#if user.is_plus_user}
                    <span
                      class="inline-flex px-2 py-1 text-xs rounded bg-purple-200 dark:bg-purple-800"
                    >
                      ⭐ Plus
                    </span>
                  {/if}
                </div>
              </td>
              <td class="px-4 py-3 text-center">
                <span class="inline-flex px-2 py-1 text-sm rounded bg-blue-100 dark:bg-blue-900">
                  {userStats()[user.email_address]?.categoryCount || 0}
                </span>
              </td>
              <td class="px-4 py-3 text-center">
                <span class="inline-flex px-2 py-1 text-sm rounded bg-purple-100 dark:bg-purple-900">
                  {userStats()[user.email_address]?.taskCount || 0}
                </span>
              </td>
              <td class="px-4 py-3 text-sm">{formatDate(user.created_at)}</td>
            </tr>
          {:else}
            <tr>
              <td colspan="7" class="px-4 py-8 text-center text-gray-500">
                No users found matching your filters
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
