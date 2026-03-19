/** @copyright 2023 ThemeSphere. */
"use strict";

(function() {
	
	let theModal;
	let noReshow = 0;
	let didTest  = false;

	const STORAGE_KEY = 'detect-message-shown';

	function init() {
		document.readyState === 'complete' ? ready() : window.addEventListener('load', ready);
	}

	function ready() {
		theModal = document.querySelector('#detect-modal');
		
		const delay = parseFloat(theModal.dataset.delay);
		(delay > 0 
			? setTimeout(() => doTest(), delay*1000) 
			: doTest()
		);
	}

	function doTest() {
		const random = max => Math.floor(Math.random() * max);
	
		if (didTest) {
			return;
		}

		const testWrap = document.createElement('ins');
		const classes = [
			'adsbygoogle', 
			'ad-slot',
			random(1000)
		];

		const testStyle = 'background: transparent; z-index: -1; height: 1px; width: 0; position: absolute;';
		Object.assign(testWrap, {
			className: classes.sort(() => .5 - Math.random()).join(' '),
			style: testStyle,
			'data-ad-slot': random(10^6)
		});
		document.body.append(testWrap);

		const testWrap2 = document.createElement('div');
		document.body.append(Object.assign(
			testWrap2,
			{
				className: 'ad-250',
				style: testStyle
			}
		));

		requestAnimationFrame(() => {
			if (!testWrap.clientHeight || !testWrap2.clientHeight) {
				showModal();
			}

			testWrap.remove();
			testWrap2.remove();

			didTest = true;
		});
	}

	function toggleScroll(toggle) {
		switch (toggle) {
			case 'enable':
				Object.assign(document.body.style, { overflow: '' });
				break;
			case 'disable':
				Object.assign(document.body.style, { overflow: 'hidden' });
				break;
			default:
		}
	}

	function initModal() {
		noReshow = theModal.hasAttribute('data-no-reshow') ? 1 : 0;
	}

	function showModal() {

		initModal();

		if (noReshow) {
			const value = localStorage.getItem(STORAGE_KEY);
			if (value && value > Date.now()) {
				return;
			}
		}

		theModal.classList.toggle('is-open');
		theModal.setAttribute('aria-hidden', 'false');
		toggleScroll('disable');

		theModal.addEventListener('click', e => {
			if (e.target.hasAttribute('data-micromodal-close')) {
				closeModal();
				e.preventDefault();
			}
		});
	}

	function closeModal() {
		theModal.classList.toggle('is-open');
		theModal.setAttribute('aria-hidden', 'true');
		toggleScroll('enable');

		if (noReshow) {
			localStorage.setItem(
				STORAGE_KEY, 
				Date.now() + (parseInt(theModal.dataset.reshowTimeout) * 3600 * 1000)
			);
		}
		else {
			localStorage.removeItem(STORAGE_KEY);
		}
	}

	init();

})();