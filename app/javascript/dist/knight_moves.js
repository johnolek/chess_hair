import { knightMovesData } from 'src/knight_moves_data';
import Config, { ConfigForm } from 'src/local_config';

/** @returns {void} */
function noop() {}

/** @returns {void} */
function add_location(element, file, line, column, char) {
	element.__svelte_meta = {
		loc: { file, line, column, char }
	};
}

function run(fn) {
	return fn();
}

function blank_object() {
	return Object.create(null);
}

/**
 * @param {Function[]} fns
 * @returns {void}
 */
function run_all(fns) {
	fns.forEach(run);
}

/**
 * @param {any} thing
 * @returns {thing is Function}
 */
function is_function(thing) {
	return typeof thing === 'function';
}

/** @returns {boolean} */
function safe_not_equal(a, b) {
	return a != a ? b == b : a !== b || (a && typeof a === 'object') || typeof a === 'function';
}

/** @returns {boolean} */
function is_empty(obj) {
	return Object.keys(obj).length === 0;
}

function null_to_empty(value) {
	return value == null ? '' : value;
}

/** @type {typeof globalThis} */
const globals =
	typeof window !== 'undefined'
		? window
		: typeof globalThis !== 'undefined'
		? globalThis
		: // @ts-ignore Node typings have this
		  global;

/**
 * @param {Node} target
 * @param {Node} node
 * @returns {void}
 */
function append(target, node) {
	target.appendChild(node);
}

/**
 * @param {Node} target
 * @param {string} style_sheet_id
 * @param {string} styles
 * @returns {void}
 */
function append_styles(target, style_sheet_id, styles) {
	const append_styles_to = get_root_for_style(target);
	if (!append_styles_to.getElementById(style_sheet_id)) {
		const style = element('style');
		style.id = style_sheet_id;
		style.textContent = styles;
		append_stylesheet(append_styles_to, style);
	}
}

/**
 * @param {Node} node
 * @returns {ShadowRoot | Document}
 */
function get_root_for_style(node) {
	if (!node) return document;
	const root = node.getRootNode ? node.getRootNode() : node.ownerDocument;
	if (root && /** @type {ShadowRoot} */ (root).host) {
		return /** @type {ShadowRoot} */ (root);
	}
	return node.ownerDocument;
}

/**
 * @param {ShadowRoot | Document} node
 * @param {HTMLStyleElement} style
 * @returns {CSSStyleSheet}
 */
function append_stylesheet(node, style) {
	append(/** @type {Document} */ (node).head || node, style);
	return style.sheet;
}

/**
 * @param {Node} target
 * @param {Node} node
 * @param {Node} [anchor]
 * @returns {void}
 */
function insert(target, node, anchor) {
	target.insertBefore(node, anchor || null);
}

/**
 * @param {Node} node
 * @returns {void}
 */
function detach(node) {
	if (node.parentNode) {
		node.parentNode.removeChild(node);
	}
}

/**
 * @template {keyof HTMLElementTagNameMap} K
 * @param {K} name
 * @returns {HTMLElementTagNameMap[K]}
 */
function element(name) {
	return document.createElement(name);
}

/**
 * @param {string} data
 * @returns {Text}
 */
function text(data) {
	return document.createTextNode(data);
}

/**
 * @returns {Text} */
function space() {
	return text(' ');
}

/**
 * @param {EventTarget} node
 * @param {string} event
 * @param {EventListenerOrEventListenerObject} handler
 * @param {boolean | AddEventListenerOptions | EventListenerOptions} [options]
 * @returns {() => void}
 */
function listen(node, event, handler, options) {
	node.addEventListener(event, handler, options);
	return () => node.removeEventListener(event, handler, options);
}

/**
 * @returns {(event: any) => any} */
function prevent_default(fn) {
	return function (event) {
		event.preventDefault();
		// @ts-ignore
		return fn.call(this, event);
	};
}

/**
 * @param {Element} node
 * @param {string} attribute
 * @param {string} [value]
 * @returns {void}
 */
function attr(node, attribute, value) {
	if (value == null) node.removeAttribute(attribute);
	else if (node.getAttribute(attribute) !== value) node.setAttribute(attribute, value);
}

/**
 * @param {Element} element
 * @returns {ChildNode[]}
 */
function children(element) {
	return Array.from(element.childNodes);
}

/**
 * @returns {void} */
function set_style(node, key, value, important) {
	if (value == null) {
		node.style.removeProperty(key);
	} else {
		node.style.setProperty(key, value, '');
	}
}

/**
 * @template T
 * @param {string} type
 * @param {T} [detail]
 * @param {{ bubbles?: boolean, cancelable?: boolean }} [options]
 * @returns {CustomEvent<T>}
 */
function custom_event(type, detail, { bubbles = false, cancelable = false } = {}) {
	return new CustomEvent(type, { detail, bubbles, cancelable });
}

/**
 * @typedef {Node & {
 * 	claim_order?: number;
 * 	hydrate_init?: true;
 * 	actual_end_child?: NodeEx;
 * 	childNodes: NodeListOf<NodeEx>;
 * }} NodeEx
 */

/** @typedef {ChildNode & NodeEx} ChildNodeEx */

/** @typedef {NodeEx & { claim_order: number }} NodeEx2 */

/**
 * @typedef {ChildNodeEx[] & {
 * 	claim_info?: {
 * 		last_index: number;
 * 		total_claimed: number;
 * 	};
 * }} ChildNodeArray
 */

let current_component;

/** @returns {void} */
function set_current_component(component) {
	current_component = component;
}

function get_current_component() {
	if (!current_component) throw new Error('Function called outside component initialization');
	return current_component;
}

/**
 * The `onMount` function schedules a callback to run as soon as the component has been mounted to the DOM.
 * It must be called during the component's initialisation (but doesn't need to live *inside* the component;
 * it can be called from an external module).
 *
 * If a function is returned _synchronously_ from `onMount`, it will be called when the component is unmounted.
 *
 * `onMount` does not run inside a [server-side component](https://svelte.dev/docs#run-time-server-side-component-api).
 *
 * https://svelte.dev/docs/svelte#onmount
 * @template T
 * @param {() => import('./private.js').NotFunction<T> | Promise<import('./private.js').NotFunction<T>> | (() => any)} fn
 * @returns {void}
 */
function onMount(fn) {
	get_current_component().$$.on_mount.push(fn);
}

const dirty_components = [];
const binding_callbacks = [];

let render_callbacks = [];

const flush_callbacks = [];

const resolved_promise = /* @__PURE__ */ Promise.resolve();

let update_scheduled = false;

/** @returns {void} */
function schedule_update() {
	if (!update_scheduled) {
		update_scheduled = true;
		resolved_promise.then(flush);
	}
}

/** @returns {void} */
function add_render_callback(fn) {
	render_callbacks.push(fn);
}

// flush() calls callbacks in this order:
// 1. All beforeUpdate callbacks, in order: parents before children
// 2. All bind:this callbacks, in reverse order: children before parents.
// 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
//    for afterUpdates called during the initial onMount, which are called in
//    reverse order: children before parents.
// Since callbacks might update component values, which could trigger another
// call to flush(), the following steps guard against this:
// 1. During beforeUpdate, any updated components will be added to the
//    dirty_components array and will cause a reentrant call to flush(). Because
//    the flush index is kept outside the function, the reentrant call will pick
//    up where the earlier call left off and go through all dirty components. The
//    current_component value is saved and restored so that the reentrant call will
//    not interfere with the "parent" flush() call.
// 2. bind:this callbacks cannot trigger new flush() calls.
// 3. During afterUpdate, any updated components will NOT have their afterUpdate
//    callback called a second time; the seen_callbacks set, outside the flush()
//    function, guarantees this behavior.
const seen_callbacks = new Set();

let flushidx = 0; // Do *not* move this inside the flush() function

/** @returns {void} */
function flush() {
	// Do not reenter flush while dirty components are updated, as this can
	// result in an infinite loop. Instead, let the inner flush handle it.
	// Reentrancy is ok afterwards for bindings etc.
	if (flushidx !== 0) {
		return;
	}
	const saved_component = current_component;
	do {
		// first, call beforeUpdate functions
		// and update components
		try {
			while (flushidx < dirty_components.length) {
				const component = dirty_components[flushidx];
				flushidx++;
				set_current_component(component);
				update(component.$$);
			}
		} catch (e) {
			// reset dirty state to not end up in a deadlocked state and then rethrow
			dirty_components.length = 0;
			flushidx = 0;
			throw e;
		}
		set_current_component(null);
		dirty_components.length = 0;
		flushidx = 0;
		while (binding_callbacks.length) binding_callbacks.pop()();
		// then, once components are updated, call
		// afterUpdate functions. This may cause
		// subsequent updates...
		for (let i = 0; i < render_callbacks.length; i += 1) {
			const callback = render_callbacks[i];
			if (!seen_callbacks.has(callback)) {
				// ...so guard against infinite loops
				seen_callbacks.add(callback);
				callback();
			}
		}
		render_callbacks.length = 0;
	} while (dirty_components.length);
	while (flush_callbacks.length) {
		flush_callbacks.pop()();
	}
	update_scheduled = false;
	seen_callbacks.clear();
	set_current_component(saved_component);
}

/** @returns {void} */
function update($$) {
	if ($$.fragment !== null) {
		$$.update();
		run_all($$.before_update);
		const dirty = $$.dirty;
		$$.dirty = [-1];
		$$.fragment && $$.fragment.p($$.ctx, dirty);
		$$.after_update.forEach(add_render_callback);
	}
}

/**
 * Useful for example to execute remaining `afterUpdate` callbacks before executing `destroy`.
 * @param {Function[]} fns
 * @returns {void}
 */
function flush_render_callbacks(fns) {
	const filtered = [];
	const targets = [];
	render_callbacks.forEach((c) => (fns.indexOf(c) === -1 ? filtered.push(c) : targets.push(c)));
	targets.forEach((c) => c());
	render_callbacks = filtered;
}

const outroing = new Set();

/**
 * @param {import('./private.js').Fragment} block
 * @param {0 | 1} [local]
 * @returns {void}
 */
function transition_in(block, local) {
	if (block && block.i) {
		outroing.delete(block);
		block.i(local);
	}
}

/** @typedef {1} INTRO */
/** @typedef {0} OUTRO */
/** @typedef {{ direction: 'in' | 'out' | 'both' }} TransitionOptions */
/** @typedef {(node: Element, params: any, options: TransitionOptions) => import('../transition/public.js').TransitionConfig} TransitionFn */

/**
 * @typedef {Object} Outro
 * @property {number} r
 * @property {Function[]} c
 * @property {Object} p
 */

/**
 * @typedef {Object} PendingProgram
 * @property {number} start
 * @property {INTRO|OUTRO} b
 * @property {Outro} [group]
 */

/**
 * @typedef {Object} Program
 * @property {number} a
 * @property {INTRO|OUTRO} b
 * @property {1|-1} d
 * @property {number} duration
 * @property {number} start
 * @property {number} end
 * @property {Outro} [group]
 */

/** @returns {void} */
function mount_component(component, target, anchor) {
	const { fragment, after_update } = component.$$;
	fragment && fragment.m(target, anchor);
	// onMount happens before the initial afterUpdate
	add_render_callback(() => {
		const new_on_destroy = component.$$.on_mount.map(run).filter(is_function);
		// if the component was destroyed immediately
		// it will update the `$$.on_destroy` reference to `null`.
		// the destructured on_destroy may still reference to the old array
		if (component.$$.on_destroy) {
			component.$$.on_destroy.push(...new_on_destroy);
		} else {
			// Edge case - component was destroyed immediately,
			// most likely as a result of a binding initialising
			run_all(new_on_destroy);
		}
		component.$$.on_mount = [];
	});
	after_update.forEach(add_render_callback);
}

/** @returns {void} */
function destroy_component(component, detaching) {
	const $$ = component.$$;
	if ($$.fragment !== null) {
		flush_render_callbacks($$.after_update);
		run_all($$.on_destroy);
		$$.fragment && $$.fragment.d(detaching);
		// TODO null out other refs, including component.$$ (but need to
		// preserve final state?)
		$$.on_destroy = $$.fragment = null;
		$$.ctx = [];
	}
}

/** @returns {void} */
function make_dirty(component, i) {
	if (component.$$.dirty[0] === -1) {
		dirty_components.push(component);
		schedule_update();
		component.$$.dirty.fill(0);
	}
	component.$$.dirty[(i / 31) | 0] |= 1 << i % 31;
}

// TODO: Document the other params
/**
 * @param {SvelteComponent} component
 * @param {import('./public.js').ComponentConstructorOptions} options
 *
 * @param {import('./utils.js')['not_equal']} not_equal Used to compare props and state values.
 * @param {(target: Element | ShadowRoot) => void} [append_styles] Function that appends styles to the DOM when the component is first initialised.
 * This will be the `add_css` function from the compiled component.
 *
 * @returns {void}
 */
function init(
	component,
	options,
	instance,
	create_fragment,
	not_equal,
	props,
	append_styles = null,
	dirty = [-1]
) {
	const parent_component = current_component;
	set_current_component(component);
	/** @type {import('./private.js').T$$} */
	const $$ = (component.$$ = {
		fragment: null,
		ctx: [],
		// state
		props,
		update: noop,
		not_equal,
		bound: blank_object(),
		// lifecycle
		on_mount: [],
		on_destroy: [],
		on_disconnect: [],
		before_update: [],
		after_update: [],
		context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
		// everything else
		callbacks: blank_object(),
		dirty,
		skip_bound: false,
		root: options.target || parent_component.$$.root
	});
	append_styles && append_styles($$.root);
	let ready = false;
	$$.ctx = instance
		? instance(component, options.props || {}, (i, ret, ...rest) => {
				const value = rest.length ? rest[0] : ret;
				if ($$.ctx && not_equal($$.ctx[i], ($$.ctx[i] = value))) {
					if (!$$.skip_bound && $$.bound[i]) $$.bound[i](value);
					if (ready) make_dirty(component, i);
				}
				return ret;
		  })
		: [];
	$$.update();
	ready = true;
	run_all($$.before_update);
	// `false` as a special case of no DOM component
	$$.fragment = create_fragment ? create_fragment($$.ctx) : false;
	if (options.target) {
		if (options.hydrate) {
			// TODO: what is the correct type here?
			// @ts-expect-error
			const nodes = children(options.target);
			$$.fragment && $$.fragment.l(nodes);
			nodes.forEach(detach);
		} else {
			// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
			$$.fragment && $$.fragment.c();
		}
		if (options.intro) transition_in(component.$$.fragment);
		mount_component(component, options.target, options.anchor);
		flush();
	}
	set_current_component(parent_component);
}

/**
 * Base class for Svelte components. Used when dev=false.
 *
 * @template {Record<string, any>} [Props=any]
 * @template {Record<string, any>} [Events=any]
 */
class SvelteComponent {
	/**
	 * ### PRIVATE API
	 *
	 * Do not use, may change at any time
	 *
	 * @type {any}
	 */
	$$ = undefined;
	/**
	 * ### PRIVATE API
	 *
	 * Do not use, may change at any time
	 *
	 * @type {any}
	 */
	$$set = undefined;

	/** @returns {void} */
	$destroy() {
		destroy_component(this, 1);
		this.$destroy = noop;
	}

	/**
	 * @template {Extract<keyof Events, string>} K
	 * @param {K} type
	 * @param {((e: Events[K]) => void) | null | undefined} callback
	 * @returns {() => void}
	 */
	$on(type, callback) {
		if (!is_function(callback)) {
			return noop;
		}
		const callbacks = this.$$.callbacks[type] || (this.$$.callbacks[type] = []);
		callbacks.push(callback);
		return () => {
			const index = callbacks.indexOf(callback);
			if (index !== -1) callbacks.splice(index, 1);
		};
	}

	/**
	 * @param {Partial<Props>} props
	 * @returns {void}
	 */
	$set(props) {
		if (this.$$set && !is_empty(props)) {
			this.$$.skip_bound = true;
			this.$$set(props);
			this.$$.skip_bound = false;
		}
	}
}

/**
 * @typedef {Object} CustomElementPropDefinition
 * @property {string} [attribute]
 * @property {boolean} [reflect]
 * @property {'String'|'Boolean'|'Number'|'Array'|'Object'} [type]
 */

// generated during release, do not modify

/**
 * The current version, as set in package.json.
 *
 * https://svelte.dev/docs/svelte-compiler#svelte-version
 * @type {string}
 */
const VERSION = '4.2.18';
const PUBLIC_VERSION = '4';

/**
 * @template T
 * @param {string} type
 * @param {T} [detail]
 * @returns {void}
 */
function dispatch_dev(type, detail) {
	document.dispatchEvent(custom_event(type, { version: VERSION, ...detail }, { bubbles: true }));
}

/**
 * @param {Node} target
 * @param {Node} node
 * @returns {void}
 */
function append_dev(target, node) {
	dispatch_dev('SvelteDOMInsert', { target, node });
	append(target, node);
}

/**
 * @param {Node} target
 * @param {Node} node
 * @param {Node} [anchor]
 * @returns {void}
 */
function insert_dev(target, node, anchor) {
	dispatch_dev('SvelteDOMInsert', { target, node, anchor });
	insert(target, node, anchor);
}

/**
 * @param {Node} node
 * @returns {void}
 */
function detach_dev(node) {
	dispatch_dev('SvelteDOMRemove', { node });
	detach(node);
}

/**
 * @param {Node} node
 * @param {string} event
 * @param {EventListenerOrEventListenerObject} handler
 * @param {boolean | AddEventListenerOptions | EventListenerOptions} [options]
 * @param {boolean} [has_prevent_default]
 * @param {boolean} [has_stop_propagation]
 * @param {boolean} [has_stop_immediate_propagation]
 * @returns {() => void}
 */
function listen_dev(
	node,
	event,
	handler,
	options,
	has_prevent_default,
	has_stop_propagation,
	has_stop_immediate_propagation
) {
	const modifiers =
		[];
	if (has_prevent_default) modifiers.push('preventDefault');
	dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
	const dispose = listen(node, event, handler, options);
	return () => {
		dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
		dispose();
	};
}

/**
 * @param {Element} node
 * @param {string} attribute
 * @param {string} [value]
 * @returns {void}
 */
function attr_dev(node, attribute, value) {
	attr(node, attribute, value);
	if (value == null) dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
	else dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
}

/**
 * @param {Element} node
 * @param {string} property
 * @param {any} [value]
 * @returns {void}
 */
function prop_dev(node, property, value) {
	node[property] = value;
	dispatch_dev('SvelteDOMSetProperty', { node, property, value });
}

/**
 * @param {Text} text
 * @param {unknown} data
 * @returns {void}
 */
function set_data_dev(text, data) {
	data = '' + data;
	if (text.data === data) return;
	dispatch_dev('SvelteDOMSetData', { node: text, data });
	text.data = /** @type {string} */ (data);
}

/**
 * @returns {void} */
function validate_slots(name, slot, keys) {
	for (const slot_key of Object.keys(slot)) {
		if (!~keys.indexOf(slot_key)) {
			console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
		}
	}
}

/**
 * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
 *
 * Can be used to create strongly typed Svelte components.
 *
 * #### Example:
 *
 * You have component library on npm called `component-library`, from which
 * you export a component called `MyComponent`. For Svelte+TypeScript users,
 * you want to provide typings. Therefore you create a `index.d.ts`:
 * ```ts
 * import { SvelteComponent } from "svelte";
 * export class MyComponent extends SvelteComponent<{foo: string}> {}
 * ```
 * Typing this makes it possible for IDEs like VS Code with the Svelte extension
 * to provide intellisense and to use the component like this in a Svelte file
 * with TypeScript:
 * ```svelte
 * <script lang="ts">
 * 	import { MyComponent } from "component-library";
 * </script>
 * <MyComponent foo={'bar'} />
 * ```
 * @template {Record<string, any>} [Props=any]
 * @template {Record<string, any>} [Events=any]
 * @template {Record<string, any>} [Slots=any]
 * @extends {SvelteComponent<Props, Events>}
 */
class SvelteComponentDev extends SvelteComponent {
	/**
	 * For type checking capabilities only.
	 * Does not exist at runtime.
	 * ### DO NOT USE!
	 *
	 * @type {Props}
	 */
	$$prop_def;
	/**
	 * For type checking capabilities only.
	 * Does not exist at runtime.
	 * ### DO NOT USE!
	 *
	 * @type {Events}
	 */
	$$events_def;
	/**
	 * For type checking capabilities only.
	 * Does not exist at runtime.
	 * ### DO NOT USE!
	 *
	 * @type {Slots}
	 */
	$$slot_def;

	/** @param {import('./public.js').ComponentConstructorOptions<Props>} options */
	constructor(options) {
		if (!options || (!options.target && !options.$$inline)) {
			throw new Error("'target' is a required option");
		}
		super();
	}

	/** @returns {void} */
	$destroy() {
		super.$destroy();
		this.$destroy = () => {
			console.warn('Component was already destroyed'); // eslint-disable-line no-console
		};
	}

	/** @returns {void} */
	$capture_state() {}

	/** @returns {void} */
	$inject_state() {}
}

if (typeof window !== 'undefined')
	// @ts-ignore
	(window.__svelte || (window.__svelte = { v: new Set() })).v.add(PUBLIC_VERSION);

const colors = ['white', 'black'];
const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const ranks = ['1', '2', '3', '4', '5', '6', '7', '8'];

const invRanks = [...ranks].reverse();
const allKeys = Array.prototype.concat(...files.map(c => ranks.map(r => c + r)));
const pos2key = (pos) => allKeys[8 * pos[0] + pos[1]];
const key2pos = (k) => [k.charCodeAt(0) - 97, k.charCodeAt(1) - 49];
const allPos = allKeys.map(key2pos);
function memo(f) {
    let v;
    const ret = () => {
        if (v === undefined)
            v = f();
        return v;
    };
    ret.clear = () => {
        v = undefined;
    };
    return ret;
}
const timer = () => {
    let startAt;
    return {
        start() {
            startAt = performance.now();
        },
        cancel() {
            startAt = undefined;
        },
        stop() {
            if (!startAt)
                return 0;
            const time = performance.now() - startAt;
            startAt = undefined;
            return time;
        },
    };
};
const opposite = (c) => (c === 'white' ? 'black' : 'white');
const distanceSq = (pos1, pos2) => {
    const dx = pos1[0] - pos2[0], dy = pos1[1] - pos2[1];
    return dx * dx + dy * dy;
};
const samePiece = (p1, p2) => p1.role === p2.role && p1.color === p2.color;
const posToTranslate = (bounds) => (pos, asWhite) => [
    ((asWhite ? pos[0] : 7 - pos[0]) * bounds.width) / 8,
    ((asWhite ? 7 - pos[1] : pos[1]) * bounds.height) / 8,
];
const translate = (el, pos) => {
    el.style.transform = `translate(${pos[0]}px,${pos[1]}px)`;
};
const translateAndScale = (el, pos, scale = 1) => {
    el.style.transform = `translate(${pos[0]}px,${pos[1]}px) scale(${scale})`;
};
const setVisible = (el, v) => {
    el.style.visibility = v ? 'visible' : 'hidden';
};
const eventPosition = (e) => {
    var _a;
    if (e.clientX || e.clientX === 0)
        return [e.clientX, e.clientY];
    if ((_a = e.targetTouches) === null || _a === void 0 ? void 0 : _a[0])
        return [e.targetTouches[0].clientX, e.targetTouches[0].clientY];
    return; // touchend has no position!
};
const isRightButton = (e) => e.button === 2;
const createEl = (tagName, className) => {
    const el = document.createElement(tagName);
    if (className)
        el.className = className;
    return el;
};
function computeSquareCenter(key, asWhite, bounds) {
    const pos = key2pos(key);
    if (!asWhite) {
        pos[0] = 7 - pos[0];
        pos[1] = 7 - pos[1];
    }
    return [
        bounds.left + (bounds.width * pos[0]) / 8 + bounds.width / 16,
        bounds.top + (bounds.height * (7 - pos[1])) / 8 + bounds.height / 16,
    ];
}

const diff = (a, b) => Math.abs(a - b);
const pawn = (color) => (x1, y1, x2, y2) => diff(x1, x2) < 2 &&
    (color === 'white'
        ? // allow 2 squares from first two ranks, for horde
            y2 === y1 + 1 || (y1 <= 1 && y2 === y1 + 2 && x1 === x2)
        : y2 === y1 - 1 || (y1 >= 6 && y2 === y1 - 2 && x1 === x2));
const knight = (x1, y1, x2, y2) => {
    const xd = diff(x1, x2);
    const yd = diff(y1, y2);
    return (xd === 1 && yd === 2) || (xd === 2 && yd === 1);
};
const bishop = (x1, y1, x2, y2) => {
    return diff(x1, x2) === diff(y1, y2);
};
const rook = (x1, y1, x2, y2) => {
    return x1 === x2 || y1 === y2;
};
const queen = (x1, y1, x2, y2) => {
    return bishop(x1, y1, x2, y2) || rook(x1, y1, x2, y2);
};
const king = (color, rookFiles, canCastle) => (x1, y1, x2, y2) => (diff(x1, x2) < 2 && diff(y1, y2) < 2) ||
    (canCastle &&
        y1 === y2 &&
        y1 === (color === 'white' ? 0 : 7) &&
        ((x1 === 4 && ((x2 === 2 && rookFiles.includes(0)) || (x2 === 6 && rookFiles.includes(7)))) ||
            rookFiles.includes(x2)));
function rookFilesOf(pieces, color) {
    const backrank = color === 'white' ? '1' : '8';
    const files = [];
    for (const [key, piece] of pieces) {
        if (key[1] === backrank && piece.color === color && piece.role === 'rook') {
            files.push(key2pos(key)[0]);
        }
    }
    return files;
}
function premove(pieces, key, canCastle) {
    const piece = pieces.get(key);
    if (!piece)
        return [];
    const pos = key2pos(key), r = piece.role, mobility = r === 'pawn'
        ? pawn(piece.color)
        : r === 'knight'
            ? knight
            : r === 'bishop'
                ? bishop
                : r === 'rook'
                    ? rook
                    : r === 'queen'
                        ? queen
                        : king(piece.color, rookFilesOf(pieces, piece.color), canCastle);
    return allPos
        .filter(pos2 => (pos[0] !== pos2[0] || pos[1] !== pos2[1]) && mobility(pos[0], pos[1], pos2[0], pos2[1]))
        .map(pos2key);
}

function callUserFunction(f, ...args) {
    if (f)
        setTimeout(() => f(...args), 1);
}
function toggleOrientation(state) {
    state.orientation = opposite(state.orientation);
    state.animation.current = state.draggable.current = state.selected = undefined;
}
function setPieces(state, pieces) {
    for (const [key, piece] of pieces) {
        if (piece)
            state.pieces.set(key, piece);
        else
            state.pieces.delete(key);
    }
}
function setCheck(state, color) {
    state.check = undefined;
    if (color === true)
        color = state.turnColor;
    if (color)
        for (const [k, p] of state.pieces) {
            if (p.role === 'king' && p.color === color) {
                state.check = k;
            }
        }
}
function setPremove(state, orig, dest, meta) {
    unsetPredrop(state);
    state.premovable.current = [orig, dest];
    callUserFunction(state.premovable.events.set, orig, dest, meta);
}
function unsetPremove(state) {
    if (state.premovable.current) {
        state.premovable.current = undefined;
        callUserFunction(state.premovable.events.unset);
    }
}
function setPredrop(state, role, key) {
    unsetPremove(state);
    state.predroppable.current = { role, key };
    callUserFunction(state.predroppable.events.set, role, key);
}
function unsetPredrop(state) {
    const pd = state.predroppable;
    if (pd.current) {
        pd.current = undefined;
        callUserFunction(pd.events.unset);
    }
}
function tryAutoCastle(state, orig, dest) {
    if (!state.autoCastle)
        return false;
    const king = state.pieces.get(orig);
    if (!king || king.role !== 'king')
        return false;
    const origPos = key2pos(orig);
    const destPos = key2pos(dest);
    if ((origPos[1] !== 0 && origPos[1] !== 7) || origPos[1] !== destPos[1])
        return false;
    if (origPos[0] === 4 && !state.pieces.has(dest)) {
        if (destPos[0] === 6)
            dest = pos2key([7, destPos[1]]);
        else if (destPos[0] === 2)
            dest = pos2key([0, destPos[1]]);
    }
    const rook = state.pieces.get(dest);
    if (!rook || rook.color !== king.color || rook.role !== 'rook')
        return false;
    state.pieces.delete(orig);
    state.pieces.delete(dest);
    if (origPos[0] < destPos[0]) {
        state.pieces.set(pos2key([6, destPos[1]]), king);
        state.pieces.set(pos2key([5, destPos[1]]), rook);
    }
    else {
        state.pieces.set(pos2key([2, destPos[1]]), king);
        state.pieces.set(pos2key([3, destPos[1]]), rook);
    }
    return true;
}
function baseMove(state, orig, dest) {
    const origPiece = state.pieces.get(orig), destPiece = state.pieces.get(dest);
    if (orig === dest || !origPiece)
        return false;
    const captured = destPiece && destPiece.color !== origPiece.color ? destPiece : undefined;
    if (dest === state.selected)
        unselect(state);
    callUserFunction(state.events.move, orig, dest, captured);
    if (!tryAutoCastle(state, orig, dest)) {
        state.pieces.set(dest, origPiece);
        state.pieces.delete(orig);
    }
    state.lastMove = [orig, dest];
    state.check = undefined;
    callUserFunction(state.events.change);
    return captured || true;
}
function baseNewPiece(state, piece, key, force) {
    if (state.pieces.has(key)) {
        if (force)
            state.pieces.delete(key);
        else
            return false;
    }
    callUserFunction(state.events.dropNewPiece, piece, key);
    state.pieces.set(key, piece);
    state.lastMove = [key];
    state.check = undefined;
    callUserFunction(state.events.change);
    state.movable.dests = undefined;
    state.turnColor = opposite(state.turnColor);
    return true;
}
function baseUserMove(state, orig, dest) {
    const result = baseMove(state, orig, dest);
    if (result) {
        state.movable.dests = undefined;
        state.turnColor = opposite(state.turnColor);
        state.animation.current = undefined;
    }
    return result;
}
function userMove(state, orig, dest) {
    if (canMove(state, orig, dest)) {
        const result = baseUserMove(state, orig, dest);
        if (result) {
            const holdTime = state.hold.stop();
            unselect(state);
            const metadata = {
                premove: false,
                ctrlKey: state.stats.ctrlKey,
                holdTime,
            };
            if (result !== true)
                metadata.captured = result;
            callUserFunction(state.movable.events.after, orig, dest, metadata);
            return true;
        }
    }
    else if (canPremove(state, orig, dest)) {
        setPremove(state, orig, dest, {
            ctrlKey: state.stats.ctrlKey,
        });
        unselect(state);
        return true;
    }
    unselect(state);
    return false;
}
function dropNewPiece(state, orig, dest, force) {
    const piece = state.pieces.get(orig);
    if (piece && (canDrop(state, orig, dest) || force)) {
        state.pieces.delete(orig);
        baseNewPiece(state, piece, dest, force);
        callUserFunction(state.movable.events.afterNewPiece, piece.role, dest, {
            premove: false,
            predrop: false,
        });
    }
    else if (piece && canPredrop(state, orig, dest)) {
        setPredrop(state, piece.role, dest);
    }
    else {
        unsetPremove(state);
        unsetPredrop(state);
    }
    state.pieces.delete(orig);
    unselect(state);
}
function selectSquare(state, key, force) {
    callUserFunction(state.events.select, key);
    if (state.selected) {
        if (state.selected === key && !state.draggable.enabled) {
            unselect(state);
            state.hold.cancel();
            return;
        }
        else if ((state.selectable.enabled || force) && state.selected !== key) {
            if (userMove(state, state.selected, key)) {
                state.stats.dragged = false;
                return;
            }
        }
    }
    if ((state.selectable.enabled || state.draggable.enabled) &&
        (isMovable(state, key) || isPremovable(state, key))) {
        setSelected(state, key);
        state.hold.start();
    }
}
function setSelected(state, key) {
    state.selected = key;
    if (isPremovable(state, key)) {
        // calculate chess premoves if custom premoves are not passed
        if (!state.premovable.customDests) {
            state.premovable.dests = premove(state.pieces, key, state.premovable.castle);
        }
    }
    else
        state.premovable.dests = undefined;
}
function unselect(state) {
    state.selected = undefined;
    state.premovable.dests = undefined;
    state.hold.cancel();
}
function isMovable(state, orig) {
    const piece = state.pieces.get(orig);
    return (!!piece &&
        (state.movable.color === 'both' ||
            (state.movable.color === piece.color && state.turnColor === piece.color)));
}
const canMove = (state, orig, dest) => {
    var _a, _b;
    return orig !== dest &&
        isMovable(state, orig) &&
        (state.movable.free || !!((_b = (_a = state.movable.dests) === null || _a === void 0 ? void 0 : _a.get(orig)) === null || _b === void 0 ? void 0 : _b.includes(dest)));
};
function canDrop(state, orig, dest) {
    const piece = state.pieces.get(orig);
    return (!!piece &&
        (orig === dest || !state.pieces.has(dest)) &&
        (state.movable.color === 'both' ||
            (state.movable.color === piece.color && state.turnColor === piece.color)));
}
function isPremovable(state, orig) {
    const piece = state.pieces.get(orig);
    return (!!piece &&
        state.premovable.enabled &&
        state.movable.color === piece.color &&
        state.turnColor !== piece.color);
}
function canPremove(state, orig, dest) {
    var _a, _b;
    const validPremoves = (_b = (_a = state.premovable.customDests) === null || _a === void 0 ? void 0 : _a.get(orig)) !== null && _b !== void 0 ? _b : premove(state.pieces, orig, state.premovable.castle);
    return orig !== dest && isPremovable(state, orig) && validPremoves.includes(dest);
}
function canPredrop(state, orig, dest) {
    const piece = state.pieces.get(orig);
    const destPiece = state.pieces.get(dest);
    return (!!piece &&
        (!destPiece || destPiece.color !== state.movable.color) &&
        state.predroppable.enabled &&
        (piece.role !== 'pawn' || (dest[1] !== '1' && dest[1] !== '8')) &&
        state.movable.color === piece.color &&
        state.turnColor !== piece.color);
}
function isDraggable(state, orig) {
    const piece = state.pieces.get(orig);
    return (!!piece &&
        state.draggable.enabled &&
        (state.movable.color === 'both' ||
            (state.movable.color === piece.color && (state.turnColor === piece.color || state.premovable.enabled))));
}
function playPremove(state) {
    const move = state.premovable.current;
    if (!move)
        return false;
    const orig = move[0], dest = move[1];
    let success = false;
    if (canMove(state, orig, dest)) {
        const result = baseUserMove(state, orig, dest);
        if (result) {
            const metadata = { premove: true };
            if (result !== true)
                metadata.captured = result;
            callUserFunction(state.movable.events.after, orig, dest, metadata);
            success = true;
        }
    }
    unsetPremove(state);
    return success;
}
function playPredrop(state, validate) {
    const drop = state.predroppable.current;
    let success = false;
    if (!drop)
        return false;
    if (validate(drop)) {
        const piece = {
            role: drop.role,
            color: state.movable.color,
        };
        if (baseNewPiece(state, piece, drop.key)) {
            callUserFunction(state.movable.events.afterNewPiece, drop.role, drop.key, {
                premove: false,
                predrop: true,
            });
            success = true;
        }
    }
    unsetPredrop(state);
    return success;
}
function cancelMove(state) {
    unsetPremove(state);
    unsetPredrop(state);
    unselect(state);
}
function stop(state) {
    state.movable.color = state.movable.dests = state.animation.current = undefined;
    cancelMove(state);
}
function getKeyAtDomPos(pos, asWhite, bounds) {
    let file = Math.floor((8 * (pos[0] - bounds.left)) / bounds.width);
    if (!asWhite)
        file = 7 - file;
    let rank = 7 - Math.floor((8 * (pos[1] - bounds.top)) / bounds.height);
    if (!asWhite)
        rank = 7 - rank;
    return file >= 0 && file < 8 && rank >= 0 && rank < 8 ? pos2key([file, rank]) : undefined;
}
function getSnappedKeyAtDomPos(orig, pos, asWhite, bounds) {
    const origPos = key2pos(orig);
    const validSnapPos = allPos.filter(pos2 => queen(origPos[0], origPos[1], pos2[0], pos2[1]) || knight(origPos[0], origPos[1], pos2[0], pos2[1]));
    const validSnapCenters = validSnapPos.map(pos2 => computeSquareCenter(pos2key(pos2), asWhite, bounds));
    const validSnapDistances = validSnapCenters.map(pos2 => distanceSq(pos, pos2));
    const [, closestSnapIndex] = validSnapDistances.reduce((a, b, index) => (a[0] < b ? a : [b, index]), [validSnapDistances[0], 0]);
    return pos2key(validSnapPos[closestSnapIndex]);
}
const whitePov = (s) => s.orientation === 'white';

const initial = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR';
const roles = {
    p: 'pawn',
    r: 'rook',
    n: 'knight',
    b: 'bishop',
    q: 'queen',
    k: 'king',
};
const letters = {
    pawn: 'p',
    rook: 'r',
    knight: 'n',
    bishop: 'b',
    queen: 'q',
    king: 'k',
};
function read(fen) {
    if (fen === 'start')
        fen = initial;
    const pieces = new Map();
    let row = 7, col = 0;
    for (const c of fen) {
        switch (c) {
            case ' ':
            case '[':
                return pieces;
            case '/':
                --row;
                if (row < 0)
                    return pieces;
                col = 0;
                break;
            case '~': {
                const piece = pieces.get(pos2key([col - 1, row]));
                if (piece)
                    piece.promoted = true;
                break;
            }
            default: {
                const nb = c.charCodeAt(0);
                if (nb < 57)
                    col += nb - 48;
                else {
                    const role = c.toLowerCase();
                    pieces.set(pos2key([col, row]), {
                        role: roles[role],
                        color: c === role ? 'black' : 'white',
                    });
                    ++col;
                }
            }
        }
    }
    return pieces;
}
function write(pieces) {
    return invRanks
        .map(y => files
        .map(x => {
        const piece = pieces.get((x + y));
        if (piece) {
            let p = letters[piece.role];
            if (piece.color === 'white')
                p = p.toUpperCase();
            if (piece.promoted)
                p += '~';
            return p;
        }
        else
            return '1';
    })
        .join(''))
        .join('/')
        .replace(/1{2,}/g, s => s.length.toString());
}

function applyAnimation(state, config) {
    if (config.animation) {
        deepMerge(state.animation, config.animation);
        // no need for such short animations
        if ((state.animation.duration || 0) < 70)
            state.animation.enabled = false;
    }
}
function configure(state, config) {
    var _a, _b, _c;
    // don't merge destinations and autoShapes. Just override.
    if ((_a = config.movable) === null || _a === void 0 ? void 0 : _a.dests)
        state.movable.dests = undefined;
    if ((_b = config.drawable) === null || _b === void 0 ? void 0 : _b.autoShapes)
        state.drawable.autoShapes = [];
    deepMerge(state, config);
    // if a fen was provided, replace the pieces
    if (config.fen) {
        state.pieces = read(config.fen);
        state.drawable.shapes = ((_c = config.drawable) === null || _c === void 0 ? void 0 : _c.shapes) || [];
    }
    // apply config values that could be undefined yet meaningful
    if ('check' in config)
        setCheck(state, config.check || false);
    if ('lastMove' in config && !config.lastMove)
        state.lastMove = undefined;
    // in case of ZH drop last move, there's a single square.
    // if the previous last move had two squares,
    // the merge algorithm will incorrectly keep the second square.
    else if (config.lastMove)
        state.lastMove = config.lastMove;
    // fix move/premove dests
    if (state.selected)
        setSelected(state, state.selected);
    applyAnimation(state, config);
    if (!state.movable.rookCastle && state.movable.dests) {
        const rank = state.movable.color === 'white' ? '1' : '8', kingStartPos = ('e' + rank), dests = state.movable.dests.get(kingStartPos), king = state.pieces.get(kingStartPos);
        if (!dests || !king || king.role !== 'king')
            return;
        state.movable.dests.set(kingStartPos, dests.filter(d => !(d === 'a' + rank && dests.includes(('c' + rank))) &&
            !(d === 'h' + rank && dests.includes(('g' + rank)))));
    }
}
function deepMerge(base, extend) {
    for (const key in extend) {
        if (Object.prototype.hasOwnProperty.call(extend, key)) {
            if (Object.prototype.hasOwnProperty.call(base, key) &&
                isPlainObject(base[key]) &&
                isPlainObject(extend[key]))
                deepMerge(base[key], extend[key]);
            else
                base[key] = extend[key];
        }
    }
}
function isPlainObject(o) {
    if (typeof o !== 'object' || o === null)
        return false;
    const proto = Object.getPrototypeOf(o);
    return proto === Object.prototype || proto === null;
}

const anim = (mutation, state) => state.animation.enabled ? animate(mutation, state) : render$2(mutation, state);
function render$2(mutation, state) {
    const result = mutation(state);
    state.dom.redraw();
    return result;
}
const makePiece = (key, piece) => ({
    key: key,
    pos: key2pos(key),
    piece: piece,
});
const closer = (piece, pieces) => pieces.sort((p1, p2) => distanceSq(piece.pos, p1.pos) - distanceSq(piece.pos, p2.pos))[0];
function computePlan(prevPieces, current) {
    const anims = new Map(), animedOrigs = [], fadings = new Map(), missings = [], news = [], prePieces = new Map();
    let curP, preP, vector;
    for (const [k, p] of prevPieces) {
        prePieces.set(k, makePiece(k, p));
    }
    for (const key of allKeys) {
        curP = current.pieces.get(key);
        preP = prePieces.get(key);
        if (curP) {
            if (preP) {
                if (!samePiece(curP, preP.piece)) {
                    missings.push(preP);
                    news.push(makePiece(key, curP));
                }
            }
            else
                news.push(makePiece(key, curP));
        }
        else if (preP)
            missings.push(preP);
    }
    for (const newP of news) {
        preP = closer(newP, missings.filter(p => samePiece(newP.piece, p.piece)));
        if (preP) {
            vector = [preP.pos[0] - newP.pos[0], preP.pos[1] - newP.pos[1]];
            anims.set(newP.key, vector.concat(vector));
            animedOrigs.push(preP.key);
        }
    }
    for (const p of missings) {
        if (!animedOrigs.includes(p.key))
            fadings.set(p.key, p.piece);
    }
    return {
        anims: anims,
        fadings: fadings,
    };
}
function step(state, now) {
    const cur = state.animation.current;
    if (cur === undefined) {
        // animation was canceled :(
        if (!state.dom.destroyed)
            state.dom.redrawNow();
        return;
    }
    const rest = 1 - (now - cur.start) * cur.frequency;
    if (rest <= 0) {
        state.animation.current = undefined;
        state.dom.redrawNow();
    }
    else {
        const ease = easing(rest);
        for (const cfg of cur.plan.anims.values()) {
            cfg[2] = cfg[0] * ease;
            cfg[3] = cfg[1] * ease;
        }
        state.dom.redrawNow(true); // optimisation: don't render SVG changes during animations
        requestAnimationFrame((now = performance.now()) => step(state, now));
    }
}
function animate(mutation, state) {
    // clone state before mutating it
    const prevPieces = new Map(state.pieces);
    const result = mutation(state);
    const plan = computePlan(prevPieces, state);
    if (plan.anims.size || plan.fadings.size) {
        const alreadyRunning = state.animation.current && state.animation.current.start;
        state.animation.current = {
            start: performance.now(),
            frequency: 1 / state.animation.duration,
            plan: plan,
        };
        if (!alreadyRunning)
            step(state, performance.now());
    }
    else {
        // don't animate, just render right away
        state.dom.redraw();
    }
    return result;
}
// https://gist.github.com/gre/1650294
const easing = (t) => (t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1);

const brushes = ['green', 'red', 'blue', 'yellow'];
function start$2(state, e) {
    // support one finger touch only
    if (e.touches && e.touches.length > 1)
        return;
    e.stopPropagation();
    e.preventDefault();
    e.ctrlKey ? unselect(state) : cancelMove(state);
    const pos = eventPosition(e), orig = getKeyAtDomPos(pos, whitePov(state), state.dom.bounds());
    if (!orig)
        return;
    state.drawable.current = {
        orig,
        pos,
        brush: eventBrush(e),
        snapToValidMove: state.drawable.defaultSnapToValidMove,
    };
    processDraw(state);
}
function processDraw(state) {
    requestAnimationFrame(() => {
        const cur = state.drawable.current;
        if (cur) {
            const keyAtDomPos = getKeyAtDomPos(cur.pos, whitePov(state), state.dom.bounds());
            if (!keyAtDomPos) {
                cur.snapToValidMove = false;
            }
            const mouseSq = cur.snapToValidMove
                ? getSnappedKeyAtDomPos(cur.orig, cur.pos, whitePov(state), state.dom.bounds())
                : keyAtDomPos;
            if (mouseSq !== cur.mouseSq) {
                cur.mouseSq = mouseSq;
                cur.dest = mouseSq !== cur.orig ? mouseSq : undefined;
                state.dom.redrawNow();
            }
            processDraw(state);
        }
    });
}
function move$1(state, e) {
    if (state.drawable.current)
        state.drawable.current.pos = eventPosition(e);
}
function end$1(state) {
    const cur = state.drawable.current;
    if (cur) {
        if (cur.mouseSq)
            addShape(state.drawable, cur);
        cancel$1(state);
    }
}
function cancel$1(state) {
    if (state.drawable.current) {
        state.drawable.current = undefined;
        state.dom.redraw();
    }
}
function clear(state) {
    if (state.drawable.shapes.length) {
        state.drawable.shapes = [];
        state.dom.redraw();
        onChange(state.drawable);
    }
}
function eventBrush(e) {
    var _a;
    const modA = (e.shiftKey || e.ctrlKey) && isRightButton(e);
    const modB = e.altKey || e.metaKey || ((_a = e.getModifierState) === null || _a === void 0 ? void 0 : _a.call(e, 'AltGraph'));
    return brushes[(modA ? 1 : 0) + (modB ? 2 : 0)];
}
function addShape(drawable, cur) {
    const sameShape = (s) => s.orig === cur.orig && s.dest === cur.dest;
    const similar = drawable.shapes.find(sameShape);
    if (similar)
        drawable.shapes = drawable.shapes.filter(s => !sameShape(s));
    if (!similar || similar.brush !== cur.brush)
        drawable.shapes.push({
            orig: cur.orig,
            dest: cur.dest,
            brush: cur.brush,
        });
    onChange(drawable);
}
function onChange(drawable) {
    if (drawable.onChange)
        drawable.onChange(drawable.shapes);
}

function start$1(s, e) {
    if (!(s.trustAllEvents || e.isTrusted))
        return; // only trust when trustAllEvents is enabled
    if (e.buttons !== undefined && e.buttons > 1)
        return; // only touch or left click
    if (e.touches && e.touches.length > 1)
        return; // support one finger touch only
    const bounds = s.dom.bounds(), position = eventPosition(e), orig = getKeyAtDomPos(position, whitePov(s), bounds);
    if (!orig)
        return;
    const piece = s.pieces.get(orig);
    const previouslySelected = s.selected;
    if (!previouslySelected &&
        s.drawable.enabled &&
        (s.drawable.eraseOnClick || !piece || piece.color !== s.turnColor))
        clear(s);
    // Prevent touch scroll and create no corresponding mouse event, if there
    // is an intent to interact with the board.
    if (e.cancelable !== false &&
        (!e.touches || s.blockTouchScroll || piece || previouslySelected || pieceCloseTo(s, position)))
        e.preventDefault();
    else if (e.touches)
        return; // Handle only corresponding mouse event https://github.com/lichess-org/chessground/pull/268
    const hadPremove = !!s.premovable.current;
    const hadPredrop = !!s.predroppable.current;
    s.stats.ctrlKey = e.ctrlKey;
    if (s.selected && canMove(s, s.selected, orig)) {
        anim(state => selectSquare(state, orig), s);
    }
    else {
        selectSquare(s, orig);
    }
    const stillSelected = s.selected === orig;
    const element = pieceElementByKey(s, orig);
    if (piece && element && stillSelected && isDraggable(s, orig)) {
        s.draggable.current = {
            orig,
            piece,
            origPos: position,
            pos: position,
            started: s.draggable.autoDistance && s.stats.dragged,
            element,
            previouslySelected,
            originTarget: e.target,
            keyHasChanged: false,
        };
        element.cgDragging = true;
        element.classList.add('dragging');
        // place ghost
        const ghost = s.dom.elements.ghost;
        if (ghost) {
            ghost.className = `ghost ${piece.color} ${piece.role}`;
            translate(ghost, posToTranslate(bounds)(key2pos(orig), whitePov(s)));
            setVisible(ghost, true);
        }
        processDrag(s);
    }
    else {
        if (hadPremove)
            unsetPremove(s);
        if (hadPredrop)
            unsetPredrop(s);
    }
    s.dom.redraw();
}
function pieceCloseTo(s, pos) {
    const asWhite = whitePov(s), bounds = s.dom.bounds(), radiusSq = Math.pow(bounds.width / 8, 2);
    for (const key of s.pieces.keys()) {
        const center = computeSquareCenter(key, asWhite, bounds);
        if (distanceSq(center, pos) <= radiusSq)
            return true;
    }
    return false;
}
function dragNewPiece(s, piece, e, force) {
    const key = 'a0';
    s.pieces.set(key, piece);
    s.dom.redraw();
    const position = eventPosition(e);
    s.draggable.current = {
        orig: key,
        piece,
        origPos: position,
        pos: position,
        started: true,
        element: () => pieceElementByKey(s, key),
        originTarget: e.target,
        newPiece: true,
        force: !!force,
        keyHasChanged: false,
    };
    processDrag(s);
}
function processDrag(s) {
    requestAnimationFrame(() => {
        var _a;
        const cur = s.draggable.current;
        if (!cur)
            return;
        // cancel animations while dragging
        if ((_a = s.animation.current) === null || _a === void 0 ? void 0 : _a.plan.anims.has(cur.orig))
            s.animation.current = undefined;
        // if moving piece is gone, cancel
        const origPiece = s.pieces.get(cur.orig);
        if (!origPiece || !samePiece(origPiece, cur.piece))
            cancel(s);
        else {
            if (!cur.started && distanceSq(cur.pos, cur.origPos) >= Math.pow(s.draggable.distance, 2))
                cur.started = true;
            if (cur.started) {
                // support lazy elements
                if (typeof cur.element === 'function') {
                    const found = cur.element();
                    if (!found)
                        return;
                    found.cgDragging = true;
                    found.classList.add('dragging');
                    cur.element = found;
                }
                const bounds = s.dom.bounds();
                translate(cur.element, [
                    cur.pos[0] - bounds.left - bounds.width / 16,
                    cur.pos[1] - bounds.top - bounds.height / 16,
                ]);
                cur.keyHasChanged || (cur.keyHasChanged = cur.orig !== getKeyAtDomPos(cur.pos, whitePov(s), bounds));
            }
        }
        processDrag(s);
    });
}
function move(s, e) {
    // support one finger touch only
    if (s.draggable.current && (!e.touches || e.touches.length < 2)) {
        s.draggable.current.pos = eventPosition(e);
    }
}
function end(s, e) {
    const cur = s.draggable.current;
    if (!cur)
        return;
    // create no corresponding mouse event
    if (e.type === 'touchend' && e.cancelable !== false)
        e.preventDefault();
    // comparing with the origin target is an easy way to test that the end event
    // has the same touch origin
    if (e.type === 'touchend' && cur.originTarget !== e.target && !cur.newPiece) {
        s.draggable.current = undefined;
        return;
    }
    unsetPremove(s);
    unsetPredrop(s);
    // touchend has no position; so use the last touchmove position instead
    const eventPos = eventPosition(e) || cur.pos;
    const dest = getKeyAtDomPos(eventPos, whitePov(s), s.dom.bounds());
    if (dest && cur.started && cur.orig !== dest) {
        if (cur.newPiece)
            dropNewPiece(s, cur.orig, dest, cur.force);
        else {
            s.stats.ctrlKey = e.ctrlKey;
            if (userMove(s, cur.orig, dest))
                s.stats.dragged = true;
        }
    }
    else if (cur.newPiece) {
        s.pieces.delete(cur.orig);
    }
    else if (s.draggable.deleteOnDropOff && !dest) {
        s.pieces.delete(cur.orig);
        callUserFunction(s.events.change);
    }
    if ((cur.orig === cur.previouslySelected || cur.keyHasChanged) && (cur.orig === dest || !dest))
        unselect(s);
    else if (!s.selectable.enabled)
        unselect(s);
    removeDragElements(s);
    s.draggable.current = undefined;
    s.dom.redraw();
}
function cancel(s) {
    const cur = s.draggable.current;
    if (cur) {
        if (cur.newPiece)
            s.pieces.delete(cur.orig);
        s.draggable.current = undefined;
        unselect(s);
        removeDragElements(s);
        s.dom.redraw();
    }
}
function removeDragElements(s) {
    const e = s.dom.elements;
    if (e.ghost)
        setVisible(e.ghost, false);
}
function pieceElementByKey(s, key) {
    let el = s.dom.elements.board.firstChild;
    while (el) {
        if (el.cgKey === key && el.tagName === 'PIECE')
            return el;
        el = el.nextSibling;
    }
    return;
}

function explosion(state, keys) {
    state.exploding = { stage: 1, keys };
    state.dom.redraw();
    setTimeout(() => {
        setStage(state, 2);
        setTimeout(() => setStage(state, undefined), 120);
    }, 120);
}
function setStage(state, stage) {
    if (state.exploding) {
        if (stage)
            state.exploding.stage = stage;
        else
            state.exploding = undefined;
        state.dom.redraw();
    }
}

// see API types and documentations in dts/api.d.ts
function start(state, redrawAll) {
    function toggleOrientation$1() {
        toggleOrientation(state);
        redrawAll();
    }
    return {
        set(config) {
            if (config.orientation && config.orientation !== state.orientation)
                toggleOrientation$1();
            applyAnimation(state, config);
            (config.fen ? anim : render$2)(state => configure(state, config), state);
        },
        state,
        getFen: () => write(state.pieces),
        toggleOrientation: toggleOrientation$1,
        setPieces(pieces) {
            anim(state => setPieces(state, pieces), state);
        },
        selectSquare(key, force) {
            if (key)
                anim(state => selectSquare(state, key, force), state);
            else if (state.selected) {
                unselect(state);
                state.dom.redraw();
            }
        },
        move(orig, dest) {
            anim(state => baseMove(state, orig, dest), state);
        },
        newPiece(piece, key) {
            anim(state => baseNewPiece(state, piece, key), state);
        },
        playPremove() {
            if (state.premovable.current) {
                if (anim(playPremove, state))
                    return true;
                // if the premove couldn't be played, redraw to clear it up
                state.dom.redraw();
            }
            return false;
        },
        playPredrop(validate) {
            if (state.predroppable.current) {
                const result = playPredrop(state, validate);
                state.dom.redraw();
                return result;
            }
            return false;
        },
        cancelPremove() {
            render$2(unsetPremove, state);
        },
        cancelPredrop() {
            render$2(unsetPredrop, state);
        },
        cancelMove() {
            render$2(state => {
                cancelMove(state);
                cancel(state);
            }, state);
        },
        stop() {
            render$2(state => {
                stop(state);
                cancel(state);
            }, state);
        },
        explode(keys) {
            explosion(state, keys);
        },
        setAutoShapes(shapes) {
            render$2(state => (state.drawable.autoShapes = shapes), state);
        },
        setShapes(shapes) {
            render$2(state => (state.drawable.shapes = shapes), state);
        },
        getKeyAtDomPos(pos) {
            return getKeyAtDomPos(pos, whitePov(state), state.dom.bounds());
        },
        redrawAll,
        dragNewPiece(piece, event, force) {
            dragNewPiece(state, piece, event, force);
        },
        destroy() {
            stop(state);
            state.dom.unbind && state.dom.unbind();
            state.dom.destroyed = true;
        },
    };
}

function defaults() {
    return {
        pieces: read(initial),
        orientation: 'white',
        turnColor: 'white',
        coordinates: true,
        coordinatesOnSquares: false,
        ranksPosition: 'right',
        autoCastle: true,
        viewOnly: false,
        disableContextMenu: false,
        addPieceZIndex: false,
        blockTouchScroll: false,
        pieceKey: false,
        trustAllEvents: false,
        highlight: {
            lastMove: true,
            check: true,
        },
        animation: {
            enabled: true,
            duration: 200,
        },
        movable: {
            free: true,
            color: 'both',
            showDests: true,
            events: {},
            rookCastle: true,
        },
        premovable: {
            enabled: true,
            showDests: true,
            castle: true,
            events: {},
        },
        predroppable: {
            enabled: false,
            events: {},
        },
        draggable: {
            enabled: true,
            distance: 3,
            autoDistance: true,
            showGhost: true,
            deleteOnDropOff: false,
        },
        dropmode: {
            active: false,
        },
        selectable: {
            enabled: true,
        },
        stats: {
            // on touchscreen, default to "tap-tap" moves
            // instead of drag
            dragged: !('ontouchstart' in window),
        },
        events: {},
        drawable: {
            enabled: true,
            visible: true,
            defaultSnapToValidMove: true,
            eraseOnClick: true,
            shapes: [],
            autoShapes: [],
            brushes: {
                green: { key: 'g', color: '#15781B', opacity: 1, lineWidth: 10 },
                red: { key: 'r', color: '#882020', opacity: 1, lineWidth: 10 },
                blue: { key: 'b', color: '#003088', opacity: 1, lineWidth: 10 },
                yellow: { key: 'y', color: '#e68f00', opacity: 1, lineWidth: 10 },
                paleBlue: { key: 'pb', color: '#003088', opacity: 0.4, lineWidth: 15 },
                paleGreen: { key: 'pg', color: '#15781B', opacity: 0.4, lineWidth: 15 },
                paleRed: { key: 'pr', color: '#882020', opacity: 0.4, lineWidth: 15 },
                paleGrey: {
                    key: 'pgr',
                    color: '#4a4a4a',
                    opacity: 0.35,
                    lineWidth: 15,
                },
                purple: { key: 'purple', color: '#68217a', opacity: 0.65, lineWidth: 10 },
                pink: { key: 'pink', color: '#ee2080', opacity: 0.5, lineWidth: 10 },
                white: { key: 'white', color: 'white', opacity: 1, lineWidth: 10 },
            },
            prevSvgHash: '',
        },
        hold: timer(),
    };
}

const hilites = {
    hilitePrimary: { key: 'hilitePrimary', color: '#3291ff', opacity: 1, lineWidth: 1 },
    hiliteWhite: { key: 'hiliteWhite', color: '#ffffff', opacity: 1, lineWidth: 1 },
};
function createDefs() {
    const defs = createElement('defs');
    const filter = setAttributes(createElement('filter'), { id: 'cg-filter-blur' });
    filter.appendChild(setAttributes(createElement('feGaussianBlur'), { stdDeviation: '0.019' }));
    defs.appendChild(filter);
    return defs;
}
function renderSvg(state, shapesEl, customsEl) {
    var _a;
    const d = state.drawable, curD = d.current, cur = curD && curD.mouseSq ? curD : undefined, dests = new Map(), bounds = state.dom.bounds(), nonPieceAutoShapes = d.autoShapes.filter(autoShape => !autoShape.piece);
    for (const s of d.shapes.concat(nonPieceAutoShapes).concat(cur ? [cur] : [])) {
        if (!s.dest)
            continue;
        const sources = (_a = dests.get(s.dest)) !== null && _a !== void 0 ? _a : new Set(), from = pos2user(orient(key2pos(s.orig), state.orientation), bounds), to = pos2user(orient(key2pos(s.dest), state.orientation), bounds);
        sources.add(moveAngle(from, to));
        dests.set(s.dest, sources);
    }
    const shapes = d.shapes.concat(nonPieceAutoShapes).map((s) => {
        return {
            shape: s,
            current: false,
            hash: shapeHash(s, isShort(s.dest, dests), false, bounds),
        };
    });
    if (cur)
        shapes.push({
            shape: cur,
            current: true,
            hash: shapeHash(cur, isShort(cur.dest, dests), true, bounds),
        });
    const fullHash = shapes.map(sc => sc.hash).join(';');
    if (fullHash === state.drawable.prevSvgHash)
        return;
    state.drawable.prevSvgHash = fullHash;
    /*
      -- DOM hierarchy --
      <svg class="cg-shapes">      (<= svg)
        <defs>
          ...(for brushes)...
        </defs>
        <g>
          ...(for arrows and circles)...
        </g>
      </svg>
      <svg class="cg-custom-svgs"> (<= customSvg)
        <g>
          ...(for custom svgs)...
        </g>
      </svg>
    */
    const defsEl = shapesEl.querySelector('defs');
    syncDefs(d, shapes, defsEl);
    syncShapes$1(shapes, shapesEl.querySelector('g'), customsEl.querySelector('g'), s => renderShape$1(state, s, d.brushes, dests, bounds));
}
// append only. Don't try to update/remove.
function syncDefs(d, shapes, defsEl) {
    var _a;
    const brushes = new Map();
    let brush;
    for (const s of shapes.filter(s => s.shape.dest && s.shape.brush)) {
        brush = makeCustomBrush(d.brushes[s.shape.brush], s.shape.modifiers);
        if ((_a = s.shape.modifiers) === null || _a === void 0 ? void 0 : _a.hilite)
            brushes.set(hilite(brush).key, hilite(brush));
        brushes.set(brush.key, brush);
    }
    const keysInDom = new Set();
    let el = defsEl.firstElementChild;
    while (el) {
        keysInDom.add(el.getAttribute('cgKey'));
        el = el.nextElementSibling;
    }
    for (const [key, brush] of brushes.entries()) {
        if (!keysInDom.has(key))
            defsEl.appendChild(renderMarker(brush));
    }
}
function syncShapes$1(syncables, shapes, customs, renderShape) {
    const hashesInDom = new Map();
    for (const sc of syncables)
        hashesInDom.set(sc.hash, false);
    for (const root of [shapes, customs]) {
        const toRemove = [];
        let el = root.firstElementChild, elHash;
        while (el) {
            elHash = el.getAttribute('cgHash');
            if (hashesInDom.has(elHash))
                hashesInDom.set(elHash, true);
            else
                toRemove.push(el);
            el = el.nextElementSibling;
        }
        for (const el of toRemove)
            root.removeChild(el);
    }
    // insert shapes that are not yet in dom
    for (const sc of syncables.filter(s => !hashesInDom.get(s.hash))) {
        for (const svg of renderShape(sc)) {
            if (svg.isCustom)
                customs.appendChild(svg.el);
            else
                shapes.appendChild(svg.el);
        }
    }
}
function shapeHash({ orig, dest, brush, piece, modifiers, customSvg, label }, shorten, current, bounds) {
    var _a, _b;
    // a shape and an overlay svg share a lifetime and have the same cgHash attribute
    return [
        bounds.width,
        bounds.height,
        current,
        orig,
        dest,
        brush,
        shorten && '-',
        piece && pieceHash(piece),
        modifiers && modifiersHash(modifiers),
        customSvg && `custom-${textHash(customSvg.html)},${(_b = (_a = customSvg.center) === null || _a === void 0 ? void 0 : _a[0]) !== null && _b !== void 0 ? _b : 'o'}`,
        label && `label-${textHash(label.text)}`,
    ]
        .filter(x => x)
        .join(',');
}
function pieceHash(piece) {
    return [piece.color, piece.role, piece.scale].filter(x => x).join(',');
}
function modifiersHash(m) {
    return [m.lineWidth, m.hilite && '*'].filter(x => x).join(',');
}
function textHash(s) {
    // Rolling hash with base 31 (cf. https://stackoverflow.com/questions/7616461/generate-a-hash-from-string-in-javascript)
    let h = 0;
    for (let i = 0; i < s.length; i++) {
        h = ((h << 5) - h + s.charCodeAt(i)) >>> 0;
    }
    return h.toString();
}
function renderShape$1(state, { shape, current, hash }, brushes, dests, bounds) {
    var _a, _b;
    const from = pos2user(orient(key2pos(shape.orig), state.orientation), bounds), to = shape.dest ? pos2user(orient(key2pos(shape.dest), state.orientation), bounds) : from, brush = shape.brush && makeCustomBrush(brushes[shape.brush], shape.modifiers), slots = dests.get(shape.dest), svgs = [];
    if (brush) {
        const el = setAttributes(createElement('g'), { cgHash: hash });
        svgs.push({ el });
        if (from[0] !== to[0] || from[1] !== to[1])
            el.appendChild(renderArrow(shape, brush, from, to, current, isShort(shape.dest, dests)));
        else
            el.appendChild(renderCircle(brushes[shape.brush], from, current, bounds));
    }
    if (shape.label) {
        const label = shape.label;
        (_a = label.fill) !== null && _a !== void 0 ? _a : (label.fill = shape.brush && brushes[shape.brush].color);
        const corner = shape.brush ? undefined : 'tr';
        svgs.push({ el: renderLabel(label, hash, from, to, slots, corner), isCustom: true });
    }
    if (shape.customSvg) {
        const on = (_b = shape.customSvg.center) !== null && _b !== void 0 ? _b : 'orig';
        const [x, y] = on === 'label' ? labelCoords(from, to, slots).map(c => c - 0.5) : on === 'dest' ? to : from;
        const el = setAttributes(createElement('g'), { transform: `translate(${x},${y})`, cgHash: hash });
        el.innerHTML = `<svg width="1" height="1" viewBox="0 0 100 100">${shape.customSvg.html}</svg>`;
        svgs.push({ el, isCustom: true });
    }
    return svgs;
}
function renderCircle(brush, at, current, bounds) {
    const widths = circleWidth(), radius = (bounds.width + bounds.height) / (4 * Math.max(bounds.width, bounds.height));
    return setAttributes(createElement('circle'), {
        stroke: brush.color,
        'stroke-width': widths[current ? 0 : 1],
        fill: 'none',
        opacity: opacity(brush, current),
        cx: at[0],
        cy: at[1],
        r: radius - widths[1] / 2,
    });
}
function hilite(brush) {
    return ['#ffffff', '#fff', 'white'].includes(brush.color)
        ? hilites['hilitePrimary']
        : hilites['hiliteWhite'];
}
function renderArrow(s, brush, from, to, current, shorten) {
    var _a;
    function renderLine(isHilite) {
        var _a;
        const m = arrowMargin(shorten && !current), dx = to[0] - from[0], dy = to[1] - from[1], angle = Math.atan2(dy, dx), xo = Math.cos(angle) * m, yo = Math.sin(angle) * m;
        return setAttributes(createElement('line'), {
            stroke: isHilite ? hilite(brush).color : brush.color,
            'stroke-width': lineWidth(brush, current) + (isHilite ? 0.04 : 0),
            'stroke-linecap': 'round',
            'marker-end': `url(#arrowhead-${isHilite ? hilite(brush).key : brush.key})`,
            opacity: ((_a = s.modifiers) === null || _a === void 0 ? void 0 : _a.hilite) ? 1 : opacity(brush, current),
            x1: from[0],
            y1: from[1],
            x2: to[0] - xo,
            y2: to[1] - yo,
        });
    }
    if (!((_a = s.modifiers) === null || _a === void 0 ? void 0 : _a.hilite))
        return renderLine(false);
    const g = createElement('g');
    const blurred = setAttributes(createElement('g'), { filter: 'url(#cg-filter-blur)' });
    blurred.appendChild(filterBox(from, to));
    blurred.appendChild(renderLine(true));
    g.appendChild(blurred);
    g.appendChild(renderLine(false));
    return g;
}
function renderMarker(brush) {
    const marker = setAttributes(createElement('marker'), {
        id: 'arrowhead-' + brush.key,
        orient: 'auto',
        overflow: 'visible',
        markerWidth: 4,
        markerHeight: 4,
        refX: brush.key.startsWith('hilite') ? 1.86 : 2.05,
        refY: 2,
    });
    marker.appendChild(setAttributes(createElement('path'), {
        d: 'M0,0 V4 L3,2 Z',
        fill: brush.color,
    }));
    marker.setAttribute('cgKey', brush.key);
    return marker;
}
function renderLabel(label, hash, from, to, slots, corner) {
    var _a;
    const labelSize = 0.4, fontSize = labelSize * 0.75 ** label.text.length, at = labelCoords(from, to, slots), cornerOff = corner === 'tr' ? 0.4 : 0, g = setAttributes(createElement('g'), {
        transform: `translate(${at[0] + cornerOff},${at[1] - cornerOff})`,
        cgHash: hash,
    });
    g.appendChild(setAttributes(createElement('circle'), {
        r: labelSize / 2,
        'fill-opacity': corner ? 1.0 : 0.8,
        'stroke-opacity': corner ? 1.0 : 0.7,
        'stroke-width': 0.03,
        fill: (_a = label.fill) !== null && _a !== void 0 ? _a : '#666',
        stroke: 'white',
    }));
    const labelEl = setAttributes(createElement('text'), {
        'font-size': fontSize,
        'font-family': 'Noto Sans',
        'text-anchor': 'middle',
        fill: 'white',
        y: 0.13 * 0.75 ** label.text.length,
    });
    labelEl.innerHTML = label.text;
    g.appendChild(labelEl);
    return g;
}
function orient(pos, color) {
    return color === 'white' ? pos : [7 - pos[0], 7 - pos[1]];
}
function isShort(dest, dests) {
    return true === (dest && dests.has(dest) && dests.get(dest).size > 1);
}
function createElement(tagName) {
    return document.createElementNS('http://www.w3.org/2000/svg', tagName);
}
function setAttributes(el, attrs) {
    for (const key in attrs) {
        if (Object.prototype.hasOwnProperty.call(attrs, key))
            el.setAttribute(key, attrs[key]);
    }
    return el;
}
function makeCustomBrush(base, modifiers) {
    return !modifiers
        ? base
        : {
            color: base.color,
            opacity: Math.round(base.opacity * 10) / 10,
            lineWidth: Math.round(modifiers.lineWidth || base.lineWidth),
            key: [base.key, modifiers.lineWidth].filter(x => x).join(''),
        };
}
function circleWidth() {
    return [3 / 64, 4 / 64];
}
function lineWidth(brush, current) {
    return ((brush.lineWidth || 10) * (current ? 0.85 : 1)) / 64;
}
function opacity(brush, current) {
    return (brush.opacity || 1) * (current ? 0.9 : 1);
}
function arrowMargin(shorten) {
    return (shorten ? 20 : 10) / 64;
}
function pos2user(pos, bounds) {
    const xScale = Math.min(1, bounds.width / bounds.height);
    const yScale = Math.min(1, bounds.height / bounds.width);
    return [(pos[0] - 3.5) * xScale, (3.5 - pos[1]) * yScale];
}
function filterBox(from, to) {
    // lines/arrows are considered to be one dimensional for the purposes of SVG filters,
    // so we add a transparent bounding box to ensure they apply to the 2nd dimension
    const box = {
        from: [Math.floor(Math.min(from[0], to[0])), Math.floor(Math.min(from[1], to[1]))],
        to: [Math.ceil(Math.max(from[0], to[0])), Math.ceil(Math.max(from[1], to[1]))],
    };
    return setAttributes(createElement('rect'), {
        x: box.from[0],
        y: box.from[1],
        width: box.to[0] - box.from[0],
        height: box.to[1] - box.from[1],
        fill: 'none',
        stroke: 'none',
    });
}
function moveAngle(from, to, asSlot = true) {
    const angle = Math.atan2(to[1] - from[1], to[0] - from[0]) + Math.PI;
    return asSlot ? (Math.round((angle * 8) / Math.PI) + 16) % 16 : angle;
}
function dist(from, to) {
    return Math.sqrt([from[0] - to[0], from[1] - to[1]].reduce((acc, x) => acc + x * x, 0));
}
/*
 try to place label at the junction of the destination shaft and arrowhead. if there's more than
 1 arrow pointing to a square, the arrow shortens by 10 / 64 units so the label must move as well.
 
 if the angle between two incoming arrows is pi / 8, such as when an adjacent knight and bishop
 attack the same square, the knight's label is slid further down the shaft by an amount equal to
 our label size to avoid collision
*/
function labelCoords(from, to, slots) {
    let mag = dist(from, to);
    //if (mag === 0) return [from[0], from[1]];
    const angle = moveAngle(from, to, false);
    if (slots) {
        mag -= 33 / 64; // reduce by arrowhead length
        if (slots.size > 1) {
            mag -= 10 / 64; // reduce by shortening factor
            const slot = moveAngle(from, to);
            if (slots.has((slot + 1) % 16) || slots.has((slot + 15) % 16)) {
                if (slot & 1)
                    mag -= 0.4;
                // and by label size for the knight if another arrow is within pi / 8.
            }
        }
    }
    return [from[0] - Math.cos(angle) * mag, from[1] - Math.sin(angle) * mag].map(c => c + 0.5);
}

function renderWrap(element, s) {
    // .cg-wrap (element passed to Chessground)
    //   cg-container
    //     cg-board
    //     svg.cg-shapes
    //       defs
    //       g
    //     svg.cg-custom-svgs
    //       g
    //     cg-auto-pieces
    //     coords.ranks
    //     coords.files
    //     piece.ghost
    element.innerHTML = '';
    // ensure the cg-wrap class is set
    // so bounds calculation can use the CSS width/height values
    // add that class yourself to the element before calling chessground
    // for a slight performance improvement! (avoids recomputing style)
    element.classList.add('cg-wrap');
    for (const c of colors)
        element.classList.toggle('orientation-' + c, s.orientation === c);
    element.classList.toggle('manipulable', !s.viewOnly);
    const container = createEl('cg-container');
    element.appendChild(container);
    const board = createEl('cg-board');
    container.appendChild(board);
    let svg;
    let customSvg;
    let autoPieces;
    if (s.drawable.visible) {
        svg = setAttributes(createElement('svg'), {
            class: 'cg-shapes',
            viewBox: '-4 -4 8 8',
            preserveAspectRatio: 'xMidYMid slice',
        });
        svg.appendChild(createDefs());
        svg.appendChild(createElement('g'));
        customSvg = setAttributes(createElement('svg'), {
            class: 'cg-custom-svgs',
            viewBox: '-3.5 -3.5 8 8',
            preserveAspectRatio: 'xMidYMid slice',
        });
        customSvg.appendChild(createElement('g'));
        autoPieces = createEl('cg-auto-pieces');
        container.appendChild(svg);
        container.appendChild(customSvg);
        container.appendChild(autoPieces);
    }
    if (s.coordinates) {
        const orientClass = s.orientation === 'black' ? ' black' : '';
        const ranksPositionClass = s.ranksPosition === 'left' ? ' left' : '';
        if (s.coordinatesOnSquares) {
            const rankN = s.orientation === 'white' ? i => i + 1 : i => 8 - i;
            files.forEach((f, i) => container.appendChild(renderCoords(ranks.map(r => f + r), 'squares rank' + rankN(i) + orientClass + ranksPositionClass)));
        }
        else {
            container.appendChild(renderCoords(ranks, 'ranks' + orientClass + ranksPositionClass));
            container.appendChild(renderCoords(files, 'files' + orientClass));
        }
    }
    let ghost;
    if (s.draggable.enabled && s.draggable.showGhost) {
        ghost = createEl('piece', 'ghost');
        setVisible(ghost, false);
        container.appendChild(ghost);
    }
    return {
        board,
        container,
        wrap: element,
        ghost,
        svg,
        customSvg,
        autoPieces,
    };
}
function renderCoords(elems, className) {
    const el = createEl('coords', className);
    let f;
    for (const elem of elems) {
        f = createEl('coord');
        f.textContent = elem;
        el.appendChild(f);
    }
    return el;
}

function drop(s, e) {
    if (!s.dropmode.active)
        return;
    unsetPremove(s);
    unsetPredrop(s);
    const piece = s.dropmode.piece;
    if (piece) {
        s.pieces.set('a0', piece);
        const position = eventPosition(e);
        const dest = position && getKeyAtDomPos(position, whitePov(s), s.dom.bounds());
        if (dest)
            dropNewPiece(s, 'a0', dest);
    }
    s.dom.redraw();
}

function bindBoard(s, onResize) {
    const boardEl = s.dom.elements.board;
    if ('ResizeObserver' in window)
        new ResizeObserver(onResize).observe(s.dom.elements.wrap);
    if (s.disableContextMenu || s.drawable.enabled) {
        boardEl.addEventListener('contextmenu', e => e.preventDefault());
    }
    if (s.viewOnly)
        return;
    // Cannot be passive, because we prevent touch scrolling and dragging of
    // selected elements.
    const onStart = startDragOrDraw(s);
    boardEl.addEventListener('touchstart', onStart, {
        passive: false,
    });
    boardEl.addEventListener('mousedown', onStart, {
        passive: false,
    });
}
// returns the unbind function
function bindDocument(s, onResize) {
    const unbinds = [];
    // Old versions of Edge and Safari do not support ResizeObserver. Send
    // chessground.resize if a user action has changed the bounds of the board.
    if (!('ResizeObserver' in window))
        unbinds.push(unbindable(document.body, 'chessground.resize', onResize));
    if (!s.viewOnly) {
        const onmove = dragOrDraw(s, move, move$1);
        const onend = dragOrDraw(s, end, end$1);
        for (const ev of ['touchmove', 'mousemove'])
            unbinds.push(unbindable(document, ev, onmove));
        for (const ev of ['touchend', 'mouseup'])
            unbinds.push(unbindable(document, ev, onend));
        const onScroll = () => s.dom.bounds.clear();
        unbinds.push(unbindable(document, 'scroll', onScroll, { capture: true, passive: true }));
        unbinds.push(unbindable(window, 'resize', onScroll, { passive: true }));
    }
    return () => unbinds.forEach(f => f());
}
function unbindable(el, eventName, callback, options) {
    el.addEventListener(eventName, callback, options);
    return () => el.removeEventListener(eventName, callback, options);
}
const startDragOrDraw = (s) => e => {
    if (s.draggable.current)
        cancel(s);
    else if (s.drawable.current)
        cancel$1(s);
    else if (e.shiftKey || isRightButton(e)) {
        if (s.drawable.enabled)
            start$2(s, e);
    }
    else if (!s.viewOnly) {
        if (s.dropmode.active)
            drop(s, e);
        else
            start$1(s, e);
    }
};
const dragOrDraw = (s, withDrag, withDraw) => e => {
    if (s.drawable.current) {
        if (s.drawable.enabled)
            withDraw(s, e);
    }
    else if (!s.viewOnly)
        withDrag(s, e);
};

// ported from https://github.com/lichess-org/lichobile/blob/master/src/chessground/render.ts
// in case of bugs, blame @veloce
function render$1(s) {
    const asWhite = whitePov(s), posToTranslate$1 = posToTranslate(s.dom.bounds()), boardEl = s.dom.elements.board, pieces = s.pieces, curAnim = s.animation.current, anims = curAnim ? curAnim.plan.anims : new Map(), fadings = curAnim ? curAnim.plan.fadings : new Map(), curDrag = s.draggable.current, squares = computeSquareClasses(s), samePieces = new Set(), sameSquares = new Set(), movedPieces = new Map(), movedSquares = new Map(); // by class name
    let k, el, pieceAtKey, elPieceName, anim, fading, pMvdset, pMvd, sMvdset, sMvd;
    // walk over all board dom elements, apply animations and flag moved pieces
    el = boardEl.firstChild;
    while (el) {
        k = el.cgKey;
        if (isPieceNode(el)) {
            pieceAtKey = pieces.get(k);
            anim = anims.get(k);
            fading = fadings.get(k);
            elPieceName = el.cgPiece;
            // if piece not being dragged anymore, remove dragging style
            if (el.cgDragging && (!curDrag || curDrag.orig !== k)) {
                el.classList.remove('dragging');
                translate(el, posToTranslate$1(key2pos(k), asWhite));
                el.cgDragging = false;
            }
            // remove fading class if it still remains
            if (!fading && el.cgFading) {
                el.cgFading = false;
                el.classList.remove('fading');
            }
            // there is now a piece at this dom key
            if (pieceAtKey) {
                // continue animation if already animating and same piece
                // (otherwise it could animate a captured piece)
                if (anim && el.cgAnimating && elPieceName === pieceNameOf(pieceAtKey)) {
                    const pos = key2pos(k);
                    pos[0] += anim[2];
                    pos[1] += anim[3];
                    el.classList.add('anim');
                    translate(el, posToTranslate$1(pos, asWhite));
                }
                else if (el.cgAnimating) {
                    el.cgAnimating = false;
                    el.classList.remove('anim');
                    translate(el, posToTranslate$1(key2pos(k), asWhite));
                    if (s.addPieceZIndex)
                        el.style.zIndex = posZIndex(key2pos(k), asWhite);
                }
                // same piece: flag as same
                if (elPieceName === pieceNameOf(pieceAtKey) && (!fading || !el.cgFading)) {
                    samePieces.add(k);
                }
                // different piece: flag as moved unless it is a fading piece
                else {
                    if (fading && elPieceName === pieceNameOf(fading)) {
                        el.classList.add('fading');
                        el.cgFading = true;
                    }
                    else {
                        appendValue(movedPieces, elPieceName, el);
                    }
                }
            }
            // no piece: flag as moved
            else {
                appendValue(movedPieces, elPieceName, el);
            }
        }
        else if (isSquareNode(el)) {
            const cn = el.className;
            if (squares.get(k) === cn)
                sameSquares.add(k);
            else
                appendValue(movedSquares, cn, el);
        }
        el = el.nextSibling;
    }
    // walk over all squares in current set, apply dom changes to moved squares
    // or append new squares
    for (const [sk, className] of squares) {
        if (!sameSquares.has(sk)) {
            sMvdset = movedSquares.get(className);
            sMvd = sMvdset && sMvdset.pop();
            const translation = posToTranslate$1(key2pos(sk), asWhite);
            if (sMvd) {
                sMvd.cgKey = sk;
                translate(sMvd, translation);
            }
            else {
                const squareNode = createEl('square', className);
                squareNode.cgKey = sk;
                translate(squareNode, translation);
                boardEl.insertBefore(squareNode, boardEl.firstChild);
            }
        }
    }
    // walk over all pieces in current set, apply dom changes to moved pieces
    // or append new pieces
    for (const [k, p] of pieces) {
        anim = anims.get(k);
        if (!samePieces.has(k)) {
            pMvdset = movedPieces.get(pieceNameOf(p));
            pMvd = pMvdset && pMvdset.pop();
            // a same piece was moved
            if (pMvd) {
                // apply dom changes
                pMvd.cgKey = k;
                if (pMvd.cgFading) {
                    pMvd.classList.remove('fading');
                    pMvd.cgFading = false;
                }
                const pos = key2pos(k);
                if (s.addPieceZIndex)
                    pMvd.style.zIndex = posZIndex(pos, asWhite);
                if (anim) {
                    pMvd.cgAnimating = true;
                    pMvd.classList.add('anim');
                    pos[0] += anim[2];
                    pos[1] += anim[3];
                }
                translate(pMvd, posToTranslate$1(pos, asWhite));
            }
            // no piece in moved obj: insert the new piece
            // assumes the new piece is not being dragged
            else {
                const pieceName = pieceNameOf(p), pieceNode = createEl('piece', pieceName), pos = key2pos(k);
                pieceNode.cgPiece = pieceName;
                pieceNode.cgKey = k;
                if (anim) {
                    pieceNode.cgAnimating = true;
                    pos[0] += anim[2];
                    pos[1] += anim[3];
                }
                translate(pieceNode, posToTranslate$1(pos, asWhite));
                if (s.addPieceZIndex)
                    pieceNode.style.zIndex = posZIndex(pos, asWhite);
                boardEl.appendChild(pieceNode);
            }
        }
    }
    // remove any element that remains in the moved sets
    for (const nodes of movedPieces.values())
        removeNodes(s, nodes);
    for (const nodes of movedSquares.values())
        removeNodes(s, nodes);
}
function renderResized$1(s) {
    const asWhite = whitePov(s), posToTranslate$1 = posToTranslate(s.dom.bounds());
    let el = s.dom.elements.board.firstChild;
    while (el) {
        if ((isPieceNode(el) && !el.cgAnimating) || isSquareNode(el)) {
            translate(el, posToTranslate$1(key2pos(el.cgKey), asWhite));
        }
        el = el.nextSibling;
    }
}
function updateBounds(s) {
    var _a, _b;
    const bounds = s.dom.elements.wrap.getBoundingClientRect();
    const container = s.dom.elements.container;
    const ratio = bounds.height / bounds.width;
    const width = (Math.floor((bounds.width * window.devicePixelRatio) / 8) * 8) / window.devicePixelRatio;
    const height = width * ratio;
    container.style.width = width + 'px';
    container.style.height = height + 'px';
    s.dom.bounds.clear();
    (_a = s.addDimensionsCssVarsTo) === null || _a === void 0 ? void 0 : _a.style.setProperty('---cg-width', width + 'px');
    (_b = s.addDimensionsCssVarsTo) === null || _b === void 0 ? void 0 : _b.style.setProperty('---cg-height', height + 'px');
}
const isPieceNode = (el) => el.tagName === 'PIECE';
const isSquareNode = (el) => el.tagName === 'SQUARE';
function removeNodes(s, nodes) {
    for (const node of nodes)
        s.dom.elements.board.removeChild(node);
}
function posZIndex(pos, asWhite) {
    const minZ = 3;
    const rank = pos[1];
    const z = asWhite ? minZ + 7 - rank : minZ + rank;
    return `${z}`;
}
const pieceNameOf = (piece) => `${piece.color} ${piece.role}`;
function computeSquareClasses(s) {
    var _a, _b, _c;
    const squares = new Map();
    if (s.lastMove && s.highlight.lastMove)
        for (const k of s.lastMove) {
            addSquare(squares, k, 'last-move');
        }
    if (s.check && s.highlight.check)
        addSquare(squares, s.check, 'check');
    if (s.selected) {
        addSquare(squares, s.selected, 'selected');
        if (s.movable.showDests) {
            const dests = (_a = s.movable.dests) === null || _a === void 0 ? void 0 : _a.get(s.selected);
            if (dests)
                for (const k of dests) {
                    addSquare(squares, k, 'move-dest' + (s.pieces.has(k) ? ' oc' : ''));
                }
            const pDests = (_c = (_b = s.premovable.customDests) === null || _b === void 0 ? void 0 : _b.get(s.selected)) !== null && _c !== void 0 ? _c : s.premovable.dests;
            if (pDests)
                for (const k of pDests) {
                    addSquare(squares, k, 'premove-dest' + (s.pieces.has(k) ? ' oc' : ''));
                }
        }
    }
    const premove = s.premovable.current;
    if (premove)
        for (const k of premove)
            addSquare(squares, k, 'current-premove');
    else if (s.predroppable.current)
        addSquare(squares, s.predroppable.current.key, 'current-premove');
    const o = s.exploding;
    if (o)
        for (const k of o.keys)
            addSquare(squares, k, 'exploding' + o.stage);
    if (s.highlight.custom) {
        s.highlight.custom.forEach((v, k) => {
            addSquare(squares, k, v);
        });
    }
    return squares;
}
function addSquare(squares, key, klass) {
    const classes = squares.get(key);
    if (classes)
        squares.set(key, `${classes} ${klass}`);
    else
        squares.set(key, klass);
}
function appendValue(map, key, value) {
    const arr = map.get(key);
    if (arr)
        arr.push(value);
    else
        map.set(key, [value]);
}

// append and remove only. No updates.
function syncShapes(shapes, root, renderShape) {
    const hashesInDom = new Map(), // by hash
    toRemove = [];
    for (const sc of shapes)
        hashesInDom.set(sc.hash, false);
    let el = root.firstElementChild, elHash;
    while (el) {
        elHash = el.getAttribute('cgHash');
        // found a shape element that's here to stay
        if (hashesInDom.has(elHash))
            hashesInDom.set(elHash, true);
        // or remove it
        else
            toRemove.push(el);
        el = el.nextElementSibling;
    }
    // remove old shapes
    for (const el of toRemove)
        root.removeChild(el);
    // insert shapes that are not yet in dom
    for (const sc of shapes) {
        if (!hashesInDom.get(sc.hash))
            root.appendChild(renderShape(sc));
    }
}

function render(state, autoPieceEl) {
    const autoPieces = state.drawable.autoShapes.filter(autoShape => autoShape.piece);
    const autoPieceShapes = autoPieces.map((s) => {
        return {
            shape: s,
            hash: hash(s),
            current: false,
        };
    });
    syncShapes(autoPieceShapes, autoPieceEl, shape => renderShape(state, shape, state.dom.bounds()));
}
function renderResized(state) {
    var _a;
    const asWhite = whitePov(state), posToTranslate$1 = posToTranslate(state.dom.bounds());
    let el = (_a = state.dom.elements.autoPieces) === null || _a === void 0 ? void 0 : _a.firstChild;
    while (el) {
        translateAndScale(el, posToTranslate$1(key2pos(el.cgKey), asWhite), el.cgScale);
        el = el.nextSibling;
    }
}
function renderShape(state, { shape, hash }, bounds) {
    var _a, _b, _c;
    const orig = shape.orig;
    const role = (_a = shape.piece) === null || _a === void 0 ? void 0 : _a.role;
    const color = (_b = shape.piece) === null || _b === void 0 ? void 0 : _b.color;
    const scale = (_c = shape.piece) === null || _c === void 0 ? void 0 : _c.scale;
    const pieceEl = createEl('piece', `${role} ${color}`);
    pieceEl.setAttribute('cgHash', hash);
    pieceEl.cgKey = orig;
    pieceEl.cgScale = scale;
    translateAndScale(pieceEl, posToTranslate(bounds)(key2pos(orig), whitePov(state)), scale);
    return pieceEl;
}
const hash = (autoPiece) => { var _a, _b, _c; return [autoPiece.orig, (_a = autoPiece.piece) === null || _a === void 0 ? void 0 : _a.role, (_b = autoPiece.piece) === null || _b === void 0 ? void 0 : _b.color, (_c = autoPiece.piece) === null || _c === void 0 ? void 0 : _c.scale].join(','); };

function Chessground(element, config) {
    const maybeState = defaults();
    configure(maybeState, config || {});
    function redrawAll() {
        const prevUnbind = 'dom' in maybeState ? maybeState.dom.unbind : undefined;
        // compute bounds from existing board element if possible
        // this allows non-square boards from CSS to be handled (for 3D)
        const elements = renderWrap(element, maybeState), bounds = memo(() => elements.board.getBoundingClientRect()), redrawNow = (skipSvg) => {
            render$1(state);
            if (elements.autoPieces)
                render(state, elements.autoPieces);
            if (!skipSvg && elements.svg)
                renderSvg(state, elements.svg, elements.customSvg);
        }, onResize = () => {
            updateBounds(state);
            renderResized$1(state);
            if (elements.autoPieces)
                renderResized(state);
        };
        const state = maybeState;
        state.dom = {
            elements,
            bounds,
            redraw: debounceRedraw(redrawNow),
            redrawNow,
            unbind: prevUnbind,
        };
        state.drawable.prevSvgHash = '';
        updateBounds(state);
        redrawNow(false);
        bindBoard(state, onResize);
        if (!prevUnbind)
            state.dom.unbind = bindDocument(state, onResize);
        state.events.insert && state.events.insert(elements);
        return state;
    }
    return start(redrawAll(), redrawAll);
}
function debounceRedraw(redrawNow) {
    let redrawing = false;
    return () => {
        if (redrawing)
            return;
        redrawing = true;
        requestAnimationFrame(() => {
            redrawNow();
            redrawing = false;
        });
    };
}

/* svelte/KnightMoves.svelte generated by Svelte v4.2.18 */

const { Object: Object_1 } = globals;
const file = "svelte/KnightMoves.svelte";

function add_css(target) {
	append_styles(target, "svelte-1gg0rr3", ".cell.svelte-1gg0rr3 button.svelte-1gg0rr3{width:100%;display:inline-block}.board-wrapper.svelte-1gg0rr3.svelte-1gg0rr3{width:100%}\n/*# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiS25pZ2h0TW92ZXMuc3ZlbHRlIiwic291cmNlcyI6WyJLbmlnaHRNb3Zlcy5zdmVsdGUiXSwic291cmNlc0NvbnRlbnQiOlsiPHNjcmlwdD5cbiAgaW1wb3J0IHsgb25Nb3VudCB9IGZyb20gJ3N2ZWx0ZSc7XG4gIGltcG9ydCB7IENoZXNzZ3JvdW5kIH0gZnJvbSBcImNoZXNzZ3JvdW5kXCI7XG4gIGltcG9ydCB7IGtuaWdodE1vdmVzRGF0YSB9IGZyb20gJ3NyYy9rbmlnaHRfbW92ZXNfZGF0YSc7XG4gIGltcG9ydCBDb25maWcgZnJvbSBcInNyYy9sb2NhbF9jb25maWdcIjtcbiAgaW1wb3J0IHsgQ29uZmlnRm9ybSB9IGZyb20gXCJzcmMvbG9jYWxfY29uZmlnXCI7XG5cbiAgbGV0IGNoZXNzZ3JvdW5kO1xuICBsZXQganNvbkRhdGEgPSBrbmlnaHRNb3Zlc0RhdGE7XG4gIGxldCBwb3NpdGlvbkRhdGEgPSBudWxsO1xuICBsZXQgY29ycmVjdENvdW50ID0gMDtcbiAgbGV0IGluY29ycmVjdENvdW50ID0gMDtcblxuICBsZXQgZ2FtZVJ1bm5pbmcgPSBmYWxzZTtcbiAgbGV0IHRpbWVSZW1haW5pbmcgPSBudWxsO1xuICBsZXQgdGltZUVsYXBzZWQgPSBudWxsO1xuICBsZXQgZ2FtZVN0YXJ0VGltZSA9IG51bGw7XG5cbiAgbGV0IHByb2dyZXNzQ2xhc3MgPSAnaXMtc3VjY2Vzcyc7XG4gIGxldCBhbmltYXRpbmcgPSBmYWxzZTtcbiAgbGV0IGFycm93c1Nob3duO1xuXG4gIGxldCBoaWdoU2NvcmUgPSAwO1xuICBsZXQgbWF4UGF0aHNUb0Rpc3BsYXlPcHRpb247XG4gIGxldCBhbmltYXRpb25MZW5ndGhPcHRpb247XG4gIGxldCBrbmlnaHRTcXVhcmU7XG4gIGxldCBraW5nU3F1YXJlO1xuICBsZXQgY29uZmlnO1xuICBsZXQgY29uZmlnRm9ybTtcbiAgbGV0IHN0YXJ0VGltZWRHYW1lQnV0dG9uRGlzYWJsZWQgPSBmYWxzZTtcbiAgbGV0IHJlc3VsdFRleHQgPSAnJztcbiAgbGV0IHJlc3VsdFRleHRDbGFzcyA9ICcnO1xuXG4gIGxldCBib2FyZFdpZHRoID0gNTEyO1xuICBsZXQgYm9hcmRIZWlnaHQgPSA1MTI7XG4gIGxldCBwYWRkaW5nID0gODA7XG5cbiAgbGV0IGJ1dHRvbjE7XG4gIGxldCBidXR0b24yO1xuICBsZXQgYnV0dG9uMztcbiAgbGV0IGJ1dHRvbjQ7XG4gIGxldCBidXR0b241O1xuICBsZXQgYnV0dG9uNjtcblxuICBsZXQgbWFpbkNvbHVtbjtcbiAgbGV0IGJvYXJkQ29udGFpbmVyO1xuICBsZXQgYm9hcmRXcmFwcGVyO1xuXG4gICQ6IHtcbiAgICBpZiAoZ2FtZVJ1bm5pbmcpIHtcbiAgICAgIGNvbnN0IHBlcmNlbnREb25lID0gdGltZUVsYXBzZWQgLyA2MDtcbiAgICAgIGlmIChwZXJjZW50RG9uZSA8IDAuNykge1xuICAgICAgICBwcm9ncmVzc0NsYXNzID0gJ2lzLXN1Y2Nlc3MnO1xuICAgICAgfSBlbHNlIGlmIChwZXJjZW50RG9uZSA8IDAuOSkge1xuICAgICAgICBwcm9ncmVzc0NsYXNzID0gJ2lzLXdhcm5pbmcnO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcHJvZ3Jlc3NDbGFzcyA9ICdpcy1kYW5nZXInO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBwcm9ncmVzc0NsYXNzID0gJ2lzLXN1Y2Nlc3MnO1xuICAgIH1cbiAgfVxuXG4gICQ6IHtcbiAgICBjb25zdCB0b3RhbEhlaWdodCA9IHdpbmRvdy5pbm5lckhlaWdodDtcbiAgICBjb25zdCByZW1haW5pbmdIZWlnaHQgPSB0b3RhbEhlaWdodCAtIGJvYXJkSGVpZ2h0O1xuXG4gICAgaWYgKGJ1dHRvbjEpIHtcbiAgICAgIGNvbnN0IG1heEhlaWdodCA9IGJ1dHRvbjEub2Zmc2V0V2lkdGg7XG4gICAgICBjb25zdCBjYWxjdWxhdGVkSGVpZ2h0ID0gKHJlbWFpbmluZ0hlaWdodCAvIDIpIC0gcGFkZGluZztcbiAgICAgIGNvbnN0IGJ1dHRvbkhlaWdodCA9IE1hdGgubWluKG1heEhlaWdodCwgY2FsY3VsYXRlZEhlaWdodCk7XG4gICAgICBidXR0b24xLnN0eWxlLmhlaWdodCA9IGAke2J1dHRvbkhlaWdodH1weGA7XG4gICAgICBidXR0b24yLnN0eWxlLmhlaWdodCA9IGAke2J1dHRvbkhlaWdodH1weGA7XG4gICAgICBidXR0b24zLnN0eWxlLmhlaWdodCA9IGAke2J1dHRvbkhlaWdodH1weGA7XG4gICAgICBidXR0b240LnN0eWxlLmhlaWdodCA9IGAke2J1dHRvbkhlaWdodH1weGA7XG4gICAgICBidXR0b241LnN0eWxlLmhlaWdodCA9IGAke2J1dHRvbkhlaWdodH1weGA7XG4gICAgICBidXR0b242LnN0eWxlLmhlaWdodCA9IGAke2J1dHRvbkhlaWdodH1weGA7XG4gICAgfVxuICB9XG5cbiAgb25Nb3VudCgoKSA9PiB7XG4gICAgaW5pdENvbmZpZygpO1xuXG4gICAgY2hlc3Nncm91bmQgPSBDaGVzc2dyb3VuZChib2FyZENvbnRhaW5lciwge1xuICAgICAgZmVuOiAnOC84LzgvOC84LzgvOC84JyxcbiAgICAgIGFuaW1hdGlvbjoge1xuICAgICAgICBlbmFibGVkOiB0cnVlLFxuICAgICAgICBkdXJhdGlvbjogYW5pbWF0aW9uTGVuZ3RoT3B0aW9uLmdldFZhbHVlKCksXG4gICAgICB9LFxuICAgICAgaGlnaGxpZ2h0OiB7XG4gICAgICAgIGxhc3RNb3ZlOiBmYWxzZSxcbiAgICAgIH0sXG4gICAgICBkcmFnZ2FibGU6IGZhbHNlLFxuICAgICAgc2VsZWN0YWJsZTogZmFsc2UsXG4gICAgfSk7XG5cbiAgICByZXNpemUoKTtcbiAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcigncmVzaXplJywgcmVzaXplKTtcblxuICAgIGluaXRLZXlib2FyZFNob3J0Y3V0cygpO1xuICAgIHJlc2l6ZSgpO1xuICAgIG5ld1Bvc2l0aW9uKCk7XG4gIH0pO1xuXG4gIGZ1bmN0aW9uIHJlc2l6ZSgpIHtcbiAgICBjb25zdCB3aWR0aCA9IGJvYXJkV3JhcHBlci5vZmZzZXRXaWR0aDtcbiAgICBjb25zdCB0b3RhbEhlaWdodCA9IHdpbmRvdy5pbm5lckhlaWdodDtcbiAgICBjb25zdCBtaW5CdXR0b25IZWlnaHQgPSAzMDtcbiAgICBjb25zdCBtYXhIZWlnaHQgPSB0b3RhbEhlaWdodCAtICgyICogbWluQnV0dG9uSGVpZ2h0KSAtIHBhZGRpbmc7XG4gICAgY29uc3QgYm9hcmREaW1lbnNpb25zID0gTWF0aC5taW4od2lkdGgsIG1heEhlaWdodCk7XG4gICAgYm9hcmRIZWlnaHQgPSBib2FyZERpbWVuc2lvbnM7XG4gICAgYm9hcmRXaWR0aCA9IGJvYXJkRGltZW5zaW9ucztcbiAgfVxuXG4gIGZ1bmN0aW9uIGdldEJ1dHRvbihpZCkge1xuICAgIHN3aXRjaCAoaWQpIHtcbiAgICAgIGNhc2UgMTpcbiAgICAgICAgcmV0dXJuIGJ1dHRvbjE7XG4gICAgICBjYXNlIDI6XG4gICAgICAgIHJldHVybiBidXR0b24yO1xuICAgICAgY2FzZSAzOlxuICAgICAgICByZXR1cm4gYnV0dG9uMztcbiAgICAgIGNhc2UgNDpcbiAgICAgICAgcmV0dXJuIGJ1dHRvbjQ7XG4gICAgICBjYXNlIDU6XG4gICAgICAgIHJldHVybiBidXR0b241O1xuICAgICAgY2FzZSA2OlxuICAgICAgICByZXR1cm4gYnV0dG9uNjtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBpbml0S2V5Ym9hcmRTaG9ydGN1dHMoKSB7XG4gICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ2tleWRvd24nLCAoZXZlbnQpID0+IHtcbiAgICAgIGNvbnN0IGtleSA9IGV2ZW50LmtleTtcbiAgICAgIGlmIChrZXkgPj0gJzEnICYmIGtleSA8PSAnNicpIHtcbiAgICAgICAgLy8gVHJpZ2dlciBjbGljayBldmVudCBvbiBjb3JyZXNwb25kaW5nIGJ1dHRvblxuICAgICAgICBjb25zdCBidXR0b24gPSBnZXRCdXR0b24ocGFyc2VJbnQoa2V5KSk7XG4gICAgICAgIGJ1dHRvbi5jbGljaygpO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgZnVuY3Rpb24gc3RhcnRUaW1lZEdhbWUoKSB7XG4gICAgcmVzZXQoKTtcbiAgICBzdGFydFRpbWVkR2FtZUJ1dHRvbkRpc2FibGVkID0gdHJ1ZTtcbiAgICBnYW1lUnVubmluZyA9IHRydWU7XG4gICAgdGltZVJlbWFpbmluZyA9IDYwO1xuICAgIHRpbWVFbGFwc2VkID0gMDtcbiAgICBnYW1lU3RhcnRUaW1lID0gcGVyZm9ybWFuY2Uubm93KCkgLyAxMDAwO1xuICAgIG5ld1Bvc2l0aW9uKCk7XG4gICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICBlbmRHYW1lKCk7XG4gICAgfSwgNjAwMDApOyAvLyAxIG1pbnV0ZVxuICAgIGNvbnN0IHRpbWVySW50ZXJ2YWwgPSBzZXRJbnRlcnZhbCgoKSA9PiB7XG4gICAgICBpZiAodGltZVJlbWFpbmluZyA9PT0gMCkge1xuICAgICAgICBjbGVhckludGVydmFsKHRpbWVySW50ZXJ2YWwpO1xuICAgICAgfVxuICAgICAgdGltZVJlbWFpbmluZyAtPSAxO1xuICAgIH0sIDEwMDApO1xuICAgIGNvbnN0IHByb2dyZXNzSW50ZXJ2YWwgPSBzZXRJbnRlcnZhbCgoKSA9PiB7XG4gICAgICBpZiAodGltZVJlbWFpbmluZyA9PT0gMCkge1xuICAgICAgICBjbGVhckludGVydmFsKHByb2dyZXNzSW50ZXJ2YWwpO1xuICAgICAgfVxuICAgICAgdGltZUVsYXBzZWQgPSAocGVyZm9ybWFuY2Uubm93KCkgLyAxMDAwKSAtIGdhbWVTdGFydFRpbWU7XG4gICAgfSwgMTApO1xuICB9XG5cbiAgZnVuY3Rpb24gZW5kR2FtZSgpIHtcbiAgICBpZiAoY29ycmVjdENvdW50ID4gaGlnaFNjb3JlICYmIGdhbWVSdW5uaW5nKSB7XG4gICAgICBoaWdoU2NvcmUgPSBjb3JyZWN0Q291bnQ7XG4gICAgfVxuICAgIGlmIChpbmNvcnJlY3RDb3VudCA+IDApIHtcbiAgICAgIHJlc3VsdFRleHRDbGFzcyA9ICdpbmNvcnJlY3QnO1xuICAgICAgcmVzdWx0VGV4dCA9IGBJbmNvcnJlY3QsIGdhbWUgb3ZlciEgVGhlIGNvcnJlY3QgYW5zd2VyIHdhcyAke2dldE1pbmltdW1Nb3Zlc0ZvckN1cnJlbnRQb3NpdGlvbigpfS4gWW91ciBzY29yZSB3YXMgJHtjb3JyZWN0Q291bnR9LmBcbiAgICB9IGVsc2Uge1xuICAgICAgcmVzdWx0VGV4dENsYXNzID0gJ2NvcnJlY3QnO1xuICAgICAgcmVzdWx0VGV4dCA9IGBUaW1lJ3MgdXAhIFlvdXIgc2NvcmUgd2FzICR7Y29ycmVjdENvdW50fS5gO1xuICAgIH1cblxuICAgIGdhbWVSdW5uaW5nID0gZmFsc2U7XG4gICAgdGltZVJlbWFpbmluZyA9IG51bGw7XG4gICAgdGltZUVsYXBzZWQgPSBudWxsO1xuICAgIGNvcnJlY3RDb3VudCA9IDA7XG4gICAgaW5jb3JyZWN0Q291bnQgPSAwO1xuICAgIHN0YXJ0VGltZWRHYW1lQnV0dG9uRGlzYWJsZWQgPSBmYWxzZTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHJlc2V0KCkge1xuICAgIGNvcnJlY3RDb3VudCA9IDA7XG4gICAgaW5jb3JyZWN0Q291bnQgPSAwO1xuICAgIGdhbWVSdW5uaW5nID0gZmFsc2U7XG4gICAgc3RhcnRUaW1lZEdhbWVCdXR0b25EaXNhYmxlZCA9IGZhbHNlO1xuICAgIHJlc3VsdFRleHQgPSAnJztcbiAgICByZXN1bHRUZXh0Q2xhc3MgPSAnJztcbiAgfVxuXG4gIGZ1bmN0aW9uIGdldFJhbmRvbUluZGV4KG1heCkge1xuICAgIHJldHVybiBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiBtYXgpO1xuICB9XG5cbiAgZnVuY3Rpb24gZ2V0UmFuZG9tRWxlbWVudChhcnJheSkge1xuICAgIGNvbnN0IGluZGV4ID0gZ2V0UmFuZG9tSW5kZXgoYXJyYXkubGVuZ3RoKTtcbiAgICByZXR1cm4gYXJyYXlbaW5kZXhdO1xuICB9XG5cbiAgZnVuY3Rpb24gc29ydFJhbmRvbWx5KGFycmF5KSB7XG4gICAgcmV0dXJuIGFycmF5LnNvcnQoKCkgPT4gTWF0aC5yYW5kb20oKSAtIDAuNSk7XG4gIH1cblxuICBmdW5jdGlvbiBnZXRNaW5pbXVtTW92ZXNGb3JDdXJyZW50UG9zaXRpb24oKSB7XG4gICAgcmV0dXJuIHBvc2l0aW9uRGF0YS5taW5fbGVuZ3RoO1xuICB9XG5cbiAgZnVuY3Rpb24gZ2V0UGF0aHNGb3JDdXJyZW50UG9zaXRpb24oKSB7XG4gICAgcmV0dXJuIHBvc2l0aW9uRGF0YS5wYXRocztcbiAgfVxuXG4gIGZ1bmN0aW9uIHByb2Nlc3NCdXR0b24oaWQpIHtcbiAgICBpZiAoYW5pbWF0aW5nKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGNvbnN0IG51bWJlciA9IHBhcnNlSW50KGlkKTtcbiAgICBjb25zdCBtaW5pbXVtID0gZ2V0TWluaW11bU1vdmVzRm9yQ3VycmVudFBvc2l0aW9uKCk7XG4gICAgY29uc3QgYnV0dG9uID0gZ2V0QnV0dG9uKG51bWJlcik7XG4gICAgaWYgKG51bWJlciA9PT0gbWluaW11bSkge1xuICAgICAgY29ycmVjdENvdW50ICs9IDE7XG4gICAgICBhbmltYXRlRWxlbWVudChidXR0b24sICdjb3JyZWN0QW5zd2VyJyk7XG4gICAgICByZXN1bHRUZXh0Q2xhc3MgPSAnY29ycmVjdCc7XG4gICAgICByZXN1bHRUZXh0ID0gYCR7bnVtYmVyfSB3YXMgY29ycmVjdCFgO1xuICAgICAgbmV3UG9zaXRpb24oKTtcbiAgICB9IGVsc2Uge1xuICAgICAgaW5jb3JyZWN0Q291bnQgKz0gMTtcbiAgICAgIGFuaW1hdGVFbGVtZW50KGJ1dHRvbiwgJ2luY29ycmVjdEFuc3dlcicpO1xuICAgICAgaWYgKGdhbWVSdW5uaW5nKSB7XG4gICAgICAgIGVuZEdhbWUoKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJlc3VsdFRleHQgPSBgJHtudW1iZXJ9IHdhcyBpbmNvcnJlY3QuIFRoZSBjb3JyZWN0IGFuc3dlciB3YXMgJHttaW5pbXVtfS5gO1xuICAgICAgICByZXN1bHRUZXh0Q2xhc3MgPSAnaW5jb3JyZWN0JztcbiAgICAgIH1cbiAgICAgIGNvbnN0IGNvcnJlY3RQYXRocyA9IHBvc2l0aW9uRGF0YS5wYXRocztcbiAgICAgIGNvbnN0IHJhbmRvbWx5U29ydGVkID0gc29ydFJhbmRvbWx5KGNvcnJlY3RQYXRocyk7XG4gICAgICBjb25zdCBwYXRoVG9BbmltYXRlID0gcmFuZG9tbHlTb3J0ZWRbMF07XG4gICAgICBjb25zdCBtb3ZlUGFpcnMgPSBnZXRNb3ZlUGFpcnNGcm9tUGF0aChwYXRoVG9BbmltYXRlKTtcbiAgICAgIGRyYXdDb3JyZWN0QXJyb3dzKHJhbmRvbWx5U29ydGVkKTtcbiAgICAgIG1ha2VTZXF1ZW50aWFsTW92ZXMobW92ZVBhaXJzLCAoKSA9PiB7XG4gICAgICAgIG5ld1Bvc2l0aW9uKCk7XG4gICAgICB9KTtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBkcmF3Q29ycmVjdEFycm93cyh2YWxpZFBhdGhzKSB7XG4gICAgY29uc3Qgc2hhcGVzID0gW107XG4gICAgY29uc3QgYnJ1c2hlcyA9IGNoZXNzZ3JvdW5kLnN0YXRlLmRyYXdhYmxlLmJydXNoZXM7XG4gICAgY29uc3QgYnJ1c2hLZXlzID0gT2JqZWN0LmtleXMoYnJ1c2hlcyk7XG4gICAgbGV0IG1heFBhdGhzVG9TaG93ID0gbWF4UGF0aHNUb0Rpc3BsYXlPcHRpb24uZ2V0VmFsdWUoKTtcbiAgICBpZiAobWF4UGF0aHNUb1Nob3cgPCAxKSB7XG4gICAgICBtYXhQYXRoc1RvU2hvdyA9IDE7XG4gICAgfVxuXG4gICAgdmFsaWRQYXRocy5mb3JFYWNoKChwYXRoLCBpbmRleCkgPT4ge1xuICAgICAgaWYgKGluZGV4ICsgMSA+IG1heFBhdGhzVG9TaG93KSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGNvbnN0IG1vdmVQYWlycyA9IGdldE1vdmVQYWlyc0Zyb21QYXRoKHBhdGgpO1xuICAgICAgY29uc3QgYnJ1c2hLZXkgPSBicnVzaEtleXNbaW5kZXggJSBicnVzaEtleXMubGVuZ3RoXTtcbiAgICAgIG1vdmVQYWlycy5mb3JFYWNoKChwYWlyKSA9PiB7XG4gICAgICAgIGNvbnN0IHNoYXBlID0ge29yaWc6IHBhaXJbMF0sIGRlc3Q6IHBhaXJbMV0sIGJydXNoOiBicnVzaEtleSwgbW9kaWZpZXJzOiB7aGlsaXRlOiBmYWxzZSwgbGluZVdpZHRoOiA1fX1cbiAgICAgICAgc2hhcGVzLnB1c2goc2hhcGUpO1xuICAgICAgfSk7XG4gICAgfSk7XG5cbiAgICBjb25zdCBtYWluUGF0aCA9IHZhbGlkUGF0aHNbMF07XG4gICAgY29uc3QgbWFpbk1vdmVQYWlycyA9IGdldE1vdmVQYWlyc0Zyb21QYXRoKG1haW5QYXRoKTtcbiAgICBtYWluTW92ZVBhaXJzLmZvckVhY2goKHBhaXIpID0+IHtcbiAgICAgIGNvbnN0IHNoYXBlID0ge29yaWc6IHBhaXJbMF0sIGRlc3Q6IHBhaXJbMV0sIGJydXNoOiAnZ3JlZW4nLCBtb2RpZmllcnM6IHtpbmVXaWR0aDogMTB9fVxuICAgICAgc2hhcGVzLnB1c2goc2hhcGUpO1xuICAgIH0pO1xuXG4gICAgY2hlc3Nncm91bmQuc2V0KHtcbiAgICAgIGRyYXdhYmxlOiB7XG4gICAgICAgIHNoYXBlczogc2hhcGVzXG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuICBmdW5jdGlvbiBnZXRNb3ZlUGFpcnNGcm9tUGF0aChwYXRoKSB7XG4gICAgY29uc3QgcGFpcnMgPSBbXTtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHBhdGgubGVuZ3RoIC0gMTsgaSsrKSB7XG4gICAgICBwYWlycy5wdXNoKFtwYXRoW2ldLCBwYXRoW2kgKyAxXV0pO1xuICAgIH1cbiAgICByZXR1cm4gcGFpcnM7XG4gIH1cblxuICBmdW5jdGlvbiBtYWtlU2VxdWVudGlhbE1vdmVzKG1vdmVQYWlycyA9IFtdLCBjYWxsYmFjayA9IG51bGwpIHtcbiAgICBhbmltYXRpbmcgPSB0cnVlO1xuICAgIGlmIChtb3ZlUGFpcnMubGVuZ3RoIDwgMSkge1xuICAgICAgYW5pbWF0aW5nID0gZmFsc2U7XG4gICAgICBpZiAoY2FsbGJhY2spIHtcbiAgICAgICAgY2FsbGJhY2soKTtcbiAgICAgIH1cbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICAvLyBzaGlmdCBtdXRhdGVzIHRoZSBhcnJheVxuICAgIGNvbnN0IG1vdmUgPSBtb3ZlUGFpcnMuc2hpZnQoKTtcblxuICAgIGNoZXNzZ3JvdW5kLm1vdmUobW92ZVswXSwgbW92ZVsxXSk7XG5cbiAgICBzZXRUaW1lb3V0KCgpID0+IG1ha2VTZXF1ZW50aWFsTW92ZXMobW92ZVBhaXJzLCBjYWxsYmFjayksIGFuaW1hdGlvbkxlbmd0aE9wdGlvbi5nZXRWYWx1ZSgpKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGNsZWFyRHJhd2luZ3MoKSB7XG4gICAgYXJyb3dzU2hvd24gPSBmYWxzZTtcbiAgICBjaGVzc2dyb3VuZC5zZXQoe1xuICAgICAgZHJhd2FibGU6IHtcbiAgICAgICAgc2hhcGVzOiBbXVxuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgZnVuY3Rpb24gbmV3UG9zaXRpb24oKSB7XG4gICAgY2xlYXJEcmF3aW5ncygpO1xuICAgIGNvbnN0IGtleXMgPSBPYmplY3Qua2V5cyhqc29uRGF0YSk7XG4gICAgY29uc3QgaW5kZXggPSBnZXRSYW5kb21JbmRleChrZXlzLmxlbmd0aCk7XG4gICAgY29uc3Qga2V5ID0ga2V5c1tpbmRleF07XG4gICAgY29uc3QgcHJldmlvdXNLbmlnaHRTcXVhcmUgPSBrbmlnaHRTcXVhcmU7XG4gICAgY29uc3QgcHJldmlvdXNLaW5nU3F1YXJlID0ga2luZ1NxdWFyZTtcbiAgICBjb25zdCBzcXVhcmVzID0ga2V5LnNwbGl0KCcuJyk7XG4gICAga25pZ2h0U3F1YXJlID0gc3F1YXJlc1swXTtcbiAgICBraW5nU3F1YXJlID0gc3F1YXJlc1sxXTtcbiAgICBwb3NpdGlvbkRhdGEgPSBqc29uRGF0YVtrZXldO1xuICAgIGNvbnN0IGtpbmcgPSB7XG4gICAgICByb2xlOiAna2luZycsXG4gICAgICBjb2xvcjogJ2JsYWNrJyxcbiAgICB9XG4gICAgY29uc3Qga25pZ2h0ID0ge1xuICAgICAgcm9sZTogJ2tuaWdodCcsXG4gICAgICBjb2xvcjogJ3doaXRlJyxcbiAgICB9XG4gICAgY29uc3QgcGllY2VzRGlmZiA9IG5ldyBNYXAoKTtcbiAgICBpZiAocHJldmlvdXNLbmlnaHRTcXVhcmUgJiYgcHJldmlvdXNLaW5nU3F1YXJlKSB7XG4gICAgICBwaWVjZXNEaWZmLnNldChwcmV2aW91c0tuaWdodFNxdWFyZSwgdW5kZWZpbmVkKTtcbiAgICAgIHBpZWNlc0RpZmYuc2V0KHByZXZpb3VzS2luZ1NxdWFyZSwgdW5kZWZpbmVkKTtcbiAgICB9XG4gICAgcGllY2VzRGlmZi5zZXQoa2luZ1NxdWFyZSwga2luZyk7XG4gICAgcGllY2VzRGlmZi5zZXQoa25pZ2h0U3F1YXJlLCBrbmlnaHQpO1xuICAgIGNoZXNzZ3JvdW5kLnNldFBpZWNlcyhwaWVjZXNEaWZmKTtcbiAgICBjaGVzc2dyb3VuZC5zZXRQaWVjZXMobmV3IE1hcCgpKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGFuaW1hdGVFbGVtZW50KGVsZW1lbnQsIGFuaW1hdGlvbkNsYXNzKSB7XG4gICAgZWxlbWVudC5jbGFzc0xpc3QuYWRkKGFuaW1hdGlvbkNsYXNzKTtcblxuICAgIC8vIExpc3RlbiBmb3IgdGhlIGFuaW1hdGlvbmVuZCBldmVudFxuICAgIGVsZW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignYW5pbWF0aW9uZW5kJywgZnVuY3Rpb24gKCkge1xuICAgICAgLy8gT25jZSB0aGUgYW5pbWF0aW9uIGVuZHMsIHJlbW92ZSB0aGUgY2xhc3NcbiAgICAgIGVsZW1lbnQuY2xhc3NMaXN0LnJlbW92ZShhbmltYXRpb25DbGFzcyk7XG4gICAgfSwge29uY2U6IHRydWV9KTsgLy8gVGhlIGxpc3RlbmVyIGlzIHJlbW92ZWQgYWZ0ZXIgaXQncyBpbnZva2VkIG9uY2VcbiAgfVxuXG4gIGZ1bmN0aW9uIGluaXRDb25maWcoKSB7XG4gICAgY29uZmlnID0gbmV3IENvbmZpZygna25pZ2h0X21vdmVzX2dhbWUnKTtcbiAgICBhbmltYXRpb25MZW5ndGhPcHRpb24gPSBjb25maWcuZ2V0Q29uZmlnT3B0aW9uKCdBbmltYXRpb24gbGVuZ3RoIChtcyknLCAzMDApO1xuXG4gICAgbWF4UGF0aHNUb0Rpc3BsYXlPcHRpb24gPSBjb25maWcuZ2V0Q29uZmlnT3B0aW9uKCdNYXggcGF0aHMgdG8gc2hvdycsIDYpO1xuXG4gICAgY29uZmlnRm9ybSA9IG5ldyBDb25maWdGb3JtKGNvbmZpZyk7XG4gICAgY29uZmlnRm9ybS5hZGRMaW5rVG9ET00oJ2NvbmZpZycpO1xuICB9XG48L3NjcmlwdD5cblxuPGxpbmsgaWQ9XCJwaWVjZS1zcHJpdGVcIiBocmVmPVwiL3BpZWNlLWNzcy9tZXJpZGEuY3NzXCIgcmVsPVwic3R5bGVzaGVldFwiPlxuXG48ZGl2IGNsYXNzPVwiY29sdW1uc1wiPlxuICA8ZGl2IGNsYXNzPVwiY29sdW1uIGlzLTMtZGVza3RvcFwiPlxuICAgIDxkaXYgY2xhc3M9XCJib3ggc2NvcmUtY29udGFpbmVyXCI+XG4gICAgICA8ZGl2IGNsYXNzPVwiY29udGFpbmVyIGhhcy10ZXh0LWNlbnRlcmVkXCI+XG4gICAgICAgIDxoMiBjbGFzcz1cImlzLXNpemUtNVwiPkNvcnJlY3Q8L2gyPlxuICAgICAgICA8ZGl2IGNsYXNzPVwic2NvcmUgaXMtc2l6ZS0yXCI+e2NvcnJlY3RDb3VudH08L2Rpdj5cbiAgICAgICAgPGgyIGNsYXNzPVwiaXMtc2l6ZS01XCI+SW5jb3JyZWN0PC9oMj5cbiAgICAgICAgPGRpdiBjbGFzcz1cInNjb3JlIGlzLXNpemUtMlwiPntpbmNvcnJlY3RDb3VudH08L2Rpdj5cbiAgICAgIDwvZGl2PlxuICAgIDwvZGl2PlxuICAgIDxkaXYgY2xhc3M9XCJib3hcIj5cbiAgICAgIDxkaXYgY2xhc3M9XCJjb250YWluZXIgaGFzLXRleHQtY2VudGVyZWRcIj5cbiAgICAgICAgPGgyIGNsYXNzPVwiaXMtc2l6ZS01XCI+SGlnaCBTY29yZTwvaDI+XG4gICAgICAgIDxkaXYgY2xhc3M9XCJzY29yZSBpcy1zaXplLTJcIj57aGlnaFNjb3JlfTwvZGl2PlxuICAgICAgICA8YnV0dG9uIGlkPVwic3RhcnRUaW1lZEdhbWVcIiBkaXNhYmxlZD17c3RhcnRUaW1lZEdhbWVCdXR0b25EaXNhYmxlZH0gb246Y2xpY2s9e3N0YXJ0VGltZWRHYW1lfVxuICAgICAgICAgICAgICAgIGNsYXNzPVwiYnV0dG9uIGlzLXByaW1hcnlcIj5TdGFydCBUaW1lZCBHYW1lXG4gICAgICAgIDwvYnV0dG9uPlxuICAgICAgICB7I2lmIHRpbWVSZW1haW5pbmcgPiAwfVxuICAgICAgICAgIDxkaXYgaWQ9XCJ0aW1lclwiPnt0aW1lUmVtYWluaW5nfTwvZGl2PlxuICAgICAgICB7L2lmfVxuICAgICAgPC9kaXY+XG4gICAgPC9kaXY+XG4gICAgPGRpdiBjbGFzcz1cImJveFwiPlxuICAgICAgPGRpdiBjbGFzcz1cImNvbnRhaW5lciBoYXMtdGV4dC1jZW50ZXJlZFwiPlxuICAgICAgICA8ZGl2IGNsYXNzPVwiYmxvY2tcIj5cbiAgICAgICAgICA8YnV0dG9uIGNsYXNzPVwiYnV0dG9uIGlzLWluZm9cIiBkaXNhYmxlZD17YXJyb3dzU2hvd24gfHwgZ2FtZVJ1bm5pbmd9IG9uOmNsaWNrfHByZXZlbnREZWZhdWx0PXsoKSA9PiB7XG4gICAgICAgICAgaWYgKHBvc2l0aW9uRGF0YSkge1xuICAgICAgICAgICAgYXJyb3dzU2hvd24gPSB0cnVlO1xuICAgICAgICAgICAgY29uc3QgY29ycmVjdFBhdGhzID0gcG9zaXRpb25EYXRhLnBhdGhzO1xuICAgICAgICAgICAgY29uc3QgcmFuZG9tbHlTb3J0ZWQgPSBzb3J0UmFuZG9tbHkoY29ycmVjdFBhdGhzKTtcbiAgICAgICAgICAgIGRyYXdDb3JyZWN0QXJyb3dzKHJhbmRvbWx5U29ydGVkKTtcbiAgICAgICAgICB9XG4gICAgICAgIH19PlNob3cgYW5zd2VyXG4gICAgICAgICAgPC9idXR0b24+XG4gICAgICAgIDwvZGl2PlxuXG4gICAgICAgIHsjaWYgYXJyb3dzU2hvd259XG4gICAgICAgICAgPGRpdiBjbGFzcz1cImJsb2NrIGhhcy10ZXh0LWxlZnRcIj5cbiAgICAgICAgICAgIDxkaXY+XG4gICAgICAgICAgICAgIE1pbmltdW0gIyBvZiBtb3Zlczoge2dldE1pbmltdW1Nb3Zlc0ZvckN1cnJlbnRQb3NpdGlvbigpfVxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICA8ZGl2PlxuICAgICAgICAgICAgICBUb3RhbCB1bmlxdWUgcGF0aHM6IHtwb3NpdGlvbkRhdGEucGF0aHMubGVuZ3RofVxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgPGRpdiBjbGFzcz1cImJsb2NrXCI+XG4gICAgICAgICAgICA8YnV0dG9uIGNsYXNzPVwiYnV0dG9uIGlzLWxpbmtcIiBvbjpjbGljaz17KCkgPT4ge1xuICAgICAgICAgICAgICBjbGVhckRyYXdpbmdzKCk7XG4gICAgICAgICAgICB9fT5cbiAgICAgICAgICAgICAgQ2xlYXJcbiAgICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICAgIDwvZGl2PlxuICAgICAgICB7L2lmfVxuICAgICAgPC9kaXY+XG4gICAgPC9kaXY+XG4gIDwvZGl2PlxuXG5cbiAgPGRpdiBjbGFzcz1cImNvbHVtbiBpcy02LWRlc2t0b3BcIiBiaW5kOnRoaXM9e21haW5Db2x1bW59PlxuICAgIDxkaXYgY2xhc3M9XCJib2FyZC13cmFwcGVyIG1iLTNcIiBiaW5kOnRoaXM9e2JvYXJkV3JhcHBlcn0+XG4gICAgICA8ZGl2IGNsYXNzPVwiYm9hcmQtY29udGFpbmVyIGlzMmRcIiBiaW5kOnRoaXM9e2JvYXJkQ29udGFpbmVyfVxuICAgICAgICAgICBzdHlsZT1cIndpZHRoOiB7Ym9hcmRXaWR0aH1weDsgaGVpZ2h0OiB7Ym9hcmRIZWlnaHR9cHg7IHBvc2l0aW9uOiByZWxhdGl2ZTtcIj5cbiAgICAgIDwvZGl2PlxuICAgIDwvZGl2PlxuXG4gICAgeyNpZiBnYW1lUnVubmluZ31cbiAgICAgIDxwcm9ncmVzcyBjbGFzcz1cInByb2dyZXNzIHtwcm9ncmVzc0NsYXNzfVwiIHZhbHVlPVwie3RpbWVFbGFwc2VkfVwiIG1heD1cIjYwXCI+PC9wcm9ncmVzcz5cbiAgICB7L2lmfVxuXG4gICAgPGRpdiBjbGFzcz1cImZpeGVkLWdyaWQgaGFzLTMtY29sc1wiIHN0eWxlPVwid2lkdGg6IHtib2FyZFdpZHRofXB4XCI+XG4gICAgICA8ZGl2IGNsYXNzPVwiZ3JpZFwiPlxuICAgICAgICA8ZGl2IGNsYXNzPVwiY2VsbFwiPlxuICAgICAgICAgIDxidXR0b24gY2xhc3M9XCJidXR0b24gaXMtcHJpbWFyeVwiIGlkPVwiMVwiIG9uOmNsaWNrPXsoKSA9PiBwcm9jZXNzQnV0dG9uKCcxJyl9IGJpbmQ6dGhpcz17YnV0dG9uMX0+MTwvYnV0dG9uPlxuICAgICAgICA8L2Rpdj5cbiAgICAgICAgPGRpdiBjbGFzcz1cImNlbGxcIj5cbiAgICAgICAgICA8YnV0dG9uIGNsYXNzPVwiYnV0dG9uIGlzLXByaW1hcnlcIiBpZD1cIjJcIiBvbjpjbGljaz17KCkgPT4gcHJvY2Vzc0J1dHRvbignMicpfSBiaW5kOnRoaXM9e2J1dHRvbjJ9PjI8L2J1dHRvbj5cbiAgICAgICAgPC9kaXY+XG4gICAgICAgIDxkaXYgY2xhc3M9XCJjZWxsXCI+XG4gICAgICAgICAgPGJ1dHRvbiBjbGFzcz1cImJ1dHRvbiBpcy1wcmltYXJ5XCIgaWQ9XCIzXCIgb246Y2xpY2s9eygpID0+IHByb2Nlc3NCdXR0b24oJzMnKX0gYmluZDp0aGlzPXtidXR0b24zfT4zPC9idXR0b24+XG4gICAgICAgIDwvZGl2PlxuICAgICAgICA8ZGl2IGNsYXNzPVwiY2VsbFwiPlxuICAgICAgICAgIDxidXR0b24gY2xhc3M9XCJidXR0b24gaXMtcHJpbWFyeVwiIGlkPVwiNFwiIG9uOmNsaWNrPXsoKSA9PiBwcm9jZXNzQnV0dG9uKCc0Jyl9IGJpbmQ6dGhpcz17YnV0dG9uNH0+NDwvYnV0dG9uPlxuICAgICAgICA8L2Rpdj5cbiAgICAgICAgPGRpdiBjbGFzcz1cImNlbGxcIj5cbiAgICAgICAgICA8YnV0dG9uIGNsYXNzPVwiYnV0dG9uIGlzLXByaW1hcnlcIiBpZD1cIjVcIiBvbjpjbGljaz17KCkgPT4gcHJvY2Vzc0J1dHRvbignNScpfSBiaW5kOnRoaXM9e2J1dHRvbjV9PjU8L2J1dHRvbj5cbiAgICAgICAgPC9kaXY+XG4gICAgICAgIDxkaXYgY2xhc3M9XCJjZWxsXCI+XG4gICAgICAgICAgPGJ1dHRvbiBjbGFzcz1cImJ1dHRvbiBpcy1wcmltYXJ5XCIgaWQ9XCI2XCIgb246Y2xpY2s9eygpID0+IHByb2Nlc3NCdXR0b24oJzYnKX0gYmluZDp0aGlzPXtidXR0b242fT42PC9idXR0b24+XG4gICAgICAgIDwvZGl2PlxuICAgICAgPC9kaXY+XG4gICAgPC9kaXY+XG4gIDwvZGl2PlxuXG4gIDxkaXYgY2xhc3M9XCJjb2x1bW4gaXMtMy1kZXNrdG9wXCI+XG4gICAgPGRpdiBjbGFzcz1cImJveFwiPlxuICAgICAgeyNpZiByZXN1bHRUZXh0ICE9PSAnJ31cbiAgICAgICAgPGRpdiBpZD1cInJlc3VsdFRleHRcIiBjbGFzcz17cmVzdWx0VGV4dENsYXNzfT57cmVzdWx0VGV4dH08L2Rpdj5cbiAgICAgIHsvaWZ9XG4gICAgPC9kaXY+XG4gIDwvZGl2PlxuXG48L2Rpdj5cblxuPHN0eWxlPlxuICAuY2VsbCBidXR0b24ge1xuICAgIHdpZHRoOiAxMDAlO1xuICAgIGRpc3BsYXk6IGlubGluZS1ibG9jaztcbiAgfVxuXG4gIC5ib2FyZC13cmFwcGVyIHtcbiAgICB3aWR0aDogMTAwJTtcbiAgfVxuPC9zdHlsZT5cblxuXG5cblxuXG4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBNmRFLG9CQUFLLENBQUMscUJBQU8sQ0FDWCxLQUFLLENBQUUsSUFBSSxDQUNYLE9BQU8sQ0FBRSxZQUNYLENBRUEsNENBQWUsQ0FDYixLQUFLLENBQUUsSUFDVCJ9 */");
}

// (391:8) {#if timeRemaining > 0}
function create_if_block_3(ctx) {
	let div;
	let t;

	const block = {
		c: function create() {
			div = element("div");
			t = text(/*timeRemaining*/ ctx[7]);
			attr_dev(div, "id", "timer");
			add_location(div, file, 391, 10, 10520);
		},
		m: function mount(target, anchor) {
			insert_dev(target, div, anchor);
			append_dev(div, t);
		},
		p: function update(ctx, dirty) {
			if (dirty[0] & /*timeRemaining*/ 128) set_data_dev(t, /*timeRemaining*/ ctx[7]);
		},
		d: function destroy(detaching) {
			if (detaching) {
				detach_dev(div);
			}
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_if_block_3.name,
		type: "if",
		source: "(391:8) {#if timeRemaining > 0}",
		ctx
	});

	return block;
}

// (410:8) {#if arrowsShown}
function create_if_block_2(ctx) {
	let div2;
	let div0;
	let t2;
	let div1;
	let t3;
	let t4_value = /*positionData*/ ctx[4].paths.length + "";
	let t4;
	let t5;
	let div3;
	let button;
	let mounted;
	let dispose;

	const block = {
		c: function create() {
			div2 = element("div");
			div0 = element("div");
			div0.textContent = `Minimum # of moves: ${/*getMinimumMovesForCurrentPosition*/ ctx[24]()}`;
			t2 = space();
			div1 = element("div");
			t3 = text("Total unique paths: ");
			t4 = text(t4_value);
			t5 = space();
			div3 = element("div");
			button = element("button");
			button.textContent = "Clear";
			add_location(div0, file, 411, 12, 11184);
			add_location(div1, file, 414, 12, 11293);
			attr_dev(div2, "class", "block has-text-left");
			add_location(div2, file, 410, 10, 11138);
			attr_dev(button, "class", "button is-link");
			add_location(button, file, 419, 12, 11439);
			attr_dev(div3, "class", "block");
			add_location(div3, file, 418, 10, 11407);
		},
		m: function mount(target, anchor) {
			insert_dev(target, div2, anchor);
			append_dev(div2, div0);
			append_dev(div2, t2);
			append_dev(div2, div1);
			append_dev(div1, t3);
			append_dev(div1, t4);
			insert_dev(target, t5, anchor);
			insert_dev(target, div3, anchor);
			append_dev(div3, button);

			if (!mounted) {
				dispose = listen_dev(button, "click", /*click_handler_1*/ ctx[29], false, false);
				mounted = true;
			}
		},
		p: function update(ctx, dirty) {
			if (dirty[0] & /*positionData*/ 16 && t4_value !== (t4_value = /*positionData*/ ctx[4].paths.length + "")) set_data_dev(t4, t4_value);
		},
		d: function destroy(detaching) {
			if (detaching) {
				detach_dev(div2);
				detach_dev(t5);
				detach_dev(div3);
			}

			mounted = false;
			dispose();
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_if_block_2.name,
		type: "if",
		source: "(410:8) {#if arrowsShown}",
		ctx
	});

	return block;
}

// (439:4) {#if gameRunning}
function create_if_block_1(ctx) {
	let progress;
	let progress_class_value;

	const block = {
		c: function create() {
			progress = element("progress");
			attr_dev(progress, "class", progress_class_value = "progress " + /*progressClass*/ ctx[8] + " svelte-1gg0rr3");
			progress.value = /*timeElapsed*/ ctx[1];
			attr_dev(progress, "max", "60");
			add_location(progress, file, 439, 6, 11972);
		},
		m: function mount(target, anchor) {
			insert_dev(target, progress, anchor);
		},
		p: function update(ctx, dirty) {
			if (dirty[0] & /*progressClass*/ 256 && progress_class_value !== (progress_class_value = "progress " + /*progressClass*/ ctx[8] + " svelte-1gg0rr3")) {
				attr_dev(progress, "class", progress_class_value);
			}

			if (dirty[0] & /*timeElapsed*/ 2) {
				prop_dev(progress, "value", /*timeElapsed*/ ctx[1]);
			}
		},
		d: function destroy(detaching) {
			if (detaching) {
				detach_dev(progress);
			}
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_if_block_1.name,
		type: "if",
		source: "(439:4) {#if gameRunning}",
		ctx
	});

	return block;
}

// (469:6) {#if resultText !== ''}
function create_if_block(ctx) {
	let div;
	let t;
	let div_class_value;

	const block = {
		c: function create() {
			div = element("div");
			t = text(/*resultText*/ ctx[12]);
			attr_dev(div, "id", "resultText");
			attr_dev(div, "class", div_class_value = "" + (null_to_empty(/*resultTextClass*/ ctx[13]) + " svelte-1gg0rr3"));
			add_location(div, file, 469, 8, 13254);
		},
		m: function mount(target, anchor) {
			insert_dev(target, div, anchor);
			append_dev(div, t);
		},
		p: function update(ctx, dirty) {
			if (dirty[0] & /*resultText*/ 4096) set_data_dev(t, /*resultText*/ ctx[12]);

			if (dirty[0] & /*resultTextClass*/ 8192 && div_class_value !== (div_class_value = "" + (null_to_empty(/*resultTextClass*/ ctx[13]) + " svelte-1gg0rr3"))) {
				attr_dev(div, "class", div_class_value);
			}
		},
		d: function destroy(detaching) {
			if (detaching) {
				detach_dev(div);
			}
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_if_block.name,
		type: "if",
		source: "(469:6) {#if resultText !== ''}",
		ctx
	});

	return block;
}

function create_fragment(ctx) {
	let link;
	let t0;
	let div24;
	let div10;
	let div3;
	let div2;
	let h20;
	let t2;
	let div0;
	let t3;
	let t4;
	let h21;
	let t6;
	let div1;
	let t7;
	let t8;
	let div6;
	let div5;
	let h22;
	let t10;
	let div4;
	let t11;
	let t12;
	let button0;
	let t13;
	let t14;
	let t15;
	let div9;
	let div8;
	let div7;
	let button1_1;
	let t16;
	let button1_1_disabled_value;
	let t17;
	let t18;
	let div21;
	let div12;
	let div11;
	let t19;
	let t20;
	let div20;
	let div19;
	let div13;
	let button2_1;
	let t22;
	let div14;
	let button3_1;
	let t24;
	let div15;
	let button4_1;
	let t26;
	let div16;
	let button5_1;
	let t28;
	let div17;
	let button6_1;
	let t30;
	let div18;
	let button7;
	let t32;
	let div23;
	let div22;
	let mounted;
	let dispose;
	let if_block0 = /*timeRemaining*/ ctx[7] > 0 && create_if_block_3(ctx);
	let if_block1 = /*arrowsShown*/ ctx[9] && create_if_block_2(ctx);
	let if_block2 = /*gameRunning*/ ctx[0] && create_if_block_1(ctx);
	let if_block3 = /*resultText*/ ctx[12] !== '' && create_if_block(ctx);

	const block = {
		c: function create() {
			link = element("link");
			t0 = space();
			div24 = element("div");
			div10 = element("div");
			div3 = element("div");
			div2 = element("div");
			h20 = element("h2");
			h20.textContent = "Correct";
			t2 = space();
			div0 = element("div");
			t3 = text(/*correctCount*/ ctx[5]);
			t4 = space();
			h21 = element("h2");
			h21.textContent = "Incorrect";
			t6 = space();
			div1 = element("div");
			t7 = text(/*incorrectCount*/ ctx[6]);
			t8 = space();
			div6 = element("div");
			div5 = element("div");
			h22 = element("h2");
			h22.textContent = "High Score";
			t10 = space();
			div4 = element("div");
			t11 = text(/*highScore*/ ctx[10]);
			t12 = space();
			button0 = element("button");
			t13 = text("Start Timed Game");
			t14 = space();
			if (if_block0) if_block0.c();
			t15 = space();
			div9 = element("div");
			div8 = element("div");
			div7 = element("div");
			button1_1 = element("button");
			t16 = text("Show answer");
			t17 = space();
			if (if_block1) if_block1.c();
			t18 = space();
			div21 = element("div");
			div12 = element("div");
			div11 = element("div");
			t19 = space();
			if (if_block2) if_block2.c();
			t20 = space();
			div20 = element("div");
			div19 = element("div");
			div13 = element("div");
			button2_1 = element("button");
			button2_1.textContent = "1";
			t22 = space();
			div14 = element("div");
			button3_1 = element("button");
			button3_1.textContent = "2";
			t24 = space();
			div15 = element("div");
			button4_1 = element("button");
			button4_1.textContent = "3";
			t26 = space();
			div16 = element("div");
			button5_1 = element("button");
			button5_1.textContent = "4";
			t28 = space();
			div17 = element("div");
			button6_1 = element("button");
			button6_1.textContent = "5";
			t30 = space();
			div18 = element("div");
			button7 = element("button");
			button7.textContent = "6";
			t32 = space();
			div23 = element("div");
			div22 = element("div");
			if (if_block3) if_block3.c();
			attr_dev(link, "id", "piece-sprite");
			attr_dev(link, "href", "/piece-css/merida.css");
			attr_dev(link, "rel", "stylesheet");
			add_location(link, file, 371, 0, 9682);
			attr_dev(h20, "class", "is-size-5");
			add_location(h20, file, 377, 8, 9906);
			attr_dev(div0, "class", "score is-size-2");
			add_location(div0, file, 378, 8, 9949);
			attr_dev(h21, "class", "is-size-5");
			add_location(h21, file, 379, 8, 10007);
			attr_dev(div1, "class", "score is-size-2");
			add_location(div1, file, 380, 8, 10052);
			attr_dev(div2, "class", "container has-text-centered");
			add_location(div2, file, 376, 6, 9856);
			attr_dev(div3, "class", "box score-container");
			add_location(div3, file, 375, 4, 9816);
			attr_dev(h22, "class", "is-size-5");
			add_location(h22, file, 385, 8, 10206);
			attr_dev(div4, "class", "score is-size-2");
			add_location(div4, file, 386, 8, 10252);
			attr_dev(button0, "id", "startTimedGame");
			button0.disabled = /*startTimedGameButtonDisabled*/ ctx[11];
			attr_dev(button0, "class", "button is-primary");
			add_location(button0, file, 387, 8, 10307);
			attr_dev(div5, "class", "container has-text-centered");
			add_location(div5, file, 384, 6, 10156);
			attr_dev(div6, "class", "box");
			add_location(div6, file, 383, 4, 10132);
			attr_dev(button1_1, "class", "button is-info");
			button1_1.disabled = button1_1_disabled_value = /*arrowsShown*/ ctx[9] || /*gameRunning*/ ctx[0];
			add_location(button1_1, file, 398, 10, 10704);
			attr_dev(div7, "class", "block");
			add_location(div7, file, 397, 8, 10674);
			attr_dev(div8, "class", "container has-text-centered");
			add_location(div8, file, 396, 6, 10624);
			attr_dev(div9, "class", "box");
			add_location(div9, file, 395, 4, 10600);
			attr_dev(div10, "class", "column is-3-desktop");
			add_location(div10, file, 374, 2, 9778);
			attr_dev(div11, "class", "board-container is2d");
			set_style(div11, "width", /*boardWidth*/ ctx[14] + "px");
			set_style(div11, "height", /*boardHeight*/ ctx[2] + "px");
			set_style(div11, "position", "relative");
			add_location(div11, file, 433, 6, 11770);
			attr_dev(div12, "class", "board-wrapper mb-3 svelte-1gg0rr3");
			add_location(div12, file, 432, 4, 11706);
			attr_dev(button2_1, "class", "button is-primary svelte-1gg0rr3");
			attr_dev(button2_1, "id", "1");
			add_location(button2_1, file, 445, 10, 12201);
			attr_dev(div13, "class", "cell svelte-1gg0rr3");
			add_location(div13, file, 444, 8, 12172);
			attr_dev(button3_1, "class", "button is-primary svelte-1gg0rr3");
			attr_dev(button3_1, "id", "2");
			add_location(button3_1, file, 448, 10, 12361);
			attr_dev(div14, "class", "cell svelte-1gg0rr3");
			add_location(div14, file, 447, 8, 12332);
			attr_dev(button4_1, "class", "button is-primary svelte-1gg0rr3");
			attr_dev(button4_1, "id", "3");
			add_location(button4_1, file, 451, 10, 12521);
			attr_dev(div15, "class", "cell svelte-1gg0rr3");
			add_location(div15, file, 450, 8, 12492);
			attr_dev(button5_1, "class", "button is-primary svelte-1gg0rr3");
			attr_dev(button5_1, "id", "4");
			add_location(button5_1, file, 454, 10, 12681);
			attr_dev(div16, "class", "cell svelte-1gg0rr3");
			add_location(div16, file, 453, 8, 12652);
			attr_dev(button6_1, "class", "button is-primary svelte-1gg0rr3");
			attr_dev(button6_1, "id", "5");
			add_location(button6_1, file, 457, 10, 12841);
			attr_dev(div17, "class", "cell svelte-1gg0rr3");
			add_location(div17, file, 456, 8, 12812);
			attr_dev(button7, "class", "button is-primary svelte-1gg0rr3");
			attr_dev(button7, "id", "6");
			add_location(button7, file, 460, 10, 13001);
			attr_dev(div18, "class", "cell svelte-1gg0rr3");
			add_location(div18, file, 459, 8, 12972);
			attr_dev(div19, "class", "grid");
			add_location(div19, file, 443, 6, 12145);
			attr_dev(div20, "class", "fixed-grid has-3-cols");
			set_style(div20, "width", /*boardWidth*/ ctx[14] + "px");
			add_location(div20, file, 442, 4, 12073);
			attr_dev(div21, "class", "column is-6-desktop");
			add_location(div21, file, 431, 2, 11645);
			attr_dev(div22, "class", "box");
			add_location(div22, file, 467, 4, 13198);
			attr_dev(div23, "class", "column is-3-desktop");
			add_location(div23, file, 466, 2, 13160);
			attr_dev(div24, "class", "columns");
			add_location(div24, file, 373, 0, 9754);
		},
		l: function claim(nodes) {
			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
		},
		m: function mount(target, anchor) {
			insert_dev(target, link, anchor);
			insert_dev(target, t0, anchor);
			insert_dev(target, div24, anchor);
			append_dev(div24, div10);
			append_dev(div10, div3);
			append_dev(div3, div2);
			append_dev(div2, h20);
			append_dev(div2, t2);
			append_dev(div2, div0);
			append_dev(div0, t3);
			append_dev(div2, t4);
			append_dev(div2, h21);
			append_dev(div2, t6);
			append_dev(div2, div1);
			append_dev(div1, t7);
			append_dev(div10, t8);
			append_dev(div10, div6);
			append_dev(div6, div5);
			append_dev(div5, h22);
			append_dev(div5, t10);
			append_dev(div5, div4);
			append_dev(div4, t11);
			append_dev(div5, t12);
			append_dev(div5, button0);
			append_dev(button0, t13);
			append_dev(div5, t14);
			if (if_block0) if_block0.m(div5, null);
			append_dev(div10, t15);
			append_dev(div10, div9);
			append_dev(div9, div8);
			append_dev(div8, div7);
			append_dev(div7, button1_1);
			append_dev(button1_1, t16);
			append_dev(div8, t17);
			if (if_block1) if_block1.m(div8, null);
			append_dev(div24, t18);
			append_dev(div24, div21);
			append_dev(div21, div12);
			append_dev(div12, div11);
			/*div11_binding*/ ctx[30](div11);
			/*div12_binding*/ ctx[31](div12);
			append_dev(div21, t19);
			if (if_block2) if_block2.m(div21, null);
			append_dev(div21, t20);
			append_dev(div21, div20);
			append_dev(div20, div19);
			append_dev(div19, div13);
			append_dev(div13, button2_1);
			/*button2_1_binding*/ ctx[33](button2_1);
			append_dev(div19, t22);
			append_dev(div19, div14);
			append_dev(div14, button3_1);
			/*button3_1_binding*/ ctx[35](button3_1);
			append_dev(div19, t24);
			append_dev(div19, div15);
			append_dev(div15, button4_1);
			/*button4_1_binding*/ ctx[37](button4_1);
			append_dev(div19, t26);
			append_dev(div19, div16);
			append_dev(div16, button5_1);
			/*button5_1_binding*/ ctx[39](button5_1);
			append_dev(div19, t28);
			append_dev(div19, div17);
			append_dev(div17, button6_1);
			/*button6_1_binding*/ ctx[41](button6_1);
			append_dev(div19, t30);
			append_dev(div19, div18);
			append_dev(div18, button7);
			/*button7_binding*/ ctx[43](button7);
			/*div21_binding*/ ctx[44](div21);
			append_dev(div24, t32);
			append_dev(div24, div23);
			append_dev(div23, div22);
			if (if_block3) if_block3.m(div22, null);

			if (!mounted) {
				dispose = [
					listen_dev(button0, "click", /*startTimedGame*/ ctx[23], false, false),
					listen_dev(button1_1, "click", prevent_default(/*click_handler*/ ctx[28]), false, true),
					listen_dev(button2_1, "click", /*click_handler_2*/ ctx[32], false, false),
					listen_dev(button3_1, "click", /*click_handler_3*/ ctx[34], false, false),
					listen_dev(button4_1, "click", /*click_handler_4*/ ctx[36], false, false),
					listen_dev(button5_1, "click", /*click_handler_5*/ ctx[38], false, false),
					listen_dev(button6_1, "click", /*click_handler_6*/ ctx[40], false, false),
					listen_dev(button7, "click", /*click_handler_7*/ ctx[42], false, false)
				];

				mounted = true;
			}
		},
		p: function update(ctx, dirty) {
			if (dirty[0] & /*correctCount*/ 32) set_data_dev(t3, /*correctCount*/ ctx[5]);
			if (dirty[0] & /*incorrectCount*/ 64) set_data_dev(t7, /*incorrectCount*/ ctx[6]);
			if (dirty[0] & /*highScore*/ 1024) set_data_dev(t11, /*highScore*/ ctx[10]);

			if (dirty[0] & /*startTimedGameButtonDisabled*/ 2048) {
				prop_dev(button0, "disabled", /*startTimedGameButtonDisabled*/ ctx[11]);
			}

			if (/*timeRemaining*/ ctx[7] > 0) {
				if (if_block0) {
					if_block0.p(ctx, dirty);
				} else {
					if_block0 = create_if_block_3(ctx);
					if_block0.c();
					if_block0.m(div5, null);
				}
			} else if (if_block0) {
				if_block0.d(1);
				if_block0 = null;
			}

			if (dirty[0] & /*arrowsShown, gameRunning*/ 513 && button1_1_disabled_value !== (button1_1_disabled_value = /*arrowsShown*/ ctx[9] || /*gameRunning*/ ctx[0])) {
				prop_dev(button1_1, "disabled", button1_1_disabled_value);
			}

			if (/*arrowsShown*/ ctx[9]) {
				if (if_block1) {
					if_block1.p(ctx, dirty);
				} else {
					if_block1 = create_if_block_2(ctx);
					if_block1.c();
					if_block1.m(div8, null);
				}
			} else if (if_block1) {
				if_block1.d(1);
				if_block1 = null;
			}

			if (dirty[0] & /*boardWidth*/ 16384) {
				set_style(div11, "width", /*boardWidth*/ ctx[14] + "px");
			}

			if (dirty[0] & /*boardHeight*/ 4) {
				set_style(div11, "height", /*boardHeight*/ ctx[2] + "px");
			}

			if (/*gameRunning*/ ctx[0]) {
				if (if_block2) {
					if_block2.p(ctx, dirty);
				} else {
					if_block2 = create_if_block_1(ctx);
					if_block2.c();
					if_block2.m(div21, t20);
				}
			} else if (if_block2) {
				if_block2.d(1);
				if_block2 = null;
			}

			if (dirty[0] & /*boardWidth*/ 16384) {
				set_style(div20, "width", /*boardWidth*/ ctx[14] + "px");
			}

			if (/*resultText*/ ctx[12] !== '') {
				if (if_block3) {
					if_block3.p(ctx, dirty);
				} else {
					if_block3 = create_if_block(ctx);
					if_block3.c();
					if_block3.m(div22, null);
				}
			} else if (if_block3) {
				if_block3.d(1);
				if_block3 = null;
			}
		},
		i: noop,
		o: noop,
		d: function destroy(detaching) {
			if (detaching) {
				detach_dev(link);
				detach_dev(t0);
				detach_dev(div24);
			}

			if (if_block0) if_block0.d();
			if (if_block1) if_block1.d();
			/*div11_binding*/ ctx[30](null);
			/*div12_binding*/ ctx[31](null);
			if (if_block2) if_block2.d();
			/*button2_1_binding*/ ctx[33](null);
			/*button3_1_binding*/ ctx[35](null);
			/*button4_1_binding*/ ctx[37](null);
			/*button5_1_binding*/ ctx[39](null);
			/*button6_1_binding*/ ctx[41](null);
			/*button7_binding*/ ctx[43](null);
			/*div21_binding*/ ctx[44](null);
			if (if_block3) if_block3.d();
			mounted = false;
			run_all(dispose);
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_fragment.name,
		type: "component",
		source: "",
		ctx
	});

	return block;
}

function getRandomIndex(max) {
	return Math.floor(Math.random() * max);
}

function getRandomElement(array) {
	const index = getRandomIndex(array.length);
	return array[index];
}

function sortRandomly(array) {
	return array.sort(() => Math.random() - 0.5);
}

function getMovePairsFromPath(path) {
	const pairs = [];

	for (let i = 0; i < path.length - 1; i++) {
		pairs.push([path[i], path[i + 1]]);
	}

	return pairs;
}

function animateElement(element, animationClass) {
	element.classList.add(animationClass);

	// Listen for the animationend event
	element.addEventListener(
		'animationend',
		function () {
			// Once the animation ends, remove the class
			element.classList.remove(animationClass);
		},
		{ once: true }
	); // The listener is removed after it's invoked once
}

function instance($$self, $$props, $$invalidate) {
	let { $$slots: slots = {}, $$scope } = $$props;
	validate_slots('KnightMoves', slots, []);
	let chessground;
	let jsonData = knightMovesData;
	let positionData = null;
	let correctCount = 0;
	let incorrectCount = 0;
	let gameRunning = false;
	let timeRemaining = null;
	let timeElapsed = null;
	let gameStartTime = null;
	let progressClass = 'is-success';
	let animating = false;
	let arrowsShown;
	let highScore = 0;
	let maxPathsToDisplayOption;
	let animationLengthOption;
	let knightSquare;
	let kingSquare;
	let config;
	let configForm;
	let startTimedGameButtonDisabled = false;
	let resultText = '';
	let resultTextClass = '';
	let boardWidth = 512;
	let boardHeight = 512;
	let padding = 80;
	let button1;
	let button2;
	let button3;
	let button4;
	let button5;
	let button6;
	let mainColumn;
	let boardContainer;
	let boardWrapper;

	onMount(() => {
		initConfig();

		chessground = Chessground(boardContainer, {
			fen: '8/8/8/8/8/8/8/8',
			animation: {
				enabled: true,
				duration: animationLengthOption.getValue()
			},
			highlight: { lastMove: false },
			draggable: false,
			selectable: false
		});

		resize();
		window.addEventListener('resize', resize);
		initKeyboardShortcuts();
		resize();
		newPosition();
	});

	function resize() {
		const width = boardWrapper.offsetWidth;
		const totalHeight = window.innerHeight;
		const minButtonHeight = 30;
		const maxHeight = totalHeight - 2 * minButtonHeight - padding;
		const boardDimensions = Math.min(width, maxHeight);
		$$invalidate(2, boardHeight = boardDimensions);
		$$invalidate(14, boardWidth = boardDimensions);
	}

	function getButton(id) {
		switch (id) {
			case 1:
				return button1;
			case 2:
				return button2;
			case 3:
				return button3;
			case 4:
				return button4;
			case 5:
				return button5;
			case 6:
				return button6;
		}
	}

	function initKeyboardShortcuts() {
		window.addEventListener('keydown', event => {
			const key = event.key;

			if (key >= '1' && key <= '6') {
				// Trigger click event on corresponding button
				const button = getButton(parseInt(key));

				button.click();
			}
		});
	}

	function startTimedGame() {
		reset();
		$$invalidate(11, startTimedGameButtonDisabled = true);
		$$invalidate(0, gameRunning = true);
		$$invalidate(7, timeRemaining = 60);
		$$invalidate(1, timeElapsed = 0);
		gameStartTime = performance.now() / 1000;
		newPosition();

		setTimeout(
			() => {
				endGame();
			},
			60000
		); // 1 minute

		const timerInterval = setInterval(
			() => {
				if (timeRemaining === 0) {
					clearInterval(timerInterval);
				}

				$$invalidate(7, timeRemaining -= 1);
			},
			1000
		);

		const progressInterval = setInterval(
			() => {
				if (timeRemaining === 0) {
					clearInterval(progressInterval);
				}

				$$invalidate(1, timeElapsed = performance.now() / 1000 - gameStartTime);
			},
			10
		);
	}

	function endGame() {
		if (correctCount > highScore && gameRunning) {
			$$invalidate(10, highScore = correctCount);
		}

		if (incorrectCount > 0) {
			$$invalidate(13, resultTextClass = 'incorrect');
			$$invalidate(12, resultText = `Incorrect, game over! The correct answer was ${getMinimumMovesForCurrentPosition()}. Your score was ${correctCount}.`);
		} else {
			$$invalidate(13, resultTextClass = 'correct');
			$$invalidate(12, resultText = `Time's up! Your score was ${correctCount}.`);
		}

		$$invalidate(0, gameRunning = false);
		$$invalidate(7, timeRemaining = null);
		$$invalidate(1, timeElapsed = null);
		$$invalidate(5, correctCount = 0);
		$$invalidate(6, incorrectCount = 0);
		$$invalidate(11, startTimedGameButtonDisabled = false);
	}

	function reset() {
		$$invalidate(5, correctCount = 0);
		$$invalidate(6, incorrectCount = 0);
		$$invalidate(0, gameRunning = false);
		$$invalidate(11, startTimedGameButtonDisabled = false);
		$$invalidate(12, resultText = '');
		$$invalidate(13, resultTextClass = '');
	}

	function getMinimumMovesForCurrentPosition() {
		return positionData.min_length;
	}

	function getPathsForCurrentPosition() {
		return positionData.paths;
	}

	function processButton(id) {
		if (animating) {
			return;
		}

		const number = parseInt(id);
		const minimum = getMinimumMovesForCurrentPosition();
		const button = getButton(number);

		if (number === minimum) {
			$$invalidate(5, correctCount += 1);
			animateElement(button, 'correctAnswer');
			$$invalidate(13, resultTextClass = 'correct');
			$$invalidate(12, resultText = `${number} was correct!`);
			newPosition();
		} else {
			$$invalidate(6, incorrectCount += 1);
			animateElement(button, 'incorrectAnswer');

			if (gameRunning) {
				endGame();
			} else {
				$$invalidate(12, resultText = `${number} was incorrect. The correct answer was ${minimum}.`);
				$$invalidate(13, resultTextClass = 'incorrect');
			}

			const correctPaths = positionData.paths;
			const randomlySorted = sortRandomly(correctPaths);
			const pathToAnimate = randomlySorted[0];
			const movePairs = getMovePairsFromPath(pathToAnimate);
			drawCorrectArrows(randomlySorted);

			makeSequentialMoves(movePairs, () => {
				newPosition();
			});
		}
	}

	function drawCorrectArrows(validPaths) {
		const shapes = [];
		const brushes = chessground.state.drawable.brushes;
		const brushKeys = Object.keys(brushes);
		let maxPathsToShow = maxPathsToDisplayOption.getValue();

		if (maxPathsToShow < 1) {
			maxPathsToShow = 1;
		}

		validPaths.forEach((path, index) => {
			if (index + 1 > maxPathsToShow) {
				return;
			}

			const movePairs = getMovePairsFromPath(path);
			const brushKey = brushKeys[index % brushKeys.length];

			movePairs.forEach(pair => {
				const shape = {
					orig: pair[0],
					dest: pair[1],
					brush: brushKey,
					modifiers: { hilite: false, lineWidth: 5 }
				};

				shapes.push(shape);
			});
		});

		const mainPath = validPaths[0];
		const mainMovePairs = getMovePairsFromPath(mainPath);

		mainMovePairs.forEach(pair => {
			const shape = {
				orig: pair[0],
				dest: pair[1],
				brush: 'green',
				modifiers: { ineWidth: 10 }
			};

			shapes.push(shape);
		});

		chessground.set({ drawable: { shapes } });
	}

	function makeSequentialMoves(movePairs = [], callback = null) {
		animating = true;

		if (movePairs.length < 1) {
			animating = false;

			if (callback) {
				callback();
			}

			return;
		}

		// shift mutates the array
		const move = movePairs.shift();

		chessground.move(move[0], move[1]);
		setTimeout(() => makeSequentialMoves(movePairs, callback), animationLengthOption.getValue());
	}

	function clearDrawings() {
		$$invalidate(9, arrowsShown = false);
		chessground.set({ drawable: { shapes: [] } });
	}

	function newPosition() {
		clearDrawings();
		const keys = Object.keys(jsonData);
		const index = getRandomIndex(keys.length);
		const key = keys[index];
		const previousKnightSquare = knightSquare;
		const previousKingSquare = kingSquare;
		const squares = key.split('.');
		knightSquare = squares[0];
		kingSquare = squares[1];
		$$invalidate(4, positionData = jsonData[key]);
		const king = { role: 'king', color: 'black' };
		const knight = { role: 'knight', color: 'white' };
		const piecesDiff = new Map();

		if (previousKnightSquare && previousKingSquare) {
			piecesDiff.set(previousKnightSquare, undefined);
			piecesDiff.set(previousKingSquare, undefined);
		}

		piecesDiff.set(kingSquare, king);
		piecesDiff.set(knightSquare, knight);
		chessground.setPieces(piecesDiff);
		chessground.setPieces(new Map());
	}

	function initConfig() {
		config = new Config('knight_moves_game');
		animationLengthOption = config.getConfigOption('Animation length (ms)', 300);
		maxPathsToDisplayOption = config.getConfigOption('Max paths to show', 6);
		configForm = new ConfigForm(config);
		configForm.addLinkToDOM('config');
	}

	const writable_props = [];

	Object_1.keys($$props).forEach(key => {
		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<KnightMoves> was created with unknown prop '${key}'`);
	});

	const click_handler = () => {
		if (positionData) {
			$$invalidate(9, arrowsShown = true);
			const correctPaths = positionData.paths;
			const randomlySorted = sortRandomly(correctPaths);
			drawCorrectArrows(randomlySorted);
		}
	};

	const click_handler_1 = () => {
		clearDrawings();
	};

	function div11_binding($$value) {
		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
			boardContainer = $$value;
			$$invalidate(21, boardContainer);
		});
	}

	function div12_binding($$value) {
		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
			boardWrapper = $$value;
			$$invalidate(22, boardWrapper);
		});
	}

	const click_handler_2 = () => processButton('1');

	function button2_1_binding($$value) {
		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
			button1 = $$value;
			(($$invalidate(3, button1), $$invalidate(2, boardHeight)), $$invalidate(55, padding));
		});
	}

	const click_handler_3 = () => processButton('2');

	function button3_1_binding($$value) {
		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
			button2 = $$value;
			((($$invalidate(15, button2), $$invalidate(2, boardHeight)), $$invalidate(3, button1)), $$invalidate(55, padding));
		});
	}

	const click_handler_4 = () => processButton('3');

	function button4_1_binding($$value) {
		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
			button3 = $$value;
			((($$invalidate(16, button3), $$invalidate(2, boardHeight)), $$invalidate(3, button1)), $$invalidate(55, padding));
		});
	}

	const click_handler_5 = () => processButton('4');

	function button5_1_binding($$value) {
		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
			button4 = $$value;
			((($$invalidate(17, button4), $$invalidate(2, boardHeight)), $$invalidate(3, button1)), $$invalidate(55, padding));
		});
	}

	const click_handler_6 = () => processButton('5');

	function button6_1_binding($$value) {
		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
			button5 = $$value;
			((($$invalidate(18, button5), $$invalidate(2, boardHeight)), $$invalidate(3, button1)), $$invalidate(55, padding));
		});
	}

	const click_handler_7 = () => processButton('6');

	function button7_binding($$value) {
		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
			button6 = $$value;
			((($$invalidate(19, button6), $$invalidate(2, boardHeight)), $$invalidate(3, button1)), $$invalidate(55, padding));
		});
	}

	function div21_binding($$value) {
		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
			mainColumn = $$value;
			$$invalidate(20, mainColumn);
		});
	}

	$$self.$capture_state = () => ({
		onMount,
		Chessground,
		knightMovesData,
		Config,
		ConfigForm,
		chessground,
		jsonData,
		positionData,
		correctCount,
		incorrectCount,
		gameRunning,
		timeRemaining,
		timeElapsed,
		gameStartTime,
		progressClass,
		animating,
		arrowsShown,
		highScore,
		maxPathsToDisplayOption,
		animationLengthOption,
		knightSquare,
		kingSquare,
		config,
		configForm,
		startTimedGameButtonDisabled,
		resultText,
		resultTextClass,
		boardWidth,
		boardHeight,
		padding,
		button1,
		button2,
		button3,
		button4,
		button5,
		button6,
		mainColumn,
		boardContainer,
		boardWrapper,
		resize,
		getButton,
		initKeyboardShortcuts,
		startTimedGame,
		endGame,
		reset,
		getRandomIndex,
		getRandomElement,
		sortRandomly,
		getMinimumMovesForCurrentPosition,
		getPathsForCurrentPosition,
		processButton,
		drawCorrectArrows,
		getMovePairsFromPath,
		makeSequentialMoves,
		clearDrawings,
		newPosition,
		animateElement,
		initConfig
	});

	$$self.$inject_state = $$props => {
		if ('chessground' in $$props) chessground = $$props.chessground;
		if ('jsonData' in $$props) jsonData = $$props.jsonData;
		if ('positionData' in $$props) $$invalidate(4, positionData = $$props.positionData);
		if ('correctCount' in $$props) $$invalidate(5, correctCount = $$props.correctCount);
		if ('incorrectCount' in $$props) $$invalidate(6, incorrectCount = $$props.incorrectCount);
		if ('gameRunning' in $$props) $$invalidate(0, gameRunning = $$props.gameRunning);
		if ('timeRemaining' in $$props) $$invalidate(7, timeRemaining = $$props.timeRemaining);
		if ('timeElapsed' in $$props) $$invalidate(1, timeElapsed = $$props.timeElapsed);
		if ('gameStartTime' in $$props) gameStartTime = $$props.gameStartTime;
		if ('progressClass' in $$props) $$invalidate(8, progressClass = $$props.progressClass);
		if ('animating' in $$props) animating = $$props.animating;
		if ('arrowsShown' in $$props) $$invalidate(9, arrowsShown = $$props.arrowsShown);
		if ('highScore' in $$props) $$invalidate(10, highScore = $$props.highScore);
		if ('maxPathsToDisplayOption' in $$props) maxPathsToDisplayOption = $$props.maxPathsToDisplayOption;
		if ('animationLengthOption' in $$props) animationLengthOption = $$props.animationLengthOption;
		if ('knightSquare' in $$props) knightSquare = $$props.knightSquare;
		if ('kingSquare' in $$props) kingSquare = $$props.kingSquare;
		if ('config' in $$props) config = $$props.config;
		if ('configForm' in $$props) configForm = $$props.configForm;
		if ('startTimedGameButtonDisabled' in $$props) $$invalidate(11, startTimedGameButtonDisabled = $$props.startTimedGameButtonDisabled);
		if ('resultText' in $$props) $$invalidate(12, resultText = $$props.resultText);
		if ('resultTextClass' in $$props) $$invalidate(13, resultTextClass = $$props.resultTextClass);
		if ('boardWidth' in $$props) $$invalidate(14, boardWidth = $$props.boardWidth);
		if ('boardHeight' in $$props) $$invalidate(2, boardHeight = $$props.boardHeight);
		if ('padding' in $$props) $$invalidate(55, padding = $$props.padding);
		if ('button1' in $$props) $$invalidate(3, button1 = $$props.button1);
		if ('button2' in $$props) $$invalidate(15, button2 = $$props.button2);
		if ('button3' in $$props) $$invalidate(16, button3 = $$props.button3);
		if ('button4' in $$props) $$invalidate(17, button4 = $$props.button4);
		if ('button5' in $$props) $$invalidate(18, button5 = $$props.button5);
		if ('button6' in $$props) $$invalidate(19, button6 = $$props.button6);
		if ('mainColumn' in $$props) $$invalidate(20, mainColumn = $$props.mainColumn);
		if ('boardContainer' in $$props) $$invalidate(21, boardContainer = $$props.boardContainer);
		if ('boardWrapper' in $$props) $$invalidate(22, boardWrapper = $$props.boardWrapper);
	};

	if ($$props && "$$inject" in $$props) {
		$$self.$inject_state($$props.$$inject);
	}

	$$self.$$.update = () => {
		if ($$self.$$.dirty[0] & /*gameRunning, timeElapsed*/ 3) {
			{
				if (gameRunning) {
					const percentDone = timeElapsed / 60;

					if (percentDone < 0.7) {
						$$invalidate(8, progressClass = 'is-success');
					} else if (percentDone < 0.9) {
						$$invalidate(8, progressClass = 'is-warning');
					} else {
						$$invalidate(8, progressClass = 'is-danger');
					}
				} else {
					$$invalidate(8, progressClass = 'is-success');
				}
			}
		}

		if ($$self.$$.dirty[0] & /*boardHeight, button1*/ 12) {
			{
				const totalHeight = window.innerHeight;
				const remainingHeight = totalHeight - boardHeight;

				if (button1) {
					const maxHeight = button1.offsetWidth;
					const calculatedHeight = remainingHeight / 2 - padding;
					const buttonHeight = Math.min(maxHeight, calculatedHeight);
					$$invalidate(3, button1.style.height = `${buttonHeight}px`, button1);
					$$invalidate(15, button2.style.height = `${buttonHeight}px`, button2);
					$$invalidate(16, button3.style.height = `${buttonHeight}px`, button3);
					$$invalidate(17, button4.style.height = `${buttonHeight}px`, button4);
					$$invalidate(18, button5.style.height = `${buttonHeight}px`, button5);
					$$invalidate(19, button6.style.height = `${buttonHeight}px`, button6);
				}
			}
		}
	};

	return [
		gameRunning,
		timeElapsed,
		boardHeight,
		button1,
		positionData,
		correctCount,
		incorrectCount,
		timeRemaining,
		progressClass,
		arrowsShown,
		highScore,
		startTimedGameButtonDisabled,
		resultText,
		resultTextClass,
		boardWidth,
		button2,
		button3,
		button4,
		button5,
		button6,
		mainColumn,
		boardContainer,
		boardWrapper,
		startTimedGame,
		getMinimumMovesForCurrentPosition,
		processButton,
		drawCorrectArrows,
		clearDrawings,
		click_handler,
		click_handler_1,
		div11_binding,
		div12_binding,
		click_handler_2,
		button2_1_binding,
		click_handler_3,
		button3_1_binding,
		click_handler_4,
		button4_1_binding,
		click_handler_5,
		button5_1_binding,
		click_handler_6,
		button6_1_binding,
		click_handler_7,
		button7_binding,
		div21_binding
	];
}

class KnightMoves extends SvelteComponentDev {
	constructor(options) {
		super(options);
		init(this, options, instance, create_fragment, safe_not_equal, {}, add_css, [-1, -1, -1]);

		dispatch_dev("SvelteRegisterComponent", {
			component: this,
			tagName: "KnightMoves",
			options,
			id: create_fragment.name
		});
	}
}

export { KnightMoves as default };
//# sourceMappingURL=knight_moves.js.map
