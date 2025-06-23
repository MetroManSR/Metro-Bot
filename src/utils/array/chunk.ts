/**
 * Separa un array en pedazos de un tamaño especificado
 */
export function chunk<T>(arr: T[], size: number = 10) {
	const chunks = [];
	for (let i = 0; i < Math.ceil(arr.length / size); i++) {
		chunks.push(arr.slice(size * i, size * (i + 1)));
	}
	return chunks;
}
