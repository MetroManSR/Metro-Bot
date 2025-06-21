import { ApplyOptions } from '@sapphire/decorators';
import { ScheduledTask } from '@sapphire/plugin-scheduled-tasks';

@ApplyOptions<ScheduledTask.Options>({ interval: 60_000 })
export class UserScheduledTask extends ScheduledTask {
	public run() {
		console.log('RAN');
	}
}
