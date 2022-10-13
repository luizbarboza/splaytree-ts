type Comparator<T> = (a: T, b: T) => number;
type Predicate<T> = (value: T) => boolean;

class SplayTreeNode<K, Node extends SplayTreeNode<K, Node>> {
    readonly key: K;

    left: Node | null = null;
    right: Node | null = null;

    constructor(key: K) {
        this.key = key;
    }
}

class SplayTreeSetNode<K> extends SplayTreeNode<K, SplayTreeSetNode<K>> {
    constructor(key: K) {
        super(key);
    }
}

class SplayTreeMapNode<K, V> extends SplayTreeNode<K, SplayTreeMapNode<K, V>> {
    readonly value: V;

    constructor(key: K, value: V) {
        super(key);
        this.value = value;
    }

    replaceValue(value: V) {
        const node = new SplayTreeMapNode(this.key, value);
        node.left = this.left;
        node.right = this.right;
        return node;
    }
}

abstract class SplayTree<K, Node extends SplayTreeNode<K, Node>> {
    protected abstract root: Node | null;

    public size = 0;

    protected modificationCount = 0;

    protected splayCount = 0;

    protected abstract compare: Comparator<K>;

    protected abstract validKey: Predicate<unknown>;

    protected splay(key: K) {
        const root = this.root;
        if (root == null) {
            this.compare(key, key);
            return -1;
        }

        let right: Node | null = null;
        let newTreeRight: Node | null = null;
        let left: Node | null = null;
        let newTreeLeft: Node | null = null;
        let current = root;
        const compare = this.compare;
        let comp: number;
        while (true) {
            comp = compare(current.key, key);
            if (comp > 0) {
                let currentLeft = current.left;
                if (currentLeft == null) break;
                comp = compare(currentLeft.key, key);
                if (comp > 0) {
                    current.left = currentLeft.right;
                    currentLeft.right = current;
                    current = currentLeft;
                    currentLeft = current.left;
                    if (currentLeft == null) break;
                }
                if (right == null) {
                    newTreeRight = current;
                } else {
                    right.left = current;
                }
                right = current;
                current = currentLeft;
            } else if (comp < 0) {
                let currentRight = current.right;
                if (currentRight == null) break;
                comp = compare(currentRight.key, key);
                if (comp < 0) {
                    current.right = currentRight.left;
                    currentRight.left = current;
                    current = currentRight;
                    currentRight = current.right;
                    if (currentRight == null) break;
                }
                if (left == null) {
                    newTreeLeft = current;
                } else {
                    left.right = current;
                }
                left = current;
                current = currentRight;
            } else {
                break;
            }
        }
        if (left != null) {
            left.right = current.left;
            current.left = newTreeLeft;
        }
        if (right != null) {
            right.left = current.right;
            current.right = newTreeRight;
        }
        if (this.root !== current) {
            this.root = current;
            this.splayCount++;
        }
        return comp;
    }

    protected splayMin(node: Node) {
        let current = node;
        let nextLeft = current.left;
        while (nextLeft != null) {
            const left = nextLeft;
            current.left = left.right;
            left.right = current;
            current = left;
            nextLeft = current.left;
        }
        return current;
    }

    protected splayMax(node: Node) {
        let current = node;
        let nextRight = current.right;
        while (nextRight != null) {
            const right = nextRight;
            current.right = right.left;
            right.left = current;
            current = right;
            nextRight = current.right;
        }
        return current;
    }

    protected _delete(key: K) {
        if (this.root == null) return null;
        const comp = this.splay(key);
        if (comp != 0) return null;
        let root = this.root;
        const result = root;
        const left = root.left;
        this.size--;
        if (left == null) {
            this.root = root.right;
        } else {
            const right = root.right;
            root = this.splayMax(left);

            root.right = right;
            this.root = root;
        }
        this.modificationCount++;
        return result;
    }

    protected addNewRoot(node: Node, comp: number) {
        this.size++;
        this.modificationCount++;
        const root = this.root;
        if (root == null) {
            this.root = node;
            return;
        }
        if (comp < 0) {
            node.left = root;
            node.right = root.right;
            root.right = null;
        } else {
            node.right = root;
            node.left = root.left;
            root.left = null;
        }
        this.root = node;
    }

    protected _first() {
        const root = this.root;
        if (root == null) return null;
        this.root = this.splayMin(root);
        return this.root;
    }

    protected _last() {
        const root = this.root;
        if (root == null) return null;
        this.root = this.splayMax(root);
        return this.root;
    }

    public clear() {
        this.root = null;
        this.size = 0;
        this.modificationCount++;
    }

    public has(key: unknown) {
        return this.validKey(key) && this.splay(key as K) == 0;
    }

    protected defaultCompare(): Comparator<K> {
        return (a: K, b: K) => a < b ? -1 : a > b ? 1 : 0;
    }

    protected wrap(): SplayTreeWrapper<K, Node> {
        return {
            getRoot: () => { return this.root },
            setRoot: (root) => { this.root = root },
            getSize: () => { return this.size },
            getModificationCount: () => { return this.modificationCount },
            getSplayCount: () => { return this.splayCount },
            setSplayCount: (count) => { this.splayCount = count },
            splay: (key) => { return this.splay(key) },
            has: (key) => { return this.has(key) },
        };
    }
}

export class SplayTreeMap<K, V> extends SplayTree<K, SplayTreeMapNode<K, V>> implements Iterable<[K, V]>, Map<K, V> {
    protected root: SplayTreeMapNode<K, V> | null = null;

    protected compare: Comparator<K>;
    protected validKey: Predicate<unknown>;

    constructor(compare?: Comparator<K>, isValidKey?: Predicate<unknown>) {
        super();
        this.compare = compare ?? this.defaultCompare();
        this.validKey = isValidKey ?? ((a: unknown) => a != null && a != undefined);
    }

    delete(key: unknown) {
        if (!this.validKey(key)) return false;
        return this._delete(key as K) != null;
    }

    forEach(f: (value: V, key: K, map: Map<K, V>) => void) {
        const nodes: Iterator<[K, V]> = new SplayTreeMapEntryIterableIterator<K, V>(this.wrap());
        let result: IteratorResult<[K, V]>;
        while (result = nodes.next(), !result.done) {
            f(result.value[1], result.value[0], this);
        }
    }

    get(key: unknown): V | undefined {
        if (!this.validKey(key)) return undefined;
        if (this.root != null) {
            const comp = this.splay(key as K);
            if (comp == 0) {
                return this.root!.value;
            }
        }
        return undefined;
    }

    hasValue(value: unknown) {
        const initialSplayCount = this.splayCount;
        const visit = (node: SplayTreeMapNode<K, V> | null) => {
            while (node != null) {
                if (node.value == value) return true;
                if (initialSplayCount != this.splayCount) {
                    throw "Concurrent modification during iteration.";
                }
                if (node.right != null && visit(node.right)) {
                    return true;
                }
                node = node.left;
            }
            return false;
        }

        return visit(this.root);
    }

    set(key: K, value: V) {
        const comp = this.splay(key);
        if (comp == 0) {
            this.root = this.root!.replaceValue(value);
            this.splayCount += 1;
            return this;
        }
        this.addNewRoot(new SplayTreeMapNode(key, value), comp);
        return this;
    }

    setAll(other: Map<K, V>) {
        other.forEach((value: V, key: K) => {
            this.set(key, value);
        });
    }

    setIfAbsent(key: K, ifAbsent: () => V) {
        let comp = this.splay(key);
        if (comp == 0) {
            return this.root!.value;
        }
        const modificationCount = this.modificationCount;
        const splayCount = this.splayCount;
        const value = ifAbsent();
        if (modificationCount != this.modificationCount) {
            throw "Concurrent modification during iteration.";
        }
        if (splayCount != this.splayCount) {
            comp = this.splay(key);
        }
        this.addNewRoot(new SplayTreeMapNode(key, value), comp);
        return value;
    }

    isEmpty() {
        return this.root == null;
    }

    isNotEmpty() {
        return !this.isEmpty();
    }

    firstKey() {
        if (this.root == null) return null;
        return this._first()!.key;
    }

    lastKey() {
        if (this.root == null) return null;
        return this._last()!.key;
    }

    lastKeyBefore(key: K) {
        if (key == null) throw "Invalid arguments(s)";
        if (this.root == null) return null;
        const comp = this.splay(key);
        if (comp < 0) return this.root!.key;
        let node: SplayTreeMapNode<K, V> | null = this.root!.left;
        if (node == null) return null;
        let nodeRight = node.right;
        while (nodeRight != null) {
            node = nodeRight;
            nodeRight = node.right;
        }
        return node!.key;
    }

    firstKeyAfter(key: K) {
        if (key == null) throw "Invalid arguments(s)";
        if (this.root == null) return null;
        const comp = this.splay(key);
        if (comp > 0) return this.root!.key;
        let node: SplayTreeMapNode<K, V> | null = this.root!.right;
        if (node == null) return null;
        let nodeLeft = node.left;
        while (nodeLeft != null) {
            node = nodeLeft;
            nodeLeft = node.left;
        }
        return node!.key;
    }

    update(key: K, update: (value: V) => V, ifAbsent?: () => V) {
        let comp = this.splay(key);
        if (comp == 0) {
            const modificationCount = this.modificationCount;
            const splayCount = this.splayCount;
            const newValue = update(this.root!.value);
            if (modificationCount != this.modificationCount) {
                throw "Concurrent modification during iteration.";
            }
            if (splayCount != this.splayCount) {
                this.splay(key);
            }
            this.root = this.root!.replaceValue(newValue);
            this.splayCount += 1;
            return newValue;
        }
        if (ifAbsent != null) {
            const modificationCount = this.modificationCount;
            const splayCount = this.splayCount;
            const newValue = ifAbsent();
            if (modificationCount != this.modificationCount) {
                throw "Concurrent modification during iteration.";
            }
            if (splayCount != this.splayCount) {
                comp = this.splay(key);
            }
            this.addNewRoot(new SplayTreeMapNode(key, newValue), comp);
            return newValue;
        }
        throw "Invalid argument (key): Key not in map."
    }

    updateAll(update: (key: K, value: V) => V) {
        const root = this.root;
        if (root == null) return;
        const iterator = new SplayTreeMapEntryIterableIterator(this.wrap());
        let node: IteratorResult<[K, V]>;
        while (node = iterator.next(), !node.done) {
            const newValue = update(...node.value);
            iterator.replaceValue(newValue);
        }
    }

    keys(): IterableIterator<K> {
        return new SplayTreeKeyIterableIterator<K, SplayTreeMapNode<K, V>>(this.wrap());
    }

    values(): IterableIterator<V> {
        return new SplayTreeValueIterableIterator<K, V>(this.wrap());
    }

    entries(): IterableIterator<[K, V]> {
        return this[Symbol.iterator]();
    }

    [Symbol.iterator](): IterableIterator<[K, V]> {
        return new SplayTreeMapEntryIterableIterator<K, V>(this.wrap());
    }

    [Symbol.toStringTag] = '[object Map]'
}

export class SplayTreeSet<E> extends SplayTree<E, SplayTreeSetNode<E>> implements Iterable<E>, Set<E> {
    protected root: SplayTreeSetNode<E> | null = null;

    protected compare: Comparator<E>;
    protected validKey: Predicate<unknown>;

    constructor(compare?: Comparator<E>, isValidKey?: Predicate<unknown>) {
        super();
        this.compare = compare ?? this.defaultCompare();
        this.validKey = isValidKey ?? ((v: unknown) => v != null && v != undefined );
    }

    delete(element: unknown) {
        if (!this.validKey(element)) return false;
        return this._delete(element as E) != null;
    }

    deleteAll(elements: Iterable<unknown>) {
        for (const element of elements) {
            this.delete(element);
        }
    }

    forEach(f: (element: E, element2: E, set: Set<E>) => void) {
        const nodes: Iterator<E> = this[Symbol.iterator]();
        let result: IteratorResult<E>;
        while (result = nodes.next(), !result.done) {
            f(result.value, result.value, this);
        }
    }

    add(element: E) {
        const compare = this.splay(element);
        if (compare != 0) this.addNewRoot(new SplayTreeSetNode(element), compare);
        return this;
    }

    addAndReturn(element: E) {
        const compare = this.splay(element);
        if (compare != 0) this.addNewRoot(new SplayTreeSetNode(element), compare);
        return this.root;
    }

    addAll(elements: Iterable<E>) {
        for (const element of elements) {
            this.add(element);
        }
    }

    isEmpty() {
        return this.root == null;
    }

    isNotEmpty() {
        return this.root != null;
    }

    single() {
        if (this.size == 0) throw "Bad state: No element";
        if (this.size > 1) throw "Bad state: Too many element";
        return this.root!.key;
    }

    first() {
        if (this.size == 0) throw "Bad state: No element";
        return this._first()!.key;
    }

    last() {
        if (this.size == 0) throw "Bad state: No element";
        return this._last()!.key;
    }

    lastBefore(element: E) {
        if (element == null) throw "Invalid arguments(s)";
        if (this.root == null) return null;
        const comp = this.splay(element);
        if (comp < 0) return this.root!.key;
        let node: SplayTreeSetNode<E> | null = this.root!.left;
        if (node == null) return null;
        let nodeRight = node.right;
        while (nodeRight != null) {
            node = nodeRight;
            nodeRight = node.right;
        }
        return node!.key;
    }

    firstAfter(element: E) {
        if (element == null) throw "Invalid arguments(s)";
        if (this.root == null) return null;
        const comp = this.splay(element);
        if (comp > 0) return this.root!.key;
        let node: SplayTreeSetNode<E> | null = this.root!.right;
        if (node == null) return null;
        let nodeLeft = node.left;
        while (nodeLeft != null) {
            node = nodeLeft;
            nodeLeft = node.left;
        }
        return node!.key;
    }

    retainAll(elements: Iterable<unknown>) {
        const retainSet = new SplayTreeSet<E>(this.compare, this.validKey);
        const modificationCount = this.modificationCount;
        for (const object of elements) {
            if (modificationCount != this.modificationCount) {
                throw "Concurrent modification during iteration.";
            }
            if (this.validKey(object) && this.splay(object as E) == 0) {
                retainSet.add(this.root!.key);
            }
        }
        if (retainSet.size != this.size) {
            this.root = retainSet.root;
            this.size = retainSet.size;
            this.modificationCount++;
        }
    }

    lookup(object: unknown): E | null {
        if (!this.validKey(object)) return null;
        const comp = this.splay(object as E);
        if (comp != 0) return null;
        return this.root!.key;
    }

    intersection(other: Set<unknown>): Set<E> {
        const result = new SplayTreeSet<E>(this.compare, this.validKey);
        for (const element of this) {
            if (other.has(element)) result.add(element);
        }
        return result;
    }

    difference(other: Set<unknown>): Set<E> {
        const result = new SplayTreeSet<E>(this.compare, this.validKey);
        for (const element of this) {
            if (!other.has(element)) result.add(element);
        }
        return result;
    }

    union(other: Set<E>): Set<E> {
        const u = this.clone();
        u.addAll(other);
        return u;
    }

    protected clone() {
        const set = new SplayTreeSet<E>(this.compare, this.validKey);
        set.size = this.size;
        set.root = this.copyNode<SplayTreeSetNode<E>>(this.root);
        return set;
    }

    protected copyNode<Node extends SplayTreeNode<E, Node>>(node: Node | null) {
        if (node == null) return null;
        function copyChildren(node: Node, dest: SplayTreeSetNode<E>) {
            let left: Node | null;
            let right: Node | null;
            do {
                left = node.left;
                right = node.right;
                if (left != null) {
                    const newLeft = new SplayTreeSetNode<E>(left.key);
                    dest.left = newLeft;
                    copyChildren(left, newLeft);
                }
                if (right != null) {
                    const newRight = new SplayTreeSetNode<E>(right.key);
                    dest.right = newRight;
                    node = right;
                    dest = newRight;
                }
            } while (right != null);
        }

        const result = new SplayTreeSetNode<E>(node.key);
        copyChildren(node, result);
        return result;
    }

    toSet(): Set<E> {
        return this.clone();
    }

    entries(): IterableIterator<[E, E]> {
        return new SplayTreeSetEntryIterableIterator<E, SplayTreeSetNode<E>>(this.wrap());
    }

    keys(): IterableIterator<E> {
        return this[Symbol.iterator]();
    }
    
    values(): IterableIterator<E> {
        return this[Symbol.iterator]();
    }

    [Symbol.iterator](): IterableIterator<E> {
        return new SplayTreeKeyIterableIterator<E, SplayTreeSetNode<E>>(this.wrap());
    }

    [Symbol.toStringTag] = '[object Set]'
}

interface SplayTreeWrapper<K, Node extends SplayTreeNode<K, Node>> {
    getRoot: () => Node | null;
    setRoot: (root: Node | null) => void;
    getSize: () => number;
    getModificationCount: () => number;
    getSplayCount: () => number;
    setSplayCount: (count: number) => void;
    splay: (key: K) => number;
    has: (key: unknown) => boolean;
}

type SplayTreeMapWrapper<K, V> = SplayTreeWrapper<K, SplayTreeMapNode<K, V>>;

abstract class SplayTreeIterableIterator<K, Node extends SplayTreeNode<K, Node>, T> implements IterableIterator<T> {
    protected readonly tree: SplayTreeWrapper<K, Node>;

    protected readonly path = new Array<Node>();

    protected modificationCount: number | null = null;

    protected splayCount: number;

    constructor(tree: SplayTreeWrapper<K, Node>) {
        this.tree = tree;
        this.splayCount = tree.getSplayCount();
    }

    [Symbol.iterator](): IterableIterator<T> {
        return this;
    }

    next(): IteratorResult<T, null> {
        if (this.moveNext()) return { done: false, value: this.current()! }
        return { done: true, value: null }
    }

    protected current() {
        if (!this.path.length) return null;
        const node = this.path[this.path.length - 1];
        return this.getValue(node);
    }

    protected rebuildPath(key: K) {
        this.path.splice(0, this.path.length)
        this.tree.splay(key);
        this.path.push(this.tree.getRoot()!);
        this.splayCount = this.tree.getSplayCount();
    }

    protected findLeftMostDescendent(node: Node | null) {
        while (node != null) {
            this.path.push(node);
            node = node.left;
        }
    }

    protected moveNext() {
        if (this.modificationCount != this.tree.getModificationCount()) {
            if (this.modificationCount == null) {
                this.modificationCount = this.tree.getModificationCount();
                let node = this.tree.getRoot();
                while (node != null) {
                    this.path.push(node);
                    node = node.left;
                }
                return this.path.length > 0;
            }
            throw "Concurrent modification during iteration.";
        }
        if (!this.path.length) return false;
        if (this.splayCount != this.tree.getSplayCount()) {
            this.rebuildPath(this.path[this.path.length - 1].key);
        }
        let node = this.path[this.path.length - 1];
        let next = node.right;
        if (next != null) {
            while (next != null) {
                this.path.push(next);
                next = next.left;
            }
            return true;
        }
        this.path.pop();
        while (this.path.length && this.path[this.path.length - 1].right === node) {
            node = this.path.pop()!;
        }
        return this.path.length > 0;
    }

    protected abstract getValue(node: Node): T
}

class SplayTreeKeyIterableIterator<K, Node extends SplayTreeNode<K, Node>> extends SplayTreeIterableIterator<K, Node, K> {

    protected getValue(node: Node) {
        return node.key;
    }
}

class SplayTreeSetEntryIterableIterator<K, Node extends SplayTreeNode<K, Node>> extends SplayTreeIterableIterator<K, Node, [K, K]> {

    protected getValue(node: Node): [K, K] {
        return [node.key, node.key];
    }
}

class SplayTreeValueIterableIterator<K, V> extends SplayTreeIterableIterator<K, SplayTreeMapNode<K, V>, V> {

    constructor(map: SplayTreeMapWrapper<K, V>) {
        super(map);
    }

    protected getValue(node: SplayTreeMapNode<K, V>) {
        return node.value;
    }
}

class SplayTreeMapEntryIterableIterator<K, V> extends SplayTreeIterableIterator<K, SplayTreeMapNode<K, V>, [K, V]> {

    constructor(map: SplayTreeMapWrapper<K, V>) {
        super(map);
    }

    protected getValue(node: SplayTreeMapNode<K, V>): [K, V] {
        return [node.key, node.value];
    }

    replaceValue(value: V) {
        if (this.modificationCount != this.tree.getModificationCount()) {
            throw "Concurrent modification during iteration.";
        }
        if (this.splayCount != this.tree.getSplayCount()) {
            this.rebuildPath(this.path[this.path.length - 1].key);
        }
        const last = this.path.pop()!;
        const newLast = last.replaceValue(value);
        if (!this.path.length) {
            this.tree.setRoot(newLast);
        } else {
            const parent = this.path[this.path.length - 1];
            if (last === parent.left) {
                parent.left = newLast;
            } else {
                parent.right = newLast;
            }
        }
        this.path.push(newLast);
        const count = this.tree.getSplayCount() + 1;
        this.tree.setSplayCount(count);
        this.splayCount = count;
    }
}