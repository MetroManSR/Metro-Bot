import { ColorResolvable } from 'discord.js';
import { lineId } from 'lib/metro/api/types';

export const lineIcons: Record<lineId, string> = {
	l1: '<:l1:1386445105455566918>',
	l2: '<:l2:1386445134367035485>',
	l3: '<:l3:1386445150246670478>',
	l4: '<:l4:1386445164771278990>',
	l4a: '<:l4a:1386445178838978651>',
	l5: '<:l5:1386445194907353108>',
	l6: '<:l6:1386445209130242289>'
};

export const lineNames: Record<lineId, string> = {
	l1: 'Línea 1',
	l2: 'Línea 2',
	l3: 'Línea 3',
	l4: 'Línea 4',
	l4a: 'Línea 4A',
	l5: 'Línea 5',
	l6: 'Línea 6'
};

export const lineColors: Record<lineId, ColorResolvable> = {
	l1: '#ea000a',
	l2: '#ffaf00',
	l3: '#67210a',
	l4: '#1f2583',
	l4a: '#0079c1',
	l5: '#00ab65',
	l6: '#953994'
};
