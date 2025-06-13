import { ApplicationCommandRegistries, RegisterBehavior } from '@sapphire/framework';
import '@sapphire/plugin-logger/register';
import '@sapphire/plugin-scheduled-tasks/register';
import { setup, type ArrayString } from '@skyra/env-utilities';
import * as colorette from 'colorette';
import { join } from 'path';
import { inspect } from 'util';
import { rootDir } from './constants';

ApplicationCommandRegistries.setDefaultBehaviorWhenNotIdentical(RegisterBehavior.BulkOverwrite);

setup({ path: join(rootDir, '.env') });

inspect.defaultOptions.depth = 1;

colorette.createColors({ useColor: true });

declare module '@skyra/env-utilities' {
	interface Env {
		OWNERS: ArrayString;
	}
}
