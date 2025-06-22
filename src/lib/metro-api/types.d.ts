export type lineId = 'l1' | 'l2' | 'l3' | 'l4' | 'l4a' | 'l5' | 'l6';

export interface RawStationInfo {
	nombre: string;
	codigo: string;
	estado: string;
	combinacion: string;
	descripcion: string;
	descripcion_app: string;
	mensaje: string;
}

export interface RawLineInfo {
	estado: string;
	mensaje: string;
	mensaje_app: string;
	estaciones: RawStationInfo[];
}

export type RawNetworkInfo = {
	[key in lineId]: RawLineInfo;
};

export interface StationInfo {
	code: string;
	statusCode: string;
	name: string;
	transfer: string | null;
	messages: {
		primary: string;
		secondary: string;
		tertiary: string | null;
	};
}

export interface LineInfo {
	statusCode: string;
	messages: {
		primary: string;
		secondary: string | null;
	};
	stations: StationInfo[];
}

export type NetworkInfo = {
	[key in lineId]: LineInfo;
};
