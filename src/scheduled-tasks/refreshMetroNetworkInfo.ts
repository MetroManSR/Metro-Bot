import { ApplyOptions } from '@sapphire/decorators';
import { ScheduledTask } from '@sapphire/plugin-scheduled-tasks';

@ApplyOptions<ScheduledTask.Options>({
	interval: 60_000
})
export class UserTask extends ScheduledTask {
	public run() {
		this.container.logger.info('This task runs every minute');
	}
}
