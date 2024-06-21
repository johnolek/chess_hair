import Config, { ConfigForm } from 'src/local_config';
import { boardOptions, pieceSetOptions } from 'src/board/options';

/** @returns {void} */
function noop() {}

const identity = (x) => x;

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
function hash(str) {
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
	const name = `__svelte_${hash(rule)}_${uid}`;
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

/** @returns {void} */
function outro_and_destroy_block(block, lookup) {
	transition_out(block, 1, 1, () => {
		lookup.delete(block.key);
	});
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

var Pe=["a","b","c","d","e","f","g","h"],Je=["1","2","3","4","5","6","7","8"],H=["white","black"],Y=["pawn","knight","bishop","rook","queen","king"],Nn=["a","h"],oe=e=>"role"in e;var g=e=>e!==void 0,P=e=>e==="white"?"black":"white",J=e=>e>>3,L=e=>e&7,se=e=>{switch(e){case"pawn":return "p";case"knight":return "n";case"bishop":return "b";case"rook":return "r";case"queen":return "q";case"king":return "k"}};function Me(e){switch(e.toLowerCase()){case"p":return "pawn";case"n":return "knight";case"b":return "bishop";case"r":return "rook";case"q":return "queen";case"k":return "king";default:return}}function ue(e){if(e.length!==2)return;let t=e.charCodeAt(0)-"a".charCodeAt(0),n=e.charCodeAt(1)-"1".charCodeAt(0);if(!(t<0||t>=8||n<0||n>=8))return t+8*n}var W=e=>Pe[L(e)]+Je[J(e)];var Dt=e=>oe(e)?`${se(e.role).toUpperCase()}@${W(e.to)}`:W(e.from)+W(e.to)+(e.promotion?se(e.promotion):""),Ie=(e,t)=>e==="white"?t==="a"?2:6:t==="a"?58:62,et=(e,t)=>e==="white"?t==="a"?3:5:t==="a"?59:61;var On=e=>(e=e-(e>>>1&1431655765),e=(e&858993459)+(e>>>2&858993459),Math.imul(e+(e>>>4)&252645135,16843009)>>24),Lt=e=>(e=e>>>8&16711935|(e&16711935)<<8,e>>>16&65535|(e&65535)<<16),Tn=e=>(e=e>>>1&1431655765|(e&1431655765)<<1,e=e>>>2&858993459|(e&858993459)<<2,e=e>>>4&252645135|(e&252645135)<<4,Lt(e)),l=class e{constructor(t,n){this.lo=t|0,this.hi=n|0;}static fromSquare(t){return t>=32?new e(0,1<<t-32):new e(1<<t,0)}static fromRank(t){return new e(255,0).shl64(8*t)}static fromFile(t){return new e(16843009<<t,16843009<<t)}static empty(){return new e(0,0)}static full(){return new e(4294967295,4294967295)}static corners(){return new e(129,2164260864)}static center(){return new e(402653184,24)}static backranks(){return new e(255,4278190080)}static backrank(t){return t==="white"?new e(255,0):new e(0,4278190080)}static lightSquares(){return new e(1437226410,1437226410)}static darkSquares(){return new e(2857740885,2857740885)}complement(){return new e(~this.lo,~this.hi)}xor(t){return new e(this.lo^t.lo,this.hi^t.hi)}union(t){return new e(this.lo|t.lo,this.hi|t.hi)}intersect(t){return new e(this.lo&t.lo,this.hi&t.hi)}diff(t){return new e(this.lo&~t.lo,this.hi&~t.hi)}intersects(t){return this.intersect(t).nonEmpty()}isDisjoint(t){return this.intersect(t).isEmpty()}supersetOf(t){return t.diff(this).isEmpty()}subsetOf(t){return this.diff(t).isEmpty()}shr64(t){return t>=64?e.empty():t>=32?new e(this.hi>>>t-32,0):t>0?new e(this.lo>>>t^this.hi<<32-t,this.hi>>>t):this}shl64(t){return t>=64?e.empty():t>=32?new e(0,this.lo<<t-32):t>0?new e(this.lo<<t,this.hi<<t^this.lo>>>32-t):this}bswap64(){return new e(Lt(this.hi),Lt(this.lo))}rbit64(){return new e(Tn(this.hi),Tn(this.lo))}minus64(t){let n=this.lo-t.lo,r=(n&t.lo&1)+(t.lo>>>1)+(n>>>1)>>>31;return new e(n,this.hi-(t.hi+r))}equals(t){return this.lo===t.lo&&this.hi===t.hi}size(){return On(this.lo)+On(this.hi)}isEmpty(){return this.lo===0&&this.hi===0}nonEmpty(){return this.lo!==0||this.hi!==0}has(t){return (t>=32?this.hi&1<<t-32:this.lo&1<<t)!==0}set(t,n){return n?this.with(t):this.without(t)}with(t){return t>=32?new e(this.lo,this.hi|1<<t-32):new e(this.lo|1<<t,this.hi)}without(t){return t>=32?new e(this.lo,this.hi&~(1<<t-32)):new e(this.lo&~(1<<t),this.hi)}toggle(t){return t>=32?new e(this.lo,this.hi^1<<t-32):new e(this.lo^1<<t,this.hi)}last(){if(this.hi!==0)return 63-Math.clz32(this.hi);if(this.lo!==0)return 31-Math.clz32(this.lo)}first(){if(this.lo!==0)return 31-Math.clz32(this.lo&-this.lo);if(this.hi!==0)return 63-Math.clz32(this.hi&-this.hi)}withoutFirst(){return this.lo!==0?new e(this.lo&this.lo-1,this.hi):new e(0,this.hi&this.hi-1)}moreThanOne(){return this.hi!==0&&this.lo!==0||(this.lo&this.lo-1)!==0||(this.hi&this.hi-1)!==0}singleSquare(){return this.moreThanOne()?void 0:this.last()}*[Symbol.iterator](){let t=this.lo,n=this.hi;for(;t!==0;){let r=31-Math.clz32(t&-t);t^=1<<r,yield r;}for(;n!==0;){let r=31-Math.clz32(n&-n);n^=1<<r,yield 32+r;}}*reversed(){let t=this.lo,n=this.hi;for(;n!==0;){let r=31-Math.clz32(n);n^=1<<r,yield 32+r;}for(;t!==0;){let r=31-Math.clz32(t);t^=1<<r,yield r;}}};var tt=(e,t)=>{let n=l.empty();for(let r of t){let i=e+r;0<=i&&i<64&&Math.abs(L(e)-L(i))<=2&&(n=n.with(i));}return n},ke=e=>{let t=[];for(let n=0;n<64;n++)t[n]=e(n);return t},yi=ke(e=>tt(e,[-9,-8,-7,-1,1,7,8,9])),xi=ke(e=>tt(e,[-17,-15,-10,-6,6,10,15,17])),Si={white:ke(e=>tt(e,[7,9])),black:ke(e=>tt(e,[-7,-9]))},ae=e=>yi[e],Oe=e=>xi[e],be=(e,t)=>Si[e][t],It=ke(e=>l.fromFile(L(e)).without(e)),Bt=ke(e=>l.fromRank(J(e)).without(e)),Kt=ke(e=>{let t=new l(134480385,2151686160),n=8*(J(e)-L(e));return (n>=0?t.shl64(n):t.shr64(-n)).without(e)}),zt=ke(e=>{let t=new l(270549120,16909320),n=8*(J(e)+L(e)-7);return (n>=0?t.shl64(n):t.shr64(-n)).without(e)}),Ft=(e,t,n)=>{let r=n.intersect(t),i=r.bswap64();return r=r.minus64(e),i=i.minus64(e.bswap64()),r.xor(i.bswap64()).intersect(t)},Ci=(e,t)=>Ft(l.fromSquare(e),It[e],t),Pi=(e,t)=>{let n=Bt[e],r=t.intersect(n),i=r.rbit64();return r=r.minus64(l.fromSquare(e)),i=i.minus64(l.fromSquare(63-e)),r.xor(i.rbit64()).intersect(n)},we=(e,t)=>{let n=l.fromSquare(e);return Ft(n,Kt[e],t).xor(Ft(n,zt[e],t))},ve=(e,t)=>Ci(e,t).xor(Pi(e,t)),Be=(e,t)=>we(e,t).xor(ve(e,t)),nt=(e,t,n)=>{switch(e.role){case"pawn":return be(e.color,t);case"knight":return Oe(t);case"bishop":return we(t,n);case"rook":return ve(t,n);case"queen":return Be(t,n);case"king":return ae(t)}},rt=(e,t)=>{let n=l.fromSquare(t);return Bt[e].intersects(n)?Bt[e].with(e):zt[e].intersects(n)?zt[e].with(e):Kt[e].intersects(n)?Kt[e].with(e):It[e].intersects(n)?It[e].with(e):l.empty()},ye=(e,t)=>rt(e,t).intersect(l.full().shl64(e).xor(l.full().shl64(t))).withoutFirst();var de=class e{constructor(){}static default(){let t=new e;return t.reset(),t}reset(){this.occupied=new l(65535,4294901760),this.promoted=l.empty(),this.white=new l(65535,0),this.black=new l(0,4294901760),this.pawn=new l(65280,16711680),this.knight=new l(66,1107296256),this.bishop=new l(36,603979776),this.rook=new l(129,2164260864),this.queen=new l(8,134217728),this.king=new l(16,268435456);}static empty(){let t=new e;return t.clear(),t}clear(){this.occupied=l.empty(),this.promoted=l.empty();for(let t of H)this[t]=l.empty();for(let t of Y)this[t]=l.empty();}clone(){let t=new e;t.occupied=this.occupied,t.promoted=this.promoted;for(let n of H)t[n]=this[n];for(let n of Y)t[n]=this[n];return t}getColor(t){if(this.white.has(t))return "white";if(this.black.has(t))return "black"}getRole(t){for(let n of Y)if(this[n].has(t))return n}get(t){let n=this.getColor(t);if(!n)return;let r=this.getRole(t),i=this.promoted.has(t);return {color:n,role:r,promoted:i}}take(t){let n=this.get(t);return n&&(this.occupied=this.occupied.without(t),this[n.color]=this[n.color].without(t),this[n.role]=this[n.role].without(t),n.promoted&&(this.promoted=this.promoted.without(t))),n}set(t,n){let r=this.take(t);return this.occupied=this.occupied.with(t),this[n.color]=this[n.color].with(t),this[n.role]=this[n.role].with(t),n.promoted&&(this.promoted=this.promoted.with(t)),r}has(t){return this.occupied.has(t)}*[Symbol.iterator](){for(let t of this.occupied)yield [t,this.get(t)];}pieces(t,n){return this[t].intersect(this[n])}rooksAndQueens(){return this.rook.union(this.queen)}bishopsAndQueens(){return this.bishop.union(this.queen)}kingOf(t){return this.pieces(t,"king").singleSquare()}};var he=class e{constructor(){}static empty(){let t=new e;for(let n of Y)t[n]=0;return t}static fromBoard(t,n){let r=new e;for(let i of Y)r[i]=t.pieces(n,i).size();return r}clone(){let t=new e;for(let n of Y)t[n]=this[n];return t}equals(t){return Y.every(n=>this[n]===t[n])}add(t){let n=new e;for(let r of Y)n[r]=this[r]+t[r];return n}nonEmpty(){return Y.some(t=>this[t]>0)}isEmpty(){return !this.nonEmpty()}hasPawns(){return this.pawn>0}hasNonPawns(){return this.knight>0||this.bishop>0||this.rook>0||this.queen>0||this.king>0}size(){return this.pawn+this.knight+this.bishop+this.rook+this.queen+this.king}},Ee=class e{constructor(t,n){this.white=t,this.black=n;}static empty(){return new e(he.empty(),he.empty())}static fromBoard(t){return new e(he.fromBoard(t,"white"),he.fromBoard(t,"black"))}clone(){return new e(this.white.clone(),this.black.clone())}equals(t){return this.white.equals(t.white)&&this.black.equals(t.black)}add(t){return new e(this.white.add(t.white),this.black.add(t.black))}count(t){return this.white[t]+this.black[t]}size(){return this.white.size()+this.black.size()}isEmpty(){return this.white.isEmpty()&&this.black.isEmpty()}nonEmpty(){return !this.isEmpty()}hasPawns(){return this.white.hasPawns()||this.black.hasPawns()}hasNonPawns(){return this.white.hasNonPawns()||this.black.hasNonPawns()}},xe=class e{constructor(t,n){this.white=t,this.black=n;}static default(){return new e(3,3)}clone(){return new e(this.white,this.black)}equals(t){return this.white===t.white&&this.black===t.black}};var it=class{unwrap(t,n){let r=this._chain(i=>m.ok(t?t(i):i),i=>n?m.ok(n(i)):m.err(i));if(r.isErr)throw r.error;return r.value}map(t,n){return this._chain(r=>m.ok(t(r)),r=>m.err(n?n(r):r))}chain(t,n){return this._chain(t,n||(r=>m.err(r)))}},$t=class extends it{constructor(t){super(),this.value=void 0,this.isOk=!0,this.isErr=!1,this.value=t;}_chain(t,n){return t(this.value)}},Ht=class extends it{constructor(t){super(),this.error=void 0,this.isOk=!1,this.isErr=!0,this.error=t;}_chain(t,n){return n(this.error)}},m;(function(e){e.ok=function(t){return new $t(t)},e.err=function(t){return new Ht(t||new Error)},e.all=function(t){if(Array.isArray(t)){let i=[];for(let o=0;o<t.length;o++){let s=t[o];if(s.isErr)return s;i.push(s.value);}return e.ok(i)}let n={},r=Object.keys(t);for(let i=0;i<r.length;i++){let o=t[r[i]];if(o.isErr)return o;n[r[i]]=o.value;}return e.ok(n)};})(m||(m={}));var T;(function(e){e.Empty="ERR_EMPTY",e.OppositeCheck="ERR_OPPOSITE_CHECK",e.ImpossibleCheck="ERR_IMPOSSIBLE_CHECK",e.PawnsOnBackrank="ERR_PAWNS_ON_BACKRANK",e.Kings="ERR_KINGS",e.Variant="ERR_VARIANT";})(T||(T={}));var q=class extends Error{},Mi=(e,t,n,r)=>n[t].intersect(ve(e,r).intersect(n.rooksAndQueens()).union(we(e,r).intersect(n.bishopsAndQueens())).union(Oe(e).intersect(n.knight)).union(ae(e).intersect(n.king)).union(be(P(t),e).intersect(n.pawn))),ce=class e{constructor(){}static default(){let t=new e;return t.unmovedRooks=l.corners(),t.rook={white:{a:0,h:7},black:{a:56,h:63}},t.path={white:{a:new l(14,0),h:new l(96,0)},black:{a:new l(0,234881024),h:new l(0,1610612736)}},t}static empty(){let t=new e;return t.unmovedRooks=l.empty(),t.rook={white:{a:void 0,h:void 0},black:{a:void 0,h:void 0}},t.path={white:{a:l.empty(),h:l.empty()},black:{a:l.empty(),h:l.empty()}},t}clone(){let t=new e;return t.unmovedRooks=this.unmovedRooks,t.rook={white:{a:this.rook.white.a,h:this.rook.white.h},black:{a:this.rook.black.a,h:this.rook.black.h}},t.path={white:{a:this.path.white.a,h:this.path.white.h},black:{a:this.path.black.a,h:this.path.black.h}},t}add(t,n,r,i){let o=Ie(t,n),s=et(t,n);this.unmovedRooks=this.unmovedRooks.with(i),this.rook[t][n]=i,this.path[t][n]=ye(i,s).with(s).union(ye(r,o).with(o)).without(r).without(i);}static fromSetup(t){let n=e.empty(),r=t.unmovedRooks.intersect(t.board.rook);for(let i of H){let o=l.backrank(i),s=t.board.kingOf(i);if(!g(s)||!o.has(s))continue;let a=r.intersect(t.board[i]).intersect(o),u=a.first();g(u)&&u<s&&n.add(i,"a",s,u);let c=a.last();g(c)&&s<c&&n.add(i,"h",s,c);}return n}discardRook(t){if(this.unmovedRooks.has(t)){this.unmovedRooks=this.unmovedRooks.without(t);for(let n of H)for(let r of Nn)this.rook[n][r]===t&&(this.rook[n][r]=void 0);}}discardColor(t){this.unmovedRooks=this.unmovedRooks.diff(l.backrank(t)),this.rook[t].a=void 0,this.rook[t].h=void 0;}},ee=class{constructor(t){this.rules=t;}reset(){this.board=de.default(),this.pockets=void 0,this.turn="white",this.castles=ce.default(),this.epSquare=void 0,this.remainingChecks=void 0,this.halfmoves=0,this.fullmoves=1;}setupUnchecked(t){this.board=t.board.clone(),this.board.promoted=l.empty(),this.pockets=void 0,this.turn=t.turn,this.castles=ce.fromSetup(t),this.epSquare=Ei(this,t.epSquare),this.remainingChecks=void 0,this.halfmoves=t.halfmoves,this.fullmoves=t.fullmoves;}kingAttackers(t,n,r){return Mi(t,n,this.board,r)}playCaptureAt(t,n){this.halfmoves=0,n.role==="rook"&&this.castles.discardRook(t),this.pockets&&this.pockets[P(n.color)][n.promoted?"pawn":n.role]++;}ctx(){let t=this.isVariantEnd(),n=this.board.kingOf(this.turn);if(!g(n))return {king:n,blockers:l.empty(),checkers:l.empty(),variantEnd:t,mustCapture:!1};let r=ve(n,l.empty()).intersect(this.board.rooksAndQueens()).union(we(n,l.empty()).intersect(this.board.bishopsAndQueens())).intersect(this.board[P(this.turn)]),i=l.empty();for(let s of r){let a=ye(n,s).intersect(this.board.occupied);a.moreThanOne()||(i=i.union(a));}let o=this.kingAttackers(n,P(this.turn),this.board.occupied);return {king:n,blockers:i,checkers:o,variantEnd:t,mustCapture:!1}}clone(){var t,n;let r=new this.constructor;return r.board=this.board.clone(),r.pockets=(t=this.pockets)===null||t===void 0?void 0:t.clone(),r.turn=this.turn,r.castles=this.castles.clone(),r.epSquare=this.epSquare,r.remainingChecks=(n=this.remainingChecks)===null||n===void 0?void 0:n.clone(),r.halfmoves=this.halfmoves,r.fullmoves=this.fullmoves,r}validate(t){if(this.board.occupied.isEmpty())return m.err(new q(T.Empty));if(this.board.king.size()!==2)return m.err(new q(T.Kings));if(!g(this.board.kingOf(this.turn)))return m.err(new q(T.Kings));let n=this.board.kingOf(P(this.turn));return g(n)?this.kingAttackers(n,this.turn,this.board.occupied).nonEmpty()?m.err(new q(T.OppositeCheck)):l.backranks().intersects(this.board.pawn)?m.err(new q(T.PawnsOnBackrank)):t?.ignoreImpossibleCheck?m.ok(void 0):this.validateCheckers():m.err(new q(T.Kings))}validateCheckers(){let t=this.board.kingOf(this.turn);if(g(t)){let n=this.kingAttackers(t,P(this.turn),this.board.occupied);if(n.nonEmpty()){if(g(this.epSquare)){let r=this.epSquare^8,i=this.epSquare^24;if(n.moreThanOne()||n.first()!==r&&this.kingAttackers(t,P(this.turn),this.board.occupied.without(r).with(i)).nonEmpty())return m.err(new q(T.ImpossibleCheck))}else if(n.size()>2||n.size()===2&&rt(n.first(),n.last()).has(t))return m.err(new q(T.ImpossibleCheck))}}return m.ok(void 0)}dropDests(t){return l.empty()}dests(t,n){if(n=n||this.ctx(),n.variantEnd)return l.empty();let r=this.board.get(t);if(!r||r.color!==this.turn)return l.empty();let i,o;if(r.role==="pawn"){i=be(this.turn,t).intersect(this.board[P(this.turn)]);let s=this.turn==="white"?8:-8,a=t+s;if(0<=a&&a<64&&!this.board.occupied.has(a)){i=i.with(a);let u=this.turn==="white"?t<16:t>=64-16,c=a+s;u&&!this.board.occupied.has(c)&&(i=i.with(c));}if(g(this.epSquare)&&_i(this,t,n)){let u=this.epSquare-s;(n.checkers.isEmpty()||n.checkers.singleSquare()===u)&&(o=l.fromSquare(this.epSquare));}}else r.role==="bishop"?i=we(t,this.board.occupied):r.role==="knight"?i=Oe(t):r.role==="rook"?i=ve(t,this.board.occupied):r.role==="queen"?i=Be(t,this.board.occupied):i=ae(t);if(i=i.diff(this.board[this.turn]),g(n.king)){if(r.role==="king"){let s=this.board.occupied.without(t);for(let a of i)this.kingAttackers(a,P(this.turn),s).nonEmpty()&&(i=i.without(a));return i.union(ot(this,"a",n)).union(ot(this,"h",n))}if(n.checkers.nonEmpty()){let s=n.checkers.singleSquare();if(!g(s))return l.empty();i=i.intersect(ye(s,n.king).with(s));}n.blockers.has(t)&&(i=i.intersect(rt(t,n.king)));}return o&&(i=i.union(o)),i}isVariantEnd(){return !1}variantOutcome(t){}hasInsufficientMaterial(t){return this.board[t].intersect(this.board.pawn.union(this.board.rooksAndQueens())).nonEmpty()?!1:this.board[t].intersects(this.board.knight)?this.board[t].size()<=2&&this.board[P(t)].diff(this.board.king).diff(this.board.queen).isEmpty():this.board[t].intersects(this.board.bishop)?(!this.board.bishop.intersects(l.darkSquares())||!this.board.bishop.intersects(l.lightSquares()))&&this.board.pawn.isEmpty()&&this.board.knight.isEmpty():!0}toSetup(){var t,n;return {board:this.board.clone(),pockets:(t=this.pockets)===null||t===void 0?void 0:t.clone(),turn:this.turn,unmovedRooks:this.castles.unmovedRooks,epSquare:Ai(this),remainingChecks:(n=this.remainingChecks)===null||n===void 0?void 0:n.clone(),halfmoves:Math.min(this.halfmoves,150),fullmoves:Math.min(Math.max(this.fullmoves,1),9999)}}isInsufficientMaterial(){return H.every(t=>this.hasInsufficientMaterial(t))}hasDests(t){t=t||this.ctx();for(let n of this.board[this.turn])if(this.dests(n,t).nonEmpty())return !0;return this.dropDests(t).nonEmpty()}isLegal(t,n){if(oe(t))return !this.pockets||this.pockets[this.turn][t.role]<=0||t.role==="pawn"&&l.backranks().has(t.to)?!1:this.dropDests(n).has(t.to);{if(t.promotion==="pawn"||t.promotion==="king"&&this.rules!=="antichess"||!!t.promotion!==(this.board.pawn.has(t.from)&&l.backranks().has(t.to)))return !1;let r=this.dests(t.from,n);return r.has(t.to)||r.has(qn(this,t).to)}}isCheck(){let t=this.board.kingOf(this.turn);return g(t)&&this.kingAttackers(t,P(this.turn),this.board.occupied).nonEmpty()}isEnd(t){return (t?t.variantEnd:this.isVariantEnd())?!0:this.isInsufficientMaterial()||!this.hasDests(t)}isCheckmate(t){return t=t||this.ctx(),!t.variantEnd&&t.checkers.nonEmpty()&&!this.hasDests(t)}isStalemate(t){return t=t||this.ctx(),!t.variantEnd&&t.checkers.isEmpty()&&!this.hasDests(t)}outcome(t){let n=this.variantOutcome(t);return n||(t=t||this.ctx(),this.isCheckmate(t)?{winner:P(this.turn)}:this.isInsufficientMaterial()||this.isStalemate(t)?{winner:void 0}:void 0)}allDests(t){t=t||this.ctx();let n=new Map;if(t.variantEnd)return n;for(let r of this.board[this.turn])n.set(r,this.dests(r,t));return n}play(t){let n=this.turn,r=this.epSquare,i=Vt(this,t);if(this.epSquare=void 0,this.halfmoves+=1,n==="black"&&(this.fullmoves+=1),this.turn=P(n),oe(t))this.board.set(t.to,{role:t.role,color:n}),this.pockets&&this.pockets[n][t.role]--,t.role==="pawn"&&(this.halfmoves=0);else {let o=this.board.take(t.from);if(!o)return;let s;if(o.role==="pawn"){this.halfmoves=0,t.to===r&&(s=this.board.take(t.to+(n==="white"?-8:8)));let a=t.from-t.to;Math.abs(a)===16&&8<=t.from&&t.from<=55&&(this.epSquare=t.from+t.to>>1),t.promotion&&(o.role=t.promotion,o.promoted=!!this.pockets);}else if(o.role==="rook")this.castles.discardRook(t.from);else if(o.role==="king"){if(i){let a=this.castles.rook[n][i];if(g(a)){let u=this.board.take(a);this.board.set(Ie(n,i),o),u&&this.board.set(et(n,i),u);}}this.castles.discardColor(n);}if(!i){let a=this.board.set(t.to,o)||s;a&&this.playCaptureAt(t.to,a);}}this.remainingChecks&&this.isCheck()&&(this.remainingChecks[n]=Math.max(this.remainingChecks[n]-1,0));}},Ke=class extends ee{constructor(){super("chess");}static default(){let t=new this;return t.reset(),t}static fromSetup(t,n){let r=new this;return r.setupUnchecked(t),r.validate(n).map(i=>r)}clone(){return super.clone()}},Ei=(e,t)=>{if(!g(t))return;let n=e.turn==="white"?5:2,r=e.turn==="white"?8:-8;if(J(t)!==n||e.board.occupied.has(t+r))return;let i=t-r;if(!(!e.board.pawn.has(i)||!e.board[P(e.turn)].has(i)))return t},Ai=e=>{if(!g(e.epSquare))return;let t=e.ctx(),r=e.board.pieces(e.turn,"pawn").intersect(be(P(e.turn),e.epSquare));for(let i of r)if(e.dests(i,t).has(e.epSquare))return e.epSquare},_i=(e,t,n)=>{if(!g(e.epSquare)||!be(e.turn,t).has(e.epSquare))return !1;if(!g(n.king))return !0;let r=e.epSquare+(e.turn==="white"?-8:8),i=e.board.occupied.toggle(t).toggle(e.epSquare).toggle(r);return !e.kingAttackers(n.king,P(e.turn),i).intersects(i)},ot=(e,t,n)=>{if(!g(n.king)||n.checkers.nonEmpty())return l.empty();let r=e.castles.rook[e.turn][t];if(!g(r))return l.empty();if(e.castles.path[e.turn][t].intersects(e.board.occupied))return l.empty();let i=Ie(e.turn,t),o=ye(n.king,i),s=e.board.occupied.without(n.king);for(let c of o)if(e.kingAttackers(c,P(e.turn),s).nonEmpty())return l.empty();let a=et(e.turn,t),u=e.board.occupied.toggle(n.king).toggle(r).toggle(a);return e.kingAttackers(i,P(e.turn),u).nonEmpty()?l.empty():l.fromSquare(r)},st=(e,t,n)=>{if(n.variantEnd)return l.empty();let r=e.board.get(t);if(!r||r.color!==e.turn)return l.empty();let i=nt(r,t,e.board.occupied);if(r.role==="pawn"){let o=e.board[P(e.turn)];g(e.epSquare)&&(o=o.with(e.epSquare)),i=i.intersect(o);let s=e.turn==="white"?8:-8,a=t+s;if(0<=a&&a<64&&!e.board.occupied.has(a)){i=i.with(a);let u=e.turn==="white"?t<16:t>=64-16,c=a+s;u&&!e.board.occupied.has(c)&&(i=i.with(c));}return i}else i=i.diff(e.board[e.turn]);return t===n.king?i.union(ot(e,"a",n)).union(ot(e,"h",n)):i};var Vt=(e,t)=>{if(oe(t))return;let n=t.to-t.from;if(!(Math.abs(n)!==2&&!e.board[e.turn].has(t.to))&&e.board.king.has(t.from))return n>0?"h":"a"},qn=(e,t)=>{let n=Vt(e,t);if(!n)return t;let r=e.castles.rook[e.turn][n];return {from:t.from,to:g(r)?r:t.to}};var Dn=e=>oe(e)?String.fromCharCode(35+e.to,35+64+8*5+["queen","rook","bishop","knight","pawn"].indexOf(e.role)):String.fromCharCode(35+e.from,e.promotion?35+64+8*["queen","rook","bishop","knight","king"].indexOf(e.promotion)+L(e.to):35+e.to);var z;(function(e){e.Fen="ERR_FEN",e.Board="ERR_BOARD",e.Pockets="ERR_POCKETS",e.Turn="ERR_TURN",e.Castling="ERR_CASTLING",e.EpSquare="ERR_EP_SQUARE",e.RemainingChecks="ERR_REMAINING_CHECKS",e.Halfmoves="ERR_HALFMOVES",e.Fullmoves="ERR_FULLMOVES";})(z||(z={}));var F=class extends Error{},Di=(e,t,n)=>{let r=e.indexOf(t);for(;n-- >0&&r!==-1;)r=e.indexOf(t,r+t.length);return r},Te=e=>/^\d{1,4}$/.test(e)?parseInt(e,10):void 0,Kn=e=>{let t=Me(e);return t&&{role:t,color:e.toLowerCase()===e?"black":"white"}},Gt=e=>{let t=de.empty(),n=7,r=0;for(let i=0;i<e.length;i++){let o=e[i];if(o==="/"&&r===8)r=0,n--;else {let s=parseInt(o,10);if(s>0)r+=s;else {if(r>=8||n<0)return m.err(new F(z.Board));let a=r+n*8,u=Kn(o);if(!u)return m.err(new F(z.Board));e[i+1]==="~"&&(u.promoted=!0,i++),t.set(a,u),r++;}}}return n!==0||r!==8?m.err(new F(z.Board)):m.ok(t)},Ln=e=>{if(e.length>64)return m.err(new F(z.Pockets));let t=Ee.empty();for(let n of e){let r=Kn(n);if(!r)return m.err(new F(z.Pockets));t[r.color][r.role]++;}return m.ok(t)},Li=(e,t)=>{let n=l.empty();if(t==="-")return m.ok(n);for(let r of t){let i=r.toLowerCase(),o=r===i?"black":"white",s=l.backrank(o).intersect(e[o]),a;if(i==="q")a=s;else if(i==="k")a=s.reversed();else if("a"<=i&&i<="h")a=l.fromFile(i.charCodeAt(0)-"a".charCodeAt(0)).intersect(s);else return m.err(new F(z.Castling));for(let u of a){if(e.king.has(u))break;if(e.rook.has(u)){n=n.with(u);break}}}return H.some(r=>l.backrank(r).intersect(n).size()>2)?m.err(new F(z.Castling)):m.ok(n)},In=e=>{let t=e.split("+");if(t.length===3&&t[0]===""){let n=Te(t[1]),r=Te(t[2]);return !g(n)||n>3||!g(r)||r>3?m.err(new F(z.RemainingChecks)):m.ok(new xe(3-n,3-r))}else if(t.length===2){let n=Te(t[0]),r=Te(t[1]);return !g(n)||n>3||!g(r)||r>3?m.err(new F(z.RemainingChecks)):m.ok(new xe(n,r))}else return m.err(new F(z.RemainingChecks))},zn=e=>{let t=e.split(/[\s_]+/),n=t.shift(),r,i=m.ok(void 0);if(n.endsWith("]")){let a=n.indexOf("[");if(a===-1)return m.err(new F(z.Fen));r=Gt(n.slice(0,a)),i=Ln(n.slice(a+1,-1));}else {let a=Di(n,"/",7);a===-1?r=Gt(n):(r=Gt(n.slice(0,a)),i=Ln(n.slice(a+1)));}let o,s=t.shift();if(!g(s)||s==="w")o="white";else if(s==="b")o="black";else return m.err(new F(z.Turn));return r.chain(a=>{let u=t.shift(),c=g(u)?Li(a,u):m.ok(l.empty()),f=t.shift(),p;if(g(f)&&f!=="-"&&(p=ue(f),!g(p)))return m.err(new F(z.EpSquare));let S=t.shift(),b;g(S)&&S.includes("+")&&(b=In(S),S=t.shift());let d=g(S)?Te(S):0;if(!g(d))return m.err(new F(z.Halfmoves));let h=t.shift(),w=g(h)?Te(h):1;if(!g(w))return m.err(new F(z.Fullmoves));let k=t.shift(),y=m.ok(void 0);if(g(k)){if(g(b))return m.err(new F(z.RemainingChecks));y=In(k);}else g(b)&&(y=b);return t.length>0?m.err(new F(z.Fen)):i.chain(M=>c.chain(x=>y.map(C=>({board:a,pockets:M,turn:o,unmovedRooks:x,remainingChecks:C,epSquare:p,halfmoves:d,fullmoves:Math.max(1,w)}))))})};var Ii=e=>{let t=se(e.role);return e.color==="white"&&(t=t.toUpperCase()),e.promoted&&(t+="~"),t},Bi=e=>{let t="",n=0;for(let r=7;r>=0;r--)for(let i=0;i<8;i++){let o=i+r*8,s=e.get(o);s?(n>0&&(t+=n,n=0),t+=Ii(s)):n++,i===7&&(n>0&&(t+=n,n=0),r!==0&&(t+="/"));}return t},Bn=e=>Y.map(t=>se(t).repeat(e[t])).join(""),Ki=e=>Bn(e.white).toUpperCase()+Bn(e.black),zi=(e,t)=>{let n="";for(let r of H){let i=l.backrank(r),o=e.kingOf(r);g(o)&&!i.has(o)&&(o=void 0);let s=e.pieces(r,"rook").intersect(i);for(let a of t.intersect(s).reversed())if(a===s.first()&&g(o)&&a<o)n+=r==="white"?"Q":"q";else if(a===s.last()&&g(o)&&o<a)n+=r==="white"?"K":"k";else {let u=Pe[L(a)];n+=r==="white"?u.toUpperCase():u;}}return n||"-"},Fi=e=>`${e.white}+${e.black}`,at=(e,t)=>[Bi(e.board)+(e.pockets?`[${Ki(e.pockets)}]`:""),e.turn[0],zi(e.board,e.unmovedRooks),g(e.epSquare)?W(e.epSquare):"-",...e.remainingChecks?[Fi(e.remainingChecks)]:[],...[Math.max(0,Math.min(e.halfmoves,9999)),Math.max(1,Math.min(e.fullmoves,9999))]].join(" ");var Hi=(e,t)=>{let n="";if(oe(t))t.role!=="pawn"&&(n=se(t.role).toUpperCase()),n+="@"+W(t.to);else {let r=e.board.getRole(t.from);if(!r)return "--";if(r==="king"&&(e.board[e.turn].has(t.to)||Math.abs(t.to-t.from)===2))n=t.to>t.from?"O-O":"O-O-O";else {let i=e.board.occupied.has(t.to)||r==="pawn"&&L(t.from)!==L(t.to);if(r!=="pawn"){n=se(r).toUpperCase();let o;if(r==="king"?o=ae(t.to).intersect(e.board.king):r==="queen"?o=Be(t.to,e.board.occupied).intersect(e.board.queen):r==="rook"?o=ve(t.to,e.board.occupied).intersect(e.board.rook):r==="bishop"?o=we(t.to,e.board.occupied).intersect(e.board.bishop):o=Oe(t.to).intersect(e.board.knight),o=o.intersect(e.board[e.turn]).without(t.from),o.nonEmpty()){let s=e.ctx();for(let a of o)e.dests(a,s).has(t.to)||(o=o.without(a));if(o.nonEmpty()){let a=!1,u=o.intersects(l.fromRank(J(t.from)));o.intersects(l.fromFile(L(t.from)))?a=!0:u=!0,u&&(n+=Pe[L(t.from)]),a&&(n+=Je[J(t.from)]);}}}else i&&(n=Pe[L(t.from)]);i&&(n+="x"),n+=W(t.to),t.promotion&&(n+="="+se(t.promotion).toUpperCase());}}return n},Fn=(e,t)=>{var n;let r=Hi(e,t);return e.play(t),!((n=e.outcome())===null||n===void 0)&&n.winner?r+"#":e.isCheck()?r+"+":r};var $n=(e,t)=>{let n=e.ctx(),r=t.match(/^([NBRQK])?([a-h])?([1-8])?[-x]?([a-h][1-8])(?:=?([nbrqkNBRQK]))?[+#]?$/);if(!r){let f;if(t==="O-O"||t==="O-O+"||t==="O-O#"?f="h":(t==="O-O-O"||t==="O-O-O+"||t==="O-O-O#")&&(f="a"),f){let b=e.castles.rook[e.turn][f];return !g(n.king)||!g(b)||!e.dests(n.king,n).has(b)?void 0:{from:n.king,to:b}}let p=t.match(/^([pnbrqkPNBRQK])?@([a-h][1-8])[+#]?$/);if(!p)return;let S={role:p[1]?Me(p[1]):"pawn",to:ue(p[2])};return e.isLegal(S,n)?S:void 0}let i=r[1]?Me(r[1]):"pawn",o=ue(r[4]),s=r[5]?Me(r[5]):void 0;if(!!s!==(i==="pawn"&&l.backranks().has(o))||s==="king"&&e.rules!=="antichess")return;let a=e.board.pieces(e.turn,i);i==="pawn"&&!r[2]?a=a.intersect(l.fromFile(L(o))):r[2]&&(a=a.intersect(l.fromFile(r[2].charCodeAt(0)-"a".charCodeAt(0)))),r[3]&&(a=a.intersect(l.fromRank(r[3].charCodeAt(0)-"1".charCodeAt(0))));let u=i==="pawn"?l.fromFile(L(o)):l.empty();a=a.intersect(u.union(nt({color:P(e.turn),role:i},o,e.board.occupied)));let c;for(let f of a)if(e.dests(f,n).has(o)){if(g(c))return;c=f;}if(g(c))return {from:c,to:o,promotion:s}};var ct=class extends ee{constructor(){super("crazyhouse");}reset(){super.reset(),this.pockets=Ee.empty();}setupUnchecked(t){super.setupUnchecked(t),this.board.promoted=t.board.promoted.intersect(t.board.occupied).diff(t.board.king).diff(t.board.pawn),this.pockets=t.pockets?t.pockets.clone():Ee.empty();}static default(){let t=new this;return t.reset(),t}static fromSetup(t,n){let r=new this;return r.setupUnchecked(t),r.validate(n).map(i=>r)}clone(){return super.clone()}validate(t){return super.validate(t).chain(n=>{var r,i;return !((r=this.pockets)===null||r===void 0)&&r.count("king")?m.err(new q(T.Kings)):(((i=this.pockets)===null||i===void 0?void 0:i.size())||0)+this.board.occupied.size()>64?m.err(new q(T.Variant)):m.ok(void 0)})}hasInsufficientMaterial(t){return this.pockets?this.board.occupied.size()+this.pockets.size()<=3&&this.board.pawn.isEmpty()&&this.board.promoted.isEmpty()&&this.board.rooksAndQueens().isEmpty()&&this.pockets.count("pawn")<=0&&this.pockets.count("rook")<=0&&this.pockets.count("queen")<=0:super.hasInsufficientMaterial(t)}dropDests(t){var n,r;let i=this.board.occupied.complement().intersect(!((n=this.pockets)===null||n===void 0)&&n[this.turn].hasNonPawns()?l.full():!((r=this.pockets)===null||r===void 0)&&r[this.turn].hasPawns()?l.backranks().complement():l.empty());if(t=t||this.ctx(),g(t.king)&&t.checkers.nonEmpty()){let o=t.checkers.singleSquare();return g(o)?i.intersect(ye(o,t.king)):l.empty()}else return i}},lt=class extends ee{constructor(){super("atomic");}static default(){let t=new this;return t.reset(),t}static fromSetup(t,n){let r=new this;return r.setupUnchecked(t),r.validate(n).map(i=>r)}clone(){return super.clone()}validate(t){if(this.board.occupied.isEmpty())return m.err(new q(T.Empty));if(this.board.king.size()>2)return m.err(new q(T.Kings));let n=this.board.kingOf(P(this.turn));return g(n)?this.kingAttackers(n,this.turn,this.board.occupied).nonEmpty()?m.err(new q(T.OppositeCheck)):l.backranks().intersects(this.board.pawn)?m.err(new q(T.PawnsOnBackrank)):t?.ignoreImpossibleCheck?m.ok(void 0):this.validateCheckers():m.err(new q(T.Kings))}validateCheckers(){return g(this.epSquare)?m.ok(void 0):super.validateCheckers()}kingAttackers(t,n,r){let i=this.board.pieces(n,"king");return i.isEmpty()||ae(t).intersects(i)?l.empty():super.kingAttackers(t,n,r)}playCaptureAt(t,n){super.playCaptureAt(t,n),this.board.take(t);for(let r of ae(t).intersect(this.board.occupied).diff(this.board.pawn)){let i=this.board.take(r);i?.role==="rook"&&this.castles.discardRook(r),i?.role==="king"&&this.castles.discardColor(i.color);}}hasInsufficientMaterial(t){if(this.board.pieces(P(t),"king").isEmpty())return !1;if(this.board[t].diff(this.board.king).isEmpty())return !0;if(this.board[P(t)].diff(this.board.king).nonEmpty()){if(this.board.occupied.equals(this.board.bishop.union(this.board.king))){if(!this.board.bishop.intersect(this.board.white).intersects(l.darkSquares()))return !this.board.bishop.intersect(this.board.black).intersects(l.lightSquares());if(!this.board.bishop.intersect(this.board.white).intersects(l.lightSquares()))return !this.board.bishop.intersect(this.board.black).intersects(l.darkSquares())}return !1}return this.board.queen.nonEmpty()||this.board.pawn.nonEmpty()?!1:this.board.knight.union(this.board.bishop).union(this.board.rook).size()===1?!0:this.board.occupied.equals(this.board.knight.union(this.board.king))?this.board.knight.size()<=2:!1}dests(t,n){n=n||this.ctx();let r=l.empty();for(let i of st(this,t,n)){let o=this.clone();o.play({from:t,to:i});let s=o.board.kingOf(this.turn);g(s)&&(!g(o.board.kingOf(o.turn))||o.kingAttackers(s,o.turn,o.board.occupied).isEmpty())&&(r=r.with(i));}return r}isVariantEnd(){return !!this.variantOutcome()}variantOutcome(t){for(let n of H)if(this.board.pieces(n,"king").isEmpty())return {winner:P(n)}}},ut=class extends ee{constructor(){super("antichess");}reset(){super.reset(),this.castles=ce.empty();}setupUnchecked(t){super.setupUnchecked(t),this.castles=ce.empty();}static default(){let t=new this;return t.reset(),t}static fromSetup(t,n){let r=new this;return r.setupUnchecked(t),r.validate(n).map(i=>r)}clone(){return super.clone()}validate(t){return this.board.occupied.isEmpty()?m.err(new q(T.Empty)):l.backranks().intersects(this.board.pawn)?m.err(new q(T.PawnsOnBackrank)):m.ok(void 0)}kingAttackers(t,n,r){return l.empty()}ctx(){let t=super.ctx();if(g(this.epSquare)&&be(P(this.turn),this.epSquare).intersects(this.board.pieces(this.turn,"pawn")))return t.mustCapture=!0,t;let n=this.board[P(this.turn)];for(let r of this.board[this.turn])if(st(this,r,t).intersects(n))return t.mustCapture=!0,t;return t}dests(t,n){n=n||this.ctx();let r=st(this,t,n),i=this.board[P(this.turn)];return r.intersect(n.mustCapture?g(this.epSquare)&&this.board.getRole(t)==="pawn"?i.with(this.epSquare):i:l.full())}hasInsufficientMaterial(t){if(this.board[t].isEmpty())return !1;if(this.board[P(t)].isEmpty())return !0;if(this.board.occupied.equals(this.board.bishop)){let n=this.board[t].intersects(l.lightSquares()),r=this.board[t].intersects(l.darkSquares()),i=this.board[P(t)].isDisjoint(l.lightSquares()),o=this.board[P(t)].isDisjoint(l.darkSquares());return n&&i||r&&o}return this.board.occupied.equals(this.board.knight)&&this.board.occupied.size()===2?this.board.white.intersects(l.lightSquares())!==this.board.black.intersects(l.darkSquares())!=(this.turn===t):!1}isVariantEnd(){return this.board[this.turn].isEmpty()}variantOutcome(t){if(t=t||this.ctx(),t.variantEnd||this.isStalemate(t))return {winner:this.turn}}},dt=class extends ee{constructor(){super("kingofthehill");}static default(){let t=new this;return t.reset(),t}static fromSetup(t,n){let r=new this;return r.setupUnchecked(t),r.validate(n).map(i=>r)}clone(){return super.clone()}hasInsufficientMaterial(t){return !1}isVariantEnd(){return this.board.king.intersects(l.center())}variantOutcome(t){for(let n of H)if(this.board.pieces(n,"king").intersects(l.center()))return {winner:n}}},ht=class extends ee{constructor(){super("3check");}reset(){super.reset(),this.remainingChecks=xe.default();}setupUnchecked(t){var n;super.setupUnchecked(t),this.remainingChecks=((n=t.remainingChecks)===null||n===void 0?void 0:n.clone())||xe.default();}static default(){let t=new this;return t.reset(),t}static fromSetup(t,n){let r=new this;return r.setupUnchecked(t),r.validate(n).map(i=>r)}clone(){return super.clone()}hasInsufficientMaterial(t){return this.board.pieces(t,"king").equals(this.board[t])}isVariantEnd(){return !!this.remainingChecks&&(this.remainingChecks.white<=0||this.remainingChecks.black<=0)}variantOutcome(t){if(this.remainingChecks){for(let n of H)if(this.remainingChecks[n]<=0)return {winner:n}}}},Gi=()=>{let e=de.empty();return e.occupied=new l(65535,0),e.promoted=l.empty(),e.white=new l(61680,0),e.black=new l(3855,0),e.pawn=l.empty(),e.knight=new l(6168,0),e.bishop=new l(9252,0),e.rook=new l(16962,0),e.queen=new l(129,0),e.king=new l(33024,0),e},ft=class extends ee{constructor(){super("racingkings");}reset(){this.board=Gi(),this.pockets=void 0,this.turn="white",this.castles=ce.empty(),this.epSquare=void 0,this.remainingChecks=void 0,this.halfmoves=0,this.fullmoves=1;}setupUnchecked(t){super.setupUnchecked(t),this.castles=ce.empty();}static default(){let t=new this;return t.reset(),t}static fromSetup(t,n){let r=new this;return r.setupUnchecked(t),r.validate(n).map(i=>r)}clone(){return super.clone()}validate(t){return this.isCheck()||this.board.pawn.nonEmpty()?m.err(new q(T.Variant)):super.validate(t)}dests(t,n){if(n=n||this.ctx(),t===n.king)return super.dests(t,n);let r=l.empty();for(let i of super.dests(t,n)){let o={from:t,to:i},s=this.clone();s.play(o),s.isCheck()||(r=r.with(i));}return r}hasInsufficientMaterial(t){return !1}isVariantEnd(){let t=l.fromRank(7),n=this.board.king.intersect(t);if(n.isEmpty())return !1;if(this.turn==="white"||n.intersects(this.board.black))return !0;let r=this.board.kingOf("black");if(g(r)){let i=this.board.occupied.without(r);for(let o of ae(r).intersect(t).diff(this.board.black))if(this.kingAttackers(o,"white",i).isEmpty())return !1}return !0}variantOutcome(t){if(t?!t.variantEnd:!this.isVariantEnd())return;let n=l.fromRank(7),r=this.board.pieces("black","king").intersects(n),i=this.board.pieces("white","king").intersects(n);return r&&!i?{winner:"black"}:i&&!r?{winner:"white"}:{winner:void 0}}},Ui=()=>{let e=de.empty();return e.occupied=new l(4294967295,4294901862),e.promoted=l.empty(),e.white=new l(4294967295,102),e.black=new l(0,4294901760),e.pawn=new l(4294967295,16711782),e.knight=new l(0,1107296256),e.bishop=new l(0,603979776),e.rook=new l(0,2164260864),e.queen=new l(0,134217728),e.king=new l(0,268435456),e},pt=class extends ee{constructor(){super("horde");}reset(){this.board=Ui(),this.pockets=void 0,this.turn="white",this.castles=ce.default(),this.castles.discardColor("white"),this.epSquare=void 0,this.remainingChecks=void 0,this.halfmoves=0,this.fullmoves=1;}static default(){let t=new this;return t.reset(),t}static fromSetup(t,n){let r=new this;return r.setupUnchecked(t),r.validate(n).map(i=>r)}clone(){return super.clone()}validate(t){if(this.board.occupied.isEmpty())return m.err(new q(T.Empty));if(this.board.king.size()!==1)return m.err(new q(T.Kings));let n=this.board.kingOf(P(this.turn));if(g(n)&&this.kingAttackers(n,this.turn,this.board.occupied).nonEmpty())return m.err(new q(T.OppositeCheck));for(let r of H){let i=this.board.pieces(r,"king").isEmpty()?l.backrank(P(r)):l.backranks();if(this.board.pieces(r,"pawn").intersects(i))return m.err(new q(T.PawnsOnBackrank))}return t?.ignoreImpossibleCheck?m.ok(void 0):this.validateCheckers()}hasInsufficientMaterial(t){if(this.board.pieces(t,"king").nonEmpty())return !1;let n=b=>b==="light"?"dark":"light",r=b=>b==="light"?l.lightSquares():l.darkSquares(),i=b=>{let d=this.board.pieces(b,"bishop");return d.intersects(l.darkSquares())&&d.intersects(l.lightSquares())},o=he.fromBoard(this.board,t),s=b=>r(b).intersect(this.board.pieces(t,"bishop")).size(),a=s("light")>=1?"light":"dark",u=o.pawn+o.knight+o.rook+o.queen+Math.min(s("dark"),2)+Math.min(s("light"),2),c=he.fromBoard(this.board,P(t)),f=b=>r(b).intersect(this.board.pieces(P(t),"bishop")).size(),p=c.size(),S=b=>p-b;if(u===0)return !0;if(u>=4||(o.pawn>=1||o.queen>=1)&&u>=2||o.rook>=1&&u>=2&&!(u===2&&o.rook===1&&o.bishop===1&&S(f(a))===1))return !1;if(u===1){if(p===1)return !0;if(o.queen===1)return !(c.pawn>=1||c.rook>=1||f("light")>=2||f("dark")>=2);if(o.pawn===1){let b=this.board.pieces(t,"pawn").last(),d=this.clone();d.board.set(b,{color:t,role:"queen"});let h=this.clone();return h.board.set(b,{color:t,role:"knight"}),d.hasInsufficientMaterial(t)&&h.hasInsufficientMaterial(t)}else {if(o.rook===1)return !(c.pawn>=2||c.rook>=1&&c.pawn>=1||c.rook>=1&&c.knight>=1||c.pawn>=1&&c.knight>=1);if(o.bishop===1)return !(f(n(a))>=2||f(n(a))>=1&&c.pawn>=1||c.pawn>=2);if(o.knight===1)return !(p>=4&&(c.knight>=2||c.pawn>=2||c.rook>=1&&c.knight>=1||c.rook>=1&&c.bishop>=1||c.knight>=1&&c.bishop>=1||c.rook>=1&&c.pawn>=1||c.knight>=1&&c.pawn>=1||c.bishop>=1&&c.pawn>=1||i(P(t))&&c.pawn>=1)&&(f("dark")<2||S(f("dark"))>=3)&&(f("light")<2||S(f("light"))>=3))}}else {if(u===2)return p===1?!0:o.knight===2?c.pawn+c.bishop+c.knight<1:i(t)?!(c.pawn>=1||c.bishop>=1||c.knight>=1&&c.rook+c.queen>=1):o.bishop>=1&&o.knight>=1?!(c.pawn>=1||f(n(a))>=1||S(f(a))>=3):!(c.pawn>=1&&f(n(a))>=1||c.pawn>=1&&c.knight>=1||f(n(a))>=1&&c.knight>=1||f(n(a))>=2||c.knight>=2||c.pawn>=2);if(u===3)return o.knight===2&&o.bishop===1||o.knight===3||i(t)?!1:p===1}return !0}isVariantEnd(){return this.board.white.isEmpty()||this.board.black.isEmpty()}variantOutcome(t){if(this.board.white.isEmpty())return {winner:"black"};if(this.board.black.isEmpty())return {winner:"white"}}},Hn=e=>{switch(e){case"chess":return Ke.default();case"antichess":return ut.default();case"atomic":return lt.default();case"horde":return pt.default();case"racingkings":return ft.default();case"kingofthehill":return dt.default();case"3check":return ht.default();case"crazyhouse":return ct.default()}},Vn=(e,t,n)=>{switch(e){case"chess":return Ke.fromSetup(t,n);case"antichess":return ut.fromSetup(t,n);case"atomic":return lt.fromSetup(t,n);case"horde":return pt.fromSetup(t,n);case"racingkings":return ft.fromSetup(t,n);case"kingofthehill":return dt.fromSetup(t,n);case"3check":return ht.fromSetup(t,n);case"crazyhouse":return ct.fromSetup(t,n)}};var ji=(e=Zt)=>({headers:e(),moves:new ze}),ze=class{constructor(){this.children=[];}*mainline(){let t=this;for(;t.children.length;){let n=t.children[0];yield n.data,t=n;}}},mt=class extends ze{constructor(t){super(),this.data=t;}};var Un=(e,t,n)=>{let r=new ze,i=[{before:e,after:r,ctx:t}],o;for(;o=i.pop();)for(let s=0;s<o.before.children.length;s++){let a=s<o.before.children.length-1?o.ctx.clone():o.ctx,u=o.before.children[s],c=n(a,u.data,s);if(g(c)){let f=new mt(c);o.after.children.push(f),i.push({before:u,after:f,ctx:a});}}return r};var Zt=()=>new Map([["Event","?"],["Site","?"],["Date","????.??.??"],["Round","?"],["White","?"],["Black","?"],["Result","*"]]);var Gn="\uFEFF",Ut=e=>/^\s*$/.test(e),Wt=e=>e.startsWith("%"),jt=class extends Error{},Yt=class{constructor(t,n=Zt,r=1e6){this.emitGame=t,this.initHeaders=n,this.maxBudget=r,this.lineBuf=[],this.resetGame(),this.state=0;}resetGame(){this.budget=this.maxBudget,this.found=!1,this.state=1,this.game=ji(this.initHeaders),this.stack=[{parent:this.game.moves,root:!0}],this.commentBuf=[];}consumeBudget(t){if(this.budget-=t,this.budget<0)throw new jt("ERR_PGN_BUDGET")}parse(t,n){if(!(this.budget<0))try{let r=0;for(;;){let i=t.indexOf(`
`,r);if(i===-1)break;let o=i>r&&t[i-1]==="\r"?i-1:i;this.consumeBudget(i-r),this.lineBuf.push(t.slice(r,o)),r=i+1,this.handleLine();}this.consumeBudget(t.length-r),this.lineBuf.push(t.slice(r)),n?.stream||(this.handleLine(),this.emit(void 0));}catch(r){this.emit(r);}}handleLine(){let t=!0,n=this.lineBuf.join("");this.lineBuf=[];e:for(;;)switch(this.state){case 0:n.startsWith(Gn)&&(n=n.slice(Gn.length)),this.state=1;case 1:if(Ut(n)||Wt(n))return;this.found=!0,this.state=2;case 2:{if(Wt(n))return;let r=!0;for(;r;)r=!1,n=n.replace(/^\s*\[([A-Za-z0-9][A-Za-z0-9_+#=:-]*)\s+"((?:[^"\\]|\\"|\\\\)*)"\]/,(i,o,s)=>(this.consumeBudget(200),this.game.headers.set(o,s.replace(/\\"/g,'"').replace(/\\\\/g,"\\")),r=!0,t=!1,""));if(Ut(n))return;this.state=3;}case 3:{if(t){if(Wt(n))return;if(Ut(n))return this.emit(void 0)}let r=/(?:[NBKRQ]?[a-h]?[1-8]?[-x]?[a-h][1-8](?:=?[nbrqkNBRQK])?|[pnbrqkPNBRQK]?@[a-h][1-8]|O-O-O|0-0-0|O-O|0-0)[+#]?|--|Z0|0000|@@@@|{|;|\$\d{1,4}|[?!]{1,2}|\(|\)|\*|1-0|0-1|1\/2-1\/2/g,i;for(;i=r.exec(n);){let o=this.stack[this.stack.length-1],s=i[0];if(s===";")return;if(s.startsWith("$"))this.handleNag(parseInt(s.slice(1),10));else if(s==="!")this.handleNag(1);else if(s==="?")this.handleNag(2);else if(s==="!!")this.handleNag(3);else if(s==="??")this.handleNag(4);else if(s==="!?")this.handleNag(5);else if(s==="?!")this.handleNag(6);else if(s==="1-0"||s==="0-1"||s==="1/2-1/2"||s==="*")this.stack.length===1&&s!=="*"&&this.game.headers.set("Result",s);else if(s==="(")this.consumeBudget(100),this.stack.push({parent:o.parent,root:!1});else if(s===")")this.stack.length>1&&this.stack.pop();else if(s==="{"){let a=r.lastIndex,u=n[a]===" "?a+1:a;n=n.slice(u),this.state=4;continue e}else this.consumeBudget(100),s==="Z0"||s==="0000"||s==="@@@@"?s="--":s.startsWith("0")&&(s=s.replace(/0/g,"O")),o.node&&(o.parent=o.node),o.node=new mt({san:s,startingComments:o.startingComments}),o.startingComments=void 0,o.root=!1,o.parent.children.push(o.node);}return}case 4:{let r=n.indexOf("}");if(r===-1){this.commentBuf.push(n);return}else {let i=r>0&&n[r-1]===" "?r-1:r;this.commentBuf.push(n.slice(0,i)),this.handleComment(),n=n.slice(r),this.state=3,t=!1;}}}}handleNag(t){var n;this.consumeBudget(50);let r=this.stack[this.stack.length-1];r.node&&((n=r.node.data).nags||(n.nags=[]),r.node.data.nags.push(t));}handleComment(){var t,n;this.consumeBudget(100);let r=this.stack[this.stack.length-1],i=this.commentBuf.join(`
`);this.commentBuf=[],r.node?((t=r.node.data).comments||(t.comments=[]),r.node.data.comments.push(i)):r.root?((n=this.game).comments||(n.comments=[]),this.game.comments.push(i)):(r.startingComments||(r.startingComments=[]),r.startingComments.push(i));}emit(t){if(this.state===4&&this.handleComment(),t)return this.emitGame(this.game,t);this.found&&this.emitGame(this.game,void 0),this.resetGame();}},Qt=(e,t=Zt)=>{let n=[];return new Yt(r=>n.push(r),t,NaN).parse(e),n},Yi=e=>{switch((e||"chess").toLowerCase()){case"chess":case"chess960":case"chess 960":case"standard":case"from position":case"classical":case"normal":case"fischerandom":case"fischerrandom":case"fischer random":case"wild/0":case"wild/1":case"wild/2":case"wild/3":case"wild/4":case"wild/5":case"wild/6":case"wild/7":case"wild/8":case"wild/8a":return "chess";case"crazyhouse":case"crazy house":case"house":case"zh":return "crazyhouse";case"king of the hill":case"koth":case"kingofthehill":return "kingofthehill";case"three-check":case"three check":case"threecheck":case"three check chess":case"3-check":case"3 check":case"3check":return "3check";case"antichess":case"anti chess":case"anti":return "antichess";case"atomic":case"atom":case"atomic chess":return "atomic";case"horde":case"horde chess":return "horde";case"racing kings":case"racingkings":case"racing":case"race":return "racingkings";default:return}};var Wn=(e,t)=>{let n=Yi(e.get("Variant"));if(!n)return m.err(new q(T.Variant));let r=e.get("FEN");return r?zn(r).chain(i=>Vn(n,i,t)):m.ok(Hn(n))};function Zi(e){switch(e){case"G":return "green";case"R":return "red";case"Y":return "yellow";case"B":return "blue";default:return}}var Qi=e=>{let t=Zi(e.slice(0,1)),n=ue(e.slice(1,3)),r=ue(e.slice(3,5));if(!(!t||!g(n))){if(e.length===3)return {color:t,from:n,to:n};if(e.length===5&&g(r))return {color:t,from:n,to:r}}};var jn=e=>{let t,n,r,i=[];return {text:e.replace(/\s?\[%(emt|clk)\s(\d{1,5}):(\d{1,2}):(\d{1,2}(?:\.\d{0,3})?)\]\s?/g,(s,a,u,c,f)=>{let p=parseInt(u,10)*3600+parseInt(c,10)*60+parseFloat(f);return a==="emt"?t=p:a==="clk"&&(n=p),"  "}).replace(/\s?\[%(?:csl|cal)\s([RGYB][a-h][1-8](?:[a-h][1-8])?(?:,[RGYB][a-h][1-8](?:[a-h][1-8])?)*)\]\s?/g,(s,a)=>{for(let u of a.split(","))i.push(Qi(u));return "  "}).replace(/\s?\[%eval\s(?:#([+-]?\d{1,5})|([+-]?(?:\d{1,5}|\d{0,5}\.\d{1,2})))(?:,(\d{1,5}))?\]\s?/g,(s,a,u,c)=>{let f=c&&parseInt(c,10);return r=a?{mate:parseInt(a,10),depth:f}:{pawns:parseFloat(u),depth:f},"  "}).trim(),shapes:i,emt:t,clock:n,evaluation:r}};function Xt(e){return t=>e&&e(t)||Ji(t)}var Ji=e=>eo[e],eo={flipTheBoard:"Flip the board",analysisBoard:"Analysis board",practiceWithComputer:"Practice with computer",getPgn:"Get PGN",download:"Download",viewOnLichess:"View on Lichess",viewOnSite:"View on site"};var Yn=["white","black"],qe=["a","b","c","d","e","f","g","h"],Fe=["1","2","3","4","5","6","7","8"];var Qn=[...Fe].reverse(),gt=Array.prototype.concat(...qe.map(e=>Fe.map(t=>e+t))),V=e=>gt[8*e[0]+e[1]],N=e=>[e.charCodeAt(0)-97,e.charCodeAt(1)-49],Xn=e=>{if(e)return e[1]==="@"?[e.slice(2,4)]:[e.slice(0,2),e.slice(2,4)]},kt=gt.map(N);function Jn(e){let t,n=()=>(t===void 0&&(t=e()),t);return n.clear=()=>{t=void 0;},n}var er=()=>{let e;return {start(){e=performance.now();},cancel(){e=void 0;},stop(){if(!e)return 0;let t=performance.now()-e;return e=void 0,t}}},bt=e=>e==="white"?"black":"white",Se=(e,t)=>{let n=e[0]-t[0],r=e[1]-t[1];return n*n+r*r},$e=(e,t)=>e.role===t.role&&e.color===t.color,Ce=e=>(t,n)=>[(n?t[0]:7-t[0])*e.width/8,(n?7-t[1]:t[1])*e.height/8],Z=(e,t)=>{e.style.transform=`translate(${t[0]}px,${t[1]}px)`;},Jt=(e,t,n=1)=>{e.style.transform=`translate(${t[0]}px,${t[1]}px) scale(${n})`;},He=(e,t)=>{e.style.visibility=t?"visible":"hidden";},le=e=>{var t;if(e.clientX||e.clientX===0)return [e.clientX,e.clientY];if(!((t=e.targetTouches)===null||t===void 0)&&t[0])return [e.targetTouches[0].clientX,e.targetTouches[0].clientY]},wt=e=>e.buttons===2||e.button===2,Q=(e,t)=>{let n=document.createElement(e);return t&&(n.className=t),n};function vt(e,t,n){let r=N(e);return t||(r[0]=7-r[0],r[1]=7-r[1]),[n.left+n.width*r[0]/8+n.width/16,n.top+n.height*(7-r[1])/8+n.height/16]}var te=class e{constructor(t){this.path=t;this.size=()=>this.path.length/2;this.head=()=>this.path.slice(0,2);this.tail=()=>new e(this.path.slice(2));this.init=()=>new e(this.path.slice(0,-2));this.last=()=>this.path.slice(-2);this.empty=()=>this.path=="";this.contains=t=>this.path.startsWith(t.path);this.isChildOf=t=>this.init()===t;this.append=t=>new e(this.path+t);this.equals=t=>this.path==t.path;}static{this.root=new e("");}};var yt=class{constructor(t,n,r,i){this.initial=t;this.moves=n;this.players=r;this.metadata=i;this.nodeAt=t=>tr(this.moves,t);this.dataAt=t=>{let n=this.nodeAt(t);return n?no(n)?n.data:this.initial:void 0};this.title=()=>this.players.white.name?[this.players.white.title,this.players.white.name,"vs",this.players.black.title,this.players.black.name].filter(t=>t&&!!t.trim()).join("_").replace(" ","-"):"lichess-pgn-viewer";this.pathAtMainlinePly=t=>t==0?te.root:this.mainline[Math.max(0,Math.min(this.mainline.length-1,t=="last"?9999:t-1))]?.path||te.root;this.hasPlayerName=()=>!!(this.players.white?.name||this.players.black?.name);this.mainline=Array.from(this.moves.mainline());}},to=(e,t)=>e.children.find(n=>n.data.path.last()==t),tr=(e,t)=>{if(t.empty())return e;let n=to(e,t.head());return n?tr(n,t.tail()):void 0},no=e=>"data"in e,nr=e=>"uci"in e;var en=class e{constructor(t,n,r){this.pos=t;this.path=n;this.clocks=r;this.clone=()=>new e(this.pos.clone(),this.path,{...this.clocks});}},tn=e=>{let t=e.map(jn),n=r=>r.reduce((i,o)=>typeof o==null?i:o,void 0);return {texts:t.map(r=>r.text).filter(r=>!!r),shapes:t.flatMap(r=>r.shapes),clock:n(t.map(r=>r.clock)),emt:n(t.map(r=>r.emt))}},rr=(e,t=!1)=>{let n=Qt(e)[0]||Qt("*")[0],r=Wn(n.headers).unwrap(),i=at(r.toSetup()),o=tn(n.comments||[]),s=new Map(Array.from(n.headers,([p,S])=>[p.toLowerCase(),S])),a=so(s,t),u={fen:i,turn:r.turn,check:r.isCheck(),pos:r.clone(),comments:o.texts,shapes:o.shapes,clocks:{white:a.timeControl?.initial||o.clock,black:a.timeControl?.initial||o.clock}},c=ro(r,n.moves,a),f=oo(s,a);return new yt(u,c,f,a)},ro=(e,t,n)=>Un(t,new en(e,te.root,{}),(r,i,o)=>{let s=$n(r.pos,i.san);if(!s)return;let a=Dn(s),u=r.path.append(a),c=Fn(r.pos,s);r.path=u;let f=r.pos.toSetup(),p=tn(i.comments||[]),S=tn(i.startingComments||[]),b=[...p.shapes,...S.shapes],d=(f.fullmoves-1)*2+(r.pos.turn==="white"?0:1),h=r.clocks=io(r.clocks,r.pos.turn,p.clock);return d<2&&n.timeControl&&(h={white:n.timeControl.initial,black:n.timeControl.initial,...h}),{path:u,ply:d,move:s,san:c,uci:Dt(s),fen:at(r.pos.toSetup()),turn:r.pos.turn,check:r.pos.isCheck(),comments:p.texts,startingComments:S.texts,nags:i.nags||[],shapes:b,clocks:h,emt:p.emt}}),io=(e,t,n)=>t=="white"?{...e,black:n}:{...e,white:n};function oo(e,t){let n=(i,o)=>{let s=e.get(`${i}${o}`);return s=="?"||s==""?void 0:s},r=i=>{let o=n(i,"");return {name:o,title:n(i,"title"),rating:parseInt(n(i,"elo")||"")||void 0,isLichessUser:t.isLichess&&!!o?.match(/^[a-z0-9][a-z0-9_-]{0,28}[a-z0-9]$/i)}};return {white:r("white"),black:r("black")}}function so(e,t){let n=e.get("source")||e.get("site"),r=e.get("timecontrol")?.split("+").map(s=>parseInt(s)),i=r&&r[0]?{initial:r[0],increment:r[1]||0}:void 0,o=e.get("orientation");return {externalLink:n&&n.match(/^https?:\/\//)?n:void 0,isLichess:!!(t&&n?.startsWith(t)),timeControl:i,orientation:o==="white"||o==="black"?o:void 0}}var Ge=class{constructor(t,n){this.opts=t;this.redraw=n;this.flipped=!1;this.pane="board";this.autoScrollRequested=!1;this.curNode=()=>this.game.nodeAt(this.path)||this.game.moves;this.curData=()=>this.game.dataAt(this.path)||this.game.initial;this.goTo=(t,n=!0)=>{let r=t=="first"?te.root:t=="prev"?this.path.init():t=="next"?this.game.nodeAt(this.path)?.children[0]?.data.path:this.game.pathAtMainlinePly("last");this.toPath(r||this.path,n);};this.canGoTo=t=>t=="prev"||t=="first"?!this.path.empty():!!this.curNode().children[0];this.toPath=(t,n=!0)=>{this.div?.dispatchEvent(new CustomEvent("pathChange",{detail:{path:t}})),this.path=t,this.pane="board",this.autoScrollRequested=!0,this.redrawGround(),this.redraw(),n&&this.focus();};this.focus=()=>this.div?.focus();this.toggleMenu=()=>{this.pane=this.pane=="board"?"menu":"board",this.redraw();};this.togglePgn=()=>{this.pane=this.pane=="pgn"?"board":"pgn",this.redraw();};this.orientation=()=>{let t=this.opts.orientation||"white";return this.flipped?P(t):t};this.flip=()=>{this.flipped=!this.flipped,this.pane="board",this.redrawGround(),this.redraw();};this.cgState=()=>{let t=this.curData(),n=nr(t)?Xn(t.uci):this.opts.chessground?.lastMove;return {fen:t.fen,orientation:this.orientation(),check:t.check,lastMove:n,turnColor:t.turn}};this.analysisUrl=()=>this.game.metadata.isLichess&&this.game.metadata.externalLink||`https://lichess.org/analysis/${this.curData().fen.replace(" ","_")}?color=${this.orientation()}`;this.practiceUrl=()=>`${this.analysisUrl()}#practice`;this.setGround=t=>{this.ground=t,this.redrawGround();};this.redrawGround=()=>this.withGround(t=>{t.set(this.cgState()),t.setShapes(this.curData().shapes.map(n=>({orig:W(n.from),dest:W(n.to),brush:n.color})));});this.withGround=t=>this.ground&&t(this.ground);this.game=rr(t.pgn,t.lichess),t.orientation=t.orientation||this.game.metadata.orientation,this.translate=Xt(t.translate),this.path=this.game.pathAtMainlinePly(t.initialPly);}};var Ae=(e,t)=>Math.abs(e-t),ao=e=>(t,n,r,i)=>Ae(t,r)<2&&(e==="white"?i===n+1||n<=1&&i===n+2&&t===r:i===n-1||n>=6&&i===n-2&&t===r),nn=(e,t,n,r)=>{let i=Ae(e,n),o=Ae(t,r);return i===1&&o===2||i===2&&o===1},ir=(e,t,n,r)=>Ae(e,n)===Ae(t,r),or=(e,t,n,r)=>e===n||t===r,rn=(e,t,n,r)=>ir(e,t,n,r)||or(e,t,n,r),co=(e,t,n)=>(r,i,o,s)=>Ae(r,o)<2&&Ae(i,s)<2||n&&i===s&&i===(e==="white"?0:7)&&(r===4&&(o===2&&t.includes(0)||o===6&&t.includes(7))||t.includes(o));function lo(e,t){let n=t==="white"?"1":"8",r=[];for(let[i,o]of e)i[1]===n&&o.color===t&&o.role==="rook"&&r.push(N(i)[0]);return r}function on(e,t,n){let r=e.get(t);if(!r)return [];let i=N(t),o=r.role,s=o==="pawn"?ao(r.color):o==="knight"?nn:o==="bishop"?ir:o==="rook"?or:o==="queen"?rn:co(r.color,lo(e,r.color),n);return kt.filter(a=>(i[0]!==a[0]||i[1]!==a[1])&&s(i[0],i[1],a[0],a[1])).map(V)}function U(e,...t){e&&setTimeout(()=>e(...t),1);}function sr(e){e.orientation=bt(e.orientation),e.animation.current=e.draggable.current=e.selected=void 0;}function ar(e,t){for(let[n,r]of t)r?e.pieces.set(n,r):e.pieces.delete(n);}function cr(e,t){if(e.check=void 0,t===!0&&(t=e.turnColor),t)for(let[n,r]of e.pieces)r.role==="king"&&r.color===t&&(e.check=n);}function uo(e,t,n,r){re(e),e.premovable.current=[t,n],U(e.premovable.events.set,t,n,r);}function ne(e){e.premovable.current&&(e.premovable.current=void 0,U(e.premovable.events.unset));}function ho(e,t,n){ne(e),e.predroppable.current={role:t,key:n},U(e.predroppable.events.set,t,n);}function re(e){let t=e.predroppable;t.current&&(t.current=void 0,U(t.events.unset));}function fo(e,t,n){if(!e.autoCastle)return !1;let r=e.pieces.get(t);if(!r||r.role!=="king")return !1;let i=N(t),o=N(n);if(i[1]!==0&&i[1]!==7||i[1]!==o[1])return !1;i[0]===4&&!e.pieces.has(n)&&(o[0]===6?n=V([7,o[1]]):o[0]===2&&(n=V([0,o[1]])));let s=e.pieces.get(n);return !s||s.color!==r.color||s.role!=="rook"?!1:(e.pieces.delete(t),e.pieces.delete(n),i[0]<o[0]?(e.pieces.set(V([6,o[1]]),r),e.pieces.set(V([5,o[1]]),s)):(e.pieces.set(V([2,o[1]]),r),e.pieces.set(V([3,o[1]]),s)),!0)}function sn(e,t,n){let r=e.pieces.get(t),i=e.pieces.get(n);if(t===n||!r)return !1;let o=i&&i.color!==r.color?i:void 0;return n===e.selected&&G(e),U(e.events.move,t,n,o),fo(e,t,n)||(e.pieces.set(n,r),e.pieces.delete(t)),e.lastMove=[t,n],e.check=void 0,U(e.events.change),o||!0}function xt(e,t,n,r){if(e.pieces.has(n))if(r)e.pieces.delete(n);else return !1;return U(e.events.dropNewPiece,t,n),e.pieces.set(n,t),e.lastMove=[n],e.check=void 0,U(e.events.change),e.movable.dests=void 0,e.turnColor=bt(e.turnColor),!0}function lr(e,t,n){let r=sn(e,t,n);return r&&(e.movable.dests=void 0,e.turnColor=bt(e.turnColor),e.animation.current=void 0),r}function an(e,t,n){if(Ct(e,t,n)){let r=lr(e,t,n);if(r){let i=e.hold.stop();G(e);let o={premove:!1,ctrlKey:e.stats.ctrlKey,holdTime:i};return r!==!0&&(o.captured=r),U(e.movable.events.after,t,n,o),!0}}else if(mo(e,t,n))return uo(e,t,n,{ctrlKey:e.stats.ctrlKey}),G(e),!0;return G(e),!1}function St(e,t,n,r){let i=e.pieces.get(t);i&&(po(e,t,n)||r)?(e.pieces.delete(t),xt(e,i,n,r),U(e.movable.events.afterNewPiece,i.role,n,{premove:!1,predrop:!1})):i&&go(e,t,n)?ho(e,i.role,n):(ne(e),re(e)),e.pieces.delete(t),G(e);}function Ue(e,t,n){if(U(e.events.select,t),e.selected){if(e.selected===t&&!e.draggable.enabled){G(e),e.hold.cancel();return}else if((e.selectable.enabled||n)&&e.selected!==t&&an(e,e.selected,t)){e.stats.dragged=!1;return}}(e.selectable.enabled||e.draggable.enabled)&&(ur(e,t)||ln(e,t))&&(cn(e,t),e.hold.start());}function cn(e,t){e.selected=t,ln(e,t)?e.premovable.customDests||(e.premovable.dests=on(e.pieces,t,e.premovable.castle)):e.premovable.dests=void 0;}function G(e){e.selected=void 0,e.premovable.dests=void 0,e.hold.cancel();}function ur(e,t){let n=e.pieces.get(t);return !!n&&(e.movable.color==="both"||e.movable.color===n.color&&e.turnColor===n.color)}var Ct=(e,t,n)=>{var r,i;return t!==n&&ur(e,t)&&(e.movable.free||!!(!((i=(r=e.movable.dests)===null||r===void 0?void 0:r.get(t))===null||i===void 0)&&i.includes(n)))};function po(e,t,n){let r=e.pieces.get(t);return !!r&&(t===n||!e.pieces.has(n))&&(e.movable.color==="both"||e.movable.color===r.color&&e.turnColor===r.color)}function ln(e,t){let n=e.pieces.get(t);return !!n&&e.premovable.enabled&&e.movable.color===n.color&&e.turnColor!==n.color}function mo(e,t,n){var r,i;let o=(i=(r=e.premovable.customDests)===null||r===void 0?void 0:r.get(t))!==null&&i!==void 0?i:on(e.pieces,t,e.premovable.castle);return t!==n&&ln(e,t)&&o.includes(n)}function go(e,t,n){let r=e.pieces.get(t),i=e.pieces.get(n);return !!r&&(!i||i.color!==e.movable.color)&&e.predroppable.enabled&&(r.role!=="pawn"||n[1]!=="1"&&n[1]!=="8")&&e.movable.color===r.color&&e.turnColor!==r.color}function dr(e,t){let n=e.pieces.get(t);return !!n&&e.draggable.enabled&&(e.movable.color==="both"||e.movable.color===n.color&&(e.turnColor===n.color||e.premovable.enabled))}function hr(e){let t=e.premovable.current;if(!t)return !1;let n=t[0],r=t[1],i=!1;if(Ct(e,n,r)){let o=lr(e,n,r);if(o){let s={premove:!0};o!==!0&&(s.captured=o),U(e.movable.events.after,n,r,s),i=!0;}}return ne(e),i}function fr(e,t){let n=e.predroppable.current,r=!1;if(!n)return !1;if(t(n)){let i={role:n.role,color:e.movable.color};xt(e,i,n.key)&&(U(e.movable.events.afterNewPiece,n.role,n.key,{premove:!1,predrop:!0}),r=!0);}return re(e),r}function We(e){ne(e),re(e),G(e);}function un(e){e.movable.color=e.movable.dests=e.animation.current=void 0,We(e);}function ie(e,t,n){let r=Math.floor(8*(e[0]-n.left)/n.width);t||(r=7-r);let i=7-Math.floor(8*(e[1]-n.top)/n.height);return t||(i=7-i),r>=0&&r<8&&i>=0&&i<8?V([r,i]):void 0}function pr(e,t,n,r){let i=N(e),o=kt.filter(c=>rn(i[0],i[1],c[0],c[1])||nn(i[0],i[1],c[0],c[1])),a=o.map(c=>vt(V(c),n,r)).map(c=>Se(t,c)),[,u]=a.reduce((c,f,p)=>c[0]<f?c:[f,p],[a[0],0]);return V(o[u])}var I=e=>e.orientation==="white";var hn="rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR",ko={p:"pawn",r:"rook",n:"knight",b:"bishop",q:"queen",k:"king"},bo={pawn:"p",rook:"r",knight:"n",bishop:"b",queen:"q",king:"k"};function Pt(e){e==="start"&&(e=hn);let t=new Map,n=7,r=0;for(let i of e)switch(i){case" ":case"[":return t;case"/":if(--n,n<0)return t;r=0;break;case"~":{let o=t.get(V([r-1,n]));o&&(o.promoted=!0);break}default:{let o=i.charCodeAt(0);if(o<57)r+=o-48;else {let s=i.toLowerCase();t.set(V([r,n]),{role:ko[s],color:i===s?"black":"white"}),++r;}}}return t}function mr(e){return Qn.map(t=>qe.map(n=>{let r=e.get(n+t);if(r){let i=bo[r.role];return r.color==="white"&&(i=i.toUpperCase()),r.promoted&&(i+="~"),i}else return "1"}).join("")).join("/").replace(/1{2,}/g,t=>t.length.toString())}function fn(e,t){t.animation&&(pn(e.animation,t.animation),(e.animation.duration||0)<70&&(e.animation.enabled=!1));}function Mt(e,t){var n,r,i;if(!((n=t.movable)===null||n===void 0)&&n.dests&&(e.movable.dests=void 0),!((r=t.drawable)===null||r===void 0)&&r.autoShapes&&(e.drawable.autoShapes=[]),pn(e,t),t.fen&&(e.pieces=Pt(t.fen),e.drawable.shapes=((i=t.drawable)===null||i===void 0?void 0:i.shapes)||[]),"check"in t&&cr(e,t.check||!1),"lastMove"in t&&!t.lastMove?e.lastMove=void 0:t.lastMove&&(e.lastMove=t.lastMove),e.selected&&cn(e,e.selected),fn(e,t),!e.movable.rookCastle&&e.movable.dests){let o=e.movable.color==="white"?"1":"8",s="e"+o,a=e.movable.dests.get(s),u=e.pieces.get(s);if(!a||!u||u.role!=="king")return;e.movable.dests.set(s,a.filter(c=>!(c==="a"+o&&a.includes("c"+o))&&!(c==="h"+o&&a.includes("g"+o))));}}function pn(e,t){for(let n in t)Object.prototype.hasOwnProperty.call(t,n)&&(Object.prototype.hasOwnProperty.call(e,n)&&gr(e[n])&&gr(t[n])?pn(e[n],t[n]):e[n]=t[n]);}function gr(e){if(typeof e!="object"||e===null)return !1;let t=Object.getPrototypeOf(e);return t===Object.prototype||t===null}var fe=(e,t)=>t.animation.enabled?xo(e,t):pe(e,t);function pe(e,t){let n=e(t);return t.dom.redraw(),n}var mn=(e,t)=>({key:e,pos:N(e),piece:t}),vo=(e,t)=>t.sort((n,r)=>Se(e.pos,n.pos)-Se(e.pos,r.pos))[0];function yo(e,t){let n=new Map,r=[],i=new Map,o=[],s=[],a=new Map,u,c,f;for(let[p,S]of e)a.set(p,mn(p,S));for(let p of gt)u=t.pieces.get(p),c=a.get(p),u?c?$e(u,c.piece)||(o.push(c),s.push(mn(p,u))):s.push(mn(p,u)):c&&o.push(c);for(let p of s)c=vo(p,o.filter(S=>$e(p.piece,S.piece))),c&&(f=[c.pos[0]-p.pos[0],c.pos[1]-p.pos[1]],n.set(p.key,f.concat(f)),r.push(c.key));for(let p of o)r.includes(p.key)||i.set(p.key,p.piece);return {anims:n,fadings:i}}function kr(e,t){let n=e.animation.current;if(n===void 0){e.dom.destroyed||e.dom.redrawNow();return}let r=1-(t-n.start)*n.frequency;if(r<=0)e.animation.current=void 0,e.dom.redrawNow();else {let i=So(r);for(let o of n.plan.anims.values())o[2]=o[0]*i,o[3]=o[1]*i;e.dom.redrawNow(!0),requestAnimationFrame((o=performance.now())=>kr(e,o));}}function xo(e,t){let n=new Map(t.pieces),r=e(t),i=yo(n,t);if(i.anims.size||i.fadings.size){let o=t.animation.current&&t.animation.current.start;t.animation.current={start:performance.now(),frequency:1/t.animation.duration,plan:i},o||kr(t,performance.now());}else t.dom.redraw();return r}var So=e=>e<.5?4*e*e*e:(e-1)*(2*e-2)*(2*e-2)+1;var Co=["green","red","blue","yellow"];function br(e,t){if(t.touches&&t.touches.length>1)return;t.stopPropagation(),t.preventDefault(),t.ctrlKey?G(e):We(e);let n=le(t),r=ie(n,I(e),e.dom.bounds());r&&(e.drawable.current={orig:r,pos:n,brush:Po(t),snapToValidMove:e.drawable.defaultSnapToValidMove},wr(e));}function wr(e){requestAnimationFrame(()=>{let t=e.drawable.current;if(t){let n=ie(t.pos,I(e),e.dom.bounds());n||(t.snapToValidMove=!1);let r=t.snapToValidMove?pr(t.orig,t.pos,I(e),e.dom.bounds()):n;r!==t.mouseSq&&(t.mouseSq=r,t.dest=r!==t.orig?r:void 0,e.dom.redrawNow()),wr(e);}});}function vr(e,t){e.drawable.current&&(e.drawable.current.pos=le(t));}function yr(e){let t=e.drawable.current;t&&(t.mouseSq&&Mo(e.drawable,t),gn(e));}function gn(e){e.drawable.current&&(e.drawable.current=void 0,e.dom.redraw());}function xr(e){e.drawable.shapes.length&&(e.drawable.shapes=[],e.dom.redraw(),Sr(e.drawable));}function Po(e){var t;let n=(e.shiftKey||e.ctrlKey)&&wt(e),r=e.altKey||e.metaKey||((t=e.getModifierState)===null||t===void 0?void 0:t.call(e,"AltGraph"));return Co[(n?1:0)+(r?2:0)]}function Mo(e,t){let n=i=>i.orig===t.orig&&i.dest===t.dest,r=e.shapes.find(n);r&&(e.shapes=e.shapes.filter(i=>!n(i))),(!r||r.brush!==t.brush)&&e.shapes.push({orig:t.orig,dest:t.dest,brush:t.brush}),Sr(e);}function Sr(e){e.onChange&&e.onChange(e.shapes);}function Cr(e,t){if(!(e.trustAllEvents||t.isTrusted)||t.button!==void 0&&t.button!==0||t.touches&&t.touches.length>1)return;let n=e.dom.bounds(),r=le(t),i=ie(r,I(e),n);if(!i)return;let o=e.pieces.get(i),s=e.selected;if(!s&&e.drawable.enabled&&(e.drawable.eraseOnClick||!o||o.color!==e.turnColor)&&xr(e),t.cancelable!==!1&&(!t.touches||e.blockTouchScroll||o||s||Ao(e,r)))t.preventDefault();else if(t.touches)return;let a=!!e.premovable.current,u=!!e.predroppable.current;e.stats.ctrlKey=t.ctrlKey,e.selected&&Ct(e,e.selected,i)?fe(p=>Ue(p,i),e):Ue(e,i);let c=e.selected===i,f=_r(e,i);if(o&&f&&c&&dr(e,i)){e.draggable.current={orig:i,piece:o,origPos:r,pos:r,started:e.draggable.autoDistance&&e.stats.dragged,element:f,previouslySelected:s,originTarget:t.target,keyHasChanged:!1},f.cgDragging=!0,f.classList.add("dragging");let p=e.dom.elements.ghost;p&&(p.className=`ghost ${o.color} ${o.role}`,Z(p,Ce(n)(N(i),I(e))),He(p,!0)),kn(e);}else a&&ne(e),u&&re(e);e.dom.redraw();}function Ao(e,t){let n=I(e),r=e.dom.bounds(),i=Math.pow(r.width/8,2);for(let o of e.pieces.keys()){let s=vt(o,n,r);if(Se(s,t)<=i)return !0}return !1}function Pr(e,t,n,r){let i="a0";e.pieces.set(i,t),e.dom.redraw();let o=le(n);e.draggable.current={orig:i,piece:t,origPos:o,pos:o,started:!0,element:()=>_r(e,i),originTarget:n.target,newPiece:!0,force:!!r,keyHasChanged:!1},kn(e);}function kn(e){requestAnimationFrame(()=>{var t;let n=e.draggable.current;if(!n)return;!((t=e.animation.current)===null||t===void 0)&&t.plan.anims.has(n.orig)&&(e.animation.current=void 0);let r=e.pieces.get(n.orig);if(!r||!$e(r,n.piece))_e(e);else if(!n.started&&Se(n.pos,n.origPos)>=Math.pow(e.draggable.distance,2)&&(n.started=!0),n.started){if(typeof n.element=="function"){let o=n.element();if(!o)return;o.cgDragging=!0,o.classList.add("dragging"),n.element=o;}let i=e.dom.bounds();Z(n.element,[n.pos[0]-i.left-i.width/16,n.pos[1]-i.top-i.height/16]),n.keyHasChanged||(n.keyHasChanged=n.orig!==ie(n.pos,I(e),i));}kn(e);});}function Mr(e,t){e.draggable.current&&(!t.touches||t.touches.length<2)&&(e.draggable.current.pos=le(t));}function Er(e,t){let n=e.draggable.current;if(!n)return;if(t.type==="touchend"&&t.cancelable!==!1&&t.preventDefault(),t.type==="touchend"&&n.originTarget!==t.target&&!n.newPiece){e.draggable.current=void 0;return}ne(e),re(e);let r=le(t)||n.pos,i=ie(r,I(e),e.dom.bounds());i&&n.started&&n.orig!==i?n.newPiece?St(e,n.orig,i,n.force):(e.stats.ctrlKey=t.ctrlKey,an(e,n.orig,i)&&(e.stats.dragged=!0)):n.newPiece?e.pieces.delete(n.orig):e.draggable.deleteOnDropOff&&!i&&(e.pieces.delete(n.orig),U(e.events.change)),(n.orig===n.previouslySelected||n.keyHasChanged)&&(n.orig===i||!i)?G(e):e.selectable.enabled||G(e),Ar(e),e.draggable.current=void 0,e.dom.redraw();}function _e(e){let t=e.draggable.current;t&&(t.newPiece&&e.pieces.delete(t.orig),e.draggable.current=void 0,G(e),Ar(e),e.dom.redraw());}function Ar(e){let t=e.dom.elements;t.ghost&&He(t.ghost,!1);}function _r(e,t){let n=e.dom.elements.board.firstChild;for(;n;){if(n.cgKey===t&&n.tagName==="PIECE")return n;n=n.nextSibling;}}function Nr(e,t){e.exploding={stage:1,keys:t},e.dom.redraw(),setTimeout(()=>{Rr(e,2),setTimeout(()=>Rr(e,void 0),120);},120);}function Rr(e,t){e.exploding&&(t?e.exploding.stage=t:e.exploding=void 0,e.dom.redraw());}function Or(e,t){function n(){sr(e),t();}return {set(r){r.orientation&&r.orientation!==e.orientation&&n(),fn(e,r),(r.fen?fe:pe)(i=>Mt(i,r),e);},state:e,getFen:()=>mr(e.pieces),toggleOrientation:n,setPieces(r){fe(i=>ar(i,r),e);},selectSquare(r,i){r?fe(o=>Ue(o,r,i),e):e.selected&&(G(e),e.dom.redraw());},move(r,i){fe(o=>sn(o,r,i),e);},newPiece(r,i){fe(o=>xt(o,r,i),e);},playPremove(){if(e.premovable.current){if(fe(hr,e))return !0;e.dom.redraw();}return !1},playPredrop(r){if(e.predroppable.current){let i=fr(e,r);return e.dom.redraw(),i}return !1},cancelPremove(){pe(ne,e);},cancelPredrop(){pe(re,e);},cancelMove(){pe(r=>{We(r),_e(r);},e);},stop(){pe(r=>{un(r),_e(r);},e);},explode(r){Nr(e,r);},setAutoShapes(r){pe(i=>i.drawable.autoShapes=r,e);},setShapes(r){pe(i=>i.drawable.shapes=r,e);},getKeyAtDomPos(r){return ie(r,I(e),e.dom.bounds())},redrawAll:t,dragNewPiece(r,i,o){Pr(e,r,i,o);},destroy(){un(e),e.dom.unbind&&e.dom.unbind(),e.dom.destroyed=!0;}}}function Tr(){return {pieces:Pt(hn),orientation:"white",turnColor:"white",coordinates:!0,ranksPosition:"right",autoCastle:!0,viewOnly:!1,disableContextMenu:!1,addPieceZIndex:!1,blockTouchScroll:!1,pieceKey:!1,trustAllEvents:!1,highlight:{lastMove:!0,check:!0},animation:{enabled:!0,duration:200},movable:{free:!0,color:"both",showDests:!0,events:{},rookCastle:!0},premovable:{enabled:!0,showDests:!0,castle:!0,events:{}},predroppable:{enabled:!1,events:{}},draggable:{enabled:!0,distance:3,autoDistance:!0,showGhost:!0,deleteOnDropOff:!1},dropmode:{active:!1},selectable:{enabled:!0},stats:{dragged:!("ontouchstart"in window)},events:{},drawable:{enabled:!0,visible:!0,defaultSnapToValidMove:!0,eraseOnClick:!0,shapes:[],autoShapes:[],brushes:{green:{key:"g",color:"#15781B",opacity:1,lineWidth:10},red:{key:"r",color:"#882020",opacity:1,lineWidth:10},blue:{key:"b",color:"#003088",opacity:1,lineWidth:10},yellow:{key:"y",color:"#e68f00",opacity:1,lineWidth:10},paleBlue:{key:"pb",color:"#003088",opacity:.4,lineWidth:15},paleGreen:{key:"pg",color:"#15781B",opacity:.4,lineWidth:15},paleRed:{key:"pr",color:"#882020",opacity:.4,lineWidth:15},paleGrey:{key:"pgr",color:"#4a4a4a",opacity:.35,lineWidth:15},purple:{key:"purp",color:"#68217a",opacity:.65,lineWidth:10},pink:{key:"pink",color:"#ee2080",opacity:.5,lineWidth:10},hilite:{key:"hilite",color:"#fff",opacity:1,lineWidth:1}},prevSvgHash:""},hold:er()}}function Lr(){let e=B("defs"),t=$(B("filter"),{id:"cg-filter-blur"});return t.appendChild($(B("feGaussianBlur"),{stdDeviation:"0.022"})),e.appendChild(t),e}function Ir(e,t,n){var r;let i=e.drawable,o=i.current,s=o&&o.mouseSq?o:void 0,a=new Map,u=e.dom.bounds(),c=i.autoShapes.filter(b=>!b.piece);for(let b of i.shapes.concat(c).concat(s?[s]:[])){if(!b.dest)continue;let d=(r=a.get(b.dest))!==null&&r!==void 0?r:new Set,h=At(Et(N(b.orig),e.orientation),u),w=At(Et(N(b.dest),e.orientation),u);d.add(wn(h,w)),a.set(b.dest,d);}let f=i.shapes.concat(c).map(b=>({shape:b,current:!1,hash:qr(b,bn(b.dest,a),!1,u)}));s&&f.push({shape:s,current:!0,hash:qr(s,bn(s.dest,a),!0,u)});let p=f.map(b=>b.hash).join(";");if(p===e.drawable.prevSvgHash)return;e.drawable.prevSvgHash=p;let S=t.querySelector("defs");Ro(i,f,S),No(f,t.querySelector("g"),n.querySelector("g"),b=>qo(e,b,i.brushes,a,u));}function Ro(e,t,n){var r;let i=new Map,o;for(let u of t.filter(c=>c.shape.dest&&c.shape.brush))o=Br(e.brushes[u.shape.brush],u.shape.modifiers),!((r=u.shape.modifiers)===null||r===void 0)&&r.hilite&&i.set("hilite",e.brushes.hilite),i.set(o.key,o);let s=new Set,a=n.firstElementChild;for(;a;)s.add(a.getAttribute("cgKey")),a=a.nextElementSibling;for(let[u,c]of i.entries())s.has(u)||n.appendChild(Io(c));}function No(e,t,n,r){let i=new Map;for(let o of e)i.set(o.hash,!1);for(let o of [t,n]){let s=[],a=o.firstElementChild,u;for(;a;)u=a.getAttribute("cgHash"),i.has(u)?i.set(u,!0):s.push(a),a=a.nextElementSibling;for(let c of s)o.removeChild(c);}for(let o of e.filter(s=>!i.get(s.hash)))for(let s of r(o))s.isCustom?n.appendChild(s.el):t.appendChild(s.el);}function qr({orig:e,dest:t,brush:n,piece:r,modifiers:i,customSvg:o,label:s},a,u,c){var f,p;return [c.width,c.height,u,e,t,n,a&&"-",r&&Oo(r),i&&To(i),o&&`custom-${Dr(o.html)},${(p=(f=o.center)===null||f===void 0?void 0:f[0])!==null&&p!==void 0?p:"o"}`,s&&`label-${Dr(s.text)}`].filter(S=>S).join(",")}function Oo(e){return [e.color,e.role,e.scale].filter(t=>t).join(",")}function To(e){return [e.lineWidth,e.hilite&&"*"].filter(t=>t).join(",")}function Dr(e){let t=0;for(let n=0;n<e.length;n++)t=(t<<5)-t+e.charCodeAt(n)>>>0;return t.toString()}function qo(e,{shape:t,current:n,hash:r},i,o,s){var a,u;let c=At(Et(N(t.orig),e.orientation),s),f=t.dest?At(Et(N(t.dest),e.orientation),s):c,p=t.brush&&Br(i[t.brush],t.modifiers),S=o.get(t.dest),b=[];if(p){let d=$(B("g"),{cgHash:r});b.push({el:d}),c[0]!==f[0]||c[1]!==f[1]?d.appendChild(Lo(t,p,c,f,n,bn(t.dest,o))):d.appendChild(Do(i[t.brush],c,n,s));}if(t.label){let d=t.label;(a=d.fill)!==null&&a!==void 0||(d.fill=t.brush&&i[t.brush].color);let h=t.brush?void 0:"tr";b.push({el:Bo(d,r,c,f,S,h),isCustom:!0});}if(t.customSvg){let d=(u=t.customSvg.center)!==null&&u!==void 0?u:"orig",[h,w]=d==="label"?zr(c,f,S).map(y=>y-.5):d==="dest"?f:c,k=$(B("g"),{transform:`translate(${h},${w})`,cgHash:r});k.innerHTML=`<svg width="1" height="1" viewBox="0 0 100 100">${t.customSvg.html}</svg>`,b.push({el:k,isCustom:!0});}return b}function Do(e,t,n,r){let i=Ko(),o=(r.width+r.height)/(4*Math.max(r.width,r.height));return $(B("circle"),{stroke:e.color,"stroke-width":i[n?0:1],fill:"none",opacity:Kr(e,n),cx:t[0],cy:t[1],r:o-i[1]/2})}function Lo(e,t,n,r,i,o){var s;function a(f){var p;let S=Fo(o&&!i),b=r[0]-n[0],d=r[1]-n[1],h=Math.atan2(d,b),w=Math.cos(h)*S,k=Math.sin(h)*S;return $(B("line"),{stroke:f?"white":t.color,"stroke-width":zo(t,i)+(f?.04:0),"stroke-linecap":"round","marker-end":`url(#arrowhead-${f?"hilite":t.key})`,opacity:!((p=e.modifiers)===null||p===void 0)&&p.hilite?1:Kr(t,i),x1:n[0],y1:n[1],x2:r[0]-w,y2:r[1]-k})}if(!(!((s=e.modifiers)===null||s===void 0)&&s.hilite))return a(!1);let u=B("g"),c=$(B("g"),{filter:"url(#cg-filter-blur)"});return c.appendChild($o(n,r)),c.appendChild(a(!0)),u.appendChild(c),u.appendChild(a(!1)),u}function Io(e){let t=$(B("marker"),{id:"arrowhead-"+e.key,orient:"auto",overflow:"visible",markerWidth:4,markerHeight:4,refX:e.key==="hilite"?1.86:2.05,refY:2});return t.appendChild($(B("path"),{d:"M0,0 V4 L3,2 Z",fill:e.color})),t.setAttribute("cgKey",e.key),t}function Bo(e,t,n,r,i,o){var s;let u=.4*.75**e.text.length,c=zr(n,r,i),f=o==="tr"?.4:0,p=$(B("g"),{transform:`translate(${c[0]+f},${c[1]-f})`,cgHash:t});p.appendChild($(B("circle"),{r:.4/2,"fill-opacity":o?1:.8,"stroke-opacity":o?1:.7,"stroke-width":.03,fill:(s=e.fill)!==null&&s!==void 0?s:"#666",stroke:"white"}));let S=$(B("text"),{"font-size":u,"font-family":"Noto Sans","text-anchor":"middle",fill:"white",y:.13*.75**e.text.length});return S.innerHTML=e.text,p.appendChild(S),p}function Et(e,t){return t==="white"?e:[7-e[0],7-e[1]]}function bn(e,t){return (e&&t.has(e)&&t.get(e).size>1)===!0}function B(e){return document.createElementNS("http://www.w3.org/2000/svg",e)}function $(e,t){for(let n in t)Object.prototype.hasOwnProperty.call(t,n)&&e.setAttribute(n,t[n]);return e}function Br(e,t){return t?{color:e.color,opacity:Math.round(e.opacity*10)/10,lineWidth:Math.round(t.lineWidth||e.lineWidth),key:[e.key,t.lineWidth].filter(n=>n).join("")}:e}function Ko(){return [3/64,4/64]}function zo(e,t){return (e.lineWidth||10)*(t?.85:1)/64}function Kr(e,t){return (e.opacity||1)*(t?.9:1)}function Fo(e){return (e?20:10)/64}function At(e,t){let n=Math.min(1,t.width/t.height),r=Math.min(1,t.height/t.width);return [(e[0]-3.5)*n,(3.5-e[1])*r]}function $o(e,t){let n={from:[Math.floor(Math.min(e[0],t[0])),Math.floor(Math.min(e[1],t[1]))],to:[Math.ceil(Math.max(e[0],t[0])),Math.ceil(Math.max(e[1],t[1]))]};return $(B("rect"),{x:n.from[0],y:n.from[1],width:n.to[0]-n.from[0],height:n.to[1]-n.from[1],fill:"none",stroke:"none"})}function wn(e,t,n=!0){let r=Math.atan2(t[1]-e[1],t[0]-e[0])+Math.PI;return n?(Math.round(r*8/Math.PI)+16)%16:r}function Ho(e,t){return Math.sqrt([e[0]-t[0],e[1]-t[1]].reduce((n,r)=>n+r*r,0))}function zr(e,t,n){let r=Ho(e,t),i=wn(e,t,!1);if(n&&(r-=33/64,n.size>1)){r-=10/64;let o=wn(e,t);(n.has((o+1)%16)||n.has((o+15)%16))&&o&1&&(r-=.4);}return [e[0]-Math.cos(i)*r,e[1]-Math.sin(i)*r].map(o=>o+.5)}function $r(e,t){e.innerHTML="",e.classList.add("cg-wrap");for(let u of Yn)e.classList.toggle("orientation-"+u,t.orientation===u);e.classList.toggle("manipulable",!t.viewOnly);let n=Q("cg-container");e.appendChild(n);let r=Q("cg-board");n.appendChild(r);let i,o,s;if(t.drawable.visible&&(i=$(B("svg"),{class:"cg-shapes",viewBox:"-4 -4 8 8",preserveAspectRatio:"xMidYMid slice"}),i.appendChild(Lr()),i.appendChild(B("g")),o=$(B("svg"),{class:"cg-custom-svgs",viewBox:"-3.5 -3.5 8 8",preserveAspectRatio:"xMidYMid slice"}),o.appendChild(B("g")),s=Q("cg-auto-pieces"),n.appendChild(i),n.appendChild(o),n.appendChild(s)),t.coordinates){let u=t.orientation==="black"?" black":"",c=t.ranksPosition==="left"?" left":"";n.appendChild(Fr(Fe,"ranks"+u+c)),n.appendChild(Fr(qe,"files"+u));}let a;return t.draggable.enabled&&t.draggable.showGhost&&(a=Q("piece","ghost"),He(a,!1),n.appendChild(a)),{board:r,container:n,wrap:e,ghost:a,svg:i,customSvg:o,autoPieces:s}}function Fr(e,t){let n=Q("coords",t),r;for(let i of e)r=Q("coord"),r.textContent=i,n.appendChild(r);return n}function Hr(e,t){if(!e.dropmode.active)return;ne(e),re(e);let n=e.dropmode.piece;if(n){e.pieces.set("a0",n);let r=le(t),i=r&&ie(r,I(e),e.dom.bounds());i&&St(e,"a0",i);}e.dom.redraw();}function Gr(e,t){let n=e.dom.elements.board;if("ResizeObserver"in window&&new ResizeObserver(t).observe(e.dom.elements.wrap),(e.disableContextMenu||e.drawable.enabled)&&n.addEventListener("contextmenu",i=>i.preventDefault()),e.viewOnly)return;let r=Go(e);n.addEventListener("touchstart",r,{passive:!1}),n.addEventListener("mousedown",r,{passive:!1});}function Ur(e,t){let n=[];if("ResizeObserver"in window||n.push(je(document.body,"chessground.resize",t)),!e.viewOnly){let r=Vr(e,Mr,vr),i=Vr(e,Er,yr);for(let s of ["touchmove","mousemove"])n.push(je(document,s,r));for(let s of ["touchend","mouseup"])n.push(je(document,s,i));let o=()=>e.dom.bounds.clear();n.push(je(document,"scroll",o,{capture:!0,passive:!0})),n.push(je(window,"resize",o,{passive:!0}));}return ()=>n.forEach(r=>r())}function je(e,t,n,r){return e.addEventListener(t,n,r),()=>e.removeEventListener(t,n,r)}var Go=e=>t=>{e.draggable.current?_e(e):e.drawable.current?gn(e):t.shiftKey||wt(t)?e.drawable.enabled&&br(e,t):e.viewOnly||(e.dropmode.active?Hr(e,t):Cr(e,t));},Vr=(e,t,n)=>r=>{e.drawable.current?e.drawable.enabled&&n(e,r):e.viewOnly||t(e,r);};function jr(e){let t=I(e),n=Ce(e.dom.bounds()),r=e.dom.elements.board,i=e.pieces,o=e.animation.current,s=o?o.plan.anims:new Map,a=o?o.plan.fadings:new Map,u=e.draggable.current,c=Wo(e),f=new Set,p=new Set,S=new Map,b=new Map,d,h,w,k,y,M,x,C,E,_;for(h=r.firstChild;h;){if(d=h.cgKey,Zr(h))if(w=i.get(d),y=s.get(d),M=a.get(d),k=h.cgPiece,h.cgDragging&&(!u||u.orig!==d)&&(h.classList.remove("dragging"),Z(h,n(N(d),t)),h.cgDragging=!1),!M&&h.cgFading&&(h.cgFading=!1,h.classList.remove("fading")),w){if(y&&h.cgAnimating&&k===Ye(w)){let v=N(d);v[0]+=y[2],v[1]+=y[3],h.classList.add("anim"),Z(h,n(v,t));}else h.cgAnimating&&(h.cgAnimating=!1,h.classList.remove("anim"),Z(h,n(N(d),t)),e.addPieceZIndex&&(h.style.zIndex=vn(N(d),t)));k===Ye(w)&&(!M||!h.cgFading)?f.add(d):M&&k===Ye(M)?(h.classList.add("fading"),h.cgFading=!0):yn(S,k,h);}else yn(S,k,h);else if(Qr(h)){let v=h.className;c.get(d)===v?p.add(d):yn(b,v,h);}h=h.nextSibling;}for(let[v,O]of c)if(!p.has(v)){E=b.get(O),_=E&&E.pop();let D=n(N(v),t);if(_)_.cgKey=v,Z(_,D);else {let R=Q("square",O);R.cgKey=v,Z(R,D),r.insertBefore(R,r.firstChild);}}for(let[v,O]of i)if(y=s.get(v),!f.has(v))if(x=S.get(Ye(O)),C=x&&x.pop(),C){C.cgKey=v,C.cgFading&&(C.classList.remove("fading"),C.cgFading=!1);let D=N(v);e.addPieceZIndex&&(C.style.zIndex=vn(D,t)),y&&(C.cgAnimating=!0,C.classList.add("anim"),D[0]+=y[2],D[1]+=y[3]),Z(C,n(D,t));}else {let D=Ye(O),R=Q("piece",D),K=N(v);R.cgPiece=D,R.cgKey=v,y&&(R.cgAnimating=!0,K[0]+=y[2],K[1]+=y[3]),Z(R,n(K,t)),e.addPieceZIndex&&(R.style.zIndex=vn(K,t)),r.appendChild(R);}for(let v of S.values())Wr(e,v);for(let v of b.values())Wr(e,v);}function Yr(e){let t=I(e),n=Ce(e.dom.bounds()),r=e.dom.elements.board.firstChild;for(;r;)(Zr(r)&&!r.cgAnimating||Qr(r))&&Z(r,n(N(r.cgKey),t)),r=r.nextSibling;}function xn(e){var t,n;let r=e.dom.elements.wrap.getBoundingClientRect(),i=e.dom.elements.container,o=r.height/r.width,s=Math.floor(r.width*window.devicePixelRatio/8)*8/window.devicePixelRatio,a=s*o;i.style.width=s+"px",i.style.height=a+"px",e.dom.bounds.clear(),(t=e.addDimensionsCssVarsTo)===null||t===void 0||t.style.setProperty("--cg-width",s+"px"),(n=e.addDimensionsCssVarsTo)===null||n===void 0||n.style.setProperty("--cg-height",a+"px");}var Zr=e=>e.tagName==="PIECE",Qr=e=>e.tagName==="SQUARE";function Wr(e,t){for(let n of t)e.dom.elements.board.removeChild(n);}function vn(e,t){let r=e[1];return `${t?3+7-r:3+r}`}var Ye=e=>`${e.color} ${e.role}`;function Wo(e){var t,n,r;let i=new Map;if(e.lastMove&&e.highlight.lastMove)for(let a of e.lastMove)me(i,a,"last-move");if(e.check&&e.highlight.check&&me(i,e.check,"check"),e.selected&&(me(i,e.selected,"selected"),e.movable.showDests)){let a=(t=e.movable.dests)===null||t===void 0?void 0:t.get(e.selected);if(a)for(let c of a)me(i,c,"move-dest"+(e.pieces.has(c)?" oc":""));let u=(r=(n=e.premovable.customDests)===null||n===void 0?void 0:n.get(e.selected))!==null&&r!==void 0?r:e.premovable.dests;if(u)for(let c of u)me(i,c,"premove-dest"+(e.pieces.has(c)?" oc":""));}let o=e.premovable.current;if(o)for(let a of o)me(i,a,"current-premove");else e.predroppable.current&&me(i,e.predroppable.current.key,"current-premove");let s=e.exploding;if(s)for(let a of s.keys)me(i,a,"exploding"+s.stage);return e.highlight.custom&&e.highlight.custom.forEach((a,u)=>{me(i,u,a);}),i}function me(e,t,n){let r=e.get(t);r?e.set(t,`${r} ${n}`):e.set(t,n);}function yn(e,t,n){let r=e.get(t);r?r.push(n):e.set(t,[n]);}function Xr(e,t,n){let r=new Map,i=[];for(let a of e)r.set(a.hash,!1);let o=t.firstElementChild,s;for(;o;)s=o.getAttribute("cgHash"),r.has(s)?r.set(s,!0):i.push(o),o=o.nextElementSibling;for(let a of i)t.removeChild(a);for(let a of e)r.get(a.hash)||t.appendChild(n(a));}function Jr(e,t){let r=e.drawable.autoShapes.filter(i=>i.piece).map(i=>({shape:i,hash:Yo(i),current:!1}));Xr(r,t,i=>jo(e,i,e.dom.bounds()));}function ei(e){var t;let n=I(e),r=Ce(e.dom.bounds()),i=(t=e.dom.elements.autoPieces)===null||t===void 0?void 0:t.firstChild;for(;i;)Jt(i,r(N(i.cgKey),n),i.cgScale),i=i.nextSibling;}function jo(e,{shape:t,hash:n},r){var i,o,s;let a=t.orig,u=(i=t.piece)===null||i===void 0?void 0:i.role,c=(o=t.piece)===null||o===void 0?void 0:o.color,f=(s=t.piece)===null||s===void 0?void 0:s.scale,p=Q("piece",`${u} ${c}`);return p.setAttribute("cgHash",n),p.cgKey=a,p.cgScale=f,Jt(p,Ce(r)(N(a),I(e)),f),p}var Yo=e=>{var t,n,r;return [e.orig,(t=e.piece)===null||t===void 0?void 0:t.role,(n=e.piece)===null||n===void 0?void 0:n.color,(r=e.piece)===null||r===void 0?void 0:r.scale].join(",")};function ti(e,t){let n=Tr();Mt(n,t||{});function r(){let i="dom"in n?n.dom.unbind:void 0,o=$r(e,n),s=Jn(()=>o.board.getBoundingClientRect()),a=f=>{jr(c),o.autoPieces&&Jr(c,o.autoPieces),!f&&o.svg&&Ir(c,o.svg,o.customSvg);},u=()=>{xn(c),Yr(c),o.autoPieces&&ei(c);},c=n;return c.dom={elements:o,bounds:s,redraw:Qo(a),redrawNow:a,unbind:i},c.drawable.prevSvgHash="",xn(c),a(!1),Gr(c,u),i||(c.dom.unbind=Ur(c,u)),c.events.insert&&c.events.insert(o),c}return Or(r(),r)}function Qo(e){let t=!1;return ()=>{t||(t=!0,requestAnimationFrame(()=>{e(),t=!1;}));}}function Xo(e,t){return document.createElement(e,t)}function Jo(e,t,n){return document.createElementNS(e,t,n)}function es(){return Re(document.createDocumentFragment())}function ts(e){return document.createTextNode(e)}function ns(e){return document.createComment(e)}function rs(e,t,n){if(ge(e)){let r=e;for(;r&&ge(r);)r=Re(r).parent;e=r??e;}ge(t)&&(t=Re(t,e)),n&&ge(n)&&(n=Re(n).firstChildNode),e.insertBefore(t,n);}function is(e,t){e.removeChild(t);}function os(e,t){ge(t)&&(t=Re(t,e)),e.appendChild(t);}function ni(e){if(ge(e)){for(;e&&ge(e);)e=Re(e).parent;return e??null}return e.parentNode}function ss(e){var t;if(ge(e)){let n=Re(e),r=ni(n);if(r&&n.lastChildNode){let i=Array.from(r.childNodes),o=i.indexOf(n.lastChildNode);return (t=i[o+1])!==null&&t!==void 0?t:null}return null}return e.nextSibling}function as(e){return e.tagName}function cs(e,t){e.textContent=t;}function ls(e){return e.textContent}function us(e){return e.nodeType===1}function ds(e){return e.nodeType===3}function hs(e){return e.nodeType===8}function ge(e){return e.nodeType===11}function Re(e,t){var n,r,i;let o=e;return (n=o.parent)!==null&&n!==void 0||(o.parent=t??null),(r=o.firstChildNode)!==null&&r!==void 0||(o.firstChildNode=e.firstChild),(i=o.lastChildNode)!==null&&i!==void 0||(o.lastChildNode=e.lastChild),o}var ri={createElement:Xo,createElementNS:Jo,createTextNode:ts,createDocumentFragment:es,createComment:ns,insertBefore:rs,removeChild:is,appendChild:os,parentNode:ni,nextSibling:ss,tagName:as,setTextContent:cs,getTextContent:ls,isElement:us,isText:ds,isComment:hs,isDocumentFragment:ge};function Ne(e,t,n,r,i){let o=t===void 0?void 0:t.key;return {sel:e,data:t,children:n,text:r,elm:i,key:o}}var Ze=Array.isArray;function De(e){return typeof e=="string"||typeof e=="number"||e instanceof String||e instanceof Number}function Sn(e){return e===void 0}function j(e){return e!==void 0}var Cn=Ne("",{},[],void 0,void 0);function Qe(e,t){var n,r;let i=e.key===t.key,o=((n=e.data)===null||n===void 0?void 0:n.is)===((r=t.data)===null||r===void 0?void 0:r.is),s=e.sel===t.sel,a=!e.sel&&e.sel===t.sel?typeof e.text==typeof t.text:!0;return s&&i&&o&&a}function fs(){throw new Error("The document fragment is not supported on this platform.")}function ps(e,t){return e.isElement(t)}function ms(e,t){return e.isDocumentFragment(t)}function gs(e,t,n){var r;let i={};for(let o=t;o<=n;++o){let s=(r=e[o])===null||r===void 0?void 0:r.key;s!==void 0&&(i[s]=o);}return i}var ks=["create","update","remove","destroy","pre","post"];function Pn(e,t,n){let r={create:[],update:[],remove:[],destroy:[],pre:[],post:[]},i=ri;for(let d of ks)for(let h of e){let w=h[d];w!==void 0&&r[d].push(w);}function o(d){let h=d.id?"#"+d.id:"",w=d.getAttribute("class"),k=w?"."+w.split(" ").join("."):"";return Ne(i.tagName(d).toLowerCase()+h+k,{},[],void 0,d)}function s(d){return Ne(void 0,{},[],void 0,d)}function a(d,h){return function(){if(--h===0){let k=i.parentNode(d);i.removeChild(k,d);}}}function u(d,h){var w,k,y,M;let x,C=d.data;if(C!==void 0){let v=(w=C.hook)===null||w===void 0?void 0:w.init;j(v)&&(v(d),C=d.data);}let E=d.children,_=d.sel;if(_==="!")Sn(d.text)&&(d.text=""),d.elm=i.createComment(d.text);else if(_!==void 0){let v=_.indexOf("#"),O=_.indexOf(".",v),D=v>0?v:_.length,R=O>0?O:_.length,K=v!==-1||O!==-1?_.slice(0,Math.min(D,R)):_,X=d.elm=j(C)&&j(x=C.ns)?i.createElementNS(x,K,C):i.createElement(K,C);for(D<R&&X.setAttribute("id",_.slice(D+1,R)),O>0&&X.setAttribute("class",_.slice(R+1).replace(/\./g," ")),x=0;x<r.create.length;++x)r.create[x](Cn,d);if(Ze(E))for(x=0;x<E.length;++x){let Rn=E[x];Rn!=null&&i.appendChild(X,u(Rn,h));}else De(d.text)&&i.appendChild(X,i.createTextNode(d.text));let Xe=d.data.hook;j(Xe)&&((k=Xe.create)===null||k===void 0||k.call(Xe,Cn,d),Xe.insert&&h.push(d));}else if(!((y=n?.experimental)===null||y===void 0)&&y.fragments&&d.children){for(d.elm=((M=i.createDocumentFragment)!==null&&M!==void 0?M:fs)(),x=0;x<r.create.length;++x)r.create[x](Cn,d);for(x=0;x<d.children.length;++x){let v=d.children[x];v!=null&&i.appendChild(d.elm,u(v,h));}}else d.elm=i.createTextNode(d.text);return d.elm}function c(d,h,w,k,y,M){for(;k<=y;++k){let x=w[k];x!=null&&i.insertBefore(d,u(x,M),h);}}function f(d){var h,w;let k=d.data;if(k!==void 0){(w=(h=k?.hook)===null||h===void 0?void 0:h.destroy)===null||w===void 0||w.call(h,d);for(let y=0;y<r.destroy.length;++y)r.destroy[y](d);if(d.children!==void 0)for(let y=0;y<d.children.length;++y){let M=d.children[y];M!=null&&typeof M!="string"&&f(M);}}}function p(d,h,w,k){for(var y,M;w<=k;++w){let x,C,E=h[w];if(E!=null)if(j(E.sel)){f(E),x=r.remove.length+1,C=a(E.elm,x);for(let v=0;v<r.remove.length;++v)r.remove[v](E,C);let _=(M=(y=E?.data)===null||y===void 0?void 0:y.hook)===null||M===void 0?void 0:M.remove;j(_)?_(E,C):C();}else E.children?(f(E),p(d,E.children,0,E.children.length-1)):i.removeChild(d,E.elm);}}function S(d,h,w,k){let y=0,M=0,x=h.length-1,C=h[0],E=h[x],_=w.length-1,v=w[0],O=w[_],D,R,K,X;for(;y<=x&&M<=_;)C==null?C=h[++y]:E==null?E=h[--x]:v==null?v=w[++M]:O==null?O=w[--_]:Qe(C,v)?(b(C,v,k),C=h[++y],v=w[++M]):Qe(E,O)?(b(E,O,k),E=h[--x],O=w[--_]):Qe(C,O)?(b(C,O,k),i.insertBefore(d,C.elm,i.nextSibling(E.elm)),C=h[++y],O=w[--_]):Qe(E,v)?(b(E,v,k),i.insertBefore(d,E.elm,C.elm),E=h[--x],v=w[++M]):(D===void 0&&(D=gs(h,y,x)),R=D[v.key],Sn(R)?i.insertBefore(d,u(v,k),C.elm):(K=h[R],K.sel!==v.sel?i.insertBefore(d,u(v,k),C.elm):(b(K,v,k),h[R]=void 0,i.insertBefore(d,K.elm,C.elm))),v=w[++M]);M<=_&&(X=w[_+1]==null?null:w[_+1].elm,c(d,X,w,M,_,k)),y<=x&&p(d,h,y,x);}function b(d,h,w){var k,y,M,x,C,E,_,v;let O=(k=h.data)===null||k===void 0?void 0:k.hook;(y=O?.prepatch)===null||y===void 0||y.call(O,d,h);let D=h.elm=d.elm;if(d===h)return;if(h.data!==void 0||j(h.text)&&h.text!==d.text){(M=h.data)!==null&&M!==void 0||(h.data={}),(x=d.data)!==null&&x!==void 0||(d.data={});for(let X=0;X<r.update.length;++X)r.update[X](d,h);(_=(E=(C=h.data)===null||C===void 0?void 0:C.hook)===null||E===void 0?void 0:E.update)===null||_===void 0||_.call(E,d,h);}let R=d.children,K=h.children;Sn(h.text)?j(R)&&j(K)?R!==K&&S(D,R,K,w):j(K)?(j(d.text)&&i.setTextContent(D,""),c(D,null,K,0,K.length-1,w)):j(R)?p(D,R,0,R.length-1):j(d.text)&&i.setTextContent(D,""):d.text!==h.text&&(j(R)&&p(D,R,0,R.length-1),i.setTextContent(D,h.text)),(v=O?.postpatch)===null||v===void 0||v.call(O,d,h);}return function(h,w){let k,y,M,x=[];for(k=0;k<r.pre.length;++k)r.pre[k]();for(ps(i,h)?h=o(h):ms(i,h)&&(h=s(h)),Qe(h,w)?b(h,w,x):(y=h.elm,M=i.parentNode(y),u(w,x),M!==null&&(i.insertBefore(M,w.elm,i.nextSibling(y)),p(M,[h],0,0))),k=0;k<x.length;++k)x[k].data.hook.insert(x[k]);for(k=0;k<r.post.length;++k)r.post[k]();return w}}function oi(e,t,n){if(e.ns="http://www.w3.org/2000/svg",n!=="foreignObject"&&t!==void 0)for(let r=0;r<t.length;++r){let i=t[r];if(typeof i=="string")continue;let o=i.data;o!==void 0&&oi(o,i.children,i.sel);}}function A(e,t,n){let r={},i,o,s;if(n!==void 0?(t!==null&&(r=t),Ze(n)?i=n:De(n)?o=n.toString():n&&n.sel&&(i=[n])):t!=null&&(Ze(t)?i=t:De(t)?o=t.toString():t&&t.sel?i=[t]:r=t),i!==void 0)for(s=0;s<i.length;++s)De(i[s])&&(i[s]=Ne(void 0,void 0,void 0,i[s],void 0));return e[0]==="s"&&e[1]==="v"&&e[2]==="g"&&(e.length===3||e[3]==="."||e[3]==="#")&&oi(r,i,e),Ne(e,r,i,o,void 0)}var bs="http://www.w3.org/1999/xlink",ws="http://www.w3.org/XML/1998/namespace";function si(e,t){let n,r=t.elm,i=e.data.attrs,o=t.data.attrs;if(!(!i&&!o)&&i!==o){i=i||{},o=o||{};for(n in o){let s=o[n];i[n]!==s&&(s===!0?r.setAttribute(n,""):s===!1?r.removeAttribute(n):n.charCodeAt(0)!==120?r.setAttribute(n,s):n.charCodeAt(3)===58?r.setAttributeNS(ws,n,s):n.charCodeAt(5)===58?r.setAttributeNS(bs,n,s):r.setAttribute(n,s));}for(n in i)n in o||r.removeAttribute(n);}}var Mn={create:si,update:si};function ai(e,t){let n,r,i=t.elm,o=e.data.class,s=t.data.class;if(!(!o&&!s)&&o!==s){o=o||{},s=s||{};for(r in o)o[r]&&!Object.prototype.hasOwnProperty.call(s,r)&&i.classList.remove(r);for(r in s)n=s[r],n!==o[r]&&i.classList[n?"add":"remove"](r);}}var En={create:ai,update:ai};function ci(e,t,n){for(let r of ["touchstart","mousedown"])e.addEventListener(r,i=>{t(i),i.preventDefault();},{passive:!1});}var _t=(e,t,n,r=!0)=>Le(i=>i.addEventListener(e,o=>{let s=t(o);return s===!1&&o.preventDefault(),s},{passive:r}));function Le(e){return {insert:t=>e(t.elm)}}function li(e){let t=0;return n=>{t+=n.deltaY*(n.deltaMode?40:1),Math.abs(t)>=4?(e(n,!0),t=0):e(n,!1);}}function ui(e,t){let n=()=>{e(),r=Math.max(100,r-r/15),i=setTimeout(n,r);},r=350,i=setTimeout(n,500);e();let o=t.type=="touchstart"?"touchend":"mouseup";document.addEventListener(o,()=>clearTimeout(i),{once:!0});}var vs=e=>e.altKey||e.ctrlKey||e.shiftKey||e.metaKey||document.activeElement instanceof HTMLInputElement||document.activeElement instanceof HTMLTextAreaElement,di=e=>t=>{vs(t)||(t.key=="ArrowLeft"?e.goTo("prev"):t.key=="ArrowRight"?e.goTo("next"):t.key=="f"&&e.flip());};var hi=e=>A("div.lpv__menu.lpv__pane",[A("button.lpv__menu__entry.lpv__menu__flip.lpv__fbt",{hook:_t("click",e.flip)},e.translate("flipTheBoard")),e.opts.menu.analysisBoard?.enabled?A("a.lpv__menu__entry.lpv__menu__analysis.lpv__fbt",{attrs:{href:e.analysisUrl(),target:"_blank"}},e.translate("analysisBoard")):void 0,e.opts.menu.practiceWithComputer?.enabled?A("a.lpv__menu__entry.lpv__menu__practice.lpv__fbt",{attrs:{href:e.practiceUrl(),target:"_blank"}},e.translate("practiceWithComputer")):void 0,e.opts.menu.getPgn.enabled?A("button.lpv__menu__entry.lpv__menu__pgn.lpv__fbt",{hook:_t("click",e.togglePgn)},e.translate("getPgn")):void 0,ys(e)]),ys=e=>{let t=e.game.metadata.externalLink;return t&&A("a.lpv__menu__entry.lpv__fbt",{attrs:{href:t,target:"_blank"}},e.translate(e.game.metadata.isLichess?"viewOnLichess":"viewOnSite"))},fi=e=>A("div.lpv__controls",[e.pane=="board"?void 0:Rt(e,"first","step-backward"),Rt(e,"prev","left-open"),A("button.lpv__fbt.lpv__controls__menu.lpv__icon",{class:{active:e.pane!="board","lpv__icon-ellipsis-vert":e.pane=="board"},hook:_t("click",e.toggleMenu)},e.pane=="board"?void 0:"X"),Rt(e,"next","right-open"),e.pane=="board"?void 0:Rt(e,"last","step-forward")]),Rt=(e,t,n)=>A(`button.lpv__controls__goto.lpv__controls__goto--${t}.lpv__fbt.lpv__icon.lpv__icon-${n}`,{class:{disabled:e.pane=="board"&&!e.canGoTo(t)},hook:Le(r=>ci(r,i=>ui(()=>e.goTo(t),i)))});var mi=e=>A("div.lpv__side",A("div.lpv__moves",{hook:{insert:t=>{let n=t.elm;e.path.empty()||pi(e,n),n.addEventListener("mousedown",r=>{let i=r.target.getAttribute("p");i&&e.toPath(new te(i));},{passive:!0});},postpatch:(t,n)=>{e.autoScrollRequested&&(pi(e,n.elm),e.autoScrollRequested=!1);}}},[...e.game.initial.comments.map(Ot),...Cs(e)])),An=()=>A("move.empty","..."),_n=e=>A("index",`${e}.`),Ot=e=>A("comment",e),xs=()=>A("paren.open","("),Ss=()=>A("paren.close",")"),Nt=e=>Math.floor((e.ply-1)/2)+1,Cs=e=>{let t=Ms(e),n=[],r,i=e.game.moves.children.slice(1);for(e.game.initial.pos.turn=="black"&&e.game.mainline[0]&&n.push(_n(e.game.initial.pos.fullmoves),An());r=(r||e.game.moves).children[0];){let o=r.data,s=o.ply%2==1;s&&n.push(_n(Nt(o))),n.push(t(o));let a=s&&(i.length||o.comments.length)&&r.children.length;a&&n.push(An()),o.comments.forEach(u=>n.push(Ot(u))),i.forEach(u=>n.push(Ps(t,u))),a&&n.push(_n(Nt(o)),An()),i=r.children.slice(1);}return n},Ps=(e,t)=>A("variation",[...t.data.startingComments.map(Ot),...gi(e,t)]),gi=(e,t)=>{let n=[],r=[];t.data.ply%2==0&&n.push(A("index",[Nt(t.data),"..."]));do{let i=t.data;i.ply%2==1&&n.push(A("index",[Nt(i),"."])),n.push(e(i)),i.comments.forEach(o=>n.push(Ot(o))),r.forEach(o=>{n=[...n,xs(),...gi(e,o),Ss()];}),r=t.children.slice(1),t=t.children[0];}while(t);return n},Ms=e=>t=>A("move",{class:{current:e.path.equals(t.path),ancestor:e.path.contains(t.path),good:t.nags.includes(1),mistake:t.nags.includes(2),brilliant:t.nags.includes(3),blunder:t.nags.includes(4),interesting:t.nags.includes(5),inaccuracy:t.nags.includes(6)},attrs:{p:t.path.path}},t.san),pi=(e,t)=>{let n=t.querySelector(".current");if(!n){t.scrollTop=e.path.empty()?0:99999;return}t.scrollTop=n.offsetTop-t.offsetHeight/2+n.offsetHeight;};function Tt(e,t){let n=t=="bottom"?e.orientation():P(e.orientation()),r=e.game.players[n],i=[r.title?A("span.lpv__player__title",r.title):void 0,A("span.lpv__player__name",r.name),r.rating?A("span.lpv__player__rating",["(",r.rating,")"]):void 0];return A(`div.lpv__player.lpv__player--${t}`,[r.isLichessUser?A("a.lpv__player__person.ulpt.user-link",{attrs:{href:`${e.opts.lichess}/@/${r.name}`}},i):A("span.lpv__player__person",i),e.opts.showClocks?Es(e,n):void 0])}var Es=(e,t)=>{let n=e.curData(),r=n.clocks&&n.clocks[t];return typeof r==null?void 0:A("div.lpv__player__clock",{class:{active:t==n.turn}},As(r))},As=e=>{if(!e&&e!==0)return ["-"];let t=new Date(e*1e3),n=":",r=ki(t.getUTCMinutes())+n+ki(t.getUTCSeconds());return e>=3600?[Math.floor(e/3600)+n+r]:[r]},ki=e=>(e<10?"0":"")+e;function qt(e){let t=e.opts,n=`lpv.lpv--moves-${t.showMoves}.lpv--controls-${t.showControls}${t.classes?"."+t.classes.replace(" ","."):""}`,r=t.showPlayers=="auto"?e.game.hasPlayerName():t.showPlayers;return A(`div.${n}`,{class:{"lpv--menu":e.pane!="board","lpv--players":r},attrs:{tabindex:0},hook:Le(i=>{e.setGround(ti(i.querySelector(".cg-wrap"),Ns(e,i))),i.addEventListener("keydown",di(e));})},[r?Tt(e,"top"):void 0,_s(e),r?Tt(e,"bottom"):void 0,t.showControls?fi(e):void 0,t.showMoves?mi(e):void 0,e.pane=="menu"?hi(e):e.pane=="pgn"?Rs(e):void 0])}var _s=e=>A("div.lpv__board",{hook:Le(t=>{t.addEventListener("click",e.focus),e.opts.scrollToMove&&!("ontouchstart"in window)&&t.addEventListener("wheel",li((n,r)=>{n.preventDefault(),n.deltaY>0&&r?e.goTo("next",!1):n.deltaY<0&&r&&e.goTo("prev",!1);}));})},A("div.cg-wrap")),Rs=e=>{let t=new Blob([e.opts.pgn],{type:"text/plain"});return A("div.lpv__pgn.lpv__pane",[A("a.lpv__pgn__download.lpv__fbt",{attrs:{href:window.URL.createObjectURL(t),download:e.opts.menu.getPgn.fileName||`${e.game.title()}.pgn`}},e.translate("download")),A("textarea.lpv__pgn__text",e.opts.pgn)])},Ns=(e,t)=>({viewOnly:!e.opts.drawArrows,addDimensionsCssVarsTo:t,drawable:{enabled:e.opts.drawArrows,visible:!0},disableContextMenu:e.opts.drawArrows,...e.opts.chessground||{},movable:{free:!1},draggable:{enabled:!1},selectable:{enabled:!1},...e.cgState()});var Os={pgn:"*",fen:void 0,showPlayers:"auto",showClocks:!0,showMoves:"auto",showControls:!0,scrollToMove:!0,orientation:void 0,initialPly:0,chessground:{},drawArrows:!0,menu:{getPgn:{enabled:!0,fileName:void 0},practiceWithComputer:{enabled:!0},analysisBoard:{enabled:!0}},lichess:"https://lichess.org",classes:void 0};function wi(e,t){let n={...Os};return vi(n,t),n.fen&&(n.pgn=`[FEN "${n.fen}"]
${n.pgn}`),n.classes||(n.classes=e.className),n}function vi(e,t){for(let n in t)typeof t[n]<"u"&&(bi(e[n])&&bi(t[n])?vi(e[n],t[n]):e[n]=t[n]);}function bi(e){if(typeof e!="object"||e===null)return !1;let t=Object.getPrototypeOf(e);return t===Object.prototype||t===null}function Ts(e,t){let n=Pn([En,Mn]),r=wi(e,t),i=new Ge(r,a),o=qt(i);e.innerHTML="";let s=n(e,o);i.div=s.elm;function a(){s=n(s,qt(i));}return i}

/* svelte/DailyGame.svelte generated by Svelte v4.2.18 */
const file$1 = "svelte/DailyGame.svelte";

function create_fragment$1(ctx) {
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
			add_location(a, file$1, 61, 8, 1418);
			attr_dev(div0, "class", "block");
			add_location(div0, file$1, 60, 6, 1390);
			attr_dev(div1, "class", "is2d");
			attr_dev(div1, "id", div1_id_value = /*game*/ ctx[0].url);
			add_location(div1, file$1, 67, 10, 1594);
			attr_dev(div2, "class", "cell");
			add_location(div2, file$1, 66, 8, 1565);
			attr_dev(div3, "class", "is2d reversed");
			attr_dev(div3, "id", div3_id_value = "" + (/*game*/ ctx[0].url + "-reversed"));
			add_location(div3, file$1, 70, 10, 1716);
			attr_dev(div4, "class", "cell");
			add_location(div4, file$1, 69, 8, 1687);
			attr_dev(div5, "class", "grid");
			add_location(div5, file$1, 65, 6, 1538);
			attr_dev(div6, "class", "box");
			add_location(div6, file$1, 59, 4, 1366);
			attr_dev(div7, "class", "fixed-grid has-2-cols");
			add_location(div7, file$1, 58, 2, 1326);
			attr_dev(div8, "class", "block");
			add_location(div8, file$1, 57, 0, 1304);
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
		id: create_fragment$1.name,
		type: "component",
		source: "",
		ctx
	});

	return block;
}

function instance$1($$self, $$props, $$invalidate) {
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
		init(this, options, instance$1, create_fragment$1, safe_not_equal, { game: 0, myColor: 3 });

		dispatch_dev("SvelteRegisterComponent", {
			component: this,
			tagName: "DailyGame",
			options,
			id: create_fragment$1.name
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
const file = "svelte/DailyGames.svelte";

function get_each_context(ctx, list, i) {
	const child_ctx = ctx.slice();
	child_ctx[23] = list[i];
	return child_ctx;
}

function get_each_context_1(ctx, list, i) {
	const child_ctx = ctx.slice();
	child_ctx[23] = list[i];
	return child_ctx;
}

// (154:0) {#each myGames as game (game.url)}
function create_each_block_1(key_1, ctx) {
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
			add_location(div, file, 154, 2, 4386);
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
		id: create_each_block_1.name,
		type: "each",
		source: "(154:0) {#each myGames as game (game.url)}",
		ctx
	});

	return block;
}

// (163:0) {#each theirGames as game (game.url)}
function create_each_block(key_1, ctx) {
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
			add_location(div, file, 163, 2, 4594);
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
		id: create_each_block.name,
		type: "each",
		source: "(163:0) {#each theirGames as game (game.url)}",
		ctx
	});

	return block;
}

function create_fragment(ctx) {
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
	validate_each_keys(ctx, each_value_1, get_each_context_1, get_key);

	for (let i = 0; i < each_value_1.length; i += 1) {
		let child_ctx = get_each_context_1(ctx, each_value_1, i);
		let key = get_key(child_ctx);
		each0_lookup.set(key, each_blocks_1[i] = create_each_block_1(key, child_ctx));
	}

	let each_value = ensure_array_like_dev(/*theirGames*/ ctx[1]);
	const get_key_1 = ctx => /*game*/ ctx[23].url;
	validate_each_keys(ctx, each_value, get_each_context, get_key_1);

	for (let i = 0; i < each_value.length; i += 1) {
		let child_ctx = get_each_context(ctx, each_value, i);
		let key = get_key_1(child_ctx);
		each1_lookup.set(key, each_blocks[i] = create_each_block(key, child_ctx));
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
			add_location(link, file, 149, 0, 4219);
			attr_dev(h1, "class", "title");
			add_location(h1, file, 151, 0, 4297);
			add_location(h20, file, 152, 0, 4332);
			add_location(h21, file, 161, 0, 4534);
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
				validate_each_keys(ctx, each_value_1, get_each_context_1, get_key);
				each_blocks_1 = update_keyed_each(each_blocks_1, dirty, get_key, 1, ctx, each_value_1, each0_lookup, t5.parentNode, fix_and_outro_and_destroy_block, create_each_block_1, t5, get_each_context_1);
				for (let i = 0; i < each_blocks_1.length; i += 1) each_blocks_1[i].a();
				check_outros();
			}

			if (dirty & /*theirGames, chessDotComUsername*/ 10) {
				each_value = ensure_array_like_dev(/*theirGames*/ ctx[1]);
				group_outros();
				for (let i = 0; i < each_blocks.length; i += 1) each_blocks[i].r();
				validate_each_keys(ctx, each_value, get_each_context, get_key_1);
				each_blocks = update_keyed_each(each_blocks, dirty, get_key_1, 1, ctx, each_value, each1_lookup, each1_anchor.parentNode, fix_and_outro_and_destroy_block, create_each_block, each1_anchor, get_each_context);
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
		id: create_fragment.name,
		type: "component",
		source: "",
		ctx
	});

	return block;
}

function instance($$self, $$props, $$invalidate) {
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
		init(this, options, instance, create_fragment, safe_not_equal, {});

		dispatch_dev("SvelteRegisterComponent", {
			component: this,
			tagName: "DailyGames",
			options,
			id: create_fragment.name
		});
	}
}

export { DailyGames as default };
//# sourceMappingURL=daily_games.js.map
