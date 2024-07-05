import { Util } from 'src/util';
import Config, { ConfigForm } from 'src/local_config';
import { boardOptions, pieceSetOptions } from 'src/board/options';
import { knightMovesData } from 'src/knight_moves_data';
import { getRandomGame } from 'src/random_games';

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

// Adapted from https://github.com/then/is-promise/blob/master/index.js
// Distributed under MIT License https://github.com/then/is-promise/blob/master/LICENSE
/**
 * @param {any} value
 * @returns {value is PromiseLike<any>}
 */
function is_promise(value) {
	return (
		!!value &&
		(typeof value === 'object' || typeof value === 'function') &&
		typeof (/** @type {any} */ (value).then) === 'function'
	);
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

/** @param {number | string} value
 * @returns {[number, string]}
 */
function split_css_unit(value) {
	const split = typeof value === 'string' && value.match(/^\s*(-?[\d.]+)([^\s]*)\s*$/);
	return split ? [parseFloat(split[1]), split[2] || 'px'] : [/** @type {number} */ (value), 'px'];
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
 * @template {keyof SVGElementTagNameMap} K
 * @param {K} name
 * @returns {SVGElement}
 */
function svg_element(name) {
	return document.createElementNS('http://www.w3.org/2000/svg', name);
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

/**
 * @param {HTMLInputElement[]} group
 * @returns {{ p(...inputs: HTMLInputElement[]): void; r(): void; }}
 */
function init_binding_group(group) {
	/**
	 * @type {HTMLInputElement[]} */
	let _inputs;
	return {
		/* push */ p(...inputs) {
			_inputs = inputs;
			_inputs.forEach((input) => group.push(input));
		},
		/* remove */ r() {
			_inputs.forEach((input) => group.splice(group.indexOf(input), 1));
		}
	};
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

/**
 * Schedules a callback to run immediately after the component has been updated.
 *
 * The first time the callback runs will be after the initial `onMount`
 *
 * https://svelte.dev/docs/svelte#afterupdate
 * @param {() => any} fn
 * @returns {void}
 */
function afterUpdate(fn) {
	get_current_component().$$.after_update.push(fn);
}

/**
 * Schedules a callback to run immediately before the component is unmounted.
 *
 * Out of `onMount`, `beforeUpdate`, `afterUpdate` and `onDestroy`, this is the
 * only one that runs inside a server-side component.
 *
 * https://svelte.dev/docs/svelte#ondestroy
 * @param {() => any} fn
 * @returns {void}
 */
function onDestroy(fn) {
	get_current_component().$$.on_destroy.push(fn);
}

/**
 * Creates an event dispatcher that can be used to dispatch [component events](https://svelte.dev/docs#template-syntax-component-directives-on-eventname).
 * Event dispatchers are functions that can take two arguments: `name` and `detail`.
 *
 * Component events created with `createEventDispatcher` create a
 * [CustomEvent](https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent).
 * These events do not [bubble](https://developer.mozilla.org/en-US/docs/Learn/JavaScript/Building_blocks/Events#Event_bubbling_and_capture).
 * The `detail` argument corresponds to the [CustomEvent.detail](https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent/detail)
 * property and can contain any type of data.
 *
 * The event dispatcher can be typed to narrow the allowed event names and the type of the `detail` argument:
 * ```ts
 * const dispatch = createEventDispatcher<{
 *  loaded: never; // does not take a detail argument
 *  change: string; // takes a detail argument of type string, which is required
 *  optional: number | null; // takes an optional detail argument of type number
 * }>();
 * ```
 *
 * https://svelte.dev/docs/svelte#createeventdispatcher
 * @template {Record<string, any>} [EventMap=any]
 * @returns {import('./public.js').EventDispatcher<EventMap>}
 */
function createEventDispatcher() {
	const component = get_current_component();
	return (type, detail, { cancelable = false } = {}) => {
		const callbacks = component.$$.callbacks[type];
		if (callbacks) {
			// TODO are there situations where events could be dispatched
			// in a server (non-DOM) environment?
			const event = custom_event(/** @type {string} */ (type), detail, { cancelable });
			callbacks.slice().forEach((fn) => {
				fn.call(component, event);
			});
			return !event.defaultPrevented;
		}
		return true;
	};
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
 * @returns {{ start(): void; invalidate(): void; end(): void; }}
 */
function create_in_transition(node, fn, params) {
	/**
	 * @type {TransitionOptions} */
	const options = { direction: 'in' };
	let config = fn(node, params, options);
	let running = false;
	let animation_name;
	let task;
	let uid = 0;

	/**
	 * @returns {void} */
	function cleanup() {
		if (animation_name) delete_rule(node, animation_name);
	}

	/**
	 * @returns {void} */
	function go() {
		const {
			delay = 0,
			duration = 300,
			easing = identity,
			tick = noop,
			css
		} = config || null_transition;
		if (css) animation_name = create_rule(node, 0, 1, duration, delay, easing, css, uid++);
		tick(0, 1);
		const start_time = now() + delay;
		const end_time = start_time + duration;
		if (task) task.abort();
		running = true;
		add_render_callback(() => dispatch(node, true, 'start'));
		task = loop((now) => {
			if (running) {
				if (now >= end_time) {
					tick(1, 0);
					dispatch(node, true, 'end');
					cleanup();
					return (running = false);
				}
				if (now >= start_time) {
					const t = easing((now - start_time) / duration);
					tick(t, 1 - t);
				}
			}
			return running;
		});
	}
	let started = false;
	return {
		start() {
			if (started) return;
			started = true;
			delete_rule(node);
			if (is_function(config)) {
				config = config(options);
				wait().then(go);
			} else {
				go();
			}
		},
		invalidate() {
			started = false;
		},
		end() {
			if (running) {
				cleanup();
				running = false;
			}
		}
	};
}

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

/**
 * @template T
 * @param {Promise<T>} promise
 * @param {import('./private.js').PromiseInfo<T>} info
 * @returns {boolean}
 */
function handle_promise(promise, info) {
	const token = (info.token = {});
	/**
	 * @param {import('./private.js').FragmentFactory} type
	 * @param {0 | 1 | 2} index
	 * @param {number} [key]
	 * @param {any} [value]
	 * @returns {void}
	 */
	function update(type, index, key, value) {
		if (info.token !== token) return;
		info.resolved = value;
		let child_ctx = info.ctx;
		if (key !== undefined) {
			child_ctx = child_ctx.slice();
			child_ctx[key] = value;
		}
		const block = type && (info.current = type)(child_ctx);
		let needs_flush = false;
		if (info.block) {
			if (info.blocks) {
				info.blocks.forEach((block, i) => {
					if (i !== index && block) {
						group_outros();
						transition_out(block, 1, 1, () => {
							if (info.blocks[i] === block) {
								info.blocks[i] = null;
							}
						});
						check_outros();
					}
				});
			} else {
				info.block.d(1);
			}
			block.c();
			transition_in(block, 1);
			block.m(info.mount(), info.anchor);
			needs_flush = true;
		}
		info.block = block;
		if (info.blocks) info.blocks[index] = block;
		if (needs_flush) {
			flush();
		}
	}
	if (is_promise(promise)) {
		const current_component = get_current_component();
		promise.then(
			(value) => {
				set_current_component(current_component);
				update(info.then, 1, info.value, value);
				set_current_component(null);
			},
			(error) => {
				set_current_component(current_component);
				update(info.catch, 2, info.error, error);
				set_current_component(null);
				if (!info.hasCatch) {
					throw error;
				}
			}
		);
		// if we previously had a then/catch block, destroy it
		if (info.current !== info.pending) {
			update(info.pending, 0);
			return true;
		}
	} else {
		if (info.current !== info.then) {
			update(info.then, 1, info.value, promise);
			return true;
		}
		info.resolved = /** @type {T} */ (promise);
	}
}

/** @returns {void} */
function update_await_block_branch(info, ctx, dirty) {
	const child_ctx = ctx.slice();
	const { resolved } = info;
	if (info.current === info.then) {
		child_ctx[info.value] = resolved;
	}
	if (info.current === info.catch) {
		child_ctx[info.error] = resolved;
	}
	info.block.p(child_ctx, dirty);
}

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
function outro_and_destroy_block(block, lookup) {
	transition_out(block, 1, 1, () => {
		lookup.delete(block.key);
	});
}

/** @returns {void} */
function fix_and_destroy_block(block, lookup) {
	block.f();
	destroy_block(block, lookup);
}

/** @returns {void} */
function fix_and_outro_and_destroy_block(block, lookup) {
	block.f();
	outro_and_destroy_block(block, lookup);
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

/**
 * @license
 * Copyright (c) 2023, Jeff Hlywa (jhlywa@gmail.com)
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *
 * 1. Redistributions of source code must retain the above copyright notice,
 *    this list of conditions and the following disclaimer.
 * 2. Redistributions in binary form must reproduce the above copyright notice,
 *    this list of conditions and the following disclaimer in the documentation
 *    and/or other materials provided with the distribution.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
 * ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE
 * LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
 * CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
 * SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
 * INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
 * CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 * ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 * POSSIBILITY OF SUCH DAMAGE.
 */
const WHITE = 'w';
const BLACK = 'b';
const PAWN = 'p';
const KNIGHT = 'n';
const BISHOP = 'b';
const ROOK = 'r';
const QUEEN = 'q';
const KING = 'k';
const DEFAULT_POSITION = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const EMPTY = -1;
const FLAGS = {
    NORMAL: 'n',
    CAPTURE: 'c',
    BIG_PAWN: 'b',
    EP_CAPTURE: 'e',
    PROMOTION: 'p',
    KSIDE_CASTLE: 'k',
    QSIDE_CASTLE: 'q',
};
const BITS = {
    NORMAL: 1,
    CAPTURE: 2,
    BIG_PAWN: 4,
    EP_CAPTURE: 8,
    PROMOTION: 16,
    KSIDE_CASTLE: 32,
    QSIDE_CASTLE: 64,
};
/*
 * NOTES ABOUT 0x88 MOVE GENERATION ALGORITHM
 * ----------------------------------------------------------------------------
 * From https://github.com/jhlywa/chess.js/issues/230
 *
 * A lot of people are confused when they first see the internal representation
 * of chess.js. It uses the 0x88 Move Generation Algorithm which internally
 * stores the board as an 8x16 array. This is purely for efficiency but has a
 * couple of interesting benefits:
 *
 * 1. 0x88 offers a very inexpensive "off the board" check. Bitwise AND (&) any
 *    square with 0x88, if the result is non-zero then the square is off the
 *    board. For example, assuming a knight square A8 (0 in 0x88 notation),
 *    there are 8 possible directions in which the knight can move. These
 *    directions are relative to the 8x16 board and are stored in the
 *    PIECE_OFFSETS map. One possible move is A8 - 18 (up one square, and two
 *    squares to the left - which is off the board). 0 - 18 = -18 & 0x88 = 0x88
 *    (because of two-complement representation of -18). The non-zero result
 *    means the square is off the board and the move is illegal. Take the
 *    opposite move (from A8 to C7), 0 + 18 = 18 & 0x88 = 0. A result of zero
 *    means the square is on the board.
 *
 * 2. The relative distance (or difference) between two squares on a 8x16 board
 *    is unique and can be used to inexpensively determine if a piece on a
 *    square can attack any other arbitrary square. For example, let's see if a
 *    pawn on E7 can attack E2. The difference between E7 (20) - E2 (100) is
 *    -80. We add 119 to make the ATTACKS array index non-negative (because the
 *    worst case difference is A8 - H1 = -119). The ATTACKS array contains a
 *    bitmask of pieces that can attack from that distance and direction.
 *    ATTACKS[-80 + 119=39] gives us 24 or 0b11000 in binary. Look at the
 *    PIECE_MASKS map to determine the mask for a given piece type. In our pawn
 *    example, we would check to see if 24 & 0x1 is non-zero, which it is
 *    not. So, naturally, a pawn on E7 can't attack a piece on E2. However, a
 *    rook can since 24 & 0x8 is non-zero. The only thing left to check is that
 *    there are no blocking pieces between E7 and E2. That's where the RAYS
 *    array comes in. It provides an offset (in this case 16) to add to E7 (20)
 *    to check for blocking pieces. E7 (20) + 16 = E6 (36) + 16 = E5 (52) etc.
 */
// prettier-ignore
// eslint-disable-next-line
const Ox88 = {
    a8: 0, b8: 1, c8: 2, d8: 3, e8: 4, f8: 5, g8: 6, h8: 7,
    a7: 16, b7: 17, c7: 18, d7: 19, e7: 20, f7: 21, g7: 22, h7: 23,
    a6: 32, b6: 33, c6: 34, d6: 35, e6: 36, f6: 37, g6: 38, h6: 39,
    a5: 48, b5: 49, c5: 50, d5: 51, e5: 52, f5: 53, g5: 54, h5: 55,
    a4: 64, b4: 65, c4: 66, d4: 67, e4: 68, f4: 69, g4: 70, h4: 71,
    a3: 80, b3: 81, c3: 82, d3: 83, e3: 84, f3: 85, g3: 86, h3: 87,
    a2: 96, b2: 97, c2: 98, d2: 99, e2: 100, f2: 101, g2: 102, h2: 103,
    a1: 112, b1: 113, c1: 114, d1: 115, e1: 116, f1: 117, g1: 118, h1: 119
};
const PAWN_OFFSETS = {
    b: [16, 32, 17, 15],
    w: [-16, -32, -17, -15],
};
const PIECE_OFFSETS = {
    n: [-18, -33, -31, -14, 18, 33, 31, 14],
    b: [-17, -15, 17, 15],
    r: [-16, 1, 16, -1],
    q: [-17, -16, -15, 1, 17, 16, 15, -1],
    k: [-17, -16, -15, 1, 17, 16, 15, -1],
};
// prettier-ignore
const ATTACKS = [
    20, 0, 0, 0, 0, 0, 0, 24, 0, 0, 0, 0, 0, 0, 20, 0,
    0, 20, 0, 0, 0, 0, 0, 24, 0, 0, 0, 0, 0, 20, 0, 0,
    0, 0, 20, 0, 0, 0, 0, 24, 0, 0, 0, 0, 20, 0, 0, 0,
    0, 0, 0, 20, 0, 0, 0, 24, 0, 0, 0, 20, 0, 0, 0, 0,
    0, 0, 0, 0, 20, 0, 0, 24, 0, 0, 20, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 20, 2, 24, 2, 20, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 2, 53, 56, 53, 2, 0, 0, 0, 0, 0, 0,
    24, 24, 24, 24, 24, 24, 56, 0, 56, 24, 24, 24, 24, 24, 24, 0,
    0, 0, 0, 0, 0, 2, 53, 56, 53, 2, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 20, 2, 24, 2, 20, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 20, 0, 0, 24, 0, 0, 20, 0, 0, 0, 0, 0,
    0, 0, 0, 20, 0, 0, 0, 24, 0, 0, 0, 20, 0, 0, 0, 0,
    0, 0, 20, 0, 0, 0, 0, 24, 0, 0, 0, 0, 20, 0, 0, 0,
    0, 20, 0, 0, 0, 0, 0, 24, 0, 0, 0, 0, 0, 20, 0, 0,
    20, 0, 0, 0, 0, 0, 0, 24, 0, 0, 0, 0, 0, 0, 20
];
// prettier-ignore
const RAYS = [
    17, 0, 0, 0, 0, 0, 0, 16, 0, 0, 0, 0, 0, 0, 15, 0,
    0, 17, 0, 0, 0, 0, 0, 16, 0, 0, 0, 0, 0, 15, 0, 0,
    0, 0, 17, 0, 0, 0, 0, 16, 0, 0, 0, 0, 15, 0, 0, 0,
    0, 0, 0, 17, 0, 0, 0, 16, 0, 0, 0, 15, 0, 0, 0, 0,
    0, 0, 0, 0, 17, 0, 0, 16, 0, 0, 15, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 17, 0, 16, 0, 15, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 17, 16, 15, 0, 0, 0, 0, 0, 0, 0,
    1, 1, 1, 1, 1, 1, 1, 0, -1, -1, -1, -1, -1, -1, -1, 0,
    0, 0, 0, 0, 0, 0, -15, -16, -17, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, -15, 0, -16, 0, -17, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, -15, 0, 0, -16, 0, 0, -17, 0, 0, 0, 0, 0,
    0, 0, 0, -15, 0, 0, 0, -16, 0, 0, 0, -17, 0, 0, 0, 0,
    0, 0, -15, 0, 0, 0, 0, -16, 0, 0, 0, 0, -17, 0, 0, 0,
    0, -15, 0, 0, 0, 0, 0, -16, 0, 0, 0, 0, 0, -17, 0, 0,
    -15, 0, 0, 0, 0, 0, 0, -16, 0, 0, 0, 0, 0, 0, -17
];
const PIECE_MASKS = { p: 0x1, n: 0x2, b: 0x4, r: 0x8, q: 0x10, k: 0x20 };
const SYMBOLS = 'pnbrqkPNBRQK';
const PROMOTIONS = [KNIGHT, BISHOP, ROOK, QUEEN];
const RANK_1 = 7;
const RANK_2 = 6;
/*
 * const RANK_3 = 5
 * const RANK_4 = 4
 * const RANK_5 = 3
 * const RANK_6 = 2
 */
const RANK_7 = 1;
const RANK_8 = 0;
const SIDES = {
    [KING]: BITS.KSIDE_CASTLE,
    [QUEEN]: BITS.QSIDE_CASTLE,
};
const ROOKS = {
    w: [
        { square: Ox88.a1, flag: BITS.QSIDE_CASTLE },
        { square: Ox88.h1, flag: BITS.KSIDE_CASTLE },
    ],
    b: [
        { square: Ox88.a8, flag: BITS.QSIDE_CASTLE },
        { square: Ox88.h8, flag: BITS.KSIDE_CASTLE },
    ],
};
const SECOND_RANK = { b: RANK_7, w: RANK_2 };
const TERMINATION_MARKERS = ['1-0', '0-1', '1/2-1/2', '*'];
// Extracts the zero-based rank of an 0x88 square.
function rank(square) {
    return square >> 4;
}
// Extracts the zero-based file of an 0x88 square.
function file$e(square) {
    return square & 0xf;
}
function isDigit(c) {
    return '0123456789'.indexOf(c) !== -1;
}
// Converts a 0x88 square to algebraic notation.
function algebraic(square) {
    const f = file$e(square);
    const r = rank(square);
    return ('abcdefgh'.substring(f, f + 1) +
        '87654321'.substring(r, r + 1));
}
function swapColor(color) {
    return color === WHITE ? BLACK : WHITE;
}
function validateFen(fen) {
    // 1st criterion: 6 space-seperated fields?
    const tokens = fen.split(/\s+/);
    if (tokens.length !== 6) {
        return {
            ok: false,
            error: 'Invalid FEN: must contain six space-delimited fields',
        };
    }
    // 2nd criterion: move number field is a integer value > 0?
    const moveNumber = parseInt(tokens[5], 10);
    if (isNaN(moveNumber) || moveNumber <= 0) {
        return {
            ok: false,
            error: 'Invalid FEN: move number must be a positive integer',
        };
    }
    // 3rd criterion: half move counter is an integer >= 0?
    const halfMoves = parseInt(tokens[4], 10);
    if (isNaN(halfMoves) || halfMoves < 0) {
        return {
            ok: false,
            error: 'Invalid FEN: half move counter number must be a non-negative integer',
        };
    }
    // 4th criterion: 4th field is a valid e.p.-string?
    if (!/^(-|[abcdefgh][36])$/.test(tokens[3])) {
        return { ok: false, error: 'Invalid FEN: en-passant square is invalid' };
    }
    // 5th criterion: 3th field is a valid castle-string?
    if (/[^kKqQ-]/.test(tokens[2])) {
        return { ok: false, error: 'Invalid FEN: castling availability is invalid' };
    }
    // 6th criterion: 2nd field is "w" (white) or "b" (black)?
    if (!/^(w|b)$/.test(tokens[1])) {
        return { ok: false, error: 'Invalid FEN: side-to-move is invalid' };
    }
    // 7th criterion: 1st field contains 8 rows?
    const rows = tokens[0].split('/');
    if (rows.length !== 8) {
        return {
            ok: false,
            error: "Invalid FEN: piece data does not contain 8 '/'-delimited rows",
        };
    }
    // 8th criterion: every row is valid?
    for (let i = 0; i < rows.length; i++) {
        // check for right sum of fields AND not two numbers in succession
        let sumFields = 0;
        let previousWasNumber = false;
        for (let k = 0; k < rows[i].length; k++) {
            if (isDigit(rows[i][k])) {
                if (previousWasNumber) {
                    return {
                        ok: false,
                        error: 'Invalid FEN: piece data is invalid (consecutive number)',
                    };
                }
                sumFields += parseInt(rows[i][k], 10);
                previousWasNumber = true;
            }
            else {
                if (!/^[prnbqkPRNBQK]$/.test(rows[i][k])) {
                    return {
                        ok: false,
                        error: 'Invalid FEN: piece data is invalid (invalid piece)',
                    };
                }
                sumFields += 1;
                previousWasNumber = false;
            }
        }
        if (sumFields !== 8) {
            return {
                ok: false,
                error: 'Invalid FEN: piece data is invalid (too many squares in rank)',
            };
        }
    }
    // 9th criterion: is en-passant square legal?
    if ((tokens[3][1] == '3' && tokens[1] == 'w') ||
        (tokens[3][1] == '6' && tokens[1] == 'b')) {
        return { ok: false, error: 'Invalid FEN: illegal en-passant square' };
    }
    // 10th criterion: does chess position contain exact two kings?
    const kings = [
        { color: 'white', regex: /K/g },
        { color: 'black', regex: /k/g },
    ];
    for (const { color, regex } of kings) {
        if (!regex.test(tokens[0])) {
            return { ok: false, error: `Invalid FEN: missing ${color} king` };
        }
        if ((tokens[0].match(regex) || []).length > 1) {
            return { ok: false, error: `Invalid FEN: too many ${color} kings` };
        }
    }
    // 11th criterion: are any pawns on the first or eighth rows?
    if (Array.from(rows[0] + rows[7]).some((char) => char.toUpperCase() === 'P')) {
        return {
            ok: false,
            error: 'Invalid FEN: some pawns are on the edge rows',
        };
    }
    return { ok: true };
}
// this function is used to uniquely identify ambiguous moves
function getDisambiguator(move, moves) {
    const from = move.from;
    const to = move.to;
    const piece = move.piece;
    let ambiguities = 0;
    let sameRank = 0;
    let sameFile = 0;
    for (let i = 0, len = moves.length; i < len; i++) {
        const ambigFrom = moves[i].from;
        const ambigTo = moves[i].to;
        const ambigPiece = moves[i].piece;
        /*
         * if a move of the same piece type ends on the same to square, we'll need
         * to add a disambiguator to the algebraic notation
         */
        if (piece === ambigPiece && from !== ambigFrom && to === ambigTo) {
            ambiguities++;
            if (rank(from) === rank(ambigFrom)) {
                sameRank++;
            }
            if (file$e(from) === file$e(ambigFrom)) {
                sameFile++;
            }
        }
    }
    if (ambiguities > 0) {
        if (sameRank > 0 && sameFile > 0) {
            /*
             * if there exists a similar moving piece on the same rank and file as
             * the move in question, use the square as the disambiguator
             */
            return algebraic(from);
        }
        else if (sameFile > 0) {
            /*
             * if the moving piece rests on the same file, use the rank symbol as the
             * disambiguator
             */
            return algebraic(from).charAt(1);
        }
        else {
            // else use the file symbol
            return algebraic(from).charAt(0);
        }
    }
    return '';
}
function addMove(moves, color, from, to, piece, captured = undefined, flags = BITS.NORMAL) {
    const r = rank(to);
    if (piece === PAWN && (r === RANK_1 || r === RANK_8)) {
        for (let i = 0; i < PROMOTIONS.length; i++) {
            const promotion = PROMOTIONS[i];
            moves.push({
                color,
                from,
                to,
                piece,
                captured,
                promotion,
                flags: flags | BITS.PROMOTION,
            });
        }
    }
    else {
        moves.push({
            color,
            from,
            to,
            piece,
            captured,
            flags,
        });
    }
}
function inferPieceType(san) {
    let pieceType = san.charAt(0);
    if (pieceType >= 'a' && pieceType <= 'h') {
        const matches = san.match(/[a-h]\d.*[a-h]\d/);
        if (matches) {
            return undefined;
        }
        return PAWN;
    }
    pieceType = pieceType.toLowerCase();
    if (pieceType === 'o') {
        return KING;
    }
    return pieceType;
}
// parses all of the decorators out of a SAN string
function strippedSan(move) {
    return move.replace(/=/, '').replace(/[+#]?[?!]*$/, '');
}
function trimFen(fen) {
    /*
     * remove last two fields in FEN string as they're not needed when checking
     * for repetition
     */
    return fen.split(' ').slice(0, 4).join(' ');
}
class Chess {
    _board = new Array(128);
    _turn = WHITE;
    _header = {};
    _kings = { w: EMPTY, b: EMPTY };
    _epSquare = -1;
    _halfMoves = 0;
    _moveNumber = 0;
    _history = [];
    _comments = {};
    _castling = { w: 0, b: 0 };
    // tracks number of times a position has been seen for repetition checking
    _positionCount = {};
    constructor(fen = DEFAULT_POSITION) {
        this.load(fen);
    }
    clear({ preserveHeaders = false } = {}) {
        this._board = new Array(128);
        this._kings = { w: EMPTY, b: EMPTY };
        this._turn = WHITE;
        this._castling = { w: 0, b: 0 };
        this._epSquare = EMPTY;
        this._halfMoves = 0;
        this._moveNumber = 1;
        this._history = [];
        this._comments = {};
        this._header = preserveHeaders ? this._header : {};
        this._positionCount = {};
        /*
         * Delete the SetUp and FEN headers (if preserved), the board is empty and
         * these headers don't make sense in this state. They'll get added later
         * via .load() or .put()
         */
        delete this._header['SetUp'];
        delete this._header['FEN'];
    }
    removeHeader(key) {
        if (key in this._header) {
            delete this._header[key];
        }
    }
    load(fen, { skipValidation = false, preserveHeaders = false } = {}) {
        let tokens = fen.split(/\s+/);
        // append commonly omitted fen tokens
        if (tokens.length >= 2 && tokens.length < 6) {
            const adjustments = ['-', '-', '0', '1'];
            fen = tokens.concat(adjustments.slice(-(6 - tokens.length))).join(' ');
        }
        tokens = fen.split(/\s+/);
        if (!skipValidation) {
            const { ok, error } = validateFen(fen);
            if (!ok) {
                throw new Error(error);
            }
        }
        const position = tokens[0];
        let square = 0;
        this.clear({ preserveHeaders });
        for (let i = 0; i < position.length; i++) {
            const piece = position.charAt(i);
            if (piece === '/') {
                square += 8;
            }
            else if (isDigit(piece)) {
                square += parseInt(piece, 10);
            }
            else {
                const color = piece < 'a' ? WHITE : BLACK;
                this._put({ type: piece.toLowerCase(), color }, algebraic(square));
                square++;
            }
        }
        this._turn = tokens[1];
        if (tokens[2].indexOf('K') > -1) {
            this._castling.w |= BITS.KSIDE_CASTLE;
        }
        if (tokens[2].indexOf('Q') > -1) {
            this._castling.w |= BITS.QSIDE_CASTLE;
        }
        if (tokens[2].indexOf('k') > -1) {
            this._castling.b |= BITS.KSIDE_CASTLE;
        }
        if (tokens[2].indexOf('q') > -1) {
            this._castling.b |= BITS.QSIDE_CASTLE;
        }
        this._epSquare = tokens[3] === '-' ? EMPTY : Ox88[tokens[3]];
        this._halfMoves = parseInt(tokens[4], 10);
        this._moveNumber = parseInt(tokens[5], 10);
        this._updateSetup(fen);
        this._incPositionCount(fen);
    }
    fen() {
        let empty = 0;
        let fen = '';
        for (let i = Ox88.a8; i <= Ox88.h1; i++) {
            if (this._board[i]) {
                if (empty > 0) {
                    fen += empty;
                    empty = 0;
                }
                const { color, type: piece } = this._board[i];
                fen += color === WHITE ? piece.toUpperCase() : piece.toLowerCase();
            }
            else {
                empty++;
            }
            if ((i + 1) & 0x88) {
                if (empty > 0) {
                    fen += empty;
                }
                if (i !== Ox88.h1) {
                    fen += '/';
                }
                empty = 0;
                i += 8;
            }
        }
        let castling = '';
        if (this._castling[WHITE] & BITS.KSIDE_CASTLE) {
            castling += 'K';
        }
        if (this._castling[WHITE] & BITS.QSIDE_CASTLE) {
            castling += 'Q';
        }
        if (this._castling[BLACK] & BITS.KSIDE_CASTLE) {
            castling += 'k';
        }
        if (this._castling[BLACK] & BITS.QSIDE_CASTLE) {
            castling += 'q';
        }
        // do we have an empty castling flag?
        castling = castling || '-';
        let epSquare = '-';
        /*
         * only print the ep square if en passant is a valid move (pawn is present
         * and ep capture is not pinned)
         */
        if (this._epSquare !== EMPTY) {
            const bigPawnSquare = this._epSquare + (this._turn === WHITE ? 16 : -16);
            const squares = [bigPawnSquare + 1, bigPawnSquare - 1];
            for (const square of squares) {
                // is the square off the board?
                if (square & 0x88) {
                    continue;
                }
                const color = this._turn;
                // is there a pawn that can capture the epSquare?
                if (this._board[square]?.color === color &&
                    this._board[square]?.type === PAWN) {
                    // if the pawn makes an ep capture, does it leave it's king in check?
                    this._makeMove({
                        color,
                        from: square,
                        to: this._epSquare,
                        piece: PAWN,
                        captured: PAWN,
                        flags: BITS.EP_CAPTURE,
                    });
                    const isLegal = !this._isKingAttacked(color);
                    this._undoMove();
                    // if ep is legal, break and set the ep square in the FEN output
                    if (isLegal) {
                        epSquare = algebraic(this._epSquare);
                        break;
                    }
                }
            }
        }
        return [
            fen,
            this._turn,
            castling,
            epSquare,
            this._halfMoves,
            this._moveNumber,
        ].join(' ');
    }
    /*
     * Called when the initial board setup is changed with put() or remove().
     * modifies the SetUp and FEN properties of the header object. If the FEN
     * is equal to the default position, the SetUp and FEN are deleted the setup
     * is only updated if history.length is zero, ie moves haven't been made.
     */
    _updateSetup(fen) {
        if (this._history.length > 0)
            return;
        if (fen !== DEFAULT_POSITION) {
            this._header['SetUp'] = '1';
            this._header['FEN'] = fen;
        }
        else {
            delete this._header['SetUp'];
            delete this._header['FEN'];
        }
    }
    reset() {
        this.load(DEFAULT_POSITION);
    }
    get(square) {
        return this._board[Ox88[square]] || false;
    }
    put({ type, color }, square) {
        if (this._put({ type, color }, square)) {
            this._updateCastlingRights();
            this._updateEnPassantSquare();
            this._updateSetup(this.fen());
            return true;
        }
        return false;
    }
    _put({ type, color }, square) {
        // check for piece
        if (SYMBOLS.indexOf(type.toLowerCase()) === -1) {
            return false;
        }
        // check for valid square
        if (!(square in Ox88)) {
            return false;
        }
        const sq = Ox88[square];
        // don't let the user place more than one king
        if (type == KING &&
            !(this._kings[color] == EMPTY || this._kings[color] == sq)) {
            return false;
        }
        const currentPieceOnSquare = this._board[sq];
        // if one of the kings will be replaced by the piece from args, set the `_kings` respective entry to `EMPTY`
        if (currentPieceOnSquare && currentPieceOnSquare.type === KING) {
            this._kings[currentPieceOnSquare.color] = EMPTY;
        }
        this._board[sq] = { type: type, color: color };
        if (type === KING) {
            this._kings[color] = sq;
        }
        return true;
    }
    remove(square) {
        const piece = this.get(square);
        delete this._board[Ox88[square]];
        if (piece && piece.type === KING) {
            this._kings[piece.color] = EMPTY;
        }
        this._updateCastlingRights();
        this._updateEnPassantSquare();
        this._updateSetup(this.fen());
        return piece;
    }
    _updateCastlingRights() {
        const whiteKingInPlace = this._board[Ox88.e1]?.type === KING &&
            this._board[Ox88.e1]?.color === WHITE;
        const blackKingInPlace = this._board[Ox88.e8]?.type === KING &&
            this._board[Ox88.e8]?.color === BLACK;
        if (!whiteKingInPlace ||
            this._board[Ox88.a1]?.type !== ROOK ||
            this._board[Ox88.a1]?.color !== WHITE) {
            this._castling.w &= ~BITS.QSIDE_CASTLE;
        }
        if (!whiteKingInPlace ||
            this._board[Ox88.h1]?.type !== ROOK ||
            this._board[Ox88.h1]?.color !== WHITE) {
            this._castling.w &= ~BITS.KSIDE_CASTLE;
        }
        if (!blackKingInPlace ||
            this._board[Ox88.a8]?.type !== ROOK ||
            this._board[Ox88.a8]?.color !== BLACK) {
            this._castling.b &= ~BITS.QSIDE_CASTLE;
        }
        if (!blackKingInPlace ||
            this._board[Ox88.h8]?.type !== ROOK ||
            this._board[Ox88.h8]?.color !== BLACK) {
            this._castling.b &= ~BITS.KSIDE_CASTLE;
        }
    }
    _updateEnPassantSquare() {
        if (this._epSquare === EMPTY) {
            return;
        }
        const startSquare = this._epSquare + (this._turn === WHITE ? -16 : 16);
        const currentSquare = this._epSquare + (this._turn === WHITE ? 16 : -16);
        const attackers = [currentSquare + 1, currentSquare - 1];
        if (this._board[startSquare] !== null ||
            this._board[this._epSquare] !== null ||
            this._board[currentSquare]?.color !== swapColor(this._turn) ||
            this._board[currentSquare]?.type !== PAWN) {
            this._epSquare = EMPTY;
            return;
        }
        const canCapture = (square) => !(square & 0x88) &&
            this._board[square]?.color === this._turn &&
            this._board[square]?.type === PAWN;
        if (!attackers.some(canCapture)) {
            this._epSquare = EMPTY;
        }
    }
    _attacked(color, square) {
        for (let i = Ox88.a8; i <= Ox88.h1; i++) {
            // did we run off the end of the board
            if (i & 0x88) {
                i += 7;
                continue;
            }
            // if empty square or wrong color
            if (this._board[i] === undefined || this._board[i].color !== color) {
                continue;
            }
            const piece = this._board[i];
            const difference = i - square;
            // skip - to/from square are the same
            if (difference === 0) {
                continue;
            }
            const index = difference + 119;
            if (ATTACKS[index] & PIECE_MASKS[piece.type]) {
                if (piece.type === PAWN) {
                    if (difference > 0) {
                        if (piece.color === WHITE)
                            return true;
                    }
                    else {
                        if (piece.color === BLACK)
                            return true;
                    }
                    continue;
                }
                // if the piece is a knight or a king
                if (piece.type === 'n' || piece.type === 'k')
                    return true;
                const offset = RAYS[index];
                let j = i + offset;
                let blocked = false;
                while (j !== square) {
                    if (this._board[j] != null) {
                        blocked = true;
                        break;
                    }
                    j += offset;
                }
                if (!blocked)
                    return true;
            }
        }
        return false;
    }
    _isKingAttacked(color) {
        const square = this._kings[color];
        return square === -1 ? false : this._attacked(swapColor(color), square);
    }
    isAttacked(square, attackedBy) {
        return this._attacked(attackedBy, Ox88[square]);
    }
    isCheck() {
        return this._isKingAttacked(this._turn);
    }
    inCheck() {
        return this.isCheck();
    }
    isCheckmate() {
        return this.isCheck() && this._moves().length === 0;
    }
    isStalemate() {
        return !this.isCheck() && this._moves().length === 0;
    }
    isInsufficientMaterial() {
        /*
         * k.b. vs k.b. (of opposite colors) with mate in 1:
         * 8/8/8/8/1b6/8/B1k5/K7 b - - 0 1
         *
         * k.b. vs k.n. with mate in 1:
         * 8/8/8/8/1n6/8/B7/K1k5 b - - 2 1
         */
        const pieces = {
            b: 0,
            n: 0,
            r: 0,
            q: 0,
            k: 0,
            p: 0,
        };
        const bishops = [];
        let numPieces = 0;
        let squareColor = 0;
        for (let i = Ox88.a8; i <= Ox88.h1; i++) {
            squareColor = (squareColor + 1) % 2;
            if (i & 0x88) {
                i += 7;
                continue;
            }
            const piece = this._board[i];
            if (piece) {
                pieces[piece.type] = piece.type in pieces ? pieces[piece.type] + 1 : 1;
                if (piece.type === BISHOP) {
                    bishops.push(squareColor);
                }
                numPieces++;
            }
        }
        // k vs. k
        if (numPieces === 2) {
            return true;
        }
        else if (
        // k vs. kn .... or .... k vs. kb
        numPieces === 3 &&
            (pieces[BISHOP] === 1 || pieces[KNIGHT] === 1)) {
            return true;
        }
        else if (numPieces === pieces[BISHOP] + 2) {
            // kb vs. kb where any number of bishops are all on the same color
            let sum = 0;
            const len = bishops.length;
            for (let i = 0; i < len; i++) {
                sum += bishops[i];
            }
            if (sum === 0 || sum === len) {
                return true;
            }
        }
        return false;
    }
    isThreefoldRepetition() {
        return this._getPositionCount(this.fen()) >= 3;
    }
    isDraw() {
        return (this._halfMoves >= 100 || // 50 moves per side = 100 half moves
            this.isStalemate() ||
            this.isInsufficientMaterial() ||
            this.isThreefoldRepetition());
    }
    isGameOver() {
        return this.isCheckmate() || this.isStalemate() || this.isDraw();
    }
    moves({ verbose = false, square = undefined, piece = undefined, } = {}) {
        const moves = this._moves({ square, piece });
        if (verbose) {
            return moves.map((move) => this._makePretty(move));
        }
        else {
            return moves.map((move) => this._moveToSan(move, moves));
        }
    }
    _moves({ legal = true, piece = undefined, square = undefined, } = {}) {
        const forSquare = square ? square.toLowerCase() : undefined;
        const forPiece = piece?.toLowerCase();
        const moves = [];
        const us = this._turn;
        const them = swapColor(us);
        let firstSquare = Ox88.a8;
        let lastSquare = Ox88.h1;
        let singleSquare = false;
        // are we generating moves for a single square?
        if (forSquare) {
            // illegal square, return empty moves
            if (!(forSquare in Ox88)) {
                return [];
            }
            else {
                firstSquare = lastSquare = Ox88[forSquare];
                singleSquare = true;
            }
        }
        for (let from = firstSquare; from <= lastSquare; from++) {
            // did we run off the end of the board
            if (from & 0x88) {
                from += 7;
                continue;
            }
            // empty square or opponent, skip
            if (!this._board[from] || this._board[from].color === them) {
                continue;
            }
            const { type } = this._board[from];
            let to;
            if (type === PAWN) {
                if (forPiece && forPiece !== type)
                    continue;
                // single square, non-capturing
                to = from + PAWN_OFFSETS[us][0];
                if (!this._board[to]) {
                    addMove(moves, us, from, to, PAWN);
                    // double square
                    to = from + PAWN_OFFSETS[us][1];
                    if (SECOND_RANK[us] === rank(from) && !this._board[to]) {
                        addMove(moves, us, from, to, PAWN, undefined, BITS.BIG_PAWN);
                    }
                }
                // pawn captures
                for (let j = 2; j < 4; j++) {
                    to = from + PAWN_OFFSETS[us][j];
                    if (to & 0x88)
                        continue;
                    if (this._board[to]?.color === them) {
                        addMove(moves, us, from, to, PAWN, this._board[to].type, BITS.CAPTURE);
                    }
                    else if (to === this._epSquare) {
                        addMove(moves, us, from, to, PAWN, PAWN, BITS.EP_CAPTURE);
                    }
                }
            }
            else {
                if (forPiece && forPiece !== type)
                    continue;
                for (let j = 0, len = PIECE_OFFSETS[type].length; j < len; j++) {
                    const offset = PIECE_OFFSETS[type][j];
                    to = from;
                    while (true) {
                        to += offset;
                        if (to & 0x88)
                            break;
                        if (!this._board[to]) {
                            addMove(moves, us, from, to, type);
                        }
                        else {
                            // own color, stop loop
                            if (this._board[to].color === us)
                                break;
                            addMove(moves, us, from, to, type, this._board[to].type, BITS.CAPTURE);
                            break;
                        }
                        /* break, if knight or king */
                        if (type === KNIGHT || type === KING)
                            break;
                    }
                }
            }
        }
        /*
         * check for castling if we're:
         *   a) generating all moves, or
         *   b) doing single square move generation on the king's square
         */
        if (forPiece === undefined || forPiece === KING) {
            if (!singleSquare || lastSquare === this._kings[us]) {
                // king-side castling
                if (this._castling[us] & BITS.KSIDE_CASTLE) {
                    const castlingFrom = this._kings[us];
                    const castlingTo = castlingFrom + 2;
                    if (!this._board[castlingFrom + 1] &&
                        !this._board[castlingTo] &&
                        !this._attacked(them, this._kings[us]) &&
                        !this._attacked(them, castlingFrom + 1) &&
                        !this._attacked(them, castlingTo)) {
                        addMove(moves, us, this._kings[us], castlingTo, KING, undefined, BITS.KSIDE_CASTLE);
                    }
                }
                // queen-side castling
                if (this._castling[us] & BITS.QSIDE_CASTLE) {
                    const castlingFrom = this._kings[us];
                    const castlingTo = castlingFrom - 2;
                    if (!this._board[castlingFrom - 1] &&
                        !this._board[castlingFrom - 2] &&
                        !this._board[castlingFrom - 3] &&
                        !this._attacked(them, this._kings[us]) &&
                        !this._attacked(them, castlingFrom - 1) &&
                        !this._attacked(them, castlingTo)) {
                        addMove(moves, us, this._kings[us], castlingTo, KING, undefined, BITS.QSIDE_CASTLE);
                    }
                }
            }
        }
        /*
         * return all pseudo-legal moves (this includes moves that allow the king
         * to be captured)
         */
        if (!legal || this._kings[us] === -1) {
            return moves;
        }
        // filter out illegal moves
        const legalMoves = [];
        for (let i = 0, len = moves.length; i < len; i++) {
            this._makeMove(moves[i]);
            if (!this._isKingAttacked(us)) {
                legalMoves.push(moves[i]);
            }
            this._undoMove();
        }
        return legalMoves;
    }
    move(move, { strict = false } = {}) {
        /*
         * The move function can be called with in the following parameters:
         *
         * .move('Nxb7')       <- argument is a case-sensitive SAN string
         *
         * .move({ from: 'h7', <- argument is a move object
         *         to :'h8',
         *         promotion: 'q' })
         *
         *
         * An optional strict argument may be supplied to tell chess.js to
         * strictly follow the SAN specification.
         */
        let moveObj = null;
        if (typeof move === 'string') {
            moveObj = this._moveFromSan(move, strict);
        }
        else if (typeof move === 'object') {
            const moves = this._moves();
            // convert the pretty move object to an ugly move object
            for (let i = 0, len = moves.length; i < len; i++) {
                if (move.from === algebraic(moves[i].from) &&
                    move.to === algebraic(moves[i].to) &&
                    (!('promotion' in moves[i]) || move.promotion === moves[i].promotion)) {
                    moveObj = moves[i];
                    break;
                }
            }
        }
        // failed to find move
        if (!moveObj) {
            if (typeof move === 'string') {
                throw new Error(`Invalid move: ${move}`);
            }
            else {
                throw new Error(`Invalid move: ${JSON.stringify(move)}`);
            }
        }
        /*
         * need to make a copy of move because we can't generate SAN after the move
         * is made
         */
        const prettyMove = this._makePretty(moveObj);
        this._makeMove(moveObj);
        this._incPositionCount(prettyMove.after);
        return prettyMove;
    }
    _push(move) {
        this._history.push({
            move,
            kings: { b: this._kings.b, w: this._kings.w },
            turn: this._turn,
            castling: { b: this._castling.b, w: this._castling.w },
            epSquare: this._epSquare,
            halfMoves: this._halfMoves,
            moveNumber: this._moveNumber,
        });
    }
    _makeMove(move) {
        const us = this._turn;
        const them = swapColor(us);
        this._push(move);
        this._board[move.to] = this._board[move.from];
        delete this._board[move.from];
        // if ep capture, remove the captured pawn
        if (move.flags & BITS.EP_CAPTURE) {
            if (this._turn === BLACK) {
                delete this._board[move.to - 16];
            }
            else {
                delete this._board[move.to + 16];
            }
        }
        // if pawn promotion, replace with new piece
        if (move.promotion) {
            this._board[move.to] = { type: move.promotion, color: us };
        }
        // if we moved the king
        if (this._board[move.to].type === KING) {
            this._kings[us] = move.to;
            // if we castled, move the rook next to the king
            if (move.flags & BITS.KSIDE_CASTLE) {
                const castlingTo = move.to - 1;
                const castlingFrom = move.to + 1;
                this._board[castlingTo] = this._board[castlingFrom];
                delete this._board[castlingFrom];
            }
            else if (move.flags & BITS.QSIDE_CASTLE) {
                const castlingTo = move.to + 1;
                const castlingFrom = move.to - 2;
                this._board[castlingTo] = this._board[castlingFrom];
                delete this._board[castlingFrom];
            }
            // turn off castling
            this._castling[us] = 0;
        }
        // turn off castling if we move a rook
        if (this._castling[us]) {
            for (let i = 0, len = ROOKS[us].length; i < len; i++) {
                if (move.from === ROOKS[us][i].square &&
                    this._castling[us] & ROOKS[us][i].flag) {
                    this._castling[us] ^= ROOKS[us][i].flag;
                    break;
                }
            }
        }
        // turn off castling if we capture a rook
        if (this._castling[them]) {
            for (let i = 0, len = ROOKS[them].length; i < len; i++) {
                if (move.to === ROOKS[them][i].square &&
                    this._castling[them] & ROOKS[them][i].flag) {
                    this._castling[them] ^= ROOKS[them][i].flag;
                    break;
                }
            }
        }
        // if big pawn move, update the en passant square
        if (move.flags & BITS.BIG_PAWN) {
            if (us === BLACK) {
                this._epSquare = move.to - 16;
            }
            else {
                this._epSquare = move.to + 16;
            }
        }
        else {
            this._epSquare = EMPTY;
        }
        // reset the 50 move counter if a pawn is moved or a piece is captured
        if (move.piece === PAWN) {
            this._halfMoves = 0;
        }
        else if (move.flags & (BITS.CAPTURE | BITS.EP_CAPTURE)) {
            this._halfMoves = 0;
        }
        else {
            this._halfMoves++;
        }
        if (us === BLACK) {
            this._moveNumber++;
        }
        this._turn = them;
    }
    undo() {
        const move = this._undoMove();
        if (move) {
            const prettyMove = this._makePretty(move);
            this._decPositionCount(prettyMove.after);
            return prettyMove;
        }
        return null;
    }
    _undoMove() {
        const old = this._history.pop();
        if (old === undefined) {
            return null;
        }
        const move = old.move;
        this._kings = old.kings;
        this._turn = old.turn;
        this._castling = old.castling;
        this._epSquare = old.epSquare;
        this._halfMoves = old.halfMoves;
        this._moveNumber = old.moveNumber;
        const us = this._turn;
        const them = swapColor(us);
        this._board[move.from] = this._board[move.to];
        this._board[move.from].type = move.piece; // to undo any promotions
        delete this._board[move.to];
        if (move.captured) {
            if (move.flags & BITS.EP_CAPTURE) {
                // en passant capture
                let index;
                if (us === BLACK) {
                    index = move.to - 16;
                }
                else {
                    index = move.to + 16;
                }
                this._board[index] = { type: PAWN, color: them };
            }
            else {
                // regular capture
                this._board[move.to] = { type: move.captured, color: them };
            }
        }
        if (move.flags & (BITS.KSIDE_CASTLE | BITS.QSIDE_CASTLE)) {
            let castlingTo, castlingFrom;
            if (move.flags & BITS.KSIDE_CASTLE) {
                castlingTo = move.to + 1;
                castlingFrom = move.to - 1;
            }
            else {
                castlingTo = move.to - 2;
                castlingFrom = move.to + 1;
            }
            this._board[castlingTo] = this._board[castlingFrom];
            delete this._board[castlingFrom];
        }
        return move;
    }
    pgn({ newline = '\n', maxWidth = 0, } = {}) {
        /*
         * using the specification from http://www.chessclub.com/help/PGN-spec
         * example for html usage: .pgn({ max_width: 72, newline_char: "<br />" })
         */
        const result = [];
        let headerExists = false;
        /* add the PGN header information */
        for (const i in this._header) {
            /*
             * TODO: order of enumerated properties in header object is not
             * guaranteed, see ECMA-262 spec (section 12.6.4)
             */
            result.push('[' + i + ' "' + this._header[i] + '"]' + newline);
            headerExists = true;
        }
        if (headerExists && this._history.length) {
            result.push(newline);
        }
        const appendComment = (moveString) => {
            const comment = this._comments[this.fen()];
            if (typeof comment !== 'undefined') {
                const delimiter = moveString.length > 0 ? ' ' : '';
                moveString = `${moveString}${delimiter}{${comment}}`;
            }
            return moveString;
        };
        // pop all of history onto reversed_history
        const reversedHistory = [];
        while (this._history.length > 0) {
            reversedHistory.push(this._undoMove());
        }
        const moves = [];
        let moveString = '';
        // special case of a commented starting position with no moves
        if (reversedHistory.length === 0) {
            moves.push(appendComment(''));
        }
        // build the list of moves.  a move_string looks like: "3. e3 e6"
        while (reversedHistory.length > 0) {
            moveString = appendComment(moveString);
            const move = reversedHistory.pop();
            // make TypeScript stop complaining about move being undefined
            if (!move) {
                break;
            }
            // if the position started with black to move, start PGN with #. ...
            if (!this._history.length && move.color === 'b') {
                const prefix = `${this._moveNumber}. ...`;
                // is there a comment preceding the first move?
                moveString = moveString ? `${moveString} ${prefix}` : prefix;
            }
            else if (move.color === 'w') {
                // store the previous generated move_string if we have one
                if (moveString.length) {
                    moves.push(moveString);
                }
                moveString = this._moveNumber + '.';
            }
            moveString =
                moveString + ' ' + this._moveToSan(move, this._moves({ legal: true }));
            this._makeMove(move);
        }
        // are there any other leftover moves?
        if (moveString.length) {
            moves.push(appendComment(moveString));
        }
        // is there a result?
        if (typeof this._header.Result !== 'undefined') {
            moves.push(this._header.Result);
        }
        /*
         * history should be back to what it was before we started generating PGN,
         * so join together moves
         */
        if (maxWidth === 0) {
            return result.join('') + moves.join(' ');
        }
        // TODO (jah): huh?
        const strip = function () {
            if (result.length > 0 && result[result.length - 1] === ' ') {
                result.pop();
                return true;
            }
            return false;
        };
        // NB: this does not preserve comment whitespace.
        const wrapComment = function (width, move) {
            for (const token of move.split(' ')) {
                if (!token) {
                    continue;
                }
                if (width + token.length > maxWidth) {
                    while (strip()) {
                        width--;
                    }
                    result.push(newline);
                    width = 0;
                }
                result.push(token);
                width += token.length;
                result.push(' ');
                width++;
            }
            if (strip()) {
                width--;
            }
            return width;
        };
        // wrap the PGN output at max_width
        let currentWidth = 0;
        for (let i = 0; i < moves.length; i++) {
            if (currentWidth + moves[i].length > maxWidth) {
                if (moves[i].includes('{')) {
                    currentWidth = wrapComment(currentWidth, moves[i]);
                    continue;
                }
            }
            // if the current move will push past max_width
            if (currentWidth + moves[i].length > maxWidth && i !== 0) {
                // don't end the line with whitespace
                if (result[result.length - 1] === ' ') {
                    result.pop();
                }
                result.push(newline);
                currentWidth = 0;
            }
            else if (i !== 0) {
                result.push(' ');
                currentWidth++;
            }
            result.push(moves[i]);
            currentWidth += moves[i].length;
        }
        return result.join('');
    }
    header(...args) {
        for (let i = 0; i < args.length; i += 2) {
            if (typeof args[i] === 'string' && typeof args[i + 1] === 'string') {
                this._header[args[i]] = args[i + 1];
            }
        }
        return this._header;
    }
    loadPgn(pgn, { strict = false, newlineChar = '\r?\n', } = {}) {
        function mask(str) {
            return str.replace(/\\/g, '\\');
        }
        function parsePgnHeader(header) {
            const headerObj = {};
            const headers = header.split(new RegExp(mask(newlineChar)));
            let key = '';
            let value = '';
            for (let i = 0; i < headers.length; i++) {
                const regex = /^\s*\[\s*([A-Za-z]+)\s*"(.*)"\s*\]\s*$/;
                key = headers[i].replace(regex, '$1');
                value = headers[i].replace(regex, '$2');
                if (key.trim().length > 0) {
                    headerObj[key] = value;
                }
            }
            return headerObj;
        }
        // strip whitespace from head/tail of PGN block
        pgn = pgn.trim();
        /*
         * RegExp to split header. Takes advantage of the fact that header and movetext
         * will always have a blank line between them (ie, two newline_char's). Handles
         * case where movetext is empty by matching newlineChar until end of string is
         * matched - effectively trimming from the end extra newlineChar.
         *
         * With default newline_char, will equal:
         * /^(\[((?:\r?\n)|.)*\])((?:\s*\r?\n){2}|(?:\s*\r?\n)*$)/
         */
        const headerRegex = new RegExp('^(\\[((?:' +
            mask(newlineChar) +
            ')|.)*\\])' +
            '((?:\\s*' +
            mask(newlineChar) +
            '){2}|(?:\\s*' +
            mask(newlineChar) +
            ')*$)');
        // If no header given, begin with moves.
        const headerRegexResults = headerRegex.exec(pgn);
        const headerString = headerRegexResults
            ? headerRegexResults.length >= 2
                ? headerRegexResults[1]
                : ''
            : '';
        // Put the board in the starting position
        this.reset();
        // parse PGN header
        const headers = parsePgnHeader(headerString);
        let fen = '';
        for (const key in headers) {
            // check to see user is including fen (possibly with wrong tag case)
            if (key.toLowerCase() === 'fen') {
                fen = headers[key];
            }
            this.header(key, headers[key]);
        }
        /*
         * the permissive parser should attempt to load a fen tag, even if it's the
         * wrong case and doesn't include a corresponding [SetUp "1"] tag
         */
        if (!strict) {
            if (fen) {
                this.load(fen, { preserveHeaders: true });
            }
        }
        else {
            /*
             * strict parser - load the starting position indicated by [Setup '1']
             * and [FEN position]
             */
            if (headers['SetUp'] === '1') {
                if (!('FEN' in headers)) {
                    throw new Error('Invalid PGN: FEN tag must be supplied with SetUp tag');
                }
                // don't clear the headers when loading
                this.load(headers['FEN'], { preserveHeaders: true });
            }
        }
        /*
         * NB: the regexes below that delete move numbers, recursive annotations,
         * and numeric annotation glyphs may also match text in comments. To
         * prevent this, we transform comments by hex-encoding them in place and
         * decoding them again after the other tokens have been deleted.
         *
         * While the spec states that PGN files should be ASCII encoded, we use
         * {en,de}codeURIComponent here to support arbitrary UTF8 as a convenience
         * for modern users
         */
        function toHex(s) {
            return Array.from(s)
                .map(function (c) {
                /*
                 * encodeURI doesn't transform most ASCII characters, so we handle
                 * these ourselves
                 */
                return c.charCodeAt(0) < 128
                    ? c.charCodeAt(0).toString(16)
                    : encodeURIComponent(c).replace(/%/g, '').toLowerCase();
            })
                .join('');
        }
        function fromHex(s) {
            return s.length == 0
                ? ''
                : decodeURIComponent('%' + (s.match(/.{1,2}/g) || []).join('%'));
        }
        const encodeComment = function (s) {
            s = s.replace(new RegExp(mask(newlineChar), 'g'), ' ');
            return `{${toHex(s.slice(1, s.length - 1))}}`;
        };
        const decodeComment = function (s) {
            if (s.startsWith('{') && s.endsWith('}')) {
                return fromHex(s.slice(1, s.length - 1));
            }
        };
        // delete header to get the moves
        let ms = pgn
            .replace(headerString, '')
            .replace(
        // encode comments so they don't get deleted below
        new RegExp(`({[^}]*})+?|;([^${mask(newlineChar)}]*)`, 'g'), function (_match, bracket, semicolon) {
            return bracket !== undefined
                ? encodeComment(bracket)
                : ' ' + encodeComment(`{${semicolon.slice(1)}}`);
        })
            .replace(new RegExp(mask(newlineChar), 'g'), ' ');
        // delete recursive annotation variations
        const ravRegex = /(\([^()]+\))+?/g;
        while (ravRegex.test(ms)) {
            ms = ms.replace(ravRegex, '');
        }
        // delete move numbers
        ms = ms.replace(/\d+\.(\.\.)?/g, '');
        // delete ... indicating black to move
        ms = ms.replace(/\.\.\./g, '');
        /* delete numeric annotation glyphs */
        ms = ms.replace(/\$\d+/g, '');
        // trim and get array of moves
        let moves = ms.trim().split(new RegExp(/\s+/));
        // delete empty entries
        moves = moves.filter((move) => move !== '');
        let result = '';
        for (let halfMove = 0; halfMove < moves.length; halfMove++) {
            const comment = decodeComment(moves[halfMove]);
            if (comment !== undefined) {
                this._comments[this.fen()] = comment;
                continue;
            }
            const move = this._moveFromSan(moves[halfMove], strict);
            // invalid move
            if (move == null) {
                // was the move an end of game marker
                if (TERMINATION_MARKERS.indexOf(moves[halfMove]) > -1) {
                    result = moves[halfMove];
                }
                else {
                    throw new Error(`Invalid move in PGN: ${moves[halfMove]}`);
                }
            }
            else {
                // reset the end of game marker if making a valid move
                result = '';
                this._makeMove(move);
                this._incPositionCount(this.fen());
            }
        }
        /*
         * Per section 8.2.6 of the PGN spec, the Result tag pair must match match
         * the termination marker. Only do this when headers are present, but the
         * result tag is missing
         */
        if (result && Object.keys(this._header).length && !this._header['Result']) {
            this.header('Result', result);
        }
    }
    /*
     * Convert a move from 0x88 coordinates to Standard Algebraic Notation
     * (SAN)
     *
     * @param {boolean} strict Use the strict SAN parser. It will throw errors
     * on overly disambiguated moves (see below):
     *
     * r1bqkbnr/ppp2ppp/2n5/1B1pP3/4P3/8/PPPP2PP/RNBQK1NR b KQkq - 2 4
     * 4. ... Nge7 is overly disambiguated because the knight on c6 is pinned
     * 4. ... Ne7 is technically the valid SAN
     */
    _moveToSan(move, moves) {
        let output = '';
        if (move.flags & BITS.KSIDE_CASTLE) {
            output = 'O-O';
        }
        else if (move.flags & BITS.QSIDE_CASTLE) {
            output = 'O-O-O';
        }
        else {
            if (move.piece !== PAWN) {
                const disambiguator = getDisambiguator(move, moves);
                output += move.piece.toUpperCase() + disambiguator;
            }
            if (move.flags & (BITS.CAPTURE | BITS.EP_CAPTURE)) {
                if (move.piece === PAWN) {
                    output += algebraic(move.from)[0];
                }
                output += 'x';
            }
            output += algebraic(move.to);
            if (move.promotion) {
                output += '=' + move.promotion.toUpperCase();
            }
        }
        this._makeMove(move);
        if (this.isCheck()) {
            if (this.isCheckmate()) {
                output += '#';
            }
            else {
                output += '+';
            }
        }
        this._undoMove();
        return output;
    }
    // convert a move from Standard Algebraic Notation (SAN) to 0x88 coordinates
    _moveFromSan(move, strict = false) {
        // strip off any move decorations: e.g Nf3+?! becomes Nf3
        const cleanMove = strippedSan(move);
        let pieceType = inferPieceType(cleanMove);
        let moves = this._moves({ legal: true, piece: pieceType });
        // strict parser
        for (let i = 0, len = moves.length; i < len; i++) {
            if (cleanMove === strippedSan(this._moveToSan(moves[i], moves))) {
                return moves[i];
            }
        }
        // the strict parser failed
        if (strict) {
            return null;
        }
        let piece = undefined;
        let matches = undefined;
        let from = undefined;
        let to = undefined;
        let promotion = undefined;
        /*
         * The default permissive (non-strict) parser allows the user to parse
         * non-standard chess notations. This parser is only run after the strict
         * Standard Algebraic Notation (SAN) parser has failed.
         *
         * When running the permissive parser, we'll run a regex to grab the piece, the
         * to/from square, and an optional promotion piece. This regex will
         * parse common non-standard notation like: Pe2-e4, Rc1c4, Qf3xf7,
         * f7f8q, b1c3
         *
         * NOTE: Some positions and moves may be ambiguous when using the permissive
         * parser. For example, in this position: 6k1/8/8/B7/8/8/8/BN4K1 w - - 0 1,
         * the move b1c3 may be interpreted as Nc3 or B1c3 (a disambiguated bishop
         * move). In these cases, the permissive parser will default to the most
         * basic interpretation (which is b1c3 parsing to Nc3).
         */
        let overlyDisambiguated = false;
        matches = cleanMove.match(/([pnbrqkPNBRQK])?([a-h][1-8])x?-?([a-h][1-8])([qrbnQRBN])?/);
        if (matches) {
            piece = matches[1];
            from = matches[2];
            to = matches[3];
            promotion = matches[4];
            if (from.length == 1) {
                overlyDisambiguated = true;
            }
        }
        else {
            /*
             * The [a-h]?[1-8]? portion of the regex below handles moves that may be
             * overly disambiguated (e.g. Nge7 is unnecessary and non-standard when
             * there is one legal knight move to e7). In this case, the value of
             * 'from' variable will be a rank or file, not a square.
             */
            matches = cleanMove.match(/([pnbrqkPNBRQK])?([a-h]?[1-8]?)x?-?([a-h][1-8])([qrbnQRBN])?/);
            if (matches) {
                piece = matches[1];
                from = matches[2];
                to = matches[3];
                promotion = matches[4];
                if (from.length == 1) {
                    overlyDisambiguated = true;
                }
            }
        }
        pieceType = inferPieceType(cleanMove);
        moves = this._moves({
            legal: true,
            piece: piece ? piece : pieceType,
        });
        if (!to) {
            return null;
        }
        for (let i = 0, len = moves.length; i < len; i++) {
            if (!from) {
                // if there is no from square, it could be just 'x' missing from a capture
                if (cleanMove ===
                    strippedSan(this._moveToSan(moves[i], moves)).replace('x', '')) {
                    return moves[i];
                }
                // hand-compare move properties with the results from our permissive regex
            }
            else if ((!piece || piece.toLowerCase() == moves[i].piece) &&
                Ox88[from] == moves[i].from &&
                Ox88[to] == moves[i].to &&
                (!promotion || promotion.toLowerCase() == moves[i].promotion)) {
                return moves[i];
            }
            else if (overlyDisambiguated) {
                /*
                 * SPECIAL CASE: we parsed a move string that may have an unneeded
                 * rank/file disambiguator (e.g. Nge7).  The 'from' variable will
                 */
                const square = algebraic(moves[i].from);
                if ((!piece || piece.toLowerCase() == moves[i].piece) &&
                    Ox88[to] == moves[i].to &&
                    (from == square[0] || from == square[1]) &&
                    (!promotion || promotion.toLowerCase() == moves[i].promotion)) {
                    return moves[i];
                }
            }
        }
        return null;
    }
    ascii() {
        let s = '   +------------------------+\n';
        for (let i = Ox88.a8; i <= Ox88.h1; i++) {
            // display the rank
            if (file$e(i) === 0) {
                s += ' ' + '87654321'[rank(i)] + ' |';
            }
            if (this._board[i]) {
                const piece = this._board[i].type;
                const color = this._board[i].color;
                const symbol = color === WHITE ? piece.toUpperCase() : piece.toLowerCase();
                s += ' ' + symbol + ' ';
            }
            else {
                s += ' . ';
            }
            if ((i + 1) & 0x88) {
                s += '|\n';
                i += 8;
            }
        }
        s += '   +------------------------+\n';
        s += '     a  b  c  d  e  f  g  h';
        return s;
    }
    perft(depth) {
        const moves = this._moves({ legal: false });
        let nodes = 0;
        const color = this._turn;
        for (let i = 0, len = moves.length; i < len; i++) {
            this._makeMove(moves[i]);
            if (!this._isKingAttacked(color)) {
                if (depth - 1 > 0) {
                    nodes += this.perft(depth - 1);
                }
                else {
                    nodes++;
                }
            }
            this._undoMove();
        }
        return nodes;
    }
    // pretty = external move object
    _makePretty(uglyMove) {
        const { color, piece, from, to, flags, captured, promotion } = uglyMove;
        let prettyFlags = '';
        for (const flag in BITS) {
            if (BITS[flag] & flags) {
                prettyFlags += FLAGS[flag];
            }
        }
        const fromAlgebraic = algebraic(from);
        const toAlgebraic = algebraic(to);
        const move = {
            color,
            piece,
            from: fromAlgebraic,
            to: toAlgebraic,
            san: this._moveToSan(uglyMove, this._moves({ legal: true })),
            flags: prettyFlags,
            lan: fromAlgebraic + toAlgebraic,
            before: this.fen(),
            after: '',
        };
        // generate the FEN for the 'after' key
        this._makeMove(uglyMove);
        move.after = this.fen();
        this._undoMove();
        if (captured) {
            move.captured = captured;
        }
        if (promotion) {
            move.promotion = promotion;
            move.lan += promotion;
        }
        return move;
    }
    turn() {
        return this._turn;
    }
    board() {
        const output = [];
        let row = [];
        for (let i = Ox88.a8; i <= Ox88.h1; i++) {
            if (this._board[i] == null) {
                row.push(null);
            }
            else {
                row.push({
                    square: algebraic(i),
                    type: this._board[i].type,
                    color: this._board[i].color,
                });
            }
            if ((i + 1) & 0x88) {
                output.push(row);
                row = [];
                i += 8;
            }
        }
        return output;
    }
    squareColor(square) {
        if (square in Ox88) {
            const sq = Ox88[square];
            return (rank(sq) + file$e(sq)) % 2 === 0 ? 'light' : 'dark';
        }
        return null;
    }
    history({ verbose = false } = {}) {
        const reversedHistory = [];
        const moveHistory = [];
        while (this._history.length > 0) {
            reversedHistory.push(this._undoMove());
        }
        while (true) {
            const move = reversedHistory.pop();
            if (!move) {
                break;
            }
            if (verbose) {
                moveHistory.push(this._makePretty(move));
            }
            else {
                moveHistory.push(this._moveToSan(move, this._moves()));
            }
            this._makeMove(move);
        }
        return moveHistory;
    }
    /*
     * Keeps track of position occurrence counts for the purpose of repetition
     * checking. All three methods (`_inc`, `_dec`, and `_get`) trim the
     * irrelevent information from the fen, initialising new positions, and
     * removing old positions from the record if their counts are reduced to 0.
     */
    _getPositionCount(fen) {
        const trimmedFen = trimFen(fen);
        return this._positionCount[trimmedFen] || 0;
    }
    _incPositionCount(fen) {
        const trimmedFen = trimFen(fen);
        if (this._positionCount[trimmedFen] === undefined) {
            this._positionCount[trimmedFen] = 0;
        }
        this._positionCount[trimmedFen] += 1;
    }
    _decPositionCount(fen) {
        const trimmedFen = trimFen(fen);
        if (this._positionCount[trimmedFen] === 1) {
            delete this._positionCount[trimmedFen];
        }
        else {
            this._positionCount[trimmedFen] -= 1;
        }
    }
    _pruneComments() {
        const reversedHistory = [];
        const currentComments = {};
        const copyComment = (fen) => {
            if (fen in this._comments) {
                currentComments[fen] = this._comments[fen];
            }
        };
        while (this._history.length > 0) {
            reversedHistory.push(this._undoMove());
        }
        copyComment(this.fen());
        while (true) {
            const move = reversedHistory.pop();
            if (!move) {
                break;
            }
            this._makeMove(move);
            copyComment(this.fen());
        }
        this._comments = currentComments;
    }
    getComment() {
        return this._comments[this.fen()];
    }
    setComment(comment) {
        this._comments[this.fen()] = comment.replace('{', '[').replace('}', ']');
    }
    deleteComment() {
        const comment = this._comments[this.fen()];
        delete this._comments[this.fen()];
        return comment;
    }
    getComments() {
        this._pruneComments();
        return Object.keys(this._comments).map((fen) => {
            return { fen: fen, comment: this._comments[fen] };
        });
    }
    deleteComments() {
        this._pruneComments();
        return Object.keys(this._comments).map((fen) => {
            const comment = this._comments[fen];
            delete this._comments[fen];
            return { fen: fen, comment: comment };
        });
    }
    setCastlingRights(color, rights) {
        for (const side of [KING, QUEEN]) {
            if (rights[side] !== undefined) {
                if (rights[side]) {
                    this._castling[color] |= SIDES[side];
                }
                else {
                    this._castling[color] &= ~SIDES[side];
                }
            }
        }
        this._updateCastlingRights();
        const result = this.getCastlingRights(color);
        return ((rights[KING] === undefined || rights[KING] === result[KING]) &&
            (rights[QUEEN] === undefined || rights[QUEEN] === result[QUEEN]));
    }
    getCastlingRights(color) {
        return {
            [KING]: (this._castling[color] & SIDES[KING]) !== 0,
            [QUEEN]: (this._castling[color] & SIDES[QUEEN]) !== 0,
        };
    }
    moveNumber() {
        return this._moveNumber;
    }
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
const file$d = "svelte/components/Chessboard.svelte";

function add_css$6(target) {
	append_styles(target, "svelte-1hrnnj7", ".board-wrapper.svelte-1hrnnj7{position:relative;width:100%}.centered-content.svelte-1hrnnj7{position:absolute;top:50%;left:50%;transform:translate(-50%, -50%);z-index:3;opacity:0.8}\n/*# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQ2hlc3Nib2FyZC5zdmVsdGUiLCJzb3VyY2VzIjpbIkNoZXNzYm9hcmQuc3ZlbHRlIl0sInNvdXJjZXNDb250ZW50IjpbIjxzY3JpcHQ+XG4gIGltcG9ydCB7IG9uTW91bnQgfSBmcm9tIFwic3ZlbHRlXCI7XG4gIGltcG9ydCB7IENoZXNzZ3JvdW5kIH0gZnJvbSBcImNoZXNzZ3JvdW5kXCI7XG4gIGltcG9ydCB7IENoZXNzIH0gZnJvbSBcImNoZXNzLmpzXCI7XG4gIGltcG9ydCB7IHBpZWNlU2V0IH0gZnJvbSBcIi4uL3N0b3Jlc1wiO1xuICBpbXBvcnQgeyBjcmVhdGVFdmVudERpc3BhdGNoZXIgfSBmcm9tIFwic3ZlbHRlXCI7XG5cbiAgbGV0IGJvYXJkQ29udGFpbmVyO1xuICBleHBvcnQgbGV0IGNoZXNzZ3JvdW5kQ29uZmlnID0ge307XG4gIGV4cG9ydCBsZXQgb3JpZW50YXRpb24gPSBcIndoaXRlXCI7XG5cbiAgZXhwb3J0IGxldCBmZW47XG4gIGV4cG9ydCBsZXQgbGFzdE1vdmUgPSBudWxsO1xuICBleHBvcnQgbGV0IGNoZXNzZ3JvdW5kO1xuICBleHBvcnQgbGV0IHNpemU7XG5cbiAgbGV0IGNoZXNzSW5zdGFuY2UgPSBuZXcgQ2hlc3MoKTtcbiAgZXhwb3J0IGxldCBwaWVjZVNldE92ZXJyaWRlID0gbnVsbDtcbiAgZXhwb3J0IGxldCBib2FyZFN0eWxlT3ZlcnJpZGUgPSBudWxsO1xuXG4gIGNvbnN0IGRpc3BhdGNoID0gY3JlYXRlRXZlbnREaXNwYXRjaGVyKCk7XG5cbiAgbGV0IG1heFdpZHRoID0gXCI3MHZoXCI7XG5cbiAgJDoge1xuICAgIGlmIChvcmllbnRhdGlvbiAmJiBjaGVzc2dyb3VuZCkge1xuICAgICAgY2hlc3Nncm91bmQuc2V0KHsgb3JpZW50YXRpb246IG9yaWVudGF0aW9uIH0pO1xuICAgIH1cbiAgfVxuXG4gICQ6IHtcbiAgICBpZiAoZmVuICYmIGNoZXNzZ3JvdW5kKSB7XG4gICAgICBpZiAobGFzdE1vdmUpIHtcbiAgICAgICAgY2hlc3NJbnN0YW5jZS5sb2FkKGxhc3RNb3ZlLmJlZm9yZSk7XG4gICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgIG1vdmUobGFzdE1vdmUuc2FuKTtcbiAgICAgICAgICBjaGVzc2dyb3VuZC5zZXQoeyBsYXN0TW92ZTogW2xhc3RNb3ZlLmZyb20sIGxhc3RNb3ZlLnRvXSB9KTtcbiAgICAgICAgfSwgNTAwKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNoZXNzSW5zdGFuY2UubG9hZChmZW4pO1xuICAgICAgfVxuICAgICAgdXBkYXRlQ2hlc3Nncm91bmQoKTtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBnZXRMZWdhbE1vdmVzKCkge1xuICAgIGNvbnN0IG1vdmVzID0gY2hlc3NJbnN0YW5jZS5tb3Zlcyh7IHZlcmJvc2U6IHRydWUgfSk7XG4gICAgY29uc3QgZGVzdHMgPSBuZXcgTWFwKCk7XG4gICAgbW92ZXMuZm9yRWFjaCgobW92ZSkgPT4ge1xuICAgICAgaWYgKCFkZXN0cy5oYXMobW92ZS5mcm9tKSkgZGVzdHMuc2V0KG1vdmUuZnJvbSwgW10pO1xuICAgICAgZGVzdHMuZ2V0KG1vdmUuZnJvbSkucHVzaChtb3ZlLnRvKTtcbiAgICB9KTtcbiAgICByZXR1cm4gZGVzdHM7XG4gIH1cblxuICBmdW5jdGlvbiB1cGRhdGVDaGVzc2dyb3VuZCgpIHtcbiAgICBjb25zdCBsZWdhbE1vdmVzID0gZ2V0TGVnYWxNb3ZlcygpO1xuICAgIGNvbnN0IGhpc3RvcnkgPSBjaGVzc0luc3RhbmNlLmhpc3RvcnkoeyB2ZXJib3NlOiB0cnVlIH0pO1xuICAgIGxldCBsYXN0TW92ZSA9IG51bGw7XG4gICAgaWYgKGhpc3RvcnkgJiYgaGlzdG9yeVtoaXN0b3J5Lmxlbmd0aCAtIDFdKSB7XG4gICAgICBsYXN0TW92ZSA9IGhpc3RvcnlbaGlzdG9yeS5sZW5ndGggLSAxXTtcbiAgICB9XG4gICAgY2hlc3Nncm91bmQuc2V0KHtcbiAgICAgIGNoZWNrOiBjaGVzc0luc3RhbmNlLmluQ2hlY2soKSxcbiAgICAgIGZlbjogY2hlc3NJbnN0YW5jZS5mZW4oKSxcbiAgICAgIGxhc3RNb3ZlOiBsYXN0TW92ZSA/IFtsYXN0TW92ZS5mcm9tLCBsYXN0TW92ZS50b10gOiBudWxsLFxuICAgICAgdHVybkNvbG9yOiBjaGVzc0luc3RhbmNlLnR1cm4oKSA9PT0gXCJ3XCIgPyBcIndoaXRlXCIgOiBcImJsYWNrXCIsXG4gICAgICBtb3ZhYmxlOiB7XG4gICAgICAgIGZyZWU6IGZhbHNlLFxuICAgICAgICBkZXN0czogbGVnYWxNb3ZlcyxcbiAgICAgIH0sXG4gICAgfSk7XG4gIH1cblxuICBmdW5jdGlvbiBoYW5kbGVNb3ZlKGZyb20sIHRvKSB7XG4gICAgY29uc3QgaXNQcm9tb3Rpb24gPSAoZnJvbSwgdG8pID0+IHtcbiAgICAgIGNvbnN0IGZyb21SYW5rID0gZnJvbVsxXTtcbiAgICAgIGNvbnN0IHRvUmFuayA9IHRvWzFdO1xuICAgICAgY29uc3QgcGllY2UgPSBjaGVzc0luc3RhbmNlLmdldChmcm9tKS50eXBlO1xuICAgICAgcmV0dXJuIChcbiAgICAgICAgcGllY2UgPT09IFwicFwiICYmXG4gICAgICAgICgoZnJvbVJhbmsgPT09IFwiN1wiICYmIHRvUmFuayA9PT0gXCI4XCIpIHx8XG4gICAgICAgICAgKGZyb21SYW5rID09PSBcIjJcIiAmJiB0b1JhbmsgPT09IFwiMVwiKSlcbiAgICAgICk7XG4gICAgfTtcblxuICAgIGxldCBwcm9tb3Rpb24gPSBcInFcIjsgLy8gRGVmYXVsdCB0byBxdWVlblxuXG4gICAgaWYgKGlzUHJvbW90aW9uKGZyb20sIHRvKSkge1xuICAgICAgY29uc3QgY2hvaWNlID0gcHJvbXB0KFwiUHJvbW90ZSBwYXduIHRvIChxLCByLCBiLCBuKTpcIiwgXCJxXCIpO1xuICAgICAgaWYgKFtcInFcIiwgXCJyXCIsIFwiYlwiLCBcIm5cIl0uaW5jbHVkZXMoY2hvaWNlKSkge1xuICAgICAgICBwcm9tb3Rpb24gPSBjaG9pY2U7XG4gICAgICB9XG4gICAgfVxuXG4gICAgY29uc3QgbW92ZSA9IGNoZXNzSW5zdGFuY2UubW92ZSh7IGZyb20sIHRvLCBwcm9tb3Rpb24gfSk7XG4gICAgaWYgKG1vdmUpIHtcbiAgICAgIHVwZGF0ZUNoZXNzZ3JvdW5kKCk7XG4gICAgICBkaXNwYXRjaChcIm1vdmVcIiwgeyBtb3ZlLCBpc0NoZWNrbWF0ZTogY2hlc3NJbnN0YW5jZS5pc0NoZWNrbWF0ZSgpIH0pO1xuICAgIH1cbiAgfVxuXG4gIGV4cG9ydCBmdW5jdGlvbiB1bmRvKCkge1xuICAgIGNoZXNzSW5zdGFuY2UudW5kbygpO1xuICAgIHVwZGF0ZUNoZXNzZ3JvdW5kKCk7XG4gIH1cblxuICBleHBvcnQgZnVuY3Rpb24gcmVzZXQoKSB7XG4gICAgY2hlc3NJbnN0YW5jZS5yZXNldCgpO1xuICAgIHVwZGF0ZUNoZXNzZ3JvdW5kKCk7XG4gIH1cblxuICBleHBvcnQgZnVuY3Rpb24gY2xlYXIoKSB7XG4gICAgY2hlc3NJbnN0YW5jZS5jbGVhcigpO1xuICAgIHVwZGF0ZUNoZXNzZ3JvdW5kKCk7XG4gIH1cblxuICBleHBvcnQgZnVuY3Rpb24gbW92ZShtb3ZlKSB7XG4gICAgY2hlc3NJbnN0YW5jZS5tb3ZlKG1vdmUpO1xuICAgIHVwZGF0ZUNoZXNzZ3JvdW5kKCk7XG4gIH1cblxuICBvbk1vdW50KCgpID0+IHtcbiAgICBjaGVzc2dyb3VuZCA9IENoZXNzZ3JvdW5kKGJvYXJkQ29udGFpbmVyLCB7XG4gICAgICAuLi5jaGVzc2dyb3VuZENvbmZpZyxcbiAgICAgIGZlbjogY2hlc3NJbnN0YW5jZS5mZW4oKSxcbiAgICAgIG1vdmFibGU6IHtcbiAgICAgICAgZXZlbnRzOiB7XG4gICAgICAgICAgYWZ0ZXI6IGhhbmRsZU1vdmUsXG4gICAgICAgIH0sXG4gICAgICB9LFxuICAgIH0pO1xuICB9KTtcbjwvc2NyaXB0PlxuXG57I2lmIHBpZWNlU2V0T3ZlcnJpZGV9XG4gIDxsaW5rXG4gICAgaWQ9XCJwaWVjZS1zcHJpdGVcIlxuICAgIGhyZWY9XCIvcGllY2UtY3NzL3twaWVjZVNldE92ZXJyaWRlfS5jc3NcIlxuICAgIHJlbD1cInN0eWxlc2hlZXRcIlxuICAvPlxuezplbHNlfVxuICA8bGluayBpZD1cInBpZWNlLXNwcml0ZVwiIGhyZWY9XCIvcGllY2UtY3NzL3skcGllY2VTZXR9LmNzc1wiIHJlbD1cInN0eWxlc2hlZXRcIiAvPlxuey9pZn1cblxuPGRpdlxuICBjbGFzcz1cImJvYXJkLXdyYXBwZXJcIlxuICBzdHlsZT1cIm1heC13aWR0aDoge21heFdpZHRofVwiXG4gIGJpbmQ6Y2xpZW50V2lkdGg9e3NpemV9XG4+XG4gIDxkaXYgY2xhc3M9XCJjZW50ZXJlZC1jb250ZW50XCI+XG4gICAgPHNsb3QgbmFtZT1cImNlbnRlcmVkLWNvbnRlbnRcIj48L3Nsb3Q+XG4gIDwvZGl2PlxuICA8ZGl2XG4gICAgY2xhc3M9XCJpczJkIHtib2FyZFN0eWxlT3ZlcnJpZGUgPyBib2FyZFN0eWxlT3ZlcnJpZGUgOiAnJ31cIlxuICAgIGJpbmQ6dGhpcz17Ym9hcmRDb250YWluZXJ9XG4gICAgc3R5bGU9XCJwb3NpdGlvbjogcmVsYXRpdmU7d2lkdGg6IHtzaXplfXB4OyBoZWlnaHQ6IHtzaXplfXB4XCJcbiAgPjwvZGl2PlxuICA8ZGl2IGNsYXNzPVwiYmxvY2sgbXQtMlwiPlxuICAgIDxzbG90IG5hbWU9XCJiZWxvdy1ib2FyZFwiPjwvc2xvdD5cbiAgPC9kaXY+XG48L2Rpdj5cblxuPHN0eWxlPlxuICAuYm9hcmQtd3JhcHBlciB7XG4gICAgcG9zaXRpb246IHJlbGF0aXZlO1xuICAgIHdpZHRoOiAxMDAlO1xuICB9XG5cbiAgLmNlbnRlcmVkLWNvbnRlbnQge1xuICAgIHBvc2l0aW9uOiBhYnNvbHV0ZTtcbiAgICB0b3A6IDUwJTtcbiAgICBsZWZ0OiA1MCU7XG4gICAgdHJhbnNmb3JtOiB0cmFuc2xhdGUoLTUwJSwgLTUwJSk7XG4gICAgei1pbmRleDogMzsgLyogcmVxdWlyZWQgdG8gYXBwZWFyIGluIGZyb250IG9mIHBpZWNlcyAqL1xuICAgIG9wYWNpdHk6IDAuODtcbiAgfVxuPC9zdHlsZT5cbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFvS0UsNkJBQWUsQ0FDYixRQUFRLENBQUUsUUFBUSxDQUNsQixLQUFLLENBQUUsSUFDVCxDQUVBLGdDQUFrQixDQUNoQixRQUFRLENBQUUsUUFBUSxDQUNsQixHQUFHLENBQUUsR0FBRyxDQUNSLElBQUksQ0FBRSxHQUFHLENBQ1QsU0FBUyxDQUFFLFVBQVUsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQ2hDLE9BQU8sQ0FBRSxDQUFDLENBQ1YsT0FBTyxDQUFFLEdBQ1gifQ== */");
}

const get_below_board_slot_changes = dirty => ({});
const get_below_board_slot_context = ctx => ({});
const get_centered_content_slot_changes = dirty => ({});
const get_centered_content_slot_context = ctx => ({});

// (142:0) {:else}
function create_else_block$4(ctx) {
	let link;
	let link_href_value;

	const block = {
		c: function create() {
			link = element("link");
			attr_dev(link, "id", "piece-sprite");
			attr_dev(link, "href", link_href_value = "/piece-css/" + /*$pieceSet*/ ctx[4] + ".css");
			attr_dev(link, "rel", "stylesheet");
			add_location(link, file$d, 142, 2, 3377);
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
		id: create_else_block$4.name,
		type: "else",
		source: "(142:0) {:else}",
		ctx
	});

	return block;
}

// (136:0) {#if pieceSetOverride}
function create_if_block$7(ctx) {
	let link;
	let link_href_value;

	const block = {
		c: function create() {
			link = element("link");
			attr_dev(link, "id", "piece-sprite");
			attr_dev(link, "href", link_href_value = "/piece-css/" + /*pieceSetOverride*/ ctx[1] + ".css");
			attr_dev(link, "rel", "stylesheet");
			add_location(link, file$d, 136, 2, 3268);
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
		id: create_if_block$7.name,
		type: "if",
		source: "(136:0) {#if pieceSetOverride}",
		ctx
	});

	return block;
}

function create_fragment$e(ctx) {
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
		if (/*pieceSetOverride*/ ctx[1]) return create_if_block$7;
		return create_else_block$4;
	}

	let current_block_type = select_block_type(ctx);
	let if_block = current_block_type(ctx);
	const centered_content_slot_template = /*#slots*/ ctx[16]["centered-content"];
	const centered_content_slot = create_slot(centered_content_slot_template, ctx, /*$$scope*/ ctx[15], get_centered_content_slot_context);
	const below_board_slot_template = /*#slots*/ ctx[16]["below-board"];
	const below_board_slot = create_slot(below_board_slot_template, ctx, /*$$scope*/ ctx[15], get_below_board_slot_context);

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
			attr_dev(div0, "class", "centered-content svelte-1hrnnj7");
			add_location(div0, file$d, 150, 2, 3553);

			attr_dev(div1, "class", div1_class_value = "is2d " + (/*boardStyleOverride*/ ctx[2]
			? /*boardStyleOverride*/ ctx[2]
			: '') + " svelte-1hrnnj7");

			set_style(div1, "position", "relative");
			set_style(div1, "width", /*size*/ ctx[0] + "px");
			set_style(div1, "height", /*size*/ ctx[0] + "px");
			add_location(div1, file$d, 153, 2, 3637);
			attr_dev(div2, "class", "block mt-2");
			add_location(div2, file$d, 158, 2, 3814);
			attr_dev(div3, "class", "board-wrapper svelte-1hrnnj7");
			set_style(div3, "max-width", /*maxWidth*/ ctx[5]);
			add_render_callback(() => /*div3_elementresize_handler*/ ctx[18].call(div3));
			add_location(div3, file$d, 145, 0, 3462);
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
			/*div1_binding*/ ctx[17](div1);
			append_dev(div3, t2);
			append_dev(div3, div2);

			if (below_board_slot) {
				below_board_slot.m(div2, null);
			}

			div3_resize_listener = add_iframe_resize_listener(div3, /*div3_elementresize_handler*/ ctx[18].bind(div3));
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
				if (centered_content_slot.p && (!current || dirty & /*$$scope*/ 32768)) {
					update_slot_base(
						centered_content_slot,
						centered_content_slot_template,
						ctx,
						/*$$scope*/ ctx[15],
						!current
						? get_all_dirty_from_scope(/*$$scope*/ ctx[15])
						: get_slot_changes(centered_content_slot_template, /*$$scope*/ ctx[15], dirty, get_centered_content_slot_changes),
						get_centered_content_slot_context
					);
				}
			}

			if (!current || dirty & /*boardStyleOverride*/ 4 && div1_class_value !== (div1_class_value = "is2d " + (/*boardStyleOverride*/ ctx[2]
			? /*boardStyleOverride*/ ctx[2]
			: '') + " svelte-1hrnnj7")) {
				attr_dev(div1, "class", div1_class_value);
			}

			if (!current || dirty & /*size*/ 1) {
				set_style(div1, "width", /*size*/ ctx[0] + "px");
			}

			if (!current || dirty & /*size*/ 1) {
				set_style(div1, "height", /*size*/ ctx[0] + "px");
			}

			if (below_board_slot) {
				if (below_board_slot.p && (!current || dirty & /*$$scope*/ 32768)) {
					update_slot_base(
						below_board_slot,
						below_board_slot_template,
						ctx,
						/*$$scope*/ ctx[15],
						!current
						? get_all_dirty_from_scope(/*$$scope*/ ctx[15])
						: get_slot_changes(below_board_slot_template, /*$$scope*/ ctx[15], dirty, get_below_board_slot_changes),
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
			/*div1_binding*/ ctx[17](null);
			if (below_board_slot) below_board_slot.d(detaching);
			div3_resize_listener();
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_fragment$e.name,
		type: "component",
		source: "",
		ctx
	});

	return block;
}

function instance$e($$self, $$props, $$invalidate) {
	let $pieceSet;
	validate_store(pieceSet, 'pieceSet');
	component_subscribe($$self, pieceSet, $$value => $$invalidate(4, $pieceSet = $$value));
	let { $$slots: slots = {}, $$scope } = $$props;
	validate_slots('Chessboard', slots, ['centered-content','below-board']);
	let boardContainer;
	let { chessgroundConfig = {} } = $$props;
	let { orientation = "white" } = $$props;
	let { fen } = $$props;
	let { lastMove = null } = $$props;
	let { chessground } = $$props;
	let { size } = $$props;
	let chessInstance = new Chess();
	let { pieceSetOverride = null } = $$props;
	let { boardStyleOverride = null } = $$props;
	const dispatch = createEventDispatcher();
	let maxWidth = "70vh";

	function getLegalMoves() {
		const moves = chessInstance.moves({ verbose: true });
		const dests = new Map();

		moves.forEach(move => {
			if (!dests.has(move.from)) dests.set(move.from, []);
			dests.get(move.from).push(move.to);
		});

		return dests;
	}

	function updateChessground() {
		const legalMoves = getLegalMoves();
		const history = chessInstance.history({ verbose: true });
		let lastMove = null;

		if (history && history[history.length - 1]) {
			lastMove = history[history.length - 1];
		}

		chessground.set({
			check: chessInstance.inCheck(),
			fen: chessInstance.fen(),
			lastMove: lastMove ? [lastMove.from, lastMove.to] : null,
			turnColor: chessInstance.turn() === "w" ? "white" : "black",
			movable: { free: false, dests: legalMoves }
		});
	}

	function handleMove(from, to) {
		const isPromotion = (from, to) => {
			const fromRank = from[1];
			const toRank = to[1];
			const piece = chessInstance.get(from).type;
			return piece === "p" && (fromRank === "7" && toRank === "8" || fromRank === "2" && toRank === "1");
		};

		let promotion = "q"; // Default to queen

		if (isPromotion(from, to)) {
			const choice = prompt("Promote pawn to (q, r, b, n):", "q");

			if (["q", "r", "b", "n"].includes(choice)) {
				promotion = choice;
			}
		}

		const move = chessInstance.move({ from, to, promotion });

		if (move) {
			updateChessground();

			dispatch("move", {
				move,
				isCheckmate: chessInstance.isCheckmate()
			});
		}
	}

	function undo() {
		chessInstance.undo();
		updateChessground();
	}

	function reset() {
		chessInstance.reset();
		updateChessground();
	}

	function clear() {
		chessInstance.clear();
		updateChessground();
	}

	function move(move) {
		chessInstance.move(move);
		updateChessground();
	}

	onMount(() => {
		$$invalidate(6, chessground = Chessground(boardContainer, {
			...chessgroundConfig,
			fen: chessInstance.fen(),
			movable: { events: { after: handleMove } }
		}));
	});

	$$self.$$.on_mount.push(function () {
		if (fen === undefined && !('fen' in $$props || $$self.$$.bound[$$self.$$.props['fen']])) {
			console.warn("<Chessboard> was created without expected prop 'fen'");
		}

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
		'lastMove',
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
		if ('lastMove' in $$props) $$invalidate(10, lastMove = $$props.lastMove);
		if ('chessground' in $$props) $$invalidate(6, chessground = $$props.chessground);
		if ('size' in $$props) $$invalidate(0, size = $$props.size);
		if ('pieceSetOverride' in $$props) $$invalidate(1, pieceSetOverride = $$props.pieceSetOverride);
		if ('boardStyleOverride' in $$props) $$invalidate(2, boardStyleOverride = $$props.boardStyleOverride);
		if ('$$scope' in $$props) $$invalidate(15, $$scope = $$props.$$scope);
	};

	$$self.$capture_state = () => ({
		onMount,
		Chessground,
		Chess,
		pieceSet,
		createEventDispatcher,
		boardContainer,
		chessgroundConfig,
		orientation,
		fen,
		lastMove,
		chessground,
		size,
		chessInstance,
		pieceSetOverride,
		boardStyleOverride,
		dispatch,
		maxWidth,
		getLegalMoves,
		updateChessground,
		handleMove,
		undo,
		reset,
		clear,
		move,
		$pieceSet
	});

	$$self.$inject_state = $$props => {
		if ('boardContainer' in $$props) $$invalidate(3, boardContainer = $$props.boardContainer);
		if ('chessgroundConfig' in $$props) $$invalidate(7, chessgroundConfig = $$props.chessgroundConfig);
		if ('orientation' in $$props) $$invalidate(8, orientation = $$props.orientation);
		if ('fen' in $$props) $$invalidate(9, fen = $$props.fen);
		if ('lastMove' in $$props) $$invalidate(10, lastMove = $$props.lastMove);
		if ('chessground' in $$props) $$invalidate(6, chessground = $$props.chessground);
		if ('size' in $$props) $$invalidate(0, size = $$props.size);
		if ('chessInstance' in $$props) $$invalidate(19, chessInstance = $$props.chessInstance);
		if ('pieceSetOverride' in $$props) $$invalidate(1, pieceSetOverride = $$props.pieceSetOverride);
		if ('boardStyleOverride' in $$props) $$invalidate(2, boardStyleOverride = $$props.boardStyleOverride);
		if ('maxWidth' in $$props) $$invalidate(5, maxWidth = $$props.maxWidth);
	};

	if ($$props && "$$inject" in $$props) {
		$$self.$inject_state($$props.$$inject);
	}

	$$self.$$.update = () => {
		if ($$self.$$.dirty & /*orientation, chessground*/ 320) {
			{
				if (orientation && chessground) {
					chessground.set({ orientation });
				}
			}
		}

		if ($$self.$$.dirty & /*fen, chessground, lastMove*/ 1600) {
			{
				if (fen && chessground) {
					if (lastMove) {
						chessInstance.load(lastMove.before);

						setTimeout(
							() => {
								move(lastMove.san);
								chessground.set({ lastMove: [lastMove.from, lastMove.to] });
							},
							500
						);
					} else {
						chessInstance.load(fen);
					}

					updateChessground();
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
		lastMove,
		undo,
		reset,
		clear,
		move,
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
			instance$e,
			create_fragment$e,
			safe_not_equal,
			{
				chessgroundConfig: 7,
				orientation: 8,
				fen: 9,
				lastMove: 10,
				chessground: 6,
				size: 0,
				pieceSetOverride: 1,
				boardStyleOverride: 2,
				undo: 11,
				reset: 12,
				clear: 13,
				move: 14
			},
			add_css$6
		);

		dispatch_dev("SvelteRegisterComponent", {
			component: this,
			tagName: "Chessboard",
			options,
			id: create_fragment$e.name
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

	get lastMove() {
		throw new Error("<Chessboard>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	set lastMove(value) {
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

	get undo() {
		return this.$$.ctx[11];
	}

	set undo(value) {
		throw new Error("<Chessboard>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	get reset() {
		return this.$$.ctx[12];
	}

	set reset(value) {
		throw new Error("<Chessboard>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	get clear() {
		return this.$$.ctx[13];
	}

	set clear(value) {
		throw new Error("<Chessboard>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	get move() {
		return this.$$.ctx[14];
	}

	set move(value) {
		throw new Error("<Chessboard>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}
}

/*
Adapted from https://github.com/mattdesl
Distributed under MIT License https://github.com/mattdesl/eases/blob/master/LICENSE.md
*/

/**
 * https://svelte.dev/docs/svelte-easing
 * @param {number} t
 * @returns {number}
 */
function cubicInOut(t) {
	return t < 0.5 ? 4.0 * t * t * t : 0.5 * Math.pow(2.0 * t - 2.0, 3.0) + 1.0;
}

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
 * Animates a `blur` filter alongside an element's opacity.
 *
 * https://svelte.dev/docs/svelte-transition#blur
 * @param {Element} node
 * @param {import('./public').BlurParams} [params]
 * @returns {import('./public').TransitionConfig}
 */
function blur(
	node,
	{ delay = 0, duration = 400, easing = cubicInOut, amount = 5, opacity = 0 } = {}
) {
	const style = getComputedStyle(node);
	const target_opacity = +style.opacity;
	const f = style.filter === 'none' ? '' : style.filter;
	const od = target_opacity * (1 - opacity);
	const [value, unit] = split_css_unit(amount);
	return {
		delay,
		duration,
		easing,
		css: (_t, u) => `opacity: ${target_opacity - od * u}; filter: ${f} blur(${u * value}${unit});`
	};
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
 * Animates the x and y positions and the opacity of an element. `in` transitions animate from the provided values, passed as parameters to the element's default values. `out` transitions animate from the element's default values to the provided values.
 *
 * https://svelte.dev/docs/svelte-transition#fly
 * @param {Element} node
 * @param {import('./public').FlyParams} [params]
 * @returns {import('./public').TransitionConfig}
 */
function fly(
	node,
	{ delay = 0, duration = 400, easing = cubicOut, x = 0, y = 0, opacity = 0 } = {}
) {
	const style = getComputedStyle(node);
	const target_opacity = +style.opacity;
	const transform = style.transform === 'none' ? '' : style.transform;
	const od = target_opacity * (1 - opacity);
	const [xValue, xUnit] = split_css_unit(x);
	const [yValue, yUnit] = split_css_unit(y);
	return {
		delay,
		duration,
		easing,
		css: (t, u) => `
			transform: ${transform} translate(${(1 - t) * xValue}${xUnit}, ${(1 - t) * yValue}${yUnit});
			opacity: ${target_opacity - od * u}`
	};
}

/**
 * Slides an element in and out.
 *
 * https://svelte.dev/docs/svelte-transition#slide
 * @param {Element} node
 * @param {import('./public').SlideParams} [params]
 * @returns {import('./public').TransitionConfig}
 */
function slide(node, { delay = 0, duration = 400, easing = cubicOut, axis = 'y' } = {}) {
	const style = getComputedStyle(node);
	const opacity = +style.opacity;
	const primary_property = axis === 'y' ? 'height' : 'width';
	const primary_property_value = parseFloat(style[primary_property]);
	const secondary_properties = axis === 'y' ? ['top', 'bottom'] : ['left', 'right'];
	const capitalized_secondary_properties = secondary_properties.map(
		(e) => `${e[0].toUpperCase()}${e.slice(1)}`
	);
	const padding_start_value = parseFloat(style[`padding${capitalized_secondary_properties[0]}`]);
	const padding_end_value = parseFloat(style[`padding${capitalized_secondary_properties[1]}`]);
	const margin_start_value = parseFloat(style[`margin${capitalized_secondary_properties[0]}`]);
	const margin_end_value = parseFloat(style[`margin${capitalized_secondary_properties[1]}`]);
	const border_width_start_value = parseFloat(
		style[`border${capitalized_secondary_properties[0]}Width`]
	);
	const border_width_end_value = parseFloat(
		style[`border${capitalized_secondary_properties[1]}Width`]
	);
	return {
		delay,
		duration,
		easing,
		css: (t) =>
			'overflow: hidden;' +
			`opacity: ${Math.min(t * 20, 1) * opacity};` +
			`${primary_property}: ${t * primary_property_value}px;` +
			`padding-${secondary_properties[0]}: ${t * padding_start_value}px;` +
			`padding-${secondary_properties[1]}: ${t * padding_end_value}px;` +
			`margin-${secondary_properties[0]}: ${t * margin_start_value}px;` +
			`margin-${secondary_properties[1]}: ${t * margin_end_value}px;` +
			`border-${secondary_properties[0]}-width: ${t * border_width_start_value}px;` +
			`border-${secondary_properties[1]}-width: ${t * border_width_end_value}px;`
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

/* svelte/components/PuzzleHistoryProcessor.svelte generated by Svelte v4.2.18 */
const file$c = "svelte/components/PuzzleHistoryProcessor.svelte";

// (53:0) {:else}
function create_else_block$3(ctx) {
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
			add_location(strong, file$c, 53, 5, 1302);
			add_location(p, file$c, 53, 2, 1299);
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
		id: create_else_block$3.name,
		type: "else",
		source: "(53:0) {:else}",
		ctx
	});

	return block;
}

// (44:0) {#if uniquePuzzleIds.length === 0}
function create_if_block_1$3(ctx) {
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
			add_location(textarea, file$c, 46, 6, 1114);
			attr_dev(div0, "class", "control");
			add_location(div0, file$c, 45, 4, 1086);
			attr_dev(div1, "class", "field");
			add_location(div1, file$c, 44, 2, 1062);
			attr_dev(button, "class", "button is-primary");
			add_location(button, file$c, 49, 2, 1199);
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
		id: create_if_block_1$3.name,
		type: "if",
		source: "(44:0) {#if uniquePuzzleIds.length === 0}",
		ctx
	});

	return block;
}

// (99:0) {#if filterSubmitted}
function create_if_block$6(ctx) {
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
			add_location(strong, file$c, 100, 10, 2504);
			add_location(p, file$c, 99, 2, 2490);
			attr_dev(input, "class", "input");
			attr_dev(input, "type", "text");
			input.readOnly = true;
			input.value = input_value_value = /*uniqueFilteredPuzzleIds*/ ctx[6].join(",");
			add_location(input, file$c, 104, 6, 2632);
			attr_dev(div0, "class", "control");
			add_location(div0, file$c, 103, 4, 2604);
			attr_dev(div1, "class", "field");
			add_location(div1, file$c, 102, 2, 2580);
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
		id: create_if_block$6.name,
		type: "if",
		source: "(99:0) {#if filterSubmitted}",
		ctx
	});

	return block;
}

function create_fragment$d(ctx) {
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
		if (/*uniquePuzzleIds*/ ctx[7].length === 0) return create_if_block_1$3;
		return create_else_block$3;
	}

	let current_block_type = select_block_type(ctx);
	let if_block0 = current_block_type(ctx);
	let if_block1 = /*filterSubmitted*/ ctx[5] && create_if_block$6(ctx);

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
			add_location(label0, file$c, 58, 4, 1445);
			attr_dev(input0, "class", "input");
			attr_dev(input0, "type", "number");
			attr_dev(input0, "id", "minRating");
			attr_dev(input0, "min", "0");
			attr_dev(input0, "max", "4999");
			add_location(input0, file$c, 60, 6, 1534);
			attr_dev(div0, "class", "control");
			add_location(div0, file$c, 59, 4, 1506);
			attr_dev(div1, "class", "field");
			add_location(div1, file$c, 57, 2, 1421);
			attr_dev(label1, "class", "label");
			attr_dev(label1, "for", "maxRating");
			add_location(label1, file$c, 71, 4, 1729);
			attr_dev(input1, "class", "input");
			attr_dev(input1, "type", "number");
			attr_dev(input1, "id", "maxRating");
			attr_dev(input1, "min", input1_min_value = /*minRating*/ ctx[1] + 1);
			attr_dev(input1, "max", "5000");
			add_location(input1, file$c, 73, 6, 1818);
			attr_dev(div2, "class", "control");
			add_location(div2, file$c, 72, 4, 1790);
			attr_dev(div3, "class", "field");
			add_location(div3, file$c, 70, 2, 1705);
			attr_dev(label2, "class", "checkbox");
			attr_dev(label2, "for", "correctSolves");
			add_location(label2, file$c, 84, 4, 2025);
			attr_dev(input2, "type", "checkbox");
			attr_dev(input2, "id", "correctSolves");
			add_location(input2, file$c, 85, 4, 2097);
			attr_dev(div4, "class", "field");
			add_location(div4, file$c, 83, 2, 2001);
			attr_dev(label3, "class", "checkbox");
			attr_dev(label3, "for", "incorrectSolves");
			add_location(label3, file$c, 88, 4, 2206);
			attr_dev(input3, "type", "checkbox");
			attr_dev(input3, "id", "incorrectSolves");
			add_location(input3, file$c, 89, 4, 2282);
			attr_dev(div5, "class", "field");
			add_location(div5, file$c, 87, 2, 2182);
			attr_dev(button, "class", "button is-primary");
			attr_dev(button, "type", "submit");
			add_location(button, file$c, 95, 2, 2393);
			add_location(form, file$c, 56, 0, 1371);
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
					if_block1 = create_if_block$6(ctx);
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
		id: create_fragment$d.name,
		type: "component",
		source: "",
		ctx
	});

	return block;
}

function instance$d($$self, $$props, $$invalidate) {
	let { $$slots: slots = {}, $$scope } = $$props;
	validate_slots('PuzzleHistoryProcessor', slots, []);
	let puzzleData = "";
	let puzzles = [];
	let filteredPuzzles = [];
	let minRating = 0;
	let maxRating = 3500;
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
		init(this, options, instance$d, create_fragment$d, safe_not_equal, {});

		dispatch_dev("SvelteRegisterComponent", {
			component: this,
			tagName: "PuzzleHistoryProcessor",
			options,
			id: create_fragment$d.name
		});
	}
}

/**
 * @param {any} obj
 * @returns {boolean}
 */
function is_date(obj) {
	return Object.prototype.toString.call(obj) === '[object Date]';
}

/** @returns {(t: any) => any} */
function get_interpolator(a, b) {
	if (a === b || a !== a) return () => a;
	const type = typeof a;
	if (type !== typeof b || Array.isArray(a) !== Array.isArray(b)) {
		throw new Error('Cannot interpolate values of different type');
	}
	if (Array.isArray(a)) {
		const arr = b.map((bi, i) => {
			return get_interpolator(a[i], bi);
		});
		return (t) => arr.map((fn) => fn(t));
	}
	if (type === 'object') {
		if (!a || !b) throw new Error('Object cannot be null');
		if (is_date(a) && is_date(b)) {
			a = a.getTime();
			b = b.getTime();
			const delta = b - a;
			return (t) => new Date(a + t * delta);
		}
		const keys = Object.keys(b);
		const interpolators = {};
		keys.forEach((key) => {
			interpolators[key] = get_interpolator(a[key], b[key]);
		});
		return (t) => {
			const result = {};
			keys.forEach((key) => {
				result[key] = interpolators[key](t);
			});
			return result;
		};
	}
	if (type === 'number') {
		const delta = b - a;
		return (t) => a + t * delta;
	}
	throw new Error(`Cannot interpolate ${type} values`);
}

/**
 * A tweened store in Svelte is a special type of store that provides smooth transitions between state values over time.
 *
 * https://svelte.dev/docs/svelte-motion#tweened
 * @template T
 * @param {T} [value]
 * @param {import('./private.js').TweenedOptions<T>} [defaults]
 * @returns {import('./public.js').Tweened<T>}
 */
function tweened(value, defaults = {}) {
	const store = writable(value);
	/** @type {import('../internal/private.js').Task} */
	let task;
	let target_value = value;
	/**
	 * @param {T} new_value
	 * @param {import('./private.js').TweenedOptions<T>} [opts]
	 */
	function set(new_value, opts) {
		if (value == null) {
			store.set((value = new_value));
			return Promise.resolve();
		}
		target_value = new_value;
		let previous_task = task;
		let started = false;
		let {
			delay = 0,
			duration = 400,
			easing = identity,
			interpolate = get_interpolator
		} = assign(assign({}, defaults), opts);
		if (duration === 0) {
			if (previous_task) {
				previous_task.abort();
				previous_task = null;
			}
			store.set((value = target_value));
			return Promise.resolve();
		}
		const start = now() + delay;
		let fn;
		task = loop((now) => {
			if (now < start) return true;
			if (!started) {
				fn = interpolate(value, new_value);
				if (typeof duration === 'function') duration = duration(value, new_value);
				started = true;
			}
			if (previous_task) {
				previous_task.abort();
				previous_task = null;
			}
			const elapsed = now - start;
			if (elapsed > /** @type {number} */ (duration)) {
				store.set((value = new_value));
				return false;
			}
			// @ts-ignore
			store.set((value = fn(easing(elapsed / duration))));
			return true;
		});
		return task.promise;
	}
	return {
		set,
		update: (fn, opts) => set(fn(target_value, value), opts),
		subscribe: store.subscribe
	};
}

/* svelte/components/CollapsibleBox.svelte generated by Svelte v4.2.18 */
const file$b = "svelte/components/CollapsibleBox.svelte";

function add_css$5(target) {
	append_styles(target, "svelte-b8skwo", ".toggle-button.svelte-b8skwo.svelte-b8skwo{cursor:pointer;display:flex;align-items:center;justify-content:space-between}.toggle-button.svelte-b8skwo span.svelte-b8skwo{font-weight:bold;font-size:1.2em;transition:color 0.3s ease}.box.open.svelte-b8skwo .toggle-button span.svelte-b8skwo{color:var(--bulma-primary)}.box.svelte-b8skwo:not(.open) .toggle-button span.svelte-b8skwo{color:var(--bulma-primary-20)}.icon.svelte-b8skwo.svelte-b8skwo{margin-right:8px;transition:transform 0.3s ease}\n/*# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQ29sbGFwc2libGVCb3guc3ZlbHRlIiwic291cmNlcyI6WyJDb2xsYXBzaWJsZUJveC5zdmVsdGUiXSwic291cmNlc0NvbnRlbnQiOlsiPHNjcmlwdD5cbiAgaW1wb3J0IHsgc2xpZGUgfSBmcm9tIFwic3ZlbHRlL3RyYW5zaXRpb25cIjtcbiAgaW1wb3J0IHsgd3JpdGFibGUgfSBmcm9tIFwic3ZlbHRlL3N0b3JlXCI7XG4gIGltcG9ydCB7IHR3ZWVuZWQgfSBmcm9tIFwic3ZlbHRlL21vdGlvblwiO1xuICBpbXBvcnQgeyBsaW5lYXIgfSBmcm9tIFwic3ZlbHRlL2Vhc2luZ1wiO1xuXG4gIGV4cG9ydCBsZXQgZGVmYXVsdE9wZW4gPSBmYWxzZTtcbiAgZXhwb3J0IGxldCB0aXRsZSA9IFwiXCI7XG4gIGNvbnN0IGlzT3BlbiA9IHdyaXRhYmxlKGRlZmF1bHRPcGVuKTtcbiAgY29uc3Qgcm90YXRpb24gPSB0d2VlbmVkKDAsIHtcbiAgICBkdXJhdGlvbjogMzAwLFxuICAgIGVhc2luZzogbGluZWFyLFxuICB9KTtcblxuICBmdW5jdGlvbiB0b2dnbGVPcGVuKCkge1xuICAgIGlzT3Blbi51cGRhdGUoKG4pID0+ICFuKTtcbiAgICByb3RhdGlvbi5zZXQoJGlzT3BlbiA/IDkwIDogMCk7XG4gIH1cblxuICBmdW5jdGlvbiBoYW5kbGVLZXlkb3duKGV2ZW50KSB7XG4gICAgaWYgKGV2ZW50LmtleSA9PT0gXCJFbnRlclwiKSB7XG4gICAgICB0b2dnbGVPcGVuKCk7XG4gICAgfVxuICB9XG48L3NjcmlwdD5cblxuPGRpdiBjbGFzcz1cImJveFwiIGNsYXNzOm9wZW49eyRpc09wZW59PlxuICA8ZGl2XG4gICAgY2xhc3M9XCJ0b2dnbGUtYnV0dG9uXCJcbiAgICByb2xlPVwiYnV0dG9uXCJcbiAgICB0YWJpbmRleD1cIjBcIlxuICAgIG9uOmNsaWNrPXt0b2dnbGVPcGVufVxuICAgIG9uOmtleWRvd249e2hhbmRsZUtleWRvd259XG4gID5cbiAgICA8c3BhbiBjbGFzcz1cIm1iLTJcIj57dGl0bGV9PC9zcGFuPlxuICAgIDxzcGFuIGNsYXNzPVwiaWNvblwiIHN0eWxlPVwidHJhbnNmb3JtOiByb3RhdGUoeyRyb3RhdGlvbn1kZWcpO1wiPuKWtjwvc3Bhbj5cbiAgPC9kaXY+XG4gIHsjaWYgJGlzT3Blbn1cbiAgICA8ZGl2IHRyYW5zaXRpb246c2xpZGU+XG4gICAgICA8c2xvdD48L3Nsb3Q+XG4gICAgPC9kaXY+XG4gIHsvaWZ9XG48L2Rpdj5cblxuPHN0eWxlPlxuICAudG9nZ2xlLWJ1dHRvbiB7XG4gICAgY3Vyc29yOiBwb2ludGVyO1xuICAgIGRpc3BsYXk6IGZsZXg7XG4gICAgYWxpZ24taXRlbXM6IGNlbnRlcjtcbiAgICBqdXN0aWZ5LWNvbnRlbnQ6IHNwYWNlLWJldHdlZW47XG4gIH1cblxuICAudG9nZ2xlLWJ1dHRvbiBzcGFuIHtcbiAgICBmb250LXdlaWdodDogYm9sZDsgLyogTWFrZSB0aGUgdGl0bGUgYm9sZCAqL1xuICAgIGZvbnQtc2l6ZTogMS4yZW07IC8qIEluY3JlYXNlIHRoZSB0aXRsZSBzaXplICovXG4gICAgdHJhbnNpdGlvbjogY29sb3IgMC4zcyBlYXNlOyAvKiBTbW9vdGggdHJhbnNpdGlvbiBmb3IgY29sb3IgY2hhbmdlICovXG4gIH1cblxuICAvKiBDb2xvciBjaGFuZ2Ugd2hlbiBvcGVuICovXG4gIC5ib3gub3BlbiAudG9nZ2xlLWJ1dHRvbiBzcGFuIHtcbiAgICBjb2xvcjogdmFyKC0tYnVsbWEtcHJpbWFyeSk7IC8qIENvbG9yIHdoZW4gb3BlbiAqL1xuICB9XG5cbiAgLyogQ29sb3IgY2hhbmdlIHdoZW4gY2xvc2VkICovXG4gIC5ib3g6bm90KC5vcGVuKSAudG9nZ2xlLWJ1dHRvbiBzcGFuIHtcbiAgICBjb2xvcjogdmFyKC0tYnVsbWEtcHJpbWFyeS0yMCk7IC8qIENvbG9yIHdoZW4gY2xvc2VkICovXG4gIH1cblxuICAuaWNvbiB7XG4gICAgbWFyZ2luLXJpZ2h0OiA4cHg7XG4gICAgdHJhbnNpdGlvbjogdHJhbnNmb3JtIDAuM3MgZWFzZTtcbiAgfVxuPC9zdHlsZT5cbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUE2Q0UsMENBQWUsQ0FDYixNQUFNLENBQUUsT0FBTyxDQUNmLE9BQU8sQ0FBRSxJQUFJLENBQ2IsV0FBVyxDQUFFLE1BQU0sQ0FDbkIsZUFBZSxDQUFFLGFBQ25CLENBRUEsNEJBQWMsQ0FBQyxrQkFBSyxDQUNsQixXQUFXLENBQUUsSUFBSSxDQUNqQixTQUFTLENBQUUsS0FBSyxDQUNoQixVQUFVLENBQUUsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUN6QixDQUdBLElBQUksbUJBQUssQ0FBQyxjQUFjLENBQUMsa0JBQUssQ0FDNUIsS0FBSyxDQUFFLElBQUksZUFBZSxDQUM1QixDQUdBLGtCQUFJLEtBQUssS0FBSyxDQUFDLENBQUMsY0FBYyxDQUFDLGtCQUFLLENBQ2xDLEtBQUssQ0FBRSxJQUFJLGtCQUFrQixDQUMvQixDQUVBLGlDQUFNLENBQ0osWUFBWSxDQUFFLEdBQUcsQ0FDakIsVUFBVSxDQUFFLFNBQVMsQ0FBQyxJQUFJLENBQUMsSUFDN0IifQ== */");
}

// (38:2) {#if $isOpen}
function create_if_block$5(ctx) {
	let div;
	let div_transition;
	let current;
	const default_slot_template = /*#slots*/ ctx[9].default;
	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[8], null);

	const block = {
		c: function create() {
			div = element("div");
			if (default_slot) default_slot.c();
			add_location(div, file$b, 38, 4, 875);
		},
		m: function mount(target, anchor) {
			insert_dev(target, div, anchor);

			if (default_slot) {
				default_slot.m(div, null);
			}

			current = true;
		},
		p: function update(ctx, dirty) {
			if (default_slot) {
				if (default_slot.p && (!current || dirty & /*$$scope*/ 256)) {
					update_slot_base(
						default_slot,
						default_slot_template,
						ctx,
						/*$$scope*/ ctx[8],
						!current
						? get_all_dirty_from_scope(/*$$scope*/ ctx[8])
						: get_slot_changes(default_slot_template, /*$$scope*/ ctx[8], dirty, null),
						null
					);
				}
			}
		},
		i: function intro(local) {
			if (current) return;
			transition_in(default_slot, local);

			if (local) {
				add_render_callback(() => {
					if (!current) return;
					if (!div_transition) div_transition = create_bidirectional_transition(div, slide, {}, true);
					div_transition.run(1);
				});
			}

			current = true;
		},
		o: function outro(local) {
			transition_out(default_slot, local);

			if (local) {
				if (!div_transition) div_transition = create_bidirectional_transition(div, slide, {}, false);
				div_transition.run(0);
			}

			current = false;
		},
		d: function destroy(detaching) {
			if (detaching) {
				detach_dev(div);
			}

			if (default_slot) default_slot.d(detaching);
			if (detaching && div_transition) div_transition.end();
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_if_block$5.name,
		type: "if",
		source: "(38:2) {#if $isOpen}",
		ctx
	});

	return block;
}

function create_fragment$c(ctx) {
	let div1;
	let div0;
	let span0;
	let t0;
	let t1;
	let span1;
	let t2;
	let t3;
	let current;
	let mounted;
	let dispose;
	let if_block = /*$isOpen*/ ctx[1] && create_if_block$5(ctx);

	const block = {
		c: function create() {
			div1 = element("div");
			div0 = element("div");
			span0 = element("span");
			t0 = text(/*title*/ ctx[0]);
			t1 = space();
			span1 = element("span");
			t2 = text("▶");
			t3 = space();
			if (if_block) if_block.c();
			attr_dev(span0, "class", "mb-2 svelte-b8skwo");
			add_location(span0, file$b, 34, 4, 737);
			attr_dev(span1, "class", "icon svelte-b8skwo");
			set_style(span1, "transform", "rotate(" + /*$rotation*/ ctx[2] + "deg)");
			add_location(span1, file$b, 35, 4, 775);
			attr_dev(div0, "class", "toggle-button svelte-b8skwo");
			attr_dev(div0, "role", "button");
			attr_dev(div0, "tabindex", "0");
			add_location(div0, file$b, 27, 2, 606);
			attr_dev(div1, "class", "box svelte-b8skwo");
			toggle_class(div1, "open", /*$isOpen*/ ctx[1]);
			add_location(div1, file$b, 26, 0, 565);
		},
		l: function claim(nodes) {
			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
		},
		m: function mount(target, anchor) {
			insert_dev(target, div1, anchor);
			append_dev(div1, div0);
			append_dev(div0, span0);
			append_dev(span0, t0);
			append_dev(div0, t1);
			append_dev(div0, span1);
			append_dev(span1, t2);
			append_dev(div1, t3);
			if (if_block) if_block.m(div1, null);
			current = true;

			if (!mounted) {
				dispose = [
					listen_dev(div0, "click", /*toggleOpen*/ ctx[5], false, false, false, false),
					listen_dev(div0, "keydown", /*handleKeydown*/ ctx[6], false, false, false, false)
				];

				mounted = true;
			}
		},
		p: function update(ctx, [dirty]) {
			if (!current || dirty & /*title*/ 1) set_data_dev(t0, /*title*/ ctx[0]);

			if (!current || dirty & /*$rotation*/ 4) {
				set_style(span1, "transform", "rotate(" + /*$rotation*/ ctx[2] + "deg)");
			}

			if (/*$isOpen*/ ctx[1]) {
				if (if_block) {
					if_block.p(ctx, dirty);

					if (dirty & /*$isOpen*/ 2) {
						transition_in(if_block, 1);
					}
				} else {
					if_block = create_if_block$5(ctx);
					if_block.c();
					transition_in(if_block, 1);
					if_block.m(div1, null);
				}
			} else if (if_block) {
				group_outros();

				transition_out(if_block, 1, 1, () => {
					if_block = null;
				});

				check_outros();
			}

			if (!current || dirty & /*$isOpen*/ 2) {
				toggle_class(div1, "open", /*$isOpen*/ ctx[1]);
			}
		},
		i: function intro(local) {
			if (current) return;
			transition_in(if_block);
			current = true;
		},
		o: function outro(local) {
			transition_out(if_block);
			current = false;
		},
		d: function destroy(detaching) {
			if (detaching) {
				detach_dev(div1);
			}

			if (if_block) if_block.d();
			mounted = false;
			run_all(dispose);
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_fragment$c.name,
		type: "component",
		source: "",
		ctx
	});

	return block;
}

function instance$c($$self, $$props, $$invalidate) {
	let $isOpen;
	let $rotation;
	let { $$slots: slots = {}, $$scope } = $$props;
	validate_slots('CollapsibleBox', slots, ['default']);
	let { defaultOpen = false } = $$props;
	let { title = "" } = $$props;
	const isOpen = writable(defaultOpen);
	validate_store(isOpen, 'isOpen');
	component_subscribe($$self, isOpen, value => $$invalidate(1, $isOpen = value));
	const rotation = tweened(0, { duration: 300, easing: identity });
	validate_store(rotation, 'rotation');
	component_subscribe($$self, rotation, value => $$invalidate(2, $rotation = value));

	function toggleOpen() {
		isOpen.update(n => !n);
		rotation.set($isOpen ? 90 : 0);
	}

	function handleKeydown(event) {
		if (event.key === "Enter") {
			toggleOpen();
		}
	}

	const writable_props = ['defaultOpen', 'title'];

	Object.keys($$props).forEach(key => {
		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<CollapsibleBox> was created with unknown prop '${key}'`);
	});

	$$self.$$set = $$props => {
		if ('defaultOpen' in $$props) $$invalidate(7, defaultOpen = $$props.defaultOpen);
		if ('title' in $$props) $$invalidate(0, title = $$props.title);
		if ('$$scope' in $$props) $$invalidate(8, $$scope = $$props.$$scope);
	};

	$$self.$capture_state = () => ({
		slide,
		writable,
		tweened,
		linear: identity,
		defaultOpen,
		title,
		isOpen,
		rotation,
		toggleOpen,
		handleKeydown,
		$isOpen,
		$rotation
	});

	$$self.$inject_state = $$props => {
		if ('defaultOpen' in $$props) $$invalidate(7, defaultOpen = $$props.defaultOpen);
		if ('title' in $$props) $$invalidate(0, title = $$props.title);
	};

	if ($$props && "$$inject" in $$props) {
		$$self.$inject_state($$props.$$inject);
	}

	return [
		title,
		$isOpen,
		$rotation,
		isOpen,
		rotation,
		toggleOpen,
		handleKeydown,
		defaultOpen,
		$$scope,
		slots
	];
}

class CollapsibleBox extends SvelteComponentDev {
	constructor(options) {
		super(options);
		init(this, options, instance$c, create_fragment$c, safe_not_equal, { defaultOpen: 7, title: 0 }, add_css$5);

		dispatch_dev("SvelteRegisterComponent", {
			component: this,
			tagName: "CollapsibleBox",
			options,
			id: create_fragment$c.name
		});
	}

	get defaultOpen() {
		throw new Error("<CollapsibleBox>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	set defaultOpen(value) {
		throw new Error("<CollapsibleBox>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	get title() {
		throw new Error("<CollapsibleBox>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	set title(value) {
		throw new Error("<CollapsibleBox>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}
}

/* svelte/components/Spoiler.svelte generated by Svelte v4.2.18 */
const file$a = "svelte/components/Spoiler.svelte";

function add_css$4(target) {
	append_styles(target, "svelte-lgmpfb", ".spoiler.svelte-lgmpfb{cursor:pointer;display:inline-block}.content.svelte-lgmpfb{border-radius:3px;transition:background-color 0.5s ease,\n      color 0.5s ease}.hiddenContent.svelte-lgmpfb{background-color:var(--bulma-grey);color:transparent}\n/*# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiU3BvaWxlci5zdmVsdGUiLCJzb3VyY2VzIjpbIlNwb2lsZXIuc3ZlbHRlIl0sInNvdXJjZXNDb250ZW50IjpbIjxzY3JpcHQ+XG4gIGV4cG9ydCBsZXQgaXNTaG93biA9IGZhbHNlO1xuXG4gIGZ1bmN0aW9uIHRvZ2dsZVNob3duKCkge1xuICAgIGlzU2hvd24gPSAhaXNTaG93bjtcbiAgfVxuXG4gIGZ1bmN0aW9uIGhhbmRsZUtleWRvd24oZXZlbnQpIHtcbiAgICAvLyBDaGVjayBpZiB0aGUga2V5IGlzIEVudGVyIG9yIFNwYWNlXG4gICAgaWYgKGV2ZW50LmtleSA9PT0gXCJFbnRlclwiIHx8IGV2ZW50LmtleSA9PT0gXCIgXCIpIHtcbiAgICAgIHRvZ2dsZVNob3duKCk7XG4gICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpOyAvLyBQcmV2ZW50IHRoZSBkZWZhdWx0IGFjdGlvbiB0byBhdm9pZCBzY3JvbGxpbmcgb24gU3BhY2UgcHJlc3NcbiAgICB9XG4gIH1cbjwvc2NyaXB0PlxuXG48ZGl2XG4gIGNsYXNzPVwic3BvaWxlclwiXG4gIHJvbGU9XCJidXR0b25cIlxuICB0YWJpbmRleD1cIjBcIlxuICBvbjpjbGljaz17dG9nZ2xlU2hvd259XG4gIG9uOmtleWRvd249e2hhbmRsZUtleWRvd259XG4+XG4gIDxkaXYgY2xhc3M9XCJjb250ZW50XCIgY2xhc3M6aGlkZGVuQ29udGVudD17IWlzU2hvd259PlxuICAgIDxzbG90Pjwvc2xvdD5cbiAgPC9kaXY+XG48L2Rpdj5cblxuPHN0eWxlPlxuICAuc3BvaWxlciB7XG4gICAgY3Vyc29yOiBwb2ludGVyO1xuICAgIGRpc3BsYXk6IGlubGluZS1ibG9jaztcbiAgfVxuICAuY29udGVudCB7XG4gICAgYm9yZGVyLXJhZGl1czogM3B4O1xuICAgIHRyYW5zaXRpb246XG4gICAgICBiYWNrZ3JvdW5kLWNvbG9yIDAuNXMgZWFzZSxcbiAgICAgIGNvbG9yIDAuNXMgZWFzZTtcbiAgfVxuICAuaGlkZGVuQ29udGVudCB7XG4gICAgYmFja2dyb3VuZC1jb2xvcjogdmFyKC0tYnVsbWEtZ3JleSk7XG4gICAgY29sb3I6IHRyYW5zcGFyZW50O1xuICB9XG48L3N0eWxlPlxuIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQTZCRSxzQkFBUyxDQUNQLE1BQU0sQ0FBRSxPQUFPLENBQ2YsT0FBTyxDQUFFLFlBQ1gsQ0FDQSxzQkFBUyxDQUNQLGFBQWEsQ0FBRSxHQUFHLENBQ2xCLFVBQVUsQ0FDUixnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDO0FBQ2pDLE1BQU0sS0FBSyxDQUFDLElBQUksQ0FBQyxJQUNmLENBQ0EsNEJBQWUsQ0FDYixnQkFBZ0IsQ0FBRSxJQUFJLFlBQVksQ0FBQyxDQUNuQyxLQUFLLENBQUUsV0FDVCJ9 */");
}

function create_fragment$b(ctx) {
	let div1;
	let div0;
	let current;
	let mounted;
	let dispose;
	const default_slot_template = /*#slots*/ ctx[4].default;
	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[3], null);

	const block = {
		c: function create() {
			div1 = element("div");
			div0 = element("div");
			if (default_slot) default_slot.c();
			attr_dev(div0, "class", "content svelte-lgmpfb");
			toggle_class(div0, "hiddenContent", !/*isShown*/ ctx[0]);
			add_location(div0, file$a, 23, 2, 474);
			attr_dev(div1, "class", "spoiler svelte-lgmpfb");
			attr_dev(div1, "role", "button");
			attr_dev(div1, "tabindex", "0");
			add_location(div1, file$a, 16, 0, 362);
		},
		l: function claim(nodes) {
			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
		},
		m: function mount(target, anchor) {
			insert_dev(target, div1, anchor);
			append_dev(div1, div0);

			if (default_slot) {
				default_slot.m(div0, null);
			}

			current = true;

			if (!mounted) {
				dispose = [
					listen_dev(div1, "click", /*toggleShown*/ ctx[1], false, false, false, false),
					listen_dev(div1, "keydown", /*handleKeydown*/ ctx[2], false, false, false, false)
				];

				mounted = true;
			}
		},
		p: function update(ctx, [dirty]) {
			if (default_slot) {
				if (default_slot.p && (!current || dirty & /*$$scope*/ 8)) {
					update_slot_base(
						default_slot,
						default_slot_template,
						ctx,
						/*$$scope*/ ctx[3],
						!current
						? get_all_dirty_from_scope(/*$$scope*/ ctx[3])
						: get_slot_changes(default_slot_template, /*$$scope*/ ctx[3], dirty, null),
						null
					);
				}
			}

			if (!current || dirty & /*isShown*/ 1) {
				toggle_class(div0, "hiddenContent", !/*isShown*/ ctx[0]);
			}
		},
		i: function intro(local) {
			if (current) return;
			transition_in(default_slot, local);
			current = true;
		},
		o: function outro(local) {
			transition_out(default_slot, local);
			current = false;
		},
		d: function destroy(detaching) {
			if (detaching) {
				detach_dev(div1);
			}

			if (default_slot) default_slot.d(detaching);
			mounted = false;
			run_all(dispose);
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_fragment$b.name,
		type: "component",
		source: "",
		ctx
	});

	return block;
}

function instance$b($$self, $$props, $$invalidate) {
	let { $$slots: slots = {}, $$scope } = $$props;
	validate_slots('Spoiler', slots, ['default']);
	let { isShown = false } = $$props;

	function toggleShown() {
		$$invalidate(0, isShown = !isShown);
	}

	function handleKeydown(event) {
		// Check if the key is Enter or Space
		if (event.key === "Enter" || event.key === " ") {
			toggleShown();
			event.preventDefault(); // Prevent the default action to avoid scrolling on Space press
		}
	}

	const writable_props = ['isShown'];

	Object.keys($$props).forEach(key => {
		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Spoiler> was created with unknown prop '${key}'`);
	});

	$$self.$$set = $$props => {
		if ('isShown' in $$props) $$invalidate(0, isShown = $$props.isShown);
		if ('$$scope' in $$props) $$invalidate(3, $$scope = $$props.$$scope);
	};

	$$self.$capture_state = () => ({ isShown, toggleShown, handleKeydown });

	$$self.$inject_state = $$props => {
		if ('isShown' in $$props) $$invalidate(0, isShown = $$props.isShown);
	};

	if ($$props && "$$inject" in $$props) {
		$$self.$inject_state($$props.$$inject);
	}

	return [isShown, toggleShown, handleKeydown, $$scope, slots];
}

class Spoiler extends SvelteComponentDev {
	constructor(options) {
		super(options);
		init(this, options, instance$b, create_fragment$b, safe_not_equal, { isShown: 0 }, add_css$4);

		dispatch_dev("SvelteRegisterComponent", {
			component: this,
			tagName: "Spoiler",
			options,
			id: create_fragment$b.name
		});
	}

	get isShown() {
		throw new Error("<Spoiler>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	set isShown(value) {
		throw new Error("<Spoiler>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}
}

/* svelte/Puzzles.svelte generated by Svelte v4.2.18 */

const { Map: Map_1 } = globals;
const file$9 = "svelte/Puzzles.svelte";

function add_css$3(target) {
	append_styles(target, "svelte-1oimmcd", ".puzzle-id.svelte-1oimmcd{font-family:monospace}\n/*# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiUHV6emxlcy5zdmVsdGUiLCJzb3VyY2VzIjpbIlB1enpsZXMuc3ZlbHRlIl0sInNvdXJjZXNDb250ZW50IjpbIjxzY3JpcHQ+XG4gIGltcG9ydCBDaGVzc2JvYXJkIGZyb20gXCIuL2NvbXBvbmVudHMvQ2hlc3Nib2FyZC5zdmVsdGVcIjtcbiAgaW1wb3J0IHsgb25Nb3VudCB9IGZyb20gXCJzdmVsdGVcIjtcbiAgaW1wb3J0IHsgZmFkZSB9IGZyb20gXCJzdmVsdGUvdHJhbnNpdGlvblwiO1xuICBpbXBvcnQgeyBmbGlwIH0gZnJvbSBcInN2ZWx0ZS9hbmltYXRlXCI7XG4gIGltcG9ydCB7IFV0aWwgfSBmcm9tIFwic3JjL3V0aWxcIjtcbiAgaW1wb3J0IHsgcGVyc2lzdGVkIH0gZnJvbSBcInN2ZWx0ZS1wZXJzaXN0ZWQtc3RvcmVcIjtcbiAgaW1wb3J0IHsgQ2hlc3MgfSBmcm9tIFwiY2hlc3MuanNcIjtcbiAgaW1wb3J0IFB1enpsZUhpc3RvcnlQcm9jZXNzb3IgZnJvbSBcIi4vY29tcG9uZW50cy9QdXp6bGVIaXN0b3J5UHJvY2Vzc29yLnN2ZWx0ZVwiO1xuICBpbXBvcnQgQ29sbGFwc2libGVCb3ggZnJvbSBcIi4vY29tcG9uZW50cy9Db2xsYXBzaWJsZUJveC5zdmVsdGVcIjtcbiAgaW1wb3J0IFNwb2lsZXIgZnJvbSBcIi4vY29tcG9uZW50cy9TcG9pbGVyLnN2ZWx0ZVwiO1xuXG4gIGNsYXNzIFJlc3VsdCB7XG4gICAgY29uc3RydWN0b3IocHV6emxlSWQsIHNlZW5BdCwgc2tpcHBlZCwgbWFkZU1pc3Rha2UgPSBmYWxzZSwgZG9uZUF0ID0gbnVsbCkge1xuICAgICAgdGhpcy5wdXp6bGVJZCA9IHB1enpsZUlkO1xuICAgICAgdGhpcy5za2lwcGVkID0gc2tpcHBlZDtcbiAgICAgIHRoaXMubWFkZU1pc3Rha2UgPSBtYWRlTWlzdGFrZTtcbiAgICAgIHRoaXMuc2VlbkF0ID0gc2VlbkF0O1xuICAgICAgdGhpcy5kb25lQXQgPSBkb25lQXQ7XG4gICAgfVxuXG4gICAgZ2V0RHVyYXRpb24oKSB7XG4gICAgICBpZiAodGhpcy5kb25lQXQpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuZG9uZUF0IC0gdGhpcy5zZWVuQXQ7XG4gICAgICB9XG4gICAgfVxuXG4gICAgd2FzU3VjY2Vzc2Z1bCgpIHtcbiAgICAgIHJldHVybiAhdGhpcy5za2lwcGVkICYmICF0aGlzLm1hZGVNaXN0YWtlICYmIHRoaXMuZG9uZUF0O1xuICAgIH1cblxuICAgIHdhc0ZhaWx1cmUoKSB7XG4gICAgICByZXR1cm4gdGhpcy5tYWRlTWlzdGFrZTtcbiAgICB9XG4gIH1cblxuICBjbGFzcyBQdXp6bGUge1xuICAgIGNvbnN0cnVjdG9yKHB1enpsZUlkKSB7XG4gICAgICB0aGlzLnB1enpsZUlkID0gcHV6emxlSWQ7XG4gICAgfVxuXG4gICAgbGljaGVzc1VybCgpIHtcbiAgICAgIHJldHVybiBgaHR0cHM6Ly9saWNoZXNzLm9yZy90cmFpbmluZy8ke3RoaXMucHV6emxlSWR9YDtcbiAgICB9XG5cbiAgICBoYXNSZXN1bHRzKCkge1xuICAgICAgcmV0dXJuIHRoaXMuZ2V0UmVzdWx0cygpLmxlbmd0aCA+PSAxO1xuICAgIH1cblxuICAgIGhhc0JlZW5Tb2x2ZWQoKSB7XG4gICAgICBpZiAoIXRoaXMuaGFzUmVzdWx0cygpKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICAgIHJldHVybiB0aGlzLmdldFJlc3VsdHMoKS5zb21lKChyZXN1bHQpID0+IHtcbiAgICAgICAgcmV0dXJuIHJlc3VsdC53YXNTdWNjZXNzZnVsKCk7XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICBnZXRSZXN1bHRzKCkge1xuICAgICAgcmV0dXJuICgkcmVzdWx0c1t0aGlzLnB1enpsZUlkXSB8fCBbXSkubWFwKFxuICAgICAgICAocmVzdWx0RGF0YSkgPT5cbiAgICAgICAgICBuZXcgUmVzdWx0KFxuICAgICAgICAgICAgcmVzdWx0RGF0YS5wdXp6bGVJZCxcbiAgICAgICAgICAgIHJlc3VsdERhdGEuc2VlbkF0LFxuICAgICAgICAgICAgcmVzdWx0RGF0YS5za2lwcGVkLFxuICAgICAgICAgICAgcmVzdWx0RGF0YS5tYWRlTWlzdGFrZSxcbiAgICAgICAgICAgIHJlc3VsdERhdGEuZG9uZUF0LFxuICAgICAgICAgICksXG4gICAgICApO1xuICAgIH1cblxuICAgIGdldFRvdGFsU29sdmVzKCkge1xuICAgICAgcmV0dXJuIHRoaXMuZ2V0UmVzdWx0cygpLmZpbHRlcigocmVzdWx0KSA9PiByZXN1bHQud2FzU3VjY2Vzc2Z1bCgpKVxuICAgICAgICAubGVuZ3RoO1xuICAgIH1cblxuICAgIGdldEZhaWx1cmVDb3VudCgpIHtcbiAgICAgIHJldHVybiB0aGlzLmdldFJlc3VsdHMoKS5maWx0ZXIoKHJlc3VsdCkgPT4gcmVzdWx0Lndhc0ZhaWx1cmUoKSkubGVuZ3RoO1xuICAgIH1cblxuICAgIGdldFNvbHZlU3RyZWFrKCkge1xuICAgICAgbGV0IHN0cmVhayA9IDA7XG5cbiAgICAgIGlmICghdGhpcy5oYXNCZWVuU29sdmVkKCkpIHtcbiAgICAgICAgcmV0dXJuIHN0cmVhaztcbiAgICAgIH1cblxuICAgICAgY29uc3QgcmVzdWx0cyA9IHRoaXMuZ2V0UmVzdWx0cygpO1xuXG4gICAgICBmb3IgKGxldCBpID0gcmVzdWx0cy5sZW5ndGggLSAxOyBpID49IDA7IGktLSkge1xuICAgICAgICBpZiAocmVzdWx0c1tpXS53YXNTdWNjZXNzZnVsKCkpIHtcbiAgICAgICAgICBzdHJlYWsrKztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICByZXR1cm4gc3RyZWFrO1xuICAgIH1cblxuICAgIGF2ZXJhZ2VTb2x2ZVRpbWUoKSB7XG4gICAgICBpZiAoIXRoaXMuaGFzQmVlblNvbHZlZCgpKSB7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfVxuICAgICAgY29uc3Qgc3VjY2Vzc2Z1bFJlc3VsdHMgPSB0aGlzLmdldFJlc3VsdHMoKS5maWx0ZXIoKHJlc3VsdCkgPT5cbiAgICAgICAgcmVzdWx0Lndhc1N1Y2Nlc3NmdWwoKSxcbiAgICAgICk7XG4gICAgICBjb25zdCBsYXN0RmV3ID0gc3VjY2Vzc2Z1bFJlc3VsdHMuc2xpY2UobWluaW11bVNvbHZlcyAqIC0xKTtcbiAgICAgIGNvbnN0IGR1cmF0aW9ucyA9IGxhc3RGZXcubWFwKChyZXN1bHQpID0+IHJlc3VsdC5nZXREdXJhdGlvbigpKTtcbiAgICAgIGNvbnN0IHN1bSA9IGR1cmF0aW9ucy5yZWR1Y2UoKGEsIGIpID0+IGEgKyBiLCAwKTtcbiAgICAgIGNvbnN0IGF2ZXJhZ2UgPSBzdW0gLyAobGFzdEZldy5sZW5ndGggfHwgMSk7XG4gICAgICByZXR1cm4gYXZlcmFnZTtcbiAgICB9XG5cbiAgICBsYXN0U2VlbkF0KCkge1xuICAgICAgaWYgKCF0aGlzLmhhc1Jlc3VsdHMoKSkge1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHRoaXMuZ2V0UmVzdWx0cygpLnNsaWNlKC0xKS5zZWVuQXQ7XG4gICAgfVxuXG4gICAgaXNDb21wbGV0ZSgpIHtcbiAgICAgIGlmICghdGhpcy5oYXNCZWVuU29sdmVkKCkpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgICAgY29uc3QgbGFzdFNvbHZlcyA9IHRoaXMuZ2V0UmVzdWx0cygpLnNsaWNlKC0xICogbWluaW11bVNvbHZlcyk7XG5cbiAgICAgIGlmIChsYXN0U29sdmVzLmxlbmd0aCA8IG1pbmltdW1Tb2x2ZXMpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuXG4gICAgICBpZiAoIWxhc3RTb2x2ZXMuZXZlcnkoKHJlc3VsdCkgPT4gcmVzdWx0Lndhc1N1Y2Nlc3NmdWwoKSkpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gdGhpcy5hdmVyYWdlU29sdmVUaW1lKCkgPD0gdGltZUdvYWw7XG4gICAgfVxuICB9XG5cbiAgLy8gQ2hlc3MgYm9hcmQgc3R1ZmZcbiAgbGV0IGZlbjtcbiAgbGV0IGxhc3RNb3ZlO1xuICBsZXQgY2hlc3Nib2FyZDtcbiAgbGV0IG9yaWVudGF0aW9uID0gXCJ3aGl0ZVwiO1xuICBsZXQgY2hlc3Nncm91bmRDb25maWcgPSB7XG4gICAgY29vcmRpbmF0ZXM6IHRydWUsXG4gICAgYW5pbWF0aW9uOiB7XG4gICAgICBlbmFibGVkOiB0cnVlLFxuICAgIH0sXG4gICAgaGlnaGxpZ2h0OiB7XG4gICAgICBsYXN0TW92ZTogdHJ1ZSxcbiAgICAgIGNoZWNrOiB0cnVlLFxuICAgIH0sXG4gICAgZHJhZ2dhYmxlOiB7XG4gICAgICBlbmFibGVkOiB0cnVlLFxuICAgIH0sXG4gICAgc2VsZWN0YWJsZToge1xuICAgICAgZW5hYmxlZDogdHJ1ZSxcbiAgICB9LFxuICAgIG1vdmFibGU6IHtcbiAgICAgIGZyZWU6IGZhbHNlLFxuICAgICAgY29sb3I6IFwiYm90aFwiLFxuICAgICAgZGVzdHM6IG5ldyBNYXAoKSxcbiAgICB9LFxuICAgIG9yaWVudGF0aW9uOiBvcmllbnRhdGlvbixcbiAgfTtcblxuICAvLyBQdXp6bGUgRGF0YVxuICBsZXQgYWxsUHV6emxlcyA9IFtdO1xuICBsZXQgYWN0aXZlUHV6emxlcyA9IFtdO1xuXG4gICQ6IHtcbiAgICBpZiAoYWN0aXZlUHV6emxlcy5sZW5ndGggPCBiYXRjaFNpemUgJiYgYWxsUHV6emxlcy5sZW5ndGggPiAwKSB7XG4gICAgICBmaWxsQWN0aXZlUHV6emxlcygpO1xuICAgIH1cbiAgfVxuXG4gIGxldCBjb21wbGV0ZWRQdXp6bGVzID0gW107XG4gIGxldCBjdXJyZW50UHV6emxlO1xuICBsZXQgcHV6emxlU2hvd25BdDtcblxuICAvLyBCZWhhdmlvcmFsIENvbmZpZ1xuICBsZXQgYmF0Y2hTaXplID0gMTA7XG4gIGxldCB0aW1lR29hbCA9IDE1MDAwO1xuICBsZXQgbWluaW11bVNvbHZlcyA9IDI7XG4gIGxldCBhbHJlYWR5Q29tcGxldGVPZGRzID0gMC4zO1xuXG4gIC8vIEN1cnJlbnQgcHV6emxlIHN0YXRlXG4gIGxldCBtb3ZlcztcbiAgbGV0IG1hZGVNaXN0YWtlID0gZmFsc2U7XG4gIGxldCBwdXp6bGVDb21wbGV0ZSA9IGZhbHNlO1xuXG4gIC8vIERPTSBlbGVtZW50c1xuICBsZXQgbmV4dEJ1dHRvbjtcblxuICAvLyBQZXJzaXN0ZWQgZGF0YVxuICBjb25zdCBwdXp6bGVEYXRhU3RvcmUgPSBwZXJzaXN0ZWQoXCJwdXp6bGVzLmRhdGFcIiwge30pO1xuICBjb25zdCBwdXp6bGVJZHNUb1dvcmtPbiA9IHBlcnNpc3RlZChcInB1enpsZXMuaWRzVG9Xb3JrT25cIiwgW10pO1xuICBjb25zdCByZXN1bHRzID0gcGVyc2lzdGVkKFwicHV6emxlcy5yZXN1bHRzXCIsIHt9KTtcblxuICBmdW5jdGlvbiBmaWxsQWN0aXZlUHV6emxlcygpIHtcbiAgICBjb25zdCBjb21wbGV0ZWQgPSBVdGlsLnNvcnRSYW5kb21seShnZXRDb21wbGV0ZWRQdXp6bGVzKCkpO1xuICAgIGNvbnN0IGluY29tcGxldGVJbmFjdGl2ZSA9IFV0aWwuc29ydFJhbmRvbWx5KGdldEluYWN0aXZlQ29tcGxldGVkUHV6emxlcygpKTtcbiAgICBsZXQgcHV6emxlVHlwZTtcbiAgICB3aGlsZSAoYWxsUHV6emxlcy5sZW5ndGggPiAwICYmIGFjdGl2ZVB1enpsZXMubGVuZ3RoIDwgYmF0Y2hTaXplKSB7XG4gICAgICBwdXp6bGVUeXBlID0gTWF0aC5yYW5kb20oKSA8IDAuMiA/IFwiY29tcGxldGVkXCIgOiBcImluYWN0aXZlXCI7XG4gICAgICBpZiAoaW5jb21wbGV0ZUluYWN0aXZlLmxlbmd0aCA8IDEgJiYgY29tcGxldGVkLmxlbmd0aCA8IDEpIHtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgICBpZiAocHV6emxlVHlwZSA9PT0gXCJjb21wbGV0ZWRcIiAmJiBjb21wbGV0ZWQubGVuZ3RoID4gMCkge1xuICAgICAgICBhZGRBY3RpdmVQdXp6bGUoY29tcGxldGVkLnBvcCgpKTtcbiAgICAgIH0gZWxzZSBpZiAoaW5jb21wbGV0ZUluYWN0aXZlLmxlbmd0aCA+IDApIHtcbiAgICAgICAgYWRkQWN0aXZlUHV6emxlKGluY29tcGxldGVJbmFjdGl2ZS5wb3AoKSk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLy8gVGhpcyBpcyB0aWVkIHRvIHRoZSBhZGQgbmV3IHB1enpsZSBmb3JtXG4gIGxldCBuZXdQdXp6bGVJZHM7XG5cbiAgZnVuY3Rpb24gYWRkUHV6emxlSWRUb1dvcmtPbigpIHtcbiAgICBpZiAobmV3UHV6emxlSWRzLmxlbmd0aCA8IDMpIHtcbiAgICAgIG5ld1B1enpsZUlkcyA9IFwiXCI7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGNvbnN0IGlkc1RvQWRkID0gbmV3UHV6emxlSWRzLnNwbGl0KFwiLFwiKS5tYXAoKGlkKSA9PiBpZC50cmltKCkpO1xuICAgIGNvbnN0IGN1cnJlbnRQdXp6bGVJZHMgPSBuZXcgU2V0KCRwdXp6bGVJZHNUb1dvcmtPbik7XG4gICAgaWRzVG9BZGQuZm9yRWFjaCgoaWQpID0+IGN1cnJlbnRQdXp6bGVJZHMuYWRkKGlkKSk7XG4gICAgcHV6emxlSWRzVG9Xb3JrT24uc2V0KFsuLi5jdXJyZW50UHV6emxlSWRzXSk7XG4gICAgbmV3UHV6emxlSWRzID0gXCJcIjtcbiAgfVxuXG4gIGZ1bmN0aW9uIHJlbW92ZVB1enpsZUlkKHB1enpsZUlkKSB7XG4gICAgY29uc3QgY3VycmVudFB1enpsZUlkcyA9IG5ldyBTZXQoJHB1enpsZUlkc1RvV29ya09uKTtcbiAgICBjdXJyZW50UHV6emxlSWRzLmRlbGV0ZShwdXp6bGVJZC50cmltKCkpO1xuICAgIHB1enpsZUlkc1RvV29ya09uLnNldChbLi4uY3VycmVudFB1enpsZUlkc10pO1xuICB9XG5cbiAgZnVuY3Rpb24gYWRkQWN0aXZlUHV6emxlKHB1enpsZSkge1xuICAgIGFjdGl2ZVB1enpsZXMgPSBbXG4gICAgICAuLi5uZXcgU2V0KFtcbiAgICAgICAgLi4uYWN0aXZlUHV6emxlcy5tYXAoKHB1enpsZSkgPT4gcHV6emxlLnB1enpsZUlkKSxcbiAgICAgICAgcHV6emxlLnB1enpsZUlkLFxuICAgICAgXSksXG4gICAgXS5tYXAoKHB1enpsZUlkKSA9PiBuZXcgUHV6emxlKHB1enpsZUlkKSk7XG4gIH1cblxuICBmdW5jdGlvbiByZW1vdmVBY3RpdmVQdXp6bGUocHV6emxlKSB7XG4gICAgYWN0aXZlUHV6emxlcyA9IGFjdGl2ZVB1enpsZXMuZmlsdGVyKFxuICAgICAgKGFjdGl2ZVB1enpsZSkgPT4gYWN0aXZlUHV6emxlLnB1enpsZUlkICE9PSBwdXp6bGUucHV6emxlSWQsXG4gICAgKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGdldENvbXBsZXRlZFB1enpsZXMoKSB7XG4gICAgcmV0dXJuIGFsbFB1enpsZXMuZmlsdGVyKChwdXp6bGUpID0+IHB1enpsZS5pc0NvbXBsZXRlKCkpO1xuICB9XG5cbiAgZnVuY3Rpb24gZ2V0SW5jb21wbGV0ZVB1enpsZXMoKSB7XG4gICAgcmV0dXJuIGFsbFB1enpsZXMuZmlsdGVyKChwdXp6bGUpID0+ICFwdXp6bGUuaXNDb21wbGV0ZSgpKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGdldEluYWN0aXZlQ29tcGxldGVkUHV6emxlcygpIHtcbiAgICByZXR1cm4gZ2V0SW5jb21wbGV0ZVB1enpsZXMoKS5maWx0ZXIoXG4gICAgICAocHV6emxlKSA9PiAhYWN0aXZlUHV6emxlcy5pbmNsdWRlcyhwdXp6bGUpLFxuICAgICk7XG4gIH1cblxuICBmdW5jdGlvbiBzb3J0UHV6emxlc0J5U29sdmVUaW1lKGEsIGIpIHtcbiAgICBjb25zdCBhVGltZSA9IGEuYXZlcmFnZVNvbHZlVGltZSgpO1xuICAgIGNvbnN0IGJUaW1lID0gYi5hdmVyYWdlU29sdmVUaW1lKCk7XG5cbiAgICBpZiAoYVRpbWUgPT09IG51bGwgJiYgYlRpbWUgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiAwO1xuICAgIH1cbiAgICBpZiAoYVRpbWUgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiAxO1xuICAgIH1cbiAgICBpZiAoYlRpbWUgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiAtMTtcbiAgICB9XG4gICAgcmV0dXJuIGFUaW1lIC0gYlRpbWU7XG4gIH1cblxuICBhc3luYyBmdW5jdGlvbiBnZXROZXh0UHV6emxlKCkge1xuICAgIGNvbnN0IHByZXZpb3VzID0gY3VycmVudFB1enpsZSA/IGN1cnJlbnRQdXp6bGUucHV6emxlSWQgOiBudWxsO1xuXG4gICAgY29uc3QgdHlwZSA9IGdldE5leHRQdXp6bGVUeXBlKCk7XG5cbiAgICBjb25zdCBhbHJlYWR5Q29tcGxldGUgPSBhY3RpdmVQdXp6bGVzLmZpbHRlcigocHV6emxlKSA9PlxuICAgICAgcHV6emxlLmlzQ29tcGxldGUoKSxcbiAgICApO1xuICAgIGNvbnN0IGluY29tcGxldGUgPSBhY3RpdmVQdXp6bGVzLmZpbHRlcigocHV6emxlKSA9PiAhcHV6emxlLmlzQ29tcGxldGUoKSk7XG5cbiAgICBsZXQgY2FuZGlkYXRlUHV6emxlO1xuICAgIGlmIChcbiAgICAgICh0eXBlID09PSBcImFscmVhZHlDb21wbGV0ZVwiICYmIGFscmVhZHlDb21wbGV0ZS5sZW5ndGggPiAwKSB8fFxuICAgICAgaW5jb21wbGV0ZS5sZW5ndGggPCAxXG4gICAgKSB7XG4gICAgICBjYW5kaWRhdGVQdXp6bGUgPSBVdGlsLmdldFJhbmRvbUVsZW1lbnQoYWN0aXZlUHV6emxlcyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNhbmRpZGF0ZVB1enpsZSA9IFV0aWwuZ2V0UmFuZG9tRWxlbWVudChpbmNvbXBsZXRlKTtcbiAgICB9XG5cbiAgICBpZiAoYWN0aXZlUHV6emxlcy5sZW5ndGggPiAxICYmIGNhbmRpZGF0ZVB1enpsZS5wdXp6bGVJZCA9PT0gcHJldmlvdXMpIHtcbiAgICAgIHJldHVybiBnZXROZXh0UHV6emxlKCk7XG4gICAgfVxuXG4gICAgY3VycmVudFB1enpsZSA9IGFsbFB1enpsZXMuZmluZChcbiAgICAgIChwdXp6bGUpID0+IHB1enpsZS5wdXp6bGVJZCA9PT0gY2FuZGlkYXRlUHV6emxlLnB1enpsZUlkLFxuICAgICk7XG5cbiAgICBjb25zdCBkYXRhID0gYXdhaXQgZ2V0UHV6emxlRGF0YShjdXJyZW50UHV6emxlLnB1enpsZUlkKTtcblxuICAgIGlmIChkYXRhID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gZ2V0TmV4dFB1enpsZSgpO1xuICAgIH1cblxuICAgIHJldHVybiBkYXRhO1xuICB9XG5cbiAgYXN5bmMgZnVuY3Rpb24gZ2V0UHV6emxlRGF0YShwdXp6bGVJZCkge1xuICAgIC8vIENoZWNrIGNhY2hlIGZpcnN0XG4gICAgaWYgKCRwdXp6bGVEYXRhU3RvcmVbcHV6emxlSWRdKSB7XG4gICAgICByZXR1cm4gJHB1enpsZURhdGFTdG9yZVtwdXp6bGVJZF07XG4gICAgfVxuXG4gICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBmZXRjaChgaHR0cHM6Ly9saWNoZXNzLm9yZy9hcGkvcHV6emxlLyR7cHV6emxlSWR9YCk7XG5cbiAgICBpZiAocmVzcG9uc2Uuc3RhdHVzID09PSA0MDQpIHtcbiAgICAgIC8vIFJlbW92ZSBpbnZhbGlkXG4gICAgICByZW1vdmVQdXp6bGVJZChwdXp6bGVJZCk7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICBjb25zdCBwdXp6bGVEYXRhID0gYXdhaXQgcmVzcG9uc2UuanNvbigpO1xuICAgIGNvbnN0IGRhdGEgPSAkcHV6emxlRGF0YVN0b3JlO1xuICAgIGRhdGFbY3VycmVudFB1enpsZS5wdXp6bGVJZF0gPSBwdXp6bGVEYXRhO1xuICAgIHB1enpsZURhdGFTdG9yZS5zZXQoZGF0YSk7XG4gICAgcmV0dXJuIHB1enpsZURhdGE7XG4gIH1cblxuICBmdW5jdGlvbiBnZXROZXh0UHV6emxlVHlwZSgpIHtcbiAgICBjb25zdCByYW5kb21WYWx1ZSA9IE1hdGgucmFuZG9tKCk7XG4gICAgaWYgKHJhbmRvbVZhbHVlIDwgYWxyZWFkeUNvbXBsZXRlT2Rkcykge1xuICAgICAgcmV0dXJuIFwiYWxyZWFkeUNvbXBsZXRlXCI7XG4gICAgfVxuICAgIHJldHVybiBcImluY29tcGxldGVcIjtcbiAgfVxuXG4gIGFzeW5jIGZ1bmN0aW9uIHNraXAoKSB7XG4gICAgY29uc3QgcmVzdWx0ID0gbmV3IFJlc3VsdChjdXJyZW50UHV6emxlLnB1enpsZUlkLCBwdXp6bGVTaG93bkF0LCB0cnVlKTtcbiAgICBhZGRSZXN1bHQoY3VycmVudFB1enpsZS5wdXp6bGVJZCwgcmVzdWx0KTtcbiAgICBhd2FpdCBsb2FkTmV4dFB1enpsZSgpO1xuICB9XG5cbiAgZnVuY3Rpb24gYWRkUmVzdWx0KHB1enpsZUlkLCByZXN1bHQpIHtcbiAgICBjb25zdCBhbGxSZXN1bHRzID0gJHJlc3VsdHM7XG4gICAgY29uc3QgZXhpc3RpbmdSZXN1bHRzID0gJHJlc3VsdHNbcHV6emxlSWRdIHx8IFtdO1xuICAgIGV4aXN0aW5nUmVzdWx0cy5wdXNoKHJlc3VsdCk7XG4gICAgYWxsUmVzdWx0c1twdXp6bGVJZF0gPSBleGlzdGluZ1Jlc3VsdHM7XG4gICAgcmVzdWx0cy5zZXQoYWxsUmVzdWx0cyk7XG4gIH1cblxuICBmdW5jdGlvbiBhZGRDb21wbGV0ZWRQdXp6bGUocHV6emxlVG9BZGQpIHtcbiAgICBjb21wbGV0ZWRQdXp6bGVzID0gW1xuICAgICAgLi4ubmV3IFNldChbXG4gICAgICAgIC4uLmdldENvbXBsZXRlZFB1enpsZXMoKS5tYXAoKHB1enpsZSkgPT4gcHV6emxlLnB1enpsZUlkKSxcbiAgICAgICAgcHV6emxlVG9BZGQucHV6emxlSWQsXG4gICAgICBdKSxcbiAgICBdLm1hcCgocHV6emxlSWQpID0+IG5ldyBQdXp6bGUocHV6emxlSWQpKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHJlbW92ZUNvbXBsZXRlZFB1enpsZShwdXp6bGVUb1JlbW92ZSkge1xuICAgIGNvbXBsZXRlZFB1enpsZXMgPSBjb21wbGV0ZWRQdXp6bGVzLmZpbHRlcihcbiAgICAgIChwdXp6bGUpID0+IHB1enpsZS5wdXp6bGVJZCAhPT0gcHV6emxlVG9SZW1vdmUucHV6emxlSWQsXG4gICAgKTtcbiAgfVxuXG4gIGFzeW5jIGZ1bmN0aW9uIGxvYWROZXh0UHV6emxlKCkge1xuICAgIHB1enpsZUNvbXBsZXRlID0gZmFsc2U7XG4gICAgbWFkZU1pc3Rha2UgPSBmYWxzZTtcblxuICAgIGlmIChjdXJyZW50UHV6emxlICYmIGN1cnJlbnRQdXp6bGUuaXNDb21wbGV0ZSgpKSB7XG4gICAgICByZW1vdmVBY3RpdmVQdXp6bGUoY3VycmVudFB1enpsZSk7XG4gICAgICBhZGRDb21wbGV0ZWRQdXp6bGUoY3VycmVudFB1enpsZSk7XG4gICAgfVxuXG4gICAgY29uc3QgbmV4dCA9IGF3YWl0IGdldE5leHRQdXp6bGUoKTtcbiAgICBvcmllbnRhdGlvbiA9IFV0aWwud2hvc2VNb3ZlSXNJdChuZXh0LnB1enpsZS5pbml0aWFsUGx5ICsgMSk7XG4gICAgLy8gQ2xvbmUgc28gd2UgZG9uJ3QgY2FjaGUgYSB2YWx1ZSB0aGF0IGdldHMgc2hpZnRlZCBsYXRlclxuICAgIG1vdmVzID0gWy4uLm5leHQucHV6emxlLnNvbHV0aW9uXTtcblxuICAgIGNvbnN0IGNoZXNzSW5zdGFuY2UgPSBuZXcgQ2hlc3MoKTtcbiAgICBjaGVzc0luc3RhbmNlLmxvYWRQZ24obmV4dC5nYW1lLnBnbik7XG4gICAgY29uc3QgaGlzdG9yeSA9IGNoZXNzSW5zdGFuY2UuaGlzdG9yeSh7IHZlcmJvc2U6IHRydWUgfSk7XG4gICAgbGFzdE1vdmUgPSBoaXN0b3J5W2hpc3RvcnkubGVuZ3RoIC0gMV07XG4gICAgZmVuID0gY2hlc3NJbnN0YW5jZS5mZW4oKTtcblxuICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgcHV6emxlU2hvd25BdCA9IFV0aWwuY3VycmVudE1pY3JvdGltZSgpO1xuICAgIH0sIDMwMCk7XG4gIH1cblxuICBmdW5jdGlvbiBoYW5kbGVVc2VyTW92ZShtb3ZlRXZlbnQpIHtcbiAgICBjb25zdCBtb3ZlID0gbW92ZUV2ZW50LmRldGFpbC5tb3ZlO1xuICAgIGNvbnN0IGlzQ2hlY2ttYXRlID0gbW92ZUV2ZW50LmRldGFpbC5pc0NoZWNrbWF0ZTtcbiAgICBjb25zdCBjb3JyZWN0TW92ZSA9IG1vdmVzWzBdO1xuICAgIGlmIChtb3ZlLmxhbiA9PT0gY29ycmVjdE1vdmUgfHwgaXNDaGVja21hdGUpIHtcbiAgICAgIG1vdmVzLnNoaWZ0KCk7IC8vIHJlbW92ZSB0aGUgdXNlciBtb3ZlIGZpcnN0XG4gICAgICBjb25zdCBjb21wdXRlck1vdmUgPSBtb3Zlcy5zaGlmdCgpO1xuICAgICAgaWYgKGNvbXB1dGVyTW92ZSkge1xuICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICBjaGVzc2JvYXJkLm1vdmUoY29tcHV0ZXJNb3ZlKTtcbiAgICAgICAgfSwgMzAwKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBoYW5kbGVQdXp6bGVDb21wbGV0ZSgpO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBtYWRlTWlzdGFrZSA9IHRydWU7XG4gICAgICBzaG93RmFpbHVyZShcIk5vcGUhXCIpO1xuICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgIGNoZXNzYm9hcmQudW5kbygpO1xuICAgICAgfSwgMzAwKTtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBoYW5kbGVQdXp6bGVDb21wbGV0ZSgpIHtcbiAgICBwdXp6bGVDb21wbGV0ZSA9IHRydWU7XG4gICAgY29uc3QgcmVzdWx0ID0gbmV3IFJlc3VsdChcbiAgICAgIGN1cnJlbnRQdXp6bGUucHV6emxlSWQsXG4gICAgICBwdXp6bGVTaG93bkF0LFxuICAgICAgZmFsc2UsXG4gICAgICBtYWRlTWlzdGFrZSxcbiAgICAgIFV0aWwuY3VycmVudE1pY3JvdGltZSgpLFxuICAgICk7XG4gICAgYWRkUmVzdWx0KGN1cnJlbnRQdXp6bGUucHV6emxlSWQsIHJlc3VsdCk7XG4gICAgaWYgKG1hZGVNaXN0YWtlKSB7XG4gICAgICByZW1vdmVDb21wbGV0ZWRQdXp6bGUoY3VycmVudFB1enpsZSk7XG4gICAgfVxuICAgIC8vIFRyaWdnZXIgcmVhY3Rpdml0eVxuICAgIGFjdGl2ZVB1enpsZXMgPSBhY3RpdmVQdXp6bGVzO1xuICAgIHNob3dTdWNjZXNzKFwiQ29ycmVjdCFcIik7XG4gIH1cblxuICBsZXQgc3VjY2Vzc01lc3NhZ2UgPSBudWxsO1xuXG4gIGZ1bmN0aW9uIHNob3dTdWNjZXNzKG1lc3NhZ2UsIGR1cmF0aW9uID0gMTUwMCkge1xuICAgIGZhaWx1cmVNZXNzYWdlID0gbnVsbDtcbiAgICBzdWNjZXNzTWVzc2FnZSA9IG1lc3NhZ2U7XG4gICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICBzdWNjZXNzTWVzc2FnZSA9IG51bGw7XG4gICAgfSwgZHVyYXRpb24pO1xuICB9XG5cbiAgbGV0IGZhaWx1cmVNZXNzYWdlID0gbnVsbDtcblxuICBmdW5jdGlvbiBzaG93RmFpbHVyZShtZXNzYWdlLCBkdXJhdGlvbiA9IDEwMDApIHtcbiAgICBzdWNjZXNzTWVzc2FnZSA9IG51bGw7XG4gICAgZmFpbHVyZU1lc3NhZ2UgPSBtZXNzYWdlO1xuICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgZmFpbHVyZU1lc3NhZ2UgPSBudWxsO1xuICAgIH0sIGR1cmF0aW9uKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGluaXRpYWxpemVQdXp6bGVzKCkge1xuICAgIGFsbFB1enpsZXMgPSBbXTtcbiAgICAkcHV6emxlSWRzVG9Xb3JrT24uZm9yRWFjaCgocHV6emxlSWQpID0+IHtcbiAgICAgIGFsbFB1enpsZXMucHVzaChuZXcgUHV6emxlKHB1enpsZUlkKSk7XG4gICAgfSk7XG4gICAgY29tcGxldGVkUHV6emxlcyA9IGdldENvbXBsZXRlZFB1enpsZXMoKTtcbiAgICBmaWxsQWN0aXZlUHV6emxlcygpO1xuICB9XG5cbiAgb25Nb3VudChhc3luYyAoKSA9PiB7XG4gICAgaW5pdGlhbGl6ZVB1enpsZXMoKTtcbiAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKFwia2V5ZG93blwiLCBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAgIGlmIChbXCJFbnRlclwiLCBcIiBcIl0uaW5jbHVkZXMoZXZlbnQua2V5KSAmJiBuZXh0QnV0dG9uKSB7XG4gICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIG5leHRCdXR0b24uY2xpY2soKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICBhd2FpdCBsb2FkTmV4dFB1enpsZSgpO1xuICB9KTtcbjwvc2NyaXB0PlxuXG48ZGl2IGNsYXNzPVwiY29sdW1ucyBpcy1jZW50ZXJlZFwiPlxuICA8ZGl2IGNsYXNzPVwiY29sdW1uIGlzLTYtZGVza3RvcFwiPlxuICAgIDxkaXYgY2xhc3M9XCJibG9ja1wiPlxuICAgICAgeyNpZiBhY3RpdmVQdXp6bGVzLmxlbmd0aCA+IDAgJiYgY3VycmVudFB1enpsZX1cbiAgICAgICAgPENoZXNzYm9hcmRcbiAgICAgICAgICB7ZmVufVxuICAgICAgICAgIHtsYXN0TW92ZX1cbiAgICAgICAgICB7Y2hlc3Nncm91bmRDb25maWd9XG4gICAgICAgICAge29yaWVudGF0aW9ufVxuICAgICAgICAgIGJpbmQ6dGhpcz17Y2hlc3Nib2FyZH1cbiAgICAgICAgICBvbjptb3ZlPXtoYW5kbGVVc2VyTW92ZX1cbiAgICAgICAgPlxuICAgICAgICAgIDxkaXYgc2xvdD1cImNlbnRlcmVkLWNvbnRlbnRcIj5cbiAgICAgICAgICAgIHsjaWYgc3VjY2Vzc01lc3NhZ2V9XG4gICAgICAgICAgICAgIDxzcGFuIHRyYW5zaXRpb246ZmFkZSBjbGFzcz1cInRhZyBpcy1zdWNjZXNzIGlzLXNpemUtNFwiPlxuICAgICAgICAgICAgICAgIHtzdWNjZXNzTWVzc2FnZX1cbiAgICAgICAgICAgICAgPC9zcGFuPlxuICAgICAgICAgICAgey9pZn1cbiAgICAgICAgICAgIHsjaWYgZmFpbHVyZU1lc3NhZ2V9XG4gICAgICAgICAgICAgIDxzcGFuIHRyYW5zaXRpb246ZmFkZSBjbGFzcz1cInRhZyBpcy1kYW5nZXIgaXMtc2l6ZS00XCI+XG4gICAgICAgICAgICAgICAge2ZhaWx1cmVNZXNzYWdlfVxuICAgICAgICAgICAgICA8L3NwYW4+XG4gICAgICAgICAgICB7L2lmfVxuICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgIDxkaXYgc2xvdD1cImJlbG93LWJvYXJkXCI+XG4gICAgICAgICAgICB7I2lmIHB1enpsZUNvbXBsZXRlfVxuICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiYmxvY2sgaXMtZmxleCBpcy1qdXN0aWZ5LWNvbnRlbnQtY2VudGVyXCI+XG4gICAgICAgICAgICAgICAgPGJ1dHRvblxuICAgICAgICAgICAgICAgICAgY2xhc3M9XCJidXR0b24gaXMtcHJpbWFyeVwiXG4gICAgICAgICAgICAgICAgICBiaW5kOnRoaXM9e25leHRCdXR0b259XG4gICAgICAgICAgICAgICAgICBvbjpjbGljaz17YXN5bmMgKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBhd2FpdCBsb2FkTmV4dFB1enpsZSgpO1xuICAgICAgICAgICAgICAgICAgfX1cbiAgICAgICAgICAgICAgICAgID5OZXh0XG4gICAgICAgICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgey9pZn1cbiAgICAgICAgICAgIHsjaWYgIXB1enpsZUNvbXBsZXRlfVxuICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiYmxvY2sgaXMtZmxleCBpcy1qdXN0aWZ5LWNvbnRlbnQtY2VudGVyXCI+XG4gICAgICAgICAgICAgICAgPHNwYW4gY2xhc3M9XCJ0YWcgaXMte29yaWVudGF0aW9ufSBpcy1zaXplLTRcIlxuICAgICAgICAgICAgICAgICAgPntvcmllbnRhdGlvbn0gdG8gcGxheTwvc3BhblxuICAgICAgICAgICAgICAgID5cbiAgICAgICAgICAgICAgICA8YnV0dG9uIGNsYXNzPVwiYnV0dG9uIGlzLXByaW1hcnlcIiBvbjpjbGljaz17c2tpcH0+U2tpcDwvYnV0dG9uPlxuICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIHsvaWZ9XG4gICAgICAgICAgPC9kaXY+XG4gICAgICAgIDwvQ2hlc3Nib2FyZD5cbiAgICAgIHs6ZWxzZX1cbiAgICAgICAgPHA+QWxsIHB1enpsZXMgY29tcGxldGUsIGFkZCBzb21lIG1vcmUhPC9wPlxuICAgICAgey9pZn1cbiAgICA8L2Rpdj5cbiAgPC9kaXY+XG4gIDxkaXYgY2xhc3M9XCJjb2x1bW4gaXMtNC1kZXNrdG9wXCI+XG4gICAgeyNpZiBhY3RpdmVQdXp6bGVzLmxlbmd0aCA+PSAxICYmIGN1cnJlbnRQdXp6bGV9XG4gICAgICA8ZGl2IGNsYXNzPVwiYm94XCI+XG4gICAgICAgIDxoMz5DdXJyZW50IFB1enpsZXM8L2gzPlxuICAgICAgICA8cD5DdXJyZW50IFB1enpsZTogPHN0cm9uZz57Y3VycmVudFB1enpsZS5wdXp6bGVJZH08L3N0cm9uZz48L3A+XG4gICAgICAgIHsjYXdhaXQgZ2V0UHV6emxlRGF0YShjdXJyZW50UHV6emxlLnB1enpsZUlkKSB0aGVuIGRhdGF9XG4gICAgICAgICAgPHA+XG4gICAgICAgICAgICBSYXRpbmc6IDxTcG9pbGVyIGlzU2hvd249e3B1enpsZUNvbXBsZXRlfVxuICAgICAgICAgICAgICA+e2RhdGEucHV6emxlLnJhdGluZ308L1Nwb2lsZXJcbiAgICAgICAgICAgID5cbiAgICAgICAgICA8L3A+XG4gICAgICAgIHsvYXdhaXR9XG4gICAgICAgIHsjaWYgIXB1enpsZUNvbXBsZXRlICYmIG1vdmVzICYmIG1vdmVzLmxlbmd0aCA+PSAxfVxuICAgICAgICAgIDxwPk5leHQgbW92ZTogPFNwb2lsZXI+e21vdmVzWzBdfTwvU3BvaWxlcj48L3A+XG4gICAgICAgIHsvaWZ9XG4gICAgICAgIDx0YWJsZSBjbGFzcz1cInRhYmxlIGlzLWZ1bGx3aWR0aCBpcy1uYXJyb3cgaXMtc3RyaXBlZFwiPlxuICAgICAgICAgIDx0aGVhZD5cbiAgICAgICAgICAgIDx0cj5cbiAgICAgICAgICAgICAgPHRoPjxhYmJyIHRpdGxlPVwiTGljaGVzcyBQdXp6bGUgSURcIj5JRDwvYWJicj48L3RoPlxuICAgICAgICAgICAgICA8dGg+PGFiYnIgdGl0bGU9XCJBdmVyYWdlIHNvbHZlIHRpbWVcIj5Bdmc8L2FiYnI+PC90aD5cbiAgICAgICAgICAgICAgPHRoPjxhYmJyIHRpdGxlPVwiQ29ycmVjdCBzb2x2ZXMgaW4gYSByb3dcIj5TdHJlYWs8L2FiYnI+PC90aD5cbiAgICAgICAgICAgICAgPHRoPjxhYmJyIHRpdGxlPVwiVG90YWwgY29ycmVjdCBzb2x2ZXNcIj5Tb2x2ZXM8L2FiYnI+PC90aD5cbiAgICAgICAgICAgICAgPHRoPjxhYmJyIHRpdGxlPVwiRmFpbHVyZSBDb3VudFwiPkZhaWxzPC9hYmJyPjwvdGg+XG4gICAgICAgICAgICA8L3RyPlxuICAgICAgICAgIDwvdGhlYWQ+XG4gICAgICAgICAgPHRib2R5PlxuICAgICAgICAgICAgeyNlYWNoIGFjdGl2ZVB1enpsZXMuc29ydChzb3J0UHV6emxlc0J5U29sdmVUaW1lKSBhcyBwdXp6bGUgKHB1enpsZSl9XG4gICAgICAgICAgICAgIDx0clxuICAgICAgICAgICAgICAgIGFuaW1hdGU6ZmxpcD17eyBkdXJhdGlvbjogNDAwIH19XG4gICAgICAgICAgICAgICAgY2xhc3M6aXMtc2VsZWN0ZWQ9e2N1cnJlbnRQdXp6bGUucHV6emxlSWQgPT09IHB1enpsZS5wdXp6bGVJZH1cbiAgICAgICAgICAgICAgPlxuICAgICAgICAgICAgICAgIDx0ZCBjbGFzcz1cInB1enpsZS1pZFwiXG4gICAgICAgICAgICAgICAgICA+PGFcbiAgICAgICAgICAgICAgICAgICAgaHJlZj17cHV6emxlLmxpY2hlc3NVcmwoKX1cbiAgICAgICAgICAgICAgICAgICAgdGFyZ2V0PVwiX2JsYW5rXCJcbiAgICAgICAgICAgICAgICAgICAgdGl0bGU9XCJWaWV3IG9uIGxpY2hlc3Mub3JnXCI+e3B1enpsZS5wdXp6bGVJZH08L2FcbiAgICAgICAgICAgICAgICAgID48L3RkXG4gICAgICAgICAgICAgICAgPlxuICAgICAgICAgICAgICAgIDx0ZFxuICAgICAgICAgICAgICAgICAgY2xhc3M6aGFzLXRleHQtd2FybmluZz17cHV6emxlLmF2ZXJhZ2VTb2x2ZVRpbWUoKSA+IHRpbWVHb2FsfVxuICAgICAgICAgICAgICAgICAgY2xhc3M6aGFzLXRleHQtc3VjY2Vzcz17cHV6emxlLmF2ZXJhZ2VTb2x2ZVRpbWUoKSA8PVxuICAgICAgICAgICAgICAgICAgICB0aW1lR29hbCAmJiBwdXp6bGUuYXZlcmFnZVNvbHZlVGltZSgpID4gMH1cbiAgICAgICAgICAgICAgICA+XG4gICAgICAgICAgICAgICAgICB7cHV6emxlLmF2ZXJhZ2VTb2x2ZVRpbWUoKVxuICAgICAgICAgICAgICAgICAgICA/IGAkeyhwdXp6bGUuYXZlcmFnZVNvbHZlVGltZSgpIC8gMTAwMCkudG9GaXhlZCgyKX1zYFxuICAgICAgICAgICAgICAgICAgICA6IFwiP1wifVxuICAgICAgICAgICAgICAgIDwvdGQ+XG4gICAgICAgICAgICAgICAgPHRkXG4gICAgICAgICAgICAgICAgICBjbGFzczpoYXMtdGV4dC13YXJuaW5nPXtwdXp6bGUuZ2V0U29sdmVTdHJlYWsoKSA8XG4gICAgICAgICAgICAgICAgICAgIG1pbmltdW1Tb2x2ZXN9XG4gICAgICAgICAgICAgICAgICBjbGFzczpoYXMtdGV4dC1zdWNjZXNzPXtwdXp6bGUuZ2V0U29sdmVTdHJlYWsoKSA+PVxuICAgICAgICAgICAgICAgICAgICBtaW5pbXVtU29sdmVzfVxuICAgICAgICAgICAgICAgID5cbiAgICAgICAgICAgICAgICAgIHtwdXp6bGUuZ2V0U29sdmVTdHJlYWsoKX0gLyB7bWluaW11bVNvbHZlc31cbiAgICAgICAgICAgICAgICA8L3RkPlxuICAgICAgICAgICAgICAgIDx0ZD5cbiAgICAgICAgICAgICAgICAgIHtwdXp6bGUuZ2V0VG90YWxTb2x2ZXMoKX1cbiAgICAgICAgICAgICAgICA8L3RkPlxuICAgICAgICAgICAgICAgIDx0ZD5cbiAgICAgICAgICAgICAgICAgIHtwdXp6bGUuZ2V0RmFpbHVyZUNvdW50KCl9XG4gICAgICAgICAgICAgICAgPC90ZD5cbiAgICAgICAgICAgICAgPC90cj5cbiAgICAgICAgICAgIHsvZWFjaH1cbiAgICAgICAgICA8L3Rib2R5PlxuICAgICAgICA8L3RhYmxlPlxuICAgICAgPC9kaXY+XG4gICAgey9pZn1cbiAgICA8ZGl2IGNsYXNzPVwiYm94XCI+XG4gICAgICA8ZGl2IGNsYXNzPVwiYmxvY2tcIj5cbiAgICAgICAgPHA+PHN0cm9uZz57JHB1enpsZUlkc1RvV29ya09uLmxlbmd0aH08L3N0cm9uZz4gdG90YWwgcHV6emxlczwvcD5cbiAgICAgICAgPHA+RG9uZSB3aXRoIDxzdHJvbmc+e2NvbXBsZXRlZFB1enpsZXMubGVuZ3RofTwvc3Ryb25nPiBwdXp6bGVzPC9wPlxuICAgICAgICA8cD5cbiAgICAgICAgICBUYXJnZXQgc29sdmUgdGltZTogPHN0cm9uZz57KHRpbWVHb2FsIC8gMTAwMCkudG9GaXhlZCgxKX08L3N0cm9uZz4gc2Vjb25kc1xuICAgICAgICA8L3A+XG4gICAgICAgIDxwPlxuICAgICAgICAgIE11c3Qgc29sdmUgPHN0cm9uZz57bWluaW11bVNvbHZlc308L3N0cm9uZz4gdGltZXttaW5pbXVtU29sdmVzID4gMVxuICAgICAgICAgICAgPyBcInNcIlxuICAgICAgICAgICAgOiBcIlwifSBpbiBhIHJvd1xuICAgICAgICA8L3A+XG4gICAgICA8L2Rpdj5cbiAgICAgIDxkaXYgY2xhc3M9XCJibG9ja1wiPlxuICAgICAgICA8Zm9ybSBvbjpzdWJtaXR8cHJldmVudERlZmF1bHQ9e2FkZFB1enpsZUlkVG9Xb3JrT259PlxuICAgICAgICAgIDxsYWJlbCBmb3I9XCJuZXdQdXp6bGVJZFwiPk5ldyBQdXp6bGUgSUQocyk6PC9sYWJlbD5cbiAgICAgICAgICA8aW5wdXRcbiAgICAgICAgICAgIHR5cGU9XCJ0ZXh0XCJcbiAgICAgICAgICAgIGlkPVwibmV3UHV6emxlSWRcIlxuICAgICAgICAgICAgYmluZDp2YWx1ZT17bmV3UHV6emxlSWRzfVxuICAgICAgICAgICAgcGxhY2Vob2xkZXI9XCJcIlxuICAgICAgICAgIC8+XG4gICAgICAgICAgPGJyIC8+XG4gICAgICAgICAgPGJ1dHRvbiBjbGFzcz1cImJ1dHRvbiBpcy1wcmltYXJ5XCIgdHlwZT1cInN1Ym1pdFwiPkFkZDwvYnV0dG9uPlxuICAgICAgICA8L2Zvcm0+XG4gICAgICA8L2Rpdj5cbiAgICA8L2Rpdj5cbiAgICA8Q29sbGFwc2libGVCb3ggdGl0bGU9XCJQdXp6bGUgSGlzdG9yeSBIZWxwZXJcIj5cbiAgICAgIDxQdXp6bGVIaXN0b3J5UHJvY2Vzc29yIC8+XG4gICAgPC9Db2xsYXBzaWJsZUJveD5cbiAgPC9kaXY+XG48L2Rpdj5cblxuPHN0eWxlPlxuICAucHV6emxlLWlkIHtcbiAgICBmb250LWZhbWlseTogbW9ub3NwYWNlO1xuICB9XG48L3N0eWxlPlxuIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQStuQkUseUJBQVcsQ0FDVCxXQUFXLENBQUUsU0FDZiJ9 */");
}

function get_each_context$2(ctx, list, i) {
	const child_ctx = ctx.slice();
	child_ctx[54] = list[i];
	return child_ctx;
}

// (534:6) {:else}
function create_else_block$2(ctx) {
	let p;

	const block = {
		c: function create() {
			p = element("p");
			p.textContent = "All puzzles complete, add some more!";
			add_location(p, file$9, 534, 8, 13777);
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
		id: create_else_block$2.name,
		type: "else",
		source: "(534:6) {:else}",
		ctx
	});

	return block;
}

// (490:6) {#if activePuzzles.length > 0 && currentPuzzle}
function create_if_block_2$2(ctx) {
	let chessboard_1;
	let current;

	let chessboard_1_props = {
		fen: /*fen*/ ctx[1],
		lastMove: /*lastMove*/ ctx[2],
		chessgroundConfig: /*chessgroundConfig*/ ctx[14],
		orientation: /*orientation*/ ctx[4],
		$$slots: {
			"below-board": [create_below_board_slot],
			"centered-content": [create_centered_content_slot$1]
		},
		$$scope: { ctx }
	};

	chessboard_1 = new Chessboard({
			props: chessboard_1_props,
			$$inline: true
		});

	/*chessboard_1_binding*/ ctx[28](chessboard_1);
	chessboard_1.$on("move", /*handleUserMove*/ ctx[24]);

	const block = {
		c: function create() {
			create_component(chessboard_1.$$.fragment);
		},
		m: function mount(target, anchor) {
			mount_component(chessboard_1, target, anchor);
			current = true;
		},
		p: function update(ctx, dirty) {
			const chessboard_1_changes = {};
			if (dirty[0] & /*fen*/ 2) chessboard_1_changes.fen = /*fen*/ ctx[1];
			if (dirty[0] & /*lastMove*/ 4) chessboard_1_changes.lastMove = /*lastMove*/ ctx[2];
			if (dirty[0] & /*orientation*/ 16) chessboard_1_changes.orientation = /*orientation*/ ctx[4];

			if (dirty[0] & /*orientation, puzzleComplete, nextButton, failureMessage, successMessage*/ 6928 | dirty[1] & /*$$scope*/ 134217728) {
				chessboard_1_changes.$$scope = { dirty, ctx };
			}

			chessboard_1.$set(chessboard_1_changes);
		},
		i: function intro(local) {
			if (current) return;
			transition_in(chessboard_1.$$.fragment, local);
			current = true;
		},
		o: function outro(local) {
			transition_out(chessboard_1.$$.fragment, local);
			current = false;
		},
		d: function destroy(detaching) {
			/*chessboard_1_binding*/ ctx[28](null);
			destroy_component(chessboard_1, detaching);
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_if_block_2$2.name,
		type: "if",
		source: "(490:6) {#if activePuzzles.length > 0 && currentPuzzle}",
		ctx
	});

	return block;
}

// (500:12) {#if successMessage}
function create_if_block_6(ctx) {
	let span;
	let t;
	let span_transition;
	let current;

	const block = {
		c: function create() {
			span = element("span");
			t = text(/*successMessage*/ ctx[11]);
			attr_dev(span, "class", "tag is-success is-size-4");
			add_location(span, file$9, 500, 14, 12607);
		},
		m: function mount(target, anchor) {
			insert_dev(target, span, anchor);
			append_dev(span, t);
			current = true;
		},
		p: function update(ctx, dirty) {
			if (!current || dirty[0] & /*successMessage*/ 2048) set_data_dev(t, /*successMessage*/ ctx[11]);
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
		id: create_if_block_6.name,
		type: "if",
		source: "(500:12) {#if successMessage}",
		ctx
	});

	return block;
}

// (505:12) {#if failureMessage}
function create_if_block_5(ctx) {
	let span;
	let t;
	let span_transition;
	let current;

	const block = {
		c: function create() {
			span = element("span");
			t = text(/*failureMessage*/ ctx[12]);
			attr_dev(span, "class", "tag is-danger is-size-4");
			add_location(span, file$9, 505, 14, 12783);
		},
		m: function mount(target, anchor) {
			insert_dev(target, span, anchor);
			append_dev(span, t);
			current = true;
		},
		p: function update(ctx, dirty) {
			if (!current || dirty[0] & /*failureMessage*/ 4096) set_data_dev(t, /*failureMessage*/ ctx[12]);
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
		source: "(505:12) {#if failureMessage}",
		ctx
	});

	return block;
}

// (499:10) 
function create_centered_content_slot$1(ctx) {
	let div;
	let t;
	let if_block0 = /*successMessage*/ ctx[11] && create_if_block_6(ctx);
	let if_block1 = /*failureMessage*/ ctx[12] && create_if_block_5(ctx);

	const block = {
		c: function create() {
			div = element("div");
			if (if_block0) if_block0.c();
			t = space();
			if (if_block1) if_block1.c();
			attr_dev(div, "slot", "centered-content");
			add_location(div, file$9, 498, 10, 12530);
		},
		m: function mount(target, anchor) {
			insert_dev(target, div, anchor);
			if (if_block0) if_block0.m(div, null);
			append_dev(div, t);
			if (if_block1) if_block1.m(div, null);
		},
		p: function update(ctx, dirty) {
			if (/*successMessage*/ ctx[11]) {
				if (if_block0) {
					if_block0.p(ctx, dirty);

					if (dirty[0] & /*successMessage*/ 2048) {
						transition_in(if_block0, 1);
					}
				} else {
					if_block0 = create_if_block_6(ctx);
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

			if (/*failureMessage*/ ctx[12]) {
				if (if_block1) {
					if_block1.p(ctx, dirty);

					if (dirty[0] & /*failureMessage*/ 4096) {
						transition_in(if_block1, 1);
					}
				} else {
					if_block1 = create_if_block_5(ctx);
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
		id: create_centered_content_slot$1.name,
		type: "slot",
		source: "(499:10) ",
		ctx
	});

	return block;
}

// (512:12) {#if puzzleComplete}
function create_if_block_4$1(ctx) {
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
			add_location(button, file$9, 513, 16, 13080);
			attr_dev(div, "class", "block is-flex is-justify-content-center");
			add_location(div, file$9, 512, 14, 13010);
		},
		m: function mount(target, anchor) {
			insert_dev(target, div, anchor);
			append_dev(div, button);
			/*button_binding*/ ctx[26](button);

			if (!mounted) {
				dispose = listen_dev(button, "click", /*click_handler*/ ctx[27], false, false, false, false);
				mounted = true;
			}
		},
		p: noop,
		d: function destroy(detaching) {
			if (detaching) {
				detach_dev(div);
			}

			/*button_binding*/ ctx[26](null);
			mounted = false;
			dispose();
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_if_block_4$1.name,
		type: "if",
		source: "(512:12) {#if puzzleComplete}",
		ctx
	});

	return block;
}

// (524:12) {#if !puzzleComplete}
function create_if_block_3$1(ctx) {
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
			t0 = text(/*orientation*/ ctx[4]);
			t1 = text(" to play");
			t2 = space();
			button = element("button");
			button.textContent = "Skip";
			attr_dev(span, "class", span_class_value = "tag is-" + /*orientation*/ ctx[4] + " is-size-4" + " svelte-1oimmcd");
			add_location(span, file$9, 525, 16, 13487);
			attr_dev(button, "class", "button is-primary");
			add_location(button, file$9, 528, 16, 13613);
			attr_dev(div, "class", "block is-flex is-justify-content-center");
			add_location(div, file$9, 524, 14, 13417);
		},
		m: function mount(target, anchor) {
			insert_dev(target, div, anchor);
			append_dev(div, span);
			append_dev(span, t0);
			append_dev(span, t1);
			append_dev(div, t2);
			append_dev(div, button);

			if (!mounted) {
				dispose = listen_dev(button, "click", /*skip*/ ctx[22], false, false, false, false);
				mounted = true;
			}
		},
		p: function update(ctx, dirty) {
			if (dirty[0] & /*orientation*/ 16) set_data_dev(t0, /*orientation*/ ctx[4]);

			if (dirty[0] & /*orientation*/ 16 && span_class_value !== (span_class_value = "tag is-" + /*orientation*/ ctx[4] + " is-size-4" + " svelte-1oimmcd")) {
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
		id: create_if_block_3$1.name,
		type: "if",
		source: "(524:12) {#if !puzzleComplete}",
		ctx
	});

	return block;
}

// (511:10) 
function create_below_board_slot(ctx) {
	let div;
	let t;
	let if_block0 = /*puzzleComplete*/ ctx[8] && create_if_block_4$1(ctx);
	let if_block1 = !/*puzzleComplete*/ ctx[8] && create_if_block_3$1(ctx);

	const block = {
		c: function create() {
			div = element("div");
			if (if_block0) if_block0.c();
			t = space();
			if (if_block1) if_block1.c();
			attr_dev(div, "slot", "below-board");
			add_location(div, file$9, 510, 10, 12938);
		},
		m: function mount(target, anchor) {
			insert_dev(target, div, anchor);
			if (if_block0) if_block0.m(div, null);
			append_dev(div, t);
			if (if_block1) if_block1.m(div, null);
		},
		p: function update(ctx, dirty) {
			if (/*puzzleComplete*/ ctx[8]) {
				if (if_block0) {
					if_block0.p(ctx, dirty);
				} else {
					if_block0 = create_if_block_4$1(ctx);
					if_block0.c();
					if_block0.m(div, t);
				}
			} else if (if_block0) {
				if_block0.d(1);
				if_block0 = null;
			}

			if (!/*puzzleComplete*/ ctx[8]) {
				if (if_block1) {
					if_block1.p(ctx, dirty);
				} else {
					if_block1 = create_if_block_3$1(ctx);
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
		source: "(511:10) ",
		ctx
	});

	return block;
}

// (540:4) {#if activePuzzles.length >= 1 && currentPuzzle}
function create_if_block$4(ctx) {
	let div;
	let h3;
	let t1;
	let p;
	let t2;
	let strong;
	let t3_value = /*currentPuzzle*/ ctx[6].puzzleId + "";
	let t3;
	let t4;
	let promise;
	let t5;
	let t6;
	let table;
	let thead;
	let tr;
	let th0;
	let abbr0;
	let t8;
	let th1;
	let abbr1;
	let t10;
	let th2;
	let abbr2;
	let t12;
	let th3;
	let abbr3;
	let t14;
	let th4;
	let abbr4;
	let t16;
	let tbody;
	let each_blocks = [];
	let each_1_lookup = new Map_1();
	let current;

	let info = {
		ctx,
		current: null,
		token: null,
		hasCatch: false,
		pending: create_pending_block,
		then: create_then_block,
		catch: create_catch_block,
		value: 57,
		blocks: [,,,]
	};

	handle_promise(promise = /*getPuzzleData*/ ctx[21](/*currentPuzzle*/ ctx[6].puzzleId), info);
	let if_block = !/*puzzleComplete*/ ctx[8] && /*moves*/ ctx[7] && /*moves*/ ctx[7].length >= 1 && create_if_block_1$2(ctx);
	let each_value = ensure_array_like_dev(/*activePuzzles*/ ctx[0].sort(sortPuzzlesBySolveTime));
	const get_key = ctx => /*puzzle*/ ctx[54];
	validate_each_keys(ctx, each_value, get_each_context$2, get_key);

	for (let i = 0; i < each_value.length; i += 1) {
		let child_ctx = get_each_context$2(ctx, each_value, i);
		let key = get_key(child_ctx);
		each_1_lookup.set(key, each_blocks[i] = create_each_block$2(key, child_ctx));
	}

	const block = {
		c: function create() {
			div = element("div");
			h3 = element("h3");
			h3.textContent = "Current Puzzles";
			t1 = space();
			p = element("p");
			t2 = text("Current Puzzle: ");
			strong = element("strong");
			t3 = text(t3_value);
			t4 = space();
			info.block.c();
			t5 = space();
			if (if_block) if_block.c();
			t6 = space();
			table = element("table");
			thead = element("thead");
			tr = element("tr");
			th0 = element("th");
			abbr0 = element("abbr");
			abbr0.textContent = "ID";
			t8 = space();
			th1 = element("th");
			abbr1 = element("abbr");
			abbr1.textContent = "Avg";
			t10 = space();
			th2 = element("th");
			abbr2 = element("abbr");
			abbr2.textContent = "Streak";
			t12 = space();
			th3 = element("th");
			abbr3 = element("abbr");
			abbr3.textContent = "Solves";
			t14 = space();
			th4 = element("th");
			abbr4 = element("abbr");
			abbr4.textContent = "Fails";
			t16 = space();
			tbody = element("tbody");

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].c();
			}

			add_location(h3, file$9, 541, 8, 13974);
			add_location(strong, file$9, 542, 27, 14026);
			add_location(p, file$9, 542, 8, 14007);
			attr_dev(abbr0, "title", "Lichess Puzzle ID");
			add_location(abbr0, file$9, 556, 18, 14545);
			add_location(th0, file$9, 556, 14, 14541);
			attr_dev(abbr1, "title", "Average solve time");
			add_location(abbr1, file$9, 557, 18, 14610);
			add_location(th1, file$9, 557, 14, 14606);
			attr_dev(abbr2, "title", "Correct solves in a row");
			add_location(abbr2, file$9, 558, 18, 14677);
			add_location(th2, file$9, 558, 14, 14673);
			attr_dev(abbr3, "title", "Total correct solves");
			add_location(abbr3, file$9, 559, 18, 14752);
			add_location(th3, file$9, 559, 14, 14748);
			attr_dev(abbr4, "title", "Failure Count");
			add_location(abbr4, file$9, 560, 18, 14824);
			add_location(th4, file$9, 560, 14, 14820);
			add_location(tr, file$9, 555, 12, 14522);
			add_location(thead, file$9, 554, 10, 14502);
			add_location(tbody, file$9, 563, 10, 14917);
			attr_dev(table, "class", "table is-fullwidth is-narrow is-striped");
			add_location(table, file$9, 553, 8, 14436);
			attr_dev(div, "class", "box");
			add_location(div, file$9, 540, 6, 13948);
		},
		m: function mount(target, anchor) {
			insert_dev(target, div, anchor);
			append_dev(div, h3);
			append_dev(div, t1);
			append_dev(div, p);
			append_dev(p, t2);
			append_dev(p, strong);
			append_dev(strong, t3);
			append_dev(div, t4);
			info.block.m(div, info.anchor = null);
			info.mount = () => div;
			info.anchor = t5;
			append_dev(div, t5);
			if (if_block) if_block.m(div, null);
			append_dev(div, t6);
			append_dev(div, table);
			append_dev(table, thead);
			append_dev(thead, tr);
			append_dev(tr, th0);
			append_dev(th0, abbr0);
			append_dev(tr, t8);
			append_dev(tr, th1);
			append_dev(th1, abbr1);
			append_dev(tr, t10);
			append_dev(tr, th2);
			append_dev(th2, abbr2);
			append_dev(tr, t12);
			append_dev(tr, th3);
			append_dev(th3, abbr3);
			append_dev(tr, t14);
			append_dev(tr, th4);
			append_dev(th4, abbr4);
			append_dev(table, t16);
			append_dev(table, tbody);

			for (let i = 0; i < each_blocks.length; i += 1) {
				if (each_blocks[i]) {
					each_blocks[i].m(tbody, null);
				}
			}

			current = true;
		},
		p: function update(new_ctx, dirty) {
			ctx = new_ctx;
			if ((!current || dirty[0] & /*currentPuzzle*/ 64) && t3_value !== (t3_value = /*currentPuzzle*/ ctx[6].puzzleId + "")) set_data_dev(t3, t3_value);
			info.ctx = ctx;

			if (dirty[0] & /*currentPuzzle*/ 64 && promise !== (promise = /*getPuzzleData*/ ctx[21](/*currentPuzzle*/ ctx[6].puzzleId)) && handle_promise(promise, info)) ; else {
				update_await_block_branch(info, ctx, dirty);
			}

			if (!/*puzzleComplete*/ ctx[8] && /*moves*/ ctx[7] && /*moves*/ ctx[7].length >= 1) {
				if (if_block) {
					if_block.p(ctx, dirty);

					if (dirty[0] & /*puzzleComplete, moves*/ 384) {
						transition_in(if_block, 1);
					}
				} else {
					if_block = create_if_block_1$2(ctx);
					if_block.c();
					transition_in(if_block, 1);
					if_block.m(div, t6);
				}
			} else if (if_block) {
				group_outros();

				transition_out(if_block, 1, 1, () => {
					if_block = null;
				});

				check_outros();
			}

			if (dirty[0] & /*currentPuzzle, activePuzzles, minimumSolves, timeGoal*/ 98369) {
				each_value = ensure_array_like_dev(/*activePuzzles*/ ctx[0].sort(sortPuzzlesBySolveTime));
				for (let i = 0; i < each_blocks.length; i += 1) each_blocks[i].r();
				validate_each_keys(ctx, each_value, get_each_context$2, get_key);
				each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value, each_1_lookup, tbody, fix_and_destroy_block, create_each_block$2, null, get_each_context$2);
				for (let i = 0; i < each_blocks.length; i += 1) each_blocks[i].a();
			}
		},
		i: function intro(local) {
			if (current) return;
			transition_in(info.block);
			transition_in(if_block);
			current = true;
		},
		o: function outro(local) {
			for (let i = 0; i < 3; i += 1) {
				const block = info.blocks[i];
				transition_out(block);
			}

			transition_out(if_block);
			current = false;
		},
		d: function destroy(detaching) {
			if (detaching) {
				detach_dev(div);
			}

			info.block.d();
			info.token = null;
			info = null;
			if (if_block) if_block.d();

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].d();
			}
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_if_block$4.name,
		type: "if",
		source: "(540:4) {#if activePuzzles.length >= 1 && currentPuzzle}",
		ctx
	});

	return block;
}

// (1:0) <script>   import Chessboard from "./components/Chessboard.svelte";   import { onMount }
function create_catch_block(ctx) {
	const block = {
		c: noop,
		m: noop,
		p: noop,
		i: noop,
		o: noop,
		d: noop
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_catch_block.name,
		type: "catch",
		source: "(1:0) <script>   import Chessboard from \\\"./components/Chessboard.svelte\\\";   import { onMount }",
		ctx
	});

	return block;
}

// (544:64)            <p>             Rating: <Spoiler isShown={puzzleComplete}
function create_then_block(ctx) {
	let p;
	let t;
	let spoiler;
	let current;

	spoiler = new Spoiler({
			props: {
				isShown: /*puzzleComplete*/ ctx[8],
				$$slots: { default: [create_default_slot_2] },
				$$scope: { ctx }
			},
			$$inline: true
		});

	const block = {
		c: function create() {
			p = element("p");
			t = text("Rating: ");
			create_component(spoiler.$$.fragment);
			add_location(p, file$9, 544, 10, 14147);
		},
		m: function mount(target, anchor) {
			insert_dev(target, p, anchor);
			append_dev(p, t);
			mount_component(spoiler, p, null);
			current = true;
		},
		p: function update(ctx, dirty) {
			const spoiler_changes = {};
			if (dirty[0] & /*puzzleComplete*/ 256) spoiler_changes.isShown = /*puzzleComplete*/ ctx[8];

			if (dirty[0] & /*currentPuzzle*/ 64 | dirty[1] & /*$$scope*/ 134217728) {
				spoiler_changes.$$scope = { dirty, ctx };
			}

			spoiler.$set(spoiler_changes);
		},
		i: function intro(local) {
			if (current) return;
			transition_in(spoiler.$$.fragment, local);
			current = true;
		},
		o: function outro(local) {
			transition_out(spoiler.$$.fragment, local);
			current = false;
		},
		d: function destroy(detaching) {
			if (detaching) {
				detach_dev(p);
			}

			destroy_component(spoiler);
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_then_block.name,
		type: "then",
		source: "(544:64)            <p>             Rating: <Spoiler isShown={puzzleComplete}",
		ctx
	});

	return block;
}

// (546:20) <Spoiler isShown={puzzleComplete}               >
function create_default_slot_2(ctx) {
	let t_value = /*data*/ ctx[57].puzzle.rating + "";
	let t;

	const block = {
		c: function create() {
			t = text(t_value);
		},
		m: function mount(target, anchor) {
			insert_dev(target, t, anchor);
		},
		p: function update(ctx, dirty) {
			if (dirty[0] & /*currentPuzzle*/ 64 && t_value !== (t_value = /*data*/ ctx[57].puzzle.rating + "")) set_data_dev(t, t_value);
		},
		d: function destroy(detaching) {
			if (detaching) {
				detach_dev(t);
			}
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_default_slot_2.name,
		type: "slot",
		source: "(546:20) <Spoiler isShown={puzzleComplete}               >",
		ctx
	});

	return block;
}

// (1:0) <script>   import Chessboard from "./components/Chessboard.svelte";   import { onMount }
function create_pending_block(ctx) {
	const block = {
		c: noop,
		m: noop,
		p: noop,
		i: noop,
		o: noop,
		d: noop
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_pending_block.name,
		type: "pending",
		source: "(1:0) <script>   import Chessboard from \\\"./components/Chessboard.svelte\\\";   import { onMount }",
		ctx
	});

	return block;
}

// (551:8) {#if !puzzleComplete && moves && moves.length >= 1}
function create_if_block_1$2(ctx) {
	let p;
	let t;
	let spoiler;
	let current;

	spoiler = new Spoiler({
			props: {
				$$slots: { default: [create_default_slot_1] },
				$$scope: { ctx }
			},
			$$inline: true
		});

	const block = {
		c: function create() {
			p = element("p");
			t = text("Next move: ");
			create_component(spoiler.$$.fragment);
			add_location(p, file$9, 551, 10, 14366);
		},
		m: function mount(target, anchor) {
			insert_dev(target, p, anchor);
			append_dev(p, t);
			mount_component(spoiler, p, null);
			current = true;
		},
		p: function update(ctx, dirty) {
			const spoiler_changes = {};

			if (dirty[0] & /*moves*/ 128 | dirty[1] & /*$$scope*/ 134217728) {
				spoiler_changes.$$scope = { dirty, ctx };
			}

			spoiler.$set(spoiler_changes);
		},
		i: function intro(local) {
			if (current) return;
			transition_in(spoiler.$$.fragment, local);
			current = true;
		},
		o: function outro(local) {
			transition_out(spoiler.$$.fragment, local);
			current = false;
		},
		d: function destroy(detaching) {
			if (detaching) {
				detach_dev(p);
			}

			destroy_component(spoiler);
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_if_block_1$2.name,
		type: "if",
		source: "(551:8) {#if !puzzleComplete && moves && moves.length >= 1}",
		ctx
	});

	return block;
}

// (552:24) <Spoiler>
function create_default_slot_1(ctx) {
	let t_value = /*moves*/ ctx[7][0] + "";
	let t;

	const block = {
		c: function create() {
			t = text(t_value);
		},
		m: function mount(target, anchor) {
			insert_dev(target, t, anchor);
		},
		p: function update(ctx, dirty) {
			if (dirty[0] & /*moves*/ 128 && t_value !== (t_value = /*moves*/ ctx[7][0] + "")) set_data_dev(t, t_value);
		},
		d: function destroy(detaching) {
			if (detaching) {
				detach_dev(t);
			}
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_default_slot_1.name,
		type: "slot",
		source: "(552:24) <Spoiler>",
		ctx
	});

	return block;
}

// (565:12) {#each activePuzzles.sort(sortPuzzlesBySolveTime) as puzzle (puzzle)}
function create_each_block$2(key_1, ctx) {
	let tr;
	let td0;
	let a;
	let t0_value = /*puzzle*/ ctx[54].puzzleId + "";
	let t0;
	let a_href_value;
	let t1;
	let td1;

	let t2_value = (/*puzzle*/ ctx[54].averageSolveTime()
	? `${(/*puzzle*/ ctx[54].averageSolveTime() / 1000).toFixed(2)}s`
	: "?") + "";

	let t2;
	let t3;
	let td2;
	let t4_value = /*puzzle*/ ctx[54].getSolveStreak() + "";
	let t4;
	let t5;
	let t6;
	let t7;
	let td3;
	let t8_value = /*puzzle*/ ctx[54].getTotalSolves() + "";
	let t8;
	let t9;
	let td4;
	let t10_value = /*puzzle*/ ctx[54].getFailureCount() + "";
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
			t6 = text(/*minimumSolves*/ ctx[16]);
			t7 = space();
			td3 = element("td");
			t8 = text(t8_value);
			t9 = space();
			td4 = element("td");
			t10 = text(t10_value);
			t11 = space();
			attr_dev(a, "href", a_href_value = /*puzzle*/ ctx[54].lichessUrl());
			attr_dev(a, "target", "_blank");
			attr_dev(a, "title", "View on lichess.org");
			add_location(a, file$9, 570, 19, 15226);
			attr_dev(td0, "class", "puzzle-id svelte-1oimmcd");
			add_location(td0, file$9, 569, 16, 15185);
			toggle_class(td1, "has-text-warning", /*puzzle*/ ctx[54].averageSolveTime() > /*timeGoal*/ ctx[15]);
			toggle_class(td1, "has-text-success", /*puzzle*/ ctx[54].averageSolveTime() <= /*timeGoal*/ ctx[15] && /*puzzle*/ ctx[54].averageSolveTime() > 0);
			add_location(td1, file$9, 576, 16, 15439);
			toggle_class(td2, "has-text-warning", /*puzzle*/ ctx[54].getSolveStreak() < /*minimumSolves*/ ctx[16]);
			toggle_class(td2, "has-text-success", /*puzzle*/ ctx[54].getSolveStreak() >= /*minimumSolves*/ ctx[16]);
			add_location(td2, file$9, 585, 16, 15859);
			add_location(td3, file$9, 593, 16, 16188);
			add_location(td4, file$9, 596, 16, 16275);
			toggle_class(tr, "is-selected", /*currentPuzzle*/ ctx[6].puzzleId === /*puzzle*/ ctx[54].puzzleId);
			add_location(tr, file$9, 565, 14, 15021);
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
			if (dirty[0] & /*activePuzzles*/ 1 && t0_value !== (t0_value = /*puzzle*/ ctx[54].puzzleId + "")) set_data_dev(t0, t0_value);

			if (dirty[0] & /*activePuzzles*/ 1 && a_href_value !== (a_href_value = /*puzzle*/ ctx[54].lichessUrl())) {
				attr_dev(a, "href", a_href_value);
			}

			if (dirty[0] & /*activePuzzles*/ 1 && t2_value !== (t2_value = (/*puzzle*/ ctx[54].averageSolveTime()
			? `${(/*puzzle*/ ctx[54].averageSolveTime() / 1000).toFixed(2)}s`
			: "?") + "")) set_data_dev(t2, t2_value);

			if (dirty[0] & /*activePuzzles, timeGoal*/ 32769) {
				toggle_class(td1, "has-text-warning", /*puzzle*/ ctx[54].averageSolveTime() > /*timeGoal*/ ctx[15]);
			}

			if (dirty[0] & /*activePuzzles, timeGoal*/ 32769) {
				toggle_class(td1, "has-text-success", /*puzzle*/ ctx[54].averageSolveTime() <= /*timeGoal*/ ctx[15] && /*puzzle*/ ctx[54].averageSolveTime() > 0);
			}

			if (dirty[0] & /*activePuzzles*/ 1 && t4_value !== (t4_value = /*puzzle*/ ctx[54].getSolveStreak() + "")) set_data_dev(t4, t4_value);

			if (dirty[0] & /*activePuzzles, minimumSolves*/ 65537) {
				toggle_class(td2, "has-text-warning", /*puzzle*/ ctx[54].getSolveStreak() < /*minimumSolves*/ ctx[16]);
			}

			if (dirty[0] & /*activePuzzles, minimumSolves*/ 65537) {
				toggle_class(td2, "has-text-success", /*puzzle*/ ctx[54].getSolveStreak() >= /*minimumSolves*/ ctx[16]);
			}

			if (dirty[0] & /*activePuzzles*/ 1 && t8_value !== (t8_value = /*puzzle*/ ctx[54].getTotalSolves() + "")) set_data_dev(t8, t8_value);
			if (dirty[0] & /*activePuzzles*/ 1 && t10_value !== (t10_value = /*puzzle*/ ctx[54].getFailureCount() + "")) set_data_dev(t10, t10_value);

			if (dirty[0] & /*currentPuzzle, activePuzzles*/ 65) {
				toggle_class(tr, "is-selected", /*currentPuzzle*/ ctx[6].puzzleId === /*puzzle*/ ctx[54].puzzleId);
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
		id: create_each_block$2.name,
		type: "each",
		source: "(565:12) {#each activePuzzles.sort(sortPuzzlesBySolveTime) as puzzle (puzzle)}",
		ctx
	});

	return block;
}

// (633:4) <CollapsibleBox title="Puzzle History Helper">
function create_default_slot$1(ctx) {
	let puzzlehistoryprocessor;
	let current;
	puzzlehistoryprocessor = new PuzzleHistoryProcessor({ $$inline: true });

	const block = {
		c: function create() {
			create_component(puzzlehistoryprocessor.$$.fragment);
		},
		m: function mount(target, anchor) {
			mount_component(puzzlehistoryprocessor, target, anchor);
			current = true;
		},
		i: function intro(local) {
			if (current) return;
			transition_in(puzzlehistoryprocessor.$$.fragment, local);
			current = true;
		},
		o: function outro(local) {
			transition_out(puzzlehistoryprocessor.$$.fragment, local);
			current = false;
		},
		d: function destroy(detaching) {
			destroy_component(puzzlehistoryprocessor, detaching);
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_default_slot$1.name,
		type: "slot",
		source: "(633:4) <CollapsibleBox title=\\\"Puzzle History Helper\\\">",
		ctx
	});

	return block;
}

function create_fragment$a(ctx) {
	let div6;
	let div1;
	let div0;
	let current_block_type_index;
	let if_block0;
	let t0;
	let div5;
	let t1;
	let div4;
	let div2;
	let p0;
	let strong0;
	let t2_value = /*$puzzleIdsToWorkOn*/ ctx[13].length + "";
	let t2;
	let t3;
	let t4;
	let p1;
	let t5;
	let strong1;
	let t6_value = /*completedPuzzles*/ ctx[5].length + "";
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
	let t16_value = (/*minimumSolves*/ ctx[16] > 1 ? "s" : "") + "";
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
	let collapsiblebox;
	let current;
	let mounted;
	let dispose;
	const if_block_creators = [create_if_block_2$2, create_else_block$2];
	const if_blocks = [];

	function select_block_type(ctx, dirty) {
		if (/*activePuzzles*/ ctx[0].length > 0 && /*currentPuzzle*/ ctx[6]) return 0;
		return 1;
	}

	current_block_type_index = select_block_type(ctx);
	if_block0 = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
	let if_block1 = /*activePuzzles*/ ctx[0].length >= 1 && /*currentPuzzle*/ ctx[6] && create_if_block$4(ctx);

	collapsiblebox = new CollapsibleBox({
			props: {
				title: "Puzzle History Helper",
				$$slots: { default: [create_default_slot$1] },
				$$scope: { ctx }
			},
			$$inline: true
		});

	const block = {
		c: function create() {
			div6 = element("div");
			div1 = element("div");
			div0 = element("div");
			if_block0.c();
			t0 = space();
			div5 = element("div");
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
			strong2.textContent = `${(/*timeGoal*/ ctx[15] / 1000).toFixed(1)}`;
			t11 = text(" seconds");
			t12 = space();
			p3 = element("p");
			t13 = text("Must solve ");
			strong3 = element("strong");
			strong3.textContent = `${/*minimumSolves*/ ctx[16]}`;
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
			create_component(collapsiblebox.$$.fragment);
			attr_dev(div0, "class", "block");
			add_location(div0, file$9, 488, 4, 12257);
			attr_dev(div1, "class", "column is-6-desktop");
			add_location(div1, file$9, 487, 2, 12219);
			add_location(strong0, file$9, 607, 11, 16505);
			add_location(p0, file$9, 607, 8, 16502);
			add_location(strong1, file$9, 608, 21, 16589);
			add_location(p1, file$9, 608, 8, 16576);
			add_location(strong2, file$9, 610, 29, 16685);
			add_location(p2, file$9, 609, 8, 16652);
			add_location(strong3, file$9, 613, 21, 16787);
			add_location(p3, file$9, 612, 8, 16762);
			attr_dev(div2, "class", "block");
			add_location(div2, file$9, 606, 6, 16474);
			attr_dev(label, "for", "newPuzzleId");
			add_location(label, file$9, 620, 10, 17012);
			attr_dev(input, "type", "text");
			attr_dev(input, "id", "newPuzzleId");
			attr_dev(input, "placeholder", "");
			add_location(input, file$9, 621, 10, 17073);
			add_location(br, file$9, 627, 10, 17221);
			attr_dev(button, "class", "button is-primary");
			attr_dev(button, "type", "submit");
			add_location(button, file$9, 628, 10, 17238);
			add_location(form, file$9, 619, 8, 16948);
			attr_dev(div3, "class", "block");
			add_location(div3, file$9, 618, 6, 16920);
			attr_dev(div4, "class", "box");
			add_location(div4, file$9, 605, 4, 16450);
			attr_dev(div5, "class", "column is-4-desktop");
			add_location(div5, file$9, 538, 2, 13855);
			attr_dev(div6, "class", "columns is-centered");
			add_location(div6, file$9, 486, 0, 12183);
		},
		l: function claim(nodes) {
			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
		},
		m: function mount(target, anchor) {
			insert_dev(target, div6, anchor);
			append_dev(div6, div1);
			append_dev(div1, div0);
			if_blocks[current_block_type_index].m(div0, null);
			append_dev(div6, t0);
			append_dev(div6, div5);
			if (if_block1) if_block1.m(div5, null);
			append_dev(div5, t1);
			append_dev(div5, div4);
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
			set_input_value(input, /*newPuzzleIds*/ ctx[10]);
			append_dev(form, t21);
			append_dev(form, br);
			append_dev(form, t22);
			append_dev(form, button);
			append_dev(div5, t24);
			mount_component(collapsiblebox, div5, null);
			current = true;

			if (!mounted) {
				dispose = [
					listen_dev(input, "input", /*input_input_handler*/ ctx[29]),
					listen_dev(form, "submit", prevent_default(/*addPuzzleIdToWorkOn*/ ctx[20]), false, true, false, false)
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

			if (/*activePuzzles*/ ctx[0].length >= 1 && /*currentPuzzle*/ ctx[6]) {
				if (if_block1) {
					if_block1.p(ctx, dirty);

					if (dirty[0] & /*activePuzzles, currentPuzzle*/ 65) {
						transition_in(if_block1, 1);
					}
				} else {
					if_block1 = create_if_block$4(ctx);
					if_block1.c();
					transition_in(if_block1, 1);
					if_block1.m(div5, t1);
				}
			} else if (if_block1) {
				group_outros();

				transition_out(if_block1, 1, 1, () => {
					if_block1 = null;
				});

				check_outros();
			}

			if ((!current || dirty[0] & /*$puzzleIdsToWorkOn*/ 8192) && t2_value !== (t2_value = /*$puzzleIdsToWorkOn*/ ctx[13].length + "")) set_data_dev(t2, t2_value);
			if ((!current || dirty[0] & /*completedPuzzles*/ 32) && t6_value !== (t6_value = /*completedPuzzles*/ ctx[5].length + "")) set_data_dev(t6, t6_value);

			if (dirty[0] & /*newPuzzleIds*/ 1024 && input.value !== /*newPuzzleIds*/ ctx[10]) {
				set_input_value(input, /*newPuzzleIds*/ ctx[10]);
			}

			const collapsiblebox_changes = {};

			if (dirty[1] & /*$$scope*/ 134217728) {
				collapsiblebox_changes.$$scope = { dirty, ctx };
			}

			collapsiblebox.$set(collapsiblebox_changes);
		},
		i: function intro(local) {
			if (current) return;
			transition_in(if_block0);
			transition_in(if_block1);
			transition_in(collapsiblebox.$$.fragment, local);
			current = true;
		},
		o: function outro(local) {
			transition_out(if_block0);
			transition_out(if_block1);
			transition_out(collapsiblebox.$$.fragment, local);
			current = false;
		},
		d: function destroy(detaching) {
			if (detaching) {
				detach_dev(div6);
			}

			if_blocks[current_block_type_index].d();
			if (if_block1) if_block1.d();
			destroy_component(collapsiblebox);
			mounted = false;
			run_all(dispose);
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_fragment$a.name,
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

function instance$a($$self, $$props, $$invalidate) {
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

	let lastMove;
	let chessboard;
	let orientation = "white";

	let chessgroundConfig = {
		coordinates: true,
		animation: { enabled: true },
		highlight: { lastMove: true, check: true },
		draggable: { enabled: true },
		selectable: { enabled: true },
		movable: {
			free: false,
			color: "both",
			dests: new Map()
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

	let madeMistake = false;
	let puzzleComplete = false;

	// DOM elements
	let nextButton;

	// Persisted data
	const puzzleDataStore = persisted("puzzles.data", {});

	validate_store(puzzleDataStore, 'puzzleDataStore');
	component_subscribe($$self, puzzleDataStore, value => $$invalidate(33, $puzzleDataStore = value));
	const puzzleIdsToWorkOn = persisted("puzzles.idsToWorkOn", []);
	validate_store(puzzleIdsToWorkOn, 'puzzleIdsToWorkOn');
	component_subscribe($$self, puzzleIdsToWorkOn, value => $$invalidate(13, $puzzleIdsToWorkOn = value));
	const results = persisted("puzzles.results", {});
	validate_store(results, 'results');
	component_subscribe($$self, results, value => $$invalidate(32, $results = value));

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
			$$invalidate(10, newPuzzleIds = "");
			return;
		}

		const idsToAdd = newPuzzleIds.split(",").map(id => id.trim());
		const currentPuzzleIds = new Set($puzzleIdsToWorkOn);
		idsToAdd.forEach(id => currentPuzzleIds.add(id));
		puzzleIdsToWorkOn.set([...currentPuzzleIds]);
		$$invalidate(10, newPuzzleIds = "");
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

		$$invalidate(6, currentPuzzle = allPuzzles.find(puzzle => puzzle.puzzleId === candidatePuzzle.puzzleId));
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
		$$invalidate(5, completedPuzzles = [
			...new Set([
					...getCompletedPuzzles().map(puzzle => puzzle.puzzleId),
					puzzleToAdd.puzzleId
				])
		].map(puzzleId => new Puzzle(puzzleId)));
	}

	function removeCompletedPuzzle(puzzleToRemove) {
		$$invalidate(5, completedPuzzles = completedPuzzles.filter(puzzle => puzzle.puzzleId !== puzzleToRemove.puzzleId));
	}

	async function loadNextPuzzle() {
		$$invalidate(8, puzzleComplete = false);
		madeMistake = false;

		if (currentPuzzle && currentPuzzle.isComplete()) {
			removeActivePuzzle(currentPuzzle);
			addCompletedPuzzle(currentPuzzle);
		}

		const next = await getNextPuzzle();
		$$invalidate(4, orientation = Util.whoseMoveIsIt(next.puzzle.initialPly + 1));

		// Clone so we don't cache a value that gets shifted later
		$$invalidate(7, moves = [...next.puzzle.solution]);

		const chessInstance = new Chess();
		chessInstance.loadPgn(next.game.pgn);
		const history = chessInstance.history({ verbose: true });
		$$invalidate(2, lastMove = history[history.length - 1]);
		$$invalidate(1, fen = chessInstance.fen());

		setTimeout(
			() => {
				puzzleShownAt = Util.currentMicrotime();
			},
			300
		);
	}

	function handleUserMove(moveEvent) {
		const move = moveEvent.detail.move;
		const isCheckmate = moveEvent.detail.isCheckmate;
		const correctMove = moves[0];

		if (move.lan === correctMove || isCheckmate) {
			moves.shift(); // remove the user move first
			const computerMove = moves.shift();

			if (computerMove) {
				setTimeout(
					() => {
						chessboard.move(computerMove);
					},
					300
				);
			} else {
				return handlePuzzleComplete();
			}
		} else {
			madeMistake = true;
			showFailure("Nope!");

			setTimeout(
				() => {
					chessboard.undo();
				},
				300
			);
		}
	}

	function handlePuzzleComplete() {
		$$invalidate(8, puzzleComplete = true);
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
		$$invalidate(12, failureMessage = null);
		$$invalidate(11, successMessage = message);

		setTimeout(
			() => {
				$$invalidate(11, successMessage = null);
			},
			duration
		);
	}

	let failureMessage = null;

	function showFailure(message, duration = 1000) {
		$$invalidate(11, successMessage = null);
		$$invalidate(12, failureMessage = message);

		setTimeout(
			() => {
				$$invalidate(12, failureMessage = null);
			},
			duration
		);
	}

	function initializePuzzles() {
		$$invalidate(25, allPuzzles = []);

		$puzzleIdsToWorkOn.forEach(puzzleId => {
			allPuzzles.push(new Puzzle(puzzleId));
		});

		$$invalidate(5, completedPuzzles = getCompletedPuzzles());
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
			$$invalidate(9, nextButton);
		});
	}

	const click_handler = async () => {
		await loadNextPuzzle();
	};

	function chessboard_1_binding($$value) {
		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
			chessboard = $$value;
			$$invalidate(3, chessboard);
		});
	}

	function input_input_handler() {
		newPuzzleIds = this.value;
		$$invalidate(10, newPuzzleIds);
	}

	$$self.$capture_state = () => ({
		Chessboard,
		onMount,
		fade,
		flip,
		Util,
		persisted,
		Chess,
		PuzzleHistoryProcessor,
		CollapsibleBox,
		Spoiler,
		Result,
		Puzzle,
		fen,
		lastMove,
		chessboard,
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
		handleUserMove,
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
		if ('fen' in $$props) $$invalidate(1, fen = $$props.fen);
		if ('lastMove' in $$props) $$invalidate(2, lastMove = $$props.lastMove);
		if ('chessboard' in $$props) $$invalidate(3, chessboard = $$props.chessboard);
		if ('orientation' in $$props) $$invalidate(4, orientation = $$props.orientation);
		if ('chessgroundConfig' in $$props) $$invalidate(14, chessgroundConfig = $$props.chessgroundConfig);
		if ('allPuzzles' in $$props) $$invalidate(25, allPuzzles = $$props.allPuzzles);
		if ('activePuzzles' in $$props) $$invalidate(0, activePuzzles = $$props.activePuzzles);
		if ('completedPuzzles' in $$props) $$invalidate(5, completedPuzzles = $$props.completedPuzzles);
		if ('currentPuzzle' in $$props) $$invalidate(6, currentPuzzle = $$props.currentPuzzle);
		if ('puzzleShownAt' in $$props) puzzleShownAt = $$props.puzzleShownAt;
		if ('batchSize' in $$props) $$invalidate(36, batchSize = $$props.batchSize);
		if ('timeGoal' in $$props) $$invalidate(15, timeGoal = $$props.timeGoal);
		if ('minimumSolves' in $$props) $$invalidate(16, minimumSolves = $$props.minimumSolves);
		if ('alreadyCompleteOdds' in $$props) alreadyCompleteOdds = $$props.alreadyCompleteOdds;
		if ('moves' in $$props) $$invalidate(7, moves = $$props.moves);
		if ('madeMistake' in $$props) madeMistake = $$props.madeMistake;
		if ('puzzleComplete' in $$props) $$invalidate(8, puzzleComplete = $$props.puzzleComplete);
		if ('nextButton' in $$props) $$invalidate(9, nextButton = $$props.nextButton);
		if ('newPuzzleIds' in $$props) $$invalidate(10, newPuzzleIds = $$props.newPuzzleIds);
		if ('successMessage' in $$props) $$invalidate(11, successMessage = $$props.successMessage);
		if ('failureMessage' in $$props) $$invalidate(12, failureMessage = $$props.failureMessage);
	};

	if ($$props && "$$inject" in $$props) {
		$$self.$inject_state($$props.$$inject);
	}

	$$self.$$.update = () => {
		if ($$self.$$.dirty[0] & /*activePuzzles, allPuzzles*/ 33554433) {
			{
				if (activePuzzles.length < batchSize && allPuzzles.length > 0) {
					fillActivePuzzles();
				}
			}
		}
	};

	return [
		activePuzzles,
		fen,
		lastMove,
		chessboard,
		orientation,
		completedPuzzles,
		currentPuzzle,
		moves,
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
		getPuzzleData,
		skip,
		loadNextPuzzle,
		handleUserMove,
		allPuzzles,
		button_binding,
		click_handler,
		chessboard_1_binding,
		input_input_handler
	];
}

class Puzzles extends SvelteComponentDev {
	constructor(options) {
		super(options);
		init(this, options, instance$a, create_fragment$a, safe_not_equal, {}, add_css$3, [-1, -1]);

		dispatch_dev("SvelteRegisterComponent", {
			component: this,
			tagName: "Puzzles",
			options,
			id: create_fragment$a.name
		});
	}
}

var Pe=["a","b","c","d","e","f","g","h"],Je=["1","2","3","4","5","6","7","8"],H=["white","black"],Y=["pawn","knight","bishop","rook","queen","king"],Nn=["a","h"],oe=e=>"role"in e;var g=e=>e!==void 0,P=e=>e==="white"?"black":"white",J=e=>e>>3,L=e=>e&7,se=e=>{switch(e){case"pawn":return "p";case"knight":return "n";case"bishop":return "b";case"rook":return "r";case"queen":return "q";case"king":return "k"}};function Me(e){switch(e.toLowerCase()){case"p":return "pawn";case"n":return "knight";case"b":return "bishop";case"r":return "rook";case"q":return "queen";case"k":return "king";default:return}}function ue(e){if(e.length!==2)return;let t=e.charCodeAt(0)-"a".charCodeAt(0),n=e.charCodeAt(1)-"1".charCodeAt(0);if(!(t<0||t>=8||n<0||n>=8))return t+8*n}var W=e=>Pe[L(e)]+Je[J(e)];var Dt=e=>oe(e)?`${se(e.role).toUpperCase()}@${W(e.to)}`:W(e.from)+W(e.to)+(e.promotion?se(e.promotion):""),Ie=(e,t)=>e==="white"?t==="a"?2:6:t==="a"?58:62,et=(e,t)=>e==="white"?t==="a"?3:5:t==="a"?59:61;var On=e=>(e=e-(e>>>1&1431655765),e=(e&858993459)+(e>>>2&858993459),Math.imul(e+(e>>>4)&252645135,16843009)>>24),Lt=e=>(e=e>>>8&16711935|(e&16711935)<<8,e>>>16&65535|(e&65535)<<16),Tn=e=>(e=e>>>1&1431655765|(e&1431655765)<<1,e=e>>>2&858993459|(e&858993459)<<2,e=e>>>4&252645135|(e&252645135)<<4,Lt(e)),l=class e{constructor(t,n){this.lo=t|0,this.hi=n|0;}static fromSquare(t){return t>=32?new e(0,1<<t-32):new e(1<<t,0)}static fromRank(t){return new e(255,0).shl64(8*t)}static fromFile(t){return new e(16843009<<t,16843009<<t)}static empty(){return new e(0,0)}static full(){return new e(4294967295,4294967295)}static corners(){return new e(129,2164260864)}static center(){return new e(402653184,24)}static backranks(){return new e(255,4278190080)}static backrank(t){return t==="white"?new e(255,0):new e(0,4278190080)}static lightSquares(){return new e(1437226410,1437226410)}static darkSquares(){return new e(2857740885,2857740885)}complement(){return new e(~this.lo,~this.hi)}xor(t){return new e(this.lo^t.lo,this.hi^t.hi)}union(t){return new e(this.lo|t.lo,this.hi|t.hi)}intersect(t){return new e(this.lo&t.lo,this.hi&t.hi)}diff(t){return new e(this.lo&~t.lo,this.hi&~t.hi)}intersects(t){return this.intersect(t).nonEmpty()}isDisjoint(t){return this.intersect(t).isEmpty()}supersetOf(t){return t.diff(this).isEmpty()}subsetOf(t){return this.diff(t).isEmpty()}shr64(t){return t>=64?e.empty():t>=32?new e(this.hi>>>t-32,0):t>0?new e(this.lo>>>t^this.hi<<32-t,this.hi>>>t):this}shl64(t){return t>=64?e.empty():t>=32?new e(0,this.lo<<t-32):t>0?new e(this.lo<<t,this.hi<<t^this.lo>>>32-t):this}bswap64(){return new e(Lt(this.hi),Lt(this.lo))}rbit64(){return new e(Tn(this.hi),Tn(this.lo))}minus64(t){let n=this.lo-t.lo,r=(n&t.lo&1)+(t.lo>>>1)+(n>>>1)>>>31;return new e(n,this.hi-(t.hi+r))}equals(t){return this.lo===t.lo&&this.hi===t.hi}size(){return On(this.lo)+On(this.hi)}isEmpty(){return this.lo===0&&this.hi===0}nonEmpty(){return this.lo!==0||this.hi!==0}has(t){return (t>=32?this.hi&1<<t-32:this.lo&1<<t)!==0}set(t,n){return n?this.with(t):this.without(t)}with(t){return t>=32?new e(this.lo,this.hi|1<<t-32):new e(this.lo|1<<t,this.hi)}without(t){return t>=32?new e(this.lo,this.hi&~(1<<t-32)):new e(this.lo&~(1<<t),this.hi)}toggle(t){return t>=32?new e(this.lo,this.hi^1<<t-32):new e(this.lo^1<<t,this.hi)}last(){if(this.hi!==0)return 63-Math.clz32(this.hi);if(this.lo!==0)return 31-Math.clz32(this.lo)}first(){if(this.lo!==0)return 31-Math.clz32(this.lo&-this.lo);if(this.hi!==0)return 63-Math.clz32(this.hi&-this.hi)}withoutFirst(){return this.lo!==0?new e(this.lo&this.lo-1,this.hi):new e(0,this.hi&this.hi-1)}moreThanOne(){return this.hi!==0&&this.lo!==0||(this.lo&this.lo-1)!==0||(this.hi&this.hi-1)!==0}singleSquare(){return this.moreThanOne()?void 0:this.last()}*[Symbol.iterator](){let t=this.lo,n=this.hi;for(;t!==0;){let r=31-Math.clz32(t&-t);t^=1<<r,yield r;}for(;n!==0;){let r=31-Math.clz32(n&-n);n^=1<<r,yield 32+r;}}*reversed(){let t=this.lo,n=this.hi;for(;n!==0;){let r=31-Math.clz32(n);n^=1<<r,yield 32+r;}for(;t!==0;){let r=31-Math.clz32(t);t^=1<<r,yield r;}}};var tt=(e,t)=>{let n=l.empty();for(let r of t){let i=e+r;0<=i&&i<64&&Math.abs(L(e)-L(i))<=2&&(n=n.with(i));}return n},ke=e=>{let t=[];for(let n=0;n<64;n++)t[n]=e(n);return t},yi=ke(e=>tt(e,[-9,-8,-7,-1,1,7,8,9])),xi=ke(e=>tt(e,[-17,-15,-10,-6,6,10,15,17])),Si={white:ke(e=>tt(e,[7,9])),black:ke(e=>tt(e,[-7,-9]))},ae=e=>yi[e],Oe=e=>xi[e],be=(e,t)=>Si[e][t],It=ke(e=>l.fromFile(L(e)).without(e)),Bt=ke(e=>l.fromRank(J(e)).without(e)),Kt=ke(e=>{let t=new l(134480385,2151686160),n=8*(J(e)-L(e));return (n>=0?t.shl64(n):t.shr64(-n)).without(e)}),zt=ke(e=>{let t=new l(270549120,16909320),n=8*(J(e)+L(e)-7);return (n>=0?t.shl64(n):t.shr64(-n)).without(e)}),Ft=(e,t,n)=>{let r=n.intersect(t),i=r.bswap64();return r=r.minus64(e),i=i.minus64(e.bswap64()),r.xor(i.bswap64()).intersect(t)},Ci=(e,t)=>Ft(l.fromSquare(e),It[e],t),Pi=(e,t)=>{let n=Bt[e],r=t.intersect(n),i=r.rbit64();return r=r.minus64(l.fromSquare(e)),i=i.minus64(l.fromSquare(63-e)),r.xor(i.rbit64()).intersect(n)},we=(e,t)=>{let n=l.fromSquare(e);return Ft(n,Kt[e],t).xor(Ft(n,zt[e],t))},ve=(e,t)=>Ci(e,t).xor(Pi(e,t)),Be=(e,t)=>we(e,t).xor(ve(e,t)),nt=(e,t,n)=>{switch(e.role){case"pawn":return be(e.color,t);case"knight":return Oe(t);case"bishop":return we(t,n);case"rook":return ve(t,n);case"queen":return Be(t,n);case"king":return ae(t)}},rt=(e,t)=>{let n=l.fromSquare(t);return Bt[e].intersects(n)?Bt[e].with(e):zt[e].intersects(n)?zt[e].with(e):Kt[e].intersects(n)?Kt[e].with(e):It[e].intersects(n)?It[e].with(e):l.empty()},ye=(e,t)=>rt(e,t).intersect(l.full().shl64(e).xor(l.full().shl64(t))).withoutFirst();var de=class e{constructor(){}static default(){let t=new e;return t.reset(),t}reset(){this.occupied=new l(65535,4294901760),this.promoted=l.empty(),this.white=new l(65535,0),this.black=new l(0,4294901760),this.pawn=new l(65280,16711680),this.knight=new l(66,1107296256),this.bishop=new l(36,603979776),this.rook=new l(129,2164260864),this.queen=new l(8,134217728),this.king=new l(16,268435456);}static empty(){let t=new e;return t.clear(),t}clear(){this.occupied=l.empty(),this.promoted=l.empty();for(let t of H)this[t]=l.empty();for(let t of Y)this[t]=l.empty();}clone(){let t=new e;t.occupied=this.occupied,t.promoted=this.promoted;for(let n of H)t[n]=this[n];for(let n of Y)t[n]=this[n];return t}getColor(t){if(this.white.has(t))return "white";if(this.black.has(t))return "black"}getRole(t){for(let n of Y)if(this[n].has(t))return n}get(t){let n=this.getColor(t);if(!n)return;let r=this.getRole(t),i=this.promoted.has(t);return {color:n,role:r,promoted:i}}take(t){let n=this.get(t);return n&&(this.occupied=this.occupied.without(t),this[n.color]=this[n.color].without(t),this[n.role]=this[n.role].without(t),n.promoted&&(this.promoted=this.promoted.without(t))),n}set(t,n){let r=this.take(t);return this.occupied=this.occupied.with(t),this[n.color]=this[n.color].with(t),this[n.role]=this[n.role].with(t),n.promoted&&(this.promoted=this.promoted.with(t)),r}has(t){return this.occupied.has(t)}*[Symbol.iterator](){for(let t of this.occupied)yield [t,this.get(t)];}pieces(t,n){return this[t].intersect(this[n])}rooksAndQueens(){return this.rook.union(this.queen)}bishopsAndQueens(){return this.bishop.union(this.queen)}kingOf(t){return this.pieces(t,"king").singleSquare()}};var he=class e{constructor(){}static empty(){let t=new e;for(let n of Y)t[n]=0;return t}static fromBoard(t,n){let r=new e;for(let i of Y)r[i]=t.pieces(n,i).size();return r}clone(){let t=new e;for(let n of Y)t[n]=this[n];return t}equals(t){return Y.every(n=>this[n]===t[n])}add(t){let n=new e;for(let r of Y)n[r]=this[r]+t[r];return n}nonEmpty(){return Y.some(t=>this[t]>0)}isEmpty(){return !this.nonEmpty()}hasPawns(){return this.pawn>0}hasNonPawns(){return this.knight>0||this.bishop>0||this.rook>0||this.queen>0||this.king>0}size(){return this.pawn+this.knight+this.bishop+this.rook+this.queen+this.king}},Ee=class e{constructor(t,n){this.white=t,this.black=n;}static empty(){return new e(he.empty(),he.empty())}static fromBoard(t){return new e(he.fromBoard(t,"white"),he.fromBoard(t,"black"))}clone(){return new e(this.white.clone(),this.black.clone())}equals(t){return this.white.equals(t.white)&&this.black.equals(t.black)}add(t){return new e(this.white.add(t.white),this.black.add(t.black))}count(t){return this.white[t]+this.black[t]}size(){return this.white.size()+this.black.size()}isEmpty(){return this.white.isEmpty()&&this.black.isEmpty()}nonEmpty(){return !this.isEmpty()}hasPawns(){return this.white.hasPawns()||this.black.hasPawns()}hasNonPawns(){return this.white.hasNonPawns()||this.black.hasNonPawns()}},xe=class e{constructor(t,n){this.white=t,this.black=n;}static default(){return new e(3,3)}clone(){return new e(this.white,this.black)}equals(t){return this.white===t.white&&this.black===t.black}};var it=class{unwrap(t,n){let r=this._chain(i=>m.ok(t?t(i):i),i=>n?m.ok(n(i)):m.err(i));if(r.isErr)throw r.error;return r.value}map(t,n){return this._chain(r=>m.ok(t(r)),r=>m.err(n?n(r):r))}chain(t,n){return this._chain(t,n||(r=>m.err(r)))}},$t=class extends it{constructor(t){super(),this.value=void 0,this.isOk=!0,this.isErr=!1,this.value=t;}_chain(t,n){return t(this.value)}},Ht=class extends it{constructor(t){super(),this.error=void 0,this.isOk=!1,this.isErr=!0,this.error=t;}_chain(t,n){return n(this.error)}},m;(function(e){e.ok=function(t){return new $t(t)},e.err=function(t){return new Ht(t||new Error)},e.all=function(t){if(Array.isArray(t)){let i=[];for(let o=0;o<t.length;o++){let s=t[o];if(s.isErr)return s;i.push(s.value);}return e.ok(i)}let n={},r=Object.keys(t);for(let i=0;i<r.length;i++){let o=t[r[i]];if(o.isErr)return o;n[r[i]]=o.value;}return e.ok(n)};})(m||(m={}));var T;(function(e){e.Empty="ERR_EMPTY",e.OppositeCheck="ERR_OPPOSITE_CHECK",e.ImpossibleCheck="ERR_IMPOSSIBLE_CHECK",e.PawnsOnBackrank="ERR_PAWNS_ON_BACKRANK",e.Kings="ERR_KINGS",e.Variant="ERR_VARIANT";})(T||(T={}));var q=class extends Error{},Mi=(e,t,n,r)=>n[t].intersect(ve(e,r).intersect(n.rooksAndQueens()).union(we(e,r).intersect(n.bishopsAndQueens())).union(Oe(e).intersect(n.knight)).union(ae(e).intersect(n.king)).union(be(P(t),e).intersect(n.pawn))),ce=class e{constructor(){}static default(){let t=new e;return t.unmovedRooks=l.corners(),t.rook={white:{a:0,h:7},black:{a:56,h:63}},t.path={white:{a:new l(14,0),h:new l(96,0)},black:{a:new l(0,234881024),h:new l(0,1610612736)}},t}static empty(){let t=new e;return t.unmovedRooks=l.empty(),t.rook={white:{a:void 0,h:void 0},black:{a:void 0,h:void 0}},t.path={white:{a:l.empty(),h:l.empty()},black:{a:l.empty(),h:l.empty()}},t}clone(){let t=new e;return t.unmovedRooks=this.unmovedRooks,t.rook={white:{a:this.rook.white.a,h:this.rook.white.h},black:{a:this.rook.black.a,h:this.rook.black.h}},t.path={white:{a:this.path.white.a,h:this.path.white.h},black:{a:this.path.black.a,h:this.path.black.h}},t}add(t,n,r,i){let o=Ie(t,n),s=et(t,n);this.unmovedRooks=this.unmovedRooks.with(i),this.rook[t][n]=i,this.path[t][n]=ye(i,s).with(s).union(ye(r,o).with(o)).without(r).without(i);}static fromSetup(t){let n=e.empty(),r=t.unmovedRooks.intersect(t.board.rook);for(let i of H){let o=l.backrank(i),s=t.board.kingOf(i);if(!g(s)||!o.has(s))continue;let a=r.intersect(t.board[i]).intersect(o),u=a.first();g(u)&&u<s&&n.add(i,"a",s,u);let c=a.last();g(c)&&s<c&&n.add(i,"h",s,c);}return n}discardRook(t){if(this.unmovedRooks.has(t)){this.unmovedRooks=this.unmovedRooks.without(t);for(let n of H)for(let r of Nn)this.rook[n][r]===t&&(this.rook[n][r]=void 0);}}discardColor(t){this.unmovedRooks=this.unmovedRooks.diff(l.backrank(t)),this.rook[t].a=void 0,this.rook[t].h=void 0;}},ee=class{constructor(t){this.rules=t;}reset(){this.board=de.default(),this.pockets=void 0,this.turn="white",this.castles=ce.default(),this.epSquare=void 0,this.remainingChecks=void 0,this.halfmoves=0,this.fullmoves=1;}setupUnchecked(t){this.board=t.board.clone(),this.board.promoted=l.empty(),this.pockets=void 0,this.turn=t.turn,this.castles=ce.fromSetup(t),this.epSquare=Ei(this,t.epSquare),this.remainingChecks=void 0,this.halfmoves=t.halfmoves,this.fullmoves=t.fullmoves;}kingAttackers(t,n,r){return Mi(t,n,this.board,r)}playCaptureAt(t,n){this.halfmoves=0,n.role==="rook"&&this.castles.discardRook(t),this.pockets&&this.pockets[P(n.color)][n.promoted?"pawn":n.role]++;}ctx(){let t=this.isVariantEnd(),n=this.board.kingOf(this.turn);if(!g(n))return {king:n,blockers:l.empty(),checkers:l.empty(),variantEnd:t,mustCapture:!1};let r=ve(n,l.empty()).intersect(this.board.rooksAndQueens()).union(we(n,l.empty()).intersect(this.board.bishopsAndQueens())).intersect(this.board[P(this.turn)]),i=l.empty();for(let s of r){let a=ye(n,s).intersect(this.board.occupied);a.moreThanOne()||(i=i.union(a));}let o=this.kingAttackers(n,P(this.turn),this.board.occupied);return {king:n,blockers:i,checkers:o,variantEnd:t,mustCapture:!1}}clone(){var t,n;let r=new this.constructor;return r.board=this.board.clone(),r.pockets=(t=this.pockets)===null||t===void 0?void 0:t.clone(),r.turn=this.turn,r.castles=this.castles.clone(),r.epSquare=this.epSquare,r.remainingChecks=(n=this.remainingChecks)===null||n===void 0?void 0:n.clone(),r.halfmoves=this.halfmoves,r.fullmoves=this.fullmoves,r}validate(t){if(this.board.occupied.isEmpty())return m.err(new q(T.Empty));if(this.board.king.size()!==2)return m.err(new q(T.Kings));if(!g(this.board.kingOf(this.turn)))return m.err(new q(T.Kings));let n=this.board.kingOf(P(this.turn));return g(n)?this.kingAttackers(n,this.turn,this.board.occupied).nonEmpty()?m.err(new q(T.OppositeCheck)):l.backranks().intersects(this.board.pawn)?m.err(new q(T.PawnsOnBackrank)):t?.ignoreImpossibleCheck?m.ok(void 0):this.validateCheckers():m.err(new q(T.Kings))}validateCheckers(){let t=this.board.kingOf(this.turn);if(g(t)){let n=this.kingAttackers(t,P(this.turn),this.board.occupied);if(n.nonEmpty()){if(g(this.epSquare)){let r=this.epSquare^8,i=this.epSquare^24;if(n.moreThanOne()||n.first()!==r&&this.kingAttackers(t,P(this.turn),this.board.occupied.without(r).with(i)).nonEmpty())return m.err(new q(T.ImpossibleCheck))}else if(n.size()>2||n.size()===2&&rt(n.first(),n.last()).has(t))return m.err(new q(T.ImpossibleCheck))}}return m.ok(void 0)}dropDests(t){return l.empty()}dests(t,n){if(n=n||this.ctx(),n.variantEnd)return l.empty();let r=this.board.get(t);if(!r||r.color!==this.turn)return l.empty();let i,o;if(r.role==="pawn"){i=be(this.turn,t).intersect(this.board[P(this.turn)]);let s=this.turn==="white"?8:-8,a=t+s;if(0<=a&&a<64&&!this.board.occupied.has(a)){i=i.with(a);let u=this.turn==="white"?t<16:t>=64-16,c=a+s;u&&!this.board.occupied.has(c)&&(i=i.with(c));}if(g(this.epSquare)&&_i(this,t,n)){let u=this.epSquare-s;(n.checkers.isEmpty()||n.checkers.singleSquare()===u)&&(o=l.fromSquare(this.epSquare));}}else r.role==="bishop"?i=we(t,this.board.occupied):r.role==="knight"?i=Oe(t):r.role==="rook"?i=ve(t,this.board.occupied):r.role==="queen"?i=Be(t,this.board.occupied):i=ae(t);if(i=i.diff(this.board[this.turn]),g(n.king)){if(r.role==="king"){let s=this.board.occupied.without(t);for(let a of i)this.kingAttackers(a,P(this.turn),s).nonEmpty()&&(i=i.without(a));return i.union(ot(this,"a",n)).union(ot(this,"h",n))}if(n.checkers.nonEmpty()){let s=n.checkers.singleSquare();if(!g(s))return l.empty();i=i.intersect(ye(s,n.king).with(s));}n.blockers.has(t)&&(i=i.intersect(rt(t,n.king)));}return o&&(i=i.union(o)),i}isVariantEnd(){return !1}variantOutcome(t){}hasInsufficientMaterial(t){return this.board[t].intersect(this.board.pawn.union(this.board.rooksAndQueens())).nonEmpty()?!1:this.board[t].intersects(this.board.knight)?this.board[t].size()<=2&&this.board[P(t)].diff(this.board.king).diff(this.board.queen).isEmpty():this.board[t].intersects(this.board.bishop)?(!this.board.bishop.intersects(l.darkSquares())||!this.board.bishop.intersects(l.lightSquares()))&&this.board.pawn.isEmpty()&&this.board.knight.isEmpty():!0}toSetup(){var t,n;return {board:this.board.clone(),pockets:(t=this.pockets)===null||t===void 0?void 0:t.clone(),turn:this.turn,unmovedRooks:this.castles.unmovedRooks,epSquare:Ai(this),remainingChecks:(n=this.remainingChecks)===null||n===void 0?void 0:n.clone(),halfmoves:Math.min(this.halfmoves,150),fullmoves:Math.min(Math.max(this.fullmoves,1),9999)}}isInsufficientMaterial(){return H.every(t=>this.hasInsufficientMaterial(t))}hasDests(t){t=t||this.ctx();for(let n of this.board[this.turn])if(this.dests(n,t).nonEmpty())return !0;return this.dropDests(t).nonEmpty()}isLegal(t,n){if(oe(t))return !this.pockets||this.pockets[this.turn][t.role]<=0||t.role==="pawn"&&l.backranks().has(t.to)?!1:this.dropDests(n).has(t.to);{if(t.promotion==="pawn"||t.promotion==="king"&&this.rules!=="antichess"||!!t.promotion!==(this.board.pawn.has(t.from)&&l.backranks().has(t.to)))return !1;let r=this.dests(t.from,n);return r.has(t.to)||r.has(qn(this,t).to)}}isCheck(){let t=this.board.kingOf(this.turn);return g(t)&&this.kingAttackers(t,P(this.turn),this.board.occupied).nonEmpty()}isEnd(t){return (t?t.variantEnd:this.isVariantEnd())?!0:this.isInsufficientMaterial()||!this.hasDests(t)}isCheckmate(t){return t=t||this.ctx(),!t.variantEnd&&t.checkers.nonEmpty()&&!this.hasDests(t)}isStalemate(t){return t=t||this.ctx(),!t.variantEnd&&t.checkers.isEmpty()&&!this.hasDests(t)}outcome(t){let n=this.variantOutcome(t);return n||(t=t||this.ctx(),this.isCheckmate(t)?{winner:P(this.turn)}:this.isInsufficientMaterial()||this.isStalemate(t)?{winner:void 0}:void 0)}allDests(t){t=t||this.ctx();let n=new Map;if(t.variantEnd)return n;for(let r of this.board[this.turn])n.set(r,this.dests(r,t));return n}play(t){let n=this.turn,r=this.epSquare,i=Vt(this,t);if(this.epSquare=void 0,this.halfmoves+=1,n==="black"&&(this.fullmoves+=1),this.turn=P(n),oe(t))this.board.set(t.to,{role:t.role,color:n}),this.pockets&&this.pockets[n][t.role]--,t.role==="pawn"&&(this.halfmoves=0);else {let o=this.board.take(t.from);if(!o)return;let s;if(o.role==="pawn"){this.halfmoves=0,t.to===r&&(s=this.board.take(t.to+(n==="white"?-8:8)));let a=t.from-t.to;Math.abs(a)===16&&8<=t.from&&t.from<=55&&(this.epSquare=t.from+t.to>>1),t.promotion&&(o.role=t.promotion,o.promoted=!!this.pockets);}else if(o.role==="rook")this.castles.discardRook(t.from);else if(o.role==="king"){if(i){let a=this.castles.rook[n][i];if(g(a)){let u=this.board.take(a);this.board.set(Ie(n,i),o),u&&this.board.set(et(n,i),u);}}this.castles.discardColor(n);}if(!i){let a=this.board.set(t.to,o)||s;a&&this.playCaptureAt(t.to,a);}}this.remainingChecks&&this.isCheck()&&(this.remainingChecks[n]=Math.max(this.remainingChecks[n]-1,0));}},Ke=class extends ee{constructor(){super("chess");}static default(){let t=new this;return t.reset(),t}static fromSetup(t,n){let r=new this;return r.setupUnchecked(t),r.validate(n).map(i=>r)}clone(){return super.clone()}},Ei=(e,t)=>{if(!g(t))return;let n=e.turn==="white"?5:2,r=e.turn==="white"?8:-8;if(J(t)!==n||e.board.occupied.has(t+r))return;let i=t-r;if(!(!e.board.pawn.has(i)||!e.board[P(e.turn)].has(i)))return t},Ai=e=>{if(!g(e.epSquare))return;let t=e.ctx(),r=e.board.pieces(e.turn,"pawn").intersect(be(P(e.turn),e.epSquare));for(let i of r)if(e.dests(i,t).has(e.epSquare))return e.epSquare},_i=(e,t,n)=>{if(!g(e.epSquare)||!be(e.turn,t).has(e.epSquare))return !1;if(!g(n.king))return !0;let r=e.epSquare+(e.turn==="white"?-8:8),i=e.board.occupied.toggle(t).toggle(e.epSquare).toggle(r);return !e.kingAttackers(n.king,P(e.turn),i).intersects(i)},ot=(e,t,n)=>{if(!g(n.king)||n.checkers.nonEmpty())return l.empty();let r=e.castles.rook[e.turn][t];if(!g(r))return l.empty();if(e.castles.path[e.turn][t].intersects(e.board.occupied))return l.empty();let i=Ie(e.turn,t),o=ye(n.king,i),s=e.board.occupied.without(n.king);for(let c of o)if(e.kingAttackers(c,P(e.turn),s).nonEmpty())return l.empty();let a=et(e.turn,t),u=e.board.occupied.toggle(n.king).toggle(r).toggle(a);return e.kingAttackers(i,P(e.turn),u).nonEmpty()?l.empty():l.fromSquare(r)},st=(e,t,n)=>{if(n.variantEnd)return l.empty();let r=e.board.get(t);if(!r||r.color!==e.turn)return l.empty();let i=nt(r,t,e.board.occupied);if(r.role==="pawn"){let o=e.board[P(e.turn)];g(e.epSquare)&&(o=o.with(e.epSquare)),i=i.intersect(o);let s=e.turn==="white"?8:-8,a=t+s;if(0<=a&&a<64&&!e.board.occupied.has(a)){i=i.with(a);let u=e.turn==="white"?t<16:t>=64-16,c=a+s;u&&!e.board.occupied.has(c)&&(i=i.with(c));}return i}else i=i.diff(e.board[e.turn]);return t===n.king?i.union(ot(e,"a",n)).union(ot(e,"h",n)):i};var Vt=(e,t)=>{if(oe(t))return;let n=t.to-t.from;if(!(Math.abs(n)!==2&&!e.board[e.turn].has(t.to))&&e.board.king.has(t.from))return n>0?"h":"a"},qn=(e,t)=>{let n=Vt(e,t);if(!n)return t;let r=e.castles.rook[e.turn][n];return {from:t.from,to:g(r)?r:t.to}};var Dn=e=>oe(e)?String.fromCharCode(35+e.to,35+64+8*5+["queen","rook","bishop","knight","pawn"].indexOf(e.role)):String.fromCharCode(35+e.from,e.promotion?35+64+8*["queen","rook","bishop","knight","king"].indexOf(e.promotion)+L(e.to):35+e.to);var z;(function(e){e.Fen="ERR_FEN",e.Board="ERR_BOARD",e.Pockets="ERR_POCKETS",e.Turn="ERR_TURN",e.Castling="ERR_CASTLING",e.EpSquare="ERR_EP_SQUARE",e.RemainingChecks="ERR_REMAINING_CHECKS",e.Halfmoves="ERR_HALFMOVES",e.Fullmoves="ERR_FULLMOVES";})(z||(z={}));var F=class extends Error{},Di=(e,t,n)=>{let r=e.indexOf(t);for(;n-- >0&&r!==-1;)r=e.indexOf(t,r+t.length);return r},Te=e=>/^\d{1,4}$/.test(e)?parseInt(e,10):void 0,Kn=e=>{let t=Me(e);return t&&{role:t,color:e.toLowerCase()===e?"black":"white"}},Gt=e=>{let t=de.empty(),n=7,r=0;for(let i=0;i<e.length;i++){let o=e[i];if(o==="/"&&r===8)r=0,n--;else {let s=parseInt(o,10);if(s>0)r+=s;else {if(r>=8||n<0)return m.err(new F(z.Board));let a=r+n*8,u=Kn(o);if(!u)return m.err(new F(z.Board));e[i+1]==="~"&&(u.promoted=!0,i++),t.set(a,u),r++;}}}return n!==0||r!==8?m.err(new F(z.Board)):m.ok(t)},Ln=e=>{if(e.length>64)return m.err(new F(z.Pockets));let t=Ee.empty();for(let n of e){let r=Kn(n);if(!r)return m.err(new F(z.Pockets));t[r.color][r.role]++;}return m.ok(t)},Li=(e,t)=>{let n=l.empty();if(t==="-")return m.ok(n);for(let r of t){let i=r.toLowerCase(),o=r===i?"black":"white",s=l.backrank(o).intersect(e[o]),a;if(i==="q")a=s;else if(i==="k")a=s.reversed();else if("a"<=i&&i<="h")a=l.fromFile(i.charCodeAt(0)-"a".charCodeAt(0)).intersect(s);else return m.err(new F(z.Castling));for(let u of a){if(e.king.has(u))break;if(e.rook.has(u)){n=n.with(u);break}}}return H.some(r=>l.backrank(r).intersect(n).size()>2)?m.err(new F(z.Castling)):m.ok(n)},In=e=>{let t=e.split("+");if(t.length===3&&t[0]===""){let n=Te(t[1]),r=Te(t[2]);return !g(n)||n>3||!g(r)||r>3?m.err(new F(z.RemainingChecks)):m.ok(new xe(3-n,3-r))}else if(t.length===2){let n=Te(t[0]),r=Te(t[1]);return !g(n)||n>3||!g(r)||r>3?m.err(new F(z.RemainingChecks)):m.ok(new xe(n,r))}else return m.err(new F(z.RemainingChecks))},zn=e=>{let t=e.split(/[\s_]+/),n=t.shift(),r,i=m.ok(void 0);if(n.endsWith("]")){let a=n.indexOf("[");if(a===-1)return m.err(new F(z.Fen));r=Gt(n.slice(0,a)),i=Ln(n.slice(a+1,-1));}else {let a=Di(n,"/",7);a===-1?r=Gt(n):(r=Gt(n.slice(0,a)),i=Ln(n.slice(a+1)));}let o,s=t.shift();if(!g(s)||s==="w")o="white";else if(s==="b")o="black";else return m.err(new F(z.Turn));return r.chain(a=>{let u=t.shift(),c=g(u)?Li(a,u):m.ok(l.empty()),f=t.shift(),p;if(g(f)&&f!=="-"&&(p=ue(f),!g(p)))return m.err(new F(z.EpSquare));let S=t.shift(),b;g(S)&&S.includes("+")&&(b=In(S),S=t.shift());let d=g(S)?Te(S):0;if(!g(d))return m.err(new F(z.Halfmoves));let h=t.shift(),w=g(h)?Te(h):1;if(!g(w))return m.err(new F(z.Fullmoves));let k=t.shift(),y=m.ok(void 0);if(g(k)){if(g(b))return m.err(new F(z.RemainingChecks));y=In(k);}else g(b)&&(y=b);return t.length>0?m.err(new F(z.Fen)):i.chain(M=>c.chain(x=>y.map(C=>({board:a,pockets:M,turn:o,unmovedRooks:x,remainingChecks:C,epSquare:p,halfmoves:d,fullmoves:Math.max(1,w)}))))})};var Ii=e=>{let t=se(e.role);return e.color==="white"&&(t=t.toUpperCase()),e.promoted&&(t+="~"),t},Bi=e=>{let t="",n=0;for(let r=7;r>=0;r--)for(let i=0;i<8;i++){let o=i+r*8,s=e.get(o);s?(n>0&&(t+=n,n=0),t+=Ii(s)):n++,i===7&&(n>0&&(t+=n,n=0),r!==0&&(t+="/"));}return t},Bn=e=>Y.map(t=>se(t).repeat(e[t])).join(""),Ki=e=>Bn(e.white).toUpperCase()+Bn(e.black),zi=(e,t)=>{let n="";for(let r of H){let i=l.backrank(r),o=e.kingOf(r);g(o)&&!i.has(o)&&(o=void 0);let s=e.pieces(r,"rook").intersect(i);for(let a of t.intersect(s).reversed())if(a===s.first()&&g(o)&&a<o)n+=r==="white"?"Q":"q";else if(a===s.last()&&g(o)&&o<a)n+=r==="white"?"K":"k";else {let u=Pe[L(a)];n+=r==="white"?u.toUpperCase():u;}}return n||"-"},Fi=e=>`${e.white}+${e.black}`,at=(e,t)=>[Bi(e.board)+(e.pockets?`[${Ki(e.pockets)}]`:""),e.turn[0],zi(e.board,e.unmovedRooks),g(e.epSquare)?W(e.epSquare):"-",...e.remainingChecks?[Fi(e.remainingChecks)]:[],...[Math.max(0,Math.min(e.halfmoves,9999)),Math.max(1,Math.min(e.fullmoves,9999))]].join(" ");var Hi=(e,t)=>{let n="";if(oe(t))t.role!=="pawn"&&(n=se(t.role).toUpperCase()),n+="@"+W(t.to);else {let r=e.board.getRole(t.from);if(!r)return "--";if(r==="king"&&(e.board[e.turn].has(t.to)||Math.abs(t.to-t.from)===2))n=t.to>t.from?"O-O":"O-O-O";else {let i=e.board.occupied.has(t.to)||r==="pawn"&&L(t.from)!==L(t.to);if(r!=="pawn"){n=se(r).toUpperCase();let o;if(r==="king"?o=ae(t.to).intersect(e.board.king):r==="queen"?o=Be(t.to,e.board.occupied).intersect(e.board.queen):r==="rook"?o=ve(t.to,e.board.occupied).intersect(e.board.rook):r==="bishop"?o=we(t.to,e.board.occupied).intersect(e.board.bishop):o=Oe(t.to).intersect(e.board.knight),o=o.intersect(e.board[e.turn]).without(t.from),o.nonEmpty()){let s=e.ctx();for(let a of o)e.dests(a,s).has(t.to)||(o=o.without(a));if(o.nonEmpty()){let a=!1,u=o.intersects(l.fromRank(J(t.from)));o.intersects(l.fromFile(L(t.from)))?a=!0:u=!0,u&&(n+=Pe[L(t.from)]),a&&(n+=Je[J(t.from)]);}}}else i&&(n=Pe[L(t.from)]);i&&(n+="x"),n+=W(t.to),t.promotion&&(n+="="+se(t.promotion).toUpperCase());}}return n},Fn=(e,t)=>{var n;let r=Hi(e,t);return e.play(t),!((n=e.outcome())===null||n===void 0)&&n.winner?r+"#":e.isCheck()?r+"+":r};var $n=(e,t)=>{let n=e.ctx(),r=t.match(/^([NBRQK])?([a-h])?([1-8])?[-x]?([a-h][1-8])(?:=?([nbrqkNBRQK]))?[+#]?$/);if(!r){let f;if(t==="O-O"||t==="O-O+"||t==="O-O#"?f="h":(t==="O-O-O"||t==="O-O-O+"||t==="O-O-O#")&&(f="a"),f){let b=e.castles.rook[e.turn][f];return !g(n.king)||!g(b)||!e.dests(n.king,n).has(b)?void 0:{from:n.king,to:b}}let p=t.match(/^([pnbrqkPNBRQK])?@([a-h][1-8])[+#]?$/);if(!p)return;let S={role:p[1]?Me(p[1]):"pawn",to:ue(p[2])};return e.isLegal(S,n)?S:void 0}let i=r[1]?Me(r[1]):"pawn",o=ue(r[4]),s=r[5]?Me(r[5]):void 0;if(!!s!==(i==="pawn"&&l.backranks().has(o))||s==="king"&&e.rules!=="antichess")return;let a=e.board.pieces(e.turn,i);i==="pawn"&&!r[2]?a=a.intersect(l.fromFile(L(o))):r[2]&&(a=a.intersect(l.fromFile(r[2].charCodeAt(0)-"a".charCodeAt(0)))),r[3]&&(a=a.intersect(l.fromRank(r[3].charCodeAt(0)-"1".charCodeAt(0))));let u=i==="pawn"?l.fromFile(L(o)):l.empty();a=a.intersect(u.union(nt({color:P(e.turn),role:i},o,e.board.occupied)));let c;for(let f of a)if(e.dests(f,n).has(o)){if(g(c))return;c=f;}if(g(c))return {from:c,to:o,promotion:s}};var ct=class extends ee{constructor(){super("crazyhouse");}reset(){super.reset(),this.pockets=Ee.empty();}setupUnchecked(t){super.setupUnchecked(t),this.board.promoted=t.board.promoted.intersect(t.board.occupied).diff(t.board.king).diff(t.board.pawn),this.pockets=t.pockets?t.pockets.clone():Ee.empty();}static default(){let t=new this;return t.reset(),t}static fromSetup(t,n){let r=new this;return r.setupUnchecked(t),r.validate(n).map(i=>r)}clone(){return super.clone()}validate(t){return super.validate(t).chain(n=>{var r,i;return !((r=this.pockets)===null||r===void 0)&&r.count("king")?m.err(new q(T.Kings)):(((i=this.pockets)===null||i===void 0?void 0:i.size())||0)+this.board.occupied.size()>64?m.err(new q(T.Variant)):m.ok(void 0)})}hasInsufficientMaterial(t){return this.pockets?this.board.occupied.size()+this.pockets.size()<=3&&this.board.pawn.isEmpty()&&this.board.promoted.isEmpty()&&this.board.rooksAndQueens().isEmpty()&&this.pockets.count("pawn")<=0&&this.pockets.count("rook")<=0&&this.pockets.count("queen")<=0:super.hasInsufficientMaterial(t)}dropDests(t){var n,r;let i=this.board.occupied.complement().intersect(!((n=this.pockets)===null||n===void 0)&&n[this.turn].hasNonPawns()?l.full():!((r=this.pockets)===null||r===void 0)&&r[this.turn].hasPawns()?l.backranks().complement():l.empty());if(t=t||this.ctx(),g(t.king)&&t.checkers.nonEmpty()){let o=t.checkers.singleSquare();return g(o)?i.intersect(ye(o,t.king)):l.empty()}else return i}},lt=class extends ee{constructor(){super("atomic");}static default(){let t=new this;return t.reset(),t}static fromSetup(t,n){let r=new this;return r.setupUnchecked(t),r.validate(n).map(i=>r)}clone(){return super.clone()}validate(t){if(this.board.occupied.isEmpty())return m.err(new q(T.Empty));if(this.board.king.size()>2)return m.err(new q(T.Kings));let n=this.board.kingOf(P(this.turn));return g(n)?this.kingAttackers(n,this.turn,this.board.occupied).nonEmpty()?m.err(new q(T.OppositeCheck)):l.backranks().intersects(this.board.pawn)?m.err(new q(T.PawnsOnBackrank)):t?.ignoreImpossibleCheck?m.ok(void 0):this.validateCheckers():m.err(new q(T.Kings))}validateCheckers(){return g(this.epSquare)?m.ok(void 0):super.validateCheckers()}kingAttackers(t,n,r){let i=this.board.pieces(n,"king");return i.isEmpty()||ae(t).intersects(i)?l.empty():super.kingAttackers(t,n,r)}playCaptureAt(t,n){super.playCaptureAt(t,n),this.board.take(t);for(let r of ae(t).intersect(this.board.occupied).diff(this.board.pawn)){let i=this.board.take(r);i?.role==="rook"&&this.castles.discardRook(r),i?.role==="king"&&this.castles.discardColor(i.color);}}hasInsufficientMaterial(t){if(this.board.pieces(P(t),"king").isEmpty())return !1;if(this.board[t].diff(this.board.king).isEmpty())return !0;if(this.board[P(t)].diff(this.board.king).nonEmpty()){if(this.board.occupied.equals(this.board.bishop.union(this.board.king))){if(!this.board.bishop.intersect(this.board.white).intersects(l.darkSquares()))return !this.board.bishop.intersect(this.board.black).intersects(l.lightSquares());if(!this.board.bishop.intersect(this.board.white).intersects(l.lightSquares()))return !this.board.bishop.intersect(this.board.black).intersects(l.darkSquares())}return !1}return this.board.queen.nonEmpty()||this.board.pawn.nonEmpty()?!1:this.board.knight.union(this.board.bishop).union(this.board.rook).size()===1?!0:this.board.occupied.equals(this.board.knight.union(this.board.king))?this.board.knight.size()<=2:!1}dests(t,n){n=n||this.ctx();let r=l.empty();for(let i of st(this,t,n)){let o=this.clone();o.play({from:t,to:i});let s=o.board.kingOf(this.turn);g(s)&&(!g(o.board.kingOf(o.turn))||o.kingAttackers(s,o.turn,o.board.occupied).isEmpty())&&(r=r.with(i));}return r}isVariantEnd(){return !!this.variantOutcome()}variantOutcome(t){for(let n of H)if(this.board.pieces(n,"king").isEmpty())return {winner:P(n)}}},ut=class extends ee{constructor(){super("antichess");}reset(){super.reset(),this.castles=ce.empty();}setupUnchecked(t){super.setupUnchecked(t),this.castles=ce.empty();}static default(){let t=new this;return t.reset(),t}static fromSetup(t,n){let r=new this;return r.setupUnchecked(t),r.validate(n).map(i=>r)}clone(){return super.clone()}validate(t){return this.board.occupied.isEmpty()?m.err(new q(T.Empty)):l.backranks().intersects(this.board.pawn)?m.err(new q(T.PawnsOnBackrank)):m.ok(void 0)}kingAttackers(t,n,r){return l.empty()}ctx(){let t=super.ctx();if(g(this.epSquare)&&be(P(this.turn),this.epSquare).intersects(this.board.pieces(this.turn,"pawn")))return t.mustCapture=!0,t;let n=this.board[P(this.turn)];for(let r of this.board[this.turn])if(st(this,r,t).intersects(n))return t.mustCapture=!0,t;return t}dests(t,n){n=n||this.ctx();let r=st(this,t,n),i=this.board[P(this.turn)];return r.intersect(n.mustCapture?g(this.epSquare)&&this.board.getRole(t)==="pawn"?i.with(this.epSquare):i:l.full())}hasInsufficientMaterial(t){if(this.board[t].isEmpty())return !1;if(this.board[P(t)].isEmpty())return !0;if(this.board.occupied.equals(this.board.bishop)){let n=this.board[t].intersects(l.lightSquares()),r=this.board[t].intersects(l.darkSquares()),i=this.board[P(t)].isDisjoint(l.lightSquares()),o=this.board[P(t)].isDisjoint(l.darkSquares());return n&&i||r&&o}return this.board.occupied.equals(this.board.knight)&&this.board.occupied.size()===2?this.board.white.intersects(l.lightSquares())!==this.board.black.intersects(l.darkSquares())!=(this.turn===t):!1}isVariantEnd(){return this.board[this.turn].isEmpty()}variantOutcome(t){if(t=t||this.ctx(),t.variantEnd||this.isStalemate(t))return {winner:this.turn}}},dt=class extends ee{constructor(){super("kingofthehill");}static default(){let t=new this;return t.reset(),t}static fromSetup(t,n){let r=new this;return r.setupUnchecked(t),r.validate(n).map(i=>r)}clone(){return super.clone()}hasInsufficientMaterial(t){return !1}isVariantEnd(){return this.board.king.intersects(l.center())}variantOutcome(t){for(let n of H)if(this.board.pieces(n,"king").intersects(l.center()))return {winner:n}}},ht=class extends ee{constructor(){super("3check");}reset(){super.reset(),this.remainingChecks=xe.default();}setupUnchecked(t){var n;super.setupUnchecked(t),this.remainingChecks=((n=t.remainingChecks)===null||n===void 0?void 0:n.clone())||xe.default();}static default(){let t=new this;return t.reset(),t}static fromSetup(t,n){let r=new this;return r.setupUnchecked(t),r.validate(n).map(i=>r)}clone(){return super.clone()}hasInsufficientMaterial(t){return this.board.pieces(t,"king").equals(this.board[t])}isVariantEnd(){return !!this.remainingChecks&&(this.remainingChecks.white<=0||this.remainingChecks.black<=0)}variantOutcome(t){if(this.remainingChecks){for(let n of H)if(this.remainingChecks[n]<=0)return {winner:n}}}},Gi=()=>{let e=de.empty();return e.occupied=new l(65535,0),e.promoted=l.empty(),e.white=new l(61680,0),e.black=new l(3855,0),e.pawn=l.empty(),e.knight=new l(6168,0),e.bishop=new l(9252,0),e.rook=new l(16962,0),e.queen=new l(129,0),e.king=new l(33024,0),e},ft=class extends ee{constructor(){super("racingkings");}reset(){this.board=Gi(),this.pockets=void 0,this.turn="white",this.castles=ce.empty(),this.epSquare=void 0,this.remainingChecks=void 0,this.halfmoves=0,this.fullmoves=1;}setupUnchecked(t){super.setupUnchecked(t),this.castles=ce.empty();}static default(){let t=new this;return t.reset(),t}static fromSetup(t,n){let r=new this;return r.setupUnchecked(t),r.validate(n).map(i=>r)}clone(){return super.clone()}validate(t){return this.isCheck()||this.board.pawn.nonEmpty()?m.err(new q(T.Variant)):super.validate(t)}dests(t,n){if(n=n||this.ctx(),t===n.king)return super.dests(t,n);let r=l.empty();for(let i of super.dests(t,n)){let o={from:t,to:i},s=this.clone();s.play(o),s.isCheck()||(r=r.with(i));}return r}hasInsufficientMaterial(t){return !1}isVariantEnd(){let t=l.fromRank(7),n=this.board.king.intersect(t);if(n.isEmpty())return !1;if(this.turn==="white"||n.intersects(this.board.black))return !0;let r=this.board.kingOf("black");if(g(r)){let i=this.board.occupied.without(r);for(let o of ae(r).intersect(t).diff(this.board.black))if(this.kingAttackers(o,"white",i).isEmpty())return !1}return !0}variantOutcome(t){if(t?!t.variantEnd:!this.isVariantEnd())return;let n=l.fromRank(7),r=this.board.pieces("black","king").intersects(n),i=this.board.pieces("white","king").intersects(n);return r&&!i?{winner:"black"}:i&&!r?{winner:"white"}:{winner:void 0}}},Ui=()=>{let e=de.empty();return e.occupied=new l(4294967295,4294901862),e.promoted=l.empty(),e.white=new l(4294967295,102),e.black=new l(0,4294901760),e.pawn=new l(4294967295,16711782),e.knight=new l(0,1107296256),e.bishop=new l(0,603979776),e.rook=new l(0,2164260864),e.queen=new l(0,134217728),e.king=new l(0,268435456),e},pt=class extends ee{constructor(){super("horde");}reset(){this.board=Ui(),this.pockets=void 0,this.turn="white",this.castles=ce.default(),this.castles.discardColor("white"),this.epSquare=void 0,this.remainingChecks=void 0,this.halfmoves=0,this.fullmoves=1;}static default(){let t=new this;return t.reset(),t}static fromSetup(t,n){let r=new this;return r.setupUnchecked(t),r.validate(n).map(i=>r)}clone(){return super.clone()}validate(t){if(this.board.occupied.isEmpty())return m.err(new q(T.Empty));if(this.board.king.size()!==1)return m.err(new q(T.Kings));let n=this.board.kingOf(P(this.turn));if(g(n)&&this.kingAttackers(n,this.turn,this.board.occupied).nonEmpty())return m.err(new q(T.OppositeCheck));for(let r of H){let i=this.board.pieces(r,"king").isEmpty()?l.backrank(P(r)):l.backranks();if(this.board.pieces(r,"pawn").intersects(i))return m.err(new q(T.PawnsOnBackrank))}return t?.ignoreImpossibleCheck?m.ok(void 0):this.validateCheckers()}hasInsufficientMaterial(t){if(this.board.pieces(t,"king").nonEmpty())return !1;let n=b=>b==="light"?"dark":"light",r=b=>b==="light"?l.lightSquares():l.darkSquares(),i=b=>{let d=this.board.pieces(b,"bishop");return d.intersects(l.darkSquares())&&d.intersects(l.lightSquares())},o=he.fromBoard(this.board,t),s=b=>r(b).intersect(this.board.pieces(t,"bishop")).size(),a=s("light")>=1?"light":"dark",u=o.pawn+o.knight+o.rook+o.queen+Math.min(s("dark"),2)+Math.min(s("light"),2),c=he.fromBoard(this.board,P(t)),f=b=>r(b).intersect(this.board.pieces(P(t),"bishop")).size(),p=c.size(),S=b=>p-b;if(u===0)return !0;if(u>=4||(o.pawn>=1||o.queen>=1)&&u>=2||o.rook>=1&&u>=2&&!(u===2&&o.rook===1&&o.bishop===1&&S(f(a))===1))return !1;if(u===1){if(p===1)return !0;if(o.queen===1)return !(c.pawn>=1||c.rook>=1||f("light")>=2||f("dark")>=2);if(o.pawn===1){let b=this.board.pieces(t,"pawn").last(),d=this.clone();d.board.set(b,{color:t,role:"queen"});let h=this.clone();return h.board.set(b,{color:t,role:"knight"}),d.hasInsufficientMaterial(t)&&h.hasInsufficientMaterial(t)}else {if(o.rook===1)return !(c.pawn>=2||c.rook>=1&&c.pawn>=1||c.rook>=1&&c.knight>=1||c.pawn>=1&&c.knight>=1);if(o.bishop===1)return !(f(n(a))>=2||f(n(a))>=1&&c.pawn>=1||c.pawn>=2);if(o.knight===1)return !(p>=4&&(c.knight>=2||c.pawn>=2||c.rook>=1&&c.knight>=1||c.rook>=1&&c.bishop>=1||c.knight>=1&&c.bishop>=1||c.rook>=1&&c.pawn>=1||c.knight>=1&&c.pawn>=1||c.bishop>=1&&c.pawn>=1||i(P(t))&&c.pawn>=1)&&(f("dark")<2||S(f("dark"))>=3)&&(f("light")<2||S(f("light"))>=3))}}else {if(u===2)return p===1?!0:o.knight===2?c.pawn+c.bishop+c.knight<1:i(t)?!(c.pawn>=1||c.bishop>=1||c.knight>=1&&c.rook+c.queen>=1):o.bishop>=1&&o.knight>=1?!(c.pawn>=1||f(n(a))>=1||S(f(a))>=3):!(c.pawn>=1&&f(n(a))>=1||c.pawn>=1&&c.knight>=1||f(n(a))>=1&&c.knight>=1||f(n(a))>=2||c.knight>=2||c.pawn>=2);if(u===3)return o.knight===2&&o.bishop===1||o.knight===3||i(t)?!1:p===1}return !0}isVariantEnd(){return this.board.white.isEmpty()||this.board.black.isEmpty()}variantOutcome(t){if(this.board.white.isEmpty())return {winner:"black"};if(this.board.black.isEmpty())return {winner:"white"}}},Hn=e=>{switch(e){case"chess":return Ke.default();case"antichess":return ut.default();case"atomic":return lt.default();case"horde":return pt.default();case"racingkings":return ft.default();case"kingofthehill":return dt.default();case"3check":return ht.default();case"crazyhouse":return ct.default()}},Vn=(e,t,n)=>{switch(e){case"chess":return Ke.fromSetup(t,n);case"antichess":return ut.fromSetup(t,n);case"atomic":return lt.fromSetup(t,n);case"horde":return pt.fromSetup(t,n);case"racingkings":return ft.fromSetup(t,n);case"kingofthehill":return dt.fromSetup(t,n);case"3check":return ht.fromSetup(t,n);case"crazyhouse":return ct.fromSetup(t,n)}};var ji=(e=Zt)=>({headers:e(),moves:new ze}),ze=class{constructor(){this.children=[];}*mainline(){let t=this;for(;t.children.length;){let n=t.children[0];yield n.data,t=n;}}},mt=class extends ze{constructor(t){super(),this.data=t;}};var Un=(e,t,n)=>{let r=new ze,i=[{before:e,after:r,ctx:t}],o;for(;o=i.pop();)for(let s=0;s<o.before.children.length;s++){let a=s<o.before.children.length-1?o.ctx.clone():o.ctx,u=o.before.children[s],c=n(a,u.data,s);if(g(c)){let f=new mt(c);o.after.children.push(f),i.push({before:u,after:f,ctx:a});}}return r};var Zt=()=>new Map([["Event","?"],["Site","?"],["Date","????.??.??"],["Round","?"],["White","?"],["Black","?"],["Result","*"]]);var Gn="\uFEFF",Ut=e=>/^\s*$/.test(e),Wt=e=>e.startsWith("%"),jt=class extends Error{},Yt=class{constructor(t,n=Zt,r=1e6){this.emitGame=t,this.initHeaders=n,this.maxBudget=r,this.lineBuf=[],this.resetGame(),this.state=0;}resetGame(){this.budget=this.maxBudget,this.found=!1,this.state=1,this.game=ji(this.initHeaders),this.stack=[{parent:this.game.moves,root:!0}],this.commentBuf=[];}consumeBudget(t){if(this.budget-=t,this.budget<0)throw new jt("ERR_PGN_BUDGET")}parse(t,n){if(!(this.budget<0))try{let r=0;for(;;){let i=t.indexOf(`
`,r);if(i===-1)break;let o=i>r&&t[i-1]==="\r"?i-1:i;this.consumeBudget(i-r),this.lineBuf.push(t.slice(r,o)),r=i+1,this.handleLine();}this.consumeBudget(t.length-r),this.lineBuf.push(t.slice(r)),n?.stream||(this.handleLine(),this.emit(void 0));}catch(r){this.emit(r);}}handleLine(){let t=!0,n=this.lineBuf.join("");this.lineBuf=[];e:for(;;)switch(this.state){case 0:n.startsWith(Gn)&&(n=n.slice(Gn.length)),this.state=1;case 1:if(Ut(n)||Wt(n))return;this.found=!0,this.state=2;case 2:{if(Wt(n))return;let r=!0;for(;r;)r=!1,n=n.replace(/^\s*\[([A-Za-z0-9][A-Za-z0-9_+#=:-]*)\s+"((?:[^"\\]|\\"|\\\\)*)"\]/,(i,o,s)=>(this.consumeBudget(200),this.game.headers.set(o,s.replace(/\\"/g,'"').replace(/\\\\/g,"\\")),r=!0,t=!1,""));if(Ut(n))return;this.state=3;}case 3:{if(t){if(Wt(n))return;if(Ut(n))return this.emit(void 0)}let r=/(?:[NBKRQ]?[a-h]?[1-8]?[-x]?[a-h][1-8](?:=?[nbrqkNBRQK])?|[pnbrqkPNBRQK]?@[a-h][1-8]|O-O-O|0-0-0|O-O|0-0)[+#]?|--|Z0|0000|@@@@|{|;|\$\d{1,4}|[?!]{1,2}|\(|\)|\*|1-0|0-1|1\/2-1\/2/g,i;for(;i=r.exec(n);){let o=this.stack[this.stack.length-1],s=i[0];if(s===";")return;if(s.startsWith("$"))this.handleNag(parseInt(s.slice(1),10));else if(s==="!")this.handleNag(1);else if(s==="?")this.handleNag(2);else if(s==="!!")this.handleNag(3);else if(s==="??")this.handleNag(4);else if(s==="!?")this.handleNag(5);else if(s==="?!")this.handleNag(6);else if(s==="1-0"||s==="0-1"||s==="1/2-1/2"||s==="*")this.stack.length===1&&s!=="*"&&this.game.headers.set("Result",s);else if(s==="(")this.consumeBudget(100),this.stack.push({parent:o.parent,root:!1});else if(s===")")this.stack.length>1&&this.stack.pop();else if(s==="{"){let a=r.lastIndex,u=n[a]===" "?a+1:a;n=n.slice(u),this.state=4;continue e}else this.consumeBudget(100),s==="Z0"||s==="0000"||s==="@@@@"?s="--":s.startsWith("0")&&(s=s.replace(/0/g,"O")),o.node&&(o.parent=o.node),o.node=new mt({san:s,startingComments:o.startingComments}),o.startingComments=void 0,o.root=!1,o.parent.children.push(o.node);}return}case 4:{let r=n.indexOf("}");if(r===-1){this.commentBuf.push(n);return}else {let i=r>0&&n[r-1]===" "?r-1:r;this.commentBuf.push(n.slice(0,i)),this.handleComment(),n=n.slice(r),this.state=3,t=!1;}}}}handleNag(t){var n;this.consumeBudget(50);let r=this.stack[this.stack.length-1];r.node&&((n=r.node.data).nags||(n.nags=[]),r.node.data.nags.push(t));}handleComment(){var t,n;this.consumeBudget(100);let r=this.stack[this.stack.length-1],i=this.commentBuf.join(`
`);this.commentBuf=[],r.node?((t=r.node.data).comments||(t.comments=[]),r.node.data.comments.push(i)):r.root?((n=this.game).comments||(n.comments=[]),this.game.comments.push(i)):(r.startingComments||(r.startingComments=[]),r.startingComments.push(i));}emit(t){if(this.state===4&&this.handleComment(),t)return this.emitGame(this.game,t);this.found&&this.emitGame(this.game,void 0),this.resetGame();}},Qt=(e,t=Zt)=>{let n=[];return new Yt(r=>n.push(r),t,NaN).parse(e),n},Yi=e=>{switch((e||"chess").toLowerCase()){case"chess":case"chess960":case"chess 960":case"standard":case"from position":case"classical":case"normal":case"fischerandom":case"fischerrandom":case"fischer random":case"wild/0":case"wild/1":case"wild/2":case"wild/3":case"wild/4":case"wild/5":case"wild/6":case"wild/7":case"wild/8":case"wild/8a":return "chess";case"crazyhouse":case"crazy house":case"house":case"zh":return "crazyhouse";case"king of the hill":case"koth":case"kingofthehill":return "kingofthehill";case"three-check":case"three check":case"threecheck":case"three check chess":case"3-check":case"3 check":case"3check":return "3check";case"antichess":case"anti chess":case"anti":return "antichess";case"atomic":case"atom":case"atomic chess":return "atomic";case"horde":case"horde chess":return "horde";case"racing kings":case"racingkings":case"racing":case"race":return "racingkings";default:return}};var Wn=(e,t)=>{let n=Yi(e.get("Variant"));if(!n)return m.err(new q(T.Variant));let r=e.get("FEN");return r?zn(r).chain(i=>Vn(n,i,t)):m.ok(Hn(n))};function Zi(e){switch(e){case"G":return "green";case"R":return "red";case"Y":return "yellow";case"B":return "blue";default:return}}var Qi=e=>{let t=Zi(e.slice(0,1)),n=ue(e.slice(1,3)),r=ue(e.slice(3,5));if(!(!t||!g(n))){if(e.length===3)return {color:t,from:n,to:n};if(e.length===5&&g(r))return {color:t,from:n,to:r}}};var jn=e=>{let t,n,r,i=[];return {text:e.replace(/\s?\[%(emt|clk)\s(\d{1,5}):(\d{1,2}):(\d{1,2}(?:\.\d{0,3})?)\]\s?/g,(s,a,u,c,f)=>{let p=parseInt(u,10)*3600+parseInt(c,10)*60+parseFloat(f);return a==="emt"?t=p:a==="clk"&&(n=p),"  "}).replace(/\s?\[%(?:csl|cal)\s([RGYB][a-h][1-8](?:[a-h][1-8])?(?:,[RGYB][a-h][1-8](?:[a-h][1-8])?)*)\]\s?/g,(s,a)=>{for(let u of a.split(","))i.push(Qi(u));return "  "}).replace(/\s?\[%eval\s(?:#([+-]?\d{1,5})|([+-]?(?:\d{1,5}|\d{0,5}\.\d{1,2})))(?:,(\d{1,5}))?\]\s?/g,(s,a,u,c)=>{let f=c&&parseInt(c,10);return r=a?{mate:parseInt(a,10),depth:f}:{pawns:parseFloat(u),depth:f},"  "}).trim(),shapes:i,emt:t,clock:n,evaluation:r}};function Xt(e){return t=>e&&e(t)||Ji(t)}var Ji=e=>eo[e],eo={flipTheBoard:"Flip the board",analysisBoard:"Analysis board",practiceWithComputer:"Practice with computer",getPgn:"Get PGN",download:"Download",viewOnLichess:"View on Lichess",viewOnSite:"View on site"};var Yn=["white","black"],qe=["a","b","c","d","e","f","g","h"],Fe=["1","2","3","4","5","6","7","8"];var Qn=[...Fe].reverse(),gt=Array.prototype.concat(...qe.map(e=>Fe.map(t=>e+t))),V=e=>gt[8*e[0]+e[1]],N=e=>[e.charCodeAt(0)-97,e.charCodeAt(1)-49],Xn=e=>{if(e)return e[1]==="@"?[e.slice(2,4)]:[e.slice(0,2),e.slice(2,4)]},kt=gt.map(N);function Jn(e){let t,n=()=>(t===void 0&&(t=e()),t);return n.clear=()=>{t=void 0;},n}var er=()=>{let e;return {start(){e=performance.now();},cancel(){e=void 0;},stop(){if(!e)return 0;let t=performance.now()-e;return e=void 0,t}}},bt=e=>e==="white"?"black":"white",Se=(e,t)=>{let n=e[0]-t[0],r=e[1]-t[1];return n*n+r*r},$e=(e,t)=>e.role===t.role&&e.color===t.color,Ce=e=>(t,n)=>[(n?t[0]:7-t[0])*e.width/8,(n?7-t[1]:t[1])*e.height/8],Z=(e,t)=>{e.style.transform=`translate(${t[0]}px,${t[1]}px)`;},Jt=(e,t,n=1)=>{e.style.transform=`translate(${t[0]}px,${t[1]}px) scale(${n})`;},He=(e,t)=>{e.style.visibility=t?"visible":"hidden";},le=e=>{var t;if(e.clientX||e.clientX===0)return [e.clientX,e.clientY];if(!((t=e.targetTouches)===null||t===void 0)&&t[0])return [e.targetTouches[0].clientX,e.targetTouches[0].clientY]},wt=e=>e.buttons===2||e.button===2,Q=(e,t)=>{let n=document.createElement(e);return t&&(n.className=t),n};function vt(e,t,n){let r=N(e);return t||(r[0]=7-r[0],r[1]=7-r[1]),[n.left+n.width*r[0]/8+n.width/16,n.top+n.height*(7-r[1])/8+n.height/16]}var te=class e{constructor(t){this.path=t;this.size=()=>this.path.length/2;this.head=()=>this.path.slice(0,2);this.tail=()=>new e(this.path.slice(2));this.init=()=>new e(this.path.slice(0,-2));this.last=()=>this.path.slice(-2);this.empty=()=>this.path=="";this.contains=t=>this.path.startsWith(t.path);this.isChildOf=t=>this.init()===t;this.append=t=>new e(this.path+t);this.equals=t=>this.path==t.path;}static{this.root=new e("");}};var yt=class{constructor(t,n,r,i){this.initial=t;this.moves=n;this.players=r;this.metadata=i;this.nodeAt=t=>tr(this.moves,t);this.dataAt=t=>{let n=this.nodeAt(t);return n?no(n)?n.data:this.initial:void 0};this.title=()=>this.players.white.name?[this.players.white.title,this.players.white.name,"vs",this.players.black.title,this.players.black.name].filter(t=>t&&!!t.trim()).join("_").replace(" ","-"):"lichess-pgn-viewer";this.pathAtMainlinePly=t=>t==0?te.root:this.mainline[Math.max(0,Math.min(this.mainline.length-1,t=="last"?9999:t-1))]?.path||te.root;this.hasPlayerName=()=>!!(this.players.white?.name||this.players.black?.name);this.mainline=Array.from(this.moves.mainline());}},to=(e,t)=>e.children.find(n=>n.data.path.last()==t),tr=(e,t)=>{if(t.empty())return e;let n=to(e,t.head());return n?tr(n,t.tail()):void 0},no=e=>"data"in e,nr=e=>"uci"in e;var en=class e{constructor(t,n,r){this.pos=t;this.path=n;this.clocks=r;this.clone=()=>new e(this.pos.clone(),this.path,{...this.clocks});}},tn=e=>{let t=e.map(jn),n=r=>r.reduce((i,o)=>typeof o==null?i:o,void 0);return {texts:t.map(r=>r.text).filter(r=>!!r),shapes:t.flatMap(r=>r.shapes),clock:n(t.map(r=>r.clock)),emt:n(t.map(r=>r.emt))}},rr=(e,t=!1)=>{let n=Qt(e)[0]||Qt("*")[0],r=Wn(n.headers).unwrap(),i=at(r.toSetup()),o=tn(n.comments||[]),s=new Map(Array.from(n.headers,([p,S])=>[p.toLowerCase(),S])),a=so(s,t),u={fen:i,turn:r.turn,check:r.isCheck(),pos:r.clone(),comments:o.texts,shapes:o.shapes,clocks:{white:a.timeControl?.initial||o.clock,black:a.timeControl?.initial||o.clock}},c=ro(r,n.moves,a),f=oo(s,a);return new yt(u,c,f,a)},ro=(e,t,n)=>Un(t,new en(e,te.root,{}),(r,i,o)=>{let s=$n(r.pos,i.san);if(!s)return;let a=Dn(s),u=r.path.append(a),c=Fn(r.pos,s);r.path=u;let f=r.pos.toSetup(),p=tn(i.comments||[]),S=tn(i.startingComments||[]),b=[...p.shapes,...S.shapes],d=(f.fullmoves-1)*2+(r.pos.turn==="white"?0:1),h=r.clocks=io(r.clocks,r.pos.turn,p.clock);return d<2&&n.timeControl&&(h={white:n.timeControl.initial,black:n.timeControl.initial,...h}),{path:u,ply:d,move:s,san:c,uci:Dt(s),fen:at(r.pos.toSetup()),turn:r.pos.turn,check:r.pos.isCheck(),comments:p.texts,startingComments:S.texts,nags:i.nags||[],shapes:b,clocks:h,emt:p.emt}}),io=(e,t,n)=>t=="white"?{...e,black:n}:{...e,white:n};function oo(e,t){let n=(i,o)=>{let s=e.get(`${i}${o}`);return s=="?"||s==""?void 0:s},r=i=>{let o=n(i,"");return {name:o,title:n(i,"title"),rating:parseInt(n(i,"elo")||"")||void 0,isLichessUser:t.isLichess&&!!o?.match(/^[a-z0-9][a-z0-9_-]{0,28}[a-z0-9]$/i)}};return {white:r("white"),black:r("black")}}function so(e,t){let n=e.get("source")||e.get("site"),r=e.get("timecontrol")?.split("+").map(s=>parseInt(s)),i=r&&r[0]?{initial:r[0],increment:r[1]||0}:void 0,o=e.get("orientation");return {externalLink:n&&n.match(/^https?:\/\//)?n:void 0,isLichess:!!(t&&n?.startsWith(t)),timeControl:i,orientation:o==="white"||o==="black"?o:void 0}}var Ge=class{constructor(t,n){this.opts=t;this.redraw=n;this.flipped=!1;this.pane="board";this.autoScrollRequested=!1;this.curNode=()=>this.game.nodeAt(this.path)||this.game.moves;this.curData=()=>this.game.dataAt(this.path)||this.game.initial;this.goTo=(t,n=!0)=>{let r=t=="first"?te.root:t=="prev"?this.path.init():t=="next"?this.game.nodeAt(this.path)?.children[0]?.data.path:this.game.pathAtMainlinePly("last");this.toPath(r||this.path,n);};this.canGoTo=t=>t=="prev"||t=="first"?!this.path.empty():!!this.curNode().children[0];this.toPath=(t,n=!0)=>{this.div?.dispatchEvent(new CustomEvent("pathChange",{detail:{path:t}})),this.path=t,this.pane="board",this.autoScrollRequested=!0,this.redrawGround(),this.redraw(),n&&this.focus();};this.focus=()=>this.div?.focus();this.toggleMenu=()=>{this.pane=this.pane=="board"?"menu":"board",this.redraw();};this.togglePgn=()=>{this.pane=this.pane=="pgn"?"board":"pgn",this.redraw();};this.orientation=()=>{let t=this.opts.orientation||"white";return this.flipped?P(t):t};this.flip=()=>{this.flipped=!this.flipped,this.pane="board",this.redrawGround(),this.redraw();};this.cgState=()=>{let t=this.curData(),n=nr(t)?Xn(t.uci):this.opts.chessground?.lastMove;return {fen:t.fen,orientation:this.orientation(),check:t.check,lastMove:n,turnColor:t.turn}};this.analysisUrl=()=>this.game.metadata.isLichess&&this.game.metadata.externalLink||`https://lichess.org/analysis/${this.curData().fen.replace(" ","_")}?color=${this.orientation()}`;this.practiceUrl=()=>`${this.analysisUrl()}#practice`;this.setGround=t=>{this.ground=t,this.redrawGround();};this.redrawGround=()=>this.withGround(t=>{t.set(this.cgState()),t.setShapes(this.curData().shapes.map(n=>({orig:W(n.from),dest:W(n.to),brush:n.color})));});this.withGround=t=>this.ground&&t(this.ground);this.game=rr(t.pgn,t.lichess),t.orientation=t.orientation||this.game.metadata.orientation,this.translate=Xt(t.translate),this.path=this.game.pathAtMainlinePly(t.initialPly);}};var Ae=(e,t)=>Math.abs(e-t),ao=e=>(t,n,r,i)=>Ae(t,r)<2&&(e==="white"?i===n+1||n<=1&&i===n+2&&t===r:i===n-1||n>=6&&i===n-2&&t===r),nn=(e,t,n,r)=>{let i=Ae(e,n),o=Ae(t,r);return i===1&&o===2||i===2&&o===1},ir=(e,t,n,r)=>Ae(e,n)===Ae(t,r),or=(e,t,n,r)=>e===n||t===r,rn=(e,t,n,r)=>ir(e,t,n,r)||or(e,t,n,r),co=(e,t,n)=>(r,i,o,s)=>Ae(r,o)<2&&Ae(i,s)<2||n&&i===s&&i===(e==="white"?0:7)&&(r===4&&(o===2&&t.includes(0)||o===6&&t.includes(7))||t.includes(o));function lo(e,t){let n=t==="white"?"1":"8",r=[];for(let[i,o]of e)i[1]===n&&o.color===t&&o.role==="rook"&&r.push(N(i)[0]);return r}function on(e,t,n){let r=e.get(t);if(!r)return [];let i=N(t),o=r.role,s=o==="pawn"?ao(r.color):o==="knight"?nn:o==="bishop"?ir:o==="rook"?or:o==="queen"?rn:co(r.color,lo(e,r.color),n);return kt.filter(a=>(i[0]!==a[0]||i[1]!==a[1])&&s(i[0],i[1],a[0],a[1])).map(V)}function U(e,...t){e&&setTimeout(()=>e(...t),1);}function sr(e){e.orientation=bt(e.orientation),e.animation.current=e.draggable.current=e.selected=void 0;}function ar(e,t){for(let[n,r]of t)r?e.pieces.set(n,r):e.pieces.delete(n);}function cr(e,t){if(e.check=void 0,t===!0&&(t=e.turnColor),t)for(let[n,r]of e.pieces)r.role==="king"&&r.color===t&&(e.check=n);}function uo(e,t,n,r){re(e),e.premovable.current=[t,n],U(e.premovable.events.set,t,n,r);}function ne(e){e.premovable.current&&(e.premovable.current=void 0,U(e.premovable.events.unset));}function ho(e,t,n){ne(e),e.predroppable.current={role:t,key:n},U(e.predroppable.events.set,t,n);}function re(e){let t=e.predroppable;t.current&&(t.current=void 0,U(t.events.unset));}function fo(e,t,n){if(!e.autoCastle)return !1;let r=e.pieces.get(t);if(!r||r.role!=="king")return !1;let i=N(t),o=N(n);if(i[1]!==0&&i[1]!==7||i[1]!==o[1])return !1;i[0]===4&&!e.pieces.has(n)&&(o[0]===6?n=V([7,o[1]]):o[0]===2&&(n=V([0,o[1]])));let s=e.pieces.get(n);return !s||s.color!==r.color||s.role!=="rook"?!1:(e.pieces.delete(t),e.pieces.delete(n),i[0]<o[0]?(e.pieces.set(V([6,o[1]]),r),e.pieces.set(V([5,o[1]]),s)):(e.pieces.set(V([2,o[1]]),r),e.pieces.set(V([3,o[1]]),s)),!0)}function sn(e,t,n){let r=e.pieces.get(t),i=e.pieces.get(n);if(t===n||!r)return !1;let o=i&&i.color!==r.color?i:void 0;return n===e.selected&&G(e),U(e.events.move,t,n,o),fo(e,t,n)||(e.pieces.set(n,r),e.pieces.delete(t)),e.lastMove=[t,n],e.check=void 0,U(e.events.change),o||!0}function xt(e,t,n,r){if(e.pieces.has(n))if(r)e.pieces.delete(n);else return !1;return U(e.events.dropNewPiece,t,n),e.pieces.set(n,t),e.lastMove=[n],e.check=void 0,U(e.events.change),e.movable.dests=void 0,e.turnColor=bt(e.turnColor),!0}function lr(e,t,n){let r=sn(e,t,n);return r&&(e.movable.dests=void 0,e.turnColor=bt(e.turnColor),e.animation.current=void 0),r}function an(e,t,n){if(Ct(e,t,n)){let r=lr(e,t,n);if(r){let i=e.hold.stop();G(e);let o={premove:!1,ctrlKey:e.stats.ctrlKey,holdTime:i};return r!==!0&&(o.captured=r),U(e.movable.events.after,t,n,o),!0}}else if(mo(e,t,n))return uo(e,t,n,{ctrlKey:e.stats.ctrlKey}),G(e),!0;return G(e),!1}function St(e,t,n,r){let i=e.pieces.get(t);i&&(po(e,t,n)||r)?(e.pieces.delete(t),xt(e,i,n,r),U(e.movable.events.afterNewPiece,i.role,n,{premove:!1,predrop:!1})):i&&go(e,t,n)?ho(e,i.role,n):(ne(e),re(e)),e.pieces.delete(t),G(e);}function Ue(e,t,n){if(U(e.events.select,t),e.selected){if(e.selected===t&&!e.draggable.enabled){G(e),e.hold.cancel();return}else if((e.selectable.enabled||n)&&e.selected!==t&&an(e,e.selected,t)){e.stats.dragged=!1;return}}(e.selectable.enabled||e.draggable.enabled)&&(ur(e,t)||ln(e,t))&&(cn(e,t),e.hold.start());}function cn(e,t){e.selected=t,ln(e,t)?e.premovable.customDests||(e.premovable.dests=on(e.pieces,t,e.premovable.castle)):e.premovable.dests=void 0;}function G(e){e.selected=void 0,e.premovable.dests=void 0,e.hold.cancel();}function ur(e,t){let n=e.pieces.get(t);return !!n&&(e.movable.color==="both"||e.movable.color===n.color&&e.turnColor===n.color)}var Ct=(e,t,n)=>{var r,i;return t!==n&&ur(e,t)&&(e.movable.free||!!(!((i=(r=e.movable.dests)===null||r===void 0?void 0:r.get(t))===null||i===void 0)&&i.includes(n)))};function po(e,t,n){let r=e.pieces.get(t);return !!r&&(t===n||!e.pieces.has(n))&&(e.movable.color==="both"||e.movable.color===r.color&&e.turnColor===r.color)}function ln(e,t){let n=e.pieces.get(t);return !!n&&e.premovable.enabled&&e.movable.color===n.color&&e.turnColor!==n.color}function mo(e,t,n){var r,i;let o=(i=(r=e.premovable.customDests)===null||r===void 0?void 0:r.get(t))!==null&&i!==void 0?i:on(e.pieces,t,e.premovable.castle);return t!==n&&ln(e,t)&&o.includes(n)}function go(e,t,n){let r=e.pieces.get(t),i=e.pieces.get(n);return !!r&&(!i||i.color!==e.movable.color)&&e.predroppable.enabled&&(r.role!=="pawn"||n[1]!=="1"&&n[1]!=="8")&&e.movable.color===r.color&&e.turnColor!==r.color}function dr(e,t){let n=e.pieces.get(t);return !!n&&e.draggable.enabled&&(e.movable.color==="both"||e.movable.color===n.color&&(e.turnColor===n.color||e.premovable.enabled))}function hr(e){let t=e.premovable.current;if(!t)return !1;let n=t[0],r=t[1],i=!1;if(Ct(e,n,r)){let o=lr(e,n,r);if(o){let s={premove:!0};o!==!0&&(s.captured=o),U(e.movable.events.after,n,r,s),i=!0;}}return ne(e),i}function fr(e,t){let n=e.predroppable.current,r=!1;if(!n)return !1;if(t(n)){let i={role:n.role,color:e.movable.color};xt(e,i,n.key)&&(U(e.movable.events.afterNewPiece,n.role,n.key,{premove:!1,predrop:!0}),r=!0);}return re(e),r}function We(e){ne(e),re(e),G(e);}function un(e){e.movable.color=e.movable.dests=e.animation.current=void 0,We(e);}function ie(e,t,n){let r=Math.floor(8*(e[0]-n.left)/n.width);t||(r=7-r);let i=7-Math.floor(8*(e[1]-n.top)/n.height);return t||(i=7-i),r>=0&&r<8&&i>=0&&i<8?V([r,i]):void 0}function pr(e,t,n,r){let i=N(e),o=kt.filter(c=>rn(i[0],i[1],c[0],c[1])||nn(i[0],i[1],c[0],c[1])),a=o.map(c=>vt(V(c),n,r)).map(c=>Se(t,c)),[,u]=a.reduce((c,f,p)=>c[0]<f?c:[f,p],[a[0],0]);return V(o[u])}var I=e=>e.orientation==="white";var hn="rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR",ko={p:"pawn",r:"rook",n:"knight",b:"bishop",q:"queen",k:"king"},bo={pawn:"p",rook:"r",knight:"n",bishop:"b",queen:"q",king:"k"};function Pt(e){e==="start"&&(e=hn);let t=new Map,n=7,r=0;for(let i of e)switch(i){case" ":case"[":return t;case"/":if(--n,n<0)return t;r=0;break;case"~":{let o=t.get(V([r-1,n]));o&&(o.promoted=!0);break}default:{let o=i.charCodeAt(0);if(o<57)r+=o-48;else {let s=i.toLowerCase();t.set(V([r,n]),{role:ko[s],color:i===s?"black":"white"}),++r;}}}return t}function mr(e){return Qn.map(t=>qe.map(n=>{let r=e.get(n+t);if(r){let i=bo[r.role];return r.color==="white"&&(i=i.toUpperCase()),r.promoted&&(i+="~"),i}else return "1"}).join("")).join("/").replace(/1{2,}/g,t=>t.length.toString())}function fn(e,t){t.animation&&(pn(e.animation,t.animation),(e.animation.duration||0)<70&&(e.animation.enabled=!1));}function Mt(e,t){var n,r,i;if(!((n=t.movable)===null||n===void 0)&&n.dests&&(e.movable.dests=void 0),!((r=t.drawable)===null||r===void 0)&&r.autoShapes&&(e.drawable.autoShapes=[]),pn(e,t),t.fen&&(e.pieces=Pt(t.fen),e.drawable.shapes=((i=t.drawable)===null||i===void 0?void 0:i.shapes)||[]),"check"in t&&cr(e,t.check||!1),"lastMove"in t&&!t.lastMove?e.lastMove=void 0:t.lastMove&&(e.lastMove=t.lastMove),e.selected&&cn(e,e.selected),fn(e,t),!e.movable.rookCastle&&e.movable.dests){let o=e.movable.color==="white"?"1":"8",s="e"+o,a=e.movable.dests.get(s),u=e.pieces.get(s);if(!a||!u||u.role!=="king")return;e.movable.dests.set(s,a.filter(c=>!(c==="a"+o&&a.includes("c"+o))&&!(c==="h"+o&&a.includes("g"+o))));}}function pn(e,t){for(let n in t)Object.prototype.hasOwnProperty.call(t,n)&&(Object.prototype.hasOwnProperty.call(e,n)&&gr(e[n])&&gr(t[n])?pn(e[n],t[n]):e[n]=t[n]);}function gr(e){if(typeof e!="object"||e===null)return !1;let t=Object.getPrototypeOf(e);return t===Object.prototype||t===null}var fe=(e,t)=>t.animation.enabled?xo(e,t):pe(e,t);function pe(e,t){let n=e(t);return t.dom.redraw(),n}var mn=(e,t)=>({key:e,pos:N(e),piece:t}),vo=(e,t)=>t.sort((n,r)=>Se(e.pos,n.pos)-Se(e.pos,r.pos))[0];function yo(e,t){let n=new Map,r=[],i=new Map,o=[],s=[],a=new Map,u,c,f;for(let[p,S]of e)a.set(p,mn(p,S));for(let p of gt)u=t.pieces.get(p),c=a.get(p),u?c?$e(u,c.piece)||(o.push(c),s.push(mn(p,u))):s.push(mn(p,u)):c&&o.push(c);for(let p of s)c=vo(p,o.filter(S=>$e(p.piece,S.piece))),c&&(f=[c.pos[0]-p.pos[0],c.pos[1]-p.pos[1]],n.set(p.key,f.concat(f)),r.push(c.key));for(let p of o)r.includes(p.key)||i.set(p.key,p.piece);return {anims:n,fadings:i}}function kr(e,t){let n=e.animation.current;if(n===void 0){e.dom.destroyed||e.dom.redrawNow();return}let r=1-(t-n.start)*n.frequency;if(r<=0)e.animation.current=void 0,e.dom.redrawNow();else {let i=So(r);for(let o of n.plan.anims.values())o[2]=o[0]*i,o[3]=o[1]*i;e.dom.redrawNow(!0),requestAnimationFrame((o=performance.now())=>kr(e,o));}}function xo(e,t){let n=new Map(t.pieces),r=e(t),i=yo(n,t);if(i.anims.size||i.fadings.size){let o=t.animation.current&&t.animation.current.start;t.animation.current={start:performance.now(),frequency:1/t.animation.duration,plan:i},o||kr(t,performance.now());}else t.dom.redraw();return r}var So=e=>e<.5?4*e*e*e:(e-1)*(2*e-2)*(2*e-2)+1;var Co=["green","red","blue","yellow"];function br(e,t){if(t.touches&&t.touches.length>1)return;t.stopPropagation(),t.preventDefault(),t.ctrlKey?G(e):We(e);let n=le(t),r=ie(n,I(e),e.dom.bounds());r&&(e.drawable.current={orig:r,pos:n,brush:Po(t),snapToValidMove:e.drawable.defaultSnapToValidMove},wr(e));}function wr(e){requestAnimationFrame(()=>{let t=e.drawable.current;if(t){let n=ie(t.pos,I(e),e.dom.bounds());n||(t.snapToValidMove=!1);let r=t.snapToValidMove?pr(t.orig,t.pos,I(e),e.dom.bounds()):n;r!==t.mouseSq&&(t.mouseSq=r,t.dest=r!==t.orig?r:void 0,e.dom.redrawNow()),wr(e);}});}function vr(e,t){e.drawable.current&&(e.drawable.current.pos=le(t));}function yr(e){let t=e.drawable.current;t&&(t.mouseSq&&Mo(e.drawable,t),gn(e));}function gn(e){e.drawable.current&&(e.drawable.current=void 0,e.dom.redraw());}function xr(e){e.drawable.shapes.length&&(e.drawable.shapes=[],e.dom.redraw(),Sr(e.drawable));}function Po(e){var t;let n=(e.shiftKey||e.ctrlKey)&&wt(e),r=e.altKey||e.metaKey||((t=e.getModifierState)===null||t===void 0?void 0:t.call(e,"AltGraph"));return Co[(n?1:0)+(r?2:0)]}function Mo(e,t){let n=i=>i.orig===t.orig&&i.dest===t.dest,r=e.shapes.find(n);r&&(e.shapes=e.shapes.filter(i=>!n(i))),(!r||r.brush!==t.brush)&&e.shapes.push({orig:t.orig,dest:t.dest,brush:t.brush}),Sr(e);}function Sr(e){e.onChange&&e.onChange(e.shapes);}function Cr(e,t){if(!(e.trustAllEvents||t.isTrusted)||t.button!==void 0&&t.button!==0||t.touches&&t.touches.length>1)return;let n=e.dom.bounds(),r=le(t),i=ie(r,I(e),n);if(!i)return;let o=e.pieces.get(i),s=e.selected;if(!s&&e.drawable.enabled&&(e.drawable.eraseOnClick||!o||o.color!==e.turnColor)&&xr(e),t.cancelable!==!1&&(!t.touches||e.blockTouchScroll||o||s||Ao(e,r)))t.preventDefault();else if(t.touches)return;let a=!!e.premovable.current,u=!!e.predroppable.current;e.stats.ctrlKey=t.ctrlKey,e.selected&&Ct(e,e.selected,i)?fe(p=>Ue(p,i),e):Ue(e,i);let c=e.selected===i,f=_r(e,i);if(o&&f&&c&&dr(e,i)){e.draggable.current={orig:i,piece:o,origPos:r,pos:r,started:e.draggable.autoDistance&&e.stats.dragged,element:f,previouslySelected:s,originTarget:t.target,keyHasChanged:!1},f.cgDragging=!0,f.classList.add("dragging");let p=e.dom.elements.ghost;p&&(p.className=`ghost ${o.color} ${o.role}`,Z(p,Ce(n)(N(i),I(e))),He(p,!0)),kn(e);}else a&&ne(e),u&&re(e);e.dom.redraw();}function Ao(e,t){let n=I(e),r=e.dom.bounds(),i=Math.pow(r.width/8,2);for(let o of e.pieces.keys()){let s=vt(o,n,r);if(Se(s,t)<=i)return !0}return !1}function Pr(e,t,n,r){let i="a0";e.pieces.set(i,t),e.dom.redraw();let o=le(n);e.draggable.current={orig:i,piece:t,origPos:o,pos:o,started:!0,element:()=>_r(e,i),originTarget:n.target,newPiece:!0,force:!!r,keyHasChanged:!1},kn(e);}function kn(e){requestAnimationFrame(()=>{var t;let n=e.draggable.current;if(!n)return;!((t=e.animation.current)===null||t===void 0)&&t.plan.anims.has(n.orig)&&(e.animation.current=void 0);let r=e.pieces.get(n.orig);if(!r||!$e(r,n.piece))_e(e);else if(!n.started&&Se(n.pos,n.origPos)>=Math.pow(e.draggable.distance,2)&&(n.started=!0),n.started){if(typeof n.element=="function"){let o=n.element();if(!o)return;o.cgDragging=!0,o.classList.add("dragging"),n.element=o;}let i=e.dom.bounds();Z(n.element,[n.pos[0]-i.left-i.width/16,n.pos[1]-i.top-i.height/16]),n.keyHasChanged||(n.keyHasChanged=n.orig!==ie(n.pos,I(e),i));}kn(e);});}function Mr(e,t){e.draggable.current&&(!t.touches||t.touches.length<2)&&(e.draggable.current.pos=le(t));}function Er(e,t){let n=e.draggable.current;if(!n)return;if(t.type==="touchend"&&t.cancelable!==!1&&t.preventDefault(),t.type==="touchend"&&n.originTarget!==t.target&&!n.newPiece){e.draggable.current=void 0;return}ne(e),re(e);let r=le(t)||n.pos,i=ie(r,I(e),e.dom.bounds());i&&n.started&&n.orig!==i?n.newPiece?St(e,n.orig,i,n.force):(e.stats.ctrlKey=t.ctrlKey,an(e,n.orig,i)&&(e.stats.dragged=!0)):n.newPiece?e.pieces.delete(n.orig):e.draggable.deleteOnDropOff&&!i&&(e.pieces.delete(n.orig),U(e.events.change)),(n.orig===n.previouslySelected||n.keyHasChanged)&&(n.orig===i||!i)?G(e):e.selectable.enabled||G(e),Ar(e),e.draggable.current=void 0,e.dom.redraw();}function _e(e){let t=e.draggable.current;t&&(t.newPiece&&e.pieces.delete(t.orig),e.draggable.current=void 0,G(e),Ar(e),e.dom.redraw());}function Ar(e){let t=e.dom.elements;t.ghost&&He(t.ghost,!1);}function _r(e,t){let n=e.dom.elements.board.firstChild;for(;n;){if(n.cgKey===t&&n.tagName==="PIECE")return n;n=n.nextSibling;}}function Nr(e,t){e.exploding={stage:1,keys:t},e.dom.redraw(),setTimeout(()=>{Rr(e,2),setTimeout(()=>Rr(e,void 0),120);},120);}function Rr(e,t){e.exploding&&(t?e.exploding.stage=t:e.exploding=void 0,e.dom.redraw());}function Or(e,t){function n(){sr(e),t();}return {set(r){r.orientation&&r.orientation!==e.orientation&&n(),fn(e,r),(r.fen?fe:pe)(i=>Mt(i,r),e);},state:e,getFen:()=>mr(e.pieces),toggleOrientation:n,setPieces(r){fe(i=>ar(i,r),e);},selectSquare(r,i){r?fe(o=>Ue(o,r,i),e):e.selected&&(G(e),e.dom.redraw());},move(r,i){fe(o=>sn(o,r,i),e);},newPiece(r,i){fe(o=>xt(o,r,i),e);},playPremove(){if(e.premovable.current){if(fe(hr,e))return !0;e.dom.redraw();}return !1},playPredrop(r){if(e.predroppable.current){let i=fr(e,r);return e.dom.redraw(),i}return !1},cancelPremove(){pe(ne,e);},cancelPredrop(){pe(re,e);},cancelMove(){pe(r=>{We(r),_e(r);},e);},stop(){pe(r=>{un(r),_e(r);},e);},explode(r){Nr(e,r);},setAutoShapes(r){pe(i=>i.drawable.autoShapes=r,e);},setShapes(r){pe(i=>i.drawable.shapes=r,e);},getKeyAtDomPos(r){return ie(r,I(e),e.dom.bounds())},redrawAll:t,dragNewPiece(r,i,o){Pr(e,r,i,o);},destroy(){un(e),e.dom.unbind&&e.dom.unbind(),e.dom.destroyed=!0;}}}function Tr(){return {pieces:Pt(hn),orientation:"white",turnColor:"white",coordinates:!0,ranksPosition:"right",autoCastle:!0,viewOnly:!1,disableContextMenu:!1,addPieceZIndex:!1,blockTouchScroll:!1,pieceKey:!1,trustAllEvents:!1,highlight:{lastMove:!0,check:!0},animation:{enabled:!0,duration:200},movable:{free:!0,color:"both",showDests:!0,events:{},rookCastle:!0},premovable:{enabled:!0,showDests:!0,castle:!0,events:{}},predroppable:{enabled:!1,events:{}},draggable:{enabled:!0,distance:3,autoDistance:!0,showGhost:!0,deleteOnDropOff:!1},dropmode:{active:!1},selectable:{enabled:!0},stats:{dragged:!("ontouchstart"in window)},events:{},drawable:{enabled:!0,visible:!0,defaultSnapToValidMove:!0,eraseOnClick:!0,shapes:[],autoShapes:[],brushes:{green:{key:"g",color:"#15781B",opacity:1,lineWidth:10},red:{key:"r",color:"#882020",opacity:1,lineWidth:10},blue:{key:"b",color:"#003088",opacity:1,lineWidth:10},yellow:{key:"y",color:"#e68f00",opacity:1,lineWidth:10},paleBlue:{key:"pb",color:"#003088",opacity:.4,lineWidth:15},paleGreen:{key:"pg",color:"#15781B",opacity:.4,lineWidth:15},paleRed:{key:"pr",color:"#882020",opacity:.4,lineWidth:15},paleGrey:{key:"pgr",color:"#4a4a4a",opacity:.35,lineWidth:15},purple:{key:"purp",color:"#68217a",opacity:.65,lineWidth:10},pink:{key:"pink",color:"#ee2080",opacity:.5,lineWidth:10},hilite:{key:"hilite",color:"#fff",opacity:1,lineWidth:1}},prevSvgHash:""},hold:er()}}function Lr(){let e=B("defs"),t=$(B("filter"),{id:"cg-filter-blur"});return t.appendChild($(B("feGaussianBlur"),{stdDeviation:"0.022"})),e.appendChild(t),e}function Ir(e,t,n){var r;let i=e.drawable,o=i.current,s=o&&o.mouseSq?o:void 0,a=new Map,u=e.dom.bounds(),c=i.autoShapes.filter(b=>!b.piece);for(let b of i.shapes.concat(c).concat(s?[s]:[])){if(!b.dest)continue;let d=(r=a.get(b.dest))!==null&&r!==void 0?r:new Set,h=At(Et(N(b.orig),e.orientation),u),w=At(Et(N(b.dest),e.orientation),u);d.add(wn(h,w)),a.set(b.dest,d);}let f=i.shapes.concat(c).map(b=>({shape:b,current:!1,hash:qr(b,bn(b.dest,a),!1,u)}));s&&f.push({shape:s,current:!0,hash:qr(s,bn(s.dest,a),!0,u)});let p=f.map(b=>b.hash).join(";");if(p===e.drawable.prevSvgHash)return;e.drawable.prevSvgHash=p;let S=t.querySelector("defs");Ro(i,f,S),No(f,t.querySelector("g"),n.querySelector("g"),b=>qo(e,b,i.brushes,a,u));}function Ro(e,t,n){var r;let i=new Map,o;for(let u of t.filter(c=>c.shape.dest&&c.shape.brush))o=Br(e.brushes[u.shape.brush],u.shape.modifiers),!((r=u.shape.modifiers)===null||r===void 0)&&r.hilite&&i.set("hilite",e.brushes.hilite),i.set(o.key,o);let s=new Set,a=n.firstElementChild;for(;a;)s.add(a.getAttribute("cgKey")),a=a.nextElementSibling;for(let[u,c]of i.entries())s.has(u)||n.appendChild(Io(c));}function No(e,t,n,r){let i=new Map;for(let o of e)i.set(o.hash,!1);for(let o of [t,n]){let s=[],a=o.firstElementChild,u;for(;a;)u=a.getAttribute("cgHash"),i.has(u)?i.set(u,!0):s.push(a),a=a.nextElementSibling;for(let c of s)o.removeChild(c);}for(let o of e.filter(s=>!i.get(s.hash)))for(let s of r(o))s.isCustom?n.appendChild(s.el):t.appendChild(s.el);}function qr({orig:e,dest:t,brush:n,piece:r,modifiers:i,customSvg:o,label:s},a,u,c){var f,p;return [c.width,c.height,u,e,t,n,a&&"-",r&&Oo(r),i&&To(i),o&&`custom-${Dr(o.html)},${(p=(f=o.center)===null||f===void 0?void 0:f[0])!==null&&p!==void 0?p:"o"}`,s&&`label-${Dr(s.text)}`].filter(S=>S).join(",")}function Oo(e){return [e.color,e.role,e.scale].filter(t=>t).join(",")}function To(e){return [e.lineWidth,e.hilite&&"*"].filter(t=>t).join(",")}function Dr(e){let t=0;for(let n=0;n<e.length;n++)t=(t<<5)-t+e.charCodeAt(n)>>>0;return t.toString()}function qo(e,{shape:t,current:n,hash:r},i,o,s){var a,u;let c=At(Et(N(t.orig),e.orientation),s),f=t.dest?At(Et(N(t.dest),e.orientation),s):c,p=t.brush&&Br(i[t.brush],t.modifiers),S=o.get(t.dest),b=[];if(p){let d=$(B("g"),{cgHash:r});b.push({el:d}),c[0]!==f[0]||c[1]!==f[1]?d.appendChild(Lo(t,p,c,f,n,bn(t.dest,o))):d.appendChild(Do(i[t.brush],c,n,s));}if(t.label){let d=t.label;(a=d.fill)!==null&&a!==void 0||(d.fill=t.brush&&i[t.brush].color);let h=t.brush?void 0:"tr";b.push({el:Bo(d,r,c,f,S,h),isCustom:!0});}if(t.customSvg){let d=(u=t.customSvg.center)!==null&&u!==void 0?u:"orig",[h,w]=d==="label"?zr(c,f,S).map(y=>y-.5):d==="dest"?f:c,k=$(B("g"),{transform:`translate(${h},${w})`,cgHash:r});k.innerHTML=`<svg width="1" height="1" viewBox="0 0 100 100">${t.customSvg.html}</svg>`,b.push({el:k,isCustom:!0});}return b}function Do(e,t,n,r){let i=Ko(),o=(r.width+r.height)/(4*Math.max(r.width,r.height));return $(B("circle"),{stroke:e.color,"stroke-width":i[n?0:1],fill:"none",opacity:Kr(e,n),cx:t[0],cy:t[1],r:o-i[1]/2})}function Lo(e,t,n,r,i,o){var s;function a(f){var p;let S=Fo(o&&!i),b=r[0]-n[0],d=r[1]-n[1],h=Math.atan2(d,b),w=Math.cos(h)*S,k=Math.sin(h)*S;return $(B("line"),{stroke:f?"white":t.color,"stroke-width":zo(t,i)+(f?.04:0),"stroke-linecap":"round","marker-end":`url(#arrowhead-${f?"hilite":t.key})`,opacity:!((p=e.modifiers)===null||p===void 0)&&p.hilite?1:Kr(t,i),x1:n[0],y1:n[1],x2:r[0]-w,y2:r[1]-k})}if(!(!((s=e.modifiers)===null||s===void 0)&&s.hilite))return a(!1);let u=B("g"),c=$(B("g"),{filter:"url(#cg-filter-blur)"});return c.appendChild($o(n,r)),c.appendChild(a(!0)),u.appendChild(c),u.appendChild(a(!1)),u}function Io(e){let t=$(B("marker"),{id:"arrowhead-"+e.key,orient:"auto",overflow:"visible",markerWidth:4,markerHeight:4,refX:e.key==="hilite"?1.86:2.05,refY:2});return t.appendChild($(B("path"),{d:"M0,0 V4 L3,2 Z",fill:e.color})),t.setAttribute("cgKey",e.key),t}function Bo(e,t,n,r,i,o){var s;let u=.4*.75**e.text.length,c=zr(n,r,i),f=o==="tr"?.4:0,p=$(B("g"),{transform:`translate(${c[0]+f},${c[1]-f})`,cgHash:t});p.appendChild($(B("circle"),{r:.4/2,"fill-opacity":o?1:.8,"stroke-opacity":o?1:.7,"stroke-width":.03,fill:(s=e.fill)!==null&&s!==void 0?s:"#666",stroke:"white"}));let S=$(B("text"),{"font-size":u,"font-family":"Noto Sans","text-anchor":"middle",fill:"white",y:.13*.75**e.text.length});return S.innerHTML=e.text,p.appendChild(S),p}function Et(e,t){return t==="white"?e:[7-e[0],7-e[1]]}function bn(e,t){return (e&&t.has(e)&&t.get(e).size>1)===!0}function B(e){return document.createElementNS("http://www.w3.org/2000/svg",e)}function $(e,t){for(let n in t)Object.prototype.hasOwnProperty.call(t,n)&&e.setAttribute(n,t[n]);return e}function Br(e,t){return t?{color:e.color,opacity:Math.round(e.opacity*10)/10,lineWidth:Math.round(t.lineWidth||e.lineWidth),key:[e.key,t.lineWidth].filter(n=>n).join("")}:e}function Ko(){return [3/64,4/64]}function zo(e,t){return (e.lineWidth||10)*(t?.85:1)/64}function Kr(e,t){return (e.opacity||1)*(t?.9:1)}function Fo(e){return (e?20:10)/64}function At(e,t){let n=Math.min(1,t.width/t.height),r=Math.min(1,t.height/t.width);return [(e[0]-3.5)*n,(3.5-e[1])*r]}function $o(e,t){let n={from:[Math.floor(Math.min(e[0],t[0])),Math.floor(Math.min(e[1],t[1]))],to:[Math.ceil(Math.max(e[0],t[0])),Math.ceil(Math.max(e[1],t[1]))]};return $(B("rect"),{x:n.from[0],y:n.from[1],width:n.to[0]-n.from[0],height:n.to[1]-n.from[1],fill:"none",stroke:"none"})}function wn(e,t,n=!0){let r=Math.atan2(t[1]-e[1],t[0]-e[0])+Math.PI;return n?(Math.round(r*8/Math.PI)+16)%16:r}function Ho(e,t){return Math.sqrt([e[0]-t[0],e[1]-t[1]].reduce((n,r)=>n+r*r,0))}function zr(e,t,n){let r=Ho(e,t),i=wn(e,t,!1);if(n&&(r-=33/64,n.size>1)){r-=10/64;let o=wn(e,t);(n.has((o+1)%16)||n.has((o+15)%16))&&o&1&&(r-=.4);}return [e[0]-Math.cos(i)*r,e[1]-Math.sin(i)*r].map(o=>o+.5)}function $r(e,t){e.innerHTML="",e.classList.add("cg-wrap");for(let u of Yn)e.classList.toggle("orientation-"+u,t.orientation===u);e.classList.toggle("manipulable",!t.viewOnly);let n=Q("cg-container");e.appendChild(n);let r=Q("cg-board");n.appendChild(r);let i,o,s;if(t.drawable.visible&&(i=$(B("svg"),{class:"cg-shapes",viewBox:"-4 -4 8 8",preserveAspectRatio:"xMidYMid slice"}),i.appendChild(Lr()),i.appendChild(B("g")),o=$(B("svg"),{class:"cg-custom-svgs",viewBox:"-3.5 -3.5 8 8",preserveAspectRatio:"xMidYMid slice"}),o.appendChild(B("g")),s=Q("cg-auto-pieces"),n.appendChild(i),n.appendChild(o),n.appendChild(s)),t.coordinates){let u=t.orientation==="black"?" black":"",c=t.ranksPosition==="left"?" left":"";n.appendChild(Fr(Fe,"ranks"+u+c)),n.appendChild(Fr(qe,"files"+u));}let a;return t.draggable.enabled&&t.draggable.showGhost&&(a=Q("piece","ghost"),He(a,!1),n.appendChild(a)),{board:r,container:n,wrap:e,ghost:a,svg:i,customSvg:o,autoPieces:s}}function Fr(e,t){let n=Q("coords",t),r;for(let i of e)r=Q("coord"),r.textContent=i,n.appendChild(r);return n}function Hr(e,t){if(!e.dropmode.active)return;ne(e),re(e);let n=e.dropmode.piece;if(n){e.pieces.set("a0",n);let r=le(t),i=r&&ie(r,I(e),e.dom.bounds());i&&St(e,"a0",i);}e.dom.redraw();}function Gr(e,t){let n=e.dom.elements.board;if("ResizeObserver"in window&&new ResizeObserver(t).observe(e.dom.elements.wrap),(e.disableContextMenu||e.drawable.enabled)&&n.addEventListener("contextmenu",i=>i.preventDefault()),e.viewOnly)return;let r=Go(e);n.addEventListener("touchstart",r,{passive:!1}),n.addEventListener("mousedown",r,{passive:!1});}function Ur(e,t){let n=[];if("ResizeObserver"in window||n.push(je(document.body,"chessground.resize",t)),!e.viewOnly){let r=Vr(e,Mr,vr),i=Vr(e,Er,yr);for(let s of ["touchmove","mousemove"])n.push(je(document,s,r));for(let s of ["touchend","mouseup"])n.push(je(document,s,i));let o=()=>e.dom.bounds.clear();n.push(je(document,"scroll",o,{capture:!0,passive:!0})),n.push(je(window,"resize",o,{passive:!0}));}return ()=>n.forEach(r=>r())}function je(e,t,n,r){return e.addEventListener(t,n,r),()=>e.removeEventListener(t,n,r)}var Go=e=>t=>{e.draggable.current?_e(e):e.drawable.current?gn(e):t.shiftKey||wt(t)?e.drawable.enabled&&br(e,t):e.viewOnly||(e.dropmode.active?Hr(e,t):Cr(e,t));},Vr=(e,t,n)=>r=>{e.drawable.current?e.drawable.enabled&&n(e,r):e.viewOnly||t(e,r);};function jr(e){let t=I(e),n=Ce(e.dom.bounds()),r=e.dom.elements.board,i=e.pieces,o=e.animation.current,s=o?o.plan.anims:new Map,a=o?o.plan.fadings:new Map,u=e.draggable.current,c=Wo(e),f=new Set,p=new Set,S=new Map,b=new Map,d,h,w,k,y,M,x,C,E,_;for(h=r.firstChild;h;){if(d=h.cgKey,Zr(h))if(w=i.get(d),y=s.get(d),M=a.get(d),k=h.cgPiece,h.cgDragging&&(!u||u.orig!==d)&&(h.classList.remove("dragging"),Z(h,n(N(d),t)),h.cgDragging=!1),!M&&h.cgFading&&(h.cgFading=!1,h.classList.remove("fading")),w){if(y&&h.cgAnimating&&k===Ye(w)){let v=N(d);v[0]+=y[2],v[1]+=y[3],h.classList.add("anim"),Z(h,n(v,t));}else h.cgAnimating&&(h.cgAnimating=!1,h.classList.remove("anim"),Z(h,n(N(d),t)),e.addPieceZIndex&&(h.style.zIndex=vn(N(d),t)));k===Ye(w)&&(!M||!h.cgFading)?f.add(d):M&&k===Ye(M)?(h.classList.add("fading"),h.cgFading=!0):yn(S,k,h);}else yn(S,k,h);else if(Qr(h)){let v=h.className;c.get(d)===v?p.add(d):yn(b,v,h);}h=h.nextSibling;}for(let[v,O]of c)if(!p.has(v)){E=b.get(O),_=E&&E.pop();let D=n(N(v),t);if(_)_.cgKey=v,Z(_,D);else {let R=Q("square",O);R.cgKey=v,Z(R,D),r.insertBefore(R,r.firstChild);}}for(let[v,O]of i)if(y=s.get(v),!f.has(v))if(x=S.get(Ye(O)),C=x&&x.pop(),C){C.cgKey=v,C.cgFading&&(C.classList.remove("fading"),C.cgFading=!1);let D=N(v);e.addPieceZIndex&&(C.style.zIndex=vn(D,t)),y&&(C.cgAnimating=!0,C.classList.add("anim"),D[0]+=y[2],D[1]+=y[3]),Z(C,n(D,t));}else {let D=Ye(O),R=Q("piece",D),K=N(v);R.cgPiece=D,R.cgKey=v,y&&(R.cgAnimating=!0,K[0]+=y[2],K[1]+=y[3]),Z(R,n(K,t)),e.addPieceZIndex&&(R.style.zIndex=vn(K,t)),r.appendChild(R);}for(let v of S.values())Wr(e,v);for(let v of b.values())Wr(e,v);}function Yr(e){let t=I(e),n=Ce(e.dom.bounds()),r=e.dom.elements.board.firstChild;for(;r;)(Zr(r)&&!r.cgAnimating||Qr(r))&&Z(r,n(N(r.cgKey),t)),r=r.nextSibling;}function xn(e){var t,n;let r=e.dom.elements.wrap.getBoundingClientRect(),i=e.dom.elements.container,o=r.height/r.width,s=Math.floor(r.width*window.devicePixelRatio/8)*8/window.devicePixelRatio,a=s*o;i.style.width=s+"px",i.style.height=a+"px",e.dom.bounds.clear(),(t=e.addDimensionsCssVarsTo)===null||t===void 0||t.style.setProperty("--cg-width",s+"px"),(n=e.addDimensionsCssVarsTo)===null||n===void 0||n.style.setProperty("--cg-height",a+"px");}var Zr=e=>e.tagName==="PIECE",Qr=e=>e.tagName==="SQUARE";function Wr(e,t){for(let n of t)e.dom.elements.board.removeChild(n);}function vn(e,t){let r=e[1];return `${t?3+7-r:3+r}`}var Ye=e=>`${e.color} ${e.role}`;function Wo(e){var t,n,r;let i=new Map;if(e.lastMove&&e.highlight.lastMove)for(let a of e.lastMove)me(i,a,"last-move");if(e.check&&e.highlight.check&&me(i,e.check,"check"),e.selected&&(me(i,e.selected,"selected"),e.movable.showDests)){let a=(t=e.movable.dests)===null||t===void 0?void 0:t.get(e.selected);if(a)for(let c of a)me(i,c,"move-dest"+(e.pieces.has(c)?" oc":""));let u=(r=(n=e.premovable.customDests)===null||n===void 0?void 0:n.get(e.selected))!==null&&r!==void 0?r:e.premovable.dests;if(u)for(let c of u)me(i,c,"premove-dest"+(e.pieces.has(c)?" oc":""));}let o=e.premovable.current;if(o)for(let a of o)me(i,a,"current-premove");else e.predroppable.current&&me(i,e.predroppable.current.key,"current-premove");let s=e.exploding;if(s)for(let a of s.keys)me(i,a,"exploding"+s.stage);return e.highlight.custom&&e.highlight.custom.forEach((a,u)=>{me(i,u,a);}),i}function me(e,t,n){let r=e.get(t);r?e.set(t,`${r} ${n}`):e.set(t,n);}function yn(e,t,n){let r=e.get(t);r?r.push(n):e.set(t,[n]);}function Xr(e,t,n){let r=new Map,i=[];for(let a of e)r.set(a.hash,!1);let o=t.firstElementChild,s;for(;o;)s=o.getAttribute("cgHash"),r.has(s)?r.set(s,!0):i.push(o),o=o.nextElementSibling;for(let a of i)t.removeChild(a);for(let a of e)r.get(a.hash)||t.appendChild(n(a));}function Jr(e,t){let r=e.drawable.autoShapes.filter(i=>i.piece).map(i=>({shape:i,hash:Yo(i),current:!1}));Xr(r,t,i=>jo(e,i,e.dom.bounds()));}function ei(e){var t;let n=I(e),r=Ce(e.dom.bounds()),i=(t=e.dom.elements.autoPieces)===null||t===void 0?void 0:t.firstChild;for(;i;)Jt(i,r(N(i.cgKey),n),i.cgScale),i=i.nextSibling;}function jo(e,{shape:t,hash:n},r){var i,o,s;let a=t.orig,u=(i=t.piece)===null||i===void 0?void 0:i.role,c=(o=t.piece)===null||o===void 0?void 0:o.color,f=(s=t.piece)===null||s===void 0?void 0:s.scale,p=Q("piece",`${u} ${c}`);return p.setAttribute("cgHash",n),p.cgKey=a,p.cgScale=f,Jt(p,Ce(r)(N(a),I(e)),f),p}var Yo=e=>{var t,n,r;return [e.orig,(t=e.piece)===null||t===void 0?void 0:t.role,(n=e.piece)===null||n===void 0?void 0:n.color,(r=e.piece)===null||r===void 0?void 0:r.scale].join(",")};function ti(e,t){let n=Tr();Mt(n,t||{});function r(){let i="dom"in n?n.dom.unbind:void 0,o=$r(e,n),s=Jn(()=>o.board.getBoundingClientRect()),a=f=>{jr(c),o.autoPieces&&Jr(c,o.autoPieces),!f&&o.svg&&Ir(c,o.svg,o.customSvg);},u=()=>{xn(c),Yr(c),o.autoPieces&&ei(c);},c=n;return c.dom={elements:o,bounds:s,redraw:Qo(a),redrawNow:a,unbind:i},c.drawable.prevSvgHash="",xn(c),a(!1),Gr(c,u),i||(c.dom.unbind=Ur(c,u)),c.events.insert&&c.events.insert(o),c}return Or(r(),r)}function Qo(e){let t=!1;return ()=>{t||(t=!0,requestAnimationFrame(()=>{e(),t=!1;}));}}function Xo(e,t){return document.createElement(e,t)}function Jo(e,t,n){return document.createElementNS(e,t,n)}function es(){return Re(document.createDocumentFragment())}function ts(e){return document.createTextNode(e)}function ns(e){return document.createComment(e)}function rs(e,t,n){if(ge(e)){let r=e;for(;r&&ge(r);)r=Re(r).parent;e=r??e;}ge(t)&&(t=Re(t,e)),n&&ge(n)&&(n=Re(n).firstChildNode),e.insertBefore(t,n);}function is(e,t){e.removeChild(t);}function os(e,t){ge(t)&&(t=Re(t,e)),e.appendChild(t);}function ni(e){if(ge(e)){for(;e&&ge(e);)e=Re(e).parent;return e??null}return e.parentNode}function ss(e){var t;if(ge(e)){let n=Re(e),r=ni(n);if(r&&n.lastChildNode){let i=Array.from(r.childNodes),o=i.indexOf(n.lastChildNode);return (t=i[o+1])!==null&&t!==void 0?t:null}return null}return e.nextSibling}function as(e){return e.tagName}function cs(e,t){e.textContent=t;}function ls(e){return e.textContent}function us(e){return e.nodeType===1}function ds(e){return e.nodeType===3}function hs(e){return e.nodeType===8}function ge(e){return e.nodeType===11}function Re(e,t){var n,r,i;let o=e;return (n=o.parent)!==null&&n!==void 0||(o.parent=t??null),(r=o.firstChildNode)!==null&&r!==void 0||(o.firstChildNode=e.firstChild),(i=o.lastChildNode)!==null&&i!==void 0||(o.lastChildNode=e.lastChild),o}var ri={createElement:Xo,createElementNS:Jo,createTextNode:ts,createDocumentFragment:es,createComment:ns,insertBefore:rs,removeChild:is,appendChild:os,parentNode:ni,nextSibling:ss,tagName:as,setTextContent:cs,getTextContent:ls,isElement:us,isText:ds,isComment:hs,isDocumentFragment:ge};function Ne(e,t,n,r,i){let o=t===void 0?void 0:t.key;return {sel:e,data:t,children:n,text:r,elm:i,key:o}}var Ze=Array.isArray;function De(e){return typeof e=="string"||typeof e=="number"||e instanceof String||e instanceof Number}function Sn(e){return e===void 0}function j(e){return e!==void 0}var Cn=Ne("",{},[],void 0,void 0);function Qe(e,t){var n,r;let i=e.key===t.key,o=((n=e.data)===null||n===void 0?void 0:n.is)===((r=t.data)===null||r===void 0?void 0:r.is),s=e.sel===t.sel,a=!e.sel&&e.sel===t.sel?typeof e.text==typeof t.text:!0;return s&&i&&o&&a}function fs(){throw new Error("The document fragment is not supported on this platform.")}function ps(e,t){return e.isElement(t)}function ms(e,t){return e.isDocumentFragment(t)}function gs(e,t,n){var r;let i={};for(let o=t;o<=n;++o){let s=(r=e[o])===null||r===void 0?void 0:r.key;s!==void 0&&(i[s]=o);}return i}var ks=["create","update","remove","destroy","pre","post"];function Pn(e,t,n){let r={create:[],update:[],remove:[],destroy:[],pre:[],post:[]},i=ri;for(let d of ks)for(let h of e){let w=h[d];w!==void 0&&r[d].push(w);}function o(d){let h=d.id?"#"+d.id:"",w=d.getAttribute("class"),k=w?"."+w.split(" ").join("."):"";return Ne(i.tagName(d).toLowerCase()+h+k,{},[],void 0,d)}function s(d){return Ne(void 0,{},[],void 0,d)}function a(d,h){return function(){if(--h===0){let k=i.parentNode(d);i.removeChild(k,d);}}}function u(d,h){var w,k,y,M;let x,C=d.data;if(C!==void 0){let v=(w=C.hook)===null||w===void 0?void 0:w.init;j(v)&&(v(d),C=d.data);}let E=d.children,_=d.sel;if(_==="!")Sn(d.text)&&(d.text=""),d.elm=i.createComment(d.text);else if(_!==void 0){let v=_.indexOf("#"),O=_.indexOf(".",v),D=v>0?v:_.length,R=O>0?O:_.length,K=v!==-1||O!==-1?_.slice(0,Math.min(D,R)):_,X=d.elm=j(C)&&j(x=C.ns)?i.createElementNS(x,K,C):i.createElement(K,C);for(D<R&&X.setAttribute("id",_.slice(D+1,R)),O>0&&X.setAttribute("class",_.slice(R+1).replace(/\./g," ")),x=0;x<r.create.length;++x)r.create[x](Cn,d);if(Ze(E))for(x=0;x<E.length;++x){let Rn=E[x];Rn!=null&&i.appendChild(X,u(Rn,h));}else De(d.text)&&i.appendChild(X,i.createTextNode(d.text));let Xe=d.data.hook;j(Xe)&&((k=Xe.create)===null||k===void 0||k.call(Xe,Cn,d),Xe.insert&&h.push(d));}else if(!((y=n?.experimental)===null||y===void 0)&&y.fragments&&d.children){for(d.elm=((M=i.createDocumentFragment)!==null&&M!==void 0?M:fs)(),x=0;x<r.create.length;++x)r.create[x](Cn,d);for(x=0;x<d.children.length;++x){let v=d.children[x];v!=null&&i.appendChild(d.elm,u(v,h));}}else d.elm=i.createTextNode(d.text);return d.elm}function c(d,h,w,k,y,M){for(;k<=y;++k){let x=w[k];x!=null&&i.insertBefore(d,u(x,M),h);}}function f(d){var h,w;let k=d.data;if(k!==void 0){(w=(h=k?.hook)===null||h===void 0?void 0:h.destroy)===null||w===void 0||w.call(h,d);for(let y=0;y<r.destroy.length;++y)r.destroy[y](d);if(d.children!==void 0)for(let y=0;y<d.children.length;++y){let M=d.children[y];M!=null&&typeof M!="string"&&f(M);}}}function p(d,h,w,k){for(var y,M;w<=k;++w){let x,C,E=h[w];if(E!=null)if(j(E.sel)){f(E),x=r.remove.length+1,C=a(E.elm,x);for(let v=0;v<r.remove.length;++v)r.remove[v](E,C);let _=(M=(y=E?.data)===null||y===void 0?void 0:y.hook)===null||M===void 0?void 0:M.remove;j(_)?_(E,C):C();}else E.children?(f(E),p(d,E.children,0,E.children.length-1)):i.removeChild(d,E.elm);}}function S(d,h,w,k){let y=0,M=0,x=h.length-1,C=h[0],E=h[x],_=w.length-1,v=w[0],O=w[_],D,R,K,X;for(;y<=x&&M<=_;)C==null?C=h[++y]:E==null?E=h[--x]:v==null?v=w[++M]:O==null?O=w[--_]:Qe(C,v)?(b(C,v,k),C=h[++y],v=w[++M]):Qe(E,O)?(b(E,O,k),E=h[--x],O=w[--_]):Qe(C,O)?(b(C,O,k),i.insertBefore(d,C.elm,i.nextSibling(E.elm)),C=h[++y],O=w[--_]):Qe(E,v)?(b(E,v,k),i.insertBefore(d,E.elm,C.elm),E=h[--x],v=w[++M]):(D===void 0&&(D=gs(h,y,x)),R=D[v.key],Sn(R)?i.insertBefore(d,u(v,k),C.elm):(K=h[R],K.sel!==v.sel?i.insertBefore(d,u(v,k),C.elm):(b(K,v,k),h[R]=void 0,i.insertBefore(d,K.elm,C.elm))),v=w[++M]);M<=_&&(X=w[_+1]==null?null:w[_+1].elm,c(d,X,w,M,_,k)),y<=x&&p(d,h,y,x);}function b(d,h,w){var k,y,M,x,C,E,_,v;let O=(k=h.data)===null||k===void 0?void 0:k.hook;(y=O?.prepatch)===null||y===void 0||y.call(O,d,h);let D=h.elm=d.elm;if(d===h)return;if(h.data!==void 0||j(h.text)&&h.text!==d.text){(M=h.data)!==null&&M!==void 0||(h.data={}),(x=d.data)!==null&&x!==void 0||(d.data={});for(let X=0;X<r.update.length;++X)r.update[X](d,h);(_=(E=(C=h.data)===null||C===void 0?void 0:C.hook)===null||E===void 0?void 0:E.update)===null||_===void 0||_.call(E,d,h);}let R=d.children,K=h.children;Sn(h.text)?j(R)&&j(K)?R!==K&&S(D,R,K,w):j(K)?(j(d.text)&&i.setTextContent(D,""),c(D,null,K,0,K.length-1,w)):j(R)?p(D,R,0,R.length-1):j(d.text)&&i.setTextContent(D,""):d.text!==h.text&&(j(R)&&p(D,R,0,R.length-1),i.setTextContent(D,h.text)),(v=O?.postpatch)===null||v===void 0||v.call(O,d,h);}return function(h,w){let k,y,M,x=[];for(k=0;k<r.pre.length;++k)r.pre[k]();for(ps(i,h)?h=o(h):ms(i,h)&&(h=s(h)),Qe(h,w)?b(h,w,x):(y=h.elm,M=i.parentNode(y),u(w,x),M!==null&&(i.insertBefore(M,w.elm,i.nextSibling(y)),p(M,[h],0,0))),k=0;k<x.length;++k)x[k].data.hook.insert(x[k]);for(k=0;k<r.post.length;++k)r.post[k]();return w}}function oi(e,t,n){if(e.ns="http://www.w3.org/2000/svg",n!=="foreignObject"&&t!==void 0)for(let r=0;r<t.length;++r){let i=t[r];if(typeof i=="string")continue;let o=i.data;o!==void 0&&oi(o,i.children,i.sel);}}function A(e,t,n){let r={},i,o,s;if(n!==void 0?(t!==null&&(r=t),Ze(n)?i=n:De(n)?o=n.toString():n&&n.sel&&(i=[n])):t!=null&&(Ze(t)?i=t:De(t)?o=t.toString():t&&t.sel?i=[t]:r=t),i!==void 0)for(s=0;s<i.length;++s)De(i[s])&&(i[s]=Ne(void 0,void 0,void 0,i[s],void 0));return e[0]==="s"&&e[1]==="v"&&e[2]==="g"&&(e.length===3||e[3]==="."||e[3]==="#")&&oi(r,i,e),Ne(e,r,i,o,void 0)}var bs="http://www.w3.org/1999/xlink",ws="http://www.w3.org/XML/1998/namespace";function si(e,t){let n,r=t.elm,i=e.data.attrs,o=t.data.attrs;if(!(!i&&!o)&&i!==o){i=i||{},o=o||{};for(n in o){let s=o[n];i[n]!==s&&(s===!0?r.setAttribute(n,""):s===!1?r.removeAttribute(n):n.charCodeAt(0)!==120?r.setAttribute(n,s):n.charCodeAt(3)===58?r.setAttributeNS(ws,n,s):n.charCodeAt(5)===58?r.setAttributeNS(bs,n,s):r.setAttribute(n,s));}for(n in i)n in o||r.removeAttribute(n);}}var Mn={create:si,update:si};function ai(e,t){let n,r,i=t.elm,o=e.data.class,s=t.data.class;if(!(!o&&!s)&&o!==s){o=o||{},s=s||{};for(r in o)o[r]&&!Object.prototype.hasOwnProperty.call(s,r)&&i.classList.remove(r);for(r in s)n=s[r],n!==o[r]&&i.classList[n?"add":"remove"](r);}}var En={create:ai,update:ai};function ci(e,t,n){for(let r of ["touchstart","mousedown"])e.addEventListener(r,i=>{t(i),i.preventDefault();},{passive:!1});}var _t=(e,t,n,r=!0)=>Le(i=>i.addEventListener(e,o=>{let s=t(o);return s===!1&&o.preventDefault(),s},{passive:r}));function Le(e){return {insert:t=>e(t.elm)}}function li(e){let t=0;return n=>{t+=n.deltaY*(n.deltaMode?40:1),Math.abs(t)>=4?(e(n,!0),t=0):e(n,!1);}}function ui(e,t){let n=()=>{e(),r=Math.max(100,r-r/15),i=setTimeout(n,r);},r=350,i=setTimeout(n,500);e();let o=t.type=="touchstart"?"touchend":"mouseup";document.addEventListener(o,()=>clearTimeout(i),{once:!0});}var vs=e=>e.altKey||e.ctrlKey||e.shiftKey||e.metaKey||document.activeElement instanceof HTMLInputElement||document.activeElement instanceof HTMLTextAreaElement,di=e=>t=>{vs(t)||(t.key=="ArrowLeft"?e.goTo("prev"):t.key=="ArrowRight"?e.goTo("next"):t.key=="f"&&e.flip());};var hi=e=>A("div.lpv__menu.lpv__pane",[A("button.lpv__menu__entry.lpv__menu__flip.lpv__fbt",{hook:_t("click",e.flip)},e.translate("flipTheBoard")),e.opts.menu.analysisBoard?.enabled?A("a.lpv__menu__entry.lpv__menu__analysis.lpv__fbt",{attrs:{href:e.analysisUrl(),target:"_blank"}},e.translate("analysisBoard")):void 0,e.opts.menu.practiceWithComputer?.enabled?A("a.lpv__menu__entry.lpv__menu__practice.lpv__fbt",{attrs:{href:e.practiceUrl(),target:"_blank"}},e.translate("practiceWithComputer")):void 0,e.opts.menu.getPgn.enabled?A("button.lpv__menu__entry.lpv__menu__pgn.lpv__fbt",{hook:_t("click",e.togglePgn)},e.translate("getPgn")):void 0,ys(e)]),ys=e=>{let t=e.game.metadata.externalLink;return t&&A("a.lpv__menu__entry.lpv__fbt",{attrs:{href:t,target:"_blank"}},e.translate(e.game.metadata.isLichess?"viewOnLichess":"viewOnSite"))},fi=e=>A("div.lpv__controls",[e.pane=="board"?void 0:Rt(e,"first","step-backward"),Rt(e,"prev","left-open"),A("button.lpv__fbt.lpv__controls__menu.lpv__icon",{class:{active:e.pane!="board","lpv__icon-ellipsis-vert":e.pane=="board"},hook:_t("click",e.toggleMenu)},e.pane=="board"?void 0:"X"),Rt(e,"next","right-open"),e.pane=="board"?void 0:Rt(e,"last","step-forward")]),Rt=(e,t,n)=>A(`button.lpv__controls__goto.lpv__controls__goto--${t}.lpv__fbt.lpv__icon.lpv__icon-${n}`,{class:{disabled:e.pane=="board"&&!e.canGoTo(t)},hook:Le(r=>ci(r,i=>ui(()=>e.goTo(t),i)))});var mi=e=>A("div.lpv__side",A("div.lpv__moves",{hook:{insert:t=>{let n=t.elm;e.path.empty()||pi(e,n),n.addEventListener("mousedown",r=>{let i=r.target.getAttribute("p");i&&e.toPath(new te(i));},{passive:!0});},postpatch:(t,n)=>{e.autoScrollRequested&&(pi(e,n.elm),e.autoScrollRequested=!1);}}},[...e.game.initial.comments.map(Ot),...Cs(e)])),An=()=>A("move.empty","..."),_n=e=>A("index",`${e}.`),Ot=e=>A("comment",e),xs=()=>A("paren.open","("),Ss=()=>A("paren.close",")"),Nt=e=>Math.floor((e.ply-1)/2)+1,Cs=e=>{let t=Ms(e),n=[],r,i=e.game.moves.children.slice(1);for(e.game.initial.pos.turn=="black"&&e.game.mainline[0]&&n.push(_n(e.game.initial.pos.fullmoves),An());r=(r||e.game.moves).children[0];){let o=r.data,s=o.ply%2==1;s&&n.push(_n(Nt(o))),n.push(t(o));let a=s&&(i.length||o.comments.length)&&r.children.length;a&&n.push(An()),o.comments.forEach(u=>n.push(Ot(u))),i.forEach(u=>n.push(Ps(t,u))),a&&n.push(_n(Nt(o)),An()),i=r.children.slice(1);}return n},Ps=(e,t)=>A("variation",[...t.data.startingComments.map(Ot),...gi(e,t)]),gi=(e,t)=>{let n=[],r=[];t.data.ply%2==0&&n.push(A("index",[Nt(t.data),"..."]));do{let i=t.data;i.ply%2==1&&n.push(A("index",[Nt(i),"."])),n.push(e(i)),i.comments.forEach(o=>n.push(Ot(o))),r.forEach(o=>{n=[...n,xs(),...gi(e,o),Ss()];}),r=t.children.slice(1),t=t.children[0];}while(t);return n},Ms=e=>t=>A("move",{class:{current:e.path.equals(t.path),ancestor:e.path.contains(t.path),good:t.nags.includes(1),mistake:t.nags.includes(2),brilliant:t.nags.includes(3),blunder:t.nags.includes(4),interesting:t.nags.includes(5),inaccuracy:t.nags.includes(6)},attrs:{p:t.path.path}},t.san),pi=(e,t)=>{let n=t.querySelector(".current");if(!n){t.scrollTop=e.path.empty()?0:99999;return}t.scrollTop=n.offsetTop-t.offsetHeight/2+n.offsetHeight;};function Tt(e,t){let n=t=="bottom"?e.orientation():P(e.orientation()),r=e.game.players[n],i=[r.title?A("span.lpv__player__title",r.title):void 0,A("span.lpv__player__name",r.name),r.rating?A("span.lpv__player__rating",["(",r.rating,")"]):void 0];return A(`div.lpv__player.lpv__player--${t}`,[r.isLichessUser?A("a.lpv__player__person.ulpt.user-link",{attrs:{href:`${e.opts.lichess}/@/${r.name}`}},i):A("span.lpv__player__person",i),e.opts.showClocks?Es(e,n):void 0])}var Es=(e,t)=>{let n=e.curData(),r=n.clocks&&n.clocks[t];return typeof r==null?void 0:A("div.lpv__player__clock",{class:{active:t==n.turn}},As(r))},As=e=>{if(!e&&e!==0)return ["-"];let t=new Date(e*1e3),n=":",r=ki(t.getUTCMinutes())+n+ki(t.getUTCSeconds());return e>=3600?[Math.floor(e/3600)+n+r]:[r]},ki=e=>(e<10?"0":"")+e;function qt(e){let t=e.opts,n=`lpv.lpv--moves-${t.showMoves}.lpv--controls-${t.showControls}${t.classes?"."+t.classes.replace(" ","."):""}`,r=t.showPlayers=="auto"?e.game.hasPlayerName():t.showPlayers;return A(`div.${n}`,{class:{"lpv--menu":e.pane!="board","lpv--players":r},attrs:{tabindex:0},hook:Le(i=>{e.setGround(ti(i.querySelector(".cg-wrap"),Ns(e,i))),i.addEventListener("keydown",di(e));})},[r?Tt(e,"top"):void 0,_s(e),r?Tt(e,"bottom"):void 0,t.showControls?fi(e):void 0,t.showMoves?mi(e):void 0,e.pane=="menu"?hi(e):e.pane=="pgn"?Rs(e):void 0])}var _s=e=>A("div.lpv__board",{hook:Le(t=>{t.addEventListener("click",e.focus),e.opts.scrollToMove&&!("ontouchstart"in window)&&t.addEventListener("wheel",li((n,r)=>{n.preventDefault(),n.deltaY>0&&r?e.goTo("next",!1):n.deltaY<0&&r&&e.goTo("prev",!1);}));})},A("div.cg-wrap")),Rs=e=>{let t=new Blob([e.opts.pgn],{type:"text/plain"});return A("div.lpv__pgn.lpv__pane",[A("a.lpv__pgn__download.lpv__fbt",{attrs:{href:window.URL.createObjectURL(t),download:e.opts.menu.getPgn.fileName||`${e.game.title()}.pgn`}},e.translate("download")),A("textarea.lpv__pgn__text",e.opts.pgn)])},Ns=(e,t)=>({viewOnly:!e.opts.drawArrows,addDimensionsCssVarsTo:t,drawable:{enabled:e.opts.drawArrows,visible:!0},disableContextMenu:e.opts.drawArrows,...e.opts.chessground||{},movable:{free:!1},draggable:{enabled:!1},selectable:{enabled:!1},...e.cgState()});var Os={pgn:"*",fen:void 0,showPlayers:"auto",showClocks:!0,showMoves:"auto",showControls:!0,scrollToMove:!0,orientation:void 0,initialPly:0,chessground:{},drawArrows:!0,menu:{getPgn:{enabled:!0,fileName:void 0},practiceWithComputer:{enabled:!0},analysisBoard:{enabled:!0}},lichess:"https://lichess.org",classes:void 0};function wi(e,t){let n={...Os};return vi(n,t),n.fen&&(n.pgn=`[FEN "${n.fen}"]
${n.pgn}`),n.classes||(n.classes=e.className),n}function vi(e,t){for(let n in t)typeof t[n]<"u"&&(bi(e[n])&&bi(t[n])?vi(e[n],t[n]):e[n]=t[n]);}function bi(e){if(typeof e!="object"||e===null)return !1;let t=Object.getPrototypeOf(e);return t===Object.prototype||t===null}function Ts(e,t){let n=Pn([En,Mn]),r=wi(e,t),i=new Ge(r,a),o=qt(i);e.innerHTML="";let s=n(e,o);i.div=s.elm;function a(){s=n(s,qt(i));}return i}

/* svelte/DailyGame.svelte generated by Svelte v4.2.18 */
const file$8 = "svelte/DailyGame.svelte";

function create_fragment$9(ctx) {
	let div8;
	let div7;
	let div6;
	let div0;
	let a;
	let t0;
	let a_href_value;
	let t1;
	let div5;
	let div2;
	let div1;
	let div1_id_value;
	let t2;
	let div4;
	let div3;
	let div3_id_value;

	const block = {
		c: function create() {
			div8 = element("div");
			div7 = element("div");
			div6 = element("div");
			div0 = element("div");
			a = element("a");
			t0 = text("Chess.com");
			t1 = space();
			div5 = element("div");
			div2 = element("div");
			div1 = element("div");
			t2 = space();
			div4 = element("div");
			div3 = element("div");
			attr_dev(a, "href", a_href_value = /*game*/ ctx[0].url);
			attr_dev(a, "class", "button is-link is-small");
			attr_dev(a, "target", "_blank");
			add_location(a, file$8, 61, 8, 1418);
			attr_dev(div0, "class", "block");
			add_location(div0, file$8, 60, 6, 1390);
			attr_dev(div1, "class", "is2d");
			attr_dev(div1, "id", div1_id_value = /*game*/ ctx[0].url);
			add_location(div1, file$8, 67, 10, 1594);
			attr_dev(div2, "class", "cell");
			add_location(div2, file$8, 66, 8, 1565);
			attr_dev(div3, "class", "is2d reversed");
			attr_dev(div3, "id", div3_id_value = "" + (/*game*/ ctx[0].url + "-reversed"));
			add_location(div3, file$8, 70, 10, 1716);
			attr_dev(div4, "class", "cell");
			add_location(div4, file$8, 69, 8, 1687);
			attr_dev(div5, "class", "grid");
			add_location(div5, file$8, 65, 6, 1538);
			attr_dev(div6, "class", "box");
			add_location(div6, file$8, 59, 4, 1366);
			attr_dev(div7, "class", "fixed-grid has-2-cols");
			add_location(div7, file$8, 58, 2, 1326);
			attr_dev(div8, "class", "block");
			add_location(div8, file$8, 57, 0, 1304);
		},
		l: function claim(nodes) {
			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
		},
		m: function mount(target, anchor) {
			insert_dev(target, div8, anchor);
			append_dev(div8, div7);
			append_dev(div7, div6);
			append_dev(div6, div0);
			append_dev(div0, a);
			append_dev(a, t0);
			append_dev(div6, t1);
			append_dev(div6, div5);
			append_dev(div5, div2);
			append_dev(div2, div1);
			/*div1_binding*/ ctx[4](div1);
			append_dev(div5, t2);
			append_dev(div5, div4);
			append_dev(div4, div3);
			/*div3_binding*/ ctx[5](div3);
		},
		p: function update(ctx, [dirty]) {
			if (dirty & /*game*/ 1 && a_href_value !== (a_href_value = /*game*/ ctx[0].url)) {
				attr_dev(a, "href", a_href_value);
			}

			if (dirty & /*game*/ 1 && div1_id_value !== (div1_id_value = /*game*/ ctx[0].url)) {
				attr_dev(div1, "id", div1_id_value);
			}

			if (dirty & /*game*/ 1 && div3_id_value !== (div3_id_value = "" + (/*game*/ ctx[0].url + "-reversed"))) {
				attr_dev(div3, "id", div3_id_value);
			}
		},
		i: noop,
		o: noop,
		d: function destroy(detaching) {
			if (detaching) {
				detach_dev(div8);
			}

			/*div1_binding*/ ctx[4](null);
			/*div3_binding*/ ctx[5](null);
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_fragment$9.name,
		type: "component",
		source: "",
		ctx
	});

	return block;
}

function instance$9($$self, $$props, $$invalidate) {
	let { $$slots: slots = {}, $$scope } = $$props;
	validate_slots('DailyGame', slots, []);
	let { game = {} } = $$props;
	let pgnViewerContainer;
	let reversedBoard;
	let pgnViewer;
	let reversedViewer;
	let mainWidth;
	let mainStyle;
	let { myColor = "white" } = $$props;
	const otherColor = myColor === "white" ? "black" : "white";

	onMount(() => {
		pgnViewer = Ts(pgnViewerContainer, {
			pgn: game.pgn,
			initialPly: "last",
			orientation: myColor,
			scrollToMove: false,
			menu: {
				analysisBoard: { enabled: false },
				practiceWithComputer: { enabled: false }
			}
		});

		reversedViewer = Ts(reversedBoard, {
			pgn: game.pgn,
			initialPly: "last",
			orientation: otherColor,
			scrollToMove: false,
			showClocks: false,
			showControls: false,
			menu: {
				analysisBoard: { enabled: false },
				practiceWithComputer: { enabled: false }
			}
		});

		pgnViewer.div.addEventListener("pathChange", event => {
			reversedViewer.toPath(event.detail.path);
		});
	});

	afterUpdate(() => {
		if (pgnViewer) {
			pgnViewer.redraw();
		}
	});

	const writable_props = ['game', 'myColor'];

	Object.keys($$props).forEach(key => {
		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<DailyGame> was created with unknown prop '${key}'`);
	});

	function div1_binding($$value) {
		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
			pgnViewerContainer = $$value;
			$$invalidate(1, pgnViewerContainer);
		});
	}

	function div3_binding($$value) {
		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
			reversedBoard = $$value;
			$$invalidate(2, reversedBoard);
		});
	}

	$$self.$$set = $$props => {
		if ('game' in $$props) $$invalidate(0, game = $$props.game);
		if ('myColor' in $$props) $$invalidate(3, myColor = $$props.myColor);
	};

	$$self.$capture_state = () => ({
		onMount,
		afterUpdate,
		LichessPgnViewer: Ts,
		game,
		pgnViewerContainer,
		reversedBoard,
		pgnViewer,
		reversedViewer,
		mainWidth,
		mainStyle,
		myColor,
		otherColor
	});

	$$self.$inject_state = $$props => {
		if ('game' in $$props) $$invalidate(0, game = $$props.game);
		if ('pgnViewerContainer' in $$props) $$invalidate(1, pgnViewerContainer = $$props.pgnViewerContainer);
		if ('reversedBoard' in $$props) $$invalidate(2, reversedBoard = $$props.reversedBoard);
		if ('pgnViewer' in $$props) pgnViewer = $$props.pgnViewer;
		if ('reversedViewer' in $$props) reversedViewer = $$props.reversedViewer;
		if ('mainWidth' in $$props) mainWidth = $$props.mainWidth;
		if ('mainStyle' in $$props) mainStyle = $$props.mainStyle;
		if ('myColor' in $$props) $$invalidate(3, myColor = $$props.myColor);
	};

	if ($$props && "$$inject" in $$props) {
		$$self.$inject_state($$props.$$inject);
	}

	return [game, pgnViewerContainer, reversedBoard, myColor, div1_binding, div3_binding];
}

class DailyGame extends SvelteComponentDev {
	constructor(options) {
		super(options);
		init(this, options, instance$9, create_fragment$9, safe_not_equal, { game: 0, myColor: 3 });

		dispatch_dev("SvelteRegisterComponent", {
			component: this,
			tagName: "DailyGame",
			options,
			id: create_fragment$9.name
		});
	}

	get game() {
		throw new Error("<DailyGame>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	set game(value) {
		throw new Error("<DailyGame>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	get myColor() {
		throw new Error("<DailyGame>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	set myColor(value) {
		throw new Error("<DailyGame>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}
}

/* svelte/DailyGames.svelte generated by Svelte v4.2.18 */
const file$7 = "svelte/DailyGames.svelte";

function get_each_context$1(ctx, list, i) {
	const child_ctx = ctx.slice();
	child_ctx[23] = list[i];
	return child_ctx;
}

function get_each_context_1$1(ctx, list, i) {
	const child_ctx = ctx.slice();
	child_ctx[23] = list[i];
	return child_ctx;
}

// (154:0) {#each myGames as game (game.url)}
function create_each_block_1$1(key_1, ctx) {
	let div;
	let dailygame;
	let rect;
	let stop_animation = noop;
	let current;

	dailygame = new DailyGame({
			props: {
				game: /*game*/ ctx[23],
				myColor: /*game*/ ctx[23].white.includes(/*chessDotComUsername*/ ctx[3])
				? "white"
				: "black"
			},
			$$inline: true
		});

	const block = {
		key: key_1,
		first: null,
		c: function create() {
			div = element("div");
			create_component(dailygame.$$.fragment);
			add_location(div, file$7, 154, 2, 4386);
			this.first = div;
		},
		m: function mount(target, anchor) {
			insert_dev(target, div, anchor);
			mount_component(dailygame, div, null);
			current = true;
		},
		p: function update(new_ctx, dirty) {
			ctx = new_ctx;
			const dailygame_changes = {};
			if (dirty & /*myGames*/ 1) dailygame_changes.game = /*game*/ ctx[23];

			if (dirty & /*myGames*/ 1) dailygame_changes.myColor = /*game*/ ctx[23].white.includes(/*chessDotComUsername*/ ctx[3])
			? "white"
			: "black";

			dailygame.$set(dailygame_changes);
		},
		r: function measure() {
			rect = div.getBoundingClientRect();
		},
		f: function fix() {
			fix_position(div);
			stop_animation();
		},
		a: function animate() {
			stop_animation();
			stop_animation = create_animation(div, rect, flip, {});
		},
		i: function intro(local) {
			if (current) return;
			transition_in(dailygame.$$.fragment, local);
			current = true;
		},
		o: function outro(local) {
			transition_out(dailygame.$$.fragment, local);
			current = false;
		},
		d: function destroy(detaching) {
			if (detaching) {
				detach_dev(div);
			}

			destroy_component(dailygame);
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_each_block_1$1.name,
		type: "each",
		source: "(154:0) {#each myGames as game (game.url)}",
		ctx
	});

	return block;
}

// (163:0) {#each theirGames as game (game.url)}
function create_each_block$1(key_1, ctx) {
	let div;
	let dailygame;
	let t;
	let rect;
	let stop_animation = noop;
	let current;

	dailygame = new DailyGame({
			props: {
				game: /*game*/ ctx[23],
				myColor: /*game*/ ctx[23].white.includes(/*chessDotComUsername*/ ctx[3])
				? "white"
				: "black"
			},
			$$inline: true
		});

	const block = {
		key: key_1,
		first: null,
		c: function create() {
			div = element("div");
			create_component(dailygame.$$.fragment);
			t = space();
			add_location(div, file$7, 163, 2, 4594);
			this.first = div;
		},
		m: function mount(target, anchor) {
			insert_dev(target, div, anchor);
			mount_component(dailygame, div, null);
			append_dev(div, t);
			current = true;
		},
		p: function update(new_ctx, dirty) {
			ctx = new_ctx;
			const dailygame_changes = {};
			if (dirty & /*theirGames*/ 2) dailygame_changes.game = /*game*/ ctx[23];

			if (dirty & /*theirGames*/ 2) dailygame_changes.myColor = /*game*/ ctx[23].white.includes(/*chessDotComUsername*/ ctx[3])
			? "white"
			: "black";

			dailygame.$set(dailygame_changes);
		},
		r: function measure() {
			rect = div.getBoundingClientRect();
		},
		f: function fix() {
			fix_position(div);
			stop_animation();
		},
		a: function animate() {
			stop_animation();
			stop_animation = create_animation(div, rect, flip, {});
		},
		i: function intro(local) {
			if (current) return;
			transition_in(dailygame.$$.fragment, local);
			current = true;
		},
		o: function outro(local) {
			transition_out(dailygame.$$.fragment, local);
			current = false;
		},
		d: function destroy(detaching) {
			if (detaching) {
				detach_dev(div);
			}

			destroy_component(dailygame);
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_each_block$1.name,
		type: "each",
		source: "(163:0) {#each theirGames as game (game.url)}",
		ctx
	});

	return block;
}

function create_fragment$8(ctx) {
	let link;
	let link_href_value;
	let t0;
	let h1;
	let t2;
	let h20;
	let t4;
	let each_blocks_1 = [];
	let each0_lookup = new Map();
	let t5;
	let h21;
	let t7;
	let each_blocks = [];
	let each1_lookup = new Map();
	let each1_anchor;
	let current;
	let each_value_1 = ensure_array_like_dev(/*myGames*/ ctx[0]);
	const get_key = ctx => /*game*/ ctx[23].url;
	validate_each_keys(ctx, each_value_1, get_each_context_1$1, get_key);

	for (let i = 0; i < each_value_1.length; i += 1) {
		let child_ctx = get_each_context_1$1(ctx, each_value_1, i);
		let key = get_key(child_ctx);
		each0_lookup.set(key, each_blocks_1[i] = create_each_block_1$1(key, child_ctx));
	}

	let each_value = ensure_array_like_dev(/*theirGames*/ ctx[1]);
	const get_key_1 = ctx => /*game*/ ctx[23].url;
	validate_each_keys(ctx, each_value, get_each_context$1, get_key_1);

	for (let i = 0; i < each_value.length; i += 1) {
		let child_ctx = get_each_context$1(ctx, each_value, i);
		let key = get_key_1(child_ctx);
		each1_lookup.set(key, each_blocks[i] = create_each_block$1(key, child_ctx));
	}

	const block = {
		c: function create() {
			link = element("link");
			t0 = space();
			h1 = element("h1");
			h1.textContent = "Daily Games";
			t2 = space();
			h20 = element("h2");
			h20.textContent = "My Turn";
			t4 = space();

			for (let i = 0; i < each_blocks_1.length; i += 1) {
				each_blocks_1[i].c();
			}

			t5 = space();
			h21 = element("h2");
			h21.textContent = "Their Turn";
			t7 = space();

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].c();
			}

			each1_anchor = empty();
			attr_dev(link, "id", "piece-sprite");
			attr_dev(link, "href", link_href_value = "/piece-css/" + /*pieceSet*/ ctx[2] + ".css");
			attr_dev(link, "rel", "stylesheet");
			add_location(link, file$7, 149, 0, 4219);
			attr_dev(h1, "class", "title");
			add_location(h1, file$7, 151, 0, 4297);
			add_location(h20, file$7, 152, 0, 4332);
			add_location(h21, file$7, 161, 0, 4534);
		},
		l: function claim(nodes) {
			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
		},
		m: function mount(target, anchor) {
			insert_dev(target, link, anchor);
			insert_dev(target, t0, anchor);
			insert_dev(target, h1, anchor);
			insert_dev(target, t2, anchor);
			insert_dev(target, h20, anchor);
			insert_dev(target, t4, anchor);

			for (let i = 0; i < each_blocks_1.length; i += 1) {
				if (each_blocks_1[i]) {
					each_blocks_1[i].m(target, anchor);
				}
			}

			insert_dev(target, t5, anchor);
			insert_dev(target, h21, anchor);
			insert_dev(target, t7, anchor);

			for (let i = 0; i < each_blocks.length; i += 1) {
				if (each_blocks[i]) {
					each_blocks[i].m(target, anchor);
				}
			}

			insert_dev(target, each1_anchor, anchor);
			current = true;
		},
		p: function update(ctx, [dirty]) {
			if (!current || dirty & /*pieceSet*/ 4 && link_href_value !== (link_href_value = "/piece-css/" + /*pieceSet*/ ctx[2] + ".css")) {
				attr_dev(link, "href", link_href_value);
			}

			if (dirty & /*myGames, chessDotComUsername*/ 9) {
				each_value_1 = ensure_array_like_dev(/*myGames*/ ctx[0]);
				group_outros();
				for (let i = 0; i < each_blocks_1.length; i += 1) each_blocks_1[i].r();
				validate_each_keys(ctx, each_value_1, get_each_context_1$1, get_key);
				each_blocks_1 = update_keyed_each(each_blocks_1, dirty, get_key, 1, ctx, each_value_1, each0_lookup, t5.parentNode, fix_and_outro_and_destroy_block, create_each_block_1$1, t5, get_each_context_1$1);
				for (let i = 0; i < each_blocks_1.length; i += 1) each_blocks_1[i].a();
				check_outros();
			}

			if (dirty & /*theirGames, chessDotComUsername*/ 10) {
				each_value = ensure_array_like_dev(/*theirGames*/ ctx[1]);
				group_outros();
				for (let i = 0; i < each_blocks.length; i += 1) each_blocks[i].r();
				validate_each_keys(ctx, each_value, get_each_context$1, get_key_1);
				each_blocks = update_keyed_each(each_blocks, dirty, get_key_1, 1, ctx, each_value, each1_lookup, each1_anchor.parentNode, fix_and_outro_and_destroy_block, create_each_block$1, each1_anchor, get_each_context$1);
				for (let i = 0; i < each_blocks.length; i += 1) each_blocks[i].a();
				check_outros();
			}
		},
		i: function intro(local) {
			if (current) return;

			for (let i = 0; i < each_value_1.length; i += 1) {
				transition_in(each_blocks_1[i]);
			}

			for (let i = 0; i < each_value.length; i += 1) {
				transition_in(each_blocks[i]);
			}

			current = true;
		},
		o: function outro(local) {
			for (let i = 0; i < each_blocks_1.length; i += 1) {
				transition_out(each_blocks_1[i]);
			}

			for (let i = 0; i < each_blocks.length; i += 1) {
				transition_out(each_blocks[i]);
			}

			current = false;
		},
		d: function destroy(detaching) {
			if (detaching) {
				detach_dev(link);
				detach_dev(t0);
				detach_dev(h1);
				detach_dev(t2);
				detach_dev(h20);
				detach_dev(t4);
				detach_dev(t5);
				detach_dev(h21);
				detach_dev(t7);
				detach_dev(each1_anchor);
			}

			for (let i = 0; i < each_blocks_1.length; i += 1) {
				each_blocks_1[i].d(detaching);
			}

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].d(detaching);
			}
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_fragment$8.name,
		type: "component",
		source: "",
		ctx
	});

	return block;
}

function instance$8($$self, $$props, $$invalidate) {
	let { $$slots: slots = {}, $$scope } = $$props;
	validate_slots('DailyGames', slots, []);
	let myGames = [];
	let theirGames = [];
	let title = "Daily Games";
	let pieceSet;
	let gameCount = null;
	let previousGameCount = null;
	const chessDotComUsername = document.body.dataset.chessDotComUsername;
	const config = new Config();
	const configForm = new ConfigForm(config);
	const updateFrequencyOption = config.getConfigOption("Update frequency in seconds", 5);
	const boardOption = config.getConfigOption("Board", "brown");
	boardOption.setAllowedValues(boardOptions);

	boardOption.addObserver(board => {
		document.body.dataset.board = board;
		boardOption.setValue(board);
	});

	const pieceSetOption = config.getConfigOption("Piece set", "merida");
	pieceSetOption.setAllowedValues(pieceSetOptions);

	pieceSetOption.addObserver(set => {
		$$invalidate(2, pieceSet = set);
	});

	pieceSet = pieceSetOption.getValue();
	const titleAnimationSpeedOption = config.getConfigOption("Title animation speed in ms", 250);
	const titleAnimationLength = config.getConfigOption("Title animation length in ms", 3000);
	const firstTitleAnimationText = config.getConfigOption("Title animation 1", "♘♞♘ New Move ♘♞♘");
	const secondTitleAnimationText = config.getConfigOption("Title animation 2", "♞♘♞ New Move ♞♘♞");
	const themeOption = config.getConfigOption("Theme", "system");
	themeOption.setAllowedValues(["system", "dark", "light"]);

	function animateTitle(finalTitle) {
		const string1 = firstTitleAnimationText.getValue();
		const string2 = secondTitleAnimationText.getValue();

		let animationInterval = setInterval(
			function () {
				$$invalidate(4, title = title === string1 ? string2 : string1);
			},
			titleAnimationSpeedOption.getValue()
		);

		setTimeout(
			function () {
				clearInterval(animationInterval);
				setTitle(finalTitle);
			},
			titleAnimationLength.getValue()
		);
	}

	function setTitle(newTitle) {
		$$invalidate(4, title = `${newTitle} | Daily Games`);
	}

	async function updateGames() {
		const games = await fetchGames();
		$$invalidate(0, myGames = filterMyTurnGames(games));
		$$invalidate(1, theirGames = filterTheirTurnGames(games));
		$$invalidate(6, previousGameCount = gameCount);
		$$invalidate(5, gameCount = myGames.length);
		setTimeout(updateGames, updateFrequencyOption.getValue() * 1000);
	}

	/**
 * @typedef {Object} Game
 * @property {string} url
 * @property {number} move_by
 * @property {string} pgn
 * @property {string} time_control
 * @property {number} last_activity
 * @property {boolean} rated
 * @property {string} turn
 * @property {string} fen
 * @property {number} start_time
 * @property {string} time_class
 * @property {string} rules
 * @property {string} white
 * @property {string} black
 */
	/**
 * Fetch games
 * @returns {Promise<Game[]>} The games
 */
	async function fetchGames() {
		const response = await fetch(`https://api.chess.com/pub/player/${chessDotComUsername}/games`);
		const data = await response.json();
		return data.games;
	}

	function filterMyTurnGames(games) {
		return games.filter(game => game.turn === "white" && game.white.includes(chessDotComUsername) || game.turn === "black" && game.black.includes(chessDotComUsername));
	}

	function filterTheirTurnGames(games) {
		const myTurnGames = filterMyTurnGames(games);
		const myTurnUrls = myTurnGames.map(game => game.url);
		return games.filter(game => !myTurnUrls.includes(game.url));
	}

	onMount(async () => {
		await updateGames();
		configForm.addLinkToDOM("config");
		document.body.dataset.board = boardOption.getValue();
	});

	const writable_props = [];

	Object.keys($$props).forEach(key => {
		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<DailyGames> was created with unknown prop '${key}'`);
	});

	$$self.$capture_state = () => ({
		onMount,
		flip,
		Config,
		ConfigForm,
		boardOptions,
		pieceSetOptions,
		DailyGame,
		myGames,
		theirGames,
		title,
		pieceSet,
		gameCount,
		previousGameCount,
		chessDotComUsername,
		config,
		configForm,
		updateFrequencyOption,
		boardOption,
		pieceSetOption,
		titleAnimationSpeedOption,
		titleAnimationLength,
		firstTitleAnimationText,
		secondTitleAnimationText,
		themeOption,
		animateTitle,
		setTitle,
		updateGames,
		fetchGames,
		filterMyTurnGames,
		filterTheirTurnGames
	});

	$$self.$inject_state = $$props => {
		if ('myGames' in $$props) $$invalidate(0, myGames = $$props.myGames);
		if ('theirGames' in $$props) $$invalidate(1, theirGames = $$props.theirGames);
		if ('title' in $$props) $$invalidate(4, title = $$props.title);
		if ('pieceSet' in $$props) $$invalidate(2, pieceSet = $$props.pieceSet);
		if ('gameCount' in $$props) $$invalidate(5, gameCount = $$props.gameCount);
		if ('previousGameCount' in $$props) $$invalidate(6, previousGameCount = $$props.previousGameCount);
	};

	if ($$props && "$$inject" in $$props) {
		$$self.$inject_state($$props.$$inject);
	}

	$$self.$$.update = () => {
		if ($$self.$$.dirty & /*title*/ 16) {
			document.title = title;
		}

		if ($$self.$$.dirty & /*previousGameCount, gameCount*/ 96) {
			{
				if (previousGameCount !== null && gameCount !== null && gameCount > previousGameCount) {
					const newTitle = ("♘").repeat(gameCount);
					animateTitle(newTitle);
				}

				if (gameCount === 0) {
					setTitle("Not your turn");
				}
			}
		}
	};

	return [
		myGames,
		theirGames,
		pieceSet,
		chessDotComUsername,
		title,
		gameCount,
		previousGameCount
	];
}

class DailyGames extends SvelteComponentDev {
	constructor(options) {
		super(options);
		init(this, options, instance$8, create_fragment$8, safe_not_equal, {});

		dispatch_dev("SvelteRegisterComponent", {
			component: this,
			tagName: "DailyGames",
			options,
			id: create_fragment$8.name
		});
	}
}

/* svelte/components/ProgressTimer.svelte generated by Svelte v4.2.18 */
const file$6 = "svelte/components/ProgressTimer.svelte";

function add_css$2(target) {
	append_styles(target, "svelte-l2ukrv", "progress.svelte-l2ukrv{position:relative;width:100%}\n/*# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiUHJvZ3Jlc3NUaW1lci5zdmVsdGUiLCJzb3VyY2VzIjpbIlByb2dyZXNzVGltZXIuc3ZlbHRlIl0sInNvdXJjZXNDb250ZW50IjpbIjxzY3JpcHQ+XG4gIGltcG9ydCB7IG9uTW91bnQsIG9uRGVzdHJveSwgY3JlYXRlRXZlbnREaXNwYXRjaGVyIH0gZnJvbSBcInN2ZWx0ZVwiO1xuICBpbXBvcnQgeyB0d2VlbmVkIH0gZnJvbSBcInN2ZWx0ZS9tb3Rpb25cIjtcbiAgaW1wb3J0IHsgbGluZWFyIH0gZnJvbSBcInN2ZWx0ZS9lYXNpbmdcIjtcblxuICBjb25zdCBzZWNvbmRQcm9ncmVzcyA9IHR3ZWVuZWQoMCwge1xuICAgIGR1cmF0aW9uOiAxMDAwLFxuICAgIGVhc2luZzogbGluZWFyLFxuICB9KTtcblxuICBleHBvcnQgbGV0IG1heCA9IDYwO1xuICBleHBvcnQgbGV0IHdpZHRoO1xuXG4gIGxldCB0aW1lUmVtYWluaW5nO1xuXG4gIGNvbnN0IGRpc3BhdGNoID0gY3JlYXRlRXZlbnREaXNwYXRjaGVyKCk7XG5cbiAgJDoge1xuICAgIHRpbWVSZW1haW5pbmcgPSBtYXggLSAkc2Vjb25kUHJvZ3Jlc3M7XG4gIH1cblxuICAkOiB7XG4gICAgaWYgKHRpbWVSZW1haW5pbmcgPD0gMCkge1xuICAgICAgZGlzcGF0Y2goXCJjb21wbGV0ZVwiKTtcbiAgICAgIGNsZWFySW50ZXJ2YWwodXBkYXRlSW50ZXJ2YWwpO1xuICAgIH1cbiAgfVxuXG4gIGxldCB1cGRhdGVJbnRlcnZhbDtcblxuICBvbk1vdW50KCgpID0+IHtcbiAgICBzZWNvbmRQcm9ncmVzcy51cGRhdGUoKHByZXZpb3VzKSA9PiBwcmV2aW91cyArIDEpO1xuICAgIHVwZGF0ZUludGVydmFsID0gc2V0SW50ZXJ2YWwoKCkgPT4ge1xuICAgICAgc2Vjb25kUHJvZ3Jlc3MudXBkYXRlKChwcmV2aW91cykgPT4gcHJldmlvdXMgKyAxKTtcbiAgICB9LCAxMDAwKTtcbiAgfSk7XG5cbiAgb25EZXN0cm95KCgpID0+IGNsZWFySW50ZXJ2YWwodXBkYXRlSW50ZXJ2YWwpKTtcbjwvc2NyaXB0PlxuXG48ZGl2IGNsYXNzPVwiZGl2XCIgc3R5bGU9XCJ3aWR0aDoge3dpZHRofXB4XCI+XG4gIDxwcm9ncmVzcyBjbGFzcz1cInByb2dyZXNzIGlzLXN1Y2Nlc3MgbWItMFwiIHZhbHVlPXskc2Vjb25kUHJvZ3Jlc3N9IHttYXh9XG4gID48L3Byb2dyZXNzPlxuICA8ZGl2IGNsYXNzPVwiaGFzLXRleHQtY2VudGVyZWQgaXMtc2l6ZS0zXCI+XG4gICAge3RpbWVSZW1haW5pbmcudG9GaXhlZCgyKX1cbiAgPC9kaXY+XG48L2Rpdj5cblxuPHN0eWxlPlxuICBwcm9ncmVzcyB7XG4gICAgcG9zaXRpb246IHJlbGF0aXZlO1xuICAgIHdpZHRoOiAxMDAlO1xuICB9XG48L3N0eWxlPlxuIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQWlERSxzQkFBUyxDQUNQLFFBQVEsQ0FBRSxRQUFRLENBQ2xCLEtBQUssQ0FBRSxJQUNUIn0= */");
}

function create_fragment$7(ctx) {
	let div1;
	let progress;
	let t0;
	let div0;
	let t1_value = /*timeRemaining*/ ctx[2].toFixed(2) + "";
	let t1;

	const block = {
		c: function create() {
			div1 = element("div");
			progress = element("progress");
			t0 = space();
			div0 = element("div");
			t1 = text(t1_value);
			attr_dev(progress, "class", "progress is-success mb-0 svelte-l2ukrv");
			progress.value = /*$secondProgress*/ ctx[3];
			attr_dev(progress, "max", /*max*/ ctx[0]);
			add_location(progress, file$6, 41, 2, 850);
			attr_dev(div0, "class", "has-text-centered is-size-3");
			add_location(div0, file$6, 43, 2, 940);
			attr_dev(div1, "class", "div");
			set_style(div1, "width", /*width*/ ctx[1] + "px");
			add_location(div1, file$6, 40, 0, 805);
		},
		l: function claim(nodes) {
			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
		},
		m: function mount(target, anchor) {
			insert_dev(target, div1, anchor);
			append_dev(div1, progress);
			append_dev(div1, t0);
			append_dev(div1, div0);
			append_dev(div0, t1);
		},
		p: function update(ctx, [dirty]) {
			if (dirty & /*$secondProgress*/ 8) {
				prop_dev(progress, "value", /*$secondProgress*/ ctx[3]);
			}

			if (dirty & /*max*/ 1) {
				attr_dev(progress, "max", /*max*/ ctx[0]);
			}

			if (dirty & /*timeRemaining*/ 4 && t1_value !== (t1_value = /*timeRemaining*/ ctx[2].toFixed(2) + "")) set_data_dev(t1, t1_value);

			if (dirty & /*width*/ 2) {
				set_style(div1, "width", /*width*/ ctx[1] + "px");
			}
		},
		i: noop,
		o: noop,
		d: function destroy(detaching) {
			if (detaching) {
				detach_dev(div1);
			}
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_fragment$7.name,
		type: "component",
		source: "",
		ctx
	});

	return block;
}

function instance$7($$self, $$props, $$invalidate) {
	let $secondProgress;
	let { $$slots: slots = {}, $$scope } = $$props;
	validate_slots('ProgressTimer', slots, []);
	const secondProgress = tweened(0, { duration: 1000, easing: identity });
	validate_store(secondProgress, 'secondProgress');
	component_subscribe($$self, secondProgress, value => $$invalidate(3, $secondProgress = value));
	let { max = 60 } = $$props;
	let { width } = $$props;
	let timeRemaining;
	const dispatch = createEventDispatcher();
	let updateInterval;

	onMount(() => {
		secondProgress.update(previous => previous + 1);

		$$invalidate(5, updateInterval = setInterval(
			() => {
				secondProgress.update(previous => previous + 1);
			},
			1000
		));
	});

	onDestroy(() => clearInterval(updateInterval));

	$$self.$$.on_mount.push(function () {
		if (width === undefined && !('width' in $$props || $$self.$$.bound[$$self.$$.props['width']])) {
			console.warn("<ProgressTimer> was created without expected prop 'width'");
		}
	});

	const writable_props = ['max', 'width'];

	Object.keys($$props).forEach(key => {
		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<ProgressTimer> was created with unknown prop '${key}'`);
	});

	$$self.$$set = $$props => {
		if ('max' in $$props) $$invalidate(0, max = $$props.max);
		if ('width' in $$props) $$invalidate(1, width = $$props.width);
	};

	$$self.$capture_state = () => ({
		onMount,
		onDestroy,
		createEventDispatcher,
		tweened,
		linear: identity,
		secondProgress,
		max,
		width,
		timeRemaining,
		dispatch,
		updateInterval,
		$secondProgress
	});

	$$self.$inject_state = $$props => {
		if ('max' in $$props) $$invalidate(0, max = $$props.max);
		if ('width' in $$props) $$invalidate(1, width = $$props.width);
		if ('timeRemaining' in $$props) $$invalidate(2, timeRemaining = $$props.timeRemaining);
		if ('updateInterval' in $$props) $$invalidate(5, updateInterval = $$props.updateInterval);
	};

	if ($$props && "$$inject" in $$props) {
		$$self.$inject_state($$props.$$inject);
	}

	$$self.$$.update = () => {
		if ($$self.$$.dirty & /*max, $secondProgress*/ 9) {
			{
				$$invalidate(2, timeRemaining = max - $secondProgress);
			}
		}

		if ($$self.$$.dirty & /*timeRemaining, updateInterval*/ 36) {
			{
				if (timeRemaining <= 0) {
					dispatch("complete");
					clearInterval(updateInterval);
				}
			}
		}
	};

	return [max, width, timeRemaining, $secondProgress, secondProgress, updateInterval];
}

class ProgressTimer extends SvelteComponentDev {
	constructor(options) {
		super(options);
		init(this, options, instance$7, create_fragment$7, safe_not_equal, { max: 0, width: 1 }, add_css$2);

		dispatch_dev("SvelteRegisterComponent", {
			component: this,
			tagName: "ProgressTimer",
			options,
			id: create_fragment$7.name
		});
	}

	get max() {
		throw new Error("<ProgressTimer>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	set max(value) {
		throw new Error("<ProgressTimer>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	get width() {
		throw new Error("<ProgressTimer>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	set width(value) {
		throw new Error("<ProgressTimer>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}
}

/* svelte/KnightMoves.svelte generated by Svelte v4.2.18 */

const { Object: Object_1$1 } = globals;
const file$5 = "svelte/KnightMoves.svelte";

function add_css$1(target) {
	append_styles(target, "svelte-119er7j", ".cell.svelte-119er7j button.svelte-119er7j{width:100%;display:inline-block}@keyframes svelte-119er7j-incorrectAnswer{25%{background-color:red;transform:translateX(-10px)}50%{background-color:red;transform:translateX(10px)}75%{background-color:red;transform:translateX(-10px)}100%{transform:translateX(0px)}}@keyframes svelte-119er7j-correctAnswer{50%{background-color:green;transform:scale(1.01)}100%{transform:scale(1)}}\n/*# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiS25pZ2h0TW92ZXMuc3ZlbHRlIiwic291cmNlcyI6WyJLbmlnaHRNb3Zlcy5zdmVsdGUiXSwic291cmNlc0NvbnRlbnQiOlsiPHNjcmlwdD5cbiAgaW1wb3J0IHsgb25Nb3VudCB9IGZyb20gXCJzdmVsdGVcIjtcblxuICBpbXBvcnQgQ2hlc3Nib2FyZCBmcm9tIFwiLi9jb21wb25lbnRzL0NoZXNzYm9hcmQuc3ZlbHRlXCI7XG4gIGltcG9ydCBQcm9ncmVzc1RpbWVyIGZyb20gXCIuL2NvbXBvbmVudHMvUHJvZ3Jlc3NUaW1lci5zdmVsdGVcIjtcbiAgaW1wb3J0IHsgQ2hlc3MgfSBmcm9tIFwiY2hlc3MuanNcIjtcblxuICBpbXBvcnQgeyBrbmlnaHRNb3Zlc0RhdGEgfSBmcm9tIFwic3JjL2tuaWdodF9tb3Zlc19kYXRhXCI7XG4gIGltcG9ydCBDb25maWcgZnJvbSBcInNyYy9sb2NhbF9jb25maWdcIjtcbiAgaW1wb3J0IHsgQ29uZmlnRm9ybSB9IGZyb20gXCJzcmMvbG9jYWxfY29uZmlnXCI7XG4gIGltcG9ydCB7IFV0aWwgfSBmcm9tIFwic3JjL3V0aWxcIjtcblxuICBsZXQgY2hlc3Nncm91bmQ7XG4gIGxldCBjaGVzc2JvYXJkO1xuICBsZXQgZmVuO1xuICBsZXQganNvbkRhdGEgPSBrbmlnaHRNb3Zlc0RhdGE7XG4gIGxldCBwb3NpdGlvbkRhdGEgPSBudWxsO1xuICBsZXQgY29ycmVjdENvdW50ID0gMDtcbiAgbGV0IGluY29ycmVjdENvdW50ID0gMDtcblxuICBsZXQgZ2FtZVJ1bm5pbmcgPSBmYWxzZTtcbiAgbGV0IHRpbWVSZW1haW5pbmcgPSBudWxsO1xuXG4gIGxldCBhbmltYXRpbmcgPSBmYWxzZTtcbiAgbGV0IGFuc3dlclNob3duO1xuICBsZXQgZ3JvdXBlZFBhdGhzID0gW107XG4gIGxldCBncm91cEluZGV4ID0gMDtcblxuICBsZXQgZGlzYWJsZU5leHQgPSBmYWxzZTtcbiAgbGV0IGRpc2FibGVQcmV2ID0gdHJ1ZTtcblxuICAkOiB7XG4gICAgZGlzYWJsZU5leHQgPSBncm91cEluZGV4ID49IGdyb3VwZWRQYXRocy5sZW5ndGggLSAxO1xuICAgIGRpc2FibGVQcmV2ID0gZ3JvdXBJbmRleCA8PSAwO1xuICB9XG5cbiAgJDoge1xuICAgIGlmIChhbnN3ZXJTaG93biAmJiBncm91cGVkUGF0aHMubGVuZ3RoID4gMCAmJiBncm91cEluZGV4ID49IDApIHtcbiAgICAgIGRyYXdDb3JyZWN0QXJyb3dzKGdyb3VwZWRQYXRoc1tncm91cEluZGV4XSk7XG4gICAgfVxuICB9XG5cbiAgbGV0IGhpZ2hTY29yZSA9IDA7XG4gIGxldCBtYXhQYXRoc1RvRGlzcGxheU9wdGlvbjtcbiAgbGV0IGFuaW1hdGlvbkxlbmd0aE9wdGlvbjtcbiAgbGV0IGtuaWdodFNxdWFyZTtcbiAgbGV0IGtpbmdTcXVhcmU7XG4gIGxldCBjb25maWc7XG4gIGxldCBjb25maWdGb3JtO1xuXG4gIGxldCBib2FyZFdpZHRoO1xuXG4gIGxldCBidXR0b24xO1xuICBsZXQgYnV0dG9uMjtcbiAgbGV0IGJ1dHRvbjM7XG4gIGxldCBidXR0b240O1xuICBsZXQgYnV0dG9uNTtcbiAgbGV0IGJ1dHRvbjY7XG5cbiAgY29uc3QgY3VzdG9tQnJ1c2hlcyA9IHtcbiAgICBicmFuZDE6IHtcbiAgICAgIGtleTogXCJicmFuZDFcIixcbiAgICAgIGNvbG9yOiBVdGlsLmdldFJvb3RDc3NWYXJWYWx1ZShcIi0tYnJhbmQtY29sb3ItMVwiKSxcbiAgICAgIG9wYWNpdHk6IDEsXG4gICAgICBsaW5lV2lkdGg6IDE1LFxuICAgIH0sXG4gICAgYnJhbmQyOiB7XG4gICAgICBrZXk6IFwiYnJhbmQyXCIsXG4gICAgICBjb2xvcjogVXRpbC5nZXRSb290Q3NzVmFyVmFsdWUoXCItLWJyYW5kLWNvbG9yLTJcIiksXG4gICAgICBvcGFjaXR5OiAxLFxuICAgICAgbGluZVdpZHRoOiAxNSxcbiAgICB9LFxuICAgIGJyYW5kMzoge1xuICAgICAga2V5OiBcImJyYW5kM1wiLFxuICAgICAgY29sb3I6IFV0aWwuZ2V0Um9vdENzc1ZhclZhbHVlKFwiLS1icmFuZC1jb2xvci0zXCIpLFxuICAgICAgb3BhY2l0eTogMSxcbiAgICAgIGxpbmVXaWR0aDogMTUsXG4gICAgfSxcbiAgICBicmFuZDQ6IHtcbiAgICAgIGtleTogXCJicmFuZDRcIixcbiAgICAgIGNvbG9yOiBVdGlsLmdldFJvb3RDc3NWYXJWYWx1ZShcIi0tYnJhbmQtY29sb3ItNFwiKSxcbiAgICAgIG9wYWNpdHk6IDEsXG4gICAgICBsaW5lV2lkdGg6IDE1LFxuICAgIH0sXG4gICAgYnJhbmQ1OiB7XG4gICAgICBrZXk6IFwiYnJhbmQ1XCIsXG4gICAgICBjb2xvcjogVXRpbC5nZXRSb290Q3NzVmFyVmFsdWUoXCItLWJyYW5kLWNvbG9yLTVcIiksXG4gICAgICBvcGFjaXR5OiAxLFxuICAgICAgbGluZVdpZHRoOiAxNSxcbiAgICB9LFxuICAgIGJyYW5kNjoge1xuICAgICAga2V5OiBcImJyYW5kNlwiLFxuICAgICAgY29sb3I6IFV0aWwuZ2V0Um9vdENzc1ZhclZhbHVlKFwiLS1icmFuZC1jb2xvci02XCIpLFxuICAgICAgb3BhY2l0eTogMSxcbiAgICAgIGxpbmVXaWR0aDogMTUsXG4gICAgfSxcbiAgICBicmFuZDc6IHtcbiAgICAgIGtleTogXCJicmFuZDdcIixcbiAgICAgIGNvbG9yOiBVdGlsLmdldFJvb3RDc3NWYXJWYWx1ZShcIi0tYnJhbmQtY29sb3ItN1wiKSxcbiAgICAgIG9wYWNpdHk6IDEsXG4gICAgICBsaW5lV2lkdGg6IDE1LFxuICAgIH0sXG4gICAgYnJhbmQ4OiB7XG4gICAgICBrZXk6IFwiYnJhbmQ4XCIsXG4gICAgICBjb2xvcjogVXRpbC5nZXRSb290Q3NzVmFyVmFsdWUoXCItLWJyYW5kLWNvbG9yLThcIiksXG4gICAgICBvcGFjaXR5OiAxLFxuICAgICAgbGluZVdpZHRoOiAxNSxcbiAgICB9LFxuICAgIGJyYW5kOToge1xuICAgICAga2V5OiBcImJyYW5kOVwiLFxuICAgICAgY29sb3I6IFV0aWwuZ2V0Um9vdENzc1ZhclZhbHVlKFwiLS1icmFuZC1jb2xvci05XCIpLFxuICAgICAgb3BhY2l0eTogMSxcbiAgICAgIGxpbmVXaWR0aDogMTUsXG4gICAgfSxcbiAgfTtcblxuICBpbml0Q29uZmlnKCk7XG5cbiAgbGV0IGNoZXNzZ3JvdW5kQ29uZmlnID0ge1xuICAgIGZlbjogXCI4LzgvOC84LzgvOC84LzhcIixcbiAgICBhbmltYXRpb246IHtcbiAgICAgIGVuYWJsZWQ6IHRydWUsXG4gICAgICBkdXJhdGlvbjogYW5pbWF0aW9uTGVuZ3RoT3B0aW9uLmdldFZhbHVlKCksXG4gICAgfSxcbiAgICBoaWdobGlnaHQ6IHtcbiAgICAgIGxhc3RNb3ZlOiBmYWxzZSxcbiAgICB9LFxuICAgIGRyYWdnYWJsZTogZmFsc2UsXG4gICAgc2VsZWN0YWJsZTogZmFsc2UsXG4gICAgZHJhd2FibGU6IHtcbiAgICAgIGJydXNoZXM6IGN1c3RvbUJydXNoZXMsXG4gICAgfSxcbiAgfTtcblxuICBvbk1vdW50KCgpID0+IHtcbiAgICBpbml0S2V5Ym9hcmRTaG9ydGN1dHMoKTtcbiAgICBuZXdQb3NpdGlvbigpO1xuICB9KTtcblxuICBmdW5jdGlvbiBnZXRCdXR0b24oaWQpIHtcbiAgICBzd2l0Y2ggKGlkKSB7XG4gICAgICBjYXNlIDE6XG4gICAgICAgIHJldHVybiBidXR0b24xO1xuICAgICAgY2FzZSAyOlxuICAgICAgICByZXR1cm4gYnV0dG9uMjtcbiAgICAgIGNhc2UgMzpcbiAgICAgICAgcmV0dXJuIGJ1dHRvbjM7XG4gICAgICBjYXNlIDQ6XG4gICAgICAgIHJldHVybiBidXR0b240O1xuICAgICAgY2FzZSA1OlxuICAgICAgICByZXR1cm4gYnV0dG9uNTtcbiAgICAgIGNhc2UgNjpcbiAgICAgICAgcmV0dXJuIGJ1dHRvbjY7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gaW5pdEtleWJvYXJkU2hvcnRjdXRzKCkge1xuICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKFwia2V5ZG93blwiLCAoZXZlbnQpID0+IHtcbiAgICAgIGNvbnN0IGtleSA9IGV2ZW50LmtleTtcbiAgICAgIGlmIChrZXkgPj0gXCIxXCIgJiYga2V5IDw9IFwiNlwiKSB7XG4gICAgICAgIC8vIFRyaWdnZXIgY2xpY2sgZXZlbnQgb24gY29ycmVzcG9uZGluZyBidXR0b25cbiAgICAgICAgY29uc3QgYnV0dG9uID0gZ2V0QnV0dG9uKHBhcnNlSW50KGtleSkpO1xuICAgICAgICBidXR0b24uY2xpY2soKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHN0YXJ0VGltZWRHYW1lKCkge1xuICAgIHJlc2V0KCk7XG4gICAgZ2FtZVJ1bm5pbmcgPSB0cnVlO1xuICAgIG5ld1Bvc2l0aW9uKCk7XG4gIH1cblxuICBmdW5jdGlvbiBlbmRHYW1lKCkge1xuICAgIGlmIChjb3JyZWN0Q291bnQgPiBoaWdoU2NvcmUgJiYgZ2FtZVJ1bm5pbmcpIHtcbiAgICAgIGhpZ2hTY29yZSA9IGNvcnJlY3RDb3VudDtcbiAgICB9XG5cbiAgICBnYW1lUnVubmluZyA9IGZhbHNlO1xuICAgIHRpbWVSZW1haW5pbmcgPSBudWxsO1xuICAgIGNvcnJlY3RDb3VudCA9IDA7XG4gICAgaW5jb3JyZWN0Q291bnQgPSAwO1xuICB9XG5cbiAgZnVuY3Rpb24gcmVzZXQoKSB7XG4gICAgY29ycmVjdENvdW50ID0gMDtcbiAgICBpbmNvcnJlY3RDb3VudCA9IDA7XG4gICAgZ2FtZVJ1bm5pbmcgPSBmYWxzZTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGdldFJhbmRvbUluZGV4KG1heCkge1xuICAgIHJldHVybiBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiBtYXgpO1xuICB9XG5cbiAgZnVuY3Rpb24gc29ydFJhbmRvbWx5KGFycmF5KSB7XG4gICAgcmV0dXJuIGFycmF5LnNvcnQoKCkgPT4gTWF0aC5yYW5kb20oKSAtIDAuNSk7XG4gIH1cblxuICBmdW5jdGlvbiBnZXRNaW5pbXVtTW92ZXNGb3JDdXJyZW50UG9zaXRpb24oKSB7XG4gICAgcmV0dXJuIHBvc2l0aW9uRGF0YS5taW5fbGVuZ3RoO1xuICB9XG5cbiAgZnVuY3Rpb24gcHJvY2Vzc0J1dHRvbihpZCkge1xuICAgIGlmIChhbmltYXRpbmcpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY29uc3QgbnVtYmVyID0gcGFyc2VJbnQoaWQpO1xuICAgIGNvbnN0IG1pbmltdW0gPSBnZXRNaW5pbXVtTW92ZXNGb3JDdXJyZW50UG9zaXRpb24oKTtcbiAgICBjb25zdCBidXR0b24gPSBnZXRCdXR0b24obnVtYmVyKTtcbiAgICBpZiAobnVtYmVyID09PSBtaW5pbXVtKSB7XG4gICAgICBjb3JyZWN0Q291bnQgKz0gMTtcbiAgICAgIGFuaW1hdGVFbGVtZW50KGJ1dHRvbiwgXCJjb3JyZWN0QW5zd2VyXCIpO1xuICAgICAgbmV3UG9zaXRpb24oKTtcbiAgICB9IGVsc2Uge1xuICAgICAgaW5jb3JyZWN0Q291bnQgKz0gMTtcbiAgICAgIGFuaW1hdGVFbGVtZW50KGJ1dHRvbiwgXCJpbmNvcnJlY3RBbnN3ZXJcIik7XG4gICAgICBpZiAoZ2FtZVJ1bm5pbmcpIHtcbiAgICAgICAgZW5kR2FtZSgpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgIH1cbiAgICAgIGNvbnN0IGNvcnJlY3RQYXRocyA9IHBvc2l0aW9uRGF0YS5wYXRocztcbiAgICAgIGNvbnN0IHJhbmRvbWx5U29ydGVkID0gc29ydFJhbmRvbWx5KGNvcnJlY3RQYXRocyk7XG4gICAgICBjb25zdCBwYXRoVG9BbmltYXRlID0gcmFuZG9tbHlTb3J0ZWRbMF07XG4gICAgICBjb25zdCBtb3ZlUGFpcnMgPSBnZXRNb3ZlUGFpcnNGcm9tUGF0aChwYXRoVG9BbmltYXRlKTtcbiAgICAgIGRyYXdDb3JyZWN0QXJyb3dzKHJhbmRvbWx5U29ydGVkKTtcbiAgICAgIG1ha2VTZXF1ZW50aWFsTW92ZXMobW92ZVBhaXJzLCAoKSA9PiB7XG4gICAgICAgIG5ld1Bvc2l0aW9uKCk7XG4gICAgICB9KTtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBkcmF3Q29ycmVjdEFycm93cyh2YWxpZFBhdGhzKSB7XG4gICAgY2xlYXJEcmF3aW5ncygpO1xuICAgIGNvbnN0IHNoYXBlcyA9IFtdO1xuICAgIGNvbnN0IGFscmVhZHlEcmF3biA9IG5ldyBTZXQoKTtcbiAgICBjb25zdCBicnVzaEtleXMgPSBPYmplY3Qua2V5cyhjdXN0b21CcnVzaGVzKTtcbiAgICBsZXQgbWF4UGF0aHNUb1Nob3cgPSBtYXhQYXRoc1RvRGlzcGxheU9wdGlvbi5nZXRWYWx1ZSgpO1xuICAgIGlmIChtYXhQYXRoc1RvU2hvdyA8IDEpIHtcbiAgICAgIG1heFBhdGhzVG9TaG93ID0gMTtcbiAgICB9XG4gICAgbWF4UGF0aHNUb1Nob3cgPSA1MDtcblxuICAgIHZhbGlkUGF0aHMuZm9yRWFjaCgocGF0aCwgaW5kZXgpID0+IHtcbiAgICAgIGlmIChpbmRleCArIDEgPiBtYXhQYXRoc1RvU2hvdykge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBjb25zdCBtb3ZlUGFpcnMgPSBnZXRNb3ZlUGFpcnNGcm9tUGF0aChwYXRoKTtcbiAgICAgIGNvbnN0IGJydXNoS2V5ID0gYnJ1c2hLZXlzW2luZGV4ICUgYnJ1c2hLZXlzLmxlbmd0aF07XG4gICAgICBtb3ZlUGFpcnMuZm9yRWFjaCgocGFpcikgPT4ge1xuICAgICAgICBpZiAoYWxyZWFkeURyYXduLmhhcyhwYWlyKSkge1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBzaGFwZSA9IHtcbiAgICAgICAgICBvcmlnOiBwYWlyWzBdLFxuICAgICAgICAgIGRlc3Q6IHBhaXJbMV0sXG4gICAgICAgICAgYnJ1c2g6IGJydXNoS2V5LFxuICAgICAgICAgIG1vZGlmaWVyczogeyBsaW5lV2lkdGg6IDEwIH0sXG4gICAgICAgIH07XG4gICAgICAgIHNoYXBlcy5wdXNoKHNoYXBlKTtcbiAgICAgICAgYWxyZWFkeURyYXduLmFkZChwYWlyKTtcbiAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgY29uc3QgbWFpblBhdGggPSB2YWxpZFBhdGhzWzBdO1xuICAgIGNvbnN0IG1haW5Nb3ZlUGFpcnMgPSBnZXRNb3ZlUGFpcnNGcm9tUGF0aChtYWluUGF0aCk7XG4gICAgbWFpbk1vdmVQYWlycy5mb3JFYWNoKChwYWlyKSA9PiB7XG4gICAgICBjb25zdCBzaGFwZSA9IHtcbiAgICAgICAgb3JpZzogcGFpclswXSxcbiAgICAgICAgZGVzdDogcGFpclsxXSxcbiAgICAgICAgYnJ1c2g6IFwiZ3JlZW5cIixcbiAgICAgICAgbW9kaWZpZXJzOiB7IGluZVdpZHRoOiAxMCB9LFxuICAgICAgfTtcbiAgICAgIHNoYXBlcy5wdXNoKHNoYXBlKTtcbiAgICB9KTtcblxuICAgIGNoZXNzZ3JvdW5kLnNldCh7XG4gICAgICBkcmF3YWJsZToge1xuICAgICAgICBzaGFwZXM6IHNoYXBlcyxcbiAgICAgIH0sXG4gICAgfSk7XG4gIH1cblxuICBmdW5jdGlvbiBnZXRNb3ZlUGFpcnNGcm9tUGF0aChwYXRoKSB7XG4gICAgY29uc3QgcGFpcnMgPSBbXTtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHBhdGgubGVuZ3RoIC0gMTsgaSsrKSB7XG4gICAgICBwYWlycy5wdXNoKFtwYXRoW2ldLCBwYXRoW2kgKyAxXV0pO1xuICAgIH1cbiAgICByZXR1cm4gcGFpcnM7XG4gIH1cblxuICBmdW5jdGlvbiBnZXRHcm91cGVkUGF0aHMocGF0aHMpIHtcbiAgICBsZXQgZ3JvdXBzID0gW107XG5cbiAgICBmb3IgKGxldCBwYXRoIG9mIHBhdGhzKSB7XG4gICAgICBsZXQgYWRkZWRUb0dyb3VwID0gZmFsc2U7XG5cbiAgICAgIGZvciAobGV0IGdyb3VwIG9mIGdyb3Vwcykge1xuICAgICAgICBsZXQgb3ZlcmxhcCA9IGdyb3VwLnNvbWUoKGdyb3VwUGF0aCkgPT4ge1xuICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgZ3JvdXBQYXRoLmxlbmd0aCAtIDE7IGkrKykge1xuICAgICAgICAgICAgZm9yIChsZXQgaiA9IDA7IGogPCBwYXRoLmxlbmd0aCAtIDE7IGorKykge1xuICAgICAgICAgICAgICBpZiAoXG4gICAgICAgICAgICAgICAgZ3JvdXBQYXRoW2ldID09PSBwYXRoW2pdICYmXG4gICAgICAgICAgICAgICAgZ3JvdXBQYXRoW2kgKyAxXSA9PT0gcGF0aFtqICsgMV1cbiAgICAgICAgICAgICAgKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9KTtcblxuICAgICAgICBpZiAoIW92ZXJsYXApIHtcbiAgICAgICAgICBncm91cC5wdXNoKHBhdGgpO1xuICAgICAgICAgIGFkZGVkVG9Hcm91cCA9IHRydWU7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgaWYgKCFhZGRlZFRvR3JvdXApIHtcbiAgICAgICAgZ3JvdXBzLnB1c2goW3BhdGhdKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gZ3JvdXBzO1xuICB9XG5cbiAgZnVuY3Rpb24gaW5jcmVtZW50R3JvdXBJbmRleCgpIHtcbiAgICBpZiAoZ3JvdXBJbmRleCA8IGdyb3VwZWRQYXRocy5sZW5ndGggLSAxKSB7XG4gICAgICBncm91cEluZGV4Kys7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gZGVjcmVtZW50R3JvdXBJbmRleCgpIHtcbiAgICBpZiAoZ3JvdXBJbmRleCA+IDApIHtcbiAgICAgIGdyb3VwSW5kZXgtLTtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBtYWtlU2VxdWVudGlhbE1vdmVzKG1vdmVQYWlycyA9IFtdLCBjYWxsYmFjayA9IG51bGwpIHtcbiAgICBhbmltYXRpbmcgPSB0cnVlO1xuICAgIGlmIChtb3ZlUGFpcnMubGVuZ3RoIDwgMSkge1xuICAgICAgYW5pbWF0aW5nID0gZmFsc2U7XG4gICAgICBpZiAoY2FsbGJhY2spIHtcbiAgICAgICAgY2FsbGJhY2soKTtcbiAgICAgIH1cbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICAvLyBzaGlmdCBtdXRhdGVzIHRoZSBhcnJheVxuICAgIGNvbnN0IG1vdmUgPSBtb3ZlUGFpcnMuc2hpZnQoKTtcblxuICAgIGNoZXNzZ3JvdW5kLm1vdmUobW92ZVswXSwgbW92ZVsxXSk7XG5cbiAgICBzZXRUaW1lb3V0KFxuICAgICAgKCkgPT4gbWFrZVNlcXVlbnRpYWxNb3Zlcyhtb3ZlUGFpcnMsIGNhbGxiYWNrKSxcbiAgICAgIGFuaW1hdGlvbkxlbmd0aE9wdGlvbi5nZXRWYWx1ZSgpLFxuICAgICk7XG4gIH1cblxuICBmdW5jdGlvbiBjbGVhckRyYXdpbmdzKCkge1xuICAgIGNoZXNzZ3JvdW5kLnNldCh7XG4gICAgICBkcmF3YWJsZToge1xuICAgICAgICBzaGFwZXM6IFtdLFxuICAgICAgfSxcbiAgICB9KTtcbiAgfVxuXG4gIGZ1bmN0aW9uIG5ld1Bvc2l0aW9uKCkge1xuICAgIGNoZXNzYm9hcmQuY2xlYXIoKTtcbiAgICBjbGVhckRyYXdpbmdzKCk7XG4gICAgYW5zd2VyU2hvd24gPSBmYWxzZTtcbiAgICBjb25zdCBrZXlzID0gT2JqZWN0LmtleXMoanNvbkRhdGEpO1xuICAgIGNvbnN0IGluZGV4ID0gZ2V0UmFuZG9tSW5kZXgoa2V5cy5sZW5ndGgpO1xuICAgIGNvbnN0IGtleSA9IGtleXNbaW5kZXhdO1xuICAgIGNvbnN0IHByZXZpb3VzS25pZ2h0U3F1YXJlID0ga25pZ2h0U3F1YXJlO1xuICAgIGNvbnN0IHByZXZpb3VzS2luZ1NxdWFyZSA9IGtpbmdTcXVhcmU7XG4gICAgY29uc3Qgc3F1YXJlcyA9IGtleS5zcGxpdChcIi5cIik7XG4gICAga25pZ2h0U3F1YXJlID0gc3F1YXJlc1swXTtcbiAgICBraW5nU3F1YXJlID0gc3F1YXJlc1sxXTtcbiAgICBwb3NpdGlvbkRhdGEgPSBqc29uRGF0YVtrZXldO1xuICAgIGNvbnN0IGtpbmcgPSB7XG4gICAgICByb2xlOiBcImtpbmdcIixcbiAgICAgIGNvbG9yOiBcImJsYWNrXCIsXG4gICAgfTtcbiAgICBjb25zdCBrbmlnaHQgPSB7XG4gICAgICByb2xlOiBcImtuaWdodFwiLFxuICAgICAgY29sb3I6IFwid2hpdGVcIixcbiAgICB9O1xuICAgIGNvbnN0IHBpZWNlc0RpZmYgPSBuZXcgTWFwKCk7XG4gICAgaWYgKHByZXZpb3VzS25pZ2h0U3F1YXJlICYmIHByZXZpb3VzS2luZ1NxdWFyZSkge1xuICAgICAgcGllY2VzRGlmZi5zZXQocHJldmlvdXNLbmlnaHRTcXVhcmUsIHVuZGVmaW5lZCk7XG4gICAgICBwaWVjZXNEaWZmLnNldChwcmV2aW91c0tpbmdTcXVhcmUsIHVuZGVmaW5lZCk7XG4gICAgfVxuICAgIHBpZWNlc0RpZmYuc2V0KGtpbmdTcXVhcmUsIGtpbmcpO1xuICAgIHBpZWNlc0RpZmYuc2V0KGtuaWdodFNxdWFyZSwga25pZ2h0KTtcbiAgICBjaGVzc2dyb3VuZC5zZXRQaWVjZXMocGllY2VzRGlmZik7XG4gICAgY2hlc3Nncm91bmQuc2V0UGllY2VzKG5ldyBNYXAoKSk7XG4gIH1cblxuICBmdW5jdGlvbiBhbmltYXRlRWxlbWVudChlbGVtZW50LCBhbmltYXRpb25DbGFzcykge1xuICAgIGVsZW1lbnQuY2xhc3NMaXN0LmFkZChhbmltYXRpb25DbGFzcyk7XG5cbiAgICAvLyBMaXN0ZW4gZm9yIHRoZSBhbmltYXRpb25lbmQgZXZlbnRcbiAgICBlbGVtZW50LmFkZEV2ZW50TGlzdGVuZXIoXG4gICAgICBcImFuaW1hdGlvbmVuZFwiLFxuICAgICAgZnVuY3Rpb24gKCkge1xuICAgICAgICAvLyBPbmNlIHRoZSBhbmltYXRpb24gZW5kcywgcmVtb3ZlIHRoZSBjbGFzc1xuICAgICAgICBlbGVtZW50LmNsYXNzTGlzdC5yZW1vdmUoYW5pbWF0aW9uQ2xhc3MpO1xuICAgICAgfSxcbiAgICAgIHsgb25jZTogdHJ1ZSB9LFxuICAgICk7IC8vIFRoZSBsaXN0ZW5lciBpcyByZW1vdmVkIGFmdGVyIGl0J3MgaW52b2tlZCBvbmNlXG4gIH1cblxuICBmdW5jdGlvbiBpbml0Q29uZmlnKCkge1xuICAgIGNvbmZpZyA9IG5ldyBDb25maWcoXCJrbmlnaHRfbW92ZXNfZ2FtZVwiKTtcbiAgICBhbmltYXRpb25MZW5ndGhPcHRpb24gPSBjb25maWcuZ2V0Q29uZmlnT3B0aW9uKFxuICAgICAgXCJBbmltYXRpb24gbGVuZ3RoIChtcylcIixcbiAgICAgIDMwMCxcbiAgICApO1xuXG4gICAgbWF4UGF0aHNUb0Rpc3BsYXlPcHRpb24gPSBjb25maWcuZ2V0Q29uZmlnT3B0aW9uKFwiTWF4IHBhdGhzIHRvIHNob3dcIiwgNik7XG5cbiAgICBjb25maWdGb3JtID0gbmV3IENvbmZpZ0Zvcm0oY29uZmlnKTtcbiAgICBjb25maWdGb3JtLmFkZExpbmtUb0RPTShcImNvbmZpZ1wiKTtcbiAgfVxuPC9zY3JpcHQ+XG5cbjxsaW5rIGlkPVwicGllY2Utc3ByaXRlXCIgaHJlZj1cIi9waWVjZS1jc3MvbWVyaWRhLmNzc1wiIHJlbD1cInN0eWxlc2hlZXRcIiAvPlxuXG48ZGl2IGNsYXNzPVwiY29sdW1uc1wiPlxuICA8ZGl2IGNsYXNzPVwiY29sdW1uIGNvbHVtbjIgaXMtNi1kZXNrdG9wXCI+XG4gICAgPGRpdiBjbGFzcz1cImJsb2NrXCI+XG4gICAgICA8Q2hlc3Nib2FyZFxuICAgICAgICB7Y2hlc3Nncm91bmRDb25maWd9XG4gICAgICAgIGJpbmQ6ZmVuXG4gICAgICAgIGJpbmQ6Y2hlc3Nncm91bmRcbiAgICAgICAgYmluZDp0aGlzPXtjaGVzc2JvYXJkfVxuICAgICAgICBiaW5kOnNpemU9e2JvYXJkV2lkdGh9XG4gICAgICAvPlxuICAgIDwvZGl2PlxuXG4gICAgeyNpZiBnYW1lUnVubmluZ31cbiAgICAgIDxQcm9ncmVzc1RpbWVyIG1heD1cIjMwXCIgd2lkdGg9e2JvYXJkV2lkdGh9IG9uOmNvbXBsZXRlPXtlbmRHYW1lfSAvPlxuICAgIHsvaWZ9XG5cbiAgICA8ZGl2IGNsYXNzPVwiZml4ZWQtZ3JpZCBoYXMtMy1jb2xzXCIgc3R5bGU9XCJ3aWR0aDoge2JvYXJkV2lkdGh9cHhcIj5cbiAgICAgIDxkaXYgY2xhc3M9XCJncmlkXCI+XG4gICAgICAgIDxkaXYgY2xhc3M9XCJjZWxsXCI+XG4gICAgICAgICAgPGJ1dHRvblxuICAgICAgICAgICAgY2xhc3M9XCJidXR0b24gaXMtcHJpbWFyeVwiXG4gICAgICAgICAgICBpZD1cIjFcIlxuICAgICAgICAgICAgb246Y2xpY2s9eygpID0+IHByb2Nlc3NCdXR0b24oXCIxXCIpfVxuICAgICAgICAgICAgYmluZDp0aGlzPXtidXR0b24xfT4xPC9idXR0b25cbiAgICAgICAgICA+XG4gICAgICAgIDwvZGl2PlxuICAgICAgICA8ZGl2IGNsYXNzPVwiY2VsbFwiPlxuICAgICAgICAgIDxidXR0b25cbiAgICAgICAgICAgIGNsYXNzPVwiYnV0dG9uIGlzLXByaW1hcnlcIlxuICAgICAgICAgICAgaWQ9XCIyXCJcbiAgICAgICAgICAgIG9uOmNsaWNrPXsoKSA9PiBwcm9jZXNzQnV0dG9uKFwiMlwiKX1cbiAgICAgICAgICAgIGJpbmQ6dGhpcz17YnV0dG9uMn0+MjwvYnV0dG9uXG4gICAgICAgICAgPlxuICAgICAgICA8L2Rpdj5cbiAgICAgICAgPGRpdiBjbGFzcz1cImNlbGxcIj5cbiAgICAgICAgICA8YnV0dG9uXG4gICAgICAgICAgICBjbGFzcz1cImJ1dHRvbiBpcy1wcmltYXJ5XCJcbiAgICAgICAgICAgIGlkPVwiM1wiXG4gICAgICAgICAgICBvbjpjbGljaz17KCkgPT4gcHJvY2Vzc0J1dHRvbihcIjNcIil9XG4gICAgICAgICAgICBiaW5kOnRoaXM9e2J1dHRvbjN9PjM8L2J1dHRvblxuICAgICAgICAgID5cbiAgICAgICAgPC9kaXY+XG4gICAgICAgIDxkaXYgY2xhc3M9XCJjZWxsXCI+XG4gICAgICAgICAgPGJ1dHRvblxuICAgICAgICAgICAgY2xhc3M9XCJidXR0b24gaXMtcHJpbWFyeVwiXG4gICAgICAgICAgICBpZD1cIjRcIlxuICAgICAgICAgICAgb246Y2xpY2s9eygpID0+IHByb2Nlc3NCdXR0b24oXCI0XCIpfVxuICAgICAgICAgICAgYmluZDp0aGlzPXtidXR0b240fT40PC9idXR0b25cbiAgICAgICAgICA+XG4gICAgICAgIDwvZGl2PlxuICAgICAgICA8ZGl2IGNsYXNzPVwiY2VsbFwiPlxuICAgICAgICAgIDxidXR0b25cbiAgICAgICAgICAgIGNsYXNzPVwiYnV0dG9uIGlzLXByaW1hcnlcIlxuICAgICAgICAgICAgaWQ9XCI1XCJcbiAgICAgICAgICAgIG9uOmNsaWNrPXsoKSA9PiBwcm9jZXNzQnV0dG9uKFwiNVwiKX1cbiAgICAgICAgICAgIGJpbmQ6dGhpcz17YnV0dG9uNX0+NTwvYnV0dG9uXG4gICAgICAgICAgPlxuICAgICAgICA8L2Rpdj5cbiAgICAgICAgPGRpdiBjbGFzcz1cImNlbGxcIj5cbiAgICAgICAgICA8YnV0dG9uXG4gICAgICAgICAgICBjbGFzcz1cImJ1dHRvbiBpcy1wcmltYXJ5XCJcbiAgICAgICAgICAgIGlkPVwiNlwiXG4gICAgICAgICAgICBvbjpjbGljaz17KCkgPT4gcHJvY2Vzc0J1dHRvbihcIjZcIil9XG4gICAgICAgICAgICBiaW5kOnRoaXM9e2J1dHRvbjZ9PjY8L2J1dHRvblxuICAgICAgICAgID5cbiAgICAgICAgPC9kaXY+XG4gICAgICA8L2Rpdj5cbiAgICA8L2Rpdj5cbiAgPC9kaXY+XG5cbiAgPGRpdiBjbGFzcz1cImNvbHVtbiBjb2x1bW4xIGlzLTMtZGVza3RvcFwiPlxuICAgIDxkaXYgY2xhc3M9XCJib3ggc2NvcmUtY29udGFpbmVyXCI+XG4gICAgICA8ZGl2IGNsYXNzPVwiY29udGFpbmVyIGhhcy10ZXh0LWNlbnRlcmVkXCI+XG4gICAgICAgIDxoMiBjbGFzcz1cImlzLXNpemUtNVwiPkNvcnJlY3Q8L2gyPlxuICAgICAgICA8ZGl2IGNsYXNzPVwic2NvcmUgaXMtc2l6ZS0yXCI+e2NvcnJlY3RDb3VudH08L2Rpdj5cbiAgICAgICAgPGgyIGNsYXNzPVwiaXMtc2l6ZS01XCI+SW5jb3JyZWN0PC9oMj5cbiAgICAgICAgPGRpdiBjbGFzcz1cInNjb3JlIGlzLXNpemUtMlwiPntpbmNvcnJlY3RDb3VudH08L2Rpdj5cbiAgICAgIDwvZGl2PlxuICAgIDwvZGl2PlxuICAgIDxkaXYgY2xhc3M9XCJib3hcIj5cbiAgICAgIDxkaXYgY2xhc3M9XCJjb250YWluZXIgaGFzLXRleHQtY2VudGVyZWRcIj5cbiAgICAgICAgPGgyIGNsYXNzPVwiaXMtc2l6ZS01XCI+SGlnaCBTY29yZTwvaDI+XG4gICAgICAgIDxkaXYgY2xhc3M9XCJzY29yZSBpcy1zaXplLTJcIj57aGlnaFNjb3JlfTwvZGl2PlxuICAgICAgICB7I2lmICFnYW1lUnVubmluZ31cbiAgICAgICAgICA8YnV0dG9uXG4gICAgICAgICAgICBpZD1cInN0YXJ0VGltZWRHYW1lXCJcbiAgICAgICAgICAgIG9uOmNsaWNrPXtzdGFydFRpbWVkR2FtZX1cbiAgICAgICAgICAgIGNsYXNzPVwiYnV0dG9uIGlzLXByaW1hcnlcIlxuICAgICAgICAgICAgPlN0YXJ0IFRpbWVkIEdhbWVcbiAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgey9pZn1cbiAgICAgICAgeyNpZiB0aW1lUmVtYWluaW5nID4gMH1cbiAgICAgICAgICA8ZGl2IGlkPVwidGltZXJcIj57dGltZVJlbWFpbmluZ308L2Rpdj5cbiAgICAgICAgey9pZn1cbiAgICAgIDwvZGl2PlxuICAgIDwvZGl2PlxuICAgIDxkaXYgY2xhc3M9XCJib3hcIj5cbiAgICAgIDxkaXYgY2xhc3M9XCJjb250YWluZXIgaGFzLXRleHQtY2VudGVyZWRcIj5cbiAgICAgICAgeyNpZiAhYW5zd2VyU2hvd259XG4gICAgICAgICAgPGRpdiBjbGFzcz1cImJsb2NrXCI+XG4gICAgICAgICAgICA8YnV0dG9uXG4gICAgICAgICAgICAgIGNsYXNzPVwiYnV0dG9uIGlzLWluZm9cIlxuICAgICAgICAgICAgICBkaXNhYmxlZD17YW5zd2VyU2hvd24gfHwgZ2FtZVJ1bm5pbmd9XG4gICAgICAgICAgICAgIG9uOmNsaWNrfHByZXZlbnREZWZhdWx0PXsoKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKHBvc2l0aW9uRGF0YSkge1xuICAgICAgICAgICAgICAgICAgYW5zd2VyU2hvd24gPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgY29uc3QgY29ycmVjdFBhdGhzID0gcG9zaXRpb25EYXRhLnBhdGhzO1xuICAgICAgICAgICAgICAgICAgY29uc3QgcmFuZG9tbHlTb3J0ZWQgPSBzb3J0UmFuZG9tbHkoY29ycmVjdFBhdGhzKTtcbiAgICAgICAgICAgICAgICAgIGdyb3VwZWRQYXRocyA9IHNvcnRSYW5kb21seShnZXRHcm91cGVkUGF0aHMocmFuZG9tbHlTb3J0ZWQpKTtcbiAgICAgICAgICAgICAgICAgIGdyb3VwSW5kZXggPSAwO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfX1cbiAgICAgICAgICAgICAgPlNob3cgYW5zd2VyXG4gICAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgezplbHNlfVxuICAgICAgICAgIDxkaXYgY2xhc3M9XCJibG9ja1wiPlxuICAgICAgICAgICAgPGJ1dHRvblxuICAgICAgICAgICAgICBjbGFzcz1cImJ1dHRvbiBpcy1saW5rXCJcbiAgICAgICAgICAgICAgb246Y2xpY2s9eygpID0+IHtcbiAgICAgICAgICAgICAgICBjbGVhckRyYXdpbmdzKCk7XG4gICAgICAgICAgICAgICAgYW5zd2VyU2hvd24gPSBmYWxzZTtcbiAgICAgICAgICAgICAgfX1cbiAgICAgICAgICAgID5cbiAgICAgICAgICAgICAgQ2xlYXJcbiAgICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICAgICAgeyNpZiBncm91cGVkUGF0aHMubGVuZ3RoID4gMX1cbiAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImJ1dHRvbnMgaGFzLWFkZG9uc1wiPlxuICAgICAgICAgICAgICAgIDxidXR0b25cbiAgICAgICAgICAgICAgICAgIGNsYXNzPVwiYnV0dG9uXCJcbiAgICAgICAgICAgICAgICAgIG9uOmNsaWNrPXtkZWNyZW1lbnRHcm91cEluZGV4fVxuICAgICAgICAgICAgICAgICAgZGlzYWJsZWQ9e2Rpc2FibGVQcmV2fT4mbGFxdW87PC9idXR0b25cbiAgICAgICAgICAgICAgICA+XG4gICAgICAgICAgICAgICAgPGJ1dHRvblxuICAgICAgICAgICAgICAgICAgY2xhc3M9XCJidXR0b25cIlxuICAgICAgICAgICAgICAgICAgb246Y2xpY2s9e2luY3JlbWVudEdyb3VwSW5kZXh9XG4gICAgICAgICAgICAgICAgICBkaXNhYmxlZD17ZGlzYWJsZU5leHR9PiZyYXF1bzs8L2J1dHRvblxuICAgICAgICAgICAgICAgID5cbiAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICB7L2lmfVxuICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgIDxkaXYgY2xhc3M9XCJibG9jayBoYXMtdGV4dC1sZWZ0XCI+XG4gICAgICAgICAgICA8ZGl2PlxuICAgICAgICAgICAgICBNaW5pbXVtICMgb2YgbW92ZXM6IHtnZXRNaW5pbXVtTW92ZXNGb3JDdXJyZW50UG9zaXRpb24oKX1cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgPGRpdj5cbiAgICAgICAgICAgICAgVG90YWwgdW5pcXVlIHBhdGhzOiB7cG9zaXRpb25EYXRhLnBhdGhzLmxlbmd0aH1cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgIDwvZGl2PlxuICAgICAgICB7L2lmfVxuICAgICAgPC9kaXY+XG4gICAgPC9kaXY+XG4gIDwvZGl2PlxuPC9kaXY+XG5cbjxzdHlsZT5cbiAgLmNlbGwgYnV0dG9uIHtcbiAgICB3aWR0aDogMTAwJTtcbiAgICBkaXNwbGF5OiBpbmxpbmUtYmxvY2s7XG4gIH1cblxuICBAa2V5ZnJhbWVzIGluY29ycmVjdEFuc3dlciB7XG4gICAgMjUlIHtcbiAgICAgIGJhY2tncm91bmQtY29sb3I6IHJlZDtcbiAgICAgIHRyYW5zZm9ybTogdHJhbnNsYXRlWCgtMTBweCk7XG4gICAgfVxuICAgIDUwJSB7XG4gICAgICBiYWNrZ3JvdW5kLWNvbG9yOiByZWQ7XG4gICAgICB0cmFuc2Zvcm06IHRyYW5zbGF0ZVgoMTBweCk7XG4gICAgfVxuICAgIDc1JSB7XG4gICAgICBiYWNrZ3JvdW5kLWNvbG9yOiByZWQ7XG4gICAgICB0cmFuc2Zvcm06IHRyYW5zbGF0ZVgoLTEwcHgpO1xuICAgIH1cbiAgICAxMDAlIHtcbiAgICAgIHRyYW5zZm9ybTogdHJhbnNsYXRlWCgwcHgpO1xuICAgIH1cbiAgfVxuXG4gIC5pbmNvcnJlY3RBbnN3ZXIge1xuICAgIGFuaW1hdGlvbjogaW5jb3JyZWN0QW5zd2VyIDFzIGxpbmVhcjtcbiAgfVxuXG4gIEBrZXlmcmFtZXMgY29ycmVjdEFuc3dlciB7XG4gICAgNTAlIHtcbiAgICAgIGJhY2tncm91bmQtY29sb3I6IGdyZWVuO1xuICAgICAgdHJhbnNmb3JtOiBzY2FsZSgxLjAxKTtcbiAgICB9XG4gICAgMTAwJSB7XG4gICAgICB0cmFuc2Zvcm06IHNjYWxlKDEpO1xuICAgIH1cbiAgfVxuXG4gIC5jb3JyZWN0QW5zd2VyIHtcbiAgICBhbmltYXRpb246IGNvcnJlY3RBbnN3ZXIgMC43NXMgbGluZWFyO1xuICB9XG48L3N0eWxlPlxuIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQXlrQkUsb0JBQUssQ0FBQyxxQkFBTyxDQUNYLEtBQUssQ0FBRSxJQUFJLENBQ1gsT0FBTyxDQUFFLFlBQ1gsQ0FFQSxXQUFXLDhCQUFnQixDQUN6QixHQUFJLENBQ0YsZ0JBQWdCLENBQUUsR0FBRyxDQUNyQixTQUFTLENBQUUsV0FBVyxLQUFLLENBQzdCLENBQ0EsR0FBSSxDQUNGLGdCQUFnQixDQUFFLEdBQUcsQ0FDckIsU0FBUyxDQUFFLFdBQVcsSUFBSSxDQUM1QixDQUNBLEdBQUksQ0FDRixnQkFBZ0IsQ0FBRSxHQUFHLENBQ3JCLFNBQVMsQ0FBRSxXQUFXLEtBQUssQ0FDN0IsQ0FDQSxJQUFLLENBQ0gsU0FBUyxDQUFFLFdBQVcsR0FBRyxDQUMzQixDQUNGLENBTUEsV0FBVyw0QkFBYyxDQUN2QixHQUFJLENBQ0YsZ0JBQWdCLENBQUUsS0FBSyxDQUN2QixTQUFTLENBQUUsTUFBTSxJQUFJLENBQ3ZCLENBQ0EsSUFBSyxDQUNILFNBQVMsQ0FBRSxNQUFNLENBQUMsQ0FDcEIsQ0FDRiJ9 */");
}

// (442:4) {#if gameRunning}
function create_if_block_4(ctx) {
	let progresstimer;
	let current;

	progresstimer = new ProgressTimer({
			props: { max: "30", width: /*boardWidth*/ ctx[14] },
			$$inline: true
		});

	progresstimer.$on("complete", /*endGame*/ ctx[23]);

	const block = {
		c: function create() {
			create_component(progresstimer.$$.fragment);
		},
		m: function mount(target, anchor) {
			mount_component(progresstimer, target, anchor);
			current = true;
		},
		p: function update(ctx, dirty) {
			const progresstimer_changes = {};
			if (dirty[0] & /*boardWidth*/ 16384) progresstimer_changes.width = /*boardWidth*/ ctx[14];
			progresstimer.$set(progresstimer_changes);
		},
		i: function intro(local) {
			if (current) return;
			transition_in(progresstimer.$$.fragment, local);
			current = true;
		},
		o: function outro(local) {
			transition_out(progresstimer.$$.fragment, local);
			current = false;
		},
		d: function destroy(detaching) {
			destroy_component(progresstimer, detaching);
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_if_block_4.name,
		type: "if",
		source: "(442:4) {#if gameRunning}",
		ctx
	});

	return block;
}

// (513:8) {#if !gameRunning}
function create_if_block_3(ctx) {
	let button;
	let mounted;
	let dispose;

	const block = {
		c: function create() {
			button = element("button");
			button.textContent = "Start Timed Game";
			attr_dev(button, "id", "startTimedGame");
			attr_dev(button, "class", "button is-primary");
			add_location(button, file$5, 513, 10, 12123);
		},
		m: function mount(target, anchor) {
			insert_dev(target, button, anchor);

			if (!mounted) {
				dispose = listen_dev(button, "click", /*startTimedGame*/ ctx[22], false, false, false, false);
				mounted = true;
			}
		},
		p: noop,
		d: function destroy(detaching) {
			if (detaching) {
				detach_dev(button);
			}

			mounted = false;
			dispose();
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_if_block_3.name,
		type: "if",
		source: "(513:8) {#if !gameRunning}",
		ctx
	});

	return block;
}

// (521:8) {#if timeRemaining > 0}
function create_if_block_2$1(ctx) {
	let div;
	let t;

	const block = {
		c: function create() {
			div = element("div");
			t = text(/*timeRemaining*/ ctx[10]);
			attr_dev(div, "id", "timer");
			add_location(div, file$5, 521, 10, 12345);
		},
		m: function mount(target, anchor) {
			insert_dev(target, div, anchor);
			append_dev(div, t);
		},
		p: function update(ctx, dirty) {
			if (dirty[0] & /*timeRemaining*/ 1024) set_data_dev(t, /*timeRemaining*/ ctx[10]);
		},
		d: function destroy(detaching) {
			if (detaching) {
				detach_dev(div);
			}
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_if_block_2$1.name,
		type: "if",
		source: "(521:8) {#if timeRemaining > 0}",
		ctx
	});

	return block;
}

// (545:8) {:else}
function create_else_block$1(ctx) {
	let div0;
	let button;
	let t1;
	let t2;
	let div3;
	let div1;
	let t5;
	let div2;
	let t6;
	let t7_value = /*positionData*/ ctx[6].paths.length + "";
	let t7;
	let mounted;
	let dispose;
	let if_block = /*groupedPaths*/ ctx[1].length > 1 && create_if_block_1$1(ctx);

	const block = {
		c: function create() {
			div0 = element("div");
			button = element("button");
			button.textContent = "Clear";
			t1 = space();
			if (if_block) if_block.c();
			t2 = space();
			div3 = element("div");
			div1 = element("div");
			div1.textContent = `Minimum # of moves: ${/*getMinimumMovesForCurrentPosition*/ ctx[24]()}`;
			t5 = space();
			div2 = element("div");
			t6 = text("Total unique paths: ");
			t7 = text(t7_value);
			attr_dev(button, "class", "button is-link");
			add_location(button, file$5, 546, 12, 13179);
			attr_dev(div0, "class", "block");
			add_location(div0, file$5, 545, 10, 13147);
			add_location(div1, file$5, 571, 12, 13962);
			add_location(div2, file$5, 574, 12, 14071);
			attr_dev(div3, "class", "block has-text-left");
			add_location(div3, file$5, 570, 10, 13916);
		},
		m: function mount(target, anchor) {
			insert_dev(target, div0, anchor);
			append_dev(div0, button);
			append_dev(div0, t1);
			if (if_block) if_block.m(div0, null);
			insert_dev(target, t2, anchor);
			insert_dev(target, div3, anchor);
			append_dev(div3, div1);
			append_dev(div3, t5);
			append_dev(div3, div2);
			append_dev(div2, t6);
			append_dev(div2, t7);

			if (!mounted) {
				dispose = listen_dev(button, "click", /*click_handler_7*/ ctx[46], false, false, false, false);
				mounted = true;
			}
		},
		p: function update(ctx, dirty) {
			if (/*groupedPaths*/ ctx[1].length > 1) {
				if (if_block) {
					if_block.p(ctx, dirty);
				} else {
					if_block = create_if_block_1$1(ctx);
					if_block.c();
					if_block.m(div0, null);
				}
			} else if (if_block) {
				if_block.d(1);
				if_block = null;
			}

			if (dirty[0] & /*positionData*/ 64 && t7_value !== (t7_value = /*positionData*/ ctx[6].paths.length + "")) set_data_dev(t7, t7_value);
		},
		d: function destroy(detaching) {
			if (detaching) {
				detach_dev(div0);
				detach_dev(t2);
				detach_dev(div3);
			}

			if (if_block) if_block.d();
			mounted = false;
			dispose();
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_else_block$1.name,
		type: "else",
		source: "(545:8) {:else}",
		ctx
	});

	return block;
}

// (528:8) {#if !answerShown}
function create_if_block$3(ctx) {
	let div;
	let button;
	let t;
	let button_disabled_value;
	let mounted;
	let dispose;

	const block = {
		c: function create() {
			div = element("div");
			button = element("button");
			t = text("Show answer");
			attr_dev(button, "class", "button is-info");
			button.disabled = button_disabled_value = /*answerShown*/ ctx[0] || /*gameRunning*/ ctx[9];
			add_location(button, file$5, 529, 12, 12560);
			attr_dev(div, "class", "block");
			add_location(div, file$5, 528, 10, 12528);
		},
		m: function mount(target, anchor) {
			insert_dev(target, div, anchor);
			append_dev(div, button);
			append_dev(button, t);

			if (!mounted) {
				dispose = listen_dev(button, "click", prevent_default(/*click_handler_6*/ ctx[45]), false, true, false, false);
				mounted = true;
			}
		},
		p: function update(ctx, dirty) {
			if (dirty[0] & /*answerShown, gameRunning*/ 513 && button_disabled_value !== (button_disabled_value = /*answerShown*/ ctx[0] || /*gameRunning*/ ctx[9])) {
				prop_dev(button, "disabled", button_disabled_value);
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
		id: create_if_block$3.name,
		type: "if",
		source: "(528:8) {#if !answerShown}",
		ctx
	});

	return block;
}

// (556:12) {#if groupedPaths.length > 1}
function create_if_block_1$1(ctx) {
	let div;
	let button0;
	let t0;
	let t1;
	let button1_1;
	let t2;
	let mounted;
	let dispose;

	const block = {
		c: function create() {
			div = element("div");
			button0 = element("button");
			t0 = text("«");
			t1 = space();
			button1_1 = element("button");
			t2 = text("»");
			attr_dev(button0, "class", "button");
			button0.disabled = /*disablePrev*/ ctx[12];
			add_location(button0, file$5, 557, 16, 13504);
			attr_dev(button1_1, "class", "button");
			button1_1.disabled = /*disableNext*/ ctx[11];
			add_location(button1_1, file$5, 562, 16, 13685);
			attr_dev(div, "class", "buttons has-addons");
			add_location(div, file$5, 556, 14, 13455);
		},
		m: function mount(target, anchor) {
			insert_dev(target, div, anchor);
			append_dev(div, button0);
			append_dev(button0, t0);
			append_dev(div, t1);
			append_dev(div, button1_1);
			append_dev(button1_1, t2);

			if (!mounted) {
				dispose = [
					listen_dev(button0, "click", /*decrementGroupIndex*/ ctx[27], false, false, false, false),
					listen_dev(button1_1, "click", /*incrementGroupIndex*/ ctx[26], false, false, false, false)
				];

				mounted = true;
			}
		},
		p: function update(ctx, dirty) {
			if (dirty[0] & /*disablePrev*/ 4096) {
				prop_dev(button0, "disabled", /*disablePrev*/ ctx[12]);
			}

			if (dirty[0] & /*disableNext*/ 2048) {
				prop_dev(button1_1, "disabled", /*disableNext*/ ctx[11]);
			}
		},
		d: function destroy(detaching) {
			if (detaching) {
				detach_dev(div);
			}

			mounted = false;
			run_all(dispose);
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_if_block_1$1.name,
		type: "if",
		source: "(556:12) {#if groupedPaths.length > 1}",
		ctx
	});

	return block;
}

function create_fragment$6(ctx) {
	let link;
	let t0;
	let div20;
	let div9;
	let div0;
	let chessboard_1;
	let updating_fen;
	let updating_chessground;
	let updating_size;
	let t1;
	let t2;
	let div8;
	let div7;
	let div1;
	let button0;
	let t4;
	let div2;
	let button1_1;
	let t6;
	let div3;
	let button2_1;
	let t8;
	let div4;
	let button3_1;
	let t10;
	let div5;
	let button4_1;
	let t12;
	let div6;
	let button5_1;
	let t14;
	let div19;
	let div13;
	let div12;
	let h20;
	let t16;
	let div10;
	let t17;
	let t18;
	let h21;
	let t20;
	let div11;
	let t21;
	let t22;
	let div16;
	let div15;
	let h22;
	let t24;
	let div14;
	let t25;
	let t26;
	let t27;
	let t28;
	let div18;
	let div17;
	let current;
	let mounted;
	let dispose;

	function chessboard_1_fen_binding(value) {
		/*chessboard_1_fen_binding*/ ctx[29](value);
	}

	function chessboard_1_chessground_binding(value) {
		/*chessboard_1_chessground_binding*/ ctx[30](value);
	}

	function chessboard_1_size_binding(value) {
		/*chessboard_1_size_binding*/ ctx[32](value);
	}

	let chessboard_1_props = {
		chessgroundConfig: /*chessgroundConfig*/ ctx[21]
	};

	if (/*fen*/ ctx[5] !== void 0) {
		chessboard_1_props.fen = /*fen*/ ctx[5];
	}

	if (/*chessground*/ ctx[3] !== void 0) {
		chessboard_1_props.chessground = /*chessground*/ ctx[3];
	}

	if (/*boardWidth*/ ctx[14] !== void 0) {
		chessboard_1_props.size = /*boardWidth*/ ctx[14];
	}

	chessboard_1 = new Chessboard({
			props: chessboard_1_props,
			$$inline: true
		});

	binding_callbacks.push(() => bind(chessboard_1, 'fen', chessboard_1_fen_binding));
	binding_callbacks.push(() => bind(chessboard_1, 'chessground', chessboard_1_chessground_binding));
	/*chessboard_1_binding*/ ctx[31](chessboard_1);
	binding_callbacks.push(() => bind(chessboard_1, 'size', chessboard_1_size_binding));
	let if_block0 = /*gameRunning*/ ctx[9] && create_if_block_4(ctx);
	let if_block1 = !/*gameRunning*/ ctx[9] && create_if_block_3(ctx);
	let if_block2 = /*timeRemaining*/ ctx[10] > 0 && create_if_block_2$1(ctx);

	function select_block_type(ctx, dirty) {
		if (!/*answerShown*/ ctx[0]) return create_if_block$3;
		return create_else_block$1;
	}

	let current_block_type = select_block_type(ctx);
	let if_block3 = current_block_type(ctx);

	const block = {
		c: function create() {
			link = element("link");
			t0 = space();
			div20 = element("div");
			div9 = element("div");
			div0 = element("div");
			create_component(chessboard_1.$$.fragment);
			t1 = space();
			if (if_block0) if_block0.c();
			t2 = space();
			div8 = element("div");
			div7 = element("div");
			div1 = element("div");
			button0 = element("button");
			button0.textContent = "1";
			t4 = space();
			div2 = element("div");
			button1_1 = element("button");
			button1_1.textContent = "2";
			t6 = space();
			div3 = element("div");
			button2_1 = element("button");
			button2_1.textContent = "3";
			t8 = space();
			div4 = element("div");
			button3_1 = element("button");
			button3_1.textContent = "4";
			t10 = space();
			div5 = element("div");
			button4_1 = element("button");
			button4_1.textContent = "5";
			t12 = space();
			div6 = element("div");
			button5_1 = element("button");
			button5_1.textContent = "6";
			t14 = space();
			div19 = element("div");
			div13 = element("div");
			div12 = element("div");
			h20 = element("h2");
			h20.textContent = "Correct";
			t16 = space();
			div10 = element("div");
			t17 = text(/*correctCount*/ ctx[7]);
			t18 = space();
			h21 = element("h2");
			h21.textContent = "Incorrect";
			t20 = space();
			div11 = element("div");
			t21 = text(/*incorrectCount*/ ctx[8]);
			t22 = space();
			div16 = element("div");
			div15 = element("div");
			h22 = element("h2");
			h22.textContent = "High Score";
			t24 = space();
			div14 = element("div");
			t25 = text(/*highScore*/ ctx[13]);
			t26 = space();
			if (if_block1) if_block1.c();
			t27 = space();
			if (if_block2) if_block2.c();
			t28 = space();
			div18 = element("div");
			div17 = element("div");
			if_block3.c();
			attr_dev(link, "id", "piece-sprite");
			attr_dev(link, "href", "/piece-css/merida.css");
			attr_dev(link, "rel", "stylesheet");
			add_location(link, file$5, 427, 0, 9670);
			attr_dev(div0, "class", "block");
			add_location(div0, file$5, 431, 4, 9814);
			attr_dev(button0, "class", "button is-primary svelte-119er7j");
			attr_dev(button0, "id", "1");
			add_location(button0, file$5, 448, 10, 10244);
			attr_dev(div1, "class", "cell svelte-119er7j");
			add_location(div1, file$5, 447, 8, 10215);
			attr_dev(button1_1, "class", "button is-primary svelte-119er7j");
			attr_dev(button1_1, "id", "2");
			add_location(button1_1, file$5, 456, 10, 10463);
			attr_dev(div2, "class", "cell svelte-119er7j");
			add_location(div2, file$5, 455, 8, 10434);
			attr_dev(button2_1, "class", "button is-primary svelte-119er7j");
			attr_dev(button2_1, "id", "3");
			add_location(button2_1, file$5, 464, 10, 10682);
			attr_dev(div3, "class", "cell svelte-119er7j");
			add_location(div3, file$5, 463, 8, 10653);
			attr_dev(button3_1, "class", "button is-primary svelte-119er7j");
			attr_dev(button3_1, "id", "4");
			add_location(button3_1, file$5, 472, 10, 10901);
			attr_dev(div4, "class", "cell svelte-119er7j");
			add_location(div4, file$5, 471, 8, 10872);
			attr_dev(button4_1, "class", "button is-primary svelte-119er7j");
			attr_dev(button4_1, "id", "5");
			add_location(button4_1, file$5, 480, 10, 11120);
			attr_dev(div5, "class", "cell svelte-119er7j");
			add_location(div5, file$5, 479, 8, 11091);
			attr_dev(button5_1, "class", "button is-primary svelte-119er7j");
			attr_dev(button5_1, "id", "6");
			add_location(button5_1, file$5, 488, 10, 11339);
			attr_dev(div6, "class", "cell svelte-119er7j");
			add_location(div6, file$5, 487, 8, 11310);
			attr_dev(div7, "class", "grid");
			add_location(div7, file$5, 446, 6, 10188);
			attr_dev(div8, "class", "fixed-grid has-3-cols");
			set_style(div8, "width", /*boardWidth*/ ctx[14] + "px");
			add_location(div8, file$5, 445, 4, 10116);
			attr_dev(div9, "class", "column column2 is-6-desktop");
			add_location(div9, file$5, 430, 2, 9768);
			attr_dev(h20, "class", "is-size-5");
			add_location(h20, file$5, 502, 8, 11693);
			attr_dev(div10, "class", "score is-size-2");
			add_location(div10, file$5, 503, 8, 11736);
			attr_dev(h21, "class", "is-size-5");
			add_location(h21, file$5, 504, 8, 11794);
			attr_dev(div11, "class", "score is-size-2");
			add_location(div11, file$5, 505, 8, 11839);
			attr_dev(div12, "class", "container has-text-centered");
			add_location(div12, file$5, 501, 6, 11643);
			attr_dev(div13, "class", "box score-container");
			add_location(div13, file$5, 500, 4, 11603);
			attr_dev(h22, "class", "is-size-5");
			add_location(h22, file$5, 510, 8, 11993);
			attr_dev(div14, "class", "score is-size-2");
			add_location(div14, file$5, 511, 8, 12039);
			attr_dev(div15, "class", "container has-text-centered");
			add_location(div15, file$5, 509, 6, 11943);
			attr_dev(div16, "class", "box");
			add_location(div16, file$5, 508, 4, 11919);
			attr_dev(div17, "class", "container has-text-centered");
			add_location(div17, file$5, 526, 6, 12449);
			attr_dev(div18, "class", "box");
			add_location(div18, file$5, 525, 4, 12425);
			attr_dev(div19, "class", "column column1 is-3-desktop");
			add_location(div19, file$5, 499, 2, 11557);
			attr_dev(div20, "class", "columns");
			add_location(div20, file$5, 429, 0, 9744);
		},
		l: function claim(nodes) {
			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
		},
		m: function mount(target, anchor) {
			insert_dev(target, link, anchor);
			insert_dev(target, t0, anchor);
			insert_dev(target, div20, anchor);
			append_dev(div20, div9);
			append_dev(div9, div0);
			mount_component(chessboard_1, div0, null);
			append_dev(div9, t1);
			if (if_block0) if_block0.m(div9, null);
			append_dev(div9, t2);
			append_dev(div9, div8);
			append_dev(div8, div7);
			append_dev(div7, div1);
			append_dev(div1, button0);
			/*button0_binding*/ ctx[34](button0);
			append_dev(div7, t4);
			append_dev(div7, div2);
			append_dev(div2, button1_1);
			/*button1_1_binding*/ ctx[36](button1_1);
			append_dev(div7, t6);
			append_dev(div7, div3);
			append_dev(div3, button2_1);
			/*button2_1_binding*/ ctx[38](button2_1);
			append_dev(div7, t8);
			append_dev(div7, div4);
			append_dev(div4, button3_1);
			/*button3_1_binding*/ ctx[40](button3_1);
			append_dev(div7, t10);
			append_dev(div7, div5);
			append_dev(div5, button4_1);
			/*button4_1_binding*/ ctx[42](button4_1);
			append_dev(div7, t12);
			append_dev(div7, div6);
			append_dev(div6, button5_1);
			/*button5_1_binding*/ ctx[44](button5_1);
			append_dev(div20, t14);
			append_dev(div20, div19);
			append_dev(div19, div13);
			append_dev(div13, div12);
			append_dev(div12, h20);
			append_dev(div12, t16);
			append_dev(div12, div10);
			append_dev(div10, t17);
			append_dev(div12, t18);
			append_dev(div12, h21);
			append_dev(div12, t20);
			append_dev(div12, div11);
			append_dev(div11, t21);
			append_dev(div19, t22);
			append_dev(div19, div16);
			append_dev(div16, div15);
			append_dev(div15, h22);
			append_dev(div15, t24);
			append_dev(div15, div14);
			append_dev(div14, t25);
			append_dev(div15, t26);
			if (if_block1) if_block1.m(div15, null);
			append_dev(div15, t27);
			if (if_block2) if_block2.m(div15, null);
			append_dev(div19, t28);
			append_dev(div19, div18);
			append_dev(div18, div17);
			if_block3.m(div17, null);
			current = true;

			if (!mounted) {
				dispose = [
					listen_dev(button0, "click", /*click_handler*/ ctx[33], false, false, false, false),
					listen_dev(button1_1, "click", /*click_handler_1*/ ctx[35], false, false, false, false),
					listen_dev(button2_1, "click", /*click_handler_2*/ ctx[37], false, false, false, false),
					listen_dev(button3_1, "click", /*click_handler_3*/ ctx[39], false, false, false, false),
					listen_dev(button4_1, "click", /*click_handler_4*/ ctx[41], false, false, false, false),
					listen_dev(button5_1, "click", /*click_handler_5*/ ctx[43], false, false, false, false)
				];

				mounted = true;
			}
		},
		p: function update(ctx, dirty) {
			const chessboard_1_changes = {};

			if (!updating_fen && dirty[0] & /*fen*/ 32) {
				updating_fen = true;
				chessboard_1_changes.fen = /*fen*/ ctx[5];
				add_flush_callback(() => updating_fen = false);
			}

			if (!updating_chessground && dirty[0] & /*chessground*/ 8) {
				updating_chessground = true;
				chessboard_1_changes.chessground = /*chessground*/ ctx[3];
				add_flush_callback(() => updating_chessground = false);
			}

			if (!updating_size && dirty[0] & /*boardWidth*/ 16384) {
				updating_size = true;
				chessboard_1_changes.size = /*boardWidth*/ ctx[14];
				add_flush_callback(() => updating_size = false);
			}

			chessboard_1.$set(chessboard_1_changes);

			if (/*gameRunning*/ ctx[9]) {
				if (if_block0) {
					if_block0.p(ctx, dirty);

					if (dirty[0] & /*gameRunning*/ 512) {
						transition_in(if_block0, 1);
					}
				} else {
					if_block0 = create_if_block_4(ctx);
					if_block0.c();
					transition_in(if_block0, 1);
					if_block0.m(div9, t2);
				}
			} else if (if_block0) {
				group_outros();

				transition_out(if_block0, 1, 1, () => {
					if_block0 = null;
				});

				check_outros();
			}

			if (!current || dirty[0] & /*boardWidth*/ 16384) {
				set_style(div8, "width", /*boardWidth*/ ctx[14] + "px");
			}

			if (!current || dirty[0] & /*correctCount*/ 128) set_data_dev(t17, /*correctCount*/ ctx[7]);
			if (!current || dirty[0] & /*incorrectCount*/ 256) set_data_dev(t21, /*incorrectCount*/ ctx[8]);
			if (!current || dirty[0] & /*highScore*/ 8192) set_data_dev(t25, /*highScore*/ ctx[13]);

			if (!/*gameRunning*/ ctx[9]) {
				if (if_block1) {
					if_block1.p(ctx, dirty);
				} else {
					if_block1 = create_if_block_3(ctx);
					if_block1.c();
					if_block1.m(div15, t27);
				}
			} else if (if_block1) {
				if_block1.d(1);
				if_block1 = null;
			}

			if (/*timeRemaining*/ ctx[10] > 0) {
				if (if_block2) {
					if_block2.p(ctx, dirty);
				} else {
					if_block2 = create_if_block_2$1(ctx);
					if_block2.c();
					if_block2.m(div15, null);
				}
			} else if (if_block2) {
				if_block2.d(1);
				if_block2 = null;
			}

			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block3) {
				if_block3.p(ctx, dirty);
			} else {
				if_block3.d(1);
				if_block3 = current_block_type(ctx);

				if (if_block3) {
					if_block3.c();
					if_block3.m(div17, null);
				}
			}
		},
		i: function intro(local) {
			if (current) return;
			transition_in(chessboard_1.$$.fragment, local);
			transition_in(if_block0);
			current = true;
		},
		o: function outro(local) {
			transition_out(chessboard_1.$$.fragment, local);
			transition_out(if_block0);
			current = false;
		},
		d: function destroy(detaching) {
			if (detaching) {
				detach_dev(link);
				detach_dev(t0);
				detach_dev(div20);
			}

			/*chessboard_1_binding*/ ctx[31](null);
			destroy_component(chessboard_1);
			if (if_block0) if_block0.d();
			/*button0_binding*/ ctx[34](null);
			/*button1_1_binding*/ ctx[36](null);
			/*button2_1_binding*/ ctx[38](null);
			/*button3_1_binding*/ ctx[40](null);
			/*button4_1_binding*/ ctx[42](null);
			/*button5_1_binding*/ ctx[44](null);
			if (if_block1) if_block1.d();
			if (if_block2) if_block2.d();
			if_block3.d();
			mounted = false;
			run_all(dispose);
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_fragment$6.name,
		type: "component",
		source: "",
		ctx
	});

	return block;
}

function getRandomIndex(max) {
	return Math.floor(Math.random() * max);
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

function getGroupedPaths(paths) {
	let groups = [];

	for (let path of paths) {
		let addedToGroup = false;

		for (let group of groups) {
			let overlap = group.some(groupPath => {
				for (let i = 0; i < groupPath.length - 1; i++) {
					for (let j = 0; j < path.length - 1; j++) {
						if (groupPath[i] === path[j] && groupPath[i + 1] === path[j + 1]) {
							return true;
						}
					}
				}

				return false;
			});

			if (!overlap) {
				group.push(path);
				addedToGroup = true;
				break;
			}
		}

		if (!addedToGroup) {
			groups.push([path]);
		}
	}

	return groups;
}

function animateElement(element, animationClass) {
	element.classList.add(animationClass);

	// Listen for the animationend event
	element.addEventListener(
		"animationend",
		function () {
			// Once the animation ends, remove the class
			element.classList.remove(animationClass);
		},
		{ once: true }
	); // The listener is removed after it's invoked once
}

function instance$6($$self, $$props, $$invalidate) {
	let { $$slots: slots = {}, $$scope } = $$props;
	validate_slots('KnightMoves', slots, []);
	let chessground;
	let chessboard;
	let fen;
	let jsonData = knightMovesData;
	let positionData = null;
	let correctCount = 0;
	let incorrectCount = 0;
	let gameRunning = false;
	let timeRemaining = null;
	let animating = false;
	let answerShown;
	let groupedPaths = [];
	let groupIndex = 0;
	let disableNext = false;
	let disablePrev = true;
	let highScore = 0;
	let maxPathsToDisplayOption;
	let animationLengthOption;
	let knightSquare;
	let kingSquare;
	let config;
	let configForm;
	let boardWidth;
	let button1;
	let button2;
	let button3;
	let button4;
	let button5;
	let button6;

	const customBrushes = {
		brand1: {
			key: "brand1",
			color: Util.getRootCssVarValue("--brand-color-1"),
			opacity: 1,
			lineWidth: 15
		},
		brand2: {
			key: "brand2",
			color: Util.getRootCssVarValue("--brand-color-2"),
			opacity: 1,
			lineWidth: 15
		},
		brand3: {
			key: "brand3",
			color: Util.getRootCssVarValue("--brand-color-3"),
			opacity: 1,
			lineWidth: 15
		},
		brand4: {
			key: "brand4",
			color: Util.getRootCssVarValue("--brand-color-4"),
			opacity: 1,
			lineWidth: 15
		},
		brand5: {
			key: "brand5",
			color: Util.getRootCssVarValue("--brand-color-5"),
			opacity: 1,
			lineWidth: 15
		},
		brand6: {
			key: "brand6",
			color: Util.getRootCssVarValue("--brand-color-6"),
			opacity: 1,
			lineWidth: 15
		},
		brand7: {
			key: "brand7",
			color: Util.getRootCssVarValue("--brand-color-7"),
			opacity: 1,
			lineWidth: 15
		},
		brand8: {
			key: "brand8",
			color: Util.getRootCssVarValue("--brand-color-8"),
			opacity: 1,
			lineWidth: 15
		},
		brand9: {
			key: "brand9",
			color: Util.getRootCssVarValue("--brand-color-9"),
			opacity: 1,
			lineWidth: 15
		}
	};

	initConfig();

	let chessgroundConfig = {
		fen: "8/8/8/8/8/8/8/8",
		animation: {
			enabled: true,
			duration: animationLengthOption.getValue()
		},
		highlight: { lastMove: false },
		draggable: false,
		selectable: false,
		drawable: { brushes: customBrushes }
	};

	onMount(() => {
		initKeyboardShortcuts();
		newPosition();
	});

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
		window.addEventListener("keydown", event => {
			const key = event.key;

			if (key >= "1" && key <= "6") {
				// Trigger click event on corresponding button
				const button = getButton(parseInt(key));

				button.click();
			}
		});
	}

	function startTimedGame() {
		reset();
		$$invalidate(9, gameRunning = true);
		newPosition();
	}

	function endGame() {
		if (correctCount > highScore && gameRunning) {
			$$invalidate(13, highScore = correctCount);
		}

		$$invalidate(9, gameRunning = false);
		$$invalidate(10, timeRemaining = null);
		$$invalidate(7, correctCount = 0);
		$$invalidate(8, incorrectCount = 0);
	}

	function reset() {
		$$invalidate(7, correctCount = 0);
		$$invalidate(8, incorrectCount = 0);
		$$invalidate(9, gameRunning = false);
	}

	function getMinimumMovesForCurrentPosition() {
		return positionData.min_length;
	}

	function processButton(id) {
		if (animating) {
			return;
		}

		const number = parseInt(id);
		const minimum = getMinimumMovesForCurrentPosition();
		const button = getButton(number);

		if (number === minimum) {
			$$invalidate(7, correctCount += 1);
			animateElement(button, "correctAnswer");
			newPosition();
		} else {
			$$invalidate(8, incorrectCount += 1);
			animateElement(button, "incorrectAnswer");

			if (gameRunning) {
				endGame();
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
		clearDrawings();
		const shapes = [];
		const alreadyDrawn = new Set();
		const brushKeys = Object.keys(customBrushes);
		let maxPathsToShow = maxPathsToDisplayOption.getValue();

		if (maxPathsToShow < 1) {
			maxPathsToShow = 1;
		}

		maxPathsToShow = 50;

		validPaths.forEach((path, index) => {
			if (index + 1 > maxPathsToShow) {
				return;
			}

			const movePairs = getMovePairsFromPath(path);
			const brushKey = brushKeys[index % brushKeys.length];

			movePairs.forEach(pair => {
				if (alreadyDrawn.has(pair)) {
					return;
				}

				const shape = {
					orig: pair[0],
					dest: pair[1],
					brush: brushKey,
					modifiers: { lineWidth: 10 }
				};

				shapes.push(shape);
				alreadyDrawn.add(pair);
			});
		});

		const mainPath = validPaths[0];
		const mainMovePairs = getMovePairsFromPath(mainPath);

		mainMovePairs.forEach(pair => {
			const shape = {
				orig: pair[0],
				dest: pair[1],
				brush: "green",
				modifiers: { ineWidth: 10 }
			};

			shapes.push(shape);
		});

		chessground.set({ drawable: { shapes } });
	}

	function incrementGroupIndex() {
		if (groupIndex < groupedPaths.length - 1) {
			$$invalidate(2, groupIndex++, groupIndex);
		}
	}

	function decrementGroupIndex() {
		if (groupIndex > 0) {
			$$invalidate(2, groupIndex--, groupIndex);
		}
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
		chessground.set({ drawable: { shapes: [] } });
	}

	function newPosition() {
		chessboard.clear();
		clearDrawings();
		$$invalidate(0, answerShown = false);
		const keys = Object.keys(jsonData);
		const index = getRandomIndex(keys.length);
		const key = keys[index];
		const previousKnightSquare = knightSquare;
		const previousKingSquare = kingSquare;
		const squares = key.split(".");
		knightSquare = squares[0];
		kingSquare = squares[1];
		$$invalidate(6, positionData = jsonData[key]);
		const king = { role: "king", color: "black" };
		const knight = { role: "knight", color: "white" };
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
		config = new Config("knight_moves_game");
		animationLengthOption = config.getConfigOption("Animation length (ms)", 300);
		maxPathsToDisplayOption = config.getConfigOption("Max paths to show", 6);
		configForm = new ConfigForm(config);
		configForm.addLinkToDOM("config");
	}

	const writable_props = [];

	Object_1$1.keys($$props).forEach(key => {
		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<KnightMoves> was created with unknown prop '${key}'`);
	});

	function chessboard_1_fen_binding(value) {
		fen = value;
		$$invalidate(5, fen);
	}

	function chessboard_1_chessground_binding(value) {
		chessground = value;
		$$invalidate(3, chessground);
	}

	function chessboard_1_binding($$value) {
		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
			chessboard = $$value;
			$$invalidate(4, chessboard);
		});
	}

	function chessboard_1_size_binding(value) {
		boardWidth = value;
		$$invalidate(14, boardWidth);
	}

	const click_handler = () => processButton("1");

	function button0_binding($$value) {
		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
			button1 = $$value;
			$$invalidate(15, button1);
		});
	}

	const click_handler_1 = () => processButton("2");

	function button1_1_binding($$value) {
		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
			button2 = $$value;
			$$invalidate(16, button2);
		});
	}

	const click_handler_2 = () => processButton("3");

	function button2_1_binding($$value) {
		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
			button3 = $$value;
			$$invalidate(17, button3);
		});
	}

	const click_handler_3 = () => processButton("4");

	function button3_1_binding($$value) {
		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
			button4 = $$value;
			$$invalidate(18, button4);
		});
	}

	const click_handler_4 = () => processButton("5");

	function button4_1_binding($$value) {
		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
			button5 = $$value;
			$$invalidate(19, button5);
		});
	}

	const click_handler_5 = () => processButton("6");

	function button5_1_binding($$value) {
		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
			button6 = $$value;
			$$invalidate(20, button6);
		});
	}

	const click_handler_6 = () => {
		if (positionData) {
			$$invalidate(0, answerShown = true);
			const correctPaths = positionData.paths;
			const randomlySorted = sortRandomly(correctPaths);
			$$invalidate(1, groupedPaths = sortRandomly(getGroupedPaths(randomlySorted)));
			$$invalidate(2, groupIndex = 0);
		}
	};

	const click_handler_7 = () => {
		clearDrawings();
		$$invalidate(0, answerShown = false);
	};

	$$self.$capture_state = () => ({
		onMount,
		Chessboard,
		ProgressTimer,
		Chess,
		knightMovesData,
		Config,
		ConfigForm,
		Util,
		chessground,
		chessboard,
		fen,
		jsonData,
		positionData,
		correctCount,
		incorrectCount,
		gameRunning,
		timeRemaining,
		animating,
		answerShown,
		groupedPaths,
		groupIndex,
		disableNext,
		disablePrev,
		highScore,
		maxPathsToDisplayOption,
		animationLengthOption,
		knightSquare,
		kingSquare,
		config,
		configForm,
		boardWidth,
		button1,
		button2,
		button3,
		button4,
		button5,
		button6,
		customBrushes,
		chessgroundConfig,
		getButton,
		initKeyboardShortcuts,
		startTimedGame,
		endGame,
		reset,
		getRandomIndex,
		sortRandomly,
		getMinimumMovesForCurrentPosition,
		processButton,
		drawCorrectArrows,
		getMovePairsFromPath,
		getGroupedPaths,
		incrementGroupIndex,
		decrementGroupIndex,
		makeSequentialMoves,
		clearDrawings,
		newPosition,
		animateElement,
		initConfig
	});

	$$self.$inject_state = $$props => {
		if ('chessground' in $$props) $$invalidate(3, chessground = $$props.chessground);
		if ('chessboard' in $$props) $$invalidate(4, chessboard = $$props.chessboard);
		if ('fen' in $$props) $$invalidate(5, fen = $$props.fen);
		if ('jsonData' in $$props) jsonData = $$props.jsonData;
		if ('positionData' in $$props) $$invalidate(6, positionData = $$props.positionData);
		if ('correctCount' in $$props) $$invalidate(7, correctCount = $$props.correctCount);
		if ('incorrectCount' in $$props) $$invalidate(8, incorrectCount = $$props.incorrectCount);
		if ('gameRunning' in $$props) $$invalidate(9, gameRunning = $$props.gameRunning);
		if ('timeRemaining' in $$props) $$invalidate(10, timeRemaining = $$props.timeRemaining);
		if ('animating' in $$props) animating = $$props.animating;
		if ('answerShown' in $$props) $$invalidate(0, answerShown = $$props.answerShown);
		if ('groupedPaths' in $$props) $$invalidate(1, groupedPaths = $$props.groupedPaths);
		if ('groupIndex' in $$props) $$invalidate(2, groupIndex = $$props.groupIndex);
		if ('disableNext' in $$props) $$invalidate(11, disableNext = $$props.disableNext);
		if ('disablePrev' in $$props) $$invalidate(12, disablePrev = $$props.disablePrev);
		if ('highScore' in $$props) $$invalidate(13, highScore = $$props.highScore);
		if ('maxPathsToDisplayOption' in $$props) maxPathsToDisplayOption = $$props.maxPathsToDisplayOption;
		if ('animationLengthOption' in $$props) animationLengthOption = $$props.animationLengthOption;
		if ('knightSquare' in $$props) knightSquare = $$props.knightSquare;
		if ('kingSquare' in $$props) kingSquare = $$props.kingSquare;
		if ('config' in $$props) config = $$props.config;
		if ('configForm' in $$props) configForm = $$props.configForm;
		if ('boardWidth' in $$props) $$invalidate(14, boardWidth = $$props.boardWidth);
		if ('button1' in $$props) $$invalidate(15, button1 = $$props.button1);
		if ('button2' in $$props) $$invalidate(16, button2 = $$props.button2);
		if ('button3' in $$props) $$invalidate(17, button3 = $$props.button3);
		if ('button4' in $$props) $$invalidate(18, button4 = $$props.button4);
		if ('button5' in $$props) $$invalidate(19, button5 = $$props.button5);
		if ('button6' in $$props) $$invalidate(20, button6 = $$props.button6);
		if ('chessgroundConfig' in $$props) $$invalidate(21, chessgroundConfig = $$props.chessgroundConfig);
	};

	if ($$props && "$$inject" in $$props) {
		$$self.$inject_state($$props.$$inject);
	}

	$$self.$$.update = () => {
		if ($$self.$$.dirty[0] & /*groupIndex, groupedPaths*/ 6) {
			{
				$$invalidate(11, disableNext = groupIndex >= groupedPaths.length - 1);
				$$invalidate(12, disablePrev = groupIndex <= 0);
			}
		}

		if ($$self.$$.dirty[0] & /*answerShown, groupedPaths, groupIndex*/ 7) {
			{
				if (answerShown && groupedPaths.length > 0 && groupIndex >= 0) {
					drawCorrectArrows(groupedPaths[groupIndex]);
				}
			}
		}
	};

	return [
		answerShown,
		groupedPaths,
		groupIndex,
		chessground,
		chessboard,
		fen,
		positionData,
		correctCount,
		incorrectCount,
		gameRunning,
		timeRemaining,
		disableNext,
		disablePrev,
		highScore,
		boardWidth,
		button1,
		button2,
		button3,
		button4,
		button5,
		button6,
		chessgroundConfig,
		startTimedGame,
		endGame,
		getMinimumMovesForCurrentPosition,
		processButton,
		incrementGroupIndex,
		decrementGroupIndex,
		clearDrawings,
		chessboard_1_fen_binding,
		chessboard_1_chessground_binding,
		chessboard_1_binding,
		chessboard_1_size_binding,
		click_handler,
		button0_binding,
		click_handler_1,
		button1_1_binding,
		click_handler_2,
		button2_1_binding,
		click_handler_3,
		button3_1_binding,
		click_handler_4,
		button4_1_binding,
		click_handler_5,
		button5_1_binding,
		click_handler_6,
		click_handler_7
	];
}

class KnightMoves extends SvelteComponentDev {
	constructor(options) {
		super(options);
		init(this, options, instance$6, create_fragment$6, safe_not_equal, {}, add_css$1, [-1, -1, -1]);

		dispatch_dev("SvelteRegisterComponent", {
			component: this,
			tagName: "KnightMoves",
			options,
			id: create_fragment$6.name
		});
	}
}

/* svelte/components/Counter.svelte generated by Svelte v4.2.18 */
const file$4 = "svelte/components/Counter.svelte";

// (13:6) {#key number}
function create_key_block(ctx) {
	let div;
	let t;
	let div_intro;

	const block = {
		c: function create() {
			div = element("div");
			t = text(/*number*/ ctx[0]);
			attr_dev(div, "class", "is-size-3 number");
			add_location(div, file$4, 13, 8, 329);
		},
		m: function mount(target, anchor) {
			insert_dev(target, div, anchor);
			append_dev(div, t);
		},
		p: function update(ctx, dirty) {
			if (dirty & /*number*/ 1) set_data_dev(t, /*number*/ ctx[0]);
		},
		i: function intro(local) {
			if (local) {
				if (!div_intro) {
					add_render_callback(() => {
						div_intro = create_in_transition(div, fly, { y: 15, duration: 500, easing: cubicOut });
						div_intro.start();
					});
				}
			}
		},
		o: noop,
		d: function destroy(detaching) {
			if (detaching) {
				detach_dev(div);
			}
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_key_block.name,
		type: "key",
		source: "(13:6) {#key number}",
		ctx
	});

	return block;
}

function create_fragment$5(ctx) {
	let div2;
	let div1;
	let h2;
	let t0;
	let t1;
	let div0;
	let previous_key = /*number*/ ctx[0];
	let key_block = create_key_block(ctx);

	const block = {
		c: function create() {
			div2 = element("div");
			div1 = element("div");
			h2 = element("h2");
			t0 = text(/*title*/ ctx[1]);
			t1 = space();
			div0 = element("div");
			key_block.c();
			attr_dev(h2, "class", "is-size-5");
			add_location(h2, file$4, 10, 4, 231);
			attr_dev(div0, "class", "number-container");
			add_location(div0, file$4, 11, 4, 270);
			attr_dev(div1, "class", "container has-text-centered");
			add_location(div1, file$4, 9, 2, 185);
			attr_dev(div2, "class", "box score-container");
			add_location(div2, file$4, 8, 0, 149);
		},
		l: function claim(nodes) {
			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
		},
		m: function mount(target, anchor) {
			insert_dev(target, div2, anchor);
			append_dev(div2, div1);
			append_dev(div1, h2);
			append_dev(h2, t0);
			append_dev(div1, t1);
			append_dev(div1, div0);
			key_block.m(div0, null);
		},
		p: function update(ctx, [dirty]) {
			if (dirty & /*title*/ 2) set_data_dev(t0, /*title*/ ctx[1]);

			if (dirty & /*number*/ 1 && safe_not_equal(previous_key, previous_key = /*number*/ ctx[0])) {
				group_outros();
				transition_out(key_block, 1, 1, noop);
				check_outros();
				key_block = create_key_block(ctx);
				key_block.c();
				transition_in(key_block, 1);
				key_block.m(div0, null);
			} else {
				key_block.p(ctx, dirty);
			}
		},
		i: function intro(local) {
			transition_in(key_block);
		},
		o: function outro(local) {
			transition_out(key_block);
		},
		d: function destroy(detaching) {
			if (detaching) {
				detach_dev(div2);
			}

			key_block.d(detaching);
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_fragment$5.name,
		type: "component",
		source: "",
		ctx
	});

	return block;
}

function instance$5($$self, $$props, $$invalidate) {
	let { $$slots: slots = {}, $$scope } = $$props;
	validate_slots('Counter', slots, []);
	let { number } = $$props;
	let { title } = $$props;

	$$self.$$.on_mount.push(function () {
		if (number === undefined && !('number' in $$props || $$self.$$.bound[$$self.$$.props['number']])) {
			console.warn("<Counter> was created without expected prop 'number'");
		}

		if (title === undefined && !('title' in $$props || $$self.$$.bound[$$self.$$.props['title']])) {
			console.warn("<Counter> was created without expected prop 'title'");
		}
	});

	const writable_props = ['number', 'title'];

	Object.keys($$props).forEach(key => {
		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Counter> was created with unknown prop '${key}'`);
	});

	$$self.$$set = $$props => {
		if ('number' in $$props) $$invalidate(0, number = $$props.number);
		if ('title' in $$props) $$invalidate(1, title = $$props.title);
	};

	$$self.$capture_state = () => ({ fly, cubicOut, number, title });

	$$self.$inject_state = $$props => {
		if ('number' in $$props) $$invalidate(0, number = $$props.number);
		if ('title' in $$props) $$invalidate(1, title = $$props.title);
	};

	if ($$props && "$$inject" in $$props) {
		$$self.$inject_state($$props.$$inject);
	}

	return [number, title];
}

class Counter extends SvelteComponentDev {
	constructor(options) {
		super(options);
		init(this, options, instance$5, create_fragment$5, safe_not_equal, { number: 0, title: 1 });

		dispatch_dev("SvelteRegisterComponent", {
			component: this,
			tagName: "Counter",
			options,
			id: create_fragment$5.name
		});
	}

	get number() {
		throw new Error("<Counter>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	set number(value) {
		throw new Error("<Counter>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	get title() {
		throw new Error("<Counter>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	set title(value) {
		throw new Error("<Counter>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}
}

/* svelte/components/DisappearingContent.svelte generated by Svelte v4.2.18 */
const file$3 = "svelte/components/DisappearingContent.svelte";

// (22:0) {#if showContent}
function create_if_block$2(ctx) {
	let div;
	let div_transition;
	let current;
	const default_slot_template = /*#slots*/ ctx[4].default;
	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[3], null);

	const block = {
		c: function create() {
			div = element("div");
			if (default_slot) default_slot.c();
			add_location(div, file$3, 22, 2, 332);
		},
		m: function mount(target, anchor) {
			insert_dev(target, div, anchor);

			if (default_slot) {
				default_slot.m(div, null);
			}

			current = true;
		},
		p: function update(ctx, dirty) {
			if (default_slot) {
				if (default_slot.p && (!current || dirty & /*$$scope*/ 8)) {
					update_slot_base(
						default_slot,
						default_slot_template,
						ctx,
						/*$$scope*/ ctx[3],
						!current
						? get_all_dirty_from_scope(/*$$scope*/ ctx[3])
						: get_slot_changes(default_slot_template, /*$$scope*/ ctx[3], dirty, null),
						null
					);
				}
			}
		},
		i: function intro(local) {
			if (current) return;
			transition_in(default_slot, local);

			if (local) {
				add_render_callback(() => {
					if (!current) return;
					if (!div_transition) div_transition = create_bidirectional_transition(div, fade, { duration: 100 }, true);
					div_transition.run(1);
				});
			}

			current = true;
		},
		o: function outro(local) {
			transition_out(default_slot, local);

			if (local) {
				if (!div_transition) div_transition = create_bidirectional_transition(div, fade, { duration: 100 }, false);
				div_transition.run(0);
			}

			current = false;
		},
		d: function destroy(detaching) {
			if (detaching) {
				detach_dev(div);
			}

			if (default_slot) default_slot.d(detaching);
			if (detaching && div_transition) div_transition.end();
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_if_block$2.name,
		type: "if",
		source: "(22:0) {#if showContent}",
		ctx
	});

	return block;
}

function create_fragment$4(ctx) {
	let if_block_anchor;
	let current;
	let if_block = /*showContent*/ ctx[0] && create_if_block$2(ctx);

	const block = {
		c: function create() {
			if (if_block) if_block.c();
			if_block_anchor = empty();
		},
		l: function claim(nodes) {
			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
		},
		m: function mount(target, anchor) {
			if (if_block) if_block.m(target, anchor);
			insert_dev(target, if_block_anchor, anchor);
			current = true;
		},
		p: function update(ctx, [dirty]) {
			if (/*showContent*/ ctx[0]) {
				if (if_block) {
					if_block.p(ctx, dirty);

					if (dirty & /*showContent*/ 1) {
						transition_in(if_block, 1);
					}
				} else {
					if_block = create_if_block$2(ctx);
					if_block.c();
					transition_in(if_block, 1);
					if_block.m(if_block_anchor.parentNode, if_block_anchor);
				}
			} else if (if_block) {
				group_outros();

				transition_out(if_block, 1, 1, () => {
					if_block = null;
				});

				check_outros();
			}
		},
		i: function intro(local) {
			if (current) return;
			transition_in(if_block);
			current = true;
		},
		o: function outro(local) {
			transition_out(if_block);
			current = false;
		},
		d: function destroy(detaching) {
			if (detaching) {
				detach_dev(if_block_anchor);
			}

			if (if_block) if_block.d(detaching);
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_fragment$4.name,
		type: "component",
		source: "",
		ctx
	});

	return block;
}

function instance$4($$self, $$props, $$invalidate) {
	let { $$slots: slots = {}, $$scope } = $$props;
	validate_slots('DisappearingContent', slots, ['default']);
	let { duration = 1000 } = $$props;
	let { key } = $$props;
	let showContent = true;

	$$self.$$.on_mount.push(function () {
		if (key === undefined && !('key' in $$props || $$self.$$.bound[$$self.$$.props['key']])) {
			console.warn("<DisappearingContent> was created without expected prop 'key'");
		}
	});

	const writable_props = ['duration', 'key'];

	Object.keys($$props).forEach(key => {
		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<DisappearingContent> was created with unknown prop '${key}'`);
	});

	$$self.$$set = $$props => {
		if ('duration' in $$props) $$invalidate(1, duration = $$props.duration);
		if ('key' in $$props) $$invalidate(2, key = $$props.key);
		if ('$$scope' in $$props) $$invalidate(3, $$scope = $$props.$$scope);
	};

	$$self.$capture_state = () => ({ fade, duration, key, showContent });

	$$self.$inject_state = $$props => {
		if ('duration' in $$props) $$invalidate(1, duration = $$props.duration);
		if ('key' in $$props) $$invalidate(2, key = $$props.key);
		if ('showContent' in $$props) $$invalidate(0, showContent = $$props.showContent);
	};

	if ($$props && "$$inject" in $$props) {
		$$self.$inject_state($$props.$$inject);
	}

	$$self.$$.update = () => {
		if ($$self.$$.dirty & /*key*/ 4) {
			{
				if (key) {
					$$invalidate(0, showContent = true);
				}
			}
		}

		if ($$self.$$.dirty & /*showContent, duration*/ 3) {
			{
				if (showContent) {
					setTimeout(
						() => {
							$$invalidate(0, showContent = false);
						},
						duration
					);
				}
			}
		}
	};

	return [showContent, duration, key, $$scope, slots];
}

class DisappearingContent extends SvelteComponentDev {
	constructor(options) {
		super(options);
		init(this, options, instance$4, create_fragment$4, safe_not_equal, { duration: 1, key: 2 });

		dispatch_dev("SvelteRegisterComponent", {
			component: this,
			tagName: "DisappearingContent",
			options,
			id: create_fragment$4.name
		});
	}

	get duration() {
		throw new Error("<DisappearingContent>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	set duration(value) {
		throw new Error("<DisappearingContent>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	get key() {
		throw new Error("<DisappearingContent>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}

	set key(value) {
		throw new Error("<DisappearingContent>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
	}
}

/* svelte/NotationTrainer.svelte generated by Svelte v4.2.18 */
const file$2 = "svelte/NotationTrainer.svelte";

// (172:8) <DisappearingContent key={nextMove} slot="centered-content">
function create_default_slot(ctx) {
	let span;
	let t;
	let span_class_value;

	const block = {
		c: function create() {
			span = element("span");
			t = text(/*nextMove*/ ctx[3]);
			attr_dev(span, "class", span_class_value = "tag is-size-3 is-" + /*colorToMove*/ ctx[4]);
			add_location(span, file$2, 172, 10, 4314);
		},
		m: function mount(target, anchor) {
			insert_dev(target, span, anchor);
			append_dev(span, t);
		},
		p: function update(ctx, dirty) {
			if (dirty[0] & /*nextMove*/ 8) set_data_dev(t, /*nextMove*/ ctx[3]);

			if (dirty[0] & /*colorToMove*/ 16 && span_class_value !== (span_class_value = "tag is-size-3 is-" + /*colorToMove*/ ctx[4])) {
				attr_dev(span, "class", span_class_value);
			}
		},
		d: function destroy(detaching) {
			if (detaching) {
				detach_dev(span);
			}
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_default_slot.name,
		type: "slot",
		source: "(172:8) <DisappearingContent key={nextMove} slot=\\\"centered-content\\\">",
		ctx
	});

	return block;
}

// (172:8) 
function create_centered_content_slot(ctx) {
	let disappearingcontent;
	let current;

	disappearingcontent = new DisappearingContent({
			props: {
				key: /*nextMove*/ ctx[3],
				slot: "centered-content",
				$$slots: { default: [create_default_slot] },
				$$scope: { ctx }
			},
			$$inline: true
		});

	const block = {
		c: function create() {
			create_component(disappearingcontent.$$.fragment);
		},
		m: function mount(target, anchor) {
			mount_component(disappearingcontent, target, anchor);
			current = true;
		},
		p: function update(ctx, dirty) {
			const disappearingcontent_changes = {};
			if (dirty[0] & /*nextMove*/ 8) disappearingcontent_changes.key = /*nextMove*/ ctx[3];

			if (dirty[0] & /*colorToMove, nextMove*/ 24 | dirty[1] & /*$$scope*/ 1) {
				disappearingcontent_changes.$$scope = { dirty, ctx };
			}

			disappearingcontent.$set(disappearingcontent_changes);
		},
		i: function intro(local) {
			if (current) return;
			transition_in(disappearingcontent.$$.fragment, local);
			current = true;
		},
		o: function outro(local) {
			transition_out(disappearingcontent.$$.fragment, local);
			current = false;
		},
		d: function destroy(detaching) {
			destroy_component(disappearingcontent, detaching);
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_centered_content_slot.name,
		type: "slot",
		source: "(172:8) ",
		ctx
	});

	return block;
}

// (186:6) {#if !gameRunning}
function create_if_block_2(ctx) {
	let button;
	let mounted;
	let dispose;

	const block = {
		c: function create() {
			button = element("button");
			button.textContent = "Start Game";
			attr_dev(button, "class", "button is-primary");
			add_location(button, file$2, 186, 8, 4690);
		},
		m: function mount(target, anchor) {
			insert_dev(target, button, anchor);

			if (!mounted) {
				dispose = listen_dev(button, "click", /*startGame*/ ctx[19], false, false, false, false);
				mounted = true;
			}
		},
		p: noop,
		d: function destroy(detaching) {
			if (detaching) {
				detach_dev(button);
			}

			mounted = false;
			dispose();
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_if_block_2.name,
		type: "if",
		source: "(186:6) {#if !gameRunning}",
		ctx
	});

	return block;
}

// (191:6) {#if !gameRunning}
function create_if_block_1(ctx) {
	let button;
	let t0;
	let t1;
	let button_class_value;
	let mounted;
	let dispose;

	const block = {
		c: function create() {
			button = element("button");
			t0 = text("Play ");
			t1 = text(/*otherColor*/ ctx[5]);
			attr_dev(button, "class", button_class_value = "button is-" + /*otherColor*/ ctx[5] + " change-orientation-button ml-3");
			add_location(button, file$2, 191, 8, 4830);
		},
		m: function mount(target, anchor) {
			insert_dev(target, button, anchor);
			append_dev(button, t0);
			append_dev(button, t1);

			if (!mounted) {
				dispose = listen_dev(button, "click", /*click_handler*/ ctx[24], false, false, false, false);
				mounted = true;
			}
		},
		p: function update(ctx, dirty) {
			if (dirty[0] & /*otherColor*/ 32) set_data_dev(t1, /*otherColor*/ ctx[5]);

			if (dirty[0] & /*otherColor*/ 32 && button_class_value !== (button_class_value = "button is-" + /*otherColor*/ ctx[5] + " change-orientation-button ml-3")) {
				attr_dev(button, "class", button_class_value);
			}
		},
		d: function destroy(detaching) {
			if (detaching) {
				detach_dev(button);
			}

			mounted = false;
			dispose();
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_if_block_1.name,
		type: "if",
		source: "(191:6) {#if !gameRunning}",
		ctx
	});

	return block;
}

// (202:4) {#if gameRunning}
function create_if_block$1(ctx) {
	let progresstimer;
	let current;

	progresstimer = new ProgressTimer({
			props: {
				max: /*maxTime*/ ctx[10],
				width: /*boardSize*/ ctx[6]
			},
			$$inline: true
		});

	progresstimer.$on("complete", /*endGame*/ ctx[20]);

	const block = {
		c: function create() {
			create_component(progresstimer.$$.fragment);
		},
		m: function mount(target, anchor) {
			mount_component(progresstimer, target, anchor);
			current = true;
		},
		p: function update(ctx, dirty) {
			const progresstimer_changes = {};
			if (dirty[0] & /*maxTime*/ 1024) progresstimer_changes.max = /*maxTime*/ ctx[10];
			if (dirty[0] & /*boardSize*/ 64) progresstimer_changes.width = /*boardSize*/ ctx[6];
			progresstimer.$set(progresstimer_changes);
		},
		i: function intro(local) {
			if (current) return;
			transition_in(progresstimer.$$.fragment, local);
			current = true;
		},
		o: function outro(local) {
			transition_out(progresstimer.$$.fragment, local);
			current = false;
		},
		d: function destroy(detaching) {
			destroy_component(progresstimer, detaching);
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_if_block$1.name,
		type: "if",
		source: "(202:4) {#if gameRunning}",
		ctx
	});

	return block;
}

function create_fragment$3(ctx) {
	let div5;
	let div2;
	let div0;
	let chessboard;
	let updating_fen;
	let updating_chessground;
	let updating_size;
	let t0;
	let div1;
	let span;
	let t1;
	let span_class_value;
	let t2;
	let t3;
	let t4;
	let t5;
	let div4;
	let div3;
	let counter0;
	let t6;
	let counter1;
	let t7;
	let counter2;
	let t8;
	let counter3;
	let current;

	function chessboard_fen_binding(value) {
		/*chessboard_fen_binding*/ ctx[21](value);
	}

	function chessboard_chessground_binding(value) {
		/*chessboard_chessground_binding*/ ctx[22](value);
	}

	function chessboard_size_binding(value) {
		/*chessboard_size_binding*/ ctx[23](value);
	}

	let chessboard_props = {
		chessgroundConfig: /*chessgroundConfig*/ ctx[16],
		orientation: /*$orientation*/ ctx[0],
		$$slots: {
			"centered-content": [create_centered_content_slot]
		},
		$$scope: { ctx }
	};

	if (/*fen*/ ctx[8] !== void 0) {
		chessboard_props.fen = /*fen*/ ctx[8];
	}

	if (/*chessground*/ ctx[7] !== void 0) {
		chessboard_props.chessground = /*chessground*/ ctx[7];
	}

	if (/*boardSize*/ ctx[6] !== void 0) {
		chessboard_props.size = /*boardSize*/ ctx[6];
	}

	chessboard = new Chessboard({ props: chessboard_props, $$inline: true });
	binding_callbacks.push(() => bind(chessboard, 'fen', chessboard_fen_binding));
	binding_callbacks.push(() => bind(chessboard, 'chessground', chessboard_chessground_binding));
	binding_callbacks.push(() => bind(chessboard, 'size', chessboard_size_binding));
	chessboard.$on("move", /*handleUserMove*/ ctx[17]);
	let if_block0 = !/*gameRunning*/ ctx[9] && create_if_block_2(ctx);
	let if_block1 = !/*gameRunning*/ ctx[9] && create_if_block_1(ctx);
	let if_block2 = /*gameRunning*/ ctx[9] && create_if_block$1(ctx);

	counter0 = new Counter({
			props: {
				number: /*correctCount*/ ctx[1],
				title: "Correct"
			},
			$$inline: true
		});

	counter1 = new Counter({
			props: {
				number: /*incorrectCount*/ ctx[2],
				title: "Incorrect"
			},
			$$inline: true
		});

	counter2 = new Counter({
			props: {
				number: /*$highScoreWhite*/ ctx[12],
				title: "High Score (white)"
			},
			$$inline: true
		});

	counter3 = new Counter({
			props: {
				number: /*$highScoreBlack*/ ctx[11],
				title: "High Score (black)"
			},
			$$inline: true
		});

	const block = {
		c: function create() {
			div5 = element("div");
			div2 = element("div");
			div0 = element("div");
			create_component(chessboard.$$.fragment);
			t0 = space();
			div1 = element("div");
			span = element("span");
			t1 = text(/*nextMove*/ ctx[3]);
			t2 = space();
			if (if_block0) if_block0.c();
			t3 = space();
			if (if_block1) if_block1.c();
			t4 = space();
			if (if_block2) if_block2.c();
			t5 = space();
			div4 = element("div");
			div3 = element("div");
			create_component(counter0.$$.fragment);
			t6 = space();
			create_component(counter1.$$.fragment);
			t7 = space();
			create_component(counter2.$$.fragment);
			t8 = space();
			create_component(counter3.$$.fragment);
			attr_dev(div0, "class", "block");
			add_location(div0, file$2, 162, 4, 4021);
			attr_dev(span, "class", span_class_value = "tag is-size-3 is-" + /*colorToMove*/ ctx[4] + " mr-3");
			add_location(span, file$2, 182, 6, 4573);
			attr_dev(div1, "class", "block is-flex is-justify-content-center");
			set_style(div1, "width", /*boardSize*/ ctx[6] + "px");
			add_location(div1, file$2, 178, 4, 4467);
			attr_dev(div2, "class", "column is-6-desktop");
			add_location(div2, file$2, 161, 2, 3983);
			attr_dev(div3, "class", "block");
			add_location(div3, file$2, 207, 4, 5269);
			attr_dev(div4, "class", "column is-2-desktop");
			add_location(div4, file$2, 206, 2, 5231);
			attr_dev(div5, "class", "columns is-centered");
			add_location(div5, file$2, 160, 0, 3947);
		},
		l: function claim(nodes) {
			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
		},
		m: function mount(target, anchor) {
			insert_dev(target, div5, anchor);
			append_dev(div5, div2);
			append_dev(div2, div0);
			mount_component(chessboard, div0, null);
			append_dev(div2, t0);
			append_dev(div2, div1);
			append_dev(div1, span);
			append_dev(span, t1);
			append_dev(div1, t2);
			if (if_block0) if_block0.m(div1, null);
			append_dev(div1, t3);
			if (if_block1) if_block1.m(div1, null);
			append_dev(div2, t4);
			if (if_block2) if_block2.m(div2, null);
			append_dev(div5, t5);
			append_dev(div5, div4);
			append_dev(div4, div3);
			mount_component(counter0, div3, null);
			append_dev(div3, t6);
			mount_component(counter1, div3, null);
			append_dev(div3, t7);
			mount_component(counter2, div3, null);
			append_dev(div3, t8);
			mount_component(counter3, div3, null);
			current = true;
		},
		p: function update(ctx, dirty) {
			const chessboard_changes = {};
			if (dirty[0] & /*$orientation*/ 1) chessboard_changes.orientation = /*$orientation*/ ctx[0];

			if (dirty[0] & /*nextMove, colorToMove*/ 24 | dirty[1] & /*$$scope*/ 1) {
				chessboard_changes.$$scope = { dirty, ctx };
			}

			if (!updating_fen && dirty[0] & /*fen*/ 256) {
				updating_fen = true;
				chessboard_changes.fen = /*fen*/ ctx[8];
				add_flush_callback(() => updating_fen = false);
			}

			if (!updating_chessground && dirty[0] & /*chessground*/ 128) {
				updating_chessground = true;
				chessboard_changes.chessground = /*chessground*/ ctx[7];
				add_flush_callback(() => updating_chessground = false);
			}

			if (!updating_size && dirty[0] & /*boardSize*/ 64) {
				updating_size = true;
				chessboard_changes.size = /*boardSize*/ ctx[6];
				add_flush_callback(() => updating_size = false);
			}

			chessboard.$set(chessboard_changes);
			if (!current || dirty[0] & /*nextMove*/ 8) set_data_dev(t1, /*nextMove*/ ctx[3]);

			if (!current || dirty[0] & /*colorToMove*/ 16 && span_class_value !== (span_class_value = "tag is-size-3 is-" + /*colorToMove*/ ctx[4] + " mr-3")) {
				attr_dev(span, "class", span_class_value);
			}

			if (!/*gameRunning*/ ctx[9]) {
				if (if_block0) {
					if_block0.p(ctx, dirty);
				} else {
					if_block0 = create_if_block_2(ctx);
					if_block0.c();
					if_block0.m(div1, t3);
				}
			} else if (if_block0) {
				if_block0.d(1);
				if_block0 = null;
			}

			if (!/*gameRunning*/ ctx[9]) {
				if (if_block1) {
					if_block1.p(ctx, dirty);
				} else {
					if_block1 = create_if_block_1(ctx);
					if_block1.c();
					if_block1.m(div1, null);
				}
			} else if (if_block1) {
				if_block1.d(1);
				if_block1 = null;
			}

			if (!current || dirty[0] & /*boardSize*/ 64) {
				set_style(div1, "width", /*boardSize*/ ctx[6] + "px");
			}

			if (/*gameRunning*/ ctx[9]) {
				if (if_block2) {
					if_block2.p(ctx, dirty);

					if (dirty[0] & /*gameRunning*/ 512) {
						transition_in(if_block2, 1);
					}
				} else {
					if_block2 = create_if_block$1(ctx);
					if_block2.c();
					transition_in(if_block2, 1);
					if_block2.m(div2, null);
				}
			} else if (if_block2) {
				group_outros();

				transition_out(if_block2, 1, 1, () => {
					if_block2 = null;
				});

				check_outros();
			}

			const counter0_changes = {};
			if (dirty[0] & /*correctCount*/ 2) counter0_changes.number = /*correctCount*/ ctx[1];
			counter0.$set(counter0_changes);
			const counter1_changes = {};
			if (dirty[0] & /*incorrectCount*/ 4) counter1_changes.number = /*incorrectCount*/ ctx[2];
			counter1.$set(counter1_changes);
			const counter2_changes = {};
			if (dirty[0] & /*$highScoreWhite*/ 4096) counter2_changes.number = /*$highScoreWhite*/ ctx[12];
			counter2.$set(counter2_changes);
			const counter3_changes = {};
			if (dirty[0] & /*$highScoreBlack*/ 2048) counter3_changes.number = /*$highScoreBlack*/ ctx[11];
			counter3.$set(counter3_changes);
		},
		i: function intro(local) {
			if (current) return;
			transition_in(chessboard.$$.fragment, local);
			transition_in(if_block2);
			transition_in(counter0.$$.fragment, local);
			transition_in(counter1.$$.fragment, local);
			transition_in(counter2.$$.fragment, local);
			transition_in(counter3.$$.fragment, local);
			current = true;
		},
		o: function outro(local) {
			transition_out(chessboard.$$.fragment, local);
			transition_out(if_block2);
			transition_out(counter0.$$.fragment, local);
			transition_out(counter1.$$.fragment, local);
			transition_out(counter2.$$.fragment, local);
			transition_out(counter3.$$.fragment, local);
			current = false;
		},
		d: function destroy(detaching) {
			if (detaching) {
				detach_dev(div5);
			}

			destroy_component(chessboard);
			if (if_block0) if_block0.d();
			if (if_block1) if_block1.d();
			if (if_block2) if_block2.d();
			destroy_component(counter0);
			destroy_component(counter1);
			destroy_component(counter2);
			destroy_component(counter3);
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_fragment$3.name,
		type: "component",
		source: "",
		ctx
	});

	return block;
}

function whoseMoveIsIt(ply) {
	return ply % 2 === 0 ? "white" : "black";
}

function instance$3($$self, $$props, $$invalidate) {
	let $highScoreBlack;
	let $highScoreWhite;
	let $orientation;
	let { $$slots: slots = {}, $$scope } = $$props;
	validate_slots('NotationTrainer', slots, []);
	const orientation = persisted("notation.orientation", "white");
	validate_store(orientation, 'orientation');
	component_subscribe($$self, orientation, value => $$invalidate(0, $orientation = value));
	const highScoreBlack = persisted("notation.highScoreBlack", 0);
	validate_store(highScoreBlack, 'highScoreBlack');
	component_subscribe($$self, highScoreBlack, value => $$invalidate(11, $highScoreBlack = value));
	const highScoreWhite = persisted("notation.highScoreWhite", 0);
	validate_store(highScoreWhite, 'highScoreWhite');
	component_subscribe($$self, highScoreWhite, value => $$invalidate(12, $highScoreWhite = value));
	let correctCount = 0;
	let incorrectCount = 0;
	let nextMove;
	let colorToMove;
	let otherColor = Util.otherColor($orientation);
	let positionShownAt;

	class Answer {
		constructor(givenAnswer, correctAnswer, timeToAnswer, orientation) {
			this.givenAnswer = givenAnswer;
			this.correctAnswer = correctAnswer;
			this.timeToAnswer = timeToAnswer;
			this.orientation = orientation;
		}

		isCorrect() {
			return this.givenAnswer === this.correctAnswer;
		}
	}

	/** @type {Answer[]} */
	let answers = [];

	let chessgroundConfig = {
		fen: "8/8/8/8/8/8/8/8",
		coordinates: false,
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
		orientation: $orientation
	};

	let boardSize;
	let chessground;
	let fen;

	// Game stuff
	let gameRunning = false;

	let maxTime = 0;
	let correctBonus = 0;
	let incorrectPenalty = 10;

	function handleUserMove(moveEvent) {
		const move = moveEvent.detail.move;
		handleAnswer(move.san, nextMove);
	}

	function newPosition() {
		const previousMove = nextMove;
		const game = getRandomGame();
		const chess = new Chess();
		chess.loadPgn(game.pgn);
		const history = chess.history({ verbose: true });
		const moveCount = history.length;
		const random = Util.getRandomIntBetween(1, moveCount - 1);
		const candidateMove = history[random].san;

		if (candidateMove.includes("=") || // no promotions
		candidateMove === previousMove || // do not repeat moves
		whoseMoveIsIt(random) !== $orientation || // only show moves for current view
		["O-O", "O-O-O"].includes(candidateMove)) {
			return newPosition(); // no castles
		}

		$$invalidate(8, fen = history[random - 1].after);
		$$invalidate(3, nextMove = candidateMove);
		$$invalidate(4, colorToMove = whoseMoveIsIt(random));
		positionShownAt = new Date().getTime();
	}

	function handleAnswer(userSan, answerSan) {
		const isCorrect = userSan === answerSan;
		correctBonus = correctBonus * 0.98;
		let timeToAnswer = new Date().getTime() - positionShownAt;
		answers = [...answers, new Answer(userSan, answerSan, timeToAnswer, $orientation)];

		if (isCorrect) {
			$$invalidate(10, maxTime += correctBonus);
			$$invalidate(1, correctCount++, correctCount);
		} else {
			$$invalidate(10, maxTime -= incorrectPenalty);
			$$invalidate(2, incorrectCount++, incorrectCount);
		}

		newPosition();
	}

	function startGame() {
		answers = [];
		$$invalidate(9, gameRunning = true);
		$$invalidate(10, maxTime = 30);
		$$invalidate(1, correctCount = 0);
		$$invalidate(2, incorrectCount = 0);
		correctBonus = 2.75;
		newPosition();
	}

	function endGame() {
		$$invalidate(9, gameRunning = false);

		if ($orientation === "white") {
			if (correctCount > $highScoreWhite) {
				highScoreWhite.set(correctCount);
			}
		} else {
			if (correctCount > $highScoreBlack) {
				highScoreBlack.set(correctCount);
			}
		}
	}

	onMount(() => {
		newPosition();
	});

	const writable_props = [];

	Object.keys($$props).forEach(key => {
		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<NotationTrainer> was created with unknown prop '${key}'`);
	});

	function chessboard_fen_binding(value) {
		fen = value;
		$$invalidate(8, fen);
	}

	function chessboard_chessground_binding(value) {
		chessground = value;
		$$invalidate(7, chessground);
	}

	function chessboard_size_binding(value) {
		boardSize = value;
		$$invalidate(6, boardSize);
	}

	const click_handler = () => {
		orientation.set(otherColor);
		newPosition();
	};

	$$self.$capture_state = () => ({
		onMount,
		Chessboard,
		Util,
		getRandomGame,
		persisted,
		ProgressTimer,
		Counter,
		DisappearingContent,
		Chess,
		orientation,
		highScoreBlack,
		highScoreWhite,
		correctCount,
		incorrectCount,
		nextMove,
		colorToMove,
		otherColor,
		positionShownAt,
		Answer,
		answers,
		chessgroundConfig,
		boardSize,
		chessground,
		fen,
		gameRunning,
		maxTime,
		correctBonus,
		incorrectPenalty,
		handleUserMove,
		newPosition,
		whoseMoveIsIt,
		handleAnswer,
		startGame,
		endGame,
		$highScoreBlack,
		$highScoreWhite,
		$orientation
	});

	$$self.$inject_state = $$props => {
		if ('correctCount' in $$props) $$invalidate(1, correctCount = $$props.correctCount);
		if ('incorrectCount' in $$props) $$invalidate(2, incorrectCount = $$props.incorrectCount);
		if ('nextMove' in $$props) $$invalidate(3, nextMove = $$props.nextMove);
		if ('colorToMove' in $$props) $$invalidate(4, colorToMove = $$props.colorToMove);
		if ('otherColor' in $$props) $$invalidate(5, otherColor = $$props.otherColor);
		if ('positionShownAt' in $$props) positionShownAt = $$props.positionShownAt;
		if ('answers' in $$props) answers = $$props.answers;
		if ('chessgroundConfig' in $$props) $$invalidate(16, chessgroundConfig = $$props.chessgroundConfig);
		if ('boardSize' in $$props) $$invalidate(6, boardSize = $$props.boardSize);
		if ('chessground' in $$props) $$invalidate(7, chessground = $$props.chessground);
		if ('fen' in $$props) $$invalidate(8, fen = $$props.fen);
		if ('gameRunning' in $$props) $$invalidate(9, gameRunning = $$props.gameRunning);
		if ('maxTime' in $$props) $$invalidate(10, maxTime = $$props.maxTime);
		if ('correctBonus' in $$props) correctBonus = $$props.correctBonus;
		if ('incorrectPenalty' in $$props) incorrectPenalty = $$props.incorrectPenalty;
	};

	if ($$props && "$$inject" in $$props) {
		$$self.$inject_state($$props.$$inject);
	}

	$$self.$$.update = () => {
		if ($$self.$$.dirty[0] & /*$orientation*/ 1) {
			{
				$$invalidate(5, otherColor = Util.otherColor($orientation));
			}
		}
	};

	return [
		$orientation,
		correctCount,
		incorrectCount,
		nextMove,
		colorToMove,
		otherColor,
		boardSize,
		chessground,
		fen,
		gameRunning,
		maxTime,
		$highScoreBlack,
		$highScoreWhite,
		orientation,
		highScoreBlack,
		highScoreWhite,
		chessgroundConfig,
		handleUserMove,
		newPosition,
		startGame,
		endGame,
		chessboard_fen_binding,
		chessboard_chessground_binding,
		chessboard_size_binding,
		click_handler
	];
}

class NotationTrainer extends SvelteComponentDev {
	constructor(options) {
		super(options);
		init(this, options, instance$3, create_fragment$3, safe_not_equal, {}, null, [-1, -1]);

		dispatch_dev("SvelteRegisterComponent", {
			component: this,
			tagName: "NotationTrainer",
			options,
			id: create_fragment$3.name
		});
	}
}

/* svelte/ThemeSwitcher.svelte generated by Svelte v4.2.18 */
const file$1 = "svelte/ThemeSwitcher.svelte";

function add_css(target) {
	append_styles(target, "svelte-x6infa", "svg.svelte-x6infa{position:absolute}\n/*# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiVGhlbWVTd2l0Y2hlci5zdmVsdGUiLCJzb3VyY2VzIjpbIlRoZW1lU3dpdGNoZXIuc3ZlbHRlIl0sInNvdXJjZXNDb250ZW50IjpbIjxzY3JpcHQ+XG4gIGltcG9ydCBDb25maWcgZnJvbSBcInNyYy9sb2NhbF9jb25maWdcIjtcbiAgaW1wb3J0IHsgYmx1ciB9IGZyb20gXCJzdmVsdGUvdHJhbnNpdGlvblwiO1xuICBpbXBvcnQgeyBib2FyZFN0eWxlIH0gZnJvbSBcIi4vc3RvcmVzXCI7XG4gIGltcG9ydCB7IG9uTW91bnQgfSBmcm9tIFwic3ZlbHRlXCI7XG5cbiAgY29uc3QgY29uZmlnID0gbmV3IENvbmZpZygpO1xuICBjb25zdCB0aGVtZU9wdGlvbiA9IGNvbmZpZy5nZXRDb25maWdPcHRpb24oXCJ0aGVtZVwiLCBcImRhcmtcIik7XG4gIHRoZW1lT3B0aW9uLnNldEFsbG93ZWRWYWx1ZXMoXCJsaWdodFwiLCBcImRhcmtcIik7XG5cbiAgbGV0IHRoZW1lID0gdGhlbWVPcHRpb24uZ2V0VmFsdWUoKTtcblxuICBsZXQgb3RoZXJUaGVtZSA9IHRoZW1lID09PSBcImRhcmtcIiA/IFwibGlnaHRcIiA6IFwiZGFya1wiO1xuXG4gICQ6IHtcbiAgICBvdGhlclRoZW1lID0gdGhlbWUgPT09IFwiZGFya1wiID8gXCJsaWdodFwiIDogXCJkYXJrXCI7XG4gIH1cblxuICAkOiB7XG4gICAgY29uc3Qgb3JpZ2luYWxUcmFuc2l0aW9uID0gZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LnN0eWxlLnRyYW5zaXRpb247XG4gICAgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LnN0eWxlLnRyYW5zaXRpb24gPSBcImFsbCAwLjVzIGVhc2VcIjtcbiAgICBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuY2xhc3NMaXN0LmFkZCh0aGVtZSk7XG4gICAgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LmRhdGFzZXQudGhlbWUgPSB0aGVtZTtcbiAgICB0aGVtZU9wdGlvbi5zZXRWYWx1ZSh0aGVtZSk7XG4gICAgaWYgKHRoZW1lID09PSBcImxpZ2h0XCIpIHtcbiAgICAgIGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5jbGFzc0xpc3QucmVtb3ZlKFwiZGFya1wiKTtcbiAgICB9IGVsc2Uge1xuICAgICAgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LmNsYXNzTGlzdC5yZW1vdmUoXCJsaWdodFwiKTtcbiAgICB9XG4gICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuc3R5bGUudHJhbnNpdGlvbiA9IG9yaWdpbmFsVHJhbnNpdGlvbjtcbiAgICB9LCA1MDApO1xuICB9XG5cbiAgb25Nb3VudCgoKSA9PiB7XG4gICAgZG9jdW1lbnQuYm9keS5kYXRhc2V0LmJvYXJkID0gJGJvYXJkU3R5bGU7XG4gIH0pO1xuPC9zY3JpcHQ+XG5cbjxkaXY+XG4gIDxidXR0b25cbiAgICBjbGFzcz1cImljb25cIlxuICAgIHRpdGxlPVwiU3dpdGNoIHRvIHtvdGhlclRoZW1lfSBtb2RlXCJcbiAgICBvbjpjbGljaz17KCkgPT4ge1xuICAgICAgdGhlbWUgPSBvdGhlclRoZW1lO1xuICAgIH19XG4gID5cbiAgICB7I2lmIHRoZW1lID09PSBcImxpZ2h0XCJ9XG4gICAgICA8IS0tIE1vb24gLS0+XG4gICAgICA8c3ZnXG4gICAgICAgIHRyYW5zaXRpb246Ymx1clxuICAgICAgICBzdHlsZT1cImZpbGw6IHZhcigtLWJ1bG1hLWxpbmspXCJcbiAgICAgICAgeG1sbnM9XCJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2Z1wiXG4gICAgICAgIHZpZXdCb3g9XCIwIDAgMzg0IDUxMlwiXG4gICAgICA+XG4gICAgICAgIDxwYXRoXG4gICAgICAgICAgZD1cIk0yMjMuNSAzMkMxMDAgMzIgMCAxMzIuMyAwIDI1NlMxMDAgNDgwIDIyMy41IDQ4MGM2MC42IDAgMTE1LjUtMjQuMiAxNTUuOC02My40YzUtNC45IDYuMy0xMi41IDMuMS0xOC43cy0xMC4xLTkuNy0xNy04LjVjLTkuOCAxLjctMTkuOCAyLjYtMzAuMSAyLjZjLTk2LjkgMC0xNzUuNS03OC44LTE3NS41LTE3NmMwLTY1LjggMzYtMTIzLjEgODkuMy0xNTMuM2M2LjEtMy41IDkuMi0xMC41IDcuNy0xNy4zcy03LjMtMTEuOS0xNC4zLTEyLjVjLTYuMy0uNS0xMi42LS44LTE5LS44elwiXG4gICAgICAgIC8+XG4gICAgICA8L3N2Zz5cbiAgICB7OmVsc2V9XG4gICAgICA8IS0tIFN1biAtLT5cbiAgICAgIDxzdmdcbiAgICAgICAgdHJhbnNpdGlvbjpibHVyXG4gICAgICAgIHN0eWxlPVwiZmlsbDogdmFyKC0tYnVsbWEtd2FybmluZylcIlxuICAgICAgICB4bWxucz1cImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXCJcbiAgICAgICAgdmlld0JveD1cIjAgMCA1MTIgNTEyXCJcbiAgICAgID5cbiAgICAgICAgPHBhdGhcbiAgICAgICAgICBkPVwiTTM3NS43IDE5LjdjLTEuNS04LTYuOS0xNC43LTE0LjQtMTcuOHMtMTYuMS0yLjItMjIuOCAyLjRMMjU2IDYxLjEgMTczLjUgNC4yYy02LjctNC42LTE1LjMtNS41LTIyLjgtMi40cy0xMi45IDkuOC0xNC40IDE3LjhsLTE4LjEgOTguNUwxOS43IDEzNi4zYy04IDEuNS0xNC43IDYuOS0xNy44IDE0LjRzLTIuMiAxNi4xIDIuNCAyMi44TDYxLjEgMjU2IDQuMiAzMzguNWMtNC42IDYuNy01LjUgMTUuMy0yLjQgMjIuOHM5LjggMTMgMTcuOCAxNC40bDk4LjUgMTguMSAxOC4xIDk4LjVjMS41IDggNi45IDE0LjcgMTQuNCAxNy44czE2LjEgMi4yIDIyLjgtMi40TDI1NiA0NTAuOWw4Mi41IDU2LjljNi43IDQuNiAxNS4zIDUuNSAyMi44IDIuNHMxMi45LTkuOCAxNC40LTE3LjhsMTguMS05OC41IDk4LjUtMTguMWM4LTEuNSAxNC43LTYuOSAxNy44LTE0LjRzMi4yLTE2LjEtMi40LTIyLjhMNDUwLjkgMjU2bDU2LjktODIuNWM0LjYtNi43IDUuNS0xNS4zIDIuNC0yMi44cy05LjgtMTIuOS0xNy44LTE0LjRsLTk4LjUtMTguMUwzNzUuNyAxOS43ek0yNjkuNiAxMTBsNjUuNi00NS4yIDE0LjQgNzguM2MxLjggOS44IDkuNSAxNy41IDE5LjMgMTkuM2w3OC4zIDE0LjRMNDAyIDI0Mi40Yy01LjcgOC4yLTUuNyAxOSAwIDI3LjJsNDUuMiA2NS42LTc4LjMgMTQuNGMtOS44IDEuOC0xNy41IDkuNS0xOS4zIDE5LjNsLTE0LjQgNzguM0wyNjkuNiA0MDJjLTguMi01LjctMTktNS43LTI3LjIgMGwtNjUuNiA0NS4yLTE0LjQtNzguM2MtMS44LTkuOC05LjUtMTcuNS0xOS4zLTE5LjNMNjQuOCAzMzUuMiAxMTAgMjY5LjZjNS43LTguMiA1LjctMTkgMC0yNy4yTDY0LjggMTc2LjhsNzguMy0xNC40YzkuOC0xLjggMTcuNS05LjUgMTkuMy0xOS4zbDE0LjQtNzguM0wyNDIuNCAxMTBjOC4yIDUuNyAxOSA1LjcgMjcuMiAwek0yNTYgMzY4YTExMiAxMTIgMCAxIDAgMC0yMjQgMTEyIDExMiAwIDEgMCAwIDIyNHpNMTkyIDI1NmE2NCA2NCAwIDEgMSAxMjggMCA2NCA2NCAwIDEgMSAtMTI4IDB6XCJcbiAgICAgICAgLz5cbiAgICAgIDwvc3ZnPlxuICAgIHsvaWZ9XG4gIDwvYnV0dG9uPlxuPC9kaXY+XG5cbjxzdHlsZT5cbiAgc3ZnIHtcbiAgICBwb3NpdGlvbjogYWJzb2x1dGU7XG4gIH1cbjwvc3R5bGU+XG4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBNEVFLGlCQUFJLENBQ0YsUUFBUSxDQUFFLFFBQ1oifQ== */");
}

// (60:4) {:else}
function create_else_block(ctx) {
	let svg;
	let path;
	let svg_transition;
	let current;

	const block = {
		c: function create() {
			svg = svg_element("svg");
			path = svg_element("path");
			attr_dev(path, "d", "M375.7 19.7c-1.5-8-6.9-14.7-14.4-17.8s-16.1-2.2-22.8 2.4L256 61.1 173.5 4.2c-6.7-4.6-15.3-5.5-22.8-2.4s-12.9 9.8-14.4 17.8l-18.1 98.5L19.7 136.3c-8 1.5-14.7 6.9-17.8 14.4s-2.2 16.1 2.4 22.8L61.1 256 4.2 338.5c-4.6 6.7-5.5 15.3-2.4 22.8s9.8 13 17.8 14.4l98.5 18.1 18.1 98.5c1.5 8 6.9 14.7 14.4 17.8s16.1 2.2 22.8-2.4L256 450.9l82.5 56.9c6.7 4.6 15.3 5.5 22.8 2.4s12.9-9.8 14.4-17.8l18.1-98.5 98.5-18.1c8-1.5 14.7-6.9 17.8-14.4s2.2-16.1-2.4-22.8L450.9 256l56.9-82.5c4.6-6.7 5.5-15.3 2.4-22.8s-9.8-12.9-17.8-14.4l-98.5-18.1L375.7 19.7zM269.6 110l65.6-45.2 14.4 78.3c1.8 9.8 9.5 17.5 19.3 19.3l78.3 14.4L402 242.4c-5.7 8.2-5.7 19 0 27.2l45.2 65.6-78.3 14.4c-9.8 1.8-17.5 9.5-19.3 19.3l-14.4 78.3L269.6 402c-8.2-5.7-19-5.7-27.2 0l-65.6 45.2-14.4-78.3c-1.8-9.8-9.5-17.5-19.3-19.3L64.8 335.2 110 269.6c5.7-8.2 5.7-19 0-27.2L64.8 176.8l78.3-14.4c9.8-1.8 17.5-9.5 19.3-19.3l14.4-78.3L242.4 110c8.2 5.7 19 5.7 27.2 0zM256 368a112 112 0 1 0 0-224 112 112 0 1 0 0 224zM192 256a64 64 0 1 1 128 0 64 64 0 1 1 -128 0z");
			add_location(path, file$1, 67, 8, 1973);
			set_style(svg, "fill", "var(--bulma-warning)");
			attr_dev(svg, "xmlns", "http://www.w3.org/2000/svg");
			attr_dev(svg, "viewBox", "0 0 512 512");
			attr_dev(svg, "class", "svelte-x6infa");
			add_location(svg, file$1, 61, 6, 1812);
		},
		m: function mount(target, anchor) {
			insert_dev(target, svg, anchor);
			append_dev(svg, path);
			current = true;
		},
		i: function intro(local) {
			if (current) return;

			if (local) {
				add_render_callback(() => {
					if (!current) return;
					if (!svg_transition) svg_transition = create_bidirectional_transition(svg, blur, {}, true);
					svg_transition.run(1);
				});
			}

			current = true;
		},
		o: function outro(local) {
			if (local) {
				if (!svg_transition) svg_transition = create_bidirectional_transition(svg, blur, {}, false);
				svg_transition.run(0);
			}

			current = false;
		},
		d: function destroy(detaching) {
			if (detaching) {
				detach_dev(svg);
			}

			if (detaching && svg_transition) svg_transition.end();
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_else_block.name,
		type: "else",
		source: "(60:4) {:else}",
		ctx
	});

	return block;
}

// (48:4) {#if theme === "light"}
function create_if_block(ctx) {
	let svg;
	let path;
	let svg_transition;
	let current;

	const block = {
		c: function create() {
			svg = svg_element("svg");
			path = svg_element("path");
			attr_dev(path, "d", "M223.5 32C100 32 0 132.3 0 256S100 480 223.5 480c60.6 0 115.5-24.2 155.8-63.4c5-4.9 6.3-12.5 3.1-18.7s-10.1-9.7-17-8.5c-9.8 1.7-19.8 2.6-30.1 2.6c-96.9 0-175.5-78.8-175.5-176c0-65.8 36-123.1 89.3-153.3c6.1-3.5 9.2-10.5 7.7-17.3s-7.3-11.9-14.3-12.5c-6.3-.5-12.6-.8-19-.8z");
			add_location(path, file$1, 55, 8, 1460);
			set_style(svg, "fill", "var(--bulma-link)");
			attr_dev(svg, "xmlns", "http://www.w3.org/2000/svg");
			attr_dev(svg, "viewBox", "0 0 384 512");
			attr_dev(svg, "class", "svelte-x6infa");
			add_location(svg, file$1, 49, 6, 1302);
		},
		m: function mount(target, anchor) {
			insert_dev(target, svg, anchor);
			append_dev(svg, path);
			current = true;
		},
		i: function intro(local) {
			if (current) return;

			if (local) {
				add_render_callback(() => {
					if (!current) return;
					if (!svg_transition) svg_transition = create_bidirectional_transition(svg, blur, {}, true);
					svg_transition.run(1);
				});
			}

			current = true;
		},
		o: function outro(local) {
			if (local) {
				if (!svg_transition) svg_transition = create_bidirectional_transition(svg, blur, {}, false);
				svg_transition.run(0);
			}

			current = false;
		},
		d: function destroy(detaching) {
			if (detaching) {
				detach_dev(svg);
			}

			if (detaching && svg_transition) svg_transition.end();
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_if_block.name,
		type: "if",
		source: "(48:4) {#if theme === \\\"light\\\"}",
		ctx
	});

	return block;
}

function create_fragment$2(ctx) {
	let div;
	let button;
	let current_block_type_index;
	let if_block;
	let button_title_value;
	let mounted;
	let dispose;
	const if_block_creators = [create_if_block, create_else_block];
	const if_blocks = [];

	function select_block_type(ctx, dirty) {
		if (/*theme*/ ctx[0] === "light") return 0;
		return 1;
	}

	current_block_type_index = select_block_type(ctx);
	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

	const block = {
		c: function create() {
			div = element("div");
			button = element("button");
			if_block.c();
			attr_dev(button, "class", "icon");
			attr_dev(button, "title", button_title_value = "Switch to " + /*otherTheme*/ ctx[1] + " mode");
			add_location(button, file$1, 40, 2, 1124);
			add_location(div, file$1, 39, 0, 1116);
		},
		l: function claim(nodes) {
			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
		},
		m: function mount(target, anchor) {
			insert_dev(target, div, anchor);
			append_dev(div, button);
			if_blocks[current_block_type_index].m(button, null);

			if (!mounted) {
				dispose = listen_dev(button, "click", /*click_handler*/ ctx[2], false, false, false, false);
				mounted = true;
			}
		},
		p: function update(ctx, [dirty]) {
			let previous_block_index = current_block_type_index;
			current_block_type_index = select_block_type(ctx);

			if (current_block_type_index !== previous_block_index) {
				group_outros();

				transition_out(if_blocks[previous_block_index], 1, 1, () => {
					if_blocks[previous_block_index] = null;
				});

				check_outros();
				if_block = if_blocks[current_block_type_index];

				if (!if_block) {
					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
					if_block.c();
				}

				transition_in(if_block, 1);
				if_block.m(button, null);
			}

			if (dirty & /*otherTheme*/ 2 && button_title_value !== (button_title_value = "Switch to " + /*otherTheme*/ ctx[1] + " mode")) {
				attr_dev(button, "title", button_title_value);
			}
		},
		i: function intro(local) {
			transition_in(if_block);
		},
		o: function outro(local) {
			transition_out(if_block);
		},
		d: function destroy(detaching) {
			if (detaching) {
				detach_dev(div);
			}

			if_blocks[current_block_type_index].d();
			mounted = false;
			dispose();
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
	let $boardStyle;
	validate_store(boardStyle, 'boardStyle');
	component_subscribe($$self, boardStyle, $$value => $$invalidate(3, $boardStyle = $$value));
	let { $$slots: slots = {}, $$scope } = $$props;
	validate_slots('ThemeSwitcher', slots, []);
	const config = new Config();
	const themeOption = config.getConfigOption("theme", "dark");
	themeOption.setAllowedValues("light", "dark");
	let theme = themeOption.getValue();
	let otherTheme = theme === "dark" ? "light" : "dark";

	onMount(() => {
		document.body.dataset.board = $boardStyle;
	});

	const writable_props = [];

	Object.keys($$props).forEach(key => {
		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<ThemeSwitcher> was created with unknown prop '${key}'`);
	});

	const click_handler = () => {
		$$invalidate(0, theme = otherTheme);
	};

	$$self.$capture_state = () => ({
		Config,
		blur,
		boardStyle,
		onMount,
		config,
		themeOption,
		theme,
		otherTheme,
		$boardStyle
	});

	$$self.$inject_state = $$props => {
		if ('theme' in $$props) $$invalidate(0, theme = $$props.theme);
		if ('otherTheme' in $$props) $$invalidate(1, otherTheme = $$props.otherTheme);
	};

	if ($$props && "$$inject" in $$props) {
		$$self.$inject_state($$props.$$inject);
	}

	$$self.$$.update = () => {
		if ($$self.$$.dirty & /*theme*/ 1) {
			{
				$$invalidate(1, otherTheme = theme === "dark" ? "light" : "dark");
			}
		}

		if ($$self.$$.dirty & /*theme*/ 1) {
			{
				const originalTransition = document.documentElement.style.transition;
				document.documentElement.style.transition = "all 0.5s ease";
				document.documentElement.classList.add(theme);
				document.documentElement.dataset.theme = theme;
				themeOption.setValue(theme);

				if (theme === "light") {
					document.documentElement.classList.remove("dark");
				} else {
					document.documentElement.classList.remove("light");
				}

				setTimeout(
					() => {
						document.documentElement.style.transition = originalTransition;
					},
					500
				);
			}
		}
	};

	return [theme, otherTheme, click_handler];
}

class ThemeSwitcher extends SvelteComponentDev {
	constructor(options) {
		super(options);
		init(this, options, instance$2, create_fragment$2, safe_not_equal, {}, add_css);

		dispatch_dev("SvelteRegisterComponent", {
			component: this,
			tagName: "ThemeSwitcher",
			options,
			id: create_fragment$2.name
		});
	}
}

/* svelte/GlobalConfig.svelte generated by Svelte v4.2.18 */
const file = "svelte/GlobalConfig.svelte";

function get_each_context(ctx, list, i) {
	const child_ctx = ctx.slice();
	child_ctx[16] = list[i];
	return child_ctx;
}

function get_each_context_1(ctx, list, i) {
	const child_ctx = ctx.slice();
	child_ctx[16] = list[i];
	return child_ctx;
}

// (32:4) {#each pieceSetOptions as option (option)}
function create_each_block_1(key_1, ctx) {
	let label;
	let div;
	let input;
	let t0;
	let t1;
	let t2;
	let binding_group;
	let mounted;
	let dispose;

	function mouseenter_handler() {
		return /*mouseenter_handler*/ ctx[7](/*option*/ ctx[16]);
	}

	function focus_handler() {
		return /*focus_handler*/ ctx[8](/*option*/ ctx[16]);
	}

	binding_group = init_binding_group(/*$$binding_groups*/ ctx[6][1]);

	const block = {
		key: key_1,
		first: null,
		c: function create() {
			label = element("label");
			div = element("div");
			input = element("input");
			t0 = space();
			t1 = text(/*option*/ ctx[16]);
			t2 = space();
			attr_dev(input, "name", "pieceSet");
			attr_dev(input, "type", "radio");
			input.__value = /*option*/ ctx[16];
			set_input_value(input, input.__value);
			add_location(input, file, 39, 10, 1170);
			add_location(div, file, 38, 8, 1154);
			add_location(label, file, 32, 6, 916);
			binding_group.p(input);
			this.first = label;
		},
		m: function mount(target, anchor) {
			insert_dev(target, label, anchor);
			append_dev(label, div);
			append_dev(div, input);
			input.checked = input.__value === /*$pieceSet*/ ctx[2];
			append_dev(div, t0);
			append_dev(div, t1);
			append_dev(label, t2);

			if (!mounted) {
				dispose = [
					listen_dev(input, "change", /*input_change_handler*/ ctx[5]),
					listen_dev(label, "mouseenter", mouseenter_handler, false, false, false, false),
					listen_dev(label, "focus", focus_handler, false, false, false, false),
					listen_dev(label, "mouseout", /*mouseout_handler*/ ctx[9], false, false, false, false),
					listen_dev(label, "blur", /*blur_handler*/ ctx[10], false, false, false, false)
				];

				mounted = true;
			}
		},
		p: function update(new_ctx, dirty) {
			ctx = new_ctx;

			if (dirty & /*$pieceSet*/ 4) {
				input.checked = input.__value === /*$pieceSet*/ ctx[2];
			}
		},
		d: function destroy(detaching) {
			if (detaching) {
				detach_dev(label);
			}

			binding_group.r();
			mounted = false;
			run_all(dispose);
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_each_block_1.name,
		type: "each",
		source: "(32:4) {#each pieceSetOptions as option (option)}",
		ctx
	});

	return block;
}

// (53:4) {#each boardOptions as option (option)}
function create_each_block(key_1, ctx) {
	let label;
	let div;
	let input;
	let t0;
	let t1;
	let t2;
	let binding_group;
	let mounted;
	let dispose;

	function mouseenter_handler_1() {
		return /*mouseenter_handler_1*/ ctx[12](/*option*/ ctx[16]);
	}

	function focus_handler_1() {
		return /*focus_handler_1*/ ctx[13](/*option*/ ctx[16]);
	}

	binding_group = init_binding_group(/*$$binding_groups*/ ctx[6][0]);

	const block = {
		key: key_1,
		first: null,
		c: function create() {
			label = element("label");
			div = element("div");
			input = element("input");
			t0 = space();
			t1 = text(/*option*/ ctx[16]);
			t2 = space();
			attr_dev(input, "name", "boardStyle");
			attr_dev(input, "type", "radio");
			input.__value = /*option*/ ctx[16];
			set_input_value(input, input.__value);
			add_location(input, file, 60, 10, 1766);
			add_location(div, file, 59, 8, 1750);
			add_location(label, file, 53, 6, 1504);
			binding_group.p(input);
			this.first = label;
		},
		m: function mount(target, anchor) {
			insert_dev(target, label, anchor);
			append_dev(label, div);
			append_dev(div, input);
			input.checked = input.__value === /*$boardStyle*/ ctx[3];
			append_dev(div, t0);
			append_dev(div, t1);
			append_dev(label, t2);

			if (!mounted) {
				dispose = [
					listen_dev(input, "change", /*input_change_handler_1*/ ctx[11]),
					listen_dev(label, "mouseenter", mouseenter_handler_1, false, false, false, false),
					listen_dev(label, "focus", focus_handler_1, false, false, false, false),
					listen_dev(label, "mouseout", /*mouseout_handler_1*/ ctx[14], false, false, false, false),
					listen_dev(label, "blur", /*blur_handler_1*/ ctx[15], false, false, false, false)
				];

				mounted = true;
			}
		},
		p: function update(new_ctx, dirty) {
			ctx = new_ctx;

			if (dirty & /*$boardStyle*/ 8) {
				input.checked = input.__value === /*$boardStyle*/ ctx[3];
			}
		},
		d: function destroy(detaching) {
			if (detaching) {
				detach_dev(label);
			}

			binding_group.r();
			mounted = false;
			run_all(dispose);
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_each_block.name,
		type: "each",
		source: "(53:4) {#each boardOptions as option (option)}",
		ctx
	});

	return block;
}

function create_fragment$1(ctx) {
	let div3;
	let div0;
	let h20;
	let t1;
	let chessboard;
	let t2;
	let div1;
	let h21;
	let t4;
	let each_blocks_1 = [];
	let each0_lookup = new Map();
	let t5;
	let div2;
	let h22;
	let t7;
	let each_blocks = [];
	let each1_lookup = new Map();
	let current;

	chessboard = new Chessboard({
			props: {
				pieceSetOverride: /*pieceSetOverride*/ ctx[1],
				boardStyleOverride: /*boardStyleOverride*/ ctx[0]
			},
			$$inline: true
		});

	let each_value_1 = ensure_array_like_dev(pieceSetOptions);
	const get_key = ctx => /*option*/ ctx[16];
	validate_each_keys(ctx, each_value_1, get_each_context_1, get_key);

	for (let i = 0; i < each_value_1.length; i += 1) {
		let child_ctx = get_each_context_1(ctx, each_value_1, i);
		let key = get_key(child_ctx);
		each0_lookup.set(key, each_blocks_1[i] = create_each_block_1(key, child_ctx));
	}

	let each_value = ensure_array_like_dev(boardOptions);
	const get_key_1 = ctx => /*option*/ ctx[16];
	validate_each_keys(ctx, each_value, get_each_context, get_key_1);

	for (let i = 0; i < each_value.length; i += 1) {
		let child_ctx = get_each_context(ctx, each_value, i);
		let key = get_key_1(child_ctx);
		each1_lookup.set(key, each_blocks[i] = create_each_block(key, child_ctx));
	}

	const block = {
		c: function create() {
			div3 = element("div");
			div0 = element("div");
			h20 = element("h2");
			h20.textContent = "Example Board";
			t1 = space();
			create_component(chessboard.$$.fragment);
			t2 = space();
			div1 = element("div");
			h21 = element("h2");
			h21.textContent = "Piece Set";
			t4 = space();

			for (let i = 0; i < each_blocks_1.length; i += 1) {
				each_blocks_1[i].c();
			}

			t5 = space();
			div2 = element("div");
			h22 = element("h2");
			h22.textContent = "Board Style";
			t7 = space();

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].c();
			}

			attr_dev(h20, "class", "is-size-2");
			add_location(h20, file, 26, 4, 677);
			attr_dev(div0, "class", "column is-one-third");
			add_location(div0, file, 25, 2, 639);
			attr_dev(h21, "class", "is-size-2");
			add_location(h21, file, 30, 4, 826);
			attr_dev(div1, "class", "column is-one-third");
			add_location(div1, file, 29, 2, 788);
			attr_dev(h22, "class", "is-size-2");
			add_location(h22, file, 51, 4, 1415);
			attr_dev(div2, "class", "column is-one-third");
			add_location(div2, file, 50, 2, 1377);
			attr_dev(div3, "class", "columns");
			add_location(div3, file, 24, 0, 615);
		},
		l: function claim(nodes) {
			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
		},
		m: function mount(target, anchor) {
			insert_dev(target, div3, anchor);
			append_dev(div3, div0);
			append_dev(div0, h20);
			append_dev(div0, t1);
			mount_component(chessboard, div0, null);
			append_dev(div3, t2);
			append_dev(div3, div1);
			append_dev(div1, h21);
			append_dev(div1, t4);

			for (let i = 0; i < each_blocks_1.length; i += 1) {
				if (each_blocks_1[i]) {
					each_blocks_1[i].m(div1, null);
				}
			}

			append_dev(div3, t5);
			append_dev(div3, div2);
			append_dev(div2, h22);
			append_dev(div2, t7);

			for (let i = 0; i < each_blocks.length; i += 1) {
				if (each_blocks[i]) {
					each_blocks[i].m(div2, null);
				}
			}

			current = true;
		},
		p: function update(ctx, [dirty]) {
			const chessboard_changes = {};
			if (dirty & /*pieceSetOverride*/ 2) chessboard_changes.pieceSetOverride = /*pieceSetOverride*/ ctx[1];
			if (dirty & /*boardStyleOverride*/ 1) chessboard_changes.boardStyleOverride = /*boardStyleOverride*/ ctx[0];
			chessboard.$set(chessboard_changes);

			if (dirty & /*pieceSetOverride, $pieceSet*/ 6) {
				each_value_1 = ensure_array_like_dev(pieceSetOptions);
				validate_each_keys(ctx, each_value_1, get_each_context_1, get_key);
				each_blocks_1 = update_keyed_each(each_blocks_1, dirty, get_key, 1, ctx, each_value_1, each0_lookup, div1, destroy_block, create_each_block_1, null, get_each_context_1);
			}

			if (dirty & /*boardStyleOverride, $boardStyle*/ 9) {
				each_value = ensure_array_like_dev(boardOptions);
				validate_each_keys(ctx, each_value, get_each_context, get_key_1);
				each_blocks = update_keyed_each(each_blocks, dirty, get_key_1, 1, ctx, each_value, each1_lookup, div2, destroy_block, create_each_block, null, get_each_context);
			}
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
			if (detaching) {
				detach_dev(div3);
			}

			destroy_component(chessboard);

			for (let i = 0; i < each_blocks_1.length; i += 1) {
				each_blocks_1[i].d();
			}

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].d();
			}
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
	let $pieceSet;
	let $boardStyle;
	validate_store(pieceSet, 'pieceSet');
	component_subscribe($$self, pieceSet, $$value => $$invalidate(2, $pieceSet = $$value));
	validate_store(boardStyle, 'boardStyle');
	component_subscribe($$self, boardStyle, $$value => $$invalidate(3, $boardStyle = $$value));
	let { $$slots: slots = {}, $$scope } = $$props;
	validate_slots('GlobalConfig', slots, []);
	let pieceSetOverride;
	let boardStyleOverride;
	let originalBoard;

	onMount(() => {
		$$invalidate(4, originalBoard = document.body.dataset.board);
	});

	const writable_props = [];

	Object.keys($$props).forEach(key => {
		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<GlobalConfig> was created with unknown prop '${key}'`);
	});

	const $$binding_groups = [[], []];

	function input_change_handler() {
		$pieceSet = this.__value;
		pieceSet.set($pieceSet);
	}

	const mouseenter_handler = option => $$invalidate(1, pieceSetOverride = option);
	const focus_handler = option => $$invalidate(1, pieceSetOverride = option);
	const mouseout_handler = () => $$invalidate(1, pieceSetOverride = null);
	const blur_handler = () => $$invalidate(1, pieceSetOverride = null);

	function input_change_handler_1() {
		$boardStyle = this.__value;
		boardStyle.set($boardStyle);
	}

	const mouseenter_handler_1 = option => $$invalidate(0, boardStyleOverride = option);
	const focus_handler_1 = option => $$invalidate(0, boardStyleOverride = option);
	const mouseout_handler_1 = () => $$invalidate(0, boardStyleOverride = null);
	const blur_handler_1 = () => $$invalidate(0, boardStyleOverride = null);

	$$self.$capture_state = () => ({
		Chessboard,
		boardOptions,
		pieceSetOptions,
		boardStyle,
		pieceSet,
		onMount,
		pieceSetOverride,
		boardStyleOverride,
		originalBoard,
		$pieceSet,
		$boardStyle
	});

	$$self.$inject_state = $$props => {
		if ('pieceSetOverride' in $$props) $$invalidate(1, pieceSetOverride = $$props.pieceSetOverride);
		if ('boardStyleOverride' in $$props) $$invalidate(0, boardStyleOverride = $$props.boardStyleOverride);
		if ('originalBoard' in $$props) $$invalidate(4, originalBoard = $$props.originalBoard);
	};

	if ($$props && "$$inject" in $$props) {
		$$self.$inject_state($$props.$$inject);
	}

	$$self.$$.update = () => {
		if ($$self.$$.dirty & /*boardStyleOverride, originalBoard*/ 17) {
			{
				if (boardStyleOverride && document.body) {
					document.body.dataset.board = boardStyleOverride;
				}

				if (boardStyleOverride === null && document.body) {
					document.body.dataset.board = originalBoard;
				}
			}
		}
	};

	return [
		boardStyleOverride,
		pieceSetOverride,
		$pieceSet,
		$boardStyle,
		originalBoard,
		input_change_handler,
		$$binding_groups,
		mouseenter_handler,
		focus_handler,
		mouseout_handler,
		blur_handler,
		input_change_handler_1,
		mouseenter_handler_1,
		focus_handler_1,
		mouseout_handler_1,
		blur_handler_1
	];
}

class GlobalConfig extends SvelteComponentDev {
	constructor(options) {
		super(options);
		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});

		dispatch_dev("SvelteRegisterComponent", {
			component: this,
			tagName: "GlobalConfig",
			options,
			id: create_fragment$1.name
		});
	}
}

/* svelte/App.svelte generated by Svelte v4.2.18 */

const { Object: Object_1 } = globals;

function create_fragment(ctx) {
	const block = {
		c: noop,
		l: function claim(nodes) {
			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
		},
		m: noop,
		p: noop,
		i: noop,
		o: noop,
		d: noop
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

function instance($$self, $$props, $$invalidate) {
	let { $$slots: slots = {}, $$scope } = $$props;
	validate_slots('App', slots, []);

	const idsToComponentMap = {
		puzzles: Puzzles,
		"daily-games": DailyGames,
		"knight-moves": KnightMoves,
		"notation-trainer": NotationTrainer,
		"theme-switcher": ThemeSwitcher,
		"global-config": GlobalConfig
	};

	function mountComponentsById() {
		Object.entries(idsToComponentMap).forEach(([id, Component]) => {
			const element = document.getElementById(id);

			if (element) {
				new Component({ target: element });
			}
		});
	}

	onMount(() => {
		mountComponentsById();
	});

	const writable_props = [];

	Object_1.keys($$props).forEach(key => {
		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<App> was created with unknown prop '${key}'`);
	});

	$$self.$capture_state = () => ({
		onMount,
		Puzzles,
		DailyGames,
		KnightMoves,
		NotationTrainer,
		ThemeSwitcher,
		GlobalConfig,
		idsToComponentMap,
		mountComponentsById
	});

	return [];
}

class App extends SvelteComponentDev {
	constructor(options) {
		super(options);
		init(this, options, instance, create_fragment, safe_not_equal, {});

		dispatch_dev("SvelteRegisterComponent", {
			component: this,
			tagName: "App",
			options,
			id: create_fragment.name
		});
	}
}

export { App as default };
//# sourceMappingURL=app.js.map
