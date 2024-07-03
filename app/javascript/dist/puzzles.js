import { Util } from 'src/util';

/** @returns {void} */
function noop() {}

const identity = (x) => x;

/**
 * @template T
 * @template S
 * @param {T} tar
 * @param {S} src
 * @returns {T & S}
 */
function assign(tar, src) {
	// @ts-ignore
	for (const k in src) tar[k] = src[k];
	return /** @type {T & S} */ (tar);
}

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

/** @returns {void} */
function validate_store(store, name) {
	if (store != null && typeof store.subscribe !== 'function') {
		throw new Error(`'${name}' is not a store with a 'subscribe' method`);
	}
}

function subscribe(store, ...callbacks) {
	if (store == null) {
		for (const callback of callbacks) {
			callback(undefined);
		}
		return noop;
	}
	const unsub = store.subscribe(...callbacks);
	return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
}

/** @returns {void} */
function component_subscribe(component, store, callback) {
	component.$$.on_destroy.push(subscribe(store, callback));
}

function create_slot(definition, ctx, $$scope, fn) {
	if (definition) {
		const slot_ctx = get_slot_context(definition, ctx, $$scope, fn);
		return definition[0](slot_ctx);
	}
}

function get_slot_context(definition, ctx, $$scope, fn) {
	return definition[1] && fn ? assign($$scope.ctx.slice(), definition[1](fn(ctx))) : $$scope.ctx;
}

function get_slot_changes(definition, $$scope, dirty, fn) {
	if (definition[2] && fn) {
		const lets = definition[2](fn(dirty));
		if ($$scope.dirty === undefined) {
			return lets;
		}
		if (typeof lets === 'object') {
			const merged = [];
			const len = Math.max($$scope.dirty.length, lets.length);
			for (let i = 0; i < len; i += 1) {
				merged[i] = $$scope.dirty[i] | lets[i];
			}
			return merged;
		}
		return $$scope.dirty | lets;
	}
	return $$scope.dirty;
}

/** @returns {void} */
function update_slot_base(
	slot,
	slot_definition,
	ctx,
	$$scope,
	slot_changes,
	get_slot_context_fn
) {
	if (slot_changes) {
		const slot_context = get_slot_context(slot_definition, ctx, $$scope, get_slot_context_fn);
		slot.p(slot_context, slot_changes);
	}
}

/** @returns {any[] | -1} */
function get_all_dirty_from_scope($$scope) {
	if ($$scope.ctx.length > 32) {
		const dirty = [];
		const length = $$scope.ctx.length / 32;
		for (let i = 0; i < length; i++) {
			dirty[i] = -1;
		}
		return dirty;
	}
	return -1;
}

const is_client = typeof window !== 'undefined';

/** @type {() => number} */
let now = is_client ? () => window.performance.now() : () => Date.now();

let raf = is_client ? (cb) => requestAnimationFrame(cb) : noop;

const tasks = new Set();

/**
 * @param {number} now
 * @returns {void}
 */
function run_tasks(now) {
	tasks.forEach((task) => {
		if (!task.c(now)) {
			tasks.delete(task);
			task.f();
		}
	});
	if (tasks.size !== 0) raf(run_tasks);
}

/**
 * Creates a new task that runs on each raf frame
 * until it returns a falsy value or is aborted
 * @param {import('./private.js').TaskCallback} callback
 * @returns {import('./private.js').Task}
 */
function loop(callback) {
	/** @type {import('./private.js').TaskEntry} */
	let task;
	if (tasks.size === 0) raf(run_tasks);
	return {
		promise: new Promise((fulfill) => {
			tasks.add((task = { c: callback, f: fulfill }));
		}),
		abort() {
			tasks.delete(task);
		}
	};
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
 * @param {Node} node
 * @returns {CSSStyleSheet}
 */
function append_empty_stylesheet(node) {
	const style_element = element('style');
	// For transitions to work without 'style-src: unsafe-inline' Content Security Policy,
	// these empty tags need to be allowed with a hash as a workaround until we move to the Web Animations API.
	// Using the hash for the empty string (for an empty tag) works in all browsers except Safari.
	// So as a workaround for the workaround, when we append empty style tags we set their content to /* empty */.
	// The hash 'sha256-9OlNO0DNEeaVzHL4RZwCLsBHA8WBQ8toBp/4F5XV2nc=' will then work even in Safari.
	style_element.textContent = '/* empty */';
	append_stylesheet(get_root_for_style(node), style_element);
	return style_element.sheet;
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
 * @returns {Text} */
function empty() {
	return text('');
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

/** @returns {number} */
function to_number(value) {
	return value === '' ? null : +value;
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
function set_input_value(input, value) {
	input.value = value == null ? '' : value;
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
// unfortunately this can't be a constant as that wouldn't be tree-shakeable
// so we cache the result instead

/**
 * @type {boolean} */
let crossorigin;

/**
 * @returns {boolean} */
function is_crossorigin() {
	if (crossorigin === undefined) {
		crossorigin = false;
		try {
			if (typeof window !== 'undefined' && window.parent) {
				void window.parent.document;
			}
		} catch (error) {
			crossorigin = true;
		}
	}
	return crossorigin;
}

/**
 * @param {HTMLElement} node
 * @param {() => void} fn
 * @returns {() => void}
 */
function add_iframe_resize_listener(node, fn) {
	const computed_style = getComputedStyle(node);
	if (computed_style.position === 'static') {
		node.style.position = 'relative';
	}
	const iframe = element('iframe');
	iframe.setAttribute(
		'style',
		'display: block; position: absolute; top: 0; left: 0; width: 100%; height: 100%; ' +
			'overflow: hidden; border: 0; opacity: 0; pointer-events: none; z-index: -1;'
	);
	iframe.setAttribute('aria-hidden', 'true');
	iframe.tabIndex = -1;
	const crossorigin = is_crossorigin();

	/**
	 * @type {() => void}
	 */
	let unsubscribe;
	if (crossorigin) {
		iframe.src = "data:text/html,<script>onresize=function(){parent.postMessage(0,'*')}</script>";
		unsubscribe = listen(
			window,
			'message',
			/** @param {MessageEvent} event */ (event) => {
				if (event.source === iframe.contentWindow) fn();
			}
		);
	} else {
		iframe.src = 'about:blank';
		iframe.onload = () => {
			unsubscribe = listen(iframe.contentWindow, 'resize', fn);
			// make sure an initial resize event is fired _after_ the iframe is loaded (which is asynchronous)
			// see https://github.com/sveltejs/svelte/issues/4233
			fn();
		};
	}
	append(node, iframe);
	return () => {
		if (crossorigin) {
			unsubscribe();
		} else if (unsubscribe && iframe.contentWindow) {
			unsubscribe();
		}
		detach(iframe);
	};
}

/**
 * @returns {void} */
function toggle_class(element, name, toggle) {
	// The `!!` is required because an `undefined` flag means flipping the current state.
	element.classList.toggle(name, !!toggle);
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

// we need to store the information for multiple documents because a Svelte application could also contain iframes
// https://github.com/sveltejs/svelte/issues/3624
/** @type {Map<Document | ShadowRoot, import('./private.d.ts').StyleInformation>} */
const managed_styles = new Map();

let active = 0;

// https://github.com/darkskyapp/string-hash/blob/master/index.js
/**
 * @param {string} str
 * @returns {number}
 */
function hash$1(str) {
	let hash = 5381;
	let i = str.length;
	while (i--) hash = ((hash << 5) - hash) ^ str.charCodeAt(i);
	return hash >>> 0;
}

/**
 * @param {Document | ShadowRoot} doc
 * @param {Element & ElementCSSInlineStyle} node
 * @returns {{ stylesheet: any; rules: {}; }}
 */
function create_style_information(doc, node) {
	const info = { stylesheet: append_empty_stylesheet(node), rules: {} };
	managed_styles.set(doc, info);
	return info;
}

/**
 * @param {Element & ElementCSSInlineStyle} node
 * @param {number} a
 * @param {number} b
 * @param {number} duration
 * @param {number} delay
 * @param {(t: number) => number} ease
 * @param {(t: number, u: number) => string} fn
 * @param {number} uid
 * @returns {string}
 */
function create_rule(node, a, b, duration, delay, ease, fn, uid = 0) {
	const step = 16.666 / duration;
	let keyframes = '{\n';
	for (let p = 0; p <= 1; p += step) {
		const t = a + (b - a) * ease(p);
		keyframes += p * 100 + `%{${fn(t, 1 - t)}}\n`;
	}
	const rule = keyframes + `100% {${fn(b, 1 - b)}}\n}`;
	const name = `__svelte_${hash$1(rule)}_${uid}`;
	const doc = get_root_for_style(node);
	const { stylesheet, rules } = managed_styles.get(doc) || create_style_information(doc, node);
	if (!rules[name]) {
		rules[name] = true;
		stylesheet.insertRule(`@keyframes ${name} ${rule}`, stylesheet.cssRules.length);
	}
	const animation = node.style.animation || '';
	node.style.animation = `${
		animation ? `${animation}, ` : ''
	}${name} ${duration}ms linear ${delay}ms 1 both`;
	active += 1;
	return name;
}

/**
 * @param {Element & ElementCSSInlineStyle} node
 * @param {string} [name]
 * @returns {void}
 */
function delete_rule(node, name) {
	const previous = (node.style.animation || '').split(', ');
	const next = previous.filter(
		name
			? (anim) => anim.indexOf(name) < 0 // remove specific animation
			: (anim) => anim.indexOf('__svelte') === -1 // remove all Svelte animations
	);
	const deleted = previous.length - next.length;
	if (deleted) {
		node.style.animation = next.join(', ');
		active -= deleted;
		if (!active) clear_rules();
	}
}

/** @returns {void} */
function clear_rules() {
	raf(() => {
		if (active) return;
		managed_styles.forEach((info) => {
			const { ownerNode } = info.stylesheet;
			// there is no ownerNode if it runs on jsdom.
			if (ownerNode) detach(ownerNode);
		});
		managed_styles.clear();
	});
}

/**
 * @param {Element & ElementCSSInlineStyle} node
 * @param {import('./private.js').PositionRect} from
 * @param {import('./private.js').AnimationFn} fn
 */
function create_animation(node, from, fn, params) {
	if (!from) return noop;
	const to = node.getBoundingClientRect();
	if (
		from.left === to.left &&
		from.right === to.right &&
		from.top === to.top &&
		from.bottom === to.bottom
	)
		return noop;
	const {
		delay = 0,
		duration = 300,
		easing = identity,
		// @ts-ignore todo: should this be separated from destructuring? Or start/end added to public api and documentation?
		start: start_time = now() + delay,
		// @ts-ignore todo:
		end = start_time + duration,
		tick = noop,
		css
	} = fn(node, { from, to }, params);
	let running = true;
	let started = false;
	let name;
	/** @returns {void} */
	function start() {
		if (css) {
			name = create_rule(node, 0, 1, duration, delay, easing, css);
		}
		if (!delay) {
			started = true;
		}
	}
	/** @returns {void} */
	function stop() {
		if (css) delete_rule(node, name);
		running = false;
	}
	loop((now) => {
		if (!started && now >= start_time) {
			started = true;
		}
		if (started && now >= end) {
			tick(1, 0);
			stop();
		}
		if (!running) {
			return false;
		}
		if (started) {
			const p = now - start_time;
			const t = 0 + 1 * easing(p / duration);
			tick(t, 1 - t);
		}
		return true;
	});
	start();
	tick(0, 1);
	return stop;
}

/**
 * @param {Element & ElementCSSInlineStyle} node
 * @returns {void}
 */
function fix_position(node) {
	const style = getComputedStyle(node);
	if (style.position !== 'absolute' && style.position !== 'fixed') {
		const { width, height } = style;
		const a = node.getBoundingClientRect();
		node.style.position = 'absolute';
		node.style.width = width;
		node.style.height = height;
		add_transform(node, a);
	}
}

/**
 * @param {Element & ElementCSSInlineStyle} node
 * @param {import('./private.js').PositionRect} a
 * @returns {void}
 */
function add_transform(node, a) {
	const b = node.getBoundingClientRect();
	if (a.left !== b.left || a.top !== b.top) {
		const style = getComputedStyle(node);
		const transform = style.transform === 'none' ? '' : style.transform;
		node.style.transform = `${transform} translate(${a.left - b.left}px, ${a.top - b.top}px)`;
	}
}

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

/** @returns {void} */
function add_flush_callback(fn) {
	flush_callbacks.push(fn);
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

/**
 * @type {Promise<void> | null}
 */
let promise;

/**
 * @returns {Promise<void>}
 */
function wait() {
	if (!promise) {
		promise = Promise.resolve();
		promise.then(() => {
			promise = null;
		});
	}
	return promise;
}

/**
 * @param {Element} node
 * @param {INTRO | OUTRO | boolean} direction
 * @param {'start' | 'end'} kind
 * @returns {void}
 */
function dispatch(node, direction, kind) {
	node.dispatchEvent(custom_event(`${direction ? 'intro' : 'outro'}${kind}`));
}

const outroing = new Set();

/**
 * @type {Outro}
 */
let outros;

/**
 * @returns {void} */
function group_outros() {
	outros = {
		r: 0,
		c: [],
		p: outros // parent group
	};
}

/**
 * @returns {void} */
function check_outros() {
	if (!outros.r) {
		run_all(outros.c);
	}
	outros = outros.p;
}

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

/**
 * @param {import('./private.js').Fragment} block
 * @param {0 | 1} local
 * @param {0 | 1} [detach]
 * @param {() => void} [callback]
 * @returns {void}
 */
function transition_out(block, local, detach, callback) {
	if (block && block.o) {
		if (outroing.has(block)) return;
		outroing.add(block);
		outros.c.push(() => {
			outroing.delete(block);
			if (callback) {
				if (detach) block.d(1);
				callback();
			}
		});
		block.o(local);
	} else if (callback) {
		callback();
	}
}

/**
 * @type {import('../transition/public.js').TransitionConfig}
 */
const null_transition = { duration: 0 };

/**
 * @param {Element & ElementCSSInlineStyle} node
 * @param {TransitionFn} fn
 * @param {any} params
 * @param {boolean} intro
 * @returns {{ run(b: 0 | 1): void; end(): void; }}
 */
function create_bidirectional_transition(node, fn, params, intro) {
	/**
	 * @type {TransitionOptions} */
	const options = { direction: 'both' };
	let config = fn(node, params, options);
	let t = intro ? 0 : 1;

	/**
	 * @type {Program | null} */
	let running_program = null;

	/**
	 * @type {PendingProgram | null} */
	let pending_program = null;
	let animation_name = null;

	/** @type {boolean} */
	let original_inert_value;

	/**
	 * @returns {void} */
	function clear_animation() {
		if (animation_name) delete_rule(node, animation_name);
	}

	/**
	 * @param {PendingProgram} program
	 * @param {number} duration
	 * @returns {Program}
	 */
	function init(program, duration) {
		const d = /** @type {Program['d']} */ (program.b - t);
		duration *= Math.abs(d);
		return {
			a: t,
			b: program.b,
			d,
			duration,
			start: program.start,
			end: program.start + duration,
			group: program.group
		};
	}

	/**
	 * @param {INTRO | OUTRO} b
	 * @returns {void}
	 */
	function go(b) {
		const {
			delay = 0,
			duration = 300,
			easing = identity,
			tick = noop,
			css
		} = config || null_transition;

		/**
		 * @type {PendingProgram} */
		const program = {
			start: now() + delay,
			b
		};

		if (!b) {
			// @ts-ignore todo: improve typings
			program.group = outros;
			outros.r += 1;
		}

		if ('inert' in node) {
			if (b) {
				if (original_inert_value !== undefined) {
					// aborted/reversed outro — restore previous inert value
					node.inert = original_inert_value;
				}
			} else {
				original_inert_value = /** @type {HTMLElement} */ (node).inert;
				node.inert = true;
			}
		}

		if (running_program || pending_program) {
			pending_program = program;
		} else {
			// if this is an intro, and there's a delay, we need to do
			// an initial tick and/or apply CSS animation immediately
			if (css) {
				clear_animation();
				animation_name = create_rule(node, t, b, duration, delay, easing, css);
			}
			if (b) tick(0, 1);
			running_program = init(program, duration);
			add_render_callback(() => dispatch(node, b, 'start'));
			loop((now) => {
				if (pending_program && now > pending_program.start) {
					running_program = init(pending_program, duration);
					pending_program = null;
					dispatch(node, running_program.b, 'start');
					if (css) {
						clear_animation();
						animation_name = create_rule(
							node,
							t,
							running_program.b,
							running_program.duration,
							0,
							easing,
							config.css
						);
					}
				}
				if (running_program) {
					if (now >= running_program.end) {
						tick((t = running_program.b), 1 - t);
						dispatch(node, running_program.b, 'end');
						if (!pending_program) {
							// we're done
							if (running_program.b) {
								// intro — we can tidy up immediately
								clear_animation();
							} else {
								// outro — needs to be coordinated
								if (!--running_program.group.r) run_all(running_program.group.c);
							}
						}
						running_program = null;
					} else if (now >= running_program.start) {
						const p = now - running_program.start;
						t = running_program.a + running_program.d * easing(p / running_program.duration);
						tick(t, 1 - t);
					}
				}
				return !!(running_program || pending_program);
			});
		}
	}
	return {
		run(b) {
			if (is_function(config)) {
				wait().then(() => {
					const opts = { direction: b ? 'in' : 'out' };
					// @ts-ignore
					config = config(opts);
					go(b);
				});
			} else {
				go(b);
			}
		},
		end() {
			clear_animation();
			running_program = pending_program = null;
		}
	};
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

// general each functions:

function ensure_array_like(array_like_or_iterator) {
	return array_like_or_iterator?.length !== undefined
		? array_like_or_iterator
		: Array.from(array_like_or_iterator);
}

// keyed each functions:

/** @returns {void} */
function destroy_block(block, lookup) {
	block.d(1);
	lookup.delete(block.key);
}

/** @returns {void} */
function fix_and_destroy_block(block, lookup) {
	block.f();
	destroy_block(block, lookup);
}

/** @returns {any[]} */
function update_keyed_each(
	old_blocks,
	dirty,
	get_key,
	dynamic,
	ctx,
	list,
	lookup,
	node,
	destroy,
	create_each_block,
	next,
	get_context
) {
	let o = old_blocks.length;
	let n = list.length;
	let i = o;
	const old_indexes = {};
	while (i--) old_indexes[old_blocks[i].key] = i;
	const new_blocks = [];
	const new_lookup = new Map();
	const deltas = new Map();
	const updates = [];
	i = n;
	while (i--) {
		const child_ctx = get_context(ctx, list, i);
		const key = get_key(child_ctx);
		let block = lookup.get(key);
		if (!block) {
			block = create_each_block(key, child_ctx);
			block.c();
		} else {
			// defer updates until all the DOM shuffling is done
			updates.push(() => block.p(child_ctx, dirty));
		}
		new_lookup.set(key, (new_blocks[i] = block));
		if (key in old_indexes) deltas.set(key, Math.abs(i - old_indexes[key]));
	}
	const will_move = new Set();
	const did_move = new Set();
	/** @returns {void} */
	function insert(block) {
		transition_in(block, 1);
		block.m(node, next);
		lookup.set(block.key, block);
		next = block.first;
		n--;
	}
	while (o && n) {
		const new_block = new_blocks[n - 1];
		const old_block = old_blocks[o - 1];
		const new_key = new_block.key;
		const old_key = old_block.key;
		if (new_block === old_block) {
			// do nothing
			next = new_block.first;
			o--;
			n--;
		} else if (!new_lookup.has(old_key)) {
			// remove old block
			destroy(old_block, lookup);
			o--;
		} else if (!lookup.has(new_key) || will_move.has(new_key)) {
			insert(new_block);
		} else if (did_move.has(old_key)) {
			o--;
		} else if (deltas.get(new_key) > deltas.get(old_key)) {
			did_move.add(new_key);
			insert(new_block);
		} else {
			will_move.add(old_key);
			o--;
		}
	}
	while (o--) {
		const old_block = old_blocks[o];
		if (!new_lookup.has(old_block.key)) destroy(old_block, lookup);
	}
	while (n) insert(new_blocks[n - 1]);
	run_all(updates);
	return new_blocks;
}

/** @returns {void} */
function validate_each_keys(ctx, list, get_context, get_key) {
	const keys = new Map();
	for (let i = 0; i < list.length; i++) {
		const key = get_key(get_context(ctx, list, i));
		if (keys.has(key)) {
			let value = '';
			try {
				value = `with value '${String(key)}' `;
			} catch (e) {
				// can't stringify
			}
			throw new Error(
				`Cannot have duplicate keys in a keyed each: Keys at index ${keys.get(
					key
				)} and ${i} ${value}are duplicates`
			);
		}
		keys.set(key, i);
	}
}

/** @returns {void} */
function bind(component, name, callback) {
	const index = component.$$.props[name];
	if (index !== undefined) {
		component.$$.bound[index] = callback;
		callback(component.$$.ctx[index]);
	}
}

/** @returns {void} */
function create_component(block) {
	block && block.c();
}

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
		options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
	if (has_prevent_default) modifiers.push('preventDefault');
	if (has_stop_propagation) modifiers.push('stopPropagation');
	if (has_stop_immediate_propagation) modifiers.push('stopImmediatePropagation');
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

function ensure_array_like_dev(arg) {
	if (
		typeof arg !== 'string' &&
		!(arg && typeof arg === 'object' && 'length' in arg) &&
		!(typeof Symbol === 'function' && arg && Symbol.iterator in arg)
	) {
		throw new Error('{#each} only works with iterable values.');
	}
	return ensure_array_like(arg);
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
const opposite$1 = (c) => (c === 'white' ? 'black' : 'white');
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
    state.orientation = opposite$1(state.orientation);
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
    state.turnColor = opposite$1(state.turnColor);
    return true;
}
function baseUserMove(state, orig, dest) {
    const result = baseMove(state, orig, dest);
    if (result) {
        state.movable.dests = undefined;
        state.turnColor = opposite$1(state.turnColor);
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
const makePiece$1 = (key, piece) => ({
    key: key,
    pos: key2pos(key),
    piece: piece,
});
const closer = (piece, pieces) => pieces.sort((p1, p2) => distanceSq(piece.pos, p1.pos) - distanceSq(piece.pos, p2.pos))[0];
function computePlan(prevPieces, current) {
    const anims = new Map(), animedOrigs = [], fadings = new Map(), missings = [], news = [], prePieces = new Map();
    let curP, preP, vector;
    for (const [k, p] of prevPieces) {
        prePieces.set(k, makePiece$1(k, p));
    }
    for (const key of allKeys) {
        curP = current.pieces.get(key);
        preP = prePieces.get(key);
        if (curP) {
            if (preP) {
                if (!samePiece(curP, preP.piece)) {
                    missings.push(preP);
                    news.push(makePiece$1(key, curP));
                }
            }
            else
                news.push(makePiece$1(key, curP));
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

const subscriber_queue = [];

/**
 * Create a `Writable` store that allows both updating and reading by subscription.
 *
 * https://svelte.dev/docs/svelte-store#writable
 * @template T
 * @param {T} [value] initial value
 * @param {import('./public.js').StartStopNotifier<T>} [start]
 * @returns {import('./public.js').Writable<T>}
 */
function writable(value, start = noop) {
	/** @type {import('./public.js').Unsubscriber} */
	let stop;
	/** @type {Set<import('./private.js').SubscribeInvalidateTuple<T>>} */
	const subscribers = new Set();
	/** @param {T} new_value
	 * @returns {void}
	 */
	function set(new_value) {
		if (safe_not_equal(value, new_value)) {
			value = new_value;
			if (stop) {
				// store is ready
				const run_queue = !subscriber_queue.length;
				for (const subscriber of subscribers) {
					subscriber[1]();
					subscriber_queue.push(subscriber, value);
				}
				if (run_queue) {
					for (let i = 0; i < subscriber_queue.length; i += 2) {
						subscriber_queue[i][0](subscriber_queue[i + 1]);
					}
					subscriber_queue.length = 0;
				}
			}
		}
	}

	/**
	 * @param {import('./public.js').Updater<T>} fn
	 * @returns {void}
	 */
	function update(fn) {
		set(fn(value));
	}

	/**
	 * @param {import('./public.js').Subscriber<T>} run
	 * @param {import('./private.js').Invalidator<T>} [invalidate]
	 * @returns {import('./public.js').Unsubscriber}
	 */
	function subscribe(run, invalidate = noop) {
		/** @type {import('./private.js').SubscribeInvalidateTuple<T>} */
		const subscriber = [run, invalidate];
		subscribers.add(subscriber);
		if (subscribers.size === 1) {
			stop = start(set, update) || noop;
		}
		run(value);
		return () => {
			subscribers.delete(subscriber);
			if (subscribers.size === 0 && stop) {
				stop();
				stop = null;
			}
		};
	}
	return { set, update, subscribe };
}

// index.ts
var stores = {
  local: {},
  session: {}
};
function getStorage(type) {
  return type === "local" ? localStorage : sessionStorage;
}
function persisted(key, initialValue, options) {
  var _a, _b, _c, _d, _e, _f, _g, _h;
  if (options == null ? void 0 : options.onError)
    console.warn("onError has been deprecated. Please use onWriteError instead");
  const serializer = (_a = options == null ? void 0 : options.serializer) != null ? _a : JSON;
  const storageType = (_b = options == null ? void 0 : options.storage) != null ? _b : "local";
  const syncTabs = (_c = options == null ? void 0 : options.syncTabs) != null ? _c : true;
  const onWriteError = (_e = (_d = options == null ? void 0 : options.onWriteError) != null ? _d : options == null ? void 0 : options.onError) != null ? _e : (e) => console.error(`Error when writing value from persisted store "${key}" to ${storageType}`, e);
  const onParseError = (_f = options == null ? void 0 : options.onParseError) != null ? _f : (newVal, e) => console.error(`Error when parsing ${newVal ? '"' + newVal + '"' : "value"} from persisted store "${key}"`, e);
  const beforeRead = (_g = options == null ? void 0 : options.beforeRead) != null ? _g : (val) => val;
  const beforeWrite = (_h = options == null ? void 0 : options.beforeWrite) != null ? _h : (val) => val;
  const browser = typeof window !== "undefined" && typeof document !== "undefined";
  const storage = browser ? getStorage(storageType) : null;
  function updateStorage(key2, value) {
    const newVal = beforeWrite(value);
    try {
      storage == null ? void 0 : storage.setItem(key2, serializer.stringify(newVal));
    } catch (e) {
      onWriteError(e);
    }
  }
  function maybeLoadInitial() {
    function serialize(json2) {
      try {
        return serializer.parse(json2);
      } catch (e) {
        onParseError(json2, e);
      }
    }
    const json = storage == null ? void 0 : storage.getItem(key);
    if (json == null)
      return initialValue;
    const serialized = serialize(json);
    if (serialized == null)
      return initialValue;
    const newVal = beforeRead(serialized);
    return newVal;
  }
  if (!stores[storageType][key]) {
    const initial = maybeLoadInitial();
    const store = writable(initial, (set2) => {
      if (browser && storageType == "local" && syncTabs) {
        const handleStorage = (event) => {
          if (event.key === key && event.newValue) {
            let newVal;
            try {
              newVal = serializer.parse(event.newValue);
            } catch (e) {
              onParseError(event.newValue, e);
              return;
            }
            const processedVal = beforeRead(newVal);
            set2(processedVal);
          }
        };
        window.addEventListener("storage", handleStorage);
        return () => window.removeEventListener("storage", handleStorage);
      }
    });
    const { subscribe, set } = store;
    stores[storageType][key] = {
      set(value) {
        set(value);
        updateStorage(key, value);
      },
      update(callback) {
        return store.update((last) => {
          const value = callback(last);
          updateStorage(key, value);
          return value;
        });
      },
      reset() {
        this.set(initialValue);
      },
      subscribe
    };
  }
  return stores[storageType][key];
}

const pieceSet = persisted("global.pieceSet", "merida");
const boardStyle = persisted("global.boardStyle", "brown");

boardStyle.subscribe((value) => {
  if (document.body) {
    document.body.dataset.board = value;
  }
});

/* svelte/components/Chessboard.svelte generated by Svelte v4.2.18 */
const file$2 = "svelte/components/Chessboard.svelte";

function add_css$1(target) {
	append_styles(target, "svelte-iagpad", ".board-wrapper.svelte-iagpad{position:relative;width:100%}.centered-content.svelte-iagpad{position:absolute;top:50%;left:50%;transform:translate(-50%, -50%);z-index:3;opacity:0.8}\n/*# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQ2hlc3Nib2FyZC5zdmVsdGUiLCJzb3VyY2VzIjpbIkNoZXNzYm9hcmQuc3ZlbHRlIl0sInNvdXJjZXNDb250ZW50IjpbIjxzY3JpcHQ+XG4gIGltcG9ydCB7IG9uTW91bnQgfSBmcm9tIFwic3ZlbHRlXCI7XG4gIGltcG9ydCB7IENoZXNzZ3JvdW5kIH0gZnJvbSBcImNoZXNzZ3JvdW5kXCI7XG4gIGltcG9ydCB7IHBpZWNlU2V0IH0gZnJvbSBcIi4uL3N0b3Jlc1wiO1xuXG4gIGxldCBib2FyZENvbnRhaW5lcjtcbiAgZXhwb3J0IGxldCBjaGVzc2dyb3VuZENvbmZpZyA9IHt9O1xuICBleHBvcnQgbGV0IG9yaWVudGF0aW9uID0gXCJ3aGl0ZVwiO1xuXG4gIGV4cG9ydCBsZXQgZmVuID0gbnVsbDtcblxuICAkOiB7XG4gICAgaWYgKGNoZXNzZ3JvdW5kICYmIGZlbikge1xuICAgICAgY2hlc3Nncm91bmQuc2V0KHtcbiAgICAgICAgZmVuOiBmZW4sXG4gICAgICAgIGhpZ2hsaWdodDoge1xuICAgICAgICAgIGxhc3RNb3ZlOiBmYWxzZSxcbiAgICAgICAgICBjaGVjazogZmFsc2UsXG4gICAgICAgIH0sXG4gICAgICB9KTtcbiAgICB9XG4gIH1cblxuICBleHBvcnQgbGV0IGNoZXNzZ3JvdW5kO1xuICBleHBvcnQgbGV0IHNpemU7XG5cbiAgZXhwb3J0IGxldCBwaWVjZVNldE92ZXJyaWRlID0gbnVsbDtcbiAgZXhwb3J0IGxldCBib2FyZFN0eWxlT3ZlcnJpZGUgPSBudWxsO1xuXG4gIGxldCBtYXhXaWR0aCA9IFwiNzB2aFwiO1xuXG4gICQ6IHtcbiAgICBpZiAob3JpZW50YXRpb24gJiYgY2hlc3Nncm91bmQpIHtcbiAgICAgIGNoZXNzZ3JvdW5kLnNldCh7IG9yaWVudGF0aW9uOiBvcmllbnRhdGlvbiB9KTtcbiAgICB9XG4gIH1cblxuICBvbk1vdW50KCgpID0+IHtcbiAgICBjaGVzc2dyb3VuZCA9IENoZXNzZ3JvdW5kKGJvYXJkQ29udGFpbmVyLCBjaGVzc2dyb3VuZENvbmZpZyk7XG4gIH0pO1xuPC9zY3JpcHQ+XG5cbnsjaWYgcGllY2VTZXRPdmVycmlkZX1cbiAgPGxpbmtcbiAgICBpZD1cInBpZWNlLXNwcml0ZVwiXG4gICAgaHJlZj1cIi9waWVjZS1jc3Mve3BpZWNlU2V0T3ZlcnJpZGV9LmNzc1wiXG4gICAgcmVsPVwic3R5bGVzaGVldFwiXG4gIC8+XG57OmVsc2V9XG4gIDxsaW5rIGlkPVwicGllY2Utc3ByaXRlXCIgaHJlZj1cIi9waWVjZS1jc3MveyRwaWVjZVNldH0uY3NzXCIgcmVsPVwic3R5bGVzaGVldFwiIC8+XG57L2lmfVxuXG48ZGl2XG4gIGNsYXNzPVwiYm9hcmQtd3JhcHBlclwiXG4gIHN0eWxlPVwibWF4LXdpZHRoOiB7bWF4V2lkdGh9XCJcbiAgYmluZDpjbGllbnRXaWR0aD17c2l6ZX1cbj5cbiAgPGRpdiBjbGFzcz1cImNlbnRlcmVkLWNvbnRlbnRcIj5cbiAgICA8c2xvdCBuYW1lPVwiY2VudGVyZWQtY29udGVudFwiPjwvc2xvdD5cbiAgPC9kaXY+XG4gIDxkaXZcbiAgICBjbGFzcz1cImlzMmQge2JvYXJkU3R5bGVPdmVycmlkZSA/IGJvYXJkU3R5bGVPdmVycmlkZSA6ICcnfVwiXG4gICAgYmluZDp0aGlzPXtib2FyZENvbnRhaW5lcn1cbiAgICBzdHlsZT1cInBvc2l0aW9uOiByZWxhdGl2ZTt3aWR0aDoge3NpemV9cHg7IGhlaWdodDoge3NpemV9cHhcIlxuICA+PC9kaXY+XG4gIDxkaXYgY2xhc3M9XCJibG9jayBtdC0yXCI+XG4gICAgPHNsb3QgbmFtZT1cImJlbG93LWJvYXJkXCI+PC9zbG90PlxuICA8L2Rpdj5cbjwvZGl2PlxuXG48c3R5bGU+XG4gIC5ib2FyZC13cmFwcGVyIHtcbiAgICBwb3NpdGlvbjogcmVsYXRpdmU7XG4gICAgd2lkdGg6IDEwMCU7XG4gIH1cbiAgLmNlbnRlcmVkLWNvbnRlbnQge1xuICAgIHBvc2l0aW9uOiBhYnNvbHV0ZTtcbiAgICB0b3A6IDUwJTtcbiAgICBsZWZ0OiA1MCU7XG4gICAgdHJhbnNmb3JtOiB0cmFuc2xhdGUoLTUwJSwgLTUwJSk7XG4gICAgei1pbmRleDogMzsgLyogcmVxdWlyZWQgdG8gYXBwZWFyIGluIGZyb250IG9mIHBpZWNlcyAqL1xuICAgIG9wYWNpdHk6IDAuODtcbiAgfVxuPC9zdHlsZT5cbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUF1RUUsNEJBQWUsQ0FDYixRQUFRLENBQUUsUUFBUSxDQUNsQixLQUFLLENBQUUsSUFDVCxDQUNBLCtCQUFrQixDQUNoQixRQUFRLENBQUUsUUFBUSxDQUNsQixHQUFHLENBQUUsR0FBRyxDQUNSLElBQUksQ0FBRSxHQUFHLENBQ1QsU0FBUyxDQUFFLFVBQVUsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQ2hDLE9BQU8sQ0FBRSxDQUFDLENBQ1YsT0FBTyxDQUFFLEdBQ1gifQ== */");
}

const get_below_board_slot_changes = dirty => ({});
const get_below_board_slot_context = ctx => ({});
const get_centered_content_slot_changes = dirty => ({});
const get_centered_content_slot_context = ctx => ({});

// (49:0) {:else}
function create_else_block$2(ctx) {
	let link;
	let link_href_value;

	const block = {
		c: function create() {
			link = element("link");
			attr_dev(link, "id", "piece-sprite");
			attr_dev(link, "href", link_href_value = "/piece-css/" + /*$pieceSet*/ ctx[4] + ".css");
			attr_dev(link, "rel", "stylesheet");
			add_location(link, file$2, 49, 2, 931);
		},
		m: function mount(target, anchor) {
			insert_dev(target, link, anchor);
		},
		p: function update(ctx, dirty) {
			if (dirty & /*$pieceSet*/ 16 && link_href_value !== (link_href_value = "/piece-css/" + /*$pieceSet*/ ctx[4] + ".css")) {
				attr_dev(link, "href", link_href_value);
			}
		},
		d: function destroy(detaching) {
			if (detaching) {
				detach_dev(link);
			}
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_else_block$2.name,
		type: "else",
		source: "(49:0) {:else}",
		ctx
	});

	return block;
}

// (43:0) {#if pieceSetOverride}
function create_if_block$2(ctx) {
	let link;
	let link_href_value;

	const block = {
		c: function create() {
			link = element("link");
			attr_dev(link, "id", "piece-sprite");
			attr_dev(link, "href", link_href_value = "/piece-css/" + /*pieceSetOverride*/ ctx[1] + ".css");
			attr_dev(link, "rel", "stylesheet");
			add_location(link, file$2, 43, 2, 822);
		},
		m: function mount(target, anchor) {
			insert_dev(target, link, anchor);
		},
		p: function update(ctx, dirty) {
			if (dirty & /*pieceSetOverride*/ 2 && link_href_value !== (link_href_value = "/piece-css/" + /*pieceSetOverride*/ ctx[1] + ".css")) {
				attr_dev(link, "href", link_href_value);
			}
		},
		d: function destroy(detaching) {
			if (detaching) {
				detach_dev(link);
			}
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_if_block$2.name,
		type: "if",
		source: "(43:0) {#if pieceSetOverride}",
		ctx
	});

	return block;
}

function create_fragment$2(ctx) {
	let t0;
	let div3;
	let div0;
	let t1;
	let div1;
	let div1_class_value;
	let t2;
	let div2;
	let div3_resize_listener;
	let current;

	function select_block_type(ctx, dirty) {
		if (/*pieceSetOverride*/ ctx[1]) return create_if_block$2;
		return create_else_block$2;
	}

	let current_block_type = select_block_type(ctx);
	let if_block = current_block_type(ctx);
	const centered_content_slot_template = /*#slots*/ ctx[11]["centered-content"];
	const centered_content_slot = create_slot(centered_content_slot_template, ctx, /*$$scope*/ ctx[10], get_centered_content_slot_context);
	const below_board_slot_template = /*#slots*/ ctx[11]["below-board"];
	const below_board_slot = create_slot(below_board_slot_template, ctx, /*$$scope*/ ctx[10], get_below_board_slot_context);

	const block = {
		c: function create() {
			if_block.c();
			t0 = space();
			div3 = element("div");
			div0 = element("div");
			if (centered_content_slot) centered_content_slot.c();
			t1 = space();
			div1 = element("div");
			t2 = space();
			div2 = element("div");
			if (below_board_slot) below_board_slot.c();
			attr_dev(div0, "class", "centered-content svelte-iagpad");
			add_location(div0, file$2, 57, 2, 1107);

			attr_dev(div1, "class", div1_class_value = "is2d " + (/*boardStyleOverride*/ ctx[2]
			? /*boardStyleOverride*/ ctx[2]
			: '') + " svelte-iagpad");

			set_style(div1, "position", "relative");
			set_style(div1, "width", /*size*/ ctx[0] + "px");
			set_style(div1, "height", /*size*/ ctx[0] + "px");
			add_location(div1, file$2, 60, 2, 1191);
			attr_dev(div2, "class", "block mt-2");
			add_location(div2, file$2, 65, 2, 1368);
			attr_dev(div3, "class", "board-wrapper svelte-iagpad");
			set_style(div3, "max-width", /*maxWidth*/ ctx[5]);
			add_render_callback(() => /*div3_elementresize_handler*/ ctx[13].call(div3));
			add_location(div3, file$2, 52, 0, 1016);
		},
		l: function claim(nodes) {
			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
		},
		m: function mount(target, anchor) {
			if_block.m(target, anchor);
			insert_dev(target, t0, anchor);
			insert_dev(target, div3, anchor);
			append_dev(div3, div0);

			if (centered_content_slot) {
				centered_content_slot.m(div0, null);
			}

			append_dev(div3, t1);
			append_dev(div3, div1);
			/*div1_binding*/ ctx[12](div1);
			append_dev(div3, t2);
			append_dev(div3, div2);

			if (below_board_slot) {
				below_board_slot.m(div2, null);
			}

			div3_resize_listener = add_iframe_resize_listener(div3, /*div3_elementresize_handler*/ ctx[13].bind(div3));
			current = true;
		},
		p: function update(ctx, [dirty]) {
			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block) {
				if_block.p(ctx, dirty);
			} else {
				if_block.d(1);
				if_block = current_block_type(ctx);

				if (if_block) {
					if_block.c();
					if_block.m(t0.parentNode, t0);
				}
			}

			if (centered_content_slot) {
				if (centered_content_slot.p && (!current || dirty & /*$$scope*/ 1024)) {
					update_slot_base(
						centered_content_slot,
						centered_content_slot_template,
						ctx,
						/*$$scope*/ ctx[10],
						!current
						? get_all_dirty_from_scope(/*$$scope*/ ctx[10])
						: get_slot_changes(centered_content_slot_template, /*$$scope*/ ctx[10], dirty, get_centered_content_slot_changes),
						get_centered_content_slot_context
					);
				}
			}

			if (!current || dirty & /*boardStyleOverride*/ 4 && div1_class_value !== (div1_class_value = "is2d " + (/*boardStyleOverride*/ ctx[2]
			? /*boardStyleOverride*/ ctx[2]
			: '') + " svelte-iagpad")) {
				attr_dev(div1, "class", div1_class_value);
			}

			if (!current || dirty & /*size*/ 1) {
				set_style(div1, "width", /*size*/ ctx[0] + "px");
			}

			if (!current || dirty & /*size*/ 1) {
				set_style(div1, "height", /*size*/ ctx[0] + "px");
			}

			if (below_board_slot) {
				if (below_board_slot.p && (!current || dirty & /*$$scope*/ 1024)) {
					update_slot_base(
						below_board_slot,
						below_board_slot_template,
						ctx,
						/*$$scope*/ ctx[10],
						!current
						? get_all_dirty_from_scope(/*$$scope*/ ctx[10])
						: get_slot_changes(below_board_slot_template, /*$$scope*/ ctx[10], dirty, get_below_board_slot_changes),
						get_below_board_slot_context
					);
				}
			}
		},
		i: function intro(local) {
			if (current) return;
			transition_in(centered_content_slot, local);
			transition_in(below_board_slot, local);
			current = true;
		},
		o: function outro(local) {
			transition_out(centered_content_slot, local);
			transition_out(below_board_slot, local);
			current = false;
		},
		d: function destroy(detaching) {
			if (detaching) {
				detach_dev(t0);
				detach_dev(div3);
			}

			if_block.d(detaching);
			if (centered_content_slot) centered_content_slot.d(detaching);
			/*div1_binding*/ ctx[12](null);
			if (below_board_slot) below_board_slot.d(detaching);
			div3_resize_listener();
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_fragment$2.name,
		type: "component",
		source: "",
		ctx
	});

	return block;
}

function instance$2($$self, $$props, $$invalidate) {
	let $pieceSet;
	validate_store(pieceSet, 'pieceSet');
	component_subscribe($$self, pieceSet, $$value => $$invalidate(4, $pieceSet = $$value));
	let { $$slots: slots = {}, $$scope } = $$props;
	validate_slots('Chessboard', slots, ['centered-content','below-board']);
	let boardContainer;
	let { chessgroundConfig = {} } = $$props;
	let { orientation = "white" } = $$props;
	let { fen = null } = $$props;
	let { chessground } = $$props;
	let { size } = $$props;
	let { pieceSetOverride = null } = $$props;
	let { boardStyleOverride = null } = $$props;
	let maxWidth = "70vh";

	onMount(() => {
		$$invalidate(6, chessground = Chessground(boardContainer, chessgroundConfig));
	});

	$$self.$$.on_mount.push(function () {
		if (chessground === undefined && !('chessground' in $$props || $$self.$$.bound[$$self.$$.props['chessground']])) {
			console.warn("<Chessboard> was created without expected prop 'chessground'");
		}

		if (size === undefined && !('size' in $$props || $$self.$$.bound[$$self.$$.props['size']])) {
			console.warn("<Chessboard> was created without expected prop 'size'");
		}
	});

	const writable_props = [
		'chessgroundConfig',
		'orientation',
		'fen',
		'chessground',
		'size',
		'pieceSetOverride',
		'boardStyleOverride'
	];

	Object.keys($$props).forEach(key => {
		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Chessboard> was created with unknown prop '${key}'`);
	});

	function div1_binding($$value) {
		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
			boardContainer = $$value;
			$$invalidate(3, boardContainer);
		});
	}

	function div3_elementresize_handler() {
		size = this.clientWidth;
		$$invalidate(0, size);
	}

	$$self.$$set = $$props => {
		if ('chessgroundConfig' in $$props) $$invalidate(7, chessgroundConfig = $$props.chessgroundConfig);
		if ('orientation' in $$props) $$invalidate(8, orientation = $$props.orientation);
		if ('fen' in $$props) $$invalidate(9, fen = $$props.fen);
		if ('chessground' in $$props) $$invalidate(6, chessground = $$props.chessground);
		if ('size' in $$props) $$invalidate(0, size = $$props.size);
		if ('pieceSetOverride' in $$props) $$invalidate(1, pieceSetOverride = $$props.pieceSetOverride);
		if ('boardStyleOverride' in $$props) $$invalidate(2, boardStyleOverride = $$props.boardStyleOverride);
		if ('$$scope' in $$props) $$invalidate(10, $$scope = $$props.$$scope);
	};

	$$self.$capture_state = () => ({
		onMount,
		Chessground,
		pieceSet,
		boardContainer,
		chessgroundConfig,
		orientation,
		fen,
		chessground,
		size,
		pieceSetOverride,
		boardStyleOverride,
		maxWidth,
		$pieceSet
	});

	$$self.$inject_state = $$props => {
		if ('boardContainer' in $$props) $$invalidate(3, boardContainer = $$props.boardContainer);
		if ('chessgroundConfig' in $$props) $$invalidate(7, chessgroundConfig = $$props.chessgroundConfig);
		if ('orientation' in $$props) $$invalidate(8, orientation = $$props.orientation);
		if ('fen' in $$props) $$invalidate(9, fen = $$props.fen);
		if ('chessground' in $$props) $$invalidate(6, chessground = $$props.chessground);
		if ('size' in $$props) $$invalidate(0, size = $$props.size);
		if ('pieceSetOverride' in $$props) $$invalidate(1, pieceSetOverride = $$props.pieceSetOverride);
		if ('boardStyleOverride' in $$props) $$invalidate(2, boardStyleOverride = $$props.boardStyleOverride);
		if ('maxWidth' in $$props) $$invalidate(5, maxWidth = $$props.maxWidth);
	};

	if ($$props && "$$inject" in $$props) {
		$$self.$inject_state($$props.$$inject);
	}

	$$self.$$.update = () => {
		if ($$self.$$.dirty & /*chessground, fen*/ 576) {
			{
				if (chessground && fen) {
					chessground.set({
						fen,
						highlight: { lastMove: false, check: false }
					});
				}
			}
		}

		if ($$self.$$.dirty & /*orientation, chessground*/ 320) {
			{
				if (orientation && chessground) {
					chessground.set({ orientation });
				}
			}
		}
	};

	return [
		size,
		pieceSetOverride,
		boardStyleOverride,
		boardContainer,
		$pieceSet,
		maxWidth,
		chessground,
		chessgroundConfig,
		orientation,
		fen,
		$$scope,
		slots,
		div1_binding,
		div3_elementresize_handler
	];
}

class Chessboard extends SvelteComponentDev {
	constructor(options) {
		super(options);

		init(
			this,
			options,
			instance$2,
			create_fragment$2,
			safe_not_equal,
			{
				chessgroundConfig: 7,
				orientation: 8,
				fen: 9,
				chessground: 6,
				size: 0,
				pieceSetOverride: 1,
				boardStyleOverride: 2
			},
			add_css$1
		);

		dispatch_dev("SvelteRegisterComponent", {
			component: this,
			tagName: "Chessboard",
			options,
			id: create_fragment$2.name
		});
	}

	get chessgroundConfig() {
		throw new Error("<Chessboard>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	set chessgroundConfig(value) {
		throw new Error("<Chessboard>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	get orientation() {
		throw new Error("<Chessboard>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	set orientation(value) {
		throw new Error("<Chessboard>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	get fen() {
		throw new Error("<Chessboard>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	set fen(value) {
		throw new Error("<Chessboard>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	get chessground() {
		throw new Error("<Chessboard>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	set chessground(value) {
		throw new Error("<Chessboard>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	get size() {
		throw new Error("<Chessboard>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	set size(value) {
		throw new Error("<Chessboard>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	get pieceSetOverride() {
		throw new Error("<Chessboard>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	set pieceSetOverride(value) {
		throw new Error("<Chessboard>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	get boardStyleOverride() {
		throw new Error("<Chessboard>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	set boardStyleOverride(value) {
		throw new Error("<Chessboard>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}
}

class r{unwrap(r,t){const e=this._chain(t=>n.ok(r?r(t):t),r=>t?n.ok(t(r)):n.err(r));if(e.isErr)throw e.error;return e.value}map(r,t){return this._chain(t=>n.ok(r(t)),r=>n.err(t?t(r):r))}chain(r,t){return this._chain(r,t||(r=>n.err(r)))}}class t extends r{constructor(r){super(),this.value=void 0,this.isOk=!0,this.isErr=!1,this.value=r;}_chain(r,t){return r(this.value)}}class e extends r{constructor(r){super(),this.error=void 0,this.isOk=!1,this.isErr=!0,this.error=r;}_chain(r,t){return t(this.error)}}var n;!function(r){r.ok=function(r){return new t(r)},r.err=function(r){return new e(r||new Error)},r.all=function(t){if(Array.isArray(t)){const e=[];for(let r=0;r<t.length;r++){const n=t[r];if(n.isErr)return n;e.push(n.value);}return r.ok(e)}const e={},n=Object.keys(t);for(let r=0;r<n.length;r++){const s=t[n[r]];if(s.isErr)return s;e[n[r]]=s.value;}return r.ok(e)};}(n||(n={}));

const popcnt32 = (n) => {
    n = n - ((n >>> 1) & 1431655765);
    n = (n & 858993459) + ((n >>> 2) & 858993459);
    return Math.imul((n + (n >>> 4)) & 252645135, 16843009) >> 24;
};
const bswap32 = (n) => {
    n = ((n >>> 8) & 16711935) | ((n & 16711935) << 8);
    return ((n >>> 16) & 0xffff) | ((n & 0xffff) << 16);
};
const rbit32 = (n) => {
    n = ((n >>> 1) & 1431655765) | ((n & 1431655765) << 1);
    n = ((n >>> 2) & 858993459) | ((n & 858993459) << 2);
    n = ((n >>> 4) & 252645135) | ((n & 252645135) << 4);
    return bswap32(n);
};
/**
 * An immutable set of squares, implemented as a bitboard.
 */
class SquareSet {
    constructor(lo, hi) {
        this.lo = lo | 0;
        this.hi = hi | 0;
    }
    static fromSquare(square) {
        return square >= 32 ? new SquareSet(0, 1 << (square - 32)) : new SquareSet(1 << square, 0);
    }
    static fromRank(rank) {
        return new SquareSet(0xff, 0).shl64(8 * rank);
    }
    static fromFile(file) {
        return new SquareSet(16843009 << file, 16843009 << file);
    }
    static empty() {
        return new SquareSet(0, 0);
    }
    static full() {
        return new SquareSet(4294967295, 4294967295);
    }
    static corners() {
        return new SquareSet(0x81, 2164260864);
    }
    static center() {
        return new SquareSet(402653184, 0x18);
    }
    static backranks() {
        return new SquareSet(0xff, 4278190080);
    }
    static backrank(color) {
        return color === 'white' ? new SquareSet(0xff, 0) : new SquareSet(0, 4278190080);
    }
    static lightSquares() {
        return new SquareSet(1437226410, 1437226410);
    }
    static darkSquares() {
        return new SquareSet(2857740885, 2857740885);
    }
    complement() {
        return new SquareSet(~this.lo, ~this.hi);
    }
    xor(other) {
        return new SquareSet(this.lo ^ other.lo, this.hi ^ other.hi);
    }
    union(other) {
        return new SquareSet(this.lo | other.lo, this.hi | other.hi);
    }
    intersect(other) {
        return new SquareSet(this.lo & other.lo, this.hi & other.hi);
    }
    diff(other) {
        return new SquareSet(this.lo & ~other.lo, this.hi & ~other.hi);
    }
    intersects(other) {
        return this.intersect(other).nonEmpty();
    }
    isDisjoint(other) {
        return this.intersect(other).isEmpty();
    }
    supersetOf(other) {
        return other.diff(this).isEmpty();
    }
    subsetOf(other) {
        return this.diff(other).isEmpty();
    }
    shr64(shift) {
        if (shift >= 64)
            return SquareSet.empty();
        if (shift >= 32)
            return new SquareSet(this.hi >>> (shift - 32), 0);
        if (shift > 0)
            return new SquareSet((this.lo >>> shift) ^ (this.hi << (32 - shift)), this.hi >>> shift);
        return this;
    }
    shl64(shift) {
        if (shift >= 64)
            return SquareSet.empty();
        if (shift >= 32)
            return new SquareSet(0, this.lo << (shift - 32));
        if (shift > 0)
            return new SquareSet(this.lo << shift, (this.hi << shift) ^ (this.lo >>> (32 - shift)));
        return this;
    }
    bswap64() {
        return new SquareSet(bswap32(this.hi), bswap32(this.lo));
    }
    rbit64() {
        return new SquareSet(rbit32(this.hi), rbit32(this.lo));
    }
    minus64(other) {
        const lo = this.lo - other.lo;
        const c = ((lo & other.lo & 1) + (other.lo >>> 1) + (lo >>> 1)) >>> 31;
        return new SquareSet(lo, this.hi - (other.hi + c));
    }
    equals(other) {
        return this.lo === other.lo && this.hi === other.hi;
    }
    size() {
        return popcnt32(this.lo) + popcnt32(this.hi);
    }
    isEmpty() {
        return this.lo === 0 && this.hi === 0;
    }
    nonEmpty() {
        return this.lo !== 0 || this.hi !== 0;
    }
    has(square) {
        return (square >= 32 ? this.hi & (1 << (square - 32)) : this.lo & (1 << square)) !== 0;
    }
    set(square, on) {
        return on ? this.with(square) : this.without(square);
    }
    with(square) {
        return square >= 32
            ? new SquareSet(this.lo, this.hi | (1 << (square - 32)))
            : new SquareSet(this.lo | (1 << square), this.hi);
    }
    without(square) {
        return square >= 32
            ? new SquareSet(this.lo, this.hi & ~(1 << (square - 32)))
            : new SquareSet(this.lo & ~(1 << square), this.hi);
    }
    toggle(square) {
        return square >= 32
            ? new SquareSet(this.lo, this.hi ^ (1 << (square - 32)))
            : new SquareSet(this.lo ^ (1 << square), this.hi);
    }
    last() {
        if (this.hi !== 0)
            return 63 - Math.clz32(this.hi);
        if (this.lo !== 0)
            return 31 - Math.clz32(this.lo);
        return;
    }
    first() {
        if (this.lo !== 0)
            return 31 - Math.clz32(this.lo & -this.lo);
        if (this.hi !== 0)
            return 63 - Math.clz32(this.hi & -this.hi);
        return;
    }
    withoutFirst() {
        if (this.lo !== 0)
            return new SquareSet(this.lo & (this.lo - 1), this.hi);
        return new SquareSet(0, this.hi & (this.hi - 1));
    }
    moreThanOne() {
        return (this.hi !== 0 && this.lo !== 0) || (this.lo & (this.lo - 1)) !== 0 || (this.hi & (this.hi - 1)) !== 0;
    }
    singleSquare() {
        return this.moreThanOne() ? undefined : this.last();
    }
    *[Symbol.iterator]() {
        let lo = this.lo;
        let hi = this.hi;
        while (lo !== 0) {
            const idx = 31 - Math.clz32(lo & -lo);
            lo ^= 1 << idx;
            yield idx;
        }
        while (hi !== 0) {
            const idx = 31 - Math.clz32(hi & -hi);
            hi ^= 1 << idx;
            yield 32 + idx;
        }
    }
    *reversed() {
        let lo = this.lo;
        let hi = this.hi;
        while (hi !== 0) {
            const idx = 31 - Math.clz32(hi);
            hi ^= 1 << idx;
            yield 32 + idx;
        }
        while (lo !== 0) {
            const idx = 31 - Math.clz32(lo);
            lo ^= 1 << idx;
            yield idx;
        }
    }
}

const FILE_NAMES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const RANK_NAMES = ['1', '2', '3', '4', '5', '6', '7', '8'];
const COLORS = ['white', 'black'];
const ROLES = ['pawn', 'knight', 'bishop', 'rook', 'queen', 'king'];
const CASTLING_SIDES = ['a', 'h'];
const isDrop = (v) => 'role' in v;

/**
 * Piece positions on a board.
 *
 * Properties are sets of squares, like `board.occupied` for all occupied
 * squares, `board[color]` for all pieces of that color, and `board[role]`
 * for all pieces of that role. When modifying the properties directly, take
 * care to keep them consistent.
 */
class Board {
    constructor() { }
    static default() {
        const board = new Board();
        board.reset();
        return board;
    }
    /**
     * Resets all pieces to the default starting position for standard chess.
     */
    reset() {
        this.occupied = new SquareSet(0xffff, 4294901760);
        this.promoted = SquareSet.empty();
        this.white = new SquareSet(0xffff, 0);
        this.black = new SquareSet(0, 4294901760);
        this.pawn = new SquareSet(0xff00, 16711680);
        this.knight = new SquareSet(0x42, 1107296256);
        this.bishop = new SquareSet(0x24, 603979776);
        this.rook = new SquareSet(0x81, 2164260864);
        this.queen = new SquareSet(0x8, 134217728);
        this.king = new SquareSet(0x10, 268435456);
    }
    static empty() {
        const board = new Board();
        board.clear();
        return board;
    }
    clear() {
        this.occupied = SquareSet.empty();
        this.promoted = SquareSet.empty();
        for (const color of COLORS)
            this[color] = SquareSet.empty();
        for (const role of ROLES)
            this[role] = SquareSet.empty();
    }
    clone() {
        const board = new Board();
        board.occupied = this.occupied;
        board.promoted = this.promoted;
        for (const color of COLORS)
            board[color] = this[color];
        for (const role of ROLES)
            board[role] = this[role];
        return board;
    }
    getColor(square) {
        if (this.white.has(square))
            return 'white';
        if (this.black.has(square))
            return 'black';
        return;
    }
    getRole(square) {
        for (const role of ROLES) {
            if (this[role].has(square))
                return role;
        }
        return;
    }
    get(square) {
        const color = this.getColor(square);
        if (!color)
            return;
        const role = this.getRole(square);
        const promoted = this.promoted.has(square);
        return { color, role, promoted };
    }
    /**
     * Removes and returns the piece from the given `square`, if any.
     */
    take(square) {
        const piece = this.get(square);
        if (piece) {
            this.occupied = this.occupied.without(square);
            this[piece.color] = this[piece.color].without(square);
            this[piece.role] = this[piece.role].without(square);
            if (piece.promoted)
                this.promoted = this.promoted.without(square);
        }
        return piece;
    }
    /**
     * Put `piece` onto `square`, potentially replacing an existing piece.
     * Returns the existing piece, if any.
     */
    set(square, piece) {
        const old = this.take(square);
        this.occupied = this.occupied.with(square);
        this[piece.color] = this[piece.color].with(square);
        this[piece.role] = this[piece.role].with(square);
        if (piece.promoted)
            this.promoted = this.promoted.with(square);
        return old;
    }
    has(square) {
        return this.occupied.has(square);
    }
    *[Symbol.iterator]() {
        for (const square of this.occupied) {
            yield [square, this.get(square)];
        }
    }
    pieces(color, role) {
        return this[color].intersect(this[role]);
    }
    rooksAndQueens() {
        return this.rook.union(this.queen);
    }
    bishopsAndQueens() {
        return this.bishop.union(this.queen);
    }
    /**
     * Finds the unique king of the given `color`, if any.
     */
    kingOf(color) {
        return this.pieces(color, 'king').singleSquare();
    }
}

class MaterialSide {
    constructor() { }
    static empty() {
        const m = new MaterialSide();
        for (const role of ROLES)
            m[role] = 0;
        return m;
    }
    static fromBoard(board, color) {
        const m = new MaterialSide();
        for (const role of ROLES)
            m[role] = board.pieces(color, role).size();
        return m;
    }
    clone() {
        const m = new MaterialSide();
        for (const role of ROLES)
            m[role] = this[role];
        return m;
    }
    equals(other) {
        return ROLES.every(role => this[role] === other[role]);
    }
    add(other) {
        const m = new MaterialSide();
        for (const role of ROLES)
            m[role] = this[role] + other[role];
        return m;
    }
    subtract(other) {
        const m = new MaterialSide();
        for (const role of ROLES)
            m[role] = this[role] - other[role];
        return m;
    }
    nonEmpty() {
        return ROLES.some(role => this[role] > 0);
    }
    isEmpty() {
        return !this.nonEmpty();
    }
    hasPawns() {
        return this.pawn > 0;
    }
    hasNonPawns() {
        return this.knight > 0 || this.bishop > 0 || this.rook > 0 || this.queen > 0 || this.king > 0;
    }
    size() {
        return this.pawn + this.knight + this.bishop + this.rook + this.queen + this.king;
    }
}
class Material {
    constructor(white, black) {
        this.white = white;
        this.black = black;
    }
    static empty() {
        return new Material(MaterialSide.empty(), MaterialSide.empty());
    }
    static fromBoard(board) {
        return new Material(MaterialSide.fromBoard(board, 'white'), MaterialSide.fromBoard(board, 'black'));
    }
    clone() {
        return new Material(this.white.clone(), this.black.clone());
    }
    equals(other) {
        return this.white.equals(other.white) && this.black.equals(other.black);
    }
    add(other) {
        return new Material(this.white.add(other.white), this.black.add(other.black));
    }
    subtract(other) {
        return new Material(this.white.subtract(other.white), this.black.subtract(other.black));
    }
    count(role) {
        return this.white[role] + this.black[role];
    }
    size() {
        return this.white.size() + this.black.size();
    }
    isEmpty() {
        return this.white.isEmpty() && this.black.isEmpty();
    }
    nonEmpty() {
        return !this.isEmpty();
    }
    hasPawns() {
        return this.white.hasPawns() || this.black.hasPawns();
    }
    hasNonPawns() {
        return this.white.hasNonPawns() || this.black.hasNonPawns();
    }
}
class RemainingChecks {
    constructor(white, black) {
        this.white = white;
        this.black = black;
    }
    static default() {
        return new RemainingChecks(3, 3);
    }
    clone() {
        return new RemainingChecks(this.white, this.black);
    }
    equals(other) {
        return this.white === other.white && this.black === other.black;
    }
}

const defined = (v) => v !== undefined;
const opposite = (color) => (color === 'white' ? 'black' : 'white');
const squareRank = (square) => square >> 3;
const squareFile = (square) => square & 0x7;
const squareFromCoords = (file, rank) => 0 <= file && file < 8 && 0 <= rank && rank < 8 ? file + 8 * rank : undefined;
const roleToChar = (role) => {
    switch (role) {
        case 'pawn':
            return 'p';
        case 'knight':
            return 'n';
        case 'bishop':
            return 'b';
        case 'rook':
            return 'r';
        case 'queen':
            return 'q';
        case 'king':
            return 'k';
    }
};
function charToRole(ch) {
    switch (ch.toLowerCase()) {
        case 'p':
            return 'pawn';
        case 'n':
            return 'knight';
        case 'b':
            return 'bishop';
        case 'r':
            return 'rook';
        case 'q':
            return 'queen';
        case 'k':
            return 'king';
        default:
            return;
    }
}
function parseSquare(str) {
    if (str.length !== 2)
        return;
    return squareFromCoords(str.charCodeAt(0) - 'a'.charCodeAt(0), str.charCodeAt(1) - '1'.charCodeAt(0));
}
const makeSquare = (square) => (FILE_NAMES[squareFile(square)] + RANK_NAMES[squareRank(square)]);
const parseUci = (str) => {
    if (str[1] === '@' && str.length === 4) {
        const role = charToRole(str[0]);
        const to = parseSquare(str.slice(2));
        if (role && defined(to))
            return { role, to };
    }
    else if (str.length === 4 || str.length === 5) {
        const from = parseSquare(str.slice(0, 2));
        const to = parseSquare(str.slice(2, 4));
        let promotion;
        if (str.length === 5) {
            promotion = charToRole(str[4]);
            if (!promotion)
                return;
        }
        if (defined(from) && defined(to))
            return { from, to, promotion };
    }
    return;
};
/**
 * Converts a move to UCI notation, like `g1f3` for a normal move,
 * `a7a8q` for promotion to a queen, and `Q@f7` for a Crazyhouse drop.
 */
const makeUci = (move) => isDrop(move)
    ? `${roleToChar(move.role).toUpperCase()}@${makeSquare(move.to)}`
    : makeSquare(move.from) + makeSquare(move.to) + (move.promotion ? roleToChar(move.promotion) : '');
const kingCastlesTo = (color, side) => color === 'white' ? (side === 'a' ? 2 : 6) : side === 'a' ? 58 : 62;
const rookCastlesTo = (color, side) => color === 'white' ? (side === 'a' ? 3 : 5) : side === 'a' ? 59 : 61;

const INITIAL_BOARD_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR';
const INITIAL_EPD = INITIAL_BOARD_FEN + ' w KQkq -';
const INITIAL_FEN = INITIAL_EPD + ' 0 1';
var InvalidFen;
(function (InvalidFen) {
    InvalidFen["Fen"] = "ERR_FEN";
    InvalidFen["Board"] = "ERR_BOARD";
    InvalidFen["Pockets"] = "ERR_POCKETS";
    InvalidFen["Turn"] = "ERR_TURN";
    InvalidFen["Castling"] = "ERR_CASTLING";
    InvalidFen["EpSquare"] = "ERR_EP_SQUARE";
    InvalidFen["RemainingChecks"] = "ERR_REMAINING_CHECKS";
    InvalidFen["Halfmoves"] = "ERR_HALFMOVES";
    InvalidFen["Fullmoves"] = "ERR_FULLMOVES";
})(InvalidFen || (InvalidFen = {}));
class FenError extends Error {
}
const nthIndexOf = (haystack, needle, n) => {
    let index = haystack.indexOf(needle);
    while (n-- > 0) {
        if (index === -1)
            break;
        index = haystack.indexOf(needle, index + needle.length);
    }
    return index;
};
const parseSmallUint = (str) => (/^\d{1,4}$/.test(str) ? parseInt(str, 10) : undefined);
const charToPiece = (ch) => {
    const role = charToRole(ch);
    return role && { role, color: ch.toLowerCase() === ch ? 'black' : 'white' };
};
const parseBoardFen = (boardPart) => {
    const board = Board.empty();
    let rank = 7;
    let file = 0;
    for (let i = 0; i < boardPart.length; i++) {
        const c = boardPart[i];
        if (c === '/' && file === 8) {
            file = 0;
            rank--;
        }
        else {
            const step = parseInt(c, 10);
            if (step > 0)
                file += step;
            else {
                if (file >= 8 || rank < 0)
                    return n.err(new FenError(InvalidFen.Board));
                const square = file + rank * 8;
                const piece = charToPiece(c);
                if (!piece)
                    return n.err(new FenError(InvalidFen.Board));
                if (boardPart[i + 1] === '~') {
                    piece.promoted = true;
                    i++;
                }
                board.set(square, piece);
                file++;
            }
        }
    }
    if (rank !== 0 || file !== 8)
        return n.err(new FenError(InvalidFen.Board));
    return n.ok(board);
};
const parsePockets = (pocketPart) => {
    if (pocketPart.length > 64)
        return n.err(new FenError(InvalidFen.Pockets));
    const pockets = Material.empty();
    for (const c of pocketPart) {
        const piece = charToPiece(c);
        if (!piece)
            return n.err(new FenError(InvalidFen.Pockets));
        pockets[piece.color][piece.role]++;
    }
    return n.ok(pockets);
};
const parseCastlingFen = (board, castlingPart) => {
    let castlingRights = SquareSet.empty();
    if (castlingPart === '-')
        return n.ok(castlingRights);
    for (const c of castlingPart) {
        const lower = c.toLowerCase();
        const color = c === lower ? 'black' : 'white';
        const rank = color === 'white' ? 0 : 7;
        if ('a' <= lower && lower <= 'h') {
            castlingRights = castlingRights.with(squareFromCoords(lower.charCodeAt(0) - 'a'.charCodeAt(0), rank));
        }
        else if (lower === 'k' || lower === 'q') {
            const rooksAndKings = board[color].intersect(SquareSet.backrank(color)).intersect(board.rook.union(board.king));
            const candidate = lower === 'k' ? rooksAndKings.last() : rooksAndKings.first();
            castlingRights = castlingRights.with(defined(candidate) && board.rook.has(candidate) ? candidate : squareFromCoords(lower === 'k' ? 7 : 0, rank));
        }
        else
            return n.err(new FenError(InvalidFen.Castling));
    }
    if (COLORS.some(color => SquareSet.backrank(color).intersect(castlingRights).size() > 2)) {
        return n.err(new FenError(InvalidFen.Castling));
    }
    return n.ok(castlingRights);
};
const parseRemainingChecks = (part) => {
    const parts = part.split('+');
    if (parts.length === 3 && parts[0] === '') {
        const white = parseSmallUint(parts[1]);
        const black = parseSmallUint(parts[2]);
        if (!defined(white) || white > 3 || !defined(black) || black > 3) {
            return n.err(new FenError(InvalidFen.RemainingChecks));
        }
        return n.ok(new RemainingChecks(3 - white, 3 - black));
    }
    else if (parts.length === 2) {
        const white = parseSmallUint(parts[0]);
        const black = parseSmallUint(parts[1]);
        if (!defined(white) || white > 3 || !defined(black) || black > 3) {
            return n.err(new FenError(InvalidFen.RemainingChecks));
        }
        return n.ok(new RemainingChecks(white, black));
    }
    else
        return n.err(new FenError(InvalidFen.RemainingChecks));
};
const parseFen = (fen) => {
    const parts = fen.split(/[\s_]+/);
    const boardPart = parts.shift();
    // Board and pockets
    let board;
    let pockets = n.ok(undefined);
    if (boardPart.endsWith(']')) {
        const pocketStart = boardPart.indexOf('[');
        if (pocketStart === -1)
            return n.err(new FenError(InvalidFen.Fen));
        board = parseBoardFen(boardPart.slice(0, pocketStart));
        pockets = parsePockets(boardPart.slice(pocketStart + 1, -1));
    }
    else {
        const pocketStart = nthIndexOf(boardPart, '/', 7);
        if (pocketStart === -1)
            board = parseBoardFen(boardPart);
        else {
            board = parseBoardFen(boardPart.slice(0, pocketStart));
            pockets = parsePockets(boardPart.slice(pocketStart + 1));
        }
    }
    // Turn
    let turn;
    const turnPart = parts.shift();
    if (!defined(turnPart) || turnPart === 'w')
        turn = 'white';
    else if (turnPart === 'b')
        turn = 'black';
    else
        return n.err(new FenError(InvalidFen.Turn));
    return board.chain(board => {
        // Castling
        const castlingPart = parts.shift();
        const castlingRights = defined(castlingPart) ? parseCastlingFen(board, castlingPart) : n.ok(SquareSet.empty());
        // En passant square
        const epPart = parts.shift();
        let epSquare;
        if (defined(epPart) && epPart !== '-') {
            epSquare = parseSquare(epPart);
            if (!defined(epSquare))
                return n.err(new FenError(InvalidFen.EpSquare));
        }
        // Halfmoves or remaining checks
        let halfmovePart = parts.shift();
        let earlyRemainingChecks;
        if (defined(halfmovePart) && halfmovePart.includes('+')) {
            earlyRemainingChecks = parseRemainingChecks(halfmovePart);
            halfmovePart = parts.shift();
        }
        const halfmoves = defined(halfmovePart) ? parseSmallUint(halfmovePart) : 0;
        if (!defined(halfmoves))
            return n.err(new FenError(InvalidFen.Halfmoves));
        const fullmovesPart = parts.shift();
        const fullmoves = defined(fullmovesPart) ? parseSmallUint(fullmovesPart) : 1;
        if (!defined(fullmoves))
            return n.err(new FenError(InvalidFen.Fullmoves));
        const remainingChecksPart = parts.shift();
        let remainingChecks = n.ok(undefined);
        if (defined(remainingChecksPart)) {
            if (defined(earlyRemainingChecks))
                return n.err(new FenError(InvalidFen.RemainingChecks));
            remainingChecks = parseRemainingChecks(remainingChecksPart);
        }
        else if (defined(earlyRemainingChecks)) {
            remainingChecks = earlyRemainingChecks;
        }
        if (parts.length > 0)
            return n.err(new FenError(InvalidFen.Fen));
        return pockets.chain(pockets => castlingRights.chain(castlingRights => remainingChecks.map(remainingChecks => {
            return {
                board,
                pockets,
                turn,
                castlingRights,
                remainingChecks,
                epSquare,
                halfmoves,
                fullmoves: Math.max(1, fullmoves),
            };
        })));
    });
};
const makePiece = (piece) => {
    let r = roleToChar(piece.role);
    if (piece.color === 'white')
        r = r.toUpperCase();
    if (piece.promoted)
        r += '~';
    return r;
};
const makeBoardFen = (board) => {
    let fen = '';
    let empty = 0;
    for (let rank = 7; rank >= 0; rank--) {
        for (let file = 0; file < 8; file++) {
            const square = file + rank * 8;
            const piece = board.get(square);
            if (!piece)
                empty++;
            else {
                if (empty > 0) {
                    fen += empty;
                    empty = 0;
                }
                fen += makePiece(piece);
            }
            if (file === 7) {
                if (empty > 0) {
                    fen += empty;
                    empty = 0;
                }
                if (rank !== 0)
                    fen += '/';
            }
        }
    }
    return fen;
};
const makePocket = (material) => ROLES.map(role => roleToChar(role).repeat(material[role])).join('');
const makePockets = (pocket) => makePocket(pocket.white).toUpperCase() + makePocket(pocket.black);
const makeCastlingFen = (board, castlingRights) => {
    let fen = '';
    for (const color of COLORS) {
        const backrank = SquareSet.backrank(color);
        let king = board.kingOf(color);
        if (defined(king) && !backrank.has(king))
            king = undefined;
        const candidates = board.pieces(color, 'rook').intersect(backrank);
        for (const rook of castlingRights.intersect(backrank).reversed()) {
            if (rook === candidates.first() && defined(king) && rook < king) {
                fen += color === 'white' ? 'Q' : 'q';
            }
            else if (rook === candidates.last() && defined(king) && king < rook) {
                fen += color === 'white' ? 'K' : 'k';
            }
            else {
                const file = FILE_NAMES[squareFile(rook)];
                fen += color === 'white' ? file.toUpperCase() : file;
            }
        }
    }
    return fen || '-';
};
const makeRemainingChecks = (checks) => `${checks.white}+${checks.black}`;
const makeFen = (setup, opts) => [
    makeBoardFen(setup.board) + (setup.pockets ? `[${makePockets(setup.pockets)}]` : ''),
    setup.turn[0],
    makeCastlingFen(setup.board, setup.castlingRights),
    defined(setup.epSquare) ? makeSquare(setup.epSquare) : '-',
    ...(setup.remainingChecks ? [makeRemainingChecks(setup.remainingChecks)] : []),
    ...((opts === null || opts === void 0 ? void 0 : opts.epd) ? [] : [Math.max(0, Math.min(setup.halfmoves, 9999)), Math.max(1, Math.min(setup.fullmoves, 9999))]),
].join(' ');

/*
Adapted from https://github.com/mattdesl
Distributed under MIT License https://github.com/mattdesl/eases/blob/master/LICENSE.md
*/

/**
 * https://svelte.dev/docs/svelte-easing
 * @param {number} t
 * @returns {number}
 */
function cubicOut(t) {
	const f = t - 1.0;
	return f * f * f + 1.0;
}

/**
 * Animates the opacity of an element from 0 to the current opacity for `in` transitions and from the current opacity to 0 for `out` transitions.
 *
 * https://svelte.dev/docs/svelte-transition#fade
 * @param {Element} node
 * @param {import('./public').FadeParams} [params]
 * @returns {import('./public').TransitionConfig}
 */
function fade(node, { delay = 0, duration = 400, easing = identity } = {}) {
	const o = +getComputedStyle(node).opacity;
	return {
		delay,
		duration,
		easing,
		css: (t) => `opacity: ${t * o}`
	};
}

/**
 * The flip function calculates the start and end position of an element and animates between them, translating the x and y values.
 * `flip` stands for [First, Last, Invert, Play](https://aerotwist.com/blog/flip-your-animations/).
 *
 * https://svelte.dev/docs/svelte-animate#flip
 * @param {Element} node
 * @param {{ from: DOMRect; to: DOMRect }} fromTo
 * @param {import('./public.js').FlipParams} params
 * @returns {import('./public.js').AnimationConfig}
 */
function flip(node, { from, to }, params = {}) {
	const style = getComputedStyle(node);
	const transform = style.transform === 'none' ? '' : style.transform;
	const [ox, oy] = style.transformOrigin.split(' ').map(parseFloat);
	const dx = from.left + (from.width * ox) / to.width - (to.left + ox);
	const dy = from.top + (from.height * oy) / to.height - (to.top + oy);
	const { delay = 0, duration = (d) => Math.sqrt(d) * 120, easing = cubicOut } = params;
	return {
		delay,
		duration: is_function(duration) ? duration(Math.sqrt(dx * dx + dy * dy)) : duration,
		easing,
		css: (t, u) => {
			const x = u * dx;
			const y = u * dy;
			const sx = t + (u * from.width) / to.width;
			const sy = t + (u * from.height) / to.height;
			return `transform: ${transform} translate(${x}px, ${y}px) scale(${sx}, ${sy});`;
		}
	};
}

/**
 * Compute attacks and rays.
 *
 * These are low-level functions that can be used to implement chess rules.
 *
 * Implementation notes: Sliding attacks are computed using
 * [Hyperbola Quintessence](https://www.chessprogramming.org/Hyperbola_Quintessence).
 * Magic Bitboards would deliver slightly faster lookups, but also require
 * initializing considerably larger attack tables. On the web, initialization
 * time is important, so the chosen method may strike a better balance.
 *
 * @packageDocumentation
 */
const computeRange = (square, deltas) => {
    let range = SquareSet.empty();
    for (const delta of deltas) {
        const sq = square + delta;
        if (0 <= sq && sq < 64 && Math.abs(squareFile(square) - squareFile(sq)) <= 2) {
            range = range.with(sq);
        }
    }
    return range;
};
const tabulate = (f) => {
    const table = [];
    for (let square = 0; square < 64; square++)
        table[square] = f(square);
    return table;
};
const KING_ATTACKS = tabulate(sq => computeRange(sq, [-9, -8, -7, -1, 1, 7, 8, 9]));
const KNIGHT_ATTACKS = tabulate(sq => computeRange(sq, [-17, -15, -10, -6, 6, 10, 15, 17]));
const PAWN_ATTACKS = {
    white: tabulate(sq => computeRange(sq, [7, 9])),
    black: tabulate(sq => computeRange(sq, [-7, -9])),
};
/**
 * Gets squares attacked or defended by a king on `square`.
 */
const kingAttacks = (square) => KING_ATTACKS[square];
/**
 * Gets squares attacked or defended by a knight on `square`.
 */
const knightAttacks = (square) => KNIGHT_ATTACKS[square];
/**
 * Gets squares attacked or defended by a pawn of the given `color`
 * on `square`.
 */
const pawnAttacks = (color, square) => PAWN_ATTACKS[color][square];
const FILE_RANGE = tabulate(sq => SquareSet.fromFile(squareFile(sq)).without(sq));
const RANK_RANGE = tabulate(sq => SquareSet.fromRank(squareRank(sq)).without(sq));
const DIAG_RANGE = tabulate(sq => {
    const diag = new SquareSet(134480385, 2151686160);
    const shift = 8 * (squareRank(sq) - squareFile(sq));
    return (shift >= 0 ? diag.shl64(shift) : diag.shr64(-shift)).without(sq);
});
const ANTI_DIAG_RANGE = tabulate(sq => {
    const diag = new SquareSet(270549120, 16909320);
    const shift = 8 * (squareRank(sq) + squareFile(sq) - 7);
    return (shift >= 0 ? diag.shl64(shift) : diag.shr64(-shift)).without(sq);
});
const hyperbola = (bit, range, occupied) => {
    let forward = occupied.intersect(range);
    let reverse = forward.bswap64(); // Assumes no more than 1 bit per rank
    forward = forward.minus64(bit);
    reverse = reverse.minus64(bit.bswap64());
    return forward.xor(reverse.bswap64()).intersect(range);
};
const fileAttacks = (square, occupied) => hyperbola(SquareSet.fromSquare(square), FILE_RANGE[square], occupied);
const rankAttacks = (square, occupied) => {
    const range = RANK_RANGE[square];
    let forward = occupied.intersect(range);
    let reverse = forward.rbit64();
    forward = forward.minus64(SquareSet.fromSquare(square));
    reverse = reverse.minus64(SquareSet.fromSquare(63 - square));
    return forward.xor(reverse.rbit64()).intersect(range);
};
/**
 * Gets squares attacked or defended by a bishop on `square`, given `occupied`
 * squares.
 */
const bishopAttacks = (square, occupied) => {
    const bit = SquareSet.fromSquare(square);
    return hyperbola(bit, DIAG_RANGE[square], occupied).xor(hyperbola(bit, ANTI_DIAG_RANGE[square], occupied));
};
/**
 * Gets squares attacked or defended by a rook on `square`, given `occupied`
 * squares.
 */
const rookAttacks = (square, occupied) => fileAttacks(square, occupied).xor(rankAttacks(square, occupied));
/**
 * Gets squares attacked or defended by a queen on `square`, given `occupied`
 * squares.
 */
const queenAttacks = (square, occupied) => bishopAttacks(square, occupied).xor(rookAttacks(square, occupied));
/**
 * Gets squares attacked or defended by a `piece` on `square`, given
 * `occupied` squares.
 */
const attacks = (piece, square, occupied) => {
    switch (piece.role) {
        case 'pawn':
            return pawnAttacks(piece.color, square);
        case 'knight':
            return knightAttacks(square);
        case 'bishop':
            return bishopAttacks(square, occupied);
        case 'rook':
            return rookAttacks(square, occupied);
        case 'queen':
            return queenAttacks(square, occupied);
        case 'king':
            return kingAttacks(square);
    }
};
/**
 * Gets all squares of the rank, file or diagonal with the two squares
 * `a` and `b`, or an empty set if they are not aligned.
 */
const ray = (a, b) => {
    const other = SquareSet.fromSquare(b);
    if (RANK_RANGE[a].intersects(other))
        return RANK_RANGE[a].with(a);
    if (ANTI_DIAG_RANGE[a].intersects(other))
        return ANTI_DIAG_RANGE[a].with(a);
    if (DIAG_RANGE[a].intersects(other))
        return DIAG_RANGE[a].with(a);
    if (FILE_RANGE[a].intersects(other))
        return FILE_RANGE[a].with(a);
    return SquareSet.empty();
};
/**
 * Gets all squares between `a` and `b` (bounds not included), or an empty set
 * if they are not on the same rank, file or diagonal.
 */
const between = (a, b) => ray(a, b)
    .intersect(SquareSet.full().shl64(a).xor(SquareSet.full().shl64(b)))
    .withoutFirst();

var IllegalSetup;
(function (IllegalSetup) {
    IllegalSetup["Empty"] = "ERR_EMPTY";
    IllegalSetup["OppositeCheck"] = "ERR_OPPOSITE_CHECK";
    IllegalSetup["PawnsOnBackrank"] = "ERR_PAWNS_ON_BACKRANK";
    IllegalSetup["Kings"] = "ERR_KINGS";
    IllegalSetup["Variant"] = "ERR_VARIANT";
})(IllegalSetup || (IllegalSetup = {}));
class PositionError extends Error {
}
const attacksTo = (square, attacker, board, occupied) => board[attacker].intersect(rookAttacks(square, occupied)
    .intersect(board.rooksAndQueens())
    .union(bishopAttacks(square, occupied).intersect(board.bishopsAndQueens()))
    .union(knightAttacks(square).intersect(board.knight))
    .union(kingAttacks(square).intersect(board.king))
    .union(pawnAttacks(opposite(attacker), square).intersect(board.pawn)));
class Castles {
    constructor() { }
    static default() {
        const castles = new Castles();
        castles.castlingRights = SquareSet.corners();
        castles.rook = {
            white: { a: 0, h: 7 },
            black: { a: 56, h: 63 },
        };
        castles.path = {
            white: { a: new SquareSet(0xe, 0), h: new SquareSet(0x60, 0) },
            black: { a: new SquareSet(0, 0x0e000000), h: new SquareSet(0, 0x60000000) },
        };
        return castles;
    }
    static empty() {
        const castles = new Castles();
        castles.castlingRights = SquareSet.empty();
        castles.rook = {
            white: { a: undefined, h: undefined },
            black: { a: undefined, h: undefined },
        };
        castles.path = {
            white: { a: SquareSet.empty(), h: SquareSet.empty() },
            black: { a: SquareSet.empty(), h: SquareSet.empty() },
        };
        return castles;
    }
    clone() {
        const castles = new Castles();
        castles.castlingRights = this.castlingRights;
        castles.rook = {
            white: { a: this.rook.white.a, h: this.rook.white.h },
            black: { a: this.rook.black.a, h: this.rook.black.h },
        };
        castles.path = {
            white: { a: this.path.white.a, h: this.path.white.h },
            black: { a: this.path.black.a, h: this.path.black.h },
        };
        return castles;
    }
    add(color, side, king, rook) {
        const kingTo = kingCastlesTo(color, side);
        const rookTo = rookCastlesTo(color, side);
        this.castlingRights = this.castlingRights.with(rook);
        this.rook[color][side] = rook;
        this.path[color][side] = between(rook, rookTo)
            .with(rookTo)
            .union(between(king, kingTo).with(kingTo))
            .without(king)
            .without(rook);
    }
    static fromSetup(setup) {
        const castles = Castles.empty();
        const rooks = setup.castlingRights.intersect(setup.board.rook);
        for (const color of COLORS) {
            const backrank = SquareSet.backrank(color);
            const king = setup.board.kingOf(color);
            if (!defined(king) || !backrank.has(king))
                continue;
            const side = rooks.intersect(setup.board[color]).intersect(backrank);
            const aSide = side.first();
            if (defined(aSide) && aSide < king)
                castles.add(color, 'a', king, aSide);
            const hSide = side.last();
            if (defined(hSide) && king < hSide)
                castles.add(color, 'h', king, hSide);
        }
        return castles;
    }
    discardRook(square) {
        if (this.castlingRights.has(square)) {
            this.castlingRights = this.castlingRights.without(square);
            for (const color of COLORS) {
                for (const side of CASTLING_SIDES) {
                    if (this.rook[color][side] === square)
                        this.rook[color][side] = undefined;
                }
            }
        }
    }
    discardColor(color) {
        this.castlingRights = this.castlingRights.diff(SquareSet.backrank(color));
        this.rook[color].a = undefined;
        this.rook[color].h = undefined;
    }
}
class Position {
    constructor(rules) {
        this.rules = rules;
    }
    reset() {
        this.board = Board.default();
        this.pockets = undefined;
        this.turn = 'white';
        this.castles = Castles.default();
        this.epSquare = undefined;
        this.remainingChecks = undefined;
        this.halfmoves = 0;
        this.fullmoves = 1;
    }
    setupUnchecked(setup) {
        this.board = setup.board.clone();
        this.board.promoted = SquareSet.empty();
        this.pockets = undefined;
        this.turn = setup.turn;
        this.castles = Castles.fromSetup(setup);
        this.epSquare = validEpSquare(this, setup.epSquare);
        this.remainingChecks = undefined;
        this.halfmoves = setup.halfmoves;
        this.fullmoves = setup.fullmoves;
    }
    // When subclassing overwrite at least:
    //
    // - static default()
    // - static fromSetup()
    // - static clone()
    //
    // - dests()
    // - isVariantEnd()
    // - variantOutcome()
    // - hasInsufficientMaterial()
    // - isStandardMaterial()
    kingAttackers(square, attacker, occupied) {
        return attacksTo(square, attacker, this.board, occupied);
    }
    playCaptureAt(square, captured) {
        this.halfmoves = 0;
        if (captured.role === 'rook')
            this.castles.discardRook(square);
        if (this.pockets)
            this.pockets[opposite(captured.color)][captured.promoted ? 'pawn' : captured.role]++;
    }
    ctx() {
        const variantEnd = this.isVariantEnd();
        const king = this.board.kingOf(this.turn);
        if (!defined(king)) {
            return { king, blockers: SquareSet.empty(), checkers: SquareSet.empty(), variantEnd, mustCapture: false };
        }
        const snipers = rookAttacks(king, SquareSet.empty())
            .intersect(this.board.rooksAndQueens())
            .union(bishopAttacks(king, SquareSet.empty()).intersect(this.board.bishopsAndQueens()))
            .intersect(this.board[opposite(this.turn)]);
        let blockers = SquareSet.empty();
        for (const sniper of snipers) {
            const b = between(king, sniper).intersect(this.board.occupied);
            if (!b.moreThanOne())
                blockers = blockers.union(b);
        }
        const checkers = this.kingAttackers(king, opposite(this.turn), this.board.occupied);
        return {
            king,
            blockers,
            checkers,
            variantEnd,
            mustCapture: false,
        };
    }
    clone() {
        var _a, _b;
        const pos = new this.constructor();
        pos.board = this.board.clone();
        pos.pockets = (_a = this.pockets) === null || _a === void 0 ? void 0 : _a.clone();
        pos.turn = this.turn;
        pos.castles = this.castles.clone();
        pos.epSquare = this.epSquare;
        pos.remainingChecks = (_b = this.remainingChecks) === null || _b === void 0 ? void 0 : _b.clone();
        pos.halfmoves = this.halfmoves;
        pos.fullmoves = this.fullmoves;
        return pos;
    }
    validate() {
        if (this.board.occupied.isEmpty())
            return n.err(new PositionError(IllegalSetup.Empty));
        if (this.board.king.size() !== 2)
            return n.err(new PositionError(IllegalSetup.Kings));
        if (!defined(this.board.kingOf(this.turn)))
            return n.err(new PositionError(IllegalSetup.Kings));
        const otherKing = this.board.kingOf(opposite(this.turn));
        if (!defined(otherKing))
            return n.err(new PositionError(IllegalSetup.Kings));
        if (this.kingAttackers(otherKing, this.turn, this.board.occupied).nonEmpty()) {
            return n.err(new PositionError(IllegalSetup.OppositeCheck));
        }
        if (SquareSet.backranks().intersects(this.board.pawn)) {
            return n.err(new PositionError(IllegalSetup.PawnsOnBackrank));
        }
        return n.ok(undefined);
    }
    dropDests(_ctx) {
        return SquareSet.empty();
    }
    dests(square, ctx) {
        ctx = ctx || this.ctx();
        if (ctx.variantEnd)
            return SquareSet.empty();
        const piece = this.board.get(square);
        if (!piece || piece.color !== this.turn)
            return SquareSet.empty();
        let pseudo, legal;
        if (piece.role === 'pawn') {
            pseudo = pawnAttacks(this.turn, square).intersect(this.board[opposite(this.turn)]);
            const delta = this.turn === 'white' ? 8 : -8;
            const step = square + delta;
            if (0 <= step && step < 64 && !this.board.occupied.has(step)) {
                pseudo = pseudo.with(step);
                const canDoubleStep = this.turn === 'white' ? square < 16 : square >= 64 - 16;
                const doubleStep = step + delta;
                if (canDoubleStep && !this.board.occupied.has(doubleStep)) {
                    pseudo = pseudo.with(doubleStep);
                }
            }
            if (defined(this.epSquare) && canCaptureEp(this, square, ctx)) {
                legal = SquareSet.fromSquare(this.epSquare);
            }
        }
        else if (piece.role === 'bishop')
            pseudo = bishopAttacks(square, this.board.occupied);
        else if (piece.role === 'knight')
            pseudo = knightAttacks(square);
        else if (piece.role === 'rook')
            pseudo = rookAttacks(square, this.board.occupied);
        else if (piece.role === 'queen')
            pseudo = queenAttacks(square, this.board.occupied);
        else
            pseudo = kingAttacks(square);
        pseudo = pseudo.diff(this.board[this.turn]);
        if (defined(ctx.king)) {
            if (piece.role === 'king') {
                const occ = this.board.occupied.without(square);
                for (const to of pseudo) {
                    if (this.kingAttackers(to, opposite(this.turn), occ).nonEmpty())
                        pseudo = pseudo.without(to);
                }
                return pseudo.union(castlingDest(this, 'a', ctx)).union(castlingDest(this, 'h', ctx));
            }
            if (ctx.checkers.nonEmpty()) {
                const checker = ctx.checkers.singleSquare();
                if (!defined(checker))
                    return SquareSet.empty();
                pseudo = pseudo.intersect(between(checker, ctx.king).with(checker));
            }
            if (ctx.blockers.has(square))
                pseudo = pseudo.intersect(ray(square, ctx.king));
        }
        if (legal)
            pseudo = pseudo.union(legal);
        return pseudo;
    }
    isVariantEnd() {
        return false;
    }
    variantOutcome(_ctx) {
        return;
    }
    hasInsufficientMaterial(color) {
        if (this.board[color].intersect(this.board.pawn.union(this.board.rooksAndQueens())).nonEmpty())
            return false;
        if (this.board[color].intersects(this.board.knight)) {
            return (this.board[color].size() <= 2
                && this.board[opposite(color)].diff(this.board.king).diff(this.board.queen).isEmpty());
        }
        if (this.board[color].intersects(this.board.bishop)) {
            const sameColor = !this.board.bishop.intersects(SquareSet.darkSquares())
                || !this.board.bishop.intersects(SquareSet.lightSquares());
            return sameColor && this.board.pawn.isEmpty() && this.board.knight.isEmpty();
        }
        return true;
    }
    // The following should be identical in all subclasses
    toSetup() {
        var _a, _b;
        return {
            board: this.board.clone(),
            pockets: (_a = this.pockets) === null || _a === void 0 ? void 0 : _a.clone(),
            turn: this.turn,
            castlingRights: this.castles.castlingRights,
            epSquare: legalEpSquare(this),
            remainingChecks: (_b = this.remainingChecks) === null || _b === void 0 ? void 0 : _b.clone(),
            halfmoves: Math.min(this.halfmoves, 150),
            fullmoves: Math.min(Math.max(this.fullmoves, 1), 9999),
        };
    }
    isInsufficientMaterial() {
        return COLORS.every(color => this.hasInsufficientMaterial(color));
    }
    hasDests(ctx) {
        ctx = ctx || this.ctx();
        for (const square of this.board[this.turn]) {
            if (this.dests(square, ctx).nonEmpty())
                return true;
        }
        return this.dropDests(ctx).nonEmpty();
    }
    isLegal(move, ctx) {
        if (isDrop(move)) {
            if (!this.pockets || this.pockets[this.turn][move.role] <= 0)
                return false;
            if (move.role === 'pawn' && SquareSet.backranks().has(move.to))
                return false;
            return this.dropDests(ctx).has(move.to);
        }
        else {
            if (move.promotion === 'pawn')
                return false;
            if (move.promotion === 'king' && this.rules !== 'antichess')
                return false;
            if (!!move.promotion !== (this.board.pawn.has(move.from) && SquareSet.backranks().has(move.to)))
                return false;
            const dests = this.dests(move.from, ctx);
            return dests.has(move.to) || dests.has(normalizeMove(this, move).to);
        }
    }
    isCheck() {
        const king = this.board.kingOf(this.turn);
        return defined(king) && this.kingAttackers(king, opposite(this.turn), this.board.occupied).nonEmpty();
    }
    isEnd(ctx) {
        if (ctx ? ctx.variantEnd : this.isVariantEnd())
            return true;
        return this.isInsufficientMaterial() || !this.hasDests(ctx);
    }
    isCheckmate(ctx) {
        ctx = ctx || this.ctx();
        return !ctx.variantEnd && ctx.checkers.nonEmpty() && !this.hasDests(ctx);
    }
    isStalemate(ctx) {
        ctx = ctx || this.ctx();
        return !ctx.variantEnd && ctx.checkers.isEmpty() && !this.hasDests(ctx);
    }
    outcome(ctx) {
        const variantOutcome = this.variantOutcome(ctx);
        if (variantOutcome)
            return variantOutcome;
        ctx = ctx || this.ctx();
        if (this.isCheckmate(ctx))
            return { winner: opposite(this.turn) };
        else if (this.isInsufficientMaterial() || this.isStalemate(ctx))
            return { winner: undefined };
        else
            return;
    }
    allDests(ctx) {
        ctx = ctx || this.ctx();
        const d = new Map();
        if (ctx.variantEnd)
            return d;
        for (const square of this.board[this.turn]) {
            d.set(square, this.dests(square, ctx));
        }
        return d;
    }
    play(move) {
        const turn = this.turn;
        const epSquare = this.epSquare;
        const castling = castlingSide(this, move);
        this.epSquare = undefined;
        this.halfmoves += 1;
        if (turn === 'black')
            this.fullmoves += 1;
        this.turn = opposite(turn);
        if (isDrop(move)) {
            this.board.set(move.to, { role: move.role, color: turn });
            if (this.pockets)
                this.pockets[turn][move.role]--;
            if (move.role === 'pawn')
                this.halfmoves = 0;
        }
        else {
            const piece = this.board.take(move.from);
            if (!piece)
                return;
            let epCapture;
            if (piece.role === 'pawn') {
                this.halfmoves = 0;
                if (move.to === epSquare) {
                    epCapture = this.board.take(move.to + (turn === 'white' ? -8 : 8));
                }
                const delta = move.from - move.to;
                if (Math.abs(delta) === 16 && 8 <= move.from && move.from <= 55) {
                    this.epSquare = (move.from + move.to) >> 1;
                }
                if (move.promotion) {
                    piece.role = move.promotion;
                    piece.promoted = !!this.pockets;
                }
            }
            else if (piece.role === 'rook') {
                this.castles.discardRook(move.from);
            }
            else if (piece.role === 'king') {
                if (castling) {
                    const rookFrom = this.castles.rook[turn][castling];
                    if (defined(rookFrom)) {
                        const rook = this.board.take(rookFrom);
                        this.board.set(kingCastlesTo(turn, castling), piece);
                        if (rook)
                            this.board.set(rookCastlesTo(turn, castling), rook);
                    }
                }
                this.castles.discardColor(turn);
            }
            if (!castling) {
                const capture = this.board.set(move.to, piece) || epCapture;
                if (capture)
                    this.playCaptureAt(move.to, capture);
            }
        }
        if (this.remainingChecks) {
            if (this.isCheck())
                this.remainingChecks[turn] = Math.max(this.remainingChecks[turn] - 1, 0);
        }
    }
}
class Chess extends Position {
    constructor() {
        super('chess');
    }
    static default() {
        const pos = new this();
        pos.reset();
        return pos;
    }
    static fromSetup(setup) {
        const pos = new this();
        pos.setupUnchecked(setup);
        return pos.validate().map(_ => pos);
    }
    clone() {
        return super.clone();
    }
}
const validEpSquare = (pos, square) => {
    if (!defined(square))
        return;
    const epRank = pos.turn === 'white' ? 5 : 2;
    const forward = pos.turn === 'white' ? 8 : -8;
    if (squareRank(square) !== epRank)
        return;
    if (pos.board.occupied.has(square + forward))
        return;
    const pawn = square - forward;
    if (!pos.board.pawn.has(pawn) || !pos.board[opposite(pos.turn)].has(pawn))
        return;
    return square;
};
const legalEpSquare = (pos) => {
    if (!defined(pos.epSquare))
        return;
    const ctx = pos.ctx();
    const ourPawns = pos.board.pieces(pos.turn, 'pawn');
    const candidates = ourPawns.intersect(pawnAttacks(opposite(pos.turn), pos.epSquare));
    for (const candidate of candidates) {
        if (pos.dests(candidate, ctx).has(pos.epSquare))
            return pos.epSquare;
    }
    return;
};
const canCaptureEp = (pos, pawnFrom, ctx) => {
    if (!defined(pos.epSquare))
        return false;
    if (!pawnAttacks(pos.turn, pawnFrom).has(pos.epSquare))
        return false;
    if (!defined(ctx.king))
        return true;
    const delta = pos.turn === 'white' ? 8 : -8;
    const captured = pos.epSquare - delta;
    return pos
        .kingAttackers(ctx.king, opposite(pos.turn), pos.board.occupied.toggle(pawnFrom).toggle(captured).with(pos.epSquare))
        .without(captured)
        .isEmpty();
};
const castlingDest = (pos, side, ctx) => {
    if (!defined(ctx.king) || ctx.checkers.nonEmpty())
        return SquareSet.empty();
    const rook = pos.castles.rook[pos.turn][side];
    if (!defined(rook))
        return SquareSet.empty();
    if (pos.castles.path[pos.turn][side].intersects(pos.board.occupied))
        return SquareSet.empty();
    const kingTo = kingCastlesTo(pos.turn, side);
    const kingPath = between(ctx.king, kingTo);
    const occ = pos.board.occupied.without(ctx.king);
    for (const sq of kingPath) {
        if (pos.kingAttackers(sq, opposite(pos.turn), occ).nonEmpty())
            return SquareSet.empty();
    }
    const rookTo = rookCastlesTo(pos.turn, side);
    const after = pos.board.occupied.toggle(ctx.king).toggle(rook).toggle(rookTo);
    if (pos.kingAttackers(kingTo, opposite(pos.turn), after).nonEmpty())
        return SquareSet.empty();
    return SquareSet.fromSquare(rook);
};
const pseudoDests = (pos, square, ctx) => {
    if (ctx.variantEnd)
        return SquareSet.empty();
    const piece = pos.board.get(square);
    if (!piece || piece.color !== pos.turn)
        return SquareSet.empty();
    let pseudo = attacks(piece, square, pos.board.occupied);
    if (piece.role === 'pawn') {
        let captureTargets = pos.board[opposite(pos.turn)];
        if (defined(pos.epSquare))
            captureTargets = captureTargets.with(pos.epSquare);
        pseudo = pseudo.intersect(captureTargets);
        const delta = pos.turn === 'white' ? 8 : -8;
        const step = square + delta;
        if (0 <= step && step < 64 && !pos.board.occupied.has(step)) {
            pseudo = pseudo.with(step);
            const canDoubleStep = pos.turn === 'white' ? square < 16 : square >= 64 - 16;
            const doubleStep = step + delta;
            if (canDoubleStep && !pos.board.occupied.has(doubleStep)) {
                pseudo = pseudo.with(doubleStep);
            }
        }
        return pseudo;
    }
    else {
        pseudo = pseudo.diff(pos.board[pos.turn]);
    }
    if (square === ctx.king)
        return pseudo.union(castlingDest(pos, 'a', ctx)).union(castlingDest(pos, 'h', ctx));
    else
        return pseudo;
};
const castlingSide = (pos, move) => {
    if (isDrop(move))
        return;
    const delta = move.to - move.from;
    if (Math.abs(delta) !== 2 && !pos.board[pos.turn].has(move.to))
        return;
    if (!pos.board.king.has(move.from))
        return;
    return delta > 0 ? 'h' : 'a';
};
const normalizeMove = (pos, move) => {
    const side = castlingSide(pos, move);
    if (!side)
        return move;
    const rookFrom = pos.castles.rook[pos.turn][side];
    return {
        from: move.from,
        to: defined(rookFrom) ? rookFrom : move.to,
    };
};

class Crazyhouse extends Position {
    constructor() {
        super('crazyhouse');
    }
    reset() {
        super.reset();
        this.pockets = Material.empty();
    }
    setupUnchecked(setup) {
        super.setupUnchecked(setup);
        this.board.promoted = setup.board.promoted
            .intersect(setup.board.occupied)
            .diff(setup.board.king)
            .diff(setup.board.pawn);
        this.pockets = setup.pockets ? setup.pockets.clone() : Material.empty();
    }
    static default() {
        const pos = new this();
        pos.reset();
        return pos;
    }
    static fromSetup(setup) {
        const pos = new this();
        pos.setupUnchecked(setup);
        return pos.validate().map(_ => pos);
    }
    clone() {
        return super.clone();
    }
    validate() {
        return super.validate().chain(_ => {
            var _a, _b;
            if ((_a = this.pockets) === null || _a === void 0 ? void 0 : _a.count('king')) {
                return n.err(new PositionError(IllegalSetup.Kings));
            }
            if ((((_b = this.pockets) === null || _b === void 0 ? void 0 : _b.size()) || 0) + this.board.occupied.size() > 64) {
                return n.err(new PositionError(IllegalSetup.Variant));
            }
            return n.ok(undefined);
        });
    }
    hasInsufficientMaterial(color) {
        // No material can leave the game, but we can easily check this for
        // custom positions.
        if (!this.pockets)
            return super.hasInsufficientMaterial(color);
        return (this.board.occupied.size() + this.pockets.size() <= 3
            && this.board.pawn.isEmpty()
            && this.board.promoted.isEmpty()
            && this.board.rooksAndQueens().isEmpty()
            && this.pockets.count('pawn') <= 0
            && this.pockets.count('rook') <= 0
            && this.pockets.count('queen') <= 0);
    }
    dropDests(ctx) {
        var _a, _b;
        const mask = this.board.occupied
            .complement()
            .intersect(((_a = this.pockets) === null || _a === void 0 ? void 0 : _a[this.turn].hasNonPawns())
            ? SquareSet.full()
            : ((_b = this.pockets) === null || _b === void 0 ? void 0 : _b[this.turn].hasPawns())
                ? SquareSet.backranks().complement()
                : SquareSet.empty());
        ctx = ctx || this.ctx();
        if (defined(ctx.king) && ctx.checkers.nonEmpty()) {
            const checker = ctx.checkers.singleSquare();
            if (!defined(checker))
                return SquareSet.empty();
            return mask.intersect(between(checker, ctx.king));
        }
        else
            return mask;
    }
}
class Atomic extends Position {
    constructor() {
        super('atomic');
    }
    static default() {
        const pos = new this();
        pos.reset();
        return pos;
    }
    static fromSetup(setup) {
        const pos = new this();
        pos.setupUnchecked(setup);
        return pos.validate().map(_ => pos);
    }
    clone() {
        return super.clone();
    }
    validate() {
        // Like chess, but allow our king to be missing.
        if (this.board.occupied.isEmpty())
            return n.err(new PositionError(IllegalSetup.Empty));
        if (this.board.king.size() > 2)
            return n.err(new PositionError(IllegalSetup.Kings));
        const otherKing = this.board.kingOf(opposite(this.turn));
        if (!defined(otherKing))
            return n.err(new PositionError(IllegalSetup.Kings));
        if (this.kingAttackers(otherKing, this.turn, this.board.occupied).nonEmpty()) {
            return n.err(new PositionError(IllegalSetup.OppositeCheck));
        }
        if (SquareSet.backranks().intersects(this.board.pawn)) {
            return n.err(new PositionError(IllegalSetup.PawnsOnBackrank));
        }
        return n.ok(undefined);
    }
    kingAttackers(square, attacker, occupied) {
        const attackerKings = this.board.pieces(attacker, 'king');
        if (attackerKings.isEmpty() || kingAttacks(square).intersects(attackerKings)) {
            return SquareSet.empty();
        }
        return super.kingAttackers(square, attacker, occupied);
    }
    playCaptureAt(square, captured) {
        super.playCaptureAt(square, captured);
        this.board.take(square);
        for (const explode of kingAttacks(square).intersect(this.board.occupied).diff(this.board.pawn)) {
            const piece = this.board.take(explode);
            if ((piece === null || piece === void 0 ? void 0 : piece.role) === 'rook')
                this.castles.discardRook(explode);
            if ((piece === null || piece === void 0 ? void 0 : piece.role) === 'king')
                this.castles.discardColor(piece.color);
        }
    }
    hasInsufficientMaterial(color) {
        // Remaining material does not matter if the enemy king is already
        // exploded.
        if (this.board.pieces(opposite(color), 'king').isEmpty())
            return false;
        // Bare king cannot mate.
        if (this.board[color].diff(this.board.king).isEmpty())
            return true;
        // As long as the enemy king is not alone, there is always a chance their
        // own pieces explode next to it.
        if (this.board[opposite(color)].diff(this.board.king).nonEmpty()) {
            // Unless there are only bishops that cannot explode each other.
            if (this.board.occupied.equals(this.board.bishop.union(this.board.king))) {
                if (!this.board.bishop.intersect(this.board.white).intersects(SquareSet.darkSquares())) {
                    return !this.board.bishop.intersect(this.board.black).intersects(SquareSet.lightSquares());
                }
                if (!this.board.bishop.intersect(this.board.white).intersects(SquareSet.lightSquares())) {
                    return !this.board.bishop.intersect(this.board.black).intersects(SquareSet.darkSquares());
                }
            }
            return false;
        }
        // Queen or pawn (future queen) can give mate against bare king.
        if (this.board.queen.nonEmpty() || this.board.pawn.nonEmpty())
            return false;
        // Single knight, bishop or rook cannot mate against bare king.
        if (this.board.knight.union(this.board.bishop).union(this.board.rook).size() === 1)
            return true;
        // If only knights, more than two are required to mate bare king.
        if (this.board.occupied.equals(this.board.knight.union(this.board.king))) {
            return this.board.knight.size() <= 2;
        }
        return false;
    }
    dests(square, ctx) {
        ctx = ctx || this.ctx();
        let dests = SquareSet.empty();
        for (const to of pseudoDests(this, square, ctx)) {
            const after = this.clone();
            after.play({ from: square, to });
            const ourKing = after.board.kingOf(this.turn);
            if (defined(ourKing)
                && (!defined(after.board.kingOf(after.turn))
                    || after.kingAttackers(ourKing, after.turn, after.board.occupied).isEmpty())) {
                dests = dests.with(to);
            }
        }
        return dests;
    }
    isVariantEnd() {
        return !!this.variantOutcome();
    }
    variantOutcome(_ctx) {
        for (const color of COLORS) {
            if (this.board.pieces(color, 'king').isEmpty())
                return { winner: opposite(color) };
        }
        return;
    }
}
class Antichess extends Position {
    constructor() {
        super('antichess');
    }
    reset() {
        super.reset();
        this.castles = Castles.empty();
    }
    setupUnchecked(setup) {
        super.setupUnchecked(setup);
        this.castles = Castles.empty();
    }
    static default() {
        const pos = new this();
        pos.reset();
        return pos;
    }
    static fromSetup(setup) {
        const pos = new this();
        pos.setupUnchecked(setup);
        return pos.validate().map(_ => pos);
    }
    clone() {
        return super.clone();
    }
    validate() {
        if (this.board.occupied.isEmpty())
            return n.err(new PositionError(IllegalSetup.Empty));
        if (SquareSet.backranks().intersects(this.board.pawn)) {
            return n.err(new PositionError(IllegalSetup.PawnsOnBackrank));
        }
        return n.ok(undefined);
    }
    kingAttackers(_square, _attacker, _occupied) {
        return SquareSet.empty();
    }
    ctx() {
        const ctx = super.ctx();
        if (defined(this.epSquare)
            && pawnAttacks(opposite(this.turn), this.epSquare).intersects(this.board.pieces(this.turn, 'pawn'))) {
            ctx.mustCapture = true;
            return ctx;
        }
        const enemy = this.board[opposite(this.turn)];
        for (const from of this.board[this.turn]) {
            if (pseudoDests(this, from, ctx).intersects(enemy)) {
                ctx.mustCapture = true;
                return ctx;
            }
        }
        return ctx;
    }
    dests(square, ctx) {
        ctx = ctx || this.ctx();
        const dests = pseudoDests(this, square, ctx);
        const enemy = this.board[opposite(this.turn)];
        return dests.intersect(ctx.mustCapture
            ? defined(this.epSquare) && this.board.getRole(square) === 'pawn'
                ? enemy.with(this.epSquare)
                : enemy
            : SquareSet.full());
    }
    hasInsufficientMaterial(color) {
        if (this.board[color].isEmpty())
            return false;
        if (this.board[opposite(color)].isEmpty())
            return true;
        if (this.board.occupied.equals(this.board.bishop)) {
            const weSomeOnLight = this.board[color].intersects(SquareSet.lightSquares());
            const weSomeOnDark = this.board[color].intersects(SquareSet.darkSquares());
            const theyAllOnDark = this.board[opposite(color)].isDisjoint(SquareSet.lightSquares());
            const theyAllOnLight = this.board[opposite(color)].isDisjoint(SquareSet.darkSquares());
            return (weSomeOnLight && theyAllOnDark) || (weSomeOnDark && theyAllOnLight);
        }
        if (this.board.occupied.equals(this.board.knight) && this.board.occupied.size() === 2) {
            return ((this.board.white.intersects(SquareSet.lightSquares())
                !== this.board.black.intersects(SquareSet.darkSquares()))
                !== (this.turn === color));
        }
        return false;
    }
    isVariantEnd() {
        return this.board[this.turn].isEmpty();
    }
    variantOutcome(ctx) {
        ctx = ctx || this.ctx();
        if (ctx.variantEnd || this.isStalemate(ctx)) {
            return { winner: this.turn };
        }
        return;
    }
}
class KingOfTheHill extends Position {
    constructor() {
        super('kingofthehill');
    }
    static default() {
        const pos = new this();
        pos.reset();
        return pos;
    }
    static fromSetup(setup) {
        const pos = new this();
        pos.setupUnchecked(setup);
        return pos.validate().map(_ => pos);
    }
    clone() {
        return super.clone();
    }
    hasInsufficientMaterial(_color) {
        return false;
    }
    isVariantEnd() {
        return this.board.king.intersects(SquareSet.center());
    }
    variantOutcome(_ctx) {
        for (const color of COLORS) {
            if (this.board.pieces(color, 'king').intersects(SquareSet.center()))
                return { winner: color };
        }
        return;
    }
}
class ThreeCheck extends Position {
    constructor() {
        super('3check');
    }
    reset() {
        super.reset();
        this.remainingChecks = RemainingChecks.default();
    }
    setupUnchecked(setup) {
        var _a;
        super.setupUnchecked(setup);
        this.remainingChecks = ((_a = setup.remainingChecks) === null || _a === void 0 ? void 0 : _a.clone()) || RemainingChecks.default();
    }
    static default() {
        const pos = new this();
        pos.reset();
        return pos;
    }
    static fromSetup(setup) {
        const pos = new this();
        pos.setupUnchecked(setup);
        return pos.validate().map(_ => pos);
    }
    clone() {
        return super.clone();
    }
    hasInsufficientMaterial(color) {
        return this.board.pieces(color, 'king').equals(this.board[color]);
    }
    isVariantEnd() {
        return !!this.remainingChecks && (this.remainingChecks.white <= 0 || this.remainingChecks.black <= 0);
    }
    variantOutcome(_ctx) {
        if (this.remainingChecks) {
            for (const color of COLORS) {
                if (this.remainingChecks[color] <= 0)
                    return { winner: color };
            }
        }
        return;
    }
}
const racingKingsBoard = () => {
    const board = Board.empty();
    board.occupied = new SquareSet(0xffff, 0);
    board.promoted = SquareSet.empty();
    board.white = new SquareSet(0xf0f0, 0);
    board.black = new SquareSet(0x0f0f, 0);
    board.pawn = SquareSet.empty();
    board.knight = new SquareSet(0x1818, 0);
    board.bishop = new SquareSet(0x2424, 0);
    board.rook = new SquareSet(0x4242, 0);
    board.queen = new SquareSet(0x0081, 0);
    board.king = new SquareSet(0x8100, 0);
    return board;
};
class RacingKings extends Position {
    constructor() {
        super('racingkings');
    }
    reset() {
        this.board = racingKingsBoard();
        this.pockets = undefined;
        this.turn = 'white';
        this.castles = Castles.empty();
        this.epSquare = undefined;
        this.remainingChecks = undefined;
        this.halfmoves = 0;
        this.fullmoves = 1;
    }
    setupUnchecked(setup) {
        super.setupUnchecked(setup);
        this.castles = Castles.empty();
    }
    static default() {
        const pos = new this();
        pos.reset();
        return pos;
    }
    static fromSetup(setup) {
        const pos = new this();
        pos.setupUnchecked(setup);
        return pos.validate().map(_ => pos);
    }
    clone() {
        return super.clone();
    }
    validate() {
        if (this.isCheck() || this.board.pawn.nonEmpty())
            return n.err(new PositionError(IllegalSetup.Variant));
        return super.validate();
    }
    dests(square, ctx) {
        ctx = ctx || this.ctx();
        // Kings cannot give check.
        if (square === ctx.king)
            return super.dests(square, ctx);
        // Do not allow giving check.
        let dests = SquareSet.empty();
        for (const to of super.dests(square, ctx)) {
            // Valid, because there are no promotions (or even pawns).
            const move = { from: square, to };
            const after = this.clone();
            after.play(move);
            if (!after.isCheck())
                dests = dests.with(to);
        }
        return dests;
    }
    hasInsufficientMaterial(_color) {
        return false;
    }
    isVariantEnd() {
        const goal = SquareSet.fromRank(7);
        const inGoal = this.board.king.intersect(goal);
        if (inGoal.isEmpty())
            return false;
        if (this.turn === 'white' || inGoal.intersects(this.board.black))
            return true;
        // White has reached the backrank. Check if black can catch up.
        const blackKing = this.board.kingOf('black');
        if (defined(blackKing)) {
            const occ = this.board.occupied.without(blackKing);
            for (const target of kingAttacks(blackKing).intersect(goal).diff(this.board.black)) {
                if (this.kingAttackers(target, 'white', occ).isEmpty())
                    return false;
            }
        }
        return true;
    }
    variantOutcome(ctx) {
        if (ctx ? !ctx.variantEnd : !this.isVariantEnd())
            return;
        const goal = SquareSet.fromRank(7);
        const blackInGoal = this.board.pieces('black', 'king').intersects(goal);
        const whiteInGoal = this.board.pieces('white', 'king').intersects(goal);
        if (blackInGoal && !whiteInGoal)
            return { winner: 'black' };
        if (whiteInGoal && !blackInGoal)
            return { winner: 'white' };
        return { winner: undefined };
    }
}
const hordeBoard = () => {
    const board = Board.empty();
    board.occupied = new SquareSet(4294967295, 4294901862);
    board.promoted = SquareSet.empty();
    board.white = new SquareSet(4294967295, 102);
    board.black = new SquareSet(0, 4294901760);
    board.pawn = new SquareSet(4294967295, 16711782);
    board.knight = new SquareSet(0, 1107296256);
    board.bishop = new SquareSet(0, 603979776);
    board.rook = new SquareSet(0, 2164260864);
    board.queen = new SquareSet(0, 134217728);
    board.king = new SquareSet(0, 268435456);
    return board;
};
class Horde extends Position {
    constructor() {
        super('horde');
    }
    reset() {
        this.board = hordeBoard();
        this.pockets = undefined;
        this.turn = 'white';
        this.castles = Castles.default();
        this.castles.discardColor('white');
        this.epSquare = undefined;
        this.remainingChecks = undefined;
        this.halfmoves = 0;
        this.fullmoves = 1;
    }
    static default() {
        const pos = new this();
        pos.reset();
        return pos;
    }
    static fromSetup(setup) {
        const pos = new this();
        pos.setupUnchecked(setup);
        return pos.validate().map(_ => pos);
    }
    clone() {
        return super.clone();
    }
    validate() {
        if (this.board.occupied.isEmpty())
            return n.err(new PositionError(IllegalSetup.Empty));
        if (this.board.king.size() !== 1)
            return n.err(new PositionError(IllegalSetup.Kings));
        const otherKing = this.board.kingOf(opposite(this.turn));
        if (defined(otherKing) && this.kingAttackers(otherKing, this.turn, this.board.occupied).nonEmpty()) {
            return n.err(new PositionError(IllegalSetup.OppositeCheck));
        }
        for (const color of COLORS) {
            const backranks = this.board.pieces(color, 'king').isEmpty()
                ? SquareSet.backrank(opposite(color))
                : SquareSet.backranks();
            if (this.board.pieces(color, 'pawn').intersects(backranks)) {
                return n.err(new PositionError(IllegalSetup.PawnsOnBackrank));
            }
        }
        return n.ok(undefined);
    }
    hasInsufficientMaterial(color) {
        // The side with the king can always win by capturing the horde.
        if (this.board.pieces(color, 'king').nonEmpty())
            return false;
        const oppositeSquareColor = (squareColor) => (squareColor === 'light' ? 'dark' : 'light');
        const coloredSquares = (squareColor) => squareColor === 'light' ? SquareSet.lightSquares() : SquareSet.darkSquares();
        const hasBishopPair = (side) => {
            const bishops = this.board.pieces(side, 'bishop');
            return bishops.intersects(SquareSet.darkSquares()) && bishops.intersects(SquareSet.lightSquares());
        };
        // By this point: color is the horde.
        // Based on
        // https://github.com/stevepapazis/horde-insufficient-material-tests.
        const horde = MaterialSide.fromBoard(this.board, color);
        const hordeBishops = (squareColor) => coloredSquares(squareColor).intersect(this.board.pieces(color, 'bishop')).size();
        const hordeBishopColor = hordeBishops('light') >= 1 ? 'light' : 'dark';
        const hordeNum = horde.pawn
            + horde.knight
            + horde.rook
            + horde.queen
            + Math.min(hordeBishops('dark'), 2)
            + Math.min(hordeBishops('light'), 2);
        const pieces = MaterialSide.fromBoard(this.board, opposite(color));
        const piecesBishops = (squareColor) => coloredSquares(squareColor)
            .intersect(this.board.pieces(opposite(color), 'bishop'))
            .size();
        const piecesNum = pieces.size();
        const piecesOfRoleNot = (piece) => piecesNum - piece;
        if (hordeNum === 0)
            return true;
        if (hordeNum >= 4) {
            // Four or more pieces can always deliver mate.
            return false;
        }
        if ((horde.pawn >= 1 || horde.queen >= 1) && hordeNum >= 2) {
            // Pawns/queens are never insufficient material when paired with any other
            // piece (a pawn promotes to a queen and delivers mate).
            return false;
        }
        if (horde.rook >= 1 && hordeNum >= 2) {
            // A rook is insufficient material only when it is paired with a bishop
            // against a lone king. The horde can mate in any other case.
            // A rook on A1 and a bishop on C3 mate a king on B1 when there is a
            // friendly pawn/opposite-color-bishop/rook/queen on C2.
            // A rook on B8 and a bishop C3 mate a king on A1 when there is a friendly
            // knight on A2.
            if (!(hordeNum === 2
                && horde.rook === 1
                && horde.bishop === 1
                && piecesOfRoleNot(piecesBishops(hordeBishopColor)) === 1)) {
                return false;
            }
        }
        if (hordeNum === 1) {
            if (piecesNum === 1) {
                // A lone piece cannot mate a lone king.
                return true;
            }
            else if (horde.queen === 1) {
                // The horde has a lone queen.
                // A lone queen mates a king on A1 bounded by:
                //  -- a pawn/rook on A2
                //  -- two same color bishops on A2, B1
                // We ignore every other mating case, since it can be reduced to
                // the two previous cases (e.g. a black pawn on A2 and a black
                // bishop on B1).
                return !(pieces.pawn >= 1 || pieces.rook >= 1 || piecesBishops('light') >= 2 || piecesBishops('dark') >= 2);
            }
            else if (horde.pawn === 1) {
                // Promote the pawn to a queen or a knight and check whether white
                // can mate.
                const pawnSquare = this.board.pieces(color, 'pawn').last();
                const promoteToQueen = this.clone();
                promoteToQueen.board.set(pawnSquare, { color, role: 'queen' });
                const promoteToKnight = this.clone();
                promoteToKnight.board.set(pawnSquare, { color, role: 'knight' });
                return promoteToQueen.hasInsufficientMaterial(color) && promoteToKnight.hasInsufficientMaterial(color);
            }
            else if (horde.rook === 1) {
                // A lone rook mates a king on A8 bounded by a pawn/rook on A7 and a
                // pawn/knight on B7. We ignore every other case, since it can be
                // reduced to the two previous cases.
                // (e.g. three pawns on A7, B7, C7)
                return !(pieces.pawn >= 2
                    || (pieces.rook >= 1 && pieces.pawn >= 1)
                    || (pieces.rook >= 1 && pieces.knight >= 1)
                    || (pieces.pawn >= 1 && pieces.knight >= 1));
            }
            else if (horde.bishop === 1) {
                // The horde has a lone bishop.
                return !(
                // The king can be mated on A1 if there is a pawn/opposite-color-bishop
                // on A2 and an opposite-color-bishop on B1.
                // If black has two or more pawns, white gets the benefit of the doubt;
                // there is an outside chance that white promotes its pawns to
                // opposite-color-bishops and selfmates theirself.
                // Every other case that the king is mated by the bishop requires that
                // black has two pawns or two opposite-color-bishop or a pawn and an
                // opposite-color-bishop.
                // For example a king on A3 can be mated if there is
                // a pawn/opposite-color-bishop on A4, a pawn/opposite-color-bishop on
                // B3, a pawn/bishop/rook/queen on A2 and any other piece on B2.
                piecesBishops(oppositeSquareColor(hordeBishopColor)) >= 2
                    || (piecesBishops(oppositeSquareColor(hordeBishopColor)) >= 1 && pieces.pawn >= 1)
                    || pieces.pawn >= 2);
            }
            else if (horde.knight === 1) {
                // The horde has a lone knight.
                return !(
                // The king on A1 can be smother mated by a knight on C2 if there is
                // a pawn/knight/bishop on B2, a knight/rook on B1 and any other piece
                // on A2.
                // Moreover, when black has four or more pieces and two of them are
                // pawns, black can promote their pawns and selfmate theirself.
                piecesNum >= 4
                    && (pieces.knight >= 2
                        || pieces.pawn >= 2
                        || (pieces.rook >= 1 && pieces.knight >= 1)
                        || (pieces.rook >= 1 && pieces.bishop >= 1)
                        || (pieces.knight >= 1 && pieces.bishop >= 1)
                        || (pieces.rook >= 1 && pieces.pawn >= 1)
                        || (pieces.knight >= 1 && pieces.pawn >= 1)
                        || (pieces.bishop >= 1 && pieces.pawn >= 1)
                        || (hasBishopPair(opposite(color)) && pieces.pawn >= 1))
                    && (piecesBishops('dark') < 2 || piecesOfRoleNot(piecesBishops('dark')) >= 3)
                    && (piecesBishops('light') < 2 || piecesOfRoleNot(piecesBishops('light')) >= 3));
            }
            // By this point, we only need to deal with white's minor pieces.
        }
        else if (hordeNum === 2) {
            if (piecesNum === 1) {
                // Two minor pieces cannot mate a lone king.
                return true;
            }
            else if (horde.knight === 2) {
                // A king on A1 is mated by two knights, if it is obstructed by a
                // pawn/bishop/knight on B2. On the other hand, if black only has
                // major pieces it is a draw.
                return pieces.pawn + pieces.bishop + pieces.knight < 1;
            }
            else if (hasBishopPair(color)) {
                return !(
                // A king on A1 obstructed by a pawn/bishop on A2 is mated
                // by the bishop pair.
                pieces.pawn >= 1
                    || pieces.bishop >= 1
                    // A pawn/bishop/knight on B4, a pawn/bishop/rook/queen on
                    // A4 and the king on A3 enable Boden's mate by the bishop
                    // pair. In every other case white cannot win.
                    || (pieces.knight >= 1 && pieces.rook + pieces.queen >= 1));
            }
            else if (horde.bishop >= 1 && horde.knight >= 1) {
                // The horde has a bishop and a knight.
                return !(
                // A king on A1 obstructed by a pawn/opposite-color-bishop on
                // A2 is mated by a knight on D2 and a bishop on C3.
                pieces.pawn >= 1
                    || piecesBishops(oppositeSquareColor(hordeBishopColor)) >= 1
                    // A king on A1 bounded by two friendly pieces on A2 and B1 is
                    // mated when the knight moves from D4 to C2 so that both the
                    // knight and the bishop deliver check.
                    || piecesOfRoleNot(piecesBishops(hordeBishopColor)) >= 3);
            }
            else {
                // The horde has two or more bishops on the same color.
                // White can only win if black has enough material to obstruct
                // the squares of the opposite color around the king.
                return !(
                // A king on A1 obstructed by a pawn/opposite-bishop/knight
                // on A2 and a opposite-bishop/knight on B1 is mated by two
                // bishops on B2 and C3. This position is theoretically
                // achievable even when black has two pawns or when they
                // have a pawn and an opposite color bishop.
                (pieces.pawn >= 1 && piecesBishops(oppositeSquareColor(hordeBishopColor)) >= 1)
                    || (pieces.pawn >= 1 && pieces.knight >= 1)
                    || (piecesBishops(oppositeSquareColor(hordeBishopColor)) >= 1 && pieces.knight >= 1)
                    || piecesBishops(oppositeSquareColor(hordeBishopColor)) >= 2
                    || pieces.knight >= 2
                    || pieces.pawn >= 2
                // In every other case, white can only draw.
                );
            }
        }
        else if (hordeNum === 3) {
            // A king in the corner is mated by two knights and a bishop or three
            // knights or the bishop pair and a knight/bishop.
            if ((horde.knight === 2 && horde.bishop === 1) || horde.knight === 3 || hasBishopPair(color)) {
                return false;
            }
            else {
                // White has two same color bishops and a knight.
                // A king on A1 is mated by a bishop on B2, a bishop on C1 and a
                // knight on C3, as long as there is another black piece to waste
                // a tempo.
                return piecesNum === 1;
            }
        }
        return true;
    }
    isVariantEnd() {
        return this.board.white.isEmpty() || this.board.black.isEmpty();
    }
    variantOutcome(_ctx) {
        if (this.board.white.isEmpty())
            return { winner: 'black' };
        if (this.board.black.isEmpty())
            return { winner: 'white' };
        return;
    }
}
const defaultPosition = (rules) => {
    switch (rules) {
        case 'chess':
            return Chess.default();
        case 'antichess':
            return Antichess.default();
        case 'atomic':
            return Atomic.default();
        case 'horde':
            return Horde.default();
        case 'racingkings':
            return RacingKings.default();
        case 'kingofthehill':
            return KingOfTheHill.default();
        case '3check':
            return ThreeCheck.default();
        case 'crazyhouse':
            return Crazyhouse.default();
    }
};
const setupPosition = (rules, setup) => {
    switch (rules) {
        case 'chess':
            return Chess.fromSetup(setup);
        case 'antichess':
            return Antichess.fromSetup(setup);
        case 'atomic':
            return Atomic.fromSetup(setup);
        case 'horde':
            return Horde.fromSetup(setup);
        case 'racingkings':
            return RacingKings.fromSetup(setup);
        case 'kingofthehill':
            return KingOfTheHill.fromSetup(setup);
        case '3check':
            return ThreeCheck.fromSetup(setup);
        case 'crazyhouse':
            return Crazyhouse.fromSetup(setup);
    }
};

/**
 * Parse, transform and write PGN.
 *
 * ## Parser
 *
 * The parser will interpret any input as a PGN, creating a tree of
 * syntactically valid (but not necessarily legal) moves, skipping any invalid
 * tokens.
 *
 * ```ts
 * import { parsePgn, startingPosition } from 'chessops/pgn';
 * import { parseSan } from 'chessops/san';
 *
 * const pgn = '1. d4 d5 *';
 * const games = parsePgn(pgn);
 * for (const game of games) {
 *   const pos = startingPosition(game.headers).unwrap();
 *   for (const node of game.moves.mainline()) {
 *     const move = parseSan(pos, node.san);
 *     if (!move) break; // Illegal move
 *     pos.play(move);
 *   }
 * }
 * ```
 *
 * ## Streaming parser
 *
 * The module also provides a denial-of-service resistant streaming parser.
 * It can be configured with a budget for reasonable complexity of a single
 * game, fed with chunks of text, and will yield parsed games as they are
 * completed.
 *
 * ```ts
 *
 * import { createReadStream } from 'fs';
 * import { PgnParser } from 'chessops/pgn';
 *
 * const stream = createReadStream('games.pgn', { encoding: 'utf-8' });
 *
 * const parser = new PgnParser((game, err) => {
 *   if (err) {
 *     // Budget exceeded.
 *     stream.destroy(err);
 *   }
 *
 *   // Use game ...
 * });
 *
 * await new Promise<void>(resolve =>
 *   stream
 *     .on('data', (chunk: string) => parser.parse(chunk, { stream: true }))
 *     .on('close', () => {
 *       parser.parse('');
 *       resolve();
 *     })
 * );
 * ```
 *
 * ## Augmenting the game tree
 *
 * You can use `walk` to visit all nodes in the game tree, or `transform`
 * to augment it with user data.
 *
 * Both allow you to provide context. You update the context inside the
 * callback, and it is automatically `clone()`-ed at each fork.
 * In the example below, the current position `pos` is provided as context.
 *
 * ```ts
 * import { transform } from 'chessops/pgn';
 * import { makeFen } from 'chessops/fen';
 * import { parseSan, makeSanAndPlay } from 'chessops/san';
 *
 * const pos = startingPosition(game.headers).unwrap();
 * game.moves = transform(game.moves, pos, (pos, node) => {
 *   const move = parseSan(pos, node.san);
 *   if (!move) {
 *     // Illegal move. Returning undefined cuts off the tree here.
 *     return;
 *   }
 *
 *   const san = makeSanAndPlay(pos, move); // Mutating pos!
 *
 *   return {
 *     ...node, // Keep comments and annotation glyphs
 *     san, // Normalized SAN
 *     fen: makeFen(pos.toSetup()), // Add arbitrary user data to node
 *   };
 * });
 * ```
 *
 * ## Writing
 *
 * Requires each node to at least have a `san` property.
 *
 * ```
 * import { makePgn } from 'chessops/pgn';
 *
 * const rewrittenPgn = makePgn(game);
 * ```
 *
 * @packageDocumentation
 */
const defaultGame = (initHeaders = defaultHeaders) => ({
    headers: initHeaders(),
    moves: new Node(),
});
class Node {
    constructor() {
        this.children = [];
    }
    *mainlineNodes() {
        let node = this;
        while (node.children.length) {
            const child = node.children[0];
            yield child;
            node = child;
        }
    }
    *mainline() {
        for (const child of this.mainlineNodes())
            yield child.data;
    }
    end() {
        let node = this;
        while (node.children.length)
            node = node.children[0];
        return node;
    }
}
class ChildNode extends Node {
    constructor(data) {
        super();
        this.data = data;
    }
}
const defaultHeaders = () => new Map([
    ['Event', '?'],
    ['Site', '?'],
    ['Date', '????.??.??'],
    ['Round', '?'],
    ['White', '?'],
    ['Black', '?'],
    ['Result', '*'],
]);
const BOM = '\ufeff';
const isWhitespace = (line) => /^\s*$/.test(line);
const isCommentLine = (line) => line.startsWith('%');
class PgnError extends Error {
}
class PgnParser {
    constructor(emitGame, initHeaders = defaultHeaders, maxBudget = 1000000) {
        this.emitGame = emitGame;
        this.initHeaders = initHeaders;
        this.maxBudget = maxBudget;
        this.lineBuf = [];
        this.resetGame();
        this.state = 0 /* ParserState.Bom */;
    }
    resetGame() {
        this.budget = this.maxBudget;
        this.found = false;
        this.state = 1 /* ParserState.Pre */;
        this.game = defaultGame(this.initHeaders);
        this.stack = [{ parent: this.game.moves, root: true }];
        this.commentBuf = [];
    }
    consumeBudget(cost) {
        this.budget -= cost;
        if (this.budget < 0)
            throw new PgnError('ERR_PGN_BUDGET');
    }
    parse(data, options) {
        if (this.budget < 0)
            return;
        try {
            let idx = 0;
            for (;;) {
                const nlIdx = data.indexOf('\n', idx);
                if (nlIdx === -1) {
                    break;
                }
                const crIdx = nlIdx > idx && data[nlIdx - 1] === '\r' ? nlIdx - 1 : nlIdx;
                this.consumeBudget(nlIdx - idx);
                this.lineBuf.push(data.slice(idx, crIdx));
                idx = nlIdx + 1;
                this.handleLine();
            }
            this.consumeBudget(data.length - idx);
            this.lineBuf.push(data.slice(idx));
            if (!(options === null || options === void 0 ? void 0 : options.stream)) {
                this.handleLine();
                this.emit(undefined);
            }
        }
        catch (err) {
            this.emit(err);
        }
    }
    handleLine() {
        let freshLine = true;
        let line = this.lineBuf.join('');
        this.lineBuf = [];
        continuedLine: for (;;) {
            switch (this.state) {
                case 0 /* ParserState.Bom */:
                    if (line.startsWith(BOM))
                        line = line.slice(BOM.length);
                    this.state = 1 /* ParserState.Pre */; // fall through
                case 1 /* ParserState.Pre */:
                    if (isWhitespace(line) || isCommentLine(line))
                        return;
                    this.found = true;
                    this.state = 2 /* ParserState.Headers */; // fall through
                case 2 /* ParserState.Headers */: {
                    if (isCommentLine(line))
                        return;
                    let moreHeaders = true;
                    while (moreHeaders) {
                        moreHeaders = false;
                        line = line.replace(/^\s*\[([A-Za-z0-9][A-Za-z0-9_+#=:-]*)\s+"((?:[^"\\]|\\"|\\\\)*)"\]/, (_match, headerName, headerValue) => {
                            this.consumeBudget(200);
                            this.game.headers.set(headerName, headerValue.replace(/\\"/g, '"').replace(/\\\\/g, '\\'));
                            moreHeaders = true;
                            freshLine = false;
                            return '';
                        });
                    }
                    if (isWhitespace(line))
                        return;
                    this.state = 3 /* ParserState.Moves */; // fall through
                }
                case 3 /* ParserState.Moves */: {
                    if (freshLine) {
                        if (isCommentLine(line))
                            return;
                        if (isWhitespace(line))
                            return this.emit(undefined);
                    }
                    const tokenRegex = /(?:[NBKRQ]?[a-h]?[1-8]?[-x]?[a-h][1-8](?:=?[nbrqkNBRQK])?|[pnbrqkPNBRQK]?@[a-h][1-8]|O-O-O|0-0-0|O-O|0-0)[+#]?|--|Z0|0000|@@@@|{|;|\$\d{1,4}|[?!]{1,2}|\(|\)|\*|1-0|0-1|1\/2-1\/2/g;
                    let match;
                    while ((match = tokenRegex.exec(line))) {
                        const frame = this.stack[this.stack.length - 1];
                        let token = match[0];
                        if (token === ';')
                            return;
                        else if (token.startsWith('$'))
                            this.handleNag(parseInt(token.slice(1), 10));
                        else if (token === '!')
                            this.handleNag(1);
                        else if (token === '?')
                            this.handleNag(2);
                        else if (token === '!!')
                            this.handleNag(3);
                        else if (token === '??')
                            this.handleNag(4);
                        else if (token === '!?')
                            this.handleNag(5);
                        else if (token === '?!')
                            this.handleNag(6);
                        else if (token === '1-0' || token === '0-1' || token === '1/2-1/2' || token === '*') {
                            if (this.stack.length === 1 && token !== '*')
                                this.game.headers.set('Result', token);
                        }
                        else if (token === '(') {
                            this.consumeBudget(100);
                            this.stack.push({ parent: frame.parent, root: false });
                        }
                        else if (token === ')') {
                            if (this.stack.length > 1)
                                this.stack.pop();
                        }
                        else if (token === '{') {
                            const openIndex = tokenRegex.lastIndex;
                            const beginIndex = line[openIndex] === ' ' ? openIndex + 1 : openIndex;
                            line = line.slice(beginIndex);
                            this.state = 4 /* ParserState.Comment */;
                            continue continuedLine;
                        }
                        else {
                            this.consumeBudget(100);
                            if (token === 'Z0' || token === '0000' || token === '@@@@')
                                token = '--';
                            else if (token.startsWith('0'))
                                token = token.replace(/0/g, 'O');
                            if (frame.node)
                                frame.parent = frame.node;
                            frame.node = new ChildNode({
                                san: token,
                                startingComments: frame.startingComments,
                            });
                            frame.startingComments = undefined;
                            frame.root = false;
                            frame.parent.children.push(frame.node);
                        }
                    }
                    return;
                }
                case 4 /* ParserState.Comment */: {
                    const closeIndex = line.indexOf('}');
                    if (closeIndex === -1) {
                        this.commentBuf.push(line);
                        return;
                    }
                    else {
                        const endIndex = closeIndex > 0 && line[closeIndex - 1] === ' ' ? closeIndex - 1 : closeIndex;
                        this.commentBuf.push(line.slice(0, endIndex));
                        this.handleComment();
                        line = line.slice(closeIndex);
                        this.state = 3 /* ParserState.Moves */;
                        freshLine = false;
                    }
                }
            }
        }
    }
    handleNag(nag) {
        var _a;
        this.consumeBudget(50);
        const frame = this.stack[this.stack.length - 1];
        if (frame.node) {
            (_a = frame.node.data).nags || (_a.nags = []);
            frame.node.data.nags.push(nag);
        }
    }
    handleComment() {
        var _a, _b;
        this.consumeBudget(100);
        const frame = this.stack[this.stack.length - 1];
        const comment = this.commentBuf.join('\n');
        this.commentBuf = [];
        if (frame.node) {
            (_a = frame.node.data).comments || (_a.comments = []);
            frame.node.data.comments.push(comment);
        }
        else if (frame.root) {
            (_b = this.game).comments || (_b.comments = []);
            this.game.comments.push(comment);
        }
        else {
            frame.startingComments || (frame.startingComments = []);
            frame.startingComments.push(comment);
        }
    }
    emit(err) {
        if (this.state === 4 /* ParserState.Comment */)
            this.handleComment();
        if (err)
            return this.emitGame(this.game, err);
        if (this.found)
            this.emitGame(this.game, undefined);
        this.resetGame();
    }
}
const parsePgn = (pgn, initHeaders = defaultHeaders) => {
    const games = [];
    new PgnParser(game => games.push(game), initHeaders, NaN).parse(pgn);
    return games;
};
const parseVariant = (variant) => {
    switch ((variant || 'chess').toLowerCase()) {
        case 'chess':
        case 'chess960':
        case 'chess 960':
        case 'standard':
        case 'from position':
        case 'classical':
        case 'normal':
        case 'fischerandom': // Cute Chess
        case 'fischerrandom':
        case 'fischer random':
        case 'wild/0':
        case 'wild/1':
        case 'wild/2':
        case 'wild/3':
        case 'wild/4':
        case 'wild/5':
        case 'wild/6':
        case 'wild/7':
        case 'wild/8':
        case 'wild/8a':
            return 'chess';
        case 'crazyhouse':
        case 'crazy house':
        case 'house':
        case 'zh':
            return 'crazyhouse';
        case 'king of the hill':
        case 'koth':
        case 'kingofthehill':
            return 'kingofthehill';
        case 'three-check':
        case 'three check':
        case 'threecheck':
        case 'three check chess':
        case '3-check':
        case '3 check':
        case '3check':
            return '3check';
        case 'antichess':
        case 'anti chess':
        case 'anti':
            return 'antichess';
        case 'atomic':
        case 'atom':
        case 'atomic chess':
            return 'atomic';
        case 'horde':
        case 'horde chess':
            return 'horde';
        case 'racing kings':
        case 'racingkings':
        case 'racing':
        case 'race':
            return 'racingkings';
        default:
            return;
    }
};
const startingPosition = (headers) => {
    const rules = parseVariant(headers.get('Variant'));
    if (!rules)
        return n.err(new PositionError(IllegalSetup.Variant));
    const fen = headers.get('FEN');
    if (fen)
        return parseFen(fen).chain(setup => setupPosition(rules, setup));
    else
        return n.ok(defaultPosition(rules));
};

const parseSan = (pos, san) => {
    const ctx = pos.ctx();
    // Normal move
    const match = san.match(/^([NBRQK])?([a-h])?([1-8])?[-x]?([a-h][1-8])(?:=?([nbrqkNBRQK]))?[+#]?$/);
    if (!match) {
        // Castling
        let castlingSide;
        if (san === 'O-O' || san === 'O-O+' || san === 'O-O#')
            castlingSide = 'h';
        else if (san === 'O-O-O' || san === 'O-O-O+' || san === 'O-O-O#')
            castlingSide = 'a';
        if (castlingSide) {
            const rook = pos.castles.rook[pos.turn][castlingSide];
            if (!defined(ctx.king) || !defined(rook) || !pos.dests(ctx.king, ctx).has(rook))
                return;
            return {
                from: ctx.king,
                to: rook,
            };
        }
        // Drop
        const match = san.match(/^([pnbrqkPNBRQK])?@([a-h][1-8])[+#]?$/);
        if (!match)
            return;
        const move = {
            role: match[1] ? charToRole(match[1]) : 'pawn',
            to: parseSquare(match[2]),
        };
        return pos.isLegal(move, ctx) ? move : undefined;
    }
    const role = match[1] ? charToRole(match[1]) : 'pawn';
    const to = parseSquare(match[4]);
    const promotion = match[5] ? charToRole(match[5]) : undefined;
    if (!!promotion !== (role === 'pawn' && SquareSet.backranks().has(to)))
        return;
    if (promotion === 'king' && pos.rules !== 'antichess')
        return;
    let candidates = pos.board.pieces(pos.turn, role);
    if (role === 'pawn' && !match[2])
        candidates = candidates.intersect(SquareSet.fromFile(squareFile(to)));
    else if (match[2])
        candidates = candidates.intersect(SquareSet.fromFile(match[2].charCodeAt(0) - 'a'.charCodeAt(0)));
    if (match[3])
        candidates = candidates.intersect(SquareSet.fromRank(match[3].charCodeAt(0) - '1'.charCodeAt(0)));
    // Optimization: Reduce set of candidates
    const pawnAdvance = role === 'pawn' ? SquareSet.fromFile(squareFile(to)) : SquareSet.empty();
    candidates = candidates.intersect(pawnAdvance.union(attacks({ color: opposite(pos.turn), role }, to, pos.board.occupied)));
    // Check uniqueness and legality
    let from;
    for (const candidate of candidates) {
        if (pos.dests(candidate, ctx).has(to)) {
            if (defined(from))
                return; // Ambiguous
            from = candidate;
        }
    }
    if (!defined(from))
        return; // Illegal
    return {
        from,
        to,
        promotion,
    };
};

/* svelte/components/PuzzleHistoryProcessor.svelte generated by Svelte v4.2.18 */
const file$1 = "svelte/components/PuzzleHistoryProcessor.svelte";

// (53:0) {:else}
function create_else_block$1(ctx) {
	let p;
	let strong;
	let t0_value = /*uniquePuzzleIds*/ ctx[7].length + "";
	let t0;
	let t1;

	const block = {
		c: function create() {
			p = element("p");
			strong = element("strong");
			t0 = text(t0_value);
			t1 = text(" puzzles loaded.");
			add_location(strong, file$1, 53, 5, 1302);
			add_location(p, file$1, 53, 2, 1299);
		},
		m: function mount(target, anchor) {
			insert_dev(target, p, anchor);
			append_dev(p, strong);
			append_dev(strong, t0);
			append_dev(p, t1);
		},
		p: function update(ctx, dirty) {
			if (dirty & /*uniquePuzzleIds*/ 128 && t0_value !== (t0_value = /*uniquePuzzleIds*/ ctx[7].length + "")) set_data_dev(t0, t0_value);
		},
		d: function destroy(detaching) {
			if (detaching) {
				detach_dev(p);
			}
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_else_block$1.name,
		type: "else",
		source: "(53:0) {:else}",
		ctx
	});

	return block;
}

// (44:0) {#if uniquePuzzleIds.length === 0}
function create_if_block_1$1(ctx) {
	let div1;
	let div0;
	let textarea;
	let t0;
	let button;
	let mounted;
	let dispose;

	const block = {
		c: function create() {
			div1 = element("div");
			div0 = element("div");
			textarea = element("textarea");
			t0 = space();
			button = element("button");
			button.textContent = "Load Data";
			attr_dev(textarea, "class", "textarea");
			add_location(textarea, file$1, 46, 6, 1114);
			attr_dev(div0, "class", "control");
			add_location(div0, file$1, 45, 4, 1086);
			attr_dev(div1, "class", "field");
			add_location(div1, file$1, 44, 2, 1062);
			attr_dev(button, "class", "button is-primary");
			add_location(button, file$1, 49, 2, 1199);
		},
		m: function mount(target, anchor) {
			insert_dev(target, div1, anchor);
			append_dev(div1, div0);
			append_dev(div0, textarea);
			set_input_value(textarea, /*puzzleData*/ ctx[0]);
			insert_dev(target, t0, anchor);
			insert_dev(target, button, anchor);

			if (!mounted) {
				dispose = [
					listen_dev(textarea, "input", /*textarea_input_handler*/ ctx[13]),
					listen_dev(button, "click", /*processPuzzleData*/ ctx[9], false, false, false, false)
				];

				mounted = true;
			}
		},
		p: function update(ctx, dirty) {
			if (dirty & /*puzzleData*/ 1) {
				set_input_value(textarea, /*puzzleData*/ ctx[0]);
			}
		},
		d: function destroy(detaching) {
			if (detaching) {
				detach_dev(div1);
				detach_dev(t0);
				detach_dev(button);
			}

			mounted = false;
			run_all(dispose);
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_if_block_1$1.name,
		type: "if",
		source: "(44:0) {#if uniquePuzzleIds.length === 0}",
		ctx
	});

	return block;
}

// (99:0) {#if filterSubmitted}
function create_if_block$1(ctx) {
	let p;
	let t0;
	let strong;
	let t1_value = /*uniqueFilteredPuzzleIds*/ ctx[6].length + "";
	let t1;
	let t2;
	let t3;
	let div1;
	let div0;
	let input;
	let input_value_value;
	let mounted;
	let dispose;

	const block = {
		c: function create() {
			p = element("p");
			t0 = text("Found ");
			strong = element("strong");
			t1 = text(t1_value);
			t2 = text(" matching puzzles");
			t3 = space();
			div1 = element("div");
			div0 = element("div");
			input = element("input");
			add_location(strong, file$1, 100, 10, 2504);
			add_location(p, file$1, 99, 2, 2490);
			attr_dev(input, "class", "input");
			attr_dev(input, "type", "text");
			input.readOnly = true;
			input.value = input_value_value = /*uniqueFilteredPuzzleIds*/ ctx[6].join(",");
			add_location(input, file$1, 104, 6, 2632);
			attr_dev(div0, "class", "control");
			add_location(div0, file$1, 103, 4, 2604);
			attr_dev(div1, "class", "field");
			add_location(div1, file$1, 102, 2, 2580);
		},
		m: function mount(target, anchor) {
			insert_dev(target, p, anchor);
			append_dev(p, t0);
			append_dev(p, strong);
			append_dev(strong, t1);
			append_dev(p, t2);
			insert_dev(target, t3, anchor);
			insert_dev(target, div1, anchor);
			append_dev(div1, div0);
			append_dev(div0, input);
			/*input_binding*/ ctx[18](input);

			if (!mounted) {
				dispose = listen_dev(input, "focus", /*focus_handler*/ ctx[19], false, false, false, false);
				mounted = true;
			}
		},
		p: function update(ctx, dirty) {
			if (dirty & /*uniqueFilteredPuzzleIds*/ 64 && t1_value !== (t1_value = /*uniqueFilteredPuzzleIds*/ ctx[6].length + "")) set_data_dev(t1, t1_value);

			if (dirty & /*uniqueFilteredPuzzleIds*/ 64 && input_value_value !== (input_value_value = /*uniqueFilteredPuzzleIds*/ ctx[6].join(",")) && input.value !== input_value_value) {
				prop_dev(input, "value", input_value_value);
			}
		},
		d: function destroy(detaching) {
			if (detaching) {
				detach_dev(p);
				detach_dev(t3);
				detach_dev(div1);
			}

			/*input_binding*/ ctx[18](null);
			mounted = false;
			dispose();
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_if_block$1.name,
		type: "if",
		source: "(99:0) {#if filterSubmitted}",
		ctx
	});

	return block;
}

function create_fragment$1(ctx) {
	let t0;
	let form;
	let div1;
	let label0;
	let t2;
	let div0;
	let input0;
	let t3;
	let div3;
	let label1;
	let t5;
	let div2;
	let input1;
	let input1_min_value;
	let t6;
	let div4;
	let label2;
	let t8;
	let input2;
	let t9;
	let div5;
	let label3;
	let t11;
	let input3;
	let t12;
	let button;
	let t14;
	let if_block1_anchor;
	let mounted;
	let dispose;

	function select_block_type(ctx, dirty) {
		if (/*uniquePuzzleIds*/ ctx[7].length === 0) return create_if_block_1$1;
		return create_else_block$1;
	}

	let current_block_type = select_block_type(ctx);
	let if_block0 = current_block_type(ctx);
	let if_block1 = /*filterSubmitted*/ ctx[5] && create_if_block$1(ctx);

	const block = {
		c: function create() {
			if_block0.c();
			t0 = space();
			form = element("form");
			div1 = element("div");
			label0 = element("label");
			label0.textContent = "Min Rating:";
			t2 = space();
			div0 = element("div");
			input0 = element("input");
			t3 = space();
			div3 = element("div");
			label1 = element("label");
			label1.textContent = "Max Rating:";
			t5 = space();
			div2 = element("div");
			input1 = element("input");
			t6 = space();
			div4 = element("div");
			label2 = element("label");
			label2.textContent = "Correct Solves:";
			t8 = space();
			input2 = element("input");
			t9 = space();
			div5 = element("div");
			label3 = element("label");
			label3.textContent = "Incorrect Solves:";
			t11 = space();
			input3 = element("input");
			t12 = space();
			button = element("button");
			button.textContent = "Filter";
			t14 = space();
			if (if_block1) if_block1.c();
			if_block1_anchor = empty();
			attr_dev(label0, "class", "label");
			attr_dev(label0, "for", "minRating");
			add_location(label0, file$1, 58, 4, 1445);
			attr_dev(input0, "class", "input");
			attr_dev(input0, "type", "number");
			attr_dev(input0, "id", "minRating");
			attr_dev(input0, "min", "0");
			attr_dev(input0, "max", "4999");
			add_location(input0, file$1, 60, 6, 1534);
			attr_dev(div0, "class", "control");
			add_location(div0, file$1, 59, 4, 1506);
			attr_dev(div1, "class", "field");
			add_location(div1, file$1, 57, 2, 1421);
			attr_dev(label1, "class", "label");
			attr_dev(label1, "for", "maxRating");
			add_location(label1, file$1, 71, 4, 1729);
			attr_dev(input1, "class", "input");
			attr_dev(input1, "type", "number");
			attr_dev(input1, "id", "maxRating");
			attr_dev(input1, "min", input1_min_value = /*minRating*/ ctx[1] + 1);
			attr_dev(input1, "max", "5000");
			add_location(input1, file$1, 73, 6, 1818);
			attr_dev(div2, "class", "control");
			add_location(div2, file$1, 72, 4, 1790);
			attr_dev(div3, "class", "field");
			add_location(div3, file$1, 70, 2, 1705);
			attr_dev(label2, "class", "checkbox");
			attr_dev(label2, "for", "correctSolves");
			add_location(label2, file$1, 84, 4, 2025);
			attr_dev(input2, "type", "checkbox");
			attr_dev(input2, "id", "correctSolves");
			add_location(input2, file$1, 85, 4, 2097);
			attr_dev(div4, "class", "field");
			add_location(div4, file$1, 83, 2, 2001);
			attr_dev(label3, "class", "checkbox");
			attr_dev(label3, "for", "incorrectSolves");
			add_location(label3, file$1, 88, 4, 2206);
			attr_dev(input3, "type", "checkbox");
			attr_dev(input3, "id", "incorrectSolves");
			add_location(input3, file$1, 89, 4, 2282);
			attr_dev(div5, "class", "field");
			add_location(div5, file$1, 87, 2, 2182);
			attr_dev(button, "class", "button is-primary");
			attr_dev(button, "type", "submit");
			add_location(button, file$1, 95, 2, 2393);
			add_location(form, file$1, 56, 0, 1371);
		},
		l: function claim(nodes) {
			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
		},
		m: function mount(target, anchor) {
			if_block0.m(target, anchor);
			insert_dev(target, t0, anchor);
			insert_dev(target, form, anchor);
			append_dev(form, div1);
			append_dev(div1, label0);
			append_dev(div1, t2);
			append_dev(div1, div0);
			append_dev(div0, input0);
			set_input_value(input0, /*minRating*/ ctx[1]);
			append_dev(form, t3);
			append_dev(form, div3);
			append_dev(div3, label1);
			append_dev(div3, t5);
			append_dev(div3, div2);
			append_dev(div2, input1);
			set_input_value(input1, /*maxRating*/ ctx[2]);
			append_dev(form, t6);
			append_dev(form, div4);
			append_dev(div4, label2);
			append_dev(div4, t8);
			append_dev(div4, input2);
			input2.checked = /*correctSolves*/ ctx[3];
			append_dev(form, t9);
			append_dev(form, div5);
			append_dev(div5, label3);
			append_dev(div5, t11);
			append_dev(div5, input3);
			input3.checked = /*incorrectSolves*/ ctx[4];
			append_dev(form, t12);
			append_dev(form, button);
			insert_dev(target, t14, anchor);
			if (if_block1) if_block1.m(target, anchor);
			insert_dev(target, if_block1_anchor, anchor);

			if (!mounted) {
				dispose = [
					listen_dev(input0, "input", /*input0_input_handler*/ ctx[14]),
					listen_dev(input1, "input", /*input1_input_handler*/ ctx[15]),
					listen_dev(input2, "change", /*input2_change_handler*/ ctx[16]),
					listen_dev(input3, "change", /*input3_change_handler*/ ctx[17]),
					listen_dev(form, "submit", prevent_default(/*filterPuzzles*/ ctx[10]), false, true, false, false)
				];

				mounted = true;
			}
		},
		p: function update(ctx, [dirty]) {
			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block0) {
				if_block0.p(ctx, dirty);
			} else {
				if_block0.d(1);
				if_block0 = current_block_type(ctx);

				if (if_block0) {
					if_block0.c();
					if_block0.m(t0.parentNode, t0);
				}
			}

			if (dirty & /*minRating*/ 2 && to_number(input0.value) !== /*minRating*/ ctx[1]) {
				set_input_value(input0, /*minRating*/ ctx[1]);
			}

			if (dirty & /*minRating*/ 2 && input1_min_value !== (input1_min_value = /*minRating*/ ctx[1] + 1)) {
				attr_dev(input1, "min", input1_min_value);
			}

			if (dirty & /*maxRating*/ 4 && to_number(input1.value) !== /*maxRating*/ ctx[2]) {
				set_input_value(input1, /*maxRating*/ ctx[2]);
			}

			if (dirty & /*correctSolves*/ 8) {
				input2.checked = /*correctSolves*/ ctx[3];
			}

			if (dirty & /*incorrectSolves*/ 16) {
				input3.checked = /*incorrectSolves*/ ctx[4];
			}

			if (/*filterSubmitted*/ ctx[5]) {
				if (if_block1) {
					if_block1.p(ctx, dirty);
				} else {
					if_block1 = create_if_block$1(ctx);
					if_block1.c();
					if_block1.m(if_block1_anchor.parentNode, if_block1_anchor);
				}
			} else if (if_block1) {
				if_block1.d(1);
				if_block1 = null;
			}
		},
		i: noop,
		o: noop,
		d: function destroy(detaching) {
			if (detaching) {
				detach_dev(t0);
				detach_dev(form);
				detach_dev(t14);
				detach_dev(if_block1_anchor);
			}

			if_block0.d(detaching);
			if (if_block1) if_block1.d(detaching);
			mounted = false;
			run_all(dispose);
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_fragment$1.name,
		type: "component",
		source: "",
		ctx
	});

	return block;
}

function instance$1($$self, $$props, $$invalidate) {
	let { $$slots: slots = {}, $$scope } = $$props;
	validate_slots('PuzzleHistoryProcessor', slots, []);
	let puzzleData = "";
	let puzzles = [];
	let filteredPuzzles = [];
	let minRating = 0;
	let maxRating = 5000;
	let correctSolves = false;
	let incorrectSolves = true;
	let filterSubmitted = false;

	function processPuzzleData() {
		$$invalidate(11, puzzles = puzzleData.trim().split("\n").map(JSON.parse));
	}

	function filterPuzzles() {
		$$invalidate(5, filterSubmitted = true);

		$$invalidate(12, filteredPuzzles = puzzles.filter(puzzle => {
			const rating = puzzle.puzzle.rating;
			const win = puzzle.win;
			return rating >= minRating && rating <= maxRating && (win && correctSolves || !win && incorrectSolves);
		}));

		$$invalidate(12, filteredPuzzles); // Trigger reactivity
	}

	let uniqueFilteredPuzzleIds = [];
	let uniquePuzzleIds = [];
	let readonlyInput;
	const writable_props = [];

	Object.keys($$props).forEach(key => {
		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<PuzzleHistoryProcessor> was created with unknown prop '${key}'`);
	});

	function textarea_input_handler() {
		puzzleData = this.value;
		$$invalidate(0, puzzleData);
	}

	function input0_input_handler() {
		minRating = to_number(this.value);
		$$invalidate(1, minRating);
	}

	function input1_input_handler() {
		maxRating = to_number(this.value);
		$$invalidate(2, maxRating);
	}

	function input2_change_handler() {
		correctSolves = this.checked;
		$$invalidate(3, correctSolves);
	}

	function input3_change_handler() {
		incorrectSolves = this.checked;
		$$invalidate(4, incorrectSolves);
	}

	function input_binding($$value) {
		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
			readonlyInput = $$value;
			$$invalidate(8, readonlyInput);
		});
	}

	const focus_handler = () => {
		readonlyInput.select();
	};

	$$self.$capture_state = () => ({
		puzzleData,
		puzzles,
		filteredPuzzles,
		minRating,
		maxRating,
		correctSolves,
		incorrectSolves,
		filterSubmitted,
		processPuzzleData,
		filterPuzzles,
		uniqueFilteredPuzzleIds,
		uniquePuzzleIds,
		readonlyInput
	});

	$$self.$inject_state = $$props => {
		if ('puzzleData' in $$props) $$invalidate(0, puzzleData = $$props.puzzleData);
		if ('puzzles' in $$props) $$invalidate(11, puzzles = $$props.puzzles);
		if ('filteredPuzzles' in $$props) $$invalidate(12, filteredPuzzles = $$props.filteredPuzzles);
		if ('minRating' in $$props) $$invalidate(1, minRating = $$props.minRating);
		if ('maxRating' in $$props) $$invalidate(2, maxRating = $$props.maxRating);
		if ('correctSolves' in $$props) $$invalidate(3, correctSolves = $$props.correctSolves);
		if ('incorrectSolves' in $$props) $$invalidate(4, incorrectSolves = $$props.incorrectSolves);
		if ('filterSubmitted' in $$props) $$invalidate(5, filterSubmitted = $$props.filterSubmitted);
		if ('uniqueFilteredPuzzleIds' in $$props) $$invalidate(6, uniqueFilteredPuzzleIds = $$props.uniqueFilteredPuzzleIds);
		if ('uniquePuzzleIds' in $$props) $$invalidate(7, uniquePuzzleIds = $$props.uniquePuzzleIds);
		if ('readonlyInput' in $$props) $$invalidate(8, readonlyInput = $$props.readonlyInput);
	};

	if ($$props && "$$inject" in $$props) {
		$$self.$inject_state($$props.$$inject);
	}

	$$self.$$.update = () => {
		if ($$self.$$.dirty & /*filteredPuzzles*/ 4096) {
			{
				$$invalidate(6, uniqueFilteredPuzzleIds = [...new Set(filteredPuzzles.map(puzzle => puzzle.puzzle.id))]);
			}
		}

		if ($$self.$$.dirty & /*puzzles*/ 2048) {
			{
				$$invalidate(7, uniquePuzzleIds = [...new Set(puzzles.map(puzzle => puzzle.puzzle.id))]);
			}
		}
	};

	return [
		puzzleData,
		minRating,
		maxRating,
		correctSolves,
		incorrectSolves,
		filterSubmitted,
		uniqueFilteredPuzzleIds,
		uniquePuzzleIds,
		readonlyInput,
		processPuzzleData,
		filterPuzzles,
		puzzles,
		filteredPuzzles,
		textarea_input_handler,
		input0_input_handler,
		input1_input_handler,
		input2_change_handler,
		input3_change_handler,
		input_binding,
		focus_handler
	];
}

class PuzzleHistoryProcessor extends SvelteComponentDev {
	constructor(options) {
		super(options);
		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});

		dispatch_dev("SvelteRegisterComponent", {
			component: this,
			tagName: "PuzzleHistoryProcessor",
			options,
			id: create_fragment$1.name
		});
	}
}

/* svelte/Puzzles.svelte generated by Svelte v4.2.18 */

const { Map: Map_1 } = globals;
const file = "svelte/Puzzles.svelte";

function add_css(target) {
	append_styles(target, "svelte-1oimmcd", ".puzzle-id.svelte-1oimmcd{font-family:monospace}\n/*# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiUHV6emxlcy5zdmVsdGUiLCJzb3VyY2VzIjpbIlB1enpsZXMuc3ZlbHRlIl0sInNvdXJjZXNDb250ZW50IjpbIjxzY3JpcHQ+XG4gIGltcG9ydCBDaGVzc2JvYXJkIGZyb20gXCIuL2NvbXBvbmVudHMvQ2hlc3Nib2FyZC5zdmVsdGVcIjtcbiAgaW1wb3J0IHsgSU5JVElBTF9GRU4sIG1ha2VGZW4sIHBhcnNlRmVuIH0gZnJvbSBcImNoZXNzb3BzL2ZlblwiO1xuICBpbXBvcnQgeyBvbk1vdW50IH0gZnJvbSBcInN2ZWx0ZVwiO1xuICBpbXBvcnQgeyBmYWRlIH0gZnJvbSBcInN2ZWx0ZS90cmFuc2l0aW9uXCI7XG4gIGltcG9ydCB7IGZsaXAgfSBmcm9tIFwic3ZlbHRlL2FuaW1hdGVcIjtcbiAgaW1wb3J0IHsgVXRpbCB9IGZyb20gXCJzcmMvdXRpbFwiO1xuICBpbXBvcnQgeyBwYXJzZVBnbiwgc3RhcnRpbmdQb3NpdGlvbiB9IGZyb20gXCJjaGVzc29wcy9wZ25cIjtcbiAgaW1wb3J0IHsgcGFyc2VTYW4gfSBmcm9tIFwiY2hlc3NvcHMvc2FuXCI7XG4gIGltcG9ydCB7IENoZXNzLCBtYWtlVWNpLCBwYXJzZVVjaSB9IGZyb20gXCJjaGVzc29wc1wiO1xuICBpbXBvcnQgeyBtYWtlU3F1YXJlLCBwYXJzZVNxdWFyZSB9IGZyb20gXCJjaGVzc29wcy91dGlsXCI7XG4gIGltcG9ydCB7IHBlcnNpc3RlZCB9IGZyb20gXCJzdmVsdGUtcGVyc2lzdGVkLXN0b3JlXCI7XG4gIGltcG9ydCBQdXp6bGVIaXN0b3J5UHJvY2Vzc29yIGZyb20gXCIuL2NvbXBvbmVudHMvUHV6emxlSGlzdG9yeVByb2Nlc3Nvci5zdmVsdGVcIjtcblxuICBjbGFzcyBSZXN1bHQge1xuICAgIGNvbnN0cnVjdG9yKHB1enpsZUlkLCBzZWVuQXQsIHNraXBwZWQsIG1hZGVNaXN0YWtlID0gZmFsc2UsIGRvbmVBdCA9IG51bGwpIHtcbiAgICAgIHRoaXMucHV6emxlSWQgPSBwdXp6bGVJZDtcbiAgICAgIHRoaXMuc2tpcHBlZCA9IHNraXBwZWQ7XG4gICAgICB0aGlzLm1hZGVNaXN0YWtlID0gbWFkZU1pc3Rha2U7XG4gICAgICB0aGlzLnNlZW5BdCA9IHNlZW5BdDtcbiAgICAgIHRoaXMuZG9uZUF0ID0gZG9uZUF0O1xuICAgIH1cblxuICAgIGdldER1cmF0aW9uKCkge1xuICAgICAgaWYgKHRoaXMuZG9uZUF0KSB7XG4gICAgICAgIHJldHVybiB0aGlzLmRvbmVBdCAtIHRoaXMuc2VlbkF0O1xuICAgICAgfVxuICAgIH1cblxuICAgIHdhc1N1Y2Nlc3NmdWwoKSB7XG4gICAgICByZXR1cm4gIXRoaXMuc2tpcHBlZCAmJiAhdGhpcy5tYWRlTWlzdGFrZSAmJiB0aGlzLmRvbmVBdDtcbiAgICB9XG5cbiAgICB3YXNGYWlsdXJlKCkge1xuICAgICAgcmV0dXJuIHRoaXMubWFkZU1pc3Rha2U7XG4gICAgfVxuICB9XG5cbiAgY2xhc3MgUHV6emxlIHtcbiAgICBjb25zdHJ1Y3RvcihwdXp6bGVJZCkge1xuICAgICAgdGhpcy5wdXp6bGVJZCA9IHB1enpsZUlkO1xuICAgIH1cblxuICAgIGxpY2hlc3NVcmwoKSB7XG4gICAgICByZXR1cm4gYGh0dHBzOi8vbGljaGVzcy5vcmcvdHJhaW5pbmcvJHt0aGlzLnB1enpsZUlkfWA7XG4gICAgfVxuXG4gICAgaGFzUmVzdWx0cygpIHtcbiAgICAgIHJldHVybiB0aGlzLmdldFJlc3VsdHMoKS5sZW5ndGggPj0gMTtcbiAgICB9XG5cbiAgICBoYXNCZWVuU29sdmVkKCkge1xuICAgICAgaWYgKCF0aGlzLmhhc1Jlc3VsdHMoKSkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgICByZXR1cm4gdGhpcy5nZXRSZXN1bHRzKCkuc29tZSgocmVzdWx0KSA9PiB7XG4gICAgICAgIHJldHVybiByZXN1bHQud2FzU3VjY2Vzc2Z1bCgpO1xuICAgICAgfSk7XG4gICAgfVxuXG4gICAgZ2V0UmVzdWx0cygpIHtcbiAgICAgIHJldHVybiAoJHJlc3VsdHNbdGhpcy5wdXp6bGVJZF0gfHwgW10pLm1hcChcbiAgICAgICAgKHJlc3VsdERhdGEpID0+XG4gICAgICAgICAgbmV3IFJlc3VsdChcbiAgICAgICAgICAgIHJlc3VsdERhdGEucHV6emxlSWQsXG4gICAgICAgICAgICByZXN1bHREYXRhLnNlZW5BdCxcbiAgICAgICAgICAgIHJlc3VsdERhdGEuc2tpcHBlZCxcbiAgICAgICAgICAgIHJlc3VsdERhdGEubWFkZU1pc3Rha2UsXG4gICAgICAgICAgICByZXN1bHREYXRhLmRvbmVBdCxcbiAgICAgICAgICApLFxuICAgICAgKTtcbiAgICB9XG5cbiAgICBnZXRUb3RhbFNvbHZlcygpIHtcbiAgICAgIHJldHVybiB0aGlzLmdldFJlc3VsdHMoKS5maWx0ZXIoKHJlc3VsdCkgPT4gcmVzdWx0Lndhc1N1Y2Nlc3NmdWwoKSlcbiAgICAgICAgLmxlbmd0aDtcbiAgICB9XG5cbiAgICBnZXRGYWlsdXJlQ291bnQoKSB7XG4gICAgICByZXR1cm4gdGhpcy5nZXRSZXN1bHRzKCkuZmlsdGVyKChyZXN1bHQpID0+IHJlc3VsdC53YXNGYWlsdXJlKCkpLmxlbmd0aDtcbiAgICB9XG5cbiAgICBnZXRTb2x2ZVN0cmVhaygpIHtcbiAgICAgIGxldCBzdHJlYWsgPSAwO1xuXG4gICAgICBpZiAoIXRoaXMuaGFzQmVlblNvbHZlZCgpKSB7XG4gICAgICAgIHJldHVybiBzdHJlYWs7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IHJlc3VsdHMgPSB0aGlzLmdldFJlc3VsdHMoKTtcblxuICAgICAgZm9yIChsZXQgaSA9IHJlc3VsdHMubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIHtcbiAgICAgICAgaWYgKHJlc3VsdHNbaV0ud2FzU3VjY2Vzc2Z1bCgpKSB7XG4gICAgICAgICAgc3RyZWFrKys7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHN0cmVhaztcbiAgICB9XG5cbiAgICBhdmVyYWdlU29sdmVUaW1lKCkge1xuICAgICAgaWYgKCF0aGlzLmhhc0JlZW5Tb2x2ZWQoKSkge1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH1cbiAgICAgIGNvbnN0IHN1Y2Nlc3NmdWxSZXN1bHRzID0gdGhpcy5nZXRSZXN1bHRzKCkuZmlsdGVyKChyZXN1bHQpID0+XG4gICAgICAgIHJlc3VsdC53YXNTdWNjZXNzZnVsKCksXG4gICAgICApO1xuICAgICAgY29uc3QgbGFzdEZldyA9IHN1Y2Nlc3NmdWxSZXN1bHRzLnNsaWNlKG1pbmltdW1Tb2x2ZXMgKiAtMSk7XG4gICAgICBjb25zdCBkdXJhdGlvbnMgPSBsYXN0RmV3Lm1hcCgocmVzdWx0KSA9PiByZXN1bHQuZ2V0RHVyYXRpb24oKSk7XG4gICAgICBjb25zdCBzdW0gPSBkdXJhdGlvbnMucmVkdWNlKChhLCBiKSA9PiBhICsgYiwgMCk7XG4gICAgICBjb25zdCBhdmVyYWdlID0gc3VtIC8gKGxhc3RGZXcubGVuZ3RoIHx8IDEpO1xuICAgICAgcmV0dXJuIGF2ZXJhZ2U7XG4gICAgfVxuXG4gICAgbGFzdFNlZW5BdCgpIHtcbiAgICAgIGlmICghdGhpcy5oYXNSZXN1bHRzKCkpIHtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiB0aGlzLmdldFJlc3VsdHMoKS5zbGljZSgtMSkuc2VlbkF0O1xuICAgIH1cblxuICAgIGlzQ29tcGxldGUoKSB7XG4gICAgICBpZiAoIXRoaXMuaGFzQmVlblNvbHZlZCgpKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IGxhc3RTb2x2ZXMgPSB0aGlzLmdldFJlc3VsdHMoKS5zbGljZSgtMSAqIG1pbmltdW1Tb2x2ZXMpO1xuXG4gICAgICBpZiAobGFzdFNvbHZlcy5sZW5ndGggPCBtaW5pbXVtU29sdmVzKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cblxuICAgICAgaWYgKCFsYXN0U29sdmVzLmV2ZXJ5KChyZXN1bHQpID0+IHJlc3VsdC53YXNTdWNjZXNzZnVsKCkpKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHRoaXMuYXZlcmFnZVNvbHZlVGltZSgpIDw9IHRpbWVHb2FsO1xuICAgIH1cbiAgfVxuXG4gIC8vIENoZXNzIGJvYXJkIHN0dWZmXG4gIGxldCBmZW47XG4gIGxldCBjaGVzc2dyb3VuZDtcbiAgbGV0IG9yaWVudGF0aW9uID0gXCJ3aGl0ZVwiO1xuICBsZXQgY2hlc3Nncm91bmRDb25maWcgPSB7XG4gICAgZmVuOiBJTklUSUFMX0ZFTixcbiAgICBjb29yZGluYXRlczogdHJ1ZSxcbiAgICBhbmltYXRpb246IHtcbiAgICAgIGVuYWJsZWQ6IHRydWUsXG4gICAgfSxcbiAgICBoaWdobGlnaHQ6IHtcbiAgICAgIGxhc3RNb3ZlOiB0cnVlLFxuICAgICAgY2hlY2s6IHRydWUsXG4gICAgfSxcbiAgICBkcmFnZ2FibGU6IHtcbiAgICAgIGVuYWJsZWQ6IHRydWUsXG4gICAgfSxcbiAgICBzZWxlY3RhYmxlOiB7XG4gICAgICBlbmFibGVkOiB0cnVlLFxuICAgIH0sXG4gICAgbW92YWJsZToge1xuICAgICAgZnJlZTogZmFsc2UsXG4gICAgICBjb2xvcjogXCJib3RoXCIsXG4gICAgICBkZXN0czogbmV3IE1hcCgpLFxuICAgICAgZXZlbnRzOiB7XG4gICAgICAgIGFmdGVyOiBoYW5kbGVVc2VyTW92ZSxcbiAgICAgIH0sXG4gICAgfSxcbiAgICBvcmllbnRhdGlvbjogb3JpZW50YXRpb24sXG4gIH07XG5cbiAgLy8gUHV6emxlIERhdGFcbiAgbGV0IGFsbFB1enpsZXMgPSBbXTtcbiAgbGV0IGFjdGl2ZVB1enpsZXMgPSBbXTtcblxuICAkOiB7XG4gICAgaWYgKGFjdGl2ZVB1enpsZXMubGVuZ3RoIDwgYmF0Y2hTaXplICYmIGFsbFB1enpsZXMubGVuZ3RoID4gMCkge1xuICAgICAgZmlsbEFjdGl2ZVB1enpsZXMoKTtcbiAgICB9XG4gIH1cblxuICBsZXQgY29tcGxldGVkUHV6emxlcyA9IFtdO1xuICBsZXQgY3VycmVudFB1enpsZTtcbiAgbGV0IHB1enpsZVNob3duQXQ7XG5cbiAgLy8gQmVoYXZpb3JhbCBDb25maWdcbiAgbGV0IGJhdGNoU2l6ZSA9IDEwO1xuICBsZXQgdGltZUdvYWwgPSAxNTAwMDtcbiAgbGV0IG1pbmltdW1Tb2x2ZXMgPSAyO1xuICBsZXQgYWxyZWFkeUNvbXBsZXRlT2RkcyA9IDAuMztcblxuICAvLyBDdXJyZW50IHB1enpsZSBzdGF0ZVxuICBsZXQgbW92ZXM7XG4gIGxldCBwb3NpdGlvbjtcbiAgbGV0IG1hZGVNaXN0YWtlID0gZmFsc2U7XG4gIGxldCBwdXp6bGVDb21wbGV0ZSA9IGZhbHNlO1xuXG4gIC8vIERPTSBlbGVtZW50c1xuICBsZXQgbmV4dEJ1dHRvbjtcblxuICAvLyBQZXJzaXN0ZWQgZGF0YVxuICBjb25zdCBwdXp6bGVEYXRhU3RvcmUgPSBwZXJzaXN0ZWQoXCJwdXp6bGVzLmRhdGFcIiwge30pO1xuICBjb25zdCBwdXp6bGVJZHNUb1dvcmtPbiA9IHBlcnNpc3RlZChcInB1enpsZXMuaWRzVG9Xb3JrT25cIiwgW10pO1xuICBjb25zdCByZXN1bHRzID0gcGVyc2lzdGVkKFwicHV6emxlcy5yZXN1bHRzXCIsIHt9KTtcblxuICBmdW5jdGlvbiBmaWxsQWN0aXZlUHV6emxlcygpIHtcbiAgICBjb25zdCBjb21wbGV0ZWQgPSBVdGlsLnNvcnRSYW5kb21seShnZXRDb21wbGV0ZWRQdXp6bGVzKCkpO1xuICAgIGNvbnN0IGluY29tcGxldGVJbmFjdGl2ZSA9IFV0aWwuc29ydFJhbmRvbWx5KGdldEluYWN0aXZlQ29tcGxldGVkUHV6emxlcygpKTtcbiAgICBsZXQgcHV6emxlVHlwZTtcbiAgICB3aGlsZSAoYWxsUHV6emxlcy5sZW5ndGggPiAwICYmIGFjdGl2ZVB1enpsZXMubGVuZ3RoIDwgYmF0Y2hTaXplKSB7XG4gICAgICBwdXp6bGVUeXBlID0gTWF0aC5yYW5kb20oKSA8IDAuMiA/IFwiY29tcGxldGVkXCIgOiBcImluYWN0aXZlXCI7XG4gICAgICBpZiAoaW5jb21wbGV0ZUluYWN0aXZlLmxlbmd0aCA8IDEgJiYgY29tcGxldGVkLmxlbmd0aCA8IDEpIHtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgICBpZiAocHV6emxlVHlwZSA9PT0gXCJjb21wbGV0ZWRcIiAmJiBjb21wbGV0ZWQubGVuZ3RoID4gMCkge1xuICAgICAgICBhZGRBY3RpdmVQdXp6bGUoY29tcGxldGVkLnBvcCgpKTtcbiAgICAgIH0gZWxzZSBpZiAoaW5jb21wbGV0ZUluYWN0aXZlLmxlbmd0aCA+IDApIHtcbiAgICAgICAgYWRkQWN0aXZlUHV6emxlKGluY29tcGxldGVJbmFjdGl2ZS5wb3AoKSk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLy8gVGhpcyBpcyB0aWVkIHRvIHRoZSBhZGQgbmV3IHB1enpsZSBmb3JtXG4gIGxldCBuZXdQdXp6bGVJZHM7XG5cbiAgZnVuY3Rpb24gYWRkUHV6emxlSWRUb1dvcmtPbigpIHtcbiAgICBpZiAobmV3UHV6emxlSWRzLmxlbmd0aCA8IDMpIHtcbiAgICAgIG5ld1B1enpsZUlkcyA9IFwiXCI7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGNvbnN0IGlkc1RvQWRkID0gbmV3UHV6emxlSWRzLnNwbGl0KFwiLFwiKS5tYXAoKGlkKSA9PiBpZC50cmltKCkpO1xuICAgIGNvbnN0IGN1cnJlbnRQdXp6bGVJZHMgPSBuZXcgU2V0KCRwdXp6bGVJZHNUb1dvcmtPbik7XG4gICAgaWRzVG9BZGQuZm9yRWFjaCgoaWQpID0+IGN1cnJlbnRQdXp6bGVJZHMuYWRkKGlkKSk7XG4gICAgcHV6emxlSWRzVG9Xb3JrT24uc2V0KFsuLi5jdXJyZW50UHV6emxlSWRzXSk7XG4gICAgbmV3UHV6emxlSWRzID0gXCJcIjtcbiAgfVxuXG4gIGZ1bmN0aW9uIHJlbW92ZVB1enpsZUlkKHB1enpsZUlkKSB7XG4gICAgY29uc3QgY3VycmVudFB1enpsZUlkcyA9IG5ldyBTZXQoJHB1enpsZUlkc1RvV29ya09uKTtcbiAgICBjdXJyZW50UHV6emxlSWRzLmRlbGV0ZShwdXp6bGVJZC50cmltKCkpO1xuICAgIHB1enpsZUlkc1RvV29ya09uLnNldChbLi4uY3VycmVudFB1enpsZUlkc10pO1xuICB9XG5cbiAgZnVuY3Rpb24gYWRkQWN0aXZlUHV6emxlKHB1enpsZSkge1xuICAgIGFjdGl2ZVB1enpsZXMgPSBbXG4gICAgICAuLi5uZXcgU2V0KFtcbiAgICAgICAgLi4uYWN0aXZlUHV6emxlcy5tYXAoKHB1enpsZSkgPT4gcHV6emxlLnB1enpsZUlkKSxcbiAgICAgICAgcHV6emxlLnB1enpsZUlkLFxuICAgICAgXSksXG4gICAgXS5tYXAoKHB1enpsZUlkKSA9PiBuZXcgUHV6emxlKHB1enpsZUlkKSk7XG4gIH1cblxuICBmdW5jdGlvbiByZW1vdmVBY3RpdmVQdXp6bGUocHV6emxlKSB7XG4gICAgYWN0aXZlUHV6emxlcyA9IGFjdGl2ZVB1enpsZXMuZmlsdGVyKFxuICAgICAgKGFjdGl2ZVB1enpsZSkgPT4gYWN0aXZlUHV6emxlLnB1enpsZUlkICE9PSBwdXp6bGUucHV6emxlSWQsXG4gICAgKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGdldENvbXBsZXRlZFB1enpsZXMoKSB7XG4gICAgcmV0dXJuIGFsbFB1enpsZXMuZmlsdGVyKChwdXp6bGUpID0+IHB1enpsZS5pc0NvbXBsZXRlKCkpO1xuICB9XG5cbiAgZnVuY3Rpb24gZ2V0SW5jb21wbGV0ZVB1enpsZXMoKSB7XG4gICAgcmV0dXJuIGFsbFB1enpsZXMuZmlsdGVyKChwdXp6bGUpID0+ICFwdXp6bGUuaXNDb21wbGV0ZSgpKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGdldEluYWN0aXZlQ29tcGxldGVkUHV6emxlcygpIHtcbiAgICByZXR1cm4gZ2V0SW5jb21wbGV0ZVB1enpsZXMoKS5maWx0ZXIoXG4gICAgICAocHV6emxlKSA9PiAhYWN0aXZlUHV6emxlcy5pbmNsdWRlcyhwdXp6bGUpLFxuICAgICk7XG4gIH1cblxuICBmdW5jdGlvbiBzb3J0UHV6emxlc0J5U29sdmVUaW1lKGEsIGIpIHtcbiAgICBjb25zdCBhVGltZSA9IGEuYXZlcmFnZVNvbHZlVGltZSgpO1xuICAgIGNvbnN0IGJUaW1lID0gYi5hdmVyYWdlU29sdmVUaW1lKCk7XG5cbiAgICBpZiAoYVRpbWUgPT09IG51bGwgJiYgYlRpbWUgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiAwO1xuICAgIH1cbiAgICBpZiAoYVRpbWUgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiAxO1xuICAgIH1cbiAgICBpZiAoYlRpbWUgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiAtMTtcbiAgICB9XG4gICAgcmV0dXJuIGFUaW1lIC0gYlRpbWU7XG4gIH1cblxuICBhc3luYyBmdW5jdGlvbiBnZXROZXh0UHV6emxlKCkge1xuICAgIGNvbnN0IHByZXZpb3VzID0gY3VycmVudFB1enpsZSA/IGN1cnJlbnRQdXp6bGUucHV6emxlSWQgOiBudWxsO1xuXG4gICAgY29uc3QgdHlwZSA9IGdldE5leHRQdXp6bGVUeXBlKCk7XG5cbiAgICBjb25zdCBhbHJlYWR5Q29tcGxldGUgPSBhY3RpdmVQdXp6bGVzLmZpbHRlcigocHV6emxlKSA9PlxuICAgICAgcHV6emxlLmlzQ29tcGxldGUoKSxcbiAgICApO1xuICAgIGNvbnN0IGluY29tcGxldGUgPSBhY3RpdmVQdXp6bGVzLmZpbHRlcigocHV6emxlKSA9PiAhcHV6emxlLmlzQ29tcGxldGUoKSk7XG5cbiAgICBsZXQgY2FuZGlkYXRlUHV6emxlO1xuICAgIGlmIChcbiAgICAgICh0eXBlID09PSBcImFscmVhZHlDb21wbGV0ZVwiICYmIGFscmVhZHlDb21wbGV0ZS5sZW5ndGggPiAwKSB8fFxuICAgICAgaW5jb21wbGV0ZS5sZW5ndGggPCAxXG4gICAgKSB7XG4gICAgICBjYW5kaWRhdGVQdXp6bGUgPSBVdGlsLmdldFJhbmRvbUVsZW1lbnQoYWN0aXZlUHV6emxlcyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNhbmRpZGF0ZVB1enpsZSA9IFV0aWwuZ2V0UmFuZG9tRWxlbWVudChpbmNvbXBsZXRlKTtcbiAgICB9XG5cbiAgICBpZiAoYWN0aXZlUHV6emxlcy5sZW5ndGggPiAxICYmIGNhbmRpZGF0ZVB1enpsZS5wdXp6bGVJZCA9PT0gcHJldmlvdXMpIHtcbiAgICAgIHJldHVybiBnZXROZXh0UHV6emxlKCk7XG4gICAgfVxuXG4gICAgY3VycmVudFB1enpsZSA9IGFsbFB1enpsZXMuZmluZChcbiAgICAgIChwdXp6bGUpID0+IHB1enpsZS5wdXp6bGVJZCA9PT0gY2FuZGlkYXRlUHV6emxlLnB1enpsZUlkLFxuICAgICk7XG5cbiAgICBjb25zdCBkYXRhID0gYXdhaXQgZ2V0UHV6emxlRGF0YShjdXJyZW50UHV6emxlLnB1enpsZUlkKTtcblxuICAgIGlmIChkYXRhID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gZ2V0TmV4dFB1enpsZSgpO1xuICAgIH1cblxuICAgIHJldHVybiBkYXRhO1xuICB9XG5cbiAgYXN5bmMgZnVuY3Rpb24gZ2V0UHV6emxlRGF0YShwdXp6bGVJZCkge1xuICAgIC8vIENoZWNrIGNhY2hlIGZpcnN0XG4gICAgaWYgKCRwdXp6bGVEYXRhU3RvcmVbcHV6emxlSWRdKSB7XG4gICAgICByZXR1cm4gJHB1enpsZURhdGFTdG9yZVtwdXp6bGVJZF07XG4gICAgfVxuXG4gICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBmZXRjaChgaHR0cHM6Ly9saWNoZXNzLm9yZy9hcGkvcHV6emxlLyR7cHV6emxlSWR9YCk7XG5cbiAgICBpZiAocmVzcG9uc2Uuc3RhdHVzID09PSA0MDQpIHtcbiAgICAgIC8vIFJlbW92ZSBpbnZhbGlkXG4gICAgICByZW1vdmVQdXp6bGVJZChwdXp6bGVJZCk7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICBjb25zdCBwdXp6bGVEYXRhID0gYXdhaXQgcmVzcG9uc2UuanNvbigpO1xuICAgIGNvbnN0IGRhdGEgPSAkcHV6emxlRGF0YVN0b3JlO1xuICAgIGRhdGFbY3VycmVudFB1enpsZS5wdXp6bGVJZF0gPSBwdXp6bGVEYXRhO1xuICAgIHB1enpsZURhdGFTdG9yZS5zZXQoZGF0YSk7XG4gICAgcmV0dXJuIHB1enpsZURhdGE7XG4gIH1cblxuICBmdW5jdGlvbiBnZXROZXh0UHV6emxlVHlwZSgpIHtcbiAgICBjb25zdCByYW5kb21WYWx1ZSA9IE1hdGgucmFuZG9tKCk7XG4gICAgaWYgKHJhbmRvbVZhbHVlIDwgYWxyZWFkeUNvbXBsZXRlT2Rkcykge1xuICAgICAgcmV0dXJuIFwiYWxyZWFkeUNvbXBsZXRlXCI7XG4gICAgfVxuICAgIHJldHVybiBcImluY29tcGxldGVcIjtcbiAgfVxuXG4gIGFzeW5jIGZ1bmN0aW9uIHNraXAoKSB7XG4gICAgY29uc3QgcmVzdWx0ID0gbmV3IFJlc3VsdChjdXJyZW50UHV6emxlLnB1enpsZUlkLCBwdXp6bGVTaG93bkF0LCB0cnVlKTtcbiAgICBhZGRSZXN1bHQoY3VycmVudFB1enpsZS5wdXp6bGVJZCwgcmVzdWx0KTtcbiAgICBhd2FpdCBsb2FkTmV4dFB1enpsZSgpO1xuICB9XG5cbiAgZnVuY3Rpb24gYWRkUmVzdWx0KHB1enpsZUlkLCByZXN1bHQpIHtcbiAgICBjb25zdCBhbGxSZXN1bHRzID0gJHJlc3VsdHM7XG4gICAgY29uc3QgZXhpc3RpbmdSZXN1bHRzID0gJHJlc3VsdHNbcHV6emxlSWRdIHx8IFtdO1xuICAgIGV4aXN0aW5nUmVzdWx0cy5wdXNoKHJlc3VsdCk7XG4gICAgYWxsUmVzdWx0c1twdXp6bGVJZF0gPSBleGlzdGluZ1Jlc3VsdHM7XG4gICAgcmVzdWx0cy5zZXQoYWxsUmVzdWx0cyk7XG4gIH1cblxuICBmdW5jdGlvbiBhZGRDb21wbGV0ZWRQdXp6bGUocHV6emxlVG9BZGQpIHtcbiAgICBjb21wbGV0ZWRQdXp6bGVzID0gW1xuICAgICAgLi4ubmV3IFNldChbXG4gICAgICAgIC4uLmdldENvbXBsZXRlZFB1enpsZXMoKS5tYXAoKHB1enpsZSkgPT4gcHV6emxlLnB1enpsZUlkKSxcbiAgICAgICAgcHV6emxlVG9BZGQucHV6emxlSWQsXG4gICAgICBdKSxcbiAgICBdLm1hcCgocHV6emxlSWQpID0+IG5ldyBQdXp6bGUocHV6emxlSWQpKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHJlbW92ZUNvbXBsZXRlZFB1enpsZShwdXp6bGVUb1JlbW92ZSkge1xuICAgIGNvbXBsZXRlZFB1enpsZXMgPSBjb21wbGV0ZWRQdXp6bGVzLmZpbHRlcihcbiAgICAgIChwdXp6bGUpID0+IHB1enpsZS5wdXp6bGVJZCAhPT0gcHV6emxlVG9SZW1vdmUucHV6emxlSWQsXG4gICAgKTtcbiAgfVxuXG4gIGFzeW5jIGZ1bmN0aW9uIGxvYWROZXh0UHV6emxlKCkge1xuICAgIHB1enpsZUNvbXBsZXRlID0gZmFsc2U7XG4gICAgbWFkZU1pc3Rha2UgPSBmYWxzZTtcblxuICAgIGlmIChjdXJyZW50UHV6emxlICYmIGN1cnJlbnRQdXp6bGUuaXNDb21wbGV0ZSgpKSB7XG4gICAgICByZW1vdmVBY3RpdmVQdXp6bGUoY3VycmVudFB1enpsZSk7XG4gICAgICBhZGRDb21wbGV0ZWRQdXp6bGUoY3VycmVudFB1enpsZSk7XG4gICAgfVxuXG4gICAgY29uc3QgbmV4dCA9IGF3YWl0IGdldE5leHRQdXp6bGUoKTtcbiAgICBvcmllbnRhdGlvbiA9IFV0aWwud2hvc2VNb3ZlSXNJdChuZXh0LnB1enpsZS5pbml0aWFsUGx5ICsgMSk7XG4gICAgLy8gQ2xvbmUgc28gd2UgZG9uJ3QgY2FjaGUgYSB2YWx1ZSB0aGF0IGdldHMgc2hpZnRlZCBsYXRlclxuICAgIG1vdmVzID0gWy4uLm5leHQucHV6emxlLnNvbHV0aW9uXTtcblxuICAgIGNvbnN0IHBnbiA9IHBhcnNlUGduKG5leHQuZ2FtZS5wZ24pWzBdO1xuXG4gICAgcG9zaXRpb24gPSBzdGFydGluZ1Bvc2l0aW9uKHBnbi5oZWFkZXJzKS51bndyYXAoKTtcbiAgICBjb25zdCBhbGxOb2RlcyA9IFsuLi5wZ24ubW92ZXMubWFpbmxpbmVOb2RlcygpXTtcblxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgYWxsTm9kZXMubGVuZ3RoIC0gMTsgaSsrKSB7XG4gICAgICBjb25zdCBub2RlID0gYWxsTm9kZXNbaV07XG4gICAgICBjb25zdCBtb3ZlID0gcGFyc2VTYW4ocG9zaXRpb24sIG5vZGUuZGF0YS5zYW4pO1xuICAgICAgcG9zaXRpb24ucGxheShtb3ZlKTtcbiAgICB9XG5cbiAgICBjb25zdCBsYXN0TW92ZSA9IHBhcnNlU2FuKHBvc2l0aW9uLCBhbGxOb2Rlc1thbGxOb2Rlcy5sZW5ndGggLSAxXS5kYXRhLnNhbik7XG5cbiAgICBzZXRDaGVzc2dyb3VuZEZyb21Qb3NpdGlvbigpO1xuXG4gICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICBwb3NpdGlvbi5wbGF5KGxhc3RNb3ZlKTtcbiAgICAgIGNoZXNzZ3JvdW5kLm1vdmUobWFrZVNxdWFyZShsYXN0TW92ZS5mcm9tKSwgbWFrZVNxdWFyZShsYXN0TW92ZS50bykpO1xuICAgICAgdXBkYXRlTGVnYWxNb3ZlcygpO1xuICAgICAgcHV6emxlU2hvd25BdCA9IFV0aWwuY3VycmVudE1pY3JvdGltZSgpO1xuICAgIH0sIDMwMCk7XG4gIH1cblxuICBmdW5jdGlvbiBzZXRDaGVzc2dyb3VuZEZyb21Qb3NpdGlvbigpIHtcbiAgICBmZW4gPSBtYWtlRmVuKHBvc2l0aW9uLnRvU2V0dXAoKSk7XG4gICAgY2hlc3Nncm91bmQuc2V0KHtcbiAgICAgIGZlbjogZmVuLFxuICAgIH0pO1xuICAgIHVwZGF0ZUxlZ2FsTW92ZXMoKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHVwZGF0ZUxlZ2FsTW92ZXMoKSB7XG4gICAgZmVuID0gbWFrZUZlbihwb3NpdGlvbi50b1NldHVwKCkpO1xuICAgIGNvbnN0IGxlZ2FsTW92ZXMgPSBnZXRMZWdhbE1vdmVzRm9yRmVuKGZlbik7XG4gICAgY2hlc3Nncm91bmQuc2V0KHtcbiAgICAgIG1vdmFibGU6IHtcbiAgICAgICAgZGVzdHM6IGxlZ2FsTW92ZXMsXG4gICAgICB9LFxuICAgIH0pO1xuICB9XG5cbiAgZnVuY3Rpb24gZ2V0TGVnYWxNb3Zlc0ZvckZlbihmZW4pIHtcbiAgICBjb25zdCBzZXR1cCA9IHBhcnNlRmVuKGZlbikudW53cmFwKCk7XG4gICAgY29uc3QgY2hlc3MgPSBDaGVzcy5mcm9tU2V0dXAoc2V0dXApLnVud3JhcCgpO1xuICAgIGNvbnN0IGRlc3RzTWFwID0gY2hlc3MuYWxsRGVzdHMoKTtcblxuICAgIGNvbnN0IGRlc3RzTWFwSW5TYW4gPSBuZXcgTWFwKCk7XG5cbiAgICBmb3IgKGNvbnN0IFtrZXksIHZhbHVlXSBvZiBkZXN0c01hcC5lbnRyaWVzKCkpIHtcbiAgICAgIGNvbnN0IGRlc3RzQXJyYXkgPSBBcnJheS5mcm9tKHZhbHVlKS5tYXAoKHNxKSA9PiBtYWtlU3F1YXJlKHNxKSk7XG4gICAgICBkZXN0c01hcEluU2FuLnNldChtYWtlU3F1YXJlKGtleSksIGRlc3RzQXJyYXkpO1xuICAgIH1cblxuICAgIHJldHVybiBkZXN0c01hcEluU2FuO1xuICB9XG5cbiAgZnVuY3Rpb24gaGFuZGxlVXNlck1vdmUob3JpZywgZGVzdCkge1xuICAgIGNvbnN0IGNvcnJlY3RNb3ZlID0gbW92ZXNbMF07XG4gICAgY29uc3Qgb3JpZ1NxdWFyZSA9IHBhcnNlU3F1YXJlKG9yaWcpO1xuICAgIGNvbnN0IGRlc3RTcXVhcmUgPSBwYXJzZVNxdWFyZShkZXN0KTtcbiAgICBsZXQgbW92ZSA9IHsgZnJvbTogb3JpZ1NxdWFyZSwgdG86IGRlc3RTcXVhcmUgfTtcbiAgICBpZiAoXG4gICAgICBjaGVzc2dyb3VuZC5zdGF0ZS5waWVjZXMuZ2V0KGRlc3QpPy5yb2xlID09PSBcInBhd25cIiAmJlxuICAgICAgKGRlc3RbMV0gPT09IFwiMVwiIHx8IGRlc3RbMV0gPT09IFwiOFwiKVxuICAgICkge1xuICAgICAgbW92ZSA9IHsgLi4ubW92ZSwgcHJvbW90aW9uOiBcInF1ZWVuXCIgfTtcbiAgICAgIGNoZXNzZ3JvdW5kLnNldFBpZWNlcyhcbiAgICAgICAgbmV3IE1hcChbW2Rlc3QsIHsgY29sb3I6IG9yaWVudGF0aW9uLCByb2xlOiBcInF1ZWVuXCIgfV1dKSxcbiAgICAgICk7XG4gICAgfVxuICAgIGNvbnN0IHVjaU1vdmUgPSBtYWtlVWNpKG1vdmUpO1xuICAgIGlmICh3b3VsZEJlQ2hlY2ttYXRlKG9yaWcsIGRlc3QpKSB7XG4gICAgICByZXR1cm4gaGFuZGxlUHV6emxlQ29tcGxldGUoKTtcbiAgICB9XG4gICAgaWYgKHVjaU1vdmUgPT09IGNvcnJlY3RNb3ZlKSB7XG4gICAgICBwb3NpdGlvbi5wbGF5KG1vdmUpO1xuICAgICAgbW92ZXMuc2hpZnQoKTsgLy8gcmVtb3ZlIHRoZSB1c2VyIG1vdmUgZmlyc3RcbiAgICAgIGNvbnN0IGNvbXB1dGVyTW92ZSA9IG1vdmVzLnNoaWZ0KCk7XG4gICAgICBpZiAoY29tcHV0ZXJNb3ZlKSB7XG4gICAgICAgIGNvbnN0IG1vdmUgPSBwYXJzZVVjaShjb21wdXRlck1vdmUpO1xuICAgICAgICBwb3NpdGlvbi5wbGF5KG1vdmUpO1xuICAgICAgICBjaGVzc2dyb3VuZC5tb3ZlKG1ha2VTcXVhcmUobW92ZS5mcm9tKSwgbWFrZVNxdWFyZShtb3ZlLnRvKSk7XG4gICAgICAgIHVwZGF0ZUxlZ2FsTW92ZXMoKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBoYW5kbGVQdXp6bGVDb21wbGV0ZSgpO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBtYWRlTWlzdGFrZSA9IHRydWU7XG4gICAgICBzaG93RmFpbHVyZShcIk5vcGUhXCIpO1xuICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgIHNldENoZXNzZ3JvdW5kRnJvbVBvc2l0aW9uKCk7XG4gICAgICB9LCAyMDApO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIHdvdWxkQmVDaGVja21hdGUob3JpZywgZGVzdCkge1xuICAgIGNvbnN0IG9yaWdTcXVhcmUgPSBwYXJzZVNxdWFyZShvcmlnKTtcbiAgICBjb25zdCBkZXN0U3F1YXJlID0gcGFyc2VTcXVhcmUoZGVzdCk7XG4gICAgY29uc3QgY2xvbmVkUG9zaXRpb24gPSBwb3NpdGlvbi5jbG9uZSgpO1xuICAgIGNsb25lZFBvc2l0aW9uLnBsYXkoeyBmcm9tOiBvcmlnU3F1YXJlLCB0bzogZGVzdFNxdWFyZSB9KTtcbiAgICByZXR1cm4gY2xvbmVkUG9zaXRpb24uaXNDaGVja21hdGUoKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGhhbmRsZVB1enpsZUNvbXBsZXRlKCkge1xuICAgIHB1enpsZUNvbXBsZXRlID0gdHJ1ZTtcbiAgICBjb25zdCByZXN1bHQgPSBuZXcgUmVzdWx0KFxuICAgICAgY3VycmVudFB1enpsZS5wdXp6bGVJZCxcbiAgICAgIHB1enpsZVNob3duQXQsXG4gICAgICBmYWxzZSxcbiAgICAgIG1hZGVNaXN0YWtlLFxuICAgICAgVXRpbC5jdXJyZW50TWljcm90aW1lKCksXG4gICAgKTtcbiAgICBhZGRSZXN1bHQoY3VycmVudFB1enpsZS5wdXp6bGVJZCwgcmVzdWx0KTtcbiAgICBpZiAobWFkZU1pc3Rha2UpIHtcbiAgICAgIHJlbW92ZUNvbXBsZXRlZFB1enpsZShjdXJyZW50UHV6emxlKTtcbiAgICB9XG4gICAgLy8gVHJpZ2dlciByZWFjdGl2aXR5XG4gICAgYWN0aXZlUHV6emxlcyA9IGFjdGl2ZVB1enpsZXM7XG4gICAgc2hvd1N1Y2Nlc3MoXCJDb3JyZWN0IVwiKTtcbiAgfVxuXG4gIGxldCBzdWNjZXNzTWVzc2FnZSA9IG51bGw7XG5cbiAgZnVuY3Rpb24gc2hvd1N1Y2Nlc3MobWVzc2FnZSwgZHVyYXRpb24gPSAxNTAwKSB7XG4gICAgZmFpbHVyZU1lc3NhZ2UgPSBudWxsO1xuICAgIHN1Y2Nlc3NNZXNzYWdlID0gbWVzc2FnZTtcbiAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgIHN1Y2Nlc3NNZXNzYWdlID0gbnVsbDtcbiAgICB9LCBkdXJhdGlvbik7XG4gIH1cblxuICBsZXQgZmFpbHVyZU1lc3NhZ2UgPSBudWxsO1xuXG4gIGZ1bmN0aW9uIHNob3dGYWlsdXJlKG1lc3NhZ2UsIGR1cmF0aW9uID0gMTAwMCkge1xuICAgIHN1Y2Nlc3NNZXNzYWdlID0gbnVsbDtcbiAgICBmYWlsdXJlTWVzc2FnZSA9IG1lc3NhZ2U7XG4gICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICBmYWlsdXJlTWVzc2FnZSA9IG51bGw7XG4gICAgfSwgZHVyYXRpb24pO1xuICB9XG5cbiAgZnVuY3Rpb24gaW5pdGlhbGl6ZVB1enpsZXMoKSB7XG4gICAgYWxsUHV6emxlcyA9IFtdO1xuICAgICRwdXp6bGVJZHNUb1dvcmtPbi5mb3JFYWNoKChwdXp6bGVJZCkgPT4ge1xuICAgICAgYWxsUHV6emxlcy5wdXNoKG5ldyBQdXp6bGUocHV6emxlSWQpKTtcbiAgICB9KTtcbiAgICBjb21wbGV0ZWRQdXp6bGVzID0gZ2V0Q29tcGxldGVkUHV6emxlcygpO1xuICAgIGZpbGxBY3RpdmVQdXp6bGVzKCk7XG4gIH1cblxuICBvbk1vdW50KGFzeW5jICgpID0+IHtcbiAgICBpbml0aWFsaXplUHV6emxlcygpO1xuICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoXCJrZXlkb3duXCIsIGZ1bmN0aW9uIChldmVudCkge1xuICAgICAgaWYgKFtcIkVudGVyXCIsIFwiIFwiXS5pbmNsdWRlcyhldmVudC5rZXkpICYmIG5leHRCdXR0b24pIHtcbiAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgbmV4dEJ1dHRvbi5jbGljaygpO1xuICAgICAgfVxuICAgIH0pO1xuICAgIGF3YWl0IGxvYWROZXh0UHV6emxlKCk7XG4gIH0pO1xuPC9zY3JpcHQ+XG5cbjxkaXYgY2xhc3M9XCJjb2x1bW5zIGlzLWNlbnRlcmVkXCI+XG4gIDxkaXYgY2xhc3M9XCJjb2x1bW4gaXMtNi1kZXNrdG9wXCI+XG4gICAgPGRpdiBjbGFzcz1cImJsb2NrXCI+XG4gICAgICB7I2lmIGFjdGl2ZVB1enpsZXMubGVuZ3RoID4gMCAmJiBjdXJyZW50UHV6emxlfVxuICAgICAgICA8Q2hlc3Nib2FyZCB7Y2hlc3Nncm91bmRDb25maWd9IHtvcmllbnRhdGlvbn0gYmluZDpjaGVzc2dyb3VuZD5cbiAgICAgICAgICA8ZGl2IHNsb3Q9XCJjZW50ZXJlZC1jb250ZW50XCI+XG4gICAgICAgICAgICB7I2lmIHN1Y2Nlc3NNZXNzYWdlfVxuICAgICAgICAgICAgICA8c3BhbiB0cmFuc2l0aW9uOmZhZGUgY2xhc3M9XCJ0YWcgaXMtc3VjY2VzcyBpcy1zaXplLTRcIj5cbiAgICAgICAgICAgICAgICB7c3VjY2Vzc01lc3NhZ2V9XG4gICAgICAgICAgICAgIDwvc3Bhbj5cbiAgICAgICAgICAgIHsvaWZ9XG4gICAgICAgICAgICB7I2lmIGZhaWx1cmVNZXNzYWdlfVxuICAgICAgICAgICAgICA8c3BhbiB0cmFuc2l0aW9uOmZhZGUgY2xhc3M9XCJ0YWcgaXMtZGFuZ2VyIGlzLXNpemUtNFwiPlxuICAgICAgICAgICAgICAgIHtmYWlsdXJlTWVzc2FnZX1cbiAgICAgICAgICAgICAgPC9zcGFuPlxuICAgICAgICAgICAgey9pZn1cbiAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICA8ZGl2IHNsb3Q9XCJiZWxvdy1ib2FyZFwiPlxuICAgICAgICAgICAgeyNpZiBwdXp6bGVDb21wbGV0ZX1cbiAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImJsb2NrIGlzLWZsZXggaXMtanVzdGlmeS1jb250ZW50LWNlbnRlclwiPlxuICAgICAgICAgICAgICAgIDxidXR0b25cbiAgICAgICAgICAgICAgICAgIGNsYXNzPVwiYnV0dG9uIGlzLXByaW1hcnlcIlxuICAgICAgICAgICAgICAgICAgYmluZDp0aGlzPXtuZXh0QnV0dG9ufVxuICAgICAgICAgICAgICAgICAgb246Y2xpY2s9e2FzeW5jICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgYXdhaXQgbG9hZE5leHRQdXp6bGUoKTtcbiAgICAgICAgICAgICAgICAgIH19XG4gICAgICAgICAgICAgICAgICA+TmV4dFxuICAgICAgICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIHsvaWZ9XG4gICAgICAgICAgICB7I2lmICFwdXp6bGVDb21wbGV0ZX1cbiAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImJsb2NrIGlzLWZsZXggaXMtanVzdGlmeS1jb250ZW50LWNlbnRlclwiPlxuICAgICAgICAgICAgICAgIDxzcGFuIGNsYXNzPVwidGFnIGlzLXtvcmllbnRhdGlvbn0gaXMtc2l6ZS00XCJcbiAgICAgICAgICAgICAgICAgID57b3JpZW50YXRpb259IHRvIHBsYXk8L3NwYW5cbiAgICAgICAgICAgICAgICA+XG4gICAgICAgICAgICAgICAgPGJ1dHRvbiBjbGFzcz1cImJ1dHRvbiBpcy1wcmltYXJ5XCIgb246Y2xpY2s9e3NraXB9PlNraXA8L2J1dHRvbj5cbiAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICB7L2lmfVxuICAgICAgICAgIDwvZGl2PlxuICAgICAgICA8L0NoZXNzYm9hcmQ+XG4gICAgICB7OmVsc2V9XG4gICAgICAgIDxwPkFsbCBwdXp6bGVzIGNvbXBsZXRlLCBhZGQgc29tZSBtb3JlITwvcD5cbiAgICAgIHsvaWZ9XG4gICAgPC9kaXY+XG4gIDwvZGl2PlxuICA8ZGl2IGNsYXNzPVwiY29sdW1uIGlzLTQtZGVza3RvcFwiPlxuICAgIHsjaWYgYWN0aXZlUHV6emxlcy5sZW5ndGggPj0gMSAmJiBjdXJyZW50UHV6emxlfVxuICAgICAgPGRpdiBjbGFzcz1cImJveFwiPlxuICAgICAgICA8aDM+Q3VycmVudCBQdXp6bGVzPC9oMz5cbiAgICAgICAgPHRhYmxlIGNsYXNzPVwidGFibGUgaXMtZnVsbHdpZHRoIGlzLW5hcnJvdyBpcy1zdHJpcGVkXCI+XG4gICAgICAgICAgPHRoZWFkPlxuICAgICAgICAgICAgPHRyPlxuICAgICAgICAgICAgICA8dGg+PGFiYnIgdGl0bGU9XCJMaWNoZXNzIFB1enpsZSBJRFwiPklEPC9hYmJyPjwvdGg+XG4gICAgICAgICAgICAgIDx0aD48YWJiciB0aXRsZT1cIkF2ZXJhZ2Ugc29sdmUgdGltZVwiPkF2ZzwvYWJicj48L3RoPlxuICAgICAgICAgICAgICA8dGg+PGFiYnIgdGl0bGU9XCJDb3JyZWN0IHNvbHZlcyBpbiBhIHJvd1wiPlN0cmVhazwvYWJicj48L3RoPlxuICAgICAgICAgICAgICA8dGg+PGFiYnIgdGl0bGU9XCJUb3RhbCBjb3JyZWN0IHNvbHZlc1wiPlNvbHZlczwvYWJicj48L3RoPlxuICAgICAgICAgICAgICA8dGg+PGFiYnIgdGl0bGU9XCJGYWlsdXJlIENvdW50XCI+RmFpbHM8L2FiYnI+PC90aD5cbiAgICAgICAgICAgIDwvdHI+XG4gICAgICAgICAgPC90aGVhZD5cbiAgICAgICAgICA8dGJvZHk+XG4gICAgICAgICAgICB7I2VhY2ggYWN0aXZlUHV6emxlcy5zb3J0KHNvcnRQdXp6bGVzQnlTb2x2ZVRpbWUpIGFzIHB1enpsZSAocHV6emxlKX1cbiAgICAgICAgICAgICAgPHRyXG4gICAgICAgICAgICAgICAgYW5pbWF0ZTpmbGlwPXt7IGR1cmF0aW9uOiA0MDAgfX1cbiAgICAgICAgICAgICAgICBjbGFzczppcy1zZWxlY3RlZD17Y3VycmVudFB1enpsZS5wdXp6bGVJZCA9PT0gcHV6emxlLnB1enpsZUlkfVxuICAgICAgICAgICAgICA+XG4gICAgICAgICAgICAgICAgPHRkIGNsYXNzPVwicHV6emxlLWlkXCJcbiAgICAgICAgICAgICAgICAgID48YVxuICAgICAgICAgICAgICAgICAgICBocmVmPXtwdXp6bGUubGljaGVzc1VybCgpfVxuICAgICAgICAgICAgICAgICAgICB0YXJnZXQ9XCJfYmxhbmtcIlxuICAgICAgICAgICAgICAgICAgICB0aXRsZT1cIlZpZXcgb24gbGljaGVzcy5vcmdcIj57cHV6emxlLnB1enpsZUlkfTwvYVxuICAgICAgICAgICAgICAgICAgPjwvdGRcbiAgICAgICAgICAgICAgICA+XG4gICAgICAgICAgICAgICAgPHRkXG4gICAgICAgICAgICAgICAgICBjbGFzczpoYXMtdGV4dC13YXJuaW5nPXtwdXp6bGUuYXZlcmFnZVNvbHZlVGltZSgpID4gdGltZUdvYWx9XG4gICAgICAgICAgICAgICAgICBjbGFzczpoYXMtdGV4dC1zdWNjZXNzPXtwdXp6bGUuYXZlcmFnZVNvbHZlVGltZSgpIDw9XG4gICAgICAgICAgICAgICAgICAgIHRpbWVHb2FsICYmIHB1enpsZS5hdmVyYWdlU29sdmVUaW1lKCkgPiAwfVxuICAgICAgICAgICAgICAgID5cbiAgICAgICAgICAgICAgICAgIHtwdXp6bGUuYXZlcmFnZVNvbHZlVGltZSgpXG4gICAgICAgICAgICAgICAgICAgID8gYCR7KHB1enpsZS5hdmVyYWdlU29sdmVUaW1lKCkgLyAxMDAwKS50b0ZpeGVkKDIpfXNgXG4gICAgICAgICAgICAgICAgICAgIDogXCI/XCJ9XG4gICAgICAgICAgICAgICAgPC90ZD5cbiAgICAgICAgICAgICAgICA8dGRcbiAgICAgICAgICAgICAgICAgIGNsYXNzOmhhcy10ZXh0LXdhcm5pbmc9e3B1enpsZS5nZXRTb2x2ZVN0cmVhaygpIDxcbiAgICAgICAgICAgICAgICAgICAgbWluaW11bVNvbHZlc31cbiAgICAgICAgICAgICAgICAgIGNsYXNzOmhhcy10ZXh0LXN1Y2Nlc3M9e3B1enpsZS5nZXRTb2x2ZVN0cmVhaygpID49XG4gICAgICAgICAgICAgICAgICAgIG1pbmltdW1Tb2x2ZXN9XG4gICAgICAgICAgICAgICAgPlxuICAgICAgICAgICAgICAgICAge3B1enpsZS5nZXRTb2x2ZVN0cmVhaygpfSAvIHttaW5pbXVtU29sdmVzfVxuICAgICAgICAgICAgICAgIDwvdGQ+XG4gICAgICAgICAgICAgICAgPHRkPlxuICAgICAgICAgICAgICAgICAge3B1enpsZS5nZXRUb3RhbFNvbHZlcygpfVxuICAgICAgICAgICAgICAgIDwvdGQ+XG4gICAgICAgICAgICAgICAgPHRkPlxuICAgICAgICAgICAgICAgICAge3B1enpsZS5nZXRGYWlsdXJlQ291bnQoKX1cbiAgICAgICAgICAgICAgICA8L3RkPlxuICAgICAgICAgICAgICA8L3RyPlxuICAgICAgICAgICAgey9lYWNofVxuICAgICAgICAgIDwvdGJvZHk+XG4gICAgICAgIDwvdGFibGU+XG4gICAgICA8L2Rpdj5cbiAgICB7L2lmfVxuICAgIDxkaXYgY2xhc3M9XCJib3hcIj5cbiAgICAgIDxkaXYgY2xhc3M9XCJibG9ja1wiPlxuICAgICAgICA8cD48c3Ryb25nPnskcHV6emxlSWRzVG9Xb3JrT24ubGVuZ3RofTwvc3Ryb25nPiB0b3RhbCBwdXp6bGVzPC9wPlxuICAgICAgICA8cD5Eb25lIHdpdGggPHN0cm9uZz57Y29tcGxldGVkUHV6emxlcy5sZW5ndGh9PC9zdHJvbmc+IHB1enpsZXM8L3A+XG4gICAgICAgIDxwPlxuICAgICAgICAgIFRhcmdldCBzb2x2ZSB0aW1lOiA8c3Ryb25nPnsodGltZUdvYWwgLyAxMDAwKS50b0ZpeGVkKDEpfTwvc3Ryb25nPiBzZWNvbmRzXG4gICAgICAgIDwvcD5cbiAgICAgICAgPHA+XG4gICAgICAgICAgTXVzdCBzb2x2ZSA8c3Ryb25nPnttaW5pbXVtU29sdmVzfTwvc3Ryb25nPiB0aW1le21pbmltdW1Tb2x2ZXMgPiAxXG4gICAgICAgICAgICA/IFwic1wiXG4gICAgICAgICAgICA6IFwiXCJ9IGluIGEgcm93XG4gICAgICAgIDwvcD5cbiAgICAgIDwvZGl2PlxuICAgICAgPGRpdiBjbGFzcz1cImJsb2NrXCI+XG4gICAgICAgIDxmb3JtIG9uOnN1Ym1pdHxwcmV2ZW50RGVmYXVsdD17YWRkUHV6emxlSWRUb1dvcmtPbn0+XG4gICAgICAgICAgPGxhYmVsIGZvcj1cIm5ld1B1enpsZUlkXCI+TmV3IFB1enpsZSBJRChzKTo8L2xhYmVsPlxuICAgICAgICAgIDxpbnB1dFxuICAgICAgICAgICAgdHlwZT1cInRleHRcIlxuICAgICAgICAgICAgaWQ9XCJuZXdQdXp6bGVJZFwiXG4gICAgICAgICAgICBiaW5kOnZhbHVlPXtuZXdQdXp6bGVJZHN9XG4gICAgICAgICAgICBwbGFjZWhvbGRlcj1cIlwiXG4gICAgICAgICAgLz5cbiAgICAgICAgICA8YnIgLz5cbiAgICAgICAgICA8YnV0dG9uIGNsYXNzPVwiYnV0dG9uIGlzLXByaW1hcnlcIiB0eXBlPVwic3VibWl0XCI+QWRkPC9idXR0b24+XG4gICAgICAgIDwvZm9ybT5cbiAgICAgIDwvZGl2PlxuICAgIDwvZGl2PlxuICAgIDxkaXYgY2xhc3M9XCJib3hcIj5cbiAgICAgIDxQdXp6bGVIaXN0b3J5UHJvY2Vzc29yIC8+XG4gICAgPC9kaXY+XG4gIDwvZGl2PlxuPC9kaXY+XG5cbjxzdHlsZT5cbiAgLnB1enpsZS1pZCB7XG4gICAgZm9udC1mYW1pbHk6IG1vbm9zcGFjZTtcbiAgfVxuPC9zdHlsZT5cbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUF3ckJFLHlCQUFXLENBQ1QsV0FBVyxDQUFFLFNBQ2YifQ== */");
}

function get_each_context(ctx, list, i) {
	const child_ctx = ctx.slice();
	child_ctx[58] = list[i];
	return child_ctx;
}

// (602:6) {:else}
function create_else_block(ctx) {
	let p;

	const block = {
		c: function create() {
			p = element("p");
			p.textContent = "All puzzles complete, add some more!";
			add_location(p, file, 602, 8, 15841);
		},
		m: function mount(target, anchor) {
			insert_dev(target, p, anchor);
		},
		p: noop,
		i: noop,
		o: noop,
		d: function destroy(detaching) {
			if (detaching) {
				detach_dev(p);
			}
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_else_block.name,
		type: "else",
		source: "(602:6) {:else}",
		ctx
	});

	return block;
}

// (565:6) {#if activePuzzles.length > 0 && currentPuzzle}
function create_if_block_1(ctx) {
	let chessboard;
	let updating_chessground;
	let current;

	function chessboard_chessground_binding(value) {
		/*chessboard_chessground_binding*/ ctx[23](value);
	}

	let chessboard_props = {
		chessgroundConfig: /*chessgroundConfig*/ ctx[11],
		orientation: /*orientation*/ ctx[2],
		$$slots: {
			"below-board": [create_below_board_slot],
			"centered-content": [create_centered_content_slot]
		},
		$$scope: { ctx }
	};

	if (/*chessground*/ ctx[1] !== void 0) {
		chessboard_props.chessground = /*chessground*/ ctx[1];
	}

	chessboard = new Chessboard({ props: chessboard_props, $$inline: true });
	binding_callbacks.push(() => bind(chessboard, 'chessground', chessboard_chessground_binding));

	const block = {
		c: function create() {
			create_component(chessboard.$$.fragment);
		},
		m: function mount(target, anchor) {
			mount_component(chessboard, target, anchor);
			current = true;
		},
		p: function update(ctx, dirty) {
			const chessboard_changes = {};
			if (dirty[0] & /*orientation*/ 4) chessboard_changes.orientation = /*orientation*/ ctx[2];

			if (dirty[0] & /*orientation, puzzleComplete, nextButton, failureMessage, successMessage*/ 868 | dirty[1] & /*$$scope*/ 1073741824) {
				chessboard_changes.$$scope = { dirty, ctx };
			}

			if (!updating_chessground && dirty[0] & /*chessground*/ 2) {
				updating_chessground = true;
				chessboard_changes.chessground = /*chessground*/ ctx[1];
				add_flush_callback(() => updating_chessground = false);
			}

			chessboard.$set(chessboard_changes);
		},
		i: function intro(local) {
			if (current) return;
			transition_in(chessboard.$$.fragment, local);
			current = true;
		},
		o: function outro(local) {
			transition_out(chessboard.$$.fragment, local);
			current = false;
		},
		d: function destroy(detaching) {
			destroy_component(chessboard, detaching);
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_if_block_1.name,
		type: "if",
		source: "(565:6) {#if activePuzzles.length > 0 && currentPuzzle}",
		ctx
	});

	return block;
}

// (568:12) {#if successMessage}
function create_if_block_5(ctx) {
	let span;
	let t;
	let span_transition;
	let current;

	const block = {
		c: function create() {
			span = element("span");
			t = text(/*successMessage*/ ctx[8]);
			attr_dev(span, "class", "tag is-success is-size-4");
			add_location(span, file, 568, 14, 14671);
		},
		m: function mount(target, anchor) {
			insert_dev(target, span, anchor);
			append_dev(span, t);
			current = true;
		},
		p: function update(ctx, dirty) {
			if (!current || dirty[0] & /*successMessage*/ 256) set_data_dev(t, /*successMessage*/ ctx[8]);
		},
		i: function intro(local) {
			if (current) return;

			if (local) {
				add_render_callback(() => {
					if (!current) return;
					if (!span_transition) span_transition = create_bidirectional_transition(span, fade, {}, true);
					span_transition.run(1);
				});
			}

			current = true;
		},
		o: function outro(local) {
			if (local) {
				if (!span_transition) span_transition = create_bidirectional_transition(span, fade, {}, false);
				span_transition.run(0);
			}

			current = false;
		},
		d: function destroy(detaching) {
			if (detaching) {
				detach_dev(span);
			}

			if (detaching && span_transition) span_transition.end();
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_if_block_5.name,
		type: "if",
		source: "(568:12) {#if successMessage}",
		ctx
	});

	return block;
}

// (573:12) {#if failureMessage}
function create_if_block_4(ctx) {
	let span;
	let t;
	let span_transition;
	let current;

	const block = {
		c: function create() {
			span = element("span");
			t = text(/*failureMessage*/ ctx[9]);
			attr_dev(span, "class", "tag is-danger is-size-4");
			add_location(span, file, 573, 14, 14847);
		},
		m: function mount(target, anchor) {
			insert_dev(target, span, anchor);
			append_dev(span, t);
			current = true;
		},
		p: function update(ctx, dirty) {
			if (!current || dirty[0] & /*failureMessage*/ 512) set_data_dev(t, /*failureMessage*/ ctx[9]);
		},
		i: function intro(local) {
			if (current) return;

			if (local) {
				add_render_callback(() => {
					if (!current) return;
					if (!span_transition) span_transition = create_bidirectional_transition(span, fade, {}, true);
					span_transition.run(1);
				});
			}

			current = true;
		},
		o: function outro(local) {
			if (local) {
				if (!span_transition) span_transition = create_bidirectional_transition(span, fade, {}, false);
				span_transition.run(0);
			}

			current = false;
		},
		d: function destroy(detaching) {
			if (detaching) {
				detach_dev(span);
			}

			if (detaching && span_transition) span_transition.end();
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_if_block_4.name,
		type: "if",
		source: "(573:12) {#if failureMessage}",
		ctx
	});

	return block;
}

// (567:10) 
function create_centered_content_slot(ctx) {
	let div;
	let t;
	let if_block0 = /*successMessage*/ ctx[8] && create_if_block_5(ctx);
	let if_block1 = /*failureMessage*/ ctx[9] && create_if_block_4(ctx);

	const block = {
		c: function create() {
			div = element("div");
			if (if_block0) if_block0.c();
			t = space();
			if (if_block1) if_block1.c();
			attr_dev(div, "slot", "centered-content");
			add_location(div, file, 566, 10, 14594);
		},
		m: function mount(target, anchor) {
			insert_dev(target, div, anchor);
			if (if_block0) if_block0.m(div, null);
			append_dev(div, t);
			if (if_block1) if_block1.m(div, null);
		},
		p: function update(ctx, dirty) {
			if (/*successMessage*/ ctx[8]) {
				if (if_block0) {
					if_block0.p(ctx, dirty);

					if (dirty[0] & /*successMessage*/ 256) {
						transition_in(if_block0, 1);
					}
				} else {
					if_block0 = create_if_block_5(ctx);
					if_block0.c();
					transition_in(if_block0, 1);
					if_block0.m(div, t);
				}
			} else if (if_block0) {
				group_outros();

				transition_out(if_block0, 1, 1, () => {
					if_block0 = null;
				});

				check_outros();
			}

			if (/*failureMessage*/ ctx[9]) {
				if (if_block1) {
					if_block1.p(ctx, dirty);

					if (dirty[0] & /*failureMessage*/ 512) {
						transition_in(if_block1, 1);
					}
				} else {
					if_block1 = create_if_block_4(ctx);
					if_block1.c();
					transition_in(if_block1, 1);
					if_block1.m(div, null);
				}
			} else if (if_block1) {
				group_outros();

				transition_out(if_block1, 1, 1, () => {
					if_block1 = null;
				});

				check_outros();
			}
		},
		d: function destroy(detaching) {
			if (detaching) {
				detach_dev(div);
			}

			if (if_block0) if_block0.d();
			if (if_block1) if_block1.d();
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_centered_content_slot.name,
		type: "slot",
		source: "(567:10) ",
		ctx
	});

	return block;
}

// (580:12) {#if puzzleComplete}
function create_if_block_3(ctx) {
	let div;
	let button;
	let mounted;
	let dispose;

	const block = {
		c: function create() {
			div = element("div");
			button = element("button");
			button.textContent = "Next";
			attr_dev(button, "class", "button is-primary");
			add_location(button, file, 581, 16, 15144);
			attr_dev(div, "class", "block is-flex is-justify-content-center");
			add_location(div, file, 580, 14, 15074);
		},
		m: function mount(target, anchor) {
			insert_dev(target, div, anchor);
			append_dev(div, button);
			/*button_binding*/ ctx[21](button);

			if (!mounted) {
				dispose = listen_dev(button, "click", /*click_handler*/ ctx[22], false, false, false, false);
				mounted = true;
			}
		},
		p: noop,
		d: function destroy(detaching) {
			if (detaching) {
				detach_dev(div);
			}

			/*button_binding*/ ctx[21](null);
			mounted = false;
			dispose();
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_if_block_3.name,
		type: "if",
		source: "(580:12) {#if puzzleComplete}",
		ctx
	});

	return block;
}

// (592:12) {#if !puzzleComplete}
function create_if_block_2(ctx) {
	let div;
	let span;
	let t0;
	let t1;
	let span_class_value;
	let t2;
	let button;
	let mounted;
	let dispose;

	const block = {
		c: function create() {
			div = element("div");
			span = element("span");
			t0 = text(/*orientation*/ ctx[2]);
			t1 = text(" to play");
			t2 = space();
			button = element("button");
			button.textContent = "Skip";
			attr_dev(span, "class", span_class_value = "tag is-" + /*orientation*/ ctx[2] + " is-size-4" + " svelte-1oimmcd");
			add_location(span, file, 593, 16, 15551);
			attr_dev(button, "class", "button is-primary");
			add_location(button, file, 596, 16, 15677);
			attr_dev(div, "class", "block is-flex is-justify-content-center");
			add_location(div, file, 592, 14, 15481);
		},
		m: function mount(target, anchor) {
			insert_dev(target, div, anchor);
			append_dev(div, span);
			append_dev(span, t0);
			append_dev(span, t1);
			append_dev(div, t2);
			append_dev(div, button);

			if (!mounted) {
				dispose = listen_dev(button, "click", /*skip*/ ctx[18], false, false, false, false);
				mounted = true;
			}
		},
		p: function update(ctx, dirty) {
			if (dirty[0] & /*orientation*/ 4) set_data_dev(t0, /*orientation*/ ctx[2]);

			if (dirty[0] & /*orientation*/ 4 && span_class_value !== (span_class_value = "tag is-" + /*orientation*/ ctx[2] + " is-size-4" + " svelte-1oimmcd")) {
				attr_dev(span, "class", span_class_value);
			}
		},
		d: function destroy(detaching) {
			if (detaching) {
				detach_dev(div);
			}

			mounted = false;
			dispose();
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_if_block_2.name,
		type: "if",
		source: "(592:12) {#if !puzzleComplete}",
		ctx
	});

	return block;
}

// (579:10) 
function create_below_board_slot(ctx) {
	let div;
	let t;
	let if_block0 = /*puzzleComplete*/ ctx[5] && create_if_block_3(ctx);
	let if_block1 = !/*puzzleComplete*/ ctx[5] && create_if_block_2(ctx);

	const block = {
		c: function create() {
			div = element("div");
			if (if_block0) if_block0.c();
			t = space();
			if (if_block1) if_block1.c();
			attr_dev(div, "slot", "below-board");
			add_location(div, file, 578, 10, 15002);
		},
		m: function mount(target, anchor) {
			insert_dev(target, div, anchor);
			if (if_block0) if_block0.m(div, null);
			append_dev(div, t);
			if (if_block1) if_block1.m(div, null);
		},
		p: function update(ctx, dirty) {
			if (/*puzzleComplete*/ ctx[5]) {
				if (if_block0) {
					if_block0.p(ctx, dirty);
				} else {
					if_block0 = create_if_block_3(ctx);
					if_block0.c();
					if_block0.m(div, t);
				}
			} else if (if_block0) {
				if_block0.d(1);
				if_block0 = null;
			}

			if (!/*puzzleComplete*/ ctx[5]) {
				if (if_block1) {
					if_block1.p(ctx, dirty);
				} else {
					if_block1 = create_if_block_2(ctx);
					if_block1.c();
					if_block1.m(div, null);
				}
			} else if (if_block1) {
				if_block1.d(1);
				if_block1 = null;
			}
		},
		d: function destroy(detaching) {
			if (detaching) {
				detach_dev(div);
			}

			if (if_block0) if_block0.d();
			if (if_block1) if_block1.d();
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_below_board_slot.name,
		type: "slot",
		source: "(579:10) ",
		ctx
	});

	return block;
}

// (608:4) {#if activePuzzles.length >= 1 && currentPuzzle}
function create_if_block(ctx) {
	let div;
	let h3;
	let t1;
	let table;
	let thead;
	let tr;
	let th0;
	let abbr0;
	let t3;
	let th1;
	let abbr1;
	let t5;
	let th2;
	let abbr2;
	let t7;
	let th3;
	let abbr3;
	let t9;
	let th4;
	let abbr4;
	let t11;
	let tbody;
	let each_blocks = [];
	let each_1_lookup = new Map_1();
	let each_value = ensure_array_like_dev(/*activePuzzles*/ ctx[0].sort(sortPuzzlesBySolveTime));
	const get_key = ctx => /*puzzle*/ ctx[58];
	validate_each_keys(ctx, each_value, get_each_context, get_key);

	for (let i = 0; i < each_value.length; i += 1) {
		let child_ctx = get_each_context(ctx, each_value, i);
		let key = get_key(child_ctx);
		each_1_lookup.set(key, each_blocks[i] = create_each_block(key, child_ctx));
	}

	const block = {
		c: function create() {
			div = element("div");
			h3 = element("h3");
			h3.textContent = "Current Puzzles";
			t1 = space();
			table = element("table");
			thead = element("thead");
			tr = element("tr");
			th0 = element("th");
			abbr0 = element("abbr");
			abbr0.textContent = "ID";
			t3 = space();
			th1 = element("th");
			abbr1 = element("abbr");
			abbr1.textContent = "Avg";
			t5 = space();
			th2 = element("th");
			abbr2 = element("abbr");
			abbr2.textContent = "Streak";
			t7 = space();
			th3 = element("th");
			abbr3 = element("abbr");
			abbr3.textContent = "Solves";
			t9 = space();
			th4 = element("th");
			abbr4 = element("abbr");
			abbr4.textContent = "Fails";
			t11 = space();
			tbody = element("tbody");

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].c();
			}

			add_location(h3, file, 609, 8, 16038);
			attr_dev(abbr0, "title", "Lichess Puzzle ID");
			add_location(abbr0, file, 613, 18, 16180);
			add_location(th0, file, 613, 14, 16176);
			attr_dev(abbr1, "title", "Average solve time");
			add_location(abbr1, file, 614, 18, 16245);
			add_location(th1, file, 614, 14, 16241);
			attr_dev(abbr2, "title", "Correct solves in a row");
			add_location(abbr2, file, 615, 18, 16312);
			add_location(th2, file, 615, 14, 16308);
			attr_dev(abbr3, "title", "Total correct solves");
			add_location(abbr3, file, 616, 18, 16387);
			add_location(th3, file, 616, 14, 16383);
			attr_dev(abbr4, "title", "Failure Count");
			add_location(abbr4, file, 617, 18, 16459);
			add_location(th4, file, 617, 14, 16455);
			add_location(tr, file, 612, 12, 16157);
			add_location(thead, file, 611, 10, 16137);
			add_location(tbody, file, 620, 10, 16552);
			attr_dev(table, "class", "table is-fullwidth is-narrow is-striped");
			add_location(table, file, 610, 8, 16071);
			attr_dev(div, "class", "box");
			add_location(div, file, 608, 6, 16012);
		},
		m: function mount(target, anchor) {
			insert_dev(target, div, anchor);
			append_dev(div, h3);
			append_dev(div, t1);
			append_dev(div, table);
			append_dev(table, thead);
			append_dev(thead, tr);
			append_dev(tr, th0);
			append_dev(th0, abbr0);
			append_dev(tr, t3);
			append_dev(tr, th1);
			append_dev(th1, abbr1);
			append_dev(tr, t5);
			append_dev(tr, th2);
			append_dev(th2, abbr2);
			append_dev(tr, t7);
			append_dev(tr, th3);
			append_dev(th3, abbr3);
			append_dev(tr, t9);
			append_dev(tr, th4);
			append_dev(th4, abbr4);
			append_dev(table, t11);
			append_dev(table, tbody);

			for (let i = 0; i < each_blocks.length; i += 1) {
				if (each_blocks[i]) {
					each_blocks[i].m(tbody, null);
				}
			}
		},
		p: function update(ctx, dirty) {
			if (dirty[0] & /*currentPuzzle, activePuzzles, minimumSolves, timeGoal*/ 12305) {
				each_value = ensure_array_like_dev(/*activePuzzles*/ ctx[0].sort(sortPuzzlesBySolveTime));
				for (let i = 0; i < each_blocks.length; i += 1) each_blocks[i].r();
				validate_each_keys(ctx, each_value, get_each_context, get_key);
				each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value, each_1_lookup, tbody, fix_and_destroy_block, create_each_block, null, get_each_context);
				for (let i = 0; i < each_blocks.length; i += 1) each_blocks[i].a();
			}
		},
		d: function destroy(detaching) {
			if (detaching) {
				detach_dev(div);
			}

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].d();
			}
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_if_block.name,
		type: "if",
		source: "(608:4) {#if activePuzzles.length >= 1 && currentPuzzle}",
		ctx
	});

	return block;
}

// (622:12) {#each activePuzzles.sort(sortPuzzlesBySolveTime) as puzzle (puzzle)}
function create_each_block(key_1, ctx) {
	let tr;
	let td0;
	let a;
	let t0_value = /*puzzle*/ ctx[58].puzzleId + "";
	let t0;
	let a_href_value;
	let t1;
	let td1;

	let t2_value = (/*puzzle*/ ctx[58].averageSolveTime()
	? `${(/*puzzle*/ ctx[58].averageSolveTime() / 1000).toFixed(2)}s`
	: "?") + "";

	let t2;
	let t3;
	let td2;
	let t4_value = /*puzzle*/ ctx[58].getSolveStreak() + "";
	let t4;
	let t5;
	let t6;
	let t7;
	let td3;
	let t8_value = /*puzzle*/ ctx[58].getTotalSolves() + "";
	let t8;
	let t9;
	let td4;
	let t10_value = /*puzzle*/ ctx[58].getFailureCount() + "";
	let t10;
	let t11;
	let rect;
	let stop_animation = noop;

	const block = {
		key: key_1,
		first: null,
		c: function create() {
			tr = element("tr");
			td0 = element("td");
			a = element("a");
			t0 = text(t0_value);
			t1 = space();
			td1 = element("td");
			t2 = text(t2_value);
			t3 = space();
			td2 = element("td");
			t4 = text(t4_value);
			t5 = text(" / ");
			t6 = text(/*minimumSolves*/ ctx[13]);
			t7 = space();
			td3 = element("td");
			t8 = text(t8_value);
			t9 = space();
			td4 = element("td");
			t10 = text(t10_value);
			t11 = space();
			attr_dev(a, "href", a_href_value = /*puzzle*/ ctx[58].lichessUrl());
			attr_dev(a, "target", "_blank");
			attr_dev(a, "title", "View on lichess.org");
			add_location(a, file, 627, 19, 16861);
			attr_dev(td0, "class", "puzzle-id svelte-1oimmcd");
			add_location(td0, file, 626, 16, 16820);
			toggle_class(td1, "has-text-warning", /*puzzle*/ ctx[58].averageSolveTime() > /*timeGoal*/ ctx[12]);
			toggle_class(td1, "has-text-success", /*puzzle*/ ctx[58].averageSolveTime() <= /*timeGoal*/ ctx[12] && /*puzzle*/ ctx[58].averageSolveTime() > 0);
			add_location(td1, file, 633, 16, 17074);
			toggle_class(td2, "has-text-warning", /*puzzle*/ ctx[58].getSolveStreak() < /*minimumSolves*/ ctx[13]);
			toggle_class(td2, "has-text-success", /*puzzle*/ ctx[58].getSolveStreak() >= /*minimumSolves*/ ctx[13]);
			add_location(td2, file, 642, 16, 17494);
			add_location(td3, file, 650, 16, 17823);
			add_location(td4, file, 653, 16, 17910);
			toggle_class(tr, "is-selected", /*currentPuzzle*/ ctx[4].puzzleId === /*puzzle*/ ctx[58].puzzleId);
			add_location(tr, file, 622, 14, 16656);
			this.first = tr;
		},
		m: function mount(target, anchor) {
			insert_dev(target, tr, anchor);
			append_dev(tr, td0);
			append_dev(td0, a);
			append_dev(a, t0);
			append_dev(tr, t1);
			append_dev(tr, td1);
			append_dev(td1, t2);
			append_dev(tr, t3);
			append_dev(tr, td2);
			append_dev(td2, t4);
			append_dev(td2, t5);
			append_dev(td2, t6);
			append_dev(tr, t7);
			append_dev(tr, td3);
			append_dev(td3, t8);
			append_dev(tr, t9);
			append_dev(tr, td4);
			append_dev(td4, t10);
			append_dev(tr, t11);
		},
		p: function update(new_ctx, dirty) {
			ctx = new_ctx;
			if (dirty[0] & /*activePuzzles*/ 1 && t0_value !== (t0_value = /*puzzle*/ ctx[58].puzzleId + "")) set_data_dev(t0, t0_value);

			if (dirty[0] & /*activePuzzles*/ 1 && a_href_value !== (a_href_value = /*puzzle*/ ctx[58].lichessUrl())) {
				attr_dev(a, "href", a_href_value);
			}

			if (dirty[0] & /*activePuzzles*/ 1 && t2_value !== (t2_value = (/*puzzle*/ ctx[58].averageSolveTime()
			? `${(/*puzzle*/ ctx[58].averageSolveTime() / 1000).toFixed(2)}s`
			: "?") + "")) set_data_dev(t2, t2_value);

			if (dirty[0] & /*activePuzzles, timeGoal*/ 4097) {
				toggle_class(td1, "has-text-warning", /*puzzle*/ ctx[58].averageSolveTime() > /*timeGoal*/ ctx[12]);
			}

			if (dirty[0] & /*activePuzzles, timeGoal*/ 4097) {
				toggle_class(td1, "has-text-success", /*puzzle*/ ctx[58].averageSolveTime() <= /*timeGoal*/ ctx[12] && /*puzzle*/ ctx[58].averageSolveTime() > 0);
			}

			if (dirty[0] & /*activePuzzles*/ 1 && t4_value !== (t4_value = /*puzzle*/ ctx[58].getSolveStreak() + "")) set_data_dev(t4, t4_value);

			if (dirty[0] & /*activePuzzles, minimumSolves*/ 8193) {
				toggle_class(td2, "has-text-warning", /*puzzle*/ ctx[58].getSolveStreak() < /*minimumSolves*/ ctx[13]);
			}

			if (dirty[0] & /*activePuzzles, minimumSolves*/ 8193) {
				toggle_class(td2, "has-text-success", /*puzzle*/ ctx[58].getSolveStreak() >= /*minimumSolves*/ ctx[13]);
			}

			if (dirty[0] & /*activePuzzles*/ 1 && t8_value !== (t8_value = /*puzzle*/ ctx[58].getTotalSolves() + "")) set_data_dev(t8, t8_value);
			if (dirty[0] & /*activePuzzles*/ 1 && t10_value !== (t10_value = /*puzzle*/ ctx[58].getFailureCount() + "")) set_data_dev(t10, t10_value);

			if (dirty[0] & /*currentPuzzle, activePuzzles*/ 17) {
				toggle_class(tr, "is-selected", /*currentPuzzle*/ ctx[4].puzzleId === /*puzzle*/ ctx[58].puzzleId);
			}
		},
		r: function measure() {
			rect = tr.getBoundingClientRect();
		},
		f: function fix() {
			fix_position(tr);
			stop_animation();
		},
		a: function animate() {
			stop_animation();
			stop_animation = create_animation(tr, rect, flip, { duration: 400 });
		},
		d: function destroy(detaching) {
			if (detaching) {
				detach_dev(tr);
			}
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_each_block.name,
		type: "each",
		source: "(622:12) {#each activePuzzles.sort(sortPuzzlesBySolveTime) as puzzle (puzzle)}",
		ctx
	});

	return block;
}

function create_fragment(ctx) {
	let div7;
	let div1;
	let div0;
	let current_block_type_index;
	let if_block0;
	let t0;
	let div6;
	let t1;
	let div4;
	let div2;
	let p0;
	let strong0;
	let t2_value = /*$puzzleIdsToWorkOn*/ ctx[10].length + "";
	let t2;
	let t3;
	let t4;
	let p1;
	let t5;
	let strong1;
	let t6_value = /*completedPuzzles*/ ctx[3].length + "";
	let t6;
	let t7;
	let t8;
	let p2;
	let t9;
	let strong2;
	let t11;
	let t12;
	let p3;
	let t13;
	let strong3;
	let t15;
	let t16_value = (/*minimumSolves*/ ctx[13] > 1 ? "s" : "") + "";
	let t16;
	let t17;
	let t18;
	let div3;
	let form;
	let label;
	let t20;
	let input;
	let t21;
	let br;
	let t22;
	let button;
	let t24;
	let div5;
	let puzzlehistoryprocessor;
	let current;
	let mounted;
	let dispose;
	const if_block_creators = [create_if_block_1, create_else_block];
	const if_blocks = [];

	function select_block_type(ctx, dirty) {
		if (/*activePuzzles*/ ctx[0].length > 0 && /*currentPuzzle*/ ctx[4]) return 0;
		return 1;
	}

	current_block_type_index = select_block_type(ctx);
	if_block0 = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
	let if_block1 = /*activePuzzles*/ ctx[0].length >= 1 && /*currentPuzzle*/ ctx[4] && create_if_block(ctx);
	puzzlehistoryprocessor = new PuzzleHistoryProcessor({ $$inline: true });

	const block = {
		c: function create() {
			div7 = element("div");
			div1 = element("div");
			div0 = element("div");
			if_block0.c();
			t0 = space();
			div6 = element("div");
			if (if_block1) if_block1.c();
			t1 = space();
			div4 = element("div");
			div2 = element("div");
			p0 = element("p");
			strong0 = element("strong");
			t2 = text(t2_value);
			t3 = text(" total puzzles");
			t4 = space();
			p1 = element("p");
			t5 = text("Done with ");
			strong1 = element("strong");
			t6 = text(t6_value);
			t7 = text(" puzzles");
			t8 = space();
			p2 = element("p");
			t9 = text("Target solve time: ");
			strong2 = element("strong");
			strong2.textContent = `${(/*timeGoal*/ ctx[12] / 1000).toFixed(1)}`;
			t11 = text(" seconds");
			t12 = space();
			p3 = element("p");
			t13 = text("Must solve ");
			strong3 = element("strong");
			strong3.textContent = `${/*minimumSolves*/ ctx[13]}`;
			t15 = text(" time");
			t16 = text(t16_value);
			t17 = text(" in a row");
			t18 = space();
			div3 = element("div");
			form = element("form");
			label = element("label");
			label.textContent = "New Puzzle ID(s):";
			t20 = space();
			input = element("input");
			t21 = space();
			br = element("br");
			t22 = space();
			button = element("button");
			button.textContent = "Add";
			t24 = space();
			div5 = element("div");
			create_component(puzzlehistoryprocessor.$$.fragment);
			attr_dev(div0, "class", "block");
			add_location(div0, file, 563, 4, 14438);
			attr_dev(div1, "class", "column is-6-desktop");
			add_location(div1, file, 562, 2, 14400);
			add_location(strong0, file, 664, 11, 18140);
			add_location(p0, file, 664, 8, 18137);
			add_location(strong1, file, 665, 21, 18224);
			add_location(p1, file, 665, 8, 18211);
			add_location(strong2, file, 667, 29, 18320);
			add_location(p2, file, 666, 8, 18287);
			add_location(strong3, file, 670, 21, 18422);
			add_location(p3, file, 669, 8, 18397);
			attr_dev(div2, "class", "block");
			add_location(div2, file, 663, 6, 18109);
			attr_dev(label, "for", "newPuzzleId");
			add_location(label, file, 677, 10, 18647);
			attr_dev(input, "type", "text");
			attr_dev(input, "id", "newPuzzleId");
			attr_dev(input, "placeholder", "");
			add_location(input, file, 678, 10, 18708);
			add_location(br, file, 684, 10, 18856);
			attr_dev(button, "class", "button is-primary");
			attr_dev(button, "type", "submit");
			add_location(button, file, 685, 10, 18873);
			add_location(form, file, 676, 8, 18583);
			attr_dev(div3, "class", "block");
			add_location(div3, file, 675, 6, 18555);
			attr_dev(div4, "class", "box");
			add_location(div4, file, 662, 4, 18085);
			attr_dev(div5, "class", "box");
			add_location(div5, file, 689, 4, 18978);
			attr_dev(div6, "class", "column is-4-desktop");
			add_location(div6, file, 606, 2, 15919);
			attr_dev(div7, "class", "columns is-centered");
			add_location(div7, file, 561, 0, 14364);
		},
		l: function claim(nodes) {
			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
		},
		m: function mount(target, anchor) {
			insert_dev(target, div7, anchor);
			append_dev(div7, div1);
			append_dev(div1, div0);
			if_blocks[current_block_type_index].m(div0, null);
			append_dev(div7, t0);
			append_dev(div7, div6);
			if (if_block1) if_block1.m(div6, null);
			append_dev(div6, t1);
			append_dev(div6, div4);
			append_dev(div4, div2);
			append_dev(div2, p0);
			append_dev(p0, strong0);
			append_dev(strong0, t2);
			append_dev(p0, t3);
			append_dev(div2, t4);
			append_dev(div2, p1);
			append_dev(p1, t5);
			append_dev(p1, strong1);
			append_dev(strong1, t6);
			append_dev(p1, t7);
			append_dev(div2, t8);
			append_dev(div2, p2);
			append_dev(p2, t9);
			append_dev(p2, strong2);
			append_dev(p2, t11);
			append_dev(div2, t12);
			append_dev(div2, p3);
			append_dev(p3, t13);
			append_dev(p3, strong3);
			append_dev(p3, t15);
			append_dev(p3, t16);
			append_dev(p3, t17);
			append_dev(div4, t18);
			append_dev(div4, div3);
			append_dev(div3, form);
			append_dev(form, label);
			append_dev(form, t20);
			append_dev(form, input);
			set_input_value(input, /*newPuzzleIds*/ ctx[7]);
			append_dev(form, t21);
			append_dev(form, br);
			append_dev(form, t22);
			append_dev(form, button);
			append_dev(div6, t24);
			append_dev(div6, div5);
			mount_component(puzzlehistoryprocessor, div5, null);
			current = true;

			if (!mounted) {
				dispose = [
					listen_dev(input, "input", /*input_input_handler*/ ctx[24]),
					listen_dev(form, "submit", prevent_default(/*addPuzzleIdToWorkOn*/ ctx[17]), false, true, false, false)
				];

				mounted = true;
			}
		},
		p: function update(ctx, dirty) {
			let previous_block_index = current_block_type_index;
			current_block_type_index = select_block_type(ctx);

			if (current_block_type_index === previous_block_index) {
				if_blocks[current_block_type_index].p(ctx, dirty);
			} else {
				group_outros();

				transition_out(if_blocks[previous_block_index], 1, 1, () => {
					if_blocks[previous_block_index] = null;
				});

				check_outros();
				if_block0 = if_blocks[current_block_type_index];

				if (!if_block0) {
					if_block0 = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
					if_block0.c();
				} else {
					if_block0.p(ctx, dirty);
				}

				transition_in(if_block0, 1);
				if_block0.m(div0, null);
			}

			if (/*activePuzzles*/ ctx[0].length >= 1 && /*currentPuzzle*/ ctx[4]) {
				if (if_block1) {
					if_block1.p(ctx, dirty);
				} else {
					if_block1 = create_if_block(ctx);
					if_block1.c();
					if_block1.m(div6, t1);
				}
			} else if (if_block1) {
				if_block1.d(1);
				if_block1 = null;
			}

			if ((!current || dirty[0] & /*$puzzleIdsToWorkOn*/ 1024) && t2_value !== (t2_value = /*$puzzleIdsToWorkOn*/ ctx[10].length + "")) set_data_dev(t2, t2_value);
			if ((!current || dirty[0] & /*completedPuzzles*/ 8) && t6_value !== (t6_value = /*completedPuzzles*/ ctx[3].length + "")) set_data_dev(t6, t6_value);

			if (dirty[0] & /*newPuzzleIds*/ 128 && input.value !== /*newPuzzleIds*/ ctx[7]) {
				set_input_value(input, /*newPuzzleIds*/ ctx[7]);
			}
		},
		i: function intro(local) {
			if (current) return;
			transition_in(if_block0);
			transition_in(puzzlehistoryprocessor.$$.fragment, local);
			current = true;
		},
		o: function outro(local) {
			transition_out(if_block0);
			transition_out(puzzlehistoryprocessor.$$.fragment, local);
			current = false;
		},
		d: function destroy(detaching) {
			if (detaching) {
				detach_dev(div7);
			}

			if_blocks[current_block_type_index].d();
			if (if_block1) if_block1.d();
			destroy_component(puzzlehistoryprocessor);
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

function sortPuzzlesBySolveTime(a, b) {
	const aTime = a.averageSolveTime();
	const bTime = b.averageSolveTime();

	if (aTime === null && bTime === null) {
		return 0;
	}

	if (aTime === null) {
		return 1;
	}

	if (bTime === null) {
		return -1;
	}

	return aTime - bTime;
}

function instance($$self, $$props, $$invalidate) {
	let $puzzleIdsToWorkOn;
	let $results;
	let $puzzleDataStore;
	let { $$slots: slots = {}, $$scope } = $$props;
	validate_slots('Puzzles', slots, []);

	class Result {
		constructor(puzzleId, seenAt, skipped, madeMistake = false, doneAt = null) {
			this.puzzleId = puzzleId;
			this.skipped = skipped;
			this.madeMistake = madeMistake;
			this.seenAt = seenAt;
			this.doneAt = doneAt;
		}

		getDuration() {
			if (this.doneAt) {
				return this.doneAt - this.seenAt;
			}
		}

		wasSuccessful() {
			return !this.skipped && !this.madeMistake && this.doneAt;
		}

		wasFailure() {
			return this.madeMistake;
		}
	}

	class Puzzle {
		constructor(puzzleId) {
			this.puzzleId = puzzleId;
		}

		lichessUrl() {
			return `https://lichess.org/training/${this.puzzleId}`;
		}

		hasResults() {
			return this.getResults().length >= 1;
		}

		hasBeenSolved() {
			if (!this.hasResults()) {
				return false;
			}

			return this.getResults().some(result => {
				return result.wasSuccessful();
			});
		}

		getResults() {
			return ($results[this.puzzleId] || []).map(resultData => new Result(resultData.puzzleId, resultData.seenAt, resultData.skipped, resultData.madeMistake, resultData.doneAt));
		}

		getTotalSolves() {
			return this.getResults().filter(result => result.wasSuccessful()).length;
		}

		getFailureCount() {
			return this.getResults().filter(result => result.wasFailure()).length;
		}

		getSolveStreak() {
			let streak = 0;

			if (!this.hasBeenSolved()) {
				return streak;
			}

			const results = this.getResults();

			for (let i = results.length - 1; i >= 0; i--) {
				if (results[i].wasSuccessful()) {
					streak++;
				} else {
					break;
				}
			}

			return streak;
		}

		averageSolveTime() {
			if (!this.hasBeenSolved()) {
				return null;
			}

			const successfulResults = this.getResults().filter(result => result.wasSuccessful());
			const lastFew = successfulResults.slice(minimumSolves * -1);
			const durations = lastFew.map(result => result.getDuration());
			const sum = durations.reduce((a, b) => a + b, 0);
			const average = sum / (lastFew.length || 1);
			return average;
		}

		lastSeenAt() {
			if (!this.hasResults()) {
				return null;
			}

			return this.getResults().slice(-1).seenAt;
		}

		isComplete() {
			if (!this.hasBeenSolved()) {
				return false;
			}

			const lastSolves = this.getResults().slice(-1 * minimumSolves);

			if (lastSolves.length < minimumSolves) {
				return false;
			}

			if (!lastSolves.every(result => result.wasSuccessful())) {
				return false;
			}

			return this.averageSolveTime() <= timeGoal;
		}
	}

	// Chess board stuff
	let fen;

	let chessground;
	let orientation = "white";

	let chessgroundConfig = {
		fen: INITIAL_FEN,
		coordinates: true,
		animation: { enabled: true },
		highlight: { lastMove: true, check: true },
		draggable: { enabled: true },
		selectable: { enabled: true },
		movable: {
			free: false,
			color: "both",
			dests: new Map(),
			events: { after: handleUserMove }
		},
		orientation
	};

	// Puzzle Data
	let allPuzzles = [];

	let activePuzzles = [];
	let completedPuzzles = [];
	let currentPuzzle;
	let puzzleShownAt;

	// Behavioral Config
	let batchSize = 10;

	let timeGoal = 15000;
	let minimumSolves = 2;
	let alreadyCompleteOdds = 0.3;

	// Current puzzle state
	let moves;

	let position;
	let madeMistake = false;
	let puzzleComplete = false;

	// DOM elements
	let nextButton;

	// Persisted data
	const puzzleDataStore = persisted("puzzles.data", {});

	validate_store(puzzleDataStore, 'puzzleDataStore');
	component_subscribe($$self, puzzleDataStore, value => $$invalidate(31, $puzzleDataStore = value));
	const puzzleIdsToWorkOn = persisted("puzzles.idsToWorkOn", []);
	validate_store(puzzleIdsToWorkOn, 'puzzleIdsToWorkOn');
	component_subscribe($$self, puzzleIdsToWorkOn, value => $$invalidate(10, $puzzleIdsToWorkOn = value));
	const results = persisted("puzzles.results", {});
	validate_store(results, 'results');
	component_subscribe($$self, results, value => $$invalidate(30, $results = value));

	function fillActivePuzzles() {
		const completed = Util.sortRandomly(getCompletedPuzzles());
		const incompleteInactive = Util.sortRandomly(getInactiveCompletedPuzzles());
		let puzzleType;

		while (allPuzzles.length > 0 && activePuzzles.length < batchSize) {
			puzzleType = Math.random() < 0.2 ? "completed" : "inactive";

			if (incompleteInactive.length < 1 && completed.length < 1) {
				break;
			}

			if (puzzleType === "completed" && completed.length > 0) {
				addActivePuzzle(completed.pop());
			} else if (incompleteInactive.length > 0) {
				addActivePuzzle(incompleteInactive.pop());
			}
		}
	}

	// This is tied to the add new puzzle form
	let newPuzzleIds;

	function addPuzzleIdToWorkOn() {
		if (newPuzzleIds.length < 3) {
			$$invalidate(7, newPuzzleIds = "");
			return;
		}

		const idsToAdd = newPuzzleIds.split(",").map(id => id.trim());
		const currentPuzzleIds = new Set($puzzleIdsToWorkOn);
		idsToAdd.forEach(id => currentPuzzleIds.add(id));
		puzzleIdsToWorkOn.set([...currentPuzzleIds]);
		$$invalidate(7, newPuzzleIds = "");
	}

	function removePuzzleId(puzzleId) {
		const currentPuzzleIds = new Set($puzzleIdsToWorkOn);
		currentPuzzleIds.delete(puzzleId.trim());
		puzzleIdsToWorkOn.set([...currentPuzzleIds]);
	}

	function addActivePuzzle(puzzle) {
		$$invalidate(0, activePuzzles = [
			...new Set([...activePuzzles.map(puzzle => puzzle.puzzleId), puzzle.puzzleId])
		].map(puzzleId => new Puzzle(puzzleId)));
	}

	function removeActivePuzzle(puzzle) {
		$$invalidate(0, activePuzzles = activePuzzles.filter(activePuzzle => activePuzzle.puzzleId !== puzzle.puzzleId));
	}

	function getCompletedPuzzles() {
		return allPuzzles.filter(puzzle => puzzle.isComplete());
	}

	function getIncompletePuzzles() {
		return allPuzzles.filter(puzzle => !puzzle.isComplete());
	}

	function getInactiveCompletedPuzzles() {
		return getIncompletePuzzles().filter(puzzle => !activePuzzles.includes(puzzle));
	}

	async function getNextPuzzle() {
		const previous = currentPuzzle ? currentPuzzle.puzzleId : null;
		const type = getNextPuzzleType();
		const alreadyComplete = activePuzzles.filter(puzzle => puzzle.isComplete());
		const incomplete = activePuzzles.filter(puzzle => !puzzle.isComplete());
		let candidatePuzzle;

		if (type === "alreadyComplete" && alreadyComplete.length > 0 || incomplete.length < 1) {
			candidatePuzzle = Util.getRandomElement(activePuzzles);
		} else {
			candidatePuzzle = Util.getRandomElement(incomplete);
		}

		if (activePuzzles.length > 1 && candidatePuzzle.puzzleId === previous) {
			return getNextPuzzle();
		}

		$$invalidate(4, currentPuzzle = allPuzzles.find(puzzle => puzzle.puzzleId === candidatePuzzle.puzzleId));
		const data = await getPuzzleData(currentPuzzle.puzzleId);

		if (data === null) {
			return getNextPuzzle();
		}

		return data;
	}

	async function getPuzzleData(puzzleId) {
		// Check cache first
		if ($puzzleDataStore[puzzleId]) {
			return $puzzleDataStore[puzzleId];
		}

		const response = await fetch(`https://lichess.org/api/puzzle/${puzzleId}`);

		if (response.status === 404) {
			// Remove invalid
			removePuzzleId(puzzleId);

			return null;
		}

		const puzzleData = await response.json();
		const data = $puzzleDataStore;
		data[currentPuzzle.puzzleId] = puzzleData;
		puzzleDataStore.set(data);
		return puzzleData;
	}

	function getNextPuzzleType() {
		const randomValue = Math.random();

		if (randomValue < alreadyCompleteOdds) {
			return "alreadyComplete";
		}

		return "incomplete";
	}

	async function skip() {
		const result = new Result(currentPuzzle.puzzleId, puzzleShownAt, true);
		addResult(currentPuzzle.puzzleId, result);
		await loadNextPuzzle();
	}

	function addResult(puzzleId, result) {
		const allResults = $results;
		const existingResults = $results[puzzleId] || [];
		existingResults.push(result);
		allResults[puzzleId] = existingResults;
		results.set(allResults);
	}

	function addCompletedPuzzle(puzzleToAdd) {
		$$invalidate(3, completedPuzzles = [
			...new Set([
					...getCompletedPuzzles().map(puzzle => puzzle.puzzleId),
					puzzleToAdd.puzzleId
				])
		].map(puzzleId => new Puzzle(puzzleId)));
	}

	function removeCompletedPuzzle(puzzleToRemove) {
		$$invalidate(3, completedPuzzles = completedPuzzles.filter(puzzle => puzzle.puzzleId !== puzzleToRemove.puzzleId));
	}

	async function loadNextPuzzle() {
		$$invalidate(5, puzzleComplete = false);
		madeMistake = false;

		if (currentPuzzle && currentPuzzle.isComplete()) {
			removeActivePuzzle(currentPuzzle);
			addCompletedPuzzle(currentPuzzle);
		}

		const next = await getNextPuzzle();
		$$invalidate(2, orientation = Util.whoseMoveIsIt(next.puzzle.initialPly + 1));

		// Clone so we don't cache a value that gets shifted later
		moves = [...next.puzzle.solution];

		const pgn = parsePgn(next.game.pgn)[0];
		position = startingPosition(pgn.headers).unwrap();
		const allNodes = [...pgn.moves.mainlineNodes()];

		for (let i = 0; i < allNodes.length - 1; i++) {
			const node = allNodes[i];
			const move = parseSan(position, node.data.san);
			position.play(move);
		}

		const lastMove = parseSan(position, allNodes[allNodes.length - 1].data.san);
		setChessgroundFromPosition();

		setTimeout(
			() => {
				position.play(lastMove);
				chessground.move(makeSquare(lastMove.from), makeSquare(lastMove.to));
				updateLegalMoves();
				puzzleShownAt = Util.currentMicrotime();
			},
			300
		);
	}

	function setChessgroundFromPosition() {
		fen = makeFen(position.toSetup());
		chessground.set({ fen });
		updateLegalMoves();
	}

	function updateLegalMoves() {
		fen = makeFen(position.toSetup());
		const legalMoves = getLegalMovesForFen(fen);
		chessground.set({ movable: { dests: legalMoves } });
	}

	function getLegalMovesForFen(fen) {
		const setup = parseFen(fen).unwrap();
		const chess = Chess.fromSetup(setup).unwrap();
		const destsMap = chess.allDests();
		const destsMapInSan = new Map();

		for (const [key, value] of destsMap.entries()) {
			const destsArray = Array.from(value).map(sq => makeSquare(sq));
			destsMapInSan.set(makeSquare(key), destsArray);
		}

		return destsMapInSan;
	}

	function handleUserMove(orig, dest) {
		const correctMove = moves[0];
		const origSquare = parseSquare(orig);
		const destSquare = parseSquare(dest);
		let move = { from: origSquare, to: destSquare };

		if (chessground.state.pieces.get(dest)?.role === "pawn" && (dest[1] === "1" || dest[1] === "8")) {
			move = { ...move, promotion: "queen" };
			chessground.setPieces(new Map([[dest, { color: orientation, role: "queen" }]]));
		}

		const uciMove = makeUci(move);

		if (wouldBeCheckmate(orig, dest)) {
			return handlePuzzleComplete();
		}

		if (uciMove === correctMove) {
			position.play(move);
			moves.shift(); // remove the user move first
			const computerMove = moves.shift();

			if (computerMove) {
				const move = parseUci(computerMove);
				position.play(move);
				chessground.move(makeSquare(move.from), makeSquare(move.to));
				updateLegalMoves();
			} else {
				return handlePuzzleComplete();
			}
		} else {
			madeMistake = true;
			showFailure("Nope!");

			setTimeout(
				() => {
					setChessgroundFromPosition();
				},
				200
			);
		}
	}

	function wouldBeCheckmate(orig, dest) {
		const origSquare = parseSquare(orig);
		const destSquare = parseSquare(dest);
		const clonedPosition = position.clone();
		clonedPosition.play({ from: origSquare, to: destSquare });
		return clonedPosition.isCheckmate();
	}

	function handlePuzzleComplete() {
		$$invalidate(5, puzzleComplete = true);
		const result = new Result(currentPuzzle.puzzleId, puzzleShownAt, false, madeMistake, Util.currentMicrotime());
		addResult(currentPuzzle.puzzleId, result);

		if (madeMistake) {
			removeCompletedPuzzle(currentPuzzle);
		}

		// Trigger reactivity
		$$invalidate(0, activePuzzles);

		showSuccess("Correct!");
	}

	let successMessage = null;

	function showSuccess(message, duration = 1500) {
		$$invalidate(9, failureMessage = null);
		$$invalidate(8, successMessage = message);

		setTimeout(
			() => {
				$$invalidate(8, successMessage = null);
			},
			duration
		);
	}

	let failureMessage = null;

	function showFailure(message, duration = 1000) {
		$$invalidate(8, successMessage = null);
		$$invalidate(9, failureMessage = message);

		setTimeout(
			() => {
				$$invalidate(9, failureMessage = null);
			},
			duration
		);
	}

	function initializePuzzles() {
		$$invalidate(20, allPuzzles = []);

		$puzzleIdsToWorkOn.forEach(puzzleId => {
			allPuzzles.push(new Puzzle(puzzleId));
		});

		$$invalidate(3, completedPuzzles = getCompletedPuzzles());
		fillActivePuzzles();
	}

	onMount(async () => {
		initializePuzzles();

		document.addEventListener("keydown", function (event) {
			if (["Enter", " "].includes(event.key) && nextButton) {
				event.preventDefault();
				nextButton.click();
			}
		});

		await loadNextPuzzle();
	});

	const writable_props = [];

	Object.keys($$props).forEach(key => {
		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Puzzles> was created with unknown prop '${key}'`);
	});

	function button_binding($$value) {
		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
			nextButton = $$value;
			$$invalidate(6, nextButton);
		});
	}

	const click_handler = async () => {
		await loadNextPuzzle();
	};

	function chessboard_chessground_binding(value) {
		chessground = value;
		$$invalidate(1, chessground);
	}

	function input_input_handler() {
		newPuzzleIds = this.value;
		$$invalidate(7, newPuzzleIds);
	}

	$$self.$capture_state = () => ({
		Chessboard,
		INITIAL_FEN,
		makeFen,
		parseFen,
		onMount,
		fade,
		flip,
		Util,
		parsePgn,
		startingPosition,
		parseSan,
		Chess,
		makeUci,
		parseUci,
		makeSquare,
		parseSquare,
		persisted,
		PuzzleHistoryProcessor,
		Result,
		Puzzle,
		fen,
		chessground,
		orientation,
		chessgroundConfig,
		allPuzzles,
		activePuzzles,
		completedPuzzles,
		currentPuzzle,
		puzzleShownAt,
		batchSize,
		timeGoal,
		minimumSolves,
		alreadyCompleteOdds,
		moves,
		position,
		madeMistake,
		puzzleComplete,
		nextButton,
		puzzleDataStore,
		puzzleIdsToWorkOn,
		results,
		fillActivePuzzles,
		newPuzzleIds,
		addPuzzleIdToWorkOn,
		removePuzzleId,
		addActivePuzzle,
		removeActivePuzzle,
		getCompletedPuzzles,
		getIncompletePuzzles,
		getInactiveCompletedPuzzles,
		sortPuzzlesBySolveTime,
		getNextPuzzle,
		getPuzzleData,
		getNextPuzzleType,
		skip,
		addResult,
		addCompletedPuzzle,
		removeCompletedPuzzle,
		loadNextPuzzle,
		setChessgroundFromPosition,
		updateLegalMoves,
		getLegalMovesForFen,
		handleUserMove,
		wouldBeCheckmate,
		handlePuzzleComplete,
		successMessage,
		showSuccess,
		failureMessage,
		showFailure,
		initializePuzzles,
		$puzzleIdsToWorkOn,
		$results,
		$puzzleDataStore
	});

	$$self.$inject_state = $$props => {
		if ('fen' in $$props) fen = $$props.fen;
		if ('chessground' in $$props) $$invalidate(1, chessground = $$props.chessground);
		if ('orientation' in $$props) $$invalidate(2, orientation = $$props.orientation);
		if ('chessgroundConfig' in $$props) $$invalidate(11, chessgroundConfig = $$props.chessgroundConfig);
		if ('allPuzzles' in $$props) $$invalidate(20, allPuzzles = $$props.allPuzzles);
		if ('activePuzzles' in $$props) $$invalidate(0, activePuzzles = $$props.activePuzzles);
		if ('completedPuzzles' in $$props) $$invalidate(3, completedPuzzles = $$props.completedPuzzles);
		if ('currentPuzzle' in $$props) $$invalidate(4, currentPuzzle = $$props.currentPuzzle);
		if ('puzzleShownAt' in $$props) puzzleShownAt = $$props.puzzleShownAt;
		if ('batchSize' in $$props) $$invalidate(34, batchSize = $$props.batchSize);
		if ('timeGoal' in $$props) $$invalidate(12, timeGoal = $$props.timeGoal);
		if ('minimumSolves' in $$props) $$invalidate(13, minimumSolves = $$props.minimumSolves);
		if ('alreadyCompleteOdds' in $$props) alreadyCompleteOdds = $$props.alreadyCompleteOdds;
		if ('moves' in $$props) moves = $$props.moves;
		if ('position' in $$props) position = $$props.position;
		if ('madeMistake' in $$props) madeMistake = $$props.madeMistake;
		if ('puzzleComplete' in $$props) $$invalidate(5, puzzleComplete = $$props.puzzleComplete);
		if ('nextButton' in $$props) $$invalidate(6, nextButton = $$props.nextButton);
		if ('newPuzzleIds' in $$props) $$invalidate(7, newPuzzleIds = $$props.newPuzzleIds);
		if ('successMessage' in $$props) $$invalidate(8, successMessage = $$props.successMessage);
		if ('failureMessage' in $$props) $$invalidate(9, failureMessage = $$props.failureMessage);
	};

	if ($$props && "$$inject" in $$props) {
		$$self.$inject_state($$props.$$inject);
	}

	$$self.$$.update = () => {
		if ($$self.$$.dirty[0] & /*activePuzzles, allPuzzles*/ 1048577) {
			{
				if (activePuzzles.length < batchSize && allPuzzles.length > 0) {
					fillActivePuzzles();
				}
			}
		}
	};

	return [
		activePuzzles,
		chessground,
		orientation,
		completedPuzzles,
		currentPuzzle,
		puzzleComplete,
		nextButton,
		newPuzzleIds,
		successMessage,
		failureMessage,
		$puzzleIdsToWorkOn,
		chessgroundConfig,
		timeGoal,
		minimumSolves,
		puzzleDataStore,
		puzzleIdsToWorkOn,
		results,
		addPuzzleIdToWorkOn,
		skip,
		loadNextPuzzle,
		allPuzzles,
		button_binding,
		click_handler,
		chessboard_chessground_binding,
		input_input_handler
	];
}

class Puzzles extends SvelteComponentDev {
	constructor(options) {
		super(options);
		init(this, options, instance, create_fragment, safe_not_equal, {}, add_css, [-1, -1]);

		dispatch_dev("SvelteRegisterComponent", {
			component: this,
			tagName: "Puzzles",
			options,
			id: create_fragment.name
		});
	}
}

export { Puzzles as default };
//# sourceMappingURL=puzzles.js.map
