import { Log } from "../src";
import { TextEncoder } from "util";
import { webcrypto } from "node:crypto";
import { LockManager } from "navigator.locks/dist/polyfill";

// While NodeJs 15.4 has an experimental implementation, it is not API compatible with the browser version.
class BroadcastChannelPolyfill {
    public onmessage = null;
    public onmessageerror = null;
    private static _eventTargets: Record<string, EventTarget> = {};

    public constructor(public readonly name: string) {
        if (!(name in BroadcastChannelPolyfill._eventTargets)) {
            BroadcastChannelPolyfill._eventTargets[name] = new EventTarget();
        }
    }

    public close(): void {
        // no-op
    }

    public dispatchEvent(): boolean {
        return true;
    }

    public postMessage(message: unknown): void {
        const messageEvent = new Event("message") as Event & { data: unknown };
        messageEvent.data = message;
        BroadcastChannelPolyfill._eventTargets[this.name].dispatchEvent(
            messageEvent,
        );
    }

    public addEventListener<K extends keyof BroadcastChannelEventMap>(
        type: K,
        listener: (
            this: BroadcastChannel,
            ev: BroadcastChannelEventMap[K]
        ) => unknown,
        options?: boolean | AddEventListenerOptions
    ): void;
    public addEventListener(
        type: string,
        listener: EventListenerOrEventListenerObject,
        options?: boolean | AddEventListenerOptions,
    ): void {
        BroadcastChannelPolyfill._eventTargets[this.name].addEventListener(
            "message",
            listener,
            options,
        );
    }

    public removeEventListener<K extends keyof BroadcastChannelEventMap>(
        type: K,
        listener: (
            this: BroadcastChannel,
            ev: BroadcastChannelEventMap[K]
        ) => unknown,
        options?: boolean | EventListenerOptions
    ): void;
    public removeEventListener(
        type: string,
        listener: EventListenerOrEventListenerObject,
        options?: boolean | EventListenerOptions,
    ): void {
        BroadcastChannelPolyfill._eventTargets[this.name].removeEventListener(
            "message",
            listener,
            options,
        );
    }
}

globalThis.BroadcastChannel = BroadcastChannelPolyfill;

// @ts-expect-error It is normally disallowed to do this, fine for the test though.
globalThis.navigator.locks = new LockManager();

beforeAll(async () => {
    globalThis.TextEncoder = TextEncoder;
    Object.assign(globalThis.crypto, {
        subtle: webcrypto.subtle,
    });
    globalThis.fetch = jest.fn();

    const unload = () =>
        setTimeout(() => window.dispatchEvent(new Event("unload")), 200);

    const location = Object.defineProperties(
        {},
        {
            ...Object.getOwnPropertyDescriptors(window.location),
            assign: {
                enumerable: true,
                value: jest.fn(unload),
            },
            replace: {
                enumerable: true,
                value: jest.fn(unload),
            },
        },
    );
    Object.defineProperty(window, "location", {
        enumerable: true,
        get: () => location,
    });
});

beforeEach(() => {
    Log.setLevel(Log.NONE);
    Log.setLogger(console);
});
