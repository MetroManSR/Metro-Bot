interface StationStatus {
	nombre: string;
	codigo: string;
	estado: string;
	combinacion: LineCodeUpper;
	descripcion: string;
	descripcion_app: string;
	mensaje: string;
}

interface LineStatus {
	estado: string;
	mensaje: string;
	mensaje_app: string;
	estaciones: StationStatus[];
}

type LineCodeLower = 'l1' | 'l2' | 'l3' | 'l4' | 'l4a' | 'l5' | 'l6';
type LineCodeUpper = 'L1' | 'L2' | 'L3' | 'L4' | 'L4a' | 'L5' | 'L6';

type NetworkStatusResponse = {
	[line in LineCodeLower]: LineStatus;
};

export { NetworkStatusResponse, LineCodeLower as LineCode };
