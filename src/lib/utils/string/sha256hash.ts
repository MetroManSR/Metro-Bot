import { createHash } from 'crypto';

export function sha256hash(data: string) {
	return createHash('sha256').update(data).digest('hex');
}
