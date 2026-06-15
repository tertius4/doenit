import DB from '$domain/db';
import type {
	BackupFile,
	ImportOptions
} from './backup.types';

export class ImportService {
	static async import(
		backup: BackupFile,
		options: ImportOptions = {}
	) {
		this.validate(backup);

		if (options.replace) {
			await this.clearDatabase();
		}

		await this.restoreCollection(
			DB.task,
			backup.data.tasks
		);

		await this.restoreCollection(
			DB.category,
			backup.data.categories
		);

		await this.restoreCollection(
			DB.group,
			backup.data.groups
		);

		await this.restoreCollection(
			DB.member,
			backup.data.members
		);

		await this.restoreCollection(
			DB.user,
			backup.data.users
		);

		await this.restoreCollection(
			DB.contact,
			backup.data.contacts
		);

		await this.restoreCollection(
			DB.contact_invite,
			backup.data.contact_invites
		);

		await this.restoreCollection(
			DB.notification,
			backup.data.notifications
		);

		await this.restoreCollection(
			DB.settings,
			backup.data.settings
		);

		await this.restoreCollection(
			DB.user_state,
			backup.data.user_state
		);

		await this.restoreCollection(
			DB.app_state,
			backup.data.app_state
		);
	}

    private static validate(backup: BackupFile) {
        return true;
    }

    private static async clearDatabase() {
        await DB.task.clear();
        await DB.category.clear();
        await DB.group.clear();
        await DB.member.clear();
        await DB.user.clear();
        await DB.contact.clear();
        await DB.contact_invite.clear();
        await DB.notification.clear();
        await DB.settings.clear();
        await DB.user_state.clear();
        await DB.app_state.clear();
    }

    private static async restoreCollection(
        collection: any,
        data: any[]
    ) {
        for (const item of data) {
            await collection.put(item);
        }
    }
}