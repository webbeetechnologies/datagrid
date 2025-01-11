import EventEmitter from 'eventemitter3';

export interface EventObject {
    stopped: boolean;
    stopPropagation: () => void;
}

export type Listener<T = any> = (data: T, event: EventObject) => void;

export class ReversedEventEmitter extends EventEmitter {
    emit(event: string | symbol, ...args: any[]): boolean {
        const listeners = this.listeners(event) as Listener[];
        if (!listeners || listeners.length === 0) {
            return false;
        }

        const eventObject: EventObject = {
            stopped: false,
            stopPropagation() {
                this.stopped = true;
            },
        };

        args.push(eventObject);

        for (let i = listeners.length - 1; i >= 0; i--) {
            // @ts-ignore
            listeners[i](...args);

            if (eventObject.stopped) {
                break;
            }
        }

        return true;
    }
}

export const gridEventEmitter = new ReversedEventEmitter();

export default ReversedEventEmitter;
