import { Store } from '@sapphire/framework';
import { Task } from './Task';

export class TaskStore extends Store<Task, 'tasks'> {
	public constructor() {
		super(Task, { name: 'tasks' });
	}
}

declare module '@sapphire/pieces' {
	export interface StoreRegistryEntries {
		tasks: TaskStore;
	}
}
