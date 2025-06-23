import { join } from 'path';
import { inspect } from 'util';
import * as colorette from 'colorette';
import '@sapphire/plugin-logger/register';
import '@sapphire/plugin-subcommands/register';
import '@sapphire/plugin-scheduled-tasks/register';
import { setup, type ArrayString } from '@skyra/env-utilities';
import { ApplicationCommandRegistries, RegisterBehavior } from '@sapphire/framework';

const rootDir = join(__dirname, '..', '..');

ApplicationCommandRegistries.setDefaultBehaviorWhenNotIdentical(RegisterBehavior.BulkOverwrite);

setup({ path: join(rootDir, '.env') });

inspect.defaultOptions.depth = 10;

colorette.createColors({ useColor: true });

declare module '@skyra/env-utilities' {
	interface Env {
		OWNERS: ArrayString;
	}
}
