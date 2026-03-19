/**
 * Auto load post module front-end JS.
 * 
 * @copyright 2022 ThemeSphere.
 */
"use strict";

(function() {
	// Percentage reading to trigger the next.
	const TRIGGER_NEXT_FACTOR = 0.65;

	/** @type {!Array<Object>} */
	let postsToLoad = [];

	/** @type {HTMLElement} */
	let mainPostElement;

	/** @type {IntersectionObserver} */
	let inViewObserver;

	/**
	 * States and current refs.
	 */
	let isLoading = false;

	// All the loaded posts elements.
	let postElements = [];
	
	// Latest loaded post element.
	let postElement;

	/**
	 * Set up.
	 */
	function init() {
		// Set posts on ready.
		callOnReady(setup);
	}

	/**
	 * Setup events. Should be called after DOMContentLoaded.
	 */
	function setup() {

		if (typeof SphereCore_AutoPosts === 'undefined' || !window.fetch) {
			return;
		}
		
		postsToLoad     = SphereCore_AutoPosts;
		postElement     = document.querySelector('.main');
		mainPostElement = postElement;
		
		postElements.push(mainPostElement);

		if (!mainPostElement) {
			return;
		}

		Object.assign(mainPostElement.dataset, {
			title: document.title,
			url: window.location.href
		});

		document.addEventListener('scroll', () => {

			// isLoading is false once iframe is inserted but iframe's dataset.loading
			// is empty only once onload event has fired (on full load).
			if (isLoading || postElement.dataset.loading) {
				return;
			}

			let triggerLoad = postElement.offsetTop + (postElement.offsetHeight * TRIGGER_NEXT_FACTOR);
			if (window.scrollY > triggerLoad) {
				isLoading = true;
				requestAnimationFrame(loadPost);
			}
		});

		inViewObserver = new IntersectionObserver(observePostsInView, {
			root: null,
			rootMargin: '0px 0px -50%',
			threshold: 0
		});
	}

	/**
	 * Observe posts entering the viewport and update URL etc.
	 * 
	 * @param {Array} entries 
	 */
	function observePostsInView(entries) {

		let thePost;

		// Current visible post, that will be inactivated, if any.
		let currentPost;

		for (let element of entries) {
			if (element.intersectionRatio <= 0) {
				currentPost = element.target;
				continue;
			}
			
			thePost = element.target;
			break;
		}

		// Revert to previous post if available.
		if (!thePost) {
			const index    = postElements.findIndex(post => post === currentPost);
			const prevPost = postElements[index - 1];

			if (prevPost && prevPost.getBoundingClientRect().bottom >= 0) {
				thePost = prevPost;
			}
		}

		if (thePost && thePost.dataset.url) {
			window.history.pushState(null, thePost.dataset.title, thePost.dataset.url);
			document.title = thePost.dataset.title;

			sendPageView();
		}
	}

	/**
	 * Add a loader before the current post element/iframe.
	 */
	function addLoader(target) {

		target = target || postElement;
		const loader = document.createElement('div');
		Object.assign(loader, {
			className: 'spc-alp-loader ts-spinner'
		});

		target.after(loader);
	}

	/**
	 * Load the next post.
	 */
	function loadPost() {
		const post = postsToLoad.shift();

		if (!post) {
			return;
		}

		// Loading for the first time, add class to main element.
		if (mainPostElement === postElement) {
			mainPostElement.classList.add('spc-alp-main');
		}

		const addPostContainer = (html) => {
			if (!html) {
				return;
			}

			const parser = new DOMParser();
			const doc    = parser.parseFromString(html, 'text/html');
			
			// Get the post content.
			const content  = doc.querySelector('.main-wrap > .main');
			if (!content) {
				return;
			}

			const container = document.createElement('div');
			postElement.after(container);

			Object.assign(container.dataset, {
				url: post.url,
				title: post.title,
				id: post.id
				// loading: '1'
			});

			Object.assign(container, {
				id: `spc-alp-${post.id}`,
				className: 'spc-auto-load-post',
				innerHTML: content.outerHTML
			});

			postElement = container;
			postElements.push(container);

			return container;
		};
		
		addLoader();

		fetch(post.url)
			.then(resp => resp.text())
			.then(html => {
				const container = addPostContainer(html);

				// Remove loader.
				document.querySelectorAll('.spc-alp-loader').forEach(e => e.remove());	

				if (!container) {
					return;
				}
				
				executeScripts(container);

				// Reload twitter embeds.
				if (window.twttr && twttr.widgets && twttr.widgets.load) {
					twttr.widgets.load();
				}

				requestAnimationFrame(() => {
					isLoading = false;

					// Ensure visibility.
					ensureVisible(container);

					// Add to observers after visibility.
					inViewObserver.observe(container);

					document.dispatchEvent(new Event('spc-alp-loaded'));

					// Do the theme reinit functions.
					const theme = Bunyad.theme || Bunyad_Theme;
					if (theme.reInit) {
						theme.reInit(container);
					}
				});
			});
	}

	/**
	 * Execute script tags for content added via innerHTML.
	 * 
	 * @param {HTMLElement} element 
	 */
	function executeScripts(element) {
		let debloatDelay;

		element.querySelectorAll('script').forEach(item => {
			const script = document.createElement('script');
			script.text = item.textContent;
	
			// Set attributes.
			const attrs = item.attributes;
			for (const attr of attrs) {
				script.setAttribute(attr.name, attr.value || true);
			}

			// Lazy / delay loads.
			if (script.type && ['rocketlazyloadscript', 'text/debloat-script', '/javascript'].includes(script.type)) {
				script.type = 'text/javascript';
			}

			if (script.dataset.debloatDelay) {
				debloatDelay = true;
			}

			if (!script.src && script.dataset.src) {
				script.src = script.dataset.src;
			}
			
			document.body.append(script);
		});

		if (debloatDelay) {
			document.dispatchEvent(new Event('debloat-load-js'));
		}
	}

	/**
	 * Ensure the post element is visible, if at end of the page.
	 * 
	 * @param {HTMLElement} postElement 
	 */
	function ensureVisible(postElement) {

		// Scroll to post if at footer / almost end of page.
		const doc = document.documentElement;
		if (doc.scrollHeight - doc.scrollTop <= doc.clientHeight + 75) {
			if (Bunyad.theme) {
				Bunyad.theme.stickyBarPause = true;
				setTimeout(() => Bunyad.theme.stickyBarPause = false, 5);
			}

			postElement.scrollIntoView();
		}
	}

	/**
	 * Send a pageview to analytics - should be called when post is visible.
	 */
	function sendPageView() {
		if (!postElement || postElement.dataset.viewTracked) {
			return;
		}

		// New Google Tag
		if (window.gtag) {
			window.gtag('event', 'page_view', {
				page_title: postElement.dataset.title,
				page_location: postElement.dataset.url
			});
		}

		// Analytics.js
		if (window.ga) {
			window.ga('send', 'pageview', postElement.dataset.url);
		}

		document.dispatchEvent(
			new CustomEvent('spc-alp-pageview', {
				detail: {
					id: postElement.dataset.id,
					ele: postElement
				}
			})
		);

		postElement.dataset.viewTracked = 1;
	}

	function callOnReady(cb) {
		document.readyState !== 'loading' 
			? cb() 
			: document.addEventListener('DOMContentLoaded', cb);
	}

	init();

})();