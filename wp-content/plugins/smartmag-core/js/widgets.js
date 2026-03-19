/**
 * Widgets related setup.
 */
"use strict";

if (!Bunyad) {
	var Bunyad = {};
}

(function($) {

	/**
	 * Initialize a widget.
	 * 
	 * @param {String} id 
	 */
	function init(id) {
		
		// Ignore if id missing or called from a placeholder.
		if (!id || id.includes('__i__')) {
			return;
		}
		
		const widget = $(`#${id}`);
		widgetContexts(widget);
		setupCustomControls(widget);

		// Remove hidden elements on submit (disabled context uses display=none).
		// Shouldn't be relied on as it will not effect the ajax call on first add.
		widget.closest('.widget').find('[type="submit"]').on('click', function() {
			widget.find('.bunyad-widget-option')
				.filter(function() {
					return $(this).css('display') === 'none';
				})
				.remove();
		});
	}

	function setupCustomControls(widget) {

		/**
		 * Selectize.
		 */
		widget.find('.bunyad-selectize').each(function() {
			const select   = $(this);
			const element  = select.closest('.bunyad-widget-option');

			const params = Object.assign(
				{
					sortable: true,
					multiple: true,
					create: false,
					ajax: false,
					preload: true
				},
				element.data('selectize-options') || {}
			);

			const currentValue = element.data('value');
			const initArgs = {
				create: params.create,

				// Setting it here to preserve sort for multiple. Single value should still be an array.
				items: currentValue,
				plugins: []
			};

			if (params.sortable) {
				initArgs.plugins.push('drag_drop');
			}

			if (params.multiple) {
				initArgs.plugins.push('remove_button');
			}

			if (params.ajax) {
				// initArgs.preload = params.preload;
				initArgs.preload = false;
				initArgs.load = (query, cb, fetchSaved) => {
					// if (!query.length) {
					// 	return cb();
					// }

					if (!window.bunyadAjaxCache) {
						window.bunyadAjaxCache = {};
					}
					
					let url = params.url || '';
					if (params.endpoint) {
						url = wpApiSettings.root + wpApiSettings.versionString + params.endpoint;
						url = url.replace('{query}', encodeURIComponent(query));
					}

					if (fetchSaved) {
						url = wpApiSettings.root + wpApiSettings.versionString + params.endpoint_saved;
						url = url.replace('{ids}', query);
					}

					// Not for first load where requests may happen at same time.
					if (url in window.bunyadAjaxCache) {
						// console.log('getting from cache ', url);
						return cb(window.bunyadAjaxCache[url]);
					}

					$.ajax({
						url,
						type: 'GET',
						dataType: 'json',
						beforeSend: xhr => xhr.setRequestHeader('X-WP-Nonce', wpApiSettings.nonce),
						error: () => cb(),
						success: data => {
							const items = [];
							data.forEach(opt => {
								if (opt.id) {
									items.push({text: opt.name, value: opt.id});
								}
							});

							window.bunyadAjaxCache[url] = items;
							cb(items);
						}
					});
				}

				// Load labels / data for currently saved terms (usually ids).
				if (currentValue) {
					let values = currentValue;
					if (Array.isArray(currentValue)) {
						// Ensure only ids, when create enabled.
						values = currentValue.filter(v => parseInt(v)).join(',');
					}
					
					const loadSavedOptions = () => {
						const selectize = select[0].selectize;

						initArgs.load(values, (items) => {
							if (!items) {
								return;
							}

							items.forEach(item => selectize.addOption(item));
							selectize.clear(true);
							selectize.setValue(currentValue, true);
						}, true);
					}

					if (values) {
						initArgs.onInitialize = loadSavedOptions;
					}
				}
			}

			select.selectize(initArgs);

			// Select2 interference from buggy plugins.
			select.parent().find('.select2').remove();
		});
	}

	/**
	 * Hide or show elements based on context for a widget.
	 * 
	 * @param {Object} widget jQuery object of container.
	 */
	function widgetContexts(widget) {

		let contexts = [];

		function setup() {

			// Setup contexts.
			widget.find('[data-context]').each(function() {
			
				const context = $(this).data('context');
				if (!context) {
					return;
				}
	
				const element     = $(this).data('element');
				contexts[element] = context;
			});

			const setChangeEvent = element => {
				const ele = widget.find(`[name*="[${element}]"]`);
				ele.on('change', processChange);
			};

			// Setup change handlers.
			Object.keys(contexts).forEach(element => {
				const depends = contexts[element];
				
				// Set change detection for both the dependents.
				setChangeEvent(element);
				for (let key in depends) {
					setChangeEvent(key);
				}
			});

			// Run at init.
			processChange();
		}

		function doCompare(value, expected, compare) {

			if (Array.isArray(expected)) {
				compare = compare == '!=' ? 'not in' : 'in';
			}
		
			switch (compare) {
				case 'in':
				case 'not in':
					const result = expected.indexOf(value) !== -1;
					return compare == 'in' ? result : !result;

				case '!=':
					return value != expected;

				default:
					return value == expected;
			}
		}

		function checkConditions(conditions) {

			let passed = true;

			Object.keys(conditions).forEach(element => {
				const condition    = conditions[element];
				const currentValue = getElementValue(element);

				if (!passed) {
					return;
				}

				passed = doCompare(
					currentValue, 
					condition.value,
					condition.compare
				);

				// console.log(element, condition, currentValue, passed);
			});

			return passed;
		}
	
		function getElementValue(element) {
			const ele = widget.find(`[data-element="${element}"]`);

			switch (ele.data('type')) {
				case 'checkbox':
					return ele.find('input[type=checkbox]').is(':checked') ? 1 : 0;

				case 'select':
					return ele.find('select').val();

				default:
					return ele.find(`[name*="[${element}]"][type!=hidden]`).val();
			}
		}

		function processChange() {

			Object.keys(contexts).forEach(element => {
				const conditions = contexts[element];
				const ele = widget.find(`[data-element="${element}"]`);

				if (!checkConditions(conditions)) {
					ele.hide();
				}
				else {
					ele.show();
				}
			});
		}

		setup();
		
		return {setup};
	}

	(function() {
		/**
		 * This is required for first time addition of widgets. Core can run the widget 
		 * JS on first add without passing a real id. The correct JS call only happens 
		 * on edits. 
		 */
		$(document).on('widget-added', function(e, widget) {
			// Only apply to widgets that include our options.
			if (!widget || !widget.find('.bunyad-widget-option').length) {
				return;
			}

			Bunyad.widgets.init(widget.prop('id'));
		});
	})();

	Bunyad.widgets = {
		init
	};
})(jQuery);