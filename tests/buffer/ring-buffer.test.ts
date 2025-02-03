import { describe, expect, test } from "vitest"
import RingBuffer from "../../src/buffer/ring-buffer"

describe("RingBuffer unit tests", () => {
    test("correct instance creation", () => {
        const ring_buffer = new RingBuffer(8)

        expect(ring_buffer).toBeTruthy()
        expect(ring_buffer.count).toEqual(0)
        expect(ring_buffer.is_full).toBe(false)
    })

    test("incorrect instance creation", () => {
        expect(() => new RingBuffer(0)).toThrow()
        expect(() => new RingBuffer(-1)).toThrow()
    })

    test("enqueue() correctly add item", () => {
        const buffer = new RingBuffer(8)

        const safe_enqueue = buffer.enqueue(0)
        expect(safe_enqueue).toBe(true)
        expect(buffer.count).toEqual(1)
    })

    test("peek() correctly peek on first item", () => {
        const buffer = new RingBuffer(8)

        buffer.enqueue(0)
        buffer.enqueue(1)
        expect(buffer.count).toEqual(2)
        expect(buffer.peek()).toEqual(0)
    })

    test("enqueue() correctly enqueue when buffer is full", () => {
        const buffer = new RingBuffer(4)

        buffer.enqueue(0)
        buffer.enqueue(1)
        buffer.enqueue(2)
        expect(buffer.is_full).toBe(false)

        buffer.enqueue(3)
        expect(buffer.is_full).toBe(true)
        expect(buffer.count).toEqual(4)
        expect(buffer.peek()).toEqual(0)

        buffer.enqueue(4)
        expect(buffer.is_full).toBe(true)
        expect(buffer.count).toEqual(4)
        expect(buffer.peek()).toEqual(1)

        buffer.enqueue(5)
        expect(buffer.is_full).toBe(true)
        expect(buffer.count).toEqual(4)
        expect(buffer.peek()).toEqual(2)
    })

    test("dequeue() correctly dequeue from empty buffer", () => {
        const buffer = new RingBuffer(4)

        expect(buffer.count).toEqual(0)
        expect(buffer.dequeue()).toEqual(undefined)
    })

    test("dequeue() correctly dequeue from buffer", () => {
        const buffer = new RingBuffer(4)

        buffer.enqueue(0)
        buffer.enqueue(1)
        expect(buffer.count).toEqual(2)
        expect(buffer.dequeue()).toEqual(0)
    })

    test("dequeue() correctly dequeue from buffer with 1 item", () => {
        const buffer = new RingBuffer(4)

        buffer.enqueue(0)
        expect(buffer.count).toEqual(1)
        expect(buffer.dequeue()).toEqual(0)
        expect(buffer.dequeue()).toEqual(undefined)
    })

    test("*[Symbol.iterator]() correctly iterate over items", () => {
        const buffer = new RingBuffer(4)

        const input = [0, 1, 2, 3]
        buffer.enqueue(input[0])
        buffer.enqueue(input[1])
        buffer.enqueue(input[2])
        buffer.enqueue(input[3])

        let cur = 0
        for (const item of buffer) {
            expect(item).toEqual(input[cur++])
            expect(buffer.count).toEqual(4)
        }
    })

    test("*flush() correctly iterate over items destructively", () => {
        const buffer = new RingBuffer(4)

        const input = [0, 1, 2, 3]
        buffer.enqueue(input[0])
        buffer.enqueue(input[1])
        buffer.enqueue(input[2])
        buffer.enqueue(input[3])

        let cur = 0
        for (const item of buffer.flush()) {
            expect(item).toEqual(input[cur])
            expect(buffer.count).toEqual(input.length - cur)
            cur++
        }
    })
})
