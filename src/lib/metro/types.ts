interface StationStatus {
	nombre: string;
	codigo: string;
	estado: string;
	combinacion: 'L1' | 'L2' | 'L3' | 'L4' | 'L4a' | 'L5' | 'L6';
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

type lineIds = 'l1' | 'l2' | 'l3' | 'l4' | 'l4a' | 'l5' | 'l6';

type NetworkStatusResponse = {
	[line in lineIds]: LineStatus;
};

export { NetworkStatusResponse, lineIds };
