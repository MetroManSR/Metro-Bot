import { ApplyOptions } from '@sapphire/decorators';
import { Task } from '../lib/structures/Task';

@ApplyOptions<Task.Options>({
	interval: 10_000,
	immediate: true
})
export class UserTask extends Task {
	public override async run() {
		console.log('FUNCIONA');
	}
}
