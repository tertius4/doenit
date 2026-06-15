export interface BackupFile {
	version: number;
	exported_at: string;
	app: string;
	app_version?: string;

	data: {
		tasks: any[];
		categories: any[];
		groups: any[];
		members: any[];
		users: any[];

		contacts: any[];
		contact_invites: any[];
		notifications: any[];

		settings: any[];
		user_state: any;
		app_state: any;
	};
}

export interface ImportOptions {
	replace?: boolean;
}