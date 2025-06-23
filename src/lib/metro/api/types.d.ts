export type LineId = 'l1' | 'l2' | 'l3' | 'l4' | 'l4a' | 'l5' | 'l6';
type RawStatusCode = '1' | '2' | '3' | '4';
type StatusCode = '0' | '1' | '2' | '3' | '4' | '5';

export interface RawStationInfo {
	nombre: string;
	codigo: string;
	estado: RawStatusCode;
	combinacion: string;
	descripcion: string;
	descripcion_app: string;
	mensaje: string;
}

export interface RawLineInfo {
	estado: RawStatusCode;
	mensaje: string;
	mensaje_app: string;
	estaciones: RawStationInfo[];
}

export type RawNetworkInfo = {
	[key in LineId]: RawLineInfo;
};

export interface StationInfo {
	code: string;
	statusCode: StatusCode;
	name: string;
	transfer: string | null;
	messages: {
		primary: string;
		secondary: string;
		tertiary: string | null;
	};
}

export interface LineInfo {
	statusCode: StatusCode;
	messages: {
		primary: string;
		secondary: string | null;
	};
	stations: StationInfo[];
}

export type NetworkInfo = {
	[key in LineId]: LineInfo;
};
