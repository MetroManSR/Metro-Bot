interface StationStatus {
	nombre: string;
	codigo: string;
	estado: string;
	combinacion: LineCodesUpper;
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

type LineCodesLower = 'l1' | 'l2' | 'l3' | 'l4' | 'l4a' | 'l5' | 'l6';
type LineCodesUpper = 'L1' | 'L2' | 'L3' | 'L4' | 'L4a' | 'L5' | 'L6';

type NetworkStatusResponse = {
	[line in LineCodesLower]: LineStatus;
};

export { NetworkStatusResponse, LineCodesLower as LineCodes };
