import { LoaderPieceContext, Piece, PieceOptions } from '@sapphire/framework';

export namespace Task {
	export interface Options extends PieceOptions {
		interval: number;
		immediate?: boolean;
	}
}

export abstract class Task extends Piece<Task.Options> {
	public interval: number;
	public immediate: boolean;

	public constructor(context: LoaderPieceContext, options: Task.Options) {
		super(context, options);
		this.interval = options.interval;
		this.immediate = options.immediate ?? false;
	}

	public abstract run(): unknown;

	public override onLoad() {
		if (this.immediate) this.run();
		setInterval(() => this.run(), this.interval);
	}
}
