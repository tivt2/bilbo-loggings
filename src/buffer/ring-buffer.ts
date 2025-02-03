export default class RingBuffer<T> {
    private buffer: (T | undefined)[]

    private head = 0 // points to first element
    private tail = 0 // points to first empty slot

    private _count = 0

    constructor(private size: number) {
        if (size <= 0) {
            throw new Error("RingBuffer(size) must be greater than zero.")
        }

        this.buffer = new Array(size)
    }

    get count(): number {
        return this._count
    }

    get is_full(): boolean {
        return this._count === this.size
    }

    // adds element to tail
    // increments tail
    enqueue(data: T): boolean {
        let is_safe_enqueue = true
        if (this._count === this.size) {
            this.head = (this.head + 1) % this.size
            is_safe_enqueue = false
        }

        this.buffer[this.tail] = data
        this.tail = (this.tail + 1) % this.size
        if (this._count < this.size) {
            this._count++
        }

        return is_safe_enqueue
    }

    // removes element from head
    // increments head
    dequeue(): T | undefined {
        if (this._count === 0) {
            return
        }

        const data = this.buffer[this.head]
        this.buffer[this.head] = undefined
        this.head = (this.head + 1) % this.size
        this._count--

        if (this._count === 0) {
            this.head = 0
            this.tail = 0
        }

        return data
    }

    peek(): T | undefined {
        if (this._count === 0) {
            return
        }

        return this.buffer[this.head]
    }

    // destructive iterator
    // empty the ring-buffer
    *flush(): Generator<T, void, void> {
        if (this._count === 0) {
            return
        }

        while (this._count > 0) {
            const data = this.buffer[this.head]
            this.buffer[this.head] = undefined
            this.head = (this.head + 1) % this.size

            yield data as T
            this._count--
        }

        this.head = 0
        this.tail = 0
    }

    *[Symbol.iterator](): Generator<T, void, void> {
        if (this._count === 0) {
            return
        }

        let cur = this.head
        let remaining = this._count
        while (remaining > 0) {
            yield this.buffer[cur] as T
            cur = (cur + 1) % this.size
            remaining--
        }
    }
}
