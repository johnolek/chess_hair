import { Util } from 'src/util';
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
		[];
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
const file$4 = "svelte/components/Chessboard.svelte";

function add_css$1(target) {
	append_styles(target, "svelte-iagpad", ".board-wrapper.svelte-iagpad{position:relative;width:100%}.centered-content.svelte-iagpad{position:absolute;top:50%;left:50%;transform:translate(-50%, -50%);z-index:3;opacity:0.8}\n/*# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQ2hlc3Nib2FyZC5zdmVsdGUiLCJzb3VyY2VzIjpbIkNoZXNzYm9hcmQuc3ZlbHRlIl0sInNvdXJjZXNDb250ZW50IjpbIjxzY3JpcHQ+XG4gIGltcG9ydCB7IG9uTW91bnQgfSBmcm9tIFwic3ZlbHRlXCI7XG4gIGltcG9ydCB7IENoZXNzZ3JvdW5kIH0gZnJvbSBcImNoZXNzZ3JvdW5kXCI7XG4gIGltcG9ydCB7IHBpZWNlU2V0IH0gZnJvbSBcIi4uL3N0b3Jlc1wiO1xuXG4gIGxldCBib2FyZENvbnRhaW5lcjtcbiAgZXhwb3J0IGxldCBjaGVzc2dyb3VuZENvbmZpZyA9IHt9O1xuICBleHBvcnQgbGV0IG9yaWVudGF0aW9uID0gXCJ3aGl0ZVwiO1xuXG4gIGV4cG9ydCBsZXQgZmVuID0gbnVsbDtcblxuICAkOiB7XG4gICAgaWYgKGNoZXNzZ3JvdW5kICYmIGZlbikge1xuICAgICAgY2hlc3Nncm91bmQuc2V0KHtcbiAgICAgICAgZmVuOiBmZW4sXG4gICAgICAgIGhpZ2hsaWdodDoge1xuICAgICAgICAgIGxhc3RNb3ZlOiBmYWxzZSxcbiAgICAgICAgICBjaGVjazogZmFsc2UsXG4gICAgICAgIH0sXG4gICAgICB9KTtcbiAgICB9XG4gIH1cblxuICBleHBvcnQgbGV0IGNoZXNzZ3JvdW5kO1xuICBleHBvcnQgbGV0IHNpemU7XG5cbiAgZXhwb3J0IGxldCBwaWVjZVNldE92ZXJyaWRlID0gbnVsbDtcbiAgZXhwb3J0IGxldCBib2FyZFN0eWxlT3ZlcnJpZGUgPSBudWxsO1xuXG4gIGxldCBtYXhXaWR0aCA9IFwiNzB2aFwiO1xuXG4gICQ6IHtcbiAgICBpZiAob3JpZW50YXRpb24gJiYgY2hlc3Nncm91bmQpIHtcbiAgICAgIGNoZXNzZ3JvdW5kLnNldCh7IG9yaWVudGF0aW9uOiBvcmllbnRhdGlvbiB9KTtcbiAgICB9XG4gIH1cblxuICBvbk1vdW50KCgpID0+IHtcbiAgICBjaGVzc2dyb3VuZCA9IENoZXNzZ3JvdW5kKGJvYXJkQ29udGFpbmVyLCBjaGVzc2dyb3VuZENvbmZpZyk7XG4gIH0pO1xuPC9zY3JpcHQ+XG5cbnsjaWYgcGllY2VTZXRPdmVycmlkZX1cbiAgPGxpbmtcbiAgICBpZD1cInBpZWNlLXNwcml0ZVwiXG4gICAgaHJlZj1cIi9waWVjZS1jc3Mve3BpZWNlU2V0T3ZlcnJpZGV9LmNzc1wiXG4gICAgcmVsPVwic3R5bGVzaGVldFwiXG4gIC8+XG57OmVsc2V9XG4gIDxsaW5rIGlkPVwicGllY2Utc3ByaXRlXCIgaHJlZj1cIi9waWVjZS1jc3MveyRwaWVjZVNldH0uY3NzXCIgcmVsPVwic3R5bGVzaGVldFwiIC8+XG57L2lmfVxuXG48ZGl2XG4gIGNsYXNzPVwiYm9hcmQtd3JhcHBlclwiXG4gIHN0eWxlPVwibWF4LXdpZHRoOiB7bWF4V2lkdGh9XCJcbiAgYmluZDpjbGllbnRXaWR0aD17c2l6ZX1cbj5cbiAgPGRpdiBjbGFzcz1cImNlbnRlcmVkLWNvbnRlbnRcIj5cbiAgICA8c2xvdCBuYW1lPVwiY2VudGVyZWQtY29udGVudFwiPjwvc2xvdD5cbiAgPC9kaXY+XG4gIDxkaXZcbiAgICBjbGFzcz1cImlzMmQge2JvYXJkU3R5bGVPdmVycmlkZSA/IGJvYXJkU3R5bGVPdmVycmlkZSA6ICcnfVwiXG4gICAgYmluZDp0aGlzPXtib2FyZENvbnRhaW5lcn1cbiAgICBzdHlsZT1cInBvc2l0aW9uOiByZWxhdGl2ZTt3aWR0aDoge3NpemV9cHg7IGhlaWdodDoge3NpemV9cHhcIlxuICA+PC9kaXY+XG4gIDxkaXYgY2xhc3M9XCJibG9jayBtdC0yXCI+XG4gICAgPHNsb3QgbmFtZT1cImJlbG93LWJvYXJkXCI+PC9zbG90PlxuICA8L2Rpdj5cbjwvZGl2PlxuXG48c3R5bGU+XG4gIC5ib2FyZC13cmFwcGVyIHtcbiAgICBwb3NpdGlvbjogcmVsYXRpdmU7XG4gICAgd2lkdGg6IDEwMCU7XG4gIH1cbiAgLmNlbnRlcmVkLWNvbnRlbnQge1xuICAgIHBvc2l0aW9uOiBhYnNvbHV0ZTtcbiAgICB0b3A6IDUwJTtcbiAgICBsZWZ0OiA1MCU7XG4gICAgdHJhbnNmb3JtOiB0cmFuc2xhdGUoLTUwJSwgLTUwJSk7XG4gICAgei1pbmRleDogMzsgLyogcmVxdWlyZWQgdG8gYXBwZWFyIGluIGZyb250IG9mIHBpZWNlcyAqL1xuICAgIG9wYWNpdHk6IDAuODtcbiAgfVxuPC9zdHlsZT5cbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUF1RUUsNEJBQWUsQ0FDYixRQUFRLENBQUUsUUFBUSxDQUNsQixLQUFLLENBQUUsSUFDVCxDQUNBLCtCQUFrQixDQUNoQixRQUFRLENBQUUsUUFBUSxDQUNsQixHQUFHLENBQUUsR0FBRyxDQUNSLElBQUksQ0FBRSxHQUFHLENBQ1QsU0FBUyxDQUFFLFVBQVUsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQ2hDLE9BQU8sQ0FBRSxDQUFDLENBQ1YsT0FBTyxDQUFFLEdBQ1gifQ== */");
}

const get_below_board_slot_changes = dirty => ({});
const get_below_board_slot_context = ctx => ({});
const get_centered_content_slot_changes = dirty => ({});
const get_centered_content_slot_context = ctx => ({});

// (49:0) {:else}
function create_else_block(ctx) {
	let link;
	let link_href_value;

	const block = {
		c: function create() {
			link = element("link");
			attr_dev(link, "id", "piece-sprite");
			attr_dev(link, "href", link_href_value = "/piece-css/" + /*$pieceSet*/ ctx[4] + ".css");
			attr_dev(link, "rel", "stylesheet");
			add_location(link, file$4, 49, 2, 931);
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
		id: create_else_block.name,
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
			add_location(link, file$4, 43, 2, 822);
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

function create_fragment$4(ctx) {
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
		return create_else_block;
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
			add_location(div0, file$4, 57, 2, 1107);

			attr_dev(div1, "class", div1_class_value = "is2d " + (/*boardStyleOverride*/ ctx[2]
			? /*boardStyleOverride*/ ctx[2]
			: '') + " svelte-iagpad");

			set_style(div1, "position", "relative");
			set_style(div1, "width", /*size*/ ctx[0] + "px");
			set_style(div1, "height", /*size*/ ctx[0] + "px");
			add_location(div1, file$4, 60, 2, 1191);
			attr_dev(div2, "class", "block mt-2");
			add_location(div2, file$4, 65, 2, 1368);
			attr_dev(div3, "class", "board-wrapper svelte-iagpad");
			set_style(div3, "max-width", /*maxWidth*/ ctx[5]);
			add_render_callback(() => /*div3_elementresize_handler*/ ctx[13].call(div3));
			add_location(div3, file$4, 52, 0, 1016);
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
		id: create_fragment$4.name,
		type: "component",
		source: "",
		ctx
	});

	return block;
}

function instance$4($$self, $$props, $$invalidate) {
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
			instance$4,
			create_fragment$4,
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
			id: create_fragment$4.name
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

/**
 * @param {any} obj
 * @returns {boolean}
 */
function is_date(obj) {
	return Object.prototype.toString.call(obj) === '[object Date]';
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
function cubicOut(t) {
	const f = t - 1.0;
	return f * f * f + 1.0;
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

/* svelte/components/ProgressTimer.svelte generated by Svelte v4.2.18 */
const file$3 = "svelte/components/ProgressTimer.svelte";

function add_css(target) {
	append_styles(target, "svelte-l2ukrv", "progress.svelte-l2ukrv{position:relative;width:100%}\n/*# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiUHJvZ3Jlc3NUaW1lci5zdmVsdGUiLCJzb3VyY2VzIjpbIlByb2dyZXNzVGltZXIuc3ZlbHRlIl0sInNvdXJjZXNDb250ZW50IjpbIjxzY3JpcHQ+XG4gIGltcG9ydCB7IG9uTW91bnQsIG9uRGVzdHJveSwgY3JlYXRlRXZlbnREaXNwYXRjaGVyIH0gZnJvbSBcInN2ZWx0ZVwiO1xuICBpbXBvcnQgeyB0d2VlbmVkIH0gZnJvbSBcInN2ZWx0ZS9tb3Rpb25cIjtcbiAgaW1wb3J0IHsgbGluZWFyIH0gZnJvbSBcInN2ZWx0ZS9lYXNpbmdcIjtcblxuICBjb25zdCBzZWNvbmRQcm9ncmVzcyA9IHR3ZWVuZWQoMCwge1xuICAgIGR1cmF0aW9uOiAxMDAwLFxuICAgIGVhc2luZzogbGluZWFyLFxuICB9KTtcblxuICBleHBvcnQgbGV0IG1heCA9IDYwO1xuICBleHBvcnQgbGV0IHdpZHRoO1xuXG4gIGxldCB0aW1lUmVtYWluaW5nO1xuXG4gIGNvbnN0IGRpc3BhdGNoID0gY3JlYXRlRXZlbnREaXNwYXRjaGVyKCk7XG5cbiAgJDoge1xuICAgIHRpbWVSZW1haW5pbmcgPSBtYXggLSAkc2Vjb25kUHJvZ3Jlc3M7XG4gIH1cblxuICAkOiB7XG4gICAgaWYgKHRpbWVSZW1haW5pbmcgPD0gMCkge1xuICAgICAgZGlzcGF0Y2goXCJjb21wbGV0ZVwiKTtcbiAgICAgIGNsZWFySW50ZXJ2YWwodXBkYXRlSW50ZXJ2YWwpO1xuICAgIH1cbiAgfVxuXG4gIGxldCB1cGRhdGVJbnRlcnZhbDtcblxuICBvbk1vdW50KCgpID0+IHtcbiAgICBzZWNvbmRQcm9ncmVzcy51cGRhdGUoKHByZXZpb3VzKSA9PiBwcmV2aW91cyArIDEpO1xuICAgIHVwZGF0ZUludGVydmFsID0gc2V0SW50ZXJ2YWwoKCkgPT4ge1xuICAgICAgc2Vjb25kUHJvZ3Jlc3MudXBkYXRlKChwcmV2aW91cykgPT4gcHJldmlvdXMgKyAxKTtcbiAgICB9LCAxMDAwKTtcbiAgfSk7XG5cbiAgb25EZXN0cm95KCgpID0+IGNsZWFySW50ZXJ2YWwodXBkYXRlSW50ZXJ2YWwpKTtcbjwvc2NyaXB0PlxuXG48ZGl2IGNsYXNzPVwiZGl2XCIgc3R5bGU9XCJ3aWR0aDoge3dpZHRofXB4XCI+XG4gIDxwcm9ncmVzcyBjbGFzcz1cInByb2dyZXNzIGlzLXN1Y2Nlc3MgbWItMFwiIHZhbHVlPXskc2Vjb25kUHJvZ3Jlc3N9IHttYXh9XG4gID48L3Byb2dyZXNzPlxuICA8ZGl2IGNsYXNzPVwiaGFzLXRleHQtY2VudGVyZWQgaXMtc2l6ZS0zXCI+XG4gICAge3RpbWVSZW1haW5pbmcudG9GaXhlZCgyKX1cbiAgPC9kaXY+XG48L2Rpdj5cblxuPHN0eWxlPlxuICBwcm9ncmVzcyB7XG4gICAgcG9zaXRpb246IHJlbGF0aXZlO1xuICAgIHdpZHRoOiAxMDAlO1xuICB9XG48L3N0eWxlPlxuIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQWlERSxzQkFBUyxDQUNQLFFBQVEsQ0FBRSxRQUFRLENBQ2xCLEtBQUssQ0FBRSxJQUNUIn0= */");
}

function create_fragment$3(ctx) {
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
			add_location(progress, file$3, 41, 2, 850);
			attr_dev(div0, "class", "has-text-centered is-size-3");
			add_location(div0, file$3, 43, 2, 940);
			attr_dev(div1, "class", "div");
			set_style(div1, "width", /*width*/ ctx[1] + "px");
			add_location(div1, file$3, 40, 0, 805);
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
		id: create_fragment$3.name,
		type: "component",
		source: "",
		ctx
	});

	return block;
}

function instance$3($$self, $$props, $$invalidate) {
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
		init(this, options, instance$3, create_fragment$3, safe_not_equal, { max: 0, width: 1 }, add_css);

		dispatch_dev("SvelteRegisterComponent", {
			component: this,
			tagName: "ProgressTimer",
			options,
			id: create_fragment$3.name
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

/* svelte/components/Counter.svelte generated by Svelte v4.2.18 */
const file$2 = "svelte/components/Counter.svelte";

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
			add_location(div, file$2, 13, 8, 329);
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

function create_fragment$2(ctx) {
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
			add_location(h2, file$2, 10, 4, 231);
			attr_dev(div0, "class", "number-container");
			add_location(div0, file$2, 11, 4, 270);
			attr_dev(div1, "class", "container has-text-centered");
			add_location(div1, file$2, 9, 2, 185);
			attr_dev(div2, "class", "box score-container");
			add_location(div2, file$2, 8, 0, 149);
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
		id: create_fragment$2.name,
		type: "component",
		source: "",
		ctx
	});

	return block;
}

function instance$2($$self, $$props, $$invalidate) {
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
		init(this, options, instance$2, create_fragment$2, safe_not_equal, { number: 0, title: 1 });

		dispatch_dev("SvelteRegisterComponent", {
			component: this,
			tagName: "Counter",
			options,
			id: create_fragment$2.name
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
const file$1 = "svelte/components/DisappearingContent.svelte";

// (22:0) {#if showContent}
function create_if_block$1(ctx) {
	let div;
	let div_transition;
	let current;
	const default_slot_template = /*#slots*/ ctx[4].default;
	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[3], null);

	const block = {
		c: function create() {
			div = element("div");
			if (default_slot) default_slot.c();
			add_location(div, file$1, 22, 2, 332);
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
		id: create_if_block$1.name,
		type: "if",
		source: "(22:0) {#if showContent}",
		ctx
	});

	return block;
}

function create_fragment$1(ctx) {
	let if_block_anchor;
	let current;
	let if_block = /*showContent*/ ctx[0] && create_if_block$1(ctx);

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
					if_block = create_if_block$1(ctx);
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
		id: create_fragment$1.name,
		type: "component",
		source: "",
		ctx
	});

	return block;
}

function instance$1($$self, $$props, $$invalidate) {
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
		init(this, options, instance$1, create_fragment$1, safe_not_equal, { duration: 1, key: 2 });

		dispatch_dev("SvelteRegisterComponent", {
			component: this,
			tagName: "DisappearingContent",
			options,
			id: create_fragment$1.name
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
const file = "svelte/NotationTrainer.svelte";

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
			add_location(span, file, 218, 10, 5646);
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
			add_location(button, file, 232, 8, 6022);
		},
		m: function mount(target, anchor) {
			insert_dev(target, button, anchor);

			if (!mounted) {
				dispose = listen_dev(button, "click", /*startGame*/ ctx[18], false);
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
			add_location(button, file, 237, 8, 6162);
		},
		m: function mount(target, anchor) {
			insert_dev(target, button, anchor);
			append_dev(button, t0);
			append_dev(button, t1);

			if (!mounted) {
				dispose = listen_dev(button, "click", /*click_handler*/ ctx[23], false);
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
function create_if_block(ctx) {
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
		id: create_if_block.name,
		type: "if",
		source: "(248:4) {#if gameRunning}",
		ctx
	});

	return block;
}

function create_fragment(ctx) {
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
	let if_block2 = /*gameRunning*/ ctx[9] && create_if_block(ctx);

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
			add_location(div0, file, 209, 4, 5386);
			attr_dev(span, "class", span_class_value = "tag is-size-3 is-" + /*colorToMove*/ ctx[4] + " mr-3");
			add_location(span, file, 228, 6, 5905);
			attr_dev(div1, "class", "block is-flex is-justify-content-center");
			set_style(div1, "width", /*boardSize*/ ctx[6] + "px");
			add_location(div1, file, 224, 4, 5799);
			attr_dev(div2, "class", "column is-6-desktop");
			add_location(div2, file, 208, 2, 5348);
			attr_dev(div3, "class", "block");
			add_location(div3, file, 253, 4, 6601);
			attr_dev(div4, "class", "column is-2-desktop");
			add_location(div4, file, 252, 2, 6563);
			attr_dev(div5, "class", "columns is-centered");
			add_location(div5, file, 207, 0, 5312);
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
					if_block2 = create_if_block(ctx);
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
		id: create_fragment.name,
		type: "component",
		source: "",
		ctx
	});

	return block;
}

function whoseMoveIsIt(ply) {
	return ply % 2 === 0 ? "white" : "black";
}

function instance($$self, $$props, $$invalidate) {
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
		init(this, options, instance, create_fragment, safe_not_equal, {}, null, [-1, -1]);

		dispatch_dev("SvelteRegisterComponent", {
			component: this,
			tagName: "NotationTrainer",
			options,
			id: create_fragment.name
		});
	}
}

export { NotationTrainer as default };
//# sourceMappingURL=notation_trainer.js.map
