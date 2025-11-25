/**
 * @typedef {Object} Task
 * @property {string} id - Primary key (UUID).
 * @property {boolean} archived - Indicates if the task is archived.
 * @property {string} created_at - Timestamp when the task was created.
 * @property {string} updated_at - Timestamp when the task was last updated.
 * @property {string | null} completed_at - Timestamp when the task was last completed, or null if never completed.
 *
 * @property {string} name - Name of the task.
 * @property {number} completed - The number of times the task has been completed (for repeatable tasks).
 * @property {string | null} due_date - Due date of the task (format: "YYYY-MM-DD HH:mm" or "YYYY-MM-DD"), or null.
 * @property {string | null} start_date - Start date of the task (format: "YYYY-MM-DD HH:mm" or "YYYY-MM-DD"), or null.
 * @property {string} repeat_interval - Interval for repeating the task.
 * @property {(0 | 1 | 2 | 3 | 4 | 5 | 6)[]} repeat_specific_days - Array of days of the week (0-6, where 0 is Sunday) for repeating the task.
 * @property {number} repeat_interval_number - Number representing the repeat interval.
 * @property {boolean} important - Indicates if the task is marked as important.
 * @property {string} [category_id] - Optional category ID associated with the task.
 * @property {string} [assigned_user_email] - Optional user email assigned to the task.
 * @property {string[]} [photo_ids] - Array of photo IDs (filenames) attached to this task.
 */

/**
 * Represents a category for tasks.
 * @typedef {Object} Category
 * @property {string} id - Primary key (UUID).
 * @property {boolean} archived - Indicates if the category is archived.
 * @property {string} created_at - Timestamp when the category was created.
 * @property {string} updated_at - Timestamp when the category was last updated.
 *
 * @property {boolean} [is_default] - Indicates if this is the default category.
 * @property {string} name - Name of the category.
 * @property {string[]} users
 */

/**
 * Represents a connection with another user.
 * @typedef {Object} User
 * @property {string} uid - Firebase User ID.
 * @property {string} id - Primary key (UUID).
 * @property {string} name - Name of the user.
 * @property {string} [avatar] - URL to the user's avatar image.
 * @property {boolean} [is_pending] - Indicates if the connection is pending.
 * @property {string} email_address - Email address of the user.
 * @property {string} created_at - Timestamp when the user was created.
 * @property {string} updated_at - Timestamp when the user was last updated.
 */

/**
 * Online Document used to index backups.
 * @typedef {Object} BackupManifest
 * @property {string} id - Primary key (UUID).
 * @property {string} timestamp - ISO string timestamp of when the backup was created.
 * @property {string} user_id - User identifier.
 * @property {string} file_path - Path to the backup file.
 * @property {string} sha256 - SHA-256 hash of the backup file (used to verify integrity and avoid duplicate backups).
 * @property {number} size - Size of the backup file in bytes.
 */

/**
 * @typedef {Object} OnlineTask
 * @property {string} id - Primary key (UUID).
 * @property {boolean} [deleted]
 * @property {string} task_id - Primary key of task (UUID).
 * @property {string} category_id - ID of the (shared) category associated with the task.
 * @property {string} data - Encrypted and compressed task data.
 */

/**
 * @typedef {Object} OnlineCategory
 * @property {string} id - Primary key (UUID).
 * @property {string} name
 * @property {boolean} [deleted]
 * @property {string} category_id - Primary key of category (UUID).
 * @property {string[]} users - Array of user email addresses associated with the category.
 */

/**
 * @typedef {Object} OnlineUser
 * @property {string} id - Primary key (UUID).
 * @property {string | undefined} avatar - URL to the user's avatar image.
 * @property {string} name - Name of the user.
 * @property {Language} language_code - Used for push notification translations.
 * @property {string} email_address - Email address of the user.
 * @property {string} fcm_token - Firebase Cloud Messaging token for push notifications.
 */

/**
 * @typedef {Object} Invite
 * @property {string} id - Primary key (UUID).
 * @property {string} created_at - Timestamp when the invite was created (format: "YYYY-MM-DD HH:mm:ss").
 * @property {string} sender_name
 * @property {string} from_email_address
 * @property {string} to_email_address
 * @property {"pending" | "accepted" | "declined" | "left" | "expired"} status - Current status of the invite.
 */

/**
 * @typedef {Object} RateUsSetting
 * @property {number} task_completions - Number of tasks completed by the user.
 * @property {string} first_use_date - YYYY-MM-DD HH:mm:ss
 * @property {string | null} last_dismissed_date - YYYY-MM-DD HH:mm:ss or null
 */

/**
 * @typedef {Object} HotbarItem
 * @property {string} id - Primary key (UUID).
 * @property {string} name - Name of the hotbot item.
 * @property {'category' | 'room'} type
 */

/**
 * @typedef {Object} TaskPhoto
 * @property {string} id - Primary key (UUID).
 * @property {string} filepath - Path to the photo file.
 * @property {string} [webview_path] - Optional webview path for displaying the photo.
 */

/**
 * For the Google Play Billing products.
 * @typedef {Object} Product
 * @property {string} product_id
 * @property {string} title
 * @property {string} description
 * @property {string} price
 * @property {number} price_amount_micros
 * @property {string} price_currency_code
 */

/**
 * For the Google Play Billing products.
 * @typedef {Object} Purchase
 * @property {string} product_id
 * @property {string} purchase_token
 * @property {number} purchase_state
 * @property {boolean} acknowledged
 * @property {string} order_id
 */

/**
 * Represents the type of toast notification.
 * @typedef {'success' | 'error' | 'info'} ToastType
 */

/**
 * Configuration options for displaying a toast notification.
 * @typedef {Object} ToastOptions
 * @property {string} message - The message to display in the toast.
 * @property {ToastType} [type] - The type of toast notification (default varies by implementation).
 * @property {number} [duration] - Duration in milliseconds before the toast disappears.
 * @property {'top' | 'bottom'} [position] - Position where the toast appears on screen.
 */

/**
 * @template T
 * @typedef {{ success: true, data: T } | { success: false, error_message: string, data?: * }} Result<T>
 */

/** @typedef {'af' | 'en'} Language */
/** @typedef {'dark' | 'light'} Theme */
/** @typedef {{ success: true } | { success: false, error_message: string }} SimpleResult */
/** @typedef {16 | 18 | 20 } TextSize */

/**
 * @template T
 * @typedef {import('../utils.svelte').Value<T>} Value<T>
 */

/** @typedef {import('firebase/auth').Unsubscribe} FirebaseUnsubscribe */
/** @typedef {import('dexie').Subscription} Subscription */

// /**
//  * Represents a room for shared tasks.
//  * @typedef {Object} Room
//  * @property {boolean} archived - Indicates if the room is archived.
//  * @property {string} id - Primary key (UUID).
//  * @property {string} name - Name of the room.
//  * @property {boolean} [pending]
//  * @property {{ email: string, pending?: boolean }[]} users - Array of user emails in the room.
//  * @property {string} updated_at - Timestamp when the room was last updated.
//  * @property {string} created_at - Timestamp when the room was created.
//  */
