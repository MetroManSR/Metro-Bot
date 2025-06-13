import { join } from 'path';

export const rootDir = join(__dirname, '..', '..');
export const srcDir = join(rootDir, 'src');

export const lineEmojis = {
	l1: '<:Linea1:900165458412585000>',
	l2: '<:Linea2:900165548107784202>',
	l3: '<:Linea3:900165548707561482>',
	l4: '<:Linea4:900165548460081212> ',
	l4a: '<:Linea4A:900165409234386944>',
	l5: '<:Linea5:900166003936329768>',
	l6: '<:Linea6:900166219435499560>'
};

export const lineNames = {
	l1: 'Línea 1',
	l2: 'Línea 2',
	l3: 'Línea 3',
	l4: 'Línea 4',
	l4a: 'Línea 4A',
	l5: 'Línea 5',
	l6: 'Línea 6'
};

export const lineColors = {
	l1: '#ea000a',
	l2: '#ffaf00',
	l3: '#67210a',
	l4: '#1f2583',
	l4a: '#0079c1',
	l5: '#00ab65',
	l6: '#953994'
};
