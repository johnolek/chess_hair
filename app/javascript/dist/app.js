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
function file$d(square) {
    return square & 0xf;
}
function isDigit(c) {
    return '0123456789'.indexOf(c) !== -1;
}
// Converts a 0x88 square to algebraic notation.
function algebraic(square) {
    const f = file$d(square);
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
            if (file$d(from) === file$d(ambigFrom)) {
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
let Chess$1 = class Chess {
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
            if (file$d(i) === 0) {
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
            return (rank(sq) + file$d(sq)) % 2 === 0 ? 'light' : 'dark';
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
};

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
const file$c = "svelte/components/Chessboard.svelte";

function add_css$5(target) {
	append_styles(target, "svelte-1hrnnj7", ".board-wrapper.svelte-1hrnnj7{position:relative;width:100%}.centered-content.svelte-1hrnnj7{position:absolute;top:50%;left:50%;transform:translate(-50%, -50%);z-index:3;opacity:0.8}\n/*# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQ2hlc3Nib2FyZC5zdmVsdGUiLCJzb3VyY2VzIjpbIkNoZXNzYm9hcmQuc3ZlbHRlIl0sInNvdXJjZXNDb250ZW50IjpbIjxzY3JpcHQ+XG4gIGltcG9ydCB7IG9uTW91bnQgfSBmcm9tIFwic3ZlbHRlXCI7XG4gIGltcG9ydCB7IENoZXNzZ3JvdW5kIH0gZnJvbSBcImNoZXNzZ3JvdW5kXCI7XG4gIGltcG9ydCB7IENoZXNzIH0gZnJvbSBcImNoZXNzLmpzXCI7XG4gIGltcG9ydCB7IHBpZWNlU2V0IH0gZnJvbSBcIi4uL3N0b3Jlc1wiO1xuICBpbXBvcnQgeyBjcmVhdGVFdmVudERpc3BhdGNoZXIgfSBmcm9tIFwic3ZlbHRlXCI7XG5cbiAgbGV0IGJvYXJkQ29udGFpbmVyO1xuICBleHBvcnQgbGV0IGNoZXNzZ3JvdW5kQ29uZmlnID0ge307XG4gIGV4cG9ydCBsZXQgb3JpZW50YXRpb24gPSBcIndoaXRlXCI7XG5cbiAgZXhwb3J0IGxldCBmZW47XG4gIGV4cG9ydCBsZXQgbGFzdE1vdmUgPSBudWxsO1xuICBleHBvcnQgbGV0IGNoZXNzZ3JvdW5kO1xuICBleHBvcnQgbGV0IHNpemU7XG5cbiAgbGV0IGNoZXNzSW5zdGFuY2UgPSBuZXcgQ2hlc3MoKTtcbiAgZXhwb3J0IGxldCBwaWVjZVNldE92ZXJyaWRlID0gbnVsbDtcbiAgZXhwb3J0IGxldCBib2FyZFN0eWxlT3ZlcnJpZGUgPSBudWxsO1xuXG4gIGNvbnN0IGRpc3BhdGNoID0gY3JlYXRlRXZlbnREaXNwYXRjaGVyKCk7XG5cbiAgbGV0IG1heFdpZHRoID0gXCI3MHZoXCI7XG5cbiAgJDoge1xuICAgIGlmIChvcmllbnRhdGlvbiAmJiBjaGVzc2dyb3VuZCkge1xuICAgICAgY2hlc3Nncm91bmQuc2V0KHsgb3JpZW50YXRpb246IG9yaWVudGF0aW9uIH0pO1xuICAgIH1cbiAgfVxuXG4gICQ6IHtcbiAgICBpZiAoZmVuICYmIGNoZXNzZ3JvdW5kKSB7XG4gICAgICBpZiAobGFzdE1vdmUpIHtcbiAgICAgICAgY2hlc3NJbnN0YW5jZS5sb2FkKGxhc3RNb3ZlLmJlZm9yZSk7XG4gICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgIG1vdmUobGFzdE1vdmUuc2FuKTtcbiAgICAgICAgICBjaGVzc2dyb3VuZC5zZXQoeyBsYXN0TW92ZTogW2xhc3RNb3ZlLmZyb20sIGxhc3RNb3ZlLnRvXSB9KTtcbiAgICAgICAgfSwgNTAwKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNoZXNzSW5zdGFuY2UubG9hZChmZW4pO1xuICAgICAgfVxuICAgICAgdXBkYXRlQ2hlc3Nncm91bmQoKTtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBnZXRMZWdhbE1vdmVzKCkge1xuICAgIGNvbnN0IG1vdmVzID0gY2hlc3NJbnN0YW5jZS5tb3Zlcyh7IHZlcmJvc2U6IHRydWUgfSk7XG4gICAgY29uc3QgZGVzdHMgPSBuZXcgTWFwKCk7XG4gICAgbW92ZXMuZm9yRWFjaCgobW92ZSkgPT4ge1xuICAgICAgaWYgKCFkZXN0cy5oYXMobW92ZS5mcm9tKSkgZGVzdHMuc2V0KG1vdmUuZnJvbSwgW10pO1xuICAgICAgZGVzdHMuZ2V0KG1vdmUuZnJvbSkucHVzaChtb3ZlLnRvKTtcbiAgICB9KTtcbiAgICByZXR1cm4gZGVzdHM7XG4gIH1cblxuICBmdW5jdGlvbiB1cGRhdGVDaGVzc2dyb3VuZCgpIHtcbiAgICBjb25zdCBsZWdhbE1vdmVzID0gZ2V0TGVnYWxNb3ZlcygpO1xuICAgIGNvbnN0IGhpc3RvcnkgPSBjaGVzc0luc3RhbmNlLmhpc3RvcnkoeyB2ZXJib3NlOiB0cnVlIH0pO1xuICAgIGxldCBsYXN0TW92ZSA9IG51bGw7XG4gICAgaWYgKGhpc3RvcnkgJiYgaGlzdG9yeVtoaXN0b3J5Lmxlbmd0aCAtIDFdKSB7XG4gICAgICBsYXN0TW92ZSA9IGhpc3RvcnlbaGlzdG9yeS5sZW5ndGggLSAxXTtcbiAgICB9XG4gICAgY2hlc3Nncm91bmQuc2V0KHtcbiAgICAgIGNoZWNrOiBjaGVzc0luc3RhbmNlLmluQ2hlY2soKSxcbiAgICAgIGZlbjogY2hlc3NJbnN0YW5jZS5mZW4oKSxcbiAgICAgIGxhc3RNb3ZlOiBsYXN0TW92ZSA/IFtsYXN0TW92ZS5mcm9tLCBsYXN0TW92ZS50b10gOiBudWxsLFxuICAgICAgdHVybkNvbG9yOiBjaGVzc0luc3RhbmNlLnR1cm4oKSA9PT0gXCJ3XCIgPyBcIndoaXRlXCIgOiBcImJsYWNrXCIsXG4gICAgICBtb3ZhYmxlOiB7XG4gICAgICAgIGZyZWU6IGZhbHNlLFxuICAgICAgICBkZXN0czogbGVnYWxNb3ZlcyxcbiAgICAgIH0sXG4gICAgfSk7XG4gIH1cblxuICBmdW5jdGlvbiBoYW5kbGVNb3ZlKGZyb20sIHRvKSB7XG4gICAgY29uc3QgaXNQcm9tb3Rpb24gPSAoZnJvbSwgdG8pID0+IHtcbiAgICAgIGNvbnN0IGZyb21SYW5rID0gZnJvbVsxXTtcbiAgICAgIGNvbnN0IHRvUmFuayA9IHRvWzFdO1xuICAgICAgY29uc3QgcGllY2UgPSBjaGVzc0luc3RhbmNlLmdldChmcm9tKS50eXBlO1xuICAgICAgcmV0dXJuIChcbiAgICAgICAgcGllY2UgPT09IFwicFwiICYmXG4gICAgICAgICgoZnJvbVJhbmsgPT09IFwiN1wiICYmIHRvUmFuayA9PT0gXCI4XCIpIHx8XG4gICAgICAgICAgKGZyb21SYW5rID09PSBcIjJcIiAmJiB0b1JhbmsgPT09IFwiMVwiKSlcbiAgICAgICk7XG4gICAgfTtcblxuICAgIGxldCBwcm9tb3Rpb24gPSBcInFcIjsgLy8gRGVmYXVsdCB0byBxdWVlblxuXG4gICAgaWYgKGlzUHJvbW90aW9uKGZyb20sIHRvKSkge1xuICAgICAgY29uc3QgY2hvaWNlID0gcHJvbXB0KFwiUHJvbW90ZSBwYXduIHRvIChxLCByLCBiLCBuKTpcIik7XG4gICAgICBpZiAoW1wicVwiLCBcInJcIiwgXCJiXCIsIFwiblwiXS5pbmNsdWRlcyhjaG9pY2UpKSB7XG4gICAgICAgIHByb21vdGlvbiA9IGNob2ljZTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBjb25zdCBtb3ZlID0gY2hlc3NJbnN0YW5jZS5tb3ZlKHsgZnJvbSwgdG8sIHByb21vdGlvbiB9KTtcbiAgICBpZiAobW92ZSkge1xuICAgICAgdXBkYXRlQ2hlc3Nncm91bmQoKTtcbiAgICAgIGRpc3BhdGNoKFwibW92ZVwiLCB7IG1vdmUsIGlzQ2hlY2ttYXRlOiBjaGVzc0luc3RhbmNlLmlzQ2hlY2ttYXRlKCkgfSk7XG4gICAgfVxuICB9XG5cbiAgZXhwb3J0IGZ1bmN0aW9uIHVuZG8oKSB7XG4gICAgY2hlc3NJbnN0YW5jZS51bmRvKCk7XG4gICAgdXBkYXRlQ2hlc3Nncm91bmQoKTtcbiAgfVxuXG4gIGV4cG9ydCBmdW5jdGlvbiBtb3ZlKG1vdmUpIHtcbiAgICBjaGVzc0luc3RhbmNlLm1vdmUobW92ZSk7XG4gICAgdXBkYXRlQ2hlc3Nncm91bmQoKTtcbiAgfVxuXG4gIG9uTW91bnQoKCkgPT4ge1xuICAgIGNoZXNzZ3JvdW5kID0gQ2hlc3Nncm91bmQoYm9hcmRDb250YWluZXIsIHtcbiAgICAgIC4uLmNoZXNzZ3JvdW5kQ29uZmlnLFxuICAgICAgZmVuOiBjaGVzc0luc3RhbmNlLmZlbigpLFxuICAgICAgbW92YWJsZToge1xuICAgICAgICBldmVudHM6IHtcbiAgICAgICAgICBhZnRlcjogaGFuZGxlTW92ZSxcbiAgICAgICAgfSxcbiAgICAgIH0sXG4gICAgfSk7XG4gIH0pO1xuPC9zY3JpcHQ+XG5cbnsjaWYgcGllY2VTZXRPdmVycmlkZX1cbiAgPGxpbmtcbiAgICBpZD1cInBpZWNlLXNwcml0ZVwiXG4gICAgaHJlZj1cIi9waWVjZS1jc3Mve3BpZWNlU2V0T3ZlcnJpZGV9LmNzc1wiXG4gICAgcmVsPVwic3R5bGVzaGVldFwiXG4gIC8+XG57OmVsc2V9XG4gIDxsaW5rIGlkPVwicGllY2Utc3ByaXRlXCIgaHJlZj1cIi9waWVjZS1jc3MveyRwaWVjZVNldH0uY3NzXCIgcmVsPVwic3R5bGVzaGVldFwiIC8+XG57L2lmfVxuXG48ZGl2XG4gIGNsYXNzPVwiYm9hcmQtd3JhcHBlclwiXG4gIHN0eWxlPVwibWF4LXdpZHRoOiB7bWF4V2lkdGh9XCJcbiAgYmluZDpjbGllbnRXaWR0aD17c2l6ZX1cbj5cbiAgPGRpdiBjbGFzcz1cImNlbnRlcmVkLWNvbnRlbnRcIj5cbiAgICA8c2xvdCBuYW1lPVwiY2VudGVyZWQtY29udGVudFwiPjwvc2xvdD5cbiAgPC9kaXY+XG4gIDxkaXZcbiAgICBjbGFzcz1cImlzMmQge2JvYXJkU3R5bGVPdmVycmlkZSA/IGJvYXJkU3R5bGVPdmVycmlkZSA6ICcnfVwiXG4gICAgYmluZDp0aGlzPXtib2FyZENvbnRhaW5lcn1cbiAgICBzdHlsZT1cInBvc2l0aW9uOiByZWxhdGl2ZTt3aWR0aDoge3NpemV9cHg7IGhlaWdodDoge3NpemV9cHhcIlxuICA+PC9kaXY+XG4gIDxkaXYgY2xhc3M9XCJibG9jayBtdC0yXCI+XG4gICAgPHNsb3QgbmFtZT1cImJlbG93LWJvYXJkXCI+PC9zbG90PlxuICA8L2Rpdj5cbjwvZGl2PlxuXG48c3R5bGU+XG4gIC5ib2FyZC13cmFwcGVyIHtcbiAgICBwb3NpdGlvbjogcmVsYXRpdmU7XG4gICAgd2lkdGg6IDEwMCU7XG4gIH1cblxuICAuY2VudGVyZWQtY29udGVudCB7XG4gICAgcG9zaXRpb246IGFic29sdXRlO1xuICAgIHRvcDogNTAlO1xuICAgIGxlZnQ6IDUwJTtcbiAgICB0cmFuc2Zvcm06IHRyYW5zbGF0ZSgtNTAlLCAtNTAlKTtcbiAgICB6LWluZGV4OiAzOyAvKiByZXF1aXJlZCB0byBhcHBlYXIgaW4gZnJvbnQgb2YgcGllY2VzICovXG4gICAgb3BhY2l0eTogMC44O1xuICB9XG48L3N0eWxlPlxuIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQTBKRSw2QkFBZSxDQUNiLFFBQVEsQ0FBRSxRQUFRLENBQ2xCLEtBQUssQ0FBRSxJQUNULENBRUEsZ0NBQWtCLENBQ2hCLFFBQVEsQ0FBRSxRQUFRLENBQ2xCLEdBQUcsQ0FBRSxHQUFHLENBQ1IsSUFBSSxDQUFFLEdBQUcsQ0FDVCxTQUFTLENBQUUsVUFBVSxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FDaEMsT0FBTyxDQUFFLENBQUMsQ0FDVixPQUFPLENBQUUsR0FDWCJ9 */");
}

const get_below_board_slot_changes = dirty => ({});
const get_below_board_slot_context = ctx => ({});
const get_centered_content_slot_changes = dirty => ({});
const get_centered_content_slot_context = ctx => ({});

// (132:0) {:else}
function create_else_block$4(ctx) {
	let link;
	let link_href_value;

	const block = {
		c: function create() {
			link = element("link");
			attr_dev(link, "id", "piece-sprite");
			attr_dev(link, "href", link_href_value = "/piece-css/" + /*$pieceSet*/ ctx[4] + ".css");
			attr_dev(link, "rel", "stylesheet");
			add_location(link, file$c, 132, 2, 3202);
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
		source: "(132:0) {:else}",
		ctx
	});

	return block;
}

// (126:0) {#if pieceSetOverride}
function create_if_block$7(ctx) {
	let link;
	let link_href_value;

	const block = {
		c: function create() {
			link = element("link");
			attr_dev(link, "id", "piece-sprite");
			attr_dev(link, "href", link_href_value = "/piece-css/" + /*pieceSetOverride*/ ctx[1] + ".css");
			attr_dev(link, "rel", "stylesheet");
			add_location(link, file$c, 126, 2, 3093);
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
		source: "(126:0) {#if pieceSetOverride}",
		ctx
	});

	return block;
}

function create_fragment$d(ctx) {
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
	const centered_content_slot_template = /*#slots*/ ctx[14]["centered-content"];
	const centered_content_slot = create_slot(centered_content_slot_template, ctx, /*$$scope*/ ctx[13], get_centered_content_slot_context);
	const below_board_slot_template = /*#slots*/ ctx[14]["below-board"];
	const below_board_slot = create_slot(below_board_slot_template, ctx, /*$$scope*/ ctx[13], get_below_board_slot_context);

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
			add_location(div0, file$c, 140, 2, 3378);

			attr_dev(div1, "class", div1_class_value = "is2d " + (/*boardStyleOverride*/ ctx[2]
			? /*boardStyleOverride*/ ctx[2]
			: '') + " svelte-1hrnnj7");

			set_style(div1, "position", "relative");
			set_style(div1, "width", /*size*/ ctx[0] + "px");
			set_style(div1, "height", /*size*/ ctx[0] + "px");
			add_location(div1, file$c, 143, 2, 3462);
			attr_dev(div2, "class", "block mt-2");
			add_location(div2, file$c, 148, 2, 3639);
			attr_dev(div3, "class", "board-wrapper svelte-1hrnnj7");
			set_style(div3, "max-width", /*maxWidth*/ ctx[5]);
			add_render_callback(() => /*div3_elementresize_handler*/ ctx[16].call(div3));
			add_location(div3, file$c, 135, 0, 3287);
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
			/*div1_binding*/ ctx[15](div1);
			append_dev(div3, t2);
			append_dev(div3, div2);

			if (below_board_slot) {
				below_board_slot.m(div2, null);
			}

			div3_resize_listener = add_iframe_resize_listener(div3, /*div3_elementresize_handler*/ ctx[16].bind(div3));
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
				if (centered_content_slot.p && (!current || dirty & /*$$scope*/ 8192)) {
					update_slot_base(
						centered_content_slot,
						centered_content_slot_template,
						ctx,
						/*$$scope*/ ctx[13],
						!current
						? get_all_dirty_from_scope(/*$$scope*/ ctx[13])
						: get_slot_changes(centered_content_slot_template, /*$$scope*/ ctx[13], dirty, get_centered_content_slot_changes),
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
				if (below_board_slot.p && (!current || dirty & /*$$scope*/ 8192)) {
					update_slot_base(
						below_board_slot,
						below_board_slot_template,
						ctx,
						/*$$scope*/ ctx[13],
						!current
						? get_all_dirty_from_scope(/*$$scope*/ ctx[13])
						: get_slot_changes(below_board_slot_template, /*$$scope*/ ctx[13], dirty, get_below_board_slot_changes),
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
			/*div1_binding*/ ctx[15](null);
			if (below_board_slot) below_board_slot.d(detaching);
			div3_resize_listener();
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
	let chessInstance = new Chess$1();
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
			const choice = prompt("Promote pawn to (q, r, b, n):");

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
		if ('$$scope' in $$props) $$invalidate(13, $$scope = $$props.$$scope);
	};

	$$self.$capture_state = () => ({
		onMount,
		Chessground,
		Chess: Chess$1,
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
		if ('chessInstance' in $$props) $$invalidate(17, chessInstance = $$props.chessInstance);
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
			instance$d,
			create_fragment$d,
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
				move: 12
			},
			add_css$5
		);

		dispatch_dev("SvelteRegisterComponent", {
			component: this,
			tagName: "Chessboard",
			options,
			id: create_fragment$d.name
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

	get move() {
		return this.$$.ctx[12];
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
const file$b = "svelte/components/PuzzleHistoryProcessor.svelte";

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
			add_location(strong, file$b, 53, 5, 1302);
			add_location(p, file$b, 53, 2, 1299);
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
			add_location(textarea, file$b, 46, 6, 1114);
			attr_dev(div0, "class", "control");
			add_location(div0, file$b, 45, 4, 1086);
			attr_dev(div1, "class", "field");
			add_location(div1, file$b, 44, 2, 1062);
			attr_dev(button, "class", "button is-primary");
			add_location(button, file$b, 49, 2, 1199);
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
			add_location(strong, file$b, 100, 10, 2504);
			add_location(p, file$b, 99, 2, 2490);
			attr_dev(input, "class", "input");
			attr_dev(input, "type", "text");
			input.readOnly = true;
			input.value = input_value_value = /*uniqueFilteredPuzzleIds*/ ctx[6].join(",");
			add_location(input, file$b, 104, 6, 2632);
			attr_dev(div0, "class", "control");
			add_location(div0, file$b, 103, 4, 2604);
			attr_dev(div1, "class", "field");
			add_location(div1, file$b, 102, 2, 2580);
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

function create_fragment$c(ctx) {
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
			add_location(label0, file$b, 58, 4, 1445);
			attr_dev(input0, "class", "input");
			attr_dev(input0, "type", "number");
			attr_dev(input0, "id", "minRating");
			attr_dev(input0, "min", "0");
			attr_dev(input0, "max", "4999");
			add_location(input0, file$b, 60, 6, 1534);
			attr_dev(div0, "class", "control");
			add_location(div0, file$b, 59, 4, 1506);
			attr_dev(div1, "class", "field");
			add_location(div1, file$b, 57, 2, 1421);
			attr_dev(label1, "class", "label");
			attr_dev(label1, "for", "maxRating");
			add_location(label1, file$b, 71, 4, 1729);
			attr_dev(input1, "class", "input");
			attr_dev(input1, "type", "number");
			attr_dev(input1, "id", "maxRating");
			attr_dev(input1, "min", input1_min_value = /*minRating*/ ctx[1] + 1);
			attr_dev(input1, "max", "5000");
			add_location(input1, file$b, 73, 6, 1818);
			attr_dev(div2, "class", "control");
			add_location(div2, file$b, 72, 4, 1790);
			attr_dev(div3, "class", "field");
			add_location(div3, file$b, 70, 2, 1705);
			attr_dev(label2, "class", "checkbox");
			attr_dev(label2, "for", "correctSolves");
			add_location(label2, file$b, 84, 4, 2025);
			attr_dev(input2, "type", "checkbox");
			attr_dev(input2, "id", "correctSolves");
			add_location(input2, file$b, 85, 4, 2097);
			attr_dev(div4, "class", "field");
			add_location(div4, file$b, 83, 2, 2001);
			attr_dev(label3, "class", "checkbox");
			attr_dev(label3, "for", "incorrectSolves");
			add_location(label3, file$b, 88, 4, 2206);
			attr_dev(input3, "type", "checkbox");
			attr_dev(input3, "id", "incorrectSolves");
			add_location(input3, file$b, 89, 4, 2282);
			attr_dev(div5, "class", "field");
			add_location(div5, file$b, 87, 2, 2182);
			attr_dev(button, "class", "button is-primary");
			attr_dev(button, "type", "submit");
			add_location(button, file$b, 95, 2, 2393);
			add_location(form, file$b, 56, 0, 1371);
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
		id: create_fragment$c.name,
		type: "component",
		source: "",
		ctx
	});

	return block;
}

function instance$c($$self, $$props, $$invalidate) {
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
		init(this, options, instance$c, create_fragment$c, safe_not_equal, {});

		dispatch_dev("SvelteRegisterComponent", {
			component: this,
			tagName: "PuzzleHistoryProcessor",
			options,
			id: create_fragment$c.name
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
const file$a = "svelte/components/CollapsibleBox.svelte";

function add_css$4(target) {
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
			add_location(div, file$a, 38, 4, 875);
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

function create_fragment$b(ctx) {
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
			add_location(span0, file$a, 34, 4, 737);
			attr_dev(span1, "class", "icon svelte-b8skwo");
			set_style(span1, "transform", "rotate(" + /*$rotation*/ ctx[2] + "deg)");
			add_location(span1, file$a, 35, 4, 775);
			attr_dev(div0, "class", "toggle-button svelte-b8skwo");
			attr_dev(div0, "role", "button");
			attr_dev(div0, "tabindex", "0");
			add_location(div0, file$a, 27, 2, 606);
			attr_dev(div1, "class", "box svelte-b8skwo");
			toggle_class(div1, "open", /*$isOpen*/ ctx[1]);
			add_location(div1, file$a, 26, 0, 565);
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
		id: create_fragment$b.name,
		type: "component",
		source: "",
		ctx
	});

	return block;
}

function instance$b($$self, $$props, $$invalidate) {
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
		init(this, options, instance$b, create_fragment$b, safe_not_equal, { defaultOpen: 7, title: 0 }, add_css$4);

		dispatch_dev("SvelteRegisterComponent", {
			component: this,
			tagName: "CollapsibleBox",
			options,
			id: create_fragment$b.name
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

/* svelte/Puzzles.svelte generated by Svelte v4.2.18 */

const { Map: Map_1 } = globals;
const file$9 = "svelte/Puzzles.svelte";

function add_css$3(target) {
	append_styles(target, "svelte-1oimmcd", ".puzzle-id.svelte-1oimmcd{font-family:monospace}\n/*# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiUHV6emxlcy5zdmVsdGUiLCJzb3VyY2VzIjpbIlB1enpsZXMuc3ZlbHRlIl0sInNvdXJjZXNDb250ZW50IjpbIjxzY3JpcHQ+XG4gIGltcG9ydCBDaGVzc2JvYXJkIGZyb20gXCIuL2NvbXBvbmVudHMvQ2hlc3Nib2FyZC5zdmVsdGVcIjtcbiAgaW1wb3J0IHsgb25Nb3VudCB9IGZyb20gXCJzdmVsdGVcIjtcbiAgaW1wb3J0IHsgZmFkZSB9IGZyb20gXCJzdmVsdGUvdHJhbnNpdGlvblwiO1xuICBpbXBvcnQgeyBmbGlwIH0gZnJvbSBcInN2ZWx0ZS9hbmltYXRlXCI7XG4gIGltcG9ydCB7IFV0aWwgfSBmcm9tIFwic3JjL3V0aWxcIjtcbiAgaW1wb3J0IHsgcGVyc2lzdGVkIH0gZnJvbSBcInN2ZWx0ZS1wZXJzaXN0ZWQtc3RvcmVcIjtcbiAgaW1wb3J0IHsgQ2hlc3MgfSBmcm9tIFwiY2hlc3MuanNcIjtcbiAgaW1wb3J0IFB1enpsZUhpc3RvcnlQcm9jZXNzb3IgZnJvbSBcIi4vY29tcG9uZW50cy9QdXp6bGVIaXN0b3J5UHJvY2Vzc29yLnN2ZWx0ZVwiO1xuICBpbXBvcnQgQ29sbGFwc2libGVCb3ggZnJvbSBcIi4vY29tcG9uZW50cy9Db2xsYXBzaWJsZUJveC5zdmVsdGVcIjtcblxuICBjbGFzcyBSZXN1bHQge1xuICAgIGNvbnN0cnVjdG9yKHB1enpsZUlkLCBzZWVuQXQsIHNraXBwZWQsIG1hZGVNaXN0YWtlID0gZmFsc2UsIGRvbmVBdCA9IG51bGwpIHtcbiAgICAgIHRoaXMucHV6emxlSWQgPSBwdXp6bGVJZDtcbiAgICAgIHRoaXMuc2tpcHBlZCA9IHNraXBwZWQ7XG4gICAgICB0aGlzLm1hZGVNaXN0YWtlID0gbWFkZU1pc3Rha2U7XG4gICAgICB0aGlzLnNlZW5BdCA9IHNlZW5BdDtcbiAgICAgIHRoaXMuZG9uZUF0ID0gZG9uZUF0O1xuICAgIH1cblxuICAgIGdldER1cmF0aW9uKCkge1xuICAgICAgaWYgKHRoaXMuZG9uZUF0KSB7XG4gICAgICAgIHJldHVybiB0aGlzLmRvbmVBdCAtIHRoaXMuc2VlbkF0O1xuICAgICAgfVxuICAgIH1cblxuICAgIHdhc1N1Y2Nlc3NmdWwoKSB7XG4gICAgICByZXR1cm4gIXRoaXMuc2tpcHBlZCAmJiAhdGhpcy5tYWRlTWlzdGFrZSAmJiB0aGlzLmRvbmVBdDtcbiAgICB9XG5cbiAgICB3YXNGYWlsdXJlKCkge1xuICAgICAgcmV0dXJuIHRoaXMubWFkZU1pc3Rha2U7XG4gICAgfVxuICB9XG5cbiAgY2xhc3MgUHV6emxlIHtcbiAgICBjb25zdHJ1Y3RvcihwdXp6bGVJZCkge1xuICAgICAgdGhpcy5wdXp6bGVJZCA9IHB1enpsZUlkO1xuICAgIH1cblxuICAgIGxpY2hlc3NVcmwoKSB7XG4gICAgICByZXR1cm4gYGh0dHBzOi8vbGljaGVzcy5vcmcvdHJhaW5pbmcvJHt0aGlzLnB1enpsZUlkfWA7XG4gICAgfVxuXG4gICAgaGFzUmVzdWx0cygpIHtcbiAgICAgIHJldHVybiB0aGlzLmdldFJlc3VsdHMoKS5sZW5ndGggPj0gMTtcbiAgICB9XG5cbiAgICBoYXNCZWVuU29sdmVkKCkge1xuICAgICAgaWYgKCF0aGlzLmhhc1Jlc3VsdHMoKSkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgICByZXR1cm4gdGhpcy5nZXRSZXN1bHRzKCkuc29tZSgocmVzdWx0KSA9PiB7XG4gICAgICAgIHJldHVybiByZXN1bHQud2FzU3VjY2Vzc2Z1bCgpO1xuICAgICAgfSk7XG4gICAgfVxuXG4gICAgZ2V0UmVzdWx0cygpIHtcbiAgICAgIHJldHVybiAoJHJlc3VsdHNbdGhpcy5wdXp6bGVJZF0gfHwgW10pLm1hcChcbiAgICAgICAgKHJlc3VsdERhdGEpID0+XG4gICAgICAgICAgbmV3IFJlc3VsdChcbiAgICAgICAgICAgIHJlc3VsdERhdGEucHV6emxlSWQsXG4gICAgICAgICAgICByZXN1bHREYXRhLnNlZW5BdCxcbiAgICAgICAgICAgIHJlc3VsdERhdGEuc2tpcHBlZCxcbiAgICAgICAgICAgIHJlc3VsdERhdGEubWFkZU1pc3Rha2UsXG4gICAgICAgICAgICByZXN1bHREYXRhLmRvbmVBdCxcbiAgICAgICAgICApLFxuICAgICAgKTtcbiAgICB9XG5cbiAgICBnZXRUb3RhbFNvbHZlcygpIHtcbiAgICAgIHJldHVybiB0aGlzLmdldFJlc3VsdHMoKS5maWx0ZXIoKHJlc3VsdCkgPT4gcmVzdWx0Lndhc1N1Y2Nlc3NmdWwoKSlcbiAgICAgICAgLmxlbmd0aDtcbiAgICB9XG5cbiAgICBnZXRGYWlsdXJlQ291bnQoKSB7XG4gICAgICByZXR1cm4gdGhpcy5nZXRSZXN1bHRzKCkuZmlsdGVyKChyZXN1bHQpID0+IHJlc3VsdC53YXNGYWlsdXJlKCkpLmxlbmd0aDtcbiAgICB9XG5cbiAgICBnZXRTb2x2ZVN0cmVhaygpIHtcbiAgICAgIGxldCBzdHJlYWsgPSAwO1xuXG4gICAgICBpZiAoIXRoaXMuaGFzQmVlblNvbHZlZCgpKSB7XG4gICAgICAgIHJldHVybiBzdHJlYWs7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IHJlc3VsdHMgPSB0aGlzLmdldFJlc3VsdHMoKTtcblxuICAgICAgZm9yIChsZXQgaSA9IHJlc3VsdHMubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIHtcbiAgICAgICAgaWYgKHJlc3VsdHNbaV0ud2FzU3VjY2Vzc2Z1bCgpKSB7XG4gICAgICAgICAgc3RyZWFrKys7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHN0cmVhaztcbiAgICB9XG5cbiAgICBhdmVyYWdlU29sdmVUaW1lKCkge1xuICAgICAgaWYgKCF0aGlzLmhhc0JlZW5Tb2x2ZWQoKSkge1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH1cbiAgICAgIGNvbnN0IHN1Y2Nlc3NmdWxSZXN1bHRzID0gdGhpcy5nZXRSZXN1bHRzKCkuZmlsdGVyKChyZXN1bHQpID0+XG4gICAgICAgIHJlc3VsdC53YXNTdWNjZXNzZnVsKCksXG4gICAgICApO1xuICAgICAgY29uc3QgbGFzdEZldyA9IHN1Y2Nlc3NmdWxSZXN1bHRzLnNsaWNlKG1pbmltdW1Tb2x2ZXMgKiAtMSk7XG4gICAgICBjb25zdCBkdXJhdGlvbnMgPSBsYXN0RmV3Lm1hcCgocmVzdWx0KSA9PiByZXN1bHQuZ2V0RHVyYXRpb24oKSk7XG4gICAgICBjb25zdCBzdW0gPSBkdXJhdGlvbnMucmVkdWNlKChhLCBiKSA9PiBhICsgYiwgMCk7XG4gICAgICBjb25zdCBhdmVyYWdlID0gc3VtIC8gKGxhc3RGZXcubGVuZ3RoIHx8IDEpO1xuICAgICAgcmV0dXJuIGF2ZXJhZ2U7XG4gICAgfVxuXG4gICAgbGFzdFNlZW5BdCgpIHtcbiAgICAgIGlmICghdGhpcy5oYXNSZXN1bHRzKCkpIHtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiB0aGlzLmdldFJlc3VsdHMoKS5zbGljZSgtMSkuc2VlbkF0O1xuICAgIH1cblxuICAgIGlzQ29tcGxldGUoKSB7XG4gICAgICBpZiAoIXRoaXMuaGFzQmVlblNvbHZlZCgpKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IGxhc3RTb2x2ZXMgPSB0aGlzLmdldFJlc3VsdHMoKS5zbGljZSgtMSAqIG1pbmltdW1Tb2x2ZXMpO1xuXG4gICAgICBpZiAobGFzdFNvbHZlcy5sZW5ndGggPCBtaW5pbXVtU29sdmVzKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cblxuICAgICAgaWYgKCFsYXN0U29sdmVzLmV2ZXJ5KChyZXN1bHQpID0+IHJlc3VsdC53YXNTdWNjZXNzZnVsKCkpKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHRoaXMuYXZlcmFnZVNvbHZlVGltZSgpIDw9IHRpbWVHb2FsO1xuICAgIH1cbiAgfVxuXG4gIC8vIENoZXNzIGJvYXJkIHN0dWZmXG4gIGxldCBmZW47XG4gIGxldCBsYXN0TW92ZTtcbiAgbGV0IGNoZXNzYm9hcmQ7XG4gIGxldCBvcmllbnRhdGlvbiA9IFwid2hpdGVcIjtcbiAgbGV0IGNoZXNzZ3JvdW5kQ29uZmlnID0ge1xuICAgIGNvb3JkaW5hdGVzOiB0cnVlLFxuICAgIGFuaW1hdGlvbjoge1xuICAgICAgZW5hYmxlZDogdHJ1ZSxcbiAgICB9LFxuICAgIGhpZ2hsaWdodDoge1xuICAgICAgbGFzdE1vdmU6IHRydWUsXG4gICAgICBjaGVjazogdHJ1ZSxcbiAgICB9LFxuICAgIGRyYWdnYWJsZToge1xuICAgICAgZW5hYmxlZDogdHJ1ZSxcbiAgICB9LFxuICAgIHNlbGVjdGFibGU6IHtcbiAgICAgIGVuYWJsZWQ6IHRydWUsXG4gICAgfSxcbiAgICBtb3ZhYmxlOiB7XG4gICAgICBmcmVlOiBmYWxzZSxcbiAgICAgIGNvbG9yOiBcImJvdGhcIixcbiAgICAgIGRlc3RzOiBuZXcgTWFwKCksXG4gICAgfSxcbiAgICBvcmllbnRhdGlvbjogb3JpZW50YXRpb24sXG4gIH07XG5cbiAgLy8gUHV6emxlIERhdGFcbiAgbGV0IGFsbFB1enpsZXMgPSBbXTtcbiAgbGV0IGFjdGl2ZVB1enpsZXMgPSBbXTtcblxuICAkOiB7XG4gICAgaWYgKGFjdGl2ZVB1enpsZXMubGVuZ3RoIDwgYmF0Y2hTaXplICYmIGFsbFB1enpsZXMubGVuZ3RoID4gMCkge1xuICAgICAgZmlsbEFjdGl2ZVB1enpsZXMoKTtcbiAgICB9XG4gIH1cblxuICBsZXQgY29tcGxldGVkUHV6emxlcyA9IFtdO1xuICBsZXQgY3VycmVudFB1enpsZTtcbiAgbGV0IHB1enpsZVNob3duQXQ7XG5cbiAgLy8gQmVoYXZpb3JhbCBDb25maWdcbiAgbGV0IGJhdGNoU2l6ZSA9IDEwO1xuICBsZXQgdGltZUdvYWwgPSAxNTAwMDtcbiAgbGV0IG1pbmltdW1Tb2x2ZXMgPSAyO1xuICBsZXQgYWxyZWFkeUNvbXBsZXRlT2RkcyA9IDAuMztcblxuICAvLyBDdXJyZW50IHB1enpsZSBzdGF0ZVxuICBsZXQgbW92ZXM7XG4gIGxldCBtYWRlTWlzdGFrZSA9IGZhbHNlO1xuICBsZXQgcHV6emxlQ29tcGxldGUgPSBmYWxzZTtcblxuICAvLyBET00gZWxlbWVudHNcbiAgbGV0IG5leHRCdXR0b247XG5cbiAgLy8gUGVyc2lzdGVkIGRhdGFcbiAgY29uc3QgcHV6emxlRGF0YVN0b3JlID0gcGVyc2lzdGVkKFwicHV6emxlcy5kYXRhXCIsIHt9KTtcbiAgY29uc3QgcHV6emxlSWRzVG9Xb3JrT24gPSBwZXJzaXN0ZWQoXCJwdXp6bGVzLmlkc1RvV29ya09uXCIsIFtdKTtcbiAgY29uc3QgcmVzdWx0cyA9IHBlcnNpc3RlZChcInB1enpsZXMucmVzdWx0c1wiLCB7fSk7XG5cbiAgZnVuY3Rpb24gZmlsbEFjdGl2ZVB1enpsZXMoKSB7XG4gICAgY29uc3QgY29tcGxldGVkID0gVXRpbC5zb3J0UmFuZG9tbHkoZ2V0Q29tcGxldGVkUHV6emxlcygpKTtcbiAgICBjb25zdCBpbmNvbXBsZXRlSW5hY3RpdmUgPSBVdGlsLnNvcnRSYW5kb21seShnZXRJbmFjdGl2ZUNvbXBsZXRlZFB1enpsZXMoKSk7XG4gICAgbGV0IHB1enpsZVR5cGU7XG4gICAgd2hpbGUgKGFsbFB1enpsZXMubGVuZ3RoID4gMCAmJiBhY3RpdmVQdXp6bGVzLmxlbmd0aCA8IGJhdGNoU2l6ZSkge1xuICAgICAgcHV6emxlVHlwZSA9IE1hdGgucmFuZG9tKCkgPCAwLjIgPyBcImNvbXBsZXRlZFwiIDogXCJpbmFjdGl2ZVwiO1xuICAgICAgaWYgKGluY29tcGxldGVJbmFjdGl2ZS5sZW5ndGggPCAxICYmIGNvbXBsZXRlZC5sZW5ndGggPCAxKSB7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgICAgaWYgKHB1enpsZVR5cGUgPT09IFwiY29tcGxldGVkXCIgJiYgY29tcGxldGVkLmxlbmd0aCA+IDApIHtcbiAgICAgICAgYWRkQWN0aXZlUHV6emxlKGNvbXBsZXRlZC5wb3AoKSk7XG4gICAgICB9IGVsc2UgaWYgKGluY29tcGxldGVJbmFjdGl2ZS5sZW5ndGggPiAwKSB7XG4gICAgICAgIGFkZEFjdGl2ZVB1enpsZShpbmNvbXBsZXRlSW5hY3RpdmUucG9wKCkpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8vIFRoaXMgaXMgdGllZCB0byB0aGUgYWRkIG5ldyBwdXp6bGUgZm9ybVxuICBsZXQgbmV3UHV6emxlSWRzO1xuXG4gIGZ1bmN0aW9uIGFkZFB1enpsZUlkVG9Xb3JrT24oKSB7XG4gICAgaWYgKG5ld1B1enpsZUlkcy5sZW5ndGggPCAzKSB7XG4gICAgICBuZXdQdXp6bGVJZHMgPSBcIlwiO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBjb25zdCBpZHNUb0FkZCA9IG5ld1B1enpsZUlkcy5zcGxpdChcIixcIikubWFwKChpZCkgPT4gaWQudHJpbSgpKTtcbiAgICBjb25zdCBjdXJyZW50UHV6emxlSWRzID0gbmV3IFNldCgkcHV6emxlSWRzVG9Xb3JrT24pO1xuICAgIGlkc1RvQWRkLmZvckVhY2goKGlkKSA9PiBjdXJyZW50UHV6emxlSWRzLmFkZChpZCkpO1xuICAgIHB1enpsZUlkc1RvV29ya09uLnNldChbLi4uY3VycmVudFB1enpsZUlkc10pO1xuICAgIG5ld1B1enpsZUlkcyA9IFwiXCI7XG4gIH1cblxuICBmdW5jdGlvbiByZW1vdmVQdXp6bGVJZChwdXp6bGVJZCkge1xuICAgIGNvbnN0IGN1cnJlbnRQdXp6bGVJZHMgPSBuZXcgU2V0KCRwdXp6bGVJZHNUb1dvcmtPbik7XG4gICAgY3VycmVudFB1enpsZUlkcy5kZWxldGUocHV6emxlSWQudHJpbSgpKTtcbiAgICBwdXp6bGVJZHNUb1dvcmtPbi5zZXQoWy4uLmN1cnJlbnRQdXp6bGVJZHNdKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGFkZEFjdGl2ZVB1enpsZShwdXp6bGUpIHtcbiAgICBhY3RpdmVQdXp6bGVzID0gW1xuICAgICAgLi4ubmV3IFNldChbXG4gICAgICAgIC4uLmFjdGl2ZVB1enpsZXMubWFwKChwdXp6bGUpID0+IHB1enpsZS5wdXp6bGVJZCksXG4gICAgICAgIHB1enpsZS5wdXp6bGVJZCxcbiAgICAgIF0pLFxuICAgIF0ubWFwKChwdXp6bGVJZCkgPT4gbmV3IFB1enpsZShwdXp6bGVJZCkpO1xuICB9XG5cbiAgZnVuY3Rpb24gcmVtb3ZlQWN0aXZlUHV6emxlKHB1enpsZSkge1xuICAgIGFjdGl2ZVB1enpsZXMgPSBhY3RpdmVQdXp6bGVzLmZpbHRlcihcbiAgICAgIChhY3RpdmVQdXp6bGUpID0+IGFjdGl2ZVB1enpsZS5wdXp6bGVJZCAhPT0gcHV6emxlLnB1enpsZUlkLFxuICAgICk7XG4gIH1cblxuICBmdW5jdGlvbiBnZXRDb21wbGV0ZWRQdXp6bGVzKCkge1xuICAgIHJldHVybiBhbGxQdXp6bGVzLmZpbHRlcigocHV6emxlKSA9PiBwdXp6bGUuaXNDb21wbGV0ZSgpKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGdldEluY29tcGxldGVQdXp6bGVzKCkge1xuICAgIHJldHVybiBhbGxQdXp6bGVzLmZpbHRlcigocHV6emxlKSA9PiAhcHV6emxlLmlzQ29tcGxldGUoKSk7XG4gIH1cblxuICBmdW5jdGlvbiBnZXRJbmFjdGl2ZUNvbXBsZXRlZFB1enpsZXMoKSB7XG4gICAgcmV0dXJuIGdldEluY29tcGxldGVQdXp6bGVzKCkuZmlsdGVyKFxuICAgICAgKHB1enpsZSkgPT4gIWFjdGl2ZVB1enpsZXMuaW5jbHVkZXMocHV6emxlKSxcbiAgICApO1xuICB9XG5cbiAgZnVuY3Rpb24gc29ydFB1enpsZXNCeVNvbHZlVGltZShhLCBiKSB7XG4gICAgY29uc3QgYVRpbWUgPSBhLmF2ZXJhZ2VTb2x2ZVRpbWUoKTtcbiAgICBjb25zdCBiVGltZSA9IGIuYXZlcmFnZVNvbHZlVGltZSgpO1xuXG4gICAgaWYgKGFUaW1lID09PSBudWxsICYmIGJUaW1lID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gMDtcbiAgICB9XG4gICAgaWYgKGFUaW1lID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gMTtcbiAgICB9XG4gICAgaWYgKGJUaW1lID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gLTE7XG4gICAgfVxuICAgIHJldHVybiBhVGltZSAtIGJUaW1lO1xuICB9XG5cbiAgYXN5bmMgZnVuY3Rpb24gZ2V0TmV4dFB1enpsZSgpIHtcbiAgICBjb25zdCBwcmV2aW91cyA9IGN1cnJlbnRQdXp6bGUgPyBjdXJyZW50UHV6emxlLnB1enpsZUlkIDogbnVsbDtcblxuICAgIGNvbnN0IHR5cGUgPSBnZXROZXh0UHV6emxlVHlwZSgpO1xuXG4gICAgY29uc3QgYWxyZWFkeUNvbXBsZXRlID0gYWN0aXZlUHV6emxlcy5maWx0ZXIoKHB1enpsZSkgPT5cbiAgICAgIHB1enpsZS5pc0NvbXBsZXRlKCksXG4gICAgKTtcbiAgICBjb25zdCBpbmNvbXBsZXRlID0gYWN0aXZlUHV6emxlcy5maWx0ZXIoKHB1enpsZSkgPT4gIXB1enpsZS5pc0NvbXBsZXRlKCkpO1xuXG4gICAgbGV0IGNhbmRpZGF0ZVB1enpsZTtcbiAgICBpZiAoXG4gICAgICAodHlwZSA9PT0gXCJhbHJlYWR5Q29tcGxldGVcIiAmJiBhbHJlYWR5Q29tcGxldGUubGVuZ3RoID4gMCkgfHxcbiAgICAgIGluY29tcGxldGUubGVuZ3RoIDwgMVxuICAgICkge1xuICAgICAgY2FuZGlkYXRlUHV6emxlID0gVXRpbC5nZXRSYW5kb21FbGVtZW50KGFjdGl2ZVB1enpsZXMpO1xuICAgIH0gZWxzZSB7XG4gICAgICBjYW5kaWRhdGVQdXp6bGUgPSBVdGlsLmdldFJhbmRvbUVsZW1lbnQoaW5jb21wbGV0ZSk7XG4gICAgfVxuXG4gICAgaWYgKGFjdGl2ZVB1enpsZXMubGVuZ3RoID4gMSAmJiBjYW5kaWRhdGVQdXp6bGUucHV6emxlSWQgPT09IHByZXZpb3VzKSB7XG4gICAgICByZXR1cm4gZ2V0TmV4dFB1enpsZSgpO1xuICAgIH1cblxuICAgIGN1cnJlbnRQdXp6bGUgPSBhbGxQdXp6bGVzLmZpbmQoXG4gICAgICAocHV6emxlKSA9PiBwdXp6bGUucHV6emxlSWQgPT09IGNhbmRpZGF0ZVB1enpsZS5wdXp6bGVJZCxcbiAgICApO1xuXG4gICAgY29uc3QgZGF0YSA9IGF3YWl0IGdldFB1enpsZURhdGEoY3VycmVudFB1enpsZS5wdXp6bGVJZCk7XG5cbiAgICBpZiAoZGF0YSA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIGdldE5leHRQdXp6bGUoKTtcbiAgICB9XG5cbiAgICByZXR1cm4gZGF0YTtcbiAgfVxuXG4gIGFzeW5jIGZ1bmN0aW9uIGdldFB1enpsZURhdGEocHV6emxlSWQpIHtcbiAgICAvLyBDaGVjayBjYWNoZSBmaXJzdFxuICAgIGlmICgkcHV6emxlRGF0YVN0b3JlW3B1enpsZUlkXSkge1xuICAgICAgcmV0dXJuICRwdXp6bGVEYXRhU3RvcmVbcHV6emxlSWRdO1xuICAgIH1cblxuICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZmV0Y2goYGh0dHBzOi8vbGljaGVzcy5vcmcvYXBpL3B1enpsZS8ke3B1enpsZUlkfWApO1xuXG4gICAgaWYgKHJlc3BvbnNlLnN0YXR1cyA9PT0gNDA0KSB7XG4gICAgICAvLyBSZW1vdmUgaW52YWxpZFxuICAgICAgcmVtb3ZlUHV6emxlSWQocHV6emxlSWQpO1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgY29uc3QgcHV6emxlRGF0YSA9IGF3YWl0IHJlc3BvbnNlLmpzb24oKTtcbiAgICBjb25zdCBkYXRhID0gJHB1enpsZURhdGFTdG9yZTtcbiAgICBkYXRhW2N1cnJlbnRQdXp6bGUucHV6emxlSWRdID0gcHV6emxlRGF0YTtcbiAgICBwdXp6bGVEYXRhU3RvcmUuc2V0KGRhdGEpO1xuICAgIHJldHVybiBwdXp6bGVEYXRhO1xuICB9XG5cbiAgZnVuY3Rpb24gZ2V0TmV4dFB1enpsZVR5cGUoKSB7XG4gICAgY29uc3QgcmFuZG9tVmFsdWUgPSBNYXRoLnJhbmRvbSgpO1xuICAgIGlmIChyYW5kb21WYWx1ZSA8IGFscmVhZHlDb21wbGV0ZU9kZHMpIHtcbiAgICAgIHJldHVybiBcImFscmVhZHlDb21wbGV0ZVwiO1xuICAgIH1cbiAgICByZXR1cm4gXCJpbmNvbXBsZXRlXCI7XG4gIH1cblxuICBhc3luYyBmdW5jdGlvbiBza2lwKCkge1xuICAgIGNvbnN0IHJlc3VsdCA9IG5ldyBSZXN1bHQoY3VycmVudFB1enpsZS5wdXp6bGVJZCwgcHV6emxlU2hvd25BdCwgdHJ1ZSk7XG4gICAgYWRkUmVzdWx0KGN1cnJlbnRQdXp6bGUucHV6emxlSWQsIHJlc3VsdCk7XG4gICAgYXdhaXQgbG9hZE5leHRQdXp6bGUoKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGFkZFJlc3VsdChwdXp6bGVJZCwgcmVzdWx0KSB7XG4gICAgY29uc3QgYWxsUmVzdWx0cyA9ICRyZXN1bHRzO1xuICAgIGNvbnN0IGV4aXN0aW5nUmVzdWx0cyA9ICRyZXN1bHRzW3B1enpsZUlkXSB8fCBbXTtcbiAgICBleGlzdGluZ1Jlc3VsdHMucHVzaChyZXN1bHQpO1xuICAgIGFsbFJlc3VsdHNbcHV6emxlSWRdID0gZXhpc3RpbmdSZXN1bHRzO1xuICAgIHJlc3VsdHMuc2V0KGFsbFJlc3VsdHMpO1xuICB9XG5cbiAgZnVuY3Rpb24gYWRkQ29tcGxldGVkUHV6emxlKHB1enpsZVRvQWRkKSB7XG4gICAgY29tcGxldGVkUHV6emxlcyA9IFtcbiAgICAgIC4uLm5ldyBTZXQoW1xuICAgICAgICAuLi5nZXRDb21wbGV0ZWRQdXp6bGVzKCkubWFwKChwdXp6bGUpID0+IHB1enpsZS5wdXp6bGVJZCksXG4gICAgICAgIHB1enpsZVRvQWRkLnB1enpsZUlkLFxuICAgICAgXSksXG4gICAgXS5tYXAoKHB1enpsZUlkKSA9PiBuZXcgUHV6emxlKHB1enpsZUlkKSk7XG4gIH1cblxuICBmdW5jdGlvbiByZW1vdmVDb21wbGV0ZWRQdXp6bGUocHV6emxlVG9SZW1vdmUpIHtcbiAgICBjb21wbGV0ZWRQdXp6bGVzID0gY29tcGxldGVkUHV6emxlcy5maWx0ZXIoXG4gICAgICAocHV6emxlKSA9PiBwdXp6bGUucHV6emxlSWQgIT09IHB1enpsZVRvUmVtb3ZlLnB1enpsZUlkLFxuICAgICk7XG4gIH1cblxuICBhc3luYyBmdW5jdGlvbiBsb2FkTmV4dFB1enpsZSgpIHtcbiAgICBwdXp6bGVDb21wbGV0ZSA9IGZhbHNlO1xuICAgIG1hZGVNaXN0YWtlID0gZmFsc2U7XG5cbiAgICBpZiAoY3VycmVudFB1enpsZSAmJiBjdXJyZW50UHV6emxlLmlzQ29tcGxldGUoKSkge1xuICAgICAgcmVtb3ZlQWN0aXZlUHV6emxlKGN1cnJlbnRQdXp6bGUpO1xuICAgICAgYWRkQ29tcGxldGVkUHV6emxlKGN1cnJlbnRQdXp6bGUpO1xuICAgIH1cblxuICAgIGNvbnN0IG5leHQgPSBhd2FpdCBnZXROZXh0UHV6emxlKCk7XG4gICAgb3JpZW50YXRpb24gPSBVdGlsLndob3NlTW92ZUlzSXQobmV4dC5wdXp6bGUuaW5pdGlhbFBseSArIDEpO1xuICAgIC8vIENsb25lIHNvIHdlIGRvbid0IGNhY2hlIGEgdmFsdWUgdGhhdCBnZXRzIHNoaWZ0ZWQgbGF0ZXJcbiAgICBtb3ZlcyA9IFsuLi5uZXh0LnB1enpsZS5zb2x1dGlvbl07XG5cbiAgICBjb25zdCBjaGVzc0luc3RhbmNlID0gbmV3IENoZXNzKCk7XG4gICAgY2hlc3NJbnN0YW5jZS5sb2FkUGduKG5leHQuZ2FtZS5wZ24pO1xuICAgIGNvbnN0IGhpc3RvcnkgPSBjaGVzc0luc3RhbmNlLmhpc3RvcnkoeyB2ZXJib3NlOiB0cnVlIH0pO1xuICAgIGxhc3RNb3ZlID0gaGlzdG9yeVtoaXN0b3J5Lmxlbmd0aCAtIDFdO1xuICAgIGZlbiA9IGNoZXNzSW5zdGFuY2UuZmVuKCk7XG5cbiAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgIHB1enpsZVNob3duQXQgPSBVdGlsLmN1cnJlbnRNaWNyb3RpbWUoKTtcbiAgICB9LCAzMDApO1xuICB9XG5cbiAgZnVuY3Rpb24gaGFuZGxlVXNlck1vdmUobW92ZUV2ZW50KSB7XG4gICAgY29uc3QgbW92ZSA9IG1vdmVFdmVudC5kZXRhaWwubW92ZTtcbiAgICBjb25zdCBpc0NoZWNrbWF0ZSA9IG1vdmVFdmVudC5kZXRhaWwuaXNDaGVja21hdGU7XG4gICAgY29uc3QgY29ycmVjdE1vdmUgPSBtb3Zlc1swXTtcbiAgICBpZiAobW92ZS5sYW4gPT09IGNvcnJlY3RNb3ZlIHx8IGlzQ2hlY2ttYXRlKSB7XG4gICAgICBtb3Zlcy5zaGlmdCgpOyAvLyByZW1vdmUgdGhlIHVzZXIgbW92ZSBmaXJzdFxuICAgICAgY29uc3QgY29tcHV0ZXJNb3ZlID0gbW92ZXMuc2hpZnQoKTtcbiAgICAgIGlmIChjb21wdXRlck1vdmUpIHtcbiAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgY2hlc3Nib2FyZC5tb3ZlKGNvbXB1dGVyTW92ZSk7XG4gICAgICAgIH0sIDMwMCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gaGFuZGxlUHV6emxlQ29tcGxldGUoKTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgbWFkZU1pc3Rha2UgPSB0cnVlO1xuICAgICAgc2hvd0ZhaWx1cmUoXCJOb3BlIVwiKTtcbiAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICBjaGVzc2JvYXJkLnVuZG8oKTtcbiAgICAgIH0sIDMwMCk7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gaGFuZGxlUHV6emxlQ29tcGxldGUoKSB7XG4gICAgcHV6emxlQ29tcGxldGUgPSB0cnVlO1xuICAgIGNvbnN0IHJlc3VsdCA9IG5ldyBSZXN1bHQoXG4gICAgICBjdXJyZW50UHV6emxlLnB1enpsZUlkLFxuICAgICAgcHV6emxlU2hvd25BdCxcbiAgICAgIGZhbHNlLFxuICAgICAgbWFkZU1pc3Rha2UsXG4gICAgICBVdGlsLmN1cnJlbnRNaWNyb3RpbWUoKSxcbiAgICApO1xuICAgIGFkZFJlc3VsdChjdXJyZW50UHV6emxlLnB1enpsZUlkLCByZXN1bHQpO1xuICAgIGlmIChtYWRlTWlzdGFrZSkge1xuICAgICAgcmVtb3ZlQ29tcGxldGVkUHV6emxlKGN1cnJlbnRQdXp6bGUpO1xuICAgIH1cbiAgICAvLyBUcmlnZ2VyIHJlYWN0aXZpdHlcbiAgICBhY3RpdmVQdXp6bGVzID0gYWN0aXZlUHV6emxlcztcbiAgICBzaG93U3VjY2VzcyhcIkNvcnJlY3QhXCIpO1xuICB9XG5cbiAgbGV0IHN1Y2Nlc3NNZXNzYWdlID0gbnVsbDtcblxuICBmdW5jdGlvbiBzaG93U3VjY2VzcyhtZXNzYWdlLCBkdXJhdGlvbiA9IDE1MDApIHtcbiAgICBmYWlsdXJlTWVzc2FnZSA9IG51bGw7XG4gICAgc3VjY2Vzc01lc3NhZ2UgPSBtZXNzYWdlO1xuICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgc3VjY2Vzc01lc3NhZ2UgPSBudWxsO1xuICAgIH0sIGR1cmF0aW9uKTtcbiAgfVxuXG4gIGxldCBmYWlsdXJlTWVzc2FnZSA9IG51bGw7XG5cbiAgZnVuY3Rpb24gc2hvd0ZhaWx1cmUobWVzc2FnZSwgZHVyYXRpb24gPSAxMDAwKSB7XG4gICAgc3VjY2Vzc01lc3NhZ2UgPSBudWxsO1xuICAgIGZhaWx1cmVNZXNzYWdlID0gbWVzc2FnZTtcbiAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgIGZhaWx1cmVNZXNzYWdlID0gbnVsbDtcbiAgICB9LCBkdXJhdGlvbik7XG4gIH1cblxuICBmdW5jdGlvbiBpbml0aWFsaXplUHV6emxlcygpIHtcbiAgICBhbGxQdXp6bGVzID0gW107XG4gICAgJHB1enpsZUlkc1RvV29ya09uLmZvckVhY2goKHB1enpsZUlkKSA9PiB7XG4gICAgICBhbGxQdXp6bGVzLnB1c2gobmV3IFB1enpsZShwdXp6bGVJZCkpO1xuICAgIH0pO1xuICAgIGNvbXBsZXRlZFB1enpsZXMgPSBnZXRDb21wbGV0ZWRQdXp6bGVzKCk7XG4gICAgZmlsbEFjdGl2ZVB1enpsZXMoKTtcbiAgfVxuXG4gIG9uTW91bnQoYXN5bmMgKCkgPT4ge1xuICAgIGluaXRpYWxpemVQdXp6bGVzKCk7XG4gICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihcImtleWRvd25cIiwgZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICBpZiAoW1wiRW50ZXJcIiwgXCIgXCJdLmluY2x1ZGVzKGV2ZW50LmtleSkgJiYgbmV4dEJ1dHRvbikge1xuICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICBuZXh0QnV0dG9uLmNsaWNrKCk7XG4gICAgICB9XG4gICAgfSk7XG4gICAgYXdhaXQgbG9hZE5leHRQdXp6bGUoKTtcbiAgfSk7XG48L3NjcmlwdD5cblxuPGRpdiBjbGFzcz1cImNvbHVtbnMgaXMtY2VudGVyZWRcIj5cbiAgPGRpdiBjbGFzcz1cImNvbHVtbiBpcy02LWRlc2t0b3BcIj5cbiAgICA8ZGl2IGNsYXNzPVwiYmxvY2tcIj5cbiAgICAgIHsjaWYgYWN0aXZlUHV6emxlcy5sZW5ndGggPiAwICYmIGN1cnJlbnRQdXp6bGV9XG4gICAgICAgIDxDaGVzc2JvYXJkXG4gICAgICAgICAge2Zlbn1cbiAgICAgICAgICB7bGFzdE1vdmV9XG4gICAgICAgICAge2NoZXNzZ3JvdW5kQ29uZmlnfVxuICAgICAgICAgIHtvcmllbnRhdGlvbn1cbiAgICAgICAgICBiaW5kOnRoaXM9e2NoZXNzYm9hcmR9XG4gICAgICAgICAgb246bW92ZT17aGFuZGxlVXNlck1vdmV9XG4gICAgICAgID5cbiAgICAgICAgICA8ZGl2IHNsb3Q9XCJjZW50ZXJlZC1jb250ZW50XCI+XG4gICAgICAgICAgICB7I2lmIHN1Y2Nlc3NNZXNzYWdlfVxuICAgICAgICAgICAgICA8c3BhbiB0cmFuc2l0aW9uOmZhZGUgY2xhc3M9XCJ0YWcgaXMtc3VjY2VzcyBpcy1zaXplLTRcIj5cbiAgICAgICAgICAgICAgICB7c3VjY2Vzc01lc3NhZ2V9XG4gICAgICAgICAgICAgIDwvc3Bhbj5cbiAgICAgICAgICAgIHsvaWZ9XG4gICAgICAgICAgICB7I2lmIGZhaWx1cmVNZXNzYWdlfVxuICAgICAgICAgICAgICA8c3BhbiB0cmFuc2l0aW9uOmZhZGUgY2xhc3M9XCJ0YWcgaXMtZGFuZ2VyIGlzLXNpemUtNFwiPlxuICAgICAgICAgICAgICAgIHtmYWlsdXJlTWVzc2FnZX1cbiAgICAgICAgICAgICAgPC9zcGFuPlxuICAgICAgICAgICAgey9pZn1cbiAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICA8ZGl2IHNsb3Q9XCJiZWxvdy1ib2FyZFwiPlxuICAgICAgICAgICAgeyNpZiBwdXp6bGVDb21wbGV0ZX1cbiAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImJsb2NrIGlzLWZsZXggaXMtanVzdGlmeS1jb250ZW50LWNlbnRlclwiPlxuICAgICAgICAgICAgICAgIDxidXR0b25cbiAgICAgICAgICAgICAgICAgIGNsYXNzPVwiYnV0dG9uIGlzLXByaW1hcnlcIlxuICAgICAgICAgICAgICAgICAgYmluZDp0aGlzPXtuZXh0QnV0dG9ufVxuICAgICAgICAgICAgICAgICAgb246Y2xpY2s9e2FzeW5jICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgYXdhaXQgbG9hZE5leHRQdXp6bGUoKTtcbiAgICAgICAgICAgICAgICAgIH19XG4gICAgICAgICAgICAgICAgICA+TmV4dFxuICAgICAgICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIHsvaWZ9XG4gICAgICAgICAgICB7I2lmICFwdXp6bGVDb21wbGV0ZX1cbiAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImJsb2NrIGlzLWZsZXggaXMtanVzdGlmeS1jb250ZW50LWNlbnRlclwiPlxuICAgICAgICAgICAgICAgIDxzcGFuIGNsYXNzPVwidGFnIGlzLXtvcmllbnRhdGlvbn0gaXMtc2l6ZS00XCJcbiAgICAgICAgICAgICAgICAgID57b3JpZW50YXRpb259IHRvIHBsYXk8L3NwYW5cbiAgICAgICAgICAgICAgICA+XG4gICAgICAgICAgICAgICAgPGJ1dHRvbiBjbGFzcz1cImJ1dHRvbiBpcy1wcmltYXJ5XCIgb246Y2xpY2s9e3NraXB9PlNraXA8L2J1dHRvbj5cbiAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICB7L2lmfVxuICAgICAgICAgIDwvZGl2PlxuICAgICAgICA8L0NoZXNzYm9hcmQ+XG4gICAgICB7OmVsc2V9XG4gICAgICAgIDxwPkFsbCBwdXp6bGVzIGNvbXBsZXRlLCBhZGQgc29tZSBtb3JlITwvcD5cbiAgICAgIHsvaWZ9XG4gICAgPC9kaXY+XG4gIDwvZGl2PlxuICA8ZGl2IGNsYXNzPVwiY29sdW1uIGlzLTQtZGVza3RvcFwiPlxuICAgIHsjaWYgYWN0aXZlUHV6emxlcy5sZW5ndGggPj0gMSAmJiBjdXJyZW50UHV6emxlfVxuICAgICAgPGRpdiBjbGFzcz1cImJveFwiPlxuICAgICAgICA8aDM+Q3VycmVudCBQdXp6bGVzPC9oMz5cbiAgICAgICAgPHRhYmxlIGNsYXNzPVwidGFibGUgaXMtZnVsbHdpZHRoIGlzLW5hcnJvdyBpcy1zdHJpcGVkXCI+XG4gICAgICAgICAgPHRoZWFkPlxuICAgICAgICAgICAgPHRyPlxuICAgICAgICAgICAgICA8dGg+PGFiYnIgdGl0bGU9XCJMaWNoZXNzIFB1enpsZSBJRFwiPklEPC9hYmJyPjwvdGg+XG4gICAgICAgICAgICAgIDx0aD48YWJiciB0aXRsZT1cIkF2ZXJhZ2Ugc29sdmUgdGltZVwiPkF2ZzwvYWJicj48L3RoPlxuICAgICAgICAgICAgICA8dGg+PGFiYnIgdGl0bGU9XCJDb3JyZWN0IHNvbHZlcyBpbiBhIHJvd1wiPlN0cmVhazwvYWJicj48L3RoPlxuICAgICAgICAgICAgICA8dGg+PGFiYnIgdGl0bGU9XCJUb3RhbCBjb3JyZWN0IHNvbHZlc1wiPlNvbHZlczwvYWJicj48L3RoPlxuICAgICAgICAgICAgICA8dGg+PGFiYnIgdGl0bGU9XCJGYWlsdXJlIENvdW50XCI+RmFpbHM8L2FiYnI+PC90aD5cbiAgICAgICAgICAgIDwvdHI+XG4gICAgICAgICAgPC90aGVhZD5cbiAgICAgICAgICA8dGJvZHk+XG4gICAgICAgICAgICB7I2VhY2ggYWN0aXZlUHV6emxlcy5zb3J0KHNvcnRQdXp6bGVzQnlTb2x2ZVRpbWUpIGFzIHB1enpsZSAocHV6emxlKX1cbiAgICAgICAgICAgICAgPHRyXG4gICAgICAgICAgICAgICAgYW5pbWF0ZTpmbGlwPXt7IGR1cmF0aW9uOiA0MDAgfX1cbiAgICAgICAgICAgICAgICBjbGFzczppcy1zZWxlY3RlZD17Y3VycmVudFB1enpsZS5wdXp6bGVJZCA9PT0gcHV6emxlLnB1enpsZUlkfVxuICAgICAgICAgICAgICA+XG4gICAgICAgICAgICAgICAgPHRkIGNsYXNzPVwicHV6emxlLWlkXCJcbiAgICAgICAgICAgICAgICAgID48YVxuICAgICAgICAgICAgICAgICAgICBocmVmPXtwdXp6bGUubGljaGVzc1VybCgpfVxuICAgICAgICAgICAgICAgICAgICB0YXJnZXQ9XCJfYmxhbmtcIlxuICAgICAgICAgICAgICAgICAgICB0aXRsZT1cIlZpZXcgb24gbGljaGVzcy5vcmdcIj57cHV6emxlLnB1enpsZUlkfTwvYVxuICAgICAgICAgICAgICAgICAgPjwvdGRcbiAgICAgICAgICAgICAgICA+XG4gICAgICAgICAgICAgICAgPHRkXG4gICAgICAgICAgICAgICAgICBjbGFzczpoYXMtdGV4dC13YXJuaW5nPXtwdXp6bGUuYXZlcmFnZVNvbHZlVGltZSgpID4gdGltZUdvYWx9XG4gICAgICAgICAgICAgICAgICBjbGFzczpoYXMtdGV4dC1zdWNjZXNzPXtwdXp6bGUuYXZlcmFnZVNvbHZlVGltZSgpIDw9XG4gICAgICAgICAgICAgICAgICAgIHRpbWVHb2FsICYmIHB1enpsZS5hdmVyYWdlU29sdmVUaW1lKCkgPiAwfVxuICAgICAgICAgICAgICAgID5cbiAgICAgICAgICAgICAgICAgIHtwdXp6bGUuYXZlcmFnZVNvbHZlVGltZSgpXG4gICAgICAgICAgICAgICAgICAgID8gYCR7KHB1enpsZS5hdmVyYWdlU29sdmVUaW1lKCkgLyAxMDAwKS50b0ZpeGVkKDIpfXNgXG4gICAgICAgICAgICAgICAgICAgIDogXCI/XCJ9XG4gICAgICAgICAgICAgICAgPC90ZD5cbiAgICAgICAgICAgICAgICA8dGRcbiAgICAgICAgICAgICAgICAgIGNsYXNzOmhhcy10ZXh0LXdhcm5pbmc9e3B1enpsZS5nZXRTb2x2ZVN0cmVhaygpIDxcbiAgICAgICAgICAgICAgICAgICAgbWluaW11bVNvbHZlc31cbiAgICAgICAgICAgICAgICAgIGNsYXNzOmhhcy10ZXh0LXN1Y2Nlc3M9e3B1enpsZS5nZXRTb2x2ZVN0cmVhaygpID49XG4gICAgICAgICAgICAgICAgICAgIG1pbmltdW1Tb2x2ZXN9XG4gICAgICAgICAgICAgICAgPlxuICAgICAgICAgICAgICAgICAge3B1enpsZS5nZXRTb2x2ZVN0cmVhaygpfSAvIHttaW5pbXVtU29sdmVzfVxuICAgICAgICAgICAgICAgIDwvdGQ+XG4gICAgICAgICAgICAgICAgPHRkPlxuICAgICAgICAgICAgICAgICAge3B1enpsZS5nZXRUb3RhbFNvbHZlcygpfVxuICAgICAgICAgICAgICAgIDwvdGQ+XG4gICAgICAgICAgICAgICAgPHRkPlxuICAgICAgICAgICAgICAgICAge3B1enpsZS5nZXRGYWlsdXJlQ291bnQoKX1cbiAgICAgICAgICAgICAgICA8L3RkPlxuICAgICAgICAgICAgICA8L3RyPlxuICAgICAgICAgICAgey9lYWNofVxuICAgICAgICAgIDwvdGJvZHk+XG4gICAgICAgIDwvdGFibGU+XG4gICAgICA8L2Rpdj5cbiAgICB7L2lmfVxuICAgIDxkaXYgY2xhc3M9XCJib3hcIj5cbiAgICAgIDxkaXYgY2xhc3M9XCJibG9ja1wiPlxuICAgICAgICA8cD48c3Ryb25nPnskcHV6emxlSWRzVG9Xb3JrT24ubGVuZ3RofTwvc3Ryb25nPiB0b3RhbCBwdXp6bGVzPC9wPlxuICAgICAgICA8cD5Eb25lIHdpdGggPHN0cm9uZz57Y29tcGxldGVkUHV6emxlcy5sZW5ndGh9PC9zdHJvbmc+IHB1enpsZXM8L3A+XG4gICAgICAgIDxwPlxuICAgICAgICAgIFRhcmdldCBzb2x2ZSB0aW1lOiA8c3Ryb25nPnsodGltZUdvYWwgLyAxMDAwKS50b0ZpeGVkKDEpfTwvc3Ryb25nPiBzZWNvbmRzXG4gICAgICAgIDwvcD5cbiAgICAgICAgPHA+XG4gICAgICAgICAgTXVzdCBzb2x2ZSA8c3Ryb25nPnttaW5pbXVtU29sdmVzfTwvc3Ryb25nPiB0aW1le21pbmltdW1Tb2x2ZXMgPiAxXG4gICAgICAgICAgICA/IFwic1wiXG4gICAgICAgICAgICA6IFwiXCJ9IGluIGEgcm93XG4gICAgICAgIDwvcD5cbiAgICAgIDwvZGl2PlxuICAgICAgPGRpdiBjbGFzcz1cImJsb2NrXCI+XG4gICAgICAgIDxmb3JtIG9uOnN1Ym1pdHxwcmV2ZW50RGVmYXVsdD17YWRkUHV6emxlSWRUb1dvcmtPbn0+XG4gICAgICAgICAgPGxhYmVsIGZvcj1cIm5ld1B1enpsZUlkXCI+TmV3IFB1enpsZSBJRChzKTo8L2xhYmVsPlxuICAgICAgICAgIDxpbnB1dFxuICAgICAgICAgICAgdHlwZT1cInRleHRcIlxuICAgICAgICAgICAgaWQ9XCJuZXdQdXp6bGVJZFwiXG4gICAgICAgICAgICBiaW5kOnZhbHVlPXtuZXdQdXp6bGVJZHN9XG4gICAgICAgICAgICBwbGFjZWhvbGRlcj1cIlwiXG4gICAgICAgICAgLz5cbiAgICAgICAgICA8YnIgLz5cbiAgICAgICAgICA8YnV0dG9uIGNsYXNzPVwiYnV0dG9uIGlzLXByaW1hcnlcIiB0eXBlPVwic3VibWl0XCI+QWRkPC9idXR0b24+XG4gICAgICAgIDwvZm9ybT5cbiAgICAgIDwvZGl2PlxuICAgIDwvZGl2PlxuICAgIDxDb2xsYXBzaWJsZUJveCB0aXRsZT1cIlB1enpsZSBIaXN0b3J5IEhlbHBlclwiPlxuICAgICAgPFB1enpsZUhpc3RvcnlQcm9jZXNzb3IgLz5cbiAgICA8L0NvbGxhcHNpYmxlQm94PlxuICA8L2Rpdj5cbjwvZGl2PlxuXG48c3R5bGU+XG4gIC5wdXp6bGUtaWQge1xuICAgIGZvbnQtZmFtaWx5OiBtb25vc3BhY2U7XG4gIH1cbjwvc3R5bGU+XG4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBbW5CRSx5QkFBVyxDQUNULFdBQVcsQ0FBRSxTQUNmIn0= */");
}

function get_each_context$2(ctx, list, i) {
	const child_ctx = ctx.slice();
	child_ctx[54] = list[i];
	return child_ctx;
}

// (533:6) {:else}
function create_else_block$2(ctx) {
	let p;

	const block = {
		c: function create() {
			p = element("p");
			p.textContent = "All puzzles complete, add some more!";
			add_location(p, file$9, 533, 8, 13724);
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
		source: "(533:6) {:else}",
		ctx
	});

	return block;
}

// (489:6) {#if activePuzzles.length > 0 && currentPuzzle}
function create_if_block_1$2(ctx) {
	let chessboard_1;
	let current;

	let chessboard_1_props = {
		fen: /*fen*/ ctx[1],
		lastMove: /*lastMove*/ ctx[2],
		chessgroundConfig: /*chessgroundConfig*/ ctx[13],
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

	/*chessboard_1_binding*/ ctx[26](chessboard_1);
	chessboard_1.$on("move", /*handleUserMove*/ ctx[22]);

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

			if (dirty[0] & /*orientation, puzzleComplete, nextButton, failureMessage, successMessage*/ 3472 | dirty[1] & /*$$scope*/ 67108864) {
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
			/*chessboard_1_binding*/ ctx[26](null);
			destroy_component(chessboard_1, detaching);
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_if_block_1$2.name,
		type: "if",
		source: "(489:6) {#if activePuzzles.length > 0 && currentPuzzle}",
		ctx
	});

	return block;
}

// (499:12) {#if successMessage}
function create_if_block_5(ctx) {
	let span;
	let t;
	let span_transition;
	let current;

	const block = {
		c: function create() {
			span = element("span");
			t = text(/*successMessage*/ ctx[10]);
			attr_dev(span, "class", "tag is-success is-size-4");
			add_location(span, file$9, 499, 14, 12554);
		},
		m: function mount(target, anchor) {
			insert_dev(target, span, anchor);
			append_dev(span, t);
			current = true;
		},
		p: function update(ctx, dirty) {
			if (!current || dirty[0] & /*successMessage*/ 1024) set_data_dev(t, /*successMessage*/ ctx[10]);
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
		source: "(499:12) {#if successMessage}",
		ctx
	});

	return block;
}

// (504:12) {#if failureMessage}
function create_if_block_4$1(ctx) {
	let span;
	let t;
	let span_transition;
	let current;

	const block = {
		c: function create() {
			span = element("span");
			t = text(/*failureMessage*/ ctx[11]);
			attr_dev(span, "class", "tag is-danger is-size-4");
			add_location(span, file$9, 504, 14, 12730);
		},
		m: function mount(target, anchor) {
			insert_dev(target, span, anchor);
			append_dev(span, t);
			current = true;
		},
		p: function update(ctx, dirty) {
			if (!current || dirty[0] & /*failureMessage*/ 2048) set_data_dev(t, /*failureMessage*/ ctx[11]);
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
		id: create_if_block_4$1.name,
		type: "if",
		source: "(504:12) {#if failureMessage}",
		ctx
	});

	return block;
}

// (498:10) 
function create_centered_content_slot$1(ctx) {
	let div;
	let t;
	let if_block0 = /*successMessage*/ ctx[10] && create_if_block_5(ctx);
	let if_block1 = /*failureMessage*/ ctx[11] && create_if_block_4$1(ctx);

	const block = {
		c: function create() {
			div = element("div");
			if (if_block0) if_block0.c();
			t = space();
			if (if_block1) if_block1.c();
			attr_dev(div, "slot", "centered-content");
			add_location(div, file$9, 497, 10, 12477);
		},
		m: function mount(target, anchor) {
			insert_dev(target, div, anchor);
			if (if_block0) if_block0.m(div, null);
			append_dev(div, t);
			if (if_block1) if_block1.m(div, null);
		},
		p: function update(ctx, dirty) {
			if (/*successMessage*/ ctx[10]) {
				if (if_block0) {
					if_block0.p(ctx, dirty);

					if (dirty[0] & /*successMessage*/ 1024) {
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

			if (/*failureMessage*/ ctx[11]) {
				if (if_block1) {
					if_block1.p(ctx, dirty);

					if (dirty[0] & /*failureMessage*/ 2048) {
						transition_in(if_block1, 1);
					}
				} else {
					if_block1 = create_if_block_4$1(ctx);
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
		source: "(498:10) ",
		ctx
	});

	return block;
}

// (511:12) {#if puzzleComplete}
function create_if_block_3$1(ctx) {
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
			add_location(button, file$9, 512, 16, 13027);
			attr_dev(div, "class", "block is-flex is-justify-content-center");
			add_location(div, file$9, 511, 14, 12957);
		},
		m: function mount(target, anchor) {
			insert_dev(target, div, anchor);
			append_dev(div, button);
			/*button_binding*/ ctx[24](button);

			if (!mounted) {
				dispose = listen_dev(button, "click", /*click_handler*/ ctx[25], false, false, false, false);
				mounted = true;
			}
		},
		p: noop,
		d: function destroy(detaching) {
			if (detaching) {
				detach_dev(div);
			}

			/*button_binding*/ ctx[24](null);
			mounted = false;
			dispose();
		}
	};

	dispatch_dev("SvelteRegisterBlock", {
		block,
		id: create_if_block_3$1.name,
		type: "if",
		source: "(511:12) {#if puzzleComplete}",
		ctx
	});

	return block;
}

// (523:12) {#if !puzzleComplete}
function create_if_block_2$2(ctx) {
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
			add_location(span, file$9, 524, 16, 13434);
			attr_dev(button, "class", "button is-primary");
			add_location(button, file$9, 527, 16, 13560);
			attr_dev(div, "class", "block is-flex is-justify-content-center");
			add_location(div, file$9, 523, 14, 13364);
		},
		m: function mount(target, anchor) {
			insert_dev(target, div, anchor);
			append_dev(div, span);
			append_dev(span, t0);
			append_dev(span, t1);
			append_dev(div, t2);
			append_dev(div, button);

			if (!mounted) {
				dispose = listen_dev(button, "click", /*skip*/ ctx[20], false, false, false, false);
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
		id: create_if_block_2$2.name,
		type: "if",
		source: "(523:12) {#if !puzzleComplete}",
		ctx
	});

	return block;
}

// (510:10) 
function create_below_board_slot(ctx) {
	let div;
	let t;
	let if_block0 = /*puzzleComplete*/ ctx[7] && create_if_block_3$1(ctx);
	let if_block1 = !/*puzzleComplete*/ ctx[7] && create_if_block_2$2(ctx);

	const block = {
		c: function create() {
			div = element("div");
			if (if_block0) if_block0.c();
			t = space();
			if (if_block1) if_block1.c();
			attr_dev(div, "slot", "below-board");
			add_location(div, file$9, 509, 10, 12885);
		},
		m: function mount(target, anchor) {
			insert_dev(target, div, anchor);
			if (if_block0) if_block0.m(div, null);
			append_dev(div, t);
			if (if_block1) if_block1.m(div, null);
		},
		p: function update(ctx, dirty) {
			if (/*puzzleComplete*/ ctx[7]) {
				if (if_block0) {
					if_block0.p(ctx, dirty);
				} else {
					if_block0 = create_if_block_3$1(ctx);
					if_block0.c();
					if_block0.m(div, t);
				}
			} else if (if_block0) {
				if_block0.d(1);
				if_block0 = null;
			}

			if (!/*puzzleComplete*/ ctx[7]) {
				if (if_block1) {
					if_block1.p(ctx, dirty);
				} else {
					if_block1 = create_if_block_2$2(ctx);
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
		source: "(510:10) ",
		ctx
	});

	return block;
}

// (539:4) {#if activePuzzles.length >= 1 && currentPuzzle}
function create_if_block$4(ctx) {
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

			add_location(h3, file$9, 540, 8, 13921);
			attr_dev(abbr0, "title", "Lichess Puzzle ID");
			add_location(abbr0, file$9, 544, 18, 14063);
			add_location(th0, file$9, 544, 14, 14059);
			attr_dev(abbr1, "title", "Average solve time");
			add_location(abbr1, file$9, 545, 18, 14128);
			add_location(th1, file$9, 545, 14, 14124);
			attr_dev(abbr2, "title", "Correct solves in a row");
			add_location(abbr2, file$9, 546, 18, 14195);
			add_location(th2, file$9, 546, 14, 14191);
			attr_dev(abbr3, "title", "Total correct solves");
			add_location(abbr3, file$9, 547, 18, 14270);
			add_location(th3, file$9, 547, 14, 14266);
			attr_dev(abbr4, "title", "Failure Count");
			add_location(abbr4, file$9, 548, 18, 14342);
			add_location(th4, file$9, 548, 14, 14338);
			add_location(tr, file$9, 543, 12, 14040);
			add_location(thead, file$9, 542, 10, 14020);
			add_location(tbody, file$9, 551, 10, 14435);
			attr_dev(table, "class", "table is-fullwidth is-narrow is-striped");
			add_location(table, file$9, 541, 8, 13954);
			attr_dev(div, "class", "box");
			add_location(div, file$9, 539, 6, 13895);
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
			if (dirty[0] & /*currentPuzzle, activePuzzles, minimumSolves, timeGoal*/ 49217) {
				each_value = ensure_array_like_dev(/*activePuzzles*/ ctx[0].sort(sortPuzzlesBySolveTime));
				for (let i = 0; i < each_blocks.length; i += 1) each_blocks[i].r();
				validate_each_keys(ctx, each_value, get_each_context$2, get_key);
				each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value, each_1_lookup, tbody, fix_and_destroy_block, create_each_block$2, null, get_each_context$2);
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
		id: create_if_block$4.name,
		type: "if",
		source: "(539:4) {#if activePuzzles.length >= 1 && currentPuzzle}",
		ctx
	});

	return block;
}

// (553:12) {#each activePuzzles.sort(sortPuzzlesBySolveTime) as puzzle (puzzle)}
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
			t6 = text(/*minimumSolves*/ ctx[15]);
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
			add_location(a, file$9, 558, 19, 14744);
			attr_dev(td0, "class", "puzzle-id svelte-1oimmcd");
			add_location(td0, file$9, 557, 16, 14703);
			toggle_class(td1, "has-text-warning", /*puzzle*/ ctx[54].averageSolveTime() > /*timeGoal*/ ctx[14]);
			toggle_class(td1, "has-text-success", /*puzzle*/ ctx[54].averageSolveTime() <= /*timeGoal*/ ctx[14] && /*puzzle*/ ctx[54].averageSolveTime() > 0);
			add_location(td1, file$9, 564, 16, 14957);
			toggle_class(td2, "has-text-warning", /*puzzle*/ ctx[54].getSolveStreak() < /*minimumSolves*/ ctx[15]);
			toggle_class(td2, "has-text-success", /*puzzle*/ ctx[54].getSolveStreak() >= /*minimumSolves*/ ctx[15]);
			add_location(td2, file$9, 573, 16, 15377);
			add_location(td3, file$9, 581, 16, 15706);
			add_location(td4, file$9, 584, 16, 15793);
			toggle_class(tr, "is-selected", /*currentPuzzle*/ ctx[6].puzzleId === /*puzzle*/ ctx[54].puzzleId);
			add_location(tr, file$9, 553, 14, 14539);
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

			if (dirty[0] & /*activePuzzles, timeGoal*/ 16385) {
				toggle_class(td1, "has-text-warning", /*puzzle*/ ctx[54].averageSolveTime() > /*timeGoal*/ ctx[14]);
			}

			if (dirty[0] & /*activePuzzles, timeGoal*/ 16385) {
				toggle_class(td1, "has-text-success", /*puzzle*/ ctx[54].averageSolveTime() <= /*timeGoal*/ ctx[14] && /*puzzle*/ ctx[54].averageSolveTime() > 0);
			}

			if (dirty[0] & /*activePuzzles*/ 1 && t4_value !== (t4_value = /*puzzle*/ ctx[54].getSolveStreak() + "")) set_data_dev(t4, t4_value);

			if (dirty[0] & /*activePuzzles, minimumSolves*/ 32769) {
				toggle_class(td2, "has-text-warning", /*puzzle*/ ctx[54].getSolveStreak() < /*minimumSolves*/ ctx[15]);
			}

			if (dirty[0] & /*activePuzzles, minimumSolves*/ 32769) {
				toggle_class(td2, "has-text-success", /*puzzle*/ ctx[54].getSolveStreak() >= /*minimumSolves*/ ctx[15]);
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
		source: "(553:12) {#each activePuzzles.sort(sortPuzzlesBySolveTime) as puzzle (puzzle)}",
		ctx
	});

	return block;
}

// (621:4) <CollapsibleBox title="Puzzle History Helper">
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
		source: "(621:4) <CollapsibleBox title=\\\"Puzzle History Helper\\\">",
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
	let t2_value = /*$puzzleIdsToWorkOn*/ ctx[12].length + "";
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
	let t16_value = (/*minimumSolves*/ ctx[15] > 1 ? "s" : "") + "";
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
	const if_block_creators = [create_if_block_1$2, create_else_block$2];
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
			strong2.textContent = `${(/*timeGoal*/ ctx[14] / 1000).toFixed(1)}`;
			t11 = text(" seconds");
			t12 = space();
			p3 = element("p");
			t13 = text("Must solve ");
			strong3 = element("strong");
			strong3.textContent = `${/*minimumSolves*/ ctx[15]}`;
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
			add_location(div0, file$9, 487, 4, 12204);
			attr_dev(div1, "class", "column is-6-desktop");
			add_location(div1, file$9, 486, 2, 12166);
			add_location(strong0, file$9, 595, 11, 16023);
			add_location(p0, file$9, 595, 8, 16020);
			add_location(strong1, file$9, 596, 21, 16107);
			add_location(p1, file$9, 596, 8, 16094);
			add_location(strong2, file$9, 598, 29, 16203);
			add_location(p2, file$9, 597, 8, 16170);
			add_location(strong3, file$9, 601, 21, 16305);
			add_location(p3, file$9, 600, 8, 16280);
			attr_dev(div2, "class", "block");
			add_location(div2, file$9, 594, 6, 15992);
			attr_dev(label, "for", "newPuzzleId");
			add_location(label, file$9, 608, 10, 16530);
			attr_dev(input, "type", "text");
			attr_dev(input, "id", "newPuzzleId");
			attr_dev(input, "placeholder", "");
			add_location(input, file$9, 609, 10, 16591);
			add_location(br, file$9, 615, 10, 16739);
			attr_dev(button, "class", "button is-primary");
			attr_dev(button, "type", "submit");
			add_location(button, file$9, 616, 10, 16756);
			add_location(form, file$9, 607, 8, 16466);
			attr_dev(div3, "class", "block");
			add_location(div3, file$9, 606, 6, 16438);
			attr_dev(div4, "class", "box");
			add_location(div4, file$9, 593, 4, 15968);
			attr_dev(div5, "class", "column is-4-desktop");
			add_location(div5, file$9, 537, 2, 13802);
			attr_dev(div6, "class", "columns is-centered");
			add_location(div6, file$9, 485, 0, 12130);
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
			set_input_value(input, /*newPuzzleIds*/ ctx[9]);
			append_dev(form, t21);
			append_dev(form, br);
			append_dev(form, t22);
			append_dev(form, button);
			append_dev(div5, t24);
			mount_component(collapsiblebox, div5, null);
			current = true;

			if (!mounted) {
				dispose = [
					listen_dev(input, "input", /*input_input_handler*/ ctx[27]),
					listen_dev(form, "submit", prevent_default(/*addPuzzleIdToWorkOn*/ ctx[19]), false, true, false, false)
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
				} else {
					if_block1 = create_if_block$4(ctx);
					if_block1.c();
					if_block1.m(div5, t1);
				}
			} else if (if_block1) {
				if_block1.d(1);
				if_block1 = null;
			}

			if ((!current || dirty[0] & /*$puzzleIdsToWorkOn*/ 4096) && t2_value !== (t2_value = /*$puzzleIdsToWorkOn*/ ctx[12].length + "")) set_data_dev(t2, t2_value);
			if ((!current || dirty[0] & /*completedPuzzles*/ 32) && t6_value !== (t6_value = /*completedPuzzles*/ ctx[5].length + "")) set_data_dev(t6, t6_value);

			if (dirty[0] & /*newPuzzleIds*/ 512 && input.value !== /*newPuzzleIds*/ ctx[9]) {
				set_input_value(input, /*newPuzzleIds*/ ctx[9]);
			}

			const collapsiblebox_changes = {};

			if (dirty[1] & /*$$scope*/ 67108864) {
				collapsiblebox_changes.$$scope = { dirty, ctx };
			}

			collapsiblebox.$set(collapsiblebox_changes);
		},
		i: function intro(local) {
			if (current) return;
			transition_in(if_block0);
			transition_in(collapsiblebox.$$.fragment, local);
			current = true;
		},
		o: function outro(local) {
			transition_out(if_block0);
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
	component_subscribe($$self, puzzleDataStore, value => $$invalidate(32, $puzzleDataStore = value));
	const puzzleIdsToWorkOn = persisted("puzzles.idsToWorkOn", []);
	validate_store(puzzleIdsToWorkOn, 'puzzleIdsToWorkOn');
	component_subscribe($$self, puzzleIdsToWorkOn, value => $$invalidate(12, $puzzleIdsToWorkOn = value));
	const results = persisted("puzzles.results", {});
	validate_store(results, 'results');
	component_subscribe($$self, results, value => $$invalidate(31, $results = value));

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
			$$invalidate(9, newPuzzleIds = "");
			return;
		}

		const idsToAdd = newPuzzleIds.split(",").map(id => id.trim());
		const currentPuzzleIds = new Set($puzzleIdsToWorkOn);
		idsToAdd.forEach(id => currentPuzzleIds.add(id));
		puzzleIdsToWorkOn.set([...currentPuzzleIds]);
		$$invalidate(9, newPuzzleIds = "");
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
		$$invalidate(7, puzzleComplete = false);
		madeMistake = false;

		if (currentPuzzle && currentPuzzle.isComplete()) {
			removeActivePuzzle(currentPuzzle);
			addCompletedPuzzle(currentPuzzle);
		}

		const next = await getNextPuzzle();
		$$invalidate(4, orientation = Util.whoseMoveIsIt(next.puzzle.initialPly + 1));

		// Clone so we don't cache a value that gets shifted later
		moves = [...next.puzzle.solution];

		const chessInstance = new Chess$1();
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
		$$invalidate(7, puzzleComplete = true);
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
		$$invalidate(11, failureMessage = null);
		$$invalidate(10, successMessage = message);

		setTimeout(
			() => {
				$$invalidate(10, successMessage = null);
			},
			duration
		);
	}

	let failureMessage = null;

	function showFailure(message, duration = 1000) {
		$$invalidate(10, successMessage = null);
		$$invalidate(11, failureMessage = message);

		setTimeout(
			() => {
				$$invalidate(11, failureMessage = null);
			},
			duration
		);
	}

	function initializePuzzles() {
		$$invalidate(23, allPuzzles = []);

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
			$$invalidate(8, nextButton);
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
		$$invalidate(9, newPuzzleIds);
	}

	$$self.$capture_state = () => ({
		Chessboard,
		onMount,
		fade,
		flip,
		Util,
		persisted,
		Chess: Chess$1,
		PuzzleHistoryProcessor,
		CollapsibleBox,
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
		if ('chessgroundConfig' in $$props) $$invalidate(13, chessgroundConfig = $$props.chessgroundConfig);
		if ('allPuzzles' in $$props) $$invalidate(23, allPuzzles = $$props.allPuzzles);
		if ('activePuzzles' in $$props) $$invalidate(0, activePuzzles = $$props.activePuzzles);
		if ('completedPuzzles' in $$props) $$invalidate(5, completedPuzzles = $$props.completedPuzzles);
		if ('currentPuzzle' in $$props) $$invalidate(6, currentPuzzle = $$props.currentPuzzle);
		if ('puzzleShownAt' in $$props) puzzleShownAt = $$props.puzzleShownAt;
		if ('batchSize' in $$props) $$invalidate(35, batchSize = $$props.batchSize);
		if ('timeGoal' in $$props) $$invalidate(14, timeGoal = $$props.timeGoal);
		if ('minimumSolves' in $$props) $$invalidate(15, minimumSolves = $$props.minimumSolves);
		if ('alreadyCompleteOdds' in $$props) alreadyCompleteOdds = $$props.alreadyCompleteOdds;
		if ('moves' in $$props) moves = $$props.moves;
		if ('madeMistake' in $$props) madeMistake = $$props.madeMistake;
		if ('puzzleComplete' in $$props) $$invalidate(7, puzzleComplete = $$props.puzzleComplete);
		if ('nextButton' in $$props) $$invalidate(8, nextButton = $$props.nextButton);
		if ('newPuzzleIds' in $$props) $$invalidate(9, newPuzzleIds = $$props.newPuzzleIds);
		if ('successMessage' in $$props) $$invalidate(10, successMessage = $$props.successMessage);
		if ('failureMessage' in $$props) $$invalidate(11, failureMessage = $$props.failureMessage);
	};

	if ($$props && "$$inject" in $$props) {
		$$self.$inject_state($$props.$$inject);
	}

	$$self.$$.update = () => {
		if ($$self.$$.dirty[0] & /*activePuzzles, allPuzzles*/ 8388609) {
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
	append_styles(target, "svelte-119er7j", ".cell.svelte-119er7j button.svelte-119er7j{width:100%;display:inline-block}@keyframes svelte-119er7j-incorrectAnswer{25%{background-color:red;transform:translateX(-10px)}50%{background-color:red;transform:translateX(10px)}75%{background-color:red;transform:translateX(-10px)}100%{transform:translateX(0px)}}@keyframes svelte-119er7j-correctAnswer{50%{background-color:green;transform:scale(1.01)}100%{transform:scale(1)}}\n/*# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiS25pZ2h0TW92ZXMuc3ZlbHRlIiwic291cmNlcyI6WyJLbmlnaHRNb3Zlcy5zdmVsdGUiXSwic291cmNlc0NvbnRlbnQiOlsiPHNjcmlwdD5cbiAgaW1wb3J0IHsgb25Nb3VudCB9IGZyb20gXCJzdmVsdGVcIjtcblxuICBpbXBvcnQgQ2hlc3Nib2FyZCBmcm9tIFwiLi9jb21wb25lbnRzL0NoZXNzYm9hcmQuc3ZlbHRlXCI7XG4gIGltcG9ydCBQcm9ncmVzc1RpbWVyIGZyb20gXCIuL2NvbXBvbmVudHMvUHJvZ3Jlc3NUaW1lci5zdmVsdGVcIjtcblxuICBpbXBvcnQgeyBrbmlnaHRNb3Zlc0RhdGEgfSBmcm9tIFwic3JjL2tuaWdodF9tb3Zlc19kYXRhXCI7XG4gIGltcG9ydCBDb25maWcgZnJvbSBcInNyYy9sb2NhbF9jb25maWdcIjtcbiAgaW1wb3J0IHsgQ29uZmlnRm9ybSB9IGZyb20gXCJzcmMvbG9jYWxfY29uZmlnXCI7XG4gIGltcG9ydCB7IFV0aWwgfSBmcm9tIFwic3JjL3V0aWxcIjtcblxuICBsZXQgY2hlc3Nncm91bmQ7XG4gIGxldCBqc29uRGF0YSA9IGtuaWdodE1vdmVzRGF0YTtcbiAgbGV0IHBvc2l0aW9uRGF0YSA9IG51bGw7XG4gIGxldCBjb3JyZWN0Q291bnQgPSAwO1xuICBsZXQgaW5jb3JyZWN0Q291bnQgPSAwO1xuXG4gIGxldCBnYW1lUnVubmluZyA9IGZhbHNlO1xuICBsZXQgdGltZVJlbWFpbmluZyA9IG51bGw7XG5cbiAgbGV0IGFuaW1hdGluZyA9IGZhbHNlO1xuICBsZXQgYW5zd2VyU2hvd247XG4gIGxldCBncm91cGVkUGF0aHMgPSBbXTtcbiAgbGV0IGdyb3VwSW5kZXggPSAwO1xuXG4gIGxldCBkaXNhYmxlTmV4dCA9IGZhbHNlO1xuICBsZXQgZGlzYWJsZVByZXYgPSB0cnVlO1xuXG4gICQ6IHtcbiAgICBkaXNhYmxlTmV4dCA9IGdyb3VwSW5kZXggPj0gZ3JvdXBlZFBhdGhzLmxlbmd0aCAtIDE7XG4gICAgZGlzYWJsZVByZXYgPSBncm91cEluZGV4IDw9IDA7XG4gIH1cblxuICAkOiB7XG4gICAgaWYgKGFuc3dlclNob3duICYmIGdyb3VwZWRQYXRocy5sZW5ndGggPiAwICYmIGdyb3VwSW5kZXggPj0gMCkge1xuICAgICAgZHJhd0NvcnJlY3RBcnJvd3MoZ3JvdXBlZFBhdGhzW2dyb3VwSW5kZXhdKTtcbiAgICB9XG4gIH1cblxuICBsZXQgaGlnaFNjb3JlID0gMDtcbiAgbGV0IG1heFBhdGhzVG9EaXNwbGF5T3B0aW9uO1xuICBsZXQgYW5pbWF0aW9uTGVuZ3RoT3B0aW9uO1xuICBsZXQga25pZ2h0U3F1YXJlO1xuICBsZXQga2luZ1NxdWFyZTtcbiAgbGV0IGNvbmZpZztcbiAgbGV0IGNvbmZpZ0Zvcm07XG5cbiAgbGV0IGJvYXJkV2lkdGg7XG5cbiAgbGV0IGJ1dHRvbjE7XG4gIGxldCBidXR0b24yO1xuICBsZXQgYnV0dG9uMztcbiAgbGV0IGJ1dHRvbjQ7XG4gIGxldCBidXR0b241O1xuICBsZXQgYnV0dG9uNjtcblxuICBjb25zdCBjdXN0b21CcnVzaGVzID0ge1xuICAgIGJyYW5kMToge1xuICAgICAga2V5OiBcImJyYW5kMVwiLFxuICAgICAgY29sb3I6IFV0aWwuZ2V0Um9vdENzc1ZhclZhbHVlKFwiLS1icmFuZC1jb2xvci0xXCIpLFxuICAgICAgb3BhY2l0eTogMSxcbiAgICAgIGxpbmVXaWR0aDogMTUsXG4gICAgfSxcbiAgICBicmFuZDI6IHtcbiAgICAgIGtleTogXCJicmFuZDJcIixcbiAgICAgIGNvbG9yOiBVdGlsLmdldFJvb3RDc3NWYXJWYWx1ZShcIi0tYnJhbmQtY29sb3ItMlwiKSxcbiAgICAgIG9wYWNpdHk6IDEsXG4gICAgICBsaW5lV2lkdGg6IDE1LFxuICAgIH0sXG4gICAgYnJhbmQzOiB7XG4gICAgICBrZXk6IFwiYnJhbmQzXCIsXG4gICAgICBjb2xvcjogVXRpbC5nZXRSb290Q3NzVmFyVmFsdWUoXCItLWJyYW5kLWNvbG9yLTNcIiksXG4gICAgICBvcGFjaXR5OiAxLFxuICAgICAgbGluZVdpZHRoOiAxNSxcbiAgICB9LFxuICAgIGJyYW5kNDoge1xuICAgICAga2V5OiBcImJyYW5kNFwiLFxuICAgICAgY29sb3I6IFV0aWwuZ2V0Um9vdENzc1ZhclZhbHVlKFwiLS1icmFuZC1jb2xvci00XCIpLFxuICAgICAgb3BhY2l0eTogMSxcbiAgICAgIGxpbmVXaWR0aDogMTUsXG4gICAgfSxcbiAgICBicmFuZDU6IHtcbiAgICAgIGtleTogXCJicmFuZDVcIixcbiAgICAgIGNvbG9yOiBVdGlsLmdldFJvb3RDc3NWYXJWYWx1ZShcIi0tYnJhbmQtY29sb3ItNVwiKSxcbiAgICAgIG9wYWNpdHk6IDEsXG4gICAgICBsaW5lV2lkdGg6IDE1LFxuICAgIH0sXG4gICAgYnJhbmQ2OiB7XG4gICAgICBrZXk6IFwiYnJhbmQ2XCIsXG4gICAgICBjb2xvcjogVXRpbC5nZXRSb290Q3NzVmFyVmFsdWUoXCItLWJyYW5kLWNvbG9yLTZcIiksXG4gICAgICBvcGFjaXR5OiAxLFxuICAgICAgbGluZVdpZHRoOiAxNSxcbiAgICB9LFxuICAgIGJyYW5kNzoge1xuICAgICAga2V5OiBcImJyYW5kN1wiLFxuICAgICAgY29sb3I6IFV0aWwuZ2V0Um9vdENzc1ZhclZhbHVlKFwiLS1icmFuZC1jb2xvci03XCIpLFxuICAgICAgb3BhY2l0eTogMSxcbiAgICAgIGxpbmVXaWR0aDogMTUsXG4gICAgfSxcbiAgICBicmFuZDg6IHtcbiAgICAgIGtleTogXCJicmFuZDhcIixcbiAgICAgIGNvbG9yOiBVdGlsLmdldFJvb3RDc3NWYXJWYWx1ZShcIi0tYnJhbmQtY29sb3ItOFwiKSxcbiAgICAgIG9wYWNpdHk6IDEsXG4gICAgICBsaW5lV2lkdGg6IDE1LFxuICAgIH0sXG4gICAgYnJhbmQ5OiB7XG4gICAgICBrZXk6IFwiYnJhbmQ5XCIsXG4gICAgICBjb2xvcjogVXRpbC5nZXRSb290Q3NzVmFyVmFsdWUoXCItLWJyYW5kLWNvbG9yLTlcIiksXG4gICAgICBvcGFjaXR5OiAxLFxuICAgICAgbGluZVdpZHRoOiAxNSxcbiAgICB9LFxuICB9O1xuXG4gIGluaXRDb25maWcoKTtcblxuICBsZXQgY2hlc3Nncm91bmRDb25maWcgPSB7XG4gICAgZmVuOiBcIjgvOC84LzgvOC84LzgvOFwiLFxuICAgIGFuaW1hdGlvbjoge1xuICAgICAgZW5hYmxlZDogdHJ1ZSxcbiAgICAgIGR1cmF0aW9uOiBhbmltYXRpb25MZW5ndGhPcHRpb24uZ2V0VmFsdWUoKSxcbiAgICB9LFxuICAgIGhpZ2hsaWdodDoge1xuICAgICAgbGFzdE1vdmU6IGZhbHNlLFxuICAgIH0sXG4gICAgZHJhZ2dhYmxlOiBmYWxzZSxcbiAgICBzZWxlY3RhYmxlOiBmYWxzZSxcbiAgICBkcmF3YWJsZToge1xuICAgICAgYnJ1c2hlczogY3VzdG9tQnJ1c2hlcyxcbiAgICB9LFxuICB9O1xuXG4gIG9uTW91bnQoKCkgPT4ge1xuICAgIGluaXRLZXlib2FyZFNob3J0Y3V0cygpO1xuICAgIG5ld1Bvc2l0aW9uKCk7XG4gIH0pO1xuXG4gIGZ1bmN0aW9uIGdldEJ1dHRvbihpZCkge1xuICAgIHN3aXRjaCAoaWQpIHtcbiAgICAgIGNhc2UgMTpcbiAgICAgICAgcmV0dXJuIGJ1dHRvbjE7XG4gICAgICBjYXNlIDI6XG4gICAgICAgIHJldHVybiBidXR0b24yO1xuICAgICAgY2FzZSAzOlxuICAgICAgICByZXR1cm4gYnV0dG9uMztcbiAgICAgIGNhc2UgNDpcbiAgICAgICAgcmV0dXJuIGJ1dHRvbjQ7XG4gICAgICBjYXNlIDU6XG4gICAgICAgIHJldHVybiBidXR0b241O1xuICAgICAgY2FzZSA2OlxuICAgICAgICByZXR1cm4gYnV0dG9uNjtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBpbml0S2V5Ym9hcmRTaG9ydGN1dHMoKSB7XG4gICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoXCJrZXlkb3duXCIsIChldmVudCkgPT4ge1xuICAgICAgY29uc3Qga2V5ID0gZXZlbnQua2V5O1xuICAgICAgaWYgKGtleSA+PSBcIjFcIiAmJiBrZXkgPD0gXCI2XCIpIHtcbiAgICAgICAgLy8gVHJpZ2dlciBjbGljayBldmVudCBvbiBjb3JyZXNwb25kaW5nIGJ1dHRvblxuICAgICAgICBjb25zdCBidXR0b24gPSBnZXRCdXR0b24ocGFyc2VJbnQoa2V5KSk7XG4gICAgICAgIGJ1dHRvbi5jbGljaygpO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgZnVuY3Rpb24gc3RhcnRUaW1lZEdhbWUoKSB7XG4gICAgcmVzZXQoKTtcbiAgICBnYW1lUnVubmluZyA9IHRydWU7XG4gICAgbmV3UG9zaXRpb24oKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGVuZEdhbWUoKSB7XG4gICAgaWYgKGNvcnJlY3RDb3VudCA+IGhpZ2hTY29yZSAmJiBnYW1lUnVubmluZykge1xuICAgICAgaGlnaFNjb3JlID0gY29ycmVjdENvdW50O1xuICAgIH1cblxuICAgIGdhbWVSdW5uaW5nID0gZmFsc2U7XG4gICAgdGltZVJlbWFpbmluZyA9IG51bGw7XG4gICAgY29ycmVjdENvdW50ID0gMDtcbiAgICBpbmNvcnJlY3RDb3VudCA9IDA7XG4gIH1cblxuICBmdW5jdGlvbiByZXNldCgpIHtcbiAgICBjb3JyZWN0Q291bnQgPSAwO1xuICAgIGluY29ycmVjdENvdW50ID0gMDtcbiAgICBnYW1lUnVubmluZyA9IGZhbHNlO1xuICB9XG5cbiAgZnVuY3Rpb24gZ2V0UmFuZG9tSW5kZXgobWF4KSB7XG4gICAgcmV0dXJuIE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIG1heCk7XG4gIH1cblxuICBmdW5jdGlvbiBnZXRSYW5kb21FbGVtZW50KGFycmF5KSB7XG4gICAgY29uc3QgaW5kZXggPSBnZXRSYW5kb21JbmRleChhcnJheS5sZW5ndGgpO1xuICAgIHJldHVybiBhcnJheVtpbmRleF07XG4gIH1cblxuICBmdW5jdGlvbiBzb3J0UmFuZG9tbHkoYXJyYXkpIHtcbiAgICByZXR1cm4gYXJyYXkuc29ydCgoKSA9PiBNYXRoLnJhbmRvbSgpIC0gMC41KTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGdldE1pbmltdW1Nb3Zlc0ZvckN1cnJlbnRQb3NpdGlvbigpIHtcbiAgICByZXR1cm4gcG9zaXRpb25EYXRhLm1pbl9sZW5ndGg7XG4gIH1cblxuICBmdW5jdGlvbiBnZXRQYXRoc0ZvckN1cnJlbnRQb3NpdGlvbigpIHtcbiAgICByZXR1cm4gcG9zaXRpb25EYXRhLnBhdGhzO1xuICB9XG5cbiAgZnVuY3Rpb24gcHJvY2Vzc0J1dHRvbihpZCkge1xuICAgIGlmIChhbmltYXRpbmcpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY29uc3QgbnVtYmVyID0gcGFyc2VJbnQoaWQpO1xuICAgIGNvbnN0IG1pbmltdW0gPSBnZXRNaW5pbXVtTW92ZXNGb3JDdXJyZW50UG9zaXRpb24oKTtcbiAgICBjb25zdCBidXR0b24gPSBnZXRCdXR0b24obnVtYmVyKTtcbiAgICBpZiAobnVtYmVyID09PSBtaW5pbXVtKSB7XG4gICAgICBjb3JyZWN0Q291bnQgKz0gMTtcbiAgICAgIGFuaW1hdGVFbGVtZW50KGJ1dHRvbiwgXCJjb3JyZWN0QW5zd2VyXCIpO1xuICAgICAgbmV3UG9zaXRpb24oKTtcbiAgICB9IGVsc2Uge1xuICAgICAgaW5jb3JyZWN0Q291bnQgKz0gMTtcbiAgICAgIGFuaW1hdGVFbGVtZW50KGJ1dHRvbiwgXCJpbmNvcnJlY3RBbnN3ZXJcIik7XG4gICAgICBpZiAoZ2FtZVJ1bm5pbmcpIHtcbiAgICAgICAgZW5kR2FtZSgpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgIH1cbiAgICAgIGNvbnN0IGNvcnJlY3RQYXRocyA9IHBvc2l0aW9uRGF0YS5wYXRocztcbiAgICAgIGNvbnN0IHJhbmRvbWx5U29ydGVkID0gc29ydFJhbmRvbWx5KGNvcnJlY3RQYXRocyk7XG4gICAgICBjb25zdCBwYXRoVG9BbmltYXRlID0gcmFuZG9tbHlTb3J0ZWRbMF07XG4gICAgICBjb25zdCBtb3ZlUGFpcnMgPSBnZXRNb3ZlUGFpcnNGcm9tUGF0aChwYXRoVG9BbmltYXRlKTtcbiAgICAgIGRyYXdDb3JyZWN0QXJyb3dzKHJhbmRvbWx5U29ydGVkKTtcbiAgICAgIG1ha2VTZXF1ZW50aWFsTW92ZXMobW92ZVBhaXJzLCAoKSA9PiB7XG4gICAgICAgIG5ld1Bvc2l0aW9uKCk7XG4gICAgICB9KTtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBkcmF3Q29ycmVjdEFycm93cyh2YWxpZFBhdGhzKSB7XG4gICAgY2xlYXJEcmF3aW5ncygpO1xuICAgIGNvbnN0IHNoYXBlcyA9IFtdO1xuICAgIGNvbnN0IGFscmVhZHlEcmF3biA9IG5ldyBTZXQoKTtcbiAgICBjb25zdCBicnVzaEtleXMgPSBPYmplY3Qua2V5cyhjdXN0b21CcnVzaGVzKTtcbiAgICBsZXQgbWF4UGF0aHNUb1Nob3cgPSBtYXhQYXRoc1RvRGlzcGxheU9wdGlvbi5nZXRWYWx1ZSgpO1xuICAgIGlmIChtYXhQYXRoc1RvU2hvdyA8IDEpIHtcbiAgICAgIG1heFBhdGhzVG9TaG93ID0gMTtcbiAgICB9XG4gICAgbWF4UGF0aHNUb1Nob3cgPSA1MDtcblxuICAgIHZhbGlkUGF0aHMuZm9yRWFjaCgocGF0aCwgaW5kZXgpID0+IHtcbiAgICAgIGlmIChpbmRleCArIDEgPiBtYXhQYXRoc1RvU2hvdykge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBjb25zdCBtb3ZlUGFpcnMgPSBnZXRNb3ZlUGFpcnNGcm9tUGF0aChwYXRoKTtcbiAgICAgIGNvbnN0IGJydXNoS2V5ID0gYnJ1c2hLZXlzW2luZGV4ICUgYnJ1c2hLZXlzLmxlbmd0aF07XG4gICAgICBtb3ZlUGFpcnMuZm9yRWFjaCgocGFpcikgPT4ge1xuICAgICAgICBpZiAoYWxyZWFkeURyYXduLmhhcyhwYWlyKSkge1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBzaGFwZSA9IHtcbiAgICAgICAgICBvcmlnOiBwYWlyWzBdLFxuICAgICAgICAgIGRlc3Q6IHBhaXJbMV0sXG4gICAgICAgICAgYnJ1c2g6IGJydXNoS2V5LFxuICAgICAgICAgIG1vZGlmaWVyczogeyBsaW5lV2lkdGg6IDEwIH0sXG4gICAgICAgIH07XG4gICAgICAgIHNoYXBlcy5wdXNoKHNoYXBlKTtcbiAgICAgICAgYWxyZWFkeURyYXduLmFkZChwYWlyKTtcbiAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgY29uc3QgbWFpblBhdGggPSB2YWxpZFBhdGhzWzBdO1xuICAgIGNvbnN0IG1haW5Nb3ZlUGFpcnMgPSBnZXRNb3ZlUGFpcnNGcm9tUGF0aChtYWluUGF0aCk7XG4gICAgbWFpbk1vdmVQYWlycy5mb3JFYWNoKChwYWlyKSA9PiB7XG4gICAgICBjb25zdCBzaGFwZSA9IHtcbiAgICAgICAgb3JpZzogcGFpclswXSxcbiAgICAgICAgZGVzdDogcGFpclsxXSxcbiAgICAgICAgYnJ1c2g6IFwiZ3JlZW5cIixcbiAgICAgICAgbW9kaWZpZXJzOiB7IGluZVdpZHRoOiAxMCB9LFxuICAgICAgfTtcbiAgICAgIHNoYXBlcy5wdXNoKHNoYXBlKTtcbiAgICB9KTtcblxuICAgIGNoZXNzZ3JvdW5kLnNldCh7XG4gICAgICBkcmF3YWJsZToge1xuICAgICAgICBzaGFwZXM6IHNoYXBlcyxcbiAgICAgIH0sXG4gICAgfSk7XG4gIH1cblxuICBmdW5jdGlvbiBnZXRNb3ZlUGFpcnNGcm9tUGF0aChwYXRoKSB7XG4gICAgY29uc3QgcGFpcnMgPSBbXTtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHBhdGgubGVuZ3RoIC0gMTsgaSsrKSB7XG4gICAgICBwYWlycy5wdXNoKFtwYXRoW2ldLCBwYXRoW2kgKyAxXV0pO1xuICAgIH1cbiAgICByZXR1cm4gcGFpcnM7XG4gIH1cblxuICBmdW5jdGlvbiBnZXRHcm91cGVkUGF0aHMocGF0aHMpIHtcbiAgICBsZXQgZ3JvdXBzID0gW107XG5cbiAgICBmb3IgKGxldCBwYXRoIG9mIHBhdGhzKSB7XG4gICAgICBsZXQgYWRkZWRUb0dyb3VwID0gZmFsc2U7XG5cbiAgICAgIGZvciAobGV0IGdyb3VwIG9mIGdyb3Vwcykge1xuICAgICAgICBsZXQgb3ZlcmxhcCA9IGdyb3VwLnNvbWUoKGdyb3VwUGF0aCkgPT4ge1xuICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgZ3JvdXBQYXRoLmxlbmd0aCAtIDE7IGkrKykge1xuICAgICAgICAgICAgZm9yIChsZXQgaiA9IDA7IGogPCBwYXRoLmxlbmd0aCAtIDE7IGorKykge1xuICAgICAgICAgICAgICBpZiAoXG4gICAgICAgICAgICAgICAgZ3JvdXBQYXRoW2ldID09PSBwYXRoW2pdICYmXG4gICAgICAgICAgICAgICAgZ3JvdXBQYXRoW2kgKyAxXSA9PT0gcGF0aFtqICsgMV1cbiAgICAgICAgICAgICAgKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9KTtcblxuICAgICAgICBpZiAoIW92ZXJsYXApIHtcbiAgICAgICAgICBncm91cC5wdXNoKHBhdGgpO1xuICAgICAgICAgIGFkZGVkVG9Hcm91cCA9IHRydWU7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgaWYgKCFhZGRlZFRvR3JvdXApIHtcbiAgICAgICAgZ3JvdXBzLnB1c2goW3BhdGhdKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gZ3JvdXBzO1xuICB9XG5cbiAgZnVuY3Rpb24gaW5jcmVtZW50R3JvdXBJbmRleCgpIHtcbiAgICBpZiAoZ3JvdXBJbmRleCA8IGdyb3VwZWRQYXRocy5sZW5ndGggLSAxKSB7XG4gICAgICBncm91cEluZGV4Kys7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gZGVjcmVtZW50R3JvdXBJbmRleCgpIHtcbiAgICBpZiAoZ3JvdXBJbmRleCA+IDApIHtcbiAgICAgIGdyb3VwSW5kZXgtLTtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBtYWtlU2VxdWVudGlhbE1vdmVzKG1vdmVQYWlycyA9IFtdLCBjYWxsYmFjayA9IG51bGwpIHtcbiAgICBhbmltYXRpbmcgPSB0cnVlO1xuICAgIGlmIChtb3ZlUGFpcnMubGVuZ3RoIDwgMSkge1xuICAgICAgYW5pbWF0aW5nID0gZmFsc2U7XG4gICAgICBpZiAoY2FsbGJhY2spIHtcbiAgICAgICAgY2FsbGJhY2soKTtcbiAgICAgIH1cbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICAvLyBzaGlmdCBtdXRhdGVzIHRoZSBhcnJheVxuICAgIGNvbnN0IG1vdmUgPSBtb3ZlUGFpcnMuc2hpZnQoKTtcblxuICAgIGNoZXNzZ3JvdW5kLm1vdmUobW92ZVswXSwgbW92ZVsxXSk7XG5cbiAgICBzZXRUaW1lb3V0KFxuICAgICAgKCkgPT4gbWFrZVNlcXVlbnRpYWxNb3Zlcyhtb3ZlUGFpcnMsIGNhbGxiYWNrKSxcbiAgICAgIGFuaW1hdGlvbkxlbmd0aE9wdGlvbi5nZXRWYWx1ZSgpLFxuICAgICk7XG4gIH1cblxuICBmdW5jdGlvbiBjbGVhckRyYXdpbmdzKCkge1xuICAgIGNoZXNzZ3JvdW5kLnNldCh7XG4gICAgICBkcmF3YWJsZToge1xuICAgICAgICBzaGFwZXM6IFtdLFxuICAgICAgfSxcbiAgICB9KTtcbiAgfVxuXG4gIGZ1bmN0aW9uIG5ld1Bvc2l0aW9uKCkge1xuICAgIGNsZWFyRHJhd2luZ3MoKTtcbiAgICBhbnN3ZXJTaG93biA9IGZhbHNlO1xuICAgIGNvbnN0IGtleXMgPSBPYmplY3Qua2V5cyhqc29uRGF0YSk7XG4gICAgY29uc3QgaW5kZXggPSBnZXRSYW5kb21JbmRleChrZXlzLmxlbmd0aCk7XG4gICAgY29uc3Qga2V5ID0ga2V5c1tpbmRleF07XG4gICAgY29uc3QgcHJldmlvdXNLbmlnaHRTcXVhcmUgPSBrbmlnaHRTcXVhcmU7XG4gICAgY29uc3QgcHJldmlvdXNLaW5nU3F1YXJlID0ga2luZ1NxdWFyZTtcbiAgICBjb25zdCBzcXVhcmVzID0ga2V5LnNwbGl0KFwiLlwiKTtcbiAgICBrbmlnaHRTcXVhcmUgPSBzcXVhcmVzWzBdO1xuICAgIGtpbmdTcXVhcmUgPSBzcXVhcmVzWzFdO1xuICAgIHBvc2l0aW9uRGF0YSA9IGpzb25EYXRhW2tleV07XG4gICAgY29uc3Qga2luZyA9IHtcbiAgICAgIHJvbGU6IFwia2luZ1wiLFxuICAgICAgY29sb3I6IFwiYmxhY2tcIixcbiAgICB9O1xuICAgIGNvbnN0IGtuaWdodCA9IHtcbiAgICAgIHJvbGU6IFwia25pZ2h0XCIsXG4gICAgICBjb2xvcjogXCJ3aGl0ZVwiLFxuICAgIH07XG4gICAgY29uc3QgcGllY2VzRGlmZiA9IG5ldyBNYXAoKTtcbiAgICBpZiAocHJldmlvdXNLbmlnaHRTcXVhcmUgJiYgcHJldmlvdXNLaW5nU3F1YXJlKSB7XG4gICAgICBwaWVjZXNEaWZmLnNldChwcmV2aW91c0tuaWdodFNxdWFyZSwgdW5kZWZpbmVkKTtcbiAgICAgIHBpZWNlc0RpZmYuc2V0KHByZXZpb3VzS2luZ1NxdWFyZSwgdW5kZWZpbmVkKTtcbiAgICB9XG4gICAgcGllY2VzRGlmZi5zZXQoa2luZ1NxdWFyZSwga2luZyk7XG4gICAgcGllY2VzRGlmZi5zZXQoa25pZ2h0U3F1YXJlLCBrbmlnaHQpO1xuICAgIGNoZXNzZ3JvdW5kLnNldFBpZWNlcyhwaWVjZXNEaWZmKTtcbiAgICBjaGVzc2dyb3VuZC5zZXRQaWVjZXMobmV3IE1hcCgpKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGFuaW1hdGVFbGVtZW50KGVsZW1lbnQsIGFuaW1hdGlvbkNsYXNzKSB7XG4gICAgZWxlbWVudC5jbGFzc0xpc3QuYWRkKGFuaW1hdGlvbkNsYXNzKTtcblxuICAgIC8vIExpc3RlbiBmb3IgdGhlIGFuaW1hdGlvbmVuZCBldmVudFxuICAgIGVsZW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihcbiAgICAgIFwiYW5pbWF0aW9uZW5kXCIsXG4gICAgICBmdW5jdGlvbiAoKSB7XG4gICAgICAgIC8vIE9uY2UgdGhlIGFuaW1hdGlvbiBlbmRzLCByZW1vdmUgdGhlIGNsYXNzXG4gICAgICAgIGVsZW1lbnQuY2xhc3NMaXN0LnJlbW92ZShhbmltYXRpb25DbGFzcyk7XG4gICAgICB9LFxuICAgICAgeyBvbmNlOiB0cnVlIH0sXG4gICAgKTsgLy8gVGhlIGxpc3RlbmVyIGlzIHJlbW92ZWQgYWZ0ZXIgaXQncyBpbnZva2VkIG9uY2VcbiAgfVxuXG4gIGZ1bmN0aW9uIGluaXRDb25maWcoKSB7XG4gICAgY29uZmlnID0gbmV3IENvbmZpZyhcImtuaWdodF9tb3Zlc19nYW1lXCIpO1xuICAgIGFuaW1hdGlvbkxlbmd0aE9wdGlvbiA9IGNvbmZpZy5nZXRDb25maWdPcHRpb24oXG4gICAgICBcIkFuaW1hdGlvbiBsZW5ndGggKG1zKVwiLFxuICAgICAgMzAwLFxuICAgICk7XG5cbiAgICBtYXhQYXRoc1RvRGlzcGxheU9wdGlvbiA9IGNvbmZpZy5nZXRDb25maWdPcHRpb24oXCJNYXggcGF0aHMgdG8gc2hvd1wiLCA2KTtcblxuICAgIGNvbmZpZ0Zvcm0gPSBuZXcgQ29uZmlnRm9ybShjb25maWcpO1xuICAgIGNvbmZpZ0Zvcm0uYWRkTGlua1RvRE9NKFwiY29uZmlnXCIpO1xuICB9XG48L3NjcmlwdD5cblxuPGxpbmsgaWQ9XCJwaWVjZS1zcHJpdGVcIiBocmVmPVwiL3BpZWNlLWNzcy9tZXJpZGEuY3NzXCIgcmVsPVwic3R5bGVzaGVldFwiIC8+XG5cbjxkaXYgY2xhc3M9XCJjb2x1bW5zXCI+XG4gIDxkaXYgY2xhc3M9XCJjb2x1bW4gY29sdW1uMiBpcy02LWRlc2t0b3BcIj5cbiAgICA8ZGl2IGNsYXNzPVwiYmxvY2tcIj5cbiAgICAgIDxDaGVzc2JvYXJkIHtjaGVzc2dyb3VuZENvbmZpZ30gYmluZDpjaGVzc2dyb3VuZCBiaW5kOnNpemU9e2JvYXJkV2lkdGh9IC8+XG4gICAgPC9kaXY+XG5cbiAgICB7I2lmIGdhbWVSdW5uaW5nfVxuICAgICAgPFByb2dyZXNzVGltZXIgbWF4PVwiMzBcIiB3aWR0aD17Ym9hcmRXaWR0aH0gb246Y29tcGxldGU9e2VuZEdhbWV9IC8+XG4gICAgey9pZn1cblxuICAgIDxkaXYgY2xhc3M9XCJmaXhlZC1ncmlkIGhhcy0zLWNvbHNcIiBzdHlsZT1cIndpZHRoOiB7Ym9hcmRXaWR0aH1weFwiPlxuICAgICAgPGRpdiBjbGFzcz1cImdyaWRcIj5cbiAgICAgICAgPGRpdiBjbGFzcz1cImNlbGxcIj5cbiAgICAgICAgICA8YnV0dG9uXG4gICAgICAgICAgICBjbGFzcz1cImJ1dHRvbiBpcy1wcmltYXJ5XCJcbiAgICAgICAgICAgIGlkPVwiMVwiXG4gICAgICAgICAgICBvbjpjbGljaz17KCkgPT4gcHJvY2Vzc0J1dHRvbihcIjFcIil9XG4gICAgICAgICAgICBiaW5kOnRoaXM9e2J1dHRvbjF9PjE8L2J1dHRvblxuICAgICAgICAgID5cbiAgICAgICAgPC9kaXY+XG4gICAgICAgIDxkaXYgY2xhc3M9XCJjZWxsXCI+XG4gICAgICAgICAgPGJ1dHRvblxuICAgICAgICAgICAgY2xhc3M9XCJidXR0b24gaXMtcHJpbWFyeVwiXG4gICAgICAgICAgICBpZD1cIjJcIlxuICAgICAgICAgICAgb246Y2xpY2s9eygpID0+IHByb2Nlc3NCdXR0b24oXCIyXCIpfVxuICAgICAgICAgICAgYmluZDp0aGlzPXtidXR0b24yfT4yPC9idXR0b25cbiAgICAgICAgICA+XG4gICAgICAgIDwvZGl2PlxuICAgICAgICA8ZGl2IGNsYXNzPVwiY2VsbFwiPlxuICAgICAgICAgIDxidXR0b25cbiAgICAgICAgICAgIGNsYXNzPVwiYnV0dG9uIGlzLXByaW1hcnlcIlxuICAgICAgICAgICAgaWQ9XCIzXCJcbiAgICAgICAgICAgIG9uOmNsaWNrPXsoKSA9PiBwcm9jZXNzQnV0dG9uKFwiM1wiKX1cbiAgICAgICAgICAgIGJpbmQ6dGhpcz17YnV0dG9uM30+MzwvYnV0dG9uXG4gICAgICAgICAgPlxuICAgICAgICA8L2Rpdj5cbiAgICAgICAgPGRpdiBjbGFzcz1cImNlbGxcIj5cbiAgICAgICAgICA8YnV0dG9uXG4gICAgICAgICAgICBjbGFzcz1cImJ1dHRvbiBpcy1wcmltYXJ5XCJcbiAgICAgICAgICAgIGlkPVwiNFwiXG4gICAgICAgICAgICBvbjpjbGljaz17KCkgPT4gcHJvY2Vzc0J1dHRvbihcIjRcIil9XG4gICAgICAgICAgICBiaW5kOnRoaXM9e2J1dHRvbjR9PjQ8L2J1dHRvblxuICAgICAgICAgID5cbiAgICAgICAgPC9kaXY+XG4gICAgICAgIDxkaXYgY2xhc3M9XCJjZWxsXCI+XG4gICAgICAgICAgPGJ1dHRvblxuICAgICAgICAgICAgY2xhc3M9XCJidXR0b24gaXMtcHJpbWFyeVwiXG4gICAgICAgICAgICBpZD1cIjVcIlxuICAgICAgICAgICAgb246Y2xpY2s9eygpID0+IHByb2Nlc3NCdXR0b24oXCI1XCIpfVxuICAgICAgICAgICAgYmluZDp0aGlzPXtidXR0b241fT41PC9idXR0b25cbiAgICAgICAgICA+XG4gICAgICAgIDwvZGl2PlxuICAgICAgICA8ZGl2IGNsYXNzPVwiY2VsbFwiPlxuICAgICAgICAgIDxidXR0b25cbiAgICAgICAgICAgIGNsYXNzPVwiYnV0dG9uIGlzLXByaW1hcnlcIlxuICAgICAgICAgICAgaWQ9XCI2XCJcbiAgICAgICAgICAgIG9uOmNsaWNrPXsoKSA9PiBwcm9jZXNzQnV0dG9uKFwiNlwiKX1cbiAgICAgICAgICAgIGJpbmQ6dGhpcz17YnV0dG9uNn0+NjwvYnV0dG9uXG4gICAgICAgICAgPlxuICAgICAgICA8L2Rpdj5cbiAgICAgIDwvZGl2PlxuICAgIDwvZGl2PlxuICA8L2Rpdj5cblxuICA8ZGl2IGNsYXNzPVwiY29sdW1uIGNvbHVtbjEgaXMtMy1kZXNrdG9wXCI+XG4gICAgPGRpdiBjbGFzcz1cImJveCBzY29yZS1jb250YWluZXJcIj5cbiAgICAgIDxkaXYgY2xhc3M9XCJjb250YWluZXIgaGFzLXRleHQtY2VudGVyZWRcIj5cbiAgICAgICAgPGgyIGNsYXNzPVwiaXMtc2l6ZS01XCI+Q29ycmVjdDwvaDI+XG4gICAgICAgIDxkaXYgY2xhc3M9XCJzY29yZSBpcy1zaXplLTJcIj57Y29ycmVjdENvdW50fTwvZGl2PlxuICAgICAgICA8aDIgY2xhc3M9XCJpcy1zaXplLTVcIj5JbmNvcnJlY3Q8L2gyPlxuICAgICAgICA8ZGl2IGNsYXNzPVwic2NvcmUgaXMtc2l6ZS0yXCI+e2luY29ycmVjdENvdW50fTwvZGl2PlxuICAgICAgPC9kaXY+XG4gICAgPC9kaXY+XG4gICAgPGRpdiBjbGFzcz1cImJveFwiPlxuICAgICAgPGRpdiBjbGFzcz1cImNvbnRhaW5lciBoYXMtdGV4dC1jZW50ZXJlZFwiPlxuICAgICAgICA8aDIgY2xhc3M9XCJpcy1zaXplLTVcIj5IaWdoIFNjb3JlPC9oMj5cbiAgICAgICAgPGRpdiBjbGFzcz1cInNjb3JlIGlzLXNpemUtMlwiPntoaWdoU2NvcmV9PC9kaXY+XG4gICAgICAgIHsjaWYgIWdhbWVSdW5uaW5nfVxuICAgICAgICAgIDxidXR0b25cbiAgICAgICAgICAgIGlkPVwic3RhcnRUaW1lZEdhbWVcIlxuICAgICAgICAgICAgb246Y2xpY2s9e3N0YXJ0VGltZWRHYW1lfVxuICAgICAgICAgICAgY2xhc3M9XCJidXR0b24gaXMtcHJpbWFyeVwiXG4gICAgICAgICAgICA+U3RhcnQgVGltZWQgR2FtZVxuICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICB7L2lmfVxuICAgICAgICB7I2lmIHRpbWVSZW1haW5pbmcgPiAwfVxuICAgICAgICAgIDxkaXYgaWQ9XCJ0aW1lclwiPnt0aW1lUmVtYWluaW5nfTwvZGl2PlxuICAgICAgICB7L2lmfVxuICAgICAgPC9kaXY+XG4gICAgPC9kaXY+XG4gICAgPGRpdiBjbGFzcz1cImJveFwiPlxuICAgICAgPGRpdiBjbGFzcz1cImNvbnRhaW5lciBoYXMtdGV4dC1jZW50ZXJlZFwiPlxuICAgICAgICB7I2lmICFhbnN3ZXJTaG93bn1cbiAgICAgICAgICA8ZGl2IGNsYXNzPVwiYmxvY2tcIj5cbiAgICAgICAgICAgIDxidXR0b25cbiAgICAgICAgICAgICAgY2xhc3M9XCJidXR0b24gaXMtaW5mb1wiXG4gICAgICAgICAgICAgIGRpc2FibGVkPXthbnN3ZXJTaG93biB8fCBnYW1lUnVubmluZ31cbiAgICAgICAgICAgICAgb246Y2xpY2t8cHJldmVudERlZmF1bHQ9eygpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAocG9zaXRpb25EYXRhKSB7XG4gICAgICAgICAgICAgICAgICBhbnN3ZXJTaG93biA9IHRydWU7XG4gICAgICAgICAgICAgICAgICBjb25zdCBjb3JyZWN0UGF0aHMgPSBwb3NpdGlvbkRhdGEucGF0aHM7XG4gICAgICAgICAgICAgICAgICBjb25zdCByYW5kb21seVNvcnRlZCA9IHNvcnRSYW5kb21seShjb3JyZWN0UGF0aHMpO1xuICAgICAgICAgICAgICAgICAgZ3JvdXBlZFBhdGhzID0gc29ydFJhbmRvbWx5KGdldEdyb3VwZWRQYXRocyhyYW5kb21seVNvcnRlZCkpO1xuICAgICAgICAgICAgICAgICAgZ3JvdXBJbmRleCA9IDA7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9fVxuICAgICAgICAgICAgICA+U2hvdyBhbnN3ZXJcbiAgICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICAgIDwvZGl2PlxuICAgICAgICB7OmVsc2V9XG4gICAgICAgICAgPGRpdiBjbGFzcz1cImJsb2NrXCI+XG4gICAgICAgICAgICA8YnV0dG9uXG4gICAgICAgICAgICAgIGNsYXNzPVwiYnV0dG9uIGlzLWxpbmtcIlxuICAgICAgICAgICAgICBvbjpjbGljaz17KCkgPT4ge1xuICAgICAgICAgICAgICAgIGNsZWFyRHJhd2luZ3MoKTtcbiAgICAgICAgICAgICAgICBhbnN3ZXJTaG93biA9IGZhbHNlO1xuICAgICAgICAgICAgICB9fVxuICAgICAgICAgICAgPlxuICAgICAgICAgICAgICBDbGVhclxuICAgICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICAgICB7I2lmIGdyb3VwZWRQYXRocy5sZW5ndGggPiAxfVxuICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiYnV0dG9ucyBoYXMtYWRkb25zXCI+XG4gICAgICAgICAgICAgICAgPGJ1dHRvblxuICAgICAgICAgICAgICAgICAgY2xhc3M9XCJidXR0b25cIlxuICAgICAgICAgICAgICAgICAgb246Y2xpY2s9e2RlY3JlbWVudEdyb3VwSW5kZXh9XG4gICAgICAgICAgICAgICAgICBkaXNhYmxlZD17ZGlzYWJsZVByZXZ9PiZsYXF1bzs8L2J1dHRvblxuICAgICAgICAgICAgICAgID5cbiAgICAgICAgICAgICAgICA8YnV0dG9uXG4gICAgICAgICAgICAgICAgICBjbGFzcz1cImJ1dHRvblwiXG4gICAgICAgICAgICAgICAgICBvbjpjbGljaz17aW5jcmVtZW50R3JvdXBJbmRleH1cbiAgICAgICAgICAgICAgICAgIGRpc2FibGVkPXtkaXNhYmxlTmV4dH0+JnJhcXVvOzwvYnV0dG9uXG4gICAgICAgICAgICAgICAgPlxuICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIHsvaWZ9XG4gICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgPGRpdiBjbGFzcz1cImJsb2NrIGhhcy10ZXh0LWxlZnRcIj5cbiAgICAgICAgICAgIDxkaXY+XG4gICAgICAgICAgICAgIE1pbmltdW0gIyBvZiBtb3Zlczoge2dldE1pbmltdW1Nb3Zlc0ZvckN1cnJlbnRQb3NpdGlvbigpfVxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICA8ZGl2PlxuICAgICAgICAgICAgICBUb3RhbCB1bmlxdWUgcGF0aHM6IHtwb3NpdGlvbkRhdGEucGF0aHMubGVuZ3RofVxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgPC9kaXY+XG4gICAgICAgIHsvaWZ9XG4gICAgICA8L2Rpdj5cbiAgICA8L2Rpdj5cbiAgPC9kaXY+XG48L2Rpdj5cblxuPHN0eWxlPlxuICAuY2VsbCBidXR0b24ge1xuICAgIHdpZHRoOiAxMDAlO1xuICAgIGRpc3BsYXk6IGlubGluZS1ibG9jaztcbiAgfVxuXG4gIEBrZXlmcmFtZXMgaW5jb3JyZWN0QW5zd2VyIHtcbiAgICAyNSUge1xuICAgICAgYmFja2dyb3VuZC1jb2xvcjogcmVkO1xuICAgICAgdHJhbnNmb3JtOiB0cmFuc2xhdGVYKC0xMHB4KTtcbiAgICB9XG4gICAgNTAlIHtcbiAgICAgIGJhY2tncm91bmQtY29sb3I6IHJlZDtcbiAgICAgIHRyYW5zZm9ybTogdHJhbnNsYXRlWCgxMHB4KTtcbiAgICB9XG4gICAgNzUlIHtcbiAgICAgIGJhY2tncm91bmQtY29sb3I6IHJlZDtcbiAgICAgIHRyYW5zZm9ybTogdHJhbnNsYXRlWCgtMTBweCk7XG4gICAgfVxuICAgIDEwMCUge1xuICAgICAgdHJhbnNmb3JtOiB0cmFuc2xhdGVYKDBweCk7XG4gICAgfVxuICB9XG5cbiAgLmluY29ycmVjdEFuc3dlciB7XG4gICAgYW5pbWF0aW9uOiBpbmNvcnJlY3RBbnN3ZXIgMXMgbGluZWFyO1xuICB9XG5cbiAgQGtleWZyYW1lcyBjb3JyZWN0QW5zd2VyIHtcbiAgICA1MCUge1xuICAgICAgYmFja2dyb3VuZC1jb2xvcjogZ3JlZW47XG4gICAgICB0cmFuc2Zvcm06IHNjYWxlKDEuMDEpO1xuICAgIH1cbiAgICAxMDAlIHtcbiAgICAgIHRyYW5zZm9ybTogc2NhbGUoMSk7XG4gICAgfVxuICB9XG5cbiAgLmNvcnJlY3RBbnN3ZXIge1xuICAgIGFuaW1hdGlvbjogY29ycmVjdEFuc3dlciAwLjc1cyBsaW5lYXI7XG4gIH1cbjwvc3R5bGU+XG4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBd2tCRSxvQkFBSyxDQUFDLHFCQUFPLENBQ1gsS0FBSyxDQUFFLElBQUksQ0FDWCxPQUFPLENBQUUsWUFDWCxDQUVBLFdBQVcsOEJBQWdCLENBQ3pCLEdBQUksQ0FDRixnQkFBZ0IsQ0FBRSxHQUFHLENBQ3JCLFNBQVMsQ0FBRSxXQUFXLEtBQUssQ0FDN0IsQ0FDQSxHQUFJLENBQ0YsZ0JBQWdCLENBQUUsR0FBRyxDQUNyQixTQUFTLENBQUUsV0FBVyxJQUFJLENBQzVCLENBQ0EsR0FBSSxDQUNGLGdCQUFnQixDQUFFLEdBQUcsQ0FDckIsU0FBUyxDQUFFLFdBQVcsS0FBSyxDQUM3QixDQUNBLElBQUssQ0FDSCxTQUFTLENBQUUsV0FBVyxHQUFHLENBQzNCLENBQ0YsQ0FNQSxXQUFXLDRCQUFjLENBQ3ZCLEdBQUksQ0FDRixnQkFBZ0IsQ0FBRSxLQUFLLENBQ3ZCLFNBQVMsQ0FBRSxNQUFNLElBQUksQ0FDdkIsQ0FDQSxJQUFLLENBQ0gsU0FBUyxDQUFFLE1BQU0sQ0FBQyxDQUNwQixDQUNGIn0= */");
}

// (441:4) {#if gameRunning}
function create_if_block_4(ctx) {
	let progresstimer;
	let current;

	progresstimer = new ProgressTimer({
			props: { max: "30", width: /*boardWidth*/ ctx[12] },
			$$inline: true
		});

	progresstimer.$on("complete", /*endGame*/ ctx[21]);

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
			if (dirty[0] & /*boardWidth*/ 4096) progresstimer_changes.width = /*boardWidth*/ ctx[12];
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
		source: "(441:4) {#if gameRunning}",
		ctx
	});

	return block;
}

// (512:8) {#if !gameRunning}
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
			add_location(button, file$5, 512, 10, 12149);
		},
		m: function mount(target, anchor) {
			insert_dev(target, button, anchor);

			if (!mounted) {
				dispose = listen_dev(button, "click", /*startTimedGame*/ ctx[20], false, false, false, false);
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
		source: "(512:8) {#if !gameRunning}",
		ctx
	});

	return block;
}

// (520:8) {#if timeRemaining > 0}
function create_if_block_2$1(ctx) {
	let div;
	let t;

	const block = {
		c: function create() {
			div = element("div");
			t = text(/*timeRemaining*/ ctx[8]);
			attr_dev(div, "id", "timer");
			add_location(div, file$5, 520, 10, 12371);
		},
		m: function mount(target, anchor) {
			insert_dev(target, div, anchor);
			append_dev(div, t);
		},
		p: function update(ctx, dirty) {
			if (dirty[0] & /*timeRemaining*/ 256) set_data_dev(t, /*timeRemaining*/ ctx[8]);
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
		source: "(520:8) {#if timeRemaining > 0}",
		ctx
	});

	return block;
}

// (544:8) {:else}
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
	let t7_value = /*positionData*/ ctx[4].paths.length + "";
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
			div1.textContent = `Minimum # of moves: ${/*getMinimumMovesForCurrentPosition*/ ctx[22]()}`;
			t5 = space();
			div2 = element("div");
			t6 = text("Total unique paths: ");
			t7 = text(t7_value);
			attr_dev(button, "class", "button is-link");
			add_location(button, file$5, 545, 12, 13205);
			attr_dev(div0, "class", "block");
			add_location(div0, file$5, 544, 10, 13173);
			add_location(div1, file$5, 570, 12, 13988);
			add_location(div2, file$5, 573, 12, 14097);
			attr_dev(div3, "class", "block has-text-left");
			add_location(div3, file$5, 569, 10, 13942);
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
				dispose = listen_dev(button, "click", /*click_handler_7*/ ctx[42], false, false, false, false);
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

			if (dirty[0] & /*positionData*/ 16 && t7_value !== (t7_value = /*positionData*/ ctx[4].paths.length + "")) set_data_dev(t7, t7_value);
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
		source: "(544:8) {:else}",
		ctx
	});

	return block;
}

// (527:8) {#if !answerShown}
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
			button.disabled = button_disabled_value = /*answerShown*/ ctx[0] || /*gameRunning*/ ctx[7];
			add_location(button, file$5, 528, 12, 12586);
			attr_dev(div, "class", "block");
			add_location(div, file$5, 527, 10, 12554);
		},
		m: function mount(target, anchor) {
			insert_dev(target, div, anchor);
			append_dev(div, button);
			append_dev(button, t);

			if (!mounted) {
				dispose = listen_dev(button, "click", prevent_default(/*click_handler_6*/ ctx[41]), false, true, false, false);
				mounted = true;
			}
		},
		p: function update(ctx, dirty) {
			if (dirty[0] & /*answerShown, gameRunning*/ 129 && button_disabled_value !== (button_disabled_value = /*answerShown*/ ctx[0] || /*gameRunning*/ ctx[7])) {
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
		source: "(527:8) {#if !answerShown}",
		ctx
	});

	return block;
}

// (555:12) {#if groupedPaths.length > 1}
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
			button0.disabled = /*disablePrev*/ ctx[10];
			add_location(button0, file$5, 556, 16, 13530);
			attr_dev(button1_1, "class", "button");
			button1_1.disabled = /*disableNext*/ ctx[9];
			add_location(button1_1, file$5, 561, 16, 13711);
			attr_dev(div, "class", "buttons has-addons");
			add_location(div, file$5, 555, 14, 13481);
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
					listen_dev(button0, "click", /*decrementGroupIndex*/ ctx[25], false, false, false, false),
					listen_dev(button1_1, "click", /*incrementGroupIndex*/ ctx[24], false, false, false, false)
				];

				mounted = true;
			}
		},
		p: function update(ctx, dirty) {
			if (dirty[0] & /*disablePrev*/ 1024) {
				prop_dev(button0, "disabled", /*disablePrev*/ ctx[10]);
			}

			if (dirty[0] & /*disableNext*/ 512) {
				prop_dev(button1_1, "disabled", /*disableNext*/ ctx[9]);
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
		source: "(555:12) {#if groupedPaths.length > 1}",
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
	let chessboard;
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

	function chessboard_chessground_binding(value) {
		/*chessboard_chessground_binding*/ ctx[27](value);
	}

	function chessboard_size_binding(value) {
		/*chessboard_size_binding*/ ctx[28](value);
	}

	let chessboard_props = {
		chessgroundConfig: /*chessgroundConfig*/ ctx[19]
	};

	if (/*chessground*/ ctx[3] !== void 0) {
		chessboard_props.chessground = /*chessground*/ ctx[3];
	}

	if (/*boardWidth*/ ctx[12] !== void 0) {
		chessboard_props.size = /*boardWidth*/ ctx[12];
	}

	chessboard = new Chessboard({ props: chessboard_props, $$inline: true });
	binding_callbacks.push(() => bind(chessboard, 'chessground', chessboard_chessground_binding));
	binding_callbacks.push(() => bind(chessboard, 'size', chessboard_size_binding));
	let if_block0 = /*gameRunning*/ ctx[7] && create_if_block_4(ctx);
	let if_block1 = !/*gameRunning*/ ctx[7] && create_if_block_3(ctx);
	let if_block2 = /*timeRemaining*/ ctx[8] > 0 && create_if_block_2$1(ctx);

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
			create_component(chessboard.$$.fragment);
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
			t17 = text(/*correctCount*/ ctx[5]);
			t18 = space();
			h21 = element("h2");
			h21.textContent = "Incorrect";
			t20 = space();
			div11 = element("div");
			t21 = text(/*incorrectCount*/ ctx[6]);
			t22 = space();
			div16 = element("div");
			div15 = element("div");
			h22 = element("h2");
			h22.textContent = "High Score";
			t24 = space();
			div14 = element("div");
			t25 = text(/*highScore*/ ctx[11]);
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
			add_location(link, file$5, 432, 0, 9774);
			attr_dev(div0, "class", "block");
			add_location(div0, file$5, 436, 4, 9918);
			attr_dev(button0, "class", "button is-primary svelte-119er7j");
			attr_dev(button0, "id", "1");
			add_location(button0, file$5, 447, 10, 10270);
			attr_dev(div1, "class", "cell svelte-119er7j");
			add_location(div1, file$5, 446, 8, 10241);
			attr_dev(button1_1, "class", "button is-primary svelte-119er7j");
			attr_dev(button1_1, "id", "2");
			add_location(button1_1, file$5, 455, 10, 10489);
			attr_dev(div2, "class", "cell svelte-119er7j");
			add_location(div2, file$5, 454, 8, 10460);
			attr_dev(button2_1, "class", "button is-primary svelte-119er7j");
			attr_dev(button2_1, "id", "3");
			add_location(button2_1, file$5, 463, 10, 10708);
			attr_dev(div3, "class", "cell svelte-119er7j");
			add_location(div3, file$5, 462, 8, 10679);
			attr_dev(button3_1, "class", "button is-primary svelte-119er7j");
			attr_dev(button3_1, "id", "4");
			add_location(button3_1, file$5, 471, 10, 10927);
			attr_dev(div4, "class", "cell svelte-119er7j");
			add_location(div4, file$5, 470, 8, 10898);
			attr_dev(button4_1, "class", "button is-primary svelte-119er7j");
			attr_dev(button4_1, "id", "5");
			add_location(button4_1, file$5, 479, 10, 11146);
			attr_dev(div5, "class", "cell svelte-119er7j");
			add_location(div5, file$5, 478, 8, 11117);
			attr_dev(button5_1, "class", "button is-primary svelte-119er7j");
			attr_dev(button5_1, "id", "6");
			add_location(button5_1, file$5, 487, 10, 11365);
			attr_dev(div6, "class", "cell svelte-119er7j");
			add_location(div6, file$5, 486, 8, 11336);
			attr_dev(div7, "class", "grid");
			add_location(div7, file$5, 445, 6, 10214);
			attr_dev(div8, "class", "fixed-grid has-3-cols");
			set_style(div8, "width", /*boardWidth*/ ctx[12] + "px");
			add_location(div8, file$5, 444, 4, 10142);
			attr_dev(div9, "class", "column column2 is-6-desktop");
			add_location(div9, file$5, 435, 2, 9872);
			attr_dev(h20, "class", "is-size-5");
			add_location(h20, file$5, 501, 8, 11719);
			attr_dev(div10, "class", "score is-size-2");
			add_location(div10, file$5, 502, 8, 11762);
			attr_dev(h21, "class", "is-size-5");
			add_location(h21, file$5, 503, 8, 11820);
			attr_dev(div11, "class", "score is-size-2");
			add_location(div11, file$5, 504, 8, 11865);
			attr_dev(div12, "class", "container has-text-centered");
			add_location(div12, file$5, 500, 6, 11669);
			attr_dev(div13, "class", "box score-container");
			add_location(div13, file$5, 499, 4, 11629);
			attr_dev(h22, "class", "is-size-5");
			add_location(h22, file$5, 509, 8, 12019);
			attr_dev(div14, "class", "score is-size-2");
			add_location(div14, file$5, 510, 8, 12065);
			attr_dev(div15, "class", "container has-text-centered");
			add_location(div15, file$5, 508, 6, 11969);
			attr_dev(div16, "class", "box");
			add_location(div16, file$5, 507, 4, 11945);
			attr_dev(div17, "class", "container has-text-centered");
			add_location(div17, file$5, 525, 6, 12475);
			attr_dev(div18, "class", "box");
			add_location(div18, file$5, 524, 4, 12451);
			attr_dev(div19, "class", "column column1 is-3-desktop");
			add_location(div19, file$5, 498, 2, 11583);
			attr_dev(div20, "class", "columns");
			add_location(div20, file$5, 434, 0, 9848);
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
			mount_component(chessboard, div0, null);
			append_dev(div9, t1);
			if (if_block0) if_block0.m(div9, null);
			append_dev(div9, t2);
			append_dev(div9, div8);
			append_dev(div8, div7);
			append_dev(div7, div1);
			append_dev(div1, button0);
			/*button0_binding*/ ctx[30](button0);
			append_dev(div7, t4);
			append_dev(div7, div2);
			append_dev(div2, button1_1);
			/*button1_1_binding*/ ctx[32](button1_1);
			append_dev(div7, t6);
			append_dev(div7, div3);
			append_dev(div3, button2_1);
			/*button2_1_binding*/ ctx[34](button2_1);
			append_dev(div7, t8);
			append_dev(div7, div4);
			append_dev(div4, button3_1);
			/*button3_1_binding*/ ctx[36](button3_1);
			append_dev(div7, t10);
			append_dev(div7, div5);
			append_dev(div5, button4_1);
			/*button4_1_binding*/ ctx[38](button4_1);
			append_dev(div7, t12);
			append_dev(div7, div6);
			append_dev(div6, button5_1);
			/*button5_1_binding*/ ctx[40](button5_1);
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
					listen_dev(button0, "click", /*click_handler*/ ctx[29], false, false, false, false),
					listen_dev(button1_1, "click", /*click_handler_1*/ ctx[31], false, false, false, false),
					listen_dev(button2_1, "click", /*click_handler_2*/ ctx[33], false, false, false, false),
					listen_dev(button3_1, "click", /*click_handler_3*/ ctx[35], false, false, false, false),
					listen_dev(button4_1, "click", /*click_handler_4*/ ctx[37], false, false, false, false),
					listen_dev(button5_1, "click", /*click_handler_5*/ ctx[39], false, false, false, false)
				];

				mounted = true;
			}
		},
		p: function update(ctx, dirty) {
			const chessboard_changes = {};

			if (!updating_chessground && dirty[0] & /*chessground*/ 8) {
				updating_chessground = true;
				chessboard_changes.chessground = /*chessground*/ ctx[3];
				add_flush_callback(() => updating_chessground = false);
			}

			if (!updating_size && dirty[0] & /*boardWidth*/ 4096) {
				updating_size = true;
				chessboard_changes.size = /*boardWidth*/ ctx[12];
				add_flush_callback(() => updating_size = false);
			}

			chessboard.$set(chessboard_changes);

			if (/*gameRunning*/ ctx[7]) {
				if (if_block0) {
					if_block0.p(ctx, dirty);

					if (dirty[0] & /*gameRunning*/ 128) {
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

			if (!current || dirty[0] & /*boardWidth*/ 4096) {
				set_style(div8, "width", /*boardWidth*/ ctx[12] + "px");
			}

			if (!current || dirty[0] & /*correctCount*/ 32) set_data_dev(t17, /*correctCount*/ ctx[5]);
			if (!current || dirty[0] & /*incorrectCount*/ 64) set_data_dev(t21, /*incorrectCount*/ ctx[6]);
			if (!current || dirty[0] & /*highScore*/ 2048) set_data_dev(t25, /*highScore*/ ctx[11]);

			if (!/*gameRunning*/ ctx[7]) {
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

			if (/*timeRemaining*/ ctx[8] > 0) {
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
			transition_in(chessboard.$$.fragment, local);
			transition_in(if_block0);
			current = true;
		},
		o: function outro(local) {
			transition_out(chessboard.$$.fragment, local);
			transition_out(if_block0);
			current = false;
		},
		d: function destroy(detaching) {
			if (detaching) {
				detach_dev(link);
				detach_dev(t0);
				detach_dev(div20);
			}

			destroy_component(chessboard);
			if (if_block0) if_block0.d();
			/*button0_binding*/ ctx[30](null);
			/*button1_1_binding*/ ctx[32](null);
			/*button2_1_binding*/ ctx[34](null);
			/*button3_1_binding*/ ctx[36](null);
			/*button4_1_binding*/ ctx[38](null);
			/*button5_1_binding*/ ctx[40](null);
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
		$$invalidate(7, gameRunning = true);
		newPosition();
	}

	function endGame() {
		if (correctCount > highScore && gameRunning) {
			$$invalidate(11, highScore = correctCount);
		}

		$$invalidate(7, gameRunning = false);
		$$invalidate(8, timeRemaining = null);
		$$invalidate(5, correctCount = 0);
		$$invalidate(6, incorrectCount = 0);
	}

	function reset() {
		$$invalidate(5, correctCount = 0);
		$$invalidate(6, incorrectCount = 0);
		$$invalidate(7, gameRunning = false);
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
			animateElement(button, "correctAnswer");
			newPosition();
		} else {
			$$invalidate(6, incorrectCount += 1);
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
		$$invalidate(4, positionData = jsonData[key]);
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

	function chessboard_chessground_binding(value) {
		chessground = value;
		$$invalidate(3, chessground);
	}

	function chessboard_size_binding(value) {
		boardWidth = value;
		$$invalidate(12, boardWidth);
	}

	const click_handler = () => processButton("1");

	function button0_binding($$value) {
		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
			button1 = $$value;
			$$invalidate(13, button1);
		});
	}

	const click_handler_1 = () => processButton("2");

	function button1_1_binding($$value) {
		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
			button2 = $$value;
			$$invalidate(14, button2);
		});
	}

	const click_handler_2 = () => processButton("3");

	function button2_1_binding($$value) {
		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
			button3 = $$value;
			$$invalidate(15, button3);
		});
	}

	const click_handler_3 = () => processButton("4");

	function button3_1_binding($$value) {
		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
			button4 = $$value;
			$$invalidate(16, button4);
		});
	}

	const click_handler_4 = () => processButton("5");

	function button4_1_binding($$value) {
		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
			button5 = $$value;
			$$invalidate(17, button5);
		});
	}

	const click_handler_5 = () => processButton("6");

	function button5_1_binding($$value) {
		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
			button6 = $$value;
			$$invalidate(18, button6);
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
		knightMovesData,
		Config,
		ConfigForm,
		Util,
		chessground,
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
		getRandomElement,
		sortRandomly,
		getMinimumMovesForCurrentPosition,
		getPathsForCurrentPosition,
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
		if ('jsonData' in $$props) jsonData = $$props.jsonData;
		if ('positionData' in $$props) $$invalidate(4, positionData = $$props.positionData);
		if ('correctCount' in $$props) $$invalidate(5, correctCount = $$props.correctCount);
		if ('incorrectCount' in $$props) $$invalidate(6, incorrectCount = $$props.incorrectCount);
		if ('gameRunning' in $$props) $$invalidate(7, gameRunning = $$props.gameRunning);
		if ('timeRemaining' in $$props) $$invalidate(8, timeRemaining = $$props.timeRemaining);
		if ('animating' in $$props) animating = $$props.animating;
		if ('answerShown' in $$props) $$invalidate(0, answerShown = $$props.answerShown);
		if ('groupedPaths' in $$props) $$invalidate(1, groupedPaths = $$props.groupedPaths);
		if ('groupIndex' in $$props) $$invalidate(2, groupIndex = $$props.groupIndex);
		if ('disableNext' in $$props) $$invalidate(9, disableNext = $$props.disableNext);
		if ('disablePrev' in $$props) $$invalidate(10, disablePrev = $$props.disablePrev);
		if ('highScore' in $$props) $$invalidate(11, highScore = $$props.highScore);
		if ('maxPathsToDisplayOption' in $$props) maxPathsToDisplayOption = $$props.maxPathsToDisplayOption;
		if ('animationLengthOption' in $$props) animationLengthOption = $$props.animationLengthOption;
		if ('knightSquare' in $$props) knightSquare = $$props.knightSquare;
		if ('kingSquare' in $$props) kingSquare = $$props.kingSquare;
		if ('config' in $$props) config = $$props.config;
		if ('configForm' in $$props) configForm = $$props.configForm;
		if ('boardWidth' in $$props) $$invalidate(12, boardWidth = $$props.boardWidth);
		if ('button1' in $$props) $$invalidate(13, button1 = $$props.button1);
		if ('button2' in $$props) $$invalidate(14, button2 = $$props.button2);
		if ('button3' in $$props) $$invalidate(15, button3 = $$props.button3);
		if ('button4' in $$props) $$invalidate(16, button4 = $$props.button4);
		if ('button5' in $$props) $$invalidate(17, button5 = $$props.button5);
		if ('button6' in $$props) $$invalidate(18, button6 = $$props.button6);
		if ('chessgroundConfig' in $$props) $$invalidate(19, chessgroundConfig = $$props.chessgroundConfig);
	};

	if ($$props && "$$inject" in $$props) {
		$$self.$inject_state($$props.$$inject);
	}

	$$self.$$.update = () => {
		if ($$self.$$.dirty[0] & /*groupIndex, groupedPaths*/ 6) {
			{
				$$invalidate(9, disableNext = groupIndex >= groupedPaths.length - 1);
				$$invalidate(10, disablePrev = groupIndex <= 0);
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
		chessboard_chessground_binding,
		chessboard_size_binding,
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
		init(this, options, instance$6, create_fragment$6, safe_not_equal, {}, add_css$1, [-1, -1]);

		dispatch_dev("SvelteRegisterComponent", {
			component: this,
			tagName: "KnightMoves",
			options,
			id: create_fragment$6.name
		});
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
const kingCastlesTo = (color, side) => color === 'white' ? (side === 'a' ? 2 : 6) : side === 'a' ? 58 : 62;
const rookCastlesTo = (color, side) => color === 'white' ? (side === 'a' ? 3 : 5) : side === 'a' ? 59 : 61;

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

const makeSanWithoutSuffix = (pos, move) => {
    let san = '';
    if (isDrop(move)) {
        if (move.role !== 'pawn')
            san = roleToChar(move.role).toUpperCase();
        san += '@' + makeSquare(move.to);
    }
    else {
        const role = pos.board.getRole(move.from);
        if (!role)
            return '--';
        if (role === 'king' && (pos.board[pos.turn].has(move.to) || Math.abs(move.to - move.from) === 2)) {
            san = move.to > move.from ? 'O-O' : 'O-O-O';
        }
        else {
            const capture = pos.board.occupied.has(move.to)
                || (role === 'pawn' && squareFile(move.from) !== squareFile(move.to));
            if (role !== 'pawn') {
                san = roleToChar(role).toUpperCase();
                // Disambiguation
                let others;
                if (role === 'king')
                    others = kingAttacks(move.to).intersect(pos.board.king);
                else if (role === 'queen')
                    others = queenAttacks(move.to, pos.board.occupied).intersect(pos.board.queen);
                else if (role === 'rook')
                    others = rookAttacks(move.to, pos.board.occupied).intersect(pos.board.rook);
                else if (role === 'bishop')
                    others = bishopAttacks(move.to, pos.board.occupied).intersect(pos.board.bishop);
                else
                    others = knightAttacks(move.to).intersect(pos.board.knight);
                others = others.intersect(pos.board[pos.turn]).without(move.from);
                if (others.nonEmpty()) {
                    const ctx = pos.ctx();
                    for (const from of others) {
                        if (!pos.dests(from, ctx).has(move.to))
                            others = others.without(from);
                    }
                    if (others.nonEmpty()) {
                        let row = false;
                        let column = others.intersects(SquareSet.fromRank(squareRank(move.from)));
                        if (others.intersects(SquareSet.fromFile(squareFile(move.from))))
                            row = true;
                        else
                            column = true;
                        if (column)
                            san += FILE_NAMES[squareFile(move.from)];
                        if (row)
                            san += RANK_NAMES[squareRank(move.from)];
                    }
                }
            }
            else if (capture)
                san = FILE_NAMES[squareFile(move.from)];
            if (capture)
                san += 'x';
            san += makeSquare(move.to);
            if (move.promotion)
                san += '=' + roleToChar(move.promotion).toUpperCase();
        }
    }
    return san;
};
const makeSanAndPlay = (pos, move) => {
    var _a;
    const san = makeSanWithoutSuffix(pos, move);
    pos.play(move);
    if ((_a = pos.outcome()) === null || _a === void 0 ? void 0 : _a.winner)
        return san + '#';
    if (pos.isCheck())
        return san + '+';
    return san;
};
const makeSan = (pos, move) => makeSanAndPlay(pos.clone(), move);
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

// (218:8) <DisappearingContent key={nextMove} slot="centered-content">
function create_default_slot(ctx) {
	let span;
	let t;
	let span_class_value;

	const block = {
		c: function create() {
			span = element("span");
			t = text(/*nextMove*/ ctx[3]);
			attr_dev(span, "class", span_class_value = "tag is-size-3 is-" + /*colorToMove*/ ctx[4]);
			add_location(span, file$2, 218, 10, 5646);
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
		source: "(218:8) <DisappearingContent key={nextMove} slot=\\\"centered-content\\\">",
		ctx
	});

	return block;
}

// (218:8) 
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

			if (dirty[0] & /*colorToMove, nextMove*/ 24 | dirty[1] & /*$$scope*/ 2) {
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
		source: "(218:8) ",
		ctx
	});

	return block;
}

// (232:6) {#if !gameRunning}
function create_if_block_2(ctx) {
	let button;
	let mounted;
	let dispose;

	const block = {
		c: function create() {
			button = element("button");
			button.textContent = "Start Game";
			attr_dev(button, "class", "button is-primary");
			add_location(button, file$2, 232, 8, 6022);
		},
		m: function mount(target, anchor) {
			insert_dev(target, button, anchor);

			if (!mounted) {
				dispose = listen_dev(button, "click", /*startGame*/ ctx[18], false, false, false, false);
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
		source: "(232:6) {#if !gameRunning}",
		ctx
	});

	return block;
}

// (237:6) {#if !gameRunning}
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
			add_location(button, file$2, 237, 8, 6162);
		},
		m: function mount(target, anchor) {
			insert_dev(target, button, anchor);
			append_dev(button, t0);
			append_dev(button, t1);

			if (!mounted) {
				dispose = listen_dev(button, "click", /*click_handler*/ ctx[23], false, false, false, false);
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
		source: "(237:6) {#if !gameRunning}",
		ctx
	});

	return block;
}

// (248:4) {#if gameRunning}
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

	progresstimer.$on("complete", /*endGame*/ ctx[19]);

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
		source: "(248:4) {#if gameRunning}",
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
		/*chessboard_fen_binding*/ ctx[20](value);
	}

	function chessboard_chessground_binding(value) {
		/*chessboard_chessground_binding*/ ctx[21](value);
	}

	function chessboard_size_binding(value) {
		/*chessboard_size_binding*/ ctx[22](value);
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
			add_location(div0, file$2, 209, 4, 5386);
			attr_dev(span, "class", span_class_value = "tag is-size-3 is-" + /*colorToMove*/ ctx[4] + " mr-3");
			add_location(span, file$2, 228, 6, 5905);
			attr_dev(div1, "class", "block is-flex is-justify-content-center");
			set_style(div1, "width", /*boardSize*/ ctx[6] + "px");
			add_location(div1, file$2, 224, 4, 5799);
			attr_dev(div2, "class", "column is-6-desktop");
			add_location(div2, file$2, 208, 2, 5348);
			attr_dev(div3, "class", "block");
			add_location(div3, file$2, 253, 4, 6601);
			attr_dev(div4, "class", "column is-2-desktop");
			add_location(div4, file$2, 252, 2, 6563);
			attr_dev(div5, "class", "columns is-centered");
			add_location(div5, file$2, 207, 0, 5312);
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

			if (dirty[0] & /*nextMove, colorToMove*/ 24 | dirty[1] & /*$$scope*/ 2) {
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

	function handleUserMove(orig, dest) {
		const setup = parseFen(fen).unwrap();
		const chess = Chess.fromSetup(setup).unwrap();
		const origSquare = parseSquare(orig);
		const destSquare = parseSquare(dest);
		const move = { from: origSquare, to: destSquare };
		const san = makeSan(chess, move);
		handleAnswer(san, nextMove);
	}

	function newPosition() {
		const game = getRandomGame();
		const pgnGame = parsePgn(game.pgn)[0];
		const totalPlies = [...pgnGame.moves.mainline()].length;
		const random = Util.getRandomIntBetween(1, totalPlies - 1);
		const positionResult = startingPosition(pgnGame.headers);
		const position = positionResult.unwrap();
		const allNodes = [...pgnGame.moves.mainlineNodes()];
		const previousMove = nextMove;
		const candidateMove = allNodes[random].data.san;

		if (candidateMove.includes("=") || // no promotions
		candidateMove === previousMove || // do not repeat moves
		whoseMoveIsIt(random) !== $orientation || // only show moves for current view
		["O-O", "O-O-O"].includes(candidateMove)) {
			return newPosition(); // no castles
		}

		$$invalidate(3, nextMove = candidateMove);
		$$invalidate(4, colorToMove = whoseMoveIsIt(random));
		let i;
		let move;

		for (i = 0; i < random; i++) {
			const node = allNodes[i];
			move = parseSan(position, node.data.san);
			position.play(move);
		}

		// Bound to Chessboard, automatically updates
		$$invalidate(8, fen = makeFen(position.toSetup()));

		const legalMoves = getLegalMovesForFen(fen);
		chessground.set({ movable: { dests: legalMoves } });
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
		parsePgn,
		startingPosition,
		Util,
		getRandomGame,
		makeSan,
		parseSan,
		makeFen,
		parseFen,
		makeSquare,
		parseSquare,
		persisted,
		ProgressTimer,
		Chess,
		Counter,
		DisappearingContent,
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
		getLegalMovesForFen,
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
