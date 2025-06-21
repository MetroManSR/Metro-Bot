export type lineId = 'l1' | 'l2' | 'l3' | 'l4' | 'l4a' | 'l5' | 'l6';
export type lineIdUpper = 'L1' | 'L2' | 'L3' | 'L4' | 'L4a' | 'L5' | 'L6';

export interface RawStationInfo {
	nombre: string;
	codigo: string;
	estado: string;
	combinacion: lineIdUpper | '';
	descripcion: string;
	descripcion_app: string;
	mensaje?: string;
}

export interface RawLineInfo {
	estado: string;
	mensaje: string;
	mensaje_app: string;
	estaciones: RawStationInfo[];
}

export interface MetroLine {
	id: lineId;
	status: string;
	message: string;
	appMessage: string;
	stations: RawStationInfo[];
}

export type RawNetworkInfo = {
	[line in lineId]: RawLineInfo;
};
