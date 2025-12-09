import { createContext } from "svelte";
import { DB } from "$lib/DB";
import { SvelteMap } from "svelte/reactivity";
import { user } from "$lib/base/user.svelte";
import { OnlineDB } from "$lib/OnlineDB";
import type { Unsubscribe } from "firebase/auth";
import { Alert } from "$lib/core/alert";

export class CategoriesContext {
  categories = $state<Category[]>([]);
  default_category = $state<Category | null>(null);
  map = new SvelteMap<string, Category>();

  private subscription: Subscription | null = null;
  private onlineSubscription: Unsubscribe | null = null;

  init() {
    if (this.subscription) this.subscription.unsubscribe();

    this.subscription = DB.Category.subscribe(
      (result) => {
        // Sort categories by users count ascending.
        result.sort((a, b) => (a.users?.length || 0) - (b.users?.length || 0));
        let categories = [];
        for (const cat of result) {
          if (cat.is_default) {
            this.default_category = cat;
            continue;
          }

          cat.users ??= [];
          categories.push(cat);
        }

        this.categories = categories;

        this.map.clear();
        for (const category of categories) {
          this.map.set(category.id, category);
        }
      },
      { sort: [{ name: "asc" }] }
    );
  }

  onlineInit() {
    try {
      if (!user.is_friends_enabled) return;
      if (this.onlineSubscription) return;

      this.onlineSubscription = OnlineDB.Category.subscribe(
        async (online_categories) => {
          // Sync online categories with local categories
          const promises: Promise<any>[] = [];
          for (const online_category of online_categories) {
            const category = this.map.get(online_category.category_id);
            if (!category) {
              // Create local category
              promises.push(
                DB.Category.create({
                  id: online_category.category_id,
                  name: online_category.name,
                  is_default: false,
                  users: online_category.users,
                }).catch((err) => {
                  // Ignore errors otherwise
                })
              );
              continue;
            } else {
              let has_updates = false;
              if (category.name !== online_category.name) {
                category.name = online_category.name;
                has_updates = true;
              }

              if (JSON.stringify(category.users) !== JSON.stringify(online_category.users)) {
                category.users = online_category.users;
                has_updates = true;
              }

              if (!has_updates) continue;
              promises.push(
                DB.Category.update(category.id, {
                  name: category.name,
                  users: category.users,
                }).catch((err) => {
                  // Ignore errors otherwise
                })
              );

              if (online_category.users.length === 1 && online_category.users[0] === user.email_address) {
                // Remove category from online if I'm the only user
                promises.push(
                  OnlineDB.Category.delete(online_category.id).catch(() => {
                    // Ignore errors otherwise
                  })
                );

                // Also delete all online tasks assigned to this category
                promises.push(
                  OnlineDB.Task.getAll({
                    filters: [{ field: "category_id", operator: "==", value: online_category.category_id }],
                  })
                    .then((tasks) => {
                      const delete_promises: Promise<any>[] = [];
                      for (const task of tasks) {
                        delete_promises.push(
                          OnlineDB.Task.delete(task.id).catch(() => {
                            // Ignore errors otherwise
                          })
                        );
                      }
                      return Promise.all(delete_promises);
                    })
                    .catch(() => {
                      // Ignore errors otherwise
                    })
                );
              }
            }
          }

          if (!!promises.length) await Promise.all(promises);
        },
        {
          filters: [{ field: "users", operator: "array-contains", value: user.email_address }],
        }
      );
    } catch (error) {
      const error_message = error instanceof Error ? error.message : String(error);
      Alert.error(`Fout met aanmelding vir aanlyn kategorieë: ${error_message}`);
    }
  }

  destroy() {
    this.subscription?.unsubscribe();
    this.subscription = null;
    if (this.onlineSubscription) {
      this.onlineSubscription();
      this.onlineSubscription = null;
    }
  }

  getCategoryById(id: string | undefined): Category | undefined {
    if (!id) return undefined;
    return this.map.get(id);
  }
}

export const [getCategoriesContext, setCategoriesContext] = createContext<CategoriesContext>();
