export declare class AudioPlayer {
  constructor();
  addEventListener(event: string, callback: (data: any) => void): void;
  start(): Promise<void>;
  stop(): void;
  playAudio(audioData: Float32Array): void;
  bargeIn(): void;
}
